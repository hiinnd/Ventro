'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import { authSessionSchema, authUserSchema, type AuthSession, type Locale } from '@ventro/types';
import {
  BrandLogo,
  Button,
  FormField,
  Icon,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@ventro/ui';
import { authRoute, safeLoginDestination, type AuthPage } from '../../lib/auth/routes';
import { text } from '../../lib/marketing/site';
import { useLocale } from '../locale-provider';

class AuthError extends Error {
  constructor(readonly status: number) {
    super('Authentication request failed');
  }
}
async function requestAuth(action: string, body: unknown, method = 'POST'): Promise<unknown> {
  const response = await fetch('/api/auth/' + action, {
    method,
    credentials: 'same-origin',
    cache: 'no-store',
    headers: { 'Content-Type': 'application/json', 'X-Ventro-CSRF': '1' },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new AuthError(response.status);
  return response.status === 204 ? null : response.json();
}
export function AuthForm({
  locale,
  view,
  title,
  description,
  initialSession,
}: {
  locale: Locale;
  view: AuthPage;
  title: string;
  description: string;
  initialSession?: AuthSession;
}) {
  const t = (en: string, ar: string) => text(locale, en, ar);
  const router = useRouter();
  const { setLocale } = useLocale();
  const { resolvedTheme, setTheme } = useTheme();
  const [session, setSession] = useState(initialSession);
  const [name, setName] = useState(initialSession?.user.name ?? '');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [preferredLocale, setPreferredLocale] = useState<Locale>(
    initialSession?.user.locale ?? locale,
  );
  const [token, setToken] = useState<string | null>(null);
  const [attempted, setAttempted] = useState(false);
  const [pending, setPending] = useState(false);
  const pendingRef = useRef(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const notice = useRef<HTMLDivElement>(null);
  useEffect(() => {
    setLocale(locale);
  }, [locale, setLocale]);
  useEffect(() => {
    if (view !== 'reset-password' && view !== 'verify-email') return;
    function captureLink() {
      // StrictMode replays effects after the first pass has removed the fragment.
      if (!window.location.hash) {
        setToken((current) => current ?? '');
        return;
      }
      const value = new URLSearchParams(window.location.hash.slice(1)).get('token');
      setToken(value && /^[a-f0-9]{64}$/.test(value) ? value : '');
      setSuccess('');
      setError('');
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
    }
    captureLink();
    window.addEventListener('hashchange', captureLink);
    return () => window.removeEventListener('hashchange', captureLink);
  }, [view]);
  useEffect(() => {
    if (error || success) notice.current?.focus();
  }, [error, success]);
  const needsName = view === 'register' || view === 'account';
  const needsEmail = ['register', 'login', 'forgot-password'].includes(view);
  const needsPassword = ['register', 'login', 'reset-password'].includes(view);
  const needsConfirmation = view === 'register' || view === 'reset-password';
  const needsToken = view === 'reset-password' || view === 'verify-email';
  const nameError =
    attempted && needsName && name.trim().length < 2
      ? t('Enter at least two characters.', 'أدخل حرفين على الأقل.')
      : undefined;
  const emailError =
    attempted && needsEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
      ? t('Enter a valid email address.', 'أدخل بريدًا إلكترونيًا صالحًا.')
      : undefined;
  const passwordError =
    attempted && needsPassword && password.length < (view === 'login' ? 1 : 12)
      ? view === 'login'
        ? t('Enter your password.', 'أدخل كلمة المرور.')
        : t(
            'Use at least 12 characters for a new password.',
            'استخدم ١٢ حرفًا على الأقل لكلمة المرور الجديدة.',
          )
      : undefined;
  const confirmationError =
    attempted && needsConfirmation && password !== confirm
      ? t('Passwords must match.', 'يجب أن تتطابق كلمتا المرور.')
      : undefined;
  const describeError = (failure: unknown) =>
    failure instanceof AuthError && failure.status === 429
      ? t(
          'Too many attempts. Please wait before trying again.',
          'محاولات كثيرة. انتظر قبل المحاولة مجددًا.',
        )
      : failure instanceof AuthError && failure.status === 401
        ? view === 'login'
          ? t(
              'Check your email and password, then try again.',
              'تحقق من البريد وكلمة المرور ثم حاول مجددًا.',
            )
          : t(
              'Your session ended. Sign in again to continue.',
              'انتهت جلستك. سجّل الدخول مجددًا للمتابعة.',
            )
        : failure instanceof AuthError && failure.status === 400 && needsToken
          ? t(
              'This link is invalid, expired, or already used. Request a new email.',
              'الرابط غير صالح أو منتهي الصلاحية أو مستخدم. اطلب رسالة جديدة.',
            )
          : failure instanceof AuthError && failure.status < 500
            ? t(
                'Check the entered information and try again.',
                'تحقق من البيانات المدخلة وحاول مجددًا.',
              )
            : t(
                'Authentication is temporarily unavailable. Your action was not confirmed; please try again.',
                'المصادقة غير متاحة مؤقتًا. لم يتأكد تنفيذ الإجراء؛ يرجى المحاولة مجددًا.',
              );
  async function run(action: () => Promise<void>) {
    if (pendingRef.current) return;
    pendingRef.current = true;
    setPending(true);
    setError('');
    setSuccess('');
    try {
      await action();
      setAttempted(false);
    } catch (failure) {
      setError(describeError(failure));
    } finally {
      pendingRef.current = false;
      setPending(false);
    }
  }
  async function renew() {
    await run(async () => {
      const data = authSessionSchema.parse(await requestAuth('renew', {}));
      setSession(data);
      setSuccess(t('Your session has been renewed securely.', 'تم تجديد جلستك بأمان.'));
    });
  }
  // Renew only while the user is actively returning to an account close to idle expiry.
  useEffect(() => {
    if (view !== 'account' || !session) return;
    const check = () => {
      if (
        document.visibilityState === 'visible' &&
        !pendingRef.current &&
        new Date(session.expiresAt).getTime() - Date.now() < 86400000 &&
        new Date(session.absoluteExpiresAt).getTime() > Date.now()
      )
        void renew();
    };
    window.addEventListener('focus', check);
    document.addEventListener('visibilitychange', check);
    return () => {
      window.removeEventListener('focus', check);
      document.removeEventListener('visibilitychange', check);
    };
    // The session timestamp is the trigger; run() serializes requests within this page.
  }, [view, session?.expiresAt, session?.absoluteExpiresAt]);
  const labels: Record<AuthPage, string> = {
    login: t('Sign in', 'تسجيل الدخول'),
    register: t('Create account', 'إنشاء حساب'),
    'forgot-password': t('Request reset email', 'طلب رسالة استعادة'),
    'reset-password': t('Set new password', 'تعيين كلمة مرور جديدة'),
    'verify-email': t('Verify email', 'تأكيد البريد'),
    account: t('Save profile', 'حفظ الملف الشخصي'),
  };
  return (
    <div className="auth-page">
      <header className="auth-header">
        <Link
          className="ui-focus"
          href={'/' + locale}
          aria-label={t('VENTRO home', 'الرئيسية VENTRO')}
        >
          <BrandLogo decorative className="h-8 w-auto" />
        </Link>
        <div className="flex items-center gap-3">
          <Link
            className="ui-focus text-sm"
            href={authRoute(locale === 'ar' ? 'en' : 'ar', view)}
            prefetch={view === 'account' ? false : undefined}
            lang={locale === 'ar' ? 'en' : 'ar'}
          >
            {locale === 'ar' ? 'English' : 'العربية'}
          </Link>
          <Button
            variant="ghost"
            size="icon"
            aria-label={t('Change color theme', 'تغيير مظهر الألوان')}
            onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
          >
            <Icon name="theme" />
          </Button>
        </div>
      </header>
      <main id="main-content" className="auth-main">
        <div className="auth-story">
          <span className="m-eyebrow">{t('A considered beginning', 'بداية باهتمام')}</span>
          <p className="auth-story-title" lang="en" dir="ltr">
            Every Event.
            <br />
            <span>Beyond the Moment.</span>
          </p>
          <p>
            {t(
              'Your account is the beginning of your VENTRO journey. Event capabilities are still taking shape.',
              'حسابك هو بداية رحلتك مع VENTRO. مزايا الفعاليات ما تزال تتشكّل.',
            )}
          </p>
          <div className="auth-brand-art" aria-hidden>
            <span />
            <BrandLogo variant="symbol" decorative className="size-24" />
          </div>
        </div>
        <section className="auth-panel" aria-labelledby="auth-title">
          <div className="auth-panel-heading">
            <span className="m-eyebrow">
              VENTRO / {view === 'account' ? t('Your account', 'حسابك') : t('Welcome', 'أهلًا بك')}
            </span>
            <h1 id="auth-title">{title}</h1>
            <p>{description}</p>
          </div>
          {(error || success) && (
            <div
              ref={notice}
              tabIndex={-1}
              role={error ? 'alert' : 'status'}
              className={'auth-notice ' + (error ? 'auth-notice-error' : 'auth-notice-success')}
            >
              {error || success}
              {error && view === 'account' && (
                <Link className="ui-focus ms-2 underline" href={authRoute(locale, 'login')}>
                  {t('Sign in', 'تسجيل الدخول')}
                </Link>
              )}
            </div>
          )}
          {view === 'account' && session && (
            <div className="auth-account-summary">
              <span className="text-xs text-muted-foreground">
                {t('ACCOUNT EMAIL', 'بريد الحساب')}
              </span>
              <p dir="ltr" className="break-all">
                {session.user.email}
              </p>
              <span
                className={
                  'auth-verification ' +
                  (session.user.emailVerifiedAt ? 'text-success' : 'text-warning')
                }
              >
                {session.user.emailVerifiedAt
                  ? t('Email verified', 'البريد مؤكّد')
                  : t('Email verification pending', 'بانتظار تأكيد البريد')}
              </span>
              {!session.user.emailVerifiedAt && (
                <Button
                  disabled={pending}
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    void run(async () => {
                      await requestAuth('resend-verification', {});
                      setSuccess(
                        t(
                          'If verification is needed, an email will arrive. Previous links have been replaced.',
                          'ستصل رسالة إن كان التأكيد مطلوبًا. تم استبدال الروابط السابقة.',
                        ),
                      );
                    })
                  }
                >
                  {t('Resend verification email', 'إعادة إرسال رسالة التأكيد')}
                </Button>
              )}
            </div>
          )}
          {needsToken && token === null && (
            <p role="status" className="auth-link-state">
              {t('Reading your secure link…', 'جارٍ قراءة رابطك الآمن…')}
            </p>
          )}
          {needsToken && token === '' && (
            <div className="auth-notice auth-notice-error">
              <p>
                {t(
                  'Open the complete link from your email. Its token is missing or malformed.',
                  'افتح الرابط الكامل من بريدك. رمز الرابط مفقود أو غير صالح.',
                )}
              </p>
              <Link
                className="ui-focus mt-3 inline-block underline"
                href={authRoute(locale, view === 'reset-password' ? 'forgot-password' : 'login')}
              >
                {view === 'reset-password'
                  ? t('Request a new reset link', 'اطلب رابط استعادة جديدًا')
                  : t('Sign in to resend verification', 'سجّل الدخول لإعادة إرسال التأكيد')}
              </Link>
            </div>
          )}
          <form
            noValidate
            aria-busy={pending}
            className="auth-form"
            onSubmit={(event) => {
              event.preventDefault();
              setAttempted(true);
              const invalid =
                needsName && name.trim().length < 2
                  ? 'name'
                  : needsEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
                    ? 'email'
                    : needsPassword && password.length < (view === 'login' ? 1 : 12)
                      ? 'password'
                      : needsConfirmation && password !== confirm
                        ? 'confirm'
                        : undefined;
              if (invalid) {
                event.currentTarget.querySelector<HTMLElement>('[name="' + invalid + '"]')?.focus();
                return;
              }
              if (needsToken && !token) return;
              void run(async () => {
                if (view === 'login') {
                  authSessionSchema.parse(
                    await requestAuth('login', { email: email.trim(), password }),
                  );
                  setPassword('');
                  router.replace(
                    safeLoginDestination(new URLSearchParams(location.search).get('next'), locale),
                  );
                  router.refresh();
                } else if (view === 'register') {
                  await requestAuth('register', {
                    name: name.trim(),
                    email: email.trim(),
                    password,
                    locale,
                  });
                  setPassword('');
                  setConfirm('');
                  setSuccess(
                    t(
                      'If this address can be registered, a verification email will arrive. You can sign in if you already have an account.',
                      'إن كان بالإمكان إنشاء الحساب، ستصل رسالة تأكيد. يمكنك تسجيل الدخول إن كان لديك حساب مسبقًا.',
                    ),
                  );
                } else if (view === 'forgot-password') {
                  await requestAuth('forgot-password', { email: email.trim() });
                  setSuccess(
                    t(
                      'If an eligible account exists, a password reset email will arrive. Check your inbox.',
                      'إن وُجد حساب مؤهّل، ستصل رسالة استعادة. تحقق من بريدك.',
                    ),
                  );
                } else if (view === 'reset-password') {
                  await requestAuth('reset-password', { token, password });
                  setPassword('');
                  setConfirm('');
                  setSuccess(
                    t(
                      'Password changed. Your previous sessions were revoked. Sign in with your new password.',
                      'تم تغيير كلمة المرور وإلغاء الجلسات السابقة. سجّل الدخول بكلمة المرور الجديدة.',
                    ),
                  );
                } else if (view === 'verify-email') {
                  await requestAuth('verify-email', { token });
                  setSuccess(
                    t(
                      'Email verified. You can now sign in to your account.',
                      'تم تأكيد البريد. يمكنك الآن تسجيل الدخول إلى حسابك.',
                    ),
                  );
                } else {
                  const user = authUserSchema.parse(
                    await requestAuth(
                      'profile',
                      { name: name.trim(), locale: preferredLocale },
                      'PATCH',
                    ),
                  );
                  setSession((current) => (current ? { ...current, user } : current));
                  setSuccess(t('Your profile has been saved.', 'تم حفظ ملفك الشخصي.'));
                }
              });
            }}
          >
            {needsName && (
              <FormField label={t('Full name', 'الاسم الكامل')} error={nameError} required>
                <Input
                  name="name"
                  autoComplete="name"
                  value={name}
                  maxLength={100}
                  onChange={(event) => setName(event.target.value)}
                  required
                />
              </FormField>
            )}
            {needsEmail && (
              <FormField
                label={t('Email address', 'البريد الإلكتروني')}
                error={emailError}
                required
              >
                <Input
                  name="email"
                  type="email"
                  dir="ltr"
                  autoComplete="email"
                  value={email}
                  maxLength={254}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                />
              </FormField>
            )}
            {needsPassword && (
              <FormField
                label={
                  view === 'reset-password'
                    ? t('New password', 'كلمة المرور الجديدة')
                    : t('Password', 'كلمة المرور')
                }
                error={passwordError}
                description={
                  view !== 'login'
                    ? t(
                        '12–128 characters. Use a unique passphrase; spaces and Arabic are supported.',
                        'من ١٢ إلى ١٢٨ حرفًا. اختر عبارة مرور فريدة؛ يمكن استخدام المسافات والعربية.',
                      )
                    : undefined
                }
                required
              >
                <Input
                  name="password"
                  type="password"
                  autoComplete={view === 'login' ? 'current-password' : 'new-password'}
                  value={password}
                  maxLength={128}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                />
              </FormField>
            )}
            {needsConfirmation && (
              <FormField
                label={t('Confirm password', 'تأكيد كلمة المرور')}
                error={confirmationError}
                required
              >
                <Input
                  name="confirm"
                  type="password"
                  autoComplete="new-password"
                  value={confirm}
                  maxLength={128}
                  onChange={(event) => setConfirm(event.target.value)}
                  required
                />
              </FormField>
            )}
            {view === 'account' && (
              <Select
                value={preferredLocale}
                onValueChange={(value) => setPreferredLocale(value as Locale)}
              >
                <FormField label={t('Preferred email language', 'لغة البريد المفضّلة')}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                </FormField>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="ar">العربية</SelectItem>
                </SelectContent>
              </Select>
            )}
            {view === 'register' && (
              <p className="auth-fine-print">
                {t(
                  'By creating an account, you acknowledge the current preview ',
                  'بإنشاء الحساب، تقرّ بقراءة ',
                )}
                <Link className="ui-focus underline" href={'/' + locale + '/terms'}>
                  {t('Terms of Service', 'شروط الاستخدام الحالية للمعاينة')}
                </Link>
                {t(' and ', ' و')}
                <Link className="ui-focus underline" href={'/' + locale + '/privacy'}>
                  {t('Privacy Policy', 'سياسة الخصوصية')}
                </Link>
                .
              </p>
            )}
            <Button
              type="submit"
              disabled={
                pending ||
                (needsToken && !token) ||
                ((view === 'verify-email' || view === 'reset-password') && Boolean(success))
              }
              className="w-full"
              size="lg"
            >
              {pending ? t('Please wait…', 'يرجى الانتظار…') : labels[view]}
              <Icon name="next" className="rtl:rotate-180" />
            </Button>
          </form>
          {view === 'login' && (
            <div className="auth-links">
              <Link href={authRoute(locale, 'forgot-password')} className="ui-focus">
                {t('Forgot your password?', 'نسيت كلمة المرور؟')}
              </Link>
              <Link href={authRoute(locale, 'register')} className="ui-focus">
                {t('Create an account', 'أنشئ حسابًا')}
              </Link>
            </div>
          )}
          {view === 'register' && (
            <p className="auth-bottom-link">
              {t('Already have an account?', 'لديك حساب مسبقًا؟')}{' '}
              <Link className="ui-focus underline" href={authRoute(locale, 'login')}>
                {t('Sign in', 'سجّل الدخول')}
              </Link>
            </p>
          )}
          {['forgot-password', 'reset-password', 'verify-email'].includes(view) && (
            <p className="auth-bottom-link">
              <Link className="ui-focus underline" href={authRoute(locale, 'login')}>
                {t('Back to sign in', 'العودة إلى تسجيل الدخول')}
              </Link>
            </p>
          )}
          {view === 'account' && session && (
            <div className="auth-session">
              <Button asChild variant="outline" className="mb-5">
                <Link href={'/' + locale + '/organizations'} prefetch={false}>
                  {t('Your organizations', 'مؤسساتك')}
                </Link>
              </Button>
              <h2>{t('Session security', 'أمان الجلسة')}</h2>
              <p>
                {t('Signed in until ', 'تستمر الجلسة حتى ')}
                <time dateTime={session.expiresAt}>
                  {new Intl.DateTimeFormat(locale === 'ar' ? 'ar-JO' : 'en-GB', {
                    dateStyle: 'medium',
                    timeZone: 'Asia/Amman',
                  }).format(new Date(session.expiresAt))}
                </time>
              </p>
              <p>
                {t(
                  'Renewal rotates your session token. A sign-in is required again within 30 days.',
                  'يستبدل التجديد رمز الجلسة. يلزم تسجيل الدخول مجددًا خلال ٣٠ يومًا.',
                )}
              </p>
              <div className="flex flex-wrap gap-3">
                <Button variant="outline" disabled={pending} onClick={() => void renew()}>
                  {t('Renew session', 'تجديد الجلسة')}
                </Button>
                <Button
                  variant="destructive"
                  disabled={pending}
                  onClick={() =>
                    void run(async () => {
                      await requestAuth('logout', {});
                      router.replace(authRoute(locale, 'login'));
                      router.refresh();
                    })
                  }
                >
                  {t('Sign out', 'تسجيل الخروج')}
                </Button>
              </div>
            </div>
          )}
          <p className="auth-fine-print mt-7">
            {t(
              'Verification links expire in 24 hours; reset links in 30 minutes. Tokens are single use.',
              'تنتهي روابط التأكيد خلال ٢٤ ساعة، والاستعادة خلال ٣٠ دقيقة. تُستخدم الرموز مرة واحدة.',
            )}
          </p>
        </section>
      </main>
      <footer className="auth-footer">
        VENTRO · {t('Rooted in Jordan. Building for MENA.', 'من الأردن، نبني للمنطقة.')}
        <Link href={'/' + locale} className="ui-focus underline">
          {t('Back to the website', 'العودة إلى الموقع')}
        </Link>
      </footer>
    </div>
  );
}
