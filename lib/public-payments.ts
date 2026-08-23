import { randomBytes } from 'node:crypto';
import Stripe from 'stripe';
import { calculatePlatformFeeCents } from './domain/payments';
import { getAppOrigin } from './app-url';
import { query, transaction } from './db';
import { refreshConnectedAccountReadiness } from './connected-accounts';
import { getStripe } from './stripe';

export type PublicPaymentCheckout = { id: string; publicToken: string; amountCents: number; platformFeeCents: number; currency: string; businessName: string; subdomain: string };

export function parsePublicPaymentAmount(value: unknown) {
  const dollars = String(value ?? '').trim();
  if (!/^\d{1,7}(\.\d{1,2})?$/.test(dollars)) throw new Error('Enter a valid amount with no more than two decimal places.');
  const cents = Math.round(Number(dollars) * 100);
  if (!Number.isSafeInteger(cents) || cents < 100 || cents > 1_000_000) throw new Error('Payment amount must be between $1 and $10,000.');
  return cents;
}

export function buildPublicCheckoutParams(payment: PublicPaymentCheckout): Stripe.Checkout.SessionCreateParams {
  return {
    mode: 'payment',
    integration_identifier: 'sitterfolio_public_bqtrmznk',
    client_reference_id: payment.id,
    line_items: [{ price_data: { currency: payment.currency, unit_amount: payment.amountCents, product_data: { name: `Payment to ${payment.businessName}` } }, quantity: 1 }],
    payment_intent_data: { application_fee_amount: payment.platformFeeCents, metadata: { publicPaymentId: payment.id } },
    metadata: { publicPaymentId: payment.id },
    success_url: `${getAppOrigin()}/s/${payment.subdomain}/payment/success?payment=${payment.publicToken}`,
    cancel_url: `${getAppOrigin()}/s/${payment.subdomain}`,
  };
}

export async function getPublicPaymentAvailability(subdomain: string) {
  const result = await query<{ id: string; stripe_account_id: string | null; stripe_ready: boolean }>(`select b.id,b.stripe_account_id,b.stripe_ready from site s join business b on b.id=s.business_id where s.subdomain=$1 and s.deleted_at is null`, [subdomain]);
  const business = result.rows[0];
  return Boolean(business?.stripe_account_id && business.stripe_ready);
}

export async function createPublicPaymentCheckout(subdomain: string, amountValue: unknown) {
  const amountCents = parsePublicPaymentAmount(amountValue);
  const result = await query<{ id: string; name: string; stripe_account_id: string | null; stripe_ready: boolean; site_id: string }>(`select b.id,b.name,b.stripe_account_id,b.stripe_ready,s.id site_id from site s join business b on b.id=s.business_id where s.subdomain=$1 and s.deleted_at is null`, [subdomain]);
  const business = result.rows[0];
  if (!business?.stripe_account_id || !(await refreshConnectedAccountReadiness({ id: business.id, stripeAccountId: business.stripe_account_id, stripeReady: business.stripe_ready }))) throw new Error('This business cannot accept payments right now.');
  const stripeAccountId = business.stripe_account_id;
  const publicToken = randomBytes(18).toString('base64url');
  const platformFeeCents = calculatePlatformFeeCents(amountCents);
  return transaction(async (client) => {
    const created = await client.query<{ id: string }>(`insert into public_payment(business_id,site_id,public_token,amount_cents,platform_fee_cents) values($1,$2,$3,$4,$5) returning id`, [business.id, business.site_id, publicToken, amountCents, platformFeeCents]);
    const payment = { id: created.rows[0].id, publicToken, amountCents, platformFeeCents, currency: 'usd', businessName: business.name, subdomain };
    const session = await getStripe().checkout.sessions.create(buildPublicCheckoutParams(payment), { stripeAccount: stripeAccountId, idempotencyKey: `sitterfolio-public-payment-${payment.id}` });
    if (!session.url) throw new Error('Stripe did not return a Checkout URL.');
    await client.query(`update public_payment set stripe_checkout_session_id=$2,updated_at=now() where id=$1`, [payment.id, session.id]);
    return { url: session.url, publicToken };
  });
}

export async function getPublicPaymentResult(subdomain: string, publicToken: string) {
  const result = await query<{ status: string; amount_cents: number; business_name: string }>(`select pp.status,pp.amount_cents,b.name business_name from public_payment pp join site s on s.id=pp.site_id join business b on b.id=pp.business_id where pp.public_token=$1 and s.subdomain=$2`, [publicToken, subdomain]);
  return result.rows[0] ?? null;
}
