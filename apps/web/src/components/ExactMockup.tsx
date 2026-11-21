'use client';

/**
 * Exact visual from unlinked-plus-mockup-identik.zip + real interactive overlays.
 * Every hotspot rectangle is measured against the 1536x1024 reference and lives
 * in lib/mockup-hotspots.json so the geometry can be tested for overlap.
 */
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import {
  createComment, createPost, getComments, getPosts, recordAdImpression, toggleReaction,
} from '../lib/api';
import type { Post } from '../lib/types';
import AuthModal from './AuthModal';
import hotspots from '../lib/mockup-hotspots.json';

type View = 'landing' | 'beranda';
type Spot = {
  id: string; label: string; x: number; y: number; w: number; h: number;
  href?: string; action?: string;
};
interface CommentRow {
  id: string;
  content: string;
  createdAt: string;
  user?: { username?: string } | null;
}

const W = hotspots.design.width;
const H = hotspots.design.height;
const SPOTS = hotspots as unknown as { landing: { spots: Spot[] }; beranda: { spots: Spot[] } };

export default function ExactMockup({ view, authenticated }: { view: View; authenticated: boolean }) {
  const [scale, setScale] = useState(1);
  const [content, setContent] = useState('');
  const [showAd, setShowAd] = useState(!authenticated);
  const [authTab, setAuthTab] = useState<'login' | 'register' | null>(null);
  const [debug, setDebug] = useState(false);
  const [toast, setToast] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQ, setSearchQ] = useState('');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [target, setTarget] = useState<Post | null>(null);
  const [comments, setComments] = useState<CommentRow[]>([]);
  const [commentText, setCommentText] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const fit = () => setScale(Math.min(1, window.innerWidth / W));
    fit();
    setDebug(new URLSearchParams(window.location.search).has('hotspots'));
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, []);

  useEffect(() => {
    if (!authenticated) return;
    void recordAdImpression().then((r) => setShowAd(r.allowed)).catch(() => setShowAd(true));
  }, [authenticated]);

  const notify = useCallback((message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(''), 2600);
  }, []);

  const isLanding = view === 'landing';
  const src = isLanding ? '/images/mockup-identik/chibi-landing.png' : '/images/mockup-identik/same-boat.png';
  const spots = isLanding ? SPOTS.landing.spots : SPOTS.beranda.spots;

  async function submit() {
    if (!authenticated) { setAuthTab('register'); return; }
    if (content.trim().length < 10) { window.location.href = '/features/spill'; return; }
    setBusy(true);
    try {
      await createPost({ category: 'Ditolak HRD', content: content.trim(), spillMode: 'listen' });
      setContent('');
      notify('Spill kamu sudah tayang di Beranda.');
      window.location.href = '/home';
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Gagal mengirim spill');
    } finally {
      setBusy(false);
    }
  }

  async function react(type: 'pukpuk' | 'ngakak' | 'sama') {
    if (!authenticated) { setAuthTab('login'); return; }
    try {
      const res = await getPosts(1);
      if (!res.data[0]) { notify('Belum ada cerita untuk direaksi.'); return; }
      await toggleReaction(res.data[0].id, type);
      window.location.reload();
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Gagal memberi reaksi');
    }
  }

  async function openComments() {
    if (!authenticated) { setAuthTab('login'); return; }
    try {
      const res = await getPosts(1);
      const post = res.data[0];
      if (!post) { notify('Belum ada cerita untuk dikomentari.'); return; }
      setTarget(post);
      setComments((await getComments(post.id)) as unknown as CommentRow[]);
      setSheetOpen(true);
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Gagal membuka komentar');
    }
  }

  async function sendComment() {
    if (!target || commentText.trim().length < 2 || busy) return;
    setBusy(true);
    try {
      await createComment(target.id, commentText.trim());
      setComments((await getComments(target.id)) as unknown as CommentRow[]);
      setCommentText('');
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Gagal mengirim komentar');
    } finally {
      setBusy(false);
    }
  }

  function savePost() {
    try {
      const key = 'unlinkedplus_saved';
      const saved = JSON.parse(window.localStorage.getItem(key) ?? '[]') as string[];
      const id = target?.id ?? 'beranda-latest';
      const next = saved.includes(id) ? saved.filter((x) => x !== id) : [...saved, id];
      window.localStorage.setItem(key, JSON.stringify(next));
      notify(saved.includes(id) ? 'Dihapus dari daftar simpanan.' : 'Cerita disimpan di perangkat ini.');
    } catch {
      notify('Tidak bisa menyimpan di perangkat ini.');
    }
  }

  async function share() {
    const url = window.location.origin + '/features/same-boat';
    try {
      if (navigator.share) await navigator.share({ title: 'unlinked+', text: 'Less Flex. More Human.', url });
      else { await navigator.clipboard.writeText(url); notify('Tautan Same Boat disalin.'); }
    } catch {
      notify('Berbagi dibatalkan.');
    }
  }

  function run(action: string) {
    switch (action) {
      case 'login': setAuthTab('login'); break;
      case 'register': setAuthTab('register'); break;
      case 'join': if (authenticated) window.location.href = '/features/profil'; else setAuthTab('register'); break;
      case 'follow': if (authenticated) window.location.href = '/features/support-circles'; else setAuthTab('register'); break;
      case 'submit': void submit(); break;
      case 'react-pukpuk': void react('pukpuk'); break;
      case 'react-ngakak': void react('ngakak'); break;
      case 'react-sama': void react('sama'); break;
      case 'comment': void openComments(); break;
      case 'save': savePost(); break;
      case 'share': void share(); break;
      default: break;
    }
  }

  function writeSearch() {
    const q = searchQ.trim();
    window.location.href = q ? `/features/same-boat?q=${encodeURIComponent(q)}` : '/features/same-boat';
  }

  return (
    <div className="ex-root">
      <style jsx global>{`
        .ex-root{background:#f7f7fb;min-height:100vh;display:flex;justify-content:center;overflow-x:hidden}
        .ex-stage{position:relative;width:${W * scale}px;height:${H * scale}px;flex:none}
        .ex-canvas{position:absolute;left:0;top:0;width:${W}px;height:${H}px;transform-origin:top left;transform:scale(${scale})}
        .ex-canvas > img{position:absolute;left:0;top:0;width:${W}px;height:${H}px;display:block}
        .ex-hit{position:absolute;display:block;background:transparent;border:0;padding:0;cursor:pointer;font-size:0;color:transparent;text-decoration:none}
        .ex-hit:focus-visible{outline:3px solid #172B4D;outline-offset:2px;border-radius:10px}
        .ex-hit-debug{outline:2px solid #E11D48;outline-offset:1px;background:rgba(225,29,72,.08);font-size:9px;color:#E11D48;line-height:1}
        .ex-search{position:absolute;cursor:text;background:transparent;border:0}
        /* Opaque cover over the mockup's baked-in placeholder so text is not doubled. */
        .ex-text{position:absolute;box-sizing:border-box;border:1px solid #EEF0F7;border-radius:14px;
          outline:0;resize:none;background:#fff;color:#172B4D;font:500 13px/1.45 Inter,sans-serif}
        .ex-text::placeholder{color:#9AA3B8}
        .ex-note{position:absolute;font-size:11px;color:#8A94AD;background:#fff;border-radius:8px;padding:6px 10px;z-index:5}
        .ex-toast{position:fixed;left:50%;bottom:24px;transform:translateX(-50%);background:#172B4D;color:#fff;
          font:700 12px Inter,sans-serif;padding:12px 18px;border-radius:999px;z-index:80;box-shadow:0 10px 30px rgba(23,43,77,.25)}
        .ex-modal{position:fixed;inset:0;background:rgba(23,43,77,.45);z-index:70;display:flex;align-items:center;justify-content:center;padding:20px}
        .ex-card{background:#fff;border-radius:20px;width:min(460px,100%);padding:22px;box-shadow:0 24px 60px rgba(23,43,77,.28);color:#172B4D}
        .ex-card h3{font:900 20px Nunito,sans-serif;margin:0 0 6px}
        .ex-card p{margin:0 0 14px;font-size:12px;color:#6A7590;line-height:1.6}
        .ex-row{display:flex;gap:8px}
        .ex-input{flex:1;border:1px solid #E6E9F4;border-radius:12px;padding:11px 13px;font-size:13px;outline:0}
        .ex-btn{background:#F5C542;border:0;border-radius:999px;padding:11px 18px;font:800 12px Inter,sans-serif;color:#172B4D;cursor:pointer}
        .ex-ghost{background:#F1F3FB;border:0;border-radius:999px;padding:8px 14px;font:700 12px Inter,sans-serif;color:#3F4A66;cursor:pointer}
        .ex-comments{max-height:220px;overflow:auto;margin:0 0 12px;display:flex;flex-direction:column;gap:10px}
        .ex-comment{background:#F7F8FE;border-radius:12px;padding:10px 12px;font-size:12px;line-height:1.5}
        .ex-comment small{display:block;color:#8A94AD;font-size:10px;margin-bottom:2px}
        .ex-empty{font-size:12px;color:#8A94AD;padding:10px 0}
      `}</style>
      <div className="ex-stage">
        <div className="ex-canvas">
          <img src={src} alt={isLanding ? 'unlinked+ Chibi Community Landing' : 'unlinked+ Same Boat Beranda'} />

          {/* Search bar is a modal trigger: no baked text is covered. */}
          <button className="ex-search" data-hotspot="search" aria-label="Cari cerita"
            style={{ left: 560, top: 22, width: 420, height: 48 }} onClick={() => setSearchOpen(true)} />

          {spots.map((s) => {
            const style = { left: s.x, top: s.y, width: s.w, height: s.h };
            const cls = `ex-hit${debug ? ' ex-hit-debug' : ''}`;
            const text = debug ? s.id : s.label;
            if (s.href) {
              return (
                <Link key={s.id} href={s.href} className={cls} style={style} aria-label={s.label} data-hotspot={s.id}>
                  {text}
                </Link>
              );
            }
            return (
              <button key={s.id} type="button" className={cls} style={style} aria-label={s.label} data-hotspot={s.id}
                onClick={() => s.action && run(s.action)}>
                {text}
              </button>
            );
          })}

          {!isLanding && (
            <>
              {/* Composer over the exact image (stops before the Spill It button). */}
              <textarea className="ex-text" data-hotspot="composer" aria-label="Tulis spill"
                style={{ left: 540, top: 470, width: 480, height: 58, padding: '8px 12px' }}
                value={content} onChange={(e) => setContent(e.target.value)}
                placeholder="Ada yang mau kamu ceritakan?" />
              {!showAd && <div className="ex-note" style={{ left: 480, top: 860 }}>Iklan disembunyikan sesuai preferensi/batas harian kamu.</div>}
            </>
          )}
        </div>
      </div>

      {authTab && (
        <AuthModal
          defaultTab={authTab}
          onSuccess={() => { setAuthTab(null); window.location.href = '/home'; }}
          onClose={() => setAuthTab(null)}
        />
      )}

      {searchOpen && (
        <div className="ex-modal" role="dialog" aria-modal="true" aria-label="Cari di unlinked+"
          onClick={() => setSearchOpen(false)}>
          <div className="ex-card" onClick={(e) => e.stopPropagation()}>
            <h3>Cari teman senasib</h3>
            <p>Cari dari cerita publik yang sudah disamarkan. Identitas asli tidak pernah ditampilkan.</p>
            <div className="ex-row">
              <input className="ex-input" autoFocus value={searchQ} onChange={(e) => setSearchQ(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') writeSearch(); }}
                placeholder="Contoh: ditolak HRD" aria-label="Kata kunci pencarian" />
              <button className="ex-btn" onClick={writeSearch}>Cari</button>
            </div>
            <div className="ex-row" style={{ marginTop: 12 }}>
              <button className="ex-ghost" onClick={() => setSearchOpen(false)}>Tutup</button>
            </div>
          </div>
        </div>
      )}

      {sheetOpen && target && (
        <div className="ex-modal" role="dialog" aria-modal="true" aria-label="Komentar"
          onClick={() => setSheetOpen(false)}>
          <div className="ex-card" onClick={(e) => e.stopPropagation()}>
            <h3>Komentar</h3>
            <p style={{ marginBottom: 10 }}>{target.content.slice(0, 140)}{target.content.length > 140 ? '…' : ''}</p>
            <div className="ex-comments">
              {comments.length === 0 && <span className="ex-empty">Belum ada komentar. Jadi yang pertama mendengar.</span>}
              {comments.map((c) => (
                <div className="ex-comment" key={c.id}>
                  <small>{c.user?.username ?? 'Anonim'}</small>
                  {c.content}
                </div>
              ))}
            </div>
            <div className="ex-row">
              <input className="ex-input" value={commentText} onChange={(e) => setCommentText(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') void sendComment(); }}
                placeholder="Tulis komentar yang suportif…" aria-label="Tulis komentar" />
              <button className="ex-btn" disabled={busy} onClick={() => void sendComment()}>Kirim</button>
            </div>
            <div className="ex-row" style={{ marginTop: 12 }}>
              <button className="ex-ghost" onClick={() => setSheetOpen(false)}>Tutup</button>
            </div>
          </div>
        </div>
      )}

      {toast && <div className="ex-toast" role="status">{toast}</div>}
    </div>
  );
}
