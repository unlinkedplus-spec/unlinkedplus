import {
  ConflictException,
  ForbiddenException,
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { AdPreferencesDto } from './dto/ad-preferences.dto';
import { RedisService } from '../redis/redis.service';
import { PUBLIC_USER_SELECT } from './user.select';

const DEFAULT_AD_PREFERENCES = { adsEnabled: true, maxPerSession: 5 };

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis?: RedisService,
  ) {}

  async findByUsername(username: string) {
    const user = await this.prisma.user.findUnique({
      where: { username: username.toLowerCase(), status: 'active' },
      select: PUBLIC_USER_SELECT,
    });
    if (!user) throw new NotFoundException('Pengguna tidak ditemukan');
    return user;
  }

  async updateMe(userId: string, dto: UpdateProfileDto) {
    try {
      return await this.prisma.$transaction(async (tx) => {
        if (dto.username) {
          const existing = await tx.user.findUnique({
            where: { username: dto.username },
            select: { id: true },
          });
          if (existing && existing.id !== userId) {
            throw new ConflictException('Username sudah dipakai. Coba yang lain.');
          }
          await tx.user.update({
            where: { id: userId },
            data: { username: dto.username },
          });
        }

        if (dto.avatarConfig) {
          const items = await tx.avatarItem.findMany({ where: { slug: { in: dto.avatarConfig.accessories } } });
          if (items.length !== dto.avatarConfig.accessories.length) throw new BadRequestException('Aksesori tidak dikenal');
          const premium = items.filter((item) => item.isPremium || item.price > 0);
          if (premium.length) {
            const owned = await tx.userInventory.count({ where: { userId, itemId: { in: premium.map((item) => item.id) } } });
            if (owned !== premium.length) throw new ForbiddenException('Aksesori premium belum dimiliki');
          }
        }
        const avatarConfig = dto.avatarConfig ? { character: dto.avatarConfig.character, accessories: dto.avatarConfig.accessories } : undefined;
        await tx.profile.upsert({
          where: { userId },
          create: {
            userId,
            bio: dto.bio,
            avatarConfig,
          },
          update: {
            ...(dto.bio !== undefined ? { bio: dto.bio } : {}),
            ...(avatarConfig !== undefined ? { avatarConfig } : {}),
          },
        });

        return tx.user.findUniqueOrThrow({
          where: { id: userId },
          select: { ...PUBLIC_USER_SELECT, role: true },
        });
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('Username sudah dipakai. Coba yang lain.');
      }
      throw error;
    }
  }

  async getInventory(userId: string) {
    return this.prisma.userInventory.findMany({
      where: { userId },
      include: { item: true },
      orderBy: { unlockedAt: 'desc' },
    });
  }

  async getMyPosts(userId: string, page = 1, limit = 20) {
    if (!Number.isSafeInteger(page) || page < 1 || page > 10000) throw new BadRequestException('Halaman harus 1–10000');
    const safePage = page;
    const safeLimit = Math.min(50, Math.max(1, limit));
    const where: Prisma.PostWhereInput = { userId, status: 'active' };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.post.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (safePage - 1) * safeLimit,
        take: safeLimit,
        include: {
          user: { select: PUBLIC_USER_SELECT },
          _count: { select: { reactions: true, comments: true } },
        },
      }),
      this.prisma.post.count({ where }),
    ]);

    return {
      data,
      total,
      page: safePage,
      totalPages: Math.ceil(total / safeLimit),
    };
  }

  async getStats(userId: string) {
    const [posts, reactionsReceived, comments] = await this.prisma.$transaction([
      this.prisma.post.count({ where: { userId, status: 'active' } }),
      this.prisma.reaction.count({ where: { post: { userId, status: 'active' } } }),
      this.prisma.comment.count({ where: { status: 'active', post: { userId, status: 'active' } } }),
    ]);

    const profile = await this.prisma.profile.findUnique({ where: { userId } });

    return {
      posts,
      reactionsReceived,
      commentsReceived: comments,
      mentalXp: profile?.mentalXp ?? 0,
      mentalLevel: profile?.mentalLevel ?? 1,
      // Backwards-compatible aliases used by the profile UI.
      totalPosts: posts,
      totalReactionsReceived: reactionsReceived,
    };
  }

  /** SEC-04: preferences come only from the user, never from Spill content. */
  async getAdPreferences(userId: string) {
    const profile = await this.prisma.profile.findUnique({
      where: { userId }, select: { adPreferences: true },
    });
    const raw = profile?.adPreferences;
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return { ...DEFAULT_AD_PREFERENCES };
    const value = raw as Record<string, unknown>;
    const max = Number(value.maxPerSession);
    return {
      adsEnabled: typeof value.adsEnabled === 'boolean' ? value.adsEnabled : DEFAULT_AD_PREFERENCES.adsEnabled,
      maxPerSession: Number.isInteger(max) && max >= 1 && max <= 20
        ? max : DEFAULT_AD_PREFERENCES.maxPerSession,
    };
  }

  async setAdPreferences(userId: string, dto: AdPreferencesDto) {
    const value = { adsEnabled: dto.adsEnabled, maxPerSession: dto.maxPerSession };
    await this.prisma.profile.upsert({
      where: { userId },
      create: { userId, adPreferences: value },
      update: { adPreferences: value },
    });
    return value;
  }

  /** SEC-04: daily frequency cap, independent of any Spill content. */
  async recordAdImpression(userId: string) {
    const prefs = await this.getAdPreferences(userId);
    if (!prefs.adsEnabled || !this.redis) {
      return { allowed: false, count: 0, limit: prefs.maxPerSession, reason: 'disabled' };
    }
    const key = `adimpr:${userId}`;
    const count = await this.redis.client.incr(key);
    if (count === 1) await this.redis.client.expire(key, 86_400);
    return {
      allowed: count <= prefs.maxPerSession,
      count,
      limit: prefs.maxPerSession,
      reason: count <= prefs.maxPerSession ? 'ok' : 'capped',
    };
  }
}
