'use client';

/** Real activity page: derived from the user's own posts, never from private data. */
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getMyPosts } from '../lib/api';
import { relativeTime } from '../lib/time';
import type { Post } from '../lib/types';

interface Props {
  authenticated: boolean;
  onAuthRequired: () => void;
}

export default function NotificationsPanel({ authenticated, onAuthRequired }: Props) {
  const [tab, setTab] = useState<'activity' | 'messages'>('activity');
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setTab(new URLSearchParams(window.location.search).get('tab') === 'messages' ? 'messages' : 'activity');
  }, []);

  useEffect(() => {
    if (!authenticated) { setLoading(false); return; }
    let active = true;
    getMyPosts(1)
      .then((res) => { if (active) setPosts(res.data); })
      .catch(() => { if (active) setPosts([]); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [authenticated]);

  if (!authenticated) {
    return (
      <div className="fp-card">
        <div className="fp-big">Masuk untuk melihat aktivitas kamu.</div>
        <p className="fp-muted">Aktivitas hanya menampilkan reaksi dan komentar pada cerita milikmu.</p>
        <button className="fp-btn" onClick={onAuthRequired}>Masuk / Daftar</button>
      </div>
    );
  }

  return (
    <>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <button className="fp-btn" style={{ background: tab === 'activity' ? '#F5C542' : '#F1F3FB' }}
          onClick={() => setTab('activity')}>Aktivitas</button>
        <button className="fp-btn" style={{ background: tab === 'messages' ? '#F5C542' : '#F1F3FB' }}
          onClick={() => setTab('messages')}>Pesan</button>
      </div>

      {tab === 'messages' ? (
        <div className="fp-card">
          <div className="fp-big">Belum ada pesan langsung.</div>
          <p className="fp-muted">
            unlinked+ sengaja tidak membuka DM anonim. Percakapan terjadi di komentar publik
            supaya tidak ada pesan gelap yang tidak bisa dimoderasi.
          </p>
          <Link className="fp-btn" href="/features/spill">Buka Spill</Link>
        </div>
      ) : (
        <div className="fp-card">
          {loading && <p className="fp-muted">Memuat aktivitas…</p>}
          {!loading && posts.length === 0 && (
            <>
              <div className="fp-big">Belum ada aktivitas.</div>
              <p className="fp-muted">Begitu kamu membagikan cerita, reaksi dan komentar akan muncul di sini.</p>
              <Link className="fp-btn" href="/features/spill">Tulis cerita pertama</Link>
            </>
          )}
          {posts.map((p) => (
            <div key={p.id} style={{ borderBottom: '1px solid #EEF0F7', padding: '12px 0' }}>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                <b style={{ fontSize: 12 }}>♡ {p._count?.reactions ?? 0} reaksi</b>
                <b style={{ fontSize: 12 }}>💬 {p._count?.comments ?? 0} komentar</b>
                <span className="fp-note" style={{ padding: '4px 8px', margin: 0 }}>{relativeTime(p.createdAt)}</span>
              </div>
              <p className="fp-muted" style={{ margin: '6px 0 0' }}>{p.content.slice(0, 160)}{p.content.length > 160 ? '…' : ''}</p>
            </div>
          ))}
          {!loading && posts.length > 0 && (
            <p className="fp-note">Dihitung dari cerita milikmu. Tidak ada skor popularitas publik.</p>
          )}
        </div>
      )}
    </>
  );
}
