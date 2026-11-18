import { Body, Controller, Post } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { authenticatedUserId, SocialUser } from '../posts/social.validation';
import { CreateReportDto } from './dto/create-report.dto';
import { ReportsService } from './reports.service';

@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Post()
  create(@CurrentUser() user: SocialUser, @Body() dto: CreateReportDto) {
    return this.reportsService.create(authenticatedUserId(user), dto);
  }
}
