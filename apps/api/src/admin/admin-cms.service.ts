import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ContentService } from '../content/content.service';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateAdsDto, UpdateContentDto, UpdateStoreItemDto } from './dto/admin-cms.dto';

@Injectable()
export class AdminCmsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly contentSvc: ContentService,
  ) {}

  content() {
    return this.contentSvc.adminList();
  }

  updateContent(slug: string, dto: UpdateContentDto) {
    return this.contentSvc.update(slug, {
      ...(dto.title !== undefined ? { title: dto.title } : {}),
      ...(dto.body !== undefined ? { body: dto.body } : {}),
      ...(dto.imagePath !== undefined ? { imagePath: dto.imagePath } : {}),
      ...(dto.status !== undefined ? { status: dto.status } : {}),
    });
  }

  async ads() {
    return this.contentSvc.ads();
  }

  async updateAds(dto: UpdateAdsDto) {
    const current = await this.ads();
    return this.contentSvc.setAds({
      adsEnabled: dto.adsEnabled ?? current.adsEnabled,
      maxPerSession: dto.maxPerSession ?? current.maxPerSession,
    });
  }

  polls() {
    return this.prisma.poll.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        options: { orderBy: { position: 'asc' }, include: { _count: { select: { votes: true } } } },
        _count: { select: { votes: true } },
      },
    });
  }

  async updatePoll(id: string, status: string) {
    const poll = await this.prisma.poll.findUnique({ where: { id } });
    if (!poll) throw new NotFoundException('Polling tidak ditemukan');
    return this.prisma.poll.update({ where: { id }, data: { status } });
  }

  storeItems() {
    return this.prisma.avatarItem.findMany({ orderBy: [{ price: 'asc' }, { name: 'asc' }] });
  }

  async updateStoreItem(id: string, dto: UpdateStoreItemDto) {
    const item = await this.prisma.avatarItem.findUnique({ where: { id } });
    if (!item) throw new NotFoundException('Item tidak ditemukan');
    return this.prisma.avatarItem.update({
      where: { id },
      data: {
        ...(dto.price !== undefined ? { price: dto.price } : {}),
        ...(dto.isPremium !== undefined ? { isPremium: dto.isPremium } : {}),
      },
    });
  }

  certificates() {
    return this.prisma.certificate.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, status: true, imagePath: true, createdAt: true,
        post: { select: { id: true, content: true, category: true } },
      },
    });
  }

  async updateCertificate(id: string, status: string) {
    const cert = await this.prisma.certificate.findUnique({ where: { id } });
    if (!cert) throw new NotFoundException('Sertifikat tidak ditemukan');
    return this.prisma.certificate.update({ where: { id }, data: { status } });
  }

  /** Safe default for ad settings if the setting row was removed. */
  static readonly DEFAULT_ADS: Prisma.InputJsonValue = { adsEnabled: true, maxPerSession: 5 };
}
