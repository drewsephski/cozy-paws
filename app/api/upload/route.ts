import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { uploadAuthorization } from '@/lib/uploads';
import { headers } from 'next/headers';

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });

  const body = (await request.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      request,
      body,
      onBeforeGenerateToken: (pathname, clientPayload) =>
        uploadAuthorization.authorize({
          userId: session.user.id,
          pathname,
          clientPayload
        }),
      onUploadCompleted: async () => {}
    });

    return NextResponse.json(jsonResponse);
  } catch {
    return NextResponse.json({ error: 'Upload could not be authorized.' }, { status: 400 });
  }
}
