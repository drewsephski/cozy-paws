import { describe, expect, it } from 'vitest';
import { vi } from 'vitest';
import { createMemoryReviewedProfileWriter, createPostgresReviewedProfileWriter } from './profile-writer';

describe('reviewed profile writer', () => {
  it('derives ownership, preserves omitted content, and atomically increments revision', async () => {
    const writer = createMemoryReviewedProfileWriter([{ ownerId: 'owner-1', subdomain: 'happy-tails', emoji: 'dog', createdAt: 1, about: 'Current', services: ['Walks'], profileRevision: 2 }]);
    await expect(writer.applyOwned({ ownerId: 'owner-2', subdomain: 'happy-tails', expectedRevision: 2, reviewed: { about: 'Nope' } })).rejects.toMatchObject({ code: 'SITE_NOT_OWNED' });
    const result = await writer.applyOwned({ ownerId: 'owner-1', subdomain: 'happy-tails', expectedRevision: 2, reviewed: { about: '', tagline: 'Imported' } });
    expect(result).toMatchObject({ about: 'Current', tagline: 'Imported', services: ['Walks'], profileRevision: 3 });
  });

  it('rejects stale review without mutation and accepts exact lost-response replay', async () => {
    const writer = createMemoryReviewedProfileWriter([{ ownerId: 'owner-1', subdomain: 'happy-tails', emoji: 'dog', createdAt: 1, tagline: 'Old', profileRevision: 0 }]);
    const first = await writer.applyOwned({ ownerId: 'owner-1', subdomain: 'happy-tails', expectedRevision: 0, reviewed: { tagline: 'New' } });
    await expect(writer.applyOwned({ ownerId: 'owner-1', subdomain: 'happy-tails', expectedRevision: 0, reviewed: { tagline: 'Different' } })).rejects.toMatchObject({ code: 'PROFILE_CHANGED' });
    await expect(writer.applyOwned({ ownerId: 'owner-1', subdomain: 'happy-tails', expectedRevision: 0, reviewed: { tagline: 'New' } })).resolves.toEqual(first);
  });

  it('writes the complete compatible reviewed patch through one PostgreSQL transaction', async () => {
    const current = { owner_id: 'owner-1', subdomain: 'happy-tails', emoji: 'dog', created_at: new Date(1), sitter_name: null, business_name: null, tagline: null, location: null, services: [], phone: null, email: null, linkedin_url: null, profile_image_url: null, onboarding_completed_at: new Date(1), payment_link_url: null, availability_status: 'ACCEPTING', availability_until: null, years_experience: null, care_capabilities: [], meet_and_greet_expectations: null, cancellation_expectations: null, self_reported_credentials: [], about: null, care_routine: null, home_environment: null, pet_preferences: null, experience_summary: null, special_care_summary: null, service_details: {}, profile_revision: 0 };
    const query = vi.fn()
      .mockResolvedValueOnce({ rows: [current] })
      .mockResolvedValueOnce({ rows: [{ ...current, years_experience: 7, care_capabilities: ['Medication'], meet_and_greet_expectations: 'Meet first', cancellation_expectations: '48 hours', self_reported_credentials: ['First aid'], profile_revision: 1 }], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [], rowCount: 1 });
    const writer = createPostgresReviewedProfileWriter(async (work) => work({ query } as never));
    await writer.applyOwned({ ownerId: 'owner-1', subdomain: 'happy-tails', expectedRevision: 0, reviewed: { yearsExperience: 7, careCapabilities: ['Medication'], meetAndGreetExpectations: 'Meet first', cancellationExpectations: '48 hours', selfReportedCredentials: ['First aid'] } });
    expect(query.mock.calls[1][0]).toContain('years_experience=$15');
    expect(query.mock.calls[1][1].slice(14, 19)).toEqual([7, ['Medication'], 'Meet first', '48 hours', ['First aid']]);
    expect(query.mock.calls[1][0]).toContain('profile_revision=profile_revision+1');
  });

  it('clears stale service details when an imported service list replaces the current list', async () => {
    const writer = createMemoryReviewedProfileWriter([{ ownerId: 'owner-1', subdomain: 'happy-tails', emoji: 'dog', createdAt: 1, services: ['Boarding'], serviceDetails: { Boarding: { startingPrice: '$45' } }, profileRevision: 0 }]);
    await expect(writer.applyOwned({ ownerId: 'owner-1', subdomain: 'happy-tails', expectedRevision: 0, reviewed: { services: ['Dog walking'] } })).resolves.toMatchObject({ services: ['Dog walking'], serviceDetails: {} });
  });
});
