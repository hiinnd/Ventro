import { createRequire } from 'node:module';
import { randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import type { INestApplication } from '@nestjs/common';
import { Client } from 'pg';
import { config } from 'dotenv';
import request from 'supertest';
import { authSessionSchema } from '@ventro/types';

const requireCompiled = createRequire(import.meta.url);
const { PrismaService } = requireCompiled(
  '../dist/database/prisma.service.js',
) as typeof import('../dist/database/prisma.service.js');
const { validateEnvironment } = requireCompiled(
  '../dist/config/environment.js',
) as typeof import('../dist/config/environment.js');
const { tokenHash } = requireCompiled(
  '../dist/auth/crypto.js',
) as typeof import('../dist/auth/crypto.js');
const { OrganizationAccessService } = requireCompiled(
  '../dist/organizations/organization-access.service.js',
) as typeof import('../dist/organizations/organization-access.service.js');
const run = randomUUID().replaceAll('-', '');
const databaseName = 'ventro_auth_it_' + run;
const password = 'A unique test passphrase ' + run.slice(0, 8);
const origin = 'http://127.0.0.1:3000';
let app: INestApplication;
let db: InstanceType<typeof PrismaService>;
let administrative: Client;
let created = false;
let settings: ReturnType<typeof validateEnvironment>;
let counter = 0;
const nextEmail = () => 'auth-' + run + '-' + ++counter + '@example.test';

async function createApp(smtpPort = 1025) {
  const { AppModule } = requireCompiled(
    '../dist/app.module.js',
  ) as typeof import('../dist/app.module.js');
  const { configureApp } = requireCompiled(
    '../dist/config/configure-app.js',
  ) as typeof import('../dist/config/configure-app.js');
  const module = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(ConfigService)
    .useValue(new ConfigService({ ...settings, SMTP_PORT: smtpPort }))
    .compile();
  const instance = module.createNestApplication();
  configureApp(instance);
  await instance.init();
  await instance.listen(0, '127.0.0.1');
  return instance;
}
function post(action: string, body: unknown = {}, cookie?: string) {
  const call = request(app.getHttpServer())
    .post('/api/v1/auth/' + action)
    .set('Origin', origin)
    .set('X-Ventro-CSRF', '1')
    .send(body);
  return cookie ? call.set('Cookie', cookie) : call;
}
async function register(email = nextEmail()) {
  await post('register', { name: 'Test Organizer', email, password, locale: 'en' }).expect(202);
  return email;
}
async function login(email: string, secret = password) {
  const response = await post('login', { email, password: secret }).expect(200);
  const headers = response.headers['set-cookie'] as unknown as string[];
  const cookie = headers[0]!.split(';')[0]!;
  return {
    response,
    cookie,
    token: cookie.slice(cookie.indexOf('=') + 1),
    session: authSessionSchema.parse(response.body),
  };
}
async function waitFor<T>(operation: () => Promise<T | undefined>, timeout = 25000): Promise<T> {
  const end = Date.now() + timeout;
  do {
    const value = await operation();
    if (value !== undefined) return value;
    await delay(250);
  } while (Date.now() < end);
  throw new Error('Timed out waiting for real email/database state');
}
async function emailToken(email: string, subject: string, excluding?: string) {
  return waitFor(async () => {
    const response = await fetch(
      'http://127.0.0.1:8025/api/v1/search?query=' + encodeURIComponent('to:' + email),
    );
    const result = (await response.json()) as { messages?: { ID: string; Subject: string }[] };
    for (const summary of result.messages ?? []) {
      if (summary.Subject !== subject) continue;
      const detail = (await (
        await fetch('http://127.0.0.1:8025/api/v1/message/' + summary.ID)
      ).json()) as { Text: string };
      const token = detail.Text.match(/#token=([a-f0-9]{64})/)?.[1];
      if (token && token !== excluding) return token;
    }
  });
}

describe('authentication with isolated PostgreSQL, real Redis and SMTP/Mailpit', () => {
  beforeAll(async () => {
    config({ path: resolve(process.cwd(), '../../.env'), quiet: true });
    if (process.env.NODE_ENV === 'production')
      throw new Error('Authentication integration tests refuse production.');
    const source = new URL(process.env.DATABASE_URL!);
    if (!['127.0.0.1', 'localhost', '[::1]'].includes(source.hostname))
      throw new Error('Authentication integration tests require a local database server.');
    administrative = new Client({ connectionString: source.href });
    await administrative.connect();
    if (!/^ventro_auth_it_[a-f0-9]{32}$/.test(databaseName))
      throw new Error('Unsafe test database identifier');
    await administrative.query('CREATE DATABASE "' + databaseName + '"');
    created = true;
    source.pathname = '/' + databaseName;
    Object.assign(process.env, {
      NODE_ENV: 'test',
      DATABASE_URL: source.href,
      AUTH_APP_URL: origin,
      WEB_ORIGINS: origin,
      AUTH_RATE_NAMESPACE: 'auth-it-' + run,
      LOG_LEVEL: 'silent',
      SMTP_HOST: '127.0.0.1',
      SMTP_PORT: '1025',
      SMTP_SECURE: 'false',
      SMTP_REQUIRE_TLS: 'false',
      SMTP_USER: '',
      SMTP_PASSWORD: '',
      SMTP_FROM: 'no-reply@ventro.test',
    });
    execFileSync(
      process.execPath,
      [requireCompiled.resolve('prisma/build/index.js'), 'migrate', 'deploy'],
      { cwd: process.cwd(), env: process.env, timeout: 60000, stdio: 'pipe' },
    );
    settings = validateEnvironment(process.env);
    db = new PrismaService(new ConfigService(settings) as never);
    app = await createApp();
    expect((await fetch('http://127.0.0.1:8025/readyz')).status).toBe(200);
  }, 120000);
  afterAll(async () => {
    await app?.close();
    await db?.onModuleDestroy();
    if (created && /^ventro_auth_it_[a-f0-9]{32}$/.test(databaseName))
      await administrative.query('DROP DATABASE "' + databaseName + '" WITH (FORCE)');
    await administrative?.end();
  }, 30000);

  it('registers canonical unique accounts with Argon2id and sends a real verification email', async () => {
    const email = nextEmail();
    const first = await post('register', {
      name: '  Test Organizer  ',
      email: email.toUpperCase(),
      password,
      locale: 'en',
    }).expect(202);
    const duplicate = await post('register', {
      name: 'Different Name',
      email,
      password: 'A different long password',
      locale: 'en',
    }).expect(202);
    expect(duplicate.body).toEqual(first.body);
    const user = await db.user.findUniqueOrThrow({ where: { email } });
    expect(user.name).toBe('Test Organizer');
    expect(user.passwordHash).toMatch(/^\$argon2id\$v=19\$m=65536,t=3,p=1\$/);
    expect(user.passwordHash).not.toContain(password);
    expect(await db.user.count({ where: { email } })).toBe(1);
    const token = await emailToken(email, 'Verify your VENTRO email');
    const record = await db.emailVerificationToken.findUniqueOrThrow({
      where: { tokenHash: tokenHash(token) },
    });
    expect(record.userId).toBe(user.id);
    expect(record.tokenHash).not.toBe(token);
    expect(record.expiresAt.getTime() - record.createdAt.getTime()).toBeLessThanOrEqual(86401000);
    await waitFor(
      async () =>
        (await db.emailOutbox.findFirst({ where: { userId: user.id, status: 'SENT' } })) ??
        undefined,
    );
    expect(
      (await db.emailOutbox.findFirstOrThrow({ where: { userId: user.id, status: 'SENT' } }))
        .encryptedPayload,
    ).toBe('');
  });
  it('persists opaque HTTP-only sessions across API restarts and scopes profile changes to their owner', async () => {
    const email = await register();
    const result = await login(email);
    expect(result.response.headers['cache-control']).toBe('no-store');
    expect(result.response.headers['set-cookie'][0]).toMatch(/HttpOnly/);
    expect(result.response.headers['set-cookie'][0]).toMatch(/SameSite=Lax/);
    expect(result.response.headers['set-cookie'][0]).toMatch(/Path=\//);
    expect(JSON.stringify(result.response.body)).not.toContain(result.token);
    expect(JSON.stringify(result.response.body)).not.toContain('passwordHash');
    const stored = await db.session.findUniqueOrThrow({
      where: { tokenHash: tokenHash(result.token) },
    });
    expect(stored.tokenHash).not.toBe(result.token);
    await app.close();
    app = await createApp();
    await request(app.getHttpServer())
      .get('/api/v1/auth/profile?userId=' + randomUUID())
      .set('Cookie', result.cookie)
      .expect(200)
      .expect(({ body }) => expect(body.email).toBe(email));
    await request(app.getHttpServer())
      .patch('/api/v1/auth/profile')
      .set('Origin', origin)
      .set('X-Ventro-CSRF', '1')
      .set('Cookie', result.cookie)
      .send({ name: 'Updated Organizer', locale: 'ar', userId: randomUUID() })
      .expect(400);
    await request(app.getHttpServer())
      .patch('/api/v1/auth/profile')
      .set('Origin', origin)
      .set('X-Ventro-CSRF', '1')
      .set('Cookie', result.cookie)
      .send({ name: 'Updated Organizer', locale: 'ar' })
      .expect(200);
    expect((await db.user.findUniqueOrThrow({ where: { email } })).name).toBe('Updated Organizer');
    await request(app.getHttpServer()).get('/api/v1/auth/profile').expect(401);
    await request(app.getHttpServer())
      .get('/api/v1/auth/profile')
      .set('Cookie', result.cookie + '; ' + result.cookie)
      .expect(401);
  });
  it('rejects CSRF, malformed JSON, oversized bodies and mass-assignment safely', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: nextEmail(), password })
      .expect(403);
    await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .set('Origin', origin)
      .send({ email: nextEmail(), password })
      .expect(403);
    await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .set('Origin', 'https://attacker.example')
      .set('X-Ventro-CSRF', '1')
      .send({ email: nextEmail(), password })
      .expect(403);
    await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .set('Origin', origin)
      .set('X-Ventro-CSRF', '1')
      .set('Sec-Fetch-Site', 'cross-site')
      .send({ email: nextEmail(), password })
      .expect(403);
    const malformed = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .set('Origin', origin)
      .set('Content-Type', 'application/json')
      .send('{"password":"DO-NOT-ECHO')
      .expect(400);
    expect(JSON.stringify(malformed.body)).not.toContain('DO-NOT-ECHO');
    await post('register', {
      name: 'Test',
      email: nextEmail(),
      password,
      role: 'OWNER',
      emailVerifiedAt: new Date().toISOString(),
    }).expect(400);
    await post('register', { name: 'Test', email: nextEmail(), password: 'short' }).expect(400);
    await post('login', { email: nextEmail(), password: 'x'.repeat(17000) }).expect(413);
  });
  it('uses indistinguishable credential and forgot-password responses for unknown accounts', async () => {
    const email = await register();
    const wrong = await post('login', { email, password: 'Incorrect passphrase' }).expect(401);
    const missing = await post('login', {
      email: nextEmail(),
      password: 'Incorrect passphrase',
    }).expect(401);
    expect(wrong.body.message).toEqual(missing.body.message);
    const knownReset = await post('forgot-password', { email }).expect(202);
    const unknownReset = await post('forgot-password', { email: nextEmail() }).expect(202);
    expect(knownReset.body).toEqual(unknownReset.body);
  });
  it('consumes verification tokens once even when requests race, and replaces old links on resend', async () => {
    const email = await register();
    const old = await emailToken(email, 'Verify your VENTRO email');
    const active = await login(email);
    await post('resend-verification', {}, active.cookie).expect(202);
    const token = await emailToken(email, 'Verify your VENTRO email', old);
    await post('verify-email', { token: old }).expect(400);
    const responses = await Promise.all([
      post('verify-email', { token }),
      post('verify-email', { token }),
    ]);
    expect(responses.map((response) => response.status).sort()).toEqual([200, 400]);
    expect((await db.user.findUniqueOrThrow({ where: { email } })).emailVerifiedAt).not.toBeNull();
    await request(app.getHttpServer())
      .get('/api/v1/auth/session')
      .set('Cookie', active.cookie)
      .expect(200)
      .expect(({ body }) => expect(body.user.emailVerifiedAt).not.toBeNull());
    await post('verify-email', { token }).expect(400);
  });
  it('rotates session secrets atomically, rejects the prior secret, and logs out persistently', async () => {
    const initial = await login(await register());
    const renewals = await Promise.all([
      post('renew', {}, initial.cookie),
      post('renew', {}, initial.cookie),
    ]);
    expect(renewals.map((item) => item.status).sort()).toEqual([200, 401]);
    const winner = renewals.find((item) => item.status === 200)!;
    const renewedCookie = (winner.headers['set-cookie'] as unknown as string[])[0]!.split(';')[0]!;
    expect(renewedCookie).not.toBe(initial.cookie);
    await request(app.getHttpServer())
      .get('/api/v1/auth/session')
      .set('Cookie', initial.cookie)
      .expect(401);
    await request(app.getHttpServer())
      .get('/api/v1/auth/session')
      .set('Cookie', renewedCookie)
      .expect(200);
    const oldAbsolute = initial.session.absoluteExpiresAt;
    expect(authSessionSchema.parse(winner.body).absoluteExpiresAt).toBe(oldAbsolute);
    await post('logout', {}, renewedCookie).expect(204);
    await request(app.getHttpServer())
      .get('/api/v1/auth/session')
      .set('Cookie', renewedCookie)
      .expect(401);
    await post('logout', {}, renewedCookie).expect(204);
  });
  it('resets a password once, revokes all sessions, sends a notice, and rejects the old password', async () => {
    const email = await register();
    const first = await login(email);
    const second = await login(email);
    await post('forgot-password', { email }).expect(202);
    const token = await emailToken(email, 'Reset your VENTRO password');
    const reset = await db.passwordResetToken.findUniqueOrThrow({
      where: { tokenHash: tokenHash(token) },
    });
    expect(reset.tokenHash).not.toBe(token);
    expect(reset.expiresAt.getTime() - reset.createdAt.getTime()).toBeLessThanOrEqual(1801000);
    expect(reset.expiresAt.getTime() - reset.createdAt.getTime()).toBeGreaterThan(1799000);
    const nextPassword = 'Changed test passphrase ' + run;
    const responses = await Promise.all([
      post('reset-password', { token, password: nextPassword }),
      post('reset-password', { token, password: nextPassword }),
    ]);
    expect(responses.map((item) => item.status).sort()).toEqual([200, 400]);
    expect(await db.session.count({ where: { userId: first.session.user.id } })).toBe(0);
    for (const cookie of [first.cookie, second.cookie])
      await request(app.getHttpServer())
        .get('/api/v1/auth/profile')
        .set('Cookie', cookie)
        .expect(401);
    await post('login', { email, password }).expect(401);
    await login(email, nextPassword);
    await post('reset-password', { token, password: nextPassword }).expect(400);
    await waitFor(
      async () =>
        (await db.emailOutbox.findFirst({
          where: { userId: first.session.user.id, kind: 'PASSWORD_CHANGED', status: 'SENT' },
        })) ?? undefined,
    );
  });
  it('rejects expired email tokens, idle/absolute-expired sessions and disabled users', async () => {
    const email = await register();
    const verification = await emailToken(email, 'Verify your VENTRO email');
    await db.emailVerificationToken.update({
      where: { tokenHash: tokenHash(verification) },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });
    await post('verify-email', { token: verification }).expect(400);
    await post('forgot-password', { email }).expect(202);
    const reset = await emailToken(email, 'Reset your VENTRO password');
    await db.passwordResetToken.update({
      where: { tokenHash: tokenHash(reset) },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });
    await post('reset-password', { token: reset, password: 'Another unique password 2026' }).expect(
      400,
    );
    const idle = await login(email);
    await db.session.update({
      where: { tokenHash: tokenHash(idle.token) },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });
    await request(app.getHttpServer())
      .get('/api/v1/auth/profile')
      .set('Cookie', idle.cookie)
      .expect(401);
    const absolute = await login(email);
    await db.session.update({
      where: { tokenHash: tokenHash(absolute.token) },
      data: {
        expiresAt: new Date(Date.now() - 2000),
        absoluteExpiresAt: new Date(Date.now() - 1000),
      },
    });
    await post('renew', {}, absolute.cookie).expect(401);
    const disabled = await login(email);
    await db.user.update({ where: { email }, data: { status: 'DISABLED' } });
    await request(app.getHttpServer())
      .get('/api/v1/auth/profile')
      .set('Cookie', disabled.cookie)
      .expect(401);
    await post('login', { email, password }).expect(401);
  });
  it('enforces rate limits in actual Redis with Retry-After', async () => {
    const email = nextEmail();
    for (let index = 0; index < 10; index++) await post('login', { email, password }).expect(401);
    const limited = await post('login', { email, password }).expect(429);
    expect(Number(limited.headers['retry-after'])).toBeGreaterThan(0);
    expect(limited.headers['cache-control']).toBe('no-store');
  });
  it('denies cross-organization, wrong-role, and archived-organization access', async () => {
    const first = await db.user.findUniqueOrThrow({ where: { email: await register() } });
    const second = await db.user.findUniqueOrThrow({ where: { email: await register() } });
    const firstOrg = await db.organization.create({
      data: {
        name: 'First test tenant',
        slug: 'first-' + run,
        members: { create: { userId: first.id, role: 'OWNER' } },
      },
    });
    const secondOrg = await db.organization.create({
      data: {
        name: 'Second test tenant',
        slug: 'second-' + run,
        members: { create: { userId: second.id, role: 'OWNER' } },
      },
    });
    const access = app.get(OrganizationAccessService);
    await expect(access.requireMembership(first.id, firstOrg.id, ['OWNER'])).resolves.toMatchObject(
      { userId: first.id, organizationId: firstOrg.id },
    );
    await expect(access.requireMembership(first.id, secondOrg.id)).rejects.toThrow(
      'Access is not allowed',
    );
    await expect(access.requireMembership(first.id, firstOrg.id, ['ADMIN'])).rejects.toThrow(
      'Access is not allowed',
    );
    await db.organization.update({ where: { id: firstOrg.id }, data: { archivedAt: new Date() } });
    await expect(access.requireMembership(first.id, firstOrg.id)).rejects.toThrow(
      'Access is not allowed',
    );
  });
  it('retains encrypted delivery intent during SMTP failure and retries after restart', async () => {
    await app.close();
    app = await createApp(65534);
    const email = await register();
    const user = await db.user.findUniqueOrThrow({ where: { email } });
    const pending = await waitFor(
      async () =>
        (await db.emailOutbox.findFirst({
          where: { userId: user.id, attempts: { gt: 0 }, status: 'PENDING' },
        })) ?? undefined,
    );
    expect(pending.encryptedPayload).toMatch(/^v1\./);
    expect(pending.encryptedPayload).not.toContain(email);
    expect(pending.encryptedPayload).not.toContain('#token=');
    await app.close();
    app = await createApp();
    const token = await emailToken(email, 'Verify your VENTRO email');
    await post('verify-email', { token }).expect(200);
  });
  it('records critical security actions without passwords, raw tokens, email addresses or raw IPs', async () => {
    const logs = await db.auditLog.findMany();
    const actions = logs.map((item) => item.action);
    for (const action of [
      'AUTH_REGISTERED',
      'AUTH_LOGIN_SUCCEEDED',
      'AUTH_LOGIN_FAILED',
      'AUTH_EMAIL_VERIFIED',
      'AUTH_PASSWORD_RESET_COMPLETED',
      'AUTH_SESSION_RENEWED',
      'AUTH_LOGGED_OUT',
      'AUTH_PROFILE_UPDATED',
    ])
      expect(actions).toContain(action);
    const serialized = JSON.stringify(logs);
    expect(serialized).not.toContain(password);
    expect(serialized).not.toContain('@example.test');
    expect(serialized).not.toContain('127.0.0.1');
    expect(serialized).not.toContain('#token=');
    expect(logs.some((item) => item.requestId && item.networkHash?.length === 64)).toBe(true);
  });
});
