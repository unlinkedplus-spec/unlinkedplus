import { Injectable } from '@nestjs/common';
import { XP_REWARDS } from '../common/helpers/xp-level.helper';
import { PrismaService } from '../prisma/prisma.service';
import {
  assertActivePost, changeXp, findActivePost, lockPost, reactionCounts, userReactions,
} from '../posts/social.persistence';
import { validateInput } from '../posts/social.validation';
import { ToggleReactionDto } from './dto/toggle-reaction.dto';

@Injectable()
export class ReactionsService {
  constructor(private readonly prisma: PrismaService) {}

  async toggle(postId: string, userId: string, input: ToggleReactionDto) {
    const dto = validateInput(ToggleReactionDto, input);
    return this.prisma.$transaction(async (tx) => {
      const post = await lockPost(tx, postId);
      assertActivePost(post);
      const existing = await tx.reaction.findUnique({
        where: { postId_userId_reactionType: { postId, userId, reactionType: dto.type } },
        select: { id: true },
      });
      if (existing) {
        await tx.reaction.delete({ where: { id: existing.id } });
      } else {
        await tx.reaction.create({ data: { postId, userId, reactionType: dto.type } });
      }
      if (post.userId && post.userId !== userId) {
        const reward = XP_REWARDS.reactionReceived[dto.type];
        await changeXp(tx, post.userId, existing ? -reward : reward);
      }
      return {
        added: !existing,
        counts: await reactionCounts(tx, postId),
        userReactions: await userReactions(tx, postId, userId),
      };
    }, { isolationLevel: 'ReadCommitted' });
  }

  async getCounts(postId: string) {
    return this.prisma.$transaction(async (tx) => {
      await findActivePost(tx, postId);
      return reactionCounts(tx, postId);
    }, { isolationLevel: 'RepeatableRead' });
  }

  async getUserReactions(postId: string, userId: string) {
    return this.prisma.$transaction(async (tx) => {
      await findActivePost(tx, postId);
      return userReactions(tx, postId, userId);
    }, { isolationLevel: 'RepeatableRead' });
  }
}
