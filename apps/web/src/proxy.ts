import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { pageFromSlug } from './lib/marketing/site';
import { isAuthPage } from './lib/auth/routes';
import { readServerSession } from './lib/auth/server';

// Reject before rendering so the app's loading boundary cannot stream HTTP 200.
export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  if ((path === '/dev' || path.startsWith('/dev/')) && process.env.NODE_ENV !== 'development') {
    return new NextResponse('Not Found', {
      status: 404,
      headers: { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' },
    });
  }
  if (path === '/') return NextResponse.redirect(new URL('/en', request.url), 308);
  const headers = new Headers(request.headers);
  headers.delete('x-ventro-locale');
  const locale = path.match(/^\/(en|ar)(?:\/|$)/)?.[1];
  const slug = path.split('/').filter(Boolean).slice(1);
  const authPage = slug.length === 1 && isAuthPage(slug[0]!) ? slug[0] : undefined;
  if (locale && !pageFromSlug(slug) && !authPage)
    return new NextResponse('Not Found', { status: 404, headers: { 'Cache-Control': 'no-store' } });
  if (locale) headers.set('x-ventro-locale', locale);
  if (locale && authPage === 'account') {
    try {
      const result = await readServerSession(request.headers.get('cookie'));
      if (!result.session) {
        const url = new URL('/' + locale + '/login', request.url);
        url.searchParams.set('next', '/' + locale + '/account');
        const response = NextResponse.redirect(url);
        response.headers.set('Cache-Control', 'no-store');
        for (const cookie of result.cookies) response.headers.append('Set-Cookie', cookie);
        return response;
      }
    } catch {
      return new NextResponse(
        locale === 'ar'
          ? 'الحساب غير متاح مؤقتًا. يرجى المحاولة مجددًا.'
          : 'Account temporarily unavailable. Please try again.',
        {
          status: 503,
          headers: { 'Cache-Control': 'no-store', 'Content-Type': 'text/plain; charset=utf-8' },
        },
      );
    }
  }
  const response = NextResponse.next({ request: { headers } });
  if (authPage) response.headers.set('Cache-Control', 'no-store');
  return response;
}

export const config = { matcher: ['/', '/en/:path*', '/ar/:path*', '/dev/:path*'] };
