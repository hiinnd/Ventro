import { Injectable } from '@nestjs/common';
import { organizationRoleSchema, type DashboardNotices } from '@ventro/types';
import { Prisma } from '../generated/prisma/client';
import type { AuthContext } from '../auth/auth.service';
import { OrganizationService } from './organization.service';
import type {
  DashboardActivityQuery,
  DashboardOverviewQuery,
  DashboardSearchDto,
} from './dashboard.dto';

export const dashboardActivityGroups = {
  TEAM: ['ORGANIZATION_ROLE_CHANGED', 'ORGANIZATION_MEMBER_REMOVED'],
  INVITATIONS: [
    'ORGANIZATION_INVITATION_SENT',
    'ORGANIZATION_INVITATION_ACCEPTED',
    'ORGANIZATION_INVITATION_REJECTED',
    'ORGANIZATION_INVITATION_REVOKED',
  ],
  SETTINGS: [
    'ORGANIZATION_CREATED',
    'ORGANIZATION_PROFILE_UPDATED',
    'ORGANIZATION_LOGO_UPDATED',
    'ORGANIZATION_LOGO_REMOVED',
  ],
} as const;
const changeActions = Object.values(dashboardActivityGroups).flat();
const PAGE_SIZE = 25 as const;
@Injectable()
export class DashboardService {
  constructor(private readonly organizations: OrganizationService) {}
  options(auth: AuthContext, page: number) {
    return this.organizations.withVerifiedActor(auth, async (tx) => {
      const where: Prisma.OrganizationMemberWhereInput = {
        userId: auth.user.id,
        role: { in: ['OWNER', 'EVENT_MANAGER'] },
        organization: { archivedAt: null },
      };
      const [rows, total] = await Promise.all([
        tx.organizationMember.findMany({
          where,
          orderBy: [{ createdAt: 'asc' }, { organizationId: 'asc' }],
          skip: (page - 1) * PAGE_SIZE,
          take: PAGE_SIZE,
          select: {
            role: true,
            organization: {
              select: {
                id: true,
                name: true,
                slug: true,
                description: true,
                website: true,
                contactEmail: true,
                timezone: true,
                locale: true,
                createdAt: true,
                logo: { select: { digest: true } },
              },
            },
          },
        }),
        tx.organizationMember.count({ where }),
      ]);
      return {
        items: rows.map(({ role, organization: { logo, ...org } }) => ({
          ...org,
          role,
          logoDigest: logo?.digest ?? null,
          createdAt: org.createdAt.toISOString(),
        })),
        total,
        page,
        pageSize: PAGE_SIZE,
      };
    });
  }
  overview(auth: AuthContext, id: string, query: DashboardOverviewQuery) {
    return this.organizations.withTenant(auth, id, 'dashboard:read', async (tx) => {
      const now = new Date();
      const start = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) -
          (Number(query.range) - 1) * 86400000,
      );
      const where = { organizationId: id };
      const [members, activeMembers, activeOwners, pendingInvitations, groups, days] =
        await Promise.all([
          tx.organizationMember.count({ where }),
          tx.organizationMember.count({ where: { ...where, user: { status: 'ACTIVE' } } }),
          tx.organizationMember.count({
            where: { ...where, role: 'OWNER', user: { status: 'ACTIVE' } },
          }),
          tx.organizationInvitation.count({
            where: { ...where, status: 'PENDING', expiresAt: { gt: now } },
          }),
          tx.organizationMember.groupBy({ by: ['role'], where, _count: { _all: true } }),
          tx.$queryRaw<Array<{ date: string; count: number }>>(
            Prisma.sql`SELECT to_char("createdAt" AT TIME ZONE 'UTC', 'YYYY-MM-DD') AS date, count(*)::int AS count FROM "AuditLog" WHERE "organizationId" = ${id}::uuid AND "action" IN (${Prisma.join(changeActions)}) AND "createdAt" >= ${start} AND "createdAt" <= ${now} GROUP BY 1 ORDER BY 1`,
          ),
        ]);
      return {
        organizationId: id,
        generatedAt: now.toISOString(),
        range: query.range,
        metrics: { members, activeMembers, activeOwners, pendingInvitations },
        roles: organizationRoleSchema.options.map((role) => ({
          role,
          count: groups.find((group) => group.role === role)?._count._all ?? 0,
        })),
        activity: Array.from({ length: Number(query.range) }, (_, index) => {
          const date = new Date(start.getTime() + index * 86400000).toISOString().slice(0, 10);
          return { date, count: days.find((day) => day.date === date)?.count ?? 0 };
        }),
      };
    });
  }
  activity(auth: AuthContext, id: string, query: DashboardActivityQuery) {
    return this.organizations.withTenant(auth, id, 'dashboard:read', async (tx) => {
      const actions =
        query.action === 'ALL' ? changeActions : [...dashboardActivityGroups[query.action]];
      const where: Prisma.AuditLogWhereInput = { organizationId: id, action: { in: actions } };
      const [rows, total] = await Promise.all([
        tx.auditLog.findMany({
          where,
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
          take: PAGE_SIZE,
          skip: (query.page - 1) * PAGE_SIZE,
          select: { id: true, action: true, createdAt: true, actor: { select: { name: true } } },
        }),
        tx.auditLog.count({ where }),
      ]);
      return {
        items: rows.map(({ actor, createdAt, ...row }) => ({
          ...row,
          actorName: actor?.name ?? null,
          createdAt: createdAt.toISOString(),
        })),
        total,
        page: query.page,
        pageSize: PAGE_SIZE,
      };
    });
  }
  search(auth: AuthContext, id: string, query: DashboardSearchDto) {
    return this.organizations.withTenant(auth, id, 'dashboard:read', async (tx) => {
      const where: Prisma.OrganizationMemberWhereInput = {
        organizationId: id,
        ...(query.role === 'ALL' ? {} : { role: query.role }),
        user: {
          OR: [
            { name: { contains: query.q, mode: 'insensitive' } },
            { email: { contains: query.q, mode: 'insensitive' } },
          ],
        },
      };
      const [rows, total] = await Promise.all([
        tx.organizationMember.findMany({
          where,
          take: PAGE_SIZE,
          skip: (query.page - 1) * PAGE_SIZE,
          orderBy: [{ createdAt: 'asc' }, { userId: 'asc' }],
          select: {
            userId: true,
            role: true,
            createdAt: true,
            user: { select: { name: true, email: true } },
          },
        }),
        tx.organizationMember.count({ where }),
      ]);
      return {
        items: rows.map(({ user, createdAt, ...member }) => ({
          ...member,
          ...user,
          createdAt: createdAt.toISOString(),
        })),
        total,
        page: query.page,
        pageSize: PAGE_SIZE,
      };
    });
  }
  notices(auth: AuthContext, id: string) {
    return this.organizations.withTenant(auth, id, 'dashboard:read', async (tx, role) => {
      const items: DashboardNotices['items'] = [];
      if (role === 'OWNER') {
        const now = new Date();
        const [org, pending, expired] = await Promise.all([
          tx.organization.findUniqueOrThrow({
            where: { id },
            select: {
              description: true,
              contactEmail: true,
              website: true,
              logo: { select: { digest: true } },
            },
          }),
          tx.organizationInvitation.count({
            where: { organizationId: id, status: 'PENDING', expiresAt: { gt: now } },
          }),
          tx.organizationInvitation.count({
            where: { organizationId: id, status: 'PENDING', expiresAt: { lte: now } },
          }),
        ]);
        const missing = [!org.description, !org.contactEmail, !org.website, !org.logo].filter(
          Boolean,
        ).length;
        if (missing) items.push({ code: 'PROFILE_DETAILS', count: missing, section: 'settings' });
        if (pending) items.push({ code: 'INVITATIONS_PENDING', count: pending, section: 'team' });
        if (expired) items.push({ code: 'INVITATIONS_EXPIRED', count: expired, section: 'team' });
      }
      return { organizationId: id, generatedAt: new Date().toISOString(), items };
    });
  }
}
