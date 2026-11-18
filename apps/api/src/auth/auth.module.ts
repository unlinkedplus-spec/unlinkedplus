import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthService, SESSION_SECONDS } from './auth.service';
import { JwtStrategy } from './jwt.strategy';

@Module({
  imports: [PassportModule, JwtModule.registerAsync({
    inject: [ConfigService],
    useFactory: (config: ConfigService) => ({
      secret: config.getOrThrow<string>('JWT_SECRET'),
      signOptions: { expiresIn: SESSION_SECONDS, algorithm: 'HS256', issuer: 'unlinked-api', audience: 'unlinked-web' },
    }),
  })],
  controllers: [AuthController], providers: [AuthService, JwtStrategy], exports: [AuthService],
})
export class AuthModule {}
