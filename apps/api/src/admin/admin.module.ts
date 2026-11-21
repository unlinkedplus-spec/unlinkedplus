import { Module } from '@nestjs/common';
import { ContentModule } from '../content/content.module';
import { PrismaModule } from '../prisma/prisma.module';
import { AdminGuard } from '../reports/admin.guard';
import { AdminCmsController } from './admin-cms.controller';
import { AdminCmsService } from './admin-cms.service';
import { AdminDashboardController } from './admin-dashboard.controller';
import { AdminDashboardService } from './admin-dashboard.service';

@Module({
  imports: [PrismaModule, ContentModule],
  controllers: [AdminDashboardController, AdminCmsController],
  providers: [AdminDashboardService, AdminCmsService, AdminGuard],
})
export class AdminModule {}
