import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const body = (await request.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      request,
      body,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        if (!clientPayload || !pathname.startsWith('profiles/')) {
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
