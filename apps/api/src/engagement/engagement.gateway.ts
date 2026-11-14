import {
  WebSocketGateway,
  SubscribeMessage,
  WebSocketServer,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';
import { AuthCookieService } from '../auth/auth.guards';
import { AuthService } from '../auth/auth.service';
import { ConfigService } from '@nestjs/config';
import type { Environment } from '../config/environment';
import { EngagementService } from './engagement.service';
@WebSocketGateway({ namespace: '/engagement', cors: { origin: true, credentials: true } })
export class EngagementGateway {
  @WebSocketServer() server!: Server;
  constructor(
    private readonly auth: AuthService,
    private readonly cookies: AuthCookieService,
    private readonly engagement: EngagementService,
    private readonly config: ConfigService<Environment, true>,
  ) {}
  private async context(client: Socket) {
    const request = { headers: { cookie: client.handshake.headers.cookie } } as never;
    return this.auth.authenticate(this.cookies.read(request));
  }
  private room(id: string) {
    return 'event:' + id;
  }
  async handleConnection(client: Socket) {
    const origin = client.handshake.headers.origin;
    if (!origin || !this.config.get('WEB_ORIGINS', { infer: true }).includes(origin)) {
      client.disconnect();
      return;
    }
    try {
      await this.context(client);
    } catch {
      client.disconnect();
    }
  }
  emitPoll(eventId: string, poll: unknown) {
    this.server.to(this.room(eventId)).emit('poll:update', poll);
  }
  emitQuestions(eventId: string, questions: unknown) {
    this.server.to(this.room(eventId)).emit('questions:update', questions);
  }
  @SubscribeMessage('room:join') async join(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { eventId: string },
  ) {
    try {
      const auth = await this.context(client);
      await this.engagement.room(auth, body.eventId);
      await client.join(this.room(body.eventId));
      client.emit('room:ready', { eventId: body.eventId });
    } catch {
      client.emit('room:error', { message: 'Event room is unavailable' });
      client.disconnect();
    }
  }
  @SubscribeMessage('poll:vote') async vote(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { pollId: string; optionIds: string[] },
  ) {
    try {
      const result = await this.engagement.vote(
        await this.context(client),
        body.pollId,
        body.optionIds,
      );
      this.server.to(this.room(result.eventId)).emit('poll:results', result);
      client.emit('poll:confirmed', result);
    } catch {
      client.emit('action:error', { message: 'Vote could not be recorded' });
    }
  }
  @SubscribeMessage('question:submit') async ask(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { eventId: string; content: string },
  ) {
    try {
      await this.engagement.ask(await this.context(client), body.eventId, body.content, {
        network: client.handshake.address,
      });
      this.server
        .to(this.room(body.eventId))
        .emit('questions:update', await this.engagement.questions(body.eventId));
    } catch {
      client.emit('action:error', { message: 'Question could not be submitted' });
    }
  }
  @SubscribeMessage('question:upvote') async upvote(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { questionId: string; eventId: string },
  ) {
    try {
      const rows = await this.engagement.upvote(await this.context(client), body.questionId);
      this.server.to(this.room(body.eventId)).emit('questions:update', rows);
    } catch {
      client.emit('action:error', { message: 'Vote could not be recorded' });
    }
  }
}
