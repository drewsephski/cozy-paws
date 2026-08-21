import { randomBytes } from 'node:crypto';
import { query, transaction } from './db';
import { calculatePlatformFeeCents, revenueFromPayments, type PaymentStatus } from './domain/payments';
import { refreshConnectedAccountReadiness } from './connected-accounts';

export type PaymentRequest = { id: string; publicToken: string; businessId: string; leadId: string; amountCents: number; platformFeeCents: number; currency: string; description: string; customerNote: string | null; customerEmail: string | null; status: PaymentStatus; refundedAmountCents: number; stripeAccountId: string | null; stripeReady: boolean };
type PaymentRow = { id: string; public_token: string; business_id: string; lead_id: string; amount_cents: number; platform_fee_cents: number; currency: string; description: string; customer_note: string | null; customer_email: string | null; status: PaymentStatus; refunded_amount_cents: number; stripe_account_id: string | null; stripe_ready: boolean };
const mapPaymentRequestRow = (row: PaymentRow): PaymentRequest => ({ id: row.id, publicToken: row.public_token, businessId: row.business_id, leadId: row.lead_id, amountCents: row.amount_cents, platformFeeCents: row.platform_fee_cents, currency: row.currency, description: row.description, customerNote: row.customer_note, customerEmail: row.customer_email, status: row.status, refundedAmountCents: row.refunded_amount_cents, stripeAccountId: row.stripe_account_id, stripeReady: row.stripe_ready });

export async function getPaymentRequest(publicToken: string) { const result = await query<PaymentRow>(`select pr.*,b.stripe_account_id,b.stripe_ready from payment_request pr join business b on b.id=pr.business_id where pr.public_token=$1`, [publicToken]); return result.rows[0] ? mapPaymentRequestRow(result.rows[0]) : null; }

export async function createPaymentRequestForLead(ownerUserId: string, input: { leadId: string; amountCents: number; description: string; customerNote?: string }) {
  const fee = calculatePlatformFeeCents(input.amountCents);
  if (input.description.trim().length < 3) throw new Error('Describe the service in at least 3 characters');
  const preflight = await query<{ business_id: string; stripe_account_id: string | null; stripe_ready: boolean }>(`select b.id business_id,b.stripe_account_id,b.stripe_ready from lead l join site s on s.id=l.site_id join business b on b.id=s.business_id where l.id=$1 and b.owner_user_id=$2`, [input.leadId, ownerUserId]);
  const business = preflight.rows[0];
  if (!business || !await refreshConnectedAccountReadiness({ id: business.business_id, stripeAccountId: business.stripe_account_id, stripeReady: business.stripe_ready })) throw new Error('Complete Stripe setup before requesting payment');
  const token = randomBytes(18).toString('base64url');
  return transaction(async (client) => {
    await client.query('select pg_advisory_xact_lock(hashtext($1))', [input.leadId]);
    const owned = await client.query<{ lead_id: string; customer_email: string; business_id: string; status: string; stripe_account_id: string | null; stripe_ready: boolean }>(`select l.id lead_id,l.customer_email,s.business_id,l.status,b.stripe_account_id,b.stripe_ready from lead l join site s on s.id=l.site_id join business b on b.id=s.business_id where l.id=$1 and b.owner_user_id=$2 and s.deleted_at is null for update of l`, [input.leadId, ownerUserId]);
    const lead = owned.rows[0];
    if (!lead) throw new Error('Lead does not belong to this user');
    if (!['QUALIFIED', 'QUOTED'].includes(lead.status)) throw new Error('Qualify this inquiry before requesting payment');
    if (!lead.stripe_account_id || !lead.stripe_ready) throw new Error('Complete Stripe setup before requesting payment');
    const existing = await client.query<PaymentRow>(`select pr.*,b.stripe_account_id,b.stripe_ready from payment_request pr join business b on b.id=pr.business_id where pr.lead_id=$1 and pr.status='OPEN'`, [input.leadId]);
    if (existing.rows[0]) return mapPaymentRequestRow(existing.rows[0]);
    const created = await client.query<PaymentRow>(`insert into payment_request(business_id,lead_id,public_token,amount_cents,platform_fee_cents,description,customer_note,customer_email) values($1,$2,$3,$4,$5,$6,$7,$8) returning *, $9::text stripe_account_id, true stripe_ready`, [lead.business_id, lead.lead_id, token, input.amountCents, fee, input.description.trim(), input.customerNote?.trim() || null, lead.customer_email, lead.stripe_account_id]);
    await client.query(`update lead set status='QUOTED',updated_at=now() where id=$1`, [lead.lead_id]);
    await client.query(`insert into lead_event(lead_id,kind) values($1,'PAYMENT_REQUEST_CREATED')`, [lead.lead_id]);
    return mapPaymentRequestRow(created.rows[0]);
  });
}

export async function getOwnerRevenue(ownerUserId: string) {
  const payments = await query<{ id: string; status: PaymentStatus; amount_cents: number; refunded_amount_cents: number }>(`select pr.id,pr.status,pr.amount_cents,pr.refunded_amount_cents from payment_request pr join business b on b.id=pr.business_id where b.owner_user_id=$1`, [ownerUserId]);
  const totals = revenueFromPayments(payments.rows.map((row) => ({ id: row.id, status: row.status, amountCents: row.amount_cents, refundedAmountCents: row.refunded_amount_cents })));
  const funnel = await query<{ inquiries: string; qualified: string; requests: string; booked: string }>(`select count(distinct l.id)::text inquiries,count(distinct l.id) filter(where l.status in ('QUALIFIED','QUOTED','BOOKED'))::text qualified,count(distinct pr.id)::text requests,count(distinct l.id) filter(where l.status='BOOKED')::text booked from business b join site s on s.business_id=b.id left join lead l on l.site_id=s.id left join payment_request pr on pr.lead_id=l.id where b.owner_user_id=$1`, [ownerUserId]);
  const sources = await query<{ source: string; generated_revenue_cents: string }>(`select l.source,coalesce(sum(case when pr.status in ('PAID','PARTIALLY_REFUNDED','REFUNDED') then pr.amount_cents-pr.refunded_amount_cents else 0 end),0)::text generated_revenue_cents from business b join site s on s.business_id=b.id join lead l on l.site_id=s.id left join payment_request pr on pr.lead_id=l.id where b.owner_user_id=$1 group by l.source order by 2 desc`, [ownerUserId]);
  const sites = await query<{ subdomain: string; generated_revenue_cents: string }>(`select s.subdomain,coalesce(sum(case when pr.status in ('PAID','PARTIALLY_REFUNDED','REFUNDED') then pr.amount_cents-pr.refunded_amount_cents else 0 end),0)::text generated_revenue_cents from business b join site s on s.business_id=b.id left join lead l on l.site_id=s.id left join payment_request pr on pr.lead_id=l.id where b.owner_user_id=$1 and s.deleted_at is null group by s.id order by 2 desc`, [ownerUserId]);
  return { ...totals, inquiries: Number(funnel.rows[0]?.inquiries ?? 0), qualified: Number(funnel.rows[0]?.qualified ?? 0), paymentRequests: Number(funnel.rows[0]?.requests ?? 0), booked: Number(funnel.rows[0]?.booked ?? 0), sources: sources.rows.map((row) => ({ source: row.source, generatedRevenueCents: Number(row.generated_revenue_cents) })), sites: sites.rows.map((row) => ({ subdomain: row.subdomain, generatedRevenueCents: Number(row.generated_revenue_cents) })) };
}

export async function getOwnerPaymentSetup(ownerUserId: string) {
  return (await query<{ id: string; name: string; stripe_account_id: string | null; stripe_ready: boolean }>(`select id,name,stripe_account_id,stripe_ready from business where owner_user_id=$1 order by created_at`, [ownerUserId])).rows.map((row) => ({ businessId: row.id, businessName: row.name, connected: Boolean(row.stripe_account_id), ready: row.stripe_ready }));
}
