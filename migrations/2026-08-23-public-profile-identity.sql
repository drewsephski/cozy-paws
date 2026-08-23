alter table site add column if not exists sitter_name text;
alter table site add column if not exists business_name text;

update site s
set business_name = b.name
from business b
where s.business_id = b.id
  and s.business_name is null
  and s.sitter_name is null;
