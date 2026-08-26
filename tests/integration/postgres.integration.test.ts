import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import Stripe from 'stripe';
import { query, setupIntegrationDatabase, teardownIntegrationDatabase, transaction } from './support/test-database';

const { retrieveIntentMock, retrieveChargeMock } = vi.hoisted(() => ({ retrieveIntentMock: vi.fn(), retrieveChargeMock: vi.fn() }));
vi.mock('../../lib/db', async () => import('./support/test-database'));
vi.mock('../../lib/stripe', () => ({ getStripe: () => ({
  paymentIntents: { retrieve: retrieveIntentMock },
  charges: { retrieve: retrieveChargeMock },
  disputes: { retrieve: vi.fn() },
  applicationFees: { list: vi.fn(), retrieve: vi.fn(), createRefund: vi.fn() }
}) }));

import { processStripeEvent } from '../../lib/stripe-webhooks';
import { postgresProfileRepository } from '../../lib/postgres-profile-repository';

const ids = {
  business1: '00000000-0000-4000-8000-000000000001', business2: '00000000-0000-4000-8000-000000000002',
  site1: '00000000-0000-4000-8000-000000000011', site2: '00000000-0000-4000-8000-000000000012',
  lead1: '00000000-0000-4000-8000-000000000021', lead2: '00000000-0000-4000-8000-000000000022',
  household1: '00000000-0000-4000-8000-000000000031', household2: '00000000-0000-4000-8000-000000000032',
  pet1: '00000000-0000-4000-8000-000000000041', pet2: '00000000-0000-4000-8000-000000000042'
};

beforeAll(async () => {
  await setupIntegrationDatabase();
  await query(`insert into "user"("id","name","email","emailVerified","createdAt","updatedAt") values
    ('owner-1','Owner One','one@example.com',true,now(),now()),('owner-2','Owner Two','two@example.com',true,now(),now())`);
  await query(`insert into business(id,owner_user_id,name,stripe_account_id,stripe_ready) values
    ($1,'owner-1','First Care','acct_1',true),($2,'owner-2','Second Care','acct_2',true)`, [ids.business1, ids.business2]);
  await query(`insert into site(id,business_id,subdomain,emoji) values ($1,$2,'first-care','dog'),($3,$4,'second-care','cat')`, [ids.site1, ids.business1, ids.site2, ids.business2]);
  await query(`insert into lead(id,site_id,business_id,customer_name,customer_email,status) values
    ($1,$2,$3,'Sam','sam@example.com','QUOTED'),($4,$5,$6,'Pat','pat@example.com','QUALIFIED')`, [ids.lead1, ids.site1, ids.business1, ids.lead2, ids.site2, ids.business2]);
  await query(`insert into client_household(id,business_id,source_lead_id,name,email) values
    ($1,$2,$3,'Sam','sam@example.com'),($4,$5,$6,'Pat','pat@example.com')`, [ids.household1, ids.business1, ids.lead1, ids.household2, ids.business2, ids.lead2]);
  await query(`insert into client_pet(id,household_id,name,type) values ($1,$2,'Milo','Dog'),($3,$4,'Luna','Cat')`, [ids.pet1, ids.household1, ids.pet2, ids.household2]);
});

afterAll(teardownIntegrationDatabase);

describe('canonical PostgreSQL migrations and constraints', () => {
  it('applies the manifest and exposes every expected table', async () => {
    const result = await query<{ names: string[] }>(`select array_agg(tablename::text order by tablename)::text[] names from pg_tables where schemaname=current_schema()`);
    expect(result.rows[0].names).toEqual(expect.arrayContaining(['business', 'site', 'lead', 'payment_request', 'public_payment', 'booking', 'booking_pet', 'growth_event', 'stripe_webhook_event']));
  });

  it('enforces Site/Business ownership with a composite foreign key', async () => {
    await expect(query(`insert into lead(site_id,business_id,customer_name,customer_email) values($1,$2,'Wrong','wrong@example.com')`, [ids.site1, ids.business2])).rejects.toMatchObject({ code: '23503' });
    await expect(query(`insert into payment_request(business_id,lead_id,public_token,amount_cents,platform_fee_cents,description,stripe_account_id) values($1,$2,'wrong-owner-request',10000,300,'Pet care','acct_2')`, [ids.business2, ids.lead1])).rejects.toMatchObject({ code: '23503' });
    await expect(query(`insert into public_payment(business_id,site_id,public_token,amount_cents,platform_fee_cents,stripe_account_id) values($1,$2,'wrong-owner-public',10000,300,'acct_2')`, [ids.business2, ids.site1])).rejects.toMatchObject({ code: '23503' });
  });

  it('defaults and bounds richer Site profile content without weakening ownership', async () => {
    const defaults = (await query<{ service_details: Record<string, unknown>; profile_revision: string }>(`select service_details,profile_revision::text from site where id=$1`, [ids.site1])).rows[0];
    expect(defaults).toEqual({ service_details: {}, profile_revision: '0' });
    await expect(query(`update site set about=repeat('a',3001) where id=$1`, [ids.site1])).rejects.toMatchObject({ code: '23514' });
    await expect(query(`update site set care_routine=repeat('a',1501) where id=$1`, [ids.site1])).rejects.toMatchObject({ code: '23514' });
    await expect(query(`update site set service_details='[]'::jsonb where id=$1`, [ids.site1])).rejects.toMatchObject({ code: '23514' });
    await expect(query(`update site set service_details=jsonb_build_object('large',repeat('a',12300)) where id=$1`, [ids.site1])).rejects.toMatchObject({ code: '23514' });
    await expect(query(`update site set profile_revision=-1 where id=$1`, [ids.site1])).rejects.toMatchObject({ code: '23514' });
    const ownership = (await query<{ count: string }>(`select count(*)::text count from pg_constraint where conrelid in ('site'::regclass,'lead'::regclass,'payment_request'::regclass,'public_payment'::regclass) and contype='f'`)).rows[0].count;
    expect(Number(ownership)).toBeGreaterThan(0);
  });

  it('enforces one open Payment request per Lead with a partial unique index', async () => {
    await query(`insert into payment_request(business_id,lead_id,public_token,amount_cents,platform_fee_cents,description,stripe_account_id) values($1,$2,'open-one',10000,300,'Pet care','acct_1')`, [ids.business1, ids.lead1]);
    await expect(query(`insert into payment_request(business_id,lead_id,public_token,amount_cents,platform_fee_cents,description,stripe_account_id) values($1,$2,'open-two',10000,300,'Pet care','acct_1')`, [ids.business1, ids.lead1])).rejects.toMatchObject({ code: '23505' });
    await query(`update payment_request set status='PAID' where public_token='open-one'`);
    await expect(query(`insert into payment_request(business_id,lead_id,public_token,amount_cents,platform_fee_cents,description,stripe_account_id) values($1,$2,'open-two',10000,300,'Pet care','acct_1')`, [ids.business1, ids.lead1])).resolves.toBeTruthy();
  });

  it('keeps each payment provider-account snapshot immutable when a Business connection changes', async () => {
    const publicPayment = await query<{ id: string }>(`insert into public_payment(business_id,site_id,public_token,amount_cents,platform_fee_cents,stripe_account_id) values($1,$2,'snapshot-public',10000,300,'acct_1') returning id`, [ids.business1, ids.site1]);
    await query(`update business set stripe_account_id='acct_replacement' where id=$1`, [ids.business1]);
    expect((await query<{ stripe_account_id: string }>(`select stripe_account_id from public_payment where id=$1`, [publicPayment.rows[0].id])).rows[0].stripe_account_id).toBe('acct_1');
    await expect(query(`update public_payment set stripe_account_id='acct_replacement' where id=$1`, [publicPayment.rows[0].id])).rejects.toThrow(/immutable/);
    await query(`update business set stripe_account_id='acct_1' where id=$1`, [ids.business1]);
  });

  it('enforces Booking household/source-Lead and Pet consistency', async () => {
    const booking = await query<{ id: string }>(`insert into booking(business_id,household_id,source_lead_id,start_date,end_date,amount_cents) values($1,$2,$3,'2026-09-10','2026-09-12',12000) returning id`, [ids.business1, ids.household1, ids.lead1]);
    await expect(query(`insert into booking_pet(booking_id,household_id,pet_id) values($1,$2,$3)`, [booking.rows[0].id, ids.household1, ids.pet2])).rejects.toMatchObject({ code: '23503' });
  });

  it('rolls back an interrupted transaction', async () => {
    await expect(transaction(async (client) => { await client.query(`insert into stripe_webhook_event(event_id,event_type) values('evt_rollback','test')`); throw new Error('stop'); })).rejects.toThrow('stop');
    expect((await query(`select 1 from stripe_webhook_event where event_id='evt_rollback'`)).rowCount).toBe(0);
  });

  it('atomically acknowledges owned Leads without rolling back a concurrent status change', async () => {
    await query(`update lead set status='NEW',read_at=null where id in ($1,$2)`, [ids.lead1, ids.lead2]);
    let releaseStatus!: () => void;
    let statusLocked!: () => void;
    const holdStatus = new Promise<void>((resolve) => { releaseStatus = resolve; });
    const locked = new Promise<void>((resolve) => { statusLocked = resolve; });
    const statusUpdate = transaction(async (client) => {
      await client.query(`update lead set status='QUALIFIED' where id=$1`, [ids.lead1]);
      statusLocked();
      await holdStatus;
    });
    await locked;
    const readUpdate = postgresProfileRepository.markLeadsRead('owner-1', [ids.lead1, ids.lead2], 1_800_000_000_000);
    await new Promise<void>((resolve) => setImmediate(resolve));
    releaseStatus();
    await Promise.all([statusUpdate, readUpdate]);

    const rows = await query<{ id: string; status: string; read_at: Date | null }>(`select id,status,read_at from lead where id in ($1,$2) order by id`, [ids.lead1, ids.lead2]);
    expect(rows.rows).toEqual([
      expect.objectContaining({ id: ids.lead1, status: 'QUALIFIED', read_at: expect.any(Date) }),
      expect.objectContaining({ id: ids.lead2, status: 'NEW', read_at: null }),
    ]);
  });
});

describe('financial settlement against real PostgreSQL', () => {
  it('settles and deduplicates Lead-attributed and public Site payments while preserving separate lifecycles', async () => {
    await query(`delete from payment_request where lead_id=$1`, [ids.lead1]);
    await query(`update lead set status='QUOTED' where id=$1`, [ids.lead1]);
    const request = await query<{ id: string }>(`insert into payment_request(business_id,lead_id,public_token,amount_cents,platform_fee_cents,description,stripe_checkout_session_id,stripe_account_id) values($1,$2,'settle-request',12550,377,'Overnight care','cs_request','acct_1') returning id`, [ids.business1, ids.lead1]);
    const publicPayment = await query<{ id: string }>(`insert into public_payment(business_id,site_id,public_token,amount_cents,platform_fee_cents,stripe_checkout_session_id,stripe_account_id) values($1,$2,'settle-public',8000,240,'cs_public','acct_1') returning id`, [ids.business1, ids.site1]);
    retrieveIntentMock.mockImplementation(async (id: string) => id === 'pi_request'
      ? { id, metadata: { paymentRequestId: request.rows[0].id }, latest_charge: 'ch_request' }
      : { id, metadata: { publicPaymentId: publicPayment.rows[0].id }, latest_charge: 'ch_public' });
    retrieveChargeMock.mockImplementation(async (id: string) => ({ id, payment_intent: id === 'ch_request' ? 'pi_request' : 'pi_public', application_fee: id === 'ch_request' ? 'fee_request' : 'fee_public', amount: id === 'ch_request' ? 12550 : 8000, amount_refunded: 0, currency: 'usd', created: 1_700_000_000 }));

    const requestEvent = { id: 'evt_request_paid', type: 'checkout.session.completed', account: 'acct_1', data: { object: { id: 'cs_request', status: 'complete', payment_status: 'paid', client_reference_id: request.rows[0].id, metadata: { paymentRequestId: request.rows[0].id }, payment_intent: 'pi_request', amount_total: 12550, currency: 'usd' } } } as unknown as Stripe.Event;
    const publicEvent = { id: 'evt_public_paid', type: 'checkout.session.completed', account: 'acct_1', data: { object: { id: 'cs_public', status: 'complete', payment_status: 'paid', client_reference_id: publicPayment.rows[0].id, metadata: { publicPaymentId: publicPayment.rows[0].id }, payment_intent: 'pi_public', amount_total: 8000, currency: 'usd' } } } as unknown as Stripe.Event;
    await processStripeEvent(requestEvent);
    await processStripeEvent(requestEvent);
    await processStripeEvent(publicEvent);

    expect((await query<{ status: string }>(`select status from payment_request where id=$1`, [request.rows[0].id])).rows[0].status).toBe('PAID');
    expect((await query<{ status: string }>(`select status from public_payment where id=$1`, [publicPayment.rows[0].id])).rows[0].status).toBe('PAID');
    expect((await query<{ status: string }>(`select status from lead where id=$1`, [ids.lead1])).rows[0].status).toBe('BOOKED');
    expect((await query<{ count: string }>(`select count(*)::text count from stripe_webhook_event where event_id in ('evt_request_paid','evt_public_paid')`)).rows[0].count).toBe('2');
  });
});
