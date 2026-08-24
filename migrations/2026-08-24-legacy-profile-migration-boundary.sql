-- Records the one-time Redis profile discovery boundary for each owner. PostgreSQL
-- is authoritative after the boundary is completed; Redis remains compatibility/cache.
create table if not exists legacy_profile_migration_state (
  owner_user_id text primary key references "user"("id") on delete cascade,
  checked_at timestamptz not null default now()
);

create table if not exists legacy_profile_migration_cutover (
  singleton boolean primary key default true check (singleton),
  applied_at timestamptz not null default now()
);

insert into legacy_profile_migration_cutover(singleton) values(true)
on conflict(singleton) do nothing;
