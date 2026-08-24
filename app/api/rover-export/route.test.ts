import { describe, expect, it, vi } from 'vitest';
import { createRoverExportHandler } from './route';
import type { RoverPageLoader } from '@/lib/rover-export';

const profileUrl = 'https://www.rover.com/members/indre-p-fox-river-grove-dog-sitter/';

describe('Rover export route', () => {
  it('rejects unauthenticated requests before constructing a browser provider', async () => {
    const createPageLoader = vi.fn();
    const handler = createRoverExportHandler({
      getUserId: vi.fn().mockResolvedValue(null),
      createPageLoader,
      now: () => new Date()
    });
    const response = await handler(new Request('http://localhost/api/rover-export', { method: 'POST', body: '{}' }));
    expect(response.status).toBe(401);
    expect(createPageLoader).not.toHaveBeenCalled();
  });

  it('requires ownership attestation and validates the allowlisted Rover URL before provider work', async () => {
    const createPageLoader = vi.fn();
    const handler = createRoverExportHandler({
      getUserId: vi.fn().mockResolvedValue('owner-1'),
      createPageLoader,
      now: () => new Date()
    });
    const unattested = await handler(new Request('http://localhost/api/rover-export', {
      method: 'POST',
      body: JSON.stringify({ profileUrl })
    }));
    expect(unattested.status).toBe(403);

    const unsafe = await handler(new Request('http://localhost/api/rover-export', {
      method: 'POST',
      body: JSON.stringify({ profileUrl: 'https://example.com/profile', attestationAccepted: true })
    }));
    expect(unsafe.status).toBe(400);
    expect(createPageLoader).not.toHaveBeenCalled();
  });

  it('returns a stable schema error without leaking raw upstream details', async () => {
    const loader: RoverPageLoader = { load: vi.fn().mockResolvedValue('<main>changed</main>') };
    const handler = createRoverExportHandler({
      getUserId: vi.fn().mockResolvedValue('owner-1'),
      createPageLoader: () => loader,
      now: () => new Date('2026-08-24T12:00:00Z')
    });
    const response = await handler(new Request('http://localhost/api/rover-export', {
      method: 'POST',
      body: JSON.stringify({ profileUrl, attestationAccepted: true })
    }));
    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({
      error: { code: 'UPSTREAM_SCHEMA_CHANGED', message: 'Rover changed its profile data format.' }
    });
  });
});
