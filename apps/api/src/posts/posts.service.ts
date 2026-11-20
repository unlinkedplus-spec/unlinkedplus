import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { CacheService } from '../common/cache/cache.service';
import { XP_REWARDS } from '../common/helpers/xp-level.helper';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePostDto } from './dto/create-post.dto';
import {
  assertActivePost, changeXp, deactivatePost, emptyReactionCounts, lockPost,
  POST_SELECT, publicPost, reactionCounts, reactionCountsByPost,
} from './social.persistence';
import { assertUuid, pagination, validateInput } from './social.validation';

@Injectable()
export class PostsService {
  private static readonly FEED_CACHE_VERSION = 'posts-feed';
  private static readonly FEED_TTL_SECONDS = 5;

  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
  ) {}

  async findAll(page = 1, limit = 20) {
    const paging = pagination(page, limit);
    const version = await this.cache.getVersion(PostsService.FEED_CACHE_VERSION);
    return this.cache.getOrSet(
      `posts:feed:${version}:${paging.page}:${paging.limit}`,
      PostsService.FEED_TTL_SECONDS,
      () => this.loadFeed(paging),
      { staleSeconds: 10, negativeTtlSeconds: 2 },
    );
  }

  private async loadFeed(paging: { skip: number; page: number; limit: number }) {
    return this.prisma.$transaction(async (tx) => {
      const where = { status: 'active' };
      const rows = await tx.post.findMany({
        where, select: POST_SELECT, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: paging.skip, take: paging.limit,
      });
      const total = await tx.post.count({ where });
      const counts = await reactionCountsByPost(tx, rows.map((row) => row.id));
      return {
        data: rows.map((row) => publicPost({ ...row, reactionCounts: counts.get(row.id)! })),
        total, page: paging.page, totalPages: Math.ceil(total / paging.limit),
      };
    }, { isolationLevel: 'RepeatableRead' });
  }

  async create(userId: string, input: CreatePostDto) {
    const dto = validateInput(CreatePostDto, input);
    const result = await this.prisma.$transaction(async (tx) => {
      const post = await tx.post.create({
        data: { userId, category: dto.category, content: dto.content }, select: { id: true },
      });
      await changeXp(tx, userId, XP_REWARDS.postCreated);
      const created = await tx.post.findUniqueOrThrow({ where: { id: post.id }, select: POST_SELECT });
      return publicPost({ ...created, reactionCounts: emptyReactionCounts() });
    }, { isolationLevel: 'ReadCommitted' });
    await this.cache.bumpVersion(PostsService.FEED_CACHE_VERSION);
    return result;
  }

  async findOne(id: string) {
    assertUuid(id);
    return this.prisma.$transaction(async (tx) => {
      const post = await tx.post.findFirst({ where: { id, status: 'active' }, select: POST_SELECT });
      if (!post) throw new NotFoundException('Post tidak ditemukan');
      return publicPost({ ...post, reactionCounts: await reactionCounts(tx, id) });
    }, { isolationLevel: 'RepeatableRead' });
  }

  async softDelete(id: string, userId: string) {
    const result = await this.prisma.$transaction(async (tx) => {
      const post = await lockPost(tx, id);
      assertActivePost(post);
      if (post.userId !== userId) throw new ForbiddenException('Hanya pemilik yang dapat menghapus post');
      return deactivatePost(tx, post, 'deleted');
    }, { isolationLevel: 'ReadCommitted' });
    await this.cache.bumpVersion(PostsService.FEED_CACHE_VERSION);
    return result;
  }
}
