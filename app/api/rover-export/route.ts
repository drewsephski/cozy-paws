import { getSession } from '@/lib/session';
import { canonicalizeRoverProfileUrl } from '@/lib/domain/rover-profile-url';
import {
  createBrowserlessRoverPageLoader,
  extractRoverExport,
  RoverExportError,
  type RoverExportErrorCode,
  type RoverPageLoader
} from '@/lib/rover-export';
import {
  createRedisRoverExportAdmission,
  RoverExportAdmissionError,
  type RoverExportAdmissionErrorCode,
  type RoverExportLease
} from '@/lib/rover-export-admission';

export const runtime = 'nodejs';
export const maxDuration = 60;

type Dependencies = {
  getUserId(): Promise<string | null>;
  acquireExport(userId: string, profileUrl: string): Promise<RoverExportLease>;
  createPageLoader(): RoverPageLoader;
  now(): Date;
};

type RouteErrorCode = RoverExportErrorCode | RoverExportAdmissionErrorCode |
  'ATTESTATION_REQUIRED' | 'AUTHENTICATION_REQUIRED' | 'INVALID_REQUEST';

const errors: Record<RouteErrorCode, { status: number; message: string }> = {
  INVALID_PROFILE_URL: { status: 400, message: 'Enter a valid public Rover profile URL.' },
  ATTESTATION_REQUIRED: { status: 403, message: 'Confirm that this Rover profile belongs to you.' },
  AUTHENTICATION_REQUIRED: { status: 401, message: 'Sign in to export a Rover profile.' },
  PROVIDER_NOT_CONFIGURED: { status: 503, message: 'Rover export is not configured.' },
  PROVIDER_AUTHENTICATION_FAILED: { status: 503, message: 'Rover export provider authentication failed.' },
  PROVIDER_RATE_LIMITED: { status: 503, message: 'Rover export capacity is temporarily unavailable.' },
  PROVIDER_REQUEST_REJECTED: { status: 503, message: 'Rover export provider rejected its request configuration.' },
  PROVIDER_RESPONSE_INVALID: { status: 502, message: 'Rover export provider returned an invalid response.' },
  PROVIDER_TIMEOUT: { status: 504, message: 'Rover took too long to respond. Try again shortly.' },
  PROVIDER_FAILED: { status: 502, message: 'Rover could not be reached through the export provider.' },
  PROFILE_NOT_PUBLIC_OR_NOT_FOUND: { status: 404, message: 'That Rover profile is not public or could not be found.' },
  ROVER_BLOCKED_OR_CHALLENGED: { status: 502, message: 'Rover challenged the export request. Try again later.' },
  ROVER_RATE_LIMITED: { status: 429, message: 'Rover is temporarily limiting profile requests.' },
  UPSTREAM_SCHEMA_CHANGED: { status: 502, message: 'Rover changed its profile data format.' },
  GALLERY_INCOMPLETE: { status: 502, message: 'Rover returned an incomplete photo gallery.' },
  ADMISSION_UNAVAILABLE: { status: 503, message: 'Rover export admission is temporarily unavailable.' },
  RATE_LIMITED: { status: 429, message: 'You have reached the Rover export limit. Try again later.' },
  EXPORT_ACTIVE: { status: 409, message: 'A Rover export is already running for this profile.' },
  INVALID_REQUEST: { status: 400, message: 'The export request is invalid.' }
};

function errorResponse(code: RouteErrorCode, headers?: HeadersInit) {
  const error = errors[code];
  return Response.json({ error: { code, message: error.message } }, {
    status: error.status,
    headers: { 'Cache-Control': 'no-store', ...headers }
  });
}

export function createRoverExportHandler(dependencies: Dependencies) {
  return async function roverExport(request: Request) {
    const userId = await dependencies.getUserId();
    if (!userId) return errorResponse('AUTHENTICATION_REQUIRED');
    if (Number(request.headers.get('content-length') ?? 0) > 8_192) return errorResponse('INVALID_REQUEST');

    let input: { profileUrl?: unknown; attestationAccepted?: unknown };
    try {
      input = await request.json();
    } catch {
      return errorResponse('INVALID_REQUEST');
    }
    if (input.attestationAccepted !== true) return errorResponse('ATTESTATION_REQUIRED');

    let lease: RoverExportLease | undefined;
    try {
      const profileUrl = canonicalizeRoverProfileUrl(input.profileUrl);
      lease = await dependencies.acquireExport(userId, profileUrl);
      const loader = dependencies.createPageLoader();
      const html = await loader.load(profileUrl, request.signal);
      const result = extractRoverExport(html, profileUrl, dependencies.now());
      return Response.json(result, { headers: { 'Cache-Control': 'private, no-store, max-age=0' } });
    } catch (error) {
      if (error instanceof RoverExportAdmissionError) {
        return errorResponse(error.code, { 'Retry-After': String(error.retryAfterSeconds) });
      }
      if (error instanceof RoverExportError) {
        return errorResponse(error.code, error.retryAfterSeconds
          ? { 'Retry-After': String(error.retryAfterSeconds) }
          : undefined);
      }
      if (error instanceof Error && error.message === 'Enter a valid Rover public profile URL.') {
        return errorResponse('INVALID_PROFILE_URL');
      }
      return errorResponse('PROVIDER_FAILED');
    } finally {
      await lease?.release();
    }
  };
}

const admission = createRedisRoverExportAdmission();
const handler = createRoverExportHandler({
  getUserId: async () => (await getSession())?.user.id ?? null,
  acquireExport: (userId, profileUrl) => admission.acquire(userId, profileUrl),
  createPageLoader: () => createBrowserlessRoverPageLoader({
    token: process.env.BROWSERLESS_API_TOKEN ?? '',
    endpoint: process.env.BROWSERLESS_CONTENT_ENDPOINT
  }),
  now: () => new Date()
});

export const POST = handler;
