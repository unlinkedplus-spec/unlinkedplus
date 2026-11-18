import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Request } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { SESSION_COOKIE } from './auth.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService, private readonly prisma: PrismaService, private readonly redis: RedisService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (request: Request) => request.cookies?.[SESSION_COOKIE] ?? null,
      ]),
      ignoreExpiration: false, secretOrKey: config.getOrThrow<string>('JWT_SECRET'),
      algorithms: ['HS256'], issuer: 'unlinked-api', audience: 'unlinked-web',
    });
  }

  async validate(payload: { sub?: string; sid?: string }) {
    if (!payload.sub || !payload.sid) throw new UnauthorizedException('Sesi tidak berlaku');
    if (await this.redis.client.get(`session:${payload.sid}`) !== payload.sub) throw new UnauthorizedException('Sesi berakhir');
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub }, select: { id: true, username: true, role: true, status: true },
    });
    if (!user || user.status !== 'active') throw new UnauthorizedException('Sesi tidak berlaku');
    return { userId: user.id, username: user.username, role: user.role, sessionId: payload.sid };
  }
}
