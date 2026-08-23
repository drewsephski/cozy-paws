import { randomBytes } from 'node:crypto';
import { transaction, type TransactionRunner } from './db';
import { canTransitionLead, leadEventForStatus, parseLeadStatus, type LeadStatus } from './domain/leads';

export function createLeadTransitioner(runTransaction: TransactionRunner = transaction) {
  return async function transitionOwnedLead(ownerUserId: string, leadId: string, requestedStatus: unknown) {
    const next = parseLeadStatus(requestedStatus);
    if (!next) return false;
    return runTransaction(async (client) => {
    const result = await client.query<{ status: LeadStatus }>(`select l.status from lead l join site s on s.id=l.site_id join business b on b.id=s.business_id where l.id=$1 and b.owner_user_id=$2 for update of l`, [leadId, ownerUserId]);
    const current = result.rows[0]?.status;
    if (!current || !canTransitionLead(current, next)) return false;
    await client.query(`update lead set status=$2,updated_at=now() where id=$1`, [leadId, next]);
    if (next === 'DECLINED' || next === 'SPAM') {
      await client.query(
        `update lead_conversation set closed_at=now(),revoked_at=now(),public_token=$2,updated_at=now() where lead_id=$1`,
        [leadId, randomBytes(24).toString('base64url')]
      );
    } else if (next === 'NEW' && (current === 'DECLINED' || current === 'SPAM')) {
      await client.query(
        `update lead_conversation set closed_at=null,revoked_at=null,public_token=$2,updated_at=now() where lead_id=$1`,
        [leadId, randomBytes(24).toString('base64url')]
      );
    }
    const event = leadEventForStatus(next);
    if (event) await client.query(`insert into lead_event(lead_id,kind) values($1,$2)`, [leadId, event]);
    return true;
    });
  };
}

export const transitionOwnedLead = createLeadTransitioner();
