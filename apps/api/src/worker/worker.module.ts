import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../prisma/prisma.module';
import { CertificateProcessor } from './certificate.processor';
import { ScheduledPublisher } from './scheduled-publisher.processor';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), PrismaModule],
  providers: [CertificateProcessor, ScheduledPublisher],
})
export class WorkerModule {}
