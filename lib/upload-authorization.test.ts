import { describe, expect, it } from 'vitest';
import { createProfileOwnership } from './profile-ownership';
import { createUploadAuthorization } from './upload-authorization';
import { MemoryProfileRepository } from '../tests/support/memory-profile-repository';

describe('upload authorization', () => {
  it('authorizes only an owned profile path and returns the existing image policy', async () => {
    const profiles = createProfileOwnership(new MemoryProfileRepository());
    await profiles.create('owner-1', 'happy-tails', { emoji: 'dog', createdAt: 100 });
    const uploads = createUploadAuthorization(profiles);
    const clientPayload = JSON.stringify({ subdomain: 'HAPPY-TAILS' });

    await expect(
      uploads.authorize({
        userId: 'owner-1',
        pathname: 'profiles/happy-tails/photo.webp',
        clientPayload
      })
    ).resolves.toEqual({
      allowedContentTypes: ['image/jpeg', 'image/png', 'image/webp'],
      maximumSizeInBytes: 5 * 1024 * 1024,
      addRandomSuffix: true,
      tokenPayload: clientPayload
    });
  });

  it('rejects malformed payloads, wrong owners, and paths outside the profile directory', async () => {
    const profiles = createProfileOwnership(new MemoryProfileRepository());
    await profiles.create('owner-1', 'happy-tails', { emoji: 'dog', createdAt: 100 });
    const uploads = createUploadAuthorization(profiles);

    await expect(
      uploads.authorize({ userId: 'owner-1', pathname: 'profiles/happy-tails/photo.jpg', clientPayload: '{' })
    ).rejects.toThrow('Invalid upload payload');
    await expect(
      uploads.authorize({
        userId: 'owner-1',
        pathname: 'profiles/happy-tails/photo.jpg',
        clientPayload: JSON.stringify({ subdomain: 42 })
      })
    ).rejects.toThrow('Invalid upload payload');
    await expect(
      uploads.authorize({
        userId: 'owner-2',
        pathname: 'profiles/happy-tails/photo.jpg',
        clientPayload: JSON.stringify({ subdomain: 'happy-tails' })
      })
    ).rejects.toThrow('Invalid upload request');
    await expect(
      uploads.authorize({
        userId: 'owner-1',
        pathname: 'profiles/other-site/photo.jpg',
        clientPayload: JSON.stringify({ subdomain: 'happy-tails' })
      })
    ).rejects.toThrow('Invalid upload request');
    await expect(
      uploads.authorize({
        userId: 'owner-1',
        pathname: 'profiles/happy-tails/nested/photo.jpg',
        clientPayload: JSON.stringify({ subdomain: 'happy-tails' })
      })
    ).rejects.toThrow('Invalid upload request');
  });
});
