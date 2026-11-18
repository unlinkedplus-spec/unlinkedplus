import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';
import {
  CERTIFICATE_ATTEMPTS,
  CERTIFICATE_JOB,
  CERTIFICATE_QUEUE,
  CertificateJobData,
  certificateRedisOptions,
} from './certificate-job';

@Injectable()
export class CertificateQueue implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(CertificateQueue.name);
  private queue!: Queue<CertificateJobData>;

  constructor(private readonly config: ConfigService) {}

  onModuleInit() {
    this.queue = new Queue<CertificateJobData>(CERTIFICATE_QUEUE, {
      connection: certificateRedisOptions(this.config),
      defaultJobOptions: {
        attempts: CERTIFICATE_ATTEMPTS,
        backoff: { type: 'exponential', delay: 1000 },
        removeOnComplete: true,
        removeOnFail: false,
      },
    });
    this.queue.on('error', () => this.logger.warn('Certificate queue connection unavailable'));
  }

  async enqueue(data: CertificateJobData) {
    // A stable job ID deduplicates concurrent HTTP requests without storing post content in Redis.
    const existing = await this.queue.getJob(data.certificateId);
    if (existing) {
      const state = await existing.getState();
      if (state === 'failed') {
        try {
          await existing.retry('failed', { resetAttemptsMade: true, resetAttemptsStarted: true });
        } catch (error) {
          const currentState = await existing.getState();
          if (currentState === 'failed') throw error;
          if (currentState !== 'unknown') return;
          // Another request may already have retried and completed this job.
          await this.queue.add(CERTIFICATE_JOB, data, { jobId: data.certificateId });
        }
        return;
      }
      if (state !== 'unknown') return;
    }
    await this.queue.add(CERTIFICATE_JOB, data, { jobId: data.certificateId });
  }

  async onModuleDestroy() {
    await this.queue?.close();
  }
}
