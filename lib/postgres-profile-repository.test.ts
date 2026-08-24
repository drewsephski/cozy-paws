import { beforeEach, describe, expect, it, vi } from 'vitest';

const { queryMock, transactionMock, legacyMock } = vi.hoisted(() => ({
  queryMock: vi.fn(),
  transactionMock: vi.fn(),
  legacyMock: {
    readProfile: vi.fn(),
    readProfiles: vi.fn(),
    createProfile: vi.fn(),
    writeProfile: vi.fn(),
    deleteProfile: vi.fn(),
    listOwnerSubdomains: vi.fn().mockResolvedValue([]),
    addOwnerSubdomain: vi.fn(),
    removeOwnerSubdomain: vi.fn(),
    readLeads: vi.fn(),
    writeLeads: vi.fn()
  }
}));

vi.mock('./db', () => ({ query: queryMock, transaction: transactionMock }));
vi.mock('./redis-profile-repository', () => ({ redisProfileRepository: legacyMock }));

import { normalizePostgresCalendarDate, postgresProfileRepository } from './postgres-profile-repository';

describe('Postgres profile repository', () => {
  beforeEach(() => {
    queryMock.mockReset();
    transactionMock.mockReset();
    legacyMock.readProfile.mockReset();
    legacyMock.listOwnerSubdomains.mockReset().mockResolvedValue([]);
  });

  it('normalizes a Postgres date value before it crosses the client-component boundary', () => {
    expect(normalizePostgresCalendarDate(new Date(2026, 6, 29))).toBe('2026-07-29');
    expect(normalizePostgresCalendarDate(null)).toBeNull();
  });

  it('maps the optional LinkedIn profile from the authoritative Site row', async () => {
    queryMock.mockResolvedValueOnce({
      rows: [{
        owner_id: 'owner-1', subdomain: 'happy-tails', emoji: 'dog', created_at: new Date(100),
        sitter_name: 'Drew', business_name: 'Happy Tails', tagline: null, location: null,
        services: [], phone: null, email: null, linkedin_url: 'https://www.linkedin.com/in/drew-sepeczi',
        profile_image_url: null, onboarding_completed_at: null, payment_link_url: null
      }]
    });

    await expect(postgresProfileRepository.readProfile('happy-tails')).resolves.toMatchObject({
      ownerId: 'owner-1',
      linkedinUrl: 'https://www.linkedin.com/in/drew-sepeczi'
    });
    expect(queryMock.mock.calls[0][0]).toContain('s.linkedin_url');
  });

  it('writes a cleared LinkedIn profile as SQL null', async () => {
    queryMock.mockResolvedValue({ rowCount: 1, rows: [] });

    await postgresProfileRepository.writeProfile('happy-tails', {
      ownerId: 'owner-1',
      emoji: 'dog',
      createdAt: 100,
      linkedinUrl: null
    });

    expect(queryMock.mock.calls[0][0]).toContain('linkedin_url=$10');
    expect(queryMock.mock.calls[0][1][9]).toBeNull();
  });

  it('carries a legacy Redis LinkedIn profile through lazy PostgreSQL migration', async () => {
    const migratedRow = {
      owner_id: 'owner-1', subdomain: 'legacy-site', emoji: 'dog', created_at: new Date(100),
      sitter_name: 'Drew', business_name: null, tagline: null, location: null, services: [],
      phone: null, email: null, linkedin_url: 'https://www.linkedin.com/in/drew-sepeczi',
      profile_image_url: null, onboarding_completed_at: null, payment_link_url: null
    };
    queryMock
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [migratedRow] });
    legacyMock.readProfile.mockResolvedValueOnce({
      ownerId: 'owner-1', emoji: 'dog', createdAt: 100,
      linkedinUrl: 'https://www.linkedin.com/in/drew-sepeczi'
    });
    const clientQuery = vi.fn()
      .mockResolvedValueOnce({ rows: [{ id: 'business-1' }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });
    transactionMock.mockImplementationOnce(async (work) => work({ query: clientQuery }));

    await expect(postgresProfileRepository.readProfile('legacy-site')).resolves.toMatchObject({
      linkedinUrl: 'https://www.linkedin.com/in/drew-sepeczi'
    });
    expect(clientQuery.mock.calls[1][0]).toContain('linkedin_url');
    expect(clientQuery.mock.calls[1][1][10]).toBe('https://www.linkedin.com/in/drew-sepeczi');
  });
});
