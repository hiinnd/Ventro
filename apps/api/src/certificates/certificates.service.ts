import {
  ConflictException,
  Injectable,
  NotFoundException,
  type OnModuleDestroy,
  type OnModuleInit,
} from '@nestjs/common';
import { Queue, Worker } from 'bullmq';
import PDFDocument from 'pdfkit';
import { randomUUID } from 'node:crypto';
import { ConfigService } from '@nestjs/config';
import type { AuthContext } from '../auth/auth.service';
import { AuditService, type AuditContext } from '../auth/audit.service';
import { PrismaService } from '../database/prisma.service';
import { Prisma } from '../generated/prisma/client';
import { OrganizationService } from '../organizations/organization.service';
import type { Environment } from '../config/environment';
import type {
  PassportVisibilityDto,
  RevokeCertificateDto,
  SaveCertificateTemplateDto,
} from './certificates.dto';

const templateView = (row: {
  id: string;
  eventId: string;
  name: string;
  body: string;
  learningHours: number;
  requiresEventCheckIn: boolean;
  requiredSessionIds: Prisma.JsonValue;
  active: boolean;
}) => ({
  ...row,
  requiredSessionIds: Array.isArray(row.requiredSessionIds) ? row.requiredSessionIds : [],
});
type PassportRow = {
  id: string;
  slug: string;
  userId: string;
  user: { name: string };
  settings: {
    passportId: string;
    profileVisible: boolean;
    eventsVisible: boolean;
    certificatesVisible: boolean;
    attendanceVisible: boolean;
    learningHoursVisible: boolean;
  };
};

@Injectable()
export class CertificatesService implements OnModuleInit, OnModuleDestroy {
  private queue!: Queue<{ certificateId: string }>;
  private worker!: Worker<{ certificateId: string }>;
  constructor(
    private readonly db: PrismaService,
    private readonly orgs: OrganizationService,
    private readonly config: ConfigService<Environment, true>,
    private readonly audit: AuditService,
  ) {}

  private connection() {
    const url = new URL(this.config.get('REDIS_URL', { infer: true }));
    return {
      host: url.hostname,
      port: Number(url.port || 6379),
      username: url.username || undefined,
      password: url.password || undefined,
      maxRetriesPerRequest: null,
    };
  }

  onModuleInit() {
    this.queue = new Queue('certificate-generation', { connection: this.connection() });
    this.worker = new Worker(
      'certificate-generation',
      async (job) => this.generatePdf(job.data.certificateId),
      { connection: this.connection(), concurrency: 2 },
    );
  }
  async onModuleDestroy() {
    await Promise.all([this.worker?.close(), this.queue?.close()]);
  }

  async templates(auth: AuthContext, organizationId: string, eventId: string) {
    return this.orgs.withTenant(auth, organizationId, 'events:read', async (tx) => {
      const event = await tx.event.findFirst({
        where: { id: eventId, organizationId },
        select: { id: true },
      });
      if (!event) throw new NotFoundException('Event not found');
      return {
        items: (
          await tx.certificateTemplate.findMany({
            where: { organizationId, eventId },
            orderBy: { createdAt: 'desc' },
          })
        ).map(templateView),
      };
    });
  }

  async createTemplate(
    auth: AuthContext,
    organizationId: string,
    eventId: string,
    input: SaveCertificateTemplateDto,
    context: AuditContext,
  ) {
    return this.orgs.withTenant(auth, organizationId, 'events:write', async (tx) => {
      const event = await tx.event.findFirst({
        where: { id: eventId, organizationId },
        select: { id: true, sessions: { select: { id: true } } },
      });
      if (!event) throw new NotFoundException('Event not found');
      const sessions = input.requiredSessionIds ?? [];
      const valid = new Set(event.sessions.map((session) => session.id));
      if (sessions.some((id) => !valid.has(id)))
        throw new ConflictException('Required sessions must belong to this event');
      const row = await tx.certificateTemplate.create({
        data: {
          organizationId,
          eventId,
          name: input.name.trim(),
          body: input.body?.trim() ?? '',
          learningHours: input.learningHours ?? 0,
          requiresEventCheckIn: input.requiresEventCheckIn ?? true,
          requiredSessionIds: sessions,
        },
      });
      await this.audit.write(
        'CERTIFICATE_TEMPLATE_CREATED',
        auth.user.id,
        context,
        { eventId, templateId: row.id },
        tx,
        organizationId,
      );
      return templateView(row);
    });
  }

  private async eligible(tx: Prisma.TransactionClient, templateId: string, registrationId: string) {
    const template = await tx.certificateTemplate.findUnique({
      where: { id: templateId },
      include: { event: { select: { id: true, organizationId: true, title: true, endsAt: true } } },
    });
    const registration = await tx.registration.findUnique({
      where: { id: registrationId },
      include: { user: { select: { name: true } }, ticket: { select: { id: true } } },
    });
    if (
      !template ||
      !registration ||
      registration.eventId !== template.eventId ||
      registration.status !== 'CONFIRMED'
    )
      return null;
    if (!template.event.endsAt || template.event.endsAt > new Date()) return null;
    if (
      template.requiresEventCheckIn &&
      (!registration.ticket ||
        !(await tx.checkIn.findFirst({
          where: { eventId: template.eventId, ticketId: registration.ticket.id },
          select: { id: true },
        })))
    )
      return null;
    const required = Array.isArray(template.requiredSessionIds)
      ? template.requiredSessionIds.filter((id): id is string => typeof id === 'string')
      : [];
    if (
      required.length &&
      (!registration.ticket ||
        (await tx.sessionAttendance.count({
          where: { ticketId: registration.ticket.id, sessionId: { in: required } },
        })) !== required.length)
    )
      return null;
    return { template, registration };
  }

  async issueEligible(
    auth: AuthContext,
    organizationId: string,
    eventId: string,
    templateId: string,
    context: AuditContext,
  ) {
    const issued = await this.orgs.withTenant(auth, organizationId, 'events:write', async (tx) => {
      const template = await tx.certificateTemplate.findFirst({
        where: { id: templateId, eventId, organizationId, active: true },
        select: { id: true },
      });
      if (!template) throw new NotFoundException('Certificate template not found');
      const registrations = await tx.registration.findMany({
        where: { eventId, status: 'CONFIRMED' },
        select: { id: true },
      });
      const created: string[] = [];
      for (const registration of registrations) {
        const eligibility = await this.eligible(tx, templateId, registration.id);
        if (!eligibility) continue;
        const existing = await tx.certificate.findUnique({
          where: { registrationId_templateId: { registrationId: registration.id, templateId } },
          select: { id: true },
        });
        if (existing) continue;
        const certificate = await tx.certificate.create({
          data: {
            organizationId,
            eventId,
            registrationId: registration.id,
            templateId,
            recipientName: eligibility.registration.user.name,
            eventTitle: eligibility.template.event.title,
            learningHours: eligibility.template.learningHours,
          },
        });
        created.push(certificate.id);
      }
      await this.audit.write(
        'CERTIFICATES_ISSUANCE_REQUESTED',
        auth.user.id,
        context,
        { eventId, templateId, count: created.length },
        tx,
        organizationId,
      );
      return created;
    });
    await Promise.all(
      issued.map((certificateId) =>
        this.queue.add(
          'generate',
          { certificateId },
          { jobId: certificateId, attempts: 3, backoff: { type: 'exponential', delay: 500 } },
        ),
      ),
    );
    return { queued: issued.length };
  }

  private pdf(certificate: {
    recipientName: string;
    eventTitle: string;
    learningHours: number;
    verificationId: string;
    issuedAt: Date;
    organization: { name: string };
    template: { name: string; body: string };
  }) {
    return new Promise<Buffer>((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A4', margin: 72 });
      const chunks: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
      doc
        .fillColor('#101B35')
        .fontSize(28)
        .text(certificate.organization.name, { align: 'center' });
      doc.moveDown(2).fontSize(20).text('Certificate of Achievement', { align: 'center' });
      doc
        .moveDown()
        .fontSize(12)
        .fillColor('#252B42')
        .text('This certifies that', { align: 'center' });
      doc
        .moveDown(0.5)
        .fontSize(24)
        .fillColor('#101B35')
        .text(certificate.recipientName, { align: 'center' });
      doc.moveDown().fontSize(12).fillColor('#252B42').text('has completed', { align: 'center' });
      doc
        .moveDown(0.5)
        .fontSize(17)
        .fillColor('#9B8CFF')
        .text(certificate.eventTitle, { align: 'center' });
      if (certificate.template.body)
        doc
          .moveDown()
          .fontSize(11)
          .fillColor('#252B42')
          .text(certificate.template.body, { align: 'center' });
      doc
        .moveDown(2)
        .fontSize(10)
        .text('Learning hours: ' + certificate.learningHours, { align: 'center' });
      doc.text('Issued: ' + certificate.issuedAt.toISOString().slice(0, 10), { align: 'center' });
      doc
        .moveDown()
        .fillColor('#5b5f72')
        .fontSize(8)
        .text('Verification ID: ' + certificate.verificationId, { align: 'center' });
      doc.end();
    });
  }
  private async generatePdf(certificateId: string) {
    const certificate = await this.db.certificate.findUnique({
      where: { id: certificateId },
      include: {
        organization: { select: { name: true } },
        template: { select: { name: true, body: true } },
      },
    });
    if (!certificate || certificate.status === 'REVOKED') return;
    try {
      const issuedAt = certificate.issuedAt ?? new Date();
      const pdfData = await this.pdf({ ...certificate, issuedAt });
      await this.db.certificate.update({
        where: { id: certificate.id },
        data: {
          status: 'GENERATED',
          issuedAt,
          generatedAt: new Date(),
          pdfData: Uint8Array.from(pdfData),
        },
      });
    } catch (error) {
      await this.db.certificate.update({
        where: { id: certificateId },
        data: { status: 'FAILED' },
      });
      throw error;
    }
  }

  async revoke(
    auth: AuthContext,
    organizationId: string,
    certificateId: string,
    input: RevokeCertificateDto,
    context: AuditContext,
  ) {
    return this.orgs.withTenant(auth, organizationId, 'events:state', async (tx) => {
      const certificate = await tx.certificate.findFirst({
        where: { id: certificateId, organizationId },
      });
      if (!certificate) throw new NotFoundException('Certificate not found');
      if (certificate.status === 'REVOKED')
        throw new ConflictException('Certificate is already revoked');
      const row = await tx.certificate.update({
        where: { id: certificateId },
        data: { status: 'REVOKED', revokedAt: new Date(), revocationReason: input.reason.trim() },
      });
      await this.audit.write(
        'CERTIFICATE_REVOKED',
        auth.user.id,
        context,
        { certificateId },
        tx,
        organizationId,
      );
      return { id: row.id, status: row.status, revokedAt: row.revokedAt!.toISOString() };
    });
  }

  async mine(auth: AuthContext) {
    return this.orgs.withVerifiedActor(auth, async (tx) => ({
      items: (
        await tx.certificate.findMany({
          where: { registration: { userId: auth.user.id } },
          include: { organization: { select: { name: true } } },
          orderBy: { createdAt: 'desc' },
        })
      ).map((row) => ({
        id: row.id,
        verificationId: row.verificationId,
        eventTitle: row.eventTitle,
        organizationName: row.organization.name,
        status: row.status,
        issuedAt: row.issuedAt?.toISOString() ?? null,
        revokedAt: row.revokedAt?.toISOString() ?? null,
      })),
    }));
  }
  async download(auth: AuthContext, certificateId: string) {
    return this.orgs.withVerifiedActor(auth, async (tx) => {
      const row = await tx.certificate.findFirst({
        where: { id: certificateId, registration: { userId: auth.user.id }, status: 'GENERATED' },
        select: { pdfData: true, verificationId: true },
      });
      if (!row?.pdfData) throw new NotFoundException('Certificate PDF is unavailable');
      return row;
    });
  }
  async verify(verificationId: string) {
    const row = await this.db.certificate.findUnique({
      where: { verificationId },
      select: {
        recipientName: true,
        eventTitle: true,
        issuedAt: true,
        status: true,
        revokedAt: true,
        organization: { select: { name: true } },
      },
    });
    if (!row) throw new NotFoundException('Certificate not found');
    return {
      valid: row.status === 'GENERATED',
      recipientName: row.recipientName,
      eventTitle: row.eventTitle,
      organizationName: row.organization.name,
      issuedAt: row.issuedAt?.toISOString() ?? null,
      revokedAt: row.revokedAt?.toISOString() ?? null,
    };
  }

  private async passport(tx: Prisma.TransactionClient, userId: string): Promise<PassportRow> {
    const current = await tx.eventPassport.upsert({
      where: { userId },
      create: {
        userId,
        slug: 'passport-' + randomUUID().replaceAll('-', '').slice(0, 24),
        settings: { create: {} },
      },
      update: {},
      include: { settings: true, user: { select: { name: true } } },
    });
    if (!current.settings) throw new ConflictException('Passport settings are unavailable');
    return { ...current, settings: current.settings };
  }
  private async passportData(tx: Prisma.TransactionClient, passport: PassportRow) {
    const certificates = await tx.certificate.findMany({
      where: { registration: { userId: passport.userId }, status: 'GENERATED' },
      orderBy: { issuedAt: 'desc' },
      select: {
        id: true,
        eventTitle: true,
        issuedAt: true,
        learningHours: true,
        verificationId: true,
      },
    });
    const attendance = await tx.checkIn.findMany({
      where: {
        ticket: { registration: { userId: passport.userId } },
        event: { endsAt: { lt: new Date() } },
      },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true, event: { select: { title: true } } },
    });
    return {
      slug: passport.slug,
      name: passport.user.name,
      settings: passport.settings,
      certificates: certificates.map((x) => ({
        ...x,
        issuedAt: x.issuedAt?.toISOString() ?? null,
      })),
      completedEvents: attendance.map((x) => ({
        title: x.event.title,
        completedAt: x.createdAt.toISOString(),
      })),
      attendance: attendance.map((x) => ({
        title: x.event.title,
        checkedInAt: x.createdAt.toISOString(),
      })),
      learningHours: certificates.reduce((sum, x) => sum + x.learningHours, 0),
    };
  }
  async myPassport(auth: AuthContext) {
    return this.orgs.withVerifiedActor(auth, async (tx) =>
      this.passportData(tx, await this.passport(tx, auth.user.id)),
    );
  }
  async updatePassport(auth: AuthContext, input: PassportVisibilityDto) {
    return this.orgs.withVerifiedActor(auth, async (tx) => {
      const passport = await this.passport(tx, auth.user.id);
      await tx.passportVisibilitySettings.update({
        where: { passportId: passport.id },
        data: input,
      });
      return this.passportData(tx, await this.passport(tx, auth.user.id));
    });
  }
  async publicPassport(slug: string) {
    return this.db.$transaction(async (tx) => {
      const passport = await tx.eventPassport.findUnique({
        where: { slug },
        include: { settings: true, user: { select: { name: true } } },
      });
      if (!passport?.settings?.profileVisible) throw new NotFoundException('Passport not found');
      const data = await this.passportData(tx, passport as never);
      return {
        slug: data.slug,
        name: data.name,
        certificates: passport.settings.certificatesVisible ? data.certificates : [],
        completedEvents: passport.settings.eventsVisible ? data.completedEvents : [],
        attendance: passport.settings.attendanceVisible ? data.attendance : [],
        learningHours: passport.settings.learningHoursVisible ? data.learningHours : null,
      };
    });
  }
}
