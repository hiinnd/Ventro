'use client';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { DirectionProvider, ToastProvider, TooltipProvider } from '@ventro/ui';
import type { Locale } from '@ventro/types';

const LocaleContext = createContext<{ locale: Locale; setLocale: (locale: Locale) => void } | null>(
  null,
);
export function LocaleProvider({
  children,
  initialLocale,
}: {
  children: ReactNode;
  initialLocale?: Locale;
}) {
  const [locale, setLocale] = useState<Locale>(initialLocale ?? 'en');
  const [preferenceLoaded, setPreferenceLoaded] = useState(initialLocale !== undefined);
  useEffect(() => {
    if (initialLocale) {
      setLocale(initialLocale);
      setPreferenceLoaded(true);
      return;
    }
    try {
      const value = localStorage.getItem('ventro-locale');
      if (value === 'en' || value === 'ar') setLocale(value);
    } catch {
      /* Storage is optional. */
    }
    setPreferenceLoaded(true);
  }, [initialLocale]);
  useEffect(() => {
    if (!preferenceLoaded) return;
    document.documentElement.lang = locale;
    document.documentElement.dir = locale === 'ar' ? 'rtl' : 'ltr';
    try {
      localStorage.setItem('ventro-locale', locale);
    } catch {
      /* Storage is optional. */
    }
  }, [locale, preferenceLoaded]);
  const labels =
    locale === 'ar'
      ? { dismiss: 'إغلاق الإشعار', viewport: 'الإشعارات', notification: 'إشعار' }
      : {
          dismiss: 'Dismiss notification',
          viewport: 'Notifications',
          notification: 'Notification',
        };
  return (
    <LocaleContext.Provider value={{ locale, setLocale }}>
      <DirectionProvider dir={locale === 'ar' ? 'rtl' : 'ltr'}>
        <ToastProvider labels={labels}>
          <TooltipProvider delayDuration={250}>{children}</TooltipProvider>
        </ToastProvider>
      </DirectionProvider>
    </LocaleContext.Provider>
  );
}
export function useLocale() {
  const context = useContext(LocaleContext);
  if (!context) throw new Error('useLocale requires LocaleProvider');
  return context;
}
