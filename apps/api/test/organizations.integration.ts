import { createRequire } from 'node:module';
import { randomUUID } from 'node:crypto';
import { execFileSync, fork, type ChildProcess } from 'node:child_process';
import { resolve } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { ConfigService } from '@nestjs/config';
import { Client } from 'pg';
import { config } from 'dotenv';
import request from 'supertest';
import { hash, argon2id } from 'argon2';
import sharp from 'sharp';
import { invitationSchema, organizationSchema, organizationListSchema } from '@ventro/types';

const compiled = createRequire(import.meta.url);
const { PrismaService } = compiled(
  '../dist/database/prisma.service.js',
) as typeof import('../dist/database/prisma.service.js');
const { validateEnvironment } = compiled(
  '../dist/config/environment.js',
) as typeof import('../dist/config/environment.js');
const { tokenHash } = compiled('../dist/auth/crypto.js') as typeof import('../dist/auth/crypto.js');
const run = randomUUID().replaceAll('-', '');
const databaseName = 'ventro_org_it_' + run;
const origin = 'http://127.0.0.1:3000';
const password = 'Organization integration passphrase ' + run;
type Actor = { id: string; email: string; cookie: string };
let apiProcess: ChildProcess | undefined;
let baseUrl = '';
let db: InstanceType<typeof PrismaService>;
let administrative: Client;
let created = false;
let sequence = 0;
let passwordHash: string;
let owner: Actor;
let outsider: Actor;
let orgId: string;
let otherOrgId: string;
const people: Record<string, Actor> = {};
const email = () => 'org-' + run + '-' + ++sequence + '@example.test';
function call(
  actor: Actor | undefined,
  method: 'get' | 'post' | 'patch' | 'delete',
  path: string,
  body?: object,
) {
  const req = request(baseUrl)
    [method]('/api/v1/' + path)
    .set('Origin', origin)
    .set('X-Ventro-CSRF', '1');
  if (actor) req.set('Cookie', actor.cookie);
  if (method !== 'get') req.send(body ?? {});
  return req;
}
async function login(address: string) {
  const response = await call(undefined, 'post', 'auth/login', { email: address, password }).expect(
    200,
  );
  const cookie = (response.headers['set-cookie'] as unknown as string[])[0]!.split(';')[0]!;
  return { id: String(response.body.user.id), email: address, cookie };
}
async function person(verified = true) {
  const user = await db.user.create({
    data: {
      email: email(),
      name: 'Organization test actor',
      passwordHash,
      emailVerifiedAt: verified ? new Date() : null,
    },
  });
  return login(user.email);
}
function profile(name = 'Test organization') {
  return {
    name,
    description: 'A real isolated organization fixture',
    website: 'https://example.test',
    contactEmail: '',
    timezone: 'Asia/Amman',
    locale: 'en',
  };
}
async function createOrg(actor: Actor, name?: string) {
  const result = await call(actor, 'post', 'organizations', {
    ...profile(name),
    slug: 'org-' + run + '-' + ++sequence,
  }).expect(201);
  return organizationSchema.parse(result.body);
}
async function tokenFromMail(address: string) {
  for (let attempt = 0; attempt < 80; attempt++) {
    const result = (await (
      await fetch(
        'http://127.0.0.1:8025/api/v1/search?query=' + encodeURIComponent('to:' + address),
      )
    ).json()) as { messages: { ID: string; Subject: string }[] };
    for (const summary of result.messages) {
      if (summary.Subject !== 'Your VENTRO team invitation') continue;
      const detail = (await (
        await fetch('http://127.0.0.1:8025/api/v1/message/' + summary.ID)
      ).json()) as { Text: string };
      const token = detail.Text.match(/#token=([a-f0-9]{64})/)?.[1];
      if (token) return token;
    }
    await delay(250);
  }
  throw new Error('Invitation email was not delivered to real Mailpit');
}
async function invitation(address: string, role = 'PARTICIPANT', id = orgId) {
  return invitationSchema.parse(
    (
      await call(owner, 'post', 'organizations/' + id + '/invitations', {
        email: address,
        role,
      }).expect(201)
    ).body,
  );
}

describe('organization isolation and RBAC with isolated PostgreSQL, real Redis and email', () => {
  beforeAll(async () => {
    config({ path: resolve('../../.env'), quiet: true });
    if (process.env.NODE_ENV === 'production') throw new Error('Local integration only');
    const url = new URL(process.env.DATABASE_URL!);
    if (!['localhost', '127.0.0.1'].includes(url.hostname))
      throw new Error('Local database required');
    administrative = new Client({ connectionString: url.href });
    await administrative.connect();
    if (!/^ventro_org_it_[a-f0-9]{32}$/.test(databaseName)) throw new Error('Unsafe fixture name');
    await administrative.query('CREATE DATABASE "' + databaseName + '"');
    created = true;
    url.pathname = '/' + databaseName;
    Object.assign(process.env, {
      NODE_ENV: 'test',
      DATABASE_URL: url.href,
      AUTH_APP_URL: origin,
      WEB_ORIGINS: origin,
      AUTH_RATE_NAMESPACE: 'org-it-' + run,
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
      [compiled.resolve('prisma/build/index.js'), 'migrate', 'deploy'],
      { env: process.env, timeout: 60000, stdio: 'pipe' },
    );
    const settings = validateEnvironment(process.env);
    baseUrl = await new Promise<string>((ready, reject) => {
      const child = fork(resolve('test/integration-server.mjs'), [], {
        env: process.env,
        execArgv: [],
        silent: true,
      });
      apiProcess = child;
      child.stdout?.resume();
      child.stderr?.resume();
      const timeout = setTimeout(() => {
        child.kill();
        reject(new Error('Integration API startup timeout'));
      }, 45000);
      child.once('error', (error) => {
        clearTimeout(timeout);
        reject(error);
      });
      child.once('exit', (code) => {
        clearTimeout(timeout);
        reject(new Error('Integration API exited: ' + code));
      });
      child.once('message', (value: unknown) => {
        if (
          value &&
          typeof value === 'object' &&
          'port' in value &&
          typeof value.port === 'number' &&
          value.port > 0
        ) {
          clearTimeout(timeout);
          ready('http://127.0.0.1:' + value.port);
        } else {
          child.kill();
          clearTimeout(timeout);
          reject(new Error('Invalid integration API readiness'));
        }
      });
    });
    db = new PrismaService(new ConfigService(settings) as never);
    passwordHash = await hash(password, {
      type: argon2id,
      memoryCost: 65536,
      timeCost: 3,
      parallelism: 1,
    });
    owner = await person();
    outsider = await person();
    orgId = (await createOrg(owner, 'Isolated first tenant')).id;
    otherOrgId = (await createOrg(outsider, 'Isolated second tenant')).id;
    for (const role of ['EVENT_MANAGER', 'CHECK_IN_STAFF', 'PARTICIPANT'] as const) {
      people[role] = await person();
      await db.organizationMember.create({
        data: { organizationId: orgId, userId: people[role]!.id, role },
      });
    }
  }, 120000);
  afterAll(async () => {
    if (apiProcess && apiProcess.exitCode === null)
      await new Promise<void>((done) => {
        const child = apiProcess!;
        const timeout = setTimeout(() => {
          child.kill();
        }, 15000);
        child.once('exit', () => {
          clearTimeout(timeout);
          done();
        });
        if (child.connected) child.send('stop');
        else child.kill();
      });
    await db?.onModuleDestroy();
    if (created && /^ventro_org_it_[a-f0-9]{32}$/.test(databaseName))
      await administrative.query('DROP DATABASE "' + databaseName + '" WITH (FORCE)');
    await administrative?.end();
  }, 30000);

  it('requires actual sessions, verified email, CSRF and strict input; clients cannot assign a platform role', async () => {
    await call(undefined, 'get', 'organizations').expect(401);
    await call(undefined, 'post', 'organizations', { ...profile(), slug: 'invalid' }).expect(401);
    const unverified = await person(false);
    await call(unverified, 'get', 'organizations').expect(403);
    await call(unverified, 'post', 'organizations', { ...profile(), slug: 'nope' }).expect(403);
    await request(baseUrl)
      .post('/api/v1/organizations')
      .set('Cookie', owner.cookie)
      .send({ ...profile(), slug: 'no-csrf' })
      .expect(403);
    await call(owner, 'post', 'organizations', {
      ...profile(),
      slug: 'bad-privilege',
      platformRole: 'PLATFORM_ADMIN',
    }).expect(400);
    await call(owner, 'patch', 'auth/profile', {
      name: 'Allowed name',
      locale: 'en',
      platformRole: 'PLATFORM_ADMIN',
    }).expect(400);
    await call(owner, 'get', 'organizations/not-a-uuid').expect(400);
    await call(owner, 'get', 'organizations?page=0').expect(400);
    await call(owner, 'get', 'organizations?userId=' + outsider.id).expect(400);
  });
  it('creates isolated tenants, supports multiple memberships, and persists active selection through renewal', async () => {
    const second = await createOrg(owner, 'Same user second organization');
    const list = organizationListSchema.parse(
      (await call(owner, 'get', 'organizations').expect(200)).body,
    );
    expect(list.items.map((item) => item.id)).toEqual(expect.arrayContaining([orgId, second.id]));
    expect(list.items.some((item) => item.id === otherOrgId)).toBe(false);
    await call(owner, 'post', 'organizations/' + orgId + '/activate').expect(200);
    const renewed = await call(owner, 'post', 'auth/renew').expect(200);
    owner.cookie = (renewed.headers['set-cookie'] as unknown as string[])[0]!.split(';')[0]!;
    expect(renewed.body.activeOrganizationId).toBe(orgId);
    expect((await call(owner, 'get', 'auth/session').expect(200)).body.activeOrganizationId).toBe(
      orgId,
    );
    await call(owner, 'post', 'organizations/' + otherOrgId + '/activate').expect(403);
  });
  it('rejects cross-tenant reads, writes, member changes, invitations, logos and tenant-ID injection', async () => {
    for (const suffix of ['', '/members', '/invitations', '/logo'])
      await call(owner, 'get', 'organizations/' + otherOrgId + suffix).expect(403);
    await call(
      owner,
      'patch',
      'organizations/' + otherOrgId,
      profile('Attempted overwrite'),
    ).expect(403);
    await call(owner, 'delete', 'organizations/' + otherOrgId + '/members/' + outsider.id).expect(
      403,
    );
    await call(owner, 'patch', 'organizations/' + otherOrgId + '/members/' + outsider.id, {
      role: 'PARTICIPANT',
    }).expect(403);
    await call(owner, 'post', 'organizations/' + otherOrgId + '/invitations', {
      email: email(),
      role: 'OWNER',
    }).expect(403);
    await call(owner, 'delete', 'organizations/' + otherOrgId + '/logo').expect(403);
    await call(owner, 'patch', 'organizations/' + orgId, {
      ...profile(),
      organizationId: otherOrgId,
    }).expect(400);
    expect((await db.organization.findUniqueOrThrow({ where: { id: otherOrgId } })).name).toBe(
      'Isolated second tenant',
    );
  });
  for (const role of ['EVENT_MANAGER', 'CHECK_IN_STAFF', 'PARTICIPANT']) {
    it('enforces the exact backend permission boundary for ' + role, async () => {
      const actor = people[role]!;
      expect((await call(actor, 'get', 'organizations/' + orgId).expect(200)).body.role).toBe(role);
      await call(actor, 'get', 'organizations/' + orgId + '/members').expect(
        role === 'EVENT_MANAGER' ? 200 : 403,
      );
      await call(actor, 'get', 'organizations/' + orgId + '/invitations').expect(403);
      await call(actor, 'patch', 'organizations/' + orgId, profile()).expect(403);
      await call(actor, 'post', 'organizations/' + orgId + '/invitations', {
        email: email(),
        role: 'OWNER',
      }).expect(403);
      await call(actor, 'patch', 'organizations/' + orgId + '/members/' + actor.id, {
        role: 'OWNER',
      }).expect(403);
      await call(actor, 'delete', 'organizations/' + orgId + '/members/' + owner.id).expect(403);
      await call(actor, 'delete', 'organizations/' + orgId + '/logo').expect(403);
      await call(actor, 'get', 'platform/organizations').expect(403);
    });
  }
  it('returns database-backed organizer metrics and UTC activity without fabricated event measures', async () => {
    const response = await call(
      owner,
      'get',
      'organizations/' + orgId + '/dashboard/overview',
    ).expect(200);
    expect(response.headers['cache-control']).toBe('no-store');
    expect(response.body.organizationId).toBe(orgId);
    expect(response.body.metrics).toEqual({
      members: 4,
      activeMembers: 4,
      activeOwners: 1,
      pendingInvitations: 0,
    });
    expect(response.body.roles).toHaveLength(4);
    expect(response.body.roles.every((row: { count: number }) => row.count === 1)).toBe(true);
    expect(response.body.activity).toHaveLength(7);
    expect(
      response.body.activity.reduce((sum: number, row: { count: number }) => sum + row.count, 0),
    ).toBe(1);
    expect(response.body.activity.at(-1).date).toBe(new Date().toISOString().slice(0, 10));
    expect(response.body).not.toHaveProperty('events');
    expect(response.body).not.toHaveProperty('revenue');
    expect(
      (
        await call(owner, 'get', 'organizations/' + orgId + '/dashboard/overview?range=30').expect(
          200,
        )
      ).body.activity,
    ).toHaveLength(30);
    await call(owner, 'get', 'organizations/' + orgId + '/dashboard/overview?range=365').expect(
      400,
    );
    await call(
      owner,
      'get',
      'organizations/' + orgId + '/dashboard/overview?organizationId=' + otherOrgId,
    ).expect(400);
  });
  it('restricts every organizer read model by live role, tenant and verified session', async () => {
    for (const action of ['overview', 'activity', 'notices']) {
      await call(undefined, 'get', 'organizations/' + orgId + '/dashboard/' + action).expect(401);
      await call(outsider, 'get', 'organizations/' + orgId + '/dashboard/' + action).expect(403);
      await call(
        people.EVENT_MANAGER!,
        'get',
        'organizations/' + orgId + '/dashboard/' + action,
      ).expect(200);
      for (const role of ['CHECK_IN_STAFF', 'PARTICIPANT'])
        await call(people[role]!, 'get', 'organizations/' + orgId + '/dashboard/' + action).expect(
          403,
        );
    }
    await call(outsider, 'post', 'organizations/' + orgId + '/dashboard/search', {
      q: 'Organization',
    }).expect(403);
    await call(people.PARTICIPANT!, 'post', 'organizations/' + orgId + '/dashboard/search', {
      q: 'Organization',
    }).expect(403);
    const unverified = await person(false);
    await call(unverified, 'get', 'organizations/dashboard-options').expect(403);
  });
  it('projects scoped activity and role-appropriate actionable notices without raw audit metadata', async () => {
    const activity = await call(
      owner,
      'get',
      'organizations/' + orgId + '/dashboard/activity',
    ).expect(200);
    expect(activity.body.total).toBe(1);
    expect(activity.body.items[0].action).toBe('ORGANIZATION_CREATED');
    expect(Object.keys(activity.body.items[0]).sort()).toEqual([
      'action',
      'actorName',
      'createdAt',
      'id',
    ]);
    const filtered = await call(
      owner,
      'get',
      'organizations/' + orgId + '/dashboard/activity?action=TEAM',
    ).expect(200);
    expect(filtered.body.items).toEqual([]);
    await call(owner, 'get', 'organizations/' + orgId + '/dashboard/activity?page=0').expect(400);
    await call(owner, 'get', 'organizations/' + orgId + '/dashboard/activity?action=AUTH').expect(
      400,
    );
    const notice = await call(owner, 'get', 'organizations/' + orgId + '/dashboard/notices').expect(
      200,
    );
    expect(notice.body.items).toContainEqual({
      code: 'PROFILE_DETAILS',
      count: 2,
      section: 'settings',
    });
    expect(
      (
        await call(
          people.EVENT_MANAGER!,
          'get',
          'organizations/' + orgId + '/dashboard/notices',
        ).expect(200)
      ).body.items,
    ).toEqual([]);
  });
  it('searches only the current team, validates filters and keeps search strings out of URL paths', async () => {
    const search = await call(owner, 'post', 'organizations/' + orgId + '/dashboard/search', {
      q: owner.email,
    }).expect(200);
    expect(search.body.total).toBe(1);
    expect(search.body.items[0].userId).toBe(owner.id);
    expect(
      (
        await call(owner, 'post', 'organizations/' + orgId + '/dashboard/search', {
          q: outsider.email,
        }).expect(200)
      ).body.total,
    ).toBe(0);
    const managers = await call(owner, 'post', 'organizations/' + orgId + '/dashboard/search', {
      q: 'Organization',
      role: 'EVENT_MANAGER',
    }).expect(200);
    expect(managers.body.items.map((row: { userId: string }) => row.userId)).toEqual([
      people.EVENT_MANAGER!.id,
    ]);
    for (const body of [
      { q: 'a' },
      { q: 'Organization', role: 'PLATFORM_ADMIN' },
      { q: 'Organization', actorId: outsider.id },
      { q: '\u0000bad' },
    ])
      await call(owner, 'post', 'organizations/' + orgId + '/dashboard/search', body).expect(400);
  });
  it('switcher options include only organizer memberships and ownership in another tenant grants no dashboard privilege', async () => {
    const actor = people.CHECK_IN_STAFF!;
    const owned = await createOrg(actor, 'Staff member separate owned organization');
    const options = await call(actor, 'get', 'organizations/dashboard-options').expect(200);
    expect(options.body.items.map((row: { id: string }) => row.id)).toEqual([owned.id]);
    await call(actor, 'get', 'organizations/' + owned.id + '/dashboard/overview').expect(200);
    await call(actor, 'get', 'organizations/' + orgId + '/dashboard/overview').expect(403);
    expect(
      (await call(owner, 'get', 'organizations/dashboard-options').expect(200)).body.items.every(
        (row: { id: string }) => row.id !== otherOrgId,
      ),
    ).toBe(true);
  });
  it('revokes organizer read models immediately on role changes using the same session', async () => {
    const actor = await person();
    await db.organizationMember.create({
      data: { organizationId: orgId, userId: actor.id, role: 'EVENT_MANAGER' },
    });
    await call(actor, 'get', 'organizations/' + orgId + '/dashboard/overview').expect(200);
    await call(owner, 'patch', 'organizations/' + orgId + '/members/' + actor.id, {
      role: 'PARTICIPANT',
    }).expect(200);
    await call(actor, 'get', 'organizations/' + orgId + '/dashboard/overview').expect(403);
    await call(actor, 'post', 'organizations/' + orgId + '/dashboard/search', {
      q: 'Organization',
    }).expect(403);
    await call(owner, 'delete', 'organizations/' + orgId + '/members/' + actor.id).expect(200);
  });
  it('updates profile settings with server validation and persists a sanitized private logo', async () => {
    await call(owner, 'patch', 'organizations/' + orgId, profile('Updated tenant')).expect(200);
    await call(owner, 'patch', 'organizations/' + orgId, {
      ...profile(),
      timezone: 'not-a-timezone',
    }).expect(400);
    await call(owner, 'patch', 'organizations/' + orgId, {
      ...profile(),
      website: 'javascript:alert(1)',
    }).expect(400);
    const image = await sharp({
      create: { width: 600, height: 400, channels: 4, background: '#5ce1c6' },
    })
      .png()
      .toBuffer();
    const upload = (actor: Actor, bytes: Buffer, filename: string) =>
      request(baseUrl)
        .post('/api/v1/organizations/' + orgId + '/logo')
        .set('Cookie', actor.cookie)
        .set('Origin', origin)
        .set('X-Ventro-CSRF', '1')
        .attach('logo', bytes, filename);
    await upload(owner, image, 'brand.png').expect(201);
    const logo = await call(owner, 'get', 'organizations/' + orgId + '/logo').expect(200);
    expect(logo.headers['content-type']).toMatch(/image\/png/);
    expect(logo.headers['cache-control']).toBe('no-store');
    const metadata = await sharp(logo.body as Buffer).metadata();
    expect(metadata.width).toBeLessThanOrEqual(384);
    expect(
      (await call(owner, 'get', 'organizations/' + orgId).expect(200)).body.logoDigest,
    ).toMatch(/^[a-f0-9]{64}$/);
    await upload(people.PARTICIPANT!, image, 'logo.png').expect(403);
    await upload(
      owner,
      Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'),
      'evil.png',
    ).expect(400);
    await upload(owner, Buffer.alloc(2 * 1024 * 1024 + 1), 'large.png').expect(413);
    await call(owner, 'delete', 'organizations/' + orgId + '/logo').expect(200);
    expect(
      (await call(owner, 'get', 'organizations/' + orgId).expect(200)).body.logoDigest,
    ).toBeNull();
  });
  it('delivers a real hashed invitation to an address with no existing account, then binds resolution and acceptance to its verified owner', async () => {
    const address = email();
    const invite = await invitation(address.toUpperCase(), 'EVENT_MANAGER');
    expect(invite.email).toBe(address);
    const raw = await tokenFromMail(address);
    const stored = await db.organizationInvitation.findUniqueOrThrow({ where: { id: invite.id } });
    expect(stored.tokenHash).toBe(tokenHash(raw));
    expect(stored.tokenHash).not.toBe(raw);
    expect(stored.expiresAt.getTime() - Date.now()).toBeGreaterThan(6.9 * 86400000);
    await call(outsider, 'post', 'organizations/invitations/resolve', { token: raw }).expect(400);
    await call(outsider, 'post', 'organizations/invitations/' + invite.id + '/accept').expect(400);
    await call(undefined, 'post', 'auth/register', {
      email: address,
      name: 'Invited real account',
      password,
      locale: 'en',
    }).expect(202);
    const recipient = await login(address);
    await call(recipient, 'post', 'organizations/invitations/resolve', { token: raw }).expect(403);
    const verification = await db.emailVerificationToken.findFirstOrThrow({
      where: { userId: recipient.id, usedAt: null },
    });
    // Verification itself has complete real-email coverage in the authentication suite.
    await db.user.update({ where: { id: recipient.id }, data: { emailVerifiedAt: new Date() } });
    expect(verification.tokenHash).not.toBe(raw);
    await call(recipient, 'post', 'organizations/invitations/resolve', { token: raw }).expect(200);
    const accepted = await Promise.all([
      call(recipient, 'post', 'organizations/invitations/' + invite.id + '/accept'),
      call(recipient, 'post', 'organizations/invitations/' + invite.id + '/accept'),
    ]);
    expect(accepted.map((r) => r.status).sort()).toEqual([200, 400]);
    expect(
      (
        await db.organizationMember.findUniqueOrThrow({
          where: { organizationId_userId: { organizationId: orgId, userId: recipient.id } },
        })
      ).role,
    ).toBe('EVENT_MANAGER');
    expect((await call(recipient, 'get', 'organizations').expect(200)).body.items).toHaveLength(1);
  });
  it('supports explicit rejection and denies expired, revoked and replaced invitations', async () => {
    const recipient = await person();
    let invite = await invitation(recipient.email);
    await call(recipient, 'post', 'organizations/invitations/' + invite.id + '/reject').expect(200);
    await call(recipient, 'post', 'organizations/invitations/' + invite.id + '/accept').expect(400);
    expect(
      await db.organizationMember.count({ where: { organizationId: orgId, userId: recipient.id } }),
    ).toBe(0);
    invite = await invitation(recipient.email);
    const oldHash = (
      await db.organizationInvitation.findUniqueOrThrow({ where: { id: invite.id } })
    ).tokenHash;
    invite = await invitation(recipient.email, 'CHECK_IN_STAFF');
    expect(
      (await db.organizationInvitation.findUniqueOrThrow({ where: { id: invite.id } })).tokenHash,
    ).not.toBe(oldHash);
    await db.organizationInvitation.update({
      where: { id: invite.id },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });
    await call(recipient, 'post', 'organizations/invitations/' + invite.id + '/accept').expect(400);
    const revoked = await invitation(email());
    await call(
      outsider,
      'delete',
      'organizations/' + otherOrgId + '/invitations/' + revoked.id,
    ).expect(400);
    await call(owner, 'delete', 'organizations/' + orgId + '/invitations/' + revoked.id).expect(
      200,
    );
    expect(
      (await db.organizationInvitation.findUniqueOrThrow({ where: { id: revoked.id } })).status,
    ).toBe('REVOKED');
    await call(owner, 'post', 'organizations/' + orgId + '/invitations', {
      email: email(),
      role: 'PLATFORM_ADMIN',
    }).expect(400);
  });
  it('applies membership changes immediately, clears removed active selections and revokes invitations issued by demoted owners', async () => {
    const manager = people.EVENT_MANAGER!;
    await call(manager, 'post', 'organizations/' + orgId + '/activate').expect(200);
    await call(owner, 'patch', 'organizations/' + orgId + '/members/' + manager.id, {
      role: 'PARTICIPANT',
    }).expect(200);
    await call(manager, 'get', 'organizations/' + orgId + '/members').expect(403);
    await call(owner, 'patch', 'organizations/' + orgId + '/members/' + manager.id, {
      role: 'OWNER',
    }).expect(200);
    const invite = invitationSchema.parse(
      (
        await call(manager, 'post', 'organizations/' + orgId + '/invitations', {
          email: email(),
          role: 'OWNER',
        }).expect(201)
      ).body,
    );
    await call(owner, 'patch', 'organizations/' + orgId + '/members/' + manager.id, {
      role: 'CHECK_IN_STAFF',
    }).expect(200);
    expect(
      (await db.organizationInvitation.findUniqueOrThrow({ where: { id: invite.id } })).status,
    ).toBe('REVOKED');
    await call(owner, 'delete', 'organizations/' + orgId + '/members/' + manager.id).expect(200);
    await call(manager, 'get', 'organizations/' + orgId).expect(403);
    expect(
      (await call(manager, 'get', 'auth/session').expect(200)).body.activeOrganizationId,
    ).toBeNull();
  });
  it('serializes concurrent owner demotions so the last active owner cannot be removed', async () => {
    const actor = await person();
    const tenant = await createOrg(owner);
    await db.organizationMember.create({
      data: { userId: actor.id, organizationId: tenant.id, role: 'OWNER' },
    });
    const attempts = await Promise.all([
      call(owner, 'patch', 'organizations/' + tenant.id + '/members/' + owner.id, {
        role: 'PARTICIPANT',
      }),
      call(actor, 'patch', 'organizations/' + tenant.id + '/members/' + actor.id, {
        role: 'PARTICIPANT',
      }),
    ]);
    expect(attempts.map((r) => r.status).sort()).toEqual([200, 409]);
    expect(
      await db.organizationMember.count({ where: { organizationId: tenant.id, role: 'OWNER' } }),
    ).toBe(1);
    await call(owner, 'delete', 'organizations/' + orgId + '/members/' + owner.id).expect(409);
  });
  it('separates global platform administration from tenant membership and never grants it through a team role', async () => {
    const admin = await person();
    execFileSync(process.execPath, ['prisma/platform-admin.mjs', '--grant', admin.email], {
      env: process.env,
      timeout: 30000,
      stdio: 'pipe',
    });
    const listing = await call(admin, 'get', 'platform/organizations').expect(200);
    expect(listing.body.items.some((item: { id: string }) => item.id === orgId)).toBe(true);
    expect(JSON.stringify(listing.body)).not.toContain(owner.email);
    await call(admin, 'get', 'organizations/' + orgId).expect(403);
    await call(admin, 'patch', 'organizations/' + orgId, profile()).expect(403);
    execFileSync(process.execPath, ['prisma/platform-admin.mjs', '--revoke', admin.email], {
      env: process.env,
      timeout: 30000,
      stdio: 'pipe',
    });
    await call(admin, 'get', 'platform/organizations').expect(403);
    expect(
      await db.auditLog.count({
        where: {
          action: 'PLATFORM_ROLE_CHANGED',
          metadata: { path: ['userId'], equals: admin.id },
        },
      }),
    ).toBe(2);
  });
  it('allows removing a disabled owner while preserving the sole active owner', async () => {
    const inactive = await person();
    const tenant = await createOrg(owner);
    await db.organizationMember.create({
      data: { organizationId: tenant.id, userId: inactive.id, role: 'OWNER' },
    });
    await db.user.update({ where: { id: inactive.id }, data: { status: 'DISABLED' } });
    await call(inactive, 'get', 'organizations/' + tenant.id).expect(401);
    await call(owner, 'delete', 'organizations/' + tenant.id + '/members/' + inactive.id).expect(
      200,
    );
    await call(owner, 'delete', 'organizations/' + tenant.id + '/members/' + owner.id).expect(409);
    expect(
      await db.organizationMember.count({
        where: { organizationId: tenant.id, role: 'OWNER', user: { status: 'ACTIVE' } },
      }),
    ).toBe(1);
  });
  it('denies archived tenants and records sensitive operations without tokens or raw recipient addresses', async () => {
    const tenant = await createOrg(owner);
    await db.organization.update({ where: { id: tenant.id }, data: { archivedAt: new Date() } });
    await call(owner, 'get', 'organizations/' + tenant.id).expect(403);
    const rows = await db.auditLog.findMany({ where: { organizationId: orgId } });
    for (const action of [
      'ORGANIZATION_CREATED',
      'ORGANIZATION_PROFILE_UPDATED',
      'ORGANIZATION_LOGO_UPDATED',
      'ORGANIZATION_ROLE_CHANGED',
      'ORGANIZATION_MEMBER_REMOVED',
      'ORGANIZATION_INVITATION_ACCEPTED',
      'ORGANIZATION_INVITATION_REJECTED',
      'ORGANIZATION_INVITATION_REVOKED',
      'ORGANIZATION_SWITCHED',
    ])
      expect(rows.map((row) => row.action)).toContain(action);
    expect(JSON.stringify(rows)).not.toContain('#token=');
    expect(JSON.stringify(rows)).not.toContain('@example.test');
    expect(rows.every((row) => row.actorId && row.requestId && row.networkHash)).toBe(true);
  });
});
