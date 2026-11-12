import type { MetadataRoute } from 'next';
import { site } from '../lib/marketing/config';
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: site.indexing ? '/' : undefined,
        disallow: site.indexing ? ['/api/', '/dev/'] : '/',
      },
    ],
    sitemap: site.origin + '/sitemap.xml',
  };
}
