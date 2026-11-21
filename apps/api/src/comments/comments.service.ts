import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { NotificationStreamService } from '../notifications/notification-stream.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { assertActivePost, COMMENT_SELECT, findActivePost, lockPost } from '../posts/social.persistence';
import { assertUuid, pagination, validateInput } from '../posts/social.validation';
import { CreateCommentDto } from './dto/create-comment.dto';

@Injectable()
export class CommentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications?: NotificationsService,
    private readonly stream?: NotificationStreamService,
  ) {}

  async findAll(postId: string, page = 1, limit = 20) {
    const paging = pagination(page, limit);
    return this.prisma.$transaction(async (tx) => {
      await findActivePost(tx, postId);
      const where = { postId, status: 'active' };
      const data = await tx.comment.findMany({
        where, select: COMMENT_SELECT, orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
        skip: paging.skip, take: paging.limit,
      });
      const total = await tx.comment.count({ where });
      return { data, total, page: paging.page, totalPages: Math.ceil(total / paging.limit) };
    }, { isolationLevel: 'RepeatableRead' });
  }

  async create(postId: string, userId: string, input: CreateCommentDto) {
    const dto = validateInput(CreateCommentDto, input);
    const result = await this.prisma.$transaction(async (tx) => {
      const post = await lockPost(tx, postId);
      assertActivePost(post);
      const comment = await tx.comment.create({
        data: { postId, userId, content: dto.content }, select: COMMENT_SELECT,
      });
      if (post.userId && this.notifications) {
        await this.notifications.createInTx(tx, {
          userId: post.userId, type: 'comment', postId, actorId: userId,
          preview: dto.content,
        });
      }
      return { comment, recipientId: post.userId };
    }, { isolationLevel: 'ReadCommitted' });

    if (result.recipientId && this.notifications && this.stream) {
      const count = await this.notifications.unreadCount(result.recipientId);
      this.stream.push(result.recipientId, undefined, count);
    }
    return result.comment;
  }

  async softDelete(id: string, userId: string) {
    assertUuid(id);
    return this.prisma.$transaction(async (tx) => {
      const reference = await tx.comment.findUnique({ where: { id }, select: { postId: true } });
      if (!reference) throw new NotFoundException('Komentar tidak ditemukan');
      assertActivePost(await lockPost(tx, reference.postId));
      const comment = await tx.comment.findUnique({
        where: { id }, select: { userId: true, status: true },
      });
      if (!comment || comment.status !== 'active') throw new NotFoundException('Komentar tidak ditemukan');
      if (comment.userId !== userId) throw new ForbiddenException('Hanya pemilik yang dapat menghapus komentar');
      return tx.comment.update({
        where: { id }, data: { status: 'deleted' }, select: { id: true, status: true },
      });
    }, { isolationLevel: 'ReadCommitted' });
  }
}

