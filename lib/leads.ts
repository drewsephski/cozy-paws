import { headers } from 'next/headers';
import { profiles } from './profiles';
import { getRedis } from './redis';
import { createLeadIntake } from './lead-intake';
import { sendNewLeadNotification } from './email';
import { persistPostgresLeadWithConversation } from './postgres-lead-intake';
import { createHash } from 'node:crypto';

const maySubmit = async (key: string) =>
  Boolean(await getRedis().set(`lead-rate:${key}`, Date.now(), { nx: true, ex: 30 }));

export const leadIntake = createLeadIntake(profiles, maySubmit, sendNewLeadNotification, persistPostgresLeadWithConversation);

async function requestAddress() {
  const requestHeaders = await headers();
  const forwarded = requestHeaders.get('x-forwarded-for')?.split(',')[0]?.trim();
  return requestHeaders.get('x-vercel-ip') || requestHeaders.get('x-real-ip') || forwarded || 'unknown';
}

export async function leadRateLimitKey(subdomain: string) {
  return `${subdomain}:${await requestAddress()}`;
}

export async function maySendConversationMessage(publicToken: string) {
  const tokenKey = createHash('sha256').update(publicToken).digest('hex').slice(0, 24);
  return Boolean(await getRedis().set(`conversation-rate:${tokenKey}:${await requestAddress()}`, Date.now(), { nx: true, ex: 3 }));
}
