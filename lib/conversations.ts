import { randomBytes } from 'node:crypto';
import { query, transaction } from './db';

export type ConversationMessage = {
  id: string;
  sender: 'CUSTOMER' | 'SITTER';
  body: string;
  createdAt: number;
};

export type LeadConversation = {
  leadId: string;
  customerName: string;
  customerEmail: string;
  sitterName: string;
  businessName: string;
  subdomain: string;
  serviceRequested: string;
  requestedStartDate: string | null;
  requestedEndDate: string | null;
  messages: ConversationMessage[];
};

type ConversationRow = {
  lead_id: string;
  customer_name: string;
  customer_email: string;
  care_details: string;
  service_requested: string;
  requested_start_date: string | null;
  requested_end_date: string | null;
  created_at: Date;
  sitter_name: string | null;
  business_name: string | null;
  subdomain: string;
};

type MessageRow = { id: string; sender: ConversationMessage['sender']; body: string; created_at: Date };

const messageBody = (value: unknown) => {
  const body = typeof value === 'string' ? value.trim() : '';
  if (!body) throw new Error('Write a message before sending.');
  if (body.length > 2000) throw new Error('Keep your message under 2,000 characters.');
  return body;
};

const mapMessage = (row: MessageRow): ConversationMessage => ({
  id: row.id,
  sender: row.sender,
  body: row.body,
  createdAt: row.created_at.getTime()
});

export async function createLeadConversation(leadId: string) {
  const token = randomBytes(24).toString('base64url');
  const result = await query<{ public_token: string }>(
    `insert into lead_conversation(lead_id,business_id,public_token)
     select l.id,l.business_id,$2 from lead l where l.id=$1
     on conflict(lead_id) do update set updated_at=lead_conversation.updated_at
     returning public_token`,
    [leadId, token]
  );
  if (!result.rows[0]) throw new Error('The conversation could not be started.');
  return result.rows[0].public_token;
}

async function readMessages(conversationIdQuery: string, value: string) {
  const result = await query<MessageRow>(
    `select m.id,m.sender,m.body,m.created_at
     from lead_conversation_message m
     join lead_conversation c on c.id=m.conversation_id
     where ${conversationIdQuery}=$1
     order by m.created_at,m.id`,
    [value]
  );
  return result.rows.map(mapMessage);
}

function assembleConversation(row: ConversationRow, messages: ConversationMessage[]): LeadConversation {
  const initialBody = row.care_details || row.service_requested || 'Availability request';
  return {
    leadId: row.lead_id,
    customerName: row.customer_name,
    customerEmail: row.customer_email,
    sitterName: row.sitter_name || row.business_name || row.subdomain,
    businessName: row.business_name || row.sitter_name || row.subdomain,
    subdomain: row.subdomain,
    serviceRequested: row.service_requested,
    requestedStartDate: row.requested_start_date,
    requestedEndDate: row.requested_end_date,
    messages: [{ id: `lead-${row.lead_id}`, sender: 'CUSTOMER', body: initialBody, createdAt: row.created_at.getTime() }, ...messages]
  };
}

export async function getCustomerConversation(publicToken: string) {
  const result = await query<ConversationRow>(
    `select l.id lead_id,l.customer_name,l.customer_email,l.care_details,l.service_requested,l.requested_start_date,l.requested_end_date,l.created_at,s.sitter_name,s.business_name,s.subdomain
     from lead_conversation c
     join lead l on l.id=c.lead_id and l.business_id=c.business_id
     join site s on s.id=l.site_id
     where c.public_token=$1 and c.closed_at is null and c.revoked_at is null and s.deleted_at is null`,
    [publicToken]
  );
  const row = result.rows[0];
  if (!row) return null;
  return assembleConversation(row, await readMessages('c.public_token', publicToken));
}

export async function getOwnerConversation(ownerId: string, leadId: string) {
  const result = await query<ConversationRow>(
    `select l.id lead_id,l.customer_name,l.customer_email,l.care_details,l.service_requested,l.requested_start_date,l.requested_end_date,l.created_at,s.sitter_name,s.business_name,s.subdomain
     from lead_conversation c
     join lead l on l.id=c.lead_id and l.business_id=c.business_id
     join site s on s.id=l.site_id
     join business b on b.id=l.business_id
     where l.id=$1 and b.owner_user_id=$2 and s.deleted_at is null`,
    [leadId, ownerId]
  );
  const row = result.rows[0];
  if (!row) return null;
  return assembleConversation(row, await readMessages('c.lead_id', leadId));
}

export async function getOwnerConversationMessages(ownerId: string, limit = 500) {
  const result = await query<({ lead_id: string } & Partial<MessageRow>)>(
    `with recent as (
       select c.lead_id,m.id,m.sender,m.body,m.created_at,c.created_at conversation_created_at
       from lead_conversation c
       left join lead_conversation_message m on m.conversation_id=c.id
       join business b on b.id=c.business_id
       where b.owner_user_id=$1
       order by coalesce(m.created_at,c.created_at) desc,m.id desc
       limit $2
     )
     select lead_id,id,sender,body,created_at from recent
     order by conversation_created_at,created_at,id`,
    [ownerId, limit]
  );
  return result.rows.reduce<Record<string, ConversationMessage[]>>((grouped, row) => {
    const messages = (grouped[row.lead_id] ||= []);
    if (row.id && row.sender && row.body && row.created_at) messages.push(mapMessage(row as MessageRow));
    return grouped;
  }, {});
}

export async function sendCustomerConversationMessage(publicToken: string, input: unknown) {
  const body = messageBody(input);
  return transaction(async (client) => {
    const conversation = await client.query<{ id: string; lead_id: string; customer_name: string; business_name: string; sitter_email: string | null }>(
      `select c.id,c.lead_id,l.customer_name,coalesce(s.business_name,s.sitter_name,s.subdomain) business_name,s.email sitter_email
       from lead_conversation c join lead l on l.id=c.lead_id join site s on s.id=l.site_id
       where c.public_token=$1 and c.closed_at is null and c.revoked_at is null and s.deleted_at is null
       for update of l`,
      [publicToken]
    );
    const row = conversation.rows[0];
    if (!row) throw new Error('This conversation link is no longer available.');
    await client.query(`select id from lead_conversation where id=$1 and closed_at is null and revoked_at is null for update`, [row.id]);
    const inserted = await client.query<{ id: string; created_at: Date }>(
      `insert into lead_conversation_message(conversation_id,sender,body) values($1,'CUSTOMER',$2) returning id,created_at`,
      [row.id, body]
    );
    await client.query(`update lead set read_at=null,updated_at=now() where id=$1`, [row.lead_id]);
    await client.query(`update lead_conversation set updated_at=now() where id=$1`, [row.id]);
    return { id: inserted.rows[0].id, body, leadId: row.lead_id, customerName: row.customer_name, businessName: row.business_name, sitterEmail: row.sitter_email };
  });
}

export async function sendSitterConversationMessage(ownerId: string, leadId: string, input: unknown) {
  const body = messageBody(input);
  return transaction(async (client) => {
    const conversation = await client.query<{ id: string; public_token: string; customer_email: string; business_name: string; sitter_email: string | null }>(
      `select c.id,c.public_token,l.customer_email,coalesce(s.business_name,s.sitter_name,s.subdomain) business_name,s.email sitter_email
       from lead_conversation c
       join lead l on l.id=c.lead_id and l.business_id=c.business_id
       join site s on s.id=l.site_id
       join business b on b.id=c.business_id
       where l.id=$1 and b.owner_user_id=$2 and c.closed_at is null and c.revoked_at is null and s.deleted_at is null
       for update of l`,
      [leadId, ownerId]
    );
    const row = conversation.rows[0];
    if (!row) throw new Error('This conversation could not be found.');
    await client.query(`select id from lead_conversation where id=$1 and closed_at is null and revoked_at is null for update`, [row.id]);
    const inserted = await client.query<{ id: string }>(
      `insert into lead_conversation_message(conversation_id,sender,body) values($1,'SITTER',$2) returning id`,
      [row.id, body]
    );
    await client.query(`update lead_conversation set updated_at=now() where id=$1`, [row.id]);
    return { id: inserted.rows[0].id, body, publicToken: row.public_token, customerEmail: row.customer_email, businessName: row.business_name, sitterEmail: row.sitter_email };
  });
}
