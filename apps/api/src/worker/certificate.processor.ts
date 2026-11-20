import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Job, UnrecoverableError, Worker } from 'bullmq';
import { isUUID } from 'class-validator';
import { mkdir, rename, unlink, writeFile } from 'node:fs/promises';
import { Resvg } from '@resvg/resvg-js';
import {
  CERTIFICATE_ATTEMPTS,
  CERTIFICATE_JOB,
  CERTIFICATE_QUEUE,
  CertificateJobData,
  certificateRedisOptions,
} from '../certificates/certificate-job';
import {
  certificateDirectory,
  certificateFilePath,
  newCertificateBasename,
} from '../certificates/certificate-storage';
import { renderCertificateSvg } from '../certificates/certificate-renderer';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CertificateProcessor implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(CertificateProcessor.name);
  private worker?: Worker<CertificateJobData>;
  private closing?: Promise<void>;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  onModuleInit() {
    this.worker = new Worker<CertificateJobData>(
      CERTIFICATE_QUEUE,
      (job) => this.process(job),
      { connection: certificateRedisOptions(this.config, true), concurrency: 2 },
    );
    this.worker.on('error', () => this.logger.error('Certificate worker connection or processing error'));
    this.worker.on('failed', (job) => {
      // This also catches terminal stalled-job failures outside the processor's own catch block.
      void this.recordQueueFailure(job).catch(() => this.logger.error('Could not persist certificate queue failure'));
    });
  }

  close(): Promise<void> {
    this.closing ??= this.worker?.close() ?? Promise.resolve();
    return this.closing;
  }

  async onModuleDestroy() {
    await this.close();
  }

  private validData(data: CertificateJobData | undefined): data is CertificateJobData {
    return !!data && isUUID(data.certificateId) && isUUID(data.postId) && isUUID(data.userId);
  }

  private async process(job: Job<CertificateJobData>) {
    if (job.name !== CERTIFICATE_JOB || !this.validData(job.data)) {
      throw new UnrecoverableError('Invalid certificate job');
    }
    const { certificateId, postId, userId } = job.data;
    const storagePath = this.config.get<string>('STORAGE_PATH');
    let temporaryPath: string | undefined;
    let outputPath: string | undefined;

    try {
      await this.prisma.$transaction(async (tx) => {
        // Hold the same parent lock as POST until publication; a concurrent hide cannot publish stale access.
        const posts = await tx.$queryRaw<Array<{ id: string }>>`
          SELECT id FROM posts WHERE id = ${postId} AND user_id = ${userId} AND status = 'active' FOR UPDATE
        `;
        if (!posts.length) throw new UnrecoverableError('Active owned post no longer exists');
        await tx.$queryRaw`
          SELECT id FROM certificates WHERE id = ${certificateId} FOR UPDATE
        `;
        const certificate = await tx.certificate.findUnique({
          where: { id: certificateId },
          include: { post: true },
        });
        if (!certificate || certificate.postId !== postId || certificate.post.userId !== userId || certificate.post.status !== 'active') {
          throw new UnrecoverableError('Active owned certificate no longer exists');
        }
        if (certificate.status === 'ready') return;

        const svg = renderCertificateSvg({
          id: certificate.id,
          createdAt: certificate.createdAt,
          category: certificate.post.category,
          content: certificate.post.content,
        });
        // Render with resvg: sharp's native libvips binary requires SSE4.2 and
        // aborts with SIGILL on older x86-64 hosts used for development/VPS.
        const png = new Resvg(svg, { font: { loadSystemFonts: true } }).render().asPng();
        const imagePath = newCertificateBasename(certificate.id);
        outputPath = certificateFilePath(storagePath, certificate.id, imagePath);
        temporaryPath = `${outputPath}.tmp`;
        await mkdir(certificateDirectory(storagePath), { recursive: true });
        await writeFile(temporaryPath, png, { flag: 'wx', mode: 0o600 });
        // Rename on the same filesystem publishes only a complete PNG, never a partial download.
        await rename(temporaryPath, outputPath);
        temporaryPath = undefined;
        await tx.certificate.update({
          where: { id: certificate.id },
          data: { imagePath, status: 'ready' },
        });
      }, { maxWait: 5000, timeout: 30000 });
    } catch (error) {
      const terminal = error instanceof UnrecoverableError || job.attemptsMade + 1 >= (job.opts.attempts ?? CERTIFICATE_ATTEMPTS);
      await this.prisma.certificate.updateMany({
        where: { id: certificateId, postId, status: { not: 'ready' } },
        data: { status: terminal ? 'failed' : 'pending', imagePath: null },
      });
      if (outputPath) {
        const saved = await this.prisma.certificate.findUnique({ where: { id: certificateId } });
        // A commit acknowledgement can be lost; preserve a file the database actually published.
        if (!saved?.imagePath || certificateFilePath(storagePath, certificateId, saved.imagePath) !== outputPath) {
          await this.removeFile(outputPath);
        }
      }
      throw error;
    } finally {
      if (temporaryPath) await this.removeFile(temporaryPath);
    }
  }

  private async recordQueueFailure(job?: Job<CertificateJobData>) {
    if (!job || !this.validData(job.data) || await job.getState() !== 'failed') return;
    await this.prisma.certificate.updateMany({
      where: { id: job.data.certificateId, postId: job.data.postId, status: { not: 'ready' } },
      data: { status: 'failed', imagePath: null },
    });
  }

  private async removeFile(path: string) {
    try {
      await unlink(path);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        this.logger.warn('Could not remove uncommitted certificate output');
      }
    }
  }
}
