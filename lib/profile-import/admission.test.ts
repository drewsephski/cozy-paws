import { describe, expect, it, vi } from 'vitest';
import { createMemoryImportAdmission, createRedisImportAdmission } from './admission';

const { getRedisMock } = vi.hoisted(() => ({ getRedisMock: vi.fn() }));
vi.mock('../redis', () => ({ getRedis: getRedisMock }));

describe('Rover import admission', () => {
  it('limits a user, deduplicates attempts, and releases only the owned token', async () => {
    const admission = createMemoryImportAdmission(() => 1_000);
    const first = await admission.acquirePrepare('user-1', 'site', '00000000-0000-4000-8000-000000000001');
    await expect(admission.acquirePrepare('user-1', 'site', '00000000-0000-4000-8000-000000000002')).rejects.toMatchObject({ code: 'ATTEMPT_ACTIVE' });
    await admission.releasePrepare(first);
    await expect(admission.acquirePrepare('user-1', 'site', '00000000-0000-4000-8000-000000000001')).rejects.toMatchObject({ code: 'ATTEMPT_ALREADY_USED' });
    const second = await admission.acquirePrepare('user-1', 'site', '00000000-0000-4000-8000-000000000002');
    await admission.releasePrepare(second);
    const third = await admission.acquirePrepare('user-1', 'other', '00000000-0000-4000-8000-000000000003');
    await admission.releasePrepare(third);
    await expect(admission.acquirePrepare('user-1', 'third', '00000000-0000-4000-8000-000000000004')).rejects.toMatchObject({ code: 'RATE_LIMITED' });
  });

  it('enforces the daily prepare limit across hourly windows', async () => {
    let now = 1_000;
    const admission = createMemoryImportAdmission(() => now);
    for (let index = 0; index < 10; index += 1) {
      now = 1_000 + Math.floor(index / 3) * 3_600_000;
      const token = await admission.acquirePrepare('user-1', `site-${index}`, `attempt-${index}`);
      await admission.releasePrepare(token);
    }
    await expect(admission.acquirePrepare('user-1', 'site-11', 'attempt-11')).rejects.toMatchObject({ code: 'RATE_LIMITED' });
  });

  it('expires replay results after fifteen minutes', async () => {
    let now = 1_000;
    const admission = createMemoryImportAdmission(() => now);
    await admission.storeApplyResult('user-1', 'site', 'apply-1', { fingerprint: 'abc', profileRevision: 2 });
    await expect(admission.readApplyResult('user-1', 'site', 'apply-1')).resolves.toEqual({ fingerprint: 'abc', profileRevision: 2 });
    now += 900_001;
    await expect(admission.readApplyResult('user-1', 'site', 'apply-1')).resolves.toBeNull();
  });

  it('fails closed before provider work when Redis is unavailable', async () => {
    getRedisMock.mockReturnValue({ eval: vi.fn().mockRejectedValue(new Error('private Redis detail')) });
    const admission = createRedisImportAdmission();
    await expect(admission.acquirePrepare('user-1', 'site', 'attempt')).rejects.toMatchObject({ code: 'RATE_LIMITED' });
  });
});
