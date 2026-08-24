import { beforeEach, describe, expect, it, vi } from 'vitest';
import Stripe from 'stripe';

const { clientQueryMock, transactionMock, retrieveIntentMock, retrieveDisputeMock } = vi.hoisted(() => {
  const clientQueryMock = vi.fn();
  return {
    clientQueryMock,
    transactionMock: vi.fn(async (work: (client: { query: typeof clientQueryMock }) => Promise<unknown>) => work({ query: clientQueryMock })),
    retrieveIntentMock: vi.fn(),
    retrieveDisputeMock: vi.fn(),
  };
});
vi.mock('./db', () => ({ transaction: transactionMock }));
vi.mock('./stripe', () => ({ getStripe: () => ({
  paymentIntents: { retrieve: retrieveIntentMock },
  charges: { retrieve: vi.fn() },
  disputes: { retrieve: retrieveDisputeMock },
  applicationFees: { list: vi.fn(), retrieve: vi.fn(), createRefund: vi.fn() }
}) }));

import { checkoutEventOutcome, processStripeEvent } from './stripe-webhooks';

describe('Stripe Checkout webhook outcomes', () => {
  beforeEach(() => {
    clientQueryMock.mockReset();
    transactionMock.mockClear();
    retrieveIntentMock.mockReset();
    retrieveDisputeMock.mockReset();
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

  it.each([
    ['checkout.session.completed', { id: 'cs_external', metadata: {}, client_reference_id: null }],
    ['charge.refunded', { id: 'ch_external', payment_intent: 'pi_external' }],
    ['charge.dispute.created', { id: 'dp_external' }]
  ])('acknowledges and deduplicates unrelated %s events', async (type, object) => {
    clientQueryMock.mockResolvedValue({ rowCount: 1, rows: [] });
    retrieveIntentMock.mockResolvedValue({ id: 'pi_external', metadata: {}, latest_charge: 'ch_external' });
    retrieveDisputeMock.mockResolvedValue({ id: 'dp_external', status: 'needs_response', payment_intent: 'pi_external', charge: 'ch_external' });
    const event = { id: `evt-${type}`, type, account: 'acct_1', data: { object } } as unknown as Stripe.Event;

    await expect(processStripeEvent(event)).resolves.toBeUndefined();
    expect(clientQueryMock).toHaveBeenCalledWith(expect.stringContaining('on conflict do nothing'), [event.id, type]);
  });

  it.each([
    { id: 'cs_bad_reference', payment_status: 'paid', status: 'complete', client_reference_id: 'other', metadata: { paymentRequestId: 'request-1' } },
    { id: 'cs_two_claims', payment_status: 'paid', status: 'complete', client_reference_id: 'request-1', metadata: { paymentRequestId: 'request-1', publicPaymentId: 'public-1' } }
  ])('fails closed for a malformed event that claims Sitterfolio metadata', async (session) => {
    const event = { id: `evt-${session.id}`, type: 'checkout.session.completed', account: 'acct_1', data: { object: session } } as unknown as Stripe.Event;
    await expect(processStripeEvent(event)).rejects.toThrow();
    expect(clientQueryMock).not.toHaveBeenCalledWith(expect.stringContaining('on conflict do nothing'), expect.anything());
  });

  it('fails closed when a refund PaymentIntent claims both payment aggregates', async () => {
    retrieveIntentMock.mockResolvedValue({ id: 'pi_ambiguous', metadata: { paymentRequestId: 'request-1', publicPaymentId: 'public-1' }, latest_charge: 'ch_ambiguous' });
    const event = { id: 'evt-ambiguous-refund', type: 'charge.refunded', account: 'acct_1', data: { object: { id: 'ch_ambiguous', payment_intent: 'pi_ambiguous' } } } as unknown as Stripe.Event;

    await expect(processStripeEvent(event)).rejects.toThrow(/multiple Sitterfolio payment aggregates/);
    expect(clientQueryMock).not.toHaveBeenCalledWith(expect.stringContaining('on conflict do nothing'), expect.anything());
  });
});
