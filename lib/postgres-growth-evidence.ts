import { query } from './db';
import type {
  BusinessActivationEvidence,
  GrowthEvidenceRepository,
  OperationalGrowthEvidence
} from './growth-evidence';

type BusinessActivationRow = {
  business_id: string;
  setup_activated_at: Date | null;
  first_qualified_at: Date | null;
};

type OperationalGrowthRow = {
  published_sites: string;
  shared_businesses: string;
  qualified_businesses: string;
  inquiries: string;
  sitter_replies: string;
  qualified_leads: string;
  settled_lead_payments: string;
  completed_bookings: string;
  active_businesses_30d: string;
};

function parseCount(value: string | undefined) {
  return Number(value ?? 0);
}

export const postgresGrowthEvidenceRepository: GrowthEvidenceRepository = {
  async recordOwnedSiteShare(ownerUserId, subdomain) {
    const result = await query(
      `insert into growth_event(business_id,site_id,kind)
       select b.id,s.id,'SITE_SHARED'
       from site s
       join business b on b.id=s.business_id
       where b.owner_user_id=$1 and s.subdomain=$2 and s.deleted_at is null and s.onboarding_completed_at is not null
       on conflict (site_id,kind) do nothing`,
      [ownerUserId, subdomain]
    );
    return result.rowCount === 1;
  },

  async getOwnerActivationEvidence(ownerUserId) {
    const result = await query<BusinessActivationRow>(
      `select b.id business_id,
              setup.created_at setup_activated_at,
              min(le.created_at) filter(where le.created_at >= setup.created_at) first_qualified_at
       from business b
       left join lateral (
         select min(created_at) created_at from growth_event
         where business_id=b.id and kind='SITE_SHARED'
       ) setup on true
       left join lead l on l.business_id=b.id
       left join lead_event le on le.lead_id=l.id and le.kind='QUALIFIED'
       where b.owner_user_id=$1
       group by b.id,setup.created_at
       order by b.created_at,b.id`,
      [ownerUserId]
    );
    return result.rows.map((row): BusinessActivationEvidence => ({
      businessId: row.business_id,
      setupActivatedAt: row.setup_activated_at,
      firstQualifiedAt: row.first_qualified_at
    }));
  },

  async getOperationalEvidence() {
    const result = await query<OperationalGrowthRow>(
      `select
        (select count(*) from site where deleted_at is null and onboarding_completed_at is not null)::text published_sites,
        (select count(distinct business_id) from growth_event where kind='SITE_SHARED')::text shared_businesses,
        (select count(distinct l.business_id) from lead l join lead_event le on le.lead_id=l.id and le.kind='QUALIFIED')::text qualified_businesses,
        (select count(*) from lead)::text inquiries,
        (select count(distinct c.business_id) from lead_conversation_message m join lead_conversation c on c.id=m.conversation_id where m.sender='SITTER')::text sitter_replies,
        (select count(distinct lead_id) from lead_event where kind='QUALIFIED')::text qualified_leads,
        (select count(*) from payment_request where status in ('PAID','PARTIALLY_REFUNDED','REFUNDED'))::text settled_lead_payments,
        (select count(*) from booking where status='COMPLETED')::text completed_bookings,
        (select count(distinct business_id) from (
          select business_id,updated_at from lead where status in ('QUALIFIED','QUOTED','BOOKED') and updated_at >= now()-interval '30 days'
          union all select business_id,updated_at from client_household where updated_at >= now()-interval '30 days'
          union all select business_id,updated_at from booking where status in ('DRAFT','CONFIRMED','COMPLETED') and updated_at >= now()-interval '30 days'
        ) active)::text active_businesses_30d`
    );
    const row = result.rows[0];
    return {
      publishedSites: parseCount(row?.published_sites),
      sharedBusinesses: parseCount(row?.shared_businesses),
      qualifiedBusinesses: parseCount(row?.qualified_businesses),
      inquiries: parseCount(row?.inquiries),
      sitterReplies: parseCount(row?.sitter_replies),
      qualifiedLeads: parseCount(row?.qualified_leads),
      settledLeadPayments: parseCount(row?.settled_lead_payments),
      completedBookings: parseCount(row?.completed_bookings),
      activeBusinesses30d: parseCount(row?.active_businesses_30d)
    } satisfies OperationalGrowthEvidence;
  }
};
