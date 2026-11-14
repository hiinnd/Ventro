import Image from 'next/image';
import Link from 'next/link';
import type { Event, Locale } from '@ventro/types';
import { EmptyState } from '@ventro/ui';
import { text } from '../../lib/marketing/site';
import { PublicRegistration } from '../registrations/public-registration';
export function PublicEvents({ locale, events }: { locale: Locale; events: Event[] }) {
  const t = (a: string, b: string) => text(locale, a, b);
  return (
    <main className="m-page-shell">
      <header className="m-page-hero">
        <p className="m-eyebrow">VENTRO / {t('EXPLORE EVENTS', 'استكشف الفعاليات')}</p>
        <h1>{t('Find the next moment that matters.', 'اكتشف اللحظة القادمة التي تستحق.')}</h1>
      </header>
      {events.length ? (
        <div className="m-card-grid">
          {events.map((e) => (
            <article className="m-feature-card" key={e.id}>
              {e.coverDigest && (
                <Image
                  src={'/api/events/' + e.slug + '/cover?v=' + e.coverDigest}
                  alt=""
                  width={800}
                  height={450}
                />
              )}
              <p className="m-eyebrow">{e.category ?? t('EVENT', 'فعالية')}</p>
              <h2>{e.title}</h2>
              <p>{e.description}</p>
              <Link className="ui-focus" href={'/' + locale + '/events/' + e.slug}>
                {t('View event', 'عرض الفعالية')}
              </Link>
            </article>
          ))}
        </div>
      ) : (
        <EmptyState
          title={t('No public events yet', 'لا توجد فعاليات عامة بعد')}
          description={t(
            'Organizers can publish their first event from the dashboard.',
            'يمكن للمنظمين نشر فعاليتهم الأولى من لوحة التحكم.',
          )}
        />
      )}
    </main>
  );
}
export function PublicEventDetail({ locale, event }: { locale: Locale; event: Event }) {
  const t = (a: string, b: string) => text(locale, a, b);
  return (
    <main className="m-page-shell">
      <Link className="ui-focus" href={'/' + locale + '/events'}>
        ← {t('All events', 'كل الفعاليات')}
      </Link>
      <article className="m-page-hero">
        <p className="m-eyebrow">{event.category ?? t('EVENT', 'فعالية')}</p>
        <h1>{event.title}</h1>
        <p>{event.description}</p>
        <dl className="m-detail-grid">
          <div>
            <dt>{t('When', 'الموعد')}</dt>
            <dd>
              {event.startsAt
                ? new Intl.DateTimeFormat(locale === 'ar' ? 'ar-JO' : 'en-JO', {
                    dateStyle: 'full',
                    timeStyle: 'short',
                    timeZone: event.timezone,
                  }).format(new Date(event.startsAt))
                : t('To be announced', 'يعلن لاحقًا')}
            </dd>
          </div>
          <div>
            <dt>
              {event.locationType === 'ONLINE' ? t('Online', 'عبر الإنترنت') : t('Venue', 'المكان')}
            </dt>
            <dd>{event.locationType === 'ONLINE' ? event.onlineUrl : event.venue}</dd>
          </div>
        </dl>
        {event.sessions.length > 0 && (
          <section>
            <h2>{t('Agenda', 'الأجندة')}</h2>
            <ol>
              {event.sessions.map((s) => (
                <li key={s.id}>
                  <strong>{s.title}</strong>
                </li>
              ))}
            </ol>
          </section>
        )}
        <PublicRegistration locale={locale} slug={event.slug} />
      </article>
    </main>
  );
}
