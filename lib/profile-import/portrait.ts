import sharp from 'sharp';
import { RoverImportError, type ProfileVisionResult, type ScreenshotSlice } from './types';

const SLICE_HEIGHT = 3_200;
const OVERLAP = 160;
const MAX_SLICE_WIDTH = 1_440;

export async function createScreenshotSlices(bytes: Uint8Array): Promise<ScreenshotSlice[]> {
  const image = sharp(bytes, { limitInputPixels: 30_000_000, animated: false }).rotate();
  const metadata = await image.metadata();
  const sourceWidth = metadata.autoOrient.width ?? metadata.width ?? 0;
  const sourceHeight = metadata.autoOrient.height ?? metadata.height ?? 0;
  if (!sourceWidth || !sourceHeight || sourceWidth * sourceHeight > 30_000_000 || sourceHeight > 12_000) throw new RoverImportError('CAPTURE_TOO_LARGE');
  const width = Math.min(sourceWidth, MAX_SLICE_WIDTH);
  const height = Math.max(1, Math.round(sourceHeight * width / sourceWidth));
  const slices: ScreenshotSlice[] = [];
  for (let top = 0, index = 0; top < height && index < 4; top += SLICE_HEIGHT - OVERLAP, index += 1) {
    const sliceHeight = Math.min(SLICE_HEIGHT, height - top);
    const output = await sharp(bytes, { limitInputPixels: 30_000_000, animated: false })
      .rotate()
      .resize({ width, height, fit: 'fill', withoutEnlargement: true })
      .extract({ left: 0, top, width, height: sliceHeight })
      .jpeg({ quality: 82 })
      .toBuffer();
    slices.push({ index, top, width, height: sliceHeight, bytes: output, mediaType: 'image/jpeg' });
  }
  return slices;
}

export async function cropVisiblePortrait(slices: ScreenshotSlice[], portrait: NonNullable<ProfileVisionResult['portrait']>) {
  if (portrait.confidence !== 'high') return undefined;
  const slice = slices.find((item) => item.index === portrait.sliceIndex);
  if (!slice) return undefined;
  const { x, y, width, height } = portrait.box;
  if ([x, y, width, height].some((value) => !Number.isFinite(value) || value < 0 || value > 1000)) return undefined;
  if (x + width > 1000 || y + height > 1000 || width <= 0 || height <= 0) return undefined;
  const left = Math.round(slice.width * x / 1000);
  const top = Math.round(slice.height * y / 1000);
  const cropWidth = Math.round(slice.width * width / 1000);
  const cropHeight = Math.round(slice.height * height / 1000);
  if (cropWidth < 80 || cropHeight < 80 || cropWidth / cropHeight < 0.35 || cropWidth / cropHeight > 2) return undefined;
  const bytes = await sharp(slice.bytes, { animated: false, limitInputPixels: 30_000_000 }).extract({ left, top, width: cropWidth, height: cropHeight }).rotate().resize({ width: 1024, height: 1024, fit: 'inside', withoutEnlargement: true }).webp({ quality: 84 }).toBuffer();
  if (bytes.length > 5 * 1024 * 1024) return undefined;
  return { bytes: new Uint8Array(bytes), mediaType: 'image/webp' as const };
}

export async function normalizePortrait(bytes: Uint8Array, mediaType: string) {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(mediaType) || bytes.length > 5 * 1024 * 1024) throw new RoverImportError('PHOTO_INVALID');
  try {
    const image = sharp(bytes, { animated: false, limitInputPixels: 30_000_000 });
    const metadata = await image.metadata();
    if (!metadata.format || !['jpeg', 'png', 'webp'].includes(metadata.format) || !metadata.width || !metadata.height || (metadata.pages ?? 1) !== 1) {
      throw new RoverImportError('PHOTO_INVALID');
    }
    const output = await image.rotate().resize({ width: 1024, height: 1024, fit: 'inside', withoutEnlargement: true }).webp({ quality: 84 }).toBuffer();
    return new Uint8Array(output);
  } catch (error) {
    if (error instanceof RoverImportError) throw error;
    throw new RoverImportError('PHOTO_INVALID');
  }
}
