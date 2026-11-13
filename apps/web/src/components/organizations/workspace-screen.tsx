import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { organizationSchema } from '@ventro/types';
import { readServerSession, authApiUrl } from '../../lib/auth/server';
import { authCookieHeader } from '../../lib/auth/routes';
import { isLocale } from '../../lib/marketing/site';
import { Workspace } from './workspace';
export type WorkspaceView =
  'organizations' | 'new' | 'settings' | 'team' | 'invitations' | 'platform';
export type WorkspaceProps = { params: Promise<{ locale: string; organizationId?: string }> };
export const workspaceMetadata: Metadata = {
  title: 'Organization workspace | VENTRO',
  robots: { index: false, follow: false },
};
export async function WorkspaceScreen({ params, view }: WorkspaceProps & { view: WorkspaceView }) {
  const { locale, organizationId } = await params;
  if (!isLocale(locale)) notFound();
  const cookie = (await cookies()).toString();
  const { session } = await readServerSession(cookie);
  if (!session) redirect('/' + locale + '/login');
  let organization;
  if (organizationId && session.user.emailVerifiedAt) {
    const response = await fetch(
      new URL('/api/v1/organizations/' + organizationId, authApiUrl('session')),
      {
        headers: { Cookie: authCookieHeader(cookie) },
        cache: 'no-store',
        signal: AbortSignal.timeout(6000),
        redirect: 'error',
      },
    );
    if (!response.ok) notFound();
    organization = organizationSchema.parse(await response.json());
  }
  return (
    <Workspace
      key={locale + view + organizationId}
      locale={locale}
      view={view}
      session={session}
      initialOrganization={organization}
    />
  );
}
