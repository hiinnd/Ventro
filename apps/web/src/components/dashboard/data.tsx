'use client';
import { useCallback, useEffect, useState } from 'react';
import { z } from 'zod';
import { Button, ErrorState, Pagination, Skeleton } from '@ventro/ui';
import type { Locale } from '@ventro/types';
export type Copy = (en: string, ar: string) => string;
export class DashboardRequestError extends Error {
  constructor(readonly status: number) {
    super('Dashboard request failed');
  }
}
export async function dashboardRequest<T>(
  path: string,
  schema: z.ZodType<T>,
  options: { body?: object; method?: string; signal?: AbortSignal } = {},
): Promise<T> {
  const method = options.method ?? (options.body ? 'POST' : 'GET');
  const response = await fetch('/api/' + path, {
    method,
    signal: options.signal,
    credentials: 'same-origin',
    cache: 'no-store',
    headers:
      method === 'GET' ? undefined : { 'Content-Type': 'application/json', 'X-Ventro-CSRF': '1' },
    body: method === 'GET' ? undefined : JSON.stringify(options.body ?? {}),
  });
  if (!response.ok) throw new DashboardRequestError(response.status);
  return schema.parse(response.status === 204 ? null : await response.json());
}
export function useDashboardData<T>(path: string | null, schema: z.ZodType<T>, body?: object) {
  const [data, setData] = useState<T>();
  const [error, setError] = useState<number>();
  const [loading, setLoading] = useState(Boolean(path));
  const [revision, setRevision] = useState(0);
  const serialized = body ? JSON.stringify(body) : undefined;
  useEffect(() => {
    const controller = new AbortController();
    let alive = true;
    setData(undefined);
    setError(undefined);
    setLoading(Boolean(path));
    if (path)
      dashboardRequest(path, schema, {
        signal: controller.signal,
        body: serialized ? (JSON.parse(serialized) as object) : undefined,
      })
        .then((value) => {
          if (alive) setData(value);
        })
        .catch((error) => {
          if (alive) setError(error instanceof DashboardRequestError ? error.status : 502);
        })
        .finally(() => {
          if (alive) setLoading(false);
        });
    return () => {
      alive = false;
      controller.abort();
    };
  }, [path, schema, serialized, revision]);
  const refresh = useCallback(() => setRevision((value) => value + 1), []);
  return { data, error, loading, refresh };
}
export function DashboardFailure({
  status,
  retry,
  t,
}: {
  status: number;
  retry: () => void;
  t: Copy;
}) {
  return (
    <ErrorState
      title={t('Unable to load this workspace', 'تعذّر تحميل مساحة العمل')}
      description={
        status === 403 || status === 401
          ? t(
              'Your session or organization access has changed. Sign in or choose an authorized organization.',
              'تغيّرت جلستك أو صلاحيات المؤسسة. سجّل الدخول أو اختر مؤسسة مخوّلة.',
            )
          : status === 429
            ? t(
                'The request limit was reached. Please wait briefly before retrying.',
                'وصلت إلى حد الطلبات. انتظر قليلًا قبل إعادة المحاولة.',
              )
            : t(
                'The service is temporarily unavailable. Please retry in a moment.',
                'الخدمة غير متاحة مؤقتًا. حاول مجددًا لتحميل بيانات مؤسستك.',
              )
      }
      action={
        <Button variant="outline" onClick={retry}>
          {t('Try again', 'حاول مجددًا')}
        </Button>
      }
    />
  );
}
export function DashboardSkeleton({
  locale,
  compact = false,
}: {
  locale: Locale;
  compact?: boolean;
}) {
  return (
    <div
      role="status"
      aria-label={locale === 'en' ? 'Loading dashboard data' : 'جارٍ تحميل بيانات اللوحة'}
      className="grid gap-4"
    >
      <Skeleton className={compact ? 'h-24' : 'h-36'} />
      {!compact && (
        <>
          <div className="grid grid-cols-2 gap-4">
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
          </div>
          <Skeleton className="h-64" />
        </>
      )}
    </div>
  );
}
export function DashboardPagination({
  page,
  total,
  onChange,
  t,
}: {
  page: number;
  total: number;
  onChange: (page: number) => void;
  t: Copy;
}) {
  if (total <= 25) return null;
  return (
    <Pagination
      page={page}
      pageCount={Math.ceil(total / 25)}
      onPageChange={onChange}
      labels={{
        navigation: t('Pagination', 'التنقل بين الصفحات'),
        previous: t('Previous page', 'الصفحة السابقة'),
        next: t('Next page', 'الصفحة التالية'),
        page: (value) => t('Page ', 'صفحة ') + value,
        more: t('More pages', 'صفحات إضافية'),
        empty: t('No pages', 'لا توجد صفحات'),
      }}
    />
  );
}
