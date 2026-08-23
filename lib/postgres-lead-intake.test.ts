import { describe, expect, it, vi } from 'vitest';
import type { PoolClient } from 'pg';
import { createPostgresLeadPersister } from './postgres-lead-intake';

const profileRow = {
  site_id: 'site-1', business_id: 'business-1', owner_id: 'owner-1', subdomain: 'happy-tails', emoji: 'dog',
  site_created_at: new Date('2026-08-23T12:00:00Z'), sitter_name: 'Drew', business_name: 'Happy Tails',
  tagline: null, location: null, services: ['Dog walking'], phone: null, email: 'sitter@example.com',
  profile_image_url: null, onboarding_completed_at: null, payment_link_url: null
};

const input = {
  subdomain: 'happy-tails',
  submissionToken: 'submission-token-with-at-least-32-characters',
  createdAt: 200,
  lead: {
    name: 'Sam', email: 'sam@example.com', serviceRequested: 'Dog walking', requestedStartDate: null,
    requestedEndDate: null, dateDetails: '', petTypes: ['Dog'], petCount: 1, postalCode: '60601',
    careDetails: 'One dog', source: 'direct', campaign: null
  }
};

const insertedLead = {
  id: 'lead-1', customer_name: 'Sam', customer_email: 'sam@example.com', service_requested: 'Dog walking',
  requested_start_date: null, requested_end_date: null, date_details: '', pet_types: ['Dog'], pet_count: 1,
  postal_code: '60601', care_details: 'One dog', source: 'direct', campaign: null, status: 'NEW' as const,
  read_at: null, created_at: new Date('2026-08-23T12:00:00Z')
};

describe('PostgreSQL Lead and Conversation intake', () => {
  it('creates the Lead, event, and Conversation inside one transaction', async () => {
    const client = { query: vi.fn()
      .mockResolvedValueOnce({ rows: [profileRow] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [insertedLead] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ public_token: 'customer-token' }] }) };
    const persist = createPostgresLeadPersister((work) => work(client as unknown as PoolClient));

    await expect(persist(input)).resolves.toMatchObject({
      created: true,
      conversationToken: 'customer-token',
      lead: { id: 'lead-1', name: 'Sam', email: 'sam@example.com' },
      profile: { ownerId: 'owner-1', businessName: 'Happy Tails' }
    });
    expect(client.query.mock.calls[0][0]).toContain('for update of s');
    expect(client.query.mock.calls[2][0]).toContain('insert into lead');
    expect(client.query.mock.calls[3][0]).toContain('insert into lead_event');
    expect(client.query.mock.calls[4][0]).toContain('insert into lead_conversation');
  });

  it('rolls back the staged Lead when Conversation creation fails', async () => {
    let committedLeads = 0;
    const client = { query: vi.fn()
      .mockResolvedValueOnce({ rows: [profileRow] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ id: 'lead-1', created_at: new Date() }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockRejectedValueOnce(new Error('conversation insert failed')) };
    const persist = createPostgresLeadPersister(async (work) => {
      try {
        const result = await work(client as unknown as PoolClient);
        committedLeads += 1;
        return result;
      } catch (error) {
        throw error;
      }
    });

    await expect(persist(input)).rejects.toThrow('conversation insert failed');
    expect(committedLeads).toBe(0);
  });

  it('reuses the canonical Lead and Conversation for a retried submission token', async () => {
    const existing = {
      id: 'lead-1', customer_name: 'Sam', customer_email: 'sam@example.com', service_requested: 'Dog walking',
      requested_start_date: null, requested_end_date: null, date_details: '', pet_types: ['Dog'], pet_count: 1,
      postal_code: '60601', care_details: 'One dog', source: 'direct', campaign: null, status: 'NEW', read_at: null,
      created_at: new Date('2026-08-23T12:00:00Z'), public_token: 'existing-token'
    };
    const client = { query: vi.fn()
      .mockResolvedValueOnce({ rows: [profileRow] })
      .mockResolvedValueOnce({ rows: [existing] }) };
    const persist = createPostgresLeadPersister((work) => work(client as unknown as PoolClient));

    await expect(persist(input)).resolves.toMatchObject({ created: false, conversationToken: 'existing-token', lead: { id: 'lead-1' } });
    expect(client.query.mock.calls[0][0]).toContain('for update of s');
    expect(client.query.mock.calls[1][0]).toContain('submission_token=$2');
    expect(client.query).toHaveBeenCalledTimes(2);
  });

  it('serializes concurrent retries and creates one canonical Conversation', async () => {
    let canonical: (typeof insertedLead & { public_token: string }) | null = null;
    let queue = Promise.resolve();
    const runTransaction = async <T>(work: (client: PoolClient) => Promise<T>) => {
      const previous = queue;
      let release = () => {};
      queue = new Promise<void>((resolve) => { release = resolve; });
      await previous;
      const client = { query: vi.fn(async (sql: string) => {
        if (sql.includes('from site s')) return { rows: [profileRow] };
        if (sql.includes('submission_token=$2')) return { rows: canonical ? [canonical] : [] };
        if (sql.includes('insert into lead(')) return { rows: [insertedLead] };
        if (sql.includes('insert into lead_event')) return { rows: [] };
        if (sql.includes('insert into lead_conversation')) return { rows: [{ public_token: 'canonical-token' }] };
        throw new Error(`Unexpected query: ${sql}`);
      }) };
      try {
        const result = await work(client as unknown as PoolClient);
        if ((result as { created?: boolean } | null)?.created) canonical = { ...insertedLead, public_token: 'canonical-token' };
        return result;
      } finally {
        release();
      }
    };
    const persist = createPostgresLeadPersister(runTransaction);

    const results = await Promise.all([persist(input), persist(input)]);

    expect(results.map((result) => result?.created).sort()).toEqual([false, true]);
    expect(results.map((result) => result?.conversationToken)).toEqual(['canonical-token', 'canonical-token']);
  });
});
