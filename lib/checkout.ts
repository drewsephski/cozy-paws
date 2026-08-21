import Stripe from 'stripe';
import { transaction } from './db';
import { getOrigin, getStripe } from './stripe';

export type CheckoutRow = { id: string; public_token: string; amount_cents: number; platform_fee_cents: number; description: string; customer_email: string | null; currency: string; status: string; stripe_checkout_session_id: string | null; stripe_account_id: string | null };
export type CheckoutSnapshot = { id: string; status: string | null; paymentStatus: string; url: string | null; clientReferenceId: string | null; paymentRequestId: string | null; amountTotal: number | null; currency: string | null };

export function checkoutLifecycleDecision(row: Pick<CheckoutRow, 'id' | 'amount_cents' | 'currency'>, session: CheckoutSnapshot): 'reuse' | 'paid' | 'replace' {
  if (session.clientReferenceId !== row.id || session.paymentRequestId !== row.id) throw new Error('Checkout Session does not belong to this payment request');
  if (session.amountTotal !== row.amount_cents || session.currency?.toLowerCase() !== row.currency) throw new Error('Checkout Session amount or currency does not match');
  if (session.status === 'open') { if (!session.url) throw new Error('Open Checkout Session has no URL'); return 'reuse'; }
  if (session.status === 'complete' && session.paymentStatus === 'paid') return 'paid';
  if (session.status === 'expired') return 'replace';
  throw new Error('Checkout Session is not payable');
}

export function buildCheckoutSessionParams(row: CheckoutRow): Stripe.Checkout.SessionCreateParams {
  return { mode: 'payment', payment_method_types: ['card'], client_reference_id: row.id, line_items: [{ price_data: { currency: row.currency, unit_amount: row.amount_cents, product_data: { name: row.description } }, quantity: 1 }], payment_intent_data: { application_fee_amount: row.platform_fee_cents, metadata: { paymentRequestId: row.id } }, customer_email: row.customer_email ?? undefined, metadata: { paymentRequestId: row.id }, success_url: `${getOrigin()}/pay/${row.public_token}/success?session_id={CHECKOUT_SESSION_ID}`, cancel_url: `${getOrigin()}/pay/${row.public_token}` };
}

const snapshot = (session: Stripe.Checkout.Session): CheckoutSnapshot => ({ id: session.id, status: session.status, paymentStatus: session.payment_status, url: session.url, clientReferenceId: session.client_reference_id, paymentRequestId: session.metadata?.paymentRequestId ?? null, amountTotal: session.amount_total, currency: session.currency });

export async function createOrReuseCheckoutSession(publicToken: string) {
  return transaction(async (client) => {
    await client.query('select pg_advisory_xact_lock(hashtext($1))', [publicToken]);
    const result = await client.query<CheckoutRow>(`select pr.*,b.stripe_account_id from payment_request pr join business b on b.id=pr.business_id where pr.public_token=$1 for update of pr`, [publicToken]);
    const row = result.rows[0];
    if (!row || row.status !== 'OPEN' || !row.stripe_account_id) throw new Error('Payment request is not available');
    const create = async (idempotencyKey: string) => {
      const session = await getStripe().checkout.sessions.create(buildCheckoutSessionParams(row), { stripeAccount: row.stripe_account_id!, idempotencyKey });
      if (!session.url) throw new Error('Stripe did not return a Checkout URL');
      await client.query(`update payment_request set stripe_checkout_session_id=$2,updated_at=now() where id=$1`, [row.id, session.id]);
      return { kind: 'open' as const, sessionId: session.id, url: session.url };
    };
    if (!row.stripe_checkout_session_id) return create(`sitterfolio-checkout-${row.id}`);
    const existing = await getStripe().checkout.sessions.retrieve(row.stripe_checkout_session_id, {}, { stripeAccount: row.stripe_account_id });
    const decision = checkoutLifecycleDecision(row, snapshot(existing));
    if (decision === 'reuse') return { kind: 'open' as const, sessionId: existing.id, url: existing.url! };
    if (decision === 'paid') return { kind: 'paid' as const, sessionId: existing.id };
    return create(`sitterfolio-checkout-${row.id}-after-${existing.id}`);
  });
}
