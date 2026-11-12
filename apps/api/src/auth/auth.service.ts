import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../database/prisma.service';
import { Prisma, type Session, type User } from '../generated/prisma/client';
import type { Environment } from '../config/environment';
import { AuditService, type AuditContext } from './audit.service';
import { EmailService } from './email.service';
import { PasswordService } from './password.service';
import { isToken, normalizeEmail, privateIdentifier, randomToken, tokenHash } from './crypto';
import type { RegisterDto, UpdateProfileDto } from './auth.dto';

export const SESSION_IDLE_MS = 7 * 86400000;
export const SESSION_ABSOLUTE_MS = 30 * 86400000;
export interface AuthContext {
  user: User;
  session: Session;
}
const invalidCredentials = () => new UnauthorizedException('Invalid email or password');
const invalidLink = () =>
  new BadRequestException('This link is invalid or expired. Request a new email.');

@Injectable()
export class AuthService {
  constructor(
    private readonly db: PrismaService,
    private readonly passwords: PasswordService,
    private readonly emails: EmailService,
    private readonly audit: AuditService,
    private readonly config: ConfigService<Environment, true>,
  ) {}
  private async lockUser(tx: Prisma.TransactionClient, id: string) {
    await tx.$queryRaw`SELECT "id" FROM "User" WHERE "id" = ${id}::uuid FOR UPDATE`;
  }
  private link(locale: string, page: string, token: string) {
    return (
      this.config.get('AUTH_APP_URL', { infer: true }) +
      '/' +
      (locale === 'ar' ? 'ar' : 'en') +
      '/' +
      page +
      '#token=' +
      token
    );
  }
  private async verification(tx: Prisma.TransactionClient, user: User) {
    const token = randomToken();
    const hash = tokenHash(token);
    const expiresAt = new Date(Date.now() + 86400000);
    await tx.emailVerificationToken.updateMany({
      where: { userId: user.id, usedAt: null },
      data: { usedAt: new Date() },
    });
    await tx.emailVerificationToken.create({
      data: { userId: user.id, tokenHash: hash, expiresAt },
    });
    await this.emails.enqueue(
      tx,
      user,
      'VERIFY_EMAIL',
      expiresAt,
      this.link(user.locale, 'verify-email', token),
      hash,
    );
  }
  async register(input: RegisterDto, context: AuditContext) {
    const passwordHash = await this.passwords.hash(input.password);
    try {
      await this.db.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            email: normalizeEmail(input.email),
            name: input.name,
            passwordHash,
            locale: input.locale ?? 'en',
          },
        });
        await this.verification(tx, user);
        await this.audit.write('AUTH_REGISTERED', user.id, context, undefined, tx);
      });
    } catch (error) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002'))
        throw error;
    }
    return {
      message:
        'If this address can be registered, check your email to verify it. You can sign in if you already have an account.',
    };
  }
  async login(email: string, password: string, context: AuditContext) {
    const initial = await this.db.user.findUnique({ where: { email: normalizeEmail(email) } });
    const valid = await this.passwords.verify(initial?.passwordHash, password);
    if (!initial || !valid || initial.status !== 'ACTIVE') {
      await this.audit.write('AUTH_LOGIN_FAILED', null, context, {
        accountKey: privateIdentifier(
          this.config.get('AUTH_SECRET', { infer: true }),
          normalizeEmail(email),
        ),
      });
      throw invalidCredentials();
    }
    const token = randomToken();
    const result = await this.db.$transaction(async (tx) => {
      await this.lockUser(tx, initial.id);
      const user = await tx.user.findUnique({ where: { id: initial.id } });
      // A password reset/disable may have committed while Argon2 ran.
      if (
        !user ||
        user.status !== 'ACTIVE' ||
        user.credentialVersion !== initial.credentialVersion ||
        user.passwordHash !== initial.passwordHash
      )
        throw invalidCredentials();
      const old = await tx.session.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
        skip: 9,
        select: { id: true },
      });
      if (old.length)
        await tx.session.deleteMany({ where: { id: { in: old.map((item) => item.id) } } });
      const session = await tx.session.create({
        data: {
          userId: user.id,
          tokenHash: tokenHash(token),
          credentialVersion: user.credentialVersion,
          expiresAt: new Date(Date.now() + SESSION_IDLE_MS),
          absoluteExpiresAt: new Date(Date.now() + SESSION_ABSOLUTE_MS),
        },
      });
      await this.audit.write('AUTH_LOGIN_SUCCEEDED', user.id, context, undefined, tx);
      return { user, session };
    });
    return { ...result, token };
  }
  async authenticate(token: string | undefined): Promise<AuthContext> {
    if (!isToken(token)) throw new UnauthorizedException('Sign in to continue');
    const session = await this.db.session.findUnique({
      where: { tokenHash: tokenHash(token) },
      include: { user: true },
    });
    const now = new Date();
    if (
      !session ||
      session.expiresAt <= now ||
      session.absoluteExpiresAt <= now ||
      session.user.status !== 'ACTIVE' ||
      session.credentialVersion !== session.user.credentialVersion
    )
      throw new UnauthorizedException('Sign in to continue');
    return { session, user: session.user };
  }
  async renew(auth: AuthContext, context: AuditContext) {
    const token = randomToken();
    const result = await this.db.$transaction(async (tx) => {
      await this.lockUser(tx, auth.user.id);
      const user = await tx.user.findUnique({ where: { id: auth.user.id } });
      const now = new Date();
      if (
        !user ||
        user.status !== 'ACTIVE' ||
        user.credentialVersion !== auth.session.credentialVersion
      )
        throw new UnauthorizedException('Sign in to continue');
      const expiresAt = new Date(
        Math.min(Date.now() + SESSION_IDLE_MS, auth.session.absoluteExpiresAt.getTime()),
      );
      const updated = await tx.session.updateMany({
        where: {
          id: auth.session.id,
          tokenHash: auth.session.tokenHash,
          expiresAt: { gt: now },
          absoluteExpiresAt: { gt: now },
        },
        data: { tokenHash: tokenHash(token), expiresAt, renewedAt: now },
      });
      if (updated.count !== 1) throw new UnauthorizedException('Sign in to continue');
      const session = await tx.session.findUniqueOrThrow({ where: { id: auth.session.id } });
      await this.audit.write('AUTH_SESSION_RENEWED', user.id, context, undefined, tx);
      return { user, session };
    });
    return { ...result, token };
  }
  async logout(token: string | undefined, context: AuditContext) {
    if (!isToken(token)) return;
    const session = await this.db.session.findUnique({ where: { tokenHash: tokenHash(token) } });
    if (!session) return;
    await this.db.$transaction(async (tx) => {
      await this.lockUser(tx, session.userId);
      const deleted = await tx.session.deleteMany({
        where: { id: session.id, tokenHash: session.tokenHash },
      });
      if (deleted.count)
        await this.audit.write('AUTH_LOGGED_OUT', session.userId, context, undefined, tx);
    });
  }
  async resendVerification(auth: AuthContext, context: AuditContext) {
    await this.db.$transaction(async (tx) => {
      await this.lockUser(tx, auth.user.id);
      const user = await tx.user.findUniqueOrThrow({ where: { id: auth.user.id } });
      if (
        user.emailVerifiedAt ||
        user.status !== 'ACTIVE' ||
        user.credentialVersion !== auth.session.credentialVersion
      )
        return;
      await this.verification(tx, user);
      await this.audit.write('AUTH_VERIFICATION_REQUESTED', user.id, context, undefined, tx);
    });
    return {
      message:
        'If verification is needed, an email will arrive. Previous verification links are replaced.',
    };
  }
  async verifyEmail(token: string, context: AuditContext) {
    const record = await this.db.emailVerificationToken.findUnique({
      where: { tokenHash: tokenHash(token) },
    });
    if (!record) throw invalidLink();
    await this.db.$transaction(async (tx) => {
      await this.lockUser(tx, record.userId);
      const user = await tx.user.findUnique({ where: { id: record.userId } });
      if (!user || user.status !== 'ACTIVE') throw invalidLink();
      const consumed = await tx.emailVerificationToken.updateMany({
        where: { id: record.id, usedAt: null, expiresAt: { gt: new Date() } },
        data: { usedAt: new Date() },
      });
      if (consumed.count !== 1) throw invalidLink();
      await tx.user.update({ where: { id: user.id }, data: { emailVerifiedAt: new Date() } });
      await tx.emailVerificationToken.updateMany({
        where: { userId: user.id, usedAt: null },
        data: { usedAt: new Date() },
      });
      await this.audit.write('AUTH_EMAIL_VERIFIED', user.id, context, undefined, tx);
    });
    return { message: 'Email verified. You can sign in to your account.' };
  }
  async forgotPassword(email: string, context: AuditContext) {
    const user = await this.db.user.findUnique({ where: { email: normalizeEmail(email) } });
    const token = randomToken();
    await this.db.$transaction(async (tx) => {
      if (user) await this.lockUser(tx, user.id);
      const current = user ? await tx.user.findUnique({ where: { id: user.id } }) : null;
      if (current?.status === 'ACTIVE') {
        const hash = tokenHash(token);
        const expiresAt = new Date(Date.now() + 30 * 60000);
        await tx.passwordResetToken.updateMany({
          where: { userId: current.id, usedAt: null },
          data: { usedAt: new Date() },
        });
        await tx.passwordResetToken.create({
          data: { userId: current.id, tokenHash: hash, expiresAt },
        });
        await this.emails.enqueue(
          tx,
          current,
          'PASSWORD_RESET',
          expiresAt,
          this.link(current.locale, 'reset-password', token),
          hash,
        );
      }
      await this.audit.write(
        'AUTH_PASSWORD_RESET_REQUESTED',
        null,
        context,
        {
          accountKey: privateIdentifier(
            this.config.get('AUTH_SECRET', { infer: true }),
            normalizeEmail(email),
          ),
        },
        tx,
      );
    });
    return { message: 'If an eligible account exists, a password reset email will arrive.' };
  }
  async resetPassword(token: string, password: string, context: AuditContext) {
    const record = await this.db.passwordResetToken.findUnique({
      where: { tokenHash: tokenHash(token) },
    });
    // Hash even invalid links so a different CPU path does not expose token validity.
    const passwordHash = await this.passwords.hash(password);
    if (!record) throw invalidLink();
    await this.db.$transaction(async (tx) => {
      await this.lockUser(tx, record.userId);
      const user = await tx.user.findUnique({ where: { id: record.userId } });
      if (!user || user.status !== 'ACTIVE') throw invalidLink();
      const consumed = await tx.passwordResetToken.updateMany({
        where: { id: record.id, usedAt: null, expiresAt: { gt: new Date() } },
        data: { usedAt: new Date() },
      });
      if (consumed.count !== 1) throw invalidLink();
      await tx.user.update({
        where: { id: user.id },
        data: { passwordHash, credentialVersion: { increment: 1 } },
      });
      await tx.session.deleteMany({ where: { userId: user.id } });
      await tx.passwordResetToken.updateMany({
        where: { userId: user.id, usedAt: null },
        data: { usedAt: new Date() },
      });
      await this.emails.enqueue(tx, user, 'PASSWORD_CHANGED', new Date(Date.now() + 86400000));
      await this.audit.write('AUTH_PASSWORD_RESET_COMPLETED', user.id, context, undefined, tx);
    });
    return { message: 'Password changed. Sign in again; previous sessions have been revoked.' };
  }
  async updateProfile(auth: AuthContext, input: UpdateProfileDto, context: AuditContext) {
    return this.db.$transaction(async (tx) => {
      await this.lockUser(tx, auth.user.id);
      const user = await tx.user.findUnique({ where: { id: auth.user.id } });
      const session = await tx.session.findUnique({ where: { id: auth.session.id } });
      if (
        !user ||
        user.status !== 'ACTIVE' ||
        user.credentialVersion !== auth.session.credentialVersion ||
        !session ||
        session.tokenHash !== auth.session.tokenHash ||
        session.expiresAt <= new Date() ||
        session.absoluteExpiresAt <= new Date()
      )
        throw new UnauthorizedException('Sign in to continue');
      const updated = await tx.user.update({
        where: { id: user.id },
        data: { name: input.name, locale: input.locale },
      });
      await this.audit.write(
        'AUTH_PROFILE_UPDATED',
        user.id,
        context,
        { fields: ['name', 'locale'] },
        tx,
      );
      return this.publicUser(updated);
    });
  }
  publicUser(user: User) {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      locale: user.locale === 'ar' ? ('ar' as const) : ('en' as const),
      emailVerifiedAt: user.emailVerifiedAt?.toISOString() ?? null,
      createdAt: user.createdAt.toISOString(),
    };
  }
  sessionResponse(auth: AuthContext) {
    return {
      user: this.publicUser(auth.user),
      expiresAt: auth.session.expiresAt.toISOString(),
      absoluteExpiresAt: auth.session.absoluteExpiresAt.toISOString(),
    };
  }
}
