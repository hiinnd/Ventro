import Link from 'next/link';
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ locale: 'en' | 'ar' }>;
  searchParams: Promise<{ id?: string }>;
}) {
  const [{ locale }, { id }] = await Promise.all([params, searchParams]);
  const ar = locale === 'ar';
  return (
    <main className="container py-20">
      <p className="dash-eyebrow">VENTRO / REGISTRATION</p>
      <h1>{ar ? 'تم تأكيد تسجيلك' : 'Your registration is confirmed'}</h1>
      <p>
        {ar ? 'احتفظ برقم التأكيد للرجوع إليه: ' : 'Keep this confirmation reference: '}
        <code>{id ?? '—'}</code>
      </p>
      <Link className="ui-button" href={'/' + locale + '/registrations'}>
        {ar ? 'عرض تسجيلاتي' : 'View my registrations'}
      </Link>
    </main>
  );
}
