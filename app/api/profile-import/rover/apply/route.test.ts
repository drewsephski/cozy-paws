import { describe, expect, it, vi } from 'vitest';
import { createApplyHandler } from './route';
import { RoverImportError } from '@/lib/profile-import/types';
import type { RoverProfileImports } from '@/lib/profile-import/rover';

describe('Rover apply route', () => {
  it('rejects unauthenticated requests before configuration work', async () => {
    const createImports = vi.fn();
    const handler = createApplyHandler({ getUserId: vi.fn().mockResolvedValue(null), createImports });
    const response = await handler(new Request('http://localhost/api/profile-import/rover/apply', { method: 'POST' }));
    expect(response.status).toBe(401);
    expect(createImports).not.toHaveBeenCalled();
  });

  it('maps a stale revision to a calm conflict without raw errors', async () => {
    const imports = { applyOwnedReview: vi.fn().mockRejectedValue(new RoverImportError('PROFILE_CHANGED', 'private database detail')) } as unknown as RoverProfileImports;
    const handler = createApplyHandler({ getUserId: vi.fn().mockResolvedValue('owner'), createImports: () => imports });
    const form = new FormData();
    form.set('review', JSON.stringify({ subdomain: 'site', expectedProfileRevision: 1, reviewed: { about: 'Visible' } }));
    const response = await handler(new Request('http://localhost/api/profile-import/rover/apply', { method: 'POST', body: form }));
    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({ error: { code: 'PROFILE_CHANGED', message: expect.not.stringContaining('private') } });
  });

  it('rejects an oversized multipart request before constructing provider adapters', async () => {
    const createImports = vi.fn();
    const handler = createApplyHandler({ getUserId: vi.fn().mockResolvedValue('owner'), createImports });
    const response = await handler(new Request('http://localhost/api/profile-import/rover/apply', { method: 'POST', headers: { 'content-length': String(128 * 1024 + 1) } }));
    expect(response.status).toBe(400);
    expect(createImports).not.toHaveBeenCalled();
  });
});
