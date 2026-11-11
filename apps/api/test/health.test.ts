import { createRequire } from 'node:module';
import { describe, expect, it, vi } from 'vitest';

import { healthResponseSchema } from '@ventro/types';

const requireCompiled = createRequire(import.meta.url);
const { HealthService } = requireCompiled(
  '../dist/health/health.service.js',
) as typeof import('../dist/health/health.service.js');

describe('health readiness', () => {
  it.each([
    [true, true, 'ok', 'up', 'up'],
    [false, true, 'degraded', 'down', 'up'],
    [true, false, 'degraded', 'up', 'down'],
    [false, false, 'degraded', 'down', 'down'],
  ])(
    'reports independent dependency checks (%s, %s)',
    async (dbUp, redisUp, status, database, redis) => {
      const db = {
        ping: vi.fn(async () => {
          if (!dbUp) throw new Error('secret db connection');
        }),
      };
      const cache = {
        ping: vi.fn(async () => {
          if (!redisUp) throw new Error('secret redis connection');
        }),
      };
      const service = new HealthService(db as never, cache as never);
      const response = await service.check();
      expect(response).toMatchObject({ status, checks: { database, redis } });
      expect(healthResponseSchema.safeParse(response).success).toBe(true);
      expect(JSON.stringify(response)).not.toContain('secret');
    },
  );
});
