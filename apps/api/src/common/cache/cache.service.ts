import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { RedisService } from '../../redis/redis.service';
import { MetricsService } from '../metrics/metrics.service';
import { CircuitBreaker } from '../resilience/circuit-breaker';

/**
 * Cache-Aside dengan perlindungan Cache Stampede.
 *
 * Lapisan perlindungan:
 * 1. Single-flight per proses  -> request paralel untuk key yang sama hanya
 *    menjalankan loader sekali di satu instance.
 * 2. Distributed lock (Redis)  -> antar instance hanya satu yang mengisi cache.
 * 3. Stale-While-Revalidate    -> data lama tetap disajikan sementara satu
 *    proses memperbarui cache di belakang.
 * 4. TTL jitter               -> mencegah kedaluwarsa serempak.
 *
 * Circuit breaker membungkus semua operasi Redis: jika Redis bermasalah,
 * cache dilewati (fail-open) dan aplikasi tetap melayani dari database.
 */

export interface CacheOptions {
  /** Umur data fresh dalam detik. */
  ttlSeconds: number;
  /** Berapa lama data boleh disajikan stale sambil direfresh. */
  staleSeconds?: number;
  lockTtlMs?: number;
  waitTimeoutMs?: number;
  /** TTL untuk hasil null/undefined (anti cache-penetration). */
  negativeTtlSeconds?: number;
}

type NormalizedOptions = Required<Omit<CacheOptions, 'negativeTtlSeconds'>> & {
  negativeTtlSeconds?: number;
};

type Envelope<T> = {
  v: T;
  freshUntil: number;
  hardUntil: number;
};

const RELEASE_LOCK_LUA = `
if redis.call('GET', KEYS[1]) == ARGV[1] then
  return redis.call('DEL', KEYS[1])
end
return 0
`;

@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);
  private readonly inFlight = new Map<string, Promise<unknown>>();
  private readonly breaker: CircuitBreaker;

  constructor(
    private readonly redisService: RedisService,
    private readonly metrics: MetricsService,
  ) {
    this.breaker = new CircuitBreaker('redis-cache', {
      failureThreshold: 5,
      openMs: 10_000,
      halfOpenMaxCalls: 1,
      onTransition: state => this.metrics.setBreakerState('redis-cache', state),
    });
  }

  /**
   * Ambil dari cache; jika tidak ada, jalankan `loader` dan simpan hasilnya.
   */
  async getOrSet<T>(
    key: string,
    ttlSeconds: number,
    loader: () => Promise<T>,
    options: Partial<CacheOptions> = {},
  ): Promise<T> {
    const normalized: NormalizedOptions = {
      ttlSeconds: Math.max(1, ttlSeconds),
      staleSeconds: Math.max(0, options.staleSeconds ?? Math.ceil(ttlSeconds * 0.5)),
      lockTtlMs: options.lockTtlMs ?? 3_000,
      waitTimeoutMs: options.waitTimeoutMs ?? 400,
      negativeTtlSeconds: options.negativeTtlSeconds,
    };

    const pending = this.inFlight.get(key);
    if (pending) {
      this.metrics.countCache('singleflight');
      return pending as Promise<T>;
    }

    const task = (async () => {
      const envelope = await this.readEnvelope<T>(key);
      if (envelope) {
        const now = Date.now();
        if (now < envelope.freshUntil) {
          this.metrics.countCache('fresh');
          return envelope.v;
        }
        if (now < envelope.hardUntil) {
          this.metrics.countCache('stale');
          this.refreshInBackground(key, normalized, loader, { has: true, value: envelope.v });
          return envelope.v;
        }
      }

      this.metrics.countCache('miss');
      const staleFallback = envelope ? { has: true, value: envelope.v } : { has: false };
      return this.loadWithLock(key, normalized, loader, staleFallback);
    })();

    this.inFlight.set(key, task);
    try {
      return await task;
    } finally {
      this.inFlight.delete(key);
    }
  }

  /** Hapus satu atau beberapa key cache. */
  async invalidate(...keys: string[]): Promise<void> {
    if (keys.length === 0) return;
    await this.breaker.execute(
      () => this.redisService.client.unlink(...keys).then(() => undefined),
      () => undefined,
    );
  }

  /**
   * Versi cache: naikkan angka ini saat data berubah, tanpa perlu SCAN.
   * Key cache memakai versi sehingga key lama kedaluwarsa sendiri.
   */
  async getVersion(name: string): Promise<number> {
    const raw = await this.breaker.execute(
      () => this.redisService.client.get(`cache:ver:${name}`),
      () => null,
    );
    return Number(raw ?? 0) || 0;
  }

  async bumpVersion(name: string): Promise<void> {
    await this.breaker.execute(
      () => this.redisService.client.incr(`cache:ver:${name}`).then(() => undefined),
      () => undefined,
    );
  }

  private async readEnvelope<T>(key: string): Promise<Envelope<T> | null> {
    const raw = await this.breaker.execute(
      () => this.redisService.client.get(key),
      () => null,
    );
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw) as Envelope<T>;
      if (
        !parsed ||
        typeof parsed.freshUntil !== 'number' ||
        typeof parsed.hardUntil !== 'number'
      ) {
        return null;
      }
      return parsed;
    } catch {
      this.metrics.countCache('error');
      return null;
    }
  }

  private async writeEnvelope<T>(
    key: string,
    value: T,
    freshTtl: number,
    hardTtl: number,
  ): Promise<void> {
    const now = Date.now();
    const envelope: Envelope<T> = {
      v: value,
      freshUntil: now + Math.max(1, Math.round(freshTtl * 1000)),
      hardUntil: now + Math.max(1, Math.round(hardTtl * 1000)),
    };
    const payload = JSON.stringify(envelope);
    const ttlMs = Math.max(1, Math.round(hardTtl * 1000));
    await this.breaker.execute(
      () => this.redisService.client.set(key, payload, 'PX', ttlMs).then(() => undefined),
      () => undefined,
    );
  }

  private async tryAcquireLock(key: string, ttlMs: number): Promise<string | null> {
    const token = randomUUID();
    try {
      return await this.breaker.execute(
        async () => {
          const result = await this.redisService.client.set(
            `cache:lock:${key}`,
            token,
            'PX',
            ttlMs,
            'NX',
          );
          return result === 'OK' ? token : null;
        },
        () => token,
      );
    } catch {
      return token;
    }
  }

  private async releaseLock(key: string, token: string): Promise<void> {
    await this.breaker.execute(
      () => this.redisService.client
        .eval(RELEASE_LOCK_LUA, 1, `cache:lock:${key}`, token)
        .then(() => undefined),
      () => undefined,
    );
  }

  private async loadWithLock<T>(
    key: string,
    options: NormalizedOptions,
    loader: () => Promise<T>,
    staleFallback: { has: boolean; value?: T },
  ): Promise<T> {
    const lockToken = await this.tryAcquireLock(key, options.lockTtlMs);

    if (!lockToken) {
      this.metrics.countCache('lock_wait');
      const deadline = Date.now() + options.waitTimeoutMs;
      while (Date.now() < deadline) {
        await sleep(25 + Math.random() * 25);
        const envelope = await this.readEnvelope<T>(key);
        if (envelope) return envelope.v;
      }
      if (staleFallback.has) return staleFallback.value as T;
      return loader();
    }

    try {
      const existing = await this.readEnvelope<T>(key);
      if (existing && Date.now() < existing.freshUntil) return existing.v;

      let value: T;
      try {
        value = await loader();
      } catch (error) {
        if (staleFallback.has) {
          this.metrics.countCache('stale_on_error');
          return staleFallback.value as T;
        }
        throw error;
      }

      const isEmpty = value === null || value === undefined;
      const freshTtl =
        isEmpty && options.negativeTtlSeconds
          ? options.negativeTtlSeconds
          : options.ttlSeconds;
      const staleTtl = isEmpty ? 0 : options.staleSeconds;
      const jitter = options.ttlSeconds * (0.9 + Math.random() * 0.2) * 0.1;

      await this.writeEnvelope(key, value, freshTtl, freshTtl + staleTtl + jitter);
      return value;
    } finally {
      await this.releaseLock(key, lockToken);
    }
  }

  private refreshInBackground<T>(
    key: string,
    options: NormalizedOptions,
    loader: () => Promise<T>,
    staleFallback: { has: boolean; value?: T },
  ): void {
    if (this.inFlight.has(key)) return;
    const task = this.loadWithLock(key, options, loader, staleFallback)
      .catch(error => {
        this.logger.warn(`Refresh cache "${key}" gagal: ${(error as Error).message}`);
      })
      .finally(() => this.inFlight.delete(key));
    this.inFlight.set(key, task);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
