'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { registrationFormSchema, registrationReceiptSchema, type Locale } from '@ventro/types';
import { Button, Input } from '@ventro/ui';
import { text } from '../../lib/marketing/site';
export function PublicRegistration({ locale, slug }: { locale: Locale; slug: string }) {
  const t = (en: string, ar: string) => text(locale, en, ar);
  const router = useRouter();
  const [form, setForm] = useState<ReturnType<typeof registrationFormSchema.parse> | null>(null);
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [registrationType, setRegistrationType] = useState<'GUEST' | 'ACCOUNT'>('GUEST');
  const [guestName, setGuestName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [message, setMessage] = useState('');
  const [pending, setPending] = useState(false);
  useEffect(() => {
    fetch('/api/registrations/events/' + slug + '/registration-form')
      .then((r) => (r.ok ? r.json() : null))
      .then((x) => x && setForm(registrationFormSchema.parse(x)))
      .catch(() => {});
  }, [slug]);
  if (!form) return null;
  const shown = (field: (typeof form.fields)[number]) => {
    const rule = field.visibilityRule;
    return (
      !rule ||
      typeof rule !== 'object' ||
      Array.isArray(rule) ||
      !('field' in rule) ||
      answers[String(rule.field)] === ('equals' in rule ? rule.equals : undefined)
    );
  };
  const set = (key: string, value: unknown) => setAnswers((a) => ({ ...a, [key]: value }));
  async function submit() {
    setMessage('');
    setPending(true);
    try {
      const r = await fetch('/api/registrations/events/' + slug + '/registrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Ventro-CSRF': '1' },
        body: JSON.stringify({
          answers,
          registrationType,
          ...(registrationType === 'GUEST' ? { guestName, guestEmail } : {}),
          locale,
        }),
      });
      if (!r.ok) {
        const x = await r.json().catch(() => null);
        setMessage(
          x?.message ??
            t(
              'Unable to complete registration. Check your answers or sign in.',
              'تعذر إكمال التسجيل. راجع إجاباتك أو سجّل الدخول.',
            ),
        );
        return;
      }
      const receipt = registrationReceiptSchema.parse(await r.json());
      router.push(
        '/' +
          locale +
          '/registrations/confirmation?id=' +
          encodeURIComponent(receipt.id) +
          '&email=' +
          (receipt.emailNotificationQueued ? '1' : '0') +
          '&type=' +
          receipt.registrationType.toLowerCase() +
          '&event=' +
          encodeURIComponent(receipt.eventSlug),
      );
    } catch {
      setMessage(
        t('Unable to complete registration. Please retry.', 'تعذر إكمال التسجيل. حاول مجددًا.'),
      );
    } finally {
      setPending(false);
    }
  }
  return (
    <section className="m-feature-card">
      <h2>{t('Register for this event', 'سجّل في هذه الفعالية')}</h2>
      <fieldset className="my-5 space-y-3">
        <legend className="font-semibold">
          {t('How would you like to register?', 'كيف تريد التسجيل؟')}
        </legend>
        <label className="flex items-start gap-2">
          <input
            checked={registrationType === 'GUEST'}
            name="registration-type"
            onChange={() => setRegistrationType('GUEST')}
            type="radio"
          />
          <span>
            <strong>{t('Guest registration', 'تسجيل كضيف')}</strong>
            <small className="block">
              {t(
                'Receive your ticket and QR code by email.',
                'استلم تذكرتك ورمز QR عبر البريد الإلكتروني.',
              )}
            </small>
          </span>
        </label>
        <label className="flex items-start gap-2">
          <input
            checked={registrationType === 'ACCOUNT'}
            name="registration-type"
            onChange={() => setRegistrationType('ACCOUNT')}
            type="radio"
          />
          <span>
            <strong>{t('VENTRO Account', 'حساب VENTRO')}</strong>
            <small className="block">
              {t(
                'Keep tickets, certificates, and your Event Passport together.',
                'احتفظ بالتذاكر والشهادات وEvent Passport في مكان واحد.',
              )}
            </small>
          </span>
        </label>
      </fieldset>
      {registrationType === 'GUEST' ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <label>
            <span>{t('Full name', 'الاسم الكامل')} *</span>
            <Input
              autoComplete="name"
              onChange={(event) => setGuestName(event.target.value)}
              required
              value={guestName}
            />
          </label>
          <label>
            <span>{t('Email address', 'البريد الإلكتروني')} *</span>
            <Input
              autoComplete="email"
              onChange={(event) => setGuestEmail(event.target.value)}
              required
              type="email"
              value={guestEmail}
            />
          </label>
        </div>
      ) : (
        <p className="my-4 text-sm text-muted-foreground">
          {t(
            'Sign in with a verified account to register this way.',
            'سجّل الدخول بحساب موثّق لإتمام التسجيل بهذه الطريقة.',
          )}{' '}
          <Link className="ui-focus" href={'/' + locale + '/login'}>
            {t('Sign in', 'تسجيل الدخول')}
          </Link>
        </p>
      )}
      {form.fields.filter(shown).map((field) => (
        <label key={field.id} className="block my-3">
          <span>
            {field.type !== 'CONSENT' && field.label}
            {field.required && field.type !== 'CONSENT' ? ' *' : ''}
          </span>
          {field.helpText && <small className="block">{field.helpText}</small>}
          {field.type === 'TEXTAREA' ? (
            <textarea className="ui-textarea" onChange={(e) => set(field.key, e.target.value)} />
          ) : field.type === 'SELECT' || field.type === 'RADIO' ? (
            <select onChange={(e) => set(field.key, e.target.value)}>
              <option value="">{t('Choose', 'اختر')}</option>
              {Array.isArray(field.options) &&
                field.options.map((option) => (
                  <option key={String(option)} value={String(option)}>
                    {String(option)}
                  </option>
                ))}
            </select>
          ) : field.type === 'CHECKBOX' ? (
            <div>
              {Array.isArray(field.options) &&
                field.options.map((option) => {
                  const value = String(option),
                    selected =
                      Array.isArray(answers[field.key]) &&
                      (answers[field.key] as string[]).includes(value);
                  return (
                    <label className="block" key={value}>
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={(e) =>
                          set(
                            field.key,
                            e.target.checked
                              ? [...((answers[field.key] as string[]) ?? []), value]
                              : ((answers[field.key] as string[]) ?? []).filter((x) => x !== value),
                          )
                        }
                      />{' '}
                      {value}
                    </label>
                  );
                })}
            </div>
          ) : field.type === 'CONSENT' ? (
            <span>
              <input type="checkbox" onChange={(e) => set(field.key, e.target.checked)} />{' '}
              {field.label}
              {field.required ? ' *' : ''}
            </span>
          ) : (
            <Input
              type={
                field.type === 'NUMBER'
                  ? 'number'
                  : field.type === 'DATE'
                    ? 'date'
                    : field.type === 'EMAIL'
                      ? 'email'
                      : field.type === 'PHONE'
                        ? 'tel'
                        : 'text'
              }
              onChange={(e) =>
                set(field.key, field.type === 'NUMBER' ? Number(e.target.value) : e.target.value)
              }
            />
          )}
        </label>
      ))}
      <Button disabled={pending} onClick={() => void submit()}>
        {pending ? t('Submitting…', 'جارٍ الإرسال…') : t('Confirm registration', 'تأكيد التسجيل')}
      </Button>
      {message && <p role="status">{message}</p>}
    </section>
  );
}
