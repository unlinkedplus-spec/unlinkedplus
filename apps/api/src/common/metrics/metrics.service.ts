import { Injectable } from '@nestjs/common';
import { collectDefaultMetrics, Counter, Gauge, Histogram, Registry } from 'prom-client';

/**
 * Registry metrik Prometheus untuk API.
 *
 * Semua metrik memakai prefix yang konsisten dan label ber-cardinality rendah
 * (route pattern, bukan URL mentah).
 */
@Injectable()
export class MetricsService {
  private readonly registry = new Registry();

  private readonly httpDuration = new Histogram({
    name: 'http_request_duration_seconds',
    help: 'Durasi request HTTP dalam detik',
    labelNames: ['method', 'route', 'status'],
    buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
    registers: [this.registry],
  });

  private readonly httpTotal = new Counter({
    name: 'http_requests_total',
    help: 'Jumlah request HTTP',
    labelNames: ['method', 'route', 'status'],
    registers: [this.registry],
  });

  private readonly cacheEvents = new Counter({
    name: 'cache_events_total',
    help: 'Hasil operasi cache',
    labelNames: ['result'],
    registers: [this.registry],
  });

  private readonly rateLimitDecisions = new Counter({
    name: 'rate_limit_decisions_total',
    help: 'Keputusan rate limiter',
    labelNames: ['bucket', 'decision'],
    registers: [this.registry],
  });

  private readonly breakerState = new Gauge({
    name: 'circuit_breaker_state',
    help: 'Status circuit breaker (0=closed, 1=half_open, 2=open)',
    labelNames: ['name'],
    registers: [this.registry],
  });

  private readonly queueEvents = new Counter({
    name: 'queue_jobs_total',
    help: 'Job antrean yang selesai/gagal',
    labelNames: ['queue', 'result'],
    registers: [this.registry],
  });

  constructor() {
    this.registry.setDefaultLabels({ service: 'unlinked-api' });
    collectDefaultMetrics({ register: this.registry });
  }

  get contentType(): string {
    return this.registry.contentType;
  }

  render(): Promise<string> {
    return this.registry.metrics();
  }

  observeHttp(method: string, route: string, status: number, seconds: number): void {
    const labels = { method, route, status: String(status) };
    this.httpDuration.observe(labels, seconds);
    this.httpTotal.inc(labels);
  }

  countCache(result: string): void {
    this.cacheEvents.inc({ result });
  }

  countRateLimit(bucket: string, decision: string): void {
    this.rateLimitDecisions.inc({ bucket, decision });
  }

  setBreakerState(name: string, state: 'closed' | 'open' | 'half_open'): void {
    const value = state === 'closed' ? 0 : state === 'half_open' ? 1 : 2;
    this.breakerState.set({ name }, value);
  }

  countQueue(queue: string, result: 'completed' | 'failed'): void {
    this.queueEvents.inc({ queue, result });
  }
}
