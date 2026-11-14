'use client';
import { useEffect, useRef, useState } from 'react';
import {
  checkInDashboardSchema,
  checkInReceiptSchema,
  eventListSchema,
  type Locale,
  type Organization,
} from '@ventro/types';
import { Button, EmptyState, Input } from '@ventro/ui';
import { text } from '../../lib/marketing/site';
import {
  DashboardFailure,
  DashboardSkeleton,
  dashboardRequest,
  useDashboardData,
} from '../dashboard/data';
type Detector = { detect(source: ImageBitmapSource): Promise<{ rawValue: string }[]> };
export function CheckInPanel({
  locale,
  organization,
}: {
  locale: Locale;
  organization: Organization;
}) {
  const t = (en: string, ar: string) => text(locale, en, ar);
  const [eventId, setEventId] = useState('');
  const [credential, setCredential] = useState('');
  const [message, setMessage] = useState('');
  const [pending, setPending] = useState(false);
  const video = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const timer = useRef<number | undefined>(undefined);
  const events = useDashboardData('organizations/' + organization.id + '/events', eventListSchema);
  const dashboard = useDashboardData(
    eventId ? 'organizations/' + organization.id + '/events/' + eventId + '/check-in' : null,
    checkInDashboardSchema,
  );
  const stop = () => {
    if (timer.current) window.clearInterval(timer.current);
    stream.current?.getTracks().forEach((track) => track.stop());
    stream.current = null;
  };
  useEffect(() => stop, []);
  async function scan(value = credential) {
    const code = value.replace(/^ventro:ticket:/, '').trim();
    if (!code || !eventId) return;
    setPending(true);
    setMessage('');
    try {
      const result = await dashboardRequest(
        'organizations/' + organization.id + '/events/' + eventId + '/check-in/scan',
        checkInReceiptSchema,
        { body: { credential: code } },
      );
      setMessage(
        t('Check-in confirmed at ', 'تم تأكيد الدخول في ') +
          new Date(result.checkedInAt).toLocaleTimeString(locale),
      );
      setCredential('');
      dashboard.refresh();
    } catch {
      setMessage(
        t(
          'Ticket could not be checked in. It may be invalid, revoked, or already used.',
          'تعذر تسجيل دخول التذكرة. قد تكون غير صالحة أو ملغاة أو مستخدمة مسبقًا.',
        ),
      );
    } finally {
      setPending(false);
    }
  }
  async function camera() {
    try {
      if (!('BarcodeDetector' in window)) {
        setMessage(
          t(
            'Camera QR scanning is not supported in this browser. Use the secure manual code entry.',
            'مسح QR بالكاميرا غير مدعوم في هذا المتصفح. استخدم إدخال الرمز يدويًا.',
          ),
        );
        return;
      }
      stream.current = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false,
      });
      if (video.current) {
        video.current.srcObject = stream.current;
        await video.current.play();
        const DetectorClass = (
          window as unknown as { BarcodeDetector: new (options: { formats: string[] }) => Detector }
        ).BarcodeDetector;
        const detector = new DetectorClass({ formats: ['qr_code'] });
        timer.current = window.setInterval(() => {
          if (video.current)
            void detector
              .detect(video.current)
              .then((found) => {
                if (found[0]?.rawValue) {
                  stop();
                  void scan(found[0].rawValue);
                }
              })
              .catch(() => {});
        }, 700);
      }
    } catch {
      setMessage(t('Camera permission was not granted.', 'لم يتم منح إذن الكاميرا.'));
    }
  }
  return (
    <section className="grid gap-5">
      <div className="dash-panel">
        <p className="dash-eyebrow">VENTRO / CHECK-IN</p>
        <h2>{t('Secure entry desk', 'نقطة دخول آمنة')}</h2>
        {events.loading && <DashboardSkeleton locale={locale} compact />}
        {events.error && (
          <DashboardFailure status={events.error} retry={events.refresh} t={t} />
        )}{' '}
        {events.data && (
          <select
            aria-label={t('Select event', 'اختر فعالية')}
            value={eventId}
            onChange={(e) => setEventId(e.target.value)}
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
        <div className="dash-panel">
          <div className="grid gap-3">
            <Input
              value={credential}
              onChange={(e) => setCredential(e.target.value)}
              placeholder={t('Paste ticket QR credential', 'ألصق معرّف QR للتذكرة')}
            />
            <div className="flex flex-wrap gap-3">
              <Button disabled={pending || !credential} onClick={() => void scan()}>
                {t('Verify check-in', 'تحقق من الدخول')}
              </Button>
              <Button variant="outline" onClick={() => void camera()}>
                {t('Scan with camera', 'المسح بالكاميرا')}
              </Button>
              <Button variant="ghost" onClick={stop}>
                {t('Stop camera', 'إيقاف الكاميرا')}
              </Button>
            </div>
            <video
              ref={video}
              muted
              playsInline
              className="max-w-md rounded-xl"
              aria-label={t('Camera preview for QR scanning', 'معاينة الكاميرا لمسح QR')}
            />
            {message && <p role="status">{message}</p>}
          </div>
        </div>
      )}{' '}
      {dashboard.loading && <DashboardSkeleton locale={locale} />}{' '}
      {dashboard.error && (
        <DashboardFailure status={dashboard.error} retry={dashboard.refresh} t={t} />
      )}{' '}
      {dashboard.data && (
        <div className="dash-panel">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <strong>{dashboard.data.registered}</strong>
              <span>{t('Registered', 'مسجلون')}</span>
            </div>
            <div>
              <strong>{dashboard.data.checkedIn}</strong>
              <span>{t('Checked in', 'تم دخولهم')}</span>
            </div>
            <div>
              <strong>{dashboard.data.attendancePercent}%</strong>
              <span>{t('Attendance', 'الحضور')}</span>
            </div>
          </div>
          <h3 className="mt-5">{t('Recent scans', 'أحدث عمليات المسح')}</h3>
          {dashboard.data.recent.length === 0 ? (
            <EmptyState
              title={t('No scans yet', 'لا توجد عمليات مسح بعد')}
              description={t(
                'Confirmed scans will appear here in real time after refresh.',
                'ستظهر عمليات المسح المؤكدة هنا بعد التحديث.',
              )}
            />
          ) : (
            <ul>
              {dashboard.data.recent.map((scan) => (
                <li key={scan.id}>
                  {scan.attendee} · {new Date(scan.createdAt).toLocaleTimeString(locale)}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}
