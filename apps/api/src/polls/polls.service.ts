import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { CacheService } from '../common/cache/cache.service';
import { PrismaService } from '../prisma/prisma.service';
import { assertUuid, pagination, validateInput } from '../posts/social.validation';
import { CreatePollDto } from './dto/create-poll.dto';
import { VotePollDto } from './dto/vote-poll.dto';

const DEFAULT_DURATION_HOURS = 72;
const ACTIVE_POLL_CACHE_KEY = 'polls:active:v1';

type PollWithOptions = Prisma.PollGetPayload<{
  include: {
    options: {
      orderBy: { position: 'asc' };
      include: { _count: { select: { votes: true } } };
    };
  };
}>;

function serializePoll(poll: PollWithOptions, myVoteId: string | null = null) {
  const totalVotes = poll.options.reduce((sum, option) => sum + option._count.votes, 0);
  const now = new Date();
  return {
    id: poll.id,
    question: poll.question,
    status: poll.status,
    startsAt: poll.startsAt,
    endsAt: poll.endsAt,
    isOpen: poll.status === 'active' && poll.startsAt <= now && poll.endsAt > now,
    totalVotes,
    myVoteId,
    options: poll.options.map((option) => ({
      id: option.id,
      label: option.label,
      position: option.position,
      votes: option._count.votes,
      percentage: totalVotes === 0 ? 0 : Math.round((option._count.votes / totalVotes) * 100),
    })),
  };
}

const POLL_INCLUDE = {
  options: {
    orderBy: { position: 'asc' as const },
    include: { _count: { select: { votes: true as const } } },
  },
};

function assertOpen(poll: { status: string; startsAt: Date; endsAt: Date }) {
  const now = new Date();
  if (poll.status !== 'active' || poll.startsAt > now || poll.endsAt <= now) {
    throw new BadRequestException('Polling sudah ditutup');
  }
}

@Injectable()
export class PollsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
  ) {}

  async getActive() {
    // Polling aktif dibaca sangat sering; cache 3 detik memotong hampir semua
    // query ke DB tanpa mengorbankan hasil voting (invalidasi saat vote).
    return this.cache.getOrSet(
      ACTIVE_POLL_CACHE_KEY,
      3,
      async () => {
        const now = new Date();
        const poll = await this.prisma.poll.findFirst({
          where: { status: 'active', startsAt: { lte: now }, endsAt: { gt: now } },
          include: POLL_INCLUDE,
          orderBy: { createdAt: 'desc' },
        });
        return poll ? serializePoll(poll) : null;
      },
      { staleSeconds: 5, negativeTtlSeconds: 2 },
    );
  }

  async getResults(id: string) {
    assertUuid(id);
    const poll = await this.prisma.poll.findUnique({ where: { id }, include: POLL_INCLUDE });
    if (!poll) throw new NotFoundException('Polling tidak ditemukan');
    return serializePoll(poll);
  }

  async getMyVote(id: string, userId: string) {
    assertUuid(id);
    const vote = await this.prisma.pollVote.findUnique({
      where: { pollId_userId: { pollId: id, userId } },
      select: { optionId: true },
    });
    return { optionId: vote?.optionId ?? null };
  }

  async vote(id: string, userId: string, input: VotePollDto) {
    const dto = validateInput(VotePollDto, input);
    const result = await this.prisma.$transaction(async (tx) => {
      const poll = await tx.poll.findUnique({
        where: { id },
        include: { options: { select: { id: true } } },
      });
      if (!poll) throw new NotFoundException('Polling tidak ditemukan');
      assertOpen(poll);
      if (!poll.options.some((option) => option.id === dto.optionId)) {
        throw new BadRequestException('Pilihan tidak valid untuk polling ini');
      }
      await tx.pollVote.upsert({
        where: { pollId_userId: { pollId: id, userId } },
        create: { pollId: id, optionId: dto.optionId, userId },
        update: { optionId: dto.optionId },
      });
      const updated = await tx.poll.findUniqueOrThrow({ where: { id }, include: POLL_INCLUDE });
      return serializePoll(updated, dto.optionId);
    }, { isolationLevel: 'ReadCommitted' });
    await this.cache.invalidate(ACTIVE_POLL_CACHE_KEY);
    return result;
  }

  async create(input: CreatePollDto) {
    const dto = validateInput(CreatePollDto, input);
    const labels = dto.options.map((option) => option.label);
    if (new Set(labels).size !== labels.length) {
      throw new BadRequestException('Pilihan polling tidak boleh duplikat');
    }
    const durationHours = dto.durationHours ?? DEFAULT_DURATION_HOURS;
    const poll = await this.prisma.poll.create({
      data: {
        question: dto.question,
        status: dto.status ?? 'active',
        endsAt: new Date(Date.now() + durationHours * 3600_000),
        options: {
          create: labels.map((label, index) => ({ label, position: index })),
        },
      },
      include: POLL_INCLUDE,
    });
    await this.cache.invalidate(ACTIVE_POLL_CACHE_KEY);
    return serializePoll(poll);
  }

  async list(page = 1, limit = 20) {
    const paging = pagination(page, limit);
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.poll.findMany({
        include: POLL_INCLUDE,
        orderBy: { createdAt: 'desc' },
        skip: paging.skip,
        take: paging.limit,
      }),
      this.prisma.poll.count(),
    ]);
    return {
      data: rows.map((poll) => serializePoll(poll)),
      total,
      page: paging.page,
      totalPages: Math.ceil(total / paging.limit),
    };
  }
}
