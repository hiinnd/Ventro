import Link from 'next/link';
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ locale: 'en' | 'ar' }>;
  searchParams: Promise<{ id?: string; email?: string; type?: string; event?: string }>;
}) {
  const [{ locale }, { id, email, type, event }] = await Promise.all([params, searchParams]);
  const ar = locale === 'ar';
  const guest = type === 'guest';
  const eventSlug = event && /^[a-z0-9-]{1,120}$/.test(event) ? event : undefined;
  return (
    <main className="container py-20">
      <p className="dash-eyebrow">VENTRO / REGISTRATION</p>
      <h1>{ar ? 'تم تأكيد تسجيلك' : 'Your registration is confirmed'}</h1>
      <p>
        {ar ? 'احتفظ برقم التأكيد للرجوع إليه: ' : 'Keep this confirmation reference: '}
        <code>{id ?? '—'}</code>
      </p>
      <p>
        {email === '1'
          ? guest
            ? ar
              ? 'أرسلنا تذكرتك ورمز QR إلى بريدك الإلكتروني. احتفظ بالرسالة لإبراز الرمز عند الدخول.'
              : 'We sent your ticket and QR code to your email. Keep the message to present the code at check-in.'
            : ar
              ? 'أرسلنا رسالة تأكيد وتذكرتك إلى بريد حسابك. يمكنك أيضًا عرضها من تذاكري.'
              : 'We sent a confirmation and your ticket to your account email. You can also view it in My tickets.'
          : ar
            ? 'تذكرتك جاهزة الآن في حسابك ضمن تذاكري.'
            : 'Your ticket is now ready in your account under My tickets.'}
      </p>
      <div className="flex flex-wrap gap-3">
        {guest ? (
          <Link className="ui-button" href={'/' + locale + '/events/' + (eventSlug ?? '')}>
            {ar ? 'العودة إلى الفعالية' : 'Return to event'}
          </Link>
        ) : (
          <Link className="ui-button" href={'/' + locale + '/tickets'}>
            {ar ? 'عرض تذاكري وQR' : 'View my ticket and QR'}
          </Link>
        )}
        {!guest && (
          <Link className="ui-button ui-button-secondary" href={'/' + locale + '/registrations'}>
            {ar ? 'عرض تسجيلاتي' : 'View my registrations'}
          </Link>
        )}
      </div>
    </main>
  );
}
