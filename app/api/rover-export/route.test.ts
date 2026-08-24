import { describe, expect, it, vi } from 'vitest';
import { createRoverExportHandler } from './route';
import { RoverExportError, type RoverPageLoader } from '@/lib/rover-export';
import { RoverExportAdmissionError } from '@/lib/rover-export-admission';

const profileUrl = 'https://www.rover.com/members/indre-p-fox-river-grove-dog-sitter/';

describe('Rover export route', () => {
  it('rejects unauthenticated requests before constructing a browser provider', async () => {
    const createPageLoader = vi.fn();
    const handler = createRoverExportHandler({
      getUserId: vi.fn().mockResolvedValue(null),
      acquireExport: vi.fn(),
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
      acquireExport: vi.fn().mockResolvedValue({ release: vi.fn() }),
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
      acquireExport: vi.fn().mockResolvedValue({ release: vi.fn() }),
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

  it('returns a stable provider-authentication error without leaking provider details', async () => {
    const loader: RoverPageLoader = {
      load: vi.fn().mockRejectedValue(new RoverExportError('PROVIDER_AUTHENTICATION_FAILED', 'private provider detail'))
    };
    const handler = createRoverExportHandler({
      getUserId: vi.fn().mockResolvedValue('owner-1'),
      acquireExport: vi.fn().mockResolvedValue({ release: vi.fn() }),
      createPageLoader: () => loader,
      now: () => new Date()
    });

    const response = await handler(new Request('http://localhost/api/rover-export', {
      method: 'POST',
      body: JSON.stringify({ profileUrl, attestationAccepted: true })
    }));

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({
      error: { code: 'PROVIDER_AUTHENTICATION_FAILED', message: 'Rover export provider authentication failed.' }
    });
  });

  it('returns a stable provider-capacity error', async () => {
    const loader: RoverPageLoader = { load: vi.fn().mockRejectedValue(new RoverExportError('PROVIDER_RATE_LIMITED', undefined, 17)) };
    const handler = createRoverExportHandler({
      getUserId: vi.fn().mockResolvedValue('owner-1'),
      acquireExport: vi.fn().mockResolvedValue({ release: vi.fn() }),
      createPageLoader: () => loader,
      now: () => new Date()
    });

    const response = await handler(new Request('http://localhost/api/rover-export', {
      method: 'POST',
      body: JSON.stringify({ profileUrl, attestationAccepted: true })
    }));

    expect(response.status).toBe(503);
    expect(response.headers.get('Retry-After')).toBe('17');
    expect(await response.json()).toEqual({
      error: { code: 'PROVIDER_RATE_LIMITED', message: 'Rover export capacity is temporarily unavailable.' }
    });
  });

  it('returns a stable provider-request error', async () => {
    const loader: RoverPageLoader = { load: vi.fn().mockRejectedValue(new RoverExportError('PROVIDER_REQUEST_REJECTED')) };
    const handler = createRoverExportHandler({
      getUserId: vi.fn().mockResolvedValue('owner-1'),
      acquireExport: vi.fn().mockResolvedValue({ release: vi.fn() }),
      createPageLoader: () => loader,
      now: () => new Date()
    });

    const response = await handler(new Request('http://localhost/api/rover-export', {
      method: 'POST',
      body: JSON.stringify({ profileUrl, attestationAccepted: true })
    }));

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({
      error: { code: 'PROVIDER_REQUEST_REJECTED', message: 'Rover export provider rejected its request configuration.' }
    });
  });

  it('returns a stable missing-profile error', async () => {
    const loader: RoverPageLoader = { load: vi.fn().mockRejectedValue(new RoverExportError('PROFILE_NOT_PUBLIC_OR_NOT_FOUND')) };
    const handler = createRoverExportHandler({
      getUserId: vi.fn().mockResolvedValue('owner-1'),
      acquireExport: vi.fn().mockResolvedValue({ release: vi.fn() }),
      createPageLoader: () => loader,
      now: () => new Date()
    });

    const response = await handler(new Request('http://localhost/api/rover-export', {
      method: 'POST',
      body: JSON.stringify({ profileUrl, attestationAccepted: true })
    }));

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({
      error: { code: 'PROFILE_NOT_PUBLIC_OR_NOT_FOUND', message: 'That Rover profile is not public or could not be found.' }
    });
  });

  it('returns Rover rate limiting with a bounded retry time', async () => {
    const loader: RoverPageLoader = { load: vi.fn().mockRejectedValue(new RoverExportError('ROVER_RATE_LIMITED', undefined, 300)) };
    const handler = createRoverExportHandler({
      getUserId: vi.fn().mockResolvedValue('owner-1'),
      acquireExport: vi.fn().mockResolvedValue({ release: vi.fn() }),
      createPageLoader: () => loader,
      now: () => new Date()
    });

    const response = await handler(new Request('http://localhost/api/rover-export', {
      method: 'POST',
      body: JSON.stringify({ profileUrl, attestationAccepted: true })
    }));

    expect(response.status).toBe(429);
    expect(response.headers.get('Retry-After')).toBe('300');
    expect(await response.json()).toEqual({
      error: { code: 'ROVER_RATE_LIMITED', message: 'Rover is temporarily limiting profile requests.' }
    });
  });

  it('rate limits a canonical authenticated export before provider work', async () => {
    const createPageLoader = vi.fn();
    const handler = createRoverExportHandler({
      getUserId: vi.fn().mockResolvedValue('owner-1'),
      acquireExport: vi.fn().mockRejectedValue(new RoverExportAdmissionError('RATE_LIMITED', 3_600)),
      createPageLoader,
      now: () => new Date()
    });

    const response = await handler(new Request('http://localhost/api/rover-export', {
      method: 'POST',
      body: JSON.stringify({ profileUrl, attestationAccepted: true })
    }));

    expect(response.status).toBe(429);
    expect(response.headers.get('Retry-After')).toBe('3600');
    expect(await response.json()).toEqual({
      error: { code: 'RATE_LIMITED', message: 'You have reached the Rover export limit. Try again later.' }
    });
    expect(createPageLoader).not.toHaveBeenCalled();
  });

  it('reports admission infrastructure failure without claiming the user hit quota', async () => {
    const createPageLoader = vi.fn();
    const handler = createRoverExportHandler({
      getUserId: vi.fn().mockResolvedValue('owner-1'),
      acquireExport: vi.fn().mockRejectedValue(new RoverExportAdmissionError('ADMISSION_UNAVAILABLE', 60)),
      createPageLoader,
      now: () => new Date()
    });

    const response = await handler(new Request('http://localhost/api/rover-export', {
      method: 'POST',
      body: JSON.stringify({ profileUrl, attestationAccepted: true })
    }));

    expect(response.status).toBe(503);
    expect(response.headers.get('Retry-After')).toBe('60');
    expect(await response.json()).toEqual({
      error: { code: 'ADMISSION_UNAVAILABLE', message: 'Rover export admission is temporarily unavailable.' }
    });
    expect(createPageLoader).not.toHaveBeenCalled();
  });

  it('releases export admission after provider failure', async () => {
    const release = vi.fn().mockResolvedValue(undefined);
    const handler = createRoverExportHandler({
      getUserId: vi.fn().mockResolvedValue('owner-1'),
      acquireExport: vi.fn().mockResolvedValue({ release }),
      createPageLoader: () => ({ load: vi.fn().mockRejectedValue(new RoverExportError('PROVIDER_TIMEOUT')) }),
      now: () => new Date()
    });

    const response = await handler(new Request('http://localhost/api/rover-export', {
      method: 'POST',
      body: JSON.stringify({ profileUrl, attestationAccepted: true })
    }));

    expect(response.status).toBe(504);
    expect(release).toHaveBeenCalledOnce();
  });
});
