import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AdminGuard } from '../reports/admin.guard';
import { PaginationDto } from '../posts/social.validation';
import { AdminDashboardService } from './admin-dashboard.service';
import { AdminUserStatusDto } from './dto/admin-user-status.dto';

@Controller('admin')
@UseGuards(AdminGuard)
export class AdminDashboardController {
  constructor(private readonly admin: AdminDashboardService) {}

  @Get('overview')
  overview() { return this.admin.overview(); }

  @Get('users')
  users(@Query() query: PaginationDto) {
    return this.admin.users(query.page, query.limit);
  }

  @Get('posts')
  posts(@Query() query: PaginationDto) {
    return this.admin.posts(query.page, query.limit);
  }

  @Patch('users/:id/status')
  setUserStatus(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: AdminUserStatusDto,
    @CurrentUser() user: { userId: string },
  ) {
    return this.admin.setUserStatus(id, dto.status, user.userId);
  }
}
