'use client';

/**
 * Pixel-faithful Beranda. The supplied mockup is the page canvas so every
 * static region is identical by construction; real interactive elements are
 * overlaid at the exact coordinates of the mockup's controls.
 */
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { createPost, getPosts, recordAdImpression, toggleReaction } from '../lib/api';
import type { Post } from '../lib/types';
import { relativeTime } from '../lib/time';
import { buildAvatarSVG } from '../lib/avatar-svg';
import AuthModal from './AuthModal';
import DashboardMobile from './DashboardMobile';
import AccountMenu from './AccountMenu';

export type DashboardVariant = 'chibi' | 'sameboat';

interface Props {
  variant: DashboardVariant;
  authenticated: boolean;
  preview?: boolean;
}

const W = 1536;
const H = 1024;

export default function DashboardPixel({ variant, authenticated, preview = false }: Props) {
  const [scale, setScale] = useState(1);
  const [mobile, setMobile] = useState(false);
  const [posts, setPosts] = useState<Post[]>([]);
  const [content, setContent] = useState('');
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState('');
  const [authOpen, setAuthOpen] = useState(false);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [toolNote, setToolNote] = useState('');
  const [showAd, setShowAd] = useState(!authenticated);
  const [mine, setMine] = useState<Record<string, { pukpuk: boolean; ngakak: boolean; sama: boolean }>>({});

  useEffect(() => {
    const fit = () => {
      setMobile(window.innerWidth < 900 || new URLSearchParams(window.location.search).has('mobile'));
      setScale(Math.min(1, window.innerWidth / W));
    };
    fit();
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, []);

  const load = useCallback(async () => {
    try {
      const res = await getPosts(1);
      setPosts(res.data.slice(0, 1));
    } catch {
      setPosts([]);
    }
  }, []);
  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    if (!authenticated) return;
    void recordAdImpression().then((r) => setShowAd(r.allowed)).catch(() => setShowAd(true));
  }, [authenticated]);

  const submit = async () => {
    if (!authenticated) { setAuthOpen(true); return; }
    if (content.trim().length < 10) { setError('Cerita minimal 10 karakter.'); return; }
    setPosting(true);
    setError('');
    try {
      const created = await createPost({ category: 'Ditolak HRD', content: content.trim(), spillMode: 'listen' });
      setPosts((prev) => [created, ...prev]);
      setContent('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal posting');
    } finally {
      setPosting(false);
    }
  };

  const react = async (post: Post, type: 'pukpuk' | 'ngakak' | 'sama') => {
    if (!authenticated) { setAuthOpen(true); return; }
    const current = mine[post.id] ?? { pukpuk: false, ngakak: false, sama: false };
    const added = !current[type];
    setMine((m) => ({ ...m, [post.id]: { ...current, [type]: added } }));
    setPosts((prev) => prev.map((p) => p.id === post.id
      ? { ...p, reactionCounts: { ...p.reactionCounts, [type]: Math.max(0, p.reactionCounts[type] + (added ? 1 : -1)) } }
      : p));
    try {
      const res = await toggleReaction(post.id, type);
      setMine((m) => ({ ...m, [post.id]: { ...current, [type]: res.added } }));
      setPosts((prev) => prev.map((p) => p.id === post.id ? { ...p, reactionCounts: res.counts } : p));
    } catch {
      setMine((m) => ({ ...m, [post.id]: current }));
      void load();
    }
  };

  const isChibi = variant === 'chibi';
  const bg = isChibi ? '/images/dash/mockup-chibi.png' : '/images/dash/mockup-sameboat.png';
  const post = posts[0];

  if (mobile) return <DashboardMobile variant={variant} authenticated={authenticated} />;

  return (
    <div className="px-root">
      <style jsx global>{`
        .px-root{background:#F7F8FE;min-height:100vh;display:flex;justify-content:center;overflow-x:hidden}
        .px-stage{position:relative;width:${W * scale}px;height:${H * scale}px;flex:none}
        .px-canvas{position:absolute;left:0;top:0;width:${W}px;height:${H}px;transform-origin:top left;transform:scale(${scale});
          background-image:url('${bg}');background-size:${W}px ${H}px;background-repeat:no-repeat}
        .px-hit{position:absolute;display:block;cursor:pointer;background:transparent;border:0;padding:0}
        .px-cover{position:absolute;background:#fff;border-radius:16px;border:1px solid #EDEFF6;box-sizing:border-box}
        /* Cover the mockup's composer box at its exact coordinates (no double edge). */
        .px-input{position:absolute;left:550px;top:469px;width:480px;height:58px;border:1px solid #EEF0F7;border-radius:14px;
          outline:0;resize:none;background:#fff;color:#172B4D;font:500 13px/1.45 Inter,sans-serif;padding:8px 12px;box-sizing:border-box}
        .px-input::placeholder{color:#9AA3B8}
        .px-tool{position:absolute;display:flex;align-items:center;justify-content:center;background:transparent;border:0;cursor:pointer;
          font:700 11px Inter,sans-serif;color:#172B4D}
        .px-emoji{position:absolute;left:545px;top:545px;background:#fff;border:1px solid #E6E9F4;border-radius:12px;padding:8px;
          display:flex;gap:6px;z-index:5;box-shadow:0 8px 20px rgba(23,43,77,.12)}
        .px-emoji button{background:transparent;border:0;font-size:18px;cursor:pointer}
        .px-note{position:absolute;left:545px;top:585px;font-size:11px;color:#C2410C;z-index:5;background:#fff;border-radius:8px;padding:4px 8px}
        /* Transparent hit area exactly over the mockup's real Spill It! button. */
        .px-spill{position:absolute;left:1040px;top:525px;width:118px;height:48px;border-radius:999px;border:0;
          background:transparent;color:transparent;font-size:0;cursor:pointer}
        .px-spill:disabled{cursor:default}
        /* Coordinates below are relative to the post card (459,600). */
        .px-post-av{position:absolute;left:16px;top:9px;width:50px;height:50px;border-radius:50%;overflow:hidden;background:#F1EEFF}
        .px-post-av svg{width:50px;height:50px;display:block}
        .px-nm{position:absolute;left:78px;top:13px;font:800 13px Nunito,sans-serif;color:#172B4D}
        .px-meta{position:absolute;left:78px;top:38px;font-size:10.5px;color:#8A94AD}
        .px-text{position:absolute;left:20px;top:73px;width:480px;font-size:12.5px;line-height:1.5;color:#2E3D5C}
        .px-reacts{position:absolute;left:17px;top:103px;width:480px;display:flex;gap:8px;flex-wrap:wrap}
        .px-react{border:1px solid #E9ECF6;border-radius:999px;padding:5px 9px;font:600 11px Inter,sans-serif;
          color:#3D4B6B;background:#F7F8FE;cursor:pointer;white-space:nowrap}
        .px-foot{position:absolute;left:20px;top:165px;width:480px;display:flex;gap:34px;font-size:11px;font-weight:600;color:#3D4B6B}
        .px-err{position:absolute;left:20px;top:95px;font-size:11px;color:#C2410C}
        .px-art{position:absolute;left:531px;top:12px;width:170px;height:143px;border-radius:12px;overflow:hidden}
        .px-art img{width:100%;height:100%;object-fit:cover;display:block}
        .px-badge{position:fixed;bottom:10px;right:10px;background:#172B4D;color:#fff;padding:7px 14px;border-radius:999px;
          font-size:11px;z-index:99}
      `}</style>

      <div className="px-stage">
        <div className="px-canvas">
          {/* Real navigation over the mockup's controls */}
          <Link className="px-hit" style={{ left: 18, top: 12, width: 205, height: 64 }} href="/home" aria-label="Beranda" />
          <button className="px-hit" style={{ left: 1304, top: 18, width: 116, height: 50 }}
            onClick={() => { if (authenticated) window.location.href = '/features/profil'; else setAuthOpen(true); }}
            aria-label="Gabung Sekarang / Profil" />
          <AccountMenu authenticated={authenticated}
            trigger={{ left: 1460, top: 6, width: 58, height: 58 }}
            menu={{ left: 1248, top: 74 }} />
          <input className="px-input" style={{ left: 570, top: 20, width: 390, height: 30, padding: 0, fontSize: 12 }}
            placeholder="Cari cerita, topik, atau teman seperjuangan..." aria-label="Cari" readOnly />
          <Link className="px-hit" style={{ left: 1244, top: 16, width: 42, height: 42 }} href="/app?tab=shop" aria-label="Toko" />

          {/* Hero CTA positions differ per mockup */}
          {isChibi ? (
            <>
              <Link className="px-hit" style={{ left: 283, top: 344, width: 228, height: 46 }} href="/features/spill" aria-label="Buat Spill Sekarang" />
              <Link className="px-hit" style={{ left: 520, top: 344, width: 198, height: 46 }} href="/features/same-boat" aria-label="Jelajahi Komunitas" />
            </>
          ) : (
            <Link className="px-hit" style={{ left: 282, top: 304, width: 222, height: 46 }} href="/features/same-boat" aria-label="Lihat Rekomendasi" />
          )}

          {/* Sidebar navigation */}
          <Link className="px-hit" style={{ left: 18, top: 102, width: 222, height: 52 }} href="/home" aria-label="Beranda" />
          <Link className="px-hit" style={{ left: 18, top: 156, width: 222, height: 46 }} href="/features/same-boat" aria-label="Discover" />
          <Link className="px-hit" style={{ left: 18, top: 204, width: 222, height: 46 }} href="/features/spill" aria-label="Spill" />
          <Link className="px-hit" style={{ left: 18, top: 252, width: 222, height: 46 }} href="/features/unlinked-rooms" aria-label="Komunitas" />
          <Link className="px-hit" style={{ left: 18, top: 300, width: 222, height: 46 }} href="/features/profil" aria-label="Profil" />
          {/* Fitur Seru — every item is a real page */}
          {[
            ['poll', 404], ['personality-test', 450], ['meme-studio', 496],
            ['store', 542], ['opportunity-board', 588], ['mental-reset', 634],
          ].map(([slug, top]) => (
            <Link key={slug as string} className="px-hit" style={{ left: 24, top: top as number, width: 208, height: 44 }}
              href={`/features/${slug}`} aria-label={String(slug)} />
          ))}
          {/* Ruang Kamu */}
          <Link className="px-hit" style={{ left: 248, top: 500, width: 194, height: 52 }} href="/home" aria-label="Ruang Beranda" />
          <Link className="px-hit" style={{ left: 248, top: 554, width: 194, height: 44 }} href="/features/spill" aria-label="Ruang Spill" />
          <Link className="px-hit" style={{ left: 248, top: 598, width: 194, height: 42 }} href="/features/avatar" aria-label="Ruang Avatar" />
          <Link className="px-hit" style={{ left: 248, top: 640, width: 194, height: 42 }} href="/features/toko" aria-label="Ruang Toko" />
          <Link className="px-hit" style={{ left: 248, top: 682, width: 194, height: 42 }} href="/features/profil" aria-label="Ruang Profil" />

          {/* Composer tool buttons sit exactly over the mockup's icons */}
          <Link className="px-tool" style={{ left: 542, top: 540, width: 78, height: 42 }}
            href="/features/meme-studio" aria-label="Foto: buat kartu visual" />
          <Link className="px-tool" style={{ left: 622, top: 540, width: 80, height: 42 }}
            href="/features/video" aria-label="Video: bagikan tautan cerita" />
          <Link className="px-tool" style={{ left: 720, top: 540, width: 64, height: 42 }}
            href="/features/poll" aria-label="Poll" />
          <button className="px-tool" style={{ left: 792, top: 540, width: 92, height: 42 }}
            onClick={() => setEmojiOpen(!emojiOpen)} aria-label="Ekspresi" />
          {emojiOpen && (
            <div className="px-emoji">
              {['😮‍💨', '😭', '😂', '💪', '🫶', '☕', '🌱', '🙃'].map((e) => (
                <button key={e} onClick={() => { setContent(content + e); setEmojiOpen(false); }}>{e}</button>
              ))}
            </div>
          )}
          {toolNote && <span className="px-note">{toolNote}</span>}

          {/* Composer overlay */}
          <textarea className="px-input" value={content} onChange={(e) => { setContent(e.target.value); setToolNote(''); }}
            placeholder={isChibi
              ? 'Ada yang mau kamu ceritakan?\nTulis cerita, curhat, atau sekadar berbagi...'
              : 'Ada yang mau kamu ceritakan?\nTurut bertambah, sebentar di sini...'}
            aria-label="Tulis spill" />
          <button className="px-spill" onClick={() => void submit()} disabled={posting}>{posting ? '...' : 'Spill It! +'}</button>
          {error && <span className="px-err">{error}</span>}

          {/* Live feed overlay over the mockup post card */}
          {post && (
            <div className="px-cover" style={{ left: 459, top: 600, width: 716, height: 190 }}>
              <span className="px-post-av" dangerouslySetInnerHTML={{ __html: buildAvatarSVG({ character: 'panda', accessories: [] }) }} />
              <span className="px-nm">{post.user?.username ?? 'Anonim'} <span style={{ color: '#F5C542' }}>♛</span></span>
              <span className="px-meta">Lv. {post.user?.profile?.mentalLevel ?? 1} · {relativeTime(post.createdAt)}</span>
              <div className="px-text">{post.content}</div>
              <div className="px-art"><img src="/images/dash/post-worker.png" alt="" /></div>
              <div className="px-reacts">
                {([
                  ['pukpuk', '👋 Puk-Puk'],
                  ['ngakak', '😂 Ngakak'],
                  ['sama', '🙂 Sama Banget'],
                ] as const).map(([key, label]) => (
                  <button key={key} className="px-react" onClick={() => void react(post, key)}>
                    {label} <b>({post.reactionCounts[key]})</b>
                  </button>
                ))}
              </div>
              <div className="px-foot"><span>💬 128</span><span>🔖 45</span><span>↗ Simpan</span><span>↗ Bagikan</span></div>
            </div>
          )}

          {/* SEC-04: suppress the mockup's baked-in ad when the user opts out or hits the cap. */}
          {!showAd && (
            <div className="px-cover" style={{ left: 460, top: 805, width: 715, height: 135 }}>
              <span style={{ position: 'absolute', left: 20, top: 52, fontSize: 12, color: '#8A94AD' }}>
                Iklan disembunyikan sesuai preferensi/batas harian kamu. Tidak ada iklan berbasis isi Spill.
              </span>
            </div>
          )}
        </div>
      </div>

      {authOpen && (
        <AuthModal onSuccess={() => { setAuthOpen(false); window.location.reload(); }} onClose={() => setAuthOpen(false)} defaultTab="login" />
      )}
      {preview && <div className="px-badge">PREVIEW · {variant} · {authenticated ? 'login' : 'publik'}</div>}
    </div>
  );
}
