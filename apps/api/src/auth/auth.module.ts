import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { RedisModule } from '../redis/redis.module';
import { OrganizationAccessService } from '../organizations/organization-access.service';
import { AuditService } from './audit.service';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import {
  AuthCookieService,
  AuthOriginGuard,
  AuthRateGuard,
  SessionGuard,
  VerifiedEmailGuard,
} from './auth.guards';
import { EmailService } from './email.service';
import { PasswordService } from './password.service';

@Module({
  imports: [DatabaseModule, RedisModule],
  controllers: [AuthController],
  providers: [
    AuthService,
    PasswordService,
    EmailService,
    AuditService,
    AuthCookieService,
    AuthOriginGuard,
    AuthRateGuard,
    SessionGuard,
    VerifiedEmailGuard,
    OrganizationAccessService,
  ],
  exports: [
    AuthService,
    SessionGuard,
    VerifiedEmailGuard,
    OrganizationAccessService,
    AuthCookieService,
    AuthOriginGuard,
    AuthRateGuard,
    AuditService,
    EmailService,
  ],
})
export class AuthModule {}
