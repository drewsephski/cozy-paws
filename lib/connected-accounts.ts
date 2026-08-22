import { query } from './db';
import { getAppOrigin } from './app-url';
import { getStripe } from './stripe';

export async function refreshConnectedAccountReadiness(business: { id: string; stripeAccountId: string | null; stripeReady: boolean }) {
  if (!business.stripeAccountId) return false;
  try {
    const account = await getStripe().v2.core.accounts.retrieve(business.stripeAccountId, { include: ['configuration.merchant'] });
    const ready = account.configuration?.merchant?.capabilities?.card_payments?.status === 'active';
    if (ready !== business.stripeReady) await query(`update business set stripe_ready=$2,updated_at=now() where id=$1`, [business.id, ready]);
    return ready;
  } catch (error) {
    console.error('Unable to verify Stripe connected-account readiness', { businessId: business.id, error: error instanceof Error ? error.message : 'Unknown Stripe error' });
    return false;
  }
}

export async function createOrContinueOnboarding(ownerUserId: string, businessId: string) {
  const result = await query<{ id: string; name: string; email: string; stripe_account_id: string | null }>(`select b.id,b.name,u.email,b.stripe_account_id from business b join "user" u on u.id=b.owner_user_id where b.id=$1 and b.owner_user_id=$2`, [businessId, ownerUserId]);
  const business = result.rows[0];
  if (!business) throw new Error('Business does not belong to this user');
  let accountId = business.stripe_account_id;
  if (!accountId) {
    const account = await getStripe().v2.core.accounts.create({ contact_email: business.email, display_name: business.name, identity: { country: 'US' }, dashboard: 'full', defaults: { profile: { business_url: getAppOrigin(), doing_business_as: business.name, product_description: 'Independent pet sitting and pet-care services.' }, responsibilities: { fees_collector: 'stripe', losses_collector: 'stripe' } }, configuration: { merchant: { capabilities: { card_payments: { requested: true } } } }, metadata: { sitterfolio_business_id: business.id }, include: ['configuration.merchant', 'defaults'] });
    accountId = account.id;
    await query(`update business set stripe_account_id=$2,updated_at=now() where id=$1 and stripe_account_id is null`, [business.id, accountId]);
  }
  const link = await getStripe().v2.core.accountLinks.create({ account: accountId, use_case: { type: 'account_onboarding', account_onboarding: { configurations: ['merchant'], collection_options: { fields: 'eventually_due' }, refresh_url: `${getAppOrigin()}/admin`, return_url: `${getAppOrigin()}/admin` } } });
  return link.url;
}
