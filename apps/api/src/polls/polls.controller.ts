import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { AdminGuard } from '../reports/admin.guard';
import { authenticatedUserId, PaginationDto, SocialUser } from '../posts/social.validation';
import { CreatePollDto } from './dto/create-poll.dto';
import { VotePollDto } from './dto/vote-poll.dto';
import { PollsService } from './polls.service';

@Controller('polls')
export class PollsController {
  constructor(private readonly pollsService: PollsService) {}

  @Public()
  @Get('active')
  getActive() {
    return this.pollsService.getActive();
  }

  @Public()
  @Get()
  list(@Query() query: PaginationDto) {
    return this.pollsService.list(query.page, query.limit);
  }

  @Public()
  @Get(':id/results')
  getResults(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.pollsService.getResults(id);
  }

  @Get(':id/mine')
  getMyVote(@Param('id', new ParseUUIDPipe()) id: string, @CurrentUser() user: SocialUser) {
    return this.pollsService.getMyVote(id, authenticatedUserId(user));
  }

  @Post(':id/vote')
  vote(@Param('id', new ParseUUIDPipe()) id: string, @CurrentUser() user: SocialUser,
    @Body() dto: VotePollDto) {
    return this.pollsService.vote(id, authenticatedUserId(user), dto);
  }

  @UseGuards(AdminGuard)
  @Post()
  create(@Body() dto: CreatePollDto) {
    return this.pollsService.create(dto);
  }
}
