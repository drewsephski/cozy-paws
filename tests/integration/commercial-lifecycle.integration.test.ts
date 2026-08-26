import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { query, setupIntegrationDatabase, teardownIntegrationDatabase } from './support/test-database';

vi.mock('../../lib/db', async () => import('./support/test-database'));
vi.mock('../../lib/redis-profile-repository', () => ({
  redisProfileRepository: {
    readProfile: vi.fn().mockResolvedValue(null),
    listOwnerSubdomains: vi.fn().mockResolvedValue([])
  }
}));

import { commercialLifecycle } from '../../lib/commercial-lifecycle';
import { postgresProfileRepository } from '../../lib/postgres-profile-repository';

const draftBusinessId = '00000000-0000-4000-8000-000000000201';
const firstDraftSiteId = '00000000-0000-4000-8000-000000000211';
const secondDraftSiteId = '00000000-0000-4000-8000-000000000212';

beforeAll(async () => {
  await setupIntegrationDatabase();
  await query(`insert into "user"("id","name","email","emailVerified","createdAt","updatedAt") values
    ('trial-owner','Trial Owner','trial@example.com',true,now(),now()),
    ('draft-owner','Draft Owner','draft@example.com',true,now(),now()),
    ('other-owner','Other Owner','other-trial@example.com',true,now(),now())`);
  await query(`insert into business(id,owner_user_id,name) values($1,'draft-owner','Draft Care')`, [draftBusinessId]);
  await query(`insert into site(id,business_id,subdomain,emoji,onboarding_completed_at) values
    ($1,$3,'first-draft','dog',null),($2,$3,'second-draft','cat',null)`,
  [firstDraftSiteId, secondDraftSiteId, draftBusinessId]);
});

afterAll(teardownIntegrationDatabase);

describe('Business commercial lifecycle against real PostgreSQL', () => {
  it('starts one 30-day trial atomically when a finished Site is created', async () => {
    await expect(postgresProfileRepository.createProfile('trial-care', {
      ownerId: 'trial-owner',
      emoji: 'dog',
      createdAt: Date.parse('2026-08-26T15:00:00.000Z'),
      businessName: 'Trial Care',
      onboardingCompletedAt: Date.parse('2026-08-26T15:00:00.000Z')
    })).resolves.toBe(true);

    await expect(commercialLifecycle.listOwnerCommercialStates('trial-owner')).resolves.toEqual([
      expect.objectContaining({
        businessName: 'Trial Care',
        trialStartedAt: new Date('2026-08-26T15:00:00.000Z'),
        trialEndsAt: new Date('2026-09-25T15:00:00.000Z'),
        paymentMethodEligible: true
      })
    ]);
    await expect(commercialLifecycle.listOwnerCommercialStates('other-owner')).resolves.toEqual([]);

    await expect(postgresProfileRepository.writeProfile('trial-care', {
      ownerId: 'other-owner',
      emoji: 'cat',
      createdAt: Date.parse('2026-08-26T15:00:00.000Z'),
      onboardingCompletedAt: Date.parse('2026-08-27T15:00:00.000Z')
    })).rejects.toThrow('Owned Site was not found');
    await expect(commercialLifecycle.listOwnerCommercialStates('trial-owner')).resolves.toEqual([
      expect.objectContaining({
        trialStartedAt: new Date('2026-08-26T15:00:00.000Z'),
        trialEndsAt: new Date('2026-09-25T15:00:00.000Z')
      })
    ]);
  });

  it('does not start, reset, or duplicate a Business trial before and after first publication', async () => {
    await expect(commercialLifecycle.listOwnerCommercialStates('draft-owner')).resolves.toEqual([
      expect.objectContaining({ currentState: 'NOT_STARTED', trialStartedAt: null, paymentMethodEligible: false })
    ]);

    await postgresProfileRepository.writeProfile('first-draft', {
      ownerId: 'draft-owner',
      emoji: 'dog',
      createdAt: Date.parse('2026-08-01T12:00:00.000Z'),
      onboardingCompletedAt: Date.parse('2026-08-26T16:00:00.000Z')
    });
    await postgresProfileRepository.writeProfile('first-draft', {
      ownerId: 'draft-owner',
      emoji: 'dog',
      createdAt: Date.parse('2026-08-01T12:00:00.000Z'),
      onboardingCompletedAt: Date.parse('2026-08-27T16:00:00.000Z')
    });
    await postgresProfileRepository.writeProfile('second-draft', {
      ownerId: 'draft-owner',
      emoji: 'cat',
      createdAt: Date.parse('2026-08-01T12:00:00.000Z'),
      onboardingCompletedAt: Date.parse('2026-08-28T16:00:00.000Z')
    });

    const states = await commercialLifecycle.listOwnerCommercialStates('draft-owner');
    expect(states).toEqual([
      expect.objectContaining({
        trialStartedAt: new Date('2026-08-26T16:00:00.000Z'),
        trialEndsAt: new Date('2026-09-25T16:00:00.000Z'),
        paymentMethodEligible: true
      })
    ]);
    const rows = await query<{ count: string }>(`select count(*)::text count from business_commercial_state where business_id=$1`, [draftBusinessId]);
    expect(rows.rows[0].count).toBe('1');
  });
});
