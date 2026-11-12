import { Body, Controller, Get, HttpCode, Patch, Post, Req, Res, UseGuards } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { AuthService } from './auth.service';
import {
  AuthCookieService,
  AuthOriginGuard,
  AuthRate,
  AuthRateGuard,
  authenticated,
  auditContext,
  SessionGuard,
  type AuthRequest,
} from './auth.guards';
import {
  EmailDto,
  LoginDto,
  RegisterDto,
  ResetPasswordDto,
  TokenDto,
  UpdateProfileDto,
} from './auth.dto';

@ApiTags('Authentication')
@Controller('auth')
@UseGuards(AuthOriginGuard, AuthRateGuard)
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly cookies: AuthCookieService,
  ) {}
  @Post('register')
  @HttpCode(202)
  @AuthRate('register')
  @ApiOperation({
    summary:
      'Register a password account; returns the same accepted response for existing addresses',
  })
  register(@Body() body: RegisterDto, @Req() request: AuthRequest) {
    return this.auth.register(body, auditContext(request));
  }
  @Post('login')
  @HttpCode(200)
  @AuthRate('login')
  async login(
    @Body() body: LoginDto,
    @Req() request: AuthRequest,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.auth.login(body.email, body.password, auditContext(request));
    this.cookies.set(response, result.token, result.session.expiresAt);
    return this.auth.sessionResponse(result);
  }
  @Post('logout')
  @HttpCode(204)
  @AuthRate('logout')
  async logout(@Req() request: AuthRequest, @Res({ passthrough: true }) response: Response) {
    await this.auth.logout(this.cookies.read(request), auditContext(request));
    this.cookies.clear(response);
  }
  @Get('session')
  @AuthRate('profile')
  @UseGuards(SessionGuard)
  @ApiCookieAuth('ventro-session')
  session(@Req() request: AuthRequest) {
    return this.auth.sessionResponse(authenticated(request));
  }
  @Get('profile')
  @AuthRate('profile')
  @UseGuards(SessionGuard)
  @ApiCookieAuth('ventro-session')
  profile(@Req() request: AuthRequest) {
    return this.auth.publicUser(authenticated(request).user);
  }
  @Patch('profile')
  @AuthRate('profile')
  @UseGuards(SessionGuard)
  @ApiCookieAuth('ventro-session')
  updateProfile(@Body() body: UpdateProfileDto, @Req() request: AuthRequest) {
    return this.auth.updateProfile(authenticated(request), body, auditContext(request));
  }
  @Post('renew')
  @HttpCode(200)
  @AuthRate('renew')
  @UseGuards(SessionGuard)
  @ApiCookieAuth('ventro-session')
  async renew(@Req() request: AuthRequest, @Res({ passthrough: true }) response: Response) {
    const result = await this.auth.renew(authenticated(request), auditContext(request));
    this.cookies.set(response, result.token, result.session.expiresAt);
    return this.auth.sessionResponse(result);
  }
  @Post('verify-email')
  @HttpCode(200)
  @AuthRate('verify')
  verifyEmail(@Body() body: TokenDto, @Req() request: AuthRequest) {
    return this.auth.verifyEmail(body.token, auditContext(request));
  }
  @Post('resend-verification')
  @HttpCode(202)
  @AuthRate('resend')
  @UseGuards(SessionGuard)
  @ApiCookieAuth('ventro-session')
  resend(@Req() request: AuthRequest) {
    return this.auth.resendVerification(authenticated(request), auditContext(request));
  }
  @Post('forgot-password')
  @HttpCode(202)
  @AuthRate('forgot')
  forgotPassword(@Body() body: EmailDto, @Req() request: AuthRequest) {
    return this.auth.forgotPassword(body.email, auditContext(request));
  }
  @Post('reset-password')
  @HttpCode(200)
  @AuthRate('reset')
  async resetPassword(
    @Body() body: ResetPasswordDto,
    @Req() request: AuthRequest,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.auth.resetPassword(body.token, body.password, auditContext(request));
    this.cookies.clear(response);
    return result;
  }
}
