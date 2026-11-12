import { Injectable, ServiceUnavailableException, type OnModuleInit } from '@nestjs/common';
import * as argon2 from 'argon2';
import { randomToken } from './crypto';

const options = { type: argon2.argon2id, memoryCost: 65536, timeCost: 3, parallelism: 1 } as const;
@Injectable()
export class PasswordService implements OnModuleInit {
  private active = 0;
  private readonly waiting: Array<() => void> = [];
  private dummyHash = '';
  async onModuleInit() {
    this.dummyHash = await this.hash(randomToken());
  }
  private async bounded<T>(operation: () => Promise<T>): Promise<T> {
    if (this.active >= 2) {
      if (this.waiting.length >= 8)
        throw new ServiceUnavailableException('Authentication temporarily unavailable');
      await new Promise<void>((resolve) => this.waiting.push(resolve));
    } else this.active++;
    try {
      return await operation();
    } finally {
      const next = this.waiting.shift();
      if (next) next();
      else this.active--;
    }
  }
  hash(password: string) {
    return this.bounded(() => argon2.hash(password, options));
  }
  verify(hash: string | undefined, password: string) {
    return this.bounded(async () => {
      const valid = await argon2.verify(hash ?? this.dummyHash, password);
      return Boolean(hash && valid);
    });
  }
}
