import { NextResponse } from 'next/server';
import { authSessionSchema, authUserSchema } from '@ventro/types';
import { authApiUrl } from '../../../../lib/auth/server';
import { authCookieHeader, isSafeAuthMutation } from '../../../../lib/auth/routes';
export const dynamic = 'force-dynamic';
const methods: Record<string, string[]> = {
  register: ['POST'],
  login: ['POST'],
  logout: ['POST'],
  session: ['GET'],
  profile: ['GET', 'PATCH'],
  renew: ['POST'],
  'verify-email': ['POST'],
  'resend-verification': ['POST'],
  'forgot-password': ['POST'],
  'reset-password': ['POST'],
};
const failure = (status: number, message: string) =>
  NextResponse.json({ message }, { status, headers: { 'Cache-Control': 'no-store' } });
class BodyError extends Error {
  constructor(readonly status: number) {
    super('Invalid request');
  }
}
async function readBody(request: Request): Promise<string> {
  if (Number(request.headers.get('content-length')) > 16384) throw new BodyError(413);
  const reader = request.body?.getReader();
  if (!reader) throw new BodyError(400);
  const chunks: Uint8Array[] = [];
  let length = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    length += value.byteLength;
    if (length > 16384) {
      await reader.cancel();
      throw new BodyError(413);
    }
    chunks.push(value);
  }
  const body = JSON.parse(Buffer.concat(chunks).toString('utf8')) as unknown;
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new BodyError(400);
  return JSON.stringify(body);
}
async function handle(request: Request, { params }: { params: Promise<{ action: string }> }) {
  const { action } = await params;
  if (!Object.hasOwn(methods, action)) return failure(404, 'Resource not found');
  if (!methods[action]!.includes(request.method)) return failure(405, 'Method not allowed');
  const mutation = request.method !== 'GET';
  const origin = request.headers.get('origin');
  const allowed = (process.env.WEB_ORIGINS ?? 'http://127.0.0.1:3000,http://localhost:3000')
    .split(',')
    .map((value) => value.trim());
  if (mutation && !isSafeAuthMutation(request, allowed))
    return failure(403, 'Request origin is not allowed');
  let body: string | undefined;
  if (mutation) {
    try {
      body = await readBody(request);
    } catch (error) {
      return failure(error instanceof BodyError ? error.status : 400, 'Invalid request');
    }
  }
  try {
    const headers = new Headers({ Cookie: authCookieHeader(request.headers.get('cookie')) });
    if (mutation) {
      headers.set('Content-Type', 'application/json');
      headers.set('Origin', origin!);
      headers.set('X-Ventro-CSRF', '1');
    }
    const upstream = await fetch(authApiUrl(action), {
      method: request.method,
      headers,
      body,
      cache: 'no-store',
      redirect: 'error',
      signal: AbortSignal.timeout(15000),
    });
    const responseHeaders = new Headers({ 'Cache-Control': 'no-store' });
    for (const cookie of upstream.headers.getSetCookie())
      responseHeaders.append('Set-Cookie', cookie);
    const retry = upstream.headers.get('retry-after');
    if (retry && /^\d+$/.test(retry)) responseHeaders.set('Retry-After', retry);
    if (upstream.status === 204)
      return new NextResponse(null, { status: 204, headers: responseHeaders });
    if (!upstream.ok)
      return NextResponse.json(
        {
          message:
            upstream.status === 401
              ? 'Sign in again or check your credentials.'
              : upstream.status === 429
                ? 'Too many attempts. Please try again later.'
                : upstream.status >= 500
                  ? 'Authentication temporarily unavailable.'
                  : 'The request could not be completed. Check your input or request a new link.',
        },
        { status: upstream.status, headers: responseHeaders },
      );
    const payload: unknown = await upstream.json();
    const data = ['login', 'session', 'renew'].includes(action)
      ? authSessionSchema.parse(payload)
      : action === 'profile'
        ? authUserSchema.parse(payload)
        : payload &&
            typeof payload === 'object' &&
            'message' in payload &&
            typeof payload.message === 'string'
          ? { message: payload.message }
          : undefined;
    if (!data) throw new Error('Invalid authentication response');
    return NextResponse.json(data, { status: upstream.status, headers: responseHeaders });
  } catch {
    return failure(502, 'Authentication temporarily unavailable. Please try again.');
  }
}
export { handle as GET, handle as POST, handle as PATCH };
