import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  Res,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
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
import { GuestTicketQuery, ScanTicketDto } from './ticketing.dto';
import { TicketingService } from './ticketing.service';
const uuid = new ParseUUIDPipe({ version: '4' });
@ApiTags('Tickets')
@ApiCookieAuth('ventro-session')
@Controller()
@UseGuards(OrganizationOriginGuard, AuthRateGuard, SessionGuard, VerifiedEmailGuard)
export class TicketingController {
  constructor(private readonly ticketing: TicketingService) {}
  @Get('tickets/me') mine(@Req() request: AuthRequest) {
    return this.ticketing.mine(authenticated(request));
  }
  @Get('tickets/:ticketId/download') async download(
    @Req() request: AuthRequest,
    @Param('ticketId', uuid) ticketId: string,
    @Res() response: Response,
  ) {
    const pdf = await this.ticketing.download(authenticated(request), ticketId);
    response.setHeader('Content-Type', 'application/pdf');
    response.setHeader('Content-Disposition', 'attachment; filename="ventro-ticket.pdf"');
    response.send(pdf);
  }
  @Get('organizations/:organizationId/events/:eventId/check-in') dashboard(
    @Req() request: AuthRequest,
    @Param('organizationId', uuid) org: string,
    @Param('eventId', uuid) eventId: string,
  ) {
    return this.ticketing.dashboard(authenticated(request), org, eventId);
  }
  @Post('organizations/:organizationId/tickets/:ticketId/revoke')
  @HttpCode(200)
  @AuthRate('org-write')
  revoke(
    @Req() request: AuthRequest,
    @Param('organizationId', uuid) org: string,
    @Param('ticketId', uuid) ticketId: string,
  ) {
    return this.ticketing.revoke(authenticated(request), org, ticketId, auditContext(request));
  }
  @Post('organizations/:organizationId/events/:eventId/check-in/scan')
  @HttpCode(200)
  @AuthRate('org-write')
  scan(
    @Req() request: AuthRequest,
    @Param('organizationId', uuid) org: string,
    @Param('eventId', uuid) eventId: string,
    @Body() body: ScanTicketDto,
  ) {
    return this.ticketing.scan(authenticated(request), org, eventId, body, auditContext(request));
  }
}

@ApiTags('Guest tickets')
@Controller('guest-tickets')
@UseGuards(OrganizationOriginGuard, AuthRateGuard)
export class GuestTicketController {
  constructor(private readonly ticketing: TicketingService) {}
  @Get(':ticketId') @AuthRate('profile') view(
    @Param('ticketId', uuid) ticketId: string,
    @Query() query: GuestTicketQuery,
  ) {
    return this.ticketing.guest(ticketId, query.token);
  }
  @Get(':ticketId/download') @AuthRate('profile') async download(
    @Param('ticketId', uuid) ticketId: string,
    @Query() query: GuestTicketQuery,
    @Res() response: Response,
  ) {
    const pdf = await this.ticketing.guestPdf(ticketId, query.token);
    response.setHeader('Content-Type', 'application/pdf');
    response.setHeader('Content-Disposition', 'attachment; filename="ventro-guest-ticket.pdf"');
    response.send(pdf);
  }
}
