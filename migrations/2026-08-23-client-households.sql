create table if not exists client_household (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references business(id) on delete restrict,
  source_lead_id uuid not null unique,
  name text not null check (char_length(name) between 1 and 120),
  email text not null check (char_length(email) between 3 and 320),
  postal_code text not null default '' check (char_length(postal_code) <= 20),
  care_notes text not null default '' check (char_length(care_notes) <= 4000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint client_household_lead_business_fk
    foreign key (source_lead_id,business_id) references lead(id,business_id) on delete restrict
);
create index if not exists client_household_business_idx on client_household(business_id, updated_at desc);

create table if not exists client_pet (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references client_household(id) on delete restrict,
  name text not null check (char_length(name) between 1 and 120),
  type text not null check (char_length(type) between 1 and 80),
  care_notes text not null default '' check (char_length(care_notes) <= 4000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists client_pet_household_idx on client_pet(household_id, created_at, id);
