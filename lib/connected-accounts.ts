import Stripe from 'stripe';
import { query } from './db';
import { getAppOrigin, getPublicSiteUrl } from './app-url';
import { getStripe } from './stripe';

export type ConnectedAccountStatus = 'not_started' | 'action_required' | 'pending' | 'ready' | 'unavailable';

export function connectedAccountStatus(account: Stripe.V2.Core.Account): Exclude<ConnectedAccountStatus, 'not_started' | 'unavailable'> {
  const capabilityStatus = account.configuration?.merchant?.capabilities?.card_payments?.status;
  const requirements = account.requirements?.entries ?? [];
  if (requirements.some((requirement) => requirement.awaiting_action_from === 'user')) return 'action_required';
  if (capabilityStatus === 'pending' || requirements.some((requirement) => requirement.awaiting_action_from === 'stripe')) return 'pending';
  if (capabilityStatus === 'active') return 'ready';
  return 'action_required';
}

export function statementDescriptorForBusiness(name: string) {
  const normalized = name
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9 .-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const descriptor = (normalized.length >= 5 ? normalized : `${normalized} PET CARE`.trim()).slice(0, 22).trim();

  return {
    descriptor,
    prefix: descriptor.slice(0, 10).trim(),
  };
}

export function buildConnectedAccountParams(business: { id: string; name: string; email: string; subdomain: string }): Stripe.V2.Core.AccountCreateParams {
  const statementDescriptor = statementDescriptorForBusiness(business.name);

  return {
    contact_email: business.email,
    display_name: business.name,
    identity: { country: 'US' },
    dashboard: 'full',
    defaults: {
      profile: {
        business_url: getPublicSiteUrl(business.subdomain),
        doing_business_as: business.name,
        product_description: 'Independent pet sitting and pet-care services.',
      },
      responsibilities: { fees_collector: 'stripe', losses_collector: 'stripe' },
    },
    configuration: {
      merchant: {
        capabilities: { card_payments: { requested: true } },
        mcc: '7299',
        statement_descriptor: statementDescriptor,
      },
    },
    metadata: { sitterfolio_business_id: business.id },
    include: ['configuration.merchant', 'defaults'],
  };
}

type ConnectedBusiness = { id: string; stripeAccountId: string; stripeReady: boolean };

export async function reconcileConnectedAccountStatus(business: ConnectedBusiness) {
  const account = await getStripe().v2.core.accounts.retrieve(business.stripeAccountId, { include: ['configuration.merchant', 'requirements'] });
  const status = connectedAccountStatus(account);
  const ready = account.configuration?.merchant?.capabilities?.card_payments?.status === 'active';
  if (ready !== business.stripeReady) await query(`update business set stripe_ready=$2,updated_at=now() where id=$1`, [business.id, ready]);
  return { status, ready };
}

export async function getConnectedAccountStatus(business: { id: string; stripeAccountId: string | null; stripeReady: boolean }) {
  if (!business.stripeAccountId) return { status: 'not_started' as const, ready: false };
  try {
    return await reconcileConnectedAccountStatus({ ...business, stripeAccountId: business.stripeAccountId });
  } catch (error) {
    console.error('Unable to verify Stripe connected-account status', { businessId: business.id, error: error instanceof Error ? error.message : 'Unknown Stripe error' });
    return { status: 'unavailable' as const, ready: false };
  }
}

export async function refreshConnectedAccountReadiness(business: { id: string; stripeAccountId: string | null; stripeReady: boolean }) {
  return (await getConnectedAccountStatus(business)).ready;
}

export async function createOrContinueOnboarding(ownerUserId: string, businessId: string) {
  const result = await query<{ id: string; name: string; email: string; stripe_account_id: string | null; subdomain: string }>(`select b.id,b.name,u.email,b.stripe_account_id,s.subdomain from business b join "user" u on u.id=b.owner_user_id join lateral (select subdomain from site where business_id=b.id and deleted_at is null order by created_at limit 1) s on true where b.id=$1 and b.owner_user_id=$2`, [businessId, ownerUserId]);
  const business = result.rows[0];
  if (!business) throw new Error('Business does not belong to this user');
  let accountId = business.stripe_account_id;
  if (!accountId) {
    const account = await getStripe().v2.core.accounts.create(buildConnectedAccountParams(business), { idempotencyKey: `sitterfolio-connected-account-${business.id}` });
    accountId = account.id;
    await query(`update business set stripe_account_id=$2,updated_at=now() where id=$1 and stripe_account_id is null`, [business.id, accountId]);
    const canonical = await query<{ stripe_account_id: string }>(`select stripe_account_id from business where id=$1 and owner_user_id=$2`, [business.id, ownerUserId]);
    accountId = canonical.rows[0]?.stripe_account_id ?? accountId;
  }
  const link = await getStripe().v2.core.accountLinks.create({ account: accountId, use_case: { type: 'account_onboarding', account_onboarding: { configurations: ['merchant'], collection_options: { fields: 'eventually_due' }, refresh_url: `${getAppOrigin()}/stripe/onboarding/refresh?businessId=${encodeURIComponent(business.id)}`, return_url: `${getAppOrigin()}/admin?stripe=returned` } } });
  return link.url;
}

export function isConnectedAccountStatusEvent(type: string) {
  return type === 'v2.core.account[requirements].updated' || type === 'v2.core.account[configuration.merchant].capability_status_updated';
}

export async function processConnectedAccountStatusEvent(event: { id: string; type: string; related_object?: { id: string; type: string } | null }) {
  if (!isConnectedAccountStatusEvent(event.type)) return;
  const accountId = event.related_object?.type === 'v2.core.account' ? event.related_object.id : null;
  if (!accountId) throw new Error('Stripe account status event has no connected account');

  const result = await query<{ id: string; stripe_account_id: string; stripe_ready: boolean }>(`select id,stripe_account_id,stripe_ready from business where stripe_account_id=$1`, [accountId]);
  const business = result.rows[0];
  if (business) await reconcileConnectedAccountStatus({ id: business.id, stripeAccountId: business.stripe_account_id, stripeReady: business.stripe_ready });
  await query(`insert into stripe_webhook_event(event_id,event_type) values($1,$2) on conflict do nothing`, [event.id, event.type]);
}
