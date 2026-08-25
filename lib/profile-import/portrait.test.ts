import { describe, expect, it } from 'vitest';
import sharp from 'sharp';
import { createScreenshotSlices, cropVisiblePortrait, normalizePortrait } from './portrait';

describe('portrait processing', () => {
  it('creates ordered overlapping slices and crops only a high-confidence visible box', async () => {
    const source = await sharp({ create: { width: 1_440, height: 6_000, channels: 3, background: '#c8a080' } }).jpeg().toBuffer();
    const slices = await createScreenshotSlices(source);
    expect(slices.map((slice) => [slice.index, slice.top, slice.height])).toEqual([[0, 0, 3200], [1, 3040, 2960]]);
    const portrait = await cropVisiblePortrait(slices, { sliceIndex: 0, confidence: 'high', box: { x: 100, y: 100, width: 300, height: 300 } });
    expect(portrait?.mediaType).toBe('image/webp');
    await expect(sharp(portrait!.bytes).metadata()).resolves.toMatchObject({ width: 300, height: 300 });
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

  it('suppresses unsafe or low-confidence boxes', async () => {
    const source = await sharp({ create: { width: 500, height: 500, channels: 3, background: 'white' } }).jpeg().toBuffer();
    const slices = await createScreenshotSlices(source);
    await expect(cropVisiblePortrait(slices, { sliceIndex: 0, confidence: 'low', box: { x: 0, y: 0, width: 1, height: 1 } })).resolves.toBeUndefined();
  });

  it('rejects a gallery crop outside the first screenshot slice', async () => {
    const source = await sharp({ create: { width: 1_440, height: 6_000, channels: 3, background: 'white' } }).jpeg().toBuffer();
    const slices = await createScreenshotSlices(source);

    await expect(cropVisiblePortrait(slices, {
      sliceIndex: 1,
      confidence: 'high',
      box: { x: 100, y: 100, width: 300, height: 300 }
    })).resolves.toBeUndefined();
  });

  it('rejects a narrow identity-text strip instead of accepting it as a portrait', async () => {
    const source = await sharp({ create: { width: 500, height: 500, channels: 3, background: 'white' } }).jpeg().toBuffer();
    const slices = await createScreenshotSlices(source);

    await expect(cropVisiblePortrait(slices, {
      sliceIndex: 0,
      confidence: 'high',
      box: { x: 50, y: 50, width: 85, height: 192 }
    })).resolves.toBeUndefined();
  });

  it('rejects a fractional box that rounds outside the slice', async () => {
    const source = await sharp({ create: { width: 500, height: 500, channels: 3, background: 'white' } }).jpeg().toBuffer();
    const slices = await createScreenshotSlices(source);

    await expect(cropVisiblePortrait(slices, {
      sliceIndex: 0,
      confidence: 'high',
      box: { x: 399.5, y: 399.5, width: 100.5, height: 100.5 }
    })).resolves.toBeUndefined();
  });

  it('rejects malformed and multi-frame portrait input', async () => {
    await expect(normalizePortrait(new Uint8Array([1, 2, 3]), 'image/jpeg')).rejects.toMatchObject({ code: 'PHOTO_INVALID' });
    const twoFrameGif = Buffer.from('47494638396101000100800000000000ffffff21f904000a0000002c000000000100010000020244010021f904000a0000002c00000000010001000002024c01003b', 'hex');
    const animated = await sharp(twoFrameGif, { animated: true }).webp().toBuffer();
    await expect(normalizePortrait(animated, 'image/webp')).rejects.toMatchObject({ code: 'PHOTO_INVALID' });
  });

  it('rejects unsupported decoded formats when the submitted MIME type lies', async () => {
    const tiff = await sharp({ create: { width: 100, height: 100, channels: 3, background: 'white' } }).tiff().toBuffer();

    await expect(normalizePortrait(tiff, 'image/jpeg')).rejects.toMatchObject({ code: 'PHOTO_INVALID' });
  });
});
