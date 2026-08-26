import { describe, expect, it } from 'vitest';
import { commercialStateAt } from './commercial-lifecycle';

describe('Business commercial lifecycle', () => {
  const trialStartedAt = new Date('2026-08-26T15:00:00.000Z');
  const trialEndsAt = new Date('2026-09-25T15:00:00.000Z');

  it('keeps a Business in trial until the exact 30-day boundary', () => {
    expect(commercialStateAt({ trialStartedAt, trialEndsAt }, new Date('2026-09-25T14:59:59.999Z'))).toBe('TRIAL');
  });

  it('ends a Business trial at the exact boundary', () => {
    expect(commercialStateAt({ trialStartedAt, trialEndsAt }, trialEndsAt)).toBe('TRIAL_ENDED');
  });

  it('does not expose payment-method setup before a Business publishes a Site', () => {
    expect(commercialStateAt(null, new Date('2026-08-26T15:00:00.000Z'))).toBe('NOT_STARTED');
  });
});
