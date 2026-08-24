import { createHash, randomUUID } from 'node:crypto';
import { getRedis } from '../redis';
import { RoverImportError } from './types';

export type AdmissionToken = { key: string; token: string };
export type ImportAdmission = {
  acquirePrepare(ownerId: string, subdomain: string, attemptId: string): Promise<AdmissionToken>;
  releasePrepare(token: AdmissionToken): Promise<void>;
  acquireApply(ownerId: string, subdomain: string): Promise<AdmissionToken>;
  releaseApply(token: AdmissionToken): Promise<void>;
  readApplyResult(ownerId: string, subdomain: string, applyId: string): Promise<{ fingerprint: string; profileRevision: number } | null>;
  storeApplyResult(ownerId: string, subdomain: string, applyId: string, result: { fingerprint: string; profileRevision: number }): Promise<void>;
};

const hashOwner = (ownerId: string) => createHash('sha256').update(ownerId).digest('hex').slice(0, 32);

const ACQUIRE_PREPARE = `
if redis.call('EXISTS', KEYS[3]) == 1 then return 'used' end
if redis.call('EXISTS', KEYS[4]) == 1 then return 'active' end
local hour=redis.call('INCR',KEYS[1]); if hour==1 then redis.call('EXPIRE',KEYS[1],3600) end
local day=redis.call('INCR',KEYS[2]); if day==1 then redis.call('EXPIRE',KEYS[2],86400) end
if hour>3 or day>10 then return 'rate' end
redis.call('SET',KEYS[3],'1','EX',600)
redis.call('SET',KEYS[4],ARGV[1],'EX',90,'NX')
return 'ok'`;
const RELEASE = `if redis.call('GET',KEYS[1])==ARGV[1] then return redis.call('DEL',KEYS[1]) end return 0`;

export function createRedisImportAdmission(): ImportAdmission {
  return {
    async acquirePrepare(ownerId, subdomain, attemptId) {
      const owner = hashOwner(ownerId);
      const token = randomUUID();
      const key = `rover-import:active:${owner}:${subdomain}`;
      try {
        const result = await getRedis().eval(ACQUIRE_PREPARE, [`rover-import:hour:${owner}`, `rover-import:day:${owner}`, `rover-import:attempt:${owner}:${attemptId}`, key], [token]);
        if (result === 'used') throw new RoverImportError('ATTEMPT_ALREADY_USED');
        if (result === 'active') throw new RoverImportError('ATTEMPT_ACTIVE');
        if (result === 'rate') throw new RoverImportError('RATE_LIMITED');
        if (result !== 'ok') throw new RoverImportError('RATE_LIMITED');
        return { key, token };
      } catch (error) {
        if (error instanceof RoverImportError) throw error;
        throw new RoverImportError('RATE_LIMITED');
      }
    },
    async releasePrepare(value) { try { await getRedis().eval(RELEASE, [value.key], [value.token]); } catch { /* fail closed on the next lock acquisition */ } },
    async acquireApply(ownerId, subdomain) {
      const key = `rover-import:apply:${hashOwner(ownerId)}:${subdomain}`;
      const token = randomUUID();
      try {
        const acquired = await getRedis().set(key, token, { nx: true, ex: 30 });
        if (!acquired) throw new RoverImportError('ATTEMPT_ACTIVE');
        return { key, token };
      } catch (error) {
        if (error instanceof RoverImportError) throw error;
        throw new RoverImportError('APPLY_FAILED');
      }
    },
    async releaseApply(value) { try { await getRedis().eval(RELEASE, [value.key], [value.token]); } catch { /* bounded TTL */ } },
    async readApplyResult(ownerId, subdomain, applyId) {
      try { return await getRedis().get<{ fingerprint: string; profileRevision: number }>(`rover-import:apply-result:${hashOwner(ownerId)}:${subdomain}:${applyId}`); }
      catch { throw new RoverImportError('APPLY_FAILED'); }
    },
    async storeApplyResult(ownerId, subdomain, applyId, result) {
      try { await getRedis().set(`rover-import:apply-result:${hashOwner(ownerId)}:${subdomain}:${applyId}`, result, { ex: 900 }); }
      catch { throw new RoverImportError('APPLY_FAILED'); }
    }
  };
}

export function createMemoryImportAdmission(now = Date.now): ImportAdmission {
  const used = new Map<string, number>();
  const active = new Map<string, AdmissionToken & { expires: number }>();
  const counts = new Map<string, number>();
  const results = new Map<string, { fingerprint: string; profileRevision: number; expires: number }>();
  const acquire = async (ownerId: string, subdomain: string, attemptId: string) => {
    const current = now();
    for (const [key, expiry] of used) if (expiry <= current) used.delete(key);
    for (const [key, value] of active) if (value.expires <= current) active.delete(key);
    const owner = hashOwner(ownerId);
    const attemptKey = `${owner}:${attemptId}`;
    const lockKey = `${owner}:${subdomain}`;
    if (used.has(attemptKey)) throw new RoverImportError('ATTEMPT_ALREADY_USED');
    if (active.has(lockKey)) throw new RoverImportError('ATTEMPT_ACTIVE');
    const hour = `${owner}:${Math.floor(current / 3_600_000)}`;
    const day = `${owner}:day:${Math.floor(current / 86_400_000)}`;
    const hourCount = (counts.get(hour) ?? 0) + 1;
    const dayCount = (counts.get(day) ?? 0) + 1;
    if (hourCount > 3 || dayCount > 10) throw new RoverImportError('RATE_LIMITED');
    counts.set(hour, hourCount);
    counts.set(day, dayCount);
    used.set(attemptKey, current + 600_000);
    const value = { key: lockKey, token: randomUUID(), expires: current + 90_000 };
    active.set(lockKey, value);
    return { key: value.key, token: value.token };
  };
  const release = async (value: AdmissionToken) => { if (active.get(value.key)?.token === value.token) active.delete(value.key); };
  return {
    acquirePrepare: acquire,
    releasePrepare: release,
    async acquireApply(ownerId, subdomain) {
      const key = `apply:${hashOwner(ownerId)}:${subdomain}`;
      if (active.has(key)) throw new RoverImportError('ATTEMPT_ACTIVE');
      const value = { key, token: randomUUID(), expires: now() + 30_000 };
      active.set(key, value);
      return { key, token: value.token };
    },
    releaseApply: release,
    async readApplyResult(ownerId, subdomain, applyId) {
      const key = `${hashOwner(ownerId)}:${subdomain}:${applyId}`;
      const result = results.get(key);
      if (!result) return null;
      if (result.expires <= now()) { results.delete(key); return null; }
      return { fingerprint: result.fingerprint, profileRevision: result.profileRevision };
    },
    async storeApplyResult(ownerId, subdomain, applyId, result) { results.set(`${hashOwner(ownerId)}:${subdomain}:${applyId}`, { ...result, expires: now() + 900_000 }); }
  };
}
