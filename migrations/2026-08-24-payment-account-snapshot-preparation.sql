-- Backward-compatible preparation for immutable payment provider-account snapshots.
-- This intentionally leaves the new columns nullable until every historical row is
-- mapped to an account verified against Stripe provider objects or reviewed records.
alter table payment_request add column if not exists stripe_account_id text;
alter table public_payment add column if not exists stripe_account_id text;

create table if not exists payment_account_snapshot_backfill (
  payment_aggregate text not null check (payment_aggregate in ('payment_request','public_payment')),
  payment_id uuid not null,
  stripe_account_id text not null check (stripe_account_id <> ''),
  evidence text not null check (char_length(evidence) between 3 and 500),
  verified_at timestamptz not null default now(),
  primary key (payment_aggregate,payment_id)
);

create index if not exists payment_account_snapshot_backfill_account_idx
  on payment_account_snapshot_backfill(stripe_account_id);
