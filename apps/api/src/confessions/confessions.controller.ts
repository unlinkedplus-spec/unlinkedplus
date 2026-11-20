import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { authenticatedUserId, PaginationDto, SocialUser } from '../posts/social.validation';
import { CreateConfessionDto } from './dto/create-confession.dto';
import { ConfessionsService } from './confessions.service';

@Controller('confessions')
export class ConfessionsController {
  constructor(private readonly confessionsService: ConfessionsService) {}

  @Public()
  @Get()
  findAll(@Query() query: PaginationDto) {
    return this.confessionsService.findAll(query.page, query.limit);
  }

  @Post()
  create(@CurrentUser() user: SocialUser, @Body() dto: CreateConfessionDto) {
    return this.confessionsService.create(authenticatedUserId(user), dto);
  }
}
