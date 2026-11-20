import { Controller, Get, Res } from '@nestjs/common';
import { Response } from 'express';
import { Public } from '../decorators/public.decorator';
import { MetricsService } from './metrics.service';

@Controller('metrics')
export class MetricsController {
  constructor(private readonly metrics: MetricsService) {}

  /**
   * Endpoint ini hanya untuk Prometheus di jaringan internal.
   * Jangan diekspos ke publik (blokir di Nginx / security group).
   */
  @Public()
  @Get()
  async scrape(@Res() response: Response): Promise<void> {
    response.setHeader('Content-Type', this.metrics.contentType);
    response.send(await this.metrics.render());
  }
}
