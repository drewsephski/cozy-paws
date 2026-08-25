import { getSession } from '@/lib/session';
import { resolveRoverImportConfig } from '@/lib/profile-import/config';
import { createConfiguredRoverProfileImports } from '@/lib/profile-import/service';
import type { RoverProfileImports } from '@/lib/profile-import/rover';
import { RoverImportError } from '@/lib/profile-import/types';
import { safeImportError } from '../route-errors';

type Dependencies = { getUserId(): Promise<string | null>; createImports(): RoverProfileImports };

function errorResponse(error: unknown) {
  const safe = safeImportError(error);
  return Response.json({ error: { code: safe.code, message: safe.message } }, { status: safe.status, headers: { 'Cache-Control': 'no-store' } });
}

export function createApplyHandler(dependencies: Dependencies) {
  return async function apply(request: Request) {
    const ownerId = await dependencies.getUserId();
    if (!ownerId) return errorResponse(new RoverImportError('AUTHENTICATION_REQUIRED'));
    if (Number(request.headers.get('content-length') || 0) > 128 * 1024) return errorResponse(new RoverImportError('INVALID_REVIEW'));
    let imports: RoverProfileImports;
    try { imports = dependencies.createImports(); } catch (error) { return errorResponse(error); }
    try {
      const form = await request.formData();
      const reviewText = String(form.get('review') || '');
      if (!reviewText || reviewText.length > 64 * 1024) throw new RoverImportError('INVALID_REVIEW');
      const review = JSON.parse(reviewText) as { subdomain?: unknown; applyId?: unknown; expectedProfileRevision?: unknown; reviewed?: unknown };
      const profile = await imports.applyOwnedReview({
        ownerId,
        subdomain: String(review.subdomain || ''),
        applyId: String(review.applyId || ''),
        expectedProfileRevision: Number(review.expectedProfileRevision),
        reviewed: review.reviewed && typeof review.reviewed === 'object' ? review.reviewed : {}
      });
      return Response.json({ profile: { subdomain: profile.subdomain, profileRevision: profile.profileRevision } }, { headers: { 'Cache-Control': 'no-store' } });
    } catch (error) {
      return errorResponse(error instanceof SyntaxError ? new RoverImportError('INVALID_REVIEW') : error);
    }
  };
}

const handler = createApplyHandler({
  getUserId: async () => (await getSession())?.user.id ?? null,
  createImports: () => createConfiguredRoverProfileImports(resolveRoverImportConfig('apply'))
});
export const POST = handler;
