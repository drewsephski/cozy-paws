import { describe, expect, it } from 'vitest';
import { buildPublicCheckoutParams, parsePublicPaymentAmount } from './public-payments';

describe('public Site payments', () => {
  it('accepts a customer-entered dollar amount within the supported range', () => {
    expect(parsePublicPaymentAmount('125.50')).toBe(12550);
    expect(() => parsePublicPaymentAmount('0.99')).toThrow(/between/);
    expect(() => parsePublicPaymentAmount('10000.01')).toThrow(/between/);
    expect(() => parsePublicPaymentAmount('12.345')).toThrow(/valid amount/);
  });

  it('creates connected-account Checkout metadata with a server-derived fee', () => {
    const params = buildPublicCheckoutParams({ id: 'payment-1', publicToken: 'public-token', amountCents: 12550, platformFeeCents: 377, currency: 'usd', businessName: 'Happy Tails', subdomain: 'happy-tails' });
    expect(params.client_reference_id).toBe('payment-1');
    expect(params.line_items).toEqual([{ price_data: { currency: 'usd', unit_amount: 12550, product_data: { name: 'Payment to Happy Tails' } }, quantity: 1 }]);
    expect(params.payment_intent_data).toEqual({ application_fee_amount: 377, metadata: { publicPaymentId: 'payment-1' } });
    expect(params.metadata).toEqual({ publicPaymentId: 'payment-1' });
    expect(params.success_url).toContain('/s/happy-tails/payment/success?payment=public-token');
  });
});
