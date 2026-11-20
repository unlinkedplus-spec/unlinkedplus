import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { pagination, validateInput } from '../posts/social.validation';
import { CreateConfessionDto } from './dto/create-confession.dto';
import { XP_REWARDS } from '../common/helpers/xp-level.helper';
import { changeXp } from '../posts/social.persistence';

@Injectable()
export class ConfessionsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(page = 1, limit = 20) {
    const paging = pagination(page, limit);
    const where = {
      isConfession: true,
      status: 'active',
      OR: [
        { scheduledAt: null },
        { scheduledAt: { lte: new Date() } },
      ],
    };

    return this.prisma.$transaction(async (tx) => {
      const rows = await tx.post.findMany({
        where,
        select: {
          id: true,
          content: true,
          createdAt: true,
          isAnonymous: true,
          user: {
            select: {
              username: true,
              profile: {
                select: {
                  avatarConfig: true,
                  mentalLevel: true,
                },
              },
            },
          },
          _count: {
            select: {
              reactions: true,
              comments: true,
            },
          },
        },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: paging.skip,
        take: paging.limit,
      });

      const total = await tx.post.count({ where });

      return {
        data: rows.map((row) => ({
          id: row.id,
          content: row.content,
          createdAt: row.createdAt,
          isAnonymous: row.isAnonymous,
          user: row.isAnonymous ? null : row.user,
          reactionCount: row._count.reactions,
          commentCount: row._count.comments,
        })),
        total,
        page: paging.page,
        totalPages: Math.ceil(total / paging.limit),
      };
    }, { isolationLevel: 'RepeatableRead' });
  }

  async create(userId: string, input: CreateConfessionDto) {
    const dto = validateInput(CreateConfessionDto, input);
    const scheduledAt = dto.scheduledAt ? new Date(dto.scheduledAt) : null;

    return this.prisma.$transaction(async (tx) => {
      const post = await tx.post.create({
        data: {
          userId,
          category: 'Confession',
          content: dto.content,
          isConfession: true,
          isAnonymous: dto.isAnonymous ?? true,
          scheduledAt,
          status: scheduledAt && scheduledAt > new Date() ? 'scheduled' : 'active',
        },
        select: {
          id: true,
          content: true,
          createdAt: true,
          isAnonymous: true,
          scheduledAt: true,
        },
      });

      await changeXp(tx, userId, XP_REWARDS.postCreated);

      return post;
    }, { isolationLevel: 'ReadCommitted' });
  }
}
