import { Body, Controller, Get, HttpCode, Post, Res } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Response } from 'express';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { AuthService, SESSION_COOKIE, SESSION_SECONDS } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService, private readonly config: ConfigService) {}

  @Public()
  @Post('register')
  async register(@Body() dto: RegisterDto, @Res({ passthrough: true }) response: Response) {
    const { user, token } = await this.auth.register(dto);
    response.cookie(SESSION_COOKIE, token, this.cookieOptions());
    return { user };
  }

  @Public()
  @HttpCode(200)
  @Post('login')
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) response: Response) {
    const { user, token } = await this.auth.login(dto);
    response.cookie(SESSION_COOKIE, token, this.cookieOptions());
    return { user };
  }

  @Get('me')
  me(@CurrentUser() user: { userId: string }) { return this.auth.getMe(user.userId); }

  @HttpCode(200)
  @Post('logout')
  async logout(@CurrentUser() user: { sessionId: string }, @Res({ passthrough: true }) response: Response) {
    await this.auth.logout(user.sessionId);
    response.clearCookie(SESSION_COOKIE, { ...this.cookieOptions(), maxAge: undefined });
    return { success: true };
  }

  private cookieOptions() {
    return { httpOnly: true, secure: this.config.get('COOKIE_SECURE') === 'true',
      sameSite: 'strict' as const, path: '/api', maxAge: SESSION_SECONDS * 1000 };
  }
}
