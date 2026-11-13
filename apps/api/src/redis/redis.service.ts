import { Injectable, type OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { PinoLogger } from 'nestjs-pino';
import type { Environment } from '../config/environment';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly client: Redis;
  constructor(config: ConfigService<Environment, true>, logger: PinoLogger) {
    this.client = new Redis(config.get('REDIS_URL', { infer: true }), {
      connectTimeout: 2000,
      commandTimeout: 2000,
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
      retryStrategy: (attempt) => Math.min(attempt * 250, 5000),
    });
    this.client.on('error', () => logger.warn('Redis connection unavailable'));
  }
  async ping(): Promise<void> {
    if ((await this.client.ping()) !== 'PONG') throw new Error('Redis did not respond to PING');
  }
  async rateLimit(key: string, seconds: number): Promise<{ count: number; retryAfter: number }> {
    const result = (await this.client.eval(
      "local n=redis.call('INCR',KEYS[1]); if n==1 then redis.call('EXPIRE',KEYS[1],ARGV[1]) end; return {n,redis.call('TTL',KEYS[1])}",
      1,
      key,
      String(seconds),
    )) as [number, number];
    return { count: result[0], retryAfter: Math.max(1, result[1]) };
  }
  onModuleDestroy(): void {
    this.client.disconnect();
  }
}
