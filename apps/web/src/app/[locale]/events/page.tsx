import { eventListSchema, type Event } from '@ventro/types';
import { PublicEvents } from '../../../components/events/public-events';
import { authApiUrl } from '../../../lib/auth/server';
export const dynamic = 'force-dynamic';
export default async function Page({ params }: { params: Promise<{ locale: 'en' | 'ar' }> }) {
  const { locale } = await params;
  let items: Event[] = [];
  try {
    const r = await fetch(new URL('/api/v1/events', authApiUrl('session')), { cache: 'no-store' });
    if (r.ok) items = eventListSchema.parse(await r.json()).items;
  } catch {
    items = [];
  }
  return <PublicEvents locale={locale} events={items} />;
}
