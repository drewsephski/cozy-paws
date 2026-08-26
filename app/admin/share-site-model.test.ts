import { describe, expect, it, vi } from 'vitest';
import { copySiteForSharing } from './share-site-model';

describe('copying a Site for sharing', () => {
  it('returns copied immediately and contains a rejected evidence write', async () => {
    const copy = vi.fn().mockResolvedValue(undefined);
    const record = vi.fn().mockRejectedValue(new Error('database unavailable'));
    const recorded = vi.fn();
    const recordFailed = vi.fn();

    await expect(copySiteForSharing(
      { subdomain: 'happy-tails', url: 'https://happy-tails.sitterfolio.com' },
      { copy, record, recorded, recordFailed }
    )).resolves.toBe('copied');

    expect(copy).toHaveBeenCalledWith('https://happy-tails.sitterfolio.com');
    expect(record).toHaveBeenCalledWith('happy-tails');
    await vi.waitFor(() => expect(recordFailed).toHaveBeenCalledWith(expect.any(Error)));
    expect(recorded).not.toHaveBeenCalled();
  });
});
