import {
  CanActivate,
  ExecutionContext,
  HttpException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { createHash, randomUUID } from 'crypto';
import { Request, Response } from 'express';
import { MetricsService } from '../metrics/metrics.service';
import { RedisService } from '../../redis/redis.service';

/**
 * Rate limiter Sliding Window Log (Redis ZSET + Lua).
 *
 * Kelebihan dibanding fixed window: tidak ada "burst ganda" di batas menit
 * (mis. 180 request di detik ke-59 dan 180 lagi di detik ke-60).
 *
 * Kebijakan degradasi:
 * - bucket `read`  : fail-open (Redis down -> request tetap dilayani).
 * - bucket `auth`  : fail-closed (cegah brute force saat Redis down).
 * - bucket `write` : fail-closed (cegah lonjakan write ke DB).
 */
const SLIDING_WINDOW_LUA = `
local key    = KEYS[1]
local window = tonumber(ARGV[1])
local limit  = tonumber(ARGV[2])
local member = ARGV[3]

local t = redis.call('TIME')
local now = tonumber(t[1]) * 1000 + math.floor(tonumber(t[2]) / 1000)

redis.call('ZREMRANGEBYSCORE', key, 0, now - window)
local count = redis.call('ZCARD', key)

if count < limit then
  redis.call('ZADD', key, now, member)
  redis.call('PEXPIRE', key, window)
  return {1, limit - count - 1, 0}
end

local oldest = redis.call('ZRANGE', key, 0, 0, 'WITHSCORES')
local retry_after = window
if oldest[2] then
  retry_after = (tonumber(oldest[2]) + window) - now
  if retry_after < 0 then retry_after = 0 end
end
return {0, 0, retry_after}
`;

@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(
    private readonly redis: RedisService,
    private readonly metrics: MetricsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const http = context.switchToHttp();
    const request = http.getRequest<Request>();
    const response = http.getResponse<Response>();

    // Endpoint operasional tidak boleh terkena limit (Prometheus, load balancer).
    if (request.path === '/health' || request.path === '/metrics') return true;

    const auth = [
      '/auth/login',
      '/auth/register',
      '/auth/forgot-password',
      '/auth/reset-password',
      '/auth/email',
    ].includes(request.path);
    const mutation = !['GET', 'HEAD', 'OPTIONS'].includes(request.method);
    const bucket = auth ? 'auth' : mutation ? 'write' : 'read';
    const limit = auth ? 10 : mutation ? 30 : 180;

    const ipHash = createHash('sha256').update(request.ip || 'unknown').digest('hex');
    const key = `limit:${bucket}:${ipHash}`;
    const member = `${Date.now()}-${randomUUID()}`;

    try {
      const raw = (await this.redis.client.eval(
        SLIDING_WINDOW_LUA,
        1,
        key,
        '60000',
        String(limit),
        member,
      )) as [number, number, number];

      const allowed = Number(raw[0]) === 1;
      const remaining = Math.max(0, Number(raw[1]));
      const retryAfterSeconds = Math.max(1, Math.ceil(Number(raw[2]) / 1000));

      response.setHeader('RateLimit-Limit', String(limit));
      response.setHeader('RateLimit-Remaining', String(remaining));
      response.setHeader('RateLimit-Reset', String(retryAfterSeconds));

      if (!allowed) {
        this.metrics.countRateLimit(bucket, 'blocked');
        response.setHeader('Retry-After', String(retryAfterSeconds));
        throw new HttpException(
          'Terlalu banyak permintaan. Coba lagi sebentar lagi.',
          429,
        );
      }

      this.metrics.countRateLimit(bucket, 'allowed');
      return true;
    } catch (error) {
      if (error instanceof HttpException) throw error;

      this.metrics.countRateLimit(bucket, 'error');
      // Redis bermasalah: baca tetap jalan, tulis/auth dilindungi.
      if (bucket === 'read') return true;
      throw new ServiceUnavailableException('Layanan pembatasan permintaan belum siap');
    }
  }
}
