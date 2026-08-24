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
    const imports = createRoverProfileImports({ profiles: { getOwned: vi.fn().mockResolvedValue(null) }, admission: createMemoryImportAdmission(), capture, vision, writer: createMemoryReviewedProfileWriter([site]), media: { stageOwnedPortrait: vi.fn() } });
    await expect(imports.prepareOwnedReview({ ownerId: 'owner-2', subdomain: 'happy-tails', roverUrl: 'https://www.rover.com/members/jamie/', attestationAccepted: true, attemptId: '00000000-0000-4000-8000-000000000001', signal: new AbortController().signal })).rejects.toMatchObject({ code: 'SITE_NOT_OWNED' });
    expect(capture.capture).not.toHaveBeenCalled();
  });

  it('prepares then applies only after review and cleans a new Blob on database failure', async () => {
    const cleanup = vi.fn();
    const writer = { applyOwned: vi.fn().mockRejectedValue(new Error('db')) };
    const imports = createRoverProfileImports({
      profiles: { getOwned: vi.fn().mockResolvedValue(site) }, admission: createMemoryImportAdmission(),
      capture: { capture: vi.fn().mockResolvedValue({ bytes: await import('sharp').then(({ default: sharp }) => sharp({ create: { width: 500, height: 500, channels: 3, background: 'white' } }).jpeg().toBuffer()), mediaType: 'image/jpeg', width: 500, height: 500 }) },
      vision: { extract: vi.fn().mockResolvedValue({ reviewed: { about: 'Imported' }, confidence: { about: 'high' } }) },
      writer, media: { stageOwnedPortrait: vi.fn().mockResolvedValue({ url: 'https://blob/profile.webp', pathname: 'p', created: true, cleanup }) }
    });
    const draft = await imports.prepareOwnedReview({ ownerId: 'owner-1', subdomain: 'happy-tails', roverUrl: 'https://www.rover.com/members/jamie/?x=1', attestationAccepted: true, attemptId: '00000000-0000-4000-8000-000000000001', signal: new AbortController().signal });
    expect(draft).toMatchObject({ canonicalRoverUrl: 'https://www.rover.com/members/jamie/', expectedProfileRevision: 2, reviewed: { about: 'Imported' } });
    await expect(imports.applyOwnedReview({ ownerId: 'owner-1', subdomain: 'happy-tails', applyId: '00000000-0000-4000-8000-000000000002', expectedProfileRevision: 2, reviewed: { about: 'Imported' }, portrait: { bytes: new Uint8Array([1]), mediaType: 'image/webp' } })).rejects.toMatchObject({ code: 'APPLY_FAILED' });
    expect(cleanup).toHaveBeenCalledOnce();
  });

  it('propagates cancellation to capture and releases the active prepare', async () => {
    const capture = vi.fn((_: string, signal: AbortSignal) => new Promise<never>((_, reject) => {
      const cancel = () => reject(new RoverImportError('CAPTURE_FAILED'));
      if (signal.aborted) cancel(); else signal.addEventListener('abort', cancel, { once: true });
    }));
    const admission = createMemoryImportAdmission();
    const imports = createRoverProfileImports({
      profiles: { getOwned: vi.fn().mockResolvedValue(site) }, admission, capture: { capture },
      vision: { extract: vi.fn() }, writer: createMemoryReviewedProfileWriter([site]), media: { stageOwnedPortrait: vi.fn() }
    });
    const controller = new AbortController();
    const preparation = imports.prepareOwnedReview({ ownerId: 'owner-1', subdomain: 'happy-tails', roverUrl: 'https://www.rover.com/members/jamie/', attestationAccepted: true, attemptId: '00000000-0000-4000-8000-000000000003', signal: controller.signal });
    await vi.waitFor(() => expect(capture).toHaveBeenCalledOnce());
    controller.abort();
    await expect(preparation).rejects.toMatchObject({ code: 'CAPTURE_FAILED' });
    await expect(admission.acquirePrepare('owner-1', 'happy-tails', '00000000-0000-4000-8000-000000000004')).resolves.toBeTruthy();
  });

  it('never deletes a deterministic Blob that existed before a failed database apply', async () => {
    const cleanup = vi.fn();
    const imports = createRoverProfileImports({
      profiles: { getOwned: vi.fn().mockResolvedValue(site) }, admission: createMemoryImportAdmission(),
      capture: { capture: vi.fn() }, vision: { extract: vi.fn() },
      writer: { applyOwned: vi.fn().mockRejectedValue(new Error('db')) },
      media: { stageOwnedPortrait: vi.fn().mockResolvedValue({ url: 'https://blob/profile.webp', pathname: 'p', created: false, cleanup }) }
    });
    await expect(imports.applyOwnedReview({ ownerId: 'owner-1', subdomain: 'happy-tails', applyId: '00000000-0000-4000-8000-000000000005', expectedProfileRevision: 2, reviewed: { about: 'Imported' }, portrait: { bytes: new Uint8Array([1]), mediaType: 'image/webp' } })).rejects.toMatchObject({ code: 'APPLY_FAILED' });
    expect(cleanup).not.toHaveBeenCalled();
  });
});
