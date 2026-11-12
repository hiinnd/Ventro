import { Injectable, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PinoLogger } from 'nestjs-pino';
import { createTransport, type Transporter } from 'nodemailer';
import { z } from 'zod';
import { PrismaService } from '../database/prisma.service';
import type { EmailKind, Prisma } from '../generated/prisma/client';
import type { Environment } from '../config/environment';
import { decryptPayload, encryptPayload } from './crypto';

const payloadSchema = z.object({
  to: z.email(),
  locale: z.enum(['en', 'ar']),
  link: z.string().url().optional(),
});
@Injectable()
export class EmailService implements OnModuleInit, OnModuleDestroy {
  private readonly transport: Transporter;
  private timer?: ReturnType<typeof setInterval>;
  private pending?: Promise<void>;
  private ticks = 0;
  private stopping = false;
  constructor(
    private readonly db: PrismaService,
    private readonly config: ConfigService<Environment, true>,
    private readonly logger: PinoLogger,
  ) {
    this.transport = createTransport({
      host: config.get('SMTP_HOST', { infer: true }),
      port: config.get('SMTP_PORT', { infer: true }),
      secure: config.get('SMTP_SECURE', { infer: true }),
      requireTLS: config.get('SMTP_REQUIRE_TLS', { infer: true }),
      auth: config.get('SMTP_USER', { infer: true })
        ? {
            user: config.get('SMTP_USER', { infer: true }),
            pass: config.get('SMTP_PASSWORD', { infer: true }),
          }
        : undefined,
      connectionTimeout: 5000,
      greetingTimeout: 5000,
      socketTimeout: 10000,
    });
  }
  enqueue(
    tx: Prisma.TransactionClient,
    user: { id: string; email: string; locale: string },
    kind: EmailKind,
    expiresAt: Date,
    link?: string,
    tokenHash?: string,
  ) {
    return tx.emailOutbox.create({
      data: {
        userId: user.id,
        kind,
        expiresAt,
        tokenHash,
        encryptedPayload: encryptPayload(this.config.get('AUTH_SECRET', { infer: true }), {
          to: user.email,
          locale: user.locale === 'ar' ? 'ar' : 'en',
          link,
        }),
      },
    });
  }
  onModuleInit() {
    this.timer = setInterval(() => {
      if (!this.pending && !this.stopping) {
        this.pending = this.work()
          .catch(() => this.logger.warn('Email outbox temporarily unavailable'))
          .finally(() => {
            this.pending = undefined;
          });
      }
    }, 2000);
    this.timer.unref();
  }
  async onModuleDestroy() {
    this.stopping = true;
    clearInterval(this.timer);
    await this.pending;
    this.transport.close();
  }
  private async work() {
    if (this.ticks++ % 1800 === 0) await this.cleanup();
    // Lease outside the network operation. SKIP LOCKED supports multiple API processes.
    const claimed = await this.db.$transaction(async (tx) => {
      const rows = await tx.$queryRaw<
        Array<{ id: string }>
      >`SELECT "id" FROM "EmailOutbox" WHERE "expiresAt" > NOW() AND (("status" = 'PENDING' AND "nextAttemptAt" <= NOW()) OR ("status" = 'PROCESSING' AND "leaseUntil" < NOW())) ORDER BY "createdAt" LIMIT 1 FOR UPDATE SKIP LOCKED`;
      if (!rows[0]) return null;
      return tx.emailOutbox.update({
        where: { id: rows[0].id },
        data: {
          status: 'PROCESSING',
          attempts: { increment: 1 },
          leaseUntil: new Date(Date.now() + 60000),
        },
      });
    });
    if (!claimed) return;
    try {
      const payload = payloadSchema.parse(
        decryptPayload(this.config.get('AUTH_SECRET', { infer: true }), claimed.encryptedPayload),
      );
      if (claimed.tokenHash) {
        const token =
          claimed.kind === 'VERIFY_EMAIL'
            ? await this.db.emailVerificationToken.findUnique({
                where: { tokenHash: claimed.tokenHash },
              })
            : await this.db.passwordResetToken.findUnique({
                where: { tokenHash: claimed.tokenHash },
              });
        if (!token || token.usedAt || token.expiresAt <= new Date()) {
          await this.db.emailOutbox.update({
            where: { id: claimed.id },
            data: { status: 'CANCELLED', encryptedPayload: '', leaseUntil: null },
          });
          return;
        }
      }
      const arabic = payload.locale === 'ar';
      const subject =
        claimed.kind === 'VERIFY_EMAIL'
          ? arabic
            ? 'تأكيد بريدك في VENTRO'
            : 'Verify your VENTRO email'
          : claimed.kind === 'PASSWORD_RESET'
            ? arabic
              ? 'إعادة تعيين كلمة مرور VENTRO'
              : 'Reset your VENTRO password'
            : arabic
              ? 'تم تغيير كلمة مرور VENTRO'
              : 'Your VENTRO password was changed';
      const instructions =
        claimed.kind === 'VERIFY_EMAIL'
          ? arabic
            ? 'افتح الرابط ثم اختر تأكيد البريد. تنتهي صلاحيته خلال ٢٤ ساعة.'
            : 'Open the link and choose Verify email. This link expires within 24 hours.'
          : claimed.kind === 'PASSWORD_RESET'
            ? arabic
              ? 'اختر كلمة مرور جديدة عبر الرابط. تنتهي صلاحيته خلال ٣٠ دقيقة. تجاهل الرسالة إن لم تطلبها.'
              : 'Choose a new password using this link. It expires within 30 minutes. Ignore this message if you did not request it.'
            : arabic
              ? 'تم تغيير كلمة مرور حسابك وإلغاء جلساته السابقة. إن لم تطلب ذلك، استخدم استعادة كلمة المرور فورًا.'
              : 'Your account password was changed and previous sessions were revoked. If this was not you, request a password reset immediately.';
      await this.transport.sendMail({
        from: this.config.get('SMTP_FROM', { infer: true }),
        to: payload.to,
        subject,
        text: [
          'VENTRO — Every Event. Beyond the Moment.',
          '',
          subject,
          instructions,
          ...(payload.link ? ['', payload.link] : []),
          '',
          arabic
            ? 'لا تشارك روابط التحقق أو الاستعادة مع الآخرين.'
            : 'Never share verification or reset links.',
        ].join('\n'),
        messageId: '<' + claimed.id + '@ventro-outbox>',
        headers: { 'X-Auto-Response-Suppress': 'All' },
      });
      await this.db.emailOutbox.update({
        where: { id: claimed.id },
        data: { status: 'SENT', sentAt: new Date(), leaseUntil: null, encryptedPayload: '' },
      });
    } catch {
      // SMTP errors may contain recipients/content. Log only the internal delivery ID.
      this.logger.warn({ deliveryId: claimed.id }, 'Email delivery failed; retry policy applied');
      await this.db.emailOutbox.update({
        where: { id: claimed.id },
        data: {
          status: claimed.attempts >= 8 ? 'FAILED' : 'PENDING',
          leaseUntil: null,
          nextAttemptAt: new Date(Date.now() + Math.min(300000, 2000 * 2 ** claimed.attempts)),
        },
      });
    }
  }
  private async cleanup() {
    const now = new Date();
    const yesterday = new Date(Date.now() - 86400000);
    await this.db.$transaction([
      this.db.session.deleteMany({ where: { expiresAt: { lt: yesterday } } }),
      this.db.emailVerificationToken.deleteMany({
        where: { OR: [{ expiresAt: { lt: yesterday } }, { usedAt: { lt: yesterday } }] },
      }),
      this.db.passwordResetToken.deleteMany({
        where: { OR: [{ expiresAt: { lt: yesterday } }, { usedAt: { lt: yesterday } }] },
      }),
      this.db.emailOutbox.updateMany({
        where: { expiresAt: { lte: now }, status: { in: ['PENDING', 'PROCESSING', 'FAILED'] } },
        data: { status: 'CANCELLED', encryptedPayload: '', leaseUntil: null },
      }),
      this.db.emailOutbox.deleteMany({
        where: {
          createdAt: { lt: new Date(Date.now() - 7 * 86400000) },
          status: { in: ['SENT', 'CANCELLED', 'FAILED'] },
        },
      }),
      this.db.auditLog.deleteMany({
        where: { createdAt: { lt: new Date(Date.now() - 90 * 86400000) } },
      }),
    ]);
  }
}
