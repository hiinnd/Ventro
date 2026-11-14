'use client';
import { useEffect, useState } from 'react';
import {
  eventListSchema,
  eventSchema,
  type Event,
  type Locale,
  type Organization,
} from '@ventro/types';
import { Badge, Button, EmptyState, Input, Modal } from '@ventro/ui';
import { text } from '../../lib/marketing/site';
import {
  DashboardFailure,
  DashboardSkeleton,
  dashboardRequest,
  useDashboardData,
} from '../dashboard/data';

type Speaker = { name: string; title: string; bio: string };
type Agenda = {
  title: string;
  description: string;
  startsAt: string;
  endsAt: string;
  speakerIndex: string;
};
const toLocal = (value: string | null) => (value ? new Date(value).toISOString().slice(0, 16) : '');
const steps = ['Essentials', 'Schedule', 'People & agenda', 'Review'];

export function EventsPanel({
  locale,
  organization,
}: {
  locale: Locale;
  organization: Organization;
}) {
  const t = (en: string, ar: string) => text(locale, en, ar);
  const [event, setEvent] = useState<Event | null>(null);
  const [open, setOpen] = useState(false);
  const list = useDashboardData(
    'organizations/' + organization.id + '/events?page=1',
    eventListSchema,
  );
  async function create() {
    try {
      setEvent(
        await dashboardRequest('organizations/' + organization.id + '/events', eventSchema, {
          body: {},
        }),
      );
      setOpen(true);
    } catch {
      list.refresh();
    }
  }
  return (
    <section className="dash-panel" aria-labelledby="events-title">
      <div className="dash-section-heading">
        <div>
          <p className="dash-eyebrow">VENTRO / {t('EVENTS', 'الفعاليات')}</p>
          <h2 id="events-title">{t('Your event program', 'برنامج فعالياتك')}</h2>
        </div>
        <Button onClick={() => void create()}>{t('Create event', 'إنشاء فعالية')}</Button>
      </div>
      {list.loading && <DashboardSkeleton locale={locale} />}{' '}
      {list.error && <DashboardFailure status={list.error} retry={list.refresh} t={t} />}{' '}
      {list.data?.items.length === 0 && (
        <EmptyState
          title={t('Your first event starts here', 'تبدأ فعاليتك الأولى من هنا')}
          description={t(
            'Create a draft, then build a complete participant experience.',
            'أنشئ مسودة ثم ابنِ تجربة متكاملة للمشاركين.',
          )}
          action={
            <Button onClick={() => void create()}>{t('Create event', 'إنشاء فعالية')}</Button>
          }
        />
      )}
      <div className="dash-event-grid">
        {list.data?.items.map((item) => (
          <article className="dash-event-card" key={item.id}>
            <Badge variant={item.status === 'PUBLISHED' ? 'success' : 'neutral'}>
              {item.status}
            </Badge>
            <h3>{item.title || t('Untitled event', 'فعالية دون عنوان')}</h3>
            <p>
              {item.startsAt
                ? new Date(item.startsAt).toLocaleString(locale === 'ar' ? 'ar-JO' : 'en-JO')
                : t('Schedule not set', 'لم يحدد الموعد')}
            </p>
            <Button
              variant="outline"
              onClick={() => {
                setEvent(item);
                setOpen(true);
              }}
            >
              {t('Open builder', 'فتح المنشئ')}
            </Button>
          </article>
        ))}
      </div>
      <EventBuilder
        locale={locale}
        organizationId={organization.id}
        event={event}
        open={open}
        onOpenChange={setOpen}
        saved={list.refresh}
      />
    </section>
  );
}

function EventBuilder({
  locale,
  organizationId,
  event,
  open,
  onOpenChange,
  saved,
}: {
  locale: Locale;
  organizationId: string;
  event: Event | null;
  open: boolean;
  onOpenChange: (value: boolean) => void;
  saved: () => void;
}) {
  const t = (en: string, ar: string) => text(locale, en, ar);
  const [step, setStep] = useState(0);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [visibility, setVisibility] = useState<'PUBLIC' | 'PRIVATE'>('PRIVATE');
  const [locationType, setLocationType] = useState<'VENUE' | 'ONLINE'>('VENUE');
  const [venue, setVenue] = useState('');
  const [onlineUrl, setOnlineUrl] = useState('');
  const [timezone, setTimezone] = useState('Asia/Amman');
  const [startsAt, setStartsAt] = useState('');
  const [endsAt, setEndsAt] = useState('');
  const [capacity, setCapacity] = useState('');
  const [deadline, setDeadline] = useState('');
  const [speakers, setSpeakers] = useState<Speaker[]>([]);
  const [sessions, setSessions] = useState<Agenda[]>([]);
  useEffect(() => {
    if (!event) return;
    setStep(0);
    setTitle(event.title);
    setDescription(event.description);
    setCategory(event.category ?? '');
    setVisibility(event.visibility);
    setLocationType(event.locationType);
    setVenue(event.venue);
    setOnlineUrl(event.onlineUrl);
    setTimezone(event.timezone);
    setStartsAt(toLocal(event.startsAt));
    setEndsAt(toLocal(event.endsAt));
    setCapacity(event.capacity?.toString() ?? '');
    setDeadline(toLocal(event.registrationDeadline));
    setSpeakers(event.speakers.map((x) => ({ name: x.name, title: x.title, bio: x.bio })));
    setSessions(
      event.sessions.map((x) => ({
        title: x.title,
        description: x.description,
        startsAt: toLocal(x.startsAt),
        endsAt: toLocal(x.endsAt),
        speakerIndex: x.speakerId
          ? String(event.speakers.findIndex((s) => s.id === x.speakerId))
          : '',
      })),
    );
    setError('');
    setNotice('');
  }, [event]);
  if (!event) return null;
  const base = 'organizations/' + organizationId + '/events/' + event.id;
  const body = {
    title,
    description,
    category,
    visibility,
    locationType,
    venue,
    onlineUrl,
    timezone,
    startsAt: startsAt ? new Date(startsAt).toISOString() : undefined,
    endsAt: endsAt ? new Date(endsAt).toISOString() : undefined,
    capacity: capacity ? Number(capacity) : null,
    registrationDeadline: deadline ? new Date(deadline).toISOString() : null,
    speakers,
    sessions: sessions.map((s) => ({
      ...s,
      speakerIndex: s.speakerIndex === '' ? undefined : Number(s.speakerIndex),
      startsAt: new Date(s.startsAt).toISOString(),
      endsAt: new Date(s.endsAt).toISOString(),
    })),
  };
  async function save(publish = false) {
    setPending(true);
    setError('');
    try {
      await dashboardRequest(base, eventSchema, { method: 'PATCH', body });
      if (publish) {
        if (
          !confirm(
            t(
              'Publish this event? Participants will be able to discover it when it is public.',
              'هل تريد نشر الفعالية؟ سيتمكن المشاركون من اكتشافها عندما تكون عامة.',
            ),
          )
        )
          return;
        await dashboardRequest(base + '/publish', eventSchema, { body: {} });
      }
      saved();
      setNotice(
        publish ? t('Event published.', 'تم نشر الفعالية.') : t('Draft saved.', 'تم حفظ المسودة.'),
      );
    } catch {
      setError(
        t(
          'Unable to save. Check event details and schedule.',
          'تعذر الحفظ. راجع تفاصيل الفعالية والجدول.',
        ),
      );
    } finally {
      setPending(false);
    }
  }
  async function action(name: 'duplicate' | 'unpublish' | 'cancel') {
    setPending(true);
    try {
      const result = await dashboardRequest(base + '/' + name, eventSchema, { body: {} });
      if (name === 'duplicate') setNotice(t('A draft copy was created.', 'تم إنشاء نسخة مسودة.'));
      else {
        setNotice(t('Event updated.', 'تم تحديث الفعالية.'));
        setTitle(result.title);
      }
      saved();
    } catch {
      setError(t('Unable to update event.', 'تعذر تحديث الفعالية.'));
    } finally {
      setPending(false);
    }
  }
  async function cover(file: File | undefined) {
    if (!file) return;
    setPending(true);
    try {
      const form = new FormData();
      form.append('file', file);
      const response = await fetch(
        '/api/organizations/' + organizationId + '/events/' + event?.id + '/cover',
        { method: 'POST', headers: { 'X-Ventro-CSRF': '1' }, body: form },
      );
      if (!response.ok) throw new Error();
      eventSchema.parse(await response.json());
      saved();
      setNotice(t('Cover uploaded.', 'تم رفع الغلاف.'));
    } catch {
      setError(t('Unable to upload this cover.', 'تعذر رفع هذا الغلاف.'));
    } finally {
      setPending(false);
    }
  }
  const updateSpeaker = (index: number, patch: Partial<Speaker>) =>
    setSpeakers((rows) => rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  const updateSession = (index: number, patch: Partial<Agenda>) =>
    setSessions((rows) => rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      closeLabel={t('Close builder', 'إغلاق المنشئ')}
      title={t('Event builder', 'منشئ الفعالية')}
      description={t(
        'Save a draft at any point. Publishing uses final server checks.',
        'احفظ مسودة في أي وقت. يستخدم النشر تحقق الخادم النهائي.',
      )}
    >
      <ol className="dash-builder-steps">
        {steps.map((label, index) => (
          <li key={label} className={index === step ? 'is-current' : ''}>
            <button type="button" onClick={() => setStep(index)}>
              {index + 1}.{' '}
              {t(label, ['الأساسيات', 'الجدول', 'الأشخاص والأجندة', 'المراجعة'][index]!)}
            </button>
          </li>
        ))}
      </ol>
      {step === 0 && (
        <div className="grid gap-4">
          <label>
            {t('Title', 'العنوان')}
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </label>
          <label>
            {t('Description', 'الوصف')}
            <textarea
              className="ui-textarea"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </label>
          <label>
            {t('Category', 'الفئة')}
            <Input value={category} onChange={(e) => setCategory(e.target.value)} />
          </label>
          <label>
            {t('Visibility', 'الظهور')}
            <select
              value={visibility}
              onChange={(e) => setVisibility(e.target.value as 'PUBLIC' | 'PRIVATE')}
            >
              <option value="PRIVATE">{t('Private', 'خاص')}</option>
              <option value="PUBLIC">{t('Public', 'عام')}</option>
            </select>
          </label>
          <label>
            {t('Cover image', 'صورة الغلاف')}
            <Input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              disabled={pending}
              onChange={(e) => void cover(e.target.files?.[0])}
            />
          </label>
        </div>
      )}
      {step === 1 && (
        <div className="grid gap-4">
          <label>
            {t('Location type', 'نوع المكان')}
            <select
              value={locationType}
              onChange={(e) => setLocationType(e.target.value as 'VENUE' | 'ONLINE')}
            >
              <option value="VENUE">{t('Venue', 'مكان فعلي')}</option>
              <option value="ONLINE">{t('Online', 'عبر الإنترنت')}</option>
            </select>
          </label>
          {locationType === 'VENUE' ? (
            <label>
              {t('Venue', 'المكان')}
              <Input value={venue} onChange={(e) => setVenue(e.target.value)} />
            </label>
          ) : (
            <label>
              {t('Secure online URL', 'رابط آمن عبر الإنترنت')}
              <Input type="url" value={onlineUrl} onChange={(e) => setOnlineUrl(e.target.value)} />
            </label>
          )}
          <label>
            {t('Time zone', 'المنطقة الزمنية')}
            <Input value={timezone} onChange={(e) => setTimezone(e.target.value)} />
          </label>
          <label>
            {t('Starts', 'يبدأ')}
            <Input
              type="datetime-local"
              value={startsAt}
              onChange={(e) => setStartsAt(e.target.value)}
            />
          </label>
          <label>
            {t('Ends', 'ينتهي')}
            <Input
              type="datetime-local"
              value={endsAt}
              onChange={(e) => setEndsAt(e.target.value)}
            />
          </label>
          <label>
            {t('Capacity (optional)', 'السعة (اختياري)')}
            <Input
              type="number"
              min="1"
              value={capacity}
              onChange={(e) => setCapacity(e.target.value)}
            />
          </label>
          <label>
            {t('Registration deadline (optional)', 'آخر موعد للتسجيل (اختياري)')}
            <Input
              type="datetime-local"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
            />
          </label>
        </div>
      )}
      {step === 2 && (
        <div className="grid gap-5">
          <div>
            <h3>{t('Speakers', 'المتحدثون')}</h3>
            {speakers.map((speaker, index) => (
              <div className="grid gap-2 my-3" key={index}>
                <Input
                  value={speaker.name}
                  placeholder={t('Name', 'الاسم')}
                  onChange={(e) => updateSpeaker(index, { name: e.target.value })}
                />
                <Input
                  value={speaker.title}
                  placeholder={t('Role or title', 'الدور أو المسمى')}
                  onChange={(e) => updateSpeaker(index, { title: e.target.value })}
                />
                <textarea
                  className="ui-textarea"
                  value={speaker.bio}
                  placeholder={t('Biography', 'نبذة')}
                  onChange={(e) => updateSpeaker(index, { bio: e.target.value })}
                />
                <Button
                  variant="ghost"
                  onClick={() => setSpeakers((rows) => rows.filter((_, i) => i !== index))}
                >
                  {t('Remove', 'حذف')}
                </Button>
              </div>
            ))}
            <Button
              variant="outline"
              onClick={() => setSpeakers((rows) => [...rows, { name: '', title: '', bio: '' }])}
            >
              {t('Add speaker', 'إضافة متحدث')}
            </Button>
          </div>
          <div>
            <h3>{t('Agenda sessions', 'جلسات الأجندة')}</h3>
            {sessions.map((session, index) => (
              <div className="grid gap-2 my-3" key={index}>
                <Input
                  value={session.title}
                  placeholder={t('Session title', 'عنوان الجلسة')}
                  onChange={(e) => updateSession(index, { title: e.target.value })}
                />
                <textarea
                  className="ui-textarea"
                  value={session.description}
                  placeholder={t('Description', 'الوصف')}
                  onChange={(e) => updateSession(index, { description: e.target.value })}
                />
                <Input
                  type="datetime-local"
                  value={session.startsAt}
                  onChange={(e) => updateSession(index, { startsAt: e.target.value })}
                />
                <Input
                  type="datetime-local"
                  value={session.endsAt}
                  onChange={(e) => updateSession(index, { endsAt: e.target.value })}
                />
                <select
                  value={session.speakerIndex}
                  onChange={(e) => updateSession(index, { speakerIndex: e.target.value })}
                >
                  <option value="">{t('No assigned speaker', 'لا يوجد متحدث معين')}</option>
                  {speakers.map((speaker, i) => (
                    <option key={i} value={i}>
                      {speaker.name || t('Unnamed speaker', 'متحدث بلا اسم')}
                    </option>
                  ))}
                </select>
                <Button
                  variant="ghost"
                  onClick={() => setSessions((rows) => rows.filter((_, i) => i !== index))}
                >
                  {t('Remove', 'حذف')}
                </Button>
              </div>
            ))}
            <Button
              variant="outline"
              onClick={() =>
                setSessions((rows) => [
                  ...rows,
                  { title: '', description: '', startsAt, endsAt, speakerIndex: '' },
                ])
              }
            >
              {t('Add session', 'إضافة جلسة')}
            </Button>
          </div>
        </div>
      )}
      {step === 3 && (
        <div className="grid gap-3">
          <p>
            {t(
              'Review the essentials, schedule, attendees and agenda. Publishing will reject incomplete or invalid schedules.',
              'راجع الأساسيات والجدول والحضور والأجندة. سيرفض النشر الجداول غير المكتملة أو غير الصالحة.',
            )}
          </p>
          <dl>
            <div>
              <dt>{t('Event', 'الفعالية')}</dt>
              <dd>{title || t('Untitled', 'بلا عنوان')}</dd>
            </div>
            <div>
              <dt>{t('Sessions', 'الجلسات')}</dt>
              <dd>{sessions.length}</dd>
            </div>
            <div>
              <dt>{t('Visibility', 'الظهور')}</dt>
              <dd>{visibility}</dd>
            </div>
          </dl>
          {event.status === 'PUBLISHED' && (
            <div className="flex gap-3">
              <Button variant="outline" disabled={pending} onClick={() => void action('unpublish')}>
                {t('Unpublish', 'إلغاء النشر')}
              </Button>
              <Button variant="outline" disabled={pending} onClick={() => void action('cancel')}>
                {t('Cancel event', 'إلغاء الفعالية')}
              </Button>
            </div>
          )}
          <Button variant="outline" disabled={pending} onClick={() => void action('duplicate')}>
            {t('Duplicate as draft', 'نسخ كمسودة')}
          </Button>
        </div>
      )}
      {error && (
        <p role="alert" className="text-danger">
          {error}
        </p>
      )}
      {notice && <p role="status">{notice}</p>}
      <div className="mt-5 flex flex-wrap gap-3">
        <Button variant="outline" disabled={pending} onClick={() => void save(false)}>
          {t('Save draft', 'حفظ المسودة')}
        </Button>
        {step < 3 && (
          <Button variant="secondary" onClick={() => setStep((value) => value + 1)}>
            {t('Continue', 'متابعة')}
          </Button>
        )}
        {step === 3 && (
          <Button
            disabled={pending || event.status === 'CANCELLED'}
            onClick={() => void save(true)}
          >
            {t('Publish event', 'نشر الفعالية')}
          </Button>
        )}
      </div>
    </Modal>
  );
}
