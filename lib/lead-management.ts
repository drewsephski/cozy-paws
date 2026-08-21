import { transaction } from './db';
import { canTransitionLead, leadEventForStatus, parseLeadStatus, type LeadStatus } from './domain/leads';

export async function transitionOwnedLead(ownerUserId: string, leadId: string, requestedStatus: unknown) {
  const next = parseLeadStatus(requestedStatus);
  if (!next) return false;
  return transaction(async (client) => {
    const result = await client.query<{ status: LeadStatus }>(`select l.status from lead l join site s on s.id=l.site_id join business b on b.id=s.business_id where l.id=$1 and b.owner_user_id=$2 for update of l`, [leadId, ownerUserId]);
    const current = result.rows[0]?.status;
    if (!current || !canTransitionLead(current, next)) return false;
    await client.query(`update lead set status=$2,updated_at=now() where id=$1`, [leadId, next]);
    const event = leadEventForStatus(next);
    if (event) await client.query(`insert into lead_event(lead_id,kind) values($1,$2)`, [leadId, event]);
    return true;
  });
}
