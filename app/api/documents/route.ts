import { del, list } from '@vercel/blob';
import { isAuthenticated } from '@/lib/auth';
import { isBlobConfigured, LIBRARY_PREFIX, parseLibraryPath } from '@/lib/documents';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(): Promise<Response> {
  if (!isBlobConfigured()) {
    return Response.json(
      { error: 'The library storage is not connected yet. Add a Vercel Blob store to get started.' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } },
    );
  }

  try {
    const blobs: Array<{
      pathname: string;
      url: string;
      downloadUrl?: string;
      size: number;
      uploadedAt: Date | string;
    }> = [];
    let cursor: string | undefined;

    do {
      const page = await list({
        prefix: LIBRARY_PREFIX,
        limit: 1000,
        ...(cursor ? { cursor } : {}),
      });
      blobs.push(...page.blobs);
      cursor = page.hasMore ? page.cursor : undefined;
    } while (cursor);

    const documents = blobs.flatMap((blob) => {
      const parsed = parseLibraryPath(blob.pathname);
      if (!parsed) return [];
      const uploadedAt = blob.uploadedAt instanceof Date
        ? blob.uploadedAt.toISOString()
        : new Date(blob.uploadedAt).toISOString();
      return [{
        ...parsed,
        pathname: blob.pathname,
        url: blob.url,
        downloadUrl: blob.downloadUrl ?? `${blob.url}?download=1`,
        size: blob.size,
        uploadedAt,
      }];
    }).sort((a, b) => Date.parse(b.uploadedAt) - Date.parse(a.uploadedAt));

    return Response.json(documents, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('Could not list library files:', error);
    return Response.json(
      { error: 'The shelf could not load right now. Please try again in a moment.' },
      { status: 500, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}

export async function DELETE(request: Request): Promise<Response> {
  if (!isAuthenticated(request)) {
    return Response.json({ error: 'Please sign in as an administrator.' }, { status: 401 });
  }
  if (!isBlobConfigured()) {
    return Response.json({ error: 'Connect a Vercel Blob store before managing files.' }, { status: 503 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'A file was not selected.' }, { status: 400 });
  }
  const pathname = (body as { pathname?: unknown })?.pathname;
  if (typeof pathname !== 'string' || !pathname.startsWith(LIBRARY_PREFIX) || !parseLibraryPath(pathname)) {
    return Response.json({ error: 'That file is not part of this library.' }, { status: 400 });
  }

  try {
    await del(pathname);
    return Response.json({ ok: true });
  } catch (error) {
    console.error('Could not delete library file:', error);
    return Response.json({ error: 'That file could not be removed. Please try again.' }, { status: 500 });
  }
}
