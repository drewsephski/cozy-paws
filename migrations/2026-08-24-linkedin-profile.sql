begin;

alter table site
  add column if not exists linkedin_url text;

commit;
