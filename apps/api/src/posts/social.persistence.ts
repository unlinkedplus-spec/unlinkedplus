import { NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { calculateLevel, XP_REWARDS } from '../common/helpers/xp-level.helper';
import { PUBLIC_AUTHOR_SELECT } from '../users/user.select';
import { assertUuid } from './social.validation';

export const REACTION_TYPES = ['pukpuk', 'ngakak', 'sama'] as const;
export type ReactionType = typeof REACTION_TYPES[number];
export type ReactionCounts = Record<ReactionType, number>;
export const emptyReactionCounts = (): ReactionCounts => ({ pukpuk: 0, ngakak: 0, sama: 0 });
export const isReactionType = (type: string): type is ReactionType =>
  (REACTION_TYPES as readonly string[]).includes(type);

// Public projections never expose the internal author id. Anonymous posts
// additionally hide the author entirely, on every surface (feed, detail,
// create response) so an anonymous confession cannot be re-identified from
// another endpoint. Moderation keeps its own explicit select with ids.
export const POST_SELECT = {
  id: true, category: true, content: true, status: true, createdAt: true, isAnonymous: true,
  user: { select: PUBLIC_AUTHOR_SELECT },
  _count: { select: { reactions: true, comments: { where: { status: 'active' } } } },
} satisfies Prisma.PostSelect;

export const COMMENT_SELECT = {
  id: true, postId: true, content: true, status: true, createdAt: true,
  user: { select: PUBLIC_AUTHOR_SELECT },
} satisfies Prisma.CommentSelect;

export function publicPost<T extends { isAnonymous: boolean; user: unknown }>(post: T): T {
  return post.isAnonymous ? { ...post, user: null } : post;
}

export interface LockedPost {
  id: string;
  userId: string | null;
  status: string;
}

// All social writes lock the parent post before the owner's profile.
export async function lockPost(tx: Prisma.TransactionClient, id: string): Promise<LockedPost> {
  assertUuid(id);
  const [post] = await tx.$queryRaw<LockedPost[]>`
    SELECT "id", "user_id" AS "userId", "status" FROM "posts"
    WHERE "id" = ${id} FOR UPDATE
  `;
  if (!post) throw new NotFoundException('Post tidak ditemukan');
  return post;
}

export function assertActivePost(post: LockedPost): void {
  if (post.status !== 'active') throw new NotFoundException('Post tidak ditemukan');
}

export async function findActivePost(tx: Prisma.TransactionClient, id: string) {
  assertUuid(id);
  const post = await tx.post.findFirst({
    where: { id, status: 'active' }, select: { id: true, userId: true, status: true },
  });
  if (!post) throw new NotFoundException('Post tidak ditemukan');
  return post;
}

export async function changeXp(tx: Prisma.TransactionClient, userId: string, delta: number) {
  if (delta === 0) return;
  await tx.profile.createMany({ data: [{ userId }], skipDuplicates: true });
  const [profile] = await tx.$queryRaw<{ mentalXp: number }[]>`
    SELECT "mental_xp" AS "mentalXp" FROM "profiles"
    WHERE "user_id" = ${userId} FOR UPDATE
  `;
  if (!profile) throw new NotFoundException('Profil tidak ditemukan');
  const mentalXp = Math.max(0, profile.mentalXp + delta);
  await tx.profile.update({
    where: { userId }, data: { mentalXp, mentalLevel: calculateLevel(mentalXp) },
  });
}

export async function reactionCountsByPost(tx: Prisma.TransactionClient, postIds: string[]) {
  const counts = new Map<string, ReactionCounts>(postIds.map((id) => [id, emptyReactionCounts()]));
  if (!postIds.length) return counts;
  const groups = await tx.reaction.groupBy({
    by: ['postId', 'reactionType'], where: { postId: { in: postIds } },
    _count: { _all: true },
  });
  for (const group of groups) {
    const count = counts.get(group.postId);
    if (count && isReactionType(group.reactionType)) {
      count[group.reactionType] = group._count._all;
    }
  }
  return counts;
}

export async function reactionCounts(tx: Prisma.TransactionClient, postId: string) {
  return (await reactionCountsByPost(tx, [postId])).get(postId)!;
}

export async function userReactions(tx: Prisma.TransactionClient, postId: string, userId: string) {
  const choices = { pukpuk: false, ngakak: false, sama: false };
  const reactions = await tx.reaction.findMany({
    where: { postId, userId }, select: { reactionType: true },
  });
  for (const reaction of reactions) {
    if (isReactionType(reaction.reactionType)) choices[reaction.reactionType] = true;
  }
  return choices;
}

export async function deactivatePost(
  tx: Prisma.TransactionClient, post: LockedPost, status: 'deleted' | 'hidden',
) {
  if (post.status !== 'active') return { id: post.id, status: post.status };
  if (post.userId) {
    const groups = await tx.reaction.groupBy({
      by: ['reactionType'], where: { postId: post.id, userId: { not: post.userId } },
      _count: { _all: true },
    });
    let earnedXp = XP_REWARDS.postCreated;
    for (const group of groups) {
      if (isReactionType(group.reactionType)) {
        earnedXp += group._count._all * XP_REWARDS.reactionReceived[group.reactionType];
      }
    }
    await changeXp(tx, post.userId, -earnedXp);
  }
  return tx.post.update({ where: { id: post.id }, data: { status }, select: { id: true, status: true } });
}
