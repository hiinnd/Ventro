import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import type { AuthContext } from '../auth/auth.service';
import { AuditService, type AuditContext } from '../auth/audit.service';
import { normalizeEmail, randomToken, tokenHash } from '../auth/crypto';
import { EmailService } from '../auth/email.service';
import { PrismaService } from '../database/prisma.service';
import { Prisma } from '../generated/prisma/client';
import type { Environment } from '../config/environment';
import { OrganizationService } from '../organizations/organization.service';
import type { RegistrationListQuery, SaveFormDto, SubmitRegistrationDto } from './registration.dto';

const formInclude = {
  fields: { orderBy: { position: 'asc' as const } },
} satisfies Prisma.RegistrationFormInclude;
const formView = (form: Prisma.RegistrationFormGetPayload<{ include: typeof formInclude }>) => ({
  id: form.id,
  eventId: form.eventId,
  status: form.status,
  fields: form.fields.map((f) => ({
    id: f.id,
    key: f.key,
    type: f.type,
    label: f.label,
    helpText: f.helpText,
    required: f.required,
    options: f.options,
    visibilityRule: f.visibilityRule,
    position: f.position,
  })),
});
const formError = (message: string) => new BadRequestException(message);
@Injectable()
export class RegistrationsService {
  constructor(
    private readonly db: PrismaService,
    private readonly orgs: OrganizationService,
    private readonly audit: AuditService,
    private readonly emails: EmailService,
    private readonly config: ConfigService<Environment, true>,
  ) {}
  private checkSchema(input: SaveFormDto) {
    const keys = new Set<string>();
    for (const f of input.fields) {
      if (keys.has(f.key)) throw formError('Field keys must be unique');
      keys.add(f.key);
      if (['SELECT', 'RADIO', 'CHECKBOX'].includes(f.type) && (!f.options || f.options.length < 1))
        throw formError('Choice fields require options');
      if (
        f.visibilityRule &&
        !keys.has(f.visibilityRule.field) &&
        !input.fields.some((x) => x.key === f.visibilityRule!.field)
      )
        throw formError('Visibility rule references an unknown field');
    }
  }
  async getOrganizerForm(auth: AuthContext, org: string, eventId: string) {
    return this.orgs.withTenant(auth, org, 'events:read', async (tx) => {
      const event = await tx.event.findFirst({ where: { id: eventId, organizationId: org } });
      if (!event) throw new NotFoundException('Event not found');
      const form = await tx.registrationForm.findUnique({
        where: { eventId },
        include: formInclude,
      });
      return form ? formView(form) : { id: null, eventId, status: 'DRAFT', fields: [] };
    });
  }
  async saveForm(
    auth: AuthContext,
    org: string,
    eventId: string,
    input: SaveFormDto,
    context: AuditContext,
  ) {
    this.checkSchema(input);
    return this.orgs.withTenant(auth, org, 'events:write', async (tx) => {
      const event = await tx.event.findFirst({ where: { id: eventId, organizationId: org } });
      if (!event) throw new NotFoundException('Event not found');
      const form = await tx.registrationForm.upsert({
        where: { eventId },
        create: { eventId, status: 'DRAFT' },
        update: {},
      });
      await tx.formField.deleteMany({ where: { registrationFormId: form.id } });
      if (input.fields.length)
        await tx.formField.createMany({
          data: input.fields.map((f, position) => ({
            registrationFormId: form.id,
            key: f.key,
            type: f.type,
            label: f.label.trim(),
            helpText: f.helpText?.trim() ?? '',
            required: f.required,
            options: f.options ?? Prisma.JsonNull,
            visibilityRule: f.visibilityRule ?? Prisma.JsonNull,
            position,
          })),
        });
      const saved = await tx.registrationForm.findUniqueOrThrow({
        where: { id: form.id },
        include: formInclude,
      });
      await this.audit.write(
        'REGISTRATION_FORM_SAVED',
        auth.user.id,
        context,
        { eventId },
        tx,
        org,
      );
      return formView(saved);
    });
  }
  async publishForm(auth: AuthContext, org: string, eventId: string, context: AuditContext) {
    return this.orgs.withTenant(auth, org, 'events:publish', async (tx) => {
      const event = await tx.event.findFirst({ where: { id: eventId, organizationId: org } });
      if (!event) throw new NotFoundException('Event not found');
      const form = await tx.registrationForm.findUnique({
        where: { eventId },
        include: formInclude,
      });
      if (!form) throw formError('Create a registration form first');
      if (event.status !== 'PUBLISHED')
        throw formError('Publish the event before its registration form');
      await tx.registrationForm.update({ where: { id: form.id }, data: { status: 'PUBLISHED' } });
      await this.audit.write(
        'REGISTRATION_FORM_PUBLISHED',
        auth.user.id,
        context,
        { eventId },
        tx,
        org,
      );
      return formView({ ...form, status: 'PUBLISHED' });
    });
  }
  async publicForm(slug: string) {
    const event = await this.db.event.findFirst({
      where: { slug, status: 'PUBLISHED', visibility: 'PUBLIC' },
      select: { id: true, registrationForm: { include: formInclude } },
    });
    if (!event?.registrationForm || event.registrationForm.status !== 'PUBLISHED')
      throw new NotFoundException('Registration is not available');
    return formView(event.registrationForm);
  }
  private visible(field: { visibilityRule: Prisma.JsonValue }, answers: Record<string, unknown>) {
    const rule = field.visibilityRule;
    if (!rule || typeof rule !== 'object' || Array.isArray(rule)) return true;
    const x = rule as { field?: unknown; equals?: unknown };
    return typeof x.field === 'string' && answers[x.field] === x.equals;
  }
  private validate(
    fields: Prisma.FormFieldGetPayload<Prisma.FormFieldDefaultArgs>[],
    answers: Record<string, unknown>,
  ) {
    const values: { formFieldId: string; value: Prisma.InputJsonValue }[] = [];
    for (const f of fields) {
      if (!this.visible(f, answers)) continue;
      const raw = answers[f.key];
      const absent =
        raw === undefined || raw === null || raw === '' || (Array.isArray(raw) && raw.length === 0);
      if (f.required && absent) throw formError('Complete all required fields');
      if (absent) continue;
      const options = Array.isArray(f.options)
        ? f.options.filter((x): x is string => typeof x === 'string')
        : [];
      const value: Prisma.InputJsonValue = raw as Prisma.InputJsonValue;
      if (['TEXT', 'TEXTAREA', 'PHONE', 'DATE', 'SELECT', 'RADIO', 'EMAIL'].includes(f.type)) {
        if (typeof raw !== 'string' || raw.length > 4000) throw formError('Invalid field value');
        if ((f.type === 'SELECT' || f.type === 'RADIO') && options.length && !options.includes(raw))
          throw formError('Invalid option');
        if (f.type === 'EMAIL' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw))
          throw formError('Invalid email');
      } else if (f.type === 'NUMBER') {
        if (typeof raw !== 'number' || !Number.isFinite(raw)) throw formError('Invalid number');
      } else if (f.type === 'CHECKBOX') {
        if (
          !Array.isArray(raw) ||
          raw.some((v) => typeof v !== 'string') ||
          raw.some((v) => !options.includes(v as string))
        )
          throw formError('Invalid choice');
      } else if (f.type === 'CONSENT' && raw !== true) throw formError('Consent is required');
      values.push({ formFieldId: f.id, value });
    }
    return values;
  }
  async submit(
    auth: AuthContext | null,
    slug: string,
    input: SubmitRegistrationDto,
    context: AuditContext,
  ) {
    const accountRegistration = input.registrationType !== 'GUEST';
    if (accountRegistration && !auth) throw formError('Sign in to register with a VENTRO account');
    const attendeeEmail = accountRegistration
      ? auth!.user.email
      : normalizeEmail(input.guestEmail ?? '');
    const attendeeName = accountRegistration ? auth!.user.name : (input.guestName ?? '').trim();
    if (!attendeeEmail || !attendeeName) throw formError('Guest name and email are required');
    const locale = accountRegistration
      ? auth!.user.locale === 'ar'
        ? 'ar'
        : 'en'
      : (input.locale ?? 'en');
    const guestAccessToken = accountRegistration ? undefined : randomToken();
    return this.db.$transaction(async (tx) => {
      const event = await tx.event.findFirst({
        where: { slug, status: 'PUBLISHED', visibility: 'PUBLIC' },
        include: { registrationForm: { include: formInclude } },
      });
      if (!event?.registrationForm || event.registrationForm.status !== 'PUBLISHED')
        throw new NotFoundException('Registration is not available');
      await tx.$queryRaw`SELECT "id" FROM "Event" WHERE "id" = ${event.id}::uuid FOR UPDATE`;
      const now = new Date();
      if (event.registrationDeadline && event.registrationDeadline <= now)
        throw formError('Registration has closed');
      const existing = await tx.registration.findUnique({
        where: { eventId_attendeeEmail: { eventId: event.id, attendeeEmail } },
      });
      if (existing) throw new ConflictException('You are already registered for this event');
      if (event.capacity !== null) {
        const count = await tx.registration.count({
          where: { eventId: event.id, status: 'CONFIRMED' },
        });
        if (count >= event.capacity) throw new ConflictException('This event has reached capacity');
      }
      const answers = this.validate(event.registrationForm.fields, input.answers);
      const registration = await tx.registration.create({
        data: {
          eventId: event.id,
          attendeeEmail,
          attendeeName,
          ...(accountRegistration ? { userId: auth!.user.id } : {}),
          answers: { create: answers },
        },
      });
      const ticketSecret = randomBytes(32).toString('base64url');
      const ticketCredential = randomUUID();
      const ticket = await tx.ticket.create({
        data: {
          registrationId: registration.id,
          credential: ticketCredential,
          tokenHash: createHash('sha256').update(ticketSecret).digest('hex'),
          ...(guestAccessToken
            ? {
                guestAccessHash: tokenHash(guestAccessToken),
                guestAccessExpiresAt: new Date(Date.now() + 30 * 86400000),
              }
            : {}),
        },
      });
      const guestTicketUrl = guestAccessToken
        ? this.config.get('AUTH_APP_URL', { infer: true }) +
          '/' +
          locale +
          '/guest-tickets/' +
          ticket.id +
          '?token=' +
          guestAccessToken
        : undefined;
      const emailDelivery = await this.emails.enqueueRegistrationConfirmation(
        tx,
        accountRegistration ? auth!.user : { email: attendeeEmail, locale },
        {
          title: event.title,
          startsAt: event.startsAt,
          timezone: event.timezone,
          locationType: event.locationType,
          venue: event.venue,
          onlineUrl: event.onlineUrl,
        },
        ticketCredential,
        guestTicketUrl,
      );
      if (accountRegistration) {
        const arabic = locale === 'ar';
        await tx.notification.upsert({
          where: { dedupeKey: 'registration-confirmed:' + registration.id },
          create: {
            userId: auth!.user.id,
            organizationId: event.organizationId,
            eventId: event.id,
            kind: 'REGISTRATION_CONFIRMED',
            title: arabic ? 'تم تأكيد تسجيلك' : 'Registration confirmed',
            body: arabic
              ? 'تذكرتك ورمز QR الخاص بها جاهزان في حسابك.'
              : 'Your ticket and check-in QR code are ready in your account.',
            actionUrl: '/' + (arabic ? 'ar' : 'en') + '/tickets',
            dedupeKey: 'registration-confirmed:' + registration.id,
          },
          update: {},
        });
      }
      await this.audit.write(
        accountRegistration ? 'EVENT_REGISTERED' : 'GUEST_EVENT_REGISTERED',
        auth?.user.id ?? null,
        context,
        { eventId: event.id, registrationId: registration.id },
        tx,
        event.organizationId,
      );
      return {
        id: registration.id,
        eventSlug: slug,
        status: registration.status,
        createdAt: registration.createdAt.toISOString(),
        ticketAvailable: true,
        emailNotificationQueued: Boolean(emailDelivery),
        registrationType: accountRegistration ? 'ACCOUNT' : 'GUEST',
      };
    });
  }
  async mine(auth: AuthContext, page: number) {
    const where = { userId: auth.user.id };
    const [rows, total] = await Promise.all([
      this.db.registration.findMany({
        where,
        include: { event: { select: { title: true, slug: true, startsAt: true, timezone: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * 25,
        take: 25,
      }),
      this.db.registration.count({ where }),
    ]);
    return {
      items: rows.map((r) => ({
        id: r.id,
        status: r.status,
        createdAt: r.createdAt.toISOString(),
        event: { ...r.event, startsAt: r.event.startsAt?.toISOString() ?? null },
      })),
      total,
      page,
      pageSize: 25,
    };
  }
  async organizerList(auth: AuthContext, org: string, eventId: string, q: RegistrationListQuery) {
    return this.orgs.withTenant(auth, org, 'events:read', async (tx) => {
      const event = await tx.event.findFirst({ where: { id: eventId, organizationId: org } });
      if (!event) throw new NotFoundException('Event not found');
      const where: Prisma.RegistrationWhereInput = {
        eventId,
        ...(q.status ? { status: q.status as 'CONFIRMED' | 'CANCELLED' } : {}),
        ...(q.q
          ? {
              OR: [
                { attendeeName: { contains: q.q, mode: 'insensitive' } },
                { attendeeEmail: { contains: q.q, mode: 'insensitive' } },
              ],
            }
          : {}),
      };
      const [rows, total] = await Promise.all([
        tx.registration.findMany({
          where,
          include: {
            answers: { include: { formField: { select: { key: true, label: true } } } },
          },
          orderBy: { createdAt: 'desc' },
          skip: (q.page - 1) * 25,
          take: 25,
        }),
        tx.registration.count({ where }),
      ]);
      return {
        items: rows.map((r) => ({
          id: r.id,
          status: r.status,
          createdAt: r.createdAt.toISOString(),
          name: r.attendeeName,
          email: r.attendeeEmail,
          answers: r.answers.map((a) => ({
            key: a.formField.key,
            label: a.formField.label,
            value: a.value,
          })),
        })),
        total,
        page: q.page,
        pageSize: 25,
      };
    });
  }
}
