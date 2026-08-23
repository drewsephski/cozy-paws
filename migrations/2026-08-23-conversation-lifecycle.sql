alter table lead add column if not exists submission_token text;

create unique index if not exists lead_site_submission_token_uidx
  on lead(site_id,submission_token)
  where submission_token is not null;

do $$ begin
  if not exists (
    select 1 from pg_constraint where conname = 'lead_submission_token_length_check'
  ) then
    alter table lead add constraint lead_submission_token_length_check
      check (submission_token is null or char_length(submission_token) >= 32);
  end if;
end $$;

alter table lead_conversation add column if not exists closed_at timestamptz;
alter table lead_conversation add column if not exists revoked_at timestamptz;
