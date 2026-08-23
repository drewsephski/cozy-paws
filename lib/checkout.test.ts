import { describe, expect, it } from 'vitest';
import Stripe from 'stripe';
import { assertConnectedAccountCanAcceptPayments, buildCheckoutSessionParams, checkoutCreationIdempotencyKey, checkoutLifecycleDecision } from './checkout';

const request = { id: 'request-1', public_token: 'token', amount_cents: 24000, platform_fee_cents: 720, description: 'Overnight care', customer_email: 'client@example.com', currency: 'usd', status: 'OPEN', stripe_checkout_session_id: null, stripe_checkout_retry_generation: 0, stripe_account_id: 'acct_1' };

describe('canonical Checkout', () => {
  it('uses a direct charge, dynamic payment methods, and server-snapshotted application fee', () => {
    const params = buildCheckoutSessionParams(request);
    expect(params).toMatchObject({ mode: 'payment', integration_identifier: 'sitterfolio_checkout_nkqvjdpx', client_reference_id: 'request-1', payment_intent_data: { application_fee_amount: 720, metadata: { paymentRequestId: 'request-1' } } });
    expect(params).not.toHaveProperty('payment_method_types');
  });
  it('reuses an open canonical session and replaces only an expired one', () => {
    const base = { id: 'cs_1', paymentStatus: 'unpaid', url: 'https://checkout.stripe.test/1', clientReferenceId: 'request-1', paymentRequestId: 'request-1', amountTotal: 24000, currency: 'usd' };
    expect(checkoutLifecycleDecision(request, { ...base, status: 'open' })).toBe('reuse');
    expect(checkoutLifecycleDecision(request, { ...base, status: 'expired' })).toBe('replace');
    expect(() => checkoutLifecycleDecision(request, { ...base, status: 'open', amountTotal: 1 })).toThrow(/amount/);
  });
  it('fails closed unless Stripe reports card payments active at checkout time', () => {
    const account = (status: 'active' | 'pending' | 'restricted') => ({ configuration: { merchant: { capabilities: { card_payments: { status } } } } }) as Stripe.V2.Core.Account;
    expect(() => assertConnectedAccountCanAcceptPayments(account('active'))).not.toThrow();
    expect(() => assertConnectedAccountCanAcceptPayments(account('pending'))).toThrow(/cannot accept/);
    expect(() => assertConnectedAccountCanAcceptPayments(account('restricted'))).toThrow(/cannot accept/);
  });
  it('uses a fresh durable idempotency key after each failed delayed payment', () => {
    expect(checkoutCreationIdempotencyKey(request)).toBe('sitterfolio-checkout-request-1');
    expect(checkoutCreationIdempotencyKey({ ...request, stripe_checkout_retry_generation: 1 })).toBe('sitterfolio-checkout-request-1-retry-1');
    expect(checkoutCreationIdempotencyKey({ ...request, stripe_checkout_retry_generation: 2 })).toBe('sitterfolio-checkout-request-1-retry-2');
  });
});
