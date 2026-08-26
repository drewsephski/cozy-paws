import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { query, setupIntegrationDatabase, teardownIntegrationDatabase } from './support/test-database';

vi.mock('../../lib/db', async () => import('./support/test-database'));

import { trustReferralEligibility } from '../../lib/trust-referral-eligibility';

const ids = {
  business1: '00000000-0000-4000-8000-000000000301',
  business2: '00000000-0000-4000-8000-000000000302',
  site1: '00000000-0000-4000-8000-000000000311',
  site2: '00000000-0000-4000-8000-000000000312'
};

beforeAll(async () => {
  await setupIntegrationDatabase();
  await query(`insert into "user"("id","name","email","emailVerified","createdAt","updatedAt") values
    ('testimonial-owner-1','Owner One','testimonial-one@example.com',true,now(),now()),
    ('testimonial-owner-2','Owner Two','testimonial-two@example.com',true,now(),now())`);
  await query(`insert into business(id,owner_user_id,name) values
    ($1,'testimonial-owner-1','First Care'),($2,'testimonial-owner-2','Second Care')`, [ids.business1, ids.business2]);
  await query(`insert into site(id,business_id,subdomain,emoji,onboarding_completed_at) values
    ($1,$2,'testimonial-one','dog',now()),($3,$4,'testimonial-two','cat',now())`, [ids.site1, ids.business1, ids.site2, ids.business2]);
});

afterAll(teardownIntegrationDatabase);

describe('Self-published testimonials against real PostgreSQL', () => {
  it('enforces ownership, publication visibility, provenance, and soft removal', async () => {
    const testimonial = await trustReferralEligibility.createOwnedTestimonial('testimonial-owner-1', {
      subdomain: 'testimonial-one',
      text: 'Patient, dependable care for our senior dog.',
      source: 'Casey, senior-dog client',
      permissionAttested: true,
      published: true
    });

    await expect(trustReferralEligibility.updateOwnedTestimonial('testimonial-owner-2', testimonial.id, {
      text: 'Changed by another owner', source: 'Wrong source', permissionAttested: true
    })).rejects.toMatchObject({ code: 'TESTIMONIAL_NOT_OWNED' });
    await expect(trustReferralEligibility.listPublicTestimonials('testimonial-one')).resolves.toEqual([
      expect.objectContaining({ id: testimonial.id, type: 'SELF_PUBLISHED_TESTIMONIAL', source: 'Casey, senior-dog client' })
    ]);
    await expect(trustReferralEligibility.listPublicTestimonials('testimonial-two')).resolves.toEqual([]);

    await trustReferralEligibility.setOwnedTestimonialPublished('testimonial-owner-1', testimonial.id, false);
    await expect(trustReferralEligibility.listPublicTestimonials('testimonial-one')).resolves.toEqual([]);
    await expect(trustReferralEligibility.exportOwnedTestimonials('testimonial-owner-1')).resolves.toEqual([
      expect.objectContaining({ id: testimonial.id, type: 'SELF_PUBLISHED_TESTIMONIAL', displayedSource: 'Casey, senior-dog client', publicationState: 'HIDDEN' })
    ]);

    await trustReferralEligibility.removeOwnedTestimonial('testimonial-owner-1', testimonial.id);
    await expect(trustReferralEligibility.listOwnedTestimonials('testimonial-owner-1')).resolves.toEqual([]);
    const retained = await query<{ testimonial_type: string; deleted_at: Date | null }>(`select testimonial_type,deleted_at from testimonial where id=$1`, [testimonial.id]);
    expect(retained.rows[0]).toEqual({ testimonial_type: 'SELF_PUBLISHED_TESTIMONIAL', deleted_at: expect.any(Date) });
  });

  it('rejects mismatched Site and Business ownership and any non-testimonial type at the database boundary', async () => {
    await expect(query(`insert into testimonial(site_id,business_id,testimonial_type,testimonial_text,displayed_source,permission_attested_at) values($1,$2,'SELF_PUBLISHED_TESTIMONIAL','Wrong owner','Source',now())`, [ids.site1, ids.business2])).rejects.toMatchObject({ code: '23503' });
    await expect(query(`insert into testimonial(site_id,business_id,testimonial_type,testimonial_text,displayed_source,permission_attested_at) values($1,$2,'VERIFIED_CARE_REVIEW','Cannot upgrade','Source',now())`, [ids.site1, ids.business1])).rejects.toMatchObject({ code: '23514' });
  });
});
