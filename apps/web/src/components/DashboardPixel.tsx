'use client';

/**
 * Pixel-faithful Beranda. The supplied mockup is the page canvas so every
 * static region is identical by construction; real interactive elements are
 * overlaid at the exact coordinates of the mockup's controls.
 */
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { createPost, getPosts, toggleReaction } from '../lib/api';
import type { Post } from '../lib/types';
import { relativeTime } from '../lib/time';
import { buildAvatarSVG } from '../lib/avatar-svg';
import AuthModal from './AuthModal';

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
  const [posts, setPosts] = useState<Post[]>([]);
  const [content, setContent] = useState('');
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState('');
  const [authOpen, setAuthOpen] = useState(false);
  const [mine, setMine] = useState<Record<string, { pukpuk: boolean; ngakak: boolean; sama: boolean }>>({});

  useEffect(() => {
    const fit = () => setScale(Math.min(1, window.innerWidth / W));
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

  return (
    <div className="px-root">
      <style jsx global>{`
        .px-root{background:#F7F8FE;min-height:100vh;display:flex;justify-content:center;overflow-x:hidden}
        .px-stage{position:relative;width:${W * scale}px;height:${H * scale}px;flex:none}
        .px-canvas{position:absolute;left:0;top:0;width:${W}px;height:${H}px;transform-origin:top left;transform:scale(${scale});
          background-image:url('${bg}');background-size:${W}px ${H}px;background-repeat:no-repeat}
        .px-hit{position:absolute;display:block;cursor:pointer;background:transparent;border:0;padding:0}
        .px-cover{position:absolute;background:#fff;border-radius:16px;border:1px solid #EDEFF6;box-sizing:border-box}
        .px-input{position:absolute;left:545px;top:476px;width:600px;height:74px;border:0;outline:0;resize:none;
          background:#fff;color:#172B4D;font:500 13px/1.5 Inter,sans-serif;padding:2px 0}
        .px-input::placeholder{color:#9AA3B8}
        .px-spill{position:absolute;left:1032px;top:538px;width:132px;height:38px;border-radius:999px;border:0;
          background:#F5C542;color:#172B4D;font:800 12.5px Inter,sans-serif;cursor:pointer}
        .px-spill:disabled{opacity:.6;cursor:default}
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
          <Link className="px-hit" style={{ left: 24, top: 8, width: 240, height: 56 }} href="/" aria-label="Beranda" />
          <Link className="px-hit" style={{ left: 1300, top: 12, width: 152, height: 44 }}
            href={authenticated ? '/app?tab=profile' : '/app'} aria-label="Gabung Sekarang / Profil" />
          <Link className="px-hit" style={{ left: 1460, top: 6, width: 58, height: 58 }} href="/app?tab=profile" aria-label="Avatar" />
          <input className="px-input" style={{ left: 570, top: 20, width: 390, height: 30, padding: 0, fontSize: 12 }}
            placeholder="Cari cerita, topik, atau teman seperjuangan..." aria-label="Cari" readOnly />
          <Link className="px-hit" style={{ left: 1244, top: 16, width: 42, height: 42 }} href="/app?tab=shop" aria-label="Toko" />

          {/* Hero CTA positions differ per mockup */}
          {isChibi ? (
            <>
              <Link className="px-hit" style={{ left: 283, top: 344, width: 228, height: 46 }} href="/app?tab=spill" aria-label="Buat Spill Sekarang" />
              <Link className="px-hit" style={{ left: 520, top: 344, width: 198, height: 46 }} href="/app?tab=feed" aria-label="Jelajahi Komunitas" />
            </>
          ) : (
            <Link className="px-hit" style={{ left: 283, top: 310, width: 230, height: 46 }} href="/app?tab=feed" aria-label="Lihat Rekomendasi" />
          )}

          {/* Sidebar navigation */}
          <Link className="px-hit" style={{ left: 24, top: 96, width: 208, height: 46 }} href="/" aria-label="Beranda" />
          <Link className="px-hit" style={{ left: 24, top: 144, width: 208, height: 46 }} href="/app?tab=feed" aria-label="Discover" />
          <Link className="px-hit" style={{ left: 24, top: 194, width: 208, height: 46 }} href="/app?tab=spill" aria-label="Spill" />
          <Link className="px-hit" style={{ left: 24, top: 244, width: 208, height: 46 }} href="/app?tab=feed" aria-label="Komunitas" />
          <Link className="px-hit" style={{ left: 24, top: 294, width: 208, height: 46 }} href="/app?tab=profile" aria-label="Profil" />
          {/* Ruang Kamu */}
          <Link className="px-hit" style={{ left: 256, top: 510, width: 190, height: 44 }} href="/app?tab=feed" aria-label="Ruang Beranda" />
          <Link className="px-hit" style={{ left: 256, top: 558, width: 190, height: 40 }} href="/app?tab=spill" aria-label="Ruang Spill" />
          <Link className="px-hit" style={{ left: 256, top: 600, width: 190, height: 40 }} href="/app?tab=avatar" aria-label="Ruang Avatar" />
          <Link className="px-hit" style={{ left: 256, top: 640, width: 190, height: 40 }} href="/app?tab=shop" aria-label="Ruang Toko" />
          <Link className="px-hit" style={{ left: 256, top: 682, width: 190, height: 40 }} href="/app?tab=profile" aria-label="Ruang Profil" />

          {/* Composer overlay */}
          <textarea className="px-input" value={content} onChange={(e) => setContent(e.target.value)}
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
        </div>
      </div>

      {authOpen && (
        <AuthModal onSuccess={() => { setAuthOpen(false); window.location.reload(); }} onClose={() => setAuthOpen(false)} defaultTab="login" />
      )}
      {preview && <div className="px-badge">PREVIEW · {variant} · {authenticated ? 'login' : 'publik'}</div>}
    </div>
  );
}
