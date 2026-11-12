import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { MarketingShell } from '../../../components/marketing/shell';
import { MarketingPageContent } from '../../../components/marketing/pages';
import { pageContent } from '../../../lib/marketing/content';
import { site } from '../../../lib/marketing/config';
import { isLocale, pageFromSlug, route } from '../../../lib/marketing/site';

type Props = {
  params: Promise<{ locale: string; slug?: string[] }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};
function resolvePage(value: { locale: string; slug?: string[] }) {
  if (!isLocale(value.locale)) notFound();
  const page = pageFromSlug(value.slug);
  if (!page) notFound();
  return { locale: value.locale, page };
}
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, page } = resolvePage(await params);
  const content = pageContent(locale, page);
  const title = page === 'home' ? 'VENTRO — ' + content.title : content.title + ' | VENTRO';
  const path = route(locale, page);
  return {
    title,
    description: content.description,
    alternates: {
      canonical: path,
      languages: { en: route('en', page), ar: route('ar', page), 'x-default': route('en', page) },
    },
    robots: { index: site.indexing, follow: site.indexing },
    openGraph: {
      type: 'website',
      title,
      description: content.description,
      url: path,
      siteName: 'VENTRO',
      locale: locale === 'ar' ? 'ar_JO' : 'en_US',
      alternateLocale: [locale === 'ar' ? 'en_US' : 'ar_JO'],
      images: [
        { url: '/og', width: 1200, height: 630, alt: 'VENTRO — Every Event. Beyond the Moment.' },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description: content.description,
      images: ['/og'],
    },
  };
}
export default async function PublicPage({ params, searchParams }: Props) {
  const { locale, page } = resolvePage(await params);
  const query = page === 'contact' ? await searchParams : {};
  const intent = typeof query.intent === 'string' ? query.intent : undefined;
  const plan =
    typeof query.plan === 'string' && ['gather', 'grow', 'scale'].includes(query.plan)
      ? query.plan
      : undefined;
  return (
    <MarketingShell locale={locale} currentPage={page} year={2026}>
      <MarketingPageContent locale={locale} page={page} intent={intent} plan={plan} />
    </MarketingShell>
  );
}
