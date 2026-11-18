import {
  Body,
  DefaultValuePipe,
  ParseIntPipe,
  Controller,
  Get,
  Param,
  Patch,
  Query,
} from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UsersService } from './users.service';

interface AuthenticatedUser {
  userId: string;
  username: string;
}

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Patch('me')
  updateMe(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.usersService.updateMe(user.userId, dto);
  }

  @Get('me/posts')
  myPosts(
    @CurrentUser() user: AuthenticatedUser,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
  ) {
    return this.usersService.getMyPosts(user.userId, page);
  }

  @Get('me/inventory')
  myInventory(@CurrentUser() user: AuthenticatedUser) {
    return this.usersService.getInventory(user.userId);
  }

  @Get('me/stats')
  myStats(@CurrentUser() user: AuthenticatedUser) {
    return this.usersService.getStats(user.userId);
  }

  @Public()
  @Get(':username')
  findByUsername(@Param('username') username: string) {
    return this.usersService.findByUsername(username);
  }
}
