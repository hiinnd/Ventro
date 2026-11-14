'use client';
import { useState } from 'react';
import {
  eventListSchema,
  registrationListSchema,
  type Locale,
  type Organization,
} from '@ventro/types';
import { Button, EmptyState, Input } from '@ventro/ui';
import { text } from '../../lib/marketing/site';
import {
  DashboardFailure,
  DashboardPagination,
  DashboardSkeleton,
  useDashboardData,
} from '../dashboard/data';
import { FormBuilder } from './form-builder';

export function OrganizerRegistrations({
  locale,
  organization,
}: {
  locale: Locale;
  organization: Organization;
}) {
  const t = (en: string, ar: string) => text(locale, en, ar);
  const [eventId, setEventId] = useState('');
  const [tab, setTab] = useState<'list' | 'form'>('list');
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const events = useDashboardData('organizations/' + organization.id + '/events', eventListSchema);
  const listPath = eventId
    ? 'registrations/organizations/' +
      organization.id +
      '/events/' +
      eventId +
      '/registrations?page=' +
      page +
      '&q=' +
      encodeURIComponent(query) +
      '&status=' +
      status
    : null;
  const list = useDashboardData(listPath, registrationListSchema);
  const exportCsv = () => {
    if (!list.data) return;
    const escape = (v: unknown) => '"' + String(v ?? '').replaceAll('"', '""') + '"';
    const rows = [
      ['Name', 'Email', 'Status', 'Registered at'],
      ...list.data.items.map((x) => [x.name, x.email, x.status, x.createdAt]),
    ];
    const blob = new Blob([rows.map((r) => r.map(escape).join(',')).join('\n')], {
      type: 'text/csv;charset=utf-8',
    });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'ventro-registrations.csv';
    a.click();
    URL.revokeObjectURL(a.href);
  };
  return (
    <section className="grid gap-5">
      <div className="dash-panel">
        <div className="dash-section-heading">
          <div>
            <p className="dash-eyebrow">VENTRO / {t('REGISTRATIONS', 'التسجيلات')}</p>
            <h2>{t('Registration workspace', 'مساحة التسجيلات')}</h2>
          </div>
        </div>
        {events.loading && <DashboardSkeleton locale={locale} compact />}
        {events.error && (
          <DashboardFailure status={events.error} retry={events.refresh} t={t} />
        )}{' '}
        {events.data && (
          <select
            aria-label={t('Select event', 'اختر الفعالية')}
            value={eventId}
            onChange={(e) => {
              setEventId(e.target.value);
              setPage(1);
            }}
          >
            <option value="">{t('Select an event', 'اختر فعالية')}</option>
            {events.data.items.map((e) => (
              <option key={e.id} value={e.id}>
                {e.title}
              </option>
            ))}
          </select>
        )}
      </div>
      {eventId && (
        <div className="dash-panel">
          <div className="flex gap-3 mb-4">
            <Button variant={tab === 'list' ? 'default' : 'outline'} onClick={() => setTab('list')}>
              {t('Registrations', 'التسجيلات')}
            </Button>
            <Button variant={tab === 'form' ? 'default' : 'outline'} onClick={() => setTab('form')}>
              {t('Form builder', 'منشئ النموذج')}
            </Button>
          </div>
          {tab === 'form' ? (
            <FormBuilder locale={locale} organizationId={organization.id} eventId={eventId} />
          ) : (
            <>
              <div className="flex flex-wrap gap-3 mb-4">
                <Input
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setPage(1);
                  }}
                  placeholder={t('Search name or email', 'ابحث بالاسم أو البريد')}
                />
                <select
                  aria-label={t('Registration status', 'حالة التسجيل')}
                  value={status}
                  onChange={(e) => {
                    setStatus(e.target.value);
                    setPage(1);
                  }}
                >
                  <option value="">{t('All statuses', 'كل الحالات')}</option>
                  <option value="CONFIRMED">{t('Confirmed', 'مؤكد')}</option>
                  <option value="CANCELLED">{t('Cancelled', 'ملغى')}</option>
                </select>
                <Button variant="outline" onClick={exportCsv} disabled={!list.data?.items.length}>
                  {t('Export CSV', 'تصدير CSV')}
                </Button>
              </div>
              {list.loading && <DashboardSkeleton locale={locale} compact />}
              {list.error && (
                <DashboardFailure status={list.error} retry={list.refresh} t={t} />
              )}{' '}
              {list.data && !list.data.items.length && (
                <EmptyState
                  title={t('No registrations yet', 'لا توجد تسجيلات بعد')}
                  description={t(
                    'Registrations will appear here after participants submit the published form.',
                    'ستظهر التسجيلات هنا بعد إرسال المشاركين للنموذج المنشور.',
                  )}
                />
              )}{' '}
              {list.data && list.data.items.length > 0 && (
                <>
                  <div className="overflow-x-auto">
                    <table>
                      <thead>
                        <tr>
                          <th>{t('Participant', 'المشارك')}</th>
                          <th>{t('Status', 'الحالة')}</th>
                          <th>{t('Registered', 'تاريخ التسجيل')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {list.data.items.map((row) => (
                          <tr key={row.id}>
                            <td>
                              <strong>{row.name}</strong>
                              <br />
                              <small>{row.email}</small>
                            </td>
                            <td>{row.status}</td>
                            <td>{new Date(row.createdAt).toLocaleString(locale)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <DashboardPagination
                    page={list.data.page}
                    total={list.data.total}
                    onChange={setPage}
                    t={t}
                  />
                </>
              )}
            </>
          )}
        </div>
      )}
    </section>
  );
}
