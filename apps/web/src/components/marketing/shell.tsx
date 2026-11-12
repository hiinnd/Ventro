'use client';
import { useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTheme } from 'next-themes';
import type { Locale } from '@ventro/types';
import {
  BrandLogo,
  Button,
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Icon,
} from '@ventro/ui';
import { useLocale } from '../locale-provider';
import { route, text, type PublicPage } from '../../lib/marketing/site';

export function MarketingShell({
  locale,
  children,
  currentPage,
  year,
}: {
  locale: Locale;
  children: ReactNode;
  currentPage: PublicPage;
  year: number;
}) {
  const { setLocale } = useLocale();
  const { resolvedTheme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  useEffect(() => {
    setLocale(locale);
  }, [locale, setLocale]);
  const t = (en: string, ar: string) => text(locale, en, ar);
  const links = [
    ['features', t('Features', 'المزايا')],
    ['solutions', t('Solutions', 'الحلول')],
    ['pricing', t('Pricing', 'الباقات')],
    ['about', t('About', 'عن VENTRO')],
    ['faq', t('FAQ', 'الأسئلة الشائعة')],
    ['contact', t('Contact', 'تواصل معنا')],
  ] as const;
  const otherLocale = locale === 'en' ? 'ar' : 'en';
  const languageHref = pathname.replace(/^\/(en|ar)(?=\/|$)/, '/' + otherLocale);
  return (
    <div className="marketing" data-marketing-locale={locale}>
      <a className="m-skip ui-focus" href="#main-content">
        {t('Skip to content', 'انتقل إلى المحتوى')}
      </a>
      <div className="m-announcement">
        <span className="m-status-dot" aria-hidden />
        {t('A new event experience is taking shape.', 'تجربة جديدة للفعاليات تتشكّل.')}
        <Link href={route(locale, 'features')}>
          {t('Explore the product vision', 'استكشف رؤية المنتج')}
          <span aria-hidden>↗</span>
        </Link>
      </div>
      <header className="m-header">
        <div className="m-container m-header-inner">
          <Link
            href={route(locale)}
            aria-label={t('VENTRO home', 'الرئيسية VENTRO')}
            className="ui-focus m-brand"
          >
            <BrandLogo decorative className="h-9 w-auto" />
          </Link>
          <nav className="m-desktop-nav" aria-label={t('Main navigation', 'التنقّل الرئيسي')}>
            {links.map(([page, label]) => (
              <Link
                key={page}
                className="ui-focus m-nav-link"
                href={route(locale, page)}
                aria-current={currentPage === page ? 'page' : undefined}
              >
                {label}
              </Link>
            ))}
          </nav>
          <div className="m-header-actions">
        <Link href={'/' + locale + '/login'} className="ui-focus m-nav-link m-account-link">{t('Sign in', 'تسجيل الدخول')}</Link>
            <Link
              className="ui-focus m-language"
              href={languageHref}
              lang={otherLocale}
              hrefLang={otherLocale}
            >
              {locale === 'en' ? 'العربية' : 'English'}
            </Link>
            <Button
              variant="ghost"
              size="icon"
              aria-label={t('Change color theme', 'تغيير مظهر الألوان')}
              onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
            >
              <Icon name="theme" />
            </Button>
            <Button asChild className="m-header-cta" size="sm">
              <Link href={route(locale, 'contact') + '?intent=early-access'}>
                {t('Early access', 'وصول مبكر')}
                <span aria-hidden>↗</span>
              </Link>
            </Button>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button
                  className="m-menu-trigger"
                  variant="outline"
                  size="icon"
                  aria-label={t('Open navigation', 'فتح التنقّل')}
                >
                  <Icon name="menu" />
                </Button>
              </DialogTrigger>
              <DialogContent closeLabel={t('Close navigation', 'إغلاق التنقّل')}>
                <DialogHeader>
                  <DialogTitle>{t('Explore VENTRO', 'استكشف VENTRO')}</DialogTitle>
                  <DialogDescription>
                    {t('Every event. Every next step.', 'لكل فعالية. ولكل خطوة قادمة.')}
                  </DialogDescription>
                </DialogHeader>
                <nav aria-label={t('Mobile navigation', 'تنقّل الموبايل')} className="m-mobile-nav">
                  {links.map(([page, label]) => (
                    <DialogClose key={page} asChild>
                      <Link
                        href={route(locale, page)}
                        aria-current={currentPage === page ? 'page' : undefined}
                        className="ui-focus"
                      >
                        {label}
                        <Icon name="next" className="rtl:rotate-180" />
                      </Link>
                    </DialogClose>
                  ))}
                  <DialogClose asChild><Link className="ui-focus" href={'/' + locale + '/login'}>{t('Sign in', 'تسجيل الدخول')}<Icon name="next" className="rtl:rotate-180" /></Link></DialogClose>
                </nav>
                <DialogClose asChild>
                  <Button asChild className="mt-6 w-full">
                    <Link href={route(locale, 'contact') + '?intent=early-access'}>
                      {t('Explore early access', 'استكشف الوصول المبكر')}
                    </Link>
                  </Button>
                </DialogClose>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </header>
      <main id="main-content" tabIndex={-1}>
        {children}
      </main>
      <footer className="m-footer">
        <div className="m-container">
          <div className="m-footer-top">
            <div className="m-footer-brand">
              <Link
                href={route(locale)}
                className="ui-focus"
                aria-label={t('VENTRO home', 'الرئيسية VENTRO')}
              >
                <BrandLogo decorative className="h-10 w-auto" />
              </Link>
              <p lang="en" dir="ltr">
                Every Event. Beyond the Moment.
              </p>
              <p>{t('Rooted in Jordan. Building for MENA.', 'من الأردن، نبني للمنطقة.')}</p>
              <span className="m-caption">{t('Public product preview', 'معاينة عامة للمنتج')}</span>
            </div>
            <div>
              <h2>{t('Explore', 'استكشف')}</h2>
              <nav aria-label={t('Footer product navigation', 'تنقّل المنتج في التذييل')}>
                {links.slice(0, 3).map(([page, label]) => (
                  <Link key={page} href={route(locale, page)} className="ui-focus">
                    {label}
                  </Link>
                ))}
                <Link className="ui-focus" href={'/' + locale + '/login'}>{t('Sign in', 'تسجيل الدخول')}</Link>
              </nav>
            </div>
            <div>
              <h2>{t('Get to know us', 'تعرّف إلينا')}</h2>
              <nav aria-label={t('Footer company navigation', 'تنقّل الشركة في التذييل')}>
                {links.slice(3).map(([page, label]) => (
                  <Link key={page} href={route(locale, page)} className="ui-focus">
                    {label}
                  </Link>
                ))}
              </nav>
            </div>
            <div className="m-footer-note">
              <h2>{t('A thoughtful next chapter.', 'فصل قادم، باهتمام.')}</h2>
              <p>
                {t(
                  'Product capabilities are being developed. The interfaces shown are labeled concepts, not live event services.',
                  'مزايا المنتج قيد التطوير. الواجهات المعروضة تصوّرات موسومة بوضوح وليست خدمات فعاليات فعلية.',
                )}
              </p>
              <Link href={route(locale, 'contact')} className="ui-focus m-text-link">
                {t('Start a conversation', 'ابدأ حوارًا')} ↗
              </Link>
            </div>
          </div>
          <div className="m-footer-bottom">
            <span>© {year} VENTRO</span>
            <nav aria-label={t('Legal navigation', 'التنقّل القانوني')}>
              <Link className="ui-focus" href={route(locale, 'privacy')}>
                {t('Privacy Policy', 'سياسة الخصوصية')}
              </Link>
              <Link className="ui-focus" href={route(locale, 'terms')}>
                {t('Terms of Service', 'شروط الاستخدام')}
              </Link>
            </nav>
            <span className="m-photo-credit">
              {t('Illustrative photography:', 'صور توضيحية:')}{' '}
              <a href="https://unsplash.com/@pabloheimplatz" target="_blank" rel="noreferrer">
                Pablo Heimplatz
              </a>{' '}
              &{' '}
              <a href="https://unsplash.com/@chuttersnap" target="_blank" rel="noreferrer">
                CHUTTERSNAP
              </a>{' '}
              / Unsplash
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
