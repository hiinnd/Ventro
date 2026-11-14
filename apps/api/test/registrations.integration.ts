import { createRequire } from 'node:module';
import { randomUUID } from 'node:crypto';
import { execFileSync, fork, type ChildProcess } from 'node:child_process';
import { resolve } from 'node:path';
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { ConfigService } from '@nestjs/config';
import { Client } from 'pg';
import { config } from 'dotenv';
import request from 'supertest';
import { argon2id, hash } from 'argon2';
import { io, type Socket } from 'socket.io-client';

const compiled = createRequire(import.meta.url);
const { PrismaService } = compiled(
  '../dist/database/prisma.service.js',
) as typeof import('../dist/database/prisma.service.js');
const { validateEnvironment } = compiled(
  '../dist/config/environment.js',
) as typeof import('../dist/config/environment.js');
const run = randomUUID().replaceAll('-', '');
const databaseName = 'ventro_org_it_' + run;
const origin = 'http://127.0.0.1:3000';
const password = 'Registration test password ' + run;
type Actor = { id: string; email: string; cookie: string };
let administrative: Client;
let db: InstanceType<typeof PrismaService>;
let api: ChildProcess | undefined;
let baseUrl = '';
let startupError = '';
let owner: Actor;
let organizationId = '';
let sequence = 0;

function call(
  actor: Actor | undefined,
  method: 'get' | 'post' | 'patch',
  path: string,
  body?: object,
) {
  const requestToApi = request(baseUrl)
    [method]('/api/v1/' + path)
    .set('Origin', origin)
    .set('X-Ventro-CSRF', '1');
  if (actor) requestToApi.set('Cookie', actor.cookie);
  if (method !== 'get') requestToApi.send(body ?? {});
  return requestToApi;
}
async function person(locale = 'en') {
  const email = 'registration-' + run + '-' + ++sequence + '@example.test';
  const passwordHash = await hash(password, {
    type: argon2id,
    memoryCost: 65536,
    timeCost: 2,
    parallelism: 1,
  });
  const user = await db.user.create({
    data: {
      email,
      name: 'Registration test participant',
      passwordHash,
      locale,
      emailVerifiedAt: new Date(),
    },
  });
  const result = await call(undefined, 'post', 'auth/login', { email, password }).expect(200);
  return {
    id: user.id,
    email,
    cookie: (result.headers['set-cookie'] as unknown as string[])[0]!.split(';')[0]!,
  };
}
async function waitFor<T>(operation: () => Promise<T | undefined>, timeout = 25000): Promise<T> {
  const end = Date.now() + timeout;
  do {
    const value = await operation();
    if (value !== undefined) return value;
    await new Promise((resolve) => setTimeout(resolve, 250));
  } while (Date.now() < end);
  throw new Error('Timed out waiting for registration email delivery');
}
async function eventEmail(email: string, subject = 'Your VENTRO registration is confirmed') {
  return waitFor(async () => {
    const response = await fetch(
      'http://127.0.0.1:8025/api/v1/search?query=' + encodeURIComponent('to:' + email),
    );
    const result = (await response.json()) as { messages?: { ID: string; Subject: string }[] };
    const summary = result.messages?.find((message) => message.Subject === subject);
    if (!summary) return undefined;
    return (await (await fetch('http://127.0.0.1:8025/api/v1/message/' + summary.ID)).json()) as {
      Text: string;
      HTML: string;
      Inline?: unknown[];
    };
  });
}
async function event(capacity: number | null, deadline?: Date) {
  const row = await db.event.create({
    data: {
      organizationId,
      title: 'Registration event ' + ++sequence,
      description: 'A complete public event',
      slug: 'registration-' + run + '-' + sequence,
      status: 'PUBLISHED',
      visibility: 'PUBLIC',
      venue: 'Amman',
      startsAt: new Date(Date.now() + 86_400_000),
      endsAt: new Date(Date.now() + 172_800_000),
      capacity,
      registrationDeadline: deadline,
    },
  });
  const form = await db.registrationForm.create({ data: { eventId: row.id, status: 'PUBLISHED' } });
  await db.formField.createMany({
    data: [
      {
        registrationFormId: form.id,
        key: 'email',
        type: 'EMAIL',
        label: 'Email',
        required: true,
        position: 0,
      },
      {
        registrationFormId: form.id,
        key: 'consent',
        type: 'CONSENT',
        label: 'Consent',
        required: true,
        position: 1,
      },
    ],
  });
  return row;
}
const answers = { email: 'participant@example.test', consent: true };

describe('dynamic registration integration with an isolated PostgreSQL database', () => {
  beforeAll(async () => {
    config({ path: resolve('../../.env'), quiet: true });
    const url = new URL(process.env.DATABASE_URL!);
    if (!['localhost', '127.0.0.1'].includes(url.hostname))
      throw new Error('Local database required');
    administrative = new Client({ connectionString: url.href });
    await administrative.connect();
    await administrative.query('CREATE DATABASE "' + databaseName + '"');
    url.pathname = '/' + databaseName;
    Object.assign(process.env, {
      NODE_ENV: 'test',
      AI_PROVIDER: 'disabled',
      DATABASE_URL: url.href,
      AUTH_APP_URL: origin,
      WEB_ORIGINS: origin,
      AUTH_RATE_NAMESPACE: 'registration-it-' + run,
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
      { env: process.env, timeout: 60_000, stdio: 'pipe' },
    );
    db = new PrismaService(new ConfigService(validateEnvironment(process.env)) as never);
    api = fork(resolve('test/integration-server.mjs'), [], {
      env: process.env,
      execArgv: [],
      silent: true,
    });
    api.stdout?.resume();
    api.stderr?.on('data', (value) => {
      startupError += String(value);
    });
    baseUrl = await new Promise((ready, reject) => {
      const timeout = setTimeout(
        () => reject(new Error('API startup timeout: ' + startupError)),
        45_000,
      );
      api!.once('message', (message: unknown) => {
        clearTimeout(timeout);
        if (
          message &&
          typeof message === 'object' &&
          'port' in message &&
          typeof message.port === 'number'
        )
          ready('http://127.0.0.1:' + message.port);
        else reject(new Error('Invalid API readiness'));
      });
      api!.once('exit', (code) => reject(new Error('API exited: ' + code + ' ' + startupError)));
    });
    owner = await person();
    const org = await db.organization.create({
      data: {
        name: 'Registration fixture',
        slug: 'registration-fixture-' + run,
        members: { create: { userId: owner.id, role: 'OWNER' } },
      },
    });
    organizationId = org.id;
  }, 120_000);
  afterAll(async () => {
    if (api?.exitCode === null) {
      api.send?.('stop');
      await new Promise<void>((done) => api!.once('exit', () => done()));
    }
    await db?.onModuleDestroy();
    await administrative?.query('DROP DATABASE IF EXISTS "' + databaseName + '" WITH (FORCE)');
    await administrative?.end();
  }, 30_000);

  it('protects optional AI endpoints and reports disabled configuration without generation', async () => {
    await call(undefined, 'get', 'organizations/' + organizationId + '/ai').expect(401);
    const outsider = await person();
    await call(outsider, 'get', 'organizations/' + organizationId + '/ai').expect(403);
    await call(owner, 'get', 'organizations/' + organizationId + '/ai')
      .expect(200)
      .expect((response) => expect(response.body.enabled).toBe(false));
    await call(owner, 'post', 'organizations/' + organizationId + '/ai', {
      task: 'description',
      brief: 'A technology workshop in Amman',
      locale: 'en',
      authorizedNonPersonalInput: true,
    }).expect(503);
    await call(owner, 'post', 'organizations/' + organizationId + '/ai', {
      task: 'execute',
      brief: 'x',
      locale: 'en',
      authorizedNonPersonalInput: false,
    }).expect(400);
  });
  it('stores validated responses, rejects duplicates, and exposes only authorized organizer results', async () => {
    const row = await event(10);
    const participant = await person();
    const receipt = await call(participant, 'post', 'events/' + row.slug + '/registrations', {
      answers,
    }).expect(201);
    expect(receipt.body.status).toBe('CONFIRMED');
    expect(await db.registrationAnswer.count({ where: { registrationId: receipt.body.id } })).toBe(
      2,
    );
    const delivery = await waitFor(async () => {
      return (
        (await db.emailOutbox.findFirst({
          where: { userId: participant.id, kind: 'EVENT_NOTIFICATION', status: 'SENT' },
        })) ?? undefined
      );
    });
    expect(delivery.encryptedPayload).toBe('');
    const email = await eventEmail(participant.email);
    expect(email.Text).toContain('Registration event');
    expect(email.Text).toContain('/en/tickets');
    expect(email.HTML).toContain('cid:ventro-ticket-qr');
    expect(JSON.stringify(email.Inline ?? [])).toContain('ventro-ticket-qr');
    expect(
      await db.notification.findFirst({
        where: { userId: participant.id, kind: 'REGISTRATION_CONFIRMED' },
      }),
    ).not.toBeNull();
    const arabicParticipant = await person('ar');
    await call(arabicParticipant, 'post', 'events/' + row.slug + '/registrations', {
      answers: { email: 'arabic@example.test', consent: true },
    }).expect(201);
    const arabicEmail = await eventEmail(arabicParticipant.email, 'تم تأكيد تسجيلك وتذكرتك جاهزة');
    expect(arabicEmail.Text).toContain('الفعالية: Registration event');
    expect(arabicEmail.Text).toContain('/ar/tickets');
    expect(arabicEmail.HTML).toContain('lang="ar" dir="rtl"');
    expect(JSON.stringify(arabicEmail.Inline ?? [])).toContain('ventro-ticket-qr');
    await call(participant, 'post', 'events/' + row.slug + '/registrations', { answers }).expect(
      409,
    );
    await call(participant, 'post', 'events/' + row.slug + '/registrations', {
      answers: { email: 'not-an-email', consent: false },
    }).expect(409);
    await call(
      owner,
      'get',
      'organizations/' + organizationId + '/events/' + row.id + '/registrations?q=participant',
    ).expect(200);
    const outsider = await person();
    await call(
      outsider,
      'get',
      'organizations/' + organizationId + '/events/' + row.id + '/registrations',
    ).expect(403);
  });
  it('registers a guest without a session, emails an opaque QR ticket, and prevents duplicate email enrollment', async () => {
    const row = await event(10);
    const guestEmail = 'guest-' + run + '@example.test';
    const receipt = await call(undefined, 'post', 'events/' + row.slug + '/registrations', {
      registrationType: 'GUEST',
      guestName: 'Guest attendee',
      guestEmail,
      locale: 'en',
      answers: { email: guestEmail, consent: true },
    }).expect(201);
    expect(receipt.body).toMatchObject({
      registrationType: 'GUEST',
      ticketAvailable: true,
      emailNotificationQueued: true,
    });
    const registration = await db.registration.findUniqueOrThrow({
      where: { id: receipt.body.id },
    });
    expect(registration).toMatchObject({
      userId: null,
      attendeeName: 'Guest attendee',
      attendeeEmail: guestEmail,
    });
    const email = await eventEmail(guestEmail);
    expect(email.Text).toContain('Registration event');
    expect(email.Text).not.toContain('/en/tickets');
    expect(email.HTML).toContain('cid:ventro-ticket-qr');
    expect(JSON.stringify(email.Inline ?? [])).toContain('ventro-ticket-qr');
    await call(undefined, 'post', 'events/' + row.slug + '/registrations', {
      registrationType: 'GUEST',
      guestName: 'Guest attendee',
      guestEmail: guestEmail.toUpperCase(),
      locale: 'en',
      answers: { email: guestEmail, consent: true },
    }).expect(409);
    await call(undefined, 'post', 'events/' + row.slug + '/registrations', { answers }).expect(403);
    const organizerRows = await call(
      owner,
      'get',
      'organizations/' + organizationId + '/events/' + row.id + '/registrations?q=Guest',
    ).expect(200);
    expect(organizerRows.body.items[0]).toMatchObject({
      name: 'Guest attendee',
      email: guestEmail,
    });
    const ticket = await db.ticket.findUniqueOrThrow({
      where: { registrationId: registration.id },
    });
    await call(
      owner,
      'post',
      'organizations/' + organizationId + '/events/' + row.id + '/check-in/scan',
      { credential: ticket.credential },
    ).expect(200);
  });
  it('creates, validates, publishes, protects, duplicates and cancels events within the tenant', async () => {
    const draft = await call(owner, 'post', 'organizations/' + organizationId + '/events').expect(
      201,
    );
    const startsAt = new Date(Date.now() + 7 * 86_400_000);
    const endsAt = new Date(Date.now() + 7 * 86_400_000 + 3_600_000);
    await call(owner, 'patch', 'organizations/' + organizationId + '/events/' + draft.body.id, {
      title: 'Validated public event',
      description: 'A complete event description',
      category: 'Technology',
      visibility: 'PUBLIC',
      locationType: 'VENUE',
      venue: 'Amman',
      timezone: 'Asia/Amman',
      startsAt: endsAt.toISOString(),
      endsAt: startsAt.toISOString(),
    }).expect(400);
    const saved = await call(
      owner,
      'patch',
      'organizations/' + organizationId + '/events/' + draft.body.id,
      {
        title: 'Validated public event',
        description: 'A complete event description',
        category: 'Technology',
        visibility: 'PUBLIC',
        locationType: 'VENUE',
        venue: 'Amman',
        timezone: 'Asia/Amman',
        startsAt: startsAt.toISOString(),
        endsAt: endsAt.toISOString(),
        capacity: 20,
        registrationDeadline: new Date(startsAt.getTime() - 60_000).toISOString(),
        speakers: [{ name: 'Speaker One', title: 'Host' }],
        sessions: [
          {
            title: 'Opening',
            startsAt: startsAt.toISOString(),
            endsAt: endsAt.toISOString(),
            speakerIndex: 0,
          },
        ],
      },
    ).expect(200);
    await call(
      owner,
      'post',
      'organizations/' + organizationId + '/events/' + draft.body.id + '/publish',
    ).expect(200);
    expect(
      (await call(undefined, 'get', 'events?category=Technology').expect(200)).body.items.map(
        (item: { id: string }) => item.id,
      ),
    ).toContain(draft.body.id);
    await call(
      owner,
      'post',
      'organizations/' + organizationId + '/events/' + draft.body.id + '/duplicate',
    ).expect(200);
    await call(owner, 'patch', 'organizations/' + organizationId + '/events/' + draft.body.id, {
      visibility: 'PRIVATE',
    }).expect(200);
    await call(undefined, 'get', 'events/' + saved.body.slug).expect(404);
    await call(
      owner,
      'post',
      'organizations/' + organizationId + '/events/' + draft.body.id + '/unpublish',
    ).expect(200);
    await call(
      owner,
      'post',
      'organizations/' + organizationId + '/events/' + draft.body.id + '/cancel',
    ).expect(200);
    const outsider = await person();
    await call(
      outsider,
      'get',
      'organizations/' + organizationId + '/events/' + draft.body.id,
    ).expect(403);
  });
  it('enforces a capacity of one under concurrent registrations', async () => {
    const row = await event(1);
    const first = await person();
    const second = await person();
    const results = await Promise.all([
      call(first, 'post', 'events/' + row.slug + '/registrations', { answers }),
      call(second, 'post', 'events/' + row.slug + '/registrations', { answers }),
    ]);
    expect(results.map((result) => result.status).sort()).toEqual([201, 409]);
    expect(await db.registration.count({ where: { eventId: row.id, status: 'CONFIRMED' } })).toBe(
      1,
    );
  });
  it('rejects registration after the deadline and never exposes private events', async () => {
    const closed = await event(10, new Date(Date.now() - 1_000));
    const participant = await person();
    await call(participant, 'post', 'events/' + closed.slug + '/registrations', { answers }).expect(
      400,
    );
    await db.event.update({ where: { id: closed.id }, data: { visibility: 'PRIVATE' } });
    await call(participant, 'get', 'events/' + closed.slug + '/registration-form').expect(404);
  });

  it('issues an opaque ticket and prevents duplicate or unauthorized check-ins', async () => {
    const row = await event(10);
    const participant = await person();
    await call(participant, 'post', 'events/' + row.slug + '/registrations', { answers }).expect(
      201,
    );
    const tickets = await call(participant, 'get', 'tickets/me').expect(200);
    expect(tickets.body.items).toHaveLength(1);
    expect(tickets.body.items[0].credential).toMatch(/^[0-9a-f-]{36}$/);
    await call(
      owner,
      'post',
      'organizations/' + organizationId + '/events/' + row.id + '/check-in/scan',
      { credential: randomUUID() },
    ).expect(404);
    await call(
      owner,
      'post',
      'organizations/' + organizationId + '/events/' + row.id + '/check-in/scan',
      { credential: tickets.body.items[0].credential },
    ).expect(200);
    await call(
      owner,
      'post',
      'organizations/' + organizationId + '/events/' + row.id + '/check-in/scan',
      { credential: tickets.body.items[0].credential },
    ).expect(409);
    const stats = await call(
      owner,
      'get',
      'organizations/' + organizationId + '/events/' + row.id + '/check-in',
    ).expect(200);
    expect(stats.body).toMatchObject({ registered: 1, checkedIn: 1, attendancePercent: 100 });
    const outsider = await person();
    await call(
      outsider,
      'post',
      'organizations/' + organizationId + '/events/' + row.id + '/check-in/scan',
      { credential: tickets.body.items[0].credential },
    ).expect(403);
    const second = await event(10);
    const secondParticipant = await person();
    await call(secondParticipant, 'post', 'events/' + second.slug + '/registrations', {
      answers,
    }).expect(201);
    const secondTicket = (await call(secondParticipant, 'get', 'tickets/me').expect(200)).body
      .items[0];
    await call(
      owner,
      'post',
      'organizations/' + organizationId + '/tickets/' + secondTicket.id + '/revoke',
    ).expect(200);
    await call(
      owner,
      'post',
      'organizations/' + organizationId + '/events/' + second.id + '/check-in/scan',
      { credential: secondTicket.credential },
    ).expect(409);
  });
  it('persists live poll votes and Q&A while rejecting duplicate, closed, and unauthorized actions', async () => {
    const row = await event(10);
    const first = await person();
    const second = await person();
    const outsider = await person();
    await call(first, 'post', 'events/' + row.slug + '/registrations', { answers }).expect(201);
    await call(second, 'post', 'events/' + row.slug + '/registrations', {
      answers: { email: 'second@example.test', consent: true },
    }).expect(201);
    const poll = await call(owner, 'post', 'engagement/events/' + row.id + '/polls', {
      question: 'Choose one',
      options: ['First', 'Second'],
      multiple: false,
    }).expect(201);
    await call(owner, 'post', 'engagement/polls/' + poll.body.id + '/launch').expect(200);
    await call(first, 'post', 'engagement/polls/' + poll.body.id + '/vote', {
      optionIds: [poll.body.options[0].id],
    }).expect(200);
    await call(first, 'post', 'engagement/polls/' + poll.body.id + '/vote', {
      optionIds: [poll.body.options[0].id],
    }).expect(409);
    await call(outsider, 'post', 'engagement/polls/' + poll.body.id + '/vote', {
      optionIds: [poll.body.options[1].id],
    }).expect(404);
    await call(owner, 'post', 'engagement/polls/' + poll.body.id + '/close').expect(200);
    await call(second, 'post', 'engagement/polls/' + poll.body.id + '/vote', {
      optionIds: [poll.body.options[1].id],
    }).expect(409);
    const question = await call(first, 'post', 'engagement/events/' + row.id + '/questions', {
      content: 'Will slides be shared?',
    }).expect(201);
    await call(second, 'post', 'engagement/questions/' + question.body.id + '/upvote').expect(200);
    await call(second, 'post', 'engagement/questions/' + question.body.id + '/upvote').expect(409);
    await call(owner, 'post', 'engagement/questions/' + question.body.id + '/answer').expect(200);
  });
  it('broadcasts live results to authorized clients and rejects unauthorized event rooms', async () => {
    const row = await event(10);
    const first = await person();
    const second = await person();
    const outsider = await person();
    await call(first, 'post', 'events/' + row.slug + '/registrations', { answers }).expect(201);
    await call(second, 'post', 'events/' + row.slug + '/registrations', {
      answers: { email: 'socket@example.test', consent: true },
    }).expect(201);
    const poll = await call(owner, 'post', 'engagement/events/' + row.id + '/polls', {
      question: 'Live choice',
      options: ['One', 'Two'],
      multiple: false,
    }).expect(201);
    await call(owner, 'post', 'engagement/polls/' + poll.body.id + '/launch').expect(200);
    const connect = (actor: Actor) =>
      io(baseUrl + '/engagement', {
        autoConnect: false,
        transports: ['websocket'],
        extraHeaders: { Origin: origin, Cookie: actor.cookie },
      });
    const clientA = connect(first);
    const clientB = connect(second);
    const denied = connect(outsider);
    try {
      const join = (client: Socket) =>
        new Promise<void>((done, reject) => {
          client.once('room:ready', () => done());
          client.once('connect', () => client.emit('room:join', { eventId: row.id }));
          client.once('connect_error', reject);
          client.connect();
        });
      await Promise.all([join(clientA), join(clientB)]);
      const result = new Promise<{ options: { id: string; votes: number }[] }>((done, reject) => {
        const timeout = setTimeout(() => reject(new Error('Live result timeout')), 5000);
        clientB.once('poll:results', (value) => {
          clearTimeout(timeout);
          done(value);
        });
      });
      clientA.emit('poll:vote', { pollId: poll.body.id, optionIds: [poll.body.options[0].id] });
      expect(
        (await result).options.find((option) => option.id === poll.body.options[0].id)?.votes,
      ).toBe(1);
      const rejected = await new Promise<boolean>((done) => {
        denied.once('room:error', () => done(true));
        denied.once('disconnect', () => done(false));
        denied.once('connect', () => denied.emit('room:join', { eventId: row.id }));
        denied.connect();
      });
      expect(rejected).toBe(true);
    } finally {
      clientA.disconnect();
      clientB.disconnect();
      denied.disconnect();
    }
  });
  it('issues eligible PDF certificates, verifies revocation, and respects passport privacy', async () => {
    const row = await event(10);
    const participant = await person();
    const registration = await call(participant, 'post', 'events/' + row.slug + '/registrations', {
      answers,
    }).expect(201);
    const ticket = await db.ticket.findUniqueOrThrow({
      where: { registrationId: registration.body.id },
    });
    await call(
      owner,
      'post',
      'organizations/' + organizationId + '/events/' + row.id + '/check-in/scan',
      { credential: ticket.credential },
    ).expect(200);
    await db.event.update({
      where: { id: row.id },
      data: { startsAt: new Date(Date.now() - 172800000), endsAt: new Date(Date.now() - 86400000) },
    });
    const template = await call(
      owner,
      'post',
      'organizations/' + organizationId + '/events/' + row.id + '/certificate-templates',
      { name: 'Attendance certificate', learningHours: 4, requiresEventCheckIn: true },
    ).expect(201);
    await call(
      owner,
      'post',
      'organizations/' +
        organizationId +
        '/events/' +
        row.id +
        '/certificate-templates/' +
        template.body.id +
        '/issue',
    ).expect(200);
    let certificate: { id: string; verificationId: string } | null = null;
    for (let i = 0; i < 30; i++) {
      certificate = await db.certificate.findFirst({
        where: { registrationId: registration.body.id, status: 'GENERATED' },
        select: { id: true, verificationId: true },
      });
      if (certificate) break;
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    expect(certificate).not.toBeNull();
    await call(participant, 'get', 'certificates/me').expect(200);
    await call(participant, 'get', 'certificates/' + certificate!.id + '/download')
      .expect('Content-Type', /application\/pdf/)
      .expect(200);
    await call(undefined, 'get', 'certificates/verify/' + certificate!.verificationId)
      .expect(200)
      .expect((response) => expect(response.body.valid).toBe(true));
    const passport = await call(participant, 'get', 'certificates/me/passport').expect(200);
    await call(participant, 'patch', 'certificates/me/passport', {
      profileVisible: true,
      eventsVisible: true,
      certificatesVisible: true,
      attendanceVisible: false,
      learningHoursVisible: true,
    }).expect(200);
    await call(undefined, 'get', 'passports/' + passport.body.slug)
      .expect(200)
      .expect((response) => expect(response.body.certificates).toHaveLength(1));
    await call(
      owner,
      'post',
      'organizations/' + organizationId + '/certificates/' + certificate!.id + '/revoke',
      { reason: 'Issued in error' },
    ).expect(200);
    await call(undefined, 'get', 'certificates/verify/' + certificate!.verificationId)
      .expect(200)
      .expect((response) => expect(response.body.valid).toBe(false));
  });
});
