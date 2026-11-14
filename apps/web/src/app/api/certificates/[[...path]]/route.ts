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
export async function PATCH(request: Request, context: { params: Promise<{ path?: string[] }> }) {
  return relay(request, context);
}
async function relay(request: Request, context: { params: Promise<{ path?: string[] }> }) {
  const path = (await context.params).path ?? [];
  if (path.some((part) => !/^[a-z0-9-]{1,120}$/.test(part)))
    return NextResponse.json({ message: 'Resource unavailable' }, { status: 404 });
  const headers = new Headers({ Cookie: authCookieHeader(request.headers.get('cookie')) });
  let body: string | undefined;
  if (request.method !== 'GET') {
    const origins = (process.env.WEB_ORIGINS ?? 'http://127.0.0.1:3000,http://localhost:3000')
      .split(',')
      .map((origin) => origin.trim());
    if (!isSafeAuthMutation(request, origins))
      return NextResponse.json({ message: 'Request origin is not allowed' }, { status: 403 });
    body = await request.text();
    if (body.length > 16384)
      return NextResponse.json({ message: 'Request too large' }, { status: 413 });
    headers.set('Content-Type', 'application/json');
    headers.set('Origin', request.headers.get('origin')!);
    headers.set('X-Ventro-CSRF', '1');
  }
  try {
    const upstream = await fetch(new URL('/api/v1/' + path.join('/'), authApiUrl('session')), {
      method: request.method,
      headers,
      body,
      cache: 'no-store',
    });
    if (upstream.headers.get('content-type')?.includes('application/pdf'))
      return new NextResponse(upstream.body, {
        status: upstream.status,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': upstream.headers.get('content-disposition') ?? 'attachment',
          'Cache-Control': 'private, no-store',
        },
      });
    return NextResponse.json(await upstream.json().catch(() => ({})), {
      status: upstream.status,
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch {
    return NextResponse.json({ message: 'Certificates temporarily unavailable' }, { status: 502 });
  }
}
