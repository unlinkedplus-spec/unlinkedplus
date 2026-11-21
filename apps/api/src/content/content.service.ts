import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export interface LandingContent {
  slug: string;
  title: string;
  description: string | null;
  imageUrl: string | null;
  status: string;
}

const CONTENT_SELECT = {
  slug: true, title: true, body: true, imagePath: true, status: true, sortOrder: true,
} satisfies Prisma.ContentSelect;

@Injectable()
export class ContentService {
  constructor(private readonly prisma: PrismaService) {}

  private toLanding(row: Prisma.ContentGetPayload<{ select: typeof CONTENT_SELECT }>): LandingContent {
    return {
      slug: row.slug ?? '',
      title: row.title,
      description: row.body,
      imageUrl: row.imagePath,
      status: row.status,
    };
  }

  /** Public: only published feature items, in landing order. */
  async landing(): Promise<LandingContent[]> {
    const rows = await this.prisma.content.findMany({
      where: { type: 'feature', status: 'published', slug: { not: null } },
      select: CONTENT_SELECT,
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
    });
    return rows.map((row) => this.toLanding(row));
  }

  /** Public: one published item, or null when hidden/unknown. */
  async published(slug: string): Promise<LandingContent | null> {
    if (!/^[a-z0-9-]{1,80}$/.test(slug)) return null;
    const row = await this.prisma.content.findFirst({
      where: { slug, type: 'feature', status: 'published' },
      select: CONTENT_SELECT,
    });
    return row ? this.toLanding(row) : null;
  }

  /** Admin: drafts included. */
  async adminList(): Promise<Array<LandingContent & { sortOrder: number }>> {
    const rows = await this.prisma.content.findMany({
      where: { type: 'feature' },
      select: CONTENT_SELECT,
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
    });
    return rows.map((row) => ({ ...this.toLanding(row), sortOrder: row.sortOrder }));
  }

  async update(slug: string, data: {
    title?: string; body?: string | null; imagePath?: string | null; status?: string;
  }) {
    const existing = await this.prisma.content.findUnique({ where: { slug } });
    if (!existing || existing.type !== 'feature') throw new NotFoundException('Konten tidak ditemukan');
    return this.prisma.content.update({
      where: { slug },
      data: {
        ...(data.title !== undefined ? { title: data.title } : {}),
        ...(data.body !== undefined ? { body: data.body } : {}),
        ...(data.imagePath !== undefined ? { imagePath: data.imagePath } : {}),
        ...(data.status !== undefined ? { status: data.status } : {}),
      },
      select: CONTENT_SELECT,
    });
  }

  async ads(): Promise<{ adsEnabled: boolean; maxPerSession: number }> {
    const row = await this.prisma.setting.findUnique({ where: { key: 'ads' } });
    const value = row?.value as { adsEnabled?: boolean; maxPerSession?: number } | undefined;
    return { adsEnabled: value?.adsEnabled ?? true, maxPerSession: value?.maxPerSession ?? 5 };
  }

  async setAds(value: { adsEnabled: boolean; maxPerSession: number }) {
    await this.prisma.setting.upsert({
      where: { key: 'ads' },
      create: { key: 'ads', value: value as Prisma.InputJsonValue },
      update: { value: value as Prisma.InputJsonValue },
    });
    return value;
  }
}
