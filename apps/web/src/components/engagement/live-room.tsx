'use client';
import { useEffect, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import { Button } from '@ventro/ui';
import type { Locale } from '@ventro/types';
import { text } from '../../lib/marketing/site';
type Poll = {
  id: string;
  question: string;
  multiple: boolean;
  options: { id: string; label: string; votes: number }[];
};
type Question = { id: string; content: string; votes: number; answeredAt: string | null };
export function LiveRoom({
  locale,
  eventId,
  title,
}: {
  locale: Locale;
  eventId: string;
  title: string;
}) {
  const t = (en: string, ar: string) => text(locale, en, ar);
  const [polls, setPolls] = useState<Poll[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [selected, setSelected] = useState<Record<string, string[]>>({});
  const [question, setQuestion] = useState('');
  const [message, setMessage] = useState('');
  useEffect(() => {
    void Promise.all([
      fetch('/api/engagement/events/' + eventId + '/live-polls').then((r) =>
        r.ok ? r.json() : { items: [] },
      ),
      fetch('/api/engagement/events/' + eventId + '/questions').then((r) => (r.ok ? r.json() : [])),
    ])
      .then(([pollData, questionData]) => {
        setPolls(pollData.items ?? []);
        setQuestions(questionData ?? []);
      })
      .catch(() =>
        setMessage(t('Unable to join the live room.', 'تعذر الانضمام إلى الغرفة المباشرة.')),
      );
    const socket: Socket = io(
      (process.env.NEXT_PUBLIC_API_ORIGIN ?? 'http://127.0.0.1:4000') + '/engagement',
      {
        withCredentials: true,
      },
    );
    socket.on('connect', () => socket?.emit('room:join', { eventId }));
    socket.on('poll:update', (poll: Poll) =>
      setPolls((rows) => [poll, ...rows.filter((x) => x.id !== poll.id)]),
    );
    socket.on('poll:results', (poll: Poll) =>
      setPolls((rows) => rows.map((x) => (x.id === poll.id ? poll : x))),
    );
    socket.on('questions:update', (rows: Question[]) => setQuestions(rows));
    socket.on('action:error', () =>
      setMessage(t('That action could not be completed.', 'تعذر إكمال هذا الإجراء.')),
    );
    socket.on('room:error', () =>
      setMessage(t('You are not authorized for this room.', 'غير مصرح لك بدخول هذه الغرفة.')),
    );
    return () => {
      socket?.disconnect();
    };
  }, [eventId, t]);
  const post = (path: string, body: object) =>
    fetch('/api/engagement/' + path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Ventro-CSRF': '1' },
      body: JSON.stringify(body),
    });
  async function vote(poll: Poll) {
    const response = await post('polls/' + poll.id + '/vote', {
      optionIds: selected[poll.id] ?? [],
    });
    setMessage(
      response.ok
        ? t('Vote recorded.', 'تم تسجيل التصويت.')
        : t('Vote was not accepted.', 'لم يُقبل التصويت.'),
    );
  }
  async function submit() {
    const response = await post('events/' + eventId + '/questions', { content: question });
    if (response.ok) setQuestion('');
    setMessage(
      response.ok
        ? t('Question submitted.', 'تم إرسال السؤال.')
        : t('Question could not be submitted.', 'تعذر إرسال السؤال.'),
    );
  }
  return (
    <main className="container py-12">
      <p className="dash-eyebrow">VENTRO / LIVE</p>
      <h1>{title}</h1>
      <p>{t('Live polls and audience questions', 'استطلاعات مباشرة وأسئلة الجمهور')}</p>
      {message && <p role="status">{message}</p>}
      <section className="grid gap-5 mt-8">
        {polls.map((poll) => (
          <article className="m-feature-card" key={poll.id}>
            <h2>{poll.question}</h2>
            {poll.options.map((option) => {
              const picks = selected[poll.id] ?? [];
              const active = picks.includes(option.id);
              return (
                <label className="block my-2" key={option.id}>
                  <input
                    type={poll.multiple ? 'checkbox' : 'radio'}
                    name={poll.id}
                    checked={active}
                    onChange={(e) =>
                      setSelected((value) => ({
                        ...value,
                        [poll.id]: poll.multiple
                          ? e.target.checked
                            ? [...picks, option.id]
                            : picks.filter((x) => x !== option.id)
                          : e.target.checked
                            ? [option.id]
                            : [],
                      }))
                    }
                  />{' '}
                  {option.label} <small>({option.votes})</small>
                </label>
              );
            })}
            <Button onClick={() => void vote(poll)}>{t('Vote', 'تصويت')}</Button>
          </article>
        ))}
      </section>
      <section className="m-feature-card mt-8">
        <h2>{t('Ask a question', 'اطرح سؤالًا')}</h2>
        <textarea
          className="ui-textarea"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          maxLength={1000}
        />
        <Button className="mt-3" onClick={() => void submit()}>
          {t('Submit question', 'إرسال السؤال')}
        </Button>
        <ul className="mt-5">
          {questions.map((item) => (
            <li key={item.id}>
              <strong>{item.content}</strong> · {item.votes} {t('votes', 'أصوات')}{' '}
              {item.answeredAt && ' ✓'}
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
