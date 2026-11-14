import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
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
import { CertificatesService } from './certificates.service';
import {
  PassportVisibilityDto,
  RevokeCertificateDto,
  SaveCertificateTemplateDto,
} from './certificates.dto';

const uuid = new ParseUUIDPipe({ version: '4' });

@ApiTags('Certificates')
@Controller()
export class CertificatesPublicController {
  constructor(private readonly certificates: CertificatesService) {}

  @Get('certificates/verify/:verificationId') verify(
    @Param('verificationId', uuid) verificationId: string,
  ) {
    return this.certificates.verify(verificationId);
  }
  @Get('passports/:slug') publicPassport(@Param('slug') slug: string) {
    return this.certificates.publicPassport(slug);
  }
}

@ApiTags('Certificates')
@ApiCookieAuth('ventro-session')
@Controller()
@UseGuards(OrganizationOriginGuard, AuthRateGuard, SessionGuard, VerifiedEmailGuard)
export class CertificatesController {
  constructor(private readonly certificates: CertificatesService) {}

  @Get('certificates/me') mine(@Req() request: AuthRequest) {
    return this.certificates.mine(authenticated(request));
  }
  @Get('certificates/me/passport') myPassport(@Req() request: AuthRequest) {
    return this.certificates.myPassport(authenticated(request));
  }
  @Patch('certificates/me/passport') @AuthRate('profile') updatePassport(
    @Req() request: AuthRequest,
    @Body() body: PassportVisibilityDto,
  ) {
    return this.certificates.updatePassport(authenticated(request), body);
  }
  @Get('certificates/:certificateId/download') async download(
    @Req() request: AuthRequest,
    @Param('certificateId', uuid) certificateId: string,
    @Res() response: Response,
  ) {
    const certificate = await this.certificates.download(authenticated(request), certificateId);
    response.setHeader('Content-Type', 'application/pdf');
    response.setHeader(
      'Content-Disposition',
      'attachment; filename="ventro-certificate-' + certificate.verificationId + '.pdf"',
    );
    response.setHeader('Cache-Control', 'private, no-store');
    response.send(certificate.pdfData);
  }
  @Get('organizations/:organizationId/events/:eventId/certificate-templates') templates(
    @Req() request: AuthRequest,
    @Param('organizationId', uuid) org: string,
    @Param('eventId', uuid) eventId: string,
  ) {
    return this.certificates.templates(authenticated(request), org, eventId);
  }
  @Post('organizations/:organizationId/events/:eventId/certificate-templates')
  @AuthRate('org-write')
  createTemplate(
    @Req() request: AuthRequest,
    @Param('organizationId', uuid) org: string,
    @Param('eventId', uuid) eventId: string,
    @Body() body: SaveCertificateTemplateDto,
  ) {
    return this.certificates.createTemplate(
      authenticated(request),
      org,
      eventId,
      body,
      auditContext(request),
    );
  }
  @Post('organizations/:organizationId/events/:eventId/certificate-templates/:templateId/issue')
  @HttpCode(200)
  @AuthRate('org-write')
  issue(
    @Req() request: AuthRequest,
    @Param('organizationId', uuid) org: string,
    @Param('eventId', uuid) eventId: string,
    @Param('templateId', uuid) templateId: string,
  ) {
    return this.certificates.issueEligible(
      authenticated(request),
      org,
      eventId,
      templateId,
      auditContext(request),
    );
  }
  @Post('organizations/:organizationId/certificates/:certificateId/revoke')
  @HttpCode(200)
  @AuthRate('org-write')
  revoke(
    @Req() request: AuthRequest,
    @Param('organizationId', uuid) org: string,
    @Param('certificateId', uuid) certificateId: string,
    @Body() body: RevokeCertificateDto,
  ) {
    return this.certificates.revoke(
      authenticated(request),
      org,
      certificateId,
      body,
      auditContext(request),
    );
  }
}
