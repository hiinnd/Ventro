'use client';
import { useState } from 'react';
import {
  dashboardActivityListSchema,
  dashboardOverviewSchema,
  hasOrganizationPermission,
  type DashboardSection,
  type Locale,
  type Organization,
} from '@ventro/types';
import {
  Badge,
  BrandLogo,
  Button,
  Card,
  EmptyState,
  FormField,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@ventro/ui';
import { WorkspaceLink as Link } from '../organizations/workspace-link';
import { roleLabel } from '../organizations/workspace';
import { dashboardRoute, activityLabel } from '../../lib/dashboard/navigation';
import { text } from '../../lib/marketing/site';
import { DashboardBarChart } from './chart';
import {
  DashboardFailure,
  DashboardPagination,
  DashboardSkeleton,
  useDashboardData,
  type Copy,
} from './data';
import { DashboardIcon } from './icons';

export function DashboardOverviewPanel({
  locale,
  organization,
}: {
  locale: Locale;
  organization: Organization;
}) {
  const t: Copy = (en, ar) => text(locale, en, ar);
  const [range, setRange] = useState('7');
  const overview = useDashboardData(
    'organizations/' + organization.id + '/dashboard/overview?range=' + range,
    dashboardOverviewSchema,
  );
  const canManage = hasOrganizationPermission(organization.role, 'team:write');
  const format = new Intl.NumberFormat(locale);
  const metrics = overview.data
    ? [
        {
          label: t('Team members', 'أعضاء الفريق'),
          value: overview.data.metrics.members,
          detail: t('Current memberships', 'العضويات الحالية'),
          icon: 'team' as const,
        },
        {
          label: t('Active members', 'الأعضاء النشطون'),
          value: overview.data.metrics.activeMembers,
          detail: t('Accounts with active status', 'حسابات بحالة نشطة'),
          icon: 'attendees' as const,
        },
        {
          label: t('Pending invitations', 'الدعوات المعلّقة'),
          value: overview.data.metrics.pendingInvitations,
          detail: t('Unexpired, awaiting response', 'سارية وبانتظار الرد'),
          icon: 'registrations' as const,
        },
        {
          label: t('Active owners', 'المالكون النشطون'),
          value: overview.data.metrics.activeOwners,
          detail: t('Organization stewardship', 'مسؤولية إدارة المؤسسة'),
          icon: 'certificates' as const,
        },
      ]
    : [];
  return (
    <div className="dash-content-stack">
      <div className="dash-overview-tools">
        <p className="dash-small-muted">
          {overview.data
            ? t('Updated ', 'حُدّثت في ') +
              new Intl.DateTimeFormat(locale, {
                dateStyle: 'medium',
                timeStyle: 'short',
                timeZone: organization.timezone,
              }).format(new Date(overview.data.generatedAt))
            : t('Your organization at a glance.', 'مؤسستك في لمحة.')}
        </p>
        <Button variant="outline" size="sm" onClick={overview.refresh} disabled={overview.loading}>
          {t('Refresh overview', 'تحديث النظرة العامة')}
        </Button>
      </div>
      {overview.loading && <DashboardSkeleton locale={locale} />}
      {overview.error && (
        <DashboardFailure status={overview.error} retry={overview.refresh} t={t} />
      )}
      {overview.data && (
        <>
          <section
            className="dash-metric-grid"
            aria-label={t('Organization metrics', 'مؤشرات المؤسسة')}
          >
            {metrics.map((metric) => (
              <Card key={metric.label} className="dash-metric-card">
                <div className="dash-metric-top">
                  <span>{metric.label}</span>
                  <span className="dash-metric-icon">
                    <DashboardIcon name={metric.icon} className="size-4" />
                  </span>
                </div>
                <strong className="dash-metric-value">{format.format(metric.value)}</strong>
                <p>{metric.detail}</p>
              </Card>
            ))}
          </section>
          <section className="dash-launch-panel">
            <div className="dash-launch-symbol" aria-hidden>
              <BrandLogo variant="symbol" decorative />
            </div>
            <div>
              <Badge>{t('YOUR NEXT CHAPTER', 'خطوتك القادمة')}</Badge>
              <h2>{t('A strong team. A memorable event.', 'فريق متماسك، وفعالية لا تُنسى.')}</h2>
              <p>
                {t(
                  'Your organization workspace is ready. Bring the team together and shape your identity while event tools are being built.',
                  'مساحة مؤسستك جاهزة. اجمع فريقك وأكمل هويتك أثناء تطوير أدوات الفعاليات.',
                )}
              </p>
              <div className="flex flex-wrap gap-3">
                <Button asChild>
                  <Link href={dashboardRoute(locale, organization.id, 'team')}>
                    {canManage
                      ? t('Build your team', 'كوّن فريقك')
                      : t('View your team', 'عرض فريقك')}
                    <DashboardIcon name="arrow" className="size-4 rtl:rotate-180" />
                  </Link>
                </Button>
                <Link
                  className="dash-launch-link ui-focus"
                  href={dashboardRoute(locale, organization.id, 'events')}
                >
                  {t('Explore planned event tools', 'استكشف أدوات الفعاليات المخطّطة')}
                </Link>
              </div>
            </div>
          </section>
          <section className="dash-chart-grid-layout">
            <Card className="dash-panel">
              <div className="dash-panel-heading">
                <div>
                  <h2>{t('Organization activity', 'نشاط المؤسسة')}</h2>
                  <p>
                    {t(
                      'Recorded organization changes · UTC days',
                      'تغييرات المؤسسة المسجّلة · أيام UTC',
                    )}
                  </p>
                </div>
                <Select value={range} onValueChange={setRange}>
                  <FormField label={t('Activity period', 'فترة النشاط')}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormField>
                  <SelectContent>
                    <SelectItem value="7">{t('Last 7 days', 'آخر ٧ أيام')}</SelectItem>
                    <SelectItem value="30">{t('Last 30 days', 'آخر ٣٠ يومًا')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="dash-chart-inner">
                <DashboardBarChart
                  title={t('Organization changes by day', 'تغييرات المؤسسة حسب اليوم')}
                  description={t(
                    'Actual audit records within this organization.',
                    'سجلات التغييرات الفعلية لهذه المؤسسة.',
                  )}
                  locale={locale}
                  points={overview.data.activity.map((day) => ({
                    label: new Intl.DateTimeFormat(locale, {
                      month: 'short',
                      day: 'numeric',
                      timeZone: 'UTC',
                    }).format(new Date(day.date + 'T12:00:00Z')),
                    value: day.count,
                  }))}
                />
              </div>
            </Card>
            <Card className="dash-panel">
              <div className="dash-panel-heading">
                <div>
                  <h2>{t('Your team, by role', 'فريقك حسب الدور')}</h2>
                  <p>
                    {t(
                      'Current memberships, including inactive accounts',
                      'العضويات الحالية، بما فيها الحسابات غير النشطة',
                    )}
                  </p>
                </div>
              </div>
              <div className="dash-chart-inner">
                <DashboardBarChart
                  title={t('Members by assigned role', 'الأعضاء حسب الدور الممنوح')}
                  description={t('Organization membership counts.', 'أعداد عضويات المؤسسة.')}
                  locale={locale}
                  compact
                  points={overview.data.roles.map((item) => ({
                    label: roleLabel(locale, item.role),
                    value: item.count,
                  }))}
                />
              </div>
            </Card>
          </section>
        </>
      )}
      <section aria-labelledby="dash-quick-actions">
        <div className="dash-section-heading">
          <h2 id="dash-quick-actions">{t('Make your next move', 'اختر خطوتك التالية')}</h2>
          <span>{t('Quick actions', 'إجراءات سريعة')}</span>
        </div>
        <div className="dash-quick-grid">
          <Link
            className="dash-quick-card ui-focus"
            href={dashboardRoute(locale, organization.id, 'team')}
          >
            <DashboardIcon name="team" />
            <div>
              <h3>
                {canManage
                  ? t('Invite your team', 'ادعُ فريقك')
                  : t('Meet your team', 'تعرّف إلى فريقك')}
              </h3>
              <p>
                {canManage
                  ? t(
                      'Send an invitation and assign the right role.',
                      'أرسل دعوة وحدّد الدور المناسب.',
                    )
                  : t(
                      'View the people and roles in this organization.',
                      'اطّلع على الأشخاص والأدوار في المؤسسة.',
                    )}
              </p>
            </div>
            <DashboardIcon name="arrow" className="rtl:rotate-180" />
          </Link>
          <Link
            className="dash-quick-card ui-focus"
            href={dashboardRoute(locale, organization.id, 'settings')}
          >
            <DashboardIcon name="settings" />
            <div>
              <h3>{t('Shape your identity', 'أكمل هويتك')}</h3>
              <p>
                {t(
                  'Organization details, preferences and logo.',
                  'تفاصيل المؤسسة وتفضيلاتها وشعارها.',
                )}
              </p>
            </div>
            <DashboardIcon name="arrow" className="rtl:rotate-180" />
          </Link>
          <Link className="dash-quick-card ui-focus" href={'/' + locale + '/invitations'}>
            <DashboardIcon name="registrations" />
            <div>
              <h3>{t('Review your invitations', 'راجع دعواتك')}</h3>
              <p>
                {t('Choose the teams you want to join.', 'اختر الفرق التي تريد الانضمام إليها.')}
              </p>
            </div>
            <DashboardIcon name="arrow" className="rtl:rotate-180" />
          </Link>
        </div>
      </section>
      <RecentActivity locale={locale} organization={organization} />
    </div>
  );
}
function RecentActivity({ locale, organization }: { locale: Locale; organization: Organization }) {
  const t: Copy = (en, ar) => text(locale, en, ar);
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState('ALL');
  const activity = useDashboardData(
    'organizations/' + organization.id + '/dashboard/activity?page=' + page + '&action=' + filter,
    dashboardActivityListSchema,
  );
  return (
    <Card className="dash-panel">
      <div className="dash-panel-heading">
        <div>
          <h2>{t('Recent activity', 'النشاط الأخير')}</h2>
          <p>{t('A clear record of your organization’s changes.', 'سجل واضح لتغييرات مؤسستك.')}</p>
        </div>
        <Select
          value={filter}
          onValueChange={(value) => {
            setFilter(value);
            setPage(1);
          }}
        >
          <FormField label={t('Activity filter', 'تصفية النشاط')}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
          </FormField>
          <SelectContent>
            <SelectItem value="ALL">{t('All changes', 'جميع التغييرات')}</SelectItem>
            <SelectItem value="TEAM">{t('Team changes', 'تغييرات الفريق')}</SelectItem>
            <SelectItem value="INVITATIONS">{t('Invitations', 'الدعوات')}</SelectItem>
            <SelectItem value="SETTINGS">
              {t('Organization settings', 'إعدادات المؤسسة')}
            </SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="dash-activity-body">
        {activity.loading && <DashboardSkeleton locale={locale} compact />}
        {activity.error && (
          <DashboardFailure status={activity.error} retry={activity.refresh} t={t} />
        )}
        {activity.data?.items.length === 0 && (
          <EmptyState
            title={t('A fresh start', 'بداية جديدة')}
            description={t(
              'No recorded changes match this filter. Organization and team changes will appear here as they happen.',
              'لا توجد تغييرات مسجّلة تطابق التصفية. ستظهر تغييرات المؤسسة والفريق هنا عند حدوثها.',
            )}
            action={
              filter !== 'ALL' ? (
                <Button
                  variant="outline"
                  onClick={() => {
                    setFilter('ALL');
                    setPage(1);
                  }}
                >
                  {t('Show all changes', 'عرض جميع التغييرات')}
                </Button>
              ) : undefined
            }
          />
        )}
        {Boolean(activity.data?.items.length) && (
          <div
            className="dash-table-region ui-focus"
            role="region"
            aria-label={t('Recent organization activity', 'نشاط المؤسسة الأخير')}
            tabIndex={0}
          >
            <Table>
              <caption className="sr-only">
                {t('Recent organization activity', 'نشاط المؤسسة الأخير')}
              </caption>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('Change', 'التغيير')}</TableHead>
                  <TableHead>{t('By', 'بواسطة')}</TableHead>
                  <TableHead>{t('When', 'الوقت')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activity.data?.items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <span className="dash-activity-label">
                        <span className="dash-activity-dot" aria-hidden />
                        {activityLabel(locale, item.action)}
                      </span>
                    </TableCell>
                    <TableCell>{item.actorName ?? t('System', 'النظام')}</TableCell>
                    <TableCell>
                      <time dateTime={item.createdAt}>
                        {new Intl.DateTimeFormat(locale, {
                          dateStyle: 'medium',
                          timeStyle: 'short',
                          timeZone: organization.timezone,
                        }).format(new Date(item.createdAt))}
                      </time>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
        {activity.data && (
          <DashboardPagination page={page} total={activity.data.total} onChange={setPage} t={t} />
        )}
      </div>
    </Card>
  );
}
const plannedDescriptions: Record<string, [string, string]> = {
  events: [
    'Your event portfolio will live here. Event creation and publishing are planned for a later phase.',
    'ستجد فعالياتك هنا. إنشاء الفعاليات ونشرها مخطّطان لمرحلة لاحقة.',
  ],
  registrations: [
    'Registration forms and enrollment records will be connected after event management is available.',
    'ستُربط نماذج التسجيل وسجلات الاشتراك بعد إتاحة إدارة الفعاليات.',
  ],
  attendees: [
    'Your attendee directory and attendance workflows will become available with real event registrations.',
    'سيتاح دليل الحضور وإجراءاته مع تسجيلات الفعاليات الفعلية.',
  ],
  sessions: [
    'Session schedules and speakers will be connected to your events in a later phase.',
    'ستُربط جداول الجلسات والمتحدثون بفعالياتك في مرحلة لاحقة.',
  ],
  polls: [
    'Audience polls and Q&A will be built on your future event and session data.',
    'ستُبنى استطلاعات الجمهور والأسئلة على بيانات الفعاليات والجلسات القادمة.',
  ],
  certificates: [
    'Certificate issuance and verification will be connected to real participation records.',
    'سيُربط إصدار الشهادات والتحقق منها بسجلات المشاركة الفعلية.',
  ],
  analytics: [
    'Event analytics will appear when event, registration and attendance data exists. Organization metrics are available in Overview.',
    'ستظهر تحليلات الفعاليات عند توفر بيانات الفعاليات والتسجيل والحضور. مؤشرات المؤسسة متاحة في النظرة العامة.',
  ],
};
export function PlannedDashboardSection({
  locale,
  organization,
  section,
}: {
  locale: Locale;
  organization: Organization;
  section: DashboardSection;
}) {
  const t: Copy = (en, ar) => text(locale, en, ar);
  const description = plannedDescriptions[section]!;
  return (
    <div className="dash-content-stack">
      <Card className="dash-planned-panel">
        <div className="dash-planned-orbit" aria-hidden>
          <DashboardIcon name={section} className="size-12" />
        </div>
        <Badge variant="warning">{t('Planned · Not yet available', 'مخطّط · غير متاح بعد')}</Badge>
        <h2>{t('Your next event chapter starts here.', 'هنا يبدأ فصل فعالياتك القادم.')}</h2>
        <p>{description[locale === 'ar' ? 1 : 0]}</p>
        <div className="flex flex-wrap justify-center gap-3">
          <Button asChild>
            <Link href={dashboardRoute(locale, organization.id)}>
              {t('View organization overview', 'عرض نظرة المؤسسة العامة')}
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href={dashboardRoute(locale, organization.id, 'team')}>
              {hasOrganizationPermission(organization.role, 'team:write')
                ? t('Prepare your team', 'جهّز فريقك')
                : t('View team', 'عرض الفريق')}
            </Link>
          </Button>
        </div>
      </Card>
      <Card className="dash-access-note">
        <DashboardIcon name="settings" className="size-5" />
        <div>
          <h3>{t('Useful work you can do today', 'خطوات مفيدة يمكنك إنجازها اليوم')}</h3>
          <p>
            {t(
              'Keep your organization profile current, invite teammates, and review access. These tools are available now.',
              'حدّث ملف المؤسسة وادعُ فريقك وراجع الصلاحيات. هذه الأدوات متاحة الآن.',
            )}
          </p>
          <Link
            className="dash-inline-link ui-focus"
            href={dashboardRoute(locale, organization.id, 'settings')}
          >
            {t('Open organization settings', 'فتح إعدادات المؤسسة')}
          </Link>
        </div>
      </Card>
    </div>
  );
}
