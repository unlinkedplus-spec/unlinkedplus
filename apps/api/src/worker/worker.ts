import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { CertificateProcessor } from './certificate.processor';
import { WorkerModule } from './worker.module';

const logger = new Logger('CertificateWorker');

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(WorkerModule);
  const processor = app.get(CertificateProcessor);
  let shutdown: Promise<void> | undefined;
  const stop = () => {
    shutdown ??= (async () => {
      // Drain jobs before Nest destroys Prisma so in-flight output can finish its DB transaction.
      try {
        await processor.close();
      } finally {
        await app.close();
      }
    })();
    void shutdown.catch(() => {
      logger.error('Certificate worker shutdown failed');
      process.exitCode = 1;
    });
  };
  process.once('SIGINT', stop);
  process.once('SIGTERM', stop);
  logger.log('Certificate worker and scheduled post publisher are running');
}

void bootstrap().catch(() => {
  logger.error('Certificate worker startup failed');
  process.exitCode = 1;
});
