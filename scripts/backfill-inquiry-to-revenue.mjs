import { createHash } from 'node:crypto';
import pg from 'pg';
import { Redis } from '@upstash/redis';

if (process.env.CONFIRM_FINANCIAL_MIGRATION !== 'yes') throw new Error('Set CONFIRM_FINANCIAL_MIGRATION=yes after confirming the target database environment');
if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
const redis = Redis.fromEnv();
const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
const ownerKeys = [];
let cursor = 0;
do {
  const result = await redis.scan(cursor, { match: 'owner:*:subdomains', count: 100 });
  cursor = Number(result[0]); ownerKeys.push(...result[1]);
} while (cursor !== 0);

let expectedSites = 0; let expectedLeads = 0;
function stableLegacyLeadId(subdomain, lead, index) {
  const hex = createHash('sha256').update(JSON.stringify([subdomain, index, lead.createdAt, lead.email, lead.name])).digest('hex').slice(0, 32);
  return `${hex.slice(0,8)}-${hex.slice(8,12)}-5${hex.slice(13,16)}-a${hex.slice(17,20)}-${hex.slice(20)}`;
}
await client.connect();
try {
  await client.query('begin');
  for (const ownerKey of ownerKeys) {
    const ownerId = ownerKey.slice('owner:'.length, -':subdomains'.length);
    const subdomains = await redis.smembers(ownerKey);
    for (const subdomain of subdomains) {
      const profile = await redis.get(`subdomain:${subdomain}`);
      if (!profile?.ownerId || profile.ownerId !== ownerId) throw new Error(`Ownership mismatch for ${subdomain}`);
      expectedSites += 1;
      let site = await client.query(`select id,business_id from site where subdomain=$1`, [subdomain]);
      if (!site.rows[0]) {
        const business = await client.query(`insert into business(owner_user_id,name,created_at) values($1,$2,to_timestamp($3/1000.0)) returning id`, [ownerId, profile.businessName || subdomain, profile.createdAt]);
        site = await client.query(`insert into site(business_id,subdomain,emoji,tagline,location,services,phone,email,profile_image_url,onboarding_completed_at,created_at) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,to_timestamp($11/1000.0)) returning id,business_id`, [business.rows[0].id, subdomain, profile.emoji, profile.tagline ?? null, profile.location ?? null, profile.services ?? [], profile.phone ?? null, profile.email ?? null, profile.profileImageUrl ?? null, profile.onboardingCompletedAt ? new Date(profile.onboardingCompletedAt) : null, profile.createdAt]);
      }
      const leads = await redis.get(`leads:${subdomain}`) ?? [];
      expectedLeads += leads.length;
      for (const [index, lead] of leads.entries()) {
        const id = lead.id || stableLegacyLeadId(subdomain, lead, index);
        await client.query(`insert into lead(id,site_id,business_id,customer_name,customer_email,date_details,care_details,status,read_at,created_at) values($1,$2,$3,$4,$5,$6,$7,'NEW',$8,to_timestamp($9/1000.0)) on conflict(id) do nothing`, [id, site.rows[0].id, site.rows[0].business_id, lead.name, lead.email, lead.dates || '', lead.message || '', lead.readAt ? new Date(lead.readAt) : null, lead.createdAt]);
        await client.query(`insert into lead_event(lead_id,kind,created_at) select $1,'CREATED',to_timestamp($2/1000.0) where not exists(select 1 from lead_event where lead_id=$1 and kind='CREATED')`, [id, lead.createdAt]);
      }
    }
  }
  const siteCount = Number((await client.query(`select count(*) count from site s join business b on b.id=s.business_id where b.owner_user_id = any($1::text[])`, [ownerKeys.map((key) => key.slice('owner:'.length, -':subdomains'.length))])).rows[0].count);
  const leadCount = Number((await client.query(`select count(*) count from lead l join business b on b.id=l.business_id where b.owner_user_id = any($1::text[])`, [ownerKeys.map((key) => key.slice('owner:'.length, -':subdomains'.length))])).rows[0].count);
  if (siteCount < expectedSites || leadCount < expectedLeads) throw new Error(`Backfill validation failed: expected at least ${expectedSites} Sites/${expectedLeads} Leads, found ${siteCount}/${leadCount}`);
  await client.query('commit');
  console.log(`Backfill validated: ${siteCount} Sites and ${leadCount} Leads for ${ownerKeys.length} owners.`);
} catch (error) {
  await client.query('rollback').catch(() => undefined); throw error;
} finally { await client.end(); }
