import { Injectable } from '@nestjs/common';
import type { HealthResponse } from '@ventro/types';
import { PrismaService } from '../database/prisma.service';
import { RedisService } from '../redis/redis.service';

@Injectable()
export class HealthService {
  constructor(
    private readonly database: PrismaService,
    private readonly redis: RedisService,
  ) {}
  async check(): Promise<HealthResponse> {
    const [database, redis] = await Promise.allSettled([this.database.ping(), this.redis.ping()]);
    return {
      status: database.status === 'fulfilled' && redis.status === 'fulfilled' ? 'ok' : 'degraded',
      service: 'ventro-api',
      timestamp: new Date().toISOString(),
      checks: {
        database: database.status === 'fulfilled' ? 'up' : 'down',
        redis: redis.status === 'fulfilled' ? 'up' : 'down',
      },
    };
  }
}
