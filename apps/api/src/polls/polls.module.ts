import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AdminGuard } from '../reports/admin.guard';
import { PollsController } from './polls.controller';
import { PollsService } from './polls.service';

@Module({
  imports: [PrismaModule],
  controllers: [PollsController],
  providers: [PollsService, AdminGuard],
  exports: [PollsService],
})
export class PollsModule {}
