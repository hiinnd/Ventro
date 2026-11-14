import { notFound } from 'next/navigation';
import { eventSchema } from '@ventro/types';
import { authApiUrl } from '../../../../../lib/auth/server';
import { PresenterResults } from '../../../../../components/engagement/presenter-results';

export const dynamic = 'force-dynamic';

export default async function Page({
  params,
}: {
  params: Promise<{ locale: 'en' | 'ar'; slug: string }>;
}) {
  const { locale, slug } = await params;
  const response = await fetch(new URL('/api/v1/events/' + slug, authApiUrl('session')), {
    cache: 'no-store',
  });
  if (!response.ok) notFound();
  const event = eventSchema.parse(await response.json());
  return <PresenterResults locale={locale} eventId={event.id} title={event.title} />;
}
