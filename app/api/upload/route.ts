import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { redis } from '@/lib/redis';
import { headers } from 'next/headers';

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });

  const body = (await request.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      request,
      body,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        let payload: { subdomain?: string } = {};
        try {
          payload = JSON.parse(clientPayload || '{}') as { subdomain?: string };
        } catch {
          throw new Error('Invalid upload payload');
        }

        const subdomain = String(payload.subdomain || '').toLowerCase().replace(/[^a-z0-9-]/g, '');
        const profile = await redis.get<{ ownerId?: string }>(`subdomain:${subdomain}`);
        if (!subdomain || profile?.ownerId !== session.user.id || !pathname.startsWith(`profiles/${subdomain}/`)) {
          throw new Error('Invalid upload request');
        }
        return {
          allowedContentTypes: ['image/jpeg', 'image/png', 'image/webp'],
          maximumSizeInBytes: 5 * 1024 * 1024,
          addRandomSuffix: true,
          tokenPayload: clientPayload
        };
      },
      onUploadCompleted: async () => {}
    });

    return NextResponse.json(jsonResponse);
  } catch (error) {
    return NextResponse.json({ error: 'Upload could not be authorized.' }, { status: 400 });
  }
}
