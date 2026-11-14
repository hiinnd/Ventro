'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { WorkspaceLink as Link } from './workspace-link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import { z } from 'zod';
import {
  authSessionSchema,
  hasOrganizationPermission,
  invitationListSchema,
  invitationSchema,
  memberListSchema,
  organizationListSchema,
  organizationRoleSchema,
  organizationSchema,
  platformOrganizationListSchema,
  type AuthSession,
  type Locale,
  type Organization,
  type OrganizationInvitation,
  type OrganizationRole,
} from '@ventro/types';
import {
  Badge,
  BrandLogo,
  Breadcrumbs,
  Button,
  Card,
  EmptyState,
  ErrorState,
  FormField,
  Icon,
  Input,
  Modal,
  Pagination,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarLink,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Textarea,
} from '@ventro/ui';
import { text } from '../../lib/marketing/site';
import type { WorkspaceView } from './workspace-screen';

const messageSchema = z.object({ message: z.string() });
class WorkspaceError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}
async function api<T>(
  path: string,
  schema: z.ZodType<T>,
  method = 'GET',
  body?: object | FormData,
): Promise<T> {
  const form = body instanceof FormData;
  const response = await fetch('/api/' + path, {
    method,
    credentials: 'same-origin',
    cache: 'no-store',
    headers:
      method === 'GET'
        ? undefined
        : { 'X-Ventro-CSRF': '1', ...(form ? {} : { 'Content-Type': 'application/json' }) },
    body: method === 'GET' ? undefined : form ? body : JSON.stringify(body ?? {}),
  });
  const payload: unknown = await response.json();
  if (!response.ok)
    throw new WorkspaceError(
      response.status,
      messageSchema.safeParse(payload).data?.message ?? 'Request failed',
    );
  return schema.parse(payload);
}
const roles: Record<OrganizationRole, [string, string]> = {
  OWNER: ['Organization Owner', 'مالك المؤسسة'],
  EVENT_MANAGER: ['Event Manager', 'مدير الفعاليات'],
  CHECK_IN_STAFF: ['Check-in Staff', 'موظف الدخول'],
  PARTICIPANT: ['Participant', 'مشارك'],
};
export function roleLabel(locale: Locale, role: OrganizationRole) {
  return roles[role][locale === 'ar' ? 1 : 0];
}
type Copy = (en: string, ar: string) => string;
function RoleSelect({
  value,
  onChange,
  label,
  locale,
  disabled,
}: {
  value: OrganizationRole;
  onChange: (role: OrganizationRole) => void;
  label: string;
  locale: Locale;
  disabled?: boolean;
}) {
  return (
    <Select
      value={value}
      onValueChange={(value) => onChange(organizationRoleSchema.parse(value))}
      disabled={disabled}
    >
      <FormField label={label}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
      </FormField>
      <SelectContent>
        {organizationRoleSchema.options.map((role) => (
          <SelectItem key={role} value={role}>
            {roleLabel(locale, role)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
function PageNav({
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
  return total > 25 ? (
    <Pagination
      page={page}
      pageCount={Math.ceil(total / 25)}
      onPageChange={onChange}
      labels={{
        navigation: t('Pagination', 'التنقل بين الصفحات'),
        previous: t('Previous page', 'الصفحة السابقة'),
        next: t('Next page', 'الصفحة التالية'),
        page: (page) => t('Page ', 'صفحة ') + page,
        more: t('More pages', 'صفحات إضافية'),
        empty: t('No pages', 'لا توجد صفحات'),
      }}
    />
  ) : null;
}
function OrganizationMark({ organization }: { organization: Organization }) {
  return organization.logoDigest ? (
    <Image
      src={'/api/organizations/' + organization.id + '/logo?v=' + organization.logoDigest}
      alt=""
      width={56}
      height={56}
      unoptimized
      className="workspace-org-logo"
    />
  ) : (
    <div className="workspace-monogram" aria-hidden>
      {organization.name.slice(0, 1)}
    </div>
  );
}
export function Workspace({
  locale,
  view,
  session,
  initialOrganization,
}: {
  locale: Locale;
  view: WorkspaceView;
  session: AuthSession;
  initialOrganization?: Organization;
}) {
  const t: Copy = (en, ar) => text(locale, en, ar);
  const path = usePathname();
  const { resolvedTheme, setTheme } = useTheme();
  const [organization, setOrganization] = useState(initialOrganization);
  const [activeId, setActiveId] = useState(session.activeOrganizationId);
  const base = '/' + locale;
  const titles: Record<WorkspaceView, string> = {
    organizations: t('Your organizations', 'مؤسساتك'),
    new: t('Create an organization', 'إنشاء مؤسسة'),
    settings: t('Organization settings', 'إعدادات المؤسسة'),
    team: t('Team & access', 'الفريق والصلاحيات'),
    invitations: t('Your invitations', 'دعواتك'),
    platform: t('Platform organizations', 'مؤسسات المنصة'),
  };
  const orgBase = organization ? base + '/organizations/' + organization.id : '';
  const permittedTeam = organization && hasOrganizationPermission(organization.role, 'team:read');
  const verified = Boolean(session.user.emailVerifiedAt);
  return (
    <div className="workspace-shell">
      <a href="#workspace-main" className="skip-link">
        {t('Skip to content', 'انتقل إلى المحتوى')}
      </a>
      <Sidebar className="workspace-sidebar">
        <SidebarHeader>
          <Link
            href={base + '/organizations'}
            aria-label={t('VENTRO organizations', 'مؤسسات VENTRO')}
          >
            <BrandLogo className="h-9 w-auto" />
          </Link>
          <p className="mt-3 text-xs text-muted-foreground">
            {t('Every Event. Beyond the Moment.', 'كل فعالية، أبعد من لحظتها.')}
          </p>
        </SidebarHeader>
        <SidebarContent>
          <p className="workspace-nav-label">{t('WORKSPACE', 'مساحة العمل')}</p>
          <nav aria-label={t('Workspace navigation', 'تنقل مساحة العمل')} className="grid gap-1">
            <SidebarLink
              href={base + '/organizations'}
              active={view === 'organizations' || view === 'new'}
            >
              <Icon name="empty" />
              {t('Organizations', 'المؤسسات')}
            </SidebarLink>
            <SidebarLink href={base + '/invitations'} active={view === 'invitations'}>
              <Icon name="info" />
              {t('Invitations', 'الدعوات')}
            </SidebarLink>
            {organization && (
              <>
                <p className="workspace-nav-label mt-6 truncate">{organization.name}</p>
                {hasOrganizationPermission(organization.role, 'dashboard:read') && (
                  <SidebarLink href={orgBase + '/dashboard'}>
                    <Icon name="menu" />
                    {t('Organizer dashboard', 'لوحة المنظّم')}
                  </SidebarLink>
                )}
                <SidebarLink href={orgBase + '/settings'} active={view === 'settings'}>
                  <Icon name="theme" />
                  {t('Organization settings', 'إعدادات المؤسسة')}
                </SidebarLink>
                {permittedTeam && (
                  <SidebarLink href={orgBase + '/team'} active={view === 'team'}>
                    <Icon name="check" />
                    {t('Team & access', 'الفريق والصلاحيات')}
                  </SidebarLink>
                )}
              </>
            )}
            {session.user.platformRole === 'PLATFORM_ADMIN' && (
              <SidebarLink href={base + '/platform'} active={view === 'platform'}>
                {t('Platform administration', 'إدارة المنصة')}
              </SidebarLink>
            )}
          </nav>
        </SidebarContent>
        <SidebarFooter>
          <Link href={base + '/account'} className="ui-focus font-medium text-foreground">
            {session.user.name}
          </Link>
          <p className="mt-1">
            {session.user.platformRole === 'PLATFORM_ADMIN'
              ? t('Platform Admin', 'مسؤول المنصة')
              : t('Personal account', 'حساب شخصي')}
          </p>
        </SidebarFooter>
      </Sidebar>
      <div className="workspace-body">
        <header className="workspace-topbar">
          <Breadcrumbs
            label={t('Breadcrumbs', 'مسار التنقل')}
            items={[{ label: 'VENTRO', href: base }, { label: titles[view] }]}
          />
          <div className="flex shrink-0 items-center gap-2">
            <Button asChild variant="outline" size="icon">
              <Link href={base + '/account'} aria-label={t('Account profile', 'الملف الشخصي')}>
                {session.user.name.slice(0, 1)}
              </Link>
            </Button>
            <Button
              size="icon"
              variant="outline"
              aria-label={t('Switch theme', 'تبديل المظهر')}
              onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
            >
              <Icon name="theme" />
            </Button>
            <Link
              href={path.replace(/^\/(en|ar)/, locale === 'en' ? '/ar' : '/en')}
              hrefLang={locale === 'en' ? 'ar' : 'en'}
              className="workspace-language ui-focus"
            >
              {locale === 'en' ? 'العربية' : 'English'}
            </Link>
          </div>
        </header>
        <main id="workspace-main" className="workspace-main">
          <div className="workspace-heading">
            <p className="workspace-eyebrow">VENTRO / {t('CONNECTED TEAMS', 'فرق متصلة')}</p>
            <h1>{titles[view]}</h1>
            <p>
              {view === 'organizations'
                ? t(
                    'A focused space for every team you belong to. Choose where you work next.',
                    'مساحة لكل فريق تنتمي إليه. اختر المؤسسة التي ستعمل معها.',
                  )
                : view === 'team'
                  ? t(
                      'The right people. The right access. Clear ownership at every step.',
                      'الأشخاص المناسبون، والصلاحيات المناسبة، ومسؤوليات واضحة.',
                    )
                  : view === 'invitations'
                    ? t(
                        'Review invitations sent to your verified email. You decide which teams to join.',
                        'راجع الدعوات المرسلة إلى بريدك المؤكّد، واختر الفرق التي تنضم إليها.',
                      )
                    : view === 'new'
                      ? t(
                          'Give your team a home. You will become its first owner.',
                          'أنشئ مساحة لفريقك، وستكون مالكها الأول.',
                        )
                      : view === 'platform'
                        ? t(
                            'Read-only organization directory for authorized platform administrators.',
                            'دليل المؤسسات للقراءة فقط لمسؤولي المنصة المخوّلين.',
                          )
                        : t(
                            'Keep your organization identity and preferences up to date.',
                            'حافظ على هوية مؤسستك وتفضيلاتها محدثة.',
                          )}
            </p>
          </div>
          {!verified ? (
            <EmptyState
              title={t('Verify your email first', 'أكّد بريدك أولًا')}
              description={t(
                'Organization access requires a verified account. Open your account to resend verification.',
                'تتطلب المؤسسات حسابًا ببريد مؤكّد. افتح حسابك لإعادة إرسال رسالة التأكيد.',
              )}
              action={
                <Button asChild>
                  <Link href={base + '/account'}>{t('Open account', 'فتح الحساب')}</Link>
                </Button>
              }
            />
          ) : (
            <>
              {view === 'organizations' && (
                <Organizations locale={locale} activeId={activeId} onActivate={setActiveId} />
              )}
              {(view === 'new' || (view === 'settings' && organization)) && (
                <OrganizationProfile
                  locale={locale}
                  organization={organization}
                  onChange={setOrganization}
                />
              )}
              {view === 'team' && organization && (
                <Team locale={locale} organization={organization} currentUserId={session.user.id} />
              )}
              {view === 'invitations' && <Invitations locale={locale} />}
              {view === 'platform' &&
                (session.user.platformRole === 'PLATFORM_ADMIN' ? (
                  <PlatformDirectory locale={locale} />
                ) : (
                  <ErrorState
                    title={t('Access restricted', 'الوصول مقيّد')}
                    description={t(
                      'Platform administrator permission is required.',
                      'تلزم صلاحية مسؤول المنصة.',
                    )}
                  />
                ))}
            </>
          )}
          <footer className="workspace-footer">
            <span>
              VENTRO · {t('Every Event. Beyond the Moment.', 'كل فعالية، أبعد من لحظتها.')}
            </span>
            <Link className="ui-focus" href={base}>
              {t('Public website', 'الموقع العام')}
            </Link>
          </footer>
        </main>
      </div>
    </div>
  );
}

function useAction(locale: Locale) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const lock = useRef(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const run = async (action: () => Promise<void>, done?: string) => {
    if (lock.current) return;
    lock.current = true;
    setPending(true);
    setError('');
    setSuccess('');
    try {
      await action();
      if (done) setSuccess(done);
    } catch (err) {
      if (err instanceof WorkspaceError && err.status === 401) {
        router.replace('/' + locale + '/login');
        return;
      }
      setError(
        locale === 'en' && err instanceof WorkspaceError
          ? err.message
          : locale === 'ar'
            ? 'تعذّر إكمال الطلب. تحقق من البيانات والصلاحيات وصلاحية الدعوة، وحافظ على مالك واحد على الأقل.'
            : 'Service temporarily unavailable. Please try again.',
      );
    } finally {
      lock.current = false;
      setPending(false);
    }
  };
  const notice = (
    <>
      {error && (
        <ErrorState
          title={locale === 'en' ? 'Request unsuccessful' : 'لم يكتمل الطلب'}
          description={error}
        />
      )}
      {success && (
        <p role="status" className="workspace-success">
          {success}
        </p>
      )}
    </>
  );
  return { run, pending, notice };
}
function useList<T>(
  path: string,
  schema: z.ZodType<{ items: T[]; total: number; page: number; pageSize: 25 }>,
  locale: Locale,
) {
  const [page, setPage] = useState(1);
  const [revision, setRevision] = useState(0);
  const [data, setData] = useState<{ items: T[]; total: number }>();
  const [error, setError] = useState(false);
  useEffect(() => {
    let alive = true;
    setData(undefined);
    setError(false);
    api(path + '?page=' + page, schema)
      .then((value) => {
        if (alive) setData(value);
      })
      .catch(() => {
        if (alive) setError(true);
      });
    return () => {
      alive = false;
    };
  }, [path, schema, page, revision]);
  const refresh = useCallback(() => setRevision((value) => value + 1), []);
  const state = error ? (
    <ErrorState
      title={locale === 'en' ? 'Unable to load' : 'تعذّر التحميل'}
      description={
        locale === 'en'
          ? 'Your access may have changed or the service is unavailable.'
          : 'قد تكون صلاحياتك تغيّرت أو الخدمة غير متاحة.'
      }
      action={
        <Button variant="outline" onClick={refresh}>
          {locale === 'en' ? 'Try again' : 'حاول مجددًا'}
        </Button>
      }
    />
  ) : !data ? (
    <div
      role="status"
      aria-label={locale === 'en' ? 'Loading' : 'جارٍ التحميل'}
      className="grid gap-4"
    >
      <Skeleton className="h-32" />
      <Skeleton className="h-32" />
    </div>
  ) : null;
  return { data, page, setPage, refresh, state };
}
function Organizations({
  locale,
  activeId,
  onActivate,
}: {
  locale: Locale;
  activeId: string | null;
  onActivate: (id: string) => void;
}) {
  const t: Copy = (en, ar) => text(locale, en, ar);
  const router = useRouter();
  const action = useAction(locale);
  const list = useList('organizations', organizationListSchema, locale);
  return (
    <div className="workspace-stack">
      {action.notice}
      <div className="workspace-section-bar">
        <h2>{t('Organization directory', 'دليل المؤسسات')}</h2>
        <Button asChild>
          <Link href={'/' + locale + '/organizations/new'}>
            {t('Create organization', 'إنشاء مؤسسة')} <span aria-hidden>+</span>
          </Link>
        </Button>
      </div>
      {list.state}
      {list.data?.items.length === 0 && (
        <EmptyState
          title={t('A home for your next team', 'مساحة لفريقك القادم')}
          description={t(
            'Create an organization or accept a team invitation. Each organization keeps its own members and settings.',
            'أنشئ مؤسسة أو اقبل دعوة فريق. لكل مؤسسة أعضاؤها وإعداداتها المستقلة.',
          )}
          action={
            <Button asChild variant="outline">
              <Link href={'/' + locale + '/invitations'}>
                {t('Review invitations', 'مراجعة الدعوات')}
              </Link>
            </Button>
          }
        />
      )}
      <div className="workspace-org-grid">
        {list.data?.items.map((org) => (
          <Card key={org.id} className="workspace-org-card">
            <div className="workspace-org-top">
              <OrganizationMark organization={org} />
              <Badge>{roleLabel(locale, org.role)}</Badge>
            </div>
            <h3>{org.name}</h3>
            <p className="workspace-muted">
              {org.description ||
                t('Your team’s organization workspace.', 'مساحة عمل مؤسستك وفريقك.')}
            </p>
            <div className="workspace-card-bottom">
              <span className="workspace-slug">/{org.slug}</span>
              {activeId === org.id && <Badge variant="success">{t('Active', 'نشطة')}</Badge>}
            </div>
            <Button
              variant="outline"
              disabled={action.pending}
              onClick={() =>
                void action.run(async () => {
                  await api('organizations/' + org.id + '/activate', authSessionSchema, 'POST');
                  onActivate(org.id);
                  router.push('/' + locale + '/organizations/' + org.id + '/settings');
                })
              }
            >
              {t('Open organization', 'فتح المؤسسة')}
              <Icon name="next" className="rtl:rotate-180" />
            </Button>
            {hasOrganizationPermission(org.role, 'dashboard:read') && (
              <Button
                disabled={action.pending}
                onClick={() =>
                  void action.run(async () => {
                    await api('organizations/' + org.id + '/activate', authSessionSchema, 'POST');
                    onActivate(org.id);
                    router.push('/' + locale + '/organizations/' + org.id + '/dashboard');
                  })
                }
              >
                {t('Organizer dashboard', 'لوحة المنظّم')}
              </Button>
            )}
          </Card>
        ))}
      </div>
      {list.data && (
        <PageNav page={list.page} total={list.data.total} onChange={list.setPage} t={t} />
      )}
    </div>
  );
}

export function OrganizationProfile({
  locale,
  organization,
  onChange,
}: {
  locale: Locale;
  organization?: Organization;
  onChange: (org: Organization) => void;
}) {
  const t: Copy = (en, ar) => text(locale, en, ar);
  const router = useRouter();
  const action = useAction(locale);
  const [name, setName] = useState(organization?.name ?? '');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState(organization?.description ?? '');
  const [website, setWebsite] = useState(organization?.website ?? '');
  const [contactEmail, setContactEmail] = useState(organization?.contactEmail ?? '');
  const [timezone, setTimezone] = useState(organization?.timezone ?? 'Asia/Amman');
  const [orgLocale, setOrgLocale] = useState(organization?.locale ?? locale);
  const [file, setFile] = useState<File>();
  const fileInput = useRef<HTMLInputElement>(null);
  const canEdit =
    !organization || hasOrganizationPermission(organization.role, 'organization:write');
  const path = 'organizations/' + organization?.id;
  return (
    <div className="workspace-stack">
      {action.notice}
      {organization && (
        <Card className="workspace-identity">
          <OrganizationMark organization={organization} />
          <div className="min-w-0">
            <h2>{organization.name}</h2>
            <p className="workspace-muted">/{organization.slug}</p>
          </div>
          <Badge>{roleLabel(locale, organization.role)}</Badge>
        </Card>
      )}
      <Card className="workspace-panel">
        <div className="workspace-panel-heading">
          <h2>{t('Organization profile', 'ملف المؤسسة')}</h2>
          <p>
            {canEdit
              ? t(
                  'A recognizable identity for the people you bring together.',
                  'هوية واضحة للأشخاص الذين تجمعهم.',
                )
              : t(
                  'Read-only access. An organization owner can update these settings.',
                  'وصول للقراءة فقط. يمكن لمالك المؤسسة تعديل هذه الإعدادات.',
                )}
          </p>
        </div>
        <form
          className="workspace-form"
          onSubmit={(event) => {
            event.preventDefault();
            void action.run(
              async () => {
                const body = {
                  name,
                  description,
                  website,
                  contactEmail,
                  timezone,
                  locale: orgLocale,
                  ...(!organization ? { slug } : {}),
                };
                const saved = await api(
                  organization ? path : 'organizations',
                  organizationSchema,
                  organization ? 'PATCH' : 'POST',
                  body,
                );
                onChange(saved);
                if (!organization)
                  router.push('/' + locale + '/organizations/' + saved.id + '/settings');
                router.refresh();
              },
              t('Organization saved.', 'تم حفظ المؤسسة.'),
            );
          }}
        >
          <fieldset disabled={!canEdit || action.pending} className="workspace-form-grid">
            <FormField label={t('Organization name', 'اسم المؤسسة')} required>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                minLength={2}
                maxLength={120}
                required
              />
            </FormField>
            {!organization && (
              <FormField
                label={t('Unique slug', 'المعرّف الفريد')}
                description={t(
                  '3–80 lowercase letters, digits and single hyphens. Cannot be changed later.',
                  'من ٣ إلى ٨٠ حرفًا لاتينيًا صغيرًا أو رقمًا مع شرطات مفردة. لا يمكن تغييره لاحقًا.',
                )}
                required
              >
                <Input
                  dir="ltr"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  pattern="[a-z0-9]+(-[a-z0-9]+)*"
                  minLength={3}
                  maxLength={80}
                  required
                />
              </FormField>
            )}
            <FormField label={t('Description', 'الوصف')} className="workspace-form-wide">
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={1000}
              />
            </FormField>
            <FormField label={t('Website', 'الموقع الإلكتروني')}>
              <Input
                dir="ltr"
                type="url"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                maxLength={300}
                placeholder="https://"
              />
            </FormField>
            <FormField label={t('Organization contact email', 'بريد تواصل المؤسسة')}>
              <Input
                dir="ltr"
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                maxLength={254}
              />
            </FormField>
            <FormField
              label={t('Time zone', 'المنطقة الزمنية')}
              description={t(
                'IANA time zone, for example Asia/Amman.',
                'منطقة زمنية بصيغة IANA، مثل Asia/Amman.',
              )}
              required
            >
              <Input
                dir="ltr"
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                maxLength={80}
                required
              />
            </FormField>
            <Select
              value={orgLocale}
              onValueChange={(value) => setOrgLocale(value as Locale)}
              disabled={!canEdit || action.pending}
            >
              <FormField label={t('Invitation email language', 'لغة رسائل الدعوات')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
              </FormField>
              <SelectContent>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="ar">العربية</SelectItem>
              </SelectContent>
            </Select>
          </fieldset>
          {canEdit && (
            <div className="workspace-form-actions">
              <p className="workspace-muted">
                {t(
                  'Only organization owners can change these details.',
                  'يمكن لمالكي المؤسسة فقط تعديل هذه التفاصيل.',
                )}
              </p>
              <Button type="submit" disabled={action.pending}>
                {action.pending
                  ? t('Saving…', 'جارٍ الحفظ…')
                  : organization
                    ? t('Save settings', 'حفظ الإعدادات')
                    : t('Create organization', 'إنشاء مؤسسة')}
              </Button>
            </div>
          )}
        </form>
      </Card>
      {organization && canEdit && (
        <Card className="workspace-panel">
          <div className="workspace-panel-heading">
            <h2>{t('Organization logo', 'شعار المؤسسة')}</h2>
            <p>
              {t(
                'PNG, JPEG or WebP up to 2 MiB. Images are sanitized and stored privately.',
                'PNG أو JPEG أو WebP حتى ٢ ميبيبايت. تُعالج الصور وتُحفظ بصورة خاصة.',
              )}
            </p>
          </div>
          <form
            className="workspace-form"
            onSubmit={(e) => {
              e.preventDefault();
              if (!file) return;
              void action.run(
                async () => {
                  const data = new FormData();
                  data.set('logo', file);
                  await api(path + '/logo', messageSchema, 'POST', data);
                  onChange(await api(path, organizationSchema));
                  setFile(undefined);
                  if (fileInput.current) fileInput.current.value = '';
                  router.refresh();
                },
                t('Logo updated.', 'تم تحديث الشعار.'),
              );
            }}
          >
            <FormField label={t('Choose logo image', 'اختر صورة الشعار')} required>
              <Input
                ref={fileInput}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                disabled={action.pending}
                onChange={(e) => setFile(e.target.files?.[0])}
                required
              />
            </FormField>
            <div className="flex flex-wrap gap-3">
              <Button type="submit" disabled={action.pending || !file}>
                {t('Upload logo', 'رفع الشعار')}
              </Button>
              {organization.logoDigest && (
                <Button
                  variant="outline"
                  disabled={action.pending}
                  onClick={() =>
                    void action.run(
                      async () => {
                        await api(path + '/logo', messageSchema, 'DELETE');
                        onChange(await api(path, organizationSchema));
                        router.refresh();
                      },
                      t('Logo removed.', 'تم حذف الشعار.'),
                    )
                  }
                >
                  {t('Remove logo', 'حذف الشعار')}
                </Button>
              )}
            </div>
          </form>
        </Card>
      )}
      {organization && (
        <Card className="workspace-access-note">
          <Icon name="info" />
          <div>
            <h2>{t('Access follows your membership', 'الصلاحيات مرتبطة بعضويتك')}</h2>
            <p>
              {t(
                'Organization switching changes your current workspace. It never grants access to another team’s data.',
                'تبديل المؤسسة يغيّر مساحة العمل الحالية، ولا يمنحك الوصول إلى بيانات فريق آخر.',
              )}
            </p>
          </div>
        </Card>
      )}
    </div>
  );
}

export function Team({
  locale,
  organization,
  currentUserId,
}: {
  locale: Locale;
  organization: Organization;
  currentUserId: string;
}) {
  const t: Copy = (en, ar) => text(locale, en, ar);
  const action = useAction(locale);
  const router = useRouter();
  const path = 'organizations/' + organization.id;
  const members = useList(path + '/members', memberListSchema, locale);
  const canManage = hasOrganizationPermission(organization.role, 'team:write');
  const [email, setEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<OrganizationRole>('PARTICIPANT');
  const [edit, setEdit] = useState<{ userId: string; name: string; role: OrganizationRole }>();
  const [nextRole, setNextRole] = useState<OrganizationRole>('PARTICIPANT');
  const [remove, setRemove] = useState<{ userId: string; name: string }>();
  const [inviteRevision, setInviteRevision] = useState(0);
  const refresh = () => {
    members.refresh();
    setInviteRevision((value) => value + 1);
    router.refresh();
  };
  const changeSelf = (id: string, next?: OrganizationRole) => {
    if (id === currentUserId && next !== 'OWNER') {
      router.replace('/' + locale + '/organizations');
      router.refresh();
    }
  };
  return (
    <div className="workspace-stack">
      {action.notice}
      <Card className="workspace-panel">
        <div className="workspace-panel-heading">
          <h2>{t('Team members', 'أعضاء الفريق')}</h2>
          <p>
            {canManage
              ? t(
                  'Assign access deliberately. Keep at least one active owner.',
                  'امنح الصلاحيات بعناية، واحتفظ بمالك نشط واحد على الأقل.',
                )
              : t(
                  'Your Event Manager role can view the team. Owners manage membership and invitations.',
                  'يمكن لمدير الفعاليات الاطّلاع على الفريق. يدير المالكون العضويات والدعوات.',
                )}
          </p>
        </div>
        <div className="workspace-table-wrap">
          {members.state}
          {members.data && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('Member', 'العضو')}</TableHead>
                  <TableHead>{t('Role', 'الدور')}</TableHead>
                  {canManage && <TableHead>{t('Actions', 'الإجراءات')}</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.data.items.map((member) => (
                  <TableRow key={member.userId}>
                    <TableCell>
                      <span className="block font-medium">
                        {member.name}
                        {member.userId === currentUserId && (
                          <span className="workspace-muted"> {t('(you)', '(أنت)')}</span>
                        )}
                      </span>
                      <span dir="ltr" className="workspace-muted break-all text-xs">
                        {member.email}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge>{roleLabel(locale, member.role)}</Badge>
                    </TableCell>
                    {canManage && (
                      <TableCell>
                        <div className="flex flex-wrap gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={action.pending}
                            onClick={() => {
                              setEdit(member);
                              setNextRole(member.role);
                            }}
                          >
                            {t('Change role', 'تغيير الدور')}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={action.pending}
                            onClick={() => setRemove(member)}
                          >
                            {t('Remove', 'إزالة')}
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
        {members.data && (
          <div className="p-5">
            <PageNav
              page={members.page}
              total={members.data.total}
              onChange={members.setPage}
              t={t}
            />
          </div>
        )}
      </Card>
      {canManage && (
        <>
          <Card className="workspace-panel">
            <div className="workspace-panel-heading">
              <h2>{t('Invite a teammate', 'دعوة عضو للفريق')}</h2>
              <p>
                {t(
                  'A real email invitation, valid for seven days. Reinviting replaces the previous link.',
                  'دعوة فعلية بالبريد صالحة لسبعة أيام. إعادة الدعوة تستبدل الرابط السابق.',
                )}
              </p>
            </div>
            <form
              className="workspace-form"
              onSubmit={(e) => {
                e.preventDefault();
                void action.run(
                  async () => {
                    await api(path + '/invitations', invitationSchema, 'POST', {
                      email,
                      role: inviteRole,
                    });
                    setEmail('');
                    refresh();
                  },
                  t(
                    'Invitation queued for email delivery.',
                    'أُضيفت الدعوة إلى قائمة الإرسال بالبريد.',
                  ),
                );
              }}
            >
              <div className="workspace-form-grid">
                <FormField label={t('Teammate email', 'بريد عضو الفريق')} required>
                  <Input
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    type="email"
                    dir="ltr"
                    maxLength={254}
                    required
                    disabled={action.pending}
                  />
                </FormField>
                <RoleSelect
                  value={inviteRole}
                  onChange={setInviteRole}
                  label={t('Invitation role', 'دور الدعوة')}
                  locale={locale}
                  disabled={action.pending}
                />
              </div>
              <Button type="submit" disabled={action.pending}>
                {t('Send invitation', 'إرسال الدعوة')}
              </Button>
            </form>
          </Card>
          <TeamInvitations key={inviteRevision} locale={locale} organization={organization} />
        </>
      )}
      <Modal
        open={Boolean(edit)}
        onOpenChange={(open) => {
          if (!open && !action.pending) setEdit(undefined);
        }}
        closeLabel={t('Close dialog', 'إغلاق النافذة')}
        title={t('Change member role', 'تغيير دور العضو')}
        description={
          (edit?.name ?? '') + ' · ' + t('Permissions change immediately.', 'تُطبّق الصلاحيات فورًا.')
        }
      >
        <div className="grid gap-5">
          {action.notice}
          <RoleSelect
            value={nextRole}
            onChange={setNextRole}
            label={t('New role', 'الدور الجديد')}
            locale={locale}
            disabled={action.pending}
          />
          <Button
            disabled={action.pending}
            onClick={() =>
              void action.run(
                async () => {
                  if (!edit) return;
                  const id = edit.userId;
                  await api(path + '/members/' + id, messageSchema, 'PATCH', { role: nextRole });
                  setEdit(undefined);
                  refresh();
                  changeSelf(id, nextRole);
                },
                t('Member role updated.', 'تم تحديث دور العضو.'),
              )
            }
          >
            {t('Save role', 'حفظ الدور')}
          </Button>
        </div>
      </Modal>
      <Modal
        open={Boolean(remove)}
        onOpenChange={(open) => {
          if (!open && !action.pending) setRemove(undefined);
        }}
        closeLabel={t('Close dialog', 'إغلاق النافذة')}
        title={t('Remove team member?', 'إزالة عضو الفريق؟')}
        description={
          (remove?.name ?? '') +
          ' · ' +
          t(
            'Their access to this organization will end immediately. Other memberships are preserved.',
            'سينتهي وصوله إلى هذه المؤسسة فورًا، مع الاحتفاظ بعضوياته الأخرى.',
          )
        }
      >
        <div className="grid gap-4">
          {action.notice}
          <Button
            variant="destructive"
            disabled={action.pending}
            onClick={() =>
              void action.run(
                async () => {
                  if (!remove) return;
                  const id = remove.userId;
                  await api(path + '/members/' + id, messageSchema, 'DELETE');
                  setRemove(undefined);
                  refresh();
                  changeSelf(id);
                },
                t('Team member removed.', 'تمت إزالة العضو.'),
              )
            }
          >
            {t('Confirm removal', 'تأكيد الإزالة')}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
function TeamInvitations({ locale, organization }: { locale: Locale; organization: Organization }) {
  const t: Copy = (en, ar) => text(locale, en, ar);
  const action = useAction(locale);
  const path = 'organizations/' + organization.id + '/invitations';
  const list = useList(path, invitationListSchema, locale);
  return (
    <Card className="workspace-panel">
      <div className="workspace-panel-heading">
        <h2>{t('Invitation history', 'سجل الدعوات')}</h2>
        <p>
          {t(
            'Pending links can be revoked. Expired invitations cannot be accepted.',
            'يمكن إلغاء الروابط المعلّقة، ولا يمكن قبول الدعوات المنتهية.',
          )}
        </p>
      </div>
      <div className="workspace-form">
        {action.notice}
        {list.state}
        {list.data?.items.length === 0 && (
          <p className="workspace-muted">{t('No invitations sent yet.', 'لم تُرسل دعوات بعد.')}</p>
        )}
        {list.data?.items.map((invite) => (
          <div className="workspace-invite-row" key={invite.id}>
            <div className="min-w-0">
              <p className="break-all" dir="ltr">
                {invite.email}
              </p>
              <p className="workspace-muted text-xs">
                {roleLabel(locale, invite.role)} ·{' '}
                {invite.expired && invite.status === 'PENDING'
                  ? t('Expired', 'منتهية')
                  : invitationStatus(t, invite.status)}
              </p>
            </div>
            {invite.status === 'PENDING' && (
              <Button
                variant="outline"
                disabled={action.pending}
                onClick={() =>
                  void action.run(
                    async () => {
                      await api(path + '/' + invite.id, messageSchema, 'DELETE');
                      list.refresh();
                    },
                    t('Invitation revoked.', 'تم إلغاء الدعوة.'),
                  )
                }
              >
                {t('Revoke', 'إلغاء الدعوة')}
              </Button>
            )}
          </div>
        ))}
        {list.data && (
          <PageNav page={list.page} total={list.data.total} onChange={list.setPage} t={t} />
        )}
      </div>
    </Card>
  );
}
function invitationStatus(t: Copy, status: OrganizationInvitation['status']) {
  return {
    PENDING: t('Pending', 'معلّقة'),
    ACCEPTED: t('Accepted', 'مقبولة'),
    REJECTED: t('Declined', 'مرفوضة'),
    REVOKED: t('Revoked', 'ملغاة'),
  }[status];
}
function Invitations({ locale }: { locale: Locale }) {
  const t: Copy = (en, ar) => text(locale, en, ar);
  const action = useAction(locale);
  const router = useRouter();
  const list = useList('organizations/invitations', invitationListSchema, locale);
  const [linked, setLinked] = useState<OrganizationInvitation>();
  const [token, setToken] = useState<string | null>(null);
  useEffect(() => {
    const capture = () => {
      const raw = new URLSearchParams(location.hash.slice(1)).get('token');
      if (raw) {
        history.replaceState(null, '', location.pathname);
        setToken(/^[a-f0-9]{64}$/.test(raw) ? raw : '');
      }
    };
    capture();
    addEventListener('hashchange', capture);
    return () => removeEventListener('hashchange', capture);
  }, []);
  const respond = (invite: OrganizationInvitation, accept: boolean) =>
    void action.run(
      async () => {
        await api(
          'organizations/invitations/' + invite.id + (accept ? '/accept' : '/reject'),
          messageSchema,
          'POST',
        );
        setLinked(undefined);
        setToken(null);
        list.refresh();
        router.refresh();
      },
      accept
        ? t(
            'Invitation accepted. Open your organizations to switch workspace.',
            'تم قبول الدعوة. افتح مؤسساتك لتبديل مساحة العمل.',
          )
        : t('Invitation declined.', 'تم رفض الدعوة.'),
    );
  const card = (invite: OrganizationInvitation) => (
    <Card className="workspace-invitation-card" key={invite.id}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Badge>{roleLabel(locale, invite.role)}</Badge>
        <span className="workspace-muted text-xs">
          {invite.expired
            ? t('Expired', 'منتهية')
            : t('Expires ', 'تنتهي في ') +
              new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(
                new Date(invite.expiresAt),
              )}
        </span>
      </div>
      <h2>{invite.organizationName}</h2>
      <p className="workspace-muted break-all" dir="ltr">
        {invite.email}
      </p>
      <div className="flex flex-wrap gap-3">
        <Button disabled={action.pending || invite.expired} onClick={() => respond(invite, true)}>
          {t('Accept invitation', 'قبول الدعوة')}
        </Button>
        <Button
          variant="outline"
          disabled={action.pending || invite.expired}
          onClick={() => respond(invite, false)}
        >
          {t('Decline', 'رفض الدعوة')}
        </Button>
      </div>
    </Card>
  );
  return (
    <div className="workspace-stack">
      {action.notice}
      {token !== null && (
        <Card className="workspace-panel p-6">
          <h2 className="font-semibold">{t('Invitation from your email', 'دعوة من بريدك')}</h2>
          <p className="workspace-muted my-3">
            {t(
              'Review this private link using the verified account it was sent to.',
              'راجع الرابط الخاص بالحساب المؤكّد الذي استلمه.',
            )}
          </p>
          <Button
            disabled={action.pending || !token || Boolean(linked)}
            onClick={() =>
              void action.run(async () => {
                setLinked(
                  await api('organizations/invitations/resolve', invitationSchema, 'POST', {
                    token,
                  }),
                );
              })
            }
          >
            {t('Review email invitation', 'مراجعة دعوة البريد')}
          </Button>
        </Card>
      )}
      {linked && card(linked)}
      {list.state}
      {list.data?.items.length === 0 && !linked && (
        <EmptyState
          title={t('No pending invitations', 'لا توجد دعوات معلّقة')}
          description={t(
            'Invitations sent to your verified email appear here. Ask an owner to reissue an expired link.',
            'تظهر هنا الدعوات المرسلة إلى بريدك المؤكّد. اطلب من المالك إعادة إصدار الدعوة المنتهية.',
          )}
          action={
            <Button asChild variant="outline">
              <Link href={'/' + locale + '/organizations'}>
                {t('Your organizations', 'مؤسساتك')}
              </Link>
            </Button>
          }
        />
      )}
      <div className="workspace-org-grid">
        {list.data?.items.filter((invite) => invite.id !== linked?.id).map(card)}
      </div>
      {list.data && (
        <PageNav page={list.page} total={list.data.total} onChange={list.setPage} t={t} />
      )}
      <p>
        <Link className="ui-focus underline" href={'/' + locale + '/organizations'}>
          {t('Open your organizations', 'فتح مؤسساتك')}
        </Link>
      </p>
    </div>
  );
}
function PlatformDirectory({ locale }: { locale: Locale }) {
  const t: Copy = (en, ar) => text(locale, en, ar);
  const list = useList('platform/organizations', platformOrganizationListSchema, locale);
  return (
    <div className="workspace-stack">
      <Card className="workspace-access-note">
        <Icon name="info" />
        <p>
          {t(
            'Platform Admin can inspect this directory. Organization settings and team data still require a membership; platform access is never assigned through a team invitation.',
            'يمكن لمسؤول المنصة مراجعة الدليل. تتطلب إعدادات المؤسسة وبيانات الفريق عضوية، ولا تمنح دعوات الفريق صلاحية المنصة.',
          )}
        </p>
      </Card>
      {list.state}
      {list.data?.items.length === 0 && (
        <EmptyState
          title={t('No organizations', 'لا توجد مؤسسات')}
          description={t(
            'The directory will populate when organizations are created.',
            'سيُملأ الدليل عند إنشاء المؤسسات.',
          )}
        />
      )}
      <div className="workspace-org-grid">
        {list.data?.items.map((org) => (
          <Card key={org.id} className="workspace-org-card">
            <h2 className="font-semibold">{org.name}</h2>
            <p className="workspace-muted">/{org.slug}</p>
            <p>
              {t('Members: ', 'الأعضاء: ')}
              {org.members}
            </p>
          </Card>
        ))}
      </div>
      {list.data && (
        <PageNav page={list.page} total={list.data.total} onChange={list.setPage} t={t} />
      )}
    </div>
  );
}
