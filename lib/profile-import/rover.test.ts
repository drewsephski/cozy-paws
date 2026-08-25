import { describe, expect, it, vi } from 'vitest';
import { createRoverProfileImports } from './rover';
import { createMemoryImportAdmission } from './admission';
import { createMemoryReviewedProfileWriter } from './profile-writer';
import { RoverImportError } from './types';

const site = { ownerId: 'owner-1', subdomain: 'happy-tails', emoji: 'dog', createdAt: 1, about: 'Current', profileRevision: 2 };

describe('Rover profile import module', () => {
  it('resolves ownership before providers and prepares a transient review without mutation', async () => {
    const capture = { capture: vi.fn().mockResolvedValue({ bytes: new Uint8Array(2_000), mediaType: 'image/jpeg', width: 500, height: 500 }) };
    const vision = { extract: vi.fn().mockResolvedValue({ reviewed: { about: 'Imported' }, confidence: { about: 'high' } }) };
    const imports = createRoverProfileImports({ profiles: { getOwned: vi.fn().mockResolvedValue(null) }, admission: createMemoryImportAdmission(), capture, vision, writer: createMemoryReviewedProfileWriter([site]) });
    await expect(imports.prepareOwnedReview({ ownerId: 'owner-2', subdomain: 'happy-tails', roverUrl: 'https://www.rover.com/members/jamie/', attestationAccepted: true, attemptId: '00000000-0000-4000-8000-000000000001', signal: new AbortController().signal })).rejects.toMatchObject({ code: 'SITE_NOT_OWNED' });
    expect(capture.capture).not.toHaveBeenCalled();
  });

  it('prepares text-only details and preserves the profile image on apply failure', async () => {
    const writer = { applyOwned: vi.fn().mockRejectedValue(new Error('db')) };
    const imports = createRoverProfileImports({
      profiles: { getOwned: vi.fn().mockResolvedValue(site) }, admission: createMemoryImportAdmission(),
      capture: { capture: vi.fn().mockResolvedValue({ bytes: await import('sharp').then(({ default: sharp }) => sharp({ create: { width: 500, height: 500, channels: 3, background: 'white' } }).jpeg().toBuffer()), mediaType: 'image/jpeg', width: 500, height: 500 }) },
      vision: { extract: vi.fn().mockResolvedValue({ reviewed: { about: 'Imported' }, confidence: { about: 'high' } }) },
      writer
    });
    const draft = await imports.prepareOwnedReview({ ownerId: 'owner-1', subdomain: 'happy-tails', roverUrl: 'https://www.rover.com/members/jamie/?x=1', attestationAccepted: true, attemptId: '00000000-0000-4000-8000-000000000001', signal: new AbortController().signal });
    expect(draft).toMatchObject({ canonicalRoverUrl: 'https://www.rover.com/members/jamie/', expectedProfileRevision: 2, reviewed: { about: 'Imported' } });
    await expect(imports.applyOwnedReview({ ownerId: 'owner-1', subdomain: 'happy-tails', applyId: '00000000-0000-4000-8000-000000000002', expectedProfileRevision: 2, reviewed: { about: 'Imported' } })).rejects.toMatchObject({ code: 'APPLY_FAILED' });
    expect(writer.applyOwned).toHaveBeenCalledWith({ ownerId: 'owner-1', subdomain: 'happy-tails', expectedRevision: 2, reviewed: { about: 'Imported' } });
  });

  it('propagates cancellation to capture and releases the active prepare', async () => {
    const capture = vi.fn((_: string, signal: AbortSignal) => new Promise<never>((_, reject) => {
      const cancel = () => reject(new RoverImportError('CAPTURE_FAILED'));
      if (signal.aborted) cancel(); else signal.addEventListener('abort', cancel, { once: true });
    }));
    const admission = createMemoryImportAdmission();
    const imports = createRoverProfileImports({
      profiles: { getOwned: vi.fn().mockResolvedValue(site) }, admission, capture: { capture },
      vision: { extract: vi.fn() }, writer: createMemoryReviewedProfileWriter([site])
    });
    const controller = new AbortController();
    const preparation = imports.prepareOwnedReview({ ownerId: 'owner-1', subdomain: 'happy-tails', roverUrl: 'https://www.rover.com/members/jamie/', attestationAccepted: true, attemptId: '00000000-0000-4000-8000-000000000003', signal: controller.signal });
    await vi.waitFor(() => expect(capture).toHaveBeenCalledOnce());
    controller.abort();
    await expect(preparation).rejects.toMatchObject({ code: 'CAPTURE_FAILED' });
    await expect(admission.acquirePrepare('owner-1', 'happy-tails', '00000000-0000-4000-8000-000000000004')).resolves.toBeTruthy();
  });
});
