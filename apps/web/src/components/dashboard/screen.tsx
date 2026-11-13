import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import {
  dashboardSectionSchema,
  hasOrganizationPermission,
  organizationSchema,
} from '@ventro/types';
import { authApiUrl, readServerSession } from '../../lib/auth/server';
import { authCookieHeader } from '../../lib/auth/routes';
import { isLocale } from '../../lib/marketing/site';
import { dashboardRoute } from '../../lib/dashboard/navigation';
import { DashboardPicker, OrganizerDashboard } from './shell';
export type DashboardPageProps = {
  params: Promise<{ locale: string; organizationId?: string; section?: string[] }>;
};
export const dashboardMetadata: Metadata = {
  title: 'Organizer workspace | VENTRO',
  robots: { index: false, follow: false },
};
export async function DashboardScreen({ params }: DashboardPageProps) {
  const { locale, organizationId, section: segments = [] } = await params;
  if (!isLocale(locale) || segments.length > 1) notFound();
  const parsed = dashboardSectionSchema.safeParse(segments[0] ?? 'overview');
  if (!parsed.success) notFound();
  const cookie = (await cookies()).toString();
  const { session } = await readServerSession(cookie);
  if (!session)
    redirect('/' + locale + '/login?next=' + encodeURIComponent('/' + locale + '/dashboard'));
  if (!organizationId) {
    if (session.activeOrganizationId && session.user.emailVerifiedAt) {
      const response = await fetch(
        new URL('/api/v1/organizations/' + session.activeOrganizationId, authApiUrl('session')),
        {
          headers: { Cookie: authCookieHeader(cookie) },
          cache: 'no-store',
          redirect: 'error',
          signal: AbortSignal.timeout(6000),
        },
      );
      if (response.ok) {
        const org = organizationSchema.parse(await response.json());
        if (hasOrganizationPermission(org.role, 'dashboard:read'))
          redirect(dashboardRoute(locale, org.id));
      } else if (response.status !== 403 && response.status !== 401)
        throw new Error('Organization temporarily unavailable');
    }
    return <DashboardPicker locale={locale} session={session} />;
  }
  if (!/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(organizationId))
    notFound();
  const response = await fetch(
    new URL('/api/v1/organizations/' + organizationId, authApiUrl('session')),
    {
      headers: { Cookie: authCookieHeader(cookie) },
      cache: 'no-store',
      redirect: 'error',
      signal: AbortSignal.timeout(6000),
    },
  );
  if (response.status === 401 || response.status === 403) notFound();
  if (!response.ok) throw new Error('Organization temporarily unavailable');
  const organization = organizationSchema.parse(await response.json());
  if (!hasOrganizationPermission(organization.role, 'dashboard:read')) notFound();
  return (
    <OrganizerDashboard
      key={organization.id + parsed.data + locale}
      locale={locale}
      session={session}
      initialOrganization={organization}
      section={parsed.data}
    />
  );
}
