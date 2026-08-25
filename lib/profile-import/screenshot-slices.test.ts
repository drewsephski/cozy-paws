import { describe, expect, it } from 'vitest';
import sharp from 'sharp';
import { createScreenshotSlices } from './screenshot-slices';

describe('profile screenshot slicing', () => {
  it('creates ordered overlapping slices that cover the visible page', async () => {
    const source = await sharp({ create: { width: 1_440, height: 6_000, channels: 3, background: '#c8a080' } }).jpeg().toBuffer();
    const slices = await createScreenshotSlices(source);

    expect(slices.map((slice) => [slice.index, slice.top, slice.width, slice.height])).toEqual([
      [0, 0, 1_440, 3_200],
      [1, 3_040, 1_440, 2_960]
    ]);
  });

  it('downscales oversized screenshots before creating bounded vision slices', async () => {
    const source = await sharp({ create: { width: 2_000, height: 6_000, channels: 3, background: '#c8a080' } }).jpeg().toBuffer();
    const slices = await createScreenshotSlices(source);

    expect(slices.map((slice) => [slice.index, slice.top, slice.width, slice.height])).toEqual([
      [0, 0, 1_440, 3_200],
      [1, 3_040, 1_440, 1_280]
    ]);
    for (const slice of slices) {
      await expect(sharp(slice.bytes).metadata()).resolves.toMatchObject({
        format: 'jpeg',
        width: slice.width,
        height: slice.height
      });
    }
  });
});
