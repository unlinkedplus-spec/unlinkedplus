'use client';

/** Mobile landing: full-height, proportional, Tailwind-first, same visual language. */
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useLandingContent } from '../lib/use-content';
import type { LandingContentItem } from '../lib/types';

const PILLARS: Array<{ slug: string; title: string; desc: string; icon: string }> = [
  { slug: 'spill', title: 'Spill Without Judgment', desc: 'Bercerita jujur tanpa takut dihakimi.', icon: '💬' },
  { slug: 'same-boat', title: 'Same Boat', desc: 'Temukan teman senasib, tanpa identitas asli.', icon: '🫂' },
  { slug: 'mental-armor', title: 'Mental Armor', desc: 'Apresiasi proses, bukan popularitas.', icon: '🏅' },
  { slug: 'comeback-journey', title: 'Comeback Journey', desc: 'Jurnal bangkit yang privat.', icon: '🚀' },
  { slug: 'toko', title: 'Avatar & Store', desc: 'Ekspresikan diri. Pembayaran simulasi.', icon: '🎁' },
];

const FEATURES: Array<{ slug: string; title: string; desc: string; icon: string }> = [
  { slug: 'unlinked-rooms', title: 'Unlinked Rooms', desc: 'Komunitas kecil sesuai minat.', icon: '🏠' },
  { slug: 'support-circles', title: 'Support Circles', desc: 'Lingkaran dukungan, bukan hakim.', icon: '👥' },
  { slug: 'dear-future-me', title: 'Dear Future Me', desc: 'Surat untuk dirimu nanti.', icon: '✉️' },
  { slug: 'tiny-wins', title: 'Tiny Wins', desc: 'Langkah kecil yang dihitung.', icon: '✅' },
  { slug: 'hall-of-almost', title: 'Hall of Almost', desc: 'Usaha yang tetap dihargai.', icon: '🏆' },
  { slug: 'mental-reset', title: 'Mental Reset', desc: 'Jeda sebentar, 4-7-8.', icon: '💗' },
];

interface Props {
  onLogin: () => void;
  onRegister: () => void;
}

export default function LandingMobile({ onLogin, onRegister }: Props) {
  const cms = useLandingContent();
  const bySlug = (slug: string): LandingContentItem | undefined =>
    cms.find((c) => c.slug === slug && c.status === 'published');

  const label = (slug: string, fallback: string) => bySlug(slug)?.title || fallback;
  const desc = (slug: string, fallback: string) => bySlug(slug)?.description || fallback;

  return (
    <div className="min-h-screen bg-background font-body text-navy pb-20">
      <header className="sticky top-0 z-30 flex items-center gap-2 border-b border-gray-100 bg-white px-4 py-3">
        <img src="/images/mascot-avatar.png" alt="" className="h-9 w-9 object-contain" />
        <span className="font-display text-xl font-black tracking-tight">
          unlinked<span className="text-primary">+</span>
        </span>
        <button onClick={onLogin}
          className="ml-auto rounded-full px-4 py-2 text-xs font-bold text-navy nav-fx">
          Masuk
        </button>
        <button onClick={onRegister}
          className="rounded-full bg-primary px-4 py-2 text-xs font-bold text-navy shadow-sm">
          Gabung Sekarang
        </button>
      </header>

      <main className="mx-auto w-full max-w-md px-4">
        <section className="mt-6 overflow-hidden rounded-3xl bg-gradient-to-br from-[#FFF1D0] via-[#FFE3A0] to-[#FFD987] p-5">
          <p className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1 text-[10px] font-bold text-navy">
            ✦ Memutus yang Toksik, Menambah yang Esensial
          </p>
          <h1 className="font-display text-[28px] font-black leading-[1.05] tracking-tight">
            Tempatnya Orang-Orang Jujur soal <span className="rounded-lg bg-primary px-2">Hidup.</span>
          </h1>
          <p className="mt-3 text-xs leading-relaxed text-navy/80">
            Spill cerita, temukan teman senasib, dan tumbuh bareng di unlinked+.
          </p>

          {/* Signature Chibi illustration: its own block, never overlaying copy. */}
          <img src="/images/dash/hero-chibi.png" alt="Chibi unlinked+ sedang spill di laptop"
            className="mt-4 w-full rounded-2xl object-cover" />

          <div className="mt-5 flex flex-wrap gap-2">
            <button onClick={onRegister}
              className="rounded-full bg-navy px-5 py-3 text-xs font-bold text-white shadow-md">
              Gabung Sekarang →
            </button>
            <Link href="/exact?view=beranda"
              className="rounded-full border border-navy/20 bg-white px-5 py-3 text-xs font-bold text-navy">
              ▶ Lihat Preview
            </Link>
          </div>
          <p className="mt-4 font-display text-sm font-black italic text-navy/70">
            “Hidup bukan soal terlihat sukses, tapi tetap waras.”
          </p>
        </section>

        <section className="mt-6">
          <h2 className="mb-3 font-display text-lg font-black">Kenapa unlinked+?</h2>
          <div className="space-y-2">
            {PILLARS.map((p, i) => (
              <Link key={p.slug} href={`/features/${p.slug}`}
                className="card-fx flex items-center gap-3 rounded-2xl border border-gray-100 bg-white p-3">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#FFF3D4] text-xl">{p.icon}</span>
                <span className="min-w-0">
                  <b className="block text-sm font-bold text-navy">{label(p.slug, p.title)}</b>
                  <small className="block text-xs leading-snug text-gray-500">{desc(p.slug, p.desc)}</small>
                </span>
                <span className="ml-auto text-xs text-gray-300">{i + 1}</span>
              </Link>
            ))}
          </div>
        </section>

        <section className="mt-8">
          <h2 className="font-display text-xl font-black leading-tight">
            Lebih dari Sekadar Sosial Media
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-gray-500">
            Ruang aman untuk berbagi, terhubung, dan bertumbuh. Tanpa pamer pencapaian.
          </p>
          <Link href="/features/same-boat"
            className="mt-4 inline-block rounded-full bg-primary px-5 py-3 text-sm font-bold text-navy">
            Jelajahi Fitur →
          </Link>
          <div className="mt-4 grid grid-cols-2 gap-2">
            {FEATURES.map((f) => (
              <Link key={f.slug} href={`/features/${f.slug}`}
                className="card-fx rounded-2xl border border-gray-100 bg-white p-3">
                <span className="text-xl">{f.icon}</span>
                <b className="mt-2 block text-xs font-bold text-navy">{label(f.slug, f.title)}</b>
                <small className="mt-1 block text-[11px] leading-snug text-gray-500">{desc(f.slug, f.desc)}</small>
              </Link>
            ))}
          </div>
        </section>

        <section className="mt-8 overflow-hidden rounded-3xl bg-gradient-to-br from-[#EEF1FF] to-[#F7F3FF] p-5 text-center">
          <img src="/images/mascot-avatar.png" alt="Mascot unlinked+"
            className="mx-auto h-16 w-16 object-contain" />
          <b className="mt-2 block font-display text-lg font-black">Bergabunglah dengan komunitas yang positif!</b>
          <p className="mt-1 text-xs text-gray-500">Karena kamu tidak sendirian.</p>
          <button onClick={onRegister}
            className="mt-4 rounded-full bg-navy px-6 py-3 text-sm font-bold text-white">
            Gabung Sekarang →
          </button>
          <div className="mt-5 flex justify-center gap-6 text-center">
            <div><b className="block font-display text-lg font-black">120K+</b><small className="text-[10px] text-gray-500">Pengguna Aktif</small></div>
            <div><b className="block font-display text-lg font-black">2.5M+</b><small className="text-[10px] text-gray-500">Spill Dibagikan</small></div>
            <div><b className="block font-display text-lg font-black">87%</b><small className="text-[10px] text-gray-500">Happy User</small></div>
          </div>
        </section>

        <p className="mt-8 text-center font-display text-xl font-black italic text-navy/70">Less Flex, More Human.</p>
      </main>
    </div>
  );
}
