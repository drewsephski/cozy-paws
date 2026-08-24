alter table site add column if not exists about text;
alter table site add column if not exists care_routine text;
alter table site add column if not exists home_environment text;
alter table site add column if not exists pet_preferences text;
alter table site add column if not exists experience_summary text;
alter table site add column if not exists special_care_summary text;
alter table site add column if not exists service_details jsonb not null default '{}'::jsonb;
alter table site add column if not exists profile_revision bigint not null default 0;

do $$ begin
  if not exists(select 1 from pg_constraint where conname='site_about_length_check') then alter table site add constraint site_about_length_check check (about is null or char_length(about)<=3000); end if;
  if not exists(select 1 from pg_constraint where conname='site_care_routine_length_check') then alter table site add constraint site_care_routine_length_check check (care_routine is null or char_length(care_routine)<=1500); end if;
  if not exists(select 1 from pg_constraint where conname='site_home_environment_length_check') then alter table site add constraint site_home_environment_length_check check (home_environment is null or char_length(home_environment)<=1500); end if;
  if not exists(select 1 from pg_constraint where conname='site_pet_preferences_length_check') then alter table site add constraint site_pet_preferences_length_check check (pet_preferences is null or char_length(pet_preferences)<=1500); end if;
  if not exists(select 1 from pg_constraint where conname='site_experience_summary_length_check') then alter table site add constraint site_experience_summary_length_check check (experience_summary is null or char_length(experience_summary)<=1500); end if;
  if not exists(select 1 from pg_constraint where conname='site_special_care_summary_length_check') then alter table site add constraint site_special_care_summary_length_check check (special_care_summary is null or char_length(special_care_summary)<=1500); end if;
  if not exists(select 1 from pg_constraint where conname='site_service_details_object_check') then alter table site add constraint site_service_details_object_check check (jsonb_typeof(service_details)='object'); end if;
  if not exists(select 1 from pg_constraint where conname='site_service_details_size_check') then alter table site add constraint site_service_details_size_check check (octet_length(service_details::text)<=12288); end if;
  if not exists(select 1 from pg_constraint where conname='site_profile_revision_check') then alter table site add constraint site_profile_revision_check check (profile_revision>=0); end if;
end $$;
