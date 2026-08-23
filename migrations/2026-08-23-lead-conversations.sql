create table if not exists lead_conversation (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null unique references lead(id) on delete restrict,
  business_id uuid not null references business(id) on delete restrict,
  public_token text not null unique check (char_length(public_token) >= 32),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint lead_conversation_lead_business_fk foreign key (lead_id,business_id) references lead(id,business_id) on delete restrict
);
create index if not exists lead_conversation_business_idx on lead_conversation(business_id, updated_at desc);

create table if not exists lead_conversation_message (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references lead_conversation(id) on delete restrict,
  sender text not null check (sender in ('CUSTOMER','SITTER')),
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now()
);
create index if not exists lead_conversation_message_order_idx on lead_conversation_message(conversation_id, created_at, id);
