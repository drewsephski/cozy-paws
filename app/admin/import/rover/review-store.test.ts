import { describe, expect, it } from 'vitest';
import { createMemoryReviewStore, createReviewDraftPersistence, createReviewStore, isRestorableRoverReview, loadRestorableRoverReview, normalizeRestorableRoverReview, reviewKey, type StoredRoverReview } from './review-store';

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
  });

  it('restores the latest reviewed edits, service details, and portrait opt-out', async () => {
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
      },
      includePortrait: false,
      portrait: new Blob(['portrait'], { type: 'image/webp' })
    });

    await expect(store.load(key)).resolves.toMatchObject({
      reviewed: {
        about: 'Edited after extraction',
        services: ['Boarding'],
        serviceDetails: { Boarding: { description: 'Edited service', startingPrice: '$55', billingUnit: 'per night' } }
      },
      includePortrait: false
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
    const draft = { attemptId: 'attempt', subdomain: 'one', expiresAt: Date.now() + 1_000, reviewed: { about: 'Latest edit' }, includePortrait: false };
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
    const portrait = new Blob(['portrait'], { type: 'image/webp' });
    const draft = {
      attemptId,
      subdomain: 'one',
      expiresAt: 1_000 + 30 * 60_000,
      expectedProfileRevision: 4,
      canonicalRoverUrl: 'https://www.rover.com/members/jamie/',
      current: { services: ['Boarding'], serviceDetails: { Boarding: { startingPrice: '$45' } } },
      reviewed: { about: 'Visible profile', services: ['Boarding'], serviceDetails: { Boarding: { description: 'Home-based care', startingPrice: '$55', billingUnit: 'per night' } } },
      confidence: { about: 'high', services: 'medium' },
      serviceConfidence: { Boarding: { name: 'high', description: 'medium', startingPrice: 'high', billingUnit: 'high' } },
      portrait,
      includePortrait: true
    };

    expect(normalizeRestorableRoverReview(draft, 'one', reviewKey('one', attemptId), 1_000)).toEqual(draft);
  });

  it('discards malformed nested candidates, confidence, media, and overlong expiry', () => {
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
