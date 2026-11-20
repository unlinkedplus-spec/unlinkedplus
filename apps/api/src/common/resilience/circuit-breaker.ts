export type BreakerState = 'closed' | 'open' | 'half_open';

export interface CircuitBreakerOptions {
  /** Kegagalan beruntun sebelum breaker membuka. */
  failureThreshold?: number;
  /** Sukses beruntun di half-open sebelum kembali closed. */
  successThreshold?: number;
  /** Lama breaker terbuka sebelum mencoba half-open. */
  openMs?: number;
  /** Maksimal percobaan paralel saat half-open. */
  halfOpenMaxCalls?: number;
  /** Callback untuk metrik/log saat status berubah. */
  onTransition?: (state: BreakerState) => void;
}

export class CircuitOpenError extends Error {
  constructor(name: string) {
    super(`Circuit breaker "${name}" sedang terbuka`);
    this.name = 'CircuitOpenError';
  }
}

/**
 * Circuit breaker tanpa dependency.
 *
 * Dipakai untuk dependency yang boleh dilewati sementara (cache Redis).
 * Saat `open`, pemanggilan langsung memakai fallback sehingga request tidak
 * menunggu timeout berulang kali — mencegah cascading failure.
 */
export class CircuitBreaker {
  private state: BreakerState = 'closed';
  private failures = 0;
  private successes = 0;
  private openedAt = 0;
  private halfOpenCalls = 0;

  private readonly failureThreshold: number;
  private readonly successThreshold: number;
  private readonly openMs: number;
  private readonly halfOpenMaxCalls: number;

  constructor(
    private readonly name: string,
    private readonly options: CircuitBreakerOptions = {},
  ) {
    this.failureThreshold = options.failureThreshold ?? 5;
    this.successThreshold = options.successThreshold ?? 2;
    this.openMs = options.openMs ?? 10_000;
    this.halfOpenMaxCalls = options.halfOpenMaxCalls ?? 1;
    this.notify();
  }

  get currentState(): BreakerState {
    return this.state;
  }

  async execute<T>(fn: () => Promise<T>, fallback: () => Promise<T> | T): Promise<T> {
    if (this.state === 'open') {
      if (Date.now() - this.openedAt >= this.openMs) {
        this.transition('half_open');
      } else {
        return Promise.resolve(fallback());
      }
    }

    if (this.state === 'half_open') {
      if (this.halfOpenCalls >= this.halfOpenMaxCalls) {
        return Promise.resolve(fallback());
      }
      this.halfOpenCalls += 1;
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      // Fallback juga dipakai saat request pertama gagal: caller tetap mendapat
      // jalur degradasi, sementara breaker mencatat kegagalan.
      return Promise.resolve(fallback());
    }
  }

  private onSuccess(): void {
    if (this.state === 'half_open') {
      this.successes += 1;
      if (this.successes >= this.successThreshold) this.transition('closed');
      return;
    }
    this.failures = 0;
  }

  private onFailure(): void {
    this.failures += 1;
    if (this.state === 'half_open' || this.failures >= this.failureThreshold) {
      this.transition('open');
    }
  }

  private transition(next: BreakerState): void {
    if (this.state === next) return;
    this.state = next;
    this.failures = 0;
    this.successes = 0;
    this.halfOpenCalls = 0;
    if (next === 'open') this.openedAt = Date.now();
    this.notify();
  }

  private notify(): void {
    this.options.onTransition?.(this.state);
  }
}
