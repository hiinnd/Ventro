import type { Locale } from '@ventro/types';

export const pageKeys = [
  'home',
  'features',
  'solutions',
  'pricing',
  'about',
  'contact',
  'faq',
  'privacy',
  'terms',
] as const;
export type PublicPage = (typeof pageKeys)[number];
export const locales: Locale[] = ['en', 'ar'];
export const text = (locale: Locale, en: string, ar: string) => (locale === 'ar' ? ar : en);
export const route = (locale: Locale, page: PublicPage = 'home') =>
  '/' + locale + (page === 'home' ? '' : '/' + page);
export function isLocale(value: string): value is Locale {
  return value === 'en' || value === 'ar';
}
export function pageFromSlug(slug: string[] | undefined): PublicPage | undefined {
  if (!slug?.length) return 'home';
  return slug.length === 1 && pageKeys.some((key) => key !== 'home' && key === slug[0])
    ? (slug[0] as PublicPage)
    : undefined;
}
