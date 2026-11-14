'use client';
import { useEffect, useState } from 'react';
import { Button } from '@ventro/ui';
import type { Locale } from '@ventro/types';
export function EventAssistant({
  organizationId,
  locale,
}: {
  organizationId: string;
  locale: Locale;
}) {
  const ar = locale === 'ar';
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [limit, setLimit] = useState(0);
  const [task, setTask] = useState('description');
  const [brief, setBrief] = useState('');
  const [consent, setConsent] = useState(false);
  const [reviewed, setReviewed] = useState(false);
  const [content, setContent] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const url = '/api/organizations/' + organizationId + '/ai';
  useEffect(() => {
    const abort = new AbortController();
    setEnabled(null);
    setContent('');
    setMessage('');
    void fetch(url, { signal: abort.signal })
      .then(async (r) => {
        if (!r.ok) throw new Error();
        const status = await r.json();
        setEnabled(status.enabled);
        setLimit(status.dailyLimit);
      })
      .catch(() => {
        if (!abort.signal.aborted)
          setMessage(
            ar
              ? 'تعذر تحميل حالة المساعد. أعد فتح الصفحة للمحاولة.'
              : 'Unable to load assistant status. Reload to retry.',
          );
      });
    return () => abort.abort();
  }, [url, ar]);
  async function generate() {
    setBusy(true);
    setMessage('');
    setContent('');
    setReviewed(false);
    try {
      const r = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Ventro-CSRF': '1' },
        body: JSON.stringify({ task, brief, locale, authorizedNonPersonalInput: consent }),
      });
      if (!r.ok) {
        setMessage(
          r.status === 429
            ? ar
              ? 'وصلت المؤسسة إلى حد الاستخدام اليومي.'
              : 'Organization daily limit reached.'
            : ar
              ? 'تعذر التوليد. تحقق من إزالة البيانات الشخصية وحاول لاحقًا.'
              : 'Generation failed. Remove personal information and try again later.',
        );
        return;
      }
      const result = await r.json();
      setContent(result.content);
    } catch {
      setMessage(ar ? 'الاتصال غير متاح. حاول لاحقًا.' : 'Connection unavailable. Try again later.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="dash-panel grid gap-4" aria-busy={busy}>
      <h2>{ar ? 'مساعد الفعاليات الاختياري' : 'Optional event assistant'}</h2>
      {enabled === null && !message && <p role="status">{ar ? 'جارٍ التحميل…' : 'Loading…'}</p>}
      {enabled === false && (
        <p>
          {ar
            ? 'المساعد معطّل. لم يتم إعداد مزوّد ذكاء اصطناعي.'
            : 'Assistant disabled. No AI provider is configured.'}
        </p>
      )}
      {enabled && (
        <>
          <p>
            {ar
              ? 'يُرسل النص إلى Anthropic. استخدم نصًا مجهول الهوية فقط. الحد اليومي للمؤسسة: '
              : 'Your brief is sent to Anthropic. Use anonymized information only. Organization daily limit: '}
            {limit}
          </p>
          <label>
            {ar ? 'المهمة' : 'Task'}
            <select
              value={task}
              disabled={busy}
              onChange={(e) => {
                setTask(e.target.value);
                setContent('');
                setReviewed(false);
              }}
            >
              {(['description', 'agenda', 'questions', 'feedback', 'planning'] as const).map(
                (value, index) => (
                  <option key={value} value={value}>
                    {
                      (ar
                        ? [
                            'وصف الفعالية',
                            'اقتراح جدول الأعمال',
                            'أسئلة التسجيل',
                            'تلخيص ملاحظات مجهولة الهوية',
                            'تخطيط الفعالية',
                          ]
                        : [
                            'Event description',
                            'Agenda suggestions',
                            'Registration questions',
                            'Anonymized feedback summary',
                            'Planning assistant',
                          ])[index]
                    }
                  </option>
                ),
              )}
            </select>
          </label>
          <label>
            {ar ? 'النص والسياق' : 'Brief and context'}
            <textarea
              className="w-full border rounded p-3 bg-transparent"
              rows={5}
              maxLength={6000}
              value={brief}
              disabled={busy}
              onChange={(e) => {
                setBrief(e.target.value);
                setConsent(false);
              }}
            />
          </label>
          <label>
            <input
              type="checkbox"
              checked={consent}
              disabled={busy}
              onChange={(e) => setConsent(e.target.checked)}
            />{' '}
            {ar
              ? 'أؤكد أن النص خالٍ من بيانات المشاركين الشخصية ومصرّح بإرساله للمزوّد.'
              : 'I confirm this brief contains no participant personal information and is authorized for provider processing.'}
          </label>
          <Button
            disabled={busy || !consent || brief.trim().length < 10}
            onClick={() => void generate()}
          >
            {busy ? (ar ? 'جارٍ التوليد…' : 'Generating…') : ar ? 'إنشاء مسودة' : 'Generate draft'}
          </Button>
        </>
      )}
      {content && (
        <>
          <strong>
            {ar
              ? 'مسودة مولّدة بالذكاء الاصطناعي — تحتاج مراجعتك'
              : 'AI-generated draft — review required'}
          </strong>
          <label>
            {ar ? 'راجع وعدّل المسودة' : 'Review and edit draft'}
            <textarea
              rows={10}
              className="w-full border rounded p-3 bg-transparent"
              value={content}
              onChange={(e) => {
                setContent(e.target.value);
                setReviewed(false);
              }}
            />
          </label>
          <label>
            <input
              type="checkbox"
              checked={reviewed}
              onChange={(e) => setReviewed(e.target.checked)}
            />{' '}
            {ar
              ? 'راجعت المحتوى ودقته وأوافق على استخدامه.'
              : 'I reviewed the content and its accuracy and approve its use.'}
          </label>
          <Button
            disabled={!reviewed}
            onClick={() => {
              void navigator.clipboard
                .writeText(content)
                .then(() =>
                  setMessage(
                    ar
                      ? 'تم نسخ المسودة المعتمدة. لم يتم نشر أي محتوى.'
                      : 'Approved draft copied. No content has been published.',
                  ),
                )
                .catch(() =>
                  setMessage(
                    ar
                      ? 'تعذر النسخ. يمكنك نسخ النص المحدد يدويًا.'
                      : 'Copy failed. Select the text and copy manually.',
                  ),
                );
            }}
          >
            {ar ? 'نسخ المسودة المعتمدة' : 'Copy approved draft'}
          </Button>
        </>
      )}
      {message && <p role="status">{message}</p>}
    </section>
  );
}
