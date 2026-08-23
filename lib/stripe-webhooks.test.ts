import { describe, expect, it } from 'vitest';
import { checkoutEventOutcome } from './stripe-webhooks';

describe('Stripe Checkout webhook outcomes', () => {
  it('waits for delayed payments and fulfills only after asynchronous success', () => {
    expect(checkoutEventOutcome('checkout.session.completed', { status: 'complete', payment_status: 'unpaid' })).toBe('pending');
    expect(checkoutEventOutcome('checkout.session.async_payment_succeeded', { status: 'complete', payment_status: 'paid' })).toBe('paid');
    expect(checkoutEventOutcome('checkout.session.async_payment_failed', { status: 'complete', payment_status: 'unpaid' })).toBe('failed');
  });

  it('rejects inconsistent paid-event state', () => {
    expect(() => checkoutEventOutcome('checkout.session.async_payment_succeeded', { status: 'complete', payment_status: 'unpaid' })).toThrow(/inconsistent/);
  });
});
