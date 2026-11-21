'use client';

/** Mobile Beranda: proportional, Tailwind-first, all controls functional. */
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import {
  createPost, getPosts, recordAdImpression, toggleReaction, authMe,
} from '../lib/api';
import type { Post } from '../lib/types';
import { SPILL_MODE_META, getLevelName } from '../lib/types';
import type { SpillMode } from '../lib/types';
import { relativeTime } from '../lib/time';
import AccountMenu from './AccountMenu';
import AuthModal from './AuthModal';

const TOPICS = ['#Burnout', '#Resign', '#KerjaLagi', '#Healing', '#LifeBalance', '#CareerSwitch'];
const TRENDS = [
  ['#BurnoutDiKantor', '124.5K'], ['#ResignAtauTahan', '98.3K'], ['#LifeBalance', '76.1K'],
  ['#CareerSwitch', '54.7K'], ['#MentalHealth', '42.9K'],
];

interface Props { authenticated: boolean }

export default function BerandaMobile({ authenticated }: Props) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [content, setContent] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [showAd, setShowAd] = useState(!authenticated);
  const [authTab, setAuthTab] = useState<'login' | 'register' | null>(null);

  const load = useCallback(async () => {
    try { const res = await getPosts(1); setPosts(res.data.slice(0, 4)); } catch { setPosts([]); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    if (!authenticated) return;
    void recordAdImpression().then((r) => setShowAd(r.allowed)).catch(() => setShowAd(true));
    void authMe().catch(() => undefined);
  }, [authenticated]);

  function notify(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(''), 2600);
  }

  async function submit() {
    if (!authenticated) { setAuthTab('register'); return; }
    if (content.trim().length < 10) { setError('Cerita minimal 10 karakter.'); return; }
    setBusy(true); setError('');
    try {
      const post = await createPost({ category: 'Ditolak HRD', content: content.trim(), spillMode: 'listen' });
      setPosts((prev) => [post, ...prev]);
      setContent('');
      notify('Spill kamu sudah tayang.');
    } catch (e) { setError(e instanceof Error ? e.message : 'Gagal posting'); }
    finally { setBusy(false); }
  }

  async function react(post: Post, type: 'pukpuk' | 'ngakak' | 'sama') {
    if (!authenticated) { setAuthTab('login'); return; }
    try {
      await toggleReaction(post.id, type);
      await load();
    } catch (e) { notify(e instanceof Error ? e.message : 'Gagal bereaksi'); }
  }

  return (
    <div className="min-h-screen bg-background pb-20 font-body text-navy">
      <header className="sticky top-0 z-30 flex items-center gap-2 border-b border-gray-100 bg-white px-4 py-3">
        <img src="/images/mascot-avatar.png" alt="" className="h-8 w-8 object-contain" />
        <span className="font-display text-lg font-black tracking-tight">unlinked<span className="text-primary">+</span></span>
        <Link href="/features/notifications" aria-label="Notifikasi" className="ml-auto relative p-2 text-lg">🔔<span className="absolute right-1 top-1 grid h-4 w-4 place-items-center rounded-full bg-red-500 text-[9px] text-white">3</span></Link>
        <Link href="/features/notifications?tab=messages" aria-label="Pesan" className="p-2 text-lg">📭</Link>
        <AccountMenu authenticated={authenticated} mobile trigger={{ left: 0, top: 0, width: 0, height: 0 }} />
      </header>

      <main className="mx-auto w-full max-w-md px-3">
        <section className="mt-3 overflow-hidden rounded-2xl bg-gradient-to-br from-[#FFF1D0] to-[#FFD987] p-4">
          <p className="text-[10px] font-bold text-navy/70">Kamu gak sendiri, kok!</p>
          <h1 className="font-display text-[23px] font-black leading-tight">
            Temukan teman senasib di <span className="rounded-md bg-primary px-1">Same Boat</span>
          </h1>
          <p className="mt-1 text-[11px] leading-snug text-navy/70">Sama-sama berjuang, sama-sama bangkit 💪</p>

          {/* Signature Same Boat illustration: separate block, never over text. */}
          <img src="/images/dash/hero-sameboat.png" alt="Ilustrasi Same Boat unlinked+"
            className="mt-3 w-full rounded-xl object-cover" />

          <Link href="/features/same-boat"
            className="mt-3 inline-flex rounded-full bg-navy px-5 py-2.5 text-[11px] font-bold text-white">
            Lihat Rekomendasi →
          </Link>
        </section>

        <div className="dm-topics mt-3 flex gap-2 overflow-x-auto rounded-xl border border-gray-100 bg-white p-3">
          <b className="shrink-0 text-xs">🔥 Topik:</b>
          {TOPICS.map((t) => (
            <Link key={t} href={`/features/same-boat?topic=${encodeURIComponent(t.slice(1))}`}
              className="dm-chip shrink-0">{t}</Link>
          ))}
        </div>

        <section className="mt-3 rounded-2xl border border-gray-100 bg-white p-3">
          <h2 className="mb-2 font-display text-sm font-black">Fitur Seru</h2>
          <div className="grid grid-cols-3 gap-2">
            {[
              ['📊', 'Poll', '/features/poll'], ['🎭', 'Personality', '/features/personality-test'],
              ['🖼️', 'Meme Studio', '/features/meme-studio'], ['▣', 'Store', '/features/toko'],
              ['💼', 'Opportunity', '/features/opportunity-board'], ['💗', 'Mental Reset', '/features/mental-reset'],
            ].map(([icon, label, href]) => (
              <Link key={href} href={href}
                className="flex flex-col items-center gap-1 rounded-xl bg-gray-50 px-2 py-3 text-center text-[10px] font-bold">
                <span className="text-lg">{icon}</span>{label}
              </Link>
            ))}
          </div>
        </section>

        <section className="mt-3 rounded-2xl border border-gray-100 bg-white p-3">
          <h2 className="mb-2 font-display text-sm font-black">Ruang Kamu</h2>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {[
              ['🏠', 'Beranda', '/home'], ['⚡', 'Spill', '/features/spill'],
              ['☻', 'Avatar', '/features/avatar'], ['▣', 'Toko', '/features/toko'],
              ['♙', 'Profil', '/features/profil'],
            ].map(([icon, label, href]) => (
              <Link key={href} href={href}
                className="flex shrink-0 flex-col items-center gap-1 rounded-xl bg-gray-50 px-3 py-2 text-[10px] font-bold">
                <span className="text-base">{icon}</span>{label}
              </Link>
            ))}
          </div>
        </section>

        <section className="mt-3 rounded-2xl border border-gray-100 bg-white p-3">
          <div className="flex items-start gap-2">
            <img src="/images/mascot-avatar.png" alt="" className="h-9 w-9 rounded-full bg-[#FFF3D4] object-contain" />
            <textarea value={content} onChange={(e) => setContent(e.target.value)} rows={2}
              placeholder="Ada yang mau kamu ceritakan?"
              className="min-h-[56px] flex-1 resize-none border-0 text-[13px] leading-relaxed outline-none placeholder:text-gray-400" />
          </div>
          {error && <p className="mt-1 text-[11px] text-red-600">{error}</p>}
          <div className="mt-2 flex flex-wrap items-center gap-3 border-t border-gray-100 pt-2">
            <Link href="/features/meme-studio" className="text-[11px] font-semibold text-gray-600">📷 Foto</Link>
            <Link href="/features/video" className="text-[11px] font-semibold text-gray-600">🎬 Video</Link>
            <Link href="/features/poll" className="text-[11px] font-semibold text-gray-600">📊 Poll</Link>
            <Link href="/features/mental-reset" className="text-[11px] font-semibold text-gray-600">😊 Ekspresi</Link>
            <button onClick={() => void submit()} disabled={busy}
              className="ml-auto rounded-full bg-primary px-4 py-2 text-[11px] font-bold text-navy disabled:opacity-50">
              {busy ? '...' : 'Spill It! +'}
            </button>
          </div>
        </section>

        <section className="mt-3 space-y-3">
          {posts.map((post) => {
            const mode = SPILL_MODE_META[(post.spillMode as SpillMode) || 'listen'];
            return (
              <article key={post.id} className="rounded-2xl border border-gray-100 bg-white p-3">
                <div className="flex items-center gap-2">
                  <img src="/images/mascot-avatar.png" alt="" className="h-8 w-8 rounded-full bg-[#F1EEFF] object-contain" />
                  <div className="min-w-0">
                    <b className="block text-xs">{post.user?.username ?? 'Anonim'} 👑</b>
                    <small className="text-[10px] text-gray-400">Lv.{post.user?.profile?.mentalLevel ?? 1} {getLevelName(post.user?.profile?.mentalLevel ?? 1)} · {relativeTime(post.createdAt)}</small>
                  </div>
                </div>
                <p className="mt-2 text-xs leading-relaxed">{post.content}</p>
                {post.videoUrl && (
                  <a href={post.videoUrl} target="_blank" rel="noopener noreferrer"
                    className="mt-2 flex items-center gap-2 rounded-xl border border-gray-200 bg-navy/5 px-3 py-2 text-[11px] font-bold">
                    ▶ Tonton Video Spill
                  </a>
                )}
                <div className="mt-2 flex flex-wrap gap-2">
                  <span className="rounded-full bg-primary/20 px-2 py-1 text-[10px] font-bold">{post.category}</span>
                  <span className="rounded-full bg-primary/20 px-2 py-1 text-[10px] font-bold">{mode.label}</span>
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {([['pukpuk', '👏 Puk-Puk'], ['ngakak', '😂 Ngakak'], ['sama', '😄 Sama Banget']] as const).map(([key, label]) => (
                    <button key={key} onClick={() => void react(post, key)}
                      className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1.5 text-[10px] font-semibold">
                      {label} <b>({post.reactionCounts?.[key] ?? 0})</b>
                    </button>
                  ))}
                </div>
                <div className="mt-3 flex gap-4 border-t border-gray-100 pt-2 text-[11px] font-semibold text-gray-500">
                  <span>💬 {post._count?.comments ?? 0}</span><span>🔖 Simpan</span><span>↗ Bagikan</span>
                </div>
              </article>
            );
          })}
        </section>

        {showAd && (
          <section className="mt-3 rounded-2xl border border-[#F6E4B8] bg-gradient-to-br from-[#FFF3D4] to-[#FFF9EC] p-3">
            <span className="rounded bg-primary px-2 py-0.5 text-[8px] font-black">SPONSORED</span>
            <b className="mt-2 block font-display text-xs">Upgrade skill, jangan cuma upgrade emosi!</b>
            <p className="my-1 text-[10px] text-gray-500">Kursus online praktis untuk karier lebih baik.</p>
            <Link href="/features/opportunity-board"
              className="inline-block rounded-full bg-navy px-4 py-2 text-[10px] font-bold text-white">Pelajari Sekarang →</Link>
          </section>
        )}

        <section className="mt-3 rounded-2xl bg-navy p-4 text-white">
          <b className="font-display text-sm">unlinked+ Plus</b>
          <p className="my-1 text-[11px] text-white/70">Bebas iklan, lebih banyak ketenangan.</p>
          <Link href="/features/toko" className="inline-block rounded-full bg-primary px-4 py-2 text-[10px] font-bold text-navy">Langganan Sekarang</Link>
        </section>

        <section className="mt-3 rounded-2xl border border-gray-100 bg-white p-4">
          <h3 className="font-display text-sm font-black">Pelen-pelan juga sampai.</h3>
          <p className="mt-1 text-[11px] leading-relaxed text-gray-500">
            Tidak semua hal harus jadi pencapaian hari ini. Istirahat juga bagian dari proses.
          </p>
          <Link href="/features/comeback-journey"
            className="mt-3 inline-flex rounded-full bg-primary px-4 py-2 text-[10px] font-bold text-navy">
            Buka Jurnal Bangkit
          </Link>
        </section>

        <section className="mt-3 rounded-2xl border border-gray-100 bg-white p-4">
          <h3 className="font-display text-sm font-black">Tren Hari Ini</h3>
          {TRENDS.map(([tag, count], i) => (
            <Link key={tag} href={`/features/same-boat?topic=${encodeURIComponent(tag.slice(1))}`}
              className="mt-2 flex items-center justify-between text-[11px]">
              <span><b className="mr-2 text-gray-400">{i + 1}</b>{tag} <small className="text-gray-400">{count} Spill</small></span>
              <span className="text-green-600">↑ {12 - i * 2}%</span>
            </Link>
          ))}
        </section>

        <div className="mt-4 flex justify-around rounded-2xl bg-white p-4 text-center">
          <div><b className="block font-display text-base">2.5M</b><small className="text-[9px] text-gray-500">Pengguna</small></div>
          <div><b className="block font-display text-base">120K</b><small className="text-[9px] text-gray-500">Spill/Hari</small></div>
          <div><b className="block font-display text-base">87%</b><small className="text-[9px] text-gray-500">Happy User</small></div>
        </div>
      </main>

      <nav className="fixed bottom-0 left-0 right-0 z-40 flex border-t border-gray-100 bg-white px-2 pb-[max(8px,env(safe-area-inset-bottom))] pt-2">
        {[
          ['⌂', 'Beranda', '/home'], ['⚡', 'Spill', '/features/spill'],
          ['☻', 'Avatar', '/features/avatar'], ['▣', 'Toko', '/features/toko'],
          ['♙', 'Profil', '/features/profil'],
        ].map(([icon, label, href]) => (
          <Link key={href} href={href} className="flex flex-1 flex-col items-center gap-0.5 text-[9px] font-bold text-gray-400">
            <span className="text-base">{icon}</span>{label}
          </Link>
        ))}
      </nav>

      {toast && <div className="fixed bottom-20 left-1/2 z-[80] -translate-x-1/2 rounded-full bg-navy px-4 py-2.5 text-xs font-bold text-white shadow-xl">{toast}</div>}
      {authTab && (
        <AuthModal defaultTab={authTab} onSuccess={() => setAuthTab(null)} onClose={() => setAuthTab(null)} />
      )}
    </div>
  );
}
