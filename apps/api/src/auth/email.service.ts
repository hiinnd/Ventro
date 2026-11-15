import { Injectable, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PinoLogger } from 'nestjs-pino';
import { createTransport, type Transporter } from 'nodemailer';
import { Queue, Worker } from 'bullmq';
import { toDataURL } from 'qrcode';
import { z } from 'zod';
import { PrismaService } from '../database/prisma.service';
import type { EmailKind, Prisma } from '../generated/prisma/client';
import type { Environment } from '../config/environment';
import { RedisService } from '../redis/redis.service';
import { decryptPayload, encryptPayload } from './crypto';

const payloadSchema = z.object({
  to: z.email(),
  locale: z.enum(['en', 'ar']),
  link: z.string().url().optional(),
  organizationName: z.string().max(120).optional(),
  event: z
    .object({
      title: z.string().min(1).max(180),
      startsAt: z.string().datetime().nullable(),
      timezone: z.string().min(1).max(80),
      locationType: z.enum(['VENUE', 'ONLINE']),
      venue: z.string().max(300),
      onlineUrl: z.string().max(500),
      credential: z.uuid(),
      ticketUrl: z.string().url().optional(),
    })
    .optional(),
});

type EventEmail = NonNullable<z.infer<typeof payloadSchema>['event']>;

const escapeHtml = (value: string) =>
  value.replace(
    /[&<>'"]/g,
    (character) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character]!,
  );

function eventDate(event: EventEmail, locale: 'en' | 'ar') {
  if (!event.startsAt) return locale === 'ar' ? 'سيُعلن الموعد لاحقًا' : 'Date to be announced';
  return new Intl.DateTimeFormat(locale === 'ar' ? 'ar-JO' : 'en-JO', {
    dateStyle: 'full',
    timeStyle: 'short',
    timeZone: event.timezone,
  }).format(new Date(event.startsAt));
}

function ticketEmailHtml(event: EventEmail, locale: 'en' | 'ar') {
  const arabic = locale === 'ar';
  const location =
    event.locationType === 'ONLINE'
      ? arabic
        ? 'فعالية عبر الإنترنت'
        : 'Online event'
      : event.venue || (arabic ? 'سيُعلن المكان لاحقًا' : 'Venue to be announced');
  const copy = arabic
    ? {
        preheader: 'تم تأكيد تسجيلك وتذكرتك جاهزة.',
        heading: 'تم تأكيد تسجيلك',
        introduction: 'تذكرتك جاهزة الآن في حسابك. اعرض رمز QR عند تسجيل الدخول إلى الفعالية.',
        event: 'الفعالية',
        date: 'الموعد',
        location: 'المكان',
        cta: 'عرض تذكرتي',
        qr: 'رمز الدخول الخاص بك',
        safety: 'يحمل رمز QR معرّف تذكرة مبهم فقط. لا تشاركه علنًا.',
      }
    : {
        preheader: 'Your registration is confirmed and your ticket is ready.',
        heading: 'Your registration is confirmed',
        introduction:
          'Your ticket is now available in your account. Show the QR code at event check-in.',
        event: 'Event',
        date: 'Date and time',
        location: 'Location',
        cta: 'View my ticket',
        qr: 'Your check-in QR code',
        safety: 'This QR code contains only an opaque ticket credential. Do not share it publicly.',
      };
  const direction = arabic ? 'rtl' : 'ltr';
  return `<!doctype html>
<html lang="${locale}" dir="${direction}">
  <body style="margin:0;background:#f6f7fb;color:#101b35;font-family:Arial,sans-serif;">
    <span style="display:none!important;visibility:hidden;opacity:0;overflow:hidden;height:0;width:0;">${escapeHtml(copy.preheader)}</span>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:32px 12px;background:#f6f7fb;"><tr><td align="center">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 12px 30px rgba(16,27,53,.10);">
        <tr><td style="padding:28px 32px;background:#101b35;color:#f6f7fb;"><strong style="font-size:22px;letter-spacing:1px;">VENTRO</strong><br><span style="font-size:12px;color:#9b8cff;">Every Event. Beyond the Moment.</span></td></tr>
        <tr><td style="padding:32px;">
          <h1 style="margin:0 0 12px;font-size:28px;line-height:1.3;color:#101b35;">${escapeHtml(copy.heading)}</h1>
          <p style="margin:0 0 24px;line-height:1.7;color:#252b42;">${escapeHtml(copy.introduction)}</p>
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border:1px solid #e3e5ee;border-radius:14px;background:#f6f7fb;"><tr><td style="padding:20px;">
            <p style="margin:0 0 6px;font-size:12px;font-weight:bold;color:#70778d;">${escapeHtml(copy.event)}</p><p style="margin:0 0 18px;font-size:19px;font-weight:bold;color:#101b35;">${escapeHtml(event.title)}</p>
            <p style="margin:0 0 6px;font-size:12px;font-weight:bold;color:#70778d;">${escapeHtml(copy.date)}</p><p style="margin:0 0 18px;line-height:1.5;color:#252b42;">${escapeHtml(eventDate(event, locale))}</p>
            <p style="margin:0 0 6px;font-size:12px;font-weight:bold;color:#70778d;">${escapeHtml(copy.location)}</p><p style="margin:0;color:#252b42;">${escapeHtml(location)}</p>
          </td></tr></table>
          <div style="padding:28px 0 18px;text-align:center;"><p style="margin:0 0 10px;font-weight:bold;color:#101b35;">${escapeHtml(copy.qr)}</p><img src="cid:ventro-ticket-qr" width="220" height="220" alt="${escapeHtml(copy.qr)}" style="display:block;margin:0 auto;border:12px solid #ffffff;border-radius:12px;background:#ffffff;"></div>
          <p style="margin:0 0 24px;text-align:center;font-size:13px;line-height:1.6;color:#70778d;">${escapeHtml(copy.safety)}</p>
          ${event.ticketUrl ? `<div style="text-align:center;"><a href="${escapeHtml(event.ticketUrl)}" style="display:inline-block;padding:14px 22px;border-radius:10px;background:#5ce1c6;color:#101b35;font-weight:bold;text-decoration:none;">${escapeHtml(copy.cta)}</a></div>` : ''}
        </td></tr>
      </table>
    </td></tr></table>
  </body>
</html>`;
}

function ticketEmailText(
  event: EventEmail,
  locale: 'en' | 'ar',
  subject: string,
  instructions: string,
) {
  const arabic = locale === 'ar';
  const location =
    event.locationType === 'ONLINE'
      ? arabic
        ? 'فعالية عبر الإنترنت'
        : 'Online event'
      : event.venue || (arabic ? 'سيُعلن المكان لاحقًا' : 'Venue to be announced');
  return [
    'VENTRO — Every Event. Beyond the Moment.',
    '',
    subject,
    instructions,
    '',
    (arabic ? 'الفعالية: ' : 'Event: ') + event.title,
    (arabic ? 'الموعد: ' : 'Date and time: ') + eventDate(event, locale),
    (arabic ? 'المكان: ' : 'Location: ') + location,
    '',
    ...(event.ticketUrl ? [event.ticketUrl, ''] : []),
    '',
    arabic
      ? 'رمز QR خاص بتذكرتك. لا تشاركه علنًا.'
      : 'Your QR code belongs to your ticket. Do not share it publicly.',
  ].join('\n');
}
@Injectable()
export class EmailService implements OnModuleInit, OnModuleDestroy {
  private readonly transport: Transporter;
  private timer?: ReturnType<typeof setInterval>;
  private pending?: Promise<void>;
  private queue?: Queue<{ deliveryId: string }>;
  private worker?: Worker<{ deliveryId: string }>;
  private ticks = 0;
  private stopping = false;
  constructor(
    private readonly db: PrismaService,
    private readonly config: ConfigService<Environment, true>,
    private readonly logger: PinoLogger,
    private readonly redis: RedisService,
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
    const connection = this.redis.bullConnection();
    this.queue = new Queue('transactional-email', { connection });
    this.worker = new Worker('transactional-email', (job) => this.work(job.data.deliveryId), {
      connection: this.redis.bullConnection(),
      concurrency: 4,
    });
    this.timer = setInterval(() => {
      if (!this.pending && !this.stopping) {
        this.pending = this.dispatch()
          .catch(() => this.logger.warn('Email outbox temporarily unavailable'))
          .finally(() => {
            this.pending = undefined;
          });
      }
    }, 2000);
    this.timer.unref();
  }
  enqueueInvitation(
    tx: Prisma.TransactionClient,
    invitation: { id: string; email: string; tokenHash: string; expiresAt: Date },
    organization: { name: string; locale: string },
    link: string,
  ) {
    return tx.emailOutbox.create({
      data: {
        invitationId: invitation.id,
        kind: 'ORGANIZATION_INVITE',
        tokenHash: invitation.tokenHash,
        expiresAt: invitation.expiresAt,
        encryptedPayload: encryptPayload(this.config.get('AUTH_SECRET', { infer: true }), {
          to: invitation.email,
          locale: organization.locale === 'ar' ? 'ar' : 'en',
          link,
          organizationName: organization.name,
        }),
      },
    });
  }
  async enqueueRegistrationConfirmation(
    tx: Prisma.TransactionClient,
    recipient: { id: string; email: string; locale: string } | { email: string; locale: string },
    event: {
      title: string;
      startsAt: Date | null;
      timezone: string;
      locationType: 'VENUE' | 'ONLINE';
      venue: string;
      onlineUrl: string;
    },
    credential: string,
    guestTicketUrl?: string,
  ) {
    const accountRecipient = 'id' in recipient;
    if (accountRecipient) {
      const preference = await tx.notificationPreference.upsert({
        where: { userId: recipient.id },
        create: { userId: recipient.id },
        update: {},
        select: { registrationEmail: true },
      });
      if (!preference.registrationEmail) return null;
    }
    const locale = recipient.locale === 'ar' ? 'ar' : 'en';
    const ticketUrl = accountRecipient
      ? this.config.get('AUTH_APP_URL', { infer: true }) + '/' + locale + '/tickets'
      : guestTicketUrl;
    return tx.emailOutbox.create({
      data: {
        ...(accountRecipient ? { userId: recipient.id } : {}),
        kind: 'EVENT_NOTIFICATION',
        // The email contains no bearer credential. The outbox expiry bounds retry retention only.
        expiresAt: new Date(Date.now() + 7 * 86400000),
        encryptedPayload: encryptPayload(this.config.get('AUTH_SECRET', { infer: true }), {
          to: recipient.email,
          locale,
          link: ticketUrl,
          event: {
            title: event.title,
            startsAt: event.startsAt?.toISOString() ?? null,
            timezone: event.timezone,
            locationType: event.locationType,
            venue: event.venue,
            onlineUrl: event.onlineUrl,
            credential,
            ticketUrl,
          },
        }),
      },
    });
  }
  async onModuleDestroy() {
    this.stopping = true;
    clearInterval(this.timer);
    await this.pending;
    await Promise.all([this.worker?.close(), this.queue?.close()]);
    this.transport.close();
  }
  private async dispatch() {
    if (this.ticks++ % 1800 === 0) await this.cleanup();
    const due = await this.db.emailOutbox.findMany({
      where: {
        expiresAt: { gt: new Date() },
        OR: [
          { status: 'PENDING', nextAttemptAt: { lte: new Date() } },
          { status: 'PROCESSING', leaseUntil: { lt: new Date() } },
        ],
      },
      select: { id: true },
      orderBy: { createdAt: 'asc' },
      take: 50,
    });
    await Promise.all(
      due.map((delivery) =>
        this.queue!.add(
          'deliver',
          { deliveryId: delivery.id },
          {
            jobId: 'email-' + delivery.id,
            attempts: 8,
            backoff: { type: 'exponential', delay: 2000 },
            removeOnComplete: true,
            removeOnFail: false,
          },
        ),
      ),
    );
  }
  private async work(deliveryId: string) {
    // Lease outside the network operation. SKIP LOCKED supports multiple API processes.
    const claimed = await this.db.$transaction(async (tx) => {
      const rows = await tx.$queryRaw<
        Array<{ id: string }>
      >`SELECT "id" FROM "EmailOutbox" WHERE "id" = ${deliveryId}::uuid AND "expiresAt" > NOW() AND ("status" = 'PENDING' OR ("status" = 'PROCESSING' AND "leaseUntil" < NOW())) FOR UPDATE SKIP LOCKED`;
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
          claimed.kind === 'ORGANIZATION_INVITE'
            ? await this.db.organizationInvitation.findFirst({
                where: {
                  tokenHash: claimed.tokenHash,
                  status: 'PENDING',
                  organization: { archivedAt: null },
                },
              })
            : claimed.kind === 'VERIFY_EMAIL'
              ? await this.db.emailVerificationToken.findUnique({
                  where: { tokenHash: claimed.tokenHash },
                })
              : await this.db.passwordResetToken.findUnique({
                  where: { tokenHash: claimed.tokenHash },
                });
        if (!token || ('usedAt' in token && token.usedAt) || token.expiresAt <= new Date()) {
          await this.db.emailOutbox.update({
            where: { id: claimed.id },
            data: { status: 'CANCELLED', encryptedPayload: '', leaseUntil: null },
          });
          return;
        }
      }
      const arabic = payload.locale === 'ar';
      const subject =
        claimed.kind === 'ORGANIZATION_INVITE'
          ? arabic
            ? 'دعوة إلى فريق VENTRO'
            : 'Your VENTRO team invitation'
          : claimed.kind === 'VERIFY_EMAIL'
            ? arabic
              ? 'تأكيد بريدك في VENTRO'
              : 'Verify your VENTRO email'
            : claimed.kind === 'PASSWORD_RESET'
              ? arabic
                ? 'إعادة تعيين كلمة مرور VENTRO'
                : 'Reset your VENTRO password'
              : claimed.kind === 'EVENT_NOTIFICATION'
                ? arabic
                  ? 'تم تأكيد تسجيلك وتذكرتك جاهزة'
                  : 'Your VENTRO registration is confirmed'
                : arabic
                  ? 'تم تغيير كلمة مرور VENTRO'
                  : 'Your VENTRO password was changed';
      const instructions =
        claimed.kind === 'ORGANIZATION_INVITE'
          ? arabic
            ? 'دعوة للانضمام إلى ' +
              payload.organizationName +
              '. سجّل الدخول بحساب بريد الدعوة المؤكّد، ثم اقبل أو ارفض الدعوة خلال ٧ أيام.'
            : 'You are invited to ' +
              payload.organizationName +
              '. Sign in with the verified invited email, then accept or decline within 7 days.'
          : claimed.kind === 'VERIFY_EMAIL'
            ? arabic
              ? 'افتح الرابط ثم اختر تأكيد البريد. تنتهي صلاحيته خلال ٢٤ ساعة.'
              : 'Open the link and choose Verify email. This link expires within 24 hours.'
            : claimed.kind === 'PASSWORD_RESET'
              ? arabic
                ? 'اختر كلمة مرور جديدة عبر الرابط. تنتهي صلاحيته خلال ٣٠ دقيقة. تجاهل الرسالة إن لم تطلبها.'
                : 'Choose a new password using this link. It expires within 30 minutes. Ignore this message if you did not request it.'
              : claimed.kind === 'EVENT_NOTIFICATION'
                ? arabic
                  ? 'تم تأكيد تسجيلك. افتح تذاكري لعرض التذكرة ورمز QR الخاص بالدخول.'
                  : 'Your registration is confirmed. Open My tickets to view your ticket and check-in QR code.'
                : arabic
                  ? 'تم تغيير كلمة مرور حسابك وإلغاء جلساته السابقة. إن لم تطلب ذلك، استخدم استعادة كلمة المرور فورًا.'
                  : 'Your account password was changed and previous sessions were revoked. If this was not you, request a password reset immediately.';
      const event = claimed.kind === 'EVENT_NOTIFICATION' ? payload.event : undefined;
      if (claimed.kind === 'EVENT_NOTIFICATION' && !event)
        throw new Error('Event notification payload is invalid');
      const qr = event
        ? await toDataURL('ventro:ticket:' + event.credential, {
            width: 440,
            margin: 1,
            errorCorrectionLevel: 'M',
          })
        : undefined;
      await this.transport.sendMail({
        from: this.config.get('SMTP_FROM', { infer: true }),
        to: payload.to,
        subject,
        text: event
          ? ticketEmailText(event, payload.locale, subject, instructions)
          : [
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
        ...(event && qr
          ? {
              html: ticketEmailHtml(event, payload.locale),
              attachments: [
                {
                  filename: 'ventro-ticket-qr.png',
                  content: qr.slice(qr.indexOf(',') + 1),
                  encoding: 'base64' as const,
                  cid: 'ventro-ticket-qr',
                },
              ],
            }
          : {}),
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
      if (claimed.attempts < 8) throw new Error('Email delivery failed');
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
