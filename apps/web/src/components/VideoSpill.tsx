'use client';

/** Video Spill: share a short video link with a real story. No upload, no embed. */
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { createPost } from '../lib/api';
import { POST_CATEGORIES, SPILL_MODES, SPILL_MODE_META } from '../lib/types';
import type { Post, SpillMode } from '../lib/types';

const VIDEO_URL_PATTERN =
  /^https:\/\/(www\.|m\.)?(youtube\.com|youtu\.be|tiktok\.com|instagram\.com)\/[^\s]+$/i;

function providerOf(url: string): string | null {
  const m = url.match(/^https:\/\/(?:www\.|m\.)?([^/]+)\//i);
  if (!m) return null;
  const host = m[1].toLowerCase();
  if (host === 'youtu.be' || host.endsWith('youtube.com')) return 'YouTube';
  if (host.endsWith('tiktok.com')) return 'TikTok';
  if (host.endsWith('instagram.com')) return 'Instagram';
  return null;
}

interface Props {
  authenticated: boolean;
  onAuthRequired: () => void;
}

export default function VideoSpill({ authenticated, onAuthRequired }: Props) {
  const [url, setUrl] = useState('');
  const [caption, setCaption] = useState('');
  const [category, setCategory] = useState<string>(POST_CATEGORIES[0]);
  const [mode, setMode] = useState<SpillMode>('listen');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [created, setCreated] = useState<Post | null>(null);

  const provider = useMemo(() => providerOf(url.trim()), [url]);
  const urlOk = Boolean(provider) && VIDEO_URL_PATTERN.test(url.trim());
  const canSubmit = urlOk && caption.trim().length >= 10 && !busy;

  async function submit() {
    if (!authenticated) { onAuthRequired(); return; }
    if (!canSubmit) return;
    setBusy(true);
    setError('');
    try {
      const post = await createPost({
        category,
        content: caption.trim(),
        spillMode: mode,
        videoUrl: url.trim(),
      });
      setCreated(post);
      setCaption('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal membagikan video');
    } finally {
      setBusy(false);
    }
  }

  if (!authenticated) {
    return (
      <div className="fp-card">
        <div className="fp-big">Masuk dulu untuk membagikan Video Spill.</div>
        <p className="fp-muted">
          Video Spill adalah cerita singkat dengan tautan video. Kamu tetap anonim di publik,
          dan tidak ada file yang diunggah ke server unlinked+.
        </p>
        <button className="fp-btn" onClick={onAuthRequired}>Masuk / Daftar</button>
      </div>
    );
  }

  if (created) {
    return (
      <div className="fp-card">
        <div className="fp-big">Video Spill tersimpan.</div>
        <p className="fp-muted">{created.content}</p>
        <p className="fp-note">
          Tautan: <a href={created.videoUrl ?? url} target="_blank" rel="noopener noreferrer">{created.videoUrl ?? url}</a>
        </p>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 14 }}>
          <Link className="fp-btn" href="/home">Lihat di Beranda</Link>
          <button className="fp-btn" style={{ background: '#F1F3FB' }} onClick={() => setCreated(null)}>
            Tulis video lain
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="fp-card">
        <div className="fp-big">Tautan video</div>
        <p className="fp-muted">
          Tempel tautan YouTube, TikTok, atau Instagram. Video dibuka di tab baru—unlinked+
          tidak menyematkan player pihak ketiga dan tidak mengirim data ke provider.
        </p>
        <input className="fp-input" value={url} onChange={(e) => setUrl(e.target.value)}
          placeholder="https://youtu.be/…" aria-label="Tautan video" inputMode="url" />
        {url.trim().length > 0 && (
          <p className="fp-note" style={{ background: urlOk ? '#EAF7EE' : '#FDECEC', color: urlOk ? '#237A3B' : '#B42318' }}>
            {urlOk ? `Terdeteksi ${provider}. Tautan aman dibuka di tab baru.` : 'Gunakan tautan https dari YouTube, TikTok, atau Instagram.'}
          </p>
        )}
      </div>

      <div className="fp-card">
        <div className="fp-big">Ceritanya</div>
        <label className="fp-muted" htmlFor="video-category">Kategori</label>
        <select id="video-category" className="fp-input" value={category} onChange={(e) => setCategory(e.target.value)}>
          {POST_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>

        <label className="fp-muted" htmlFor="video-caption">Cerita singkat (min. 10 karakter)</label>
        <textarea id="video-caption" className="fp-input" rows={4} value={caption}
          onChange={(e) => setCaption(e.target.value)}
          placeholder="Video ini tentang hari di mana aku…" />

        <label className="fp-muted" htmlFor="video-mode">Mau dibaca bagaimana?</label>
        <select id="video-mode" className="fp-input" value={mode} onChange={(e) => setMode(e.target.value as SpillMode)}>
          {SPILL_MODES.map((m) => <option key={m} value={m}>{SPILL_MODE_META[m].label}</option>)}
        </select>
        <p className="fp-note">{SPILL_MODE_META[mode].hint}</p>

        {error && <p className="fp-note" style={{ background: '#FDECEC', color: '#B42318' }}>{error}</p>}

        <button className="fp-btn" disabled={!canSubmit} onClick={() => void submit()}
          style={{ opacity: canSubmit ? 1 : 0.55, marginTop: 8 }}>
          {busy ? 'Mengirim…' : 'Bagikan Video Spill'}
        </button>
      </div>

      <p className="fp-note">
        Tanpa unggah file. Tanpa pelacakan penonton. Video tetap milik pembuatnya dan dibuka di platform asalnya.
      </p>
    </>
  );
}
