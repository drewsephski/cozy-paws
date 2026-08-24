import { beforeEach, describe, expect, it, vi } from 'vitest';

const { queryMock, transactionMock, legacyListOwnerMock, legacyReadProfileMock, legacyReadLeadsMock } = vi.hoisted(() => {
  const queryMock = vi.fn();
  return { queryMock, transactionMock: vi.fn(async (work: (client: { query: typeof queryMock }) => Promise<unknown>) => work({ query: queryMock })), legacyListOwnerMock: vi.fn().mockResolvedValue([]), legacyReadProfileMock: vi.fn(), legacyReadLeadsMock: vi.fn().mockResolvedValue([]) };
});
vi.mock('./db', () => ({ query: queryMock, transaction: transactionMock }));
vi.mock('./redis-profile-repository', () => ({ redisProfileRepository: {
  readProfile: legacyReadProfileMock, readLeads: legacyReadLeadsMock, listOwnerSubdomains: legacyListOwnerMock
} }));

import { postgresProfileRepository } from './postgres-profile-repository';

describe('Postgres owner profile query shape', () => {
  beforeEach(() => { queryMock.mockReset(); transactionMock.mockClear(); legacyListOwnerMock.mockClear(); legacyReadProfileMock.mockReset(); legacyReadLeadsMock.mockClear(); });

  it('reads a known Site collection in one set query', async () => {
    queryMock.mockResolvedValueOnce({ rows: [
      { owner_id: 'owner-1', subdomain: 'first', emoji: 'dog', created_at: new Date(1), sitter_name: null, business_name: 'First', tagline: null, location: null, services: [], phone: null, email: null, profile_image_url: null, onboarding_completed_at: null, payment_link_url: null, availability_status: 'ACCEPTING', availability_until: null, years_experience: null, care_capabilities: [], meet_and_greet_expectations: null, cancellation_expectations: null, self_reported_credentials: [] },
      { owner_id: 'owner-1', subdomain: 'second', emoji: 'cat', created_at: new Date(2), sitter_name: null, business_name: 'Second', tagline: null, location: null, services: [], phone: null, email: null, profile_image_url: null, onboarding_completed_at: null, payment_link_url: null, availability_status: 'LIMITED', availability_until: null, years_experience: null, care_capabilities: [], meet_and_greet_expectations: null, cancellation_expectations: null, self_reported_credentials: [] }
    ] });

    await expect(postgresProfileRepository.readProfiles(['first', 'second'])).resolves.toHaveLength(2);
    expect(queryMock).toHaveBeenCalledTimes(1);
    expect(queryMock.mock.calls[0][0]).toContain('s.subdomain=any($1::text[])');
  });

  it('batch acknowledges only read_at through an owner-scoped Site join', async () => {
    queryMock.mockResolvedValueOnce({ rows: [{ id: '00000000-0000-4000-8000-000000000001' }] });
    const ids = ['00000000-0000-4000-8000-000000000001'];

    await expect(postgresProfileRepository.markLeadsRead('owner-1', ids, 400)).resolves.toEqual(ids);
    const sql = queryMock.mock.calls[0][0] as string;
    expect(sql).toContain('set read_at=$3');
    expect(sql).toContain('b.owner_user_id=$1');
    expect(sql).not.toContain('status=');
    expect(sql).not.toContain('updated_at');
  });

  it('does not touch legacy Redis after the owner migration boundary is complete', async () => {
    queryMock.mockResolvedValueOnce({ rows: [{ subdomain: 'first' }, { subdomain: 'second' }] });
    queryMock.mockResolvedValueOnce({ rows: [{ migration_checked: true }] });
    await expect(postgresProfileRepository.listOwnerSubdomains('owner-1')).resolves.toEqual(['first', 'second']);
    expect(queryMock).toHaveBeenCalledTimes(2);
    expect(legacyListOwnerMock).not.toHaveBeenCalled();
  });

  it('checks Redis once for an owner with a mixed migration state', async () => {
    let insertedMissingSite = false;
    queryMock.mockImplementation(async (sql: string) => {
      if (sql.includes('migration_checked')) return { rows: [{ migration_checked: false }] };
      if (sql.includes('pg_advisory_xact_lock')) return { rows: [] };
      if (sql.startsWith('insert into business')) return { rows: [{ id: 'business-2' }] };
      if (sql.startsWith('insert into site')) { insertedMissingSite = true; return { rows: [{ id: 'site-2', business_id: 'business-2' }] }; }
      if (sql.includes('select s.subdomain')) return { rows: insertedMissingSite ? [{ subdomain: 'first' }, { subdomain: 'second' }] : [{ subdomain: 'first' }] };
      return { rows: [] };
    });
    legacyListOwnerMock.mockResolvedValueOnce(['first', 'second']);
    legacyReadProfileMock.mockResolvedValueOnce({ ownerId: 'owner-1', emoji: 'cat', createdAt: 2, businessName: 'Second' });

    await expect(postgresProfileRepository.listOwnerSubdomains('owner-1')).resolves.toEqual(['first', 'second']);
    expect(legacyListOwnerMock).toHaveBeenCalledWith('owner-1');
    expect(legacyReadProfileMock).toHaveBeenCalledWith('second');
    expect(legacyReadProfileMock).not.toHaveBeenCalledWith('first');
    expect(queryMock).toHaveBeenCalledWith(expect.stringContaining('pg_advisory_xact_lock'), ['legacy-profile-boundary:owner-1']);
  });

  it('treats an empty PostgreSQL Lead set as authoritative for known Sites', async () => {
    queryMock.mockResolvedValueOnce({ rows: [] });
    const profile = { ownerId: 'owner-1', subdomain: 'first', emoji: 'dog', createdAt: 1 };
    await expect(postgresProfileRepository.readOwnerLeads('owner-1', [profile])).resolves.toEqual([]);
    expect(queryMock).toHaveBeenCalledTimes(1);
    expect(legacyReadLeadsMock).not.toHaveBeenCalled();
  });
});
