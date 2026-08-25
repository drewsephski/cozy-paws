import sharp from 'sharp';
import { RoverImportError, type ScreenshotSlice } from './types';

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
