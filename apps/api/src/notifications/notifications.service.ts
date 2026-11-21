import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { pagination } from '../posts/social.validation';

export type NotificationInput = {
  userId: string;
  type: 'reaction' | 'comment';
  postId: string;
  actorId: string;
  reactionType?: string;
  preview?: string;
};

const SELECT = {
  id: true, type: true, postId: true, reactionType: true, preview: true,
  readAt: true, createdAt: true,
  actor: {
    select: {
      username: true,
      profile: { select: { isAnonymous: true, avatarConfig: true } },
    },
  },
} satisfies Prisma.NotificationSelect;

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Called inside the same transaction as the triggering write. */
  async createInTx(tx: Prisma.TransactionClient, input: NotificationInput) {
    // Ignore self-reactions/self-comments: no notification noise.
    if (input.userId === input.actorId) return null;

    // One notification per (recipient, post, actor, type) — toggling a reaction
    // updates the existing one instead of spamming the inbox.
    const existing = await tx.notification.findFirst({
      where: {
        userId: input.userId, postId: input.postId,
        actorId: input.actorId, type: input.type,
      },
      select: { id: true },
    });
    const data = {
      type: input.type,
      postId: input.postId,
      actorId: input.actorId,
      reactionType: input.reactionType ?? null,
      preview: input.preview?.slice(0, 240) ?? null,
      readAt: null,
      createdAt: new Date(),
    };
    const row = existing
      ? await tx.notification.update({ where: { id: existing.id }, data, select: { id: true } })
      : await tx.notification.create({ data: { ...data, userId: input.userId }, select: { id: true } });
    return row.id;
  }

  private project(row: Prisma.NotificationGetPayload<{ select: typeof SELECT }>) {
    const isAnon = row.actor?.profile?.isAnonymous ?? false;
    return {
      id: row.id,
      type: row.type,
      postId: row.postId,
      reactionType: row.reactionType,
      // Anonymity is preserved: never expose an anonymous actor's identity.
      actor: isAnon ? 'Seseorang' : (row.actor?.username ?? 'Seseorang'),
      actorAnonymous: isAnon,
      avatarConfig: isAnon ? null : (row.actor?.profile?.avatarConfig ?? null),
      preview: row.preview,
      read: row.readAt !== null,
      createdAt: row.createdAt,
    };
  }

  async list(userId: string, page = 1, limit = 20) {
    const paging = pagination(page, limit);
    const where = { userId };
    return this.prisma.$transaction(async (tx) => {
      const rows = await tx.notification.findMany({
        where, select: SELECT, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: paging.skip, take: paging.limit,
      });
      const total = await tx.notification.count({ where });
      return {
        data: rows.map((r) => this.project(r)),
        total, page: paging.page, totalPages: Math.ceil(total / paging.limit),
      };
    }, { isolationLevel: 'RepeatableRead' });
  }

  async unreadCount(userId: string) {
    return this.prisma.notification.count({ where: { userId, readAt: null } });
  }

  async markRead(userId: string, id: string) {
    const row = await this.prisma.notification.findFirst({ where: { id, userId }, select: { id: true } });
    if (!row) return null;
    await this.prisma.notification.update({
      where: { id }, data: { readAt: new Date() }, select: { id: true },
    });
    return this.unreadCount(userId);
  }

  async markAllRead(userId: string) {
    await this.prisma.notification.updateMany({ where: { userId, readAt: null }, data: { readAt: new Date() } });
    return 0;
  }
}
