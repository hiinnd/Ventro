import type { Locale } from '@ventro/types';
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
