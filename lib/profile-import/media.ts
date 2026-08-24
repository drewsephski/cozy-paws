import { createHash } from 'node:crypto';
import { BlobNotFoundError, del, head, put } from '@vercel/blob';
import { normalizePortrait } from './portrait';

export type StagedPortrait = { url: string; pathname: string; created: boolean; cleanup(): Promise<void> };
export type ProfileMedia = { stageOwnedPortrait(subdomain: string, bytes: Uint8Array, mediaType: string): Promise<StagedPortrait> };

export function createVercelProfileMedia(): ProfileMedia {
  return {
    async stageOwnedPortrait(subdomain, bytes, mediaType) {
      const normalized = await normalizePortrait(bytes, mediaType);
      const hash = createHash('sha256').update(normalized).digest('hex');
      const pathname = `profiles/${subdomain}/rover/${hash}.webp`;
      try {
        const existing = await head(pathname);
        return { url: existing.url, pathname, created: false, cleanup: async () => {} };
      } catch (error) {
        if (!(error instanceof BlobNotFoundError)) throw error;
      }
      const stored = await put(pathname, Buffer.from(normalized), { access: 'public', contentType: 'image/webp', addRandomSuffix: false, allowOverwrite: true });
      return { url: stored.url, pathname, created: true, cleanup: async () => { await del(pathname); } };
    }
  };
}
