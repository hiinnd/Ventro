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
  onModuleDestroy(): void {
    this.client.disconnect();
  }
}
