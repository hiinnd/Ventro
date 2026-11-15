'use client';
import { useEffect, useState } from 'react';
import { EmptyState } from '@ventro/ui';
import type { Locale } from '@ventro/types';
import { text } from '../../lib/marketing/site';

type Ticket = {
  id: string;
  credential: string;
  revokedAt: string | null;
  attendeeName: string;
  event: {
    title: string;
    startsAt: string | null;
    timezone: string;
    venue: string;
    onlineUrl: string;
    locationType: 'VENUE' | 'ONLINE';
  };
};
export function GuestTicket({
  locale,
  ticketId,
  token,
}: {
  locale: Locale;
  ticketId: string;
  token: string;
}) {
  const t = (en: string, ar: string) => text(locale, en, ar);
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [qr, setQr] = useState('');
  const [error, setError] = useState(false);
  const url =
    '/api/registrations/guest-tickets/' + ticketId + '?token=' + encodeURIComponent(token);
  useEffect(() => {
    fetch(url)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(setTicket)
      .catch(() => setError(true));
  }, [url]);
  useEffect(() => {
    if (!ticket || ticket.revokedAt) return;
    void import('qrcode')
      .then(({ toDataURL }) =>
        toDataURL('ventro:ticket:' + ticket.credential, {
          width: 360,
          margin: 1,
          errorCorrectionLevel: 'M',
        }),
      )
      .then(setQr);
  }, [ticket]);
  if (error)
    return (
      <main className="container py-20">
        <EmptyState
          title={t('Ticket link unavailable', 'رابط التذكرة غير متاح')}
          description={t(
            'This link may be invalid, expired, or already claimed by an account.',
            'قد يكون الرابط غير صالح أو منتهيًا أو تم نقل التذكرة إلى حساب VENTRO.',
          )}
        />
      </main>
    );
  if (!ticket)
    return (
      <main className="container py-20">
        <p>{t('Loading ticket…', 'جارٍ تحميل التذكرة…')}</p>
      </main>
    );
  return (
    <main className="container py-20">
      <article className="m-feature-card">
        <p className="dash-eyebrow">VENTRO / GUEST TICKET</p>
        <h1>{ticket.event.title}</h1>
        <p>{ticket.attendeeName}</p>
        {ticket.revokedAt ? (
          <p role="alert">{t('This ticket has been revoked.', 'أُلغيت هذه التذكرة.')}</p>
        ) : (
          <img
            src={qr}
            alt={t('QR code for event check-in', 'رمز QR للدخول إلى الفعالية')}
            className="max-w-64 w-full bg-white p-3"
          />
        )}
        <a
          className="ui-button ui-button-secondary mt-5 inline-flex"
          href={
            '/api/registrations/guest-tickets/' +
            ticketId +
            '/download?token=' +
            encodeURIComponent(token)
          }
        >
          {t('Download ticket PDF', 'تنزيل التذكرة PDF')}
        </a>
      </article>
    </main>
  );
}
