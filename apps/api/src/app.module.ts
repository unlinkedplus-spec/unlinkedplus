import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { CacheModule } from './common/cache/cache.module';
import { HttpMetricsInterceptor } from './common/metrics/http-metrics.interceptor';
import { MetricsModule } from './common/metrics/metrics.module';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './redis/redis.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { HealthModule } from './health/health.module';
import { PostsModule } from './posts/posts.module';
import { ReactionsModule } from './reactions/reactions.module';
import { CommentsModule } from './comments/comments.module';
import { ReportsModule } from './reports/reports.module';
import { AdminModule } from './admin/admin.module';
import { AvatarsModule } from './avatars/avatars.module';
import { StoreModule } from './store/store.module';
import { CertificatesModule } from './certificates/certificates.module';
import { PollsModule } from './polls/polls.module';
import { ConfessionsModule } from './confessions/confessions.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RateLimitGuard } from './common/guards/rate-limit.guard';
import { validateEnvironment } from './common/environment';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnvironment }),
    CacheModule, MetricsModule,
    PrismaModule, RedisModule, HealthModule, AuthModule, UsersModule, PostsModule,
    ReactionsModule, CommentsModule, ReportsModule, AdminModule, AvatarsModule, StoreModule, CertificatesModule,
    PollsModule, ConfessionsModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: RateLimitGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_INTERCEPTOR, useClass: HttpMetricsInterceptor },
  ],
})
export class AppModule {}
