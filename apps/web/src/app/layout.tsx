import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { Providers } from '../components/providers';
import './globals.css';
export const metadata: Metadata = {
  title: 'VENTRO — Every Event. Beyond the Moment.',
  description:
    'The foundation of VENTRO, an event management platform for Jordan and the MENA region.',
  robots: { index: false, follow: false },
};
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" dir="ltr" suppressHydrationWarning>
      <body className="font-sans antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
