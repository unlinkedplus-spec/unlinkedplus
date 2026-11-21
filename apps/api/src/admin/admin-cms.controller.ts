import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../reports/admin.guard';
import { AdminCmsService } from './admin-cms.service';
import {
  UpdateAdsDto, UpdateContentDto, UpdateStatusDto, UpdateStoreItemDto,
} from './dto/admin-cms.dto';

/** CMS endpoints that mirror the public landing catalog and its modules. */
@Controller('admin')
@UseGuards(AdminGuard)
export class AdminCmsController {
  constructor(private readonly cms: AdminCmsService) {}

  @Get('content')
  content() { return this.cms.content(); }

  @Patch('content/:slug')
  updateContent(@Param('slug') slug: string, @Body() dto: UpdateContentDto) {
    return this.cms.updateContent(slug, dto);
  }

  @Get('settings/ads')
  ads() { return this.cms.ads(); }

  @Patch('settings/ads')
  updateAds(@Body() dto: UpdateAdsDto) { return this.cms.updateAds(dto); }

  @Get('polls')
  polls() { return this.cms.polls(); }

  @Patch('polls/:id/status')
  updatePoll(@Param('id', new ParseUUIDPipe()) id: string, @Body() dto: UpdateStatusDto) {
    return this.cms.updatePoll(id, dto.status);
  }

  @Get('store/items')
  storeItems() { return this.cms.storeItems(); }

  @Patch('store/items/:id')
  updateStoreItem(@Param('id', new ParseUUIDPipe()) id: string, @Body() dto: UpdateStoreItemDto) {
    return this.cms.updateStoreItem(id, dto);
  }

  @Get('certificates')
  certificates() { return this.cms.certificates(); }

  @Patch('certificates/:id/status')
  updateCertificate(@Param('id', new ParseUUIDPipe()) id: string, @Body() dto: UpdateStatusDto) {
    return this.cms.updateCertificate(id, dto.status);
  }
}
