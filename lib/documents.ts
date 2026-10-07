export const LIBRARY_PREFIX = 'library/';
export const MAX_FILE_SIZE_BYTES = 100 * 1024 * 1024;

export type LibraryKind = 'pdf' | 'ppt' | 'pptx';

export type ParsedLibraryPath = {
  id: string;
  title: string;
  fileName: string;
  kind: LibraryKind;
  extension: `.${LibraryKind}`;
};

const UUID_PATTERN = /^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
const TITLE_KEY_PATTERN = /^[A-Za-z0-9_-]{1,640}$/;
const FILE_NAME_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{0,150}$/;

export function isBlobConfigured(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

export function parseLibraryPath(pathname: string): ParsedLibraryPath | null {
  if (typeof pathname !== 'string' || pathname.length > 900) return null;
  const parts = pathname.split('/');
  if (parts.length !== 4 || parts[0] !== 'library') return null;

  const [, id, titleKey, fileName] = parts;
  if (!UUID_PATTERN.test(id) || !TITLE_KEY_PATTERN.test(titleKey) || !FILE_NAME_PATTERN.test(fileName)) {
    return null;
  }

  const extensionMatch = /\.(pdf|pptx?)$/i.exec(fileName);
  if (!extensionMatch) return null;
  const extension = `.${extensionMatch[1].toLowerCase()}` as `.${LibraryKind}`;
  const kind = extension.slice(1) as LibraryKind;

  try {
    const title = Buffer.from(titleKey, 'base64url').toString('utf8').trim();
    if (!title || title.length > 120 || Buffer.from(title, 'utf8').toString('base64url') !== titleKey) {
      return null;
    }
    return { id, title, fileName, kind, extension };
  } catch {
    return null;
  }
}

export function mimeTypeForKind(kind: LibraryKind): string {
  switch (kind) {
    case 'pdf':
      return 'application/pdf';
    case 'ppt':
      return 'application/vnd.ms-powerpoint';
    case 'pptx':
      return 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
  }
}
