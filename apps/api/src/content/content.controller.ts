import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { Public } from '../common/decorators/public.decorator';
import { ContentService } from './content.service';

/** Public copy for the landing feature catalog (safe: no private data). */
@Controller('content')
export class ContentController {
  constructor(private readonly content: ContentService) {}

  @Public()
  @Get('landing')
  landing() {
    return this.content.landing();
  }

  @Public()
  @Get('landing/:slug')
  bySlug(@Param('slug') slug: string) {
    return this.content.published(slug);
  }
}
