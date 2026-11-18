import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AdminController } from './admin.controller';
import { AdminGuard } from './admin.guard';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';

@Module({
  imports: [PrismaModule], controllers: [ReportsController, AdminController],
  providers: [ReportsService, AdminGuard], exports: [ReportsService],
})
export class ReportsModule {}
