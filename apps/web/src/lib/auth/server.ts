import { authSessionSchema, type AuthSession } from '@ventro/types';
import { authCookieHeader } from './routes';
export function authApiUrl(action: string): URL {
  const url = new URL(process.env.API_INTERNAL_URL ?? 'http://127.0.0.1:4000');
  if (
    !['http:', 'https:'].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.pathname !== '/' ||
    url.search ||
    url.hash
  )
    throw new Error('Invalid internal API origin');
  return new URL('/api/v1/auth/' + action, url);
}
export async function readServerSession(
  cookie: string | null,
): Promise<{ session: AuthSession | null; cookies: string[] }> {
  const header = authCookieHeader(cookie);
  if (!header) return { session: null, cookies: [] };
  const response = await fetch(authApiUrl('session'), {
    headers: { Cookie: header },
    cache: 'no-store',
    signal: AbortSignal.timeout(6000),
    redirect: 'error',
  });
  if (response.status === 401) return { session: null, cookies: response.headers.getSetCookie() };
  if (!response.ok) throw new Error('Account temporarily unavailable');
  return { session: authSessionSchema.parse(await response.json()), cookies: [] };
}
