import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { pagination } from '../posts/social.validation';
import { PrismaService } from '../prisma/prisma.service';
import { PUBLIC_USER_SELECT } from '../users/user.select';

const ADMIN_USER_SELECT = { ...PUBLIC_USER_SELECT, role: true, status: true } satisfies Prisma.UserSelect;
const ADMIN_POST_SELECT = {
  id: true,
  content: true,
  category: true,
  status: true,
  createdAt: true,
  userId: true,
  user: { select: { id: true, username: true } },
} satisfies Prisma.PostSelect;

@Injectable()
export class AdminDashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async overview() {
    const [
      users,
      activeUsers,
      posts,
      activePosts,
      comments,
      reports,
      pendingReports,
      paidTransactions,
      simulatedTransactions,
      revenue,
      simulatedRevenue,
      activePolls,
      pendingCertificates,
      recentUsers,
      recentPosts,
      recentReports,
      lastWeekPosts,
    ] = await this.prisma.$transaction([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { status: 'active' } }),
      this.prisma.post.count(),
      this.prisma.post.count({ where: { status: 'active' } }),
      this.prisma.comment.count({ where: { status: 'active' } }),
      this.prisma.report.count(),
      this.prisma.report.count({ where: { status: 'pending' } }),
      this.prisma.transaction.count({ where: { paymentStatus: 'paid' } }),
      this.prisma.transaction.count({ where: { paymentStatus: 'simulated' } }),
      this.prisma.transaction.aggregate({ where: { paymentStatus: 'paid' }, _sum: { amount: true } }),
      this.prisma.transaction.aggregate({ where: { paymentStatus: 'simulated' }, _sum: { amount: true } }),
      this.prisma.poll.count({ where: { status: 'active' } }),
      this.prisma.certificate.count({ where: { status: 'pending' } }),
      this.prisma.user.findMany({ select: ADMIN_USER_SELECT, orderBy: { createdAt: 'desc' }, take: 5 }),
      this.prisma.post.findMany({ select: ADMIN_POST_SELECT, orderBy: { createdAt: 'desc' }, take: 5 }),
      this.prisma.report.findMany({ where: { status: 'pending' }, orderBy: { createdAt: 'asc' }, take: 5 }),
      this.prisma.post.findMany({
        where: { createdAt: { gte: this.startOfDay(6) } },
        select: { createdAt: true },
        orderBy: { createdAt: 'asc' },
      }),
    ]);

    return {
      stats: {
        users,
        activeUsers,
        posts,
        activePosts,
        comments,
        reports,
        pendingReports,
        paidTransactions,
        simulatedTransactions,
        // SEC-06: keep real revenue separate from simulation. No misleading income.
        revenue: revenue._sum.amount ?? 0,
        simulatedRevenue: simulatedRevenue._sum.amount ?? 0,
        activePolls,
        pendingCertificates,
      },
      recent: { users: recentUsers, posts: recentPosts, reports: recentReports },
      activity: this.dailyActivity(lastWeekPosts.map((post) => post.createdAt)),
    };
  }

  async users(page = 1, limit = 20) {
    const p = pagination(page, limit);
    const [data, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        select: ADMIN_USER_SELECT,
        orderBy: { createdAt: 'desc' },
        skip: p.skip,
        take: p.limit,
      }),
      this.prisma.user.count(),
    ]);
    return { data, total, page: p.page, totalPages: Math.ceil(total / p.limit) };
  }

  async posts(page = 1, limit = 20) {
    const p = pagination(page, limit);
    const [data, total] = await this.prisma.$transaction([
      this.prisma.post.findMany({
        select: ADMIN_POST_SELECT,
        orderBy: { createdAt: 'desc' },
        skip: p.skip,
        take: p.limit,
      }),
      this.prisma.post.count(),
    ]);
    return { data, total, page: p.page, totalPages: Math.ceil(total / p.limit) };
  }

  async setUserStatus(id: string, status: string, adminId: string) {
    if (id === adminId) throw new ConflictException('Akun sendiri tidak bisa dinonaktifkan');
    const user = await this.prisma.user.findUnique({ where: { id }, select: { id: true } });
    if (!user) throw new NotFoundException('Pengguna tidak ditemukan');
    return this.prisma.user.update({
      where: { id },
      data: { status },
      select: ADMIN_USER_SELECT,
    });
  }

  private startOfDay(daysAgo: number) {
    const date = new Date();
    date.setUTCHours(0, 0, 0, 0);
    date.setUTCDate(date.getUTCDate() - daysAgo);
    return date;
  }

  private dailyActivity(dates: Date[]) {
    const days = Array.from({ length: 7 }, (_, index) => {
      const date = this.startOfDay(6 - index);
      return { date: date.toISOString().slice(0, 10), posts: 0 };
    });
    const indexByDate = new Map(days.map((day, index) => [day.date, index]));
    for (const date of dates) {
      const key = date.toISOString().slice(0, 10);
      const index = indexByDate.get(key);
      if (index !== undefined) days[index].posts += 1;
    }
    return days;
  }
}
