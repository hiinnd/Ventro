import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { isLocale, text } from '../../lib/marketing/site';
import { authRoute, type AuthPage } from '../../lib/auth/routes';
import { readServerSession } from '../../lib/auth/server';
import { AuthForm } from './auth-form';

export type AuthPageProps = { params: Promise<{ locale: string }> };
function content(locale: 'en' | 'ar', view: AuthPage) {
  const t = (en: string, ar: string) => text(locale, en, ar);
  const titles = {
    login: t('Welcome back.', 'أهلًا بعودتك.'),
    register: t('Begin your VENTRO journey.', 'ابدأ رحلتك مع VENTRO.'),
    'forgot-password': t('A fresh way back in.', 'طريق جديد للعودة.'),
    'reset-password': t('Choose a new password.', 'اختر كلمة مرور جديدة.'),
    'verify-email': t('Make it your account.', 'أكّد ملكيتك للحساب.'),
    account: t('Your account. Your details.', 'حسابك. وتفاصيلك.'),
  };
  const descriptions = {
    login: t('Sign in securely to your personal account.', 'سجّل الدخول بأمان إلى حسابك الشخصي.'),
    register: t(
      'Create a real account with a verified email and a unique password.',
      'أنشئ حسابًا فعليًا ببريد مؤكّد وكلمة مرور فريدة.',
    ),
    'forgot-password': t(
      'Enter your email. If an eligible account exists, a single-use reset link will arrive.',
      'أدخل بريدك. إن وُجد حساب مؤهّل، سيصلك رابط استعادة أحادي الاستخدام.',
    ),
    'reset-password': t(
      'Use the complete link from your email. Resetting revokes all previous sessions.',
      'استخدم الرابط الكامل من بريدك. تلغي الاستعادة جميع الجلسات السابقة.',
    ),
    'verify-email': t(
      'Confirm the address using the secure link in your email. Your account can sign in while verification is pending.',
      'أكّد العنوان باستخدام الرابط الآمن في بريدك. يمكنك تسجيل الدخول إلى حسابك أثناء انتظار التأكيد.',
    ),
    account: t(
      'Manage your name, email-language preference, and current session.',
      'حدّث اسمك ولغة البريد المفضّلة، وأدر جلستك الحالية.',
    ),
  };
  return { title: titles[view], description: descriptions[view] };
}
export async function authMetadata(props: AuthPageProps, view: AuthPage): Promise<Metadata> {
  const { locale } = await props.params;
  if (!isLocale(locale)) notFound();
  const copy = content(locale, view);
  return {
    title: copy.title + ' | VENTRO',
    description: copy.description,
    robots: { index: false, follow: false },
    alternates: {
      canonical: authRoute(locale, view),
      languages: { en: authRoute('en', view), ar: authRoute('ar', view) },
    },
  };
}
export async function AuthScreen({ params, view }: AuthPageProps & { view: AuthPage }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const copy = content(locale, view);
  let initialSession;
  if (view === 'account') {
    const result = await readServerSession((await cookies()).toString());
    if (!result.session) redirect(authRoute(locale, 'login'));
    initialSession = result.session;
  }
  return (
    <AuthForm
      key={locale + ':' + view}
      locale={locale}
      view={view}
      {...copy}
      initialSession={initialSession}
    />
  );
}
