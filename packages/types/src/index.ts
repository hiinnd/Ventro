import { z } from 'zod';

export const healthResponseSchema = z.object({
  status: z.enum(['ok', 'degraded']),
  service: z.literal('ventro-api'),
  timestamp: z.iso.datetime(),
  checks: z.object({
    database: z.enum(['up', 'down']),
    redis: z.enum(['up', 'down']),
  }),
});
export type HealthResponse = z.infer<typeof healthResponseSchema>;

export interface ApiErrorResponse {
  statusCode: number;
  error: string;
  message: string | string[];
  timestamp: string;
  path: string;
  requestId: string;
}
export type Locale = 'en' | 'ar';

export const authUserSchema = z.object({
  id: z.uuid(),
  email: z.email(),
  name: z.string(),
  locale: z.enum(['en', 'ar']),
  emailVerifiedAt: z.iso.datetime().nullable(),
  createdAt: z.iso.datetime(),
  platformRole: z.enum(['USER', 'PLATFORM_ADMIN']).default('USER'),
});
export const authSessionSchema = z.object({
  user: authUserSchema,
  expiresAt: z.iso.datetime(),
  absoluteExpiresAt: z.iso.datetime(),
  activeOrganizationId: z.uuid().nullable().default(null),
});
export type AuthUser = z.infer<typeof authUserSchema>;
export type AuthSession = z.infer<typeof authSessionSchema>;

export const organizationRoleSchema = z.enum([
  'OWNER',
  'EVENT_MANAGER',
  'CHECK_IN_STAFF',
  'PARTICIPANT',
]);
export type OrganizationRole = z.infer<typeof organizationRoleSchema>;
export const organizationPermissions = {
  OWNER: ['organization:read', 'organization:write', 'team:read', 'team:write', 'dashboard:read'],
  EVENT_MANAGER: ['organization:read', 'team:read', 'dashboard:read'],
  CHECK_IN_STAFF: ['organization:read'],
  PARTICIPANT: ['organization:read'],
} as const;
export type OrganizationPermission = (typeof organizationPermissions)[OrganizationRole][number];
export function hasOrganizationPermission(
  role: OrganizationRole,
  permission: OrganizationPermission,
) {
  return (organizationPermissions[role] as readonly string[]).includes(permission);
}
export const organizationSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  slug: z.string(),
  description: z.string(),
  website: z.string(),
  contactEmail: z.string(),
  timezone: z.string(),
  locale: z.enum(['en', 'ar']),
  role: organizationRoleSchema,
  logoDigest: z.string().nullable(),
  createdAt: z.iso.datetime(),
});
export type Organization = z.infer<typeof organizationSchema>;
export const memberSchema = z.object({
  userId: z.uuid(),
  name: z.string(),
  email: z.email(),
  role: organizationRoleSchema,
  createdAt: z.iso.datetime(),
});
export type OrganizationMember = z.infer<typeof memberSchema>;
export const invitationSchema = z.object({
  id: z.uuid(),
  organizationId: z.uuid(),
  organizationName: z.string(),
  email: z.email(),
  role: organizationRoleSchema,
  status: z.enum(['PENDING', 'ACCEPTED', 'REJECTED', 'REVOKED']),
  expiresAt: z.iso.datetime(),
  createdAt: z.iso.datetime(),
  expired: z.boolean(),
});
export type OrganizationInvitation = z.infer<typeof invitationSchema>;
export const paginatedSchema = <T extends z.ZodType>(item: T) =>
  z.object({
    items: z.array(item),
    total: z.number().int().nonnegative(),
    page: z.number().int().positive(),
    pageSize: z.literal(25),
  });
export const organizationListSchema = paginatedSchema(organizationSchema);
export const memberListSchema = paginatedSchema(memberSchema);
export const invitationListSchema = paginatedSchema(invitationSchema);
export const platformOrganizationSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  slug: z.string(),
  createdAt: z.iso.datetime(),
  members: z.number().int(),
});
export const platformOrganizationListSchema = paginatedSchema(platformOrganizationSchema);

export const dashboardSectionSchema = z.enum([
  'overview',
  'events',
  'registrations',
  'attendees',
  'sessions',
  'polls',
  'certificates',
  'analytics',
  'team',
  'settings',
]);
export type DashboardSection = z.infer<typeof dashboardSectionSchema>;
export const dashboardActivityGroupSchema = z.enum(['ALL', 'TEAM', 'INVITATIONS', 'SETTINGS']);
export const dashboardActivitySchema = z.object({
  id: z.uuid(),
  action: z.string().max(64),
  actorName: z.string().nullable(),
  createdAt: z.iso.datetime(),
});
export const dashboardActivityListSchema = paginatedSchema(dashboardActivitySchema);
export type DashboardActivity = z.infer<typeof dashboardActivitySchema>;
export const dashboardOverviewSchema = z.object({
  organizationId: z.uuid(),
  generatedAt: z.iso.datetime(),
  range: z.enum(['7', '30']),
  metrics: z.object({
    members: z.number().int().nonnegative(),
    activeMembers: z.number().int().nonnegative(),
    activeOwners: z.number().int().nonnegative(),
    pendingInvitations: z.number().int().nonnegative(),
  }),
  roles: z.array(z.object({ role: organizationRoleSchema, count: z.number().int().nonnegative() })),
  activity: z
    .array(z.object({ date: z.iso.date(), count: z.number().int().nonnegative() }))
    .max(30),
});
export type DashboardOverview = z.infer<typeof dashboardOverviewSchema>;
export const dashboardNoticesSchema = z.object({
  organizationId: z.uuid(),
  generatedAt: z.iso.datetime(),
  items: z.array(
    z.object({
      code: z.enum(['PROFILE_DETAILS', 'INVITATIONS_PENDING', 'INVITATIONS_EXPIRED']),
      count: z.number().int().positive(),
      section: z.enum(['team', 'settings']),
    }),
  ),
});
export type DashboardNotices = z.infer<typeof dashboardNoticesSchema>;
