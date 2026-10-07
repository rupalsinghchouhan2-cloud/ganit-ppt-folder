import { createHmac, timingSafeEqual } from 'node:crypto';

const COOKIE_NAME = 'ganit_ppt_folder_admin';
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

type SessionPayload = {
  username: string;
  expiresAt: number;
};

export function isAuthConfigured(): boolean {
  const secret = process.env.SESSION_SECRET ?? '';
  return Boolean(
    process.env.ADMIN_USERNAME &&
      process.env.ADMIN_PASSWORD &&
      Buffer.byteLength(secret, 'utf8') >= 32,
  );
}

function safeEqual(left: string, right: string): boolean {
  const leftBytes = Buffer.from(left, 'utf8');
  const rightBytes = Buffer.from(right, 'utf8');
  return leftBytes.length === rightBytes.length && timingSafeEqual(leftBytes, rightBytes);
}

function sign(payload: string): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret || Buffer.byteLength(secret, 'utf8') < 32) {
    throw new Error('SESSION_SECRET must be at least 32 characters.');
  }
  return createHmac('sha256', secret).update(payload).digest('base64url');
}

export function credentialsAreValid(username: string, password: string): boolean {
  const expectedUsername = process.env.ADMIN_USERNAME ?? '';
  const expectedPassword = process.env.ADMIN_PASSWORD ?? '';
  return Boolean(
    isAuthConfigured() &&
      safeEqual(username, expectedUsername) &&
      safeEqual(password, expectedPassword),
  );
}

export function createSessionCookie(username: string): string {
  const expiresAt = Math.floor(Date.now() / 1000) + SESSION_MAX_AGE_SECONDS;
  const payload = Buffer.from(
    JSON.stringify({ username, expiresAt } satisfies SessionPayload),
    'utf8',
  ).toString('base64url');
  const token = `${payload}.${sign(payload)}`;
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  return `${COOKIE_NAME}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${SESSION_MAX_AGE_SECONDS}${secure}`;
}

export function clearSessionCookie(): string {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  return `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0${secure}`;
}

export function isAuthenticated(request: Request): boolean {
  if (!isAuthConfigured()) return false;

  const cookieHeader = request.headers.get('cookie') ?? '';
  const prefix = `${COOKIE_NAME}=`;
  const cookie = cookieHeader
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(prefix));
  if (!cookie) return false;

  const token = cookie.slice(prefix.length);
  const [payload, providedSignature, ...extra] = token.split('.');
  if (!payload || !providedSignature || extra.length > 0) return false;

  try {
    const expectedSignature = Buffer.from(sign(payload), 'base64url');
    const actualSignature = Buffer.from(providedSignature, 'base64url');
    if (
      expectedSignature.length !== actualSignature.length ||
      !timingSafeEqual(expectedSignature, actualSignature)
    ) {
      return false;
    }

    const session = JSON.parse(
      Buffer.from(payload, 'base64url').toString('utf8'),
    ) as Partial<SessionPayload>;
    return (
      session.username === process.env.ADMIN_USERNAME &&
      typeof session.expiresAt === 'number' &&
      session.expiresAt > Math.floor(Date.now() / 1000)
    );
  } catch {
    return false;
  }
}
