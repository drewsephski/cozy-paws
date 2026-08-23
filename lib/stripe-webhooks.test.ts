import { beforeEach, describe, expect, it, vi } from 'vitest';
import Stripe from 'stripe';

const { clientQueryMock, transactionMock } = vi.hoisted(() => {
  const clientQueryMock = vi.fn();
  return {
    clientQueryMock,
    transactionMock: vi.fn(async (work: (client: { query: typeof clientQueryMock }) => Promise<unknown>) => work({ query: clientQueryMock })),
  };
});
vi.mock('./db', () => ({ transaction: transactionMock }));

import { checkoutEventOutcome, processStripeEvent } from './stripe-webhooks';

describe('Stripe Checkout webhook outcomes', () => {
  beforeEach(() => {
    clientQueryMock.mockReset();
    transactionMock.mockClear();
  });
  it('waits for delayed payments and fulfills only after asynchronous success', () => {
    expect(checkoutEventOutcome('checkout.session.completed', { status: 'complete', payment_status: 'unpaid' })).toBe('pending');
    expect(checkoutEventOutcome('checkout.session.async_payment_succeeded', { status: 'complete', payment_status: 'paid' })).toBe('paid');
    expect(checkoutEventOutcome('checkout.session.async_payment_failed', { status: 'complete', payment_status: 'unpaid' })).toBe('failed');
  });

  it('rejects inconsistent paid-event state', () => {
    expect(() => checkoutEventOutcome('checkout.session.async_payment_succeeded', { status: 'complete', payment_status: 'unpaid' })).toThrow(/inconsistent/);
  });

  it('increments the durable retry generation when a delayed payment fails', async () => {
    const row = {
      id: 'request-1', lead_id: 'lead-1', amount_cents: 24000, platform_fee_cents: 720, currency: 'usd', status: 'OPEN',
      refunded_amount_cents: 0, application_fee_refunded_cents: 0, stripe_checkout_session_id: 'cs_failed',
      stripe_payment_intent_id: null, stripe_charge_id: null, stripe_application_fee_id: null, stripe_account_id: 'acct_1',
    };
    clientQueryMock.mockImplementation(async (sql: string) => {
      if (sql.includes('select event_id')) return { rowCount: 0, rows: [] };
      if (sql.includes('select pr.*')) return { rowCount: 1, rows: [row] };
      return { rowCount: 1, rows: [] };
    });
    const event = {
      id: 'evt_failed', type: 'checkout.session.async_payment_failed', account: 'acct_1',
      data: { object: { id: 'cs_failed', status: 'complete', payment_status: 'unpaid', client_reference_id: 'request-1', metadata: { paymentRequestId: 'request-1' } } },
    } as unknown as Stripe.Event;

    await processStripeEvent(event);

    expect(clientQueryMock).toHaveBeenCalledWith(expect.stringContaining('stripe_checkout_retry_generation=stripe_checkout_retry_generation+1'), ['request-1']);
  });
});
