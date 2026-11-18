import { ConfigService } from '@nestjs/config';
import { RedisOptions } from 'ioredis';
import { buildRedisOptions } from '../common/helpers/redis.config';

export const CERTIFICATE_QUEUE = 'certificates';
export const CERTIFICATE_JOB = 'generate';
export const CERTIFICATE_ATTEMPTS = 3;

export interface CertificateJobData {
  certificateId: string;
  postId: string;
  userId: string;
}

export function certificateRedisOptions(config: ConfigService, worker = false): RedisOptions {
  const env: NodeJS.ProcessEnv = {
    REDIS_URL: config.get<string>('REDIS_URL'),
    REDIS_HOST: config.get<string>('REDIS_HOST'),
    REDIS_PORT: config.get<string>('REDIS_PORT'),
    REDIS_PASSWORD: config.get<string>('REDIS_PASSWORD'),
  };
  const options: RedisOptions = {
    ...buildRedisOptions(env),
    // HTTP producers must fail rather than wait forever; blocking workers must keep reconnecting.
    maxRetriesPerRequest: worker ? null : 1,
    connectTimeout: 5000,
  };
  if (env.REDIS_URL) {
    const url = new URL(env.REDIS_URL);
    if (!['redis:', 'rediss:'].includes(url.protocol)) throw new Error('Invalid Redis URL protocol');
    const database = url.pathname.slice(1);
    if (database && !/^\d+$/.test(database)) throw new Error('Invalid Redis database');
    options.db = database ? Number(database) : 0;
    if (!Number.isSafeInteger(options.db)) throw new Error('Invalid Redis database');
    options.username = url.username ? decodeURIComponent(url.username) : undefined;
    if (url.protocol === 'rediss:') options.tls = {};
  }
  if (!Number.isInteger(options.port) || options.port! < 1 || options.port! > 65535) {
    throw new Error('Invalid Redis port');
  }
  return options;
}
