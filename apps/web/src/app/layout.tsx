import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { headers } from 'next/headers';
import { Providers } from '../components/providers';
import { site } from '../lib/marketing/config';
import './globals.css';
export const metadata: Metadata = {
  title: 'VENTRO — Every Event. Beyond the Moment.',
  description: 'A connected event experience being built for Jordan and the MENA region.',
  metadataBase: new URL(site.origin),
  robots: { index: site.indexing, follow: site.indexing },
  icons: { icon: [{ url: '/brand/favicon.svg', type: 'image/svg+xml' }] },
};
export default async function RootLayout({ children }: { children: ReactNode }) {
  const value = (await headers()).get('x-ventro-locale');
  const locale = value === 'ar' || value === 'en' ? value : undefined;
  return (
    <html
      lang={locale ?? 'en'}
      dir={locale === 'ar' ? 'rtl' : 'ltr'}
      data-scroll-behavior="smooth"
      suppressHydrationWarning
    >
      <body className="font-sans antialiased">
        <Providers initialLocale={locale}>{children}</Providers>
      </body>
    </html>
  );
}
