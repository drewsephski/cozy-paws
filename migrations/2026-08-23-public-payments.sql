create table if not exists public_payment (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references business(id) on delete restrict,
  site_id uuid not null references site(id) on delete restrict,
  public_token text not null unique,
  amount_cents integer not null check (amount_cents between 100 and 1000000),
  platform_fee_cents integer not null check (platform_fee_cents > 0 and platform_fee_cents < amount_cents),
  currency text not null default 'usd' check (currency = lower(currency) and char_length(currency) = 3),
  status text not null default 'OPEN' check (status in ('OPEN','PAID','PARTIALLY_REFUNDED','REFUNDED','DISPUTED','CHARGEBACK')),
  refunded_amount_cents integer not null default 0 check (refunded_amount_cents between 0 and amount_cents),
  application_fee_refunded_cents integer not null default 0 check (application_fee_refunded_cents between 0 and platform_fee_cents),
  stripe_checkout_session_id text unique,
  stripe_payment_intent_id text,
  stripe_charge_id text unique,
  stripe_application_fee_id text unique,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint public_payment_site_business_fk foreign key(site_id,business_id) references site(id,business_id) on delete restrict
);
create index if not exists public_payment_business_idx on public_payment(business_id,created_at desc);
create index if not exists public_payment_site_idx on public_payment(site_id,created_at desc);
