import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'node:crypto';
import sharp from 'sharp';
import { hasOrganizationPermission, type OrganizationPermission } from '@ventro/types';
import { PrismaService } from '../database/prisma.service';
import { Prisma, type OrganizationInvitation } from '../generated/prisma/client';
import { AuthService, type AuthContext } from '../auth/auth.service';
import { AuditService, type AuditContext } from '../auth/audit.service';
import { EmailService } from '../auth/email.service';
import { randomToken, tokenHash } from '../auth/crypto';
import type { Environment } from '../config/environment';
import { OrganizationAccessService } from './organization-access.service';
import type {
  AssignRoleDto,
  CreateOrganizationDto,
  InviteMemberDto,
  OrganizationProfileDto,
} from './organization.dto';

const PAGE_SIZE = 25 as const;
const orgSelect = {
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
} satisfies Prisma.OrganizationSelect;
const invitationSelect = {
  id: true,
  organizationId: true,
  email: true,
  role: true,
  status: true,
  expiresAt: true,
  createdAt: true,
  organization: { select: { name: true } },
} satisfies Prisma.OrganizationInvitationSelect;
type InviteView = Prisma.OrganizationInvitationGetPayload<{ select: typeof invitationSelect }>;
const invitationView = (row: InviteView) => ({
  id: row.id,
  organizationId: row.organizationId,
  organizationName: row.organization.name,
  email: row.email,
  role: row.role,
  status: row.status,
  expiresAt: row.expiresAt.toISOString(),
  createdAt: row.createdAt.toISOString(),
  expired: row.expiresAt <= new Date(),
});
const unavailableInvite = () =>
  new BadRequestException('Invitation unavailable. It may have expired or been replaced.');

@Injectable()
export class OrganizationService {
  constructor(
    private readonly db: PrismaService,
    private readonly access: OrganizationAccessService,
    private readonly auth: AuthService,
    private readonly audit: AuditService,
    private readonly emails: EmailService,
    private readonly config: ConfigService<Environment, true>,
  ) {}

  private async actor(tx: Prisma.TransactionClient, auth: AuthContext) {
    await tx.$queryRaw`SELECT "id" FROM "User" WHERE "id" = ${auth.user.id}::uuid FOR UPDATE`;
    const session = await tx.session.findFirst({
      where: {
        id: auth.session.id,
        userId: auth.user.id,
        tokenHash: auth.session.tokenHash,
        credentialVersion: auth.user.credentialVersion,
        expiresAt: { gt: new Date() },
        absoluteExpiresAt: { gt: new Date() },
        user: { status: 'ACTIVE', credentialVersion: auth.user.credentialVersion },
      },
      include: { user: true },
    });
    if (!session) throw new UnauthorizedException('Sign in to continue');
    if (!session.user.emailVerifiedAt)
      throw new ForbiddenException('Verify your email to continue');
    return session.user;
  }
  private async tenant<T>(
    auth: AuthContext,
    id: string,
    permission: OrganizationPermission,
    operation: (tx: Prisma.TransactionClient, role: AssignRoleDto['role']) => Promise<T>,
  ) {
    return this.db.$transaction(async (tx) => {
      await this.actor(tx, auth);
      // Serialize membership and settings changes, including last-owner checks and invite consumption.
      await tx.$queryRaw`SELECT "id" FROM "Organization" WHERE "id" = ${id}::uuid FOR UPDATE`;
      const member = await this.access.requireMembership(auth.user.id, id, undefined, tx);
      if (!hasOrganizationPermission(member.role, permission))
        throw new ForbiddenException('Access is not allowed');
      return operation(tx, member.role);
    });
  }
  private async detail(tx: Prisma.TransactionClient, id: string, role: AssignRoleDto['role']) {
    const row = await tx.organization.findUniqueOrThrow({ where: { id }, select: orgSelect });
    const { logo, ...fields } = row;
    return {
      ...fields,
      role,
      logoDigest: logo?.digest ?? null,
      createdAt: row.createdAt.toISOString(),
    };
  }
  private log(
    tx: Prisma.TransactionClient,
    auth: AuthContext,
    context: AuditContext,
    id: string,
    action: string,
    metadata?: Prisma.InputJsonObject,
  ) {
    return this.audit.write(action, auth.user.id, context, metadata, tx, id);
  }
  async list(auth: AuthContext, page: number) {
    return this.db.$transaction(async (tx) => {
      await this.actor(tx, auth);
      const where = { userId: auth.user.id, organization: { archivedAt: null } };
      const [rows, total] = await Promise.all([
        tx.organizationMember.findMany({
          where,
          orderBy: [{ createdAt: 'asc' }, { organizationId: 'asc' }],
          skip: (page - 1) * PAGE_SIZE,
          take: PAGE_SIZE,
          select: { role: true, organization: { select: orgSelect } },
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
  async create(auth: AuthContext, input: CreateOrganizationDto, context: AuditContext) {
    try {
      return await this.db.$transaction(async (tx) => {
        await this.actor(tx, auth);
        if (
          (await tx.organizationMember.count({ where: { userId: auth.user.id, role: 'OWNER' } })) >=
            20 ||
          (await tx.organizationMember.count({ where: { userId: auth.user.id } })) >= 100
        )
          throw new ConflictException('Organization limit reached');
        const org = await tx.organization.create({
          data: {
            name: input.name,
            slug: input.slug,
            description: input.description,
            website: input.website,
            contactEmail: input.contactEmail,
            timezone: input.timezone,
            locale: input.locale,
            members: { create: { userId: auth.user.id, role: 'OWNER' } },
          },
        });
        await tx.session.update({
          where: { id: auth.session.id },
          data: { activeOrganizationId: org.id },
        });
        await this.log(tx, auth, context, org.id, 'ORGANIZATION_CREATED');
        return this.detail(tx, org.id, 'OWNER');
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002')
        throw new ConflictException('Choose a different organization slug');
      throw error;
    }
  }
  get(auth: AuthContext, id: string) {
    return this.tenant(auth, id, 'organization:read', (tx, role) => this.detail(tx, id, role));
  }
  update(auth: AuthContext, id: string, input: OrganizationProfileDto, context: AuditContext) {
    return this.tenant(auth, id, 'organization:write', async (tx, role) => {
      await tx.organization.update({
        where: { id },
        data: {
          name: input.name,
          description: input.description,
          website: input.website,
          contactEmail: input.contactEmail,
          timezone: input.timezone,
          locale: input.locale,
        },
      });
      await this.log(tx, auth, context, id, 'ORGANIZATION_PROFILE_UPDATED', {
        fields: ['name', 'description', 'website', 'contactEmail', 'timezone', 'locale'],
      });
      return this.detail(tx, id, role);
    });
  }
  activate(auth: AuthContext, id: string, context: AuditContext) {
    return this.tenant(auth, id, 'organization:read', async (tx) => {
      const session = await tx.session.update({
        where: { id: auth.session.id },
        data: { activeOrganizationId: id },
      });
      await this.log(tx, auth, context, id, 'ORGANIZATION_SWITCHED');
      return this.auth.sessionResponse({ user: auth.user, session });
    });
  }
  members(auth: AuthContext, id: string, page: number) {
    return this.tenant(auth, id, 'team:read', async (tx) => {
      const [rows, total] = await Promise.all([
        tx.organizationMember.findMany({
          where: { organizationId: id },
          skip: (page - 1) * PAGE_SIZE,
          take: PAGE_SIZE,
          orderBy: [{ createdAt: 'asc' }, { userId: 'asc' }],
          include: { user: { select: { name: true, email: true } } },
        }),
        tx.organizationMember.count({ where: { organizationId: id } }),
      ]);
      return {
        items: rows.map((row) => ({
          userId: row.userId,
          ...row.user,
          role: row.role,
          createdAt: row.createdAt.toISOString(),
        })),
        total,
        page,
        pageSize: PAGE_SIZE,
      };
    });
  }
  private async protectOwner(
    tx: Prisma.TransactionClient,
    id: string,
    userId: string,
    next?: AssignRoleDto['role'],
  ) {
    const member = await tx.organizationMember.findUnique({
      where: { organizationId_userId: { organizationId: id, userId } },
      include: { user: { select: { status: true } } },
    });
    if (!member) throw new BadRequestException('Member unavailable');
    if (
      member.role === 'OWNER' &&
      member.user.status === 'ACTIVE' &&
      next !== 'OWNER' &&
      (await tx.organizationMember.count({
        where: { organizationId: id, role: 'OWNER', user: { status: 'ACTIVE' } },
      })) <= 1
    )
      throw new ConflictException('Keep at least one active organization owner');
    return member;
  }
  async changeMember(
    auth: AuthContext,
    id: string,
    userId: string,
    role: AssignRoleDto['role'] | undefined,
    context: AuditContext,
  ) {
    return this.tenant(auth, id, 'team:write', async (tx) => {
      const previous = await this.protectOwner(tx, id, userId, role);
      const key = { organizationId_userId: { organizationId: id, userId } };
      if (role) {
        const target = await tx.user.findUniqueOrThrow({
          where: { id: userId },
          select: { status: true },
        });
        if (role === 'OWNER' && target.status !== 'ACTIVE')
          throw new ConflictException('An owner must have an active account');
        await tx.organizationMember.update({ where: key, data: { role } });
      } else {
        await tx.organizationMember.delete({ where: key });
        await tx.session.updateMany({
          where: { userId, activeOrganizationId: id },
          data: { activeOrganizationId: null },
        });
      }
      if (!role || (previous.role === 'OWNER' && role !== 'OWNER')) {
        await tx.organizationInvitation.updateMany({
          where: { organizationId: id, invitedById: userId, status: 'PENDING' },
          data: { status: 'REVOKED', respondedAt: new Date() },
        });
      }
      await this.log(
        tx,
        auth,
        context,
        id,
        role ? 'ORGANIZATION_ROLE_CHANGED' : 'ORGANIZATION_MEMBER_REMOVED',
        { userId, previousRole: previous.role, ...(role ? { role } : {}) },
      );
      return { message: role ? 'Role updated' : 'Member removed' };
    });
  }
  invitations(auth: AuthContext, id: string, page: number) {
    return this.tenant(auth, id, 'team:write', async (tx) => {
      const where = { organizationId: id };
      const [rows, total] = await Promise.all([
        tx.organizationInvitation.findMany({
          where,
          select: invitationSelect,
          orderBy: [{ updatedAt: 'desc' }, { id: 'asc' }],
          take: PAGE_SIZE,
          skip: (page - 1) * PAGE_SIZE,
        }),
        tx.organizationInvitation.count({ where }),
      ]);
      return { items: rows.map(invitationView), total, page, pageSize: PAGE_SIZE };
    });
  }
  invite(auth: AuthContext, id: string, input: InviteMemberDto, context: AuditContext) {
    return this.tenant(auth, id, 'team:write', async (tx) => {
      if (
        await tx.organizationMember.count({
          where: { organizationId: id, user: { email: input.email } },
        })
      )
        throw new ConflictException('This address is already a member');
      if (
        (await tx.organizationInvitation.count({
          where: { organizationId: id, status: 'PENDING', expiresAt: { gt: new Date() } },
        })) >= 100
      )
        throw new ConflictException('Pending invitation limit reached');
      const token = randomToken();
      const fields = {
        role: input.role,
        tokenHash: tokenHash(token),
        status: 'PENDING' as const,
        invitedById: auth.user.id,
        expiresAt: new Date(Date.now() + 7 * 86400000),
        respondedAt: null,
      };
      const invitation = await tx.organizationInvitation.upsert({
        where: { organizationId_email: { organizationId: id, email: input.email } },
        create: { organizationId: id, email: input.email, ...fields },
        update: fields,
      });
      const org = await tx.organization.findUniqueOrThrow({ where: { id } });
      await tx.emailOutbox.updateMany({
        where: { invitationId: invitation.id, status: 'PENDING' },
        data: { status: 'CANCELLED', encryptedPayload: '' },
      });
      await this.emails.enqueueInvitation(
        tx,
        invitation,
        org,
        this.config.get('AUTH_APP_URL', { infer: true }) +
          '/' +
          org.locale +
          '/invitations#token=' +
          token,
      );
      await this.log(tx, auth, context, id, 'ORGANIZATION_INVITATION_SENT', {
        invitationId: invitation.id,
        role: input.role,
      });
      return invitationView(
        await tx.organizationInvitation.findUniqueOrThrow({
          where: { id: invitation.id },
          select: invitationSelect,
        }),
      );
    });
  }
  revoke(auth: AuthContext, id: string, invitationId: string, context: AuditContext) {
    return this.tenant(auth, id, 'team:write', async (tx) => {
      const updated = await tx.organizationInvitation.updateMany({
        where: { id: invitationId, organizationId: id, status: 'PENDING' },
        data: { status: 'REVOKED', respondedAt: new Date() },
      });
      if (!updated.count) throw unavailableInvite();
      await this.log(tx, auth, context, id, 'ORGANIZATION_INVITATION_REVOKED', { invitationId });
      return { message: 'Invitation revoked' };
    });
  }
  inbox(auth: AuthContext, page: number) {
    return this.db.$transaction(async (tx) => {
      const user = await this.actor(tx, auth);
      const where = {
        email: user.email,
        status: 'PENDING' as const,
        organization: { archivedAt: null },
      };
      const [rows, total] = await Promise.all([
        tx.organizationInvitation.findMany({
          where,
          select: invitationSelect,
          skip: (page - 1) * PAGE_SIZE,
          take: PAGE_SIZE,
          orderBy: [{ updatedAt: 'desc' }, { id: 'asc' }],
        }),
        tx.organizationInvitation.count({ where }),
      ]);
      return { items: rows.map(invitationView), total, page, pageSize: PAGE_SIZE };
    });
  }
  private async validInvitation(
    tx: Prisma.TransactionClient,
    userEmail: string,
    invitation: OrganizationInvitation | null,
  ) {
    if (
      !invitation ||
      invitation.email !== userEmail ||
      invitation.status !== 'PENDING' ||
      invitation.expiresAt <= new Date() ||
      !invitation.invitedById
    )
      throw unavailableInvite();
    const issuer = await tx.organizationMember.findFirst({
      where: {
        organizationId: invitation.organizationId,
        userId: invitation.invitedById,
        role: 'OWNER',
        user: { status: 'ACTIVE' },
        organization: { archivedAt: null },
      },
    });
    if (!issuer) throw unavailableInvite();
    return invitation;
  }
  resolveInvitation(auth: AuthContext, token: string) {
    return this.db.$transaction(async (tx) => {
      const user = await this.actor(tx, auth);
      const row = await tx.organizationInvitation.findUnique({
        where: { tokenHash: tokenHash(token) },
      });
      const invitation = await this.validInvitation(tx, user.email, row);
      return invitationView(
        await tx.organizationInvitation.findUniqueOrThrow({
          where: { id: invitation.id },
          select: invitationSelect,
        }),
      );
    });
  }
  async respond(auth: AuthContext, invitationId: string, accept: boolean, context: AuditContext) {
    return this.db.$transaction(async (tx) => {
      const user = await this.actor(tx, auth);
      const initial = await tx.organizationInvitation.findUnique({ where: { id: invitationId } });
      if (!initial || initial.email !== user.email) throw unavailableInvite();
      await tx.$queryRaw`SELECT "id" FROM "Organization" WHERE "id" = ${initial.organizationId}::uuid FOR UPDATE`;
      const invitation = await this.validInvitation(
        tx,
        user.email,
        await tx.organizationInvitation.findUnique({ where: { id: invitationId } }),
      );
      if (accept) {
        if (
          (await tx.organizationMember.count({
            where: { organizationId: invitation.organizationId },
          })) >= 250 ||
          (await tx.organizationMember.count({ where: { userId: user.id } })) >= 100
        )
          throw new ConflictException('Membership limit reached');
        // Existing memberships are never promoted by an old or repeated invitation.
        await tx.organizationMember.upsert({
          where: {
            organizationId_userId: { organizationId: invitation.organizationId, userId: user.id },
          },
          create: {
            organizationId: invitation.organizationId,
            userId: user.id,
            role: invitation.role,
          },
          update: {},
        });
        await tx.session.update({
          where: { id: auth.session.id },
          data: { activeOrganizationId: invitation.organizationId },
        });
      }
      await tx.organizationInvitation.update({
        where: { id: invitation.id },
        data: { status: accept ? 'ACCEPTED' : 'REJECTED', respondedAt: new Date() },
      });
      await this.log(
        tx,
        auth,
        context,
        invitation.organizationId,
        accept ? 'ORGANIZATION_INVITATION_ACCEPTED' : 'ORGANIZATION_INVITATION_REJECTED',
        { invitationId, role: invitation.role },
      );
      return { message: accept ? 'Invitation accepted' : 'Invitation declined' };
    });
  }
  saveLogo(
    auth: AuthContext,
    id: string,
    file: Express.Multer.File | undefined,
    context: AuditContext,
  ) {
    return this.tenant(auth, id, 'organization:write', async (tx) => {
      if (!file?.buffer.length || file.size > 2 * 1024 * 1024)
        throw new BadRequestException('Choose a PNG, JPEG or WebP image up to 2 MiB');
      let data: Buffer;
      try {
        const input = file.buffer;
        const png = input.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
        const jpeg = input[0] === 255 && input[1] === 216 && input[2] === 255;
        const webp =
          input.subarray(0, 4).toString('ascii') === 'RIFF' &&
          input.subarray(8, 12).toString('ascii') === 'WEBP';
        if (!png && !jpeg && !webp) throw new Error('Unsupported image signature');
        const image = sharp(file.buffer, { limitInputPixels: 16000000, animated: false });
        const meta = await image.metadata();
        if (!['png', 'jpeg', 'webp'].includes(meta.format ?? '') || (meta.pages ?? 1) > 1)
          throw new Error('Unsupported image');
        data = await image
          .rotate()
          .resize({ width: 384, height: 384, fit: 'inside', withoutEnlargement: true })
          .png()
          .toBuffer();
        if (data.length > 524288) throw new Error('Image too large');
      } catch {
        throw new BadRequestException('Choose a valid, static PNG, JPEG or WebP image');
      }
      const digest = createHash('sha256').update(data).digest('hex');
      const bytes = new Uint8Array(data);
      await tx.organizationLogo.upsert({
        where: { organizationId: id },
        create: { organizationId: id, data: bytes, digest },
        update: { data: bytes, digest },
      });
      await this.log(tx, auth, context, id, 'ORGANIZATION_LOGO_UPDATED');
      return { message: 'Logo updated' };
    });
  }
  logo(auth: AuthContext, id: string) {
    return this.tenant(auth, id, 'organization:read', async (tx) => {
      const logo = await tx.organizationLogo.findUnique({ where: { organizationId: id } });
      if (!logo) throw new BadRequestException('Logo unavailable');
      return Buffer.from(logo.data);
    });
  }
  removeLogo(auth: AuthContext, id: string, context: AuditContext) {
    return this.tenant(auth, id, 'organization:write', async (tx) => {
      await tx.organizationLogo.deleteMany({ where: { organizationId: id } });
      await this.log(tx, auth, context, id, 'ORGANIZATION_LOGO_REMOVED');
      return { message: 'Logo removed' };
    });
  }
  platformList(auth: AuthContext, page: number) {
    return this.db.$transaction(async (tx) => {
      const user = await this.actor(tx, auth);
      if (user.platformRole !== 'PLATFORM_ADMIN')
        throw new ForbiddenException('Access is not allowed');
      const [rows, total] = await Promise.all([
        tx.organization.findMany({
          where: { archivedAt: null },
          select: {
            id: true,
            name: true,
            slug: true,
            createdAt: true,
            _count: { select: { members: true } },
          },
          orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
          skip: (page - 1) * PAGE_SIZE,
          take: PAGE_SIZE,
        }),
        tx.organization.count({ where: { archivedAt: null } }),
      ]);
      return {
        items: rows.map(({ _count, ...org }) => ({
          ...org,
          members: _count.members,
          createdAt: org.createdAt.toISOString(),
        })),
        total,
        page,
        pageSize: PAGE_SIZE,
      };
    });
  }
}
