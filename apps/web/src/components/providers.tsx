'use client';
import { ThemeProvider } from 'next-themes';
import { MotionConfig } from 'motion/react';
import type { ReactNode } from 'react';
import { LocaleProvider } from './locale-provider';
import type { Locale } from '@ventro/types';
export function Providers({
  children,
  initialLocale,
}: {
  children: ReactNode;
  initialLocale?: Locale;
}) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <MotionConfig reducedMotion="user">
        <LocaleProvider initialLocale={initialLocale}>{children}</LocaleProvider>
      </MotionConfig>
    </ThemeProvider>
  );
}
