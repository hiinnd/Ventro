import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Environment } from '../config/environment';
import { authenticated, type AuthRequest } from '../auth/auth.guards';
import type { Response } from 'express';

@Injectable()
export class OrganizationOriginGuard implements CanActivate {
  constructor(private readonly config: ConfigService<Environment, true>) {}
  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<AuthRequest>();
    context.switchToHttp().getResponse<Response>().setHeader('Cache-Control', 'no-store');
    if (['GET', 'HEAD', 'OPTIONS'].includes(request.method)) return true;
    const type = request.headers['content-type']?.split(';')[0]?.trim().toLowerCase();
    const logo =
      request.method === 'POST' &&
      /^\/api\/v1\/organizations\/[a-f0-9-]{36}\/logo$/.test(request.path);
    if (
      !request.headers.origin ||
      !this.config.get('WEB_ORIGINS', { infer: true }).includes(request.headers.origin) ||
      request.headers['x-ventro-csrf'] !== '1' ||
      request.headers['sec-fetch-site'] === 'cross-site' ||
      type !== (logo ? 'multipart/form-data' : 'application/json')
    )
      throw new ForbiddenException('Request origin is not allowed');
    return true;
  }
}
@Injectable()
export class PlatformAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext) {
    if (
      authenticated(context.switchToHttp().getRequest<AuthRequest>()).user.platformRole !==
      'PLATFORM_ADMIN'
    )
      throw new ForbiddenException('Access is not allowed');
    return true;
  }
}
