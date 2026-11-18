import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { authenticatedUserId, PaginationDto, SocialUser } from '../posts/social.validation';
import { CommentsService } from './comments.service';
import { CreateCommentDto } from './dto/create-comment.dto';

@Controller()
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @Public()
  @Get('posts/:id/comments')
  findAll(@Param('id', new ParseUUIDPipe()) id: string, @Query() query: PaginationDto) {
    return this.commentsService.findAll(id, query.page, query.limit);
  }

  @Post('posts/:id/comments')
  create(@Param('id', new ParseUUIDPipe()) id: string, @CurrentUser() user: SocialUser,
    @Body() dto: CreateCommentDto) {
    return this.commentsService.create(id, authenticatedUserId(user), dto);
  }

  @Delete('comments/:id')
  softDelete(@Param('id', new ParseUUIDPipe()) id: string, @CurrentUser() user: SocialUser) {
    return this.commentsService.softDelete(id, authenticatedUserId(user));
  }
}
