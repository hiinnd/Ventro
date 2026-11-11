import { createRequire } from 'node:module';
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { Test } from '@nestjs/testing';
import { Controller, Post, Body, Get, type INestApplication } from '@nestjs/common';
import { IsString, MinLength } from 'class-validator';
import request from 'supertest';

const requireCompiled = createRequire(import.meta.url);
const { AppModule } = requireCompiled(
  '../dist/app.module.js',
) as typeof import('../dist/app.module.js');
const { configureApp } = requireCompiled(
  '../dist/config/configure-app.js',
) as typeof import('../dist/config/configure-app.js');
const { PrismaService } = requireCompiled(
  '../dist/database/prisma.service.js',
) as typeof import('../dist/database/prisma.service.js');
const { RedisService } = requireCompiled(
  '../dist/redis/redis.service.js',
) as typeof import('../dist/redis/redis.service.js');

class ProbeDto {
  name!: string;
}
IsString()(ProbeDto.prototype, 'name');
MinLength(2)(ProbeDto.prototype, 'name');
class ProbeController {
  create(body: ProbeDto) {
    return body;
  }
  fail() {
    throw new Error('private-database-password');
  }
}
Controller('validation-probe')(ProbeController);
const createDescriptor = Object.getOwnPropertyDescriptor(ProbeController.prototype, 'create')!;
Post()(ProbeController.prototype, 'create', createDescriptor);
Body()(ProbeController.prototype, 'create', 0);
Reflect.defineMetadata('design:paramtypes', [ProbeDto], ProbeController.prototype, 'create');
Get('fail')(
  ProbeController.prototype,
  'fail',
  Object.getOwnPropertyDescriptor(ProbeController.prototype, 'fail')!,
);

describe('HTTP infrastructure (dependency doubles; not live database verification)', () => {
  let app: INestApplication;
  const database = { ping: vi.fn(async () => {}) };
  const redis = { ping: vi.fn(async () => {}) };
  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    process.env.DATABASE_URL ??= 'postgresql://test:test@127.0.0.1:5432/test';
    process.env.REDIS_URL ??= 'redis://127.0.0.1:6379';
    process.env.WEB_ORIGINS = 'http://localhost:3000,http://127.0.0.1:3000';
    process.env.LOG_LEVEL = 'silent';
    process.env.SWAGGER_ENABLED = 'true';
    const module = await Test.createTestingModule({
      imports: [AppModule],
      controllers: [ProbeController],
    })
      .overrideProvider(PrismaService)
      .useValue(database)
      .overrideProvider(RedisService)
      .useValue(redis)
      .compile();
    app = module.createNestApplication();
    configureApp(app);
    await app.init();
  });
  afterAll(async () => {
    await app?.close();
  });
  it('serves version-neutral readiness and liveness', async () => {
    await request(app.getHttpServer())
      .get('/api/health')
      .expect(200)
      .expect(({ body }) => expect(body.status).toBe('ok'));
    expect(database.ping).toHaveBeenCalled();
    expect(redis.ping).toHaveBeenCalled();
    await request(app.getHttpServer()).get('/api/health/live').expect(200);
  });
  it('returns 503 for a failed dependency', async () => {
    database.ping.mockRejectedValueOnce(new Error('private connection'));
    await request(app.getHttpServer())
      .get('/api/health')
      .expect(503)
      .expect(({ body }) => {
        expect(body.checks.database).toBe('down');
        expect(JSON.stringify(body)).not.toContain('private');
      });
  });
  it('permits only explicit browser origins', async () => {
    await request(app.getHttpServer())
      .get('/api/health')
      .set('Origin', 'http://localhost:3000')
      .expect('Access-Control-Allow-Origin', 'http://localhost:3000');
    await request(app.getHttpServer())
      .get('/api/health')
      .set('Origin', 'https://untrusted.example')
      .expect(403)
      .expect(({ headers }) => expect(headers['access-control-allow-origin']).toBeUndefined());
  });
  it('handles CORS preflight without credential sharing', async () => {
    await request(app.getHttpServer())
      .options('/api/health')
      .set('Origin', 'http://localhost:3000')
      .set('Access-Control-Request-Method', 'GET')
      .expect(204)
      .expect(({ headers }) => expect(headers['access-control-allow-credentials']).toBeUndefined());
  });
  it('versions domain routes and rejects unknown or invalid payload fields', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/validation-probe')
      .send({ name: 'VENTRO' })
      .expect(201);
    await request(app.getHttpServer())
      .post('/api/v1/validation-probe')
      .send({ name: 'V', admin: true })
      .expect(400);
    await request(app.getHttpServer())
      .post('/api/validation-probe')
      .send({ name: 'VENTRO' })
      .expect(404);
  });
  it('sanitizes unexpected failures', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/validation-probe/fail')
      .expect(500)
      .expect(({ body }) => {
        expect(body.message).toBe('Internal server error');
        expect(JSON.stringify(body)).not.toContain('private-database-password');
      });
  });
  it('uses a consistent error envelope and security headers', async () => {
    await request(app.getHttpServer())
      .get('/api/missing?token=secret')
      .expect(404)
      .expect('X-Content-Type-Options', 'nosniff')
      .expect(({ body }) => {
        expect(body).toMatchObject({ statusCode: 404, error: 'Not Found', path: '/api/missing' });
        expect(body.timestamp).toEqual(expect.any(String));
        expect(JSON.stringify(body)).not.toContain('token=secret');
      });
  });
  it('exposes OpenAPI with readiness failure responses', async () => {
    await request(app.getHttpServer())
      .get('/api/openapi.json')
      .expect(200)
      .expect(({ body }) => {
        expect(body.paths['/api/health'].get.responses['503']).toBeDefined();
      });
  });
});
