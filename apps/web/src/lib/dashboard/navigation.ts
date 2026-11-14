import type { DashboardSection, Locale } from '@ventro/types';
export const dashboardSections: { id: DashboardSection; en: string; ar: string; ready: boolean }[] =
  [
    { id: 'overview', en: 'Overview', ar: 'نظرة عامة', ready: true },
    { id: 'events', en: 'Events', ar: 'الفعاليات', ready: true },
    { id: 'registrations', en: 'Registrations', ar: 'التسجيلات', ready: true },
    { id: 'attendees', en: 'Attendees', ar: 'الحضور', ready: true },
    { id: 'sessions', en: 'Sessions', ar: 'الجلسات', ready: false },
    { id: 'polls', en: 'Polls & Q&A', ar: 'الاستطلاعات والأسئلة', ready: true },
    { id: 'certificates', en: 'Certificates', ar: 'الشهادات', ready: true },
    { id: 'analytics', en: 'Analytics', ar: 'التحليلات', ready: false },
    { id: 'team', en: 'Team', ar: 'الفريق', ready: true },
    { id: 'settings', en: 'Settings', ar: 'الإعدادات', ready: true },
  ];
export function sectionLabel(locale: Locale, section: DashboardSection) {
  const item = dashboardSections.find((item) => item.id === section)!;
  return locale === 'ar' ? item.ar : item.en;
}
export function dashboardRoute(locale: Locale, id: string, section: DashboardSection = 'overview') {
  return (
    '/' +
    locale +
    '/organizations/' +
    id +
    '/dashboard' +
    (section === 'overview' ? '' : '/' + section)
  );
}
const activityLabels: Record<string, [string, string]> = {
  ORGANIZATION_CREATED: ['Organization created', 'أُنشئت المؤسسة'],
  ORGANIZATION_PROFILE_UPDATED: ['Organization profile updated', 'حُدّث ملف المؤسسة'],
  ORGANIZATION_LOGO_UPDATED: ['Organization logo updated', 'حُدّث شعار المؤسسة'],
  ORGANIZATION_LOGO_REMOVED: ['Organization logo removed', 'حُذف شعار المؤسسة'],
  ORGANIZATION_ROLE_CHANGED: ['Member role changed', 'تغيّر دور عضو'],
  ORGANIZATION_MEMBER_REMOVED: ['Team member removed', 'أُزيل عضو من الفريق'],
  ORGANIZATION_INVITATION_SENT: ['Team invitation queued', 'جُهّزت دعوة فريق للإرسال'],
  ORGANIZATION_INVITATION_ACCEPTED: ['Team invitation accepted', 'قُبلت دعوة الفريق'],
  ORGANIZATION_INVITATION_REJECTED: ['Team invitation declined', 'رُفضت دعوة الفريق'],
  ORGANIZATION_INVITATION_REVOKED: ['Team invitation revoked', 'أُلغيت دعوة الفريق'],
};
export const activityLabel = (locale: Locale, action: string) =>
  activityLabels[action]?.[locale === 'ar' ? 1 : 0] ??
  (locale === 'ar' ? 'تغيير في المؤسسة' : 'Organization change');
