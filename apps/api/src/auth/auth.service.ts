import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Prisma } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { randomBytes, randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { PUBLIC_USER_SELECT } from '../users/user.select';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

export const SESSION_SECONDS = 86400;
export const SESSION_COOKIE = 'unlinked_session';
const SELF_SELECT = { ...PUBLIC_USER_SELECT, role: true } satisfies Prisma.UserSelect;

@Injectable()
export class AuthService {
  private readonly dummyHash = bcrypt.hash(randomBytes(32).toString('hex'), 12);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly redis: RedisService,
  ) {}

  async register(dto: RegisterDto) {
    const username = dto.username ?? `manusia_${randomBytes(6).toString('hex')}`;
    const passwordHash = await bcrypt.hash(dto.password, 12);
    try {
      const user = await this.prisma.user.create({
        data: { username, passwordHash, profile: { create: {
          avatarConfig: { character: 'panda', accessories: [] },
        } } },
        select: SELF_SELECT,
      });
      return { user, token: await this.createSession(user.id) };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Username sudah dipakai. Coba yang lain.');
      }
      throw error;
    }
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { username: dto.username } });
    const valid = await bcrypt.compare(dto.password, user?.passwordHash ?? await this.dummyHash);
    if (!user || !valid || user.status !== 'active') throw new UnauthorizedException('Username atau password salah');
    return { user: await this.getMe(user.id), token: await this.createSession(user.id) };
  }

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId, status: 'active' }, select: SELF_SELECT });
    if (!user) throw new UnauthorizedException('Sesi tidak berlaku');
    return user;
  }

  async logout(sessionId: string) { await this.redis.client.del(`session:${sessionId}`); }

  private async createSession(userId: string) {
    const sid = randomUUID();
    const token = await this.jwt.signAsync({ sub: userId, sid });
    await this.redis.client.set(`session:${sid}`, userId, 'EX', SESSION_SECONDS);
    return token;
  }
}
