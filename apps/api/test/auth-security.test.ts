import { createRequire } from 'node:module';
import 'reflect-metadata';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import { describe, expect, it, vi } from 'vitest';
const requireCompiled = createRequire(import.meta.url);
const { encryptPayload, decryptPayload, randomToken, tokenHash } = requireCompiled(
  '../dist/auth/crypto.js',
) as typeof import('../dist/auth/crypto.js');
const { AuthCookieService } = requireCompiled(
  '../dist/auth/auth.guards.js',
) as typeof import('../dist/auth/auth.guards.js');
const { PasswordService } = requireCompiled(
  '../dist/auth/password.service.js',
) as typeof import('../dist/auth/password.service.js');
const { validateEnvironment } = requireCompiled(
  '../dist/config/environment.js',
) as typeof import('../dist/config/environment.js');
const secret = '12'.repeat(32);
describe('authentication security primitives', () => {
  it('authenticates encrypted mail payloads and rejects wrong keys or tampering', () => {
    const value = { to: 'local@example.test', token: randomToken() };
    const encrypted = encryptPayload(secret, value);
    expect(encrypted).not.toContain(value.to);
    expect(encrypted).not.toContain(value.token);
    expect(decryptPayload(secret, encrypted)).toEqual(value);
    expect(() => decryptPayload('34'.repeat(32), encrypted)).toThrow();
    const parts = encrypted.split('.');
    const tag = Buffer.from(parts[2]!, 'base64url');
    tag[0] = tag[0]! ^ 1;
    parts[2] = tag.toString('base64url');
    expect(() => decryptPayload(secret, parts.join('.'))).toThrow();
    expect(tokenHash(value.token)).toMatch(/^[a-f0-9]{64}$/);
    expect(tokenHash(value.token)).not.toBe(value.token);
  });
  it('uses secure host-only HTTP-only cookies in production and bounded expiration', () => {
    const cookies = new AuthCookieService(new ConfigService({ NODE_ENV: 'production' }) as never);
    const response = { cookie: vi.fn(), clearCookie: vi.fn() };
    const token = randomToken();
    cookies.set(response as unknown as Response, token, new Date(Date.now() + 10000));
    expect(response.cookie).toHaveBeenCalledWith(
      '__Host-ventro_session',
      token,
      expect.objectContaining({ httpOnly: true, secure: true, path: '/', sameSite: 'lax' }),
    );
    expect(response.cookie.mock.calls[0]![2].domain).toBeUndefined();
    expect(response.cookie.mock.calls[0]![2].maxAge).toBeLessThanOrEqual(10000);
    cookies.clear(response as unknown as Response);
    expect(response.clearCookie).toHaveBeenCalledWith(
      '__Host-ventro_session',
      expect.objectContaining({ secure: true, httpOnly: true, path: '/' }),
    );
    expect(cookies.read({ headers: { cookie: '__Host-ventro_session=' + token } } as Request)).toBe(
      token,
    );
    expect(
      cookies.read({
        headers: { cookie: '__Host-ventro_session=' + token + '; __Host-ventro_session=' + token },
      } as Request),
    ).toBeUndefined();
    expect(
      cookies.read({ headers: { cookie: '__Host-ventro_session=malformed' } } as Request),
    ).toBeUndefined();
  });
  it('requires a managed secret, HTTPS origin, TLS SMTP and a real sender configuration in production', () => {
    const base = {
      NODE_ENV: 'production',
      AUTH_SECRET: secret,
      AUTH_APP_URL: 'https://app.example.com',
      WEB_ORIGINS: 'https://app.example.com',
      DATABASE_URL: 'postgresql://local:local@localhost/dev',
      REDIS_URL: 'redis://localhost:6379',
      SMTP_FROM: 'no-reply@example.com',
      SMTP_REQUIRE_TLS: 'true',
    };
    expect(validateEnvironment(base).AUTH_APP_URL).toBe(base.AUTH_APP_URL);
    expect(() => validateEnvironment({ ...base, AUTH_SECRET: '' })).toThrow('AUTH_SECRET');
    expect(() => validateEnvironment({ ...base, SMTP_REQUIRE_TLS: 'false' })).toThrow('TLS');
    expect(() => validateEnvironment({ ...base, SMTP_FROM: 'no-reply@ventro.test' })).toThrow(
      'sender',
    );
  });
  it('hashes with Argon2id and makes unknown-account verification use the dummy hash', async () => {
    const service = new PasswordService();
    await service.onModuleInit();
    const hash = await service.hash('A sufficiently long passphrase');
    expect(hash).toMatch(/^\$argon2id\$v=19\$m=65536,t=3,p=1\$/);
    await expect(service.verify(hash, 'A sufficiently long passphrase')).resolves.toBe(true);
    await expect(service.verify(hash, 'An incorrect passphrase')).resolves.toBe(false);
    await expect(service.verify(undefined, 'A sufficiently long passphrase')).resolves.toBe(false);
  });
});
