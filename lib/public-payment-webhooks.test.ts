import { beforeEach, describe, expect, it, vi } from 'vitest';
import Stripe from 'stripe';

const { clientQueryMock, retrieveIntentMock, retrieveChargeMock, listFeesMock } = vi.hoisted(() => ({
  clientQueryMock: vi.fn(), retrieveIntentMock: vi.fn(), retrieveChargeMock: vi.fn(), listFeesMock: vi.fn(),
}));
vi.mock('./db', () => ({ transaction: vi.fn(async (work: (client: { query: typeof clientQueryMock }) => Promise<unknown>) => work({ query: clientQueryMock })) }));
vi.mock('./stripe', () => ({ getStripe: () => ({
  paymentIntents: { retrieve: retrieveIntentMock }, charges: { retrieve: retrieveChargeMock },
  applicationFees: { list: listFeesMock, retrieve: vi.fn(), createRefund: vi.fn() }, disputes: { retrieve: vi.fn() },
}) }));

import { maybeProcessPublicPaymentEvent } from './public-payment-webhooks';

describe('public payment Stripe reconciliation', () => {
  beforeEach(() => {
    clientQueryMock.mockReset(); retrieveIntentMock.mockReset(); retrieveChargeMock.mockReset(); listFeesMock.mockReset();
  });

  it('marks the durable public payment paid from a matching signed Checkout event', async () => {
    const row = { id: 'public-1', amount_cents: 12550, platform_fee_cents: 377, currency: 'usd', status: 'OPEN', refunded_amount_cents: 0, application_fee_refunded_cents: 0, stripe_checkout_session_id: 'cs_1', stripe_payment_intent_id: null, stripe_charge_id: null, stripe_application_fee_id: null, stripe_account_id: 'acct_1' };
    clientQueryMock.mockImplementation(async (sql: string) => {
      if (sql.includes('select event_id')) return { rowCount: 0, rows: [] };
      if (sql.includes('select pp.*')) return { rowCount: 1, rows: [row] };
      return { rowCount: 1, rows: [] };
    });
    retrieveIntentMock.mockResolvedValue({ id: 'pi_1', metadata: { publicPaymentId: 'public-1' }, latest_charge: 'ch_1' });
    retrieveChargeMock.mockResolvedValue({ id: 'ch_1', payment_intent: 'pi_1', application_fee: 'fee_1', amount: 12550, amount_refunded: 0, currency: 'usd', created: 1_700_000_000 });
    const event = { id: 'evt_1', type: 'checkout.session.completed', account: 'acct_1', data: { object: { id: 'cs_1', status: 'complete', payment_status: 'paid', client_reference_id: 'public-1', metadata: { publicPaymentId: 'public-1' }, payment_intent: 'pi_1', amount_total: 12550, currency: 'usd' } } } as unknown as Stripe.Event;

    expect(await maybeProcessPublicPaymentEvent(event, 'acct_1')).toBe(true);
    expect(clientQueryMock).toHaveBeenCalledWith(expect.stringContaining('update public_payment set status=$2'), ['public-1', 'PAID', 0, 0, 'cs_1', 'pi_1', 'ch_1', 'fee_1', new Date(1_700_000_000_000)]);
  });

  it('leaves inquiry payment handling alone when public metadata is absent', async () => {
    const event = { id: 'evt_2', type: 'checkout.session.completed', data: { object: { metadata: { paymentRequestId: 'request-1' } } } } as unknown as Stripe.Event;
    expect(await maybeProcessPublicPaymentEvent(event, 'acct_1')).toBe(false);
  });
});
