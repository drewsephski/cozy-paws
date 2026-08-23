import { describe, expect, it, vi } from 'vitest';
import type { PoolClient } from 'pg';
import { createLeadTransitioner } from './lead-management';

describe('owned Lead lifecycle', () => {
  it.each(['DECLINED', 'SPAM'] as const)('closes and revokes the Conversation when a Lead becomes %s', async (status) => {
    const client = { query: vi.fn()
      .mockResolvedValueOnce({ rows: [{ status: 'NEW' }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] }) };
    const transitionOwnedLead = createLeadTransitioner((work) => work(client as unknown as PoolClient));

    await expect(transitionOwnedLead('owner-1', 'lead-1', status)).resolves.toBe(true);

    expect(client.query.mock.calls[0][0]).toContain('b.owner_user_id=$2');
    expect(client.query.mock.calls[0][0]).toContain('for update of l');
    expect(client.query.mock.calls[2][0]).toContain('closed_at=now()');
    expect(client.query.mock.calls[2][0]).toContain('revoked_at=now()');
    expect(client.query.mock.calls[2][1][1]).toMatch(/^[A-Za-z0-9_-]{32,}$/);
  });

  it('reopens a terminal Lead with a fresh customer token', async () => {
    const client = { query: vi.fn()
      .mockResolvedValueOnce({ rows: [{ status: 'SPAM' }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] }) };
    const transitionOwnedLead = createLeadTransitioner((work) => work(client as unknown as PoolClient));

    await expect(transitionOwnedLead('owner-1', 'lead-1', 'NEW')).resolves.toBe(true);

    expect(client.query.mock.calls[2][0]).toContain('closed_at=null');
    expect(client.query.mock.calls[2][0]).toContain('revoked_at=null');
    expect(client.query.mock.calls[2][1][1]).toMatch(/^[A-Za-z0-9_-]{32,}$/);
  });

  it('does not mutate a Lead owned by another Business', async () => {
    const client = { query: vi.fn().mockResolvedValueOnce({ rows: [] }) };
    const transitionOwnedLead = createLeadTransitioner((work) => work(client as unknown as PoolClient));

    await expect(transitionOwnedLead('owner-2', 'lead-1', 'SPAM')).resolves.toBe(false);
    expect(client.query).toHaveBeenCalledTimes(1);
  });
});
