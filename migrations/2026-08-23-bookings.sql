-- Manual migration. Verify the target database identity and environment isolation before applying,
-- then run `set sitterfolio.confirm_booking_migration = 'yes';` in the same session.
do $$ begin
  if current_setting('sitterfolio.confirm_booking_migration', true) is distinct from 'yes' then
    raise exception 'Booking migration blocked: verify database identity and set sitterfolio.confirm_booking_migration=yes';
  end if;
end $$;

create unique index if not exists client_household_id_business_uidx
  on client_household(id,business_id);
create unique index if not exists client_household_id_business_source_uidx
  on client_household(id,business_id,source_lead_id);
create unique index if not exists client_pet_id_household_uidx
  on client_pet(id,household_id);

create table if not exists booking (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references business(id) on delete restrict,
  household_id uuid not null,
  source_lead_id uuid,
  start_date date not null,
  end_date date not null,
  amount_cents integer not null check (amount_cents between 100 and 1000000),
  status text not null default 'DRAFT' check (status in ('DRAFT','CONFIRMED','COMPLETED','CANCELLED')),
  notes text not null default '' check (char_length(notes) <= 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint booking_dates_ordered check (end_date >= start_date),
  constraint booking_household_business_fk
    foreign key (household_id,business_id)
    references client_household(id,business_id) on delete restrict,
  constraint booking_source_lead_business_fk
    foreign key (source_lead_id,business_id)
    references lead(id,business_id) on delete restrict,
  constraint booking_household_business_source_fk
    foreign key (household_id,business_id,source_lead_id)
    references client_household(id,business_id,source_lead_id) on delete restrict
);
create index if not exists booking_business_dates_idx on booking(business_id,start_date,end_date);
create unique index if not exists booking_id_household_uidx on booking(id,household_id);

create table if not exists booking_pet (
  booking_id uuid not null,
  household_id uuid not null,
  pet_id uuid not null,
  primary key (booking_id,pet_id),
  constraint booking_pet_booking_household_fk
    foreign key (booking_id,household_id) references booking(id,household_id) on delete restrict,
  constraint booking_pet_pet_household_fk
    foreign key (pet_id,household_id) references client_pet(id,household_id) on delete restrict
);
create index if not exists booking_pet_household_idx on booking_pet(household_id,booking_id);
