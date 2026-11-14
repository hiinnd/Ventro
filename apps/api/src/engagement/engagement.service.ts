import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { AuthContext } from '../auth/auth.service';
import { AuditService, type AuditContext } from '../auth/audit.service';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class EngagementService {
  constructor(
    private readonly db: PrismaService,
    private readonly audit: AuditService,
  ) {}
  private async organizer(auth: AuthContext, eventId: string) {
    const event = await this.db.event.findUnique({
      where: { id: eventId },
      select: { id: true, organizationId: true },
    });
    if (!event) throw new NotFoundException('Event not found');
    const member = await this.db.organizationMember.findUnique({
      where: {
        organizationId_userId: { organizationId: event.organizationId, userId: auth.user.id },
      },
    });
    if (!member || !['OWNER', 'EVENT_MANAGER'].includes(member.role))
      throw new NotFoundException('Event not found');
    return event;
  }
  async room(auth: AuthContext, eventId: string) {
    const event = await this.db.event.findFirst({
      where: { id: eventId, status: 'PUBLISHED' },
      select: { id: true, organizationId: true },
    });
    if (!event) throw new NotFoundException('Event room is unavailable');
    const [member, registration] = await Promise.all([
      this.db.organizationMember.count({
        where: { organizationId: event.organizationId, userId: auth.user.id },
      }),
      this.db.registration.count({ where: { eventId, userId: auth.user.id, status: 'CONFIRMED' } }),
    ]);
    if (!member && !registration) throw new NotFoundException('Event room is unavailable');
    return event;
  }
  private viewPoll(poll: {
    id: string;
    eventId: string;
    question: string;
    multiple: boolean;
    status: string;
    options: { id: string; label: string; _count: { votes: number } }[];
  }) {
    return {
      id: poll.id,
      eventId: poll.eventId,
      question: poll.question,
      multiple: poll.multiple,
      status: poll.status,
      options: poll.options.map((option) => ({
        id: option.id,
        label: option.label,
        votes: option._count.votes,
      })),
    };
  }
  async createPoll(
    auth: AuthContext,
    eventId: string,
    question: string,
    options: string[],
    multiple: boolean,
    context: AuditContext,
  ) {
    const event = await this.organizer(auth, eventId);
    const cleaned = options.map((option) => option.trim()).filter(Boolean);
    if (
      !question.trim() ||
      cleaned.length < 2 ||
      cleaned.length > 20 ||
      new Set(cleaned.map((option) => option.toLowerCase())).size !== cleaned.length
    )
      throw new BadRequestException('A poll needs two to twenty unique options');
    const poll = await this.db.poll.create({
      data: {
        eventId,
        createdById: auth.user.id,
        question: question.trim(),
        multiple,
        options: { create: cleaned.map((label, position) => ({ label, position })) },
      },
      include: {
        options: { orderBy: { position: 'asc' }, include: { _count: { select: { votes: true } } } },
      },
    });
    await this.audit.write(
      'POLL_CREATED',
      auth.user.id,
      context,
      { pollId: poll.id, eventId },
      this.db,
      event.organizationId,
    );
    return this.viewPoll(poll);
  }
  async transition(
    auth: AuthContext,
    pollId: string,
    action: 'launch' | 'close',
    context: AuditContext,
  ) {
    const poll = await this.db.poll.findUnique({
      where: { id: pollId },
      select: { eventId: true, status: true },
    });
    if (!poll) throw new NotFoundException('Poll not found');
    const event = await this.organizer(auth, poll.eventId);
    if (
      (action === 'launch' && poll.status !== 'DRAFT') ||
      (action === 'close' && poll.status !== 'LIVE')
    )
      throw new ConflictException('Poll cannot change state');
    const updated = await this.db.poll.update({
      where: { id: pollId },
      data:
        action === 'launch'
          ? { status: 'LIVE', launchedAt: new Date() }
          : { status: 'CLOSED', closedAt: new Date() },
      include: {
        options: { orderBy: { position: 'asc' }, include: { _count: { select: { votes: true } } } },
      },
    });
    await this.audit.write(
      'POLL_' + action.toUpperCase(),
      auth.user.id,
      context,
      { pollId, eventId: poll.eventId },
      this.db,
      event.organizationId,
    );
    return this.viewPoll(updated);
  }
  async listPolls(auth: AuthContext, eventId: string) {
    await this.organizer(auth, eventId);
    const polls = await this.db.poll.findMany({
      where: { eventId },
      include: {
        options: { orderBy: { position: 'asc' }, include: { _count: { select: { votes: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return { items: polls.map((poll) => this.viewPoll(poll)) };
  }
  async livePolls(auth: AuthContext, eventId: string) {
    await this.room(auth, eventId);
    const polls = await this.db.poll.findMany({
      where: { eventId, status: 'LIVE' },
      include: {
        options: { orderBy: { position: 'asc' }, include: { _count: { select: { votes: true } } } },
      },
      orderBy: { launchedAt: 'desc' },
    });
    return { items: polls.map((poll) => this.viewPoll(poll)) };
  }
  async vote(auth: AuthContext, pollId: string, optionIds: string[]) {
    const poll = await this.db.poll.findUnique({
      where: { id: pollId },
      include: { options: true },
    });
    if (!poll || poll.status !== 'LIVE') throw new ConflictException('Poll is closed');
    await this.room(auth, poll.eventId);
    const ids = [...new Set(optionIds)];
    if (
      !ids.length ||
      (!poll.multiple && ids.length !== 1) ||
      ids.some((id) => !poll.options.some((option) => option.id === id))
    )
      throw new BadRequestException('Invalid poll choices');
    await this.db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "Poll" WHERE "id" = ${pollId}::uuid FOR UPDATE`;
      const fresh = await tx.poll.findUniqueOrThrow({
        where: { id: pollId },
        select: { status: true },
      });
      if (fresh.status !== 'LIVE') throw new ConflictException('Poll is closed');
      if (await tx.pollVote.count({ where: { pollId, userId: auth.user.id } }))
        throw new ConflictException('You have already voted');
      await tx.pollVote.createMany({
        data: ids.map((optionId) => ({ pollId, optionId, userId: auth.user.id })),
      });
    });
    return this.results(pollId);
  }
  async results(pollId: string) {
    const poll = await this.db.poll.findUnique({
      where: { id: pollId },
      include: {
        options: { orderBy: { position: 'asc' }, include: { _count: { select: { votes: true } } } },
      },
    });
    if (!poll) throw new NotFoundException('Poll not found');
    return this.viewPoll(poll);
  }
  async ask(auth: AuthContext, eventId: string, content: string, context: AuditContext) {
    const event = await this.room(auth, eventId);
    if (!content.trim() || content.trim().length > 1000)
      throw new BadRequestException('Question must contain up to 1000 characters');
    const question = await this.db.question.create({
      data: { eventId, userId: auth.user.id, content: content.trim() },
    });
    await this.audit.write(
      'QUESTION_SUBMITTED',
      auth.user.id,
      context,
      { questionId: question.id, eventId },
      this.db,
      event.organizationId,
    );
    return question;
  }
  async upvote(auth: AuthContext, questionId: string) {
    const question = await this.db.question.findUnique({ where: { id: questionId } });
    if (!question) throw new NotFoundException('Question not found');
    await this.room(auth, question.eventId);
    try {
      await this.db.questionVote.create({ data: { questionId, userId: auth.user.id } });
    } catch (error) {
      if ((error as { code?: string }).code === 'P2002')
        throw new ConflictException('You have already voted');
      throw error;
    }
    return this.questions(question.eventId);
  }
  async moderate(
    auth: AuthContext,
    questionId: string,
    action: 'approve' | 'answer',
    context: AuditContext,
  ) {
    const question = await this.db.question.findUnique({ where: { id: questionId } });
    if (!question) throw new NotFoundException('Question not found');
    const event = await this.organizer(auth, question.eventId);
    const updated = await this.db.question.update({
      where: { id: questionId },
      data: action === 'approve' ? { moderatedAt: null } : { answeredAt: new Date() },
    });
    await this.audit.write(
      action === 'approve' ? 'QUESTION_APPROVED' : 'QUESTION_ANSWERED',
      auth.user.id,
      context,
      { questionId, eventId: event.id },
      this.db,
      event.organizationId,
    );
    return updated;
  }
  async questions(eventId: string) {
    const rows = await this.db.question.findMany({
      where: { eventId, moderatedAt: null },
      include: { _count: { select: { votes: true } } },
      orderBy: [{ votes: { _count: 'desc' } }, { createdAt: 'asc' }],
    });
    return rows.map((x) => ({
      id: x.id,
      content: x.content,
      answeredAt: x.answeredAt?.toISOString() ?? null,
      votes: x._count.votes,
    }));
  }
}
