import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import {
  AuthRate,
  AuthRateGuard,
  SessionGuard,
  VerifiedEmailGuard,
  authenticated,
  auditContext,
  type AuthRequest,
} from '../auth/auth.guards';
import { OrganizationOriginGuard } from '../organizations/organization.guards';
import { CreatePollDto, QuestionDto, VotePollDto } from './engagement.dto';
import { EngagementService } from './engagement.service';
import { EngagementGateway } from './engagement.gateway';
const uuid = new ParseUUIDPipe({ version: '4' });
@ApiTags('Engagement')
@ApiCookieAuth('ventro-session')
@Controller('engagement')
@UseGuards(OrganizationOriginGuard, AuthRateGuard, SessionGuard, VerifiedEmailGuard)
export class EngagementController {
  constructor(
    private readonly engagement: EngagementService,
    private readonly gateway: EngagementGateway,
  ) {}
  @Get('events/:eventId/room') room(
    @Req() r: AuthRequest,
    @Param('eventId', uuid) eventId: string,
  ) {
    return this.engagement.room(authenticated(r), eventId);
  }
  @Get('events/:eventId/polls') polls(
    @Req() r: AuthRequest,
    @Param('eventId', uuid) eventId: string,
  ) {
    return this.engagement.listPolls(authenticated(r), eventId);
  }
  @Get('events/:eventId/live-polls') livePolls(
    @Req() r: AuthRequest,
    @Param('eventId', uuid) eventId: string,
  ) {
    return this.engagement.livePolls(authenticated(r), eventId);
  }
  @Post('events/:eventId/polls') @AuthRate('org-write') async create(
    @Req() r: AuthRequest,
    @Param('eventId', uuid) eventId: string,
    @Body() body: CreatePollDto,
  ) {
    const poll = await this.engagement.createPoll(
      authenticated(r),
      eventId,
      body.question,
      body.options,
      body.multiple,
      auditContext(r),
    );
    this.gateway.emitPoll(eventId, poll);
    return poll;
  }
  @Post('polls/:pollId/launch') @HttpCode(200) @AuthRate('org-write') async launch(
    @Req() r: AuthRequest,
    @Param('pollId', uuid) pollId: string,
  ) {
    const poll = await this.engagement.transition(
      authenticated(r),
      pollId,
      'launch',
      auditContext(r),
    );
    this.gateway.emitPoll(poll.eventId, poll);
    return poll;
  }
  @Post('polls/:pollId/close') @HttpCode(200) @AuthRate('org-write') async close(
    @Req() r: AuthRequest,
    @Param('pollId', uuid) pollId: string,
  ) {
    const poll = await this.engagement.transition(
      authenticated(r),
      pollId,
      'close',
      auditContext(r),
    );
    this.gateway.emitPoll(poll.eventId, poll);
    return poll;
  }
  @Post('polls/:pollId/vote') @HttpCode(200) @AuthRate('profile') vote(
    @Req() r: AuthRequest,
    @Param('pollId', uuid) pollId: string,
    @Body() body: VotePollDto,
  ) {
    return this.engagement.vote(authenticated(r), pollId, body.optionIds);
  }
  @Get('events/:eventId/questions') questions(
    @Req() r: AuthRequest,
    @Param('eventId', uuid) eventId: string,
  ) {
    return this.engagement
      .room(authenticated(r), eventId)
      .then(() => this.engagement.questions(eventId));
  }
  @Post('events/:eventId/questions') @HttpCode(201) @AuthRate('profile') async ask(
    @Req() r: AuthRequest,
    @Param('eventId', uuid) eventId: string,
    @Body() body: QuestionDto,
  ) {
    const question = await this.engagement.ask(
      authenticated(r),
      eventId,
      body.content,
      auditContext(r),
    );
    this.gateway.emitQuestions(eventId, await this.engagement.questions(eventId));
    return question;
  }
  @Post('questions/:questionId/upvote') @HttpCode(200) @AuthRate('profile') upvote(
    @Req() r: AuthRequest,
    @Param('questionId', uuid) id: string,
  ) {
    return this.engagement.upvote(authenticated(r), id);
  }
  @Post('questions/:questionId/approve') @HttpCode(200) @AuthRate('org-write') approve(
    @Req() r: AuthRequest,
    @Param('questionId', uuid) id: string,
  ) {
    return this.engagement.moderate(authenticated(r), id, 'approve', auditContext(r));
  }
  @Post('questions/:questionId/answer') @HttpCode(200) @AuthRate('org-write') answer(
    @Req() r: AuthRequest,
    @Param('questionId', uuid) id: string,
  ) {
    return this.engagement.moderate(authenticated(r), id, 'answer', auditContext(r));
  }
}
