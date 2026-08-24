import Stripe from 'stripe';
import type { PoolClient } from 'pg';
import { transaction } from './db';
import { applyPaymentSignal, calculateApplicationFeeRefundTargetCents, type PaymentState, type PaymentStatus } from './domain/payments';
import { getStripe } from './stripe';
import { maybeProcessPublicPaymentEvent } from './public-payment-webhooks';
import { checkoutEventOutcome } from './stripe-checkout-outcome';
export { checkoutEventOutcome } from './stripe-checkout-outcome';

type Row = { id: string; lead_id: string; amount_cents: number; platform_fee_cents: number; currency: string; status: PaymentStatus; refunded_amount_cents: number; application_fee_refunded_cents: number; stripe_checkout_session_id: string | null; stripe_payment_intent_id: string | null; stripe_charge_id: string | null; stripe_application_fee_id: string | null; stripe_account_id: string };
const objectId = (value: string | { id: string } | null) => typeof value === 'string' ? value : value?.id ?? null;
const toState = (row: Row): PaymentState => ({ requestId: row.id, connectedAccountId: row.stripe_account_id, amountCents: row.amount_cents, currency: row.currency, status: row.status, refundedAmountCents: row.refunded_amount_cents, checkoutSessionId: row.stripe_checkout_session_id, paymentIntentId: row.stripe_payment_intent_id, chargeId: row.stripe_charge_id });

async function stripeObjects(accountId: string, intentValue: string | Stripe.PaymentIntent | null, chargeValue: string | Stripe.Charge | null) {
  let intent = typeof intentValue === 'object' && intentValue ? intentValue : null;
  const intentId = objectId(intentValue);
  if (!intent && intentId) intent = await getStripe().paymentIntents.retrieve(intentId, { expand: ['latest_charge.application_fee'] }, { stripeAccount: accountId });
  if (intent?.metadata.paymentRequestId && intent.metadata.publicPaymentId) throw new Error('PaymentIntent claims multiple Sitterfolio payment aggregates');
  if (!intent?.metadata.paymentRequestId) return null;
  const chargeId = objectId(chargeValue) ?? objectId(intent.latest_charge);
  if (!chargeId) throw new Error('PaymentIntent has no Charge');
  const charge = await getStripe().charges.retrieve(chargeId, { expand: ['application_fee'] }, { stripeAccount: accountId });
  if (objectId(charge.payment_intent) !== intent.id) throw new Error('Charge does not belong to the PaymentIntent');
  let applicationFeeId = objectId(charge.application_fee);
  if (!applicationFeeId) applicationFeeId = (await getStripe().applicationFees.list({ charge: charge.id, limit: 1 })).data[0]?.id ?? null;
  return { requestId: intent.metadata.paymentRequestId, paymentIntentId: intent.id, charge, applicationFeeId };
}

async function lockedRow(client: PoolClient, requestId: string) {
  await client.query('select pg_advisory_xact_lock(hashtext($1))', [requestId]);
  const result = await client.query<Row>(`select pr.* from payment_request pr where pr.id=$1 for update`, [requestId]);
  if (!result.rows[0]?.stripe_account_id) throw new Error('No payment request exists for this Stripe object');
  return result.rows[0];
}

async function reconcileFeeRefund(row: Row, charge: Stripe.Charge, feeId: string | null) {
  if (!feeId) throw new Error('Application fee is not available yet; Stripe should retry');
  const fee = await getStripe().applicationFees.retrieve(feeId);
  if (objectId(fee.account) !== row.stripe_account_id || objectId(fee.charge) !== charge.id || fee.amount !== row.platform_fee_cents || fee.currency !== row.currency) throw new Error('Application fee does not match this payment');
  const target = calculateApplicationFeeRefundTargetCents(row.platform_fee_cents, row.amount_cents, charge.amount_refunded);
  if (fee.amount_refunded > target) throw new Error('Application fee refund exceeds expected target');
  if (target > fee.amount_refunded) await getStripe().applicationFees.createRefund(fee.id, { amount: target - fee.amount_refunded }, { idempotencyKey: `sitterfolio-fee-refund-${fee.id}-${target}` });
  return target;
}

export async function processStripeEvent(event: Stripe.Event) {
  const accountId = typeof event.account === 'string' ? event.account : null;
  const checkoutEvents = ['checkout.session.completed', 'checkout.session.async_payment_succeeded', 'checkout.session.async_payment_failed'];
  const handled = [...checkoutEvents, 'charge.refunded', 'charge.dispute.created', 'charge.dispute.closed'].includes(event.type);
  if (!handled) { await transaction(async (client) => { await client.query(`insert into stripe_webhook_event(event_id,event_type) values($1,$2) on conflict do nothing`, [event.id, event.type]); }); return; }
  if (!accountId) throw new Error('Expected a connected-account Stripe event');
  const acknowledgeUnrelated = async () => transaction(async (client) => {
    await client.query(`insert into stripe_webhook_event(event_id,event_type) values($1,$2) on conflict do nothing`, [event.id, event.type]);
  });
  if (checkoutEvents.includes(event.type)) {
    const metadata = (event.data.object as Stripe.Checkout.Session).metadata;
    if (!metadata?.paymentRequestId && !metadata?.publicPaymentId) return acknowledgeUnrelated();
    if (metadata.paymentRequestId && metadata.publicPaymentId) throw new Error('Checkout Session claims multiple Sitterfolio payment aggregates');
  }
  if (await maybeProcessPublicPaymentEvent(event, accountId)) return;

  let objects; let signal; let paidAt: Date | null = null;
  if (checkoutEvents.includes(event.type)) {
    const session = event.data.object as Stripe.Checkout.Session;
    const requestId = session.metadata?.paymentRequestId ?? '';
    if (!requestId || session.client_reference_id !== requestId) throw new Error('Checkout Session does not identify a Sitterfolio payment');
    const outcome = checkoutEventOutcome(event.type, session);
    if (outcome !== 'paid') {
      await transaction(async (client) => {
        if ((await client.query(`select event_id from stripe_webhook_event where event_id=$1`, [event.id])).rowCount) return;
        const row = await lockedRow(client, requestId);
        if (row.stripe_account_id !== accountId || row.stripe_checkout_session_id !== session.id) throw new Error('Checkout Session does not match the canonical payment request');
        if (outcome === 'failed' && row.status === 'OPEN') await client.query(`update payment_request set stripe_checkout_session_id=null,stripe_checkout_retry_generation=stripe_checkout_retry_generation+1,updated_at=now() where id=$1`, [row.id]);
        await client.query(`insert into stripe_webhook_event(event_id,event_type) values($1,$2)`, [event.id, event.type]);
      });
      return;
    }
    objects = await stripeObjects(accountId, typeof session.payment_intent === 'string' ? session.payment_intent : null, null);
    if (!objects || objects.requestId !== requestId) throw new Error('Checkout and PaymentIntent metadata disagree');
    paidAt = new Date(objects.charge.created * 1000);
    signal = { kind: 'checkout' as const, requestId, connectedAccountId: accountId, amountCents: session.amount_total ?? -1, currency: session.currency ?? '', checkoutSessionId: session.id, paymentIntentId: objects.paymentIntentId, chargeId: objects.charge.id };
  } else if (event.type === 'charge.refunded') {
    const charge = event.data.object as Stripe.Charge;
    objects = await stripeObjects(accountId, charge.payment_intent, charge);
    if (!objects) return acknowledgeUnrelated();
    signal = { kind: 'refund' as const, requestId: objects.requestId, connectedAccountId: accountId, amountCents: charge.amount, currency: charge.currency, paymentIntentId: objects.paymentIntentId, chargeId: charge.id, refundedAmountCents: charge.amount_refunded };
  } else {
    const eventDispute = event.data.object as Stripe.Dispute;
    const dispute = await getStripe().disputes.retrieve(eventDispute.id, {}, { stripeAccount: accountId });
    objects = await stripeObjects(accountId, dispute.payment_intent, dispute.charge);
    if (!objects) return acknowledgeUnrelated();
    const outcome = dispute.status === 'lost' ? 'lost' as const : ['won', 'prevented', 'warning_closed'].includes(dispute.status) ? 'won' as const : undefined;
    if (event.type === 'charge.dispute.closed' && !outcome) throw new Error(`Unsupported closed dispute status: ${dispute.status}`);
    signal = { kind: outcome ? 'dispute_closed' as const : 'dispute_created' as const, requestId: objects.requestId, connectedAccountId: accountId, amountCents: objects.charge.amount, currency: objects.charge.currency, paymentIntentId: objects.paymentIntentId, chargeId: objects.charge.id, disputeOutcome: outcome };
  }

  await transaction(async (client) => {
    if ((await client.query(`select event_id from stripe_webhook_event where event_id=$1`, [event.id])).rowCount) return;
    const row = await lockedRow(client, signal.requestId);
    let current = toState(row);
    if (objects.charge.amount_refunded > current.refundedAmountCents) current = applyPaymentSignal(current, { kind: 'refund', requestId: row.id, connectedAccountId: accountId, amountCents: objects.charge.amount, currency: objects.charge.currency, paymentIntentId: objects.paymentIntentId, chargeId: objects.charge.id, refundedAmountCents: objects.charge.amount_refunded });
    const next = applyPaymentSignal(current, signal);
    const feeRefunded = objects.charge.amount_refunded ? await reconcileFeeRefund(row, objects.charge, objects.applicationFeeId) : row.application_fee_refunded_cents;
    await client.query(`update payment_request set status=$2,refunded_amount_cents=$3,application_fee_refunded_cents=$4,stripe_checkout_session_id=$5,stripe_payment_intent_id=$6,stripe_charge_id=$7,stripe_application_fee_id=coalesce($8,stripe_application_fee_id),paid_at=coalesce(paid_at,$9),updated_at=now() where id=$1`, [row.id, next.status, next.refundedAmountCents, feeRefunded, next.checkoutSessionId, next.paymentIntentId, next.chargeId, objects.applicationFeeId, paidAt]);
    if (next.status === 'PAID') { await client.query(`update lead set status='BOOKED',updated_at=now() where id=$1 and status='QUOTED'`, [row.lead_id]); await client.query(`insert into lead_event(lead_id,kind) select $1,'BOOKED' where not exists(select 1 from lead_event where lead_id=$1 and kind='BOOKED')`, [row.lead_id]); }
    await client.query(`insert into stripe_webhook_event(event_id,event_type) values($1,$2)`, [event.id, event.type]);
  });
}
