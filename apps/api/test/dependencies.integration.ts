import { createRequire } from 'node:module';
import 'reflect-metadata';
import { describe, expect, it } from 'vitest';
import { ConfigService } from '@nestjs/config';
import { config } from 'dotenv';
import { resolve } from 'node:path';
import { PinoLogger } from 'nestjs-pino';

const requireCompiled = createRequire(import.meta.url);
const { PrismaService } = requireCompiled(
  '../dist/database/prisma.service.js',
) as typeof import('../dist/database/prisma.service.js');
const { RedisService } = requireCompiled(
  '../dist/redis/redis.service.js',
) as typeof import('../dist/redis/redis.service.js');
const { validateEnvironment } = requireCompiled(
  '../dist/config/environment.js',
) as typeof import('../dist/config/environment.js');

describe('real dependency integration (requires PostgreSQL and Redis)', () => {
  it('executes a Prisma SQL query and authenticated Redis PING', async () => {
    config({ path: resolve(process.cwd(), '../../.env'), quiet: true });
    const env = validateEnvironment(process.env);
    const settings = new ConfigService(env);
    const database = new PrismaService(settings as never);
    const logger = new PinoLogger({ pinoHttp: { level: 'silent' } });
    const redis = new RedisService(settings as never, logger);
    try {
      await database.ping();
      const [clock] = await database.$queryRaw<Array<{ now: Date }>>`SELECT NOW() AS now`;
      expect(Math.abs(clock!.now.getTime() - Date.now())).toBeLessThan(5000);
      // Prisma query time also gives Redis time to establish its initial connection.
      await expect(redis.ping()).resolves.toBeUndefined();
      await expect(database.$queryRaw`SELECT current_database() AS database`).resolves.toEqual([
        { database: new URL(env.DATABASE_URL).pathname.slice(1) },
      ]);
    } finally {
      redis.onModuleDestroy();
      await database.onModuleDestroy();
    }
  });
});
