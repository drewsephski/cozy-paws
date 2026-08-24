import { getSession } from '@/lib/session';
import { canonicalizeRoverProfileUrl } from '@/lib/domain/rover-profile-url';
import {
  createBrowserlessRoverPageLoader,
  extractRoverExport,
  RoverExportError,
  type RoverPageLoader
} from '@/lib/rover-export';

export const runtime = 'nodejs';
export const maxDuration = 60;

type Dependencies = {
  getUserId(): Promise<string | null>;
  createPageLoader(): RoverPageLoader;
  now(): Date;
};

const errors: Record<string, { status: number; message: string }> = {
  INVALID_PROFILE_URL: { status: 400, message: 'Enter a valid public Rover profile URL.' },
  ATTESTATION_REQUIRED: { status: 403, message: 'Confirm that this Rover profile belongs to you.' },
  AUTHENTICATION_REQUIRED: { status: 401, message: 'Sign in to export a Rover profile.' },
  PROVIDER_NOT_CONFIGURED: { status: 503, message: 'Rover export is not configured.' },
  PROVIDER_TIMEOUT: { status: 504, message: 'Rover took too long to respond. Try again shortly.' },
  PROVIDER_FAILED: { status: 502, message: 'Rover could not be reached through the export provider.' },
  ROVER_BLOCKED_OR_CHALLENGED: { status: 502, message: 'Rover challenged the export request. Try again later.' },
  UPSTREAM_SCHEMA_CHANGED: { status: 502, message: 'Rover changed its profile data format.' },
  GALLERY_INCOMPLETE: { status: 502, message: 'Rover returned an incomplete photo gallery.' },
  INVALID_REQUEST: { status: 400, message: 'The export request is invalid.' }
};

function errorResponse(code: keyof typeof errors) {
  const error = errors[code];
  return Response.json({ error: { code, message: error.message } }, {
    status: error.status,
    headers: { 'Cache-Control': 'no-store' }
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

    let loader: RoverPageLoader;
    try {
      const profileUrl = canonicalizeRoverProfileUrl(input.profileUrl);
      loader = dependencies.createPageLoader();
      const html = await loader.load(profileUrl, request.signal);
      const result = extractRoverExport(html, profileUrl, dependencies.now());
      return Response.json(result, { headers: { 'Cache-Control': 'private, no-store, max-age=0' } });
    } catch (error) {
      if (error instanceof RoverExportError) return errorResponse(error.code);
      if (error instanceof Error && error.message === 'Enter a valid Rover public profile URL.') {
        return errorResponse('INVALID_PROFILE_URL');
      }
      return errorResponse('PROVIDER_FAILED');
    }
  };
}

const handler = createRoverExportHandler({
  getUserId: async () => (await getSession())?.user.id ?? null,
  createPageLoader: () => createBrowserlessRoverPageLoader({
    token: process.env.BROWSERLESS_API_TOKEN ?? '',
    endpoint: process.env.BROWSERLESS_CONTENT_ENDPOINT
  }),
  now: () => new Date()
});

export const POST = handler;
