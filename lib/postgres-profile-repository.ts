import type { BusinessProfile, Lead, ProfileRepository } from './profile-ownership';
import { query, transaction } from './db';
import { redisProfileRepository as legacy } from './redis-profile-repository';

type ProfileRow = { owner_id: string; subdomain: string; emoji: string; created_at: Date; sitter_name: string | null; business_name: string | null; tagline: string | null; location: string | null; services: string[]; phone: string | null; email: string | null; linkedin_url: string | null; profile_image_url: string | null; onboarding_completed_at: Date | null; payment_link_url: string | null };
type LeadRow = { id: string; customer_name: string; customer_email: string; service_requested: string; requested_start_date: Date | string | null; requested_end_date: Date | string | null; date_details: string; pet_types: string[]; pet_count: number | null; postal_code: string; care_details: string; source: string; campaign: string | null; status: Lead['status']; read_at: Date | null; created_at: Date };

const mapProfile = (row: ProfileRow): BusinessProfile => ({ ownerId: row.owner_id, emoji: row.emoji, createdAt: row.created_at.getTime(), sitterName: row.sitter_name ?? undefined, businessName: row.business_name ?? undefined, tagline: row.tagline ?? undefined, location: row.location ?? undefined, services: row.services, phone: row.phone ?? undefined, email: row.email ?? undefined, linkedinUrl: row.linkedin_url, profileImageUrl: row.profile_image_url ?? undefined, onboardingCompletedAt: row.onboarding_completed_at?.getTime() ?? null, paymentLinkUrl: row.payment_link_url ?? undefined });

export function normalizePostgresCalendarDate(value: Date | string | null) {
  if (!value) return null;
  if (typeof value === 'string') return value.match(/^\d{4}-\d{2}-\d{2}/)?.[0] || value;
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

const mapLead = (row: LeadRow): Lead => ({ id: row.id, name: row.customer_name, email: row.customer_email, dates: row.date_details, message: row.care_details, createdAt: row.created_at.getTime(), readAt: row.read_at?.getTime() ?? null, serviceRequested: row.service_requested, requestedStartDate: normalizePostgresCalendarDate(row.requested_start_date), requestedEndDate: normalizePostgresCalendarDate(row.requested_end_date), petTypes: row.pet_types, petCount: row.pet_count, postalCode: row.postal_code, source: row.source, campaign: row.campaign, status: row.status ?? 'NEW' });

async function readPostgresProfile(subdomain: string) {
  const result = await query<ProfileRow>(`select b.owner_user_id owner_id, s.subdomain, s.emoji, s.created_at, s.sitter_name, s.business_name, s.tagline, s.location, s.services, s.phone, s.email, s.linkedin_url, s.profile_image_url, s.onboarding_completed_at, b.payment_link_url from site s join business b on b.id=s.business_id where s.subdomain=$1 and s.deleted_at is null`, [subdomain]);
  return result.rows[0] ? mapProfile(result.rows[0]) : null;
}

async function migrateProfile(subdomain: string, profile: BusinessProfile) {
  if (!profile.ownerId) return null;
  await transaction(async (client) => {
    const business = await client.query<{ id: string }>(`insert into business(owner_user_id,name,created_at,updated_at) values($1,$2,to_timestamp($3/1000.0),now()) returning id`, [profile.ownerId, profile.businessName || profile.sitterName || subdomain, profile.createdAt]);
    await client.query(`insert into site(business_id,subdomain,emoji,sitter_name,business_name,tagline,location,services,phone,email,linkedin_url,profile_image_url,onboarding_completed_at,created_at,updated_at) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,to_timestamp($14/1000.0),now()) on conflict(subdomain) do nothing`, [business.rows[0].id, subdomain, profile.emoji, profile.sitterName ?? null, profile.businessName ?? null, profile.tagline ?? null, profile.location ?? null, profile.services ?? [], profile.phone ?? null, profile.email ?? null, profile.linkedinUrl ?? null, profile.profileImageUrl ?? null, profile.onboardingCompletedAt ? new Date(profile.onboardingCompletedAt) : null, profile.createdAt]);
    await client.query(`delete from business b where b.id=$1 and not exists(select 1 from site where business_id=b.id)`, [business.rows[0].id]);
  });
  return readPostgresProfile(subdomain);
}

export const postgresProfileRepository: ProfileRepository = {
  async readProfile(subdomain) {
    const current = await readPostgresProfile(subdomain);
    if (current) return current;
    const old = await legacy.readProfile(subdomain);
    return old ? migrateProfile(subdomain, old) : null;
  },
  async readProfiles(subdomains) { return Promise.all(subdomains.map((subdomain) => this.readProfile(subdomain))); },
  async createProfile(subdomain, profile) {
    if (!profile.ownerId) return false;
    try {
      await transaction(async (client) => {
        const business = await client.query<{ id: string }>(`insert into business(owner_user_id,name) values($1,$2) returning id`, [profile.ownerId, profile.businessName || profile.sitterName || subdomain]);
        await client.query(`insert into site(business_id,subdomain,emoji,sitter_name,business_name,tagline,location,services,phone,email,linkedin_url,profile_image_url,onboarding_completed_at,created_at) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,to_timestamp($14/1000.0))`, [business.rows[0].id, subdomain, profile.emoji, profile.sitterName ?? null, profile.businessName ?? null, profile.tagline ?? null, profile.location ?? null, profile.services ?? [], profile.phone ?? null, profile.email ?? null, profile.linkedinUrl ?? null, profile.profileImageUrl ?? null, profile.onboardingCompletedAt ? new Date(profile.onboardingCompletedAt) : null, profile.createdAt]);
      }); return true;
    } catch (error) { if ((error as { code?: string }).code === '23505') return false; throw error; }
  },
  async writeProfile(subdomain, profile) {
    await query(`update site s set emoji=$2,sitter_name=$3,business_name=$4,tagline=$5,location=$6,services=$7,phone=$8,email=$9,linkedin_url=$10,profile_image_url=$11,onboarding_completed_at=$12,updated_at=now() from business b where s.business_id=b.id and s.subdomain=$1 and b.owner_user_id=$13 and s.deleted_at is null`, [subdomain, profile.emoji, profile.sitterName ?? null, profile.businessName ?? null, profile.tagline ?? null, profile.location ?? null, profile.services ?? [], profile.phone ?? null, profile.email ?? null, profile.linkedinUrl ?? null, profile.profileImageUrl ?? null, profile.onboardingCompletedAt ? new Date(profile.onboardingCompletedAt) : null, profile.ownerId]);
    await query(`update business b set name=$2,payment_link_url=$3,updated_at=now() from site s where s.business_id=b.id and s.subdomain=$1 and b.owner_user_id=$4`, [subdomain, profile.businessName || profile.sitterName || subdomain, profile.paymentLinkUrl ?? null, profile.ownerId]);
  },
  async deleteProfile(subdomain) { return (await query(`update site set deleted_at=now(),updated_at=now() where subdomain=$1 and deleted_at is null`, [subdomain])).rowCount === 1; },
  async listOwnerSubdomains(ownerId) {
    const legacySubdomains = await legacy.listOwnerSubdomains(ownerId);
    await Promise.all(legacySubdomains.map(async (subdomain) => { if (!(await readPostgresProfile(subdomain))) { const profile = await legacy.readProfile(subdomain); if (profile) await migrateProfile(subdomain, profile); } }));
    return (await query<{ subdomain: string }>(`select s.subdomain from site s join business b on b.id=s.business_id where b.owner_user_id=$1 and s.deleted_at is null order by s.created_at`, [ownerId])).rows.map((row) => row.subdomain);
  },
  async addOwnerSubdomain() {}, async removeOwnerSubdomain() {},
  async readLeads(subdomain) {
    const site = await query<{ id: string; business_id: string }>(`select id,business_id from site where subdomain=$1 and deleted_at is null`, [subdomain]);
    if (!site.rows[0]) return [];
    let rows = (await query<LeadRow>(`select * from lead where site_id=$1 order by created_at desc`, [site.rows[0].id])).rows;
    if (!rows.length) {
      const old = await legacy.readLeads(subdomain);
      if (old.length) { await this.writeLeads(subdomain, old); rows = (await query<LeadRow>(`select * from lead where site_id=$1 order by created_at desc`, [site.rows[0].id])).rows; }
    }
    return rows.map(mapLead);
  },
  async writeLeads(subdomain, leads) {
    const site = await query<{ id: string; business_id: string }>(`select id,business_id from site where subdomain=$1 and deleted_at is null`, [subdomain]);
    if (!site.rows[0]) return;
    await transaction(async (client) => { for (const lead of leads) { const id = lead.id || crypto.randomUUID(); const inserted = await client.query<{ id: string }>(`insert into lead(id,site_id,business_id,customer_name,customer_email,service_requested,requested_start_date,requested_end_date,date_details,pet_types,pet_count,postal_code,care_details,source,campaign,status,read_at,created_at,updated_at) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,to_timestamp($18/1000.0),now()) on conflict(id) do update set read_at=excluded.read_at,status=excluded.status,updated_at=now() returning id`, [id, site.rows[0].id, site.rows[0].business_id, lead.name, lead.email, lead.serviceRequested ?? '', lead.requestedStartDate ?? null, lead.requestedEndDate ?? null, lead.dates, lead.petTypes ?? [], lead.petCount ?? null, lead.postalCode ?? '', lead.message, lead.source ?? 'direct', lead.campaign ?? null, lead.status ?? 'NEW', lead.readAt ? new Date(lead.readAt) : null, lead.createdAt]); await client.query(`insert into lead_event(lead_id,kind,created_at) select $1,'CREATED',to_timestamp($2/1000.0) where not exists(select 1 from lead_event where lead_id=$1 and kind='CREATED')`, [inserted.rows[0].id, lead.createdAt]); } });
  }
};
