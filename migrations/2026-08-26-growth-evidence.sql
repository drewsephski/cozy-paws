create table if not exists growth_event (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references business(id) on delete restrict,
  site_id uuid not null,
  kind text not null check (kind in ('SITE_SHARED')),
  created_at timestamptz not null default now(),
  constraint growth_event_site_business_fk foreign key (site_id,business_id) references site(id,business_id) on delete restrict,
  constraint growth_event_site_kind_key unique (site_id,kind)
);

create index if not exists growth_event_business_created_idx on growth_event(business_id,created_at);
