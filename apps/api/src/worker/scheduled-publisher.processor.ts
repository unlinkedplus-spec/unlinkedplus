import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { XP_REWARDS } from '../common/helpers/xp-level.helper';
import { changeXp } from '../posts/social.persistence';
import { PrismaService } from '../prisma/prisma.service';

const DEFAULT_INTERVAL_MS = 30_000;

type DuePost = { id: string; userId: string | null };

/**
 * Publishes confessions whose scheduled_at has passed.
 *
 * The API deliberately stores future confessions with status='scheduled' and
 * does NOT grant XP at creation. This worker flips them to 'active' and grants
 * the post XP exactly once, in the same transaction, so a crash cannot leave
 * an unpublished post with XP or a published post without XP.
 */
@Injectable()
export class ScheduledPublisher implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ScheduledPublisher.name);
  private timer?: ReturnType<typeof setInterval>;
  private ticking = false;
  private readonly intervalMs: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    const configured = Number(this.config.get<string>('SCHEDULED_PUBLISH_INTERVAL_MS'));
    this.intervalMs = Number.isFinite(configured) && configured >= 1_000
      ? configured
      : DEFAULT_INTERVAL_MS;
  }

  onModuleInit(): void {
    this.timer = setInterval(() => void this.tick(), this.intervalMs);
    // The certificate worker keeps the process alive; this timer must not.
    this.timer.unref?.();
    this.logger.log(`Scheduled post publisher is running (interval ${this.intervalMs}ms)`);
    void this.tick();
  }

  async onModuleDestroy(): Promise<void> {
    if (this.timer) clearInterval(this.timer);
  }

  private async tick(): Promise<void> {
    if (this.ticking) return;
    this.ticking = true;
    try {
      const published = await this.publishDue();
      if (published > 0) this.logger.log(`Published ${published} scheduled post(s)`);
    } catch {
      this.logger.error('Scheduled post publisher tick failed');
    } finally {
      this.ticking = false;
    }
  }

  async publishDue(now: Date = new Date()): Promise<number> {
    return this.prisma.$transaction(async (tx) => {
      // SKIP LOCKED lets additional worker replicas scan the same queue safely.
      const rows = await tx.$queryRaw<DuePost[]>`
        SELECT "id", "user_id" AS "userId" FROM "posts"
        WHERE "status" = 'scheduled' AND "scheduled_at" <= ${now}
        ORDER BY "scheduled_at" ASC, "id" ASC
        FOR UPDATE SKIP LOCKED
      `;
      if (rows.length === 0) return 0;

      const ids = rows.map((row) => row.id);
      const updated = await tx.post.updateMany({
        where: { id: { in: ids }, status: 'scheduled', scheduledAt: { lte: now } },
        data: { status: 'active' },
      });

      // Defensive rollback: never award XP unless every locked row was really published.
      if (updated.count !== rows.length) {
        throw new Error('Scheduled post state changed during publication');
      }

      for (const row of rows) {
        if (row.userId) await changeXp(tx, row.userId, XP_REWARDS.postCreated);
      }
      return updated.count;
    }, { isolationLevel: 'ReadCommitted' });
  }
}
