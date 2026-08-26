import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { query, setupIntegrationDatabase, teardownIntegrationDatabase } from './support/test-database';

vi.mock('../../lib/db', async () => import('./support/test-database'));

import { growthEvidence } from '../../lib/growth-evidence';

const ids = {
  business: '00000000-0000-4000-8000-000000000101',
  otherBusiness: '00000000-0000-4000-8000-000000000102',
  site: '00000000-0000-4000-8000-000000000111',
  incompleteSite: '00000000-0000-4000-8000-000000000112',
  otherSite: '00000000-0000-4000-8000-000000000113',
  lead: '00000000-0000-4000-8000-000000000121',
  otherLead: '00000000-0000-4000-8000-000000000122',
  otherHousehold: '00000000-0000-4000-8000-000000000131'
};

beforeAll(async () => {
  await setupIntegrationDatabase();
  await query(`insert into "user"("id","name","email","emailVerified","createdAt","updatedAt") values
    ('growth-owner','Growth Owner','growth@example.com',true,now(),now()),
    ('other-owner','Other Owner','other-growth@example.com',true,now(),now())`);
  await query(`insert into business(id,owner_user_id,name) values
    ($1,'growth-owner','Growth Care'),($2,'other-owner','Other Care')`, [ids.business, ids.otherBusiness]);
  await query(`insert into site(id,business_id,subdomain,emoji,onboarding_completed_at) values
    ($1,$2,'growth-care','dog','2026-08-01T12:00:00Z'),
    ($3,$2,'growth-incomplete','cat',null),
    ($4,$5,'other-growth','dog','2026-08-01T12:00:00Z')`,
  [ids.site, ids.business, ids.incompleteSite, ids.otherSite, ids.otherBusiness]);
});

afterAll(teardownIntegrationDatabase);

describe('growth evidence against real PostgreSQL', () => {
  it('records one share only for an owned published Site', async () => {
    await expect(growthEvidence.recordOwnedSiteShare('other-owner', 'growth-care')).resolves.toBe(false);
    await expect(growthEvidence.recordOwnedSiteShare('growth-owner', 'growth-incomplete')).resolves.toBe(false);
    await expect(growthEvidence.recordOwnedSiteShare('growth-owner', 'growth-care')).resolves.toBe(true);
    await expect(growthEvidence.recordOwnedSiteShare('growth-owner', 'growth-care')).resolves.toBe(false);

    const events = await query<{ count: string }>(`select count(*)::text count from growth_event where site_id=$1 and kind='SITE_SHARED'`, [ids.site]);
    expect(events.rows[0].count).toBe('1');
  });

  it('derives value activation from the first post-share qualification for the same Business', async () => {
    const sharedAt = (await query<{ created_at: Date }>(`select created_at from growth_event where site_id=$1`, [ids.site])).rows[0].created_at;
    await query(`insert into lead(id,site_id,business_id,customer_name,customer_email) values($1,$2,$3,'Pat','pat@example.com')`, [ids.lead, ids.site, ids.business]);
    await query(`insert into lead_event(lead_id,kind,created_at) values($1,'QUALIFIED',$2)`, [ids.lead, new Date(sharedAt.getTime() + 10 * 24 * 60 * 60 * 1000)]);

    await expect(growthEvidence.getOwnerActivation('growth-owner')).resolves.toMatchObject({
      setupActivated: true,
      valueActivated: true,
      businesses: [{ businessId: ids.business, setupActivatedAt: expect.any(Date), valueActivatedAt: expect.any(Date) }]
    });
    await expect(growthEvidence.getOwnerActivation('other-owner')).resolves.toMatchObject({ setupActivated: false, valueActivated: false });
  });

  it('reports durable funnel counts without substituting zeros for unavailable stages', async () => {
    await query(`insert into lead(id,site_id,business_id,customer_name,customer_email,status) values($1,$2,$3,'Spam','spam@example.com','SPAM')`, [ids.otherLead, ids.otherSite, ids.otherBusiness]);
    await query(`insert into client_household(id,business_id,source_lead_id,name,email) values($1,$2,$3,'Old household','old@example.com')`, [ids.otherHousehold, ids.otherBusiness, ids.otherLead]);
    await query(`update client_household set updated_at=now()-interval '60 days' where id=$1`, [ids.otherHousehold]);
    await query(`insert into booking(business_id,household_id,source_lead_id,start_date,end_date,amount_cents,status) values($1,$2,$3,'2026-08-10','2026-08-11',10000,'CANCELLED')`, [ids.otherBusiness, ids.otherHousehold, ids.otherLead]);
    const report = await growthEvidence.getOperationalReport();
    expect(report).toMatchObject({
      acquisition: {
        selectedContacts: null,
        trials: null,
        publishedSites: 2,
        sharedBusinesses: 1,
        qualifiedBusinesses: 1,
        payingBusinesses: null,
        referrals: null,
        activeBusinesses30d: 1
      },
      ownerJourney: { inquiries: 2, qualifiedLeads: 1, reviews: null }
    });

    await query(`update client_household set updated_at=now() where id=$1`, [ids.otherHousehold]);
    await expect(growthEvidence.getOperationalReport()).resolves.toMatchObject({ acquisition: { activeBusinesses30d: 2 } });
  });
});
