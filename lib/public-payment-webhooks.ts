import Stripe from 'stripe';
import type { PoolClient } from 'pg';
import { transaction } from './db';
import { applyPaymentSignal, calculateApplicationFeeRefundTargetCents, type PaymentState, type PaymentStatus } from './domain/payments';
import { getStripe } from './stripe';
import { checkoutEventOutcome } from './stripe-checkout-outcome';

type PublicRow = { id: string; amount_cents: number; platform_fee_cents: number; currency: string; status: PaymentStatus; refunded_amount_cents: number; application_fee_refunded_cents: number; stripe_checkout_session_id: string | null; stripe_payment_intent_id: string | null; stripe_charge_id: string | null; stripe_application_fee_id: string | null; stripe_account_id: string };
type StripeObjects = { publicPaymentId: string; paymentIntentId: string; charge: Stripe.Charge; applicationFeeId: string | null };
const objectId = (value: string | { id: string } | null) => typeof value === 'string' ? value : value?.id ?? null;

async function paymentIntent(value: string | Stripe.PaymentIntent | null, accountId: string) {
  if (typeof value === 'object' && value) return value;
  return value ? getStripe().paymentIntents.retrieve(value, { expand: ['latest_charge.application_fee'] }, { stripeAccount: accountId }) : null;
}

async function objectsForIntent(value: string | Stripe.PaymentIntent | null, chargeValue: string | Stripe.Charge | null, accountId: string): Promise<StripeObjects | null> {
  const intent = await paymentIntent(value, accountId);
  if (intent?.metadata.paymentRequestId && intent.metadata.publicPaymentId) throw new Error('PaymentIntent claims multiple Sitterfolio payment aggregates');
  const publicPaymentId = intent?.metadata.publicPaymentId;
  if (!intent || !publicPaymentId) return null;
  const chargeId = objectId(chargeValue) ?? objectId(intent.latest_charge);
  if (!chargeId) throw new Error('Public PaymentIntent has no Charge');
  const charge = await getStripe().charges.retrieve(chargeId, { expand: ['application_fee'] }, { stripeAccount: accountId });
  if (objectId(charge.payment_intent) !== intent.id) throw new Error('Public Charge does not belong to the PaymentIntent');
  let applicationFeeId = objectId(charge.application_fee);
  if (!applicationFeeId) applicationFeeId = (await getStripe().applicationFees.list({ charge: charge.id, limit: 1 })).data[0]?.id ?? null;
  return { publicPaymentId, paymentIntentId: intent.id, charge, applicationFeeId };
}

async function lockedRow(client: PoolClient, id: string) {
  await client.query('select pg_advisory_xact_lock(hashtext($1))', [id]);
  const result = await client.query<PublicRow>(`select pp.* from public_payment pp where pp.id=$1 for update`, [id]);
  if (!result.rows[0]?.stripe_account_id) throw new Error('No public payment exists for this Stripe object');
  return result.rows[0];
}

const toState = (row: PublicRow): PaymentState => ({ requestId: row.id, connectedAccountId: row.stripe_account_id, amountCents: row.amount_cents, currency: row.currency, status: row.status, refundedAmountCents: row.refunded_amount_cents, checkoutSessionId: row.stripe_checkout_session_id, paymentIntentId: row.stripe_payment_intent_id, chargeId: row.stripe_charge_id });

async function feeRefund(row: PublicRow, objects: StripeObjects) {
  if (!objects.applicationFeeId) throw new Error('Public payment application fee is not available yet; Stripe should retry');
  const fee = await getStripe().applicationFees.retrieve(objects.applicationFeeId);
  if (objectId(fee.account) !== row.stripe_account_id || objectId(fee.charge) !== objects.charge.id || fee.amount !== row.platform_fee_cents || fee.currency !== row.currency) throw new Error('Public payment application fee does not match');
  const target = calculateApplicationFeeRefundTargetCents(row.platform_fee_cents, row.amount_cents, objects.charge.amount_refunded);
  if (fee.amount_refunded > target) throw new Error('Public payment fee refund exceeds expected target');
  if (target > fee.amount_refunded) await getStripe().applicationFees.createRefund(fee.id, { amount: target - fee.amount_refunded }, { idempotencyKey: `sitterfolio-public-fee-refund-${fee.id}-${target}` });
  return target;
}

export async function maybeProcessPublicPaymentEvent(event: Stripe.Event, accountId: string) {
  const checkoutEvents = ['checkout.session.completed', 'checkout.session.async_payment_succeeded', 'checkout.session.async_payment_failed'];
  let objects: StripeObjects | null = null;
  let signal; let paidAt: Date | null = null;
  if (checkoutEvents.includes(event.type)) {
    const session = event.data.object as Stripe.Checkout.Session;
    const id = session.metadata?.publicPaymentId;
    if (!id) return false;
    if (session.client_reference_id !== id) throw new Error('Public Checkout Session metadata does not match');
    const outcome = checkoutEventOutcome(event.type, session);
    if (outcome !== 'paid') {
      await transaction(async (client) => {
        if ((await client.query(`select event_id from stripe_webhook_event where event_id=$1`, [event.id])).rowCount) return;
        const row = await lockedRow(client, id);
        if (row.stripe_account_id !== accountId || (row.stripe_checkout_session_id && row.stripe_checkout_session_id !== session.id)) throw new Error('Public Checkout Session does not match the canonical payment');
        if (!row.stripe_checkout_session_id) await client.query(`update public_payment set stripe_checkout_session_id=$2,updated_at=now() where id=$1`, [row.id, session.id]);
        await client.query(`insert into stripe_webhook_event(event_id,event_type) values($1,$2)`, [event.id, event.type]);
      });
      return true;
    }
    objects = await objectsForIntent(typeof session.payment_intent === 'string' ? session.payment_intent : null, null, accountId);
    if (!objects || objects.publicPaymentId !== id) throw new Error('Public Checkout and PaymentIntent metadata disagree');
    paidAt = new Date(objects.charge.created * 1000);
    signal = { kind: 'checkout' as const, requestId: id, connectedAccountId: accountId, amountCents: session.amount_total ?? -1, currency: session.currency ?? '', checkoutSessionId: session.id, paymentIntentId: objects.paymentIntentId, chargeId: objects.charge.id };
  } else if (event.type === 'charge.refunded') {
    const charge = event.data.object as Stripe.Charge;
    objects = await objectsForIntent(charge.payment_intent, charge, accountId);
    if (!objects) return false;
    signal = { kind: 'refund' as const, requestId: objects.publicPaymentId, connectedAccountId: accountId, amountCents: charge.amount, currency: charge.currency, paymentIntentId: objects.paymentIntentId, chargeId: charge.id, refundedAmountCents: charge.amount_refunded };
  } else {
    const eventDispute = event.data.object as Stripe.Dispute;
    const dispute = await getStripe().disputes.retrieve(eventDispute.id, {}, { stripeAccount: accountId });
    objects = await objectsForIntent(dispute.payment_intent, dispute.charge, accountId);
    if (!objects) return false;
    const outcome = dispute.status === 'lost' ? 'lost' as const : ['won', 'prevented', 'warning_closed'].includes(dispute.status) ? 'won' as const : undefined;
    if (event.type === 'charge.dispute.closed' && !outcome) throw new Error(`Unsupported closed dispute status: ${dispute.status}`);
    signal = { kind: outcome ? 'dispute_closed' as const : 'dispute_created' as const, requestId: objects.publicPaymentId, connectedAccountId: accountId, amountCents: objects.charge.amount, currency: objects.charge.currency, paymentIntentId: objects.paymentIntentId, chargeId: objects.charge.id, disputeOutcome: outcome };
  }

  await transaction(async (client) => {
    if ((await client.query(`select event_id from stripe_webhook_event where event_id=$1`, [event.id])).rowCount) return;
    const row = await lockedRow(client, signal.requestId);
    let current = toState(row);
    if (objects.charge.amount_refunded > current.refundedAmountCents) current = applyPaymentSignal(current, { kind: 'refund', requestId: row.id, connectedAccountId: accountId, amountCents: objects.charge.amount, currency: objects.charge.currency, paymentIntentId: objects.paymentIntentId, chargeId: objects.charge.id, refundedAmountCents: objects.charge.amount_refunded });
    const next = applyPaymentSignal(current, signal);
    const feeRefunded = objects.charge.amount_refunded ? await feeRefund(row, objects) : row.application_fee_refunded_cents;
    await client.query(`update public_payment set status=$2,refunded_amount_cents=$3,application_fee_refunded_cents=$4,stripe_checkout_session_id=$5,stripe_payment_intent_id=$6,stripe_charge_id=$7,stripe_application_fee_id=coalesce($8,stripe_application_fee_id),paid_at=coalesce(paid_at,$9),updated_at=now() where id=$1`, [row.id, next.status, next.refundedAmountCents, feeRefunded, next.checkoutSessionId, next.paymentIntentId, next.chargeId, objects.applicationFeeId, paidAt]);
    await client.query(`insert into stripe_webhook_event(event_id,event_type) values($1,$2)`, [event.id, event.type]);
  });
  return true;
}
