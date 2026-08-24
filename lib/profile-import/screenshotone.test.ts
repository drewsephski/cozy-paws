import { describe, expect, it, vi } from 'vitest';
import sharp from 'sharp';
import { createScreenshotOneCapture } from './screenshotone';

describe('ScreenshotOne capture', () => {
  it('uses one direct uncached bounded binary request with a server-only header', async () => {
    const image = await sharp({ create: { width: 800, height: 1_000, channels: 3, background: 'white' } }).jpeg().toBuffer();
    const fetcher = vi.fn().mockResolvedValue(new Response(image, { headers: { 'content-type': 'image/jpeg' } }));
    const result = await createScreenshotOneCapture({ accessKey: 'secret', fetcher }).capture('https://www.rover.com/members/jamie/', new AbortController().signal);
    expect(result).toMatchObject({ width: 800, height: 1_000, mediaType: 'image/jpeg' });
    const [url, init] = fetcher.mock.calls[0];
    expect(url).toBe('https://api.screenshotone.com/take');
    expect(init.headers).toEqual({ 'Content-Type': 'application/json', 'X-Access-Key': 'secret' });
    expect(JSON.parse(init.body)).toMatchObject({ full_page: true, full_page_scroll: true, cache: false, response_type: 'by_format', format: 'jpg', wait_until: ['domcontentloaded'] });
  });

  it('rejects non-images and provider error bodies without reflecting them', async () => {
    const capture = createScreenshotOneCapture({ accessKey: 'secret', fetcher: vi.fn().mockResolvedValue(new Response('private provider detail', { status: 500 })) });
    await expect(capture.capture('https://www.rover.com/members/jamie/', new AbortController().signal)).rejects.toMatchObject({ code: 'CAPTURE_FAILED' });
  });

  it('aborts the provider request at the application deadline', async () => {
    const fetcher = vi.fn((_: string, init?: RequestInit) => new Promise<Response>((_, reject) => {
      init?.signal?.addEventListener('abort', () => reject(init.signal?.reason), { once: true });
    }));
    const capture = createScreenshotOneCapture({ accessKey: 'secret', fetcher: fetcher as typeof fetch, applicationTimeoutMs: 5 });
    await expect(capture.capture('https://www.rover.com/members/jamie/', new AbortController().signal)).rejects.toMatchObject({ code: 'CAPTURE_TIMEOUT' });
    expect((fetcher.mock.calls[0]?.[1] as RequestInit).signal).toBeInstanceOf(AbortSignal);
  });

  it('does not start provider work when the caller is already disconnected', async () => {
    const fetcher = vi.fn();
    const controller = new AbortController();
    controller.abort();
    const capture = createScreenshotOneCapture({ accessKey: 'secret', fetcher });
    await expect(capture.capture('https://www.rover.com/members/jamie/', controller.signal)).rejects.toMatchObject({ code: 'CAPTURE_FAILED' });
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('rejects screenshots outside byte and dimension bounds', async () => {
    const oversizedBody = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new Uint8Array(20 * 1024 * 1024));
        controller.enqueue(new Uint8Array(1));
        controller.close();
      }
    });
    const oversized = createScreenshotOneCapture({ accessKey: 'secret', fetcher: vi.fn().mockResolvedValue(new Response(oversizedBody, { headers: { 'content-type': 'image/jpeg' } })) });
    await expect(oversized.capture('https://www.rover.com/members/jamie/', new AbortController().signal)).rejects.toMatchObject({ code: 'CAPTURE_TOO_LARGE' });

    const tooTall = await sharp({ create: { width: 320, height: 12_001, channels: 3, background: 'white' } }).jpeg().toBuffer();
    const tallCapture = createScreenshotOneCapture({ accessKey: 'secret', fetcher: vi.fn().mockResolvedValue(new Response(tooTall, { headers: { 'content-type': 'image/jpeg' } })) });
    await expect(tallCapture.capture('https://www.rover.com/members/jamie/', new AbortController().signal)).rejects.toMatchObject({ code: 'CAPTURE_TOO_LARGE' });
  });
});
