import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createMemoryRoverExportAdmission, createRedisRoverExportAdmission } from './rover-export-admission';

const { getRedisMock } = vi.hoisted(() => ({ getRedisMock: vi.fn() }));
vi.mock('./redis', () => ({ getRedis: getRedisMock }));

const profileUrl = 'https://www.rover.com/members/indre-p-fox-river-grove-dog-sitter/';

describe('Rover export admission', () => {
  beforeEach(() => getRedisMock.mockReset());

  it('limits active exports independently by user, profile, and global capacity', async () => {
    const admission = createMemoryRoverExportAdmission(() => 1_000);
    const first = await admission.acquire('user-1', profileUrl);

    await expect(admission.acquire('user-1', profileUrl)).rejects.toMatchObject({
      code: 'EXPORT_ACTIVE',
      retryAfterSeconds: 90
    });
    await expect(admission.acquire('user-1', 'https://www.rover.com/members/another-profile/')).rejects.toMatchObject({
      code: 'EXPORT_ACTIVE'
    });
    await expect(admission.acquire('user-2', profileUrl)).rejects.toMatchObject({
      code: 'EXPORT_ACTIVE'
    });

    const second = await admission.acquire('user-2', 'https://www.rover.com/members/another-profile/');
    await expect(admission.acquire('user-3', 'https://www.rover.com/members/third-profile/')).rejects.toMatchObject({
      code: 'EXPORT_ACTIVE'
    });

    await first.release();
    await second.release();
    await expect(admission.acquire('user-1', profileUrl)).resolves.toMatchObject({
      release: expect.any(Function)
    });
  });

  it('limits each authenticated user and profile to three attempts per hour', async () => {
    const admission = createMemoryRoverExportAdmission(() => 1_000);

    for (let attempt = 0; attempt < 3; attempt += 1) {
      const lease = await admission.acquire('user-1', profileUrl);
      await lease.release();
    }

    await expect(admission.acquire('user-1', profileUrl)).rejects.toMatchObject({
      code: 'RATE_LIMITED',
      retryAfterSeconds: 3_600
    });
  });

  it('limits each authenticated user to ten attempts per day across profiles', async () => {
    let now = 1_000;
    const admission = createMemoryRoverExportAdmission(() => now);

    for (let attempt = 0; attempt < 10; attempt += 1) {
      now = 1_000 + Math.floor(attempt / 3) * 3_600_000;
      const lease = await admission.acquire('user-1', `https://www.rover.com/members/profile-${attempt}/`);
      await lease.release();
    }

    await expect(admission.acquire('user-1', 'https://www.rover.com/members/profile-11/')).rejects.toMatchObject({
      code: 'RATE_LIMITED',
      retryAfterSeconds: 86_400
    });
  });

  it('fails closed before provider work when Redis admission is unavailable', async () => {
    getRedisMock.mockReturnValue({ eval: vi.fn().mockRejectedValue(new Error('private Redis detail')) });
    const admission = createRedisRoverExportAdmission();

    await expect(admission.acquire('user-1', profileUrl)).rejects.toMatchObject({
      code: 'ADMISSION_UNAVAILABLE',
      retryAfterSeconds: 60
    });
  });

  it('uses hashed Redis keys and releases only the acquired lease', async () => {
    const evalMock = vi.fn()
      .mockResolvedValueOnce(['ok', 0])
      .mockResolvedValueOnce(1);
    getRedisMock.mockReturnValue({ eval: evalMock });
    const admission = createRedisRoverExportAdmission();

    const lease = await admission.acquire('private-user-id', profileUrl);
    const acquireKeys = evalMock.mock.calls[0][1] as string[];
    expect(acquireKeys).toHaveLength(5);
    expect(acquireKeys.join(':')).not.toContain('private-user-id');
    expect(acquireKeys.join(':')).not.toContain('indre-p-fox-river-grove-dog-sitter');

    await lease.release();
    expect(evalMock).toHaveBeenCalledTimes(2);
    expect(evalMock.mock.calls[1][1]).toEqual(acquireKeys.slice(2));
  });
});
