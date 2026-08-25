import { describe, expect, it, vi } from 'vitest';
import { createPrepareHandler } from './route';
import type { RoverProfileImports } from '@/lib/profile-import/rover';

describe('Rover prepare route', () => {
  it('rejects unauthenticated requests before configuration or providers', async () => {
    const createImports = vi.fn();
    const handler = createPrepareHandler({ getUserId: vi.fn().mockResolvedValue(null), createImports });
    const response = await handler(new Request('http://localhost/api/profile-import/rover/prepare', { method: 'POST', body: '{}' }));
    expect(response.status).toBe(401);
    expect(createImports).not.toHaveBeenCalled();
  });

  it('streams progress and a bounded review event', async () => {
    const imports = { prepareOwnedReview: vi.fn(async (input: { onProgress?: (stage: 'capture_active') => void }) => {
      input.onProgress?.('capture_active');
      return { attemptId: 'id', subdomain: 'site', canonicalRoverUrl: 'https://www.rover.com/members/jamie/', expectedProfileRevision: 0, current: {}, reviewed: { about: 'Visible' }, confidence: { about: 'high' }, evidence: { profile: { about: 'Visible source' }, services: {} }, expiresAt: 1 };
    }) } as unknown as RoverProfileImports;
    const handler = createPrepareHandler({ getUserId: vi.fn().mockResolvedValue('owner'), createImports: () => imports });
    const response = await handler(new Request('http://localhost/api/profile-import/rover/prepare', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ subdomain: 'site', roverUrl: 'https://www.rover.com/members/jamie/', attestationAccepted: true, attemptId: '00000000-0000-4000-8000-000000000001' }) }));
    expect(response.headers.get('cache-control')).toContain('no-store');
    const events = (await response.text()).trim().split('\n').map((line) => JSON.parse(line));
    expect(events.map((event) => event.type)).toEqual(['progress', 'review_ready']);
    expect(events[1]?.draft.evidence).toEqual({ profile: { about: 'Visible source' }, services: {} });
  });

  it('rejects an oversized body before constructing provider adapters', async () => {
    const createImports = vi.fn();
    const handler = createPrepareHandler({ getUserId: vi.fn().mockResolvedValue('owner'), createImports });
    const response = await handler(new Request('http://localhost/api/profile-import/rover/prepare', { method: 'POST', headers: { 'content-length': '8193' }, body: '{}' }));
    expect(response.status).toBe(400);
    expect(createImports).not.toHaveBeenCalled();
  });

  it('passes request cancellation through to the prepare module', async () => {
    let receivedSignal: AbortSignal | undefined;
    const imports = { prepareOwnedReview: vi.fn((input: { signal: AbortSignal }) => {
      receivedSignal = input.signal;
      return new Promise((_, reject) => input.signal.addEventListener('abort', () => reject(new Error('cancelled')), { once: true }));
    }) } as unknown as RoverProfileImports;
    const handler = createPrepareHandler({ getUserId: vi.fn().mockResolvedValue('owner'), createImports: () => imports });
    const controller = new AbortController();
    const request = new Request('http://localhost/api/profile-import/rover/prepare', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ subdomain: 'site' }), signal: controller.signal });
    const response = await handler(request);
    controller.abort();
    await response.text();
    expect(receivedSignal?.aborted).toBe(true);
  });
});
