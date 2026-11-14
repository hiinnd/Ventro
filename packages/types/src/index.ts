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
  OWNER: [
    'organization:read',
    'organization:write',
    'team:read',
    'team:write',
    'dashboard:read',
    'events:read',
    'events:write',
    'events:publish',
    'events:state',
    'checkin:read',
    'checkin:write',
  ],
  EVENT_MANAGER: [
    'organization:read',
    'team:read',
    'dashboard:read',
    'events:read',
    'events:write',
    'events:publish',
    'checkin:read',
    'checkin:write',
  ],
  CHECK_IN_STAFF: ['organization:read', 'checkin:read', 'checkin:write'],
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

export const eventStatusSchema = z.enum(['DRAFT', 'PUBLISHED', 'UNPUBLISHED', 'CANCELLED']);
export const eventVisibilitySchema = z.enum(['PUBLIC', 'PRIVATE']);
export const eventLocationTypeSchema = z.enum(['VENUE', 'ONLINE']);
export const eventSpeakerSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  title: z.string(),
  bio: z.string(),
  position: z.number().int(),
});
export const eventSessionSchema = z.object({
  id: z.uuid(),
  speakerId: z.uuid().nullable(),
  title: z.string(),
  description: z.string(),
  startsAt: z.iso.datetime(),
  endsAt: z.iso.datetime(),
  position: z.number().int(),
});
export const eventSchema = z.object({
  id: z.uuid(),
  organizationId: z.uuid(),
  title: z.string(),
  description: z.string(),
  slug: z.string(),
  status: eventStatusSchema,
  visibility: eventVisibilitySchema,
  locationType: eventLocationTypeSchema,
  venue: z.string(),
  onlineUrl: z.string(),
  timezone: z.string(),
  startsAt: z.iso.datetime().nullable(),
  endsAt: z.iso.datetime().nullable(),
  capacity: z.number().int().nullable(),
  registrationDeadline: z.iso.datetime().nullable(),
  category: z.string().nullable(),
  coverDigest: z.string().nullable(),
  publishedAt: z.iso.datetime().nullable(),
  cancelledAt: z.iso.datetime().nullable(),
  speakers: z.array(eventSpeakerSchema),
  sessions: z.array(eventSessionSchema),
  updatedAt: z.iso.datetime(),
});
export type Event = z.infer<typeof eventSchema>;
export const eventListSchema = paginatedSchema(eventSchema);

export const formFieldTypeSchema = z.enum([
  'TEXT',
  'TEXTAREA',
  'EMAIL',
  'PHONE',
  'NUMBER',
  'SELECT',
  'RADIO',
  'CHECKBOX',
  'DATE',
  'CONSENT',
]);
export const registrationFieldSchema = z.object({
  id: z.uuid(),
  key: z.string(),
  type: formFieldTypeSchema,
  label: z.string(),
  helpText: z.string(),
  required: z.boolean(),
  options: z.unknown().nullable(),
  visibilityRule: z.unknown().nullable(),
  position: z.number().int(),
});
export const registrationFormSchema = z.object({
  id: z.uuid().nullable(),
  eventId: z.uuid(),
  status: z.enum(['DRAFT', 'PUBLISHED']),
  fields: z.array(registrationFieldSchema),
});
export const registrationReceiptSchema = z.object({
  id: z.uuid(),
  eventSlug: z.string(),
  status: z.enum(['CONFIRMED', 'CANCELLED']),
  createdAt: z.iso.datetime(),
  ticketAvailable: z.boolean(),
  emailNotificationQueued: z.boolean(),
  registrationType: z.enum(['GUEST', 'ACCOUNT']),
});
export const registrationListSchema = paginatedSchema(
  z.object({
    id: z.uuid(),
    status: z.enum(['CONFIRMED', 'CANCELLED']),
    createdAt: z.iso.datetime(),
    name: z.string(),
    email: z.email(),
    answers: z.array(z.object({ key: z.string(), label: z.string(), value: z.unknown() })),
  }),
);
export const myRegistrationListSchema = paginatedSchema(
  z.object({
    id: z.uuid(),
    status: z.enum(['CONFIRMED', 'CANCELLED']),
    createdAt: z.iso.datetime(),
    event: z.object({
      title: z.string(),
      slug: z.string(),
      startsAt: z.iso.datetime().nullable(),
      timezone: z.string(),
    }),
  }),
);
export const ticketListSchema = z.object({
  items: z.array(
    z.object({
      id: z.uuid(),
      credential: z.uuid(),
      revokedAt: z.iso.datetime().nullable(),
      event: z.object({
        title: z.string(),
        slug: z.string(),
        startsAt: z.iso.datetime().nullable(),
        timezone: z.string(),
      }),
    }),
  ),
});
export const checkInDashboardSchema = z.object({
  registered: z.number().int().nonnegative(),
  checkedIn: z.number().int().nonnegative(),
  attendancePercent: z.number().nonnegative(),
  recent: z.array(z.object({ id: z.uuid(), attendee: z.string(), createdAt: z.iso.datetime() })),
});
export const checkInReceiptSchema = z.object({
  status: z.literal('CONFIRMED'),
  scope: z.enum(['EVENT', 'SESSION']),
  attendee: z.uuid(),
  checkedInAt: z.iso.datetime(),
  session: z.string().optional(),
});
