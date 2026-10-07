import { isAuthenticated, isAuthConfigured } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: Request): Promise<Response> {
  return Response.json(
    { authenticated: isAuthenticated(request), configured: isAuthConfigured() },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
