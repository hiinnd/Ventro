import type { MetadataRoute } from 'next';
import { site } from '../lib/marketing/config';
import { locales, pageKeys, route } from '../lib/marketing/site';
export default function sitemap(): MetadataRoute.Sitemap {
  return locales.flatMap((locale) =>
    pageKeys.map((page) => ({
      url: site.origin + route(locale, page),
      lastModified: ['about', 'privacy', 'terms', 'faq'].includes(page)
        ? '2026-11-13'
        : '2026-11-12',
      changeFrequency: page === 'home' ? ('weekly' as const) : ('monthly' as const),
      priority: page === 'home' ? 1 : page === 'privacy' || page === 'terms' ? 0.3 : 0.7,
      alternates: {
        languages: { en: site.origin + route('en', page), ar: site.origin + route('ar', page) },
      },
    })),
  );
}
