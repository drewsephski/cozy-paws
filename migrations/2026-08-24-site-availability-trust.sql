alter table site add column if not exists availability_status text not null default 'ACCEPTING';
alter table site add column if not exists availability_until date;
alter table site add column if not exists years_experience integer;
alter table site add column if not exists care_capabilities text[] not null default '{}';
alter table site add column if not exists meet_and_greet_expectations text;
alter table site add column if not exists cancellation_expectations text;
alter table site add column if not exists self_reported_credentials text[] not null default '{}';

do $$ begin
  if not exists(select 1 from pg_constraint where conname='site_availability_status_check') then
    alter table site add constraint site_availability_status_check
      check (availability_status in ('ACCEPTING','LIMITED','UNAVAILABLE'));
  end if;
  if not exists(select 1 from pg_constraint where conname='site_years_experience_check') then
    alter table site add constraint site_years_experience_check
      check (years_experience is null or years_experience between 0 and 80);
  end if;
end $$;
