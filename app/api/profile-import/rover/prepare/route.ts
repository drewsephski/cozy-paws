import { getSession } from '@/lib/session';
import { resolveRoverImportConfig } from '@/lib/profile-import/config';
import { createConfiguredRoverProfileImports } from '@/lib/profile-import/service';
import type { RoverProfileImports } from '@/lib/profile-import/rover';
import { safeImportError } from '../route-errors';

export const maxDuration = 70;
const encoder = new TextEncoder();

type Dependencies = {
  getUserId(): Promise<string | null>;
  createImports(): RoverProfileImports;
};

function jsonError(error: unknown) {
  const safe = safeImportError(error);
  return Response.json({ error: { code: safe.code, message: safe.message } }, { status: safe.status, headers: { 'Cache-Control': 'no-store' } });
}

export function createPrepareHandler(dependencies: Dependencies) {
  return async function prepare(request: Request) {
    const ownerId = await dependencies.getUserId();
    if (!ownerId) return jsonError(new (await import('@/lib/profile-import/types')).RoverImportError('AUTHENTICATION_REQUIRED'));
    if (Number(request.headers.get('content-length') || 0) > 8_192) return jsonError(new (await import('@/lib/profile-import/types')).RoverImportError('INVALID_REVIEW'));
    let input: { subdomain?: unknown; roverUrl?: unknown; attestationAccepted?: unknown; attemptId?: unknown };
    try { input = await request.json(); } catch { return jsonError(new (await import('@/lib/profile-import/types')).RoverImportError('INVALID_REVIEW')); }
    let imports: RoverProfileImports;
    try { imports = dependencies.createImports(); } catch (error) { return jsonError(error); }

    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        let closed = false;
        const send = (event: unknown) => { if (!closed) controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`)); };
        void imports.prepareOwnedReview({
          ownerId,
          subdomain: String(input.subdomain || ''),
          roverUrl: String(input.roverUrl || ''),
          attestationAccepted: input.attestationAccepted === true ? true : false as never,
          attemptId: String(input.attemptId || ''),
          signal: request.signal,
          onProgress: (stage) => send({ type: 'progress', stage })
        }).then((draft) => {
          send({ type: 'review_ready', draft });
        }).catch((error) => {
          const safe = safeImportError(error);
          send({ type: 'error', error: { code: safe.code, message: safe.message } });
        }).finally(() => { closed = true; controller.close(); });
      }
    });
    return new Response(stream, { headers: { 'Content-Type': 'application/x-ndjson; charset=utf-8', 'Cache-Control': 'no-store, max-age=0', 'X-Content-Type-Options': 'nosniff' } });
  };
}

const handler = createPrepareHandler({
  getUserId: async () => (await getSession())?.user.id ?? null,
  createImports: () => createConfiguredRoverProfileImports(resolveRoverImportConfig('prepare'))
});
export const POST = handler;
