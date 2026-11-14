'use client';

import { useEffect, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import type { Locale } from '@ventro/types';
import { text } from '../../lib/marketing/site';

type Poll = {
  id: string;
  question: string;
  status: string;
  options: { id: string; label: string; votes: number }[];
};

export function PresenterResults({
  eventId,
  title,
  locale,
}: {
  eventId: string;
  title: string;
  locale: Locale;
}) {
  const t = (en: string, ar: string) => text(locale, en, ar);
  const [polls, setPolls] = useState<Poll[]>([]);
  const [message, setMessage] = useState('');

  useEffect(() => {
    void fetch('/api/engagement/events/' + eventId + '/polls')
      .then((response) => (response.ok ? response.json() : Promise.reject()))
      .then((data) => setPolls(data.items ?? []))
      .catch(() =>
        setMessage(
          t(
            'This presenter view is available to the event team.',
            'عرض المقدّم متاح لفريق الفعالية فقط.',
          ),
        ),
      );
    const socket: Socket = io(
      (process.env.NEXT_PUBLIC_API_ORIGIN ?? 'http://127.0.0.1:4000') + '/engagement',
      {
        withCredentials: true,
      },
    );
    socket.on('connect', () => socket?.emit('room:join', { eventId }));
    socket.on('poll:update', (poll: Poll) =>
      setPolls((rows) => [poll, ...rows.filter((row) => row.id !== poll.id)]),
    );
    socket.on('poll:results', (poll: Poll) =>
      setPolls((rows) => rows.map((row) => (row.id === poll.id ? poll : row))),
    );
    return () => {
      socket?.disconnect();
    };
  }, [eventId, t]);

  return (
    <main className="container py-12" aria-live="polite">
      <p className="dash-eyebrow">VENTRO / PRESENTER</p>
      <h1>{title}</h1>
      <p>{t('Live audience results', 'نتائج الجمهور المباشرة')}</p>
      {message && <p role="alert">{message}</p>}
      {!message && !polls.length && (
        <p>{t('No polls have been created yet.', 'لم يُنشأ استطلاع بعد.')}</p>
      )}
      <div className="grid gap-6 mt-8">
        {polls.map((poll) => {
          const total = poll.options.reduce((sum, option) => sum + option.votes, 0);
          return (
            <article className="dash-panel" key={poll.id}>
              <div className="flex justify-between gap-4">
                <h2>{poll.question}</h2>
                <strong>{poll.status}</strong>
              </div>
              <ul className="grid gap-3 mt-5">
                {poll.options.map((option) => {
                  const share = total ? Math.round((option.votes / total) * 100) : 0;
                  return (
                    <li key={option.id}>
                      <div className="flex justify-between gap-4">
                        <span>{option.label}</span>
                        <strong>
                          {option.votes} · {share}%
                        </strong>
                      </div>
                      <div className="h-2 rounded-full bg-slate-200 dark:bg-slate-700 mt-2 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-[var(--color-lavender)]"
                          style={{ width: share + '%' }}
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
            </article>
          );
        })}
      </div>
    </main>
  );
}
