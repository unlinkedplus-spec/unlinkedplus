import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { assertActivePost, deactivatePost, lockPost } from '../posts/social.persistence';
import { assertUuid, pagination, validateInput } from '../posts/social.validation';
import { CreateReportDto } from './dto/create-report.dto';
import { ResolveReportDto } from './dto/resolve-report.dto';

const REPORT_SELECT = {
  id: true, reporterId: true, targetType: true, targetId: true, reason: true, status: true, createdAt: true,
} satisfies Prisma.ReportSelect;

interface LockedReport {
  id: string;
  targetType: string;
  targetId: string;
  status: string;
}

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(reporterId: string, input: CreateReportDto) {
    const dto = validateInput(CreateReportDto, input);
    return this.prisma.$transaction(async (tx) => {
      if (dto.targetType === 'post') {
        assertActivePost(await lockPost(tx, dto.targetId));
      } else if (dto.targetType === 'comment') {
        const reference = await tx.comment.findUnique({
          where: { id: dto.targetId }, select: { postId: true },
        });
        if (!reference) throw new NotFoundException('Komentar tidak ditemukan');
        assertActivePost(await lockPost(tx, reference.postId));
        const comment = await tx.comment.findFirst({
          where: { id: dto.targetId, status: 'active' }, select: { id: true },
        });
        if (!comment) throw new NotFoundException('Komentar tidak ditemukan');
      } else {
        const user = await tx.user.findUnique({ where: { id: dto.targetId }, select: { id: true } });
        if (!user) throw new NotFoundException('Pengguna tidak ditemukan');
      }
      return tx.report.create({
        data: { reporterId, targetType: dto.targetType, targetId: dto.targetId, reason: dto.reason },
        select: REPORT_SELECT,
      });
    }, { isolationLevel: 'ReadCommitted' });
  }

  async findPending(page = 1, limit = 20) {
    const paging = pagination(page, limit);
    return this.prisma.$transaction(async (tx) => {
      const where = { status: 'pending' };
      const data = await tx.report.findMany({
        where, select: REPORT_SELECT, orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
        skip: paging.skip, take: paging.limit,
      });
      const total = await tx.report.count({ where });
      return { data, total, page: paging.page, totalPages: Math.ceil(total / paging.limit) };
    }, { isolationLevel: 'RepeatableRead' });
  }

  async resolve(id: string, input: ResolveReportDto) {
    assertUuid(id);
    const dto = validateInput(ResolveReportDto, input);
    return this.prisma.$transaction(async (tx) => {
      const [report] = await tx.$queryRaw<LockedReport[]>`
        SELECT "id", "target_type" AS "targetType", "target_id" AS "targetId", "status"
        FROM "reports" WHERE "id" = ${id} FOR UPDATE
      `;
      if (!report) throw new NotFoundException('Laporan tidak ditemukan');
      if (report.status !== 'pending') throw new ConflictException('Laporan sudah ditangani');
      if (dto.action === 'hide') {
        if (report.targetType === 'post') {
          await deactivatePost(tx, await lockPost(tx, report.targetId), 'hidden');
        } else if (report.targetType === 'comment') {
          const comment = await tx.comment.findUnique({
            where: { id: report.targetId }, select: { postId: true },
          });
          if (!comment) throw new NotFoundException('Komentar tidak ditemukan');
          await lockPost(tx, comment.postId);
          await tx.comment.updateMany({
            where: { id: report.targetId, status: 'active' }, data: { status: 'hidden' },
          });
        } else if (report.targetType === 'user') {
          const user = await tx.user.findUnique({ where: { id: report.targetId }, select: { id: true } });
          if (!user) throw new NotFoundException('Pengguna tidak ditemukan');
          await tx.user.update({ where: { id: report.targetId }, data: { status: 'disabled' } });
        } else {
          throw new ConflictException('Jenis target laporan tidak didukung');
        }
      }
      return tx.report.update({
        where: { id }, data: { status: dto.action === 'dismiss' ? 'dismissed' : 'resolved' },
        select: REPORT_SELECT,
      });
    }, { isolationLevel: 'ReadCommitted' });
  }
}
