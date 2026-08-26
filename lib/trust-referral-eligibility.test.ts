import { describe, expect, it } from 'vitest';
import { createMemoryTestimonialRepository, createTrustReferralEligibility } from './trust-referral-eligibility';

const sites = [
  { id: 'site-1', businessId: 'business-1', ownerUserId: 'owner-1', subdomain: 'happy-tails' },
  { id: 'site-2', businessId: 'business-2', ownerUserId: 'owner-2', subdomain: 'other-care' }
];

describe('trust and referral eligibility', () => {
  it('publishes only permissioned Self-published testimonials for an owned Site', async () => {
    const trust = createTrustReferralEligibility(createMemoryTestimonialRepository(sites));

    await expect(trust.createOwnedTestimonial('owner-1', {
      subdomain: 'happy-tails',
      text: '  Jamie treated our anxious dog with patience and care.  ',
      source: '  Morgan, dog-walking client  ',
      permissionAttested: true,
      published: true
    })).resolves.toMatchObject({
      type: 'SELF_PUBLISHED_TESTIMONIAL',
      text: 'Jamie treated our anxious dog with patience and care.',
      source: 'Morgan, dog-walking client',
      permissionAttestedAt: expect.any(Date),
      publishedAt: expect.any(Date),
      hiddenAt: null,
      deletedAt: null
    });

    await expect(trust.listPublicTestimonials('happy-tails')).resolves.toEqual([
      expect.objectContaining({ type: 'SELF_PUBLISHED_TESTIMONIAL', source: 'Morgan, dog-walking client' })
    ]);
  });

  it('rejects missing provenance, excessive content, and another owner Site', async () => {
    const trust = createTrustReferralEligibility(createMemoryTestimonialRepository(sites));
    const valid = { subdomain: 'happy-tails', text: 'Thoughtful care every time.', source: 'Taylor, repeat client', permissionAttested: true, published: true };

    await expect(trust.createOwnedTestimonial('owner-1', { ...valid, source: ' ' })).rejects.toMatchObject({ code: 'INVALID_TESTIMONIAL' });
    await expect(trust.createOwnedTestimonial('owner-1', { ...valid, permissionAttested: false })).rejects.toMatchObject({ code: 'PERMISSION_REQUIRED' });
    await expect(trust.createOwnedTestimonial('owner-1', { ...valid, text: 'a'.repeat(1_001) })).rejects.toMatchObject({ code: 'INVALID_TESTIMONIAL' });
    await expect(trust.createOwnedTestimonial('owner-1', { ...valid, subdomain: 'other-care' })).rejects.toMatchObject({ code: 'SITE_NOT_OWNED' });
  });

  it('lets only the owner edit, hide, republish, and remove without changing testimonial type', async () => {
    let clock = Date.parse('2026-08-26T16:00:00.000Z');
    const trust = createTrustReferralEligibility(createMemoryTestimonialRepository(sites), () => new Date(clock));
    const created = await trust.createOwnedTestimonial('owner-1', {
      subdomain: 'happy-tails', text: 'Wonderful care for Luna.', source: 'Sam, cat client', permissionAttested: true, published: true
    });

    await expect(trust.updateOwnedTestimonial('owner-2', created.id, { text: 'Changed', source: 'Other', permissionAttested: true })).rejects.toMatchObject({ code: 'TESTIMONIAL_NOT_OWNED' });
    clock += 1_000;
    const edited = await trust.updateOwnedTestimonial('owner-1', created.id, { text: 'Wonderful, patient care for Luna.', source: 'Sam, cat client', permissionAttested: true });
    expect(edited).toMatchObject({ type: 'SELF_PUBLISHED_TESTIMONIAL', text: 'Wonderful, patient care for Luna.', updatedAt: new Date(clock) });

    clock += 1_000;
    await expect(trust.setOwnedTestimonialPublished('owner-1', created.id, false)).resolves.toMatchObject({ publishedAt: null, hiddenAt: new Date(clock) });
    await expect(trust.listPublicTestimonials('happy-tails')).resolves.toEqual([]);

    clock += 1_000;
    await expect(trust.setOwnedTestimonialPublished('owner-1', created.id, true)).resolves.toMatchObject({ publishedAt: new Date(clock), hiddenAt: null, type: 'SELF_PUBLISHED_TESTIMONIAL' });
    clock += 1_000;
    await expect(trust.removeOwnedTestimonial('owner-1', created.id)).resolves.toBe(true);
    await expect(trust.listPublicTestimonials('happy-tails')).resolves.toEqual([]);
    await expect(trust.listOwnedTestimonials('owner-1')).resolves.toEqual([]);
  });

  it('exports durable testimonial type and provenance, including hidden testimonials', async () => {
    const trust = createTrustReferralEligibility(createMemoryTestimonialRepository(sites));
    const testimonial = await trust.createOwnedTestimonial('owner-1', {
      subdomain: 'happy-tails', text: 'Our pets light up when Jamie arrives.', source: 'Alex, drop-in client', permissionAttested: true, published: false
    });

    await expect(trust.exportOwnedTestimonials('owner-1')).resolves.toEqual([{
      id: testimonial.id,
      siteSubdomain: 'happy-tails',
      type: 'SELF_PUBLISHED_TESTIMONIAL',
      text: 'Our pets light up when Jamie arrives.',
      displayedSource: 'Alex, drop-in client',
      permissionAttestedAt: testimonial.permissionAttestedAt.toISOString(),
      publicationState: 'HIDDEN',
      publishedAt: null,
      hiddenAt: testimonial.hiddenAt?.toISOString() ?? null,
      createdAt: testimonial.createdAt.toISOString(),
      updatedAt: testimonial.updatedAt.toISOString()
    }]);
    await expect(trust.exportOwnedBusinessTestimonials('owner-1')).resolves.toMatchObject({
      schemaVersion: 'sitterfolio.business-testimonials.v1',
      businesses: [{ businessId: 'business-1', testimonials: [expect.objectContaining({ id: testimonial.id, type: 'SELF_PUBLISHED_TESTIMONIAL', displayedSource: 'Alex, drop-in client' })] }]
    });
  });
});
