import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PurchaseDto } from './purchase.dto';
import { StoreService } from './store.service';

interface AuthenticatedUser {
  userId: string;
  username: string;
  role: string;
}

@Controller('store')
@UseGuards(JwtAuthGuard)
export class StoreController {
  constructor(private readonly store: StoreService) {}

  @Public()
  @Get('config')
  config() {
    return this.store.getConfig();
  }

  @Get('transactions')
  transactions(@CurrentUser() user: AuthenticatedUser) {
    return this.store.transactions(user.userId);
  }

  @Post('purchase')
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
  purchase(@CurrentUser() user: AuthenticatedUser, @Body() dto: PurchaseDto) {
    return this.store.purchase(user.userId, dto.itemId);
  }

  @Post('purchase/confirm/:id')
  @HttpCode(200)
  confirm(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.store.confirm(user.userId, id);
  }
}
