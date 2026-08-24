import { describe, expect, it, vi } from 'vitest';
import {
  createBrowserlessRoverPageLoader,
  extractRoverExport,
  RoverExportError
} from './rover-export';

const profileUrl = 'https://www.rover.com/members/indre-p-fox-river-grove-dog-sitter/';
const personId = 'gmKErq6A';

function image(id: number, path: string, name = 'Indre P.') {
  return {
    id,
    added: '2025-01-01T00:00:00Z',
    caption: `Photo ${id}`,
    uploader: { name },
    largeUncroppedRetina: `https://www.rover.com/cf-image-cdn/remote/images/${path}?width=1536&#x26;height=1536`
  };
}

function hydrationHtml(options: { stayNext?: string | null; duplicateStay?: boolean } = {}) {
  const portrait = image(1, 'people/gmKErq6A/portrait/original.jpeg');
  const profilePhoto = image(2, 'people/gmKErq6A/profile/original.jpeg');
  const stayPhoto = options.duplicateStay
    ? profilePhoto
    : image(3, 'messages/9d4d05e4dd2911f0b10a92638e122325/stay/original.jpg');
  const state = {
    queries: [
      {
        queryKey: ['/api/v7/people/full-sitter-profile/', { slug: 'indre-p-fox-river-grove-dog-sitter' }],
        state: { data: {
          personId: '',
          opk: personId,
          firstName: 'Indre',
          shortName: 'Indre P.',
          description: 'Profile description',
          experience: 'Experience',
          environment: 'Environment',
          memberSinceDate: '2015-01-01',
          reviewsCount: 35,
          ratingsAverage: '5.0',
          responsiveness: { responseRate: 96 },
          services: [{ name: 'Boarding' }],
          attributes: { experience: '11 years' },
          defaultImage: portrait
        } }
      },
      {
        queryKey: [`/api/v7/people/${personId}/images/`],
        state: { data: { pages: [{ count: 1, next: null, previous: null, results: [profilePhoto] }], pageParams: [null] } }
      },
      {
        queryKey: [`/api/v7/people/${personId}/stay-media/`],
        state: { data: { pages: [{ count: 1, next: options.stayNext ?? null, previous: null, results: [{ type: 'image', isPetOwner: false, object: stayPhoto }] }], pageParams: [null] } }
      },
      {
        queryKey: [`/api/v7/people/${personId}/reviews/`, { page: 1 }],
        state: { data: {
          count: 21,
          totalTextReviews: 21,
          next: `https://www.rover.com/api/v7/people/${personId}/reviews/?page=2`,
          results: [{
            url: 'https://www.rover.com/api/v7/reviews/provider/review-1/',
            poster: { shortName: 'Christine A.' },
            added: '2025-11-25T00:00:00Z',
            description: 'Great care.',
            rating: 5,
            service: { name: 'Boarding', slug: 'overnight-boarding' },
            response: null
          }]
        } }
      }
    ]
  };
  return `<!doctype html><script>${'window.__REACT_QUERY_STATE__'} = ${JSON.stringify(state)};</script>`;
}

describe('Rover export extraction', () => {
  it('extracts and deduplicates a complete gallery plus the first review page', () => {
    const result = extractRoverExport(hydrationHtml(), `${profileUrl}?service_type=boarding`, new Date('2026-08-24T12:00:00Z'));

    expect(result).toMatchObject({
      sourceUrl: profileUrl,
      exportedAt: '2026-08-24T12:00:00.000Z',
      profile: { roverId: personId, shortName: 'Indre P.', reviewsCount: 35 },
      photoCompleteness: { expected: 3, observed: 3, complete: true },
      reviews: { loaded: 1, total: 21, totalTextReviews: 21, hasMore: true }
    });
    expect(result.photos.map((photo) => photo.fullResolutionUrl)).toEqual([
      'https://www.rover.com/cf-image-cdn/remote/images/people/gmKErq6A/portrait/original.jpeg',
      'https://www.rover.com/cf-image-cdn/remote/images/people/gmKErq6A/profile/original.jpeg',
      'https://www.rover.com/cf-image-cdn/remote/images/messages/9d4d05e4dd2911f0b10a92638e122325/stay/original.jpg'
    ]);
    expect(result.reviews.items[0]).toMatchObject({ reviewerName: 'Christine A.', rating: 5, serviceName: 'Boarding' });
  });

  it('fails closed when pagination is not terminal or the manifest is deduplicated below the reported count', () => {
    expect(() => extractRoverExport(hydrationHtml({ stayNext: 'next-page' }), profileUrl)).toThrowError(
      expect.objectContaining({ code: 'GALLERY_INCOMPLETE' })
    );
    expect(() => extractRoverExport(hydrationHtml({ duplicateStay: true }), profileUrl)).toThrowError(
      expect.objectContaining({ code: 'GALLERY_INCOMPLETE' })
    );
  });

  it('distinguishes a Cloudflare challenge from a hydration schema change', () => {
    expect(() => extractRoverExport('<title>Just a moment...</title><script src="/cf-chl-x"></script>', profileUrl)).toThrowError(
      expect.objectContaining({ code: 'ROVER_BLOCKED_OR_CHALLENGED' })
    );
    expect(() => extractRoverExport('<main>Profile</main>', profileUrl)).toThrowError(
      expect.objectContaining({ code: 'UPSTREAM_SCHEMA_CHANGED' })
    );
  });
});

describe('Browserless Rover page loader', () => {
  it('uses a headful residential browser, blocks media bytes, and returns bounded HTML', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(hydrationHtml(), {
      status: 200,
      headers: { 'Content-Type': 'text/html' }
    }));
    const loader = createBrowserlessRoverPageLoader({ token: 'secret-token', fetcher });

    await expect(loader.load(profileUrl, new AbortController().signal)).resolves.toContain('window.__REACT_QUERY_STATE__');
    const [requestUrl, request] = fetcher.mock.calls[0];
    const providerUrl = new URL(String(requestUrl));
    expect(providerUrl.origin + providerUrl.pathname).toBe('https://production-sfo.browserless.io/content');
    expect(providerUrl.searchParams.get('headless')).toBe('false');
    expect(providerUrl.searchParams.get('proxy')).toBe('residential');
    expect(providerUrl.searchParams.has('token')).toBe(false);
    expect(new Headers(request?.headers).get('authorization')).toBe('Bearer secret-token');
    expect(JSON.parse(String(request?.body))).toMatchObject({
      url: profileUrl,
      gotoOptions: { waitUntil: 'domcontentloaded' },
      rejectResourceTypes: ['image', 'media', 'font'],
      bestAttempt: false
    });
  });

  it('maps provider timeouts without returning provider response details', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response('timeout detail', { status: 504 }));
    const loader = createBrowserlessRoverPageLoader({ token: 'secret-token', fetcher });
    await expect(loader.load(profileUrl, new AbortController().signal)).rejects.toEqual(
      new RoverExportError('PROVIDER_TIMEOUT')
    );
  });
});
