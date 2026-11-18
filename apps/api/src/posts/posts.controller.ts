import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { CreatePostDto } from './dto/create-post.dto';
import { PostsService } from './posts.service';
import { authenticatedUserId, PaginationDto, SocialUser } from './social.validation';

@Controller('posts')
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  @Public()
  @Get()
  findAll(@Query() query: PaginationDto) {
    return this.postsService.findAll(query.page, query.limit);
  }

  @Public()
  @Get(':id')
  findOne(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.postsService.findOne(id);
  }

  @Post()
  create(@CurrentUser() user: SocialUser, @Body() dto: CreatePostDto) {
    return this.postsService.create(authenticatedUserId(user), dto);
  }

  @Delete(':id')
  softDelete(@Param('id', new ParseUUIDPipe()) id: string, @CurrentUser() user: SocialUser) {
    return this.postsService.softDelete(id, authenticatedUserId(user));
  }
}
