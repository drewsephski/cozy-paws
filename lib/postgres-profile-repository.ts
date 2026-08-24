import type { BusinessProfile, Lead, OwnedLead, ProfileRecord, ProfileRepository } from './profile-ownership';
import { query, transaction } from './db';
import { redisProfileRepository as legacy } from './redis-profile-repository';
import { createHash } from 'node:crypto';
import type { PoolClient } from 'pg';

export type ProfileRow = { owner_id: string; subdomain: string; emoji: string; created_at: Date; sitter_name: string | null; business_name: string | null; tagline: string | null; location: string | null; services: string[]; phone: string | null; email: string | null; linkedin_url: string | null; profile_image_url: string | null; onboarding_completed_at: Date | null; payment_link_url: string | null; availability_status: BusinessProfile['availabilityStatus']; availability_until: Date | string | null; years_experience: number | null; care_capabilities: string[]; meet_and_greet_expectations: string | null; cancellation_expectations: string | null; self_reported_credentials: string[]; about: string | null; care_routine: string | null; home_environment: string | null; pet_preferences: string | null; experience_summary: string | null; special_care_summary: string | null; service_details: BusinessProfile['serviceDetails']; profile_revision: string | number | null };
type LeadRow = { id: string; customer_name: string; customer_email: string; service_requested: string; requested_start_date: Date | string | null; requested_end_date: Date | string | null; date_details: string; pet_types: string[]; pet_count: number | null; postal_code: string; care_details: string; source: string; campaign: string | null; status: Lead['status']; read_at: Date | null; created_at: Date };
export const PROFILE_SELECT = `b.owner_user_id owner_id,s.subdomain,s.emoji,s.created_at,s.sitter_name,s.business_name,s.tagline,s.location,s.services,s.phone,s.email,s.linkedin_url,s.profile_image_url,s.onboarding_completed_at,b.payment_link_url,s.availability_status,s.availability_until,s.years_experience,s.care_capabilities,s.meet_and_greet_expectations,s.cancellation_expectations,s.self_reported_credentials,s.about,s.care_routine,s.home_environment,s.pet_preferences,s.experience_summary,s.special_care_summary,s.service_details,s.profile_revision`;
const MIGRATION_BOUNDARY_SELECT = `select (exists(select 1 from legacy_profile_migration_state state where state.owner_user_id=$1) or exists(select 1 from "user" u cross join legacy_profile_migration_cutover cutover where u.id=$1 and u."createdAt">=cutover.applied_at)) migration_checked`;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const mapProfile = (row: ProfileRow): ProfileRecord => ({ ownerId: row.owner_id, subdomain: row.subdomain, emoji: row.emoji, createdAt: row.created_at.getTime(), sitterName: row.sitter_name ?? undefined, businessName: row.business_name ?? undefined, tagline: row.tagline ?? undefined, location: row.location ?? undefined, services: row.services ?? [], phone: row.phone ?? undefined, email: row.email ?? undefined, linkedinUrl: row.linkedin_url ?? null, profileImageUrl: row.profile_image_url ?? undefined, onboardingCompletedAt: row.onboarding_completed_at?.getTime() ?? null, paymentLinkUrl: row.payment_link_url ?? undefined, availabilityStatus: row.availability_status ?? 'ACCEPTING', availabilityUntil: normalizePostgresCalendarDate(row.availability_until), yearsExperience: row.years_experience ?? null, careCapabilities: row.care_capabilities ?? [], meetAndGreetExpectations: row.meet_and_greet_expectations ?? undefined, cancellationExpectations: row.cancellation_expectations ?? undefined, selfReportedCredentials: row.self_reported_credentials ?? [], about: row.about ?? undefined, careRoutine: row.care_routine ?? undefined, homeEnvironment: row.home_environment ?? undefined, petPreferences: row.pet_preferences ?? undefined, experienceSummary: row.experience_summary ?? undefined, specialCareSummary: row.special_care_summary ?? undefined, serviceDetails: row.service_details ?? {}, profileRevision: Number(row.profile_revision ?? 0) });

const LOCK_PROFILE_SELECT = `select ${PROFILE_SELECT} from site s join business b on b.id=s.business_id where s.subdomain=$1 and s.deleted_at is null for update of s,b`;

export async function readProfileForUpdate(client: PoolClient, subdomain: string) {
  const result = await client.query<ProfileRow>(LOCK_PROFILE_SELECT, [subdomain]);
  return result.rows[0] ? mapProfile(result.rows[0]) : null;
}

export async function writeOwnedProfileInTransaction(client: PoolClient, subdomain: string, profile: BusinessProfile) {
  if (!profile.ownerId) return null;
  const updated = await client.query<ProfileRow>(`update site s set emoji=$2,sitter_name=$3,business_name=$4,tagline=$5,location=$6,services=$7,phone=$8,email=$9,linkedin_url=$10,profile_image_url=$11,onboarding_completed_at=$12,availability_status=$13,availability_until=$14,years_experience=$15,care_capabilities=$16,meet_and_greet_expectations=$17,cancellation_expectations=$18,self_reported_credentials=$19,about=$20,care_routine=$21,home_environment=$22,pet_preferences=$23,experience_summary=$24,special_care_summary=$25,service_details=$26,profile_revision=profile_revision+1,updated_at=now() from business b where s.business_id=b.id and s.subdomain=$1 and b.owner_user_id=$27 and s.deleted_at is null returning ${PROFILE_SELECT}`, [subdomain, profile.emoji, profile.sitterName ?? null, profile.businessName ?? null, profile.tagline ?? null, profile.location ?? null, profile.services ?? [], profile.phone ?? null, profile.email ?? null, profile.linkedinUrl ?? null, profile.profileImageUrl ?? null, profile.onboardingCompletedAt ? new Date(profile.onboardingCompletedAt) : null, profile.availabilityStatus ?? 'ACCEPTING', profile.availabilityUntil ?? null, profile.yearsExperience ?? null, profile.careCapabilities ?? [], profile.meetAndGreetExpectations ?? null, profile.cancellationExpectations ?? null, profile.selfReportedCredentials ?? [], profile.about ?? null, profile.careRoutine ?? null, profile.homeEnvironment ?? null, profile.petPreferences ?? null, profile.experienceSummary ?? null, profile.specialCareSummary ?? null, JSON.stringify(profile.serviceDetails ?? {}), profile.ownerId]);
  if (!updated.rows[0]) return null;
  await client.query(`update business b set name=$2,payment_link_url=$3,updated_at=now() from site s where s.business_id=b.id and s.subdomain=$1 and b.owner_user_id=$4`, [subdomain, profile.businessName || profile.sitterName || subdomain, profile.paymentLinkUrl ?? null, profile.ownerId]);
  return { ...mapProfile(updated.rows[0]), paymentLinkUrl: profile.paymentLinkUrl };
}

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
  const result = await query<ProfileRow>(`select ${PROFILE_SELECT} from site s join business b on b.id=s.business_id where s.subdomain=$1 and s.deleted_at is null`, [subdomain]);
  return result.rows[0] ? mapProfile(result.rows[0]) : null;
}

async function migrateProfile(subdomain: string, profile: BusinessProfile) {
  if (!profile.ownerId) return null;
  const legacyLeads = await legacy.readLeads(subdomain);
  await transaction(async (client) => {
    await migrateProfileInTransaction(client, subdomain, profile, legacyLeads);
  });
  return readPostgresProfile(subdomain);
}

function deterministicLegacyLeadId(subdomain: string, lead: Lead, index: number) {
  if (UUID.test(lead.id)) return lead.id;
  const hash = createHash('sha256').update(JSON.stringify([subdomain, index, lead.email, lead.createdAt, lead.dates, lead.message])).digest('hex');
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-5${hash.slice(13, 16)}-a${hash.slice(17, 20)}-${hash.slice(20, 32)}`;
}

async function migrateProfileInTransaction(client: PoolClient, subdomain: string, profile: BusinessProfile, leads: Lead[]) {
  if (!profile.ownerId) return false;
  const business = await client.query<{ id: string }>(`insert into business(owner_user_id,name,created_at,updated_at) values($1,$2,to_timestamp($3/1000.0),now()) returning id`, [profile.ownerId, profile.businessName || profile.sitterName || subdomain, profile.createdAt]);
  const site = await client.query<{ id: string; business_id: string }>(`insert into site(business_id,subdomain,emoji,sitter_name,business_name,tagline,location,services,phone,email,linkedin_url,profile_image_url,onboarding_completed_at,about,care_routine,home_environment,pet_preferences,experience_summary,special_care_summary,service_details,profile_revision,created_at,updated_at) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,to_timestamp($22/1000.0),now()) on conflict(subdomain) do nothing returning id,business_id`, [business.rows[0].id, subdomain, profile.emoji, profile.sitterName ?? null, profile.businessName ?? null, profile.tagline ?? null, profile.location ?? null, profile.services ?? [], profile.phone ?? null, profile.email ?? null, profile.linkedinUrl ?? null, profile.profileImageUrl ?? null, profile.onboardingCompletedAt ? new Date(profile.onboardingCompletedAt) : null, profile.about ?? null, profile.careRoutine ?? null, profile.homeEnvironment ?? null, profile.petPreferences ?? null, profile.experienceSummary ?? null, profile.specialCareSummary ?? null, JSON.stringify(profile.serviceDetails ?? {}), profile.profileRevision ?? 0, profile.createdAt]);
  if (!site.rows[0]) {
    await client.query(`delete from business where id=$1`, [business.rows[0].id]);
    return false;
  }
  for (const [index, lead] of leads.entries()) {
    const id = deterministicLegacyLeadId(subdomain, lead, index);
    const inserted = await client.query<{ id: string }>(`insert into lead(id,site_id,business_id,customer_name,customer_email,service_requested,requested_start_date,requested_end_date,date_details,pet_types,pet_count,postal_code,care_details,source,campaign,status,read_at,created_at,updated_at) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,to_timestamp($18/1000.0),now()) on conflict(id) do nothing returning id`, [id, site.rows[0].id, site.rows[0].business_id, lead.name, lead.email, lead.serviceRequested ?? '', lead.requestedStartDate ?? null, lead.requestedEndDate ?? null, lead.dates, lead.petTypes ?? [], lead.petCount ?? null, lead.postalCode ?? '', lead.message, lead.source ?? 'direct', lead.campaign ?? null, lead.status ?? 'NEW', lead.readAt ? new Date(lead.readAt) : null, lead.createdAt]);
    if (inserted.rows[0]) await client.query(`insert into lead_event(lead_id,kind,created_at) values($1,'CREATED',to_timestamp($2/1000.0))`, [id, lead.createdAt]);
  }
  return true;
}

export const postgresProfileRepository: ProfileRepository = {
  async readProfile(subdomain) {
    const current = await readPostgresProfile(subdomain);
    if (current) return current;
    const old = await legacy.readProfile(subdomain);
    return old ? migrateProfile(subdomain, old) : null;
  },
  async readProfiles(subdomains) {
    if (!subdomains.length) return [];
    const current = await query<ProfileRow>(`select ${PROFILE_SELECT} from site s join business b on b.id=s.business_id where s.subdomain=any($1::text[]) and s.deleted_at is null`, [subdomains]);
    const bySubdomain = new Map(current.rows.map((row) => [row.subdomain, mapProfile(row)]));
    for (const subdomain of subdomains) {
      if (bySubdomain.has(subdomain)) continue;
      const old = await legacy.readProfile(subdomain);
      const migrated = old ? await migrateProfile(subdomain, old) : null;
      if (migrated) bySubdomain.set(subdomain, migrated);
    }
    return subdomains.map((subdomain) => bySubdomain.get(subdomain) ?? null);
  },
  async createProfile(subdomain, profile) {
    if (!profile.ownerId) return false;
    try {
      await transaction(async (client) => {
        const business = await client.query<{ id: string }>(`insert into business(owner_user_id,name) values($1,$2) returning id`, [profile.ownerId, profile.businessName || profile.sitterName || subdomain]);
        await client.query(`insert into site(business_id,subdomain,emoji,sitter_name,business_name,tagline,location,services,phone,email,linkedin_url,profile_image_url,onboarding_completed_at,about,care_routine,home_environment,pet_preferences,experience_summary,special_care_summary,service_details,profile_revision,created_at) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,to_timestamp($22/1000.0))`, [business.rows[0].id, subdomain, profile.emoji, profile.sitterName ?? null, profile.businessName ?? null, profile.tagline ?? null, profile.location ?? null, profile.services ?? [], profile.phone ?? null, profile.email ?? null, profile.linkedinUrl ?? null, profile.profileImageUrl ?? null, profile.onboardingCompletedAt ? new Date(profile.onboardingCompletedAt) : null, profile.about ?? null, profile.careRoutine ?? null, profile.homeEnvironment ?? null, profile.petPreferences ?? null, profile.experienceSummary ?? null, profile.specialCareSummary ?? null, JSON.stringify(profile.serviceDetails ?? {}), profile.profileRevision ?? 0, profile.createdAt]);
      }); return true;
    } catch (error) { if ((error as { code?: string }).code === '23505') return false; throw error; }
  },
  async writeProfile(subdomain, profile) {
    return transaction(async (client) => {
      const updated = await writeOwnedProfileInTransaction(client, subdomain, profile);
      if (!updated) throw new Error('Owned Site was not found while saving the profile.');
      return updated;
    });
  },
  async deleteProfile(subdomain) { return (await query(`update site set deleted_at=now(),updated_at=now() where subdomain=$1 and deleted_at is null`, [subdomain])).rowCount === 1; },
  async listOwnerSubdomains(ownerId) {
    const current = await query<{ subdomain: string }>(`select s.subdomain from site s join business b on b.id=s.business_id where b.owner_user_id=$1 and s.deleted_at is null order by s.created_at`, [ownerId]);
    const boundary = await query<{ migration_checked: boolean }>(MIGRATION_BOUNDARY_SELECT, [ownerId]);
    if (boundary.rows[0]?.migration_checked) return current.rows.map((row) => row.subdomain);
    return transaction(async (client) => {
      await client.query(`select pg_advisory_xact_lock(hashtext($1))`, [`legacy-profile-boundary:${ownerId}`]);
      if ((await client.query<{ migration_checked: boolean }>(MIGRATION_BOUNDARY_SELECT, [ownerId])).rows[0]?.migration_checked) {
        return (await client.query<{ subdomain: string }>(`select s.subdomain from site s join business b on b.id=s.business_id where b.owner_user_id=$1 and s.deleted_at is null order by s.created_at`, [ownerId])).rows.map((row) => row.subdomain);
      }
      const postgresSubdomains = new Set((await client.query<{ subdomain: string }>(`select s.subdomain from site s join business b on b.id=s.business_id where b.owner_user_id=$1 and s.deleted_at is null`, [ownerId])).rows.map((row) => row.subdomain));
      for (const subdomain of await legacy.listOwnerSubdomains(ownerId)) {
        if (postgresSubdomains.has(subdomain)) continue;
        const profile = await legacy.readProfile(subdomain);
        if (!profile || profile.ownerId !== ownerId) continue;
        await migrateProfileInTransaction(client, subdomain, profile, await legacy.readLeads(subdomain));
      }
      await client.query(`insert into legacy_profile_migration_state(owner_user_id) values($1) on conflict(owner_user_id) do nothing`, [ownerId]);
      return (await client.query<{ subdomain: string }>(`select s.subdomain from site s join business b on b.id=s.business_id where b.owner_user_id=$1 and s.deleted_at is null order by s.created_at`, [ownerId])).rows.map((row) => row.subdomain);
    });
  },
  async addOwnerSubdomain() {}, async removeOwnerSubdomain() {},
  async readLeads(subdomain) {
    const site = await query<{ id: string; business_id: string }>(`select id,business_id from site where subdomain=$1 and deleted_at is null`, [subdomain]);
    if (!site.rows[0]) return [];
    return (await query<LeadRow>(`select * from lead where site_id=$1 order by created_at desc`, [site.rows[0].id])).rows.map(mapLead);
  },
  async writeLeads(subdomain, leads) {
    const site = await query<{ id: string; business_id: string }>(`select id,business_id from site where subdomain=$1 and deleted_at is null`, [subdomain]);
    if (!site.rows[0]) return;
    await transaction(async (client) => { for (const lead of leads) { const id = lead.id || crypto.randomUUID(); const inserted = await client.query<{ id: string }>(`insert into lead(id,site_id,business_id,customer_name,customer_email,service_requested,requested_start_date,requested_end_date,date_details,pet_types,pet_count,postal_code,care_details,source,campaign,status,read_at,created_at,updated_at) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,to_timestamp($18/1000.0),now()) on conflict(id) do update set read_at=excluded.read_at,status=excluded.status,updated_at=now() returning id`, [id, site.rows[0].id, site.rows[0].business_id, lead.name, lead.email, lead.serviceRequested ?? '', lead.requestedStartDate ?? null, lead.requestedEndDate ?? null, lead.dates, lead.petTypes ?? [], lead.petCount ?? null, lead.postalCode ?? '', lead.message, lead.source ?? 'direct', lead.campaign ?? null, lead.status ?? 'NEW', lead.readAt ? new Date(lead.readAt) : null, lead.createdAt]); await client.query(`insert into lead_event(lead_id,kind,created_at) select $1,'CREATED',to_timestamp($2/1000.0) where not exists(select 1 from lead_event where lead_id=$1 and kind='CREATED')`, [inserted.rows[0].id, lead.createdAt]); } });
  },
  async readOwnerLeads(ownerId: string, profiles: ProfileRecord[]): Promise<OwnedLead[]> {
    if (!profiles.length) return [];
    const subdomains = profiles.map((profile) => profile.subdomain);
    const result = await query<LeadRow & { subdomain: string }>(`select l.*,s.subdomain from lead l join site s on s.id=l.site_id and s.business_id=l.business_id join business b on b.id=s.business_id where b.owner_user_id=$1 and s.subdomain=any($2::text[]) and s.deleted_at is null order by l.created_at desc`, [ownerId, subdomains]);
    const profileBySubdomain = new Map(profiles.map((profile) => [profile.subdomain, profile]));
    return result.rows.map((row) => {
      const profile = profileBySubdomain.get(row.subdomain)!;
      return { ...mapLead(row), subdomain: row.subdomain, siteName: profile.businessName || profile.sitterName || row.subdomain };
    });
  },
  async markLeadsRead(ownerId, leadIds, readAt) {
    const result = await query<{ id: string }>(`update lead l set read_at=$3 from site s join business b on b.id=s.business_id where l.id=any($2::uuid[]) and l.site_id=s.id and l.business_id=s.business_id and b.owner_user_id=$1 and s.deleted_at is null returning l.id`, [ownerId, leadIds, new Date(readAt)]);
    return result.rows.map((row) => row.id);
  }
};
