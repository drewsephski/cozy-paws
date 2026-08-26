create table if not exists business_commercial_state (
  business_id uuid primary key references business(id) on delete restrict,
  trial_started_at timestamptz not null,
  trial_ends_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint business_commercial_trial_dates_chk check (trial_ends_at = trial_started_at + interval '30 days')
);

insert into business_commercial_state(business_id,trial_started_at,trial_ends_at)
select s.business_id,min(s.onboarding_completed_at),min(s.onboarding_completed_at)+interval '30 days'
from site s
where s.onboarding_completed_at is not null
group by s.business_id
on conflict(business_id) do nothing;
