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
import { ScanTicketDto } from './ticketing.dto';
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
