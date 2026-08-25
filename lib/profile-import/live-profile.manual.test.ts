import { writeFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { canonicalizeRoverProfileUrl } from '../domain/rover-profile-url';
import { createOpenRouterVision } from './openrouter-vision';
import { createScreenshotSlices, cropVisiblePortrait } from './portrait';
import { createScreenshotOneCapture } from './screenshotone';

const PROFILE_URL = 'https://www.rover.com/members/shiloh-c-experienced-dog-walker-caregiver/?service_type=dog-walking&frequency=onetime&pet_type=dog&location=Fox%20River%20Grove,%20IL%2060021,%20USA&location_type=zip-code&dog_count=0&cat_count=0&puppy_count=0';

describe('manual live Rover portrait verification', () => {
  it('captures and isolates the supplied profile portrait', async () => {
    const capture = createScreenshotOneCapture({ accessKey: process.env.SCREENSHOTONE_ACCESS_KEY ?? '' });
    const page = await capture.capture(canonicalizeRoverProfileUrl(PROFILE_URL), new AbortController().signal);
    const slices = await createScreenshotSlices(page.bytes);
    const vision = createOpenRouterVision({
      apiKey: process.env.OPENROUTER_API_KEY ?? '',
      model: process.env.OPENROUTER_VISION_MODEL || 'openai/gpt-5.4-mini'
    });
    const result = await vision.extract(slices, new AbortController().signal);
    const portrait = result.portrait ? await cropVisiblePortrait(slices, result.portrait) : undefined;

    await writeFile('/tmp/rover-shiloh-source.jpg', page.bytes);
    await Promise.all(slices.map((slice) => writeFile(`/tmp/rover-shiloh-slice-${slice.index}.jpg`, slice.bytes)));
    if (portrait) await writeFile('/tmp/rover-shiloh-portrait.webp', portrait.bytes);
    console.info(JSON.stringify({
      page: { width: page.width, height: page.height },
      slices: slices.map(({ index, top, width, height }) => ({ index, top, width, height })),
      portrait: result.portrait,
      cropped: Boolean(portrait)
    }));

    expect(portrait).toBeDefined();
  }, 90_000);
});
