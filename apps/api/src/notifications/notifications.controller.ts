import { Body, Controller, Get, Header, Param, ParseUUIDPipe, Patch, Query, Sse } from '@nestjs/common';
import { map, merge, Observable } from 'rxjs';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { PaginationDto } from '../posts/social.validation';
import { NotificationStreamService } from './notification-stream.service';
import { NotificationsService } from './notifications.service';

type SessionUser = { userId: string; sessionId?: string };

@Controller('notifications')
export class NotificationsController {
  constructor(
    private readonly notifications: NotificationsService,
    private readonly streams: NotificationStreamService,
  ) {}

  @Get()
  list(@CurrentUser() user: SessionUser, @Query() query: PaginationDto) {
    return this.notifications.list(user.userId, query.page, query.limit);
  }

  @Get('unread-count')
  async unread(@CurrentUser() user: SessionUser) {
    return { count: await this.notifications.unreadCount(user.userId) };
  }

  @Patch('read-all')
  async readAll(@CurrentUser() user: SessionUser) {
    const count = await this.notifications.markAllRead(user.userId);
    this.streams.push(user.userId, user.sessionId, count);
    return { count };
  }

  @Patch(':id/read')
  async read(@CurrentUser() user: SessionUser, @Param('id', new ParseUUIDPipe()) id: string) {
    const count = await this.notifications.markRead(user.userId, id);
    this.streams.push(user.userId, user.sessionId, count ?? 0);
    return { count };
  }

  @Sse('stream')
  @Header('X-Accel-Buffering', 'no')
  stream(@CurrentUser() user: SessionUser): Observable<MessageEvent> {
    // All writers emit on the userId subject; one subscription avoids duplicate events.
    const feed = merge(this.streams.subject(user.userId));
    void this.notifications.unreadCount(user.userId).then((count) => {
      this.streams.subject(user.userId).next({ type: 'hello', count });
    });
    return feed.pipe(map((event) => ({ data: event } as MessageEvent)));
  }
}

