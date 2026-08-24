import { createHash, randomUUID } from 'node:crypto';
import { getRedis } from './redis';

export type RoverExportAdmissionErrorCode = 'ADMISSION_UNAVAILABLE' | 'EXPORT_ACTIVE' | 'RATE_LIMITED';

export class RoverExportAdmissionError extends Error {
  constructor(readonly code: RoverExportAdmissionErrorCode, readonly retryAfterSeconds: number) {
    super(code);
    this.name = 'RoverExportAdmissionError';
  }
}

export type RoverExportLease = { release(): Promise<void> };

export type RoverExportAdmission = {
  acquire(userId: string, profileUrl: string): Promise<RoverExportLease>;
};

const ACQUIRE = `
redis.call('ZREMRANGEBYSCORE', KEYS[5], '-inf', ARGV[2])
if redis.call('EXISTS', KEYS[3]) == 1 then return {'active', redis.call('TTL', KEYS[3])} end
if redis.call('EXISTS', KEYS[4]) == 1 then return {'active', redis.call('TTL', KEYS[4])} end
if redis.call('ZCARD', KEYS[5]) >= tonumber(ARGV[4]) then return {'active', 90} end
local hour=tonumber(redis.call('GET', KEYS[1]) or '0')
local day=tonumber(redis.call('GET', KEYS[2]) or '0')
if hour>=3 then return {'rate', redis.call('TTL', KEYS[1])} end
if day>=10 then return {'rate', redis.call('TTL', KEYS[2])} end
hour=redis.call('INCR', KEYS[1]); if hour==1 then redis.call('EXPIRE', KEYS[1], 3600) end
day=redis.call('INCR', KEYS[2]); if day==1 then redis.call('EXPIRE', KEYS[2], 86400) end
redis.call('SET', KEYS[3], ARGV[1], 'EX', 90)
redis.call('SET', KEYS[4], ARGV[1], 'EX', 90)
redis.call('ZADD', KEYS[5], ARGV[3], ARGV[1])
return {'ok', 0}`;
const RELEASE = `
local released=0
if redis.call('GET', KEYS[1])==ARGV[1] then released=released+redis.call('DEL', KEYS[1]) end
if redis.call('GET', KEYS[2])==ARGV[1] then released=released+redis.call('DEL', KEYS[2]) end
redis.call('ZREM', KEYS[3], ARGV[1])
return released`;

const hash = (value: string) => createHash('sha256').update(value).digest('hex').slice(0, 32);

export function createRedisRoverExportAdmission(): RoverExportAdmission {
  return {
    async acquire(userId, profileUrl) {
      const user = hash(userId);
      const profile = hash(profileUrl);
      const token = randomUUID();
      const activeUserKey = `rover-export:active:user:${user}`;
      const activeProfileKey = `rover-export:active:profile:${profile}`;
      const globalActiveKey = 'rover-export:active:global';
      const current = Date.now();
      try {
        const result = await getRedis().eval(ACQUIRE, [
          `rover-export:hour:${user}:${profile}`,
          `rover-export:day:${user}`,
          activeUserKey,
          activeProfileKey,
          globalActiveKey
        ], [token, current, current + 90_000, 2]);
        const [status, rawRetryAfter] = Array.isArray(result) ? result : [];
        const retryAfterSeconds = Math.max(1, Number(rawRetryAfter) || 60);
        if (status === 'active') throw new RoverExportAdmissionError('EXPORT_ACTIVE', retryAfterSeconds);
        if (status !== 'ok') throw new RoverExportAdmissionError('RATE_LIMITED', retryAfterSeconds);
        return {
          async release() {
            try {
              await getRedis().eval(RELEASE, [activeUserKey, activeProfileKey, globalActiveKey], [token]);
            } catch {
              // The bounded lock expires without relying on release success.
            }
          }
        };
      } catch (error) {
        if (error instanceof RoverExportAdmissionError) throw error;
        throw new RoverExportAdmissionError('ADMISSION_UNAVAILABLE', 60);
      }
    }
  };
}

export function createMemoryRoverExportAdmission(now = Date.now): RoverExportAdmission {
  const activeUsers = new Map<string, { token: string; expiresAt: number }>();
  const activeProfiles = new Map<string, { token: string; expiresAt: number }>();
  const activeTokens = new Map<string, number>();
  const counts = new Map<string, number>();

  return {
    async acquire(userId, profileUrl) {
      const current = now();
      for (const [token, expiresAt] of activeTokens) {
        if (expiresAt <= current) activeTokens.delete(token);
      }
      const activeUser = activeUsers.get(userId);
      const activeProfile = activeProfiles.get(profileUrl);
      if (activeUser && activeUser.expiresAt <= current) activeUsers.delete(userId);
      if (activeProfile && activeProfile.expiresAt <= current) activeProfiles.delete(profileUrl);
      if (activeUsers.has(userId) || activeProfiles.has(profileUrl) || activeTokens.size >= 2) {
        throw new RoverExportAdmissionError('EXPORT_ACTIVE', 90);
      }
      const key = `${userId}:${profileUrl}`;
      const hourKey = `${key}:hour:${Math.floor(current / 3_600_000)}`;
      const dayKey = `${userId}:day:${Math.floor(current / 86_400_000)}`;
      const hourCount = (counts.get(hourKey) ?? 0) + 1;
      const dayCount = (counts.get(dayKey) ?? 0) + 1;
      if (hourCount > 3) throw new RoverExportAdmissionError('RATE_LIMITED', 3_600);
      if (dayCount > 10) throw new RoverExportAdmissionError('RATE_LIMITED', 86_400);
      counts.set(hourKey, hourCount);
      counts.set(dayKey, dayCount);

      const token = randomUUID();
      const active = { token, expiresAt: current + 90_000 };
      activeUsers.set(userId, active);
      activeProfiles.set(profileUrl, active);
      activeTokens.set(token, active.expiresAt);
      return {
        async release() {
          if (activeUsers.get(userId)?.token === token) activeUsers.delete(userId);
          if (activeProfiles.get(profileUrl)?.token === token) activeProfiles.delete(profileUrl);
          activeTokens.delete(token);
        }
      };
    }
  };
}
