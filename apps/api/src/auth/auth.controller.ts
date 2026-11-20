import { Body, Controller, Get, HttpCode, Post, Req, Res } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request, Response } from 'express';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { AuthService, SESSION_COOKIE, SESSION_SECONDS } from './auth.service';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { SetEmailDto } from './dto/set-email.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService, private readonly config: ConfigService) {}

  @Public()
  @Post('register')
  async register(
    @Body() dto: RegisterDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const { user, token, recoveryCode } = await this.auth.register(dto);
    response.cookie(SESSION_COOKIE, token, this.cookieOptions(request));
    return { user, recoveryCode };
  }

  @Public()
  @HttpCode(200)
  @Post('login')
  async login(
    @Body() dto: LoginDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const { user, token } = await this.auth.login(dto);
    response.cookie(SESSION_COOKIE, token, this.cookieOptions(request));
    return { user };
  }

  @Get('me')
  me(@CurrentUser() user: { userId: string }) { return this.auth.getMe(user.userId); }

  @HttpCode(200)
  @Post('logout')
  async logout(
    @CurrentUser() user: { userId: string; sessionId: string },
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    await this.auth.logout(user.userId, user.sessionId);
    response.clearCookie(SESSION_COOKIE, { ...this.cookieOptions(request), maxAge: undefined });
    return { success: true };
  }

  @HttpCode(200)
  @Post('email')
  setEmail(@CurrentUser() user: { userId: string }, @Body() dto: SetEmailDto) {
    return this.auth.setEmail(user.userId, dto);
  }

  @Public()
  @HttpCode(200)
  @Post('forgot-password')
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.auth.forgotPassword(dto);
  }

  @Public()
  @HttpCode(200)
  @Post('reset-password')
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.auth.resetPassword(dto);
  }

  /**
   * SEC-02 hardening: the cookie is Secure whenever the request arrives over
   * HTTPS, even if COOKIE_SECURE is still false on a legacy LAN deployment.
   * On plain HTTP we keep it non-Secure deliberately — a Secure cookie would
   * never be stored/sent by the browser and login would silently break.
   */
  private cookieOptions(request: Request) {
    const secure = request.protocol === 'https' || this.config.get('COOKIE_SECURE') === 'true';
    // Path '/' is required so the session cookie is also sent to '/', where
    // the two-state root decides between public landing and logged-in Beranda.
    return { httpOnly: true, secure, sameSite: 'strict' as const,
      path: '/', maxAge: SESSION_SECONDS * 1000 };
  }
}
