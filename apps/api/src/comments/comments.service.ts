import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { assertActivePost, COMMENT_SELECT, findActivePost, lockPost } from '../posts/social.persistence';
import { assertUuid, pagination, validateInput } from '../posts/social.validation';
import { CreateCommentDto } from './dto/create-comment.dto';

@Injectable()
export class CommentsService {
  constructor(private readonly prisma: PrismaService) {}

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
    return this.prisma.$transaction(async (tx) => {
      assertActivePost(await lockPost(tx, postId));
      return tx.comment.create({ data: { postId, userId, content: dto.content }, select: COMMENT_SELECT });
    }, { isolationLevel: 'ReadCommitted' });
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
