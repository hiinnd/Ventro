'use client';
import { useEffect, useState } from 'react';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import { z } from 'zod';
import {
  authSessionSchema,
  dashboardNoticesSchema,
  memberListSchema,
  organizationListSchema,
  organizationRoleSchema,
  type AuthSession,
  type DashboardSection,
  type Locale,
  type Organization,
} from '@ventro/types';
import {
  Badge,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  EmptyState,
  FormField,
  Icon,
  Input,
  Modal,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@ventro/ui';
import { WorkspaceLink as Link } from '../organizations/workspace-link';
import { roleLabel } from '../organizations/workspace';
import { dashboardRoute, dashboardSections, sectionLabel } from '../../lib/dashboard/navigation';
import { text } from '../../lib/marketing/site';
import {
  DashboardFailure,
  DashboardPagination,
  DashboardSkeleton,
  dashboardRequest,
  useDashboardData,
  type Copy,
} from './data';
import { DashboardIcon } from './icons';
const noContentSchema = z.null();
export function OrganizationAvatar({ organization }: { organization: Organization }) {
  return organization.logoDigest ? (
    <Image
      unoptimized
      src={'/api/organizations/' + organization.id + '/logo?v=' + organization.logoDigest}
      width={40}
      height={40}
      alt=""
      className="dash-org-avatar"
    />
  ) : (
    <span className="dash-org-avatar dash-org-initial" aria-hidden>
      {organization.name.slice(0, 1)}
    </span>
  );
}
export function OrganizationSwitcher({
  locale,
  organization,
  section,
}: {
  locale: Locale;
  organization: Organization;
  section: DashboardSection;
}) {
  const [open, setOpen] = useState(false);
  const t: Copy = (en, ar) => text(locale, en, ar);
  return (
    <>
      <Button
        className="dash-org-trigger"
        variant="ghost"
        onClick={() => setOpen(true)}
        aria-label={t('Switch organization', 'تبديل المؤسسة')}
      >
        <OrganizationAvatar organization={organization} />
        <span className="min-w-0 text-start">
          <span className="dash-org-trigger-label">{t('ORGANIZATION', 'المؤسسة')}</span>
          <span className="block truncate font-semibold">{organization.name}</span>
        </span>
        <Icon name="down" />
      </Button>
      <Modal
        open={open}
        onOpenChange={setOpen}
        title={t('Choose your workspace', 'اختر مساحة عملك')}
        description={t(
          'Only organizations where you are an Owner or Event Manager are available here.',
          'تظهر المؤسسات التي تملك فيها دور المالك أو مدير الفعاليات فقط.',
        )}
        closeLabel={t('Close organization switcher', 'إغلاق مبدّل المؤسسات')}
      >
        <OrganizationChoices
          key={organization.id}
          locale={locale}
          section={section}
          currentId={organization.id}
          onSelected={() => setOpen(false)}
        />
      </Modal>
    </>
  );
}
export function OrganizationChoices({
  locale,
  section = 'overview',
  currentId,
  onSelected,
}: {
  locale: Locale;
  section?: DashboardSection;
  currentId?: string;
  onSelected?: () => void;
}) {
  const t: Copy = (en, ar) => text(locale, en, ar);
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);
  const list = useDashboardData(
    'organizations/dashboard-options?page=' + page,
    organizationListSchema,
  );
  async function choose(org: Organization) {
    if (pending) return;
    setPending(true);
    setFailed(false);
    try {
      await dashboardRequest('organizations/' + org.id + '/activate', authSessionSchema, {
        body: {},
      });
      onSelected?.();
      router.push(dashboardRoute(locale, org.id, section));
      router.refresh();
    } catch {
      setFailed(true);
    } finally {
      setPending(false);
    }
  }
  return (
    <div className="grid gap-4">
      {list.loading && <DashboardSkeleton locale={locale} compact />}
      {list.error && <DashboardFailure status={list.error} retry={list.refresh} t={t} />}
      {failed && (
        <p role="alert" className="text-danger text-sm">
          {t(
            'Unable to switch. Your membership may have changed.',
            'تعذّر التبديل. قد تكون عضويتك تغيّرت.',
          )}
        </p>
      )}
      {list.data?.items.map((org) => (
        <Button
          key={org.id}
          variant="outline"
          className="dash-org-choice"
          disabled={pending}
          onClick={() => void choose(org)}
        >
          <OrganizationAvatar organization={org} />
          <span className="min-w-0 flex-1 text-start">
            <span className="block truncate">{org.name}</span>
            <span className="block text-xs font-normal text-muted-foreground">
              {roleLabel(locale, org.role)}
            </span>
          </span>
          {currentId === org.id ? (
            <Badge variant="success">{t('Current', 'الحالية')}</Badge>
          ) : (
            <DashboardIcon name="arrow" className="size-4 rtl:rotate-180" />
          )}
        </Button>
      ))}
      {list.data?.items.length === 0 && (
        <EmptyState
          title={t('No organizer workspaces yet', 'لا توجد مساحة منظّم بعد')}
          description={t(
            'Create an organization or accept an invitation as an Owner or Event Manager.',
            'أنشئ مؤسسة أو اقبل دعوة بدور المالك أو مدير الفعاليات.',
          )}
          action={
            <Button asChild>
              <Link href={'/' + locale + '/organizations/new'}>
                {t('Create organization', 'إنشاء مؤسسة')}
              </Link>
            </Button>
          }
        />
      )}
      {list.data && (
        <DashboardPagination page={page} total={list.data.total} onChange={setPage} t={t} />
      )}
      <Link className="ui-focus dash-inline-link" href={'/' + locale + '/organizations'}>
        {t('Manage all your organizations', 'إدارة جميع مؤسساتك')}
      </Link>
    </div>
  );
}
export function DashboardSearch({
  locale,
  organization,
}: {
  locale: Locale;
  organization: Organization;
}) {
  const t: Copy = (en, ar) => text(locale, en, ar);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const shortcut = (event: KeyboardEvent) => {
      if (
        (event.ctrlKey || event.metaKey) &&
        event.key.toLowerCase() === 'k' &&
        !event.defaultPrevented
      ) {
        event.preventDefault();
        setOpen((value) => !value);
      }
    };
    window.addEventListener('keydown', shortcut);
    return () => window.removeEventListener('keydown', shortcut);
  }, []);
  return (
    <>
      <Button
        variant="outline"
        className="dash-search-trigger"
        aria-label={t('Search workspace', 'البحث في مساحة العمل')}
        onClick={() => setOpen(true)}
      >
        <DashboardIcon name="search" className="size-4" />
        <span>{t('Search workspace…', 'ابحث في مساحة العمل…')}</span>
        <kbd>⌘ / Ctrl K</kbd>
      </Button>
      <Modal
        open={open}
        onOpenChange={setOpen}
        title={t('Search your workspace', 'ابحث في مساحة عملك')}
        description={t(
          'Find real team members or jump to a section. Event search will be available when event management launches.',
          'ابحث عن أعضاء فريقك أو انتقل إلى قسم. يتاح البحث في الفعاليات عند إطلاق إدارتها.',
        )}
        closeLabel={t('Close search', 'إغلاق البحث')}
      >
        <SearchContent
          key={organization.id + String(open)}
          locale={locale}
          organization={organization}
          close={() => setOpen(false)}
        />
      </Modal>
    </>
  );
}
function SearchContent({
  locale,
  organization,
  close,
}: {
  locale: Locale;
  organization: Organization;
  close: () => void;
}) {
  const t: Copy = (en, ar) => text(locale, en, ar);
  const [q, setQ] = useState('');
  const [term, setTerm] = useState('');
  const [role, setRole] = useState('ALL');
  const [page, setPage] = useState(1);
  useEffect(() => {
    const timer = setTimeout(() => {
      setTerm(q.trim());
      setPage(1);
    }, 250);
    return () => clearTimeout(timer);
  }, [q]);
  const list = useDashboardData(
    term.length >= 2 ? 'organizations/' + organization.id + '/dashboard/search' : null,
    memberListSchema,
    { q: term, role, page },
  );
  const sections = dashboardSections.filter((item) =>
    (locale === 'ar' ? item.ar : item.en)
      .toLocaleLowerCase()
      .includes(q.trim().toLocaleLowerCase()),
  );
  return (
    <div className="grid gap-5">
      <FormField
        label={t('Search team members', 'البحث عن أعضاء الفريق')}
        description={t(
          'Enter at least two characters. Search stays within this organization.',
          'أدخل حرفين على الأقل. البحث محصور في هذه المؤسسة.',
        )}
      >
        <Input
          autoFocus
          value={q}
          maxLength={100}
          onChange={(event) => setQ(event.target.value)}
          placeholder={t('Name or email', 'الاسم أو البريد')}
        />
      </FormField>
      <Select
        value={role}
        onValueChange={(value) => {
          setRole(value);
          setPage(1);
        }}
      >
        <FormField label={t('Filter by role', 'التصفية حسب الدور')}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
        </FormField>
        <SelectContent>
          <SelectItem value="ALL">{t('All roles', 'جميع الأدوار')}</SelectItem>
          {organizationRoleSchema.options.map((role) => (
            <SelectItem key={role} value={role}>
              {roleLabel(locale, role)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {list.loading && <DashboardSkeleton locale={locale} compact />}
      {list.error && <DashboardFailure status={list.error} retry={list.refresh} t={t} />}
      {list.data && (
        <section aria-label={t('Team search results', 'نتائج البحث في الفريق')}>
          <p role="status" className="dash-small-muted mb-3">
            {t('Matching members: ', 'الأعضاء المطابقون: ')}
            {list.data.total}
          </p>
          {list.data.items.length === 0 ? (
            <p className="dash-small-muted">
              {t(
                'No matching team members. Try another name or clear the role filter.',
                'لا يوجد أعضاء مطابقون. جرّب اسمًا آخر أو أزل تصفية الدور.',
              )}
            </p>
          ) : (
            <ul className="dash-search-results">
              {list.data.items.map((member) => (
                <li key={member.userId}>
                  <div className="min-w-0">
                    <strong>{member.name}</strong>
                    <span dir="ltr">{member.email}</span>
                  </div>
                  <Badge>{roleLabel(locale, member.role)}</Badge>
                </li>
              ))}
            </ul>
          )}
          <DashboardPagination page={page} total={list.data.total} onChange={setPage} t={t} />
        </section>
      )}
      <section>
        <h3 className="dash-dialog-label">{t('JUMP TO A SECTION', 'الانتقال إلى قسم')}</h3>
        <div className="dash-search-sections">
          {sections.map((item) => (
            <Link
              key={item.id}
              href={dashboardRoute(locale, organization.id, item.id)}
              onClick={close}
              className="ui-focus"
            >
              <DashboardIcon name={item.id} className="size-4" />
              {sectionLabel(locale, item.id)}
              {!item.ready && <Badge>{t('Planned', 'مخطّط')}</Badge>}
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
export function DashboardNotifications({
  locale,
  organization,
}: {
  locale: Locale;
  organization: Organization;
}) {
  const t: Copy = (en, ar) => text(locale, en, ar);
  const [open, setOpen] = useState(false);
  const notices = useDashboardData(
    'organizations/' + organization.id + '/dashboard/notices',
    dashboardNoticesSchema,
  );
  return (
    <>
      <Button
        size="icon"
        variant="ghost"
        className="dash-notice-trigger"
        aria-label={t('Organization updates', 'تحديثات المؤسسة')}
        onClick={() => { notices.refresh(); setOpen(true); }}
      >
        <DashboardIcon name="bell" className="size-5" />
        {Boolean(notices.data?.items.length) && <span className="dash-notice-dot" aria-hidden />}
      </Button>
      <Modal
        open={open}
        onOpenChange={setOpen}
        title={t('Organization updates', 'تحديثات المؤسسة')}
        description={t(
          'Live notices about organization setup and team invitations.',
          'تنبيهات حالية عن إعداد المؤسسة ودعوات الفريق.',
        )}
        closeLabel={t('Close updates', 'إغلاق التحديثات')}
      >
        <div className="grid gap-4">
          {notices.loading && <DashboardSkeleton locale={locale} compact />}
          {notices.error && (
            <DashboardFailure status={notices.error} retry={notices.refresh} t={t} />
          )}
          {notices.data?.items.length === 0 && (
            <EmptyState
              title={t('You’re up to date', 'لا توجد تحديثات تستدعي إجراءً')}
              description={t(
                'No organization setup or invitation notices need your attention.',
                'لا توجد تنبيهات لإعداد المؤسسة أو دعوات تحتاج إلى مراجعتك.',
              )}
            />
          )}
          {notices.data?.items.map((notice) => (
            <Link
              className="dash-notice-card ui-focus"
              key={notice.code}
              href={dashboardRoute(locale, organization.id, notice.section)}
              onClick={() => setOpen(false)}
            >
              <span className="dash-notice-count">{notice.count}</span>
              <span>
                {notice.code === 'PROFILE_DETAILS'
                  ? t('Add optional profile details', 'أضف تفاصيل الملف الاختيارية')
                  : notice.code === 'INVITATIONS_PENDING'
                    ? t('Team invitations awaiting a response', 'دعوات فريق بانتظار الرد')
                    : t('Expired invitations to review', 'دعوات منتهية للمراجعة')}
                <small>
                  {t('Open ', 'فتح ')}
                  {sectionLabel(locale, notice.section)}
                </small>
              </span>
              <DashboardIcon name="arrow" className="size-4 rtl:rotate-180" />
            </Link>
          ))}
          <Button variant="outline" onClick={notices.refresh} disabled={notices.loading}>
            {t('Refresh updates', 'تحديث التنبيهات')}
          </Button>
        </div>
      </Modal>
    </>
  );
}
export function DashboardUserMenu({ locale, session }: { locale: Locale; session: AuthSession }) {
  const t: Copy = (en, ar) => text(locale, en, ar);
  const router = useRouter();
  const path = usePathname();
  const { resolvedTheme, setTheme } = useTheme();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(false);
  async function logout() {
    if (pending) return;
    setPending(true);
    setError(false);
    try {
      await dashboardRequest('auth/logout', noContentSchema, { body: {} });
      router.replace('/' + locale + '/login');
      router.refresh();
    } catch {
      setError(true);
    } finally {
      setPending(false);
    }
  }
  return (
    <div className="dash-user-control">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            className="dash-user-trigger"
            variant="outline"
            aria-label={t('User menu', 'قائمة المستخدم')}
            disabled={pending}
          >
            <span aria-hidden>{session.user.name.slice(0, 1)}</span>
            <Icon name="down" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>{session.user.name}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link href={'/' + locale + '/account'}>{t('Account profile', 'الملف الشخصي')}</Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href={'/' + locale + '/organizations'}>{t('Your organizations', 'مؤسساتك')}</Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link
              href={path.replace(/^\/(en|ar)/, locale === 'en' ? '/ar' : '/en')}
              hrefLang={locale === 'en' ? 'ar' : 'en'}
            >
              {locale === 'en' ? 'العربية' : 'English'}
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}>
            {t('Switch theme', 'تبديل المظهر')}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => void logout()}>
            {t('Sign out', 'تسجيل الخروج')}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      {error && (
        <p role="alert" className="dash-menu-error">
          {t('Sign out failed. Try again.', 'تعذّر الخروج. حاول مجددًا.')}
        </p>
      )}
    </div>
  );
}
