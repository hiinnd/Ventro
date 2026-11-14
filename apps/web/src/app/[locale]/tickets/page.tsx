import { MyTickets } from '../../../components/ticketing/my-tickets';
export default async function Page({ params }: { params: Promise<{ locale: 'en' | 'ar' }> }) {
  const { locale } = await params;
  return <MyTickets locale={locale} />;
}
