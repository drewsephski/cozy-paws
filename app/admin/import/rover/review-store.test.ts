import { describe, expect, it } from 'vitest';
import type { ServiceFieldConfidence } from '@/lib/profile-import/types';
import { createMemoryReviewStore, createReviewDraftPersistence, createReviewStore, isRestorableRoverReview, loadRestorableRoverReview, normalizeRestorableRoverReview, reviewKey, stripEphemeralRoverReviewEvidence, synchronizeRoverReviewServices, type ActiveRoverReview, type StoredRoverReview } from './review-store';

describe('browser-local Rover review store', () => {
  it('restores within 30 minutes, isolates keys, and sweeps expired drafts', async () => {
    let now = 1_000;
    const store = createMemoryReviewStore(() => now);
    const draft = { attemptId: 'a', subdomain: 'one', expiresAt: now + 30 * 60_000, reviewed: { about: 'Visible' } };
    await store.save(draft);
    expect(await store.load(reviewKey('one', 'a'))).toEqual(draft);
    expect(await store.load(reviewKey('two', 'a'))).toBeNull();
    now = draft.expiresAt + 1;
    await store.sweep();
    expect(await store.load(reviewKey('one', 'a'))).toBeNull();
  });

  it('rejects forbidden provider artifacts before browser serialization', async () => {
    const store = createMemoryReviewStore();
    await expect(store.save({ attemptId: 'a', subdomain: 'one', expiresAt: Date.now() + 1_000, reviewed: {}, rawModelResponse: 'nope' })).rejects.toThrow('forbidden');
    await expect(store.save({ attemptId: 'a', subdomain: 'one', expiresAt: Date.now() + 1_000, reviewed: {}, evidence: { profile: { about: 'Visible source' }, services: {} } } as StoredRoverReview)).rejects.toThrow('forbidden');
  });

  it('strips ephemeral evidence before saving a review draft', async () => {
    const store = createMemoryReviewStore(() => 1_000);
    const attemptId = '00000000-0000-0000-0000-000000000001';
    const key = reviewKey('one', attemptId);
    const active = {
      attemptId,
      subdomain: 'one',
      expiresAt: 1_000 + 30 * 60_000,
      reviewed: { about: 'Visible profile' },
      evidence: { profile: { about: 'Visible source' }, services: {} }
    };

    await store.save(stripEphemeralRoverReviewEvidence(active as unknown as ActiveRoverReview));

    await expect(store.load(key)).resolves.toEqual({
      attemptId,
      subdomain: 'one',
      expiresAt: 1_000 + 30 * 60_000,
      reviewed: { about: 'Visible profile' }
    });
  });

  it('restores the latest reviewed edits and service details', async () => {
    const store = createMemoryReviewStore(() => 1_000);
    const key = reviewKey('one', 'attempt');
    await store.save({
      attemptId: 'attempt',
      subdomain: 'one',
      expiresAt: 1_000 + 30 * 60_000,
      reviewed: {
        about: 'Edited after extraction',
        services: ['Boarding'],
        serviceDetails: { Boarding: { description: 'Edited service', startingPrice: '$55', billingUnit: 'per night' } }
      }
    });

    await expect(store.load(key)).resolves.toMatchObject({
      reviewed: {
        about: 'Edited after extraction',
        services: ['Boarding'],
        serviceDetails: { Boarding: { description: 'Edited service', startingPrice: '$55', billingUnit: 'per night' } }
      }
    });
  });

  it('serializes edit saves before restart or discard deletion', async () => {
    const values = new Map<string, StoredRoverReview>();
    const store = createReviewStore({
      async get(key) { return values.get(key) ?? null; },
      async put(key, value) { await new Promise((resolve) => setTimeout(resolve, 5)); values.set(key, value); },
      async delete(key) { values.delete(key); },
      async entries() { return [...values.entries()]; }
    });
    const persistence = createReviewDraftPersistence(store);
    const draft = { attemptId: 'attempt', subdomain: 'one', expiresAt: Date.now() + 1_000, reviewed: { about: 'Latest edit' } };
    void persistence.save(draft);
    await persistence.remove(reviewKey('one', 'attempt'));
    await expect(store.load(reviewKey('one', 'attempt'))).resolves.toBeNull();
  });

  it('rejects restored drafts for another Site, an invalid revision, or an expired review', () => {
    const draft = {
      attemptId: '00000000-0000-4000-8000-000000000001', subdomain: 'one', expiresAt: 2_000,
      expectedProfileRevision: 1, canonicalRoverUrl: 'https://www.rover.com/members/jamie/', current: {}, reviewed: {}, confidence: {}
    };
    expect(isRestorableRoverReview(draft, 'one', reviewKey('one', draft.attemptId), 1_000)).toBe(true);
    expect(isRestorableRoverReview(draft, 'two', reviewKey('one', draft.attemptId), 1_000)).toBe(false);
    expect(isRestorableRoverReview({ ...draft, expectedProfileRevision: -1 }, 'one', reviewKey('one', draft.attemptId), 1_000)).toBe(false);
    expect(isRestorableRoverReview(draft, 'one', reviewKey('one', draft.attemptId), 2_000)).toBe(false);
  });

  it('deeply validates and normalizes a complete restored review before rendering it', () => {
    const attemptId = '00000000-0000-4000-8000-000000000001';
    const draft = {
      attemptId,
      subdomain: 'one',
      expiresAt: 1_000 + 30 * 60_000,
      expectedProfileRevision: 4,
      canonicalRoverUrl: 'https://www.rover.com/members/jamie/',
      current: { services: ['Boarding'], serviceDetails: { Boarding: { startingPrice: '$45' } } },
      reviewed: { about: 'Visible profile', services: ['Boarding'], serviceDetails: { Boarding: { description: 'Home-based care', startingPrice: '$55', billingUnit: 'per night' } } },
      confidence: { about: 'high', services: 'medium' },
      serviceConfidence: { Boarding: { name: 'high', description: 'medium', startingPrice: 'high', billingUnit: 'high' } }
    };

    expect(normalizeRestorableRoverReview(draft, 'one', reviewKey('one', attemptId), 1_000)).toEqual(draft);
  });

  it('keeps service edits restorable without stale detail or confidence keys', () => {
    const attemptId = '00000000-0000-4000-8000-000000000001';
    const key = reviewKey('one', attemptId);
    const draft = {
      attemptId,
      subdomain: 'one',
      expiresAt: 1_000 + 30 * 60_000,
      expectedProfileRevision: 4,
      canonicalRoverUrl: 'https://www.rover.com/members/jamie/',
      current: {},
      reviewed: {
        services: ['Boarding', 'Dog walking'],
        serviceDetails: {
          Boarding: { description: 'Overnight care', startingPrice: '$55' },
          'Dog walking': { description: 'Neighborhood walks', startingPrice: '$25' }
        }
      },
      confidence: { services: 'high' },
      serviceConfidence: {
        Boarding: { name: 'high', description: 'high', startingPrice: 'medium' },
        'Dog walking': { name: 'high', description: 'medium', startingPrice: 'high' }
      } as Record<string, ServiceFieldConfidence>
    };

    const editedServices = ['Boarding'];
    const editedDetails = { ...draft.reviewed.serviceDetails, Boarding: { ...draft.reviewed.serviceDetails.Boarding, description: 'Edited overnight care' } };
    const synchronized = synchronizeRoverReviewServices(editedServices, editedDetails, draft.serviceConfidence);
    const edited = {
      ...draft,
      reviewed: { ...draft.reviewed, services: editedServices, serviceDetails: synchronized.serviceDetails },
      serviceConfidence: synchronized.serviceConfidence
    };

    expect(normalizeRestorableRoverReview(edited, 'one', key, 1_000)).toMatchObject({
      reviewed: { services: ['Boarding'], serviceDetails: { Boarding: editedDetails.Boarding } },
      serviceConfidence: { Boarding: draft.serviceConfidence.Boarding }
    });
    expect(edited.reviewed.serviceDetails).not.toHaveProperty('Dog walking');
    expect(edited.serviceConfidence).not.toHaveProperty('Dog walking');

    const unchanged = synchronizeRoverReviewServices(draft.reviewed.services, draft.reviewed.serviceDetails, draft.serviceConfidence);
    expect(unchanged).toEqual({ serviceDetails: draft.reviewed.serviceDetails, serviceConfidence: draft.serviceConfidence });
    expect(normalizeRestorableRoverReview({ ...draft, reviewed: { ...draft.reviewed, serviceDetails: unchanged.serviceDetails }, serviceConfidence: unchanged.serviceConfidence }, 'one', key, 1_000)).not.toBeNull();

    const renamedServices = ['Overnight boarding'];
    const renamed = synchronizeRoverReviewServices(renamedServices, draft.reviewed.serviceDetails, draft.serviceConfidence);
    const renamedReview = {
      ...draft,
      reviewed: { ...draft.reviewed, services: renamedServices, serviceDetails: renamed.serviceDetails },
      serviceConfidence: renamed.serviceConfidence
    };

    expect(normalizeRestorableRoverReview(renamedReview, 'one', key, 1_000)).toMatchObject({
      reviewed: { services: renamedServices, serviceDetails: {} },
      serviceConfidence: {}
    });
    expect(renamedReview.reviewed.serviceDetails).not.toHaveProperty('Overnight boarding');
    expect(renamedReview.serviceConfidence).not.toHaveProperty('Overnight boarding');
  });

  it('discards malformed nested candidates, removed media fields, and overlong expiry', () => {
    const attemptId = '00000000-0000-4000-8000-000000000001';
    const key = reviewKey('one', attemptId);
    const valid = {
      attemptId,
      subdomain: 'one',
      expiresAt: 1_000 + 30 * 60_000,
      expectedProfileRevision: 1,
      canonicalRoverUrl: 'https://www.rover.com/members/jamie/',
      current: {},
      reviewed: { services: ['Boarding'], serviceDetails: { Boarding: { description: 'Visible' } } },
      confidence: { services: 'high' },
      serviceConfidence: { Boarding: { name: 'high', description: 'medium' } }
    };

    expect(isRestorableRoverReview({ ...valid, reviewed: { ...valid.reviewed, services: 'Boarding' } }, 'one', key, 1_000)).toBe(false);
    expect(isRestorableRoverReview({ ...valid, reviewed: { ...valid.reviewed, serviceDetails: { Boarding: { description: 12 } } } }, 'one', key, 1_000)).toBe(false);
    expect(isRestorableRoverReview({ ...valid, confidence: { services: 'low' } }, 'one', key, 1_000)).toBe(false);
    expect(isRestorableRoverReview({ ...valid, serviceConfidence: { Boarding: { description: 'low' } } }, 'one', key, 1_000)).toBe(false);
    expect(isRestorableRoverReview({ ...valid, portrait: new Blob(['portrait'], { type: 'image/jpeg' }) }, 'one', key, 1_000)).toBe(false);
    expect(isRestorableRoverReview({ ...valid, expiresAt: 1_000 + 30 * 60_000 + 1 }, 'one', key, 1_000)).toBe(false);
  });

  it('deletes a malformed restored record instead of returning it to the review UI', async () => {
    const attemptId = '00000000-0000-4000-8000-000000000001';
    const key = reviewKey('one', attemptId);
    const store = createMemoryReviewStore(() => 1_000);
    await store.save({
      attemptId,
      subdomain: 'one',
      expiresAt: 1_000 + 30 * 60_000,
      expectedProfileRevision: 1,
      canonicalRoverUrl: 'https://www.rover.com/members/jamie/',
      current: {},
      reviewed: { services: 'Boarding' },
      confidence: {}
    });

    await expect(loadRestorableRoverReview(store, key, 'one', 1_000)).resolves.toEqual({ review: null, discarded: true });
    await expect(store.load(key)).resolves.toBeNull();
  });
});
