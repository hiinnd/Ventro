import {
  Body,
  Controller,
  ForbiddenException,
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
  AuthCookieService,
  AuthService,
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
@Controller()
@UseGuards(OrganizationOriginGuard, AuthRateGuard)
export class PublicRegistrationController {
  constructor(
    private readonly registrations: RegistrationsService,
    private readonly auth: AuthService,
    private readonly cookies: AuthCookieService,
  ) {}
  @Get('events/:slug/registration-form') form(@Param('slug') slug: string) {
    return this.registrations.publicForm(slug);
  }
  @Post('events/:slug/registrations') @HttpCode(201) @AuthRate('org-write') submit(
    @Req() r: AuthRequest,
    @Param('slug') slug: string,
    @Body() body: SubmitRegistrationDto,
  ) {
    return this.submitRegistration(r, slug, body);
  }
  private async submitRegistration(r: AuthRequest, slug: string, body: SubmitRegistrationDto) {
    let account = null;
    try {
      account = await this.auth.authenticate(this.cookies.read(r));
    } catch {
      // A guest flow deliberately works without a session; it never trusts a client account ID.
    }
    if (body.registrationType !== 'GUEST' && (!account || !account.user.emailVerifiedAt))
      throw new ForbiddenException('Sign in with a verified VENTRO account to register this way');
    return this.registrations.submit(account, slug, body, auditContext(r));
  }
  @Get('registrations/me') @UseGuards(SessionGuard, VerifiedEmailGuard) mine(
    @Req() r: AuthRequest,
    @Query() q: RegistrationListQuery,
  ) {
    return this.registrations.mine(authenticated(r), q.page);
  }
  @Get('organizations/:organizationId/events/:eventId/registrations')
  @UseGuards(SessionGuard, VerifiedEmailGuard)
  list(
    @Req() r: AuthRequest,
    @Param('organizationId', uuid) org: string,
    @Param('eventId', uuid) eventId: string,
    @Query() q: RegistrationListQuery,
  ) {
    return this.registrations.organizerList(authenticated(r), org, eventId, q);
  }
}
