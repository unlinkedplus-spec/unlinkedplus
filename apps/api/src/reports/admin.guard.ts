import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { SocialUser } from '../posts/social.validation';

@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<{ user?: SocialUser }>();
    if (!request.user?.userId) throw new UnauthorizedException();
    if (request.user.role !== 'admin') throw new ForbiddenException('Akses admin diperlukan');
    return true;
  }
}
