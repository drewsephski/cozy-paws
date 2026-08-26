import { describe, expect, it } from 'vitest';
import { createCommercialLifecycle, type CommercialLifecycleRepository } from './commercial-lifecycle';

describe('Business commercial lifecycle service', () => {
  it('returns owner-scoped trial dates, state, and payment-method eligibility', async () => {
    const repository: CommercialLifecycleRepository = {
      readOwnerCommercialTrials: async (ownerUserId) => {
        expect(ownerUserId).toBe('owner-1');
        return [
          {
            businessId: 'business-1',
            businessName: 'Happy Tails',
            trialStartedAt: new Date('2026-08-26T15:00:00.000Z'),
            trialEndsAt: new Date('2026-09-25T15:00:00.000Z')
          },
          {
            businessId: 'business-2',
            businessName: 'Draft Care',
            trialStartedAt: null,
            trialEndsAt: null
          }
        ];
      }
    };
    const lifecycle = createCommercialLifecycle(repository, () => new Date('2026-08-27T15:00:00.000Z'));

    await expect(lifecycle.listOwnerCommercialStates('owner-1')).resolves.toEqual([
      {
        businessId: 'business-1',
        businessName: 'Happy Tails',
        currentState: 'TRIAL',
        trialStartedAt: new Date('2026-08-26T15:00:00.000Z'),
        trialEndsAt: new Date('2026-09-25T15:00:00.000Z'),
        paymentMethodEligible: true
      },
      {
        businessId: 'business-2',
        businessName: 'Draft Care',
        currentState: 'NOT_STARTED',
        trialStartedAt: null,
        trialEndsAt: null,
        paymentMethodEligible: false
      }
    ]);
  });
});
