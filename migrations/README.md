# Manual migration runbook

[`manifest.json`](manifest.json) is the canonical, complete migration order. Every SQL file in this directory appears exactly once. Do not sort by filename at deploy time, skip prerequisites, or introduce an ORM runner.

## Before applying anything

1. Resolve the target from `DATABASE_URL` without printing credentials. Confirm the database name, host, project, branch/environment, and whether it is Local, Preview, or Production.
2. Prove Preview and Production do not share a database. A confirmation variable or successful connection is not isolation proof.
3. Record which manifest entries are already applied by inspecting schema objects. `auth.sql` bootstraps an empty database and is not replayed over an existing Better Auth schema.
4. Back up or establish provider recovery appropriate to the environment. Stop application writes if the planned change cannot safely run concurrently.
5. Apply only missing entries, in manifest order, in one reviewed database session. Manual migration state is an external release gate.

`2026-08-24-legacy-profile-migration-boundary.sql` makes Redis discovery explicit and bounded. Existing owners are checked once for any remaining Redis-only Sites and Leads; owners created after its cutover are PostgreSQL-native. Do not remove legacy Redis data until all expected owners have a row in `legacy_profile_migration_state` and the migrated PostgreSQL records have been independently verified.

The guarded entries require an in-session setting after the checks above:

```sql
set sitterfolio.confirm_booking_migration = 'yes';
set sitterfolio.confirm_payment_account_snapshot_migration = 'yes';
```

Payment-account snapshots use a staged release because the old code does not populate them and historical provider ownership cannot safely be inferred from a mutable Business row:

1. Apply `2026-08-24-payment-account-snapshot-preparation.sql`. It adds nullable columns and the durable `payment_account_snapshot_backfill` review table without breaking the old application.
2. For every existing Payment request and public Site payment, verify the connected account from Stripe provider objects or reviewed operational records. Insert one mapping with concise evidence, for example `Stripe Checkout cs_... retrieved on acct_...`. A Business’s current account is not proof: the former reconnect path could replace an account when only public-payment history existed.
3. Quiesce new payment creation, populate and review every remaining mapping, then set `sitterfolio.confirm_payment_account_snapshot_migration=yes` and apply `2026-08-24-payment-account-snapshots.sql`. It fails closed on any unmapped row, makes the columns non-null, and installs immutability triggers.
4. Deploy the exact reviewed application code, run the read-only checks below, then resume payment creation. Do not resume if provider objects, snapshots, or the deployed code disagree.

This order preserves the original account for old refunds and disputes. Never substitute a replacement or current Business account merely to pass finalization.

## Read-only post-apply verification

Run these against the same verified target after the applicable manifest entries finish:

```sql
select current_database(), current_user, inet_server_addr(), inet_server_port();

select tablename
from pg_tables
where schemaname = current_schema()
order by tablename;

select table_name, column_name, is_nullable, data_type
from information_schema.columns
where table_schema = current_schema()
  and table_name in ('business','site','lead','payment_request','public_payment','client_household','client_pet','booking','booking_pet','stripe_webhook_event')
order by table_name, ordinal_position;

select column_name, column_default
from information_schema.columns
where table_schema=current_schema() and table_name='site'
  and column_name in ('about','care_routine','home_environment','pet_preferences','experience_summary','special_care_summary','service_details','profile_revision')
order by column_name;

select conname
from pg_constraint
where conrelid='site'::regclass and conname like 'site_%_check'
order by conname;

select count(*) owners_pending_legacy_profile_check
from "user" u
cross join legacy_profile_migration_cutover cutover
left join legacy_profile_migration_state state on state.owner_user_id=u."id"
where u."createdAt"<cutover.applied_at and state.owner_user_id is null;

select (select count(*) from payment_request where stripe_account_id is null) payment_requests_without_account,
       (select count(*) from public_payment where stripe_account_id is null) public_payments_without_account;

select payment_aggregate, count(*) verified_rows
from payment_account_snapshot_backfill
group by payment_aggregate
order by payment_aggregate;

select tgname
from pg_trigger
where not tgisinternal
  and tgname in ('payment_request_preserve_account_snapshot','public_payment_preserve_account_snapshot')
order by tgname;

select count(*) orphaned_leads
from lead l
left join site s on s.id=l.site_id and s.business_id=l.business_id
where s.id is null;

select count(*) inconsistent_booking_pets
from booking_pet bp
left join booking b on b.id=bp.booking_id and b.household_id=bp.household_id
left join client_pet p on p.id=bp.pet_id and p.household_id=bp.household_id
where b.id is null or p.id is null;

select lead_id, count(*)
from payment_request
where status='OPEN'
group by lead_id
having count(*) > 1;
```

Zero counts are expected for the integrity queries. These checks do not prove application deployment, Redis backfill completeness, provider configuration, signed webhook delivery, or real payment acceptance.

## Disposable integration database

`pnpm test:integration` applies the canonical manifest to a random schema and exercises constraints and settlement transactions. It requires `TEST_DATABASE_URL` to point to a locally hosted database whose name contains `test`; the harness rejects remote hosts, including shared/Preview/Production Neon. CI supplies an isolated PostgreSQL service. Fast unit tests remain `pnpm test`.
