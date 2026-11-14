import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiConsumes, ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import type {} from 'multer';
import {
  AuthRate,
  AuthRateGuard,
  SessionGuard,
  VerifiedEmailGuard,
  authenticated,
  auditContext,
  type AuthRequest,
} from '../auth/auth.guards';
import { TokenDto } from '../auth/auth.dto';
import {
  AssignRoleDto,
  CreateOrganizationDto,
  InviteMemberDto,
  OrganizationProfileDto,
  PageDto,
} from './organization.dto';
import { OrganizationOriginGuard, PlatformAdminGuard } from './organization.guards';
import { OrganizationService } from './organization.service';
import { DashboardService } from './dashboard.service';
import {
  DashboardActivityQuery,
  DashboardOverviewQuery,
  DashboardSearchDto,
  AnalyticsQuery,
} from './dashboard.dto';

const uuid = new ParseUUIDPipe({ version: '4' });
@ApiTags('Organizations')
@ApiCookieAuth('ventro-session')
@Controller('organizations')
@AuthRate('org-read')
@UseGuards(OrganizationOriginGuard, AuthRateGuard, SessionGuard, VerifiedEmailGuard)
export class OrganizationController {
  constructor(
    private readonly organizations: OrganizationService,
    private readonly dashboard: DashboardService,
  ) {}
  @Get()
  list(@Req() req: AuthRequest, @Query() query: PageDto) {
    return this.organizations.list(authenticated(req), query.page);
  }
  @Post()
  @AuthRate('org-write')
  create(@Req() req: AuthRequest, @Body() body: CreateOrganizationDto) {
    return this.organizations.create(authenticated(req), body, auditContext(req));
  }
  @Get('invitations')
  inbox(@Req() req: AuthRequest, @Query() query: PageDto) {
    return this.organizations.inbox(authenticated(req), query.page);
  }
  @Post('invitations/resolve')
  @HttpCode(200)
  @AuthRate('org-write')
  resolve(@Req() req: AuthRequest, @Body() body: TokenDto) {
    return this.organizations.resolveInvitation(authenticated(req), body.token);
  }
  @Post('invitations/:invitationId/accept')
  @HttpCode(200)
  @AuthRate('org-write')
  accept(@Req() req: AuthRequest, @Param('invitationId', uuid) id: string) {
    return this.organizations.respond(authenticated(req), id, true, auditContext(req));
  }
  @Post('invitations/:invitationId/reject')
  @HttpCode(200)
  @AuthRate('org-write')
  reject(@Req() req: AuthRequest, @Param('invitationId', uuid) id: string) {
    return this.organizations.respond(authenticated(req), id, false, auditContext(req));
  }
  @Get('dashboard-options')
  dashboardOptions(@Req() req: AuthRequest, @Query() query: PageDto) {
    return this.dashboard.options(authenticated(req), query.page);
  }
  @Get(':organizationId/dashboard/overview')
  overview(
    @Req() req: AuthRequest,
    @Param('organizationId', uuid) id: string,
    @Query() query: DashboardOverviewQuery,
  ) {
    return this.dashboard.overview(authenticated(req), id, query);
  }
  @Get(':organizationId/dashboard/activity')
  activity(
    @Req() req: AuthRequest,
    @Param('organizationId', uuid) id: string,
    @Query() query: DashboardActivityQuery,
  ) {
    return this.dashboard.activity(authenticated(req), id, query);
  }
  @Get(':organizationId/dashboard/notices')
  notices(@Req() req: AuthRequest, @Param('organizationId', uuid) id: string) {
    return this.dashboard.notices(authenticated(req), id);
  }
  @Get(':organizationId/dashboard/analytics')
  analytics(
    @Req() req: AuthRequest,
    @Param('organizationId', uuid) id: string,
    @Query() query: AnalyticsQuery,
  ) {
    return this.dashboard.analytics(authenticated(req), id, query);
  }
  @Post(':organizationId/dashboard/search')
  @HttpCode(200)
  search(
    @Req() req: AuthRequest,
    @Param('organizationId', uuid) id: string,
    @Body() body: DashboardSearchDto,
  ) {
    return this.dashboard.search(authenticated(req), id, body);
  }
  @Get(':organizationId')
  get(@Req() req: AuthRequest, @Param('organizationId', uuid) id: string) {
    return this.organizations.get(authenticated(req), id);
  }
  @Patch(':organizationId')
  @AuthRate('org-write')
  update(
    @Req() req: AuthRequest,
    @Param('organizationId', uuid) id: string,
    @Body() body: OrganizationProfileDto,
  ) {
    return this.organizations.update(authenticated(req), id, body, auditContext(req));
  }
  @Post(':organizationId/activate')
  @HttpCode(200)
  @AuthRate('org-write')
  activate(@Req() req: AuthRequest, @Param('organizationId', uuid) id: string) {
    return this.organizations.activate(authenticated(req), id, auditContext(req));
  }
  @Get(':organizationId/members')
  members(
    @Req() req: AuthRequest,
    @Param('organizationId', uuid) id: string,
    @Query() query: PageDto,
  ) {
    return this.organizations.members(authenticated(req), id, query.page);
  }
  @Patch(':organizationId/members/:userId')
  @AuthRate('org-write')
  role(
    @Req() req: AuthRequest,
    @Param('organizationId', uuid) id: string,
    @Param('userId', uuid) userId: string,
    @Body() body: AssignRoleDto,
  ) {
    return this.organizations.changeMember(
      authenticated(req),
      id,
      userId,
      body.role,
      auditContext(req),
    );
  }
  @Delete(':organizationId/members/:userId')
  @AuthRate('org-write')
  remove(
    @Req() req: AuthRequest,
    @Param('organizationId', uuid) id: string,
    @Param('userId', uuid) userId: string,
  ) {
    return this.organizations.changeMember(
      authenticated(req),
      id,
      userId,
      undefined,
      auditContext(req),
    );
  }
  @Get(':organizationId/invitations')
  invites(
    @Req() req: AuthRequest,
    @Param('organizationId', uuid) id: string,
    @Query() query: PageDto,
  ) {
    return this.organizations.invitations(authenticated(req), id, query.page);
  }
  @Post(':organizationId/invitations')
  @AuthRate('org-invite')
  invite(
    @Req() req: AuthRequest,
    @Param('organizationId', uuid) id: string,
    @Body() body: InviteMemberDto,
  ) {
    return this.organizations.invite(authenticated(req), id, body, auditContext(req));
  }
  @Delete(':organizationId/invitations/:invitationId')
  @AuthRate('org-write')
  revoke(
    @Req() req: AuthRequest,
    @Param('organizationId', uuid) id: string,
    @Param('invitationId', uuid) invitationId: string,
  ) {
    return this.organizations.revoke(authenticated(req), id, invitationId, auditContext(req));
  }
  @Post(':organizationId/logo')
  @AuthRate('org-write')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('logo', {
      limits: { fileSize: 2 * 1024 * 1024, files: 1, fields: 0, parts: 2 },
    }),
  )
  upload(
    @Req() req: AuthRequest,
    @Param('organizationId', uuid) id: string,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.organizations.saveLogo(authenticated(req), id, file, auditContext(req));
  }
  @Get(':organizationId/logo')
  async logo(
    @Req() req: AuthRequest,
    @Param('organizationId', uuid) id: string,
    @Res() response: Response,
  ) {
    const image = await this.organizations.logo(authenticated(req), id);
    response.setHeader('Content-Type', 'image/png');
    response.setHeader('Content-Disposition', 'inline');
    response.send(image);
  }
  @Delete(':organizationId/logo')
  @AuthRate('org-write')
  removeLogo(@Req() req: AuthRequest, @Param('organizationId', uuid) id: string) {
    return this.organizations.removeLogo(authenticated(req), id, auditContext(req));
  }
}

@ApiTags('Platform')
@ApiCookieAuth('ventro-session')
@Controller('platform')
@AuthRate('org-read')
@UseGuards(
  OrganizationOriginGuard,
  AuthRateGuard,
  SessionGuard,
  VerifiedEmailGuard,
  PlatformAdminGuard,
)
export class PlatformController {
  constructor(private readonly organizations: OrganizationService) {}
  @Get('organizations')
  list(@Req() req: AuthRequest, @Query() query: PageDto) {
    return this.organizations.platformList(authenticated(req), query.page);
  }
}
