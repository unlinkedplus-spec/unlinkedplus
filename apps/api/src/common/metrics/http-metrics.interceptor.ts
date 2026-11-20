import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Request, Response } from 'express';
import { Observable } from 'rxjs';
import { MetricsService } from './metrics.service';

/**
 * Mencatat metrik setelah response benar-benar selesai (termasuk error yang
 * ditangani exception filter), sehingga status code yang tercatat akurat.
 */
@Injectable()
export class HttpMetricsInterceptor implements NestInterceptor {
  constructor(private readonly metrics: MetricsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();
    const startedAt = process.hrtime.bigint();

    response.once('finish', () => {
      const seconds = Number(process.hrtime.bigint() - startedAt) / 1e9;
      const route = (request as any).route?.path ?? 'unmatched';
      this.metrics.observeHttp(request.method, route, response.statusCode, seconds);
    });

    return next.handle();
  }
}
