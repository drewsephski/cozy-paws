import sharp from 'sharp';
import { RoverImportError, type PageCapture } from './types';

const MAX_BYTES = 20 * 1024 * 1024;
const MAX_PIXELS = 30_000_000;

type Options = { accessKey: string; fetcher?: typeof fetch; applicationTimeoutMs?: number };

async function readBounded(response: Response) {
  if (!response.body) throw new RoverImportError('CAPTURE_FAILED');
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_BYTES) {
      await reader.cancel();
      throw new RoverImportError('CAPTURE_TOO_LARGE');
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  return bytes;
}

export function createScreenshotOneCapture({ accessKey, fetcher = fetch, applicationTimeoutMs = 40_000 }: Options): PageCapture {
  return {
    async capture(url, signal) {
      if (signal.aborted) throw new RoverImportError('CAPTURE_FAILED');
      const controller = new AbortController();
      const onAbort = () => controller.abort(signal.reason);
      signal.addEventListener('abort', onAbort, { once: true });
      const timeout = setTimeout(() => controller.abort(new Error('capture timeout')), applicationTimeoutMs);
      try {
        const response = await fetcher('https://api.screenshotone.com/take', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Access-Key': accessKey },
          body: JSON.stringify({
            url, full_page: true, full_page_scroll: true, full_page_algorithm: 'default', full_page_max_height: 12_000,
            viewport_width: 1_440, viewport_height: 900, device_scale_factor: 1,
            wait_until: ['domcontentloaded'], delay: 2, navigation_timeout: 20, timeout: 35,
            cache: false, response_type: 'by_format', format: 'jpg', image_quality: 82
          }),
          signal: controller.signal,
          cache: 'no-store'
        });
        if (!response.ok) throw new RoverImportError('CAPTURE_FAILED');
        const mediaType = response.headers.get('content-type')?.split(';')[0] ?? '';
        if (!['image/jpeg', 'image/png', 'image/webp'].includes(mediaType)) throw new RoverImportError('CAPTURE_FAILED');
        const bytes = await readBounded(response);
        if (bytes.length < 1_000) throw new RoverImportError('CAPTURE_FAILED');
        const metadata = await sharp(bytes, { limitInputPixels: MAX_PIXELS, animated: false }).metadata();
        if ((metadata.pages ?? 1) !== 1) throw new RoverImportError('CAPTURE_FAILED');
        const width = metadata.width ?? 0;
        const height = metadata.height ?? 0;
        if (width < 320 || height < 320 || height > 12_000 || width * height > MAX_PIXELS) throw new RoverImportError('CAPTURE_TOO_LARGE');
        return { bytes, mediaType, width, height };
      } catch (error) {
        if (error instanceof RoverImportError) throw error;
        if (controller.signal.aborted) throw new RoverImportError(signal.aborted ? 'CAPTURE_FAILED' : 'CAPTURE_TIMEOUT');
        throw new RoverImportError('CAPTURE_FAILED');
      } finally {
        clearTimeout(timeout);
        signal.removeEventListener('abort', onAbort);
      }
    }
  };
}
