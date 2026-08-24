import { canonicalizeRoverProfileUrl } from './domain/rover-profile-url';

const MAX_HTML_BYTES = 3 * 1024 * 1024;
const QUERY_STATE_MARKER = 'window.__REACT_QUERY_STATE__';
const BROWSERLESS_CONTENT_HOSTS = new Set([
  'production-sfo.browserless.io',
  'production-lon.browserless.io',
  'production-ams.browserless.io'
]);

export const ROVER_EXPORT_ERROR_CODES = [
  'INVALID_PROFILE_URL',
  'PROVIDER_NOT_CONFIGURED',
  'PROVIDER_AUTHENTICATION_FAILED',
  'PROVIDER_RATE_LIMITED',
  'PROVIDER_REQUEST_REJECTED',
  'PROVIDER_RESPONSE_INVALID',
  'PROVIDER_TIMEOUT',
  'PROVIDER_FAILED',
  'PROFILE_NOT_PUBLIC_OR_NOT_FOUND',
  'ROVER_BLOCKED_OR_CHALLENGED',
  'ROVER_RATE_LIMITED',
  'UPSTREAM_SCHEMA_CHANGED',
  'GALLERY_INCOMPLETE'
] as const;

export type RoverExportErrorCode = typeof ROVER_EXPORT_ERROR_CODES[number];

export class RoverExportError extends Error {
  constructor(readonly code: RoverExportErrorCode, message?: string, readonly retryAfterSeconds?: number) {
    super(message ?? code);
    this.name = 'RoverExportError';
  }
}

function retryAfterSeconds(headers: Headers, fallback: number) {
  const raw = headers.get('retry-after');
  if (!raw || !/^\d{1,4}$/.test(raw)) return fallback;
  const seconds = Number(raw);
  return seconds >= 1 && seconds <= 3_600 ? seconds : fallback;
}

function browserlessContentEndpoint(value: string) {
  let endpoint: URL;
  try {
    endpoint = new URL(value);
  } catch {
    throw new RoverExportError('PROVIDER_NOT_CONFIGURED');
  }
  if (
    endpoint.protocol !== 'https:' ||
    endpoint.port ||
    endpoint.username ||
    endpoint.password ||
    endpoint.pathname !== '/content' ||
    !BROWSERLESS_CONTENT_HOSTS.has(endpoint.hostname)
  ) {
    throw new RoverExportError('PROVIDER_NOT_CONFIGURED');
  }
  endpoint.search = '';
  endpoint.hash = '';
  return endpoint;
}

type JsonRecord = Record<string, unknown>;

export type RoverExportPhoto = {
  id: string | number | null;
  source: 'profile' | 'stay';
  fullResolutionUrl: string;
  added: string | null;
  caption: string | null;
  uploaderName: string | null;
  isPetOwnerUpload: boolean | null;
};

export type RoverExportReview = {
  id: string | null;
  reviewerName: string | null;
  added: string | null;
  description: string | null;
  rating: number | null;
  serviceName: string | null;
  serviceSlug: string | null;
  response: string | null;
};

export type RoverExportResult = {
  sourceUrl: string;
  exportedAt: string;
  profile: {
    roverId: string;
    firstName: string | null;
    shortName: string | null;
    description: string | null;
    experience: string | null;
    environment: string | null;
    memberSinceDate: string | null;
    reviewsCount: number | null;
    ratingsAverage: string | number | null;
    responsiveness: unknown;
    services: unknown;
    attributes: unknown;
  };
  photos: RoverExportPhoto[];
  photoCompleteness: {
    expected: number;
    observed: number;
    complete: true;
  };
  reviews: {
    items: RoverExportReview[];
    loaded: number;
    total: number | null;
    totalTextReviews: number | null;
    hasMore: boolean;
  };
};

export type RoverPageLoader = {
  load(url: string, signal: AbortSignal): Promise<string>;
};

function record(value: unknown): JsonRecord | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value) ? value as JsonRecord : null;
}

function array(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function string(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

function number(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function parseQueryState(html: string) {
  const marker = html.indexOf(QUERY_STATE_MARKER);
  if (marker === -1) {
    if (/just a moment|cf-chl-|challenge-platform/i.test(html)) {
      throw new RoverExportError('ROVER_BLOCKED_OR_CHALLENGED');
    }
    throw new RoverExportError('UPSTREAM_SCHEMA_CHANGED');
  }

  const assignment = html.indexOf('=', marker + QUERY_STATE_MARKER.length);
  const scriptEnd = html.indexOf('</script>', assignment + 1);
  if (assignment === -1 || scriptEnd === -1) throw new RoverExportError('UPSTREAM_SCHEMA_CHANGED');

  const serialized = html.slice(assignment + 1, scriptEnd).trim().replace(/;\s*$/, '');
  try {
    const state = record(JSON.parse(serialized));
    const queries = array(state?.queries);
    if (!queries.length) throw new Error('missing queries');
    return queries;
  } catch {
    throw new RoverExportError('UPSTREAM_SCHEMA_CHANGED');
  }
}

function queryData(queries: unknown[], path: string) {
  for (const value of queries) {
    const query = record(value);
    const key = array(query?.queryKey);
    if (key[0] !== path) continue;
    return record(query?.state)?.data;
  }
  return undefined;
}

function paginatedResults(value: unknown) {
  const data = record(value);
  const pages = array(data?.pages).map(record).filter((page): page is JsonRecord => Boolean(page));
  return {
    found: Boolean(data),
    results: pages.flatMap((page) => array(page.results)),
    expected: pages.reduce((total, page) => total + (number(page.count) ?? array(page.results).length), 0),
    terminal: pages.length > 0 && pages.every((page) => page.next === null)
  };
}

function fullResolutionPhotoUrl(value: unknown) {
  const image = record(value);
  const candidate = string(image?.largeUncroppedRetina) ?? string(image?.largeUncropped) ?? string(image?.galleryMain);
  if (!candidate) return null;

  let url: URL;
  try {
    url = new URL(candidate.replaceAll('&#x26;', '&').replaceAll('&#38;', '&').replaceAll('&amp;', '&'));
  } catch {
    return null;
  }

  if (
    url.protocol !== 'https:' ||
    url.hostname !== 'www.rover.com' ||
    !/^\/cf-image-cdn\/remote\/images\/(?:people|pets|messages)\/[a-z0-9_-]+\/[a-z0-9_-]+\/original(?:\.(?:jpe?g|png|webp))?$/i.test(url.pathname)
  ) return null;

  url.search = '';
  url.hash = '';
  return url.toString();
}

function photo(value: unknown, source: RoverExportPhoto['source'], isPetOwnerUpload: boolean | null): RoverExportPhoto | null {
  const image = record(value);
  const fullResolutionUrl = fullResolutionPhotoUrl(image);
  if (!image || !fullResolutionUrl) return null;
  const uploader = record(image.uploader);
  const id = typeof image.id === 'string' || typeof image.id === 'number' ? image.id : null;
  return {
    id,
    source,
    fullResolutionUrl,
    added: string(image.added),
    caption: string(image.caption),
    uploaderName: string(uploader?.name),
    isPetOwnerUpload
  };
}

function review(value: unknown): RoverExportReview | null {
  const item = record(value);
  if (!item) return null;
  const poster = record(item.poster);
  const service = record(item.service);
  const url = string(item.url);
  return {
    id: url?.match(/\/reviews\/provider\/([^/]+)\/$/)?.[1] ?? null,
    reviewerName: string(poster?.shortName),
    added: string(item.added),
    description: string(item.description),
    rating: number(item.rating) ?? number(item.overall),
    serviceName: string(service?.name),
    serviceSlug: string(service?.slug),
    response: typeof item.response === 'string' ? item.response : string(record(item.response)?.description)
  };
}

export function extractRoverExport(html: string, profileUrl: string, now = new Date()): RoverExportResult {
  const sourceUrl = canonicalizeRoverProfileUrl(profileUrl);
  const queries = parseQueryState(html);
  const profile = record(queryData(queries, '/api/v7/people/full-sitter-profile/'));
  const personId = string(profile?.personId) || string(profile?.opk);
  if (!profile || !personId) throw new RoverExportError('UPSTREAM_SCHEMA_CHANGED');

  const profileImagePage = paginatedResults(queryData(queries, `/api/v7/people/${personId}/images/`));
  const stayMediaPage = paginatedResults(queryData(queries, `/api/v7/people/${personId}/stay-media/`));
  if (!profileImagePage.found || !stayMediaPage.found) throw new RoverExportError('GALLERY_INCOMPLETE');

  const manifest = new Map<string, RoverExportPhoto>();
  const portrait = photo(profile.defaultImage, 'profile', null);
  if (portrait) manifest.set(portrait.fullResolutionUrl, portrait);

  for (const value of profileImagePage.results) {
    const item = photo(value, 'profile', null);
    if (item) manifest.set(item.fullResolutionUrl, item);
  }
  for (const value of stayMediaPage.results) {
    const media = record(value);
    if (media?.type !== 'image') continue;
    const item = photo(media.object, 'stay', typeof media.isPetOwner === 'boolean' ? media.isPetOwner : null);
    if (item) manifest.set(item.fullResolutionUrl, item);
  }

  const photos = [...manifest.values()];
  const expected = (portrait ? 1 : 0) + profileImagePage.expected + stayMediaPage.expected;
  if (!profileImagePage.terminal || !stayMediaPage.terminal || photos.length !== expected) {
    throw new RoverExportError('GALLERY_INCOMPLETE');
  }

  const reviewsData = record(queryData(queries, `/api/v7/people/${personId}/reviews/`));
  const reviews = array(reviewsData?.results).map(review).filter((item): item is RoverExportReview => Boolean(item));
  const totalReviews = number(reviewsData?.count);

  return {
    sourceUrl,
    exportedAt: now.toISOString(),
    profile: {
      roverId: personId,
      firstName: string(profile.firstName),
      shortName: string(profile.shortName),
      description: string(profile.description),
      experience: string(profile.experience),
      environment: string(profile.environment),
      memberSinceDate: string(profile.memberSinceDate),
      reviewsCount: number(profile.reviewsCount),
      ratingsAverage: string(profile.ratingsAverage) ?? number(profile.ratingsAverage),
      responsiveness: profile.responsiveness ?? null,
      services: profile.services ?? null,
      attributes: profile.attributes ?? null
    },
    photos,
    photoCompleteness: { expected, observed: photos.length, complete: true },
    reviews: {
      items: reviews,
      loaded: reviews.length,
      total: totalReviews,
      totalTextReviews: number(reviewsData?.totalTextReviews),
      hasMore: Boolean(reviewsData?.next) || (totalReviews !== null && reviews.length < totalReviews)
    }
  };
}

async function readBoundedText(response: Response) {
  const declaredLength = Number(response.headers.get('content-length') ?? 0);
  if (declaredLength > MAX_HTML_BYTES) throw new RoverExportError('PROVIDER_FAILED');
  if (!response.body) throw new RoverExportError('PROVIDER_FAILED');

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_HTML_BYTES) {
      await reader.cancel();
      throw new RoverExportError('PROVIDER_FAILED');
    }
    chunks.push(value);
  }

  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  return new TextDecoder().decode(bytes);
}

type BrowserlessOptions = {
  token: string;
  endpoint?: string;
  fetcher?: typeof fetch;
  timeoutMs?: number;
  providerTimeoutMs?: number;
};

export function createBrowserlessRoverPageLoader({
  token,
  endpoint = 'https://production-sfo.browserless.io/content',
  fetcher = fetch,
  timeoutMs = 45_000,
  providerTimeoutMs = 40_000
}: BrowserlessOptions): RoverPageLoader {
  if (!token) throw new RoverExportError('PROVIDER_NOT_CONFIGURED');

  return {
    async load(url, signal) {
      const providerUrl = browserlessContentEndpoint(endpoint);
      providerUrl.searchParams.set('headless', 'false');
      providerUrl.searchParams.set('proxy', 'residential');
      providerUrl.searchParams.set('proxyCountry', 'us');
      providerUrl.searchParams.set('proxyLocaleMatch', 'true');
      providerUrl.searchParams.set('timeout', String(providerTimeoutMs));

      const controller = new AbortController();
      const cancel = () => controller.abort(signal.reason);
      signal.addEventListener('abort', cancel, { once: true });
      const timeout = setTimeout(() => controller.abort(new Error('provider timeout')), timeoutMs);
      try {
        const response = await fetcher(providerUrl, {
          method: 'POST',
          headers: {
            Authorization: `Basic ${Buffer.from(token, 'utf8').toString('base64')}`,
            'Cache-Control': 'no-cache',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            url: canonicalizeRoverProfileUrl(url),
            gotoOptions: { waitUntil: 'domcontentloaded', timeout: 30_000 },
            waitForFunction: {
              fn: `() => Array.from(document.scripts).some((script) => script.textContent?.startsWith('${QUERY_STATE_MARKER}'))`,
              timeout: 20_000
            },
            rejectResourceTypes: ['image', 'media', 'font'],
            bestAttempt: false
          }),
          cache: 'no-store',
          signal: controller.signal
        });
        if (!response.ok) {
          if (response.status === 401) {
            throw new RoverExportError('PROVIDER_AUTHENTICATION_FAILED');
          }
          if (response.status === 429) {
            throw new RoverExportError('PROVIDER_RATE_LIMITED', undefined, retryAfterSeconds(response.headers, 30));
          }
          if (response.status === 408 || response.status === 504) throw new RoverExportError('PROVIDER_TIMEOUT');
          if (response.status >= 400 && response.status < 500) {
            throw new RoverExportError('PROVIDER_REQUEST_REJECTED');
          }
          throw new RoverExportError('PROVIDER_FAILED');
        }
        const rawTargetStatus = response.headers.get('x-response-code');
        if (!rawTargetStatus || !/^\d{3}$/.test(rawTargetStatus)) {
          throw new RoverExportError('PROVIDER_RESPONSE_INVALID');
        }
        const targetStatus = Number(rawTargetStatus);
        if (targetStatus < 100 || targetStatus > 599) throw new RoverExportError('PROVIDER_RESPONSE_INVALID');
        if (targetStatus === 401 || targetStatus === 403) {
          throw new RoverExportError('ROVER_BLOCKED_OR_CHALLENGED');
        }
        if (targetStatus === 429) throw new RoverExportError('ROVER_RATE_LIMITED', undefined, 300);
        if (targetStatus === 404) throw new RoverExportError('PROFILE_NOT_PUBLIC_OR_NOT_FOUND');
        if (targetStatus === 408 || targetStatus === 504) throw new RoverExportError('PROVIDER_TIMEOUT');
        if (Number.isFinite(targetStatus) && targetStatus >= 400) {
          throw new RoverExportError('PROVIDER_FAILED');
        }
        return await readBoundedText(response);
      } catch (error) {
        if (error instanceof RoverExportError) throw error;
        if (controller.signal.aborted) {
          throw new RoverExportError(signal.aborted ? 'PROVIDER_FAILED' : 'PROVIDER_TIMEOUT');
        }
        throw new RoverExportError('PROVIDER_FAILED');
      } finally {
        clearTimeout(timeout);
        signal.removeEventListener('abort', cancel);
      }
    }
  };
}
