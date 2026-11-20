'use client';

/** Mobile layout: same visual language as the mockup, readable at phone widths. */
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { createPost, getPosts, recordAdImpression, toggleReaction } from '../lib/api';
import type { Post } from '../lib/types';
import { relativeTime } from '../lib/time';
import { buildAvatarSVG } from '../lib/avatar-svg';
import AuthModal from './AuthModal';

type Variant = 'chibi' | 'sameboat';

const TOPICS = ['#Burnout', '#Resign', '#KerjaLagi', '#Healing', '#LifeBalance', '#CareerSwitch'];
const TRENDS = [
  ['#BurnoutDiKantor', '124.5K Spill', '12%'], ['#ResignAtauTahan', '98.3K Spill', '8%'],
  ['#LifeBalance', '76.1K Spill', '5%'], ['#CareerSwitch', '54.7K Spill', '3%'],
  ['#MentalHealth', '42.9K Spill', '1%'],
];

export default function DashboardMobile({ variant, authenticated }: { variant: Variant; authenticated: boolean }) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [content, setContent] = useState('');
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState('');
  const [authOpen, setAuthOpen] = useState(false);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [toolNote, setToolNote] = useState('');
  const [mine, setMine] = useState<Record<string, { pukpuk: boolean; ngakak: boolean; sama: boolean }>>({});
  const [showAd, setShowAd] = useState(!authenticated);

  const load = useCallback(async () => {
    try { const res = await getPosts(1); setPosts(res.data.slice(0, 3)); } catch { setPosts([]); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    if (!authenticated) return;
    void recordAdImpression().then((r) => setShowAd(r.allowed)).catch(() => setShowAd(true));
  }, [authenticated]);

  const submit = async () => {
    if (!authenticated) { setAuthOpen(true); return; }
    if (content.trim().length < 10) { setError('Cerita minimal 10 karakter.'); return; }
    setPosting(true); setError('');
    try {
      const p = await createPost({ category: 'Ditolak HRD', content: content.trim(), spillMode: 'listen' });
      setPosts((prev) => [p, ...prev]); setContent('');
    } catch (e) { setError(e instanceof Error ? e.message : 'Gagal posting'); }
    finally { setPosting(false); }
  };

  const react = async (post: Post, type: 'pukpuk' | 'ngakak' | 'sama') => {
    if (!authenticated) { setAuthOpen(true); return; }
    const cur = mine[post.id] ?? { pukpuk: false, ngakak: false, sama: false };
    const added = !cur[type];
    setMine((m) => ({ ...m, [post.id]: { ...cur, [type]: added } }));
    setPosts((prev) => prev.map((p) => p.id === post.id
      ? { ...p, reactionCounts: { ...p.reactionCounts, [type]: Math.max(0, p.reactionCounts[type] + (added ? 1 : -1)) } }
      : p));
    try {
      const res = await toggleReaction(post.id, type);
      setMine((m) => ({ ...m, [post.id]: { ...cur, [type]: res.added } }));
      setPosts((prev) => prev.map((p) => p.id === post.id ? { ...p, reactionCounts: res.counts } : p));
    } catch { setMine((m) => ({ ...m, [post.id]: cur })); void load(); }
  };

  const isChibi = variant === 'chibi';

  return (
    <div className="dm-root">
      <style jsx global>{`
        .dm-root{background:#F7F8FE;min-height:100vh;color:#172B4D;font-family:Inter,sans-serif;padding-bottom:78px}
        .dm-top{position:sticky;top:0;z-index:30;background:#fff;border-bottom:1px solid #EEF0F7;display:flex;align-items:center;gap:8px;padding:10px 14px}
        .dm-top img{width:36px;height:36px;object-fit:contain}
        .dm-word{font:900 20px Nunito,sans-serif;letter-spacing:-.6px}.dm-word b{color:#F5C542}
        .dm-tag{font-size:9px;color:#8A94AD;font-weight:600;margin-left:2px}
        .dm-user{margin-left:auto;width:36px;height:36px;border-radius:50%;overflow:hidden;border:2px solid #F5C542;display:grid;place-items:center}
        .dm-user svg{width:36px;height:36px}
        .dm-wrap{padding:12px}
        .dm-hero{border-radius:18px;overflow:hidden;position:relative;background:linear-gradient(110deg,#FFF1D0,#FFD987);padding:22px 18px 16px;min-height:230px}
        .dm-hero img{position:absolute;right:-10px;bottom:0;width:62%;height:auto;opacity:.9;pointer-events:none}
        .dm-hero .copy{position:relative;z-index:2;max-width:72%}
        .dm-hero .eyebrow{font:800 10px Nunito,sans-serif;margin:0 0 8px;color:#33425F}
        .dm-hero h1{font:900 26px/1.1 Nunito,sans-serif;letter-spacing:-.8px;margin:0 0 8px}
        .dm-hero .hi{background:#F5C542;border-radius:8px;padding:0 7px 2px;display:inline-block}
        .dm-hero .sub{font-size:11px;line-height:1.5;color:#3D4B6B;margin:0 0 14px}
        .dm-cta{display:inline-flex;align-items:center;gap:8px;background:#172B4D;color:#fff;font:800 11px Inter,sans-serif;border-radius:999px;padding:10px 16px;text-decoration:none;position:relative;z-index:3}
        .dm-cta.alt{background:#fff;color:#172B4D;border:1px solid #172B4D33;margin-left:8px}
        .dm-topics{margin-top:12px;background:#fff;border:1px solid #EDEFF6;border-radius:14px;padding:12px;display:flex;gap:8px;align-items:center;overflow-x:auto;white-space:nowrap}
        .dm-topics b{font-size:12px;flex:none}
        .chip{background:#F1EEFF;color:#3F4E78;border-radius:999px;padding:6px 10px;font-size:10.5px;font-weight:700;flex:none}
        .dm-card{background:#fff;border:1px solid #EDEFF6;border-radius:16px;padding:14px;margin-top:12px}
        .dm-card h3{font:800 13px Nunito,sans-serif;margin:0 0 10px}
        .dm-composer{display:flex;gap:10px;align-items:flex-start}
        .dm-composer .av{width:36px;height:36px;border-radius:50%;overflow:hidden;flex:none;background:#F1EEFF}
        .dm-composer .av svg{width:36px;height:36px}
        .dm-composer textarea{flex:1;border:0;outline:0;resize:none;font:500 12.5px/1.5 Inter,sans-serif;min-height:58px;color:#172B4D}
        .dm-tools{display:flex;align-items:center;gap:12px;margin-top:8px;padding-top:10px;border-top:1px solid #F0F1F7;flex-wrap:wrap}
        .dm-tools span{font-size:10.5px;color:#5A6484;font-weight:600}
        .dm-spill{margin-left:auto;background:#F5C542;border:0;border-radius:999px;padding:8px 14px;font:800 11px Inter,sans-serif;color:#172B4D;cursor:pointer}
        .dm-post{display:flex;gap:10px}
        .dm-post .av{width:34px;height:34px;border-radius:50%;overflow:hidden;flex:none;background:#F1EEFF}
        .dm-post .av svg{width:34px;height:34px}
        .dm-post .body{flex:1;min-width:0}
        .dm-nm{font:800 12px Nunito,sans-serif}
        .dm-meta{font-size:10px;color:#8A94AD;margin-top:1px}
        .dm-text{font-size:12px;line-height:1.55;margin:8px 0;color:#2E3D5C}
        .dm-reacts{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px}
        .dm-reacts button{border:1px solid #E9ECF6;border-radius:999px;padding:5px 8px;font-size:10px;font-weight:600;background:#F7F8FE;color:#3D4B6B;cursor:pointer}
        .dm-chips{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px}
        .dm-foot{display:flex;gap:18px;border-top:1px solid #F0F1F7;padding-top:8px;font-size:10px;color:#6B7591;font-weight:600}
        .dm-art{width:78px;border-radius:10px;overflow:hidden;flex:none}
        .dm-art img{width:100%;display:block}
        .dm-sponsor{background:linear-gradient(110deg,#FFF3D4,#FFF9EC);border:1px solid #F6E4B8;border-radius:16px;padding:14px;margin-top:12px;position:relative}
        .dm-sponsor .label{position:absolute;top:0;left:0;background:#F5C542;font-size:8px;font-weight:800;padding:3px 7px;border-radius:0 0 8px 0}
        .dm-sponsor b{font:800 12px Nunito,sans-serif;display:block;margin-top:10px}
        .dm-sponsor p{font-size:10.5px;color:#6B7591;margin:4px 0 10px}
        .dm-sponsor button{background:#172B4D;color:#fff;border:0;border-radius:999px;padding:8px 13px;font:800 10px Inter,sans-serif;cursor:pointer}
        .dm-plus{background:linear-gradient(120deg,#172B4D,#1E3A6B);border-radius:14px;padding:14px;color:#fff;margin-top:12px}
        .dm-plus b{font:900 15px Nunito,sans-serif}.dm-plus b span{color:#F5C542}
        .dm-plus p{font-size:10.5px;margin:6px 0 10px;color:#D8E0F5}
        .dm-plus button{background:#F5C542;border:0;border-radius:999px;font:800 10px Inter,sans-serif;padding:8px 12px;cursor:pointer}
        .dm-stats{display:flex;justify-content:space-around;text-align:center;margin-top:12px}
        .dm-stats b{font:900 16px Nunito,sans-serif;display:block}.dm-stats span{font-size:9px;color:#8A94AD}
        .dm-bottom{position:fixed;bottom:0;left:0;right:0;z-index:40;background:#fff;border-top:1px solid #EEF0F7;display:flex;padding:6px 4px 10px}
        .dm-bottom a{flex:1;display:flex;flex-direction:column;align-items:center;gap:2px;text-decoration:none;font-size:9px;font-weight:700;color:#8A94AD}
        .dm-bottom a.on{color:#172B4D}.dm-bottom a.on::before{content:'';height:3px;width:22px;background:#F5C542;border-radius:9px;margin-bottom:2px}
        .dm-bottom span{font-size:17px;line-height:1}
        .dm-err{color:#C2410C;font-size:10.5px;margin-top:6px}
      `}</style>

      <header className="dm-top">
        <img src="/images/mascot-avatar.png" alt="" />
        <span className="dm-word">unlinked<b>+</b></span>
        <span className="dm-tag">Less Flex, More Human.</span>
        <Link className="dm-user" href="/features/profil" aria-label="Profil">
          <span dangerouslySetInnerHTML={{ __html: buildAvatarSVG({ character: 'panda', accessories: [] }) }} />
        </Link>
      </header>

      <div className="dm-wrap">
        <section className="dm-hero">
          <img src={isChibi ? '/images/dash/hero-chibi.png' : '/images/dash/hero-sameboat.png'} alt="" />
          <div className="copy">
            {!isChibi && <p className="eyebrow">Kamu gak sendiri, kok!</p>}
            <h1>
              {isChibi ? <>Tempatnya<br />Orang-Orang Jujur<br />soal <span className="hi">Hidup.</span></>
                : <>Temukan teman<br />senasib di <span className="hi">Same Boat</span></>}
            </h1>
            <p className="sub">{isChibi
              ? 'Spill cerita, temukan teman senasib, dan tumbuh bersama di unlinked+.'
              : 'Sama-sama berjuang, sama-sama bangkit 💪'}</p>
          </div>
          <Link className="dm-cta" href={isChibi ? '/features/spill' : '/'}>{isChibi ? 'Buat Spill Sekarang →' : 'Lihat Rekomendasi →'}</Link>
          {isChibi && <Link className="dm-cta alt" href="/">Jelajahi Komunitas</Link>}
        </section>

        <div className="dm-topics"><b>🔥 Topik Populer:</b>{TOPICS.map((t) => <span className="chip" key={t}>{t}</span>)}</div>

        <div className="dm-card">
          <h3>Ruang Kamu</h3>
          <div className="dm-composer">
            <span className="av" dangerouslySetInnerHTML={{ __html: buildAvatarSVG({ character: 'panda', accessories: [] }) }} />
            <textarea value={content} onChange={(e) => setContent(e.target.value)} aria-label="Tulis spill"
              placeholder="Ada yang mau kamu ceritakan? Tulis cerita, curhat, atau sekadar berbagi..." />
          </div>
          <div className="dm-tools">
            <Link href="/features/meme-studio" style={{ textDecoration: 'none' }}><span>▧ Foto</span></Link>
            <button className="dm-tool" onClick={() => setToolNote('Lampiran video belum tersedia.')}><span>▣ Video</span></button>
            <Link href="/features/poll" style={{ textDecoration: 'none' }}><span>▥ Poll</span></Link>
            <button className="dm-tool" onClick={() => setEmojiOpen(!emojiOpen)}><span>☻ Ekspresi</span></button>
            <button className="dm-spill" onClick={() => void submit()} disabled={posting}>{posting ? '...' : 'Spill It! +'}</button>
          </div>
          {emojiOpen && (
            <div className="dm-emoji">
              {['😮‍💨', '😭', '😂', '💪', '🫶', '☕', '🌱', '🙃'].map((e) => (
                <button key={e} onClick={() => { setContent(content + e); setEmojiOpen(false); }}>{e}</button>
              ))}
            </div>
          )}
          {toolNote && <p className="dm-err">{toolNote}</p>}
          {error && <p className="dm-err">{error}</p>}
        </div>

        {posts.map((post) => {
          const state = mine[post.id] ?? { pukpuk: false, ngakak: false, sama: false };
          return (
            <div className="dm-card" key={post.id}>
              <div className="dm-post">
                <span className="av" dangerouslySetInnerHTML={{ __html: buildAvatarSVG({ character: 'panda', accessories: [] }) }} />
                <div className="body">
                  <div className="dm-nm">{post.user?.username ?? 'Anonim'} <span style={{ color: '#F5C542' }}>♛</span></div>
                  <div className="dm-meta">Lv. {post.user?.profile?.mentalLevel ?? 1} · {relativeTime(post.createdAt)}</div>
                  <div className="dm-chips"><span className="chip">{post.category}</span><span className="chip">Cuma mau didengar</span></div>
                  <div className="dm-text">{post.content}</div>
                  <div className="dm-art"><img src="/images/dash/post-worker.png" alt="" /></div>
                  <div className="dm-reacts">
                    {([['pukpuk', '👋 Puk-Puk'], ['ngakak', '😂 Ngakak'], ['sama', '🙂 Sama Banget']] as const).map(([k, label]) => (
                      <button key={k} onClick={() => void react(post, k)}>{label} ({post.reactionCounts[k]}){state[k] ? ' ✓' : ''}</button>
                    ))}
                  </div>
                  <div className="dm-foot"><span>♧ 128</span><span>▤ 45</span><span>↗ Simpan</span><span>↗ Bagikan</span></div>
                </div>
              </div>
            </div>
          );
        })}

        {showAd && (
          <div className="dm-sponsor">
            <span className="label">SPONSORED</span>
            <b>Upgrade skill, jangan cuma upgrade emosi!</b>
            <p>Kursus online praktis untuk karier lebih baik.</p>
            <button>Pelajari Sekarang →</button>
          </div>
        )}
        {!showAd && (
          <p className="dm-err" style={{ marginTop: 12 }}>
            Iklan disembunyikan sesuai preferensi/batas harian kamu. Tidak ada iklan berbasis isi Spill.
          </p>
        )}

        <div className="dm-card">
          <h3>🔥 Tren Hari Ini</h3>
          {TRENDS.map(([tag, count, delta], i) => (
            <div key={tag} style={{ display: 'flex', gap: 8, padding: '7px 0', borderBottom: '1px solid #F1F2F8' }}>
              <i style={{ fontStyle: 'normal', fontSize: 11, color: '#8A94AD' }}>{i + 1}</i>
              <span style={{ fontSize: 11, fontWeight: 700 }}>{tag}<small style={{ display: 'block', fontSize: 9, color: '#8A94AD' }}>{count}</small></span>
              <span style={{ marginLeft: 'auto', color: '#16A34A', fontSize: 9, fontWeight: 800 }}>↑ {delta}</span>
            </div>
          ))}
        </div>

        <div className="dm-plus">
          <b>unlinked+ <span>PLUS</span></b>
          <p>Bebas iklan, lebih banyak keseruan!</p>
          <button>Langganan Sekarang →</button>
        </div>

        <div className="dm-stats">
          <div><b>2.5M</b><span>Pengguna</span></div>
          <div><b>120K</b><span>Spill/Hari</span></div>
          <div><b>87%</b><span>Happy User</span></div>
        </div>
      </div>

      <nav className="dm-bottom">
        <Link href="/" className="on"><span>⌂</span>Beranda</Link>
        <Link href="/features/spill"><span>⚡</span>Spill</Link>
        <Link href="/features/avatar"><span>☻</span>Avatar</Link>
        <Link href="/features/toko"><span>▣</span>Toko</Link>
        <Link href="/features/profil"><span>♙</span>Profil</Link>
      </nav>

      {authOpen && <AuthModal onSuccess={() => { setAuthOpen(false); window.location.reload(); }} onClose={() => setAuthOpen(false)} defaultTab="login" />}
    </div>
  );
}
