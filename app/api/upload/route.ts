import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { isAuthenticated } from '@/lib/auth';
import { isBlobConfigured, MAX_FILE_SIZE_BYTES, mimeTypeForKind, parseLibraryPath } from '@/lib/documents';

export const runtime = 'nodejs';

const ALLOWED_CONTENT_TYPES = [
  'application/pdf',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
];

export async function POST(request: Request): Promise<Response> {
  if (!isBlobConfigured()) {
    return Response.json({ error: 'Connect a Vercel Blob store before uploading.' }, { status: 503 });
  }

  let body: HandleUploadBody;
  try {
    body = (await request.json()) as HandleUploadBody;
  } catch {
    return Response.json({ error: 'The upload request was not valid.' }, { status: 400 });
  }

  try {
    const result = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        if (!isAuthenticated(request)) throw new Error('Not authenticated');
        const parsed = parseLibraryPath(pathname);
        if (!parsed) throw new Error('Choose a PDF, PPT, or PPTX with a custom name.');
        return {
          allowedContentTypes: [mimeTypeForKind(parsed.kind)],
          maximumSizeInBytes: MAX_FILE_SIZE_BYTES,
          addRandomSuffix: false,
        };
      },
      onUploadCompleted: async ({ blob }) => {
        if (!parseLibraryPath(blob.pathname)) {
          throw new Error('The uploaded file did not match the library format.');
        }
      },
    });
    return Response.json(result, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'The upload could not be completed.';
    const status = message.toLowerCase().includes('not authenticated') ? 401 : 400;
    return Response.json({ error: message }, { status, headers: { 'Cache-Control': 'no-store' } });
  }
}
