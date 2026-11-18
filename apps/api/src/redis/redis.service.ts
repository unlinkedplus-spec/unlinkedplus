import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import Redis from 'ioredis';
import { buildRedisOptions } from '../common/helpers/redis.config';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  readonly client = new Redis({
    ...buildRedisOptions(), lazyConnect: true, maxRetriesPerRequest: 1,
    connectTimeout: 5000,
  });

  constructor() {
    this.client.on('error', () => undefined);
  }

  async onModuleInit() { await this.client.connect(); }
  async onModuleDestroy() { await this.client.quit(); }
}
