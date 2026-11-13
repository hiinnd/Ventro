'use client';
import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import {
  type AuthSession,
  type DashboardSection,
  type Locale,
  type Organization,
} from '@ventro/types';
import {
  Badge,
  BrandLogo,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
  EmptyState,
  Icon,
} from '@ventro/ui';
import { WorkspaceLink as Link } from '../organizations/workspace-link';
import { OrganizationProfile, Team } from '../organizations/workspace';
import { text } from '../../lib/marketing/site';
import { dashboardRoute, dashboardSections, sectionLabel } from '../../lib/dashboard/navigation';
import {
  DashboardNotifications,
  DashboardSearch,
  DashboardUserMenu,
  OrganizationChoices,
  OrganizationSwitcher,
} from './controls';
import { DashboardIcon } from './icons';
import { DashboardOverviewPanel, PlannedDashboardSection } from './overview';

function OrganizerNavigation({
  locale,
  organization,
  section,
  close,
}: {
  locale: Locale;
  organization: Organization;
  section: DashboardSection;
  close?: () => void;
}) {
  const t = (en: string, ar: string) => text(locale, en, ar);
  return (
    <div className="dash-sidebar-content">
      <Link
        href={dashboardRoute(locale, organization.id)}
        className="dash-brand ui-focus"
        onClick={close}
      >
        <BrandLogo className="h-9 w-auto" />
      </Link>
      <p className="dash-sidebar-caption">{t('ORGANIZER WORKSPACE', 'مساحة المنظّم')}</p>
      <nav aria-label={t('Organizer navigation', 'تنقل المنظّم')}>
        <ul>
          {dashboardSections.map((item) => (
            <li key={item.id} className={item.id === 'team' ? 'dash-nav-divider' : undefined}>
              <Link
                href={dashboardRoute(locale, organization.id, item.id)}
                onClick={close}
                aria-current={item.id === section ? 'page' : undefined}
                className="dash-nav-link ui-focus"
              >
                <DashboardIcon name={item.id} />
                <span>{sectionLabel(locale, item.id)}</span>
                {!item.ready && <span className="dash-nav-planned">{t('Planned', 'مخطّط')}</span>}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <div className="dash-sidebar-bottom">
        <span className="dash-sidebar-mark" aria-hidden>
          <BrandLogo variant="symbol" decorative />
        </span>
        <strong>
          {t('Every Event.', 'كل فعالية،')}
          <br />
          {t('Beyond the Moment.', 'أبعد من لحظتها.')}
        </strong>
        <Link href={'/' + locale + '/organizations'} onClick={close} className="ui-focus">
          {t('Organization directory', 'دليل المؤسسات')}
          <DashboardIcon name="arrow" className="size-4 rtl:rotate-180" />
        </Link>
      </div>
    </div>
  );
}
export function OrganizerDashboard({
  locale,
  session,
  initialOrganization,
  section,
}: {
  locale: Locale;
  session: AuthSession;
  initialOrganization: Organization;
  section: DashboardSection;
}) {
  const t = (en: string, ar: string) => text(locale, en, ar);
  const [organization, setOrganization] = useState(initialOrganization);
  const [mobile, setMobile] = useState(false);
  const { resolvedTheme, setTheme } = useTheme();
  useEffect(() => setOrganization(initialOrganization), [initialOrganization]);
  const ready = dashboardSections.find((item) => item.id === section)!.ready;
  return (
    <div className="dash-shell">
      <a className="dash-skip ui-focus" href="#organizer-main">
        {t('Skip to content', 'انتقل إلى المحتوى')}
      </a>
      <aside className="dash-sidebar">
        <OrganizerNavigation locale={locale} organization={organization} section={section} />
      </aside>
      <div className="dash-body">
        <header className="dash-topbar">
          <div className="dash-topbar-leading">
            <Dialog open={mobile} onOpenChange={setMobile}>
              <DialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="dash-mobile-menu"
                  aria-label={t('Open navigation', 'فتح التنقل')}
                >
                  <Icon name="menu" />
                </Button>
              </DialogTrigger>
              <DialogContent
                className="dash-drawer"
                closeLabel={t('Close navigation', 'إغلاق التنقل')}
              >
                <DialogTitle className="sr-only">
                  {t('Organizer navigation', 'تنقل المنظّم')}
                </DialogTitle>
                <DialogDescription className="sr-only">
                  {t(
                    'Navigate organization tools and planned event sections.',
                    'انتقل إلى أدوات المؤسسة وأقسام الفعاليات المخطّطة.',
                  )}
                </DialogDescription>
                <OrganizerNavigation
                  locale={locale}
                  organization={organization}
                  section={section}
                  close={() => setMobile(false)}
                />
              </DialogContent>
            </Dialog>
            <OrganizationSwitcher locale={locale} organization={organization} section={section} />
          </div>
          <div className="dash-topbar-actions">
            <DashboardSearch locale={locale} organization={organization} />
            <Button
              variant="ghost"
              size="icon"
              className="dash-theme-control"
              aria-label={t('Switch theme', 'تبديل المظهر')}
              onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
            >
              <Icon name="theme" />
            </Button>
            <DashboardNotifications locale={locale} organization={organization} />
            <DashboardUserMenu locale={locale} session={session} />
          </div>
        </header>
        <main id="organizer-main" className="dash-main">
          <div className="dash-page-heading">
            <div>
              <p>
                {t('WORKSPACE', 'مساحة العمل')} <span aria-hidden>/</span> {organization.name}
              </p>
              <h1>
                {section === 'overview'
                  ? t('A little preparation. A lasting impression.', 'استعداد اليوم، وأثر يدوم.')
                  : sectionLabel(locale, section)}
              </h1>
              <span className="dash-page-description">
                {section === 'overview'
                  ? t('Welcome back, ', 'مرحبًا بعودتك، ') +
                    session.user.name.split(/\s+/)[0] +
                    t('. Here’s where your organization stands.', '. إليك آخر مستجدات مؤسستك.')
                  : section === 'team'
                    ? t(
                        'People, roles and thoughtful access to your workspace.',
                        'الأشخاص والأدوار والصلاحيات المناسبة لمساحة عملك.',
                      )
                    : section === 'settings'
                      ? t(
                          'Your organization’s identity, preferences and private logo.',
                          'هوية مؤسستك وتفضيلاتها وشعارها الخاص.',
                        )
                      : t(
                          'An upcoming part of your connected event workspace.',
                          'قسم قادم ضمن مساحة فعالياتك المتصلة.',
                        )}
              </span>
            </div>
            <Badge variant={ready ? 'success' : 'warning'}>
              {ready
                ? t('Organization workspace', 'مساحة المؤسسة')
                : t('Planned feature', 'ميزة مخطّطة')}
            </Badge>
          </div>
          {section === 'overview' ? (
            <DashboardOverviewPanel locale={locale} organization={organization} />
          ) : section === 'team' ? (
            <Team locale={locale} organization={organization} currentUserId={session.user.id} />
          ) : section === 'settings' ? (
            <OrganizationProfile
              locale={locale}
              organization={organization}
              onChange={setOrganization}
            />
          ) : (
            <PlannedDashboardSection
              locale={locale}
              organization={organization}
              section={section}
            />
          )}
          <footer className="dash-footer">
            <span>
              VENTRO · {t('Every Event. Beyond the Moment.', 'كل فعالية، أبعد من لحظتها.')}
            </span>
            <div>
              <Link href={'/' + locale + '/organizations'}>{t('Organizations', 'المؤسسات')}</Link>
              <Link href={'/' + locale}>{t('Public website', 'الموقع العام')}</Link>
            </div>
          </footer>
        </main>
      </div>
    </div>
  );
}
export function DashboardPicker({ locale, session }: { locale: Locale; session: AuthSession }) {
  const t = (en: string, ar: string) => text(locale, en, ar);
  const { resolvedTheme, setTheme } = useTheme();
  return (
    <div className="dash-picker-page">
      <header>
        <Link href={'/' + locale}>
          <BrandLogo className="h-9 w-auto" />
        </Link>
        <div className="flex items-center gap-3">
          <Button
            size="icon"
            variant="outline"
            aria-label={t('Switch theme', 'تبديل المظهر')}
            onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
          >
            <Icon name="theme" />
          </Button>
          <DashboardUserMenu locale={locale} session={session} />
        </div>
      </header>
      <main>
        <p className="dash-eyebrow">VENTRO / {t('ORGANIZER WORKSPACE', 'مساحة المنظّم')}</p>
        <h1>{t('Where will you make your next moment?', 'أين ستصنع لحظتك القادمة؟')}</h1>
        <p className="dash-picker-description">
          {t(
            'Choose an organization to open your organizer dashboard. Each workspace keeps its own team and activity.',
            'اختر مؤسسة لفتح لوحة المنظّم. لكل مساحة فريقها ونشاطها المستقل.',
          )}
        </p>
        {session.user.emailVerifiedAt ? (
          <OrganizationChoices locale={locale} />
        ) : (
          <EmptyState
            title={t('Verify your email to continue', 'أكّد بريدك للمتابعة')}
            description={t(
              'Organization workspaces require a verified account.',
              'تتطلب مساحات المؤسسات حسابًا ببريد مؤكّد.',
            )}
            action={
              <Button asChild>
                <Link href={'/' + locale + '/account'}>{t('Open account', 'فتح الحساب')}</Link>
              </Button>
            }
          />
        )}
        <div className="dash-picker-links">
          <Link href={'/' + locale + '/organizations/new'}>
            {t('Create an organization', 'إنشاء مؤسسة')}
          </Link>
          <Link href={'/' + locale + '/invitations'}>
            {t('Review invitations', 'مراجعة الدعوات')}
          </Link>
        </div>
      </main>
    </div>
  );
}
