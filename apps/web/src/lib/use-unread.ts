'use client';

/** Live notification count via SSE with REST fallback, no polling storms. */
import { useCallback, useEffect, useState } from 'react';
import { getUnreadCount } from './api';

export function useUnreadCount(enabled: boolean) {
  const [count, setCount] = useState(0);

  const refresh = useCallback(() => {
    if (!enabled) { setCount(0); return; }
    void getUnreadCount().then((r) => setCount(r.count)).catch(() => undefined);
  }, [enabled]);

  useEffect(() => {
    if (!enabled) { setCount(0); return; }
    refresh();
    let source: EventSource | null = null;
    try {
      source = new EventSource('/api/notifications/stream', { withCredentials: true });
      source.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as { type?: string; count?: number };
          if (typeof data.count === 'number') setCount(data.count);
          else refresh();
        } catch { refresh(); }
      };
      source.onerror = () => {
        source?.close();
        window.setTimeout(refresh, 4000);
      };
    } catch {
      // EventSource unsupported: REST refresh already happened.
    }
    return () => source?.close();
  }, [enabled, refresh]);

  return { count, refresh, setCount };
}
