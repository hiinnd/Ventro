import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { createHash, randomUUID } from 'node:crypto';
import sharp from 'sharp';
import type { AuthContext } from '../auth/auth.service';
import type { AuditContext } from '../auth/audit.service';
import { AuditService } from '../auth/audit.service';
import { PrismaService } from '../database/prisma.service';
import { EventStatus, EventVisibility, Prisma } from '../generated/prisma/client';
import { OrganizationService } from '../organizations/organization.service';
import type { EventDraftDto, PublicEventQuery } from './event.dto';

const include = {
  category: { select: { name: true } },
  media: { where: { kind: 'COVER' as const }, select: { digest: true } },
  speakers: { orderBy: { position: 'asc' as const } },
  sessions: { orderBy: { position: 'asc' as const } },
} satisfies Prisma.EventInclude;
type Row = Prisma.EventGetPayload<{ include: typeof include }>;
const view = (event: Row) => ({
  ...event,
  category: event.category?.name ?? null,
  coverDigest: event.media[0]?.digest ?? null,
  startsAt: event.startsAt?.toISOString() ?? null,
  endsAt: event.endsAt?.toISOString() ?? null,
  registrationDeadline: event.registrationDeadline?.toISOString() ?? null,
  publishedAt: event.publishedAt?.toISOString() ?? null,
  cancelledAt: event.cancelledAt?.toISOString() ?? null,
  updatedAt: event.updatedAt.toISOString(),
  speakers: event.speakers.map((x) => ({ ...x, createdAt: undefined })),
  sessions: event.sessions.map((x) => ({
    ...x,
    startsAt: x.startsAt.toISOString(),
    endsAt: x.endsAt.toISOString(),
    createdAt: undefined,
  })),
});
const slugify = (value: string) =>
  value
    .toLocaleLowerCase('en')
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 95) || 'event';
@Injectable()
export class EventsService {
  constructor(
    private readonly db: PrismaService,
    private readonly organizations: OrganizationService,
    private readonly audit: AuditService,
  ) {}
  private async uniqueSlug(tx: Prisma.TransactionClient, title: string) {
    const base = slugify(title);
    for (let n = 0; n < 20; n++) {
      const slug = base + '-' + (n ? randomUUID().slice(0, 8) : randomUUID().slice(0, 8));
      if (!(await tx.event.findUnique({ where: { slug }, select: { id: true } }))) return slug;
    }
    throw new ConflictException('Unable to reserve event address');
  }
  private dates(input: EventDraftDto) {
    const start = input.startsAt ? new Date(input.startsAt) : undefined,
      end = input.endsAt ? new Date(input.endsAt) : undefined,
      deadline =
        input.registrationDeadline === null
          ? null
          : input.registrationDeadline
            ? new Date(input.registrationDeadline)
            : undefined;
    if (
      (start && Number.isNaN(+start)) ||
      (end && Number.isNaN(+end)) ||
      (deadline && Number.isNaN(+deadline))
    )
      throw new BadRequestException('Invalid schedule');
    if (start && end && end <= start)
      throw new BadRequestException('Event end must be after its start');
    if (start && deadline && deadline > start)
      throw new BadRequestException('Registration deadline must be before the event starts');
    return { start, end, deadline };
  }
  private validatePublish(row: Row) {
    if (
      !row.title.trim() ||
      !row.description.trim() ||
      !row.categoryId ||
      !row.startsAt ||
      !row.endsAt
    )
      throw new BadRequestException(
        'Complete title, description, category and schedule before publishing',
      );
    if (row.locationType === 'VENUE' && !row.venue.trim())
      throw new BadRequestException('A venue is required');
    if (row.locationType === 'ONLINE' && !row.onlineUrl.trim())
      throw new BadRequestException('A secure online URL is required');
    const ordered = [...row.sessions].sort((a, b) => +a.startsAt - +b.startsAt);
    for (let i = 0; i < ordered.length; i++) {
      const s = ordered[i]!;
      if (
        s.endsAt <= s.startsAt ||
        s.startsAt < row.startsAt ||
        s.endsAt > row.endsAt ||
        (i && s.startsAt < ordered[i - 1]!.endsAt)
      )
        throw new BadRequestException(
          'Agenda sessions must be non-overlapping and within the event schedule',
        );
    }
  }
  private async detail(tx: Prisma.TransactionClient, id: string) {
    return view(await tx.event.findUniqueOrThrow({ where: { id }, include }));
  }
  async create(auth: AuthContext, organizationId: string, context: AuditContext) {
    return this.organizations.withTenant(auth, organizationId, 'events:write', async (tx) => {
      const event = await tx.event.create({
        data: { organizationId, slug: await this.uniqueSlug(tx, 'untitled-event') },
        include,
      });
      await this.audit.write(
        'EVENT_CREATED',
        auth.user.id,
        context,
        { eventId: event.id },
        tx,
        organizationId,
      );
      return view(event);
    });
  }
  async list(auth: AuthContext, organizationId: string, page: number) {
    return this.organizations.withTenant(auth, organizationId, 'events:read', async (tx) => {
      const where = { organizationId };
      const [rows, total] = await Promise.all([
        tx.event.findMany({
          where,
          include,
          orderBy: { updatedAt: 'desc' },
          skip: (page - 1) * 25,
          take: 25,
        }),
        tx.event.count({ where }),
      ]);
      return { items: rows.map(view), total, page, pageSize: 25 };
    });
  }
  async get(auth: AuthContext, organizationId: string, id: string) {
    return this.organizations.withTenant(auth, organizationId, 'events:read', async (tx) => {
      const event = await tx.event.findFirst({ where: { id, organizationId }, include });
      if (!event) throw new NotFoundException('Event not found');
      return view(event);
    });
  }
  async save(
    auth: AuthContext,
    organizationId: string,
    id: string,
    input: EventDraftDto,
    context: AuditContext,
  ) {
    return this.organizations.withTenant(auth, organizationId, 'events:write', async (tx) => {
      const current = await tx.event.findFirst({ where: { id, organizationId }, include });
      if (!current) throw new NotFoundException('Event not found');
      if (current.status === 'CANCELLED')
        throw new ConflictException('Cancelled events cannot be edited');
      const d = this.dates(input);
      let categoryId = current.categoryId;
      if (input.category !== undefined) {
        const name = input.category.trim();
        categoryId = name
          ? (
              await tx.eventCategory.upsert({
                where: { organizationId_name: { organizationId, name } },
                create: { organizationId, name },
                update: {},
              })
            ).id
          : null;
      }
      const speakers = input.speakers;
      const data: Prisma.EventUpdateInput = {
        ...(input.title !== undefined ? { title: input.title.trim() } : {}),
        ...(input.description !== undefined ? { description: input.description.trim() } : {}),
        ...(input.visibility !== undefined ? { visibility: input.visibility } : {}),
        ...(input.locationType !== undefined ? { locationType: input.locationType } : {}),
        ...(input.venue !== undefined ? { venue: input.venue.trim() } : {}),
        ...(input.onlineUrl !== undefined ? { onlineUrl: input.onlineUrl.trim() } : {}),
        ...(input.timezone !== undefined ? { timezone: input.timezone.trim() } : {}),
        ...(input.capacity !== undefined ? { capacity: input.capacity } : {}),
        ...(input.startsAt !== undefined ? { startsAt: d.start } : {}),
        ...(input.endsAt !== undefined ? { endsAt: d.end } : {}),
        ...(input.registrationDeadline !== undefined ? { registrationDeadline: d.deadline } : {}),
        category: categoryId ? { connect: { id: categoryId } } : { disconnect: true },
      };
      await tx.event.update({ where: { id }, data });
      if (speakers !== undefined) {
        await tx.eventSpeaker.deleteMany({ where: { eventId: id } });
        if (speakers.length)
          await tx.eventSpeaker.createMany({
            data: speakers.map((s, position) => ({
              eventId: id,
              name: s.name.trim(),
              title: s.title?.trim() ?? '',
              bio: s.bio?.trim() ?? '',
              position,
            })),
          });
      }
      if (input.sessions !== undefined) {
        const speakerRows = await tx.eventSpeaker.findMany({
          where: { eventId: id },
          orderBy: { position: 'asc' },
        });
        await tx.eventSession.deleteMany({ where: { eventId: id } });
        if (input.sessions.length)
          await tx.eventSession.createMany({
            data: input.sessions.map((s, position) => ({
              eventId: id,
              title: s.title.trim(),
              description: s.description?.trim() ?? '',
              startsAt: new Date(s.startsAt),
              endsAt: new Date(s.endsAt),
              position,
              speakerId:
                s.speakerIndex === undefined ? null : (speakerRows[s.speakerIndex]?.id ?? null),
            })),
          });
      }
      const saved = await tx.event.findUniqueOrThrow({ where: { id }, include });
      if (saved.status === 'PUBLISHED') this.validatePublish(saved);
      await this.audit.write(
        'EVENT_DRAFT_SAVED',
        auth.user.id,
        context,
        { eventId: id },
        tx,
        organizationId,
      );
      return view(saved);
    });
  }
  async transition(
    auth: AuthContext,
    organizationId: string,
    id: string,
    action: 'publish' | 'unpublish' | 'cancel',
    context: AuditContext,
  ) {
    const permission =
      action === 'cancel' || action === 'unpublish' ? 'events:state' : 'events:publish';
    return this.organizations.withTenant(auth, organizationId, permission, async (tx) => {
      const row = await tx.event.findFirst({ where: { id, organizationId }, include });
      if (!row) throw new NotFoundException('Event not found');
      if (action === 'publish') {
        this.validatePublish(row);
        await tx.event.update({
          where: { id },
          data: { status: 'PUBLISHED', publishedAt: new Date(), cancelledAt: null },
        });
      } else if (action === 'unpublish') {
        if (row.status !== 'PUBLISHED')
          throw new ConflictException('Only published events can be unpublished');
        await tx.event.update({ where: { id }, data: { status: 'UNPUBLISHED' } });
      } else {
        if (row.status === 'CANCELLED') throw new ConflictException('Event is already cancelled');
        await tx.event.update({
          where: { id },
          data: { status: 'CANCELLED', cancelledAt: new Date() },
        });
      }
      await this.audit.write(
        'EVENT_' + action.toUpperCase(),
        auth.user.id,
        context,
        { eventId: id },
        tx,
        organizationId,
      );
      return this.detail(tx, id);
    });
  }
  async duplicate(auth: AuthContext, organizationId: string, id: string, context: AuditContext) {
    return this.organizations.withTenant(auth, organizationId, 'events:write', async (tx) => {
      const src = await tx.event.findFirst({ where: { id, organizationId }, include });
      if (!src) throw new NotFoundException('Event not found');
      const copy = await tx.event.create({
        data: {
          organizationId,
          categoryId: src.categoryId,
          title: src.title + ' (copy)',
          description: src.description,
          slug: await this.uniqueSlug(tx, src.title + ' copy'),
          visibility: src.visibility,
          locationType: src.locationType,
          venue: src.venue,
          onlineUrl: src.onlineUrl,
          timezone: src.timezone,
          capacity: src.capacity,
        },
        include,
      });
      if (src.speakers.length)
        await tx.eventSpeaker.createMany({
          data: src.speakers.map((s, p) => ({
            eventId: copy.id,
            name: s.name,
            title: s.title,
            bio: s.bio,
            position: p,
          })),
        });
      const copiedSpeakers = await tx.eventSpeaker.findMany({
        where: { eventId: copy.id },
        orderBy: { position: 'asc' },
        select: { id: true },
      });
      if (src.sessions.length)
        await tx.eventSession.createMany({
          data: src.sessions.map((s, p) => ({
            eventId: copy.id,
            title: s.title,
            description: s.description,
            startsAt: s.startsAt,
            endsAt: s.endsAt,
            position: p,
            speakerId:
              s.speakerId === null
                ? null
                : (copiedSpeakers[src.speakers.findIndex((x) => x.id === s.speakerId)]?.id ?? null),
          })),
        });
      await this.audit.write(
        'EVENT_DUPLICATED',
        auth.user.id,
        context,
        { eventId: copy.id, sourceEventId: id },
        tx,
        organizationId,
      );
      return this.detail(tx, copy.id);
    });
  }
  async cover(
    auth: AuthContext,
    organizationId: string,
    id: string,
    file: Express.Multer.File,
    context: AuditContext,
  ) {
    return this.organizations.withTenant(auth, organizationId, 'events:write', async (tx) => {
      if (!file || file.size > 2 * 1024 * 1024)
        throw new BadRequestException('Use a PNG, JPEG or WebP image up to 2 MiB');
      const event = await tx.event.findFirst({ where: { id, organizationId } });
      if (!event) throw new NotFoundException('Event not found');
      let data: Buffer;
      try {
        data = await sharp(file.buffer, { animated: false, limitInputPixels: 16_000_000 })
          .rotate()
          .resize(1600, 900, { fit: 'cover', withoutEnlargement: true })
          .png()
          .toBuffer();
      } catch {
        throw new BadRequestException('Invalid cover image');
      }
      if (data.length > 700 * 1024) throw new BadRequestException('Optimized cover is too large');
      const digest = createHash('sha256').update(data).digest('hex');
      const stored = new Uint8Array(data);
      await tx.eventMedia.upsert({
        where: { eventId_kind: { eventId: id, kind: 'COVER' } },
        create: { eventId: id, kind: 'COVER', data: stored, mimeType: 'image/png', digest },
        update: { data: stored, mimeType: 'image/png', digest },
      });
      await this.audit.write(
        'EVENT_COVER_UPDATED',
        auth.user.id,
        context,
        { eventId: id },
        tx,
        organizationId,
      );
      return this.detail(tx, id);
    });
  }
  async publicList(query: PublicEventQuery) {
    const q = query.q?.trim(),
      category = query.category?.trim();
    const where: Prisma.EventWhereInput = {
      status: EventStatus.PUBLISHED,
      visibility: EventVisibility.PUBLIC,
      ...(q
        ? {
            OR: [
              { title: { contains: q, mode: 'insensitive' } },
              { description: { contains: q, mode: 'insensitive' } },
            ],
          }
        : {}),
      ...(category ? { category: { name: { equals: category, mode: 'insensitive' } } } : {}),
    };
    const [rows, total] = await Promise.all([
      this.db.event.findMany({
        where,
        include,
        orderBy: { startsAt: 'asc' },
        skip: (query.page - 1) * 25,
        take: 25,
      }),
      this.db.event.count({ where }),
    ]);
    return { items: rows.map(view), total, page: query.page, pageSize: 25 };
  }
  async publicDetail(slug: string) {
    const row = await this.db.event.findFirst({
      where: { slug, status: 'PUBLISHED', visibility: 'PUBLIC' },
      include,
    });
    if (!row) throw new NotFoundException('Event not found');
    return view(row);
  }
  async publicCover(slug: string) {
    const event = await this.db.event.findFirst({
      where: { slug, status: 'PUBLISHED', visibility: 'PUBLIC' },
      select: { media: { where: { kind: 'COVER' }, select: { data: true, mimeType: true } } },
    });
    const cover = event?.media[0];
    if (!cover) throw new NotFoundException('Cover not found');
    return cover;
  }
}
