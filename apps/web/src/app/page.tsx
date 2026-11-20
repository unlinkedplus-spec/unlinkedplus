import Link from 'next/link';
import BrandMascot from '../components/BrandMascot';
import NavIcon, { type NavIconName } from '../components/NavIcon';
import WaitlistForm from '../components/WaitlistForm';

const LANDING_NAV: { icon: NavIconName; label: string; href: string }[] = [
  { icon: 'home',   label: 'Beranda', href: '/app' },
  { icon: 'pen',    label: 'Spill',   href: '/app?tab=spill' },
  { icon: 'avatar', label: 'Avatar',  href: '/app?tab=avatar' },
  { icon: 'store',  label: 'Toko',    href: '/app?tab=shop' },
  { icon: 'profile', label: 'Profil', href: '/app?tab=profile' },
];

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-background text-navy">
      {/* Navbar */}
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-sunshine/30">
            <BrandMascot size={36} float={false} />
          </div>
          <div>
            <span className="font-display text-2xl font-black text-navy">
              unlinked<span className="text-primary">+</span>
            </span>
            <p className="mt-0.5 text-[11px] font-semibold text-navy/50">Less Flex. More Human.</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/app" className="text-sm font-semibold text-navy transition hover:text-navy/70">
            Masuk
          </Link>
          <Link href="/app?tab=spill" className="focus-ring rounded-full bg-navy px-5 py-2 text-sm font-bold text-white shadow-pop transition hover:-translate-y-0.5 hover:bg-navy/90">
            Gabung sekarang →
          </Link>
        </div>
      </nav>

      {/* Hero — expressive, mascot-led, anti-corporate */}
      <section className="relative mx-auto mb-8 mt-4 max-w-7xl overflow-hidden rounded-[36px] bg-navy px-6 py-10 text-cream shadow-soft md:px-12 md:py-14">
        <div className="absolute -right-16 -top-24 h-72 w-72 rounded-full bg-lavender/30 blur-2xl" />
        <div className="absolute -bottom-24 left-1/3 h-64 w-64 rounded-full bg-sunshine/20 blur-3xl" />
        <div className="absolute right-8 top-8 hidden h-16 w-16 rotate-12 rounded-3xl border border-sunshine/40 md:block" />
        <div className="relative flex flex-col items-center gap-10 md:flex-row md:gap-14">
          <div className="flex-1">
            <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-sunshine/40 bg-sunshine/10 px-3 py-1.5 text-[11px] font-black uppercase tracking-widest text-sunshine">
              <NavIcon name="sparkles" size={13} /> Anti-LinkedIn meets Gen Z Community
            </p>
            <h1 className="mb-5 font-display text-4xl font-black leading-[1.08] md:text-6xl">
              LinkedIn buat kamu yang{' '}
              <span className="relative inline-block text-sunshine">
                lagi gagal
                <span className="absolute -bottom-1 left-0 h-2 w-full rounded-full bg-lavender/70" />
              </span>
              .
            </h1>
            <p className="mb-7 max-w-xl text-sm leading-relaxed text-cream/80 md:text-base">
              Capek lihat orang pamer pencapaian? Di sini nggak apa-apa kalau ceritamu belum berakhir indah. Taruh bebanmu, pelan-pelan juga sampai.
            </p>
            <div className="mb-5 flex flex-wrap items-center gap-3">
              <WaitlistForm mode="hero" />
              <Link href="/app?tab=spill" className="focus-ring rounded-full border border-cream/30 bg-cream/10 px-6 py-3 text-sm font-bold text-cream transition hover:bg-cream/20">
                Spill sekarang
              </Link>
              <Link href="/app" className="text-sm font-semibold text-cream/70 underline decoration-lavender decoration-2 underline-offset-4 transition hover:text-cream">
                Baca cerita dulu
              </Link>
            </div>
            <p className="text-xs text-cream/60">Pakai nama samaran. Bukan nama jabatan.</p>
          </div>

          <div className="relative flex shrink-0 items-center justify-center py-6 md:py-0">
            <BrandMascot size={260} bubble="Hari berat? Taruh dulu di sini. 💙" />
          </div>
        </div>
      </section>

      {/* Divider — brand promises kept verbatim */}
      <div className="mx-auto mb-8 flex max-w-7xl flex-wrap items-center gap-4 px-6 text-sm font-bold text-navy/60">
        <span>Memutus yang Toksik</span>
        <span className="text-lg text-primary">+</span>
        <span>Menambah yang Esensial</span>
      </div>

      {/* 3-Column Layout */}
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 px-6 pb-12 lg:grid-cols-12">
        {/* Left Sidebar - RUANG KAMU */}
        <aside className="surface-card p-6 lg:col-span-3">
          <div className="mb-6 flex items-center gap-3">
            <BrandMascot size={48} float={false} />
            <div>
              <h3 className="font-display text-sm font-black text-navy">RUANG KAMU</h3>
              <p className="text-[10px] text-navy/45">Tempat tanpa penilaian.</p>
            </div>
          </div>
          <nav className="space-y-1.5">
            {LANDING_NAV.map((item, index) => (
              <Link
                key={item.label}
                href={item.href}
                className={`focus-ring flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold transition-all hover:-translate-y-0.5 ${
                  index === 0
                    ? 'bg-lavender/25 text-navy shadow-sm'
                    : 'text-navy/60 hover:bg-cream hover:text-navy'
                }`}
              >
                <span className={`flex h-8 w-8 items-center justify-center rounded-xl ${index === 0 ? 'bg-navy text-sunshine' : 'bg-cream text-navy/60'}`}>
                  <NavIcon name={item.icon} size={17} />
                </span>
                {item.label}
                {index === 0 && <span className="ml-auto h-2 w-2 rounded-full bg-sunshine" />}
              </Link>
            ))}
          </nav>
          <div className="mt-8 border-t border-navy/10 pt-6">
            <p className="text-xs font-bold text-navy/50">Pelan-pelan juga sampai.</p>
            <p className="mt-1 text-[10px] text-navy/35">
              Tidak semua hal harus jadi pencapaian hari ini.
            </p>
          </div>
        </aside>

        {/* Main Content - RUANG CERITA KITA */}
        <main className="lg:col-span-6">
          <div className="surface-card p-6">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="font-display text-xl font-black text-navy">Hari ini, apa adanya.</h2>
              <Link href="/app" className="focus-ring rounded-xl border border-navy/15 px-3 py-1.5 text-xs font-bold text-navy transition hover:bg-cream">
                ↻ Lihat cerita terbaru
              </Link>
            </div>

            <div className="mb-6 rounded-2xl border border-lavender/40 bg-cream p-4">
              <div className="flex items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sunshine/40">
                  <NavIcon name="pen" size={18} />
                </span>
                <div>
                  <p className="text-sm font-bold text-navy">Ada yang mau kamu ceritakan?</p>
                  <p className="mt-0.5 text-xs text-navy/55">Taruh bebanmu sebentar di sini.</p>
                </div>
              </div>
            </div>

            <div className="py-10 text-center">
              <div className="mb-4 flex justify-center"><BrandMascot size={84} /></div>
              <h3 className="mb-2 font-display text-lg font-black text-navy">Belum ada spill di sini.</h3>
              <p className="mx-auto mb-6 max-w-xs text-sm text-navy/50">
                Tidak harus punya cerita hebat. Hari yang berat juga layak didengar.
              </p>
              <Link href="/app?tab=spill" className="focus-ring mx-auto flex w-fit items-center gap-2 rounded-full bg-sunshine px-6 py-2.5 text-sm font-black text-navy shadow-pop transition hover:-translate-y-0.5">
                <NavIcon name="pen" size={16} /> Tulis cerita pertama
              </Link>
            </div>
          </div>
        </main>

        {/* Right Sidebar - PENGINGAT KECIL */}
        <aside className="lg:col-span-3">
          <div className="surface-card mb-6 overflow-hidden p-5">
            <div className="mb-3 flex items-center gap-2">
              <BrandMascot size={44} float={false} />
              <h3 className="font-display text-sm font-black text-navy">PENGINGAT KECIL</h3>
            </div>
            <p className="mb-4 text-xs leading-relaxed text-navy/70">
              Kamu bukan CV-mu. Kamu manusia utuh, bahkan ketika karier sedang berantakan.
            </p>
            <div className="text-[10px] font-bold text-navy/50">— unlinked+</div>
          </div>

          <div className="surface-card p-5">
            <h4 className="mb-3 font-display text-sm font-black text-navy">Di sini, kita...</h4>
            <ul className="space-y-2 text-xs text-navy/60">
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
      <footer className="px-6 py-8 text-center text-sm text-navy/40">
        <p>© 2025 unlinked+ — Dibuat dengan ❤️ dan banyak rejected offer letters.</p>
      </footer>
    </main>
  );
}
