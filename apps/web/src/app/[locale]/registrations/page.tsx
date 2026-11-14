import { MyRegistrations } from '../../../components/registrations/my-registrations';
export default async function Page({ params }: { params: Promise<{ locale: 'en' | 'ar' }> }) {
  const { locale } = await params;
  return <MyRegistrations locale={locale} />;
}
