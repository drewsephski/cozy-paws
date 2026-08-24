import { randomBytes } from 'node:crypto';
import { query, transaction } from './db';
import { calculatePlatformFeeCents, type PaymentStatus } from './domain/payments';
import { getConnectedAccountStatus, refreshConnectedAccountReadiness } from './connected-accounts';
import { sendPaymentRequestNotification, type EmailSender } from './email';

export type PaymentRequest = { id: string; publicToken: string; businessId: string; leadId: string; amountCents: number; platformFeeCents: number; currency: string; description: string; customerNote: string | null; customerEmail: string | null; status: PaymentStatus; refundedAmountCents: number; stripeAccountId: string | null; stripeReady: boolean; customerNotifiedAt: Date | null };
type PaymentRow = { id: string; public_token: string; business_id: string; lead_id: string; amount_cents: number; platform_fee_cents: number; currency: string; description: string; customer_note: string | null; customer_email: string | null; status: PaymentStatus; refunded_amount_cents: number; stripe_account_id: string | null; stripe_ready: boolean; customer_notified_at: Date | null };
const mapPaymentRequestRow = (row: PaymentRow): PaymentRequest => ({ id: row.id, publicToken: row.public_token, businessId: row.business_id, leadId: row.lead_id, amountCents: row.amount_cents, platformFeeCents: row.platform_fee_cents, currency: row.currency, description: row.description, customerNote: row.customer_note, customerEmail: row.customer_email, status: row.status, refundedAmountCents: row.refunded_amount_cents, stripeAccountId: row.stripe_account_id, stripeReady: row.stripe_ready, customerNotifiedAt: row.customer_notified_at });

export async function getPaymentRequest(publicToken: string) { const result = await query<PaymentRow>(`select pr.*,b.stripe_ready from payment_request pr join business b on b.id=pr.business_id where pr.public_token=$1`, [publicToken]); return result.rows[0] ? mapPaymentRequestRow(result.rows[0]) : null; }

export async function getPaidPaymentConversation(publicToken: string) {
  const result = await query<{ conversation_token: string; sitter_name: string }>(
    `select c.public_token conversation_token,coalesce(s.sitter_name,s.business_name,s.subdomain) sitter_name
     from payment_request pr
     join lead l on l.id=pr.lead_id and l.business_id=pr.business_id
     join site s on s.id=l.site_id and s.business_id=pr.business_id
     join lead_conversation c on c.lead_id=l.id and c.business_id=pr.business_id
     where pr.public_token=$1 and pr.status<>'OPEN' and s.deleted_at is null`,
    [publicToken]
  );
  const row = result.rows[0];
  return row ? { conversationToken: row.conversation_token, sitterName: row.sitter_name } : null;
}

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
    const existing = await client.query<PaymentRow>(`select pr.*,b.stripe_ready from payment_request pr join business b on b.id=pr.business_id where pr.lead_id=$1 and pr.status='OPEN'`, [input.leadId]);
    if (existing.rows[0]) return mapPaymentRequestRow(existing.rows[0]);
    const created = await client.query<PaymentRow>(`insert into payment_request(business_id,lead_id,public_token,amount_cents,platform_fee_cents,description,customer_note,customer_email,stripe_account_id) values($1,$2,$3,$4,$5,$6,$7,$8,$9) returning *, true stripe_ready`, [lead.business_id, lead.lead_id, token, input.amountCents, fee, input.description.trim(), input.customerNote?.trim() || null, lead.customer_email, lead.stripe_account_id]);
    await client.query(`update lead set status='QUOTED',updated_at=now() where id=$1`, [lead.lead_id]);
    await client.query(`insert into lead_event(lead_id,kind) values($1,'PAYMENT_REQUEST_CREATED')`, [lead.lead_id]);
    return mapPaymentRequestRow(created.rows[0]);
  });
}

export async function deliverPaymentRequest(paymentRequestId: string, sender?: EmailSender) {
  return transaction(async (client) => {
    const result = await client.query<PaymentRow & { business_name: string; site_email: string | null }>(`select pr.*,b.stripe_ready,b.name business_name,s.email site_email from payment_request pr join business b on b.id=pr.business_id join lead l on l.id=pr.lead_id join site s on s.id=l.site_id where pr.id=$1 for update`, [paymentRequestId]);
    const payment = result.rows[0];
    if (!payment) throw new Error('Payment request not found');
    if (payment.customer_notified_at) return { delivered: true, payment: mapPaymentRequestRow(payment) };
    if (!payment.customer_email) throw new Error('Customer email is missing');
    await sendPaymentRequestNotification({ paymentRequestId: payment.id, publicToken: payment.public_token, businessName: payment.business_name, sitterEmail: payment.site_email, customerEmail: payment.customer_email, description: payment.description, amountCents: payment.amount_cents, customerNote: payment.customer_note }, sender);
    await client.query(`update payment_request set customer_notified_at=now(),customer_notification_id=$2,updated_at=now() where id=$1`, [payment.id, `payment-request/${payment.id}`]);
    return { delivered: true, payment: mapPaymentRequestRow({ ...payment, customer_notified_at: new Date() }) };
  });
}

export async function getOwnerRevenue(ownerUserId: string) {
  const [totals, funnel, sources, sites] = await Promise.all([
    query<{ successful_payments: string; gross_paid_cents: string; generated_revenue_cents: string }>(`select count(*) filter(where p.status in ('PAID','PARTIALLY_REFUNDED','REFUNDED'))::text successful_payments,coalesce(sum(p.amount_cents) filter(where p.status in ('PAID','PARTIALLY_REFUNDED','REFUNDED')),0)::text gross_paid_cents,coalesce(sum(p.amount_cents-p.refunded_amount_cents) filter(where p.status in ('PAID','PARTIALLY_REFUNDED','REFUNDED')),0)::text generated_revenue_cents from (select business_id,status,amount_cents,refunded_amount_cents from payment_request union all select business_id,status,amount_cents,refunded_amount_cents from public_payment) p join business b on b.id=p.business_id where b.owner_user_id=$1`, [ownerUserId]),
    query<{ inquiries: string; qualified: string; requests: string; booked: string }>(`select count(distinct l.id)::text inquiries,count(distinct l.id) filter(where l.status in ('QUALIFIED','QUOTED','BOOKED'))::text qualified,count(distinct pr.id)::text requests,count(distinct l.id) filter(where l.status='BOOKED')::text booked from business b join site s on s.business_id=b.id left join lead l on l.site_id=s.id left join payment_request pr on pr.lead_id=l.id where b.owner_user_id=$1`, [ownerUserId]),
    query<{ source: string; generated_revenue_cents: string }>(`select source,sum(generated_revenue_cents)::text generated_revenue_cents from (select l.source,case when pr.status in ('PAID','PARTIALLY_REFUNDED','REFUNDED') then pr.amount_cents-pr.refunded_amount_cents else 0 end generated_revenue_cents from business b join site s on s.business_id=b.id join lead l on l.site_id=s.id left join payment_request pr on pr.lead_id=l.id where b.owner_user_id=$1 union all select 'public site' source,case when pp.status in ('PAID','PARTIALLY_REFUNDED','REFUNDED') then pp.amount_cents-pp.refunded_amount_cents else 0 end from public_payment pp join business b on b.id=pp.business_id where b.owner_user_id=$1) attributed group by source order by 2 desc`, [ownerUserId]),
    query<{ subdomain: string; generated_revenue_cents: string }>(`select s.subdomain,(coalesce((select sum(pr.amount_cents-pr.refunded_amount_cents) from payment_request pr join lead l on l.id=pr.lead_id where l.site_id=s.id and pr.status in ('PAID','PARTIALLY_REFUNDED','REFUNDED')),0)+coalesce((select sum(pp.amount_cents-pp.refunded_amount_cents) from public_payment pp where pp.site_id=s.id and pp.status in ('PAID','PARTIALLY_REFUNDED','REFUNDED')),0))::text generated_revenue_cents from business b join site s on s.business_id=b.id where b.owner_user_id=$1 and s.deleted_at is null order by 2 desc`, [ownerUserId]),
  ]);
  const total = totals.rows[0];
  return {
    successfulPayments: Number(total?.successful_payments ?? 0),
    grossPaidCents: Number(total?.gross_paid_cents ?? 0),
    generatedRevenueCents: Number(total?.generated_revenue_cents ?? 0),
    inquiries: Number(funnel.rows[0]?.inquiries ?? 0),
    qualified: Number(funnel.rows[0]?.qualified ?? 0),
    paymentRequests: Number(funnel.rows[0]?.requests ?? 0),
    booked: Number(funnel.rows[0]?.booked ?? 0),
    sources: sources.rows.map((row) => ({ source: row.source, generatedRevenueCents: Number(row.generated_revenue_cents) })),
    sites: sites.rows.map((row) => ({ subdomain: row.subdomain, generatedRevenueCents: Number(row.generated_revenue_cents) })),
  };
}

export async function getOwnerPaymentSetup(ownerUserId: string) {
  const businesses = (await query<{ id: string; name: string; stripe_account_id: string | null; stripe_ready: boolean }>(`select id,name,stripe_account_id,stripe_ready from business where owner_user_id=$1 order by created_at`, [ownerUserId])).rows;
  return Promise.all(businesses.map(async (business) => {
    const stripe = await getConnectedAccountStatus({ id: business.id, stripeAccountId: business.stripe_account_id, stripeReady: business.stripe_ready });
    return { businessId: business.id, businessName: business.name, connected: Boolean(business.stripe_account_id), ...stripe };
  }));
}

export async function refreshOwnerPaymentSetup(ownerUserId: string, businessId: string) {
  const business = (await query<{ id: string; name: string; stripe_account_id: string | null; stripe_ready: boolean }>(`select id,name,stripe_account_id,stripe_ready from business where id=$1 and owner_user_id=$2`, [businessId, ownerUserId])).rows[0];
  if (!business) throw new Error('Business does not belong to this user');
  const stripe = await getConnectedAccountStatus({ id: business.id, stripeAccountId: business.stripe_account_id, stripeReady: business.stripe_ready });
  return { businessId: business.id, businessName: business.name, connected: Boolean(business.stripe_account_id), ...stripe };
}
