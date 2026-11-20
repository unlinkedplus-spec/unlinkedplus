'use client';

/** Internal feature pages rendered inside the mockup's topbar + sidebar chrome. */
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { buildAvatarSVG } from '../lib/avatar-svg';
import PollCard from './PollCard';
import ShopModal from './ShopModal';
import CreatePost from './CreatePost';
import AvatarBuilder from './AvatarBuilder';
import ProfileTab from './ProfileTab';
import AuthModal from './AuthModal';
import type { Post } from '../lib/types';

export type FeatureSlug =
  | 'poll' | 'personality-test' | 'meme-studio'
  | 'store' | 'toko' | 'opportunity-board' | 'mental-reset'
  | 'spill' | 'avatar' | 'profil';

const META: Record<FeatureSlug, { title: string; kicker: string; desc: string }> = {
  poll: { title: 'Poll', kicker: 'REALITY CHECK', desc: 'Polling komunitas tentang hal-hal yang sering kita alami, bukan sekadar angka.' },
  'personality-test': { title: 'Personality Test', kicker: 'KENALAN LAGI', desc: 'Temukan archetype kamu. Bukan diagnosis, bukan penilaian—cuma cara bercanda dengan keadaan.' },
  'meme-studio': { title: 'Meme Studio', kicker: 'KREASI KECIL', desc: 'Buat kartu meme dari avatar unlinked+ kamu. Simpan sebagai SVG dan bagikan.' },
  store: { title: 'Store', kicker: 'AVATAR & STORE', desc: 'Koleksi aksesori untuk mengekspresikan diri. Pembayaran masih simulasi.' },
  toko: { title: 'Toko', kicker: 'AVATAR & STORE', desc: 'Koleksi aksesori untuk mengekspresikan diri. Pembayaran masih simulasi.' },
  'opportunity-board': { title: 'Opportunity Board', kicker: 'PELUANG TERVERIFIKASI', desc: 'Lowongan dan pelatihan hanya ditampilkan setelah verifikasi.' },
  'mental-reset': { title: 'Mental Reset', kicker: 'JEDA SEBENTAR', desc: 'Latihan napas sederhana untuk mengisi ulang energi. Bukan pengganti bantuan profesional.' },
  spill: { title: 'Spill', kicker: 'RUANG CERITA KITA', desc: 'Tulis cerita dengan mode yang kamu pilih sendiri. Pemilik Spill yang menentukan caranya dibaca.' },
  avatar: { title: 'Avatar', kicker: 'EKSPRESIKAN DIRI', desc: 'Rakit avatar kecil yang mewakili perasaanmu hari ini—bukan pencapaianmu.' },
  profil: { title: 'Profil', kicker: 'RUANG KAMU', desc: 'Profil, level, dan cerita kamu. Keluar dari sini kapan saja.' },
};

const QUIZ: Array<{
  q: string;
  a: Array<{ label: string; score: Record<string, number> }>;
}> = [
  {
    q: 'Interview kamu ditolak. Apa yang kamu lakukan?',
    a: [
      { label: 'Diam sebentar, lalu buka lowongan lagi', score: { comeback: 2 } },
      { label: 'Overthink sampai lupa makan', score: { overthink: 2 } },
      { label: 'Tawa-in saja, besok coba lagi', score: { laugh: 2 } },
    ],
  },
  {
    q: 'Deadline mepet. Kamu…',
    a: [
      { label: 'Bikin daftar kecil dan jalan pelan-pelan', score: { comeback: 2 } },
      { label: 'Buka 12 tab lalu bingung mulai dari mana', score: { overthink: 2 } },
      { label: 'Nulis meme tentang deadline', score: { laugh: 2 } },
    ],
  },
  {
    q: 'Hari ini energi kamu?',
    a: [
      { label: 'Cukup untuk satu langkah kecil', score: { comeback: 2 } },
      { label: 'Tapi otak tetap jalan terus', score: { overthink: 2 } },
      { label: 'Mau istirahat dulu, gapapa', score: { laugh: 2 } },
    ],
  },
];

const RESULTS: Record<string, { title: string; text: string }> = {
  comeback: { title: 'Comeback Loading', text: 'Kamu pelan-pelan bangkit. Langkah kecil kamu dihitung, bukan hasil akhirnya.' },
  overthink: { title: 'Professional Overthinker', text: 'Otakmu sibuk sekali. Istirahat juga bagian dari proses, bukan kegagalan.' },
  laugh: { title: 'Rejected But Still Trying', text: 'Kamu masih bisa tertawa sambil mencoba lagi. Itu bentuk kekuatan juga.' },
};

function escapeXml(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

const W = 1536;
const H = 1024;

export default function FeaturePage({ slug, authenticated }: { slug: FeatureSlug; authenticated: boolean }) {
  const [scale, setScale] = useState(1);
  const [authOpen, setAuthOpen] = useState(false);
  const [created, setCreated] = useState<Post | null>(null);
  const [savedAvatar, setSavedAvatar] = useState(false);
  const meta = META[slug];

  useEffect(() => {
    const fit = () => setScale(Math.min(1, window.innerWidth / W));
    fit();
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, []);

  const body = useMemo(() => {
    if (slug === 'poll') {
      return <PollCard loggedIn={authenticated} onAuthRequired={() => setAuthOpen(true)} />;
    }
    if (slug === 'store' || slug === 'toko') {
      return <ShopModal onClose={() => { window.location.href = '/'; }} />;
    }
    if (slug === 'spill') {
      if (!authenticated) {
        return (
          <div className="fp-card">
            <div className="fp-big">Masuk dulu untuk menulis Spill.</div>
            <p className="fp-muted">Cerita kamu tetap bisa ditulis dengan nama samaran. Identitas asli tidak diperlukan.</p>
            <button className="fp-btn" onClick={() => setAuthOpen(true)}>Masuk / Daftar</button>
          </div>
        );
      }
      return (
        <div>
          <CreatePost loggedIn onAuthRequired={() => setAuthOpen(true)} onCreated={(p) => setCreated(p)} />
          {created && (
            <div className="fp-card">
              <b>Spill tersimpan.</b>
              <p className="fp-muted" style={{ marginTop: 8 }}>{created.content}</p>
              <Link className="fp-back" href="/">← Lihat di Beranda</Link>
            </div>
          )}
        </div>
      );
    }
    if (slug === 'avatar') {
      if (!authenticated) {
        return (
          <div className="fp-card">
            <div className="fp-big">Masuk dulu untuk menyimpan avatar.</div>
            <button className="fp-btn" onClick={() => setAuthOpen(true)}>Masuk / Daftar</button>
          </div>
        );
      }
      return (
        <div>
          <AvatarBuilder onSaved={() => setSavedAvatar(true)} />
          {savedAvatar && <p className="fp-note">Avatar tersimpan. Kembali ke Beranda untuk melihatnya.</p>}
        </div>
      );
    }
    if (slug === 'profil') {
      if (!authenticated) {
        return (
          <div className="fp-card">
            <div className="fp-big">Masuk untuk melihat profil kamu.</div>
            <button className="fp-btn" onClick={() => setAuthOpen(true)}>Masuk / Daftar</button>
          </div>
        );
      }
      return <ProfileTab onLogout={() => { window.location.href = '/'; }} />;
    }
    if (slug === 'opportunity-board') {
      return (
        <div className="fp-card">
          <div className="fp-big">Belum ada lowongan terverifikasi.</div>
          <p className="fp-muted">
            Kami tidak menampilkan lowongan atau pelatihan sebelum kualitas dan penjualnya diverifikasi.
            Ini untuk menjaga kepercayaan komunitas—bukan menunggu “nanti saja”.
          </p>
          <p className="fp-note">Status: menunggu proses verifikasi. Tidak ada data contoh yang ditampilkan sebagai lowongan nyata.</p>
        </div>
      );
    }
    return null;
  }, [slug, authenticated]);

  return (
    <div className="fp-root">
      <style jsx global>{`
        .fp-root{background:#F7F8FE;min-height:100vh;display:flex;justify-content:center;overflow-x:hidden;font-family:Inter,sans-serif;color:#172B4D}
        .fp-stage{position:relative;width:${W * scale}px;height:${H * scale}px;flex:none}
        .fp-canvas{position:absolute;left:0;top:0;width:${W}px;height:${H}px;transform-origin:top left;transform:scale(${scale})}
        .fp-top{position:absolute;left:0;top:0;width:1536px;height:82px;background:url('/images/dash/chrome-top.png') center/1536px 82px no-repeat}
        .fp-side{position:absolute;left:0;top:82px;width:245px;height:942px;background:url('/images/dash/chrome-side.png') top left/245px 942px no-repeat}
        .fp-hit{position:absolute;display:block;background:transparent;border:0;padding:0;cursor:pointer}
        .fp-panel{position:absolute;left:265px;top:100px;width:1255px;min-height:760px;background:#fff;border:1px solid #EDEFF6;border-radius:20px;padding:28px 32px}
        .fp-kicker{font:800 11px Nunito,sans-serif;letter-spacing:1px;color:#6A7590;margin:0 0 8px}
        .fp-title{font:900 30px Nunito,sans-serif;letter-spacing:-1px;margin:0 0 8px}
        .fp-desc{font-size:13px;line-height:1.6;color:#5A6484;margin:0 0 24px;max-width:720px}
        .fp-back{display:inline-flex;align-items:center;gap:8px;font-size:12px;font-weight:700;color:#3F6BC7;text-decoration:none;margin-bottom:18px}
        .fp-card{background:#fff;border:1px solid #EDEFF6;border-radius:16px;padding:22px;max-width:820px;margin-bottom:14px}
        .fp-big{font:900 19px Nunito,sans-serif;margin-bottom:10px}
        .fp-muted{font-size:13px;line-height:1.65;color:#5A6484;margin:0 0 10px}
        .fp-note{font-size:11px;color:#8A94AD;background:#F7F8FE;border-radius:10px;padding:10px 12px;margin-top:14px}
        .fp-choices{display:flex;flex-direction:column;gap:10px;max-width:680px}
        .fp-choice{text-align:left;border:1px solid #E6E9F4;background:#F9FAFF;border-radius:12px;padding:13px 16px;font-size:13px;font-weight:600;color:#2E3D5C;cursor:pointer}
        .fp-choice:hover{border-color:#F5C542;background:#FFFBEC}
        .fp-progress{font-size:11px;color:#8A94AD;margin-bottom:12px}
        .fp-result{background:linear-gradient(120deg,#FFF3D4,#F2EDFF);border-radius:16px;padding:22px;max-width:680px}
        .fp-result b{font:900 24px Nunito,sans-serif;display:block;margin-bottom:8px}
        .fp-input{width:100%;border:1px solid #E6E9F4;border-radius:12px;padding:12px 14px;font-size:13px;margin-bottom:12px;outline:0}
        .fp-preview{background:#FFF3D4;border-radius:16px;padding:18px;max-width:520px;display:flex;flex-direction:column;align-items:center;gap:12px}
        .fp-preview svg{width:280px;height:230px}
        .fp-caption{font:900 20px Nunito,sans-serif;text-align:center;color:#172B4D}
        .fp-btn{background:#F5C542;border:0;border-radius:999px;padding:11px 20px;font:800 12px Inter,sans-serif;color:#172B4D;cursor:pointer}
        .fp-nav{position:absolute;color:transparent;font-size:0}
      `}</style>
      <div className="fp-stage">
        <div className="fp-canvas">
          <div className="fp-top" />
          <div className="fp-side" />
          <Link className="fp-hit fp-nav" style={{ left: 24, top: 8, width: 240, height: 56 }} href="/" aria-label="Beranda" />
          <Link className="fp-hit fp-nav" style={{ left: 24, top: 144, width: 208, height: 46 }} href="/" aria-label="Discover" />
          <Link className="fp-hit fp-nav" style={{ left: 24, top: 194, width: 208, height: 46 }} href="/features/spill" aria-label="Spill" />
          <Link className="fp-hit fp-nav" style={{ left: 24, top: 244, width: 208, height: 46 }} href="/" aria-label="Komunitas" />
          <Link className="fp-hit fp-nav" style={{ left: 24, top: 294, width: 208, height: 46 }} href="/features/profil" aria-label="Profil" />
          {[
            ['poll', 374], ['personality-test', 424], ['meme-studio', 474],
            ['store', 524], ['opportunity-board', 574], ['mental-reset', 624],
          ].map(([s, top]) => (
            <Link key={s as string} className="fp-hit fp-nav" style={{ left: 24, top: top as number, width: 208, height: 44 }}
              href={`/features/${s}`} aria-label={String(s)} />
          ))}
          <div className="fp-panel">
            <Link className="fp-back" href="/">← Kembali ke Beranda</Link>
            <p className="fp-kicker">{meta.kicker}</p>
            <h1 className="fp-title">{meta.title}</h1>
            <p className="fp-desc">{meta.desc}</p>
            {body}
            {slug === 'personality-test' && <PersonalityTest />}
            {slug === 'meme-studio' && <MemeStudio />}
            {slug === 'mental-reset' && <MentalReset />}
          </div>
        </div>
      </div>
      {authOpen && (
        <AuthModal onSuccess={() => { setAuthOpen(false); window.location.reload(); }} onClose={() => setAuthOpen(false)} defaultTab="login" />
      )}
    </div>
  );
}

function PersonalityTest() {
  const [step, setStep] = useState(0);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [done, setDone] = useState(false);
  const pick = (score: Record<string, number>) => {
    const next = { ...scores };
    for (const [k, v] of Object.entries(score)) next[k] = (next[k] ?? 0) + v;
    setScores(next);
    if (step + 1 >= QUIZ.length) setDone(true);
    else setStep(step + 1);
  };
  const reset = () => { setStep(0); setScores({}); setDone(false); };
  if (done) {
    const winner = Object.entries(scores).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'comeback';
    const r = RESULTS[winner] ?? RESULTS.comeback;
    return (
      <div className="fp-result">
        <b>{r.title}</b>
        <p className="fp-muted">{r.text}</p>
        <p className="fp-note">Ini permainan reflektif, bukan tes psikologi atau diagnosis.</p>
        <button className="fp-btn" onClick={reset} style={{ marginTop: 16 }}>Ulangi</button>
      </div>
    );
  }
  return (
    <div className="fp-card">
      <div className="fp-progress">Pertanyaan {step + 1} dari {QUIZ.length}</div>
      <div className="fp-big" style={{ fontSize: 17 }}>{QUIZ[step].q}</div>
      <div className="fp-choices">
        {QUIZ[step].a.map((a) => (
          <button key={a.label} className="fp-choice" onClick={() => pick(a.score)}>{a.label}</button>
        ))}
      </div>
    </div>
  );
}

function MemeStudio() {
  const [caption, setCaption] = useState('Masih coba, masih di sini.');
  const [saved, setSaved] = useState(false);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 500" width="600" height="500">
    <rect width="600" height="500" rx="28" fill="#FFF3D4"/>
    <circle cx="300" cy="215" r="175" fill="#F5C542" opacity="0.35"/>
    <g transform="translate(150,40) scale(1)">${buildAvatarSVG({ character: 'panda', accessories: [] })}</g>
    <text x="300" y="455" text-anchor="middle" font-family="Nunito, sans-serif" font-size="34" font-weight="900" fill="#172B4D">${escapeXml(caption)}</text>
  </svg>`;
  const download = () => {
    const blob = new Blob([svg], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'spill-card-unlinkedplus.svg';
    a.click();
    URL.revokeObjectURL(url);
    setSaved(true);
  };
  return (
    <div className="fp-card">
      <input className="fp-input" value={caption} onChange={(e) => { setCaption(e.target.value); setSaved(false); }} maxLength={60} aria-label="Teks kartu" />
      <div className="fp-preview" dangerouslySetInnerHTML={{ __html: svg }} />
      <button className="fp-btn" onClick={download} style={{ marginTop: 14 }}>Simpan kartu (SVG)</button>
      {saved && <p className="fp-note">Kartu tersimpan. Bagikan sesukamu—tanpa klaim pencapaian palsu.</p>}
    </div>
  );
}

function MentalReset() {
  const phases = [
    { name: 'Tarik napas', seconds: 4 },
    { name: 'Tahan', seconds: 7 },
    { name: 'Buang napas', seconds: 8 },
  ];
  const [running, setRunning] = useState(false);
  const [phase, setPhase] = useState(0);
  const [left, setLeft] = useState(phases[0].seconds);
  const [cycles, setCycles] = useState(0);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      setLeft((prev) => {
        if (prev > 1) return prev - 1;
        setPhase((p) => {
          const next = p + 1;
          if (next >= phases.length) { setCycles((c) => c + 1); return 0; }
          setLeft(phases[next].seconds);
          return next;
        });
        return phases[(phase + 1) % phases.length].seconds;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [running, phase]);

  return (
    <div className="fp-card">
      <div className="fp-big" style={{ fontSize: 22 }}>{running ? phases[phase].name : 'Siap jeda sebentar?'}</div>
      <p className="fp-muted">Ikuti hitungan: tarik 4 detik, tahan 7 detik, buang 8 detik. Ulangi seperlunya.</p>
      <div style={{ font: '900 64px Nunito', margin: '10px 0' }}>{running ? left : '4·7·8'}</div>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        <button className="fp-btn" onClick={() => setRunning(!running)}>{running ? 'Jeda' : 'Mulai'}</button>
        <button className="fp-choice" style={{ maxWidth: 140, padding: '9px 14px', fontSize: 12 }} onClick={() => { setRunning(false); setPhase(0); setLeft(4); }}>Reset</button>
        <span className="fp-muted" style={{ margin: 0 }}>Siklus selesai: {cycles}</span>
      </div>
      <p className="fp-note">Ini latihan napas sederhana, bukan penanganan medis atau pengganti bantuan profesional.</p>
    </div>
  );
}
