import WaitlistForm from '../components/WaitlistForm';
import { buildAvatarSVG } from '../lib/avatar-svg';

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-background text-navy">
      {/* Navbar */}
      <nav className="flex items-center justify-between px-6 py-4 max-w-7xl mx-auto">
        <div>
          <span className="font-display font-black text-2xl text-navy">
            unlinked<span className="text-primary">+</span>
          </span>
          <p className="text-xs text-gray-500 mt-0.5">Less Flex. More Human.</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="text-sm font-medium text-navy hover:text-navy/80 transition">
            Masuk
          </button>
          <button className="bg-navy text-white text-sm font-bold px-5 py-2 rounded-full hover:bg-navy/90 transition">
            Gabung sekarang →
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="bg-primary/20 rounded-3xl mx-6 mt-6 mb-8 p-8 md:p-12 max-w-7xl mx-auto flex flex-col md:flex-row items-center gap-8">
        <div className="flex-1">
          <p className="text-xs font-bold text-navy/70 uppercase tracking-widest mb-3">
            KARIER BOLEH BERANTAKAN. KAMU TETAP BERHARGA.
          </p>
          <h1 className="font-display font-black text-3xl md:text-5xl text-navy leading-tight mb-4">
            LinkedIn untuk orang yang lagi gagal.
          </h1>
          <p className="text-navy/80 text-sm md:text-base mb-6 max-w-lg">
            Capek lihat orang pamer pencapaian di sebelah? Di sini, nggak apa-apa kalau ceritamu belum berakhir indah.
          </p>
          <div className="flex flex-wrap gap-3 mb-4">
            <button className="bg-navy text-white font-bold px-6 py-3 rounded-full text-sm hover:bg-navy/90 transition">
              Gabung, jadi diri sendiri →
            </button>
            <button className="bg-white text-navy font-bold px-6 py-3 rounded-full text-sm border border-navy/20 hover:bg-gray-50 transition">
              Baca cerita dulu
            </button>
          </div>
          <p className="text-xs text-navy/60">
            Pakai nama samaran. Bukan nama jabatan.
          </p>
        </div>
        <div className="w-48 h-48 md:w-64 md:h-64 shrink-0 relative">
          <svg viewBox="0 0 300 300" className="w-full h-full" aria-hidden="true">
            <g dangerouslySetInnerHTML={{ __html: buildAvatarSVG({ character: 'panda', accessories: [] }) }} />
          </svg>
          <div className="absolute -top-4 -right-4 bg-white rounded-2xl px-4 py-2 shadow-lg text-xs font-medium text-navy">
            Hari berat? Taruh dulu di sini. 💙
          </div>
          <div className="absolute -bottom-4 -left-4 bg-white rounded-2xl px-4 py-2 shadow-lg text-xs font-medium text-navy">
            Nggak harus sukses untuk punya cerita. ❤️
          </div>
        </div>
      </section>

      {/* Divider */}
      <div className="max-w-7xl mx-auto px-6 mb-8 flex items-center gap-4 text-sm font-medium text-navy/60">
        <span>Memutus yang Toksik</span>
        <span className="text-primary text-lg">+</span>
        <span>Menambah yang Esensial</span>
      </div>

      {/* 3-Column Layout */}
      <div className="max-w-7xl mx-auto px-6 pb-12 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Sidebar - RUANG KAMU */}
        <aside className="lg:col-span-3 bg-white rounded-2xl p-6 border border-gray-100">
          <h3 className="font-display font-bold text-sm text-navy mb-4">RUANG KAMU</h3>
          <nav className="space-y-2">
            {[
              { id: 'beranda', icon: '🏠', label: 'Beranda', active: true },
              { id: 'spill', icon: '✍️', label: 'Spill', active: false },
              { id: 'avatar', icon: '🧑‍💼', label: 'Avatar', active: false },
              { id: 'toko', icon: '🛒', label: 'Toko', active: false },
              { id: 'profil', icon: '👤', label: 'Profil', active: false },
            ].map((item) => (
              <button
                key={item.id}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition w-full text-left ${
                  item.active
                    ? 'bg-primary/10 text-navy'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <span className="text-lg">{item.icon}</span>
                <span>{item.label}</span>
                {item.active && <span className="ml-auto w-2 h-2 rounded-full bg-primary" />}
              </button>
            ))}
          </nav>
          <div className="mt-8 pt-6 border-t border-gray-100">
            <p className="text-xs text-gray-400 font-medium">Pelan-pelan juga sampai.</p>
            <p className="text-[10px] text-gray-300 mt-1">
              Tidak semua hal harus jadi pencapaian hari ini.
            </p>
          </div>
        </aside>

        {/* Main Content - RUANG CERITA KITA */}
        <main className="lg:col-span-6">
          <div className="bg-white rounded-2xl p-6 border border-gray-100">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-display font-black text-xl text-navy">Hari ini, apa adanya.</h2>
              <button className="text-xs text-navy border border-navy/20 px-3 py-1.5 rounded-lg hover:bg-navy/5 transition">
                ↻ Muat ulang
              </button>
            </div>

            {/* Input area */}
            <div className="bg-background rounded-xl p-4 mb-6 border border-gray-200">
              <div className="flex items-start gap-3">
                <span className="text-xl">✏️</span>
                <div className="flex-1">
                  <p className="text-sm text-navy/70">
                    Ada yang mau kamu ceritakan? Taruh bebanmu sebentar di sini.
                  </p>
                </div>
              </div>
            </div>

            {/* Empty state */}
            <div className="text-center py-12">
              <div className="text-4xl mb-4">💔</div>
              <h3 className="font-display font-bold text-lg text-navy mb-2">Belum ada spill di sini.</h3>
              <p className="text-sm text-gray-500 mb-6 max-w-xs mx-auto">
                Tidak harus punya cerita hebat. Hari yang berat juga layak didengar.
              </p>
              <button className="bg-primary text-navy font-bold px-6 py-2.5 rounded-full text-sm hover:bg-primary/90 transition flex items-center gap-2 mx-auto">
                <span>✏️</span>
                <span>Tulis cerita pertama</span>
              </button>
            </div>
          </div>
        </main>

        {/* Right Sidebar - PENGINGAT KECIL */}
        <aside className="lg:col-span-3">
          <div className="bg-primary/10 rounded-2xl p-5 mb-6">
            <h3 className="font-display font-bold text-sm text-navy mb-3">PENGINGAT KECIL</h3>
            <p className="text-xs text-navy/80 mb-4">
              Kamu bukan CV-mu. Kamu manusia utuh, bahkan ketika karier sedang berantakan.
            </p>
            <div className="text-[10px] text-navy/60 font-medium">
              — unlinked+
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-gray-100">
            <h4 className="font-display font-bold text-sm text-navy mb-3">Di sini, kita...</h4>
            <ul className="text-xs text-gray-600 space-y-2">
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                <span>Saling dukung. Bukan saling adu nasib.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                <span>Jujur & apa adanya. Tanpa panggung pencapaian.</span>
              </li>
            </ul>
          </div>
        </aside>
      </div>

      {/* Footer */}
      <footer className="py-8 px-6 text-center text-gray-400 text-sm">
        <p>© 2025 unlinked+ — Dibuat dengan ❤️ dan banyak rejected offer letters.</p>
      </footer>
    </main>
  );
}
