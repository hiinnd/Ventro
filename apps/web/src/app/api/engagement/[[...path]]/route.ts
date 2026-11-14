import { NextResponse } from 'next/server';
import { authCookieHeader, isSafeAuthMutation } from '../../../../lib/auth/routes';
import { authApiUrl } from '../../../../lib/auth/server';
export const dynamic = 'force-dynamic';
export async function GET(request: Request, context: { params: Promise<{ path?: string[] }> }) {
  return relay(request, context);
}
export async function POST(request: Request, context: { params: Promise<{ path?: string[] }> }) {
  return relay(request, context);
}
async function relay(request: Request, context: { params: Promise<{ path?: string[] }> }) {
  const path = (await context.params).path ?? [];
  if (path.some((x) => !/^[a-z0-9-]{1,120}$/.test(x)))
    return NextResponse.json({ message: 'Resource unavailable' }, { status: 404 });
  const url = new URL('/api/v1/engagement/' + path.join('/'), authApiUrl('session'));
  const headers = new Headers({ Cookie: authCookieHeader(request.headers.get('cookie')) });
  let body: string | undefined;
  if (request.method === 'POST') {
    const allowed = (process.env.WEB_ORIGINS ?? 'http://127.0.0.1:3000,http://localhost:3000')
      .split(',')
      .map((x) => x.trim());
    if (!isSafeAuthMutation(request, allowed))
      return NextResponse.json({ message: 'Request origin is not allowed' }, { status: 403 });
    body = await request.text();
    if (body.length > 16384)
      return NextResponse.json({ message: 'Request too large' }, { status: 413 });
    headers.set('Content-Type', 'application/json');
    headers.set('Origin', request.headers.get('origin')!);
    headers.set('X-Ventro-CSRF', '1');
  }
  try {
    const response = await fetch(url, { method: request.method, headers, body, cache: 'no-store' });
    return NextResponse.json(await response.json().catch(() => ({})), {
      status: response.status,
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch {
    return NextResponse.json({ message: 'Engagement temporarily unavailable' }, { status: 502 });
  }
}
