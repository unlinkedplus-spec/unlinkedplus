'use client';

/** Functional feature pages matching the landing visual language (yellow/navy/white cards). */
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { getMyStats, getPosts, authMe } from '../lib/api';
import type { UserStats } from '../lib/types';

export type LandingSlug =
  | 'unlinked-rooms' | 'support-circles' | 'dear-future-me'
  | 'tiny-wins' | 'hall-of-almost' | 'mental-reset'
  | 'same-boat' | 'mental-armor' | 'comeback-journey';

const META: Record<LandingSlug, { title: string; sub: string; icon: string }> = {
  'unlinked-rooms': { title: 'Unlinked Rooms', sub: 'Ruang kecil berdasarkan pengalaman & minat. Bukan kompetisi followers.', icon: '⌂' },
  'support-circles': { title: 'Support Circles', sub: 'Lingkaran dukungan untuk saling mendengar, bukan menghakimi.', icon: '♧' },
  'dear-future-me': { title: 'Dear Future Me', sub: 'Tulis surat untuk dirimu. Buka kembali di tanggal yang kamu tentukan.', icon: '✉' },
  'tiny-wins': { title: 'Tiny Wins', sub: 'Langkah kecil hari ini. Tidak perlu heroik untuk dihitung.', icon: '✓' },
  'hall-of-almost': { title: 'Hall of Almost', sub: 'Galeri untuk usaha yang belum berhasil. Tetap layak dihargai.', icon: '♛' },
  'mental-reset': { title: 'Mental Reset', sub: 'Jeda sebentar. Tarik 4 detik, tahan 7, buang 8.', icon: '♡' },
  'same-boat': { title: 'Same Boat', sub: 'Temukan cerita dari orang yang mengalami situasi serupa. Tanpa identitas asli.', icon: '♧' },
  'mental-armor': { title: 'Mental Armor', sub: 'Apresiasi ketahanan dan proses. Bukan popularitas, bukan peringkat.', icon: '♛' },
  'comeback-journey': { title: 'Comeback Journey', sub: 'Jurnal bangkit yang privat. Tidak perlu memamerkan hasil.', icon: '🌱' },
};

const ROOMS = [
  { id: 'fresh', name: 'Fresh Graduate Club', desc: 'Masih cari kerja pertama? Duduk sebentar di sini.' },
  { id: 'survivor', name: 'Startup Survivors', desc: 'Cerita dari yang pernah boncos dan masih jalan.' },
  { id: 'overthink', name: 'Overthinkers Club', desc: 'Tempat otak yang tidak pernah benar-benar libur.' },
];
const CIRCLES = [
  { id: 'listen', name: 'Cuma Mau Didengar', desc: 'Balasan cukup dukungan, tanpa nasihat.' },
  { id: 'retry', name: 'Coba Lagi Club', desc: 'Kumpulkan hari-hari mencoba, bukan hasil akhir.' },
  { id: 'rest', name: 'Izin Istirahat', desc: 'Gateknya: hari ini boleh tidak produktif.' },
];
const WINS = [
  { id: 'cv', label: 'Kirim satu lamaran' },
  { id: 'task', label: 'Selesaikan satu tugas kecil' },
  { id: 'learn', label: 'Belajar 15 menit' },
  { id: 'rest', label: 'Istirahat tanpa rasa bersalah' },
];

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) as T : fallback;
  } catch { return fallback; }
}
function save(key: string, value: unknown) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* private mode */ }
}
const today = () => new Date().toISOString().slice(0, 10);

export default function LandingFeaturePage({ slug }: { slug: LandingSlug }) {
  const meta = META[slug];

  return (
    <div className="lf-root">
      <style jsx global>{`
        .lf-root{background:#F7F7FB;min-height:100vh;color:#172B4D;font-family:Inter,Arial,sans-serif;padding:0 16px 60px}
        .lf-wrap{max-width:1180px;margin:0 auto}
        .lf-top{display:flex;align-items:center;gap:12px;padding:18px 0;border-bottom:1px solid #EDEFF6;margin-bottom:24px}
        .lf-top img{width:44px;height:44px;object-fit:contain}
        .lf-word{font:900 24px Nunito,Arial,sans-serif}.lf-word b{color:#F5C542}
        .lf-tag{font-size:11px;color:#8A94AD;margin-left:4px}
        .lf-back{margin-left:auto;font-size:12px;font-weight:700;color:#31447E;text-decoration:none}
        .lf-hero{background:linear-gradient(110deg,#FFF1D0,#FFE3A0 60%,#FFD987);border-radius:20px;padding:28px 30px;margin-bottom:20px;display:flex;gap:18px;align-items:center}
        .lf-hero .ic{font-size:42px;background:#fff;border-radius:16px;width:74px;height:74px;display:grid;place-items:center;flex:none}
        .lf-hero h1{font:900 28px Nunito,Arial,sans-serif;margin:0 0 6px;letter-spacing:-.6px}
        .lf-hero p{font-size:13px;color:#5A6484;margin:0;max-width:640px;line-height:1.5}
        .lf-card{background:#fff;border:1px solid #EDEFF6;border-radius:18px;padding:20px;margin-bottom:14px}
        .lf-card h2{font:800 16px Nunito,Arial,sans-serif;margin:0 0 14px}
        .lf-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:12px}
        .lf-tile{border:1px solid #EDEFF6;border-radius:14px;padding:16px;display:flex;gap:12px;align-items:flex-start;background:#fff}
        .lf-tile .em{width:44px;height:44px;border-radius:12px;background:#F1EEFF;display:grid;place-items:center;font-size:20px;flex:none}
        .lf-tile b{font:800 14px Nunito,Arial,sans-serif;display:block}
        .lf-tile small{font-size:11px;color:#8A94AD;display:block;margin:4px 0 10px;line-height:1.4}
        .lf-btn{background:#F5C542;border:0;border-radius:999px;padding:8px 14px;font:800 11px Inter,Arial,sans-serif;color:#172B4D;cursor:pointer}
        .lf-btn.on{background:#172B4D;color:#fff}
        .lf-input,.lf-date{width:100%;box-sizing:border-box;border:1px solid #E6E9F4;border-radius:12px;padding:12px 14px;font-size:13px;margin-bottom:12px;outline:0}
        .lf-row{display:flex;gap:10px;align-items:center;justify-content:space-between;border-bottom:1px solid #F1F2F8;padding:12px 0}
        .lf-row:last-child{border-bottom:0}
        .lf-row p{margin:0;font-size:13px;white-space:pre-wrap;line-height:1.5}
        .lf-row small{font-size:10.5px;color:#8A94AD}
        .lf-progress{height:10px;background:#F1EEFF;border-radius:999px;overflow:hidden;margin:10px 0 18px}
        .lf-progress span{display:block;height:100%;background:#F5C542;border-radius:999px;transition:width .2s}
        .lf-badges{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}
        .lf-badge{background:#FFF3D4;border:1px solid #F5D98A;border-radius:16px;padding:16px;text-align:center}
        .lf-badge .ic{font-size:30px}
        .lf-badge b{font:800 12.5px Nunito,Arial,sans-serif;display:block;margin-top:8px}
        .lf-badge small{font-size:10px;color:#8A94AD}
        .lf-badge.off{opacity:.45;filter:grayscale(1)}
        .lf-note{font-size:11px;color:#8A94AD;margin-top:12px}
        @media(max-width:700px){.lf-grid,.lf-badges{grid-template-columns:1fr}.lf-hero{padding:20px}.lf-hero h1{font-size:22px}}
      `}</style>
      <div className="lf-wrap">
        <header className="lf-top">
          <img src="/images/mascot-avatar.png" alt="" />
          <span className="lf-word">unlinked<b>+</b></span>
          <span className="lf-tag">Less Flex, More Human.</span>
          <Link className="lf-back" href="/">← Kembali ke Beranda</Link>
        </header>
        <section className="lf-hero">
          <span className="ic">{meta.icon}</span>
          <div><h1>{meta.title}</h1><p>{meta.sub}</p></div>
        </section>

        {(slug === 'unlinked-rooms' || slug === 'support-circles') && (
          <GroupList kind={slug === 'unlinked-rooms' ? 'rooms' : 'circles'} />
        )}
        {slug === 'dear-future-me' && <FutureMe />}
        {slug === 'tiny-wins' && <TinyWins />}
        {slug === 'hall-of-almost' && <Hall />}
        {slug === 'mental-reset' && <Breathing />}
        {slug === 'same-boat' && <SameBoat />}
        {slug === 'mental-armor' && <MentalArmor />}
        {slug === 'comeback-journey' && <ComebackJourney />}

        <p className="lf-note">Data jurnal & preferensi tersimpan di perangkat ini (browser). Tidak dikirim ke server dan tidak dijual.</p>
      </div>
    </div>
  );
}

function GroupList({ kind }: { kind: 'rooms' | 'circles' }) {
  const items = kind === 'rooms' ? ROOMS : CIRCLES;
  const key = `unlinkedplus_${kind}`;
  const [joined, setJoined] = useState<string[]>([]);
  useEffect(() => { setJoined(load<string[]>(key, [])); }, [key]);
  const toggle = (id: string) => {
    const next = joined.includes(id) ? joined.filter((x) => x !== id) : [...joined, id];
    setJoined(next); save(key, next);
  };
  return (
    <section className="lf-card">
      <h2>{kind === 'rooms' ? 'Pilih ruangmu' : 'Pilih lingkaranmu'}</h2>
      <div className="lf-grid">
        {items.map((r) => (
          <div className="lf-tile" key={r.id}>
            <span className="em">{kind === 'rooms' ? '⌂' : '♧'}</span>
            <div>
              <b>{r.name}</b><small>{r.desc}</small>
              <button className={`lf-btn ${joined.includes(r.id) ? 'on' : ''}`} onClick={() => toggle(r.id)}>
                {joined.includes(r.id) ? 'Tergabung ✓' : 'Gabung'}
              </button>
            </div>
          </div>
        ))}
      </div>
      <p className="lf-note">Kamu bisa keluar kapan saja. Tidak ada peringkat atau jumlah pengikut.</p>
    </section>
  );
}

interface Letter { id: string; text: string; openAt: string; createdAt: string }

function FutureMe() {
  const [text, setText] = useState('');
  const [date, setDate] = useState('');
  const [letters, setLetters] = useState<Letter[]>([]);
  useEffect(() => { setLetters(load<Letter[]>('unlinkedplus_letters', [])); }, []);
  const add = () => {
    if (!text.trim() || !date) return;
    const next = [{ id: crypto.randomUUID(), text: text.trim(), openAt: date, createdAt: new Date().toISOString() }, ...letters];
    setLetters(next); save('unlinkedplus_letters', next); setText(''); setDate('');
  };
  return (
    <>
      <section className="lf-card">
        <h2>Tulis surat untuk dirimu</h2>
        <textarea className="lf-input" rows={4} value={text} onChange={(e) => setText(e.target.value)} placeholder="Apa yang ingin kamu dengar lagi nanti?" />
        <input className="lf-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} aria-label="Tanggal dibuka" />
        <button className="lf-btn" onClick={add}>Simpan surat</button>
      </section>
      <section className="lf-card">
        <h2>Suratmu</h2>
        <div className="lf-list">
          {letters.length === 0 && <p className="lf-note">Belum ada surat. Tulis satu, tidak harus panjang.</p>}
          {letters.map((l) => {
            const locked = new Date(l.openAt).getTime() > Date.now();
            return (
              <div className="lf-row" key={l.id}>
                <div>
                  <small>{locked ? `Dibuka ${l.openAt}` : 'Sudah bisa dibuka'}</small>
                  <p>{locked ? '••••••••••••' : l.text}</p>
                </div>
                <button className="lf-btn" onClick={() => {
                  const next = letters.filter((x) => x.id !== l.id);
                  setLetters(next); save('unlinkedplus_letters', next);
                }}>Hapus</button>
              </div>
            );
          })}
        </div>
      </section>
    </>
  );
}

function TinyWins() {
  const [done, setDone] = useState<string[]>([]);
  useEffect(() => { setDone(load<string[]>(`unlinkedplus_wins_${today()}`, [])); }, []);
  const toggle = (id: string) => {
    const next = done.includes(id) ? done.filter((x) => x !== id) : [...done, id];
    setDone(next); save(`unlinkedplus_wins_${today()}`, next);
  };
  return (
    <section className="lf-card">
      <h2>Tantangan hari ini · {today()}</h2>
      <div className="lf-progress"><span style={{ width: `${(done.length / WINS.length) * 100}%` }} /></div>
      <div className="lf-list">
        {WINS.map((w) => (
          <div className="lf-row" key={w.id}>
            <p>{w.label}</p>
            <button className={`lf-btn ${done.includes(w.id) ? 'on' : ''}`} onClick={() => toggle(w.id)}>
              {done.includes(w.id) ? 'Selesai ✓' : 'Tandai'}
            </button>
          </div>
        ))}
      </div>
      <p className="lf-note">{done.length} dari {WINS.length} langkah kecil selesai. Besok reset lagi—dan itu tidak apa-apa.</p>
    </section>
  );
}

function Hall() {
  const [wins, setWins] = useState<string[]>([]);
  useEffect(() => {
    let total = 0;
    for (let i = 0; i < 7; i++) {
      const d = new Date(); d.setDate(d.getDate() - i);
      total += load<string[]>(`unlinkedplus_wins_${d.toISOString().slice(0, 10)}`, []).length;
    }
    setWins(Array.from({ length: total }, (_, i) => String(i)));
  }, []);
  const badges = [
    { id: 'first', ic: '🌱', name: 'Langkah Pertama', need: 1 },
    { id: 'three', ic: '💪', name: 'Tiga Hari Bertahan', need: 3 },
    { id: 'week', ic: '♛', name: 'Almost Hero', need: 7 },
    { id: 'rejected', ic: '📮', name: 'Rejected But Still Trying', need: 5 },
    { id: 'overthink', ic: '🌀', name: 'Professional Overthinker', need: 2 },
    { id: 'loading', ic: '⏳', name: 'Comeback Loading', need: 10 },
  ];
  return (
    <section className="lf-card">
      <h2>Koleksi Almost</h2>
      <div className="lf-badges">
        {badges.map((b) => (
          <div className={`lf-badge ${wins.length >= b.need ? '' : 'off'}`} key={b.id}>
            <div className="ic">{b.ic}</div><b>{b.name}</b>
            <small>{wins.length >= b.need ? 'Terbuka' : `${b.need} tiny wins`}</small>
          </div>
        ))}
      </div>
      <p className="lf-note">Badge ini murni refleksi lokal, bukan status sosial berbayar dan bukan jaminan keberhasilan.</p>
    </section>
  );
}

function Breathing() {
  const phases = [{ n: 'Tarik napas', s: 4 }, { n: 'Tahan', s: 7 }, { n: 'Buang napas', s: 8 }];
  const [running, setRunning] = useState(false);
  const [i, setI] = useState(0);
  const [left, setLeft] = useState(4);
  const [cycles, setCycles] = useState(0);
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      setLeft((v) => {
        if (v > 1) return v - 1;
        setI((p) => {
          const next = p + 1;
          if (next >= phases.length) { setCycles((c) => c + 1); setLeft(4); return 0; }
          setLeft(phases[next].s);
          return next;
        });
        return phases[i].s;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [running, i]);
  return (
    <section className="lf-card">
      <h2>{running ? phases[i].n : 'Siap jeda sebentar?'}</h2>
      <div style={{ font: '900 56px Nunito, sans-serif', margin: '8px 0' }}>{running ? left : '4·7·8'}</div>
      <div style={{ display: 'flex', gap: 10 }}>
        <button className="lf-btn" onClick={() => setRunning(!running)}>{running ? 'Jeda' : 'Mulai'}</button>
        <button className="lf-btn" onClick={() => { setRunning(false); setI(0); setLeft(4); }}>Reset</button>
        <span className="lf-note" style={{ margin: 'auto 0' }}>Siklus: {cycles}</span>
      </div>
      <p className="lf-note">Ini latihan napas sederhana, bukan penanganan medis.</p>
    </section>
  );
}

const SITUATIONS = [
  'Ditolak HRD', 'Salah Kirim Chat', 'Dimarahi Bos', 'Bisnis Boncos', 'Salah Jurusan',
];

function SameBoat() {
  const [situation, setSituation] = useState('Ditolak HRD');
  const [posts, setPosts] = useState<Array<{ id: string; content: string; category: string; isAnonymous?: boolean; createdAt: string }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    getPosts(1).then((res) => {
      if (!active) return;
      setPosts(res.data.filter((p) => p.category === situation).slice(0, 5));
      setLoading(false);
    }).catch(() => { if (active) { setPosts([]); setLoading(false); } });
    return () => { active = false; };
  }, [situation]);

  return (
    <>
      <section className="lf-card">
        <h2>Pilih situasimu</h2>
        <div className="lf-grid">
          {SITUATIONS.map((s) => (
            <button key={s} className={`lf-btn ${situation === s ? 'on' : ''}`} onClick={() => setSituation(s)}>{s}</button>
          ))}
        </div>
      </section>
      <section className="lf-card">
        <h2>Cerita senasib · {situation}</h2>
        <div className="lf-list">
          {loading && <p className="lf-note">Memuat cerita…</p>}
          {!loading && posts.length === 0 && (
            <p className="lf-note">Belum ada cerita di kategori ini. Kamu bisa jadi yang pertama berbagi di Spill.</p>
          )}
          {posts.map((p) => (
            <div className="lf-row" key={p.id}>
              <div>
                <small>{p.isAnonymous ? 'Anonim' : 'Pengguna'} · {new Date(p.createdAt).toLocaleDateString('id-ID')}</small>
                <p>{p.content}</p>
              </div>
            </div>
          ))}
        </div>
        <p className="lf-note">Hanya cerita publik yang sudah disamarkan. Identitas asli tidak pernah ditampilkan.</p>
      </section>
    </>
  );
}

function MentalArmor() {
  const [me, setMe] = useState<{ username: string } | null>(null);
  const [stats, setStats] = useState<UserStats | null>(null);

  useEffect(() => {
    Promise.all([authMe(), getMyStats()]).then(([u, s]) => {
      setMe(u); setStats(s);
    }).catch(() => { setMe(null); setStats(null); });
  }, []);

  const name = [
    'Rapuh', 'Tahan Banting', 'Kebal Revisi', 'Kebal PHP HRD', 'Suhu Spill',
  ][Math.min(4, Math.max(0, (stats?.mentalLevel ?? 1) - 1))];

  return (
    <section className="lf-card">
      <h2>Perjalananmu, bukan peringkat</h2>
      {!me ? (
        <>
          <p className="lf-note">Masuk untuk melihat ringkasan perjalananmu. Identitas tetap anonim di publik.</p>
          <Link className="lf-btn" href="/app">Masuk</Link>
        </>
      ) : (
        <>
          <div className="lf-grid">
            <div className="lf-tile"><span className="em">♛</span><div><b>Level {stats?.mentalLevel ?? 1} · {name}</b><small>Dihitung dari proses, bukan popularitas.</small></div></div>
            <div className="lf-tile"><span className="em">✎</span><div><b>{stats?.posts ?? 0} cerita dibagikan</b><small>Setiap cerita jujur adalah langkah.</small></div></div>
            <div className="lf-tile"><span className="em">🫂</span><div><b>{stats?.mentalXp ?? 0} poin refleksi</b><small>Ini bukan skor kesehatan mental.</small></div></div>
            <div className="lf-tile"><span className="em">🌱</span><div><b>Tanpa ranking</b><small>Tidak ada peringkat publik atau kompetisi.</small></div></div>
          </div>
          <p className="lf-note">Mental Armor menghargai ketahanan dan usaha kecil. Bukan alat mengukur nilai dirimu.</p>
        </>
      )}
    </section>
  );
}

interface ComebackEntry { id: string; date: string; note: string; createdAt: string }

function ComebackJourney() {
  const [note, setNote] = useState('');
  const [entries, setEntries] = useState<ComebackEntry[]>([]);
  useEffect(() => { setEntries(load<ComebackEntry[]>('unlinkedplus_comeback', [])); }, []);
  const add = () => {
    if (!note.trim()) return;
    const next = [{ id: crypto.randomUUID(), date: today(), note: note.trim(), createdAt: new Date().toISOString() }, ...entries];
    setEntries(next); save('unlinkedplus_comeback', next); setNote('');
  };
  return (
    <>
      <section className="lf-card">
        <h2>Tulis langkah hari ini</h2>
        <p className="lf-note">Privat. Hanya kamu yang bisa melihatnya di perangkat ini.</p>
        <textarea className="lf-input" rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Hari ini saya mencoba lagi dengan…" />
        <button className="lf-btn" onClick={add}>Simpan langkah</button>
      </section>
      <section className="lf-card">
        <h2>Jurnal bangkit</h2>
        <div className="lf-list">
          {entries.length === 0 && <p className="lf-note">Belum ada langkah. Mulai dari yang paling kecil.</p>}
          {entries.map((e, i) => (
            <div className="lf-row" key={e.id}>
              <div>
                <small>Hari {entries.length - i} · {e.date}</small>
                <p>{e.note}</p>
              </div>
              <button className="lf-btn" onClick={() => {
                const next = entries.filter((x) => x.id !== e.id);
                setEntries(next); save('unlinkedplus_comeback', next);
              }}>Hapus</button>
            </div>
          ))}
        </div>
        <p className="lf-note">Tidak perlu memamerkan keberhasilan. Prosesnya sudah cukup berharga.</p>
      </section>
    </>
  );
}
