import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { access, constants, mkdir } from 'fs/promises';
import { join } from 'path';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { Public } from '../common/decorators/public.decorator';

@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService, private readonly redis: RedisService) {}

  @Public()
  @Get()
  async check() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      await this.redis.client.ping();
      const path = join(process.env.STORAGE_PATH!, 'certificates');
      await mkdir(path, { recursive: true });
      await access(path, constants.W_OK);
    } catch {
      throw new ServiceUnavailableException('Penyimpanan aplikasi belum siap');
    }
    return { status: 'ok', database: 'ok', redis: 'ok', storage: 'ok' };
  }
}
