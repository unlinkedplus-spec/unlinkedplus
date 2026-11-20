'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { authMe } from '../../lib/api';
import type { Post, User } from '../../lib/types';
import BottomNav, { type TabId } from '../../components/BottomNav';
import BrandMascot from '../../components/BrandMascot';
import NavIcon, { type NavIconName } from '../../components/NavIcon';
import TrendingRail from '../../components/TrendingRail';
import FailFeed from '../../components/FailFeed';
import CreatePost from '../../components/CreatePost';
import AvatarBuilder from '../../components/AvatarBuilder';
import ShopModal from '../../components/ShopModal';
import ProfileTab from '../../components/ProfileTab';
import AuthModal from '../../components/AuthModal';
import PollCard from '../../components/PollCard';
import ConfessionWall from '../../components/ConfessionWall';
import { buildAvatarSVG } from '../../lib/avatar-svg';

export default function AppPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [checking, setChecking] = useState(true);
  const [activeSection, setActiveSection] = useState<'feed' | 'confession' | 'spill' | 'avatar' | 'shop' | 'profile'>('feed');
  const [authModal, setAuthModal] = useState(false);
  const [resetToken, setResetToken] = useState('');
  const [showShop, setShowShop] = useState(false);
  const [newPost, setNewPost] = useState<Post | null>(null);
  const [trendingTag, setTrendingTag] = useState('');

  const checkAuth = useCallback(async () => {
    try {
      const me = await authMe();
      setUser(me);
    } catch {
      setUser(null);
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => { void checkAuth(); }, [checkAuth]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('reset');
    if (token) {
      setResetToken(token);
      setAuthModal(true);
      // Consume the token from history/referrer once the modal has it.
      const clean = new URL(window.location.href);
      clean.searchParams.delete('reset');
      window.history.replaceState({}, '', clean.pathname + clean.search + clean.hash);
    }
    // Landing-page navigation links deep-link into the correct tab.
    const requestedTab = params.get('tab');
    if (requestedTab && (['feed', 'confession', 'spill', 'avatar', 'shop', 'profile'] as const).includes(requestedTab as TabId)) {
      setActiveSection(requestedTab as TabId);
    }
  }, []);

  function handleAuthRequired() {
    setResetToken('');
    setAuthModal(true);
  }

  function handleAuthSuccess() {
    setAuthModal(false);
    if (resetToken) {
      setResetToken('');
      router.replace('/app');
    }
    void checkAuth();
  }

  function handleLogout() {
    setUser(null);
    router.push('/');
  }

  function handlePostCreated(post: Post) {
    setNewPost(post);
    setActiveSection('feed');
  }

  if (checking) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-gray-400 text-sm">Memuat...</div>
      </div>
    );
  }

  const loggedIn = user !== null;

  // Sidebar navigation — grouped so "ruang kamu" and "tindakan" read clearly.
  const navItems: { id: TabId; icon: NavIconName; label: string; group: 'ruang' | 'kamu' }[] = [
    { id: 'feed',       icon: 'home',    label: 'Beranda',  group: 'ruang' },
    { id: 'confession', icon: 'mask',    label: 'Confess',  group: 'ruang' },
    { id: 'spill',      icon: 'pen',     label: 'Spill',    group: 'ruang' },
    { id: 'avatar',     icon: 'avatar',  label: 'Avatar',   group: 'kamu' },
    { id: 'shop',       icon: 'store',   label: 'Toko',     group: 'kamu' },
    { id: 'profile',    icon: 'profile', label: 'Profil',   group: 'kamu' },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex">
      {/* Desktop Header */}
      <header className="sticky top-0 z-30 mx-auto flex max-w-lg items-center justify-between border-b border-navy/10 bg-white/95 px-4 py-3 backdrop-blur md:hidden">
        <div className="flex items-center gap-2">
          <BrandMascot size={34} float={false} />
          <div>
            <span className="block font-display text-lg font-black leading-none text-navy">
              unlinked<span className="text-primary">+</span>
            </span>
            <span className="text-[9px] font-semibold text-navy/45">Less Flex. More Human.</span>
          </div>
        </div>
        {!loggedIn ? (
          <button
            type="button"
            onClick={handleAuthRequired}
            className="focus-ring rounded-full bg-navy px-4 py-1.5 text-xs font-bold text-white transition hover:bg-navy/90"
          >
            Login / Daftar
          </button>
        ) : (
          <span className="text-xs font-semibold text-navy/60">👤 {user.username}</span>
        )}
      </header>

      {/* Desktop Layout */}
      <div className="hidden md:flex flex-1 max-w-7xl mx-auto w-full">
        {/* Left Sidebar - RUANG KAMU */}
        <aside className="flex w-72 flex-col border-r border-navy/10 bg-white p-6">
          <div className="mb-8 flex items-center gap-3">
            <BrandMascot size={52} float={false} />
            <div>
              <span className="block font-display text-2xl font-black leading-none text-navy">
                unlinked<span className="text-primary">+</span>
              </span>
              <p className="mt-1 text-[11px] font-semibold text-navy/45">Less Flex. More Human.</p>
            </div>
          </div>

          <nav aria-label="Navigasi samping" className="flex-1 space-y-5">
            {(['ruang', 'kamu'] as const).map((group) => (
              <div key={group}>
                <p className="mb-2 px-3 text-[10px] font-black uppercase tracking-widest text-navy/35">
                  {group === 'ruang' ? 'Ruang Cerita' : 'Buat Dirimu'}
                </p>
                <div className="space-y-1.5">
                  {navItems.filter((item) => item.group === group).map((item) => {
                    const isActive = activeSection === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setActiveSection(item.id)}
                        aria-current={isActive ? 'page' : undefined}
                        className={`focus-ring flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-bold transition-all duration-200 ${
                          isActive
                            ? 'bg-lavender/25 text-navy shadow-sm'
                            : 'text-navy/55 hover:-translate-y-0.5 hover:bg-cream hover:text-navy'
                        }`}
                      >
                        <span className={`flex h-8 w-8 items-center justify-center rounded-xl ${isActive ? 'bg-navy text-sunshine' : 'bg-cream text-navy/50'}`}>
                          <NavIcon name={item.icon} size={17} />
                        </span>
                        {item.label}
                        {isActive && <span className="ml-auto h-2 w-2 rounded-full bg-sunshine" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>

          <div className="mt-auto border-t border-navy/10 pt-6">
            <p className="text-xs font-bold text-navy/50">Pelan-pelan juga sampai.</p>
            <p className="mt-1 text-[10px] text-navy/35">
              Setiap langkah kecil tetap ada kemajuan.
            </p>
          </div>
        </aside>

        {/* Main Content - RUANG CERITA KITA */}
        <main className="flex-1 bg-background p-6">
          <div className="relative mb-7 overflow-hidden rounded-[30px] bg-navy p-6 text-cream shadow-soft">
            <div className="absolute -right-10 -top-16 h-52 w-52 rounded-full bg-lavender/25 blur-2xl" />
            <div className="absolute bottom-0 left-1/3 h-24 w-40 rounded-full bg-sunshine/15 blur-2xl" />
            <div className="relative flex items-center justify-between gap-6">
              <div>
                <p className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-sunshine/15 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-sunshine">
                  <NavIcon name="sparkles" size={12} /> Ruang Cerita Kita
                </p>
                <h1 className="font-display text-2xl font-black">Hari ini, apa adanya.</h1>
                <p className="mt-1 max-w-md text-xs leading-relaxed text-cream/70">
                  Taruh bebanmu sebentar di sini. Nggak harus sukses untuk punya cerita.
                </p>
                <p className="mt-3 text-[10px] font-semibold text-cream/50">Memutus yang Toksik + Menambah yang Esensial</p>
              </div>
              <BrandMascot size={108} bubble="Kamu nggak sendirian. 🤝" />
            </div>
          </div>

          <div className="mb-5 flex items-center justify-between">
            <p className="text-xs font-semibold text-navy/50">
              {loggedIn ? `Halo, ${user.username}. Cerita siapa yang lagi berat?` : 'Baca dulu boleh, ikut cerita juga boleh.'}
            </p>
            <button
              type="button"
              onClick={() => void (activeSection === 'feed' ? window.location.reload() : setActiveSection('feed'))}
              className="focus-ring inline-flex items-center gap-1.5 rounded-xl border border-navy/15 px-3 py-1.5 text-xs font-bold text-navy transition hover:bg-cream"
            >
              <NavIcon name="sparkles" size={13} /> Muat ulang
            </button>
          </div>

          {activeSection === 'feed' && (
            <div className="mx-auto max-w-2xl space-y-4">
              <TrendingRail active={trendingTag} onSelect={setTrendingTag} />
              <PollCard loggedIn={loggedIn} onAuthRequired={handleAuthRequired} />
              <FailFeed
                loggedIn={loggedIn}
                onAuthRequired={handleAuthRequired}
                newPost={newPost}
                hashtag={trendingTag}
                onClearHashtag={() => setTrendingTag('')}
              />
            </div>
          )}

          {activeSection === 'confession' && (
            <div className="max-w-2xl mx-auto">
              <ConfessionWall loggedIn={loggedIn} onAuthRequired={handleAuthRequired} />
            </div>
          )}

          {activeSection === 'spill' && (
            <div className="max-w-2xl mx-auto">
              <CreatePost
                loggedIn={loggedIn}
                onCreated={handlePostCreated}
                onAuthRequired={handleAuthRequired}
              />
            </div>
          )}

          {activeSection === 'avatar' && (
            <div className="max-w-2xl mx-auto">
              <AvatarBuilder onSaved={() => void checkAuth()} />
            </div>
          )}

          {activeSection === 'shop' && (
            <div className="max-w-2xl mx-auto">
              <h2 className="font-display font-black text-xl text-navy mb-4">🛒 Toko Avatar</h2>
              {loggedIn ? (
                <ShopModal onClose={() => setActiveSection('feed')} />
              ) : (
                <div className="bg-white rounded-2xl p-6 text-center border border-gray-100">
                  <div className="text-4xl mb-3">🔒</div>
                  <p className="text-gray-600 mb-4">Login dulu untuk beli aksesori.</p>
                  <button onClick={handleAuthRequired} className="bg-navy text-white font-bold px-6 py-2 rounded-xl">
                    Login
                  </button>
                </div>
              )}
            </div>
          )}

          {activeSection === 'profile' && (
            loggedIn ? (
              <ProfileTab onLogout={handleLogout} />
            ) : (
              <div className="max-w-2xl mx-auto">
                <div className="bg-white rounded-2xl p-6 text-center border border-gray-100 mt-4">
                  <div className="text-4xl mb-3">👤</div>
                  <p className="text-gray-600 mb-4">Login untuk lihat profil kamu.</p>
                  <button onClick={handleAuthRequired} className="bg-navy text-white font-bold px-6 py-2 rounded-xl">
                    Login / Daftar
                  </button>
                </div>
              </div>
            )
          )}
        </main>

        {/* Right Sidebar - TRENDING + PENGINGAT KECIL */}
        <aside className="hidden w-80 space-y-5 border-l border-navy/10 bg-white p-6 lg:block">
          <TrendingRail active={trendingTag} onSelect={setTrendingTag} />

          <div className="surface-card overflow-hidden p-5">
            <div className="mb-3 flex items-center gap-3">
              <BrandMascot size={52} float={false} bubble="Pelan-pelan. 💛" />
              <div>
                <h3 className="font-display text-sm font-black text-navy">PENGINGAT KECIL</h3>
                <p className="text-[10px] text-navy/45">— unlinked+</p>
              </div>
            </div>
            <p className="mb-4 text-xs leading-relaxed text-navy/70">
              Kamu bukan CV-mu. Di sini, kita menghargai perjalanan, bukan hasil akhir.
            </p>
            <ul className="space-y-1.5 border-t border-navy/10 pt-4 text-xs text-navy/55">
              <li className="flex items-center gap-2"><NavIcon name="hug" size={13} /> Saling dukung</li>
              <li className="flex items-center gap-2"><NavIcon name="check" size={13} /> Jujur & apa adanya</li>
              <li className="flex items-center gap-2"><NavIcon name="mask" size={13} /> Tanpa penilaian</li>
            </ul>
          </div>
        </aside>
      </div>

      {/* Mobile Tab Content */}
      <main className="md:hidden">
        {activeSection === 'feed' && (
          <div className="mx-auto max-w-lg space-y-4 px-4 pt-4">
            <TrendingRail active={trendingTag} onSelect={setTrendingTag} />
            <PollCard loggedIn={loggedIn} onAuthRequired={handleAuthRequired} />
            <FailFeed
              loggedIn={loggedIn}
              onAuthRequired={handleAuthRequired}
              newPost={newPost}
              hashtag={trendingTag}
              onClearHashtag={() => setTrendingTag('')}
            />
          </div>
        )}
        {activeSection === 'confession' && (
          <ConfessionWall loggedIn={loggedIn} onAuthRequired={handleAuthRequired} />
        )}
        {activeSection === 'spill' && (
          <CreatePost
            loggedIn={loggedIn}
            onCreated={handlePostCreated}
            onAuthRequired={handleAuthRequired}
          />
        )}
        {activeSection === 'avatar' && (
          <AvatarBuilder onSaved={() => void checkAuth()} />
        )}
        {activeSection === 'shop' && (
          <div className="max-w-lg mx-auto pb-28 px-4 pt-4">
            <h2 className="font-display font-black text-xl text-navy mb-4">🛒 Toko Avatar</h2>
            {loggedIn ? (
              <ShopModal onClose={() => setActiveSection('feed')} />
            ) : (
              <div className="bg-white rounded-2xl p-6 text-center border border-gray-100">
                <div className="text-4xl mb-3">🔒</div>
                <p className="text-gray-600 mb-4">Login dulu untuk beli aksesori.</p>
                <button onClick={handleAuthRequired} className="bg-navy text-white font-bold px-6 py-2 rounded-xl">
                  Login
                </button>
              </div>
            )}
          </div>
        )}
        {activeSection === 'profile' && (
          loggedIn ? (
            <ProfileTab onLogout={handleLogout} />
          ) : (
            <div className="max-w-lg mx-auto pb-28 px-4 pt-4">
              <div className="bg-white rounded-2xl p-6 text-center border border-gray-100 mt-4">
                <div className="text-4xl mb-3">👤</div>
                <p className="text-gray-600 mb-4">Login untuk lihat profil kamu.</p>
                <button onClick={handleAuthRequired} className="bg-navy text-white font-bold px-6 py-2 rounded-xl">
                  Login / Daftar
                </button>
              </div>
            </div>
          )
        )}
      </main>

      {/* Mobile BottomNav - map sections to tabs */}
      <BottomNav active={activeSection} onChange={setActiveSection} />

      {authModal && (
        <AuthModal
          resetToken={resetToken}
          onSuccess={handleAuthSuccess}
          onClose={() => setAuthModal(false)}
        />
      )}

      {showShop && (
        <ShopModal
          onClose={() => setShowShop(false)}
          onInventoryUpdate={() => void checkAuth()}
        />
      )}
    </div>
  );
}
