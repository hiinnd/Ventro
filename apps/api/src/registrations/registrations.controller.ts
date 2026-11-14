import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
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
import { RegistrationListQuery, SaveFormDto, SubmitRegistrationDto } from './registration.dto';
import { RegistrationsService } from './registrations.service';
const uuid = new ParseUUIDPipe({ version: '4' });
@ApiTags('Registrations')
@ApiCookieAuth('ventro-session')
@Controller('organizations/:organizationId/events/:eventId/registration-form')
@UseGuards(OrganizationOriginGuard, AuthRateGuard, SessionGuard, VerifiedEmailGuard)
export class RegistrationController {
  constructor(private readonly registrations: RegistrationsService) {}
  @Get() get(
    @Req() r: AuthRequest,
    @Param('organizationId', uuid) org: string,
    @Param('eventId', uuid) eventId: string,
  ) {
    return this.registrations.getOrganizerForm(authenticated(r), org, eventId);
  }
  @Post() @AuthRate('org-write') save(
    @Req() r: AuthRequest,
    @Param('organizationId', uuid) org: string,
    @Param('eventId', uuid) eventId: string,
    @Body() body: SaveFormDto,
  ) {
    return this.registrations.saveForm(authenticated(r), org, eventId, body, auditContext(r));
  }
  @Post('publish') @HttpCode(200) @AuthRate('org-write') publish(
    @Req() r: AuthRequest,
    @Param('organizationId', uuid) org: string,
    @Param('eventId', uuid) eventId: string,
  ) {
    return this.registrations.publishForm(authenticated(r), org, eventId, auditContext(r));
  }
}
@ApiTags('Registrations')
@ApiCookieAuth('ventro-session')
@Controller()
@UseGuards(OrganizationOriginGuard, AuthRateGuard, SessionGuard, VerifiedEmailGuard)
export class PublicRegistrationController {
  constructor(private readonly registrations: RegistrationsService) {}
  @Get('events/:slug/registration-form') form(@Param('slug') slug: string) {
    return this.registrations.publicForm(slug);
  }
  @Post('events/:slug/registrations') @HttpCode(201) @AuthRate('org-write') submit(
    @Req() r: AuthRequest,
    @Param('slug') slug: string,
    @Body() body: SubmitRegistrationDto,
  ) {
    return this.registrations.submit(authenticated(r), slug, body, auditContext(r));
  }
  @Get('registrations/me') mine(@Req() r: AuthRequest, @Query() q: RegistrationListQuery) {
    return this.registrations.mine(authenticated(r), q.page);
  }
  @Get('organizations/:organizationId/events/:eventId/registrations') list(
    @Req() r: AuthRequest,
    @Param('organizationId', uuid) org: string,
    @Param('eventId', uuid) eventId: string,
    @Query() q: RegistrationListQuery,
  ) {
    return this.registrations.organizerList(authenticated(r), org, eventId, q);
  }
}
