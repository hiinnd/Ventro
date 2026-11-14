'use client';
import { myRegistrationListSchema, type Locale } from '@ventro/types';
import { EmptyState } from '@ventro/ui';
import { text } from '../../lib/marketing/site';
import {
  DashboardFailure,
  DashboardPagination,
  DashboardSkeleton,
  useDashboardData,
} from '../dashboard/data';
import { useState } from 'react';
export function MyRegistrations({ locale }: { locale: Locale }) {
  const t = (en: string, ar: string) => text(locale, en, ar);
  const [page, setPage] = useState(1);
  const data = useDashboardData(
    'registrations/registrations/me?page=' + page,
    myRegistrationListSchema,
  );
  return (
    <main className="container py-20">
      <h1>{t('My registrations', 'تسجيلاتي')}</h1>
      {data.loading && <DashboardSkeleton locale={locale} />}{' '}
      {data.error && <DashboardFailure status={data.error} retry={data.refresh} t={t} />}{' '}
      {data.data && !data.data.items.length && (
        <EmptyState
          title={t('No registrations yet', 'لا توجد تسجيلات بعد')}
          description={t(
            'Explore published events to reserve your place.',
            'استكشف الفعاليات المنشورة لحجز مقعدك.',
          )}
        />
      )}{' '}
      {data.data?.items.map((x) => (
        <article className="m-feature-card my-4" key={x.id}>
          <h2>{x.event.title}</h2>
          <p>
            {x.status} ·{' '}
            {x.event.startsAt
              ? new Date(x.event.startsAt).toLocaleString(locale)
              : t('Date to be announced', 'سيعلن الموعد لاحقًا')}
          </p>
        </article>
      ))}
      {data.data && (
        <DashboardPagination
          page={data.data.page}
          total={data.data.total}
          onChange={setPage}
          t={t}
        />
      )}
    </main>
  );
}
