import { GuestTicket } from '../../../../components/ticketing/guest-ticket';

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ locale: 'en' | 'ar'; ticketId: string }>;
  searchParams: Promise<{ token?: string }>;
}) {
  const [{ locale, ticketId }, { token }] = await Promise.all([params, searchParams]);
  return <GuestTicket locale={locale} ticketId={ticketId} token={token ?? ''} />;
}
