import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Prisma } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { createHash, randomBytes, randomUUID } from 'crypto';
import { MailService } from '../mail/mail.service';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { PUBLIC_USER_SELECT } from '../users/user.select';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { SetEmailDto } from './dto/set-email.dto';

export const SESSION_SECONDS = 86400;
export const SESSION_COOKIE = 'unlinked_session';
export const RESET_TOKEN_SECONDS = 900;
export const RECOVERY_CODE_SECONDS = 60 * 60 * 24 * 365 * 10;
const SELF_SELECT = { ...PUBLIC_USER_SELECT, role: true } satisfies Prisma.UserSelect;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly dummyHash = bcrypt.hash(randomBytes(32).toString('hex'), 12);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly redis: RedisService,
    private readonly config: ConfigService,
    private readonly mail: MailService,
  ) {}

  async register(dto: RegisterDto) {
    const username = dto.username ?? `manusia_${randomBytes(6).toString('hex')}`;
    const passwordHash = await bcrypt.hash(dto.password, 12);
    const recoveryCode = randomBytes(24).toString('base64url');
    const emailHash = dto.email ? this.hashEmail(dto.email) : null;

    try {
      const user = await this.prisma.$transaction(async (tx) => {
        const created = await tx.user.create({
          data: {
            username,
            passwordHash,
            emailHash,
            profile: { create: { avatarConfig: { character: 'panda', accessories: [] } } },
          },
          select: SELF_SELECT,
        });
        await tx.passwordResetToken.create({
          data: {
            userId: created.id,
            tokenHash: this.hashToken(recoveryCode),
            kind: 'recovery',
            expiresAt: new Date(Date.now() + RECOVERY_CODE_SECONDS * 1000),
          },
        });
        return created;
      });
      return { user, token: await this.createSession(user.id), recoveryCode };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Username atau email sudah dipakai. Coba yang lain.');
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

  async logout(userId: string, sessionId: string) {
    await this.redis.client
      .multi()
      .del(`session:${sessionId}`)
      .srem(`userSessions:${userId}`, sessionId)
      .exec();
  }

  async setEmail(userId: string, dto: SetEmailDto) {
    try {
      await this.prisma.user.update({
        where: { id: userId },
        data: { emailHash: this.hashEmail(dto.email) },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Email sudah dipakai akun lain.');
      }
      throw error;
    }
    return { success: true };
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const emailHash = this.hashEmail(dto.email);
    const user = await this.prisma.user.findUnique({
      where: { emailHash },
      select: { id: true, status: true },
    });
    if (!user || user.status !== 'active') return { success: true, emailSent: false };

    const token = randomBytes(32).toString('hex');
    const now = new Date();
    await this.prisma.$transaction([
      this.prisma.passwordResetToken.updateMany({
        where: { userId: user.id, kind: 'email', usedAt: null },
        data: { usedAt: now },
      }),
      this.prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          tokenHash: this.hashToken(token),
          kind: 'email',
          expiresAt: new Date(now.getTime() + RESET_TOKEN_SECONDS * 1000),
        },
      }),
    ]);

    const frontend = String(this.config.get('FRONTEND_URL') ?? '').replace(/\/$/, '');
    const resetUrl = `${frontend}/app?reset=${encodeURIComponent(token)}`;
    try {
      await this.mail.sendPasswordReset({ to: dto.email, resetUrl, expiresInMinutes: Math.round(RESET_TOKEN_SECONDS / 60) });
      return { success: true, emailSent: true };
    } catch (error) {
      this.logger.warn(`Email reset gagal dikirim: ${error instanceof Error ? error.message : String(error)}`);
      return { success: true, emailSent: false };
    }
  }

  async resetPassword(dto: ResetPasswordDto) {
    const tokenHash = this.hashToken(dto.token);
    const record = await this.prisma.passwordResetToken.findUnique({
      where: { tokenHash },
      include: { user: { select: { id: true, status: true } } },
    });
    if (!record || record.usedAt || record.expiresAt.getTime() <= Date.now() ||
        record.user.status !== 'active' || !['email', 'recovery'].includes(record.kind)) {
      throw new BadRequestException('Kode/tautan reset tidak valid atau kedaluwarsa');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);
    await this.prisma.$transaction([
      this.prisma.passwordResetToken.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      }),
      this.prisma.user.update({ where: { id: record.userId }, data: { passwordHash } }),
    ]);
    await this.revokeSessions(record.userId);
    return { success: true };
  }

  private async createSession(userId: string) {
    const sid = randomUUID();
    const token = await this.jwt.signAsync({ sub: userId, sid });
    await this.redis.client
      .multi()
      .set(`session:${sid}`, userId, 'EX', SESSION_SECONDS)
      .sadd(`userSessions:${userId}`, sid)
      .exec();
    return token;
  }

  private async revokeSessions(userId: string) {
    const sids = await this.redis.client.smembers(`userSessions:${userId}`);
    if (!sids.length) return;
    const pipeline = this.redis.client.multi();
    for (const sid of sids) pipeline.del(`session:${sid}`);
    pipeline.del(`userSessions:${userId}`);
    await pipeline.exec();
  }

  private hashToken(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }

  private hashEmail(email: string) {
    const pepper = String(this.config.get('EMAIL_HASH_PEPPER') ?? '');
    return createHash('sha256').update(`${pepper}:${email.trim().toLowerCase()}`).digest('hex');
  }
}
