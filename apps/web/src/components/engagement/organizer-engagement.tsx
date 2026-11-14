'use client';
import { useState } from 'react';
import { eventListSchema, type Locale, type Organization } from '@ventro/types';
import { Button, Input } from '@ventro/ui';
import { text } from '../../lib/marketing/site';
import { DashboardFailure, DashboardSkeleton, useDashboardData } from '../dashboard/data';
type Poll = {
  id: string;
  eventId: string;
  question: string;
  multiple: boolean;
  status: string;
  options: { id: string; label: string; votes: number }[];
};
export function OrganizerEngagement({
  locale,
  organization,
}: {
  locale: Locale;
  organization: Organization;
}) {
  const t = (en: string, ar: string) => text(locale, en, ar);
  const [eventId, setEventId] = useState('');
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState('');
  const [multiple, setMultiple] = useState(false);
  const [polls, setPolls] = useState<Poll[]>([]);
  const [message, setMessage] = useState('');
  const events = useDashboardData('organizations/' + organization.id + '/events', eventListSchema);
  const request = async (path: string, body?: object) => {
    const r = await fetch('/api/engagement/' + path, {
      method: body ? 'POST' : 'GET',
      headers: body ? { 'Content-Type': 'application/json', 'X-Ventro-CSRF': '1' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!r.ok) throw new Error();
    return r.json();
  };
  async function load(id = eventId) {
    if (!id) return;
    try {
      setPolls((await request('events/' + id + '/polls')).items);
    } catch {
      setMessage(t('Unable to load engagement.', 'تعذر تحميل التفاعل.'));
    }
  }
  async function create() {
    try {
      const poll = await request('events/' + eventId + '/polls', {
        question,
        options: options
          .split(',')
          .map((x) => x.trim())
          .filter(Boolean),
        multiple,
      });
      setPolls((rows) => [poll, ...rows]);
      setQuestion('');
      setOptions('');
      setMessage(t('Poll created as a draft.', 'تم إنشاء الاستطلاع كمسودة.'));
    } catch {
      setMessage(t('Unable to create poll.', 'تعذر إنشاء الاستطلاع.'));
    }
  }
  async function state(poll: Poll, action: 'launch' | 'close') {
    try {
      const next = await request('polls/' + poll.id + '/' + action, {});
      setPolls((rows) => rows.map((x) => (x.id === poll.id ? next : x)));
    } catch {
      setMessage(t('Unable to update poll.', 'تعذر تحديث الاستطلاع.'));
    }
  }
  return (
    <section className="grid gap-5">
      <div className="dash-panel">
        <p className="dash-eyebrow">VENTRO / ENGAGEMENT</p>
        <h2>{t('Live polling and Q&A', 'استطلاعات وأسئلة مباشرة')}</h2>
        {events.loading && <DashboardSkeleton locale={locale} compact />}
        {events.error && (
          <DashboardFailure status={events.error} retry={events.refresh} t={t} />
        )}{' '}
        {events.data && (
          <select
            value={eventId}
            onChange={(e) => {
              setEventId(e.target.value);
              void load(e.target.value);
            }}
          >
            <option value="">{t('Select event', 'اختر فعالية')}</option>
            {events.data.items.map((event) => (
              <option key={event.id} value={event.id}>
                {event.title}
              </option>
            ))}
          </select>
        )}
      </div>
      {eventId && (
        <>
          <div className="dash-panel grid gap-3">
            <h3>{t('Create poll', 'إنشاء استطلاع')}</h3>
            <Input
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder={t('Question', 'السؤال')}
            />
            <Input
              value={options}
              onChange={(e) => setOptions(e.target.value)}
              placeholder={t('Options separated by commas', 'خيارات مفصولة بفواصل')}
            />
            <label>
              <input
                type="checkbox"
                checked={multiple}
                onChange={(e) => setMultiple(e.target.checked)}
              />{' '}
              {t('Allow multiple choices', 'السماح باختيارات متعددة')}
            </label>
            <Button disabled={!question || !options} onClick={() => void create()}>
              {t('Save poll', 'حفظ الاستطلاع')}
            </Button>
            {message && <p role="status">{message}</p>}
          </div>
          <div className="grid gap-4">
            {polls.map((poll) => (
              <article className="dash-panel" key={poll.id}>
                <div className="flex justify-between gap-3">
                  <h3>{poll.question}</h3>
                  <strong>{poll.status}</strong>
                </div>
                <ul>
                  {poll.options.map((option) => (
                    <li key={option.id}>
                      {option.label}: {option.votes}
                    </li>
                  ))}
                </ul>
                {poll.status === 'DRAFT' && (
                  <Button onClick={() => void state(poll, 'launch')}>
                    {t('Launch live', 'إطلاق مباشر')}
                  </Button>
                )}
                {poll.status === 'LIVE' && (
                  <Button variant="outline" onClick={() => void state(poll, 'close')}>
                    {t('Close poll', 'إغلاق الاستطلاع')}
                  </Button>
                )}
              </article>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
