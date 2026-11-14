'use client';
import { useEffect, useState } from 'react';
import { ticketListSchema, type Locale } from '@ventro/types';
import { Button, EmptyState } from '@ventro/ui';
import { text } from '../../lib/marketing/site';

type Ticket = ReturnType<typeof ticketListSchema.parse>['items'][number];
function TicketCard({ ticket, locale }: { ticket: Ticket; locale: Locale }) {
  const t = (en: string, ar: string) => text(locale, en, ar);
  const [qr, setQr] = useState('');
  useEffect(() => {
    let live = true;
    void import('qrcode')
      .then(({ toDataURL }) =>
        toDataURL('ventro:ticket:' + ticket.credential, {
          width: 360,
          margin: 1,
          errorCorrectionLevel: 'M',
        }),
      )
      .then((value) => {
        if (live) setQr(value);
      });
    return () => {
      live = false;
    };
  }, [ticket.credential]);
  return (
    <article className="m-feature-card my-5">
      <p className="dash-eyebrow">VENTRO / EVENT PASS</p>
      <h2>{ticket.event.title}</h2>
      <p>
        {ticket.event.startsAt
          ? new Date(ticket.event.startsAt).toLocaleString(locale === 'ar' ? 'ar-JO' : 'en-JO', {
              timeZone: ticket.event.timezone,
            })
          : t('Date to be announced', 'سيعلن الموعد لاحقًا')}
      </p>
      {ticket.revokedAt ? (
        <p role="alert">{t('This ticket has been revoked.', 'أُلغيت هذه التذكرة.')}</p>
      ) : (
        <>
          <img
            src={qr}
            alt={t('QR code for event check-in', 'رمز QR للدخول إلى الفعالية')}
            className="max-w-64 w-full bg-white p-3"
          />
          <p>
            <small>
              {t(
                'This code contains only an opaque ticket credential.',
                'يحتوي هذا الرمز على معرّف تذكرة مبهم فقط.',
              )}
            </small>
          </p>
        </>
      )}
      <Button variant="outline" onClick={() => window.print()}>
        {t('Download / print ticket', 'تنزيل / طباعة التذكرة')}
      </Button>
    </article>
  );
}
export function MyTickets({ locale }: { locale: Locale }) {
  const t = (en: string, ar: string) => text(locale, en, ar);
  const [items, setItems] = useState<Ticket[] | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    fetch('/api/registrations/tickets/me')
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((x) => setItems(ticketListSchema.parse(x).items))
      .catch(() => setError(true));
  }, []);
  return (
    <main className="container py-20">
      <h1>{t('My tickets', 'تذاكري')}</h1>
      {error && <p role="alert">{t('Unable to load tickets.', 'تعذر تحميل التذاكر.')}</p>}
      {items === null && !error && <p>{t('Loading tickets…', 'جارٍ تحميل التذاكر…')}</p>}
      {items?.length === 0 && (
        <EmptyState
          title={t('No tickets yet', 'لا توجد تذاكر بعد')}
          description={t(
            'Your event tickets appear here after confirmed registration.',
            'ستظهر تذاكر فعالياتك هنا بعد تأكيد التسجيل.',
          )}
        />
      )}{' '}
      {items?.map((ticket) => (
        <TicketCard key={ticket.id} ticket={ticket} locale={locale} />
      ))}
    </main>
  );
}
