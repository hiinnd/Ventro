import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  HttpException,
  Injectable,
  ServiceUnavailableException,
  SetMetadata,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import type { Request, Response } from 'express';
import type { Environment } from '../config/environment';
import { RedisService } from '../redis/redis.service';
import { AuthService, type AuthContext, SESSION_IDLE_MS } from './auth.service';
import { isToken, normalizeEmail, privateIdentifier } from './crypto';
import type { AuditContext } from './audit.service';

export interface AuthRequest extends Request {
  auth?: AuthContext;
}
export const auditContext = (request: AuthRequest): AuditContext => ({
  requestId: String(request.id),
  network: request.ip ?? request.socket.remoteAddress,
});
export function authenticated(request: AuthRequest): AuthContext {
  if (!request.auth) throw new ForbiddenException('Access is not allowed');
  return request.auth;
}

@Injectable()
export class AuthCookieService {
  constructor(private readonly config: ConfigService<Environment, true>) {}
  private get secure() {
    return this.config.get('NODE_ENV', { infer: true }) === 'production';
  }
  get name() {
    return this.secure ? '__Host-ventro_session' : 'ventro_session';
  }
  read(request: Request): string | undefined {
    const values = request.headers.cookie
      ?.split(';')
      .map((part) => part.trim())
      .filter((part) => part.startsWith(this.name + '='));
    if (values?.length !== 1) return;
    const token = values[0]!.slice(this.name.length + 1);
    return isToken(token) ? token : undefined;
  }
  set(response: Response, token: string, expiresAt: Date) {
    response.cookie(this.name, token, {
      httpOnly: true,
      secure: this.secure,
      sameSite: 'lax',
      path: '/',
      maxAge: Math.max(0, Math.min(SESSION_IDLE_MS, expiresAt.getTime() - Date.now())),
    });
  }
  clear(response: Response) {
    response.clearCookie(this.name, {
      httpOnly: true,
      secure: this.secure,
      sameSite: 'lax',
      path: '/',
    });
  }
}

@Injectable()
export class AuthOriginGuard implements CanActivate {
  constructor(private readonly config: ConfigService<Environment, true>) {}
  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<Request>();
    context.switchToHttp().getResponse<Response>().setHeader('Cache-Control', 'no-store');
    if (['GET', 'HEAD', 'OPTIONS'].includes(request.method)) return true;
    if (
      !request.headers.origin ||
      !this.config.get('WEB_ORIGINS', { infer: true }).includes(request.headers.origin) ||
      request.headers['x-ventro-csrf'] !== '1' ||
      request.headers['sec-fetch-site'] === 'cross-site' ||
      request.headers['content-type']?.split(';')[0]?.trim().toLowerCase() !== 'application/json'
    )
      throw new ForbiddenException('Request origin is not allowed');
    return true;
  }
}
export const AuthRate = (action: string) => SetMetadata('auth-rate-action', action);
const policies: Record<string, { network: number; account: number; seconds: number }> = {
  register: { network: 20, account: 3, seconds: 900 },
  login: { network: 60, account: 10, seconds: 900 },
  forgot: { network: 30, account: 3, seconds: 900 },
  reset: { network: 30, account: 5, seconds: 900 },
  verify: { network: 60, account: 10, seconds: 900 },
  resend: { network: 30, account: 3, seconds: 900 },
  renew: { network: 120, account: 10, seconds: 60 },
  logout: { network: 120, account: 30, seconds: 60 },
  profile: { network: 180, account: 90, seconds: 60 },
};
@Injectable()
export class AuthRateGuard implements CanActivate {
  constructor(
    private readonly redis: RedisService,
    private readonly config: ConfigService<Environment, true>,
    private readonly reflector: Reflector,
    private readonly cookies: AuthCookieService,
  ) {}
  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<AuthRequest>();
    const action =
      this.reflector.getAllAndOverride<string>('auth-rate-action', [
        context.getHandler(),
        context.getClass(),
      ]) ?? 'profile';
    const policy = policies[action] ?? policies.profile!;
    const secret = this.config.get('AUTH_SECRET', { infer: true });
    const prefix = this.config.get('AUTH_RATE_NAMESPACE', { infer: true }) + ':' + action + ':';
    const body = request.body as Record<string, unknown> | undefined;
    const email =
      typeof body?.email === 'string' && body.email.length <= 254
        ? normalizeEmail(body.email)
        : undefined;
    const identifier =
      email ??
      (typeof body?.token === 'string' && body.token.length <= 128
        ? body.token
        : this.cookies.read(request));
    const keys = [
      {
        key:
          prefix +
          'network:' +
          privateIdentifier(secret, request.ip ?? request.socket.remoteAddress ?? 'unknown'),
        limit: policy.network,
      },
      ...(identifier
        ? [
            {
              key: prefix + 'account:' + privateIdentifier(secret, identifier),
              limit: policy.account,
            },
          ]
        : []),
    ];
    for (const { key, limit } of keys) {
      let result: { count: number; retryAfter: number };
      try {
        result = await this.redis.rateLimit(key, policy.seconds);
      } catch {
        throw new ServiceUnavailableException('Authentication temporarily unavailable');
      }
      if (result.count > limit) {
        context.switchToHttp().getResponse<Response>().setHeader('Retry-After', result.retryAfter);
        throw new HttpException('Too many attempts. Please try again later.', 429);
      }
    }
    return true;
  }
}
@Injectable()
export class SessionGuard implements CanActivate {
  constructor(
    private readonly auth: AuthService,
    private readonly cookies: AuthCookieService,
  ) {}
  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<AuthRequest>();
    request.auth = await this.auth.authenticate(this.cookies.read(request));
    return true;
  }
}
@Injectable()
export class VerifiedEmailGuard implements CanActivate {
  canActivate(context: ExecutionContext) {
    if (!authenticated(context.switchToHttp().getRequest<AuthRequest>()).user.emailVerifiedAt)
      throw new ForbiddenException('Verify your email to continue');
    return true;
  }
}
