'use client';

/** Exact visual from unlinked-plus-mockup-identik.zip + real interactive overlays. */
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { createPost, getPosts, recordAdImpression, toggleReaction } from '../lib/api';

type View = 'landing' | 'beranda';
const W = 1536;
const H = 1024;

export default function ExactMockup({ view, authenticated }: { view: View; authenticated: boolean }) {
  const [scale, setScale] = useState(1);
  const [content, setContent] = useState('');
  const [showAd, setShowAd] = useState(!authenticated);

  useEffect(() => {
    const fit = () => setScale(Math.min(1, window.innerWidth / W));
    fit();
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, []);

  useEffect(() => {
    if (!authenticated) return;
    void recordAdImpression().then((r) => setShowAd(r.allowed)).catch(() => setShowAd(true));
  }, [authenticated]);

  const isLanding = view === 'landing';
  const src = isLanding ? '/images/mockup-identik/chibi-landing.png' : '/images/mockup-identik/same-boat.png';

  async function submit() {
    if (!authenticated) { window.location.href = '/app'; return; }
    if (content.trim().length < 10) { window.location.href = '/features/spill'; return; }
    await createPost({ category: 'Ditolak HRD', content: content.trim(), spillMode: 'listen' });
    setContent('');
    window.location.reload();
  }

  async function react(type: 'pukpuk' | 'ngakak' | 'sama') {
    if (!authenticated) { window.location.href = '/app'; return; }
    const res = await getPosts(1);
    if (res.data[0]) { await toggleReaction(res.data[0].id, type); window.location.reload(); }
  }

  return (
    <div className="ex-root">
      <style jsx global>{`
        .ex-root{background:#f7f7fb;min-height:100vh;display:flex;justify-content:center;overflow-x:hidden}
        .ex-stage{position:relative;width:${W * scale}px;height:${H * scale}px;flex:none}
        .ex-canvas{position:absolute;left:0;top:0;width:${W}px;height:${H}px;transform-origin:top left;transform:scale(${scale})}
        .ex-canvas > img{position:absolute;left:0;top:0;width:${W}px;height:${H}px;display:block}
        .ex-hit{position:absolute;display:block;background:transparent;border:0;padding:0;cursor:pointer;font-size:0;color:transparent;text-decoration:none}
        .ex-text{position:absolute;border:0;outline:0;resize:none;background:transparent;color:#172B4D;font:500 13px/1.45 Inter,sans-serif}
        .ex-text::placeholder{color:transparent}
        .ex-note{position:absolute;font-size:11px;color:#8A94AD;background:#fff;border-radius:8px;padding:6px 10px;z-index:5}
      `}</style>
      <div className="ex-stage">
        <div className="ex-canvas">
          <img src={src} alt={isLanding ? 'unlinked+ Chibi Community Landing' : 'unlinked+ Same Boat Beranda'} />

          {isLanding ? (
            <>
              <Link className="ex-hit" style={{ left: 1240, top: 24, width: 70, height: 44 }} href="/app" aria-label="Masuk" />
              <Link className="ex-hit" style={{ left: 1310, top: 20, width: 180, height: 48 }} href="/app" aria-label="Gabung Sekarang" />
              <Link className="ex-hit" style={{ left: 130, top: 388, width: 245, height: 52 }} href="/app" aria-label="Gabung Sekarang hero" />
              <Link className="ex-hit" style={{ left: 388, top: 388, width: 200, height: 52 }} href="/features/spill" aria-label="Lihat Preview" />
              <Link className="ex-hit" style={{ left: 60, top: 760, width: 180, height: 44 }} href="/app?tab=feed" aria-label="Jelajahi Fitur" />
              <Link className="ex-hit" style={{ left: 440, top: 956, width: 175, height: 40 }} href="/app" aria-label="Gabung Sekarang bawah" />
              {[
                [800, 595, 215, 90, '/features/poll'], [1020, 595, 215, 90, '/features/poll'],
                [1240, 595, 240, 90, '/features/meme-studio'], [800, 695, 215, 90, '/features/personality-test'],
                [1020, 695, 215, 90, '/features/mental-reset'], [1240, 695, 240, 90, '/features/mental-reset'],
              ].map(([l, t, w, h, href], i) => (
                <Link key={i} className="ex-hit" style={{ left: l as number, top: t as number, width: w as number, height: h as number }}
                  href={href as string} aria-label={`fitur-${i}`} />
              ))}
            </>
          ) : (
            <>
              {/* sidebar */}
              <Link className="ex-hit" style={{ left: 24, top: 96, width: 208, height: 46 }} href="/" aria-label="Beranda" />
              <Link className="ex-hit" style={{ left: 24, top: 144, width: 208, height: 46 }} href="/" aria-label="Discover" />
              <Link className="ex-hit" style={{ left: 24, top: 194, width: 208, height: 46 }} href="/features/spill" aria-label="Spill" />
              <Link className="ex-hit" style={{ left: 24, top: 244, width: 208, height: 46 }} href="/" aria-label="Komunitas" />
              <Link className="ex-hit" style={{ left: 24, top: 294, width: 208, height: 46 }} href="/features/profil" aria-label="Profil" />
              {[
                ['poll', 374], ['personality-test', 424], ['meme-studio', 474],
                ['store', 524], ['opportunity-board', 574], ['mental-reset', 624],
              ].map(([slug, top]) => (
                <Link key={slug as string} className="ex-hit" style={{ left: 24, top: top as number, width: 208, height: 44 }}
                  href={`/features/${slug}`} aria-label={String(slug)} />
              ))}
              <Link className="ex-hit" style={{ left: 1298, top: 18, width: 156, height: 44 }}
                href={authenticated ? '/features/profil' : '/app'} aria-label="Gabung Sekarang / Profil" />
              <Link className="ex-hit" style={{ left: 1460, top: 6, width: 60, height: 58 }} href="/features/profil" aria-label="Avatar" />
              <Link className="ex-hit" style={{ left: 283, top: 310, width: 230, height: 46 }} href="/" aria-label="Lihat Rekomendasi" />

              {/* Ruang Kamu */}
              <Link className="ex-hit" style={{ left: 256, top: 510, width: 190, height: 44 }} href="/" aria-label="Ruang Beranda" />
              <Link className="ex-hit" style={{ left: 256, top: 558, width: 190, height: 40 }} href="/features/spill" aria-label="Ruang Spill" />
              <Link className="ex-hit" style={{ left: 256, top: 600, width: 190, height: 40 }} href="/features/avatar" aria-label="Ruang Avatar" />
              <Link className="ex-hit" style={{ left: 256, top: 640, width: 190, height: 40 }} href="/features/toko" aria-label="Ruang Toko" />
              <Link className="ex-hit" style={{ left: 256, top: 682, width: 190, height: 40 }} href="/features/profil" aria-label="Ruang Profil" />

              {/* Composer over the exact image */}
              <textarea className="ex-text" style={{ left: 550, top: 470, width: 610, height: 58, padding: '8px 12px' }}
                value={content} onChange={(e) => setContent(e.target.value)} aria-label="Tulis spill"
                placeholder="Ada yang mau kamu ceritakan?" />
              <button className="ex-hit" style={{ left: 1040, top: 525, width: 118, height: 48 }} onClick={() => void submit()}>Spill It!</button>
              <Link className="ex-hit" style={{ left: 548, top: 548, width: 80, height: 34 }} href="/features/meme-studio" aria-label="Foto" />
              <Link className="ex-hit" style={{ left: 725, top: 548, width: 70, height: 34 }} href="/features/poll" aria-label="Poll" />
              <button className="ex-hit" style={{ left: 800, top: 548, width: 100, height: 34 }}
                onClick={() => { window.location.href = '/features/mental-reset'; }} aria-label="Ekspresi" />

              {/* Reactions on Budi post */}
              <button className="ex-hit" style={{ left: 476, top: 705, width: 106, height: 34 }} onClick={() => void react('pukpuk')}>Puk-Puk</button>
              <button className="ex-hit" style={{ left: 589, top: 705, width: 103, height: 34 }} onClick={() => void react('ngakak')}>Ngakak</button>
              <button className="ex-hit" style={{ left: 700, top: 705, width: 132, height: 34 }} onClick={() => void react('sama')}>Sama Banget</button>

              {!showAd && <div className="ex-note" style={{ left: 480, top: 860 }}>Iklan disembunyikan sesuai preferensi/batas harian kamu.</div>}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
