import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Query, UseGuards } from '@nestjs/common';
import { PaginationDto } from '../posts/social.validation';
import { AdminGuard } from './admin.guard';
import { ResolveReportDto } from './dto/resolve-report.dto';
import { ReportsService } from './reports.service';

@Controller('admin/reports')
@UseGuards(AdminGuard)
export class AdminController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get()
  findPending(@Query() query: PaginationDto) {
    return this.reportsService.findPending(query.page, query.limit);
  }

  @Patch(':id')
  resolve(@Param('id', new ParseUUIDPipe()) id: string, @Body() dto: ResolveReportDto) {
    return this.reportsService.resolve(id, dto);
  }
}
