import { Controller, Get } from '@nestjs/common';
import { Public } from '../common/decorators/public.decorator';
import { AvatarsService } from './avatars.service';

@Controller('avatar')
export class AvatarsController {
  constructor(private readonly avatars: AvatarsService) {}

  @Public()
  @Get('items')
  items() {
    return this.avatars.items();
  }
}
