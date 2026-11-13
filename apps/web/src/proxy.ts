import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { pageFromSlug } from './lib/marketing/site';
import { isAuthPage } from './lib/auth/routes';
import { readServerSession } from './lib/auth/server';
import { authApiUrl } from './lib/auth/server';
import { authCookieHeader } from './lib/auth/routes';
import { workspacePage } from './lib/organizations/routes';
import { hasOrganizationPermission, organizationSchema } from '@ventro/types';

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
  const workspace = workspacePage(slug);
  const publicEvents = slug[0] === 'events' && (slug.length === 1 || (slug.length === 2 && /^[a-z0-9-]{1,120}$/.test(slug[1]!)));
  const registrationsPage = slug[0] === 'registrations' && (slug.length === 1 || (slug.length === 2 && slug[1] === 'confirmation'));
  if (locale && !pageFromSlug(slug) && !publicEvents && !registrationsPage && !authPage && !workspace)
    return new NextResponse('Not Found', { status: 404, headers: { 'Cache-Control': 'no-store' } });
  if (locale) headers.set('x-ventro-locale', locale);
  if (locale && (authPage === 'account' || workspace || registrationsPage)) {
    try {
      const result = await readServerSession(request.headers.get('cookie'));
      if (!result.session) {
        const url = new URL('/' + locale + '/login', request.url);
        url.searchParams.set('next', workspace || registrationsPage ? path : '/' + locale + '/account');
        const response = NextResponse.redirect(url);
        response.headers.set('Cache-Control', 'no-store');
        for (const cookie of result.cookies) response.headers.append('Set-Cookie', cookie);
        return response;
      }
      if (workspace === 'platform' && result.session.user.platformRole !== 'PLATFORM_ADMIN')
        return new NextResponse(locale === 'ar' ? 'الوصول غير مسموح.' : 'Access is not allowed.', {
          status: 403,
          headers: { 'Cache-Control': 'no-store' },
        });
      if (workspace === 'team' || workspace === 'settings' || workspace === 'dashboard') {
        const upstream = await fetch(
          new URL('/api/v1/organizations/' + slug[1], authApiUrl('session')),
          {
            headers: { Cookie: authCookieHeader(request.headers.get('cookie')) },
            cache: 'no-store',
            redirect: 'error',
            signal: AbortSignal.timeout(6000),
          },
        );
        if (upstream.status === 403 || upstream.status === 401)
          return new NextResponse(
            locale === 'ar'
              ? 'الوصول غير مسموح. تحقق من عضويتك وبريدك.'
              : 'Access is not allowed. Check your membership and email verification.',
            { status: 403, headers: { 'Cache-Control': 'no-store' } },
          );
        if (!upstream.ok) throw new Error('Organization unavailable');
        const org = organizationSchema.parse(await upstream.json());
        if (workspace === 'dashboard' && !hasOrganizationPermission(org.role, 'dashboard:read'))
          return new NextResponse(
            locale === 'ar' ? 'الوصول للمنظّمين فقط.' : 'Organizer access is required.',
            { status: 403, headers: { 'Cache-Control': 'no-store' } },
          );
        if (workspace === 'team' && !hasOrganizationPermission(org.role, 'team:read'))
          return new NextResponse(
            locale === 'ar' ? 'الوصول غير مسموح.' : 'Access is not allowed.',
            { status: 403, headers: { 'Cache-Control': 'no-store' } },
          );
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
  if (authPage || workspace || registrationsPage) {
    response.headers.set('Cache-Control', 'no-store');
    response.headers.set('X-Robots-Tag', 'noindex');
  }
  return response;
}

export const config = { matcher: ['/', '/en/:path*', '/ar/:path*', '/dev/:path*'] };
