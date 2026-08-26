import { describe, expect, it, vi } from 'vitest';
import { createGrowthEvidence, type GrowthEvidenceRepository } from './growth-evidence';

const DAY = 24 * 60 * 60 * 1000;

function repositoryWith(
  businesses: Awaited<ReturnType<GrowthEvidenceRepository['getOwnerActivationEvidence']>>
): GrowthEvidenceRepository {
  return {
    recordOwnedSiteShare: async () => true,
    getOwnerActivationEvidence: async () => businesses,
    getOperationalEvidence: async () => ({
      publishedSites: 0,
      sharedBusinesses: 0,
      qualifiedBusinesses: 0,
      inquiries: 0,
      sitterReplies: 0,
      qualifiedLeads: 0,
      settledLeadPayments: 0,
      completedBookings: 0,
      activeBusinesses30d: 0
    })
  };
}

describe('growth evidence', () => {
  it('normalizes submitted Site addresses before crossing the repository seam', async () => {
    const repository = repositoryWith([]);
    repository.recordOwnedSiteShare = vi.fn().mockResolvedValue(true);
    const growth = createGrowthEvidence(repository);

    await expect(growth.recordOwnedSiteShare('owner-1', 'happy-tails')).resolves.toBe(true);
    await expect(growth.recordOwnedSiteShare('owner-1', 'Happy-Tails!!')).resolves.toBe(false);
    await expect(growth.recordOwnedSiteShare('owner-1', '!!!')).resolves.toBe(false);

    expect(repository.recordOwnedSiteShare).toHaveBeenCalledTimes(1);
    expect(repository.recordOwnedSiteShare).toHaveBeenCalledWith('owner-1', 'happy-tails');
  });

  it('derives setup and value activation for the same Business inside the 14-day window', async () => {
    const sharedAt = new Date('2026-08-01T12:00:00.000Z');
    const growth = createGrowthEvidence(repositoryWith([
      { businessId: 'business-1', setupActivatedAt: sharedAt, firstQualifiedAt: new Date(sharedAt.getTime() + 14 * DAY) },
      { businessId: 'business-2', setupActivatedAt: null, firstQualifiedAt: new Date(sharedAt.getTime() + DAY) }
    ]));

    await expect(growth.getOwnerActivation('owner-1')).resolves.toEqual({
      setupActivated: true,
      valueActivated: true,
      businesses: [
        { businessId: 'business-1', setupActivatedAt: sharedAt, valueActivatedAt: new Date(sharedAt.getTime() + 14 * DAY) },
        { businessId: 'business-2', setupActivatedAt: null, valueActivatedAt: null }
      ]
    });
  });

  it('does not count qualification before sharing or after the 14-day window', async () => {
    const sharedAt = new Date('2026-08-15T12:00:00.000Z');
    const growth = createGrowthEvidence(repositoryWith([
      { businessId: 'before', setupActivatedAt: sharedAt, firstQualifiedAt: new Date(sharedAt.getTime() - 1) },
      { businessId: 'after', setupActivatedAt: sharedAt, firstQualifiedAt: new Date('2026-08-30T00:00:00.000Z') }
    ]));

    await expect(growth.getOwnerActivation('owner-1')).resolves.toMatchObject({
      setupActivated: true,
      valueActivated: false,
      businesses: [
        { businessId: 'before', valueActivatedAt: null },
        { businessId: 'after', valueActivatedAt: null }
      ]
    });
  });

  it('distinguishes unavailable acquisition stages from durable owner-journey counts', async () => {
    const repository = repositoryWith([]);
    repository.getOperationalEvidence = async () => ({
      publishedSites: 7,
      sharedBusinesses: 6,
      qualifiedBusinesses: 5,
      inquiries: 12,
      sitterReplies: 9,
      qualifiedLeads: 8,
      settledLeadPayments: 4,
      completedBookings: 3,
      activeBusinesses30d: 5
    });

    await expect(createGrowthEvidence(repository).getOperationalReport()).resolves.toEqual({
      acquisition: {
        selectedContacts: null,
        substantiveConversations: null,
        trials: null,
        publishedSites: 7,
        sharedBusinesses: 6,
        qualifiedBusinesses: 5,
        payingBusinesses: null,
        referrals: null,
        activeBusinesses30d: 5
      },
      ownerJourney: {
        inquiries: 12,
        sitterReplies: 9,
        qualifiedLeads: 8,
        settledLeadPayments: 4,
        completedBookings: 3,
        reviews: null
      }
    });
  });
});
