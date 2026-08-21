import { describe, expect, it } from 'vitest';
import { applyPaymentSignal, calculateApplicationFeeRefundTargetCents, calculatePlatformFeeCents, revenueFromPayments } from './payments';

const state = { requestId: 'request-1', connectedAccountId: 'acct_1', amountCents: 24000, currency: 'usd', status: 'OPEN' as const, refundedAmountCents: 0, checkoutSessionId: 'cs_1', paymentIntentId: null, chargeId: null };

describe('payment integrity', () => {
  it('calculates the server-authoritative 3% fee in integer cents', () => expect(calculatePlatformFeeCents(24000)).toBe(720));
  it('validates ownership and amount before marking a webhook payment paid', () => {
    expect(applyPaymentSignal(state, { kind: 'checkout', requestId: 'request-1', connectedAccountId: 'acct_1', amountCents: 24000, currency: 'usd', checkoutSessionId: 'cs_1', paymentIntentId: 'pi_1', chargeId: 'ch_1' }).status).toBe('PAID');
    expect(() => applyPaymentSignal(state, { kind: 'checkout', requestId: 'request-1', connectedAccountId: 'acct_other', amountCents: 24000, currency: 'usd' })).toThrow(/connected account/);
  });
  it('tracks refunds without changing the commercial lead relationship', () => {
    const paid = { ...state, status: 'PAID' as const };
    expect(applyPaymentSignal(paid, { kind: 'refund', requestId: 'request-1', connectedAccountId: 'acct_1', amountCents: 24000, currency: 'usd', refundedAmountCents: 4000 })).toMatchObject({ status: 'PARTIALLY_REFUNDED', refundedAmountCents: 4000 });
    expect(calculateApplicationFeeRefundTargetCents(720, 24000, 4000)).toBe(120);
  });
});

describe('revenue reporting', () => {
  it('counts each stored payment once and reports net volume after refunds', () => {
    expect(revenueFromPayments([{ id: '1', status: 'PAID', amountCents: 24000, refundedAmountCents: 0 }, { id: '2', status: 'PARTIALLY_REFUNDED', amountCents: 10000, refundedAmountCents: 2500 }, { id: '3', status: 'CHARGEBACK', amountCents: 5000, refundedAmountCents: 0 }])).toEqual({ successfulPayments: 2, grossPaidCents: 34000, generatedRevenueCents: 31500 });
  });
});
