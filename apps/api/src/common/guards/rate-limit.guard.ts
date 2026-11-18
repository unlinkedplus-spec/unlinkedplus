import { CanActivate, ExecutionContext, HttpException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { createHash } from 'crypto';
import { Request, Response } from 'express';
import { RedisService } from '../../redis/redis.service';

@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(private readonly redis: RedisService) {}

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<Request>();
    if (request.path === '/health') return true;
    const auth = request.path === '/auth/login' || request.path === '/auth/register';
    const mutation = !['GET', 'HEAD', 'OPTIONS'].includes(request.method);
    const limit = auth ? 10 : mutation ? 30 : 180;
    const bucket = auth ? 'auth' : mutation ? 'write' : 'read';
    const ipHash = createHash('sha256').update(request.ip || '').digest('hex');
    let count: number;
    try {
      count = Number(await this.redis.client.eval(
        "local n=redis.call('INCR',KEYS[1]); if n==1 then redis.call('PEXPIRE',KEYS[1],60000) end; return n",
        1, `limit:${bucket}:${ipHash}`,
      ));
    } catch {
      throw new ServiceUnavailableException('Layanan pembatasan permintaan belum siap');
    }
    if (count > limit) {
      context.switchToHttp().getResponse<Response>().setHeader('Retry-After', '60');
      throw new HttpException('Terlalu banyak permintaan. Coba lagi dalam satu menit.', 429);
    }
    return true;
  }
}
