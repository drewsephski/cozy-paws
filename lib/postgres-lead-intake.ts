import { randomBytes } from 'node:crypto';
import type { QualifiedLeadInput } from './domain/leads';
import { transaction, type TransactionRunner } from './db';
import type { Lead, ProfileRecord } from './profile-ownership';

type SiteRow = {
  site_id: string;
  business_id: string;
  owner_id: string;
  subdomain: string;
  emoji: string;
  site_created_at: Date;
  sitter_name: string | null;
  business_name: string | null;
  tagline: string | null;
  location: string | null;
  services: string[];
  phone: string | null;
  email: string | null;
  linkedin_url: string | null;
  profile_image_url: string | null;
  onboarding_completed_at: Date | null;
  payment_link_url: string | null;
  profile_revision: string | number | null;
};

type LeadRow = {
  id: string;
  customer_name: string;
  customer_email: string;
  service_requested: string;
  requested_start_date: Date | string | null;
  requested_end_date: Date | string | null;
  date_details: string;
  pet_types: string[];
  pet_count: number | null;
  postal_code: string;
  care_details: string;
  source: string;
  campaign: string | null;
  status: Lead['status'];
  read_at: Date | null;
  created_at: Date;
  public_token: string;
};

export type PostgresLeadSubmission = {
  subdomain: string;
  submissionToken: string;
  lead: QualifiedLeadInput;
  createdAt: number;
};

export type PersistedLeadConversation = {
  created: boolean;
  subdomain: string;
  profile: ProfileRecord;
  lead: Lead;
  conversationToken: string;
};

const calendarDate = (value: Date | string | null) => {
  if (!value) return null;
  return typeof value === 'string' ? value.slice(0, 10) : value.toISOString().slice(0, 10);
};

const profileFromRow = (row: SiteRow): ProfileRecord => ({
  subdomain: row.subdomain,
  ownerId: row.owner_id,
  emoji: row.emoji,
  createdAt: row.site_created_at.getTime(),
  sitterName: row.sitter_name ?? undefined,
  businessName: row.business_name ?? undefined,
  tagline: row.tagline ?? undefined,
  location: row.location ?? undefined,
  services: row.services,
  phone: row.phone ?? undefined,
  email: row.email ?? undefined,
  linkedinUrl: row.linkedin_url,
  profileImageUrl: row.profile_image_url ?? undefined,
  onboardingCompletedAt: row.onboarding_completed_at?.getTime() ?? null,
  paymentLinkUrl: row.payment_link_url ?? undefined,
  profileRevision: Number(row.profile_revision ?? 0)
});

const leadFromRow = (row: LeadRow): Lead => ({
  id: row.id,
  name: row.customer_name,
  email: row.customer_email,
  serviceRequested: row.service_requested,
  requestedStartDate: calendarDate(row.requested_start_date),
  requestedEndDate: calendarDate(row.requested_end_date),
  dates: row.date_details,
  petTypes: row.pet_types,
  petCount: row.pet_count,
  postalCode: row.postal_code,
  message: row.care_details,
  source: row.source,
  campaign: row.campaign,
  status: row.status,
  readAt: row.read_at?.getTime() ?? null,
  createdAt: row.created_at.getTime()
});

export function createPostgresLeadPersister(runTransaction: TransactionRunner = transaction) {
  return async function persistLeadWithConversation(input: PostgresLeadSubmission): Promise<PersistedLeadConversation | null> {
    return runTransaction(async (client) => {
      const siteResult = await client.query<SiteRow>(
        `select s.id site_id,s.business_id,b.owner_user_id owner_id,s.subdomain,s.emoji,s.created_at site_created_at,
                s.sitter_name,s.business_name,s.tagline,s.location,s.services,s.phone,s.email,s.linkedin_url,s.profile_image_url,
                s.onboarding_completed_at,b.payment_link_url,s.profile_revision
         from site s join business b on b.id=s.business_id
         where s.subdomain=$1 and s.deleted_at is null
         for update of s`,
        [input.subdomain]
      );
      const site = siteResult.rows[0];
      if (!site) return null;

      const existing = await client.query<LeadRow>(
        `select l.*,c.public_token
         from lead l join lead_conversation c on c.lead_id=l.id and c.business_id=l.business_id
         where l.site_id=$1 and l.submission_token=$2`,
        [site.site_id, input.submissionToken]
      );
      if (existing.rows[0]) {
        return {
          created: false,
          subdomain: site.subdomain,
          profile: profileFromRow(site),
          lead: leadFromRow(existing.rows[0]),
          conversationToken: existing.rows[0].public_token
        };
      }

      const lead = input.lead;
      const inserted = await client.query<LeadRow>(
        `insert into lead(site_id,business_id,submission_token,customer_name,customer_email,service_requested,
                          requested_start_date,requested_end_date,date_details,pet_types,pet_count,postal_code,
                          care_details,source,campaign,status,created_at,updated_at)
         values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,'NEW',to_timestamp($16/1000.0),now())
         returning *`,
        [site.site_id, site.business_id, input.submissionToken, lead.name, lead.email, lead.serviceRequested,
          lead.requestedStartDate, lead.requestedEndDate, lead.dateDetails, lead.petTypes, lead.petCount,
          lead.postalCode, lead.careDetails, lead.source, lead.campaign, input.createdAt]
      );
      const persistedLead = inserted.rows[0];
      await client.query(`insert into lead_event(lead_id,kind,created_at) values($1,'CREATED',to_timestamp($2/1000.0))`, [persistedLead.id, input.createdAt]);
      const conversation = await client.query<{ public_token: string }>(
        `insert into lead_conversation(lead_id,business_id,public_token)
         values($1,$2,$3)
         returning public_token`,
        [persistedLead.id, site.business_id, randomBytes(24).toString('base64url')]
      );

      return {
        created: true,
        subdomain: site.subdomain,
        profile: profileFromRow(site),
        lead: leadFromRow({ ...persistedLead, public_token: conversation.rows[0].public_token }),
        conversationToken: conversation.rows[0].public_token
      };
    });
  };
}

export const persistPostgresLeadWithConversation = createPostgresLeadPersister();
