import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ConfessionsController } from './confessions.controller';
import { ConfessionsService } from './confessions.service';

@Module({
  imports: [PrismaModule],
  controllers: [ConfessionsController],
  providers: [ConfessionsService],
  exports: [ConfessionsService],
})
export class ConfessionsModule {}
