import WaitlistForm from '../components/WaitlistForm';

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-background text-navy">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 max-w-5xl mx-auto">
        <span className="font-display font-black text-2xl text-navy">
          unlinked<span className="text-primary">+</span>
        </span>
        <WaitlistForm mode="nav" />
      </nav>

      {/* Hero */}
      <section className="bg-gradient-to-br from-primary via-yellow-300 to-accent py-20 px-6 text-center">
        <div className="max-w-2xl mx-auto">
          <h1 className="font-display font-black text-4xl md:text-6xl text-navy leading-tight mb-4">
            Gagal itu manusiawi.<br />
            <span className="text-white">Pamernya yang ngga.</span>
          </h1>
          <p className="text-navy/80 text-lg md:text-xl mb-8 font-medium">
            Spill cerita gagalmu. Dapet reaksi empati. Naik level mental.
            <br />Tanpa flex. Tanpa topeng.
          </p>

          {/* Character strip */}
          <div className="flex justify-center gap-2 mb-8">
            {(['panda','intern','php-victim','freelancer'] as const).map((id) => (
              <div key={id} className="w-16 h-16 bg-white/30 rounded-2xl flex items-center justify-center overflow-hidden">
                <svg viewBox="0 0 300 300" width="64" height="64" aria-hidden="true">
                  <CharacterPreview id={id} />
                </svg>
              </div>
            ))}
          </div>

          <WaitlistForm mode="hero" />
        </div>
      </section>

      {/* Certificate preview */}
      <section className="py-16 px-6 bg-white">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="font-display font-black text-3xl text-navy mb-4">
            Sertifikat Gagal Resmi™
          </h2>
          <p className="text-gray-600 mb-8">
            Setiap spill bisa jadi sertifikat yang bisa kamu download dan kirim ke HRD.
          </p>
          <div className="inline-block bg-primary rounded-2xl px-10 py-8 text-navy border-4 border-navy shadow-xl">
            <div className="text-xs font-bold uppercase tracking-widest mb-2 opacity-60">Sertifikat Ketahanan Mental</div>
            <div className="font-display font-black text-2xl mb-1">unlinked+</div>
            <div className="text-sm mb-4 opacity-80">menyatakan bahwa</div>
            <div className="font-bold text-xl mb-4">BudakKantor_XXXX</div>
            <div className="text-sm italic opacity-70 max-w-xs">
              &ldquo;Ngirim CV 100x, dapet ghosting 100x, tetap semangat 100x.&rdquo;
            </div>
            <div className="mt-4 text-xs opacity-50">Level 3 · Kebal Revisi</div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 px-6 bg-background">
        <div className="max-w-4xl mx-auto">
          <h2 className="font-display font-black text-3xl text-navy text-center mb-12">
            Kenapa unlinked+?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {FEATURES.map((f) => (
              <div key={f.title} className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                <div className="text-4xl mb-4">{f.icon}</div>
                <h3 className="font-display font-bold text-lg text-navy mb-2">{f.title}</h3>
                <p className="text-gray-600 text-sm">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Manifesto */}
      <section className="py-16 px-6 bg-navy text-white text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="font-display font-black text-3xl mb-6">Manifesto Kami</h2>
          <p className="text-white/80 leading-relaxed">
            LinkedIn penuh orang yang &ldquo;humbled and honored&rdquo;. unlinked+ adalah tempatnya
            orang yang jujur. Gagal ngelamar? Spill. Dimarahi bos? Cerita. Bisnis boncos? Share.
            Karena jatuh bersama lebih ringan dari pura-pura terbang sendirian.
          </p>
          <p className="mt-6 font-display font-black text-primary text-xl">
            No Flex. Just Human.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6 text-center text-gray-400 text-sm">
        <p>© 2025 unlinked+ — Dibuat dengan ❤️ dan banyak rejected offer letters.</p>
      </footer>
    </main>
  );
}

const FEATURES = [
  {
    icon: '🛡️',
    title: 'Anti-Flex Sensor',
    desc: 'Sensor otomatis blokir konten pamer. Disini cuma boleh cerita gagal, bukan prestasi.',
  },
  {
    icon: '🧠',
    title: 'Mental XP System',
    desc: 'Dapet reaksi empati dari komunitas = naik level mental. Dari Rapuh sampai Suhu Spill.',
  },
  {
    icon: '🎭',
    title: 'Avatar Anonim',
    desc: 'Pilih karakter & aksesori. Spill tanpa takut dikenali atasan atau mantan.',
  },
];

// Tiny inline SVG previews for hero strip
function CharacterPreview({ id }: { id: string }) {
  const heads: Record<string, string> = {
    panda: '<circle cx="150" cy="115" r="65" fill="#FDDCB0"/><ellipse cx="127" cy="120" rx="17" ry="9" fill="#1A1A1A" opacity="0.32"/><ellipse cx="173" cy="120" rx="17" ry="9" fill="#1A1A1A" opacity="0.32"/>',
    intern: '<circle cx="150" cy="115" r="65" fill="#FFE0B2"/><rect x="100" y="58" width="100" height="40" rx="20" fill="#4A3728"/>',
    'php-victim': '<circle cx="150" cy="115" r="65" fill="#FDDCB0"/><path d="M87,105 Q95,55 150,52 Q200,55 212,100" fill="none" stroke="#5C4033" stroke-width="4"/>',
    freelancer: '<circle cx="150" cy="115" r="65" fill="#FFE0B2"/><path d="M85,115 Q82,65 110,52 Q150,45 190,52 Q218,65 215,110" fill="#2D2D2D"/>',
  };
  return (
    <g dangerouslySetInnerHTML={{ __html: heads[id] ?? heads.panda }} />
  );
}
