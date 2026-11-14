import type { Locale } from '@ventro/types';
import { workspacePage } from '../organizations/routes';
export function safeLoginDestination(value: string | null, locale: Locale): string {
  if (value && value.startsWith('/' + locale + '/') && !/[?#%\\]/.test(value)) {
    const eventRoom = new RegExp(
      '^/' + locale + '/events/[a-z0-9-]{1,120}/(?:live|presenter)$',
    ).test(value);
    if (
      value === '/' + locale + '/account' ||
      workspacePage(value.split('/').slice(2)) ||
      eventRoom
    )
      return value;
  }
  return '/' + locale + '/account';
}
export const authPages = [
  'login',
  'register',
  'forgot-password',
  'reset-password',
  'verify-email',
  'account',
] as const;
export type AuthPage = (typeof authPages)[number];
export const authRoute = (locale: Locale, page: AuthPage) => '/' + locale + '/' + page;
export const isAuthPage = (value: string): value is AuthPage =>
  authPages.some((page) => page === value);
export function isSafeAuthMutation(
  request: Request,
  allowedOrigins: readonly string[],
  contentType = 'application/json',
): boolean {
  try {
    const origin = request.headers.get('origin');
    if (!origin || !allowedOrigins.includes(origin)) return false;
    const url = new URL(origin);
    // Next may canonicalize request.url to localhost; bind to the browser-facing Host instead.
    return (
      url.origin === origin &&
      url.host === request.headers.get('host') &&
      request.headers.get('x-ventro-csrf') === '1' &&
      request.headers.get('sec-fetch-site') !== 'cross-site' &&
      request.headers.get('content-type')?.split(';')[0]?.trim().toLowerCase() === contentType
    );
  } catch {
    return false;
  }
}
export function authCookieHeader(value: string | null): string {
  const parts =
    value
      ?.split(';')
      .map((part) => part.trim())
      .filter((part) => /^(?:__Host-ventro_session|ventro_session)=/.test(part)) ?? [];
  if (
    parts.length > 2 ||
    new Set(parts.map((part) => part.split('=')[0])).size !== parts.length ||
    parts.some((part) => !/^(?:__Host-ventro_session|ventro_session)=[a-f0-9]{64}$/.test(part))
  )
    return '';
  return parts.join('; ');
}
