'use client';
import { useEffect, useState } from 'react';
import { registrationFormSchema, type Locale } from '@ventro/types';
import { Button, Input } from '@ventro/ui';
import { text } from '../../lib/marketing/site';
import {
  DashboardFailure,
  DashboardSkeleton,
  dashboardRequest,
  useDashboardData,
} from '../dashboard/data';
type Kind =
  | 'TEXT'
  | 'TEXTAREA'
  | 'EMAIL'
  | 'PHONE'
  | 'NUMBER'
  | 'SELECT'
  | 'RADIO'
  | 'CHECKBOX'
  | 'DATE'
  | 'CONSENT';
type Field = {
  key: string;
  label: string;
  type: Kind;
  required: boolean;
  helpText: string;
  options: string[];
  visibilityRule?: { field: string; equals: string | boolean };
};
const kinds: Kind[] = [
  'TEXT',
  'TEXTAREA',
  'EMAIL',
  'PHONE',
  'NUMBER',
  'SELECT',
  'RADIO',
  'CHECKBOX',
  'DATE',
  'CONSENT',
];
const choice = new Set<Kind>(['SELECT', 'RADIO', 'CHECKBOX']);
export function FormBuilder({
  locale,
  organizationId,
  eventId,
}: {
  locale: Locale;
  organizationId: string;
  eventId: string;
}) {
  const t = (a: string, b: string) => text(locale, a, b),
    url = 'organizations/' + organizationId + '/events/' + eventId + '/registration-form',
    data = useDashboardData(url, registrationFormSchema);
  const [fields, setFields] = useState<Field[] | null>(null),
    [preview, setPreview] = useState(false),
    [answers, setAnswers] = useState<Record<string, unknown>>({}),
    [notice, setNotice] = useState(''),
    [drag, setDrag] = useState<number | null>(null),
    [pending, setPending] = useState(false);
  useEffect(() => {
    if (data.data && !fields)
      setFields(
        data.data.fields.map((f) => ({
          key: f.key,
          label: f.label,
          type: f.type,
          required: f.required,
          helpText: f.helpText,
          options: Array.isArray(f.options)
            ? f.options.filter((x): x is string => typeof x === 'string')
            : [],
          visibilityRule:
            f.visibilityRule &&
            typeof f.visibilityRule === 'object' &&
            !Array.isArray(f.visibilityRule)
              ? (f.visibilityRule as { field: string; equals: string | boolean })
              : undefined,
        })),
      );
  }, [data.data, fields]);
  const list = fields ?? [];
  const edit = (i: number, p: Partial<Field>) =>
    setFields(list.map((f, n) => (n === i ? { ...f, ...p } : f)));
  const move = (a: number, b: number) => {
    const x = [...list],
      [item] = x.splice(a, 1);
    x.splice(b, 0, item!);
    setFields(x);
  };
  async function save(publish = false) {
    if (
      !list.length ||
      new Set(list.map((f) => f.key)).size !== list.length ||
      list.some(
        (f) =>
          !f.label ||
          !f.key.match(/^[a-z][a-z0-9_]*$/) ||
          (choice.has(f.type) && !f.options.length),
      )
    ) {
      setNotice(
        t(
          'Complete every field, use unique keys, and add options to choice fields.',
          'أكمل كل الحقول واستخدم مفاتيح فريدة وأضف خيارات لحقول الاختيار.',
        ),
      );
      return;
    }
    setPending(true);
    try {
      await dashboardRequest(url, registrationFormSchema, {
        method: 'POST',
        body: { fields: list },
      });
      if (publish) await dashboardRequest(url + '/publish', registrationFormSchema, { body: {} });
      setNotice(
        publish
          ? t('Form published.', 'تم نشر النموذج.')
          : t('Form schema saved.', 'تم حفظ مخطط النموذج.'),
      );
      data.refresh();
    } catch {
      setNotice(t('Unable to save form.', 'تعذر حفظ النموذج.'));
    } finally {
      setPending(false);
    }
  }
  function previewField(f: Field) {
    if (f.visibilityRule && answers[f.visibilityRule.field] !== f.visibilityRule.equals)
      return null;
    const set = (v: unknown) => setAnswers({ ...answers, [f.key]: v });
    if (f.type === 'TEXTAREA')
      return <textarea className="ui-textarea" onChange={(e) => set(e.target.value)} />;
    if (f.type === 'SELECT')
      return (
        <select onChange={(e) => set(e.target.value)}>
          <option value="">Choose…</option>
          {f.options.map((x) => (
            <option key={x}>{x}</option>
          ))}
        </select>
      );
    if (f.type === 'RADIO' || f.type === 'CHECKBOX')
      return (
        <div>
          {f.options.map((x) => (
            <label className="me-3" key={x}>
              <input
                type={f.type === 'RADIO' ? 'radio' : 'checkbox'}
                name={f.key}
                onChange={(e) =>
                  set(
                    f.type === 'RADIO'
                      ? x
                      : e.target.checked
                        ? [...((answers[f.key] as string[]) ?? []), x]
                        : ((answers[f.key] as string[]) ?? []).filter((v) => v !== x),
                  )
                }
              />{' '}
              {x}
            </label>
          ))}
        </div>
      );
    if (f.type === 'CONSENT')
      return (
        <label>
          <input type="checkbox" onChange={(e) => set(e.target.checked)} /> {f.label}
        </label>
      );
    return (
      <Input
        type={
          f.type === 'EMAIL'
            ? 'email'
            : f.type === 'NUMBER'
              ? 'number'
              : f.type === 'DATE'
                ? 'date'
                : 'text'
        }
        onChange={(e) => set(e.target.value)}
      />
    );
  }
  return (
    <section className="dash-panel">
      <div className="dash-section-heading">
        <div>
          <p className="dash-eyebrow">VENTRO / {t('REGISTRATION', 'التسجيل')}</p>
          <h2>{t('Dynamic registration form', 'نموذج تسجيل ديناميكي')}</h2>
        </div>
        <Button variant="outline" onClick={() => setPreview(!preview)}>
          {preview ? t('Edit fields', 'تعديل الحقول') : t('Preview form', 'معاينة النموذج')}
        </Button>
      </div>
      {data.loading && <DashboardSkeleton locale={locale} compact />}
      {data.error && <DashboardFailure status={data.error} retry={data.refresh} t={t} />}{' '}
      {preview ? (
        <div className="dash-form-preview">
          {list.map((f) => (
            <label className="grid gap-2" key={f.key}>
              {f.type !== 'CONSENT' && (
                <span>
                  {f.label}
                  {f.required ? ' *' : ''}
                </span>
              )}
              {f.helpText && <small>{f.helpText}</small>}
              {previewField(f)}
            </label>
          ))}
        </div>
      ) : (
        <div className="grid gap-3">
          {list.map((f, i) => (
            <article
              className="dash-event-card"
              key={f.key + i}
              draggable
              onDragStart={() => setDrag(i)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => {
                if (drag !== null) move(drag, i);
              }}
            >
              <div>
                ⠿ {t('Field', 'حقل')} {i + 1}{' '}
                <Button variant="ghost" onClick={() => setFields(list.filter((_, n) => n !== i))}>
                  {t('Remove', 'حذف')}
                </Button>
              </div>
              <Input
                aria-label="Field label"
                value={f.label}
                placeholder={t('Field label', 'تسمية الحقل')}
                onChange={(e) => edit(i, { label: e.target.value })}
              />
              <Input
                aria-label="Field key"
                value={f.key}
                placeholder="e.g. company"
                onChange={(e) =>
                  edit(i, { key: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '') })
                }
              />
              <select value={f.type} onChange={(e) => edit(i, { type: e.target.value as Kind })}>
                {kinds.map((k) => (
                  <option key={k}>{k}</option>
                ))}
              </select>
              <Input
                aria-label="Help text"
                value={f.helpText}
                placeholder={t('Help text', 'نص مساعد')}
                onChange={(e) => edit(i, { helpText: e.target.value })}
              />
              <label>
                <input
                  type="checkbox"
                  checked={f.required}
                  onChange={(e) => edit(i, { required: e.target.checked })}
                />{' '}
                {t('Required', 'مطلوب')}
              </label>
              {choice.has(f.type) && (
                <Input
                  aria-label="Options"
                  value={f.options.join(', ')}
                  placeholder={t('Comma-separated options', 'خيارات مفصولة بفاصلة')}
                  onChange={(e) =>
                    edit(i, {
                      options: e.target.value
                        .split(',')
                        .map((x) => x.trim())
                        .filter(Boolean),
                    })
                  }
                />
              )}
              <select
                value={f.visibilityRule?.field ?? ''}
                onChange={(e) =>
                  edit(i, {
                    visibilityRule: e.target.value
                      ? { field: e.target.value, equals: '' }
                      : undefined,
                  })
                }
              >
                <option value="">{t('Always visible', 'ظاهر دائمًا')}</option>
                {list
                  .filter((_, n) => n !== i)
                  .map((x) => (
                    <option key={x.key} value={x.key}>
                      {x.label || x.key}
                    </option>
                  ))}
              </select>
              {f.visibilityRule && (
                <Input
                  aria-label="Conditional value"
                  value={String(f.visibilityRule.equals)}
                  placeholder={t('Show when equals', 'أظهر عند المساواة')}
                  onChange={(e) =>
                    edit(i, { visibilityRule: { ...f.visibilityRule!, equals: e.target.value } })
                  }
                />
              )}
            </article>
          ))}
        </div>
      )}
      <div className="mt-4 flex gap-3">
        <Button
          variant="outline"
          onClick={() =>
            setFields([
              ...list,
              {
                key: 'field_' + (list.length + 1),
                label: '',
                type: 'TEXT',
                required: false,
                helpText: '',
                options: [],
              },
            ])
          }
        >
          {t('Add field', 'إضافة حقل')}
        </Button>
        <Button variant="outline" disabled={pending} onClick={() => void save()}>
          {t('Save form schema', 'حفظ مخطط النموذج')}
        </Button>
        <Button disabled={pending} onClick={() => void save(true)}>
          {t('Publish form', 'نشر النموذج')}
        </Button>
      </div>
      {notice && <p role="status">{notice}</p>}
    </section>
  );
}
