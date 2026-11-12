'use client';
import { useRef, useState } from 'react';
import Link from 'next/link';
import type { Locale } from '@ventro/types';
import {
  Button,
  FormField,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
  useToast,
} from '@ventro/ui';
import { route, text } from '../../lib/marketing/site';

export function ContactForm({
  locale,
  contactEmail,
  initialIntent = 'general',
  plan,
}: {
  locale: Locale;
  contactEmail?: string;
  initialIntent?: string;
  plan?: string;
}) {
  const t = (en: string, ar: string) => text(locale, en, ar);
  const intents = [
    ['general', t('A general conversation', 'حوار عام')],
    ['organize', t('Organizing an event', 'تنظيم فعالية')],
    ['early-access', t('Early-access interest', 'اهتمام بالوصول المبكر')],
    ['explore', t('Participant experience', 'تجربة المشارك')],
    ['pricing', t('Proposed packages', 'الباقات المقترحة')],
  ];
  const [intent, setIntent] = useState(
    intents.some(([value]) => value === initialIntent) ? initialIntent : 'general',
  );
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [attempted, setAttempted] = useState(false);
  const [brief, setBrief] = useState('');
  const result = useRef<HTMLTextAreaElement>(null);
  const { notify } = useToast();
  const nameError =
    attempted && name.trim().length < 2
      ? t('Please enter your name.', 'يرجى إدخال اسمك.')
      : undefined;
  const emailError =
    attempted && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
      ? t('Please enter a valid email address.', 'يرجى إدخال بريد إلكتروني صالح.')
      : undefined;
  const messageError =
    attempted && message.trim().length < 10
      ? t(
          'Please add at least 10 characters about your gathering.',
          'يرجى إضافة ١٠ أحرف على الأقل عن لقائك.',
        )
      : undefined;
  async function copyBrief() {
    try {
      await navigator.clipboard.writeText(brief);
      notify({
        title: t('Brief copied', 'تم نسخ النبذة'),
        description: t('Nothing has been sent to VENTRO.', 'لم يتم إرسال شيء إلى VENTRO.'),
        variant: 'success',
      });
    } catch {
      result.current?.focus();
      result.current?.select();
      notify({
        title: t('Your brief is selected', 'تم تحديد النبذة'),
        description: t('Use your device’s copy command.', 'استخدم أمر النسخ في جهازك.'),
      });
    }
  }
  return (
    <div className="m-contact-form-card">
      <div className="m-contact-status">
        <span className="m-preview-tag">
          {t('Early-access conversation', 'حوار الوصول المبكر')}
        </span>
        <p>
          {contactEmail
            ? t(
                'Prepare a brief, then choose whether to send it using your email app.',
                'جهّز نبذة، ثم اختر إرسالها عبر تطبيق بريدك.',
              )
            : t(
                'Our official contact channel is being finalized. You can prepare and copy your brief here; this does not submit a message or join a mailing list.',
                'قناة التواصل الرسمية قيد التجهيز. يمكنك تجهيز نبذتك ونسخها هنا؛ لا يرسل هذا رسالة ولا يسجّلك في قائمة بريدية.',
              )}
        </p>
      </div>
      <form
        id="request-form"
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          setAttempted(true);
          const invalidField =
            name.trim().length < 2
              ? 'name'
              : !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
                ? 'email'
                : message.trim().length < 10
                  ? 'message'
                  : undefined;
          if (invalidField) {
            event.currentTarget
              .querySelector<HTMLElement>('[name="' + invalidField + '"]')
              ?.focus();
            return;
          }
          const subject = intents.find(([value]) => value === intent)?.[1];
          setBrief(
            [
              t('VENTRO contact brief', 'نبذة تواصل VENTRO'),
              '',
              t('Name: ', 'الاسم: ') + name.trim(),
              t('Email: ', 'البريد: ') + email.trim(),
              t('Interest: ', 'الاهتمام: ') + subject,
              ...(plan ? [t('Proposed package: ', 'الباقة المقترحة: ') + plan] : []),
              '',
              message.trim(),
            ].join('\n'),
          );
        }}
        className="grid gap-5"
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <FormField label={t('Your name', 'اسمك')} error={nameError} required>
            <Input
              name="name"
              autoComplete="name"
              maxLength={120}
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
            />
          </FormField>
          <FormField label={t('Email address', 'البريد الإلكتروني')} error={emailError} required>
            <Input
              name="email"
              type="email"
              autoComplete="email"
              maxLength={320}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </FormField>
        </div>
        <Select value={intent} onValueChange={setIntent}>
          <FormField label={t('What brings you here?', 'ما الذي ترغب بمناقشته؟')}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
          </FormField>
          <SelectContent>
            {intents.map(([value, label]) => (
              <SelectItem value={value!} key={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <FormField
          label={t('Tell us about your idea', 'أخبرنا عن فكرتك')}
          description={t(
            'A few lines are enough. Please leave out sensitive information.',
            'تكفي بضعة أسطر. يرجى عدم إضافة معلومات حساسة.',
          )}
          error={messageError}
          required
        >
          <Textarea
            name="message"
            maxLength={3000}
            rows={5}
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            placeholder={t(
              'The kind of gathering, who it is for, and what you hope it makes possible…',
              'نوع اللقاء، ولمن تنظّمه، وما الذي تأمل أن يحققه…',
            )}
            required
          />
        </FormField>
        <p className="m-caption">
          {t(
            'Your entries stay in this browser. No contact data is stored by this preview.',
            'تبقى مدخلاتك داخل هذا المتصفح. لا تخزّن هذه المعاينة بيانات التواصل.',
          )}{' '}
          <Link className="ui-focus underline underline-offset-4" href={route(locale, 'privacy')}>
            {t('Privacy details', 'تفاصيل الخصوصية')}
          </Link>
        </p>
        <Button type="submit" className="justify-self-start">
          {t('Prepare my brief', 'جهّز نبذتي')} ↗
        </Button>
      </form>
      {brief && (
        <div className="m-brief-result">
          <p role="status" className="mb-4 text-sm font-semibold text-success">
            {t(
              'Your brief is ready locally. It has not been sent.',
              'نبذتك جاهزة محليًا. لم يتم إرسالها.',
            )}
          </p>
          <FormField label={t('Prepared brief', 'النبذة المجهّزة')}>
            <Textarea ref={result} readOnly rows={9} value={brief} />
          </FormField>
          <div className="m-actions">
            <Button onClick={() => void copyBrief()}>{t('Copy brief', 'انسخ النبذة')}</Button>
            {contactEmail && (
              <Button asChild variant="outline">
                <a
                  href={
                    'mailto:' +
                    contactEmail +
                    '?subject=' +
                    encodeURIComponent(
                      'VENTRO — ' + (intents.find(([value]) => value === intent)?.[1] ?? 'Inquiry'),
                    ) +
                    '&body=' +
                    encodeURIComponent(brief)
                  }
                >
                  {t('Open email draft', 'افتح مسودة البريد')}
                </a>
              </Button>
            )}
          </div>
          <p className="m-caption mt-3">
            {contactEmail
              ? t(
                  'Sending is completed by you in your email app; this website does not report delivery.',
                  'تُكمل الإرسال بنفسك في تطبيق البريد؛ لا يؤكد هذا الموقع وصول الرسالة.',
                )
              : t(
                  'The public contact channel will be announced before launch.',
                  'سنعلن قناة التواصل العامة قبل الإطلاق.',
                )}
          </p>
        </div>
      )}
    </div>
  );
}
