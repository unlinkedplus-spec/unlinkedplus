import { Body, Controller, Get, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { authenticatedUserId, SocialUser } from '../posts/social.validation';
import { ToggleReactionDto } from './dto/toggle-reaction.dto';
import { ReactionsService } from './reactions.service';

@Controller('posts/:id/reactions')
export class ReactionsController {
  constructor(private readonly reactionsService: ReactionsService) {}

  @Post()
  toggle(@Param('id', new ParseUUIDPipe()) id: string, @CurrentUser() user: SocialUser,
    @Body() dto: ToggleReactionDto) {
    return this.reactionsService.toggle(id, authenticatedUserId(user), dto);
  }

  @Public()
  @Get()
  getCounts(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.reactionsService.getCounts(id);
  }

  @Get('me')
  getUserReactions(@Param('id', new ParseUUIDPipe()) id: string, @CurrentUser() user: SocialUser) {
    return this.reactionsService.getUserReactions(id, authenticatedUserId(user));
  }
}
