alter table payment_request
  add column if not exists stripe_checkout_retry_generation integer not null default 0;

do $$ begin
  if not exists (
    select 1 from pg_constraint where conname = 'payment_request_stripe_checkout_retry_generation_check'
  ) then
    alter table payment_request
      add constraint payment_request_stripe_checkout_retry_generation_check
      check (stripe_checkout_retry_generation >= 0);
  end if;
end $$;
