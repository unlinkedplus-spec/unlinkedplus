import { Injectable } from '@nestjs/common';
import { Subject } from 'rxjs';

export type NotificationStreamEvent = { type: string; count?: number };

/**
 * In-process per-session notification streams. The backend currently runs as a
 * single container; if it is scaled out, replace this map with Redis pub/sub.
 */
@Injectable()
export class NotificationStreamService {
  private readonly streams = new Map<string, Subject<NotificationStreamEvent>>();

  subject(key: string): Subject<NotificationStreamEvent> {
    let subject = this.streams.get(key);
    if (!subject) {
      subject = new Subject<NotificationStreamEvent>();
      this.streams.set(key, subject);
    }
    return subject;
  }

  push(userId: string, _sessionId: string | undefined, count: number) {
    // Streams subscribe by userId (see controller), so a single emit is enough.
    this.subject(userId).next({ type: 'notification', count });
  }
}
