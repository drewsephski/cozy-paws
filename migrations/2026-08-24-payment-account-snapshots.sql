-- Guarded finalization. First apply the preparation migration and populate
-- payment_account_snapshot_backfill for every historical payment using verified
-- provider evidence. Never infer an old payment's account from Business alone.
-- Then verify the database identity and isolation and run
-- `set sitterfolio.confirm_payment_account_snapshot_migration = 'yes';` in this session.
do $$ begin
  if current_setting('sitterfolio.confirm_payment_account_snapshot_migration', true) is distinct from 'yes' then
    raise exception 'Payment account snapshot migration blocked: verify database identity and set sitterfolio.confirm_payment_account_snapshot_migration=yes';
  end if;
end $$;

update payment_request pr
set stripe_account_id = verified.stripe_account_id
from payment_account_snapshot_backfill verified
where verified.payment_aggregate='payment_request'
  and verified.payment_id=pr.id
  and pr.stripe_account_id is null;

update public_payment pp
set stripe_account_id = verified.stripe_account_id
from payment_account_snapshot_backfill verified
where verified.payment_aggregate='public_payment'
  and verified.payment_id=pp.id
  and pp.stripe_account_id is null;

do $$ begin
  if exists(select 1 from payment_request where stripe_account_id is null)
     or exists(select 1 from public_payment where stripe_account_id is null) then
    raise exception 'Payment account snapshot backfill incomplete; verify and map every historical payment before finalizing';
  end if;
end $$;

alter table payment_request alter column stripe_account_id set not null;
alter table public_payment alter column stripe_account_id set not null;

create index if not exists payment_request_stripe_account_idx on payment_request(stripe_account_id);
create index if not exists public_payment_stripe_account_idx on public_payment(stripe_account_id);

create or replace function sitterfolio_preserve_payment_account_id()
returns trigger language plpgsql as $$
begin
  if new.stripe_account_id is distinct from old.stripe_account_id then
    raise exception 'Payment provider account snapshots are immutable';
  end if;
  return new;
end $$;

do $$ begin
  if not exists(select 1 from pg_trigger where tgname='payment_request_preserve_account_snapshot' and tgrelid='payment_request'::regclass) then
    create trigger payment_request_preserve_account_snapshot
      before update of stripe_account_id on payment_request
      for each row execute function sitterfolio_preserve_payment_account_id();
  end if;
  if not exists(select 1 from pg_trigger where tgname='public_payment_preserve_account_snapshot' and tgrelid='public_payment'::regclass) then
    create trigger public_payment_preserve_account_snapshot
      before update of stripe_account_id on public_payment
      for each row execute function sitterfolio_preserve_payment_account_id();
  end if;
end $$;
