create table if not exists testimonial (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null,
  business_id uuid not null references business(id) on delete restrict,
  testimonial_type text not null default 'SELF_PUBLISHED_TESTIMONIAL',
  testimonial_text text not null,
  displayed_source text not null,
  permission_attested_at timestamptz not null,
  published_at timestamptz,
  hidden_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint testimonial_site_business_fk foreign key (site_id,business_id) references site(id,business_id) on delete restrict,
  constraint testimonial_type_check check (testimonial_type='SELF_PUBLISHED_TESTIMONIAL'),
  constraint testimonial_text_check check (char_length(btrim(testimonial_text)) between 1 and 1000),
  constraint testimonial_source_check check (char_length(btrim(displayed_source)) between 1 and 120),
  constraint testimonial_publication_state_check check (
    deleted_at is not null
    or (published_at is not null and hidden_at is null)
    or (published_at is null and hidden_at is not null)
  )
);

create index if not exists testimonial_site_public_idx
  on testimonial(site_id,published_at desc)
  where deleted_at is null and published_at is not null;

create index if not exists testimonial_business_idx
  on testimonial(business_id,created_at desc)
  where deleted_at is null;
