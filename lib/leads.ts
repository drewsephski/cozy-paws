import { headers } from 'next/headers';
import { profiles } from './profiles';
import { redis } from './redis';
import { createLeadIntake } from './lead-intake';

const maySubmit = async (key: string) =>
  Boolean(await redis.set(`lead-rate:${key}`, Date.now(), { nx: true, ex: 30 }));

export const leadIntake = createLeadIntake(profiles, maySubmit);

export async function leadRateLimitKey(subdomain: string) {
  const requestHeaders = await headers();
  const forwarded = requestHeaders.get('x-forwarded-for')?.split(',')[0]?.trim();
  const address = requestHeaders.get('x-vercel-ip') || requestHeaders.get('x-real-ip') || forwarded || 'unknown';
  return `${subdomain}:${address}`;
}
