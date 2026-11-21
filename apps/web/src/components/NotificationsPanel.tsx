'use client';

/** Real notifications from the database, never fabricated counters. */
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  getNotifications, markAllNotificationsRead, markNotificationRead,
} from '../lib/api';
import { relativeTime } from '../lib/time';
import type { NotificationItem } from '../lib/types';
import { useUnreadCount } from '../lib/use-unread';

interface Props {
  authenticated: boolean;
  onAuthRequired: () => void;
}

const LABELS: Record<string, string> = {
  pukpuk: 'Puk-Puk', ngakak: 'Ngakak', sama: 'Sama Banget',
};

export default function NotificationsPanel({ authenticated, onAuthRequired }: Props) {
  const [tab, setTab] = useState<'activity' | 'messages'>('activity');
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { count, refresh } = useUnreadCount(authenticated);

  const load = useCallback(async () => {
    if (!authenticated) { setLoading(false); return; }
    setLoading(true);
    try {
      const res = await getNotifications(1);
      setItems(res.data);
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal memuat notifikasi');
    } finally {
      setLoading(false);
    }
  }, [authenticated]);

  useEffect(() => {
    setTab(new URLSearchParams(window.location.search).get('tab') === 'messages' ? 'messages' : 'activity');
  }, []);
  useEffect(() => { void load(); }, [load]);

  async function open(item: NotificationItem) {
    if (!item.read) {
      try {
        await markNotificationRead(item.id);
        setItems((prev) => prev.map((n) => n.id === item.id ? { ...n, read: true } : n));
        refresh();
      } catch { /* keep the item visible if the write failed */ }
    }
    window.location.href = `/posts/${item.postId}`;
  }

  async function readAll() {
    try {
      await markAllNotificationsRead();
      setItems((prev) => prev.map((n) => ({ ...n, read: true })));
      refresh();
    } catch { /* ignore */ }
  }

  if (!authenticated) {
    return (
      <div className="fp-card">
        <div className="fp-big">Masuk untuk melihat notifikasi kamu.</div>
        <p className="fp-muted">Notifikasi dibuat dari aktivitas nyata pada cerita kamu.</p>
        <button className="fp-btn" onClick={onAuthRequired}>Masuk / Daftar</button>
      </div>
    );
  }

  return (
    <>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, alignItems: 'center' }}>
        <button className="fp-btn" style={{ background: tab === 'activity' ? '#F5C542' : '#F1F3FB' }}
          onClick={() => setTab('activity')}>Aktivitas {count > 0 && `(${count})`}</button>
        <button className="fp-btn" style={{ background: tab === 'messages' ? '#F5C542' : '#F1F3FB' }}
          onClick={() => setTab('messages')}>Pesan</button>
        {count > 0 && <button className="fp-btn" style={{ background: '#F1F3FB', marginLeft: 'auto' }}
          onClick={() => void readAll()}>Tandai dibaca</button>}
      </div>

      {tab === 'messages' ? (
        <div className="fp-card">
          <div className="fp-big">Belum ada pesan langsung.</div>
          <p className="fp-muted">unlinked+ tidak membuka DM anonim. Percakapan terjadi di komentar publik supaya bisa dimoderasi.</p>
          <Link className="fp-btn" href="/features/spill">Buka Spill</Link>
        </div>
      ) : (
        <div className="fp-card">
          {error && <p className="fp-note" style={{ background: '#FDECEC', color: '#B42318' }}>{error}</p>}
          {loading && !items.length && <p className="fp-muted">Memuat notifikasi…</p>}
          {!loading && items.length === 0 && (
            <>
              <div className="fp-big">Belum ada aktivitas.</div>
              <p className="fp-muted">Saat seseorang bereaksi atau berkomentar pada ceritamu, notifikasinya muncul di sini — langsung, tanpa refresh.</p>
              <Link className="fp-btn" href="/features/spill">Tulis cerita pertama</Link>
            </>
          )}
          <div className="lf-list">
            {items.map((item) => (
              <button key={item.id} onClick={() => void open(item)}
                className={`lf-row ${item.read ? '' : 'unread'}`}
                style={{ textAlign: 'left', background: item.read ? '#fff' : '#FFFBEC',
                  border: '1px solid #EDEFF6', borderRadius: 14, padding: 12, cursor: 'pointer' }}>
                <div>
                  <small style={{ color: '#8A94AD' }}>
                    {item.actor}{item.actorAnonymous ? ' (anonim)' : ''} · {relativeTime(item.createdAt)}
                  </small>
                  <p style={{ margin: '4px 0 0', fontSize: 13, fontWeight: 700 }}>
                    {item.type === 'reaction'
                      ? `memberi reaksi ${LABELS[item.reactionType ?? ''] ?? 'Puk-Puk'} pada ceritamu`
                      : 'berkomentar pada ceritamu'}
                  </p>
                  {item.preview && <p style={{ margin: '4px 0 0', fontSize: 12, color: '#5A6484' }}>“{item.preview}”</p>}
                </div>
              </button>
            ))}
          </div>
          <p className="fp-note">Notifikasi ini berasal dari database, bukan angka contoh. Identitas anonim tetap disamarkan.</p>
        </div>
      )}
    </>
  );
}
