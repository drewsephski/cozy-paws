create extension if not exists pgcrypto;

create table if not exists business (
  id uuid primary key default gen_random_uuid(),
  owner_user_id text not null references "user"(id) on delete restrict,
  name text not null,
  stripe_account_id text unique,
  stripe_ready boolean not null default false,
  payment_link_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists business_owner_idx on business(owner_user_id);
alter table business add column if not exists payment_link_url text;

create table if not exists site (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references business(id) on delete restrict,
  subdomain text not null unique,
  emoji text not null,
  tagline text,
  location text,
  services text[] not null default '{}',
  phone text,
  email text,
  profile_image_url text,
  onboarding_completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint site_subdomain_normalized check (subdomain = lower(subdomain))
);
create index if not exists site_business_idx on site(business_id) where deleted_at is null;
create unique index if not exists site_id_business_uidx on site(id,business_id);

create table if not exists lead (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references site(id) on delete restrict,
  business_id uuid not null references business(id) on delete restrict,
  customer_name text not null,
  customer_email text not null,
  service_requested text not null default '',
  requested_start_date date,
  requested_end_date date,
  date_details text not null default '',
  pet_types text[] not null default '{}',
  pet_count integer check (pet_count is null or pet_count between 1 and 50),
  postal_code text not null default '',
  care_details text not null default '',
  source text not null default 'direct',
  campaign text,
  status text not null default 'NEW' check (status in ('NEW','QUALIFIED','QUOTED','BOOKED','DECLINED','SPAM')),
  read_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint lead_site_business_fk foreign key (site_id,business_id) references site(id,business_id) on delete restrict
);
alter table lead add column if not exists business_id uuid;
update lead l set business_id=s.business_id from site s where l.site_id=s.id and l.business_id is null;
alter table lead alter column business_id set not null;
create index if not exists lead_site_idx on lead(site_id, created_at desc);
create unique index if not exists lead_id_business_uidx on lead(id,business_id);
do $$ begin
  if not exists(select 1 from pg_constraint where conname='lead_site_business_fk') then
    alter table lead add constraint lead_site_business_fk foreign key(site_id,business_id) references site(id,business_id) on delete restrict;
  end if;
end $$;

create table if not exists lead_event (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null constraint lead_event_lead_fk references lead(id) on delete restrict,
  kind text not null check (kind in ('CREATED','QUALIFIED','PAYMENT_REQUEST_CREATED','BOOKED','DECLINED','SPAM')),
  created_at timestamptz not null default now()
);
do $$ begin
  if not exists(select 1 from pg_constraint where conname='lead_event_lead_fk') then
    alter table lead_event add constraint lead_event_lead_fk foreign key(lead_id) references lead(id) on delete restrict;
  end if;
end $$;

create table if not exists payment_request (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references business(id) on delete restrict,
  lead_id uuid not null references lead(id) on delete restrict,
  public_token text not null unique,
  amount_cents integer not null check (amount_cents between 100 and 1000000),
  platform_fee_cents integer not null check (platform_fee_cents > 0 and platform_fee_cents < amount_cents),
  currency text not null default 'usd' check (currency = lower(currency) and char_length(currency) = 3),
  description text not null check (char_length(description) between 3 and 200),
  customer_note text,
  customer_email text,
  status text not null default 'OPEN' check (status in ('OPEN','PAID','PARTIALLY_REFUNDED','REFUNDED','DISPUTED','CHARGEBACK')),
  refunded_amount_cents integer not null default 0 check (refunded_amount_cents >= 0 and refunded_amount_cents <= amount_cents),
  application_fee_refunded_cents integer not null default 0 check (application_fee_refunded_cents >= 0 and application_fee_refunded_cents <= platform_fee_cents),
  stripe_checkout_session_id text unique,
  stripe_checkout_retry_generation integer not null default 0 check (stripe_checkout_retry_generation >= 0),
  stripe_payment_intent_id text,
  stripe_charge_id text unique,
  stripe_application_fee_id text unique,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint payment_request_lead_business_fk foreign key (lead_id,business_id) references lead(id,business_id) on delete restrict
);
create index if not exists payment_request_business_idx on payment_request(business_id, created_at desc);
create index if not exists payment_request_lead_idx on payment_request(lead_id, created_at desc);
create unique index if not exists payment_request_one_open_per_lead_idx on payment_request(lead_id) where status = 'OPEN';
do $$ begin
  if not exists(select 1 from pg_constraint where conname='payment_request_lead_business_fk') then
    alter table payment_request add constraint payment_request_lead_business_fk foreign key(lead_id,business_id) references lead(id,business_id) on delete restrict;
  end if;
end $$;

create table if not exists stripe_webhook_event (
  event_id text primary key,
  event_type text not null,
  processed_at timestamptz not null default now()
);
