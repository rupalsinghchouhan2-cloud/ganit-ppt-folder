import { createSessionCookie, credentialsAreValid, isAuthConfigured } from '@/lib/auth';

export async function POST(request: Request): Promise<Response> {
  if (!isAuthConfigured()) {
    return Response.json(
      { error: 'Admin sign-in is not configured yet. Add the required environment variables in Vercel.' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Please enter your username and password.' }, { status: 400 });
  }

  const input = body as { username?: unknown; password?: unknown };
  const username = typeof input.username === 'string' ? input.username : '';
  const password = typeof input.password === 'string' ? input.password : '';

  if (!credentialsAreValid(username, password)) {
    return Response.json(
      { error: 'That username and password do not match.' },
      { status: 401, headers: { 'Cache-Control': 'no-store' } },
    );
  }

  return Response.json(
    { ok: true },
    {
      headers: {
        'Set-Cookie': createSessionCookie(username),
        'Cache-Control': 'no-store',
      },
    },
  );
}
