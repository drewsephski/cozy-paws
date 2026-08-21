import { describe, expect, it } from 'vitest';
import { buildCheckoutSessionParams, checkoutLifecycleDecision } from './checkout';

const request = { id: 'request-1', public_token: 'token', amount_cents: 24000, platform_fee_cents: 720, description: 'Overnight care', customer_email: 'client@example.com', currency: 'usd', status: 'OPEN', stripe_checkout_session_id: null, stripe_account_id: 'acct_1' };

describe('canonical Checkout', () => {
  it('uses a direct charge and server-snapshotted application fee', () => expect(buildCheckoutSessionParams(request)).toMatchObject({ mode: 'payment', payment_method_types: ['card'], client_reference_id: 'request-1', payment_intent_data: { application_fee_amount: 720, metadata: { paymentRequestId: 'request-1' } } }));
  it('reuses an open canonical session and replaces only an expired one', () => {
    const base = { id: 'cs_1', paymentStatus: 'unpaid', url: 'https://checkout.stripe.test/1', clientReferenceId: 'request-1', paymentRequestId: 'request-1', amountTotal: 24000, currency: 'usd' };
    expect(checkoutLifecycleDecision(request, { ...base, status: 'open' })).toBe('reuse');
    expect(checkoutLifecycleDecision(request, { ...base, status: 'expired' })).toBe('replace');
    expect(() => checkoutLifecycleDecision(request, { ...base, status: 'open', amountTotal: 1 })).toThrow(/amount/);
  });
});
