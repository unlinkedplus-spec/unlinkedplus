'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { authMe } from '../../lib/api';
import type { Post, User } from '../../lib/types';
import BottomNav, { type TabId } from '../../components/BottomNav';
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
    const token = new URLSearchParams(window.location.search).get('reset');
    if (token) {
      setResetToken(token);
      setAuthModal(true);
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

  // Desktop sidebar navigation
  const navItems = [
    { id: 'feed' as const, icon: '🏠', label: 'Beranda' },
    { id: 'confession' as const, icon: '🎭', label: 'Confess' },
    { id: 'spill' as const, icon: '✍️', label: 'Spill' },
    { id: 'avatar' as const, icon: '🧑‍💼', label: 'Avatar' },
    { id: 'shop' as const, icon: '🛒', label: 'Toko' },
    { id: 'profile' as const, icon: '👤', label: 'Profil' },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex">
      {/* Desktop Header */}
      <header className="md:hidden sticky top-0 z-30 bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between max-w-lg mx-auto">
        <span className="font-display font-black text-xl text-navy">
          unlinked<span className="text-primary">+</span>
        </span>
        {!loggedIn ? (
          <button
            onClick={handleAuthRequired}
            className="text-xs bg-navy text-white font-bold px-4 py-1.5 rounded-full hover:bg-navy/90 transition"
          >
            Login / Daftar
          </button>
        ) : (
          <span className="text-xs text-gray-500 font-medium">👤 {user.username}</span>
        )}
      </header>

      {/* Desktop Layout */}
      <div className="hidden md:flex flex-1 max-w-7xl mx-auto w-full">
        {/* Left Sidebar - RUANG KAMU */}
        <aside className="w-64 border-r border-gray-200 bg-white p-6 flex flex-col">
          <div className="mb-8">
            <span className="font-display font-black text-2xl text-navy">
              unlinked<span className="text-primary">+</span>
            </span>
            <p className="text-xs text-gray-500 mt-1">Less Flex. More Human.</p>
          </div>

          <nav className="flex-1 space-y-2">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveSection(item.id)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition ${
                  activeSection === item.id
                    ? 'bg-primary/10 text-navy'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <span className="text-lg">{item.icon}</span>
                <span>{item.label}</span>
                {activeSection === item.id && <span className="ml-auto w-2 h-2 rounded-full bg-primary" />}
              </button>
            ))}
          </nav>

          <div className="mt-auto pt-6 border-t border-gray-100">
            <p className="text-xs text-gray-400 font-medium">Pelan-pelan juga sampai.</p>
            <p className="text-[10px] text-gray-300 mt-1">
              Setiap langkah kecil tetap ada kemajuan.
            </p>
          </div>
        </aside>

        {/* Main Content - RUANG CERITA KITA */}
        <main className="flex-1 p-6 bg-background">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="font-display font-black text-2xl text-navy">Hari ini, apa adanya.</h1>
              <p className="text-sm text-gray-500 mt-1">Taruh bebanmu sebentar di sini.</p>
            </div>
            <button
              onClick={() => void (activeSection === 'feed' ? window.location.reload() : setActiveSection('feed'))}
              className="text-xs text-navy border border-navy/20 px-3 py-1.5 rounded-lg hover:bg-navy/5 transition"
            >
              ↻ Muat ulang
            </button>
          </div>

          {activeSection === 'feed' && (
            <div className="max-w-2xl mx-auto">
              <PollCard loggedIn={loggedIn} onAuthRequired={handleAuthRequired} />
              <FailFeed loggedIn={loggedIn} onAuthRequired={handleAuthRequired} newPost={newPost} />
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

        {/* Right Sidebar - PENGINGAT KECIL */}
        <aside className="w-72 border-l border-gray-200 bg-white p-6 hidden lg:block">
          <div className="bg-primary/10 rounded-2xl p-5 mb-6">
            <h3 className="font-display font-bold text-sm text-navy mb-3">PENGINGAT KECIL</h3>
            <p className="text-xs text-navy/80 mb-4">
              Kamu bukan CV-mu. Di sini, kita menghargai perjalanan, bukan hasil akhir.
            </p>
            <div className="text-[10px] text-navy/60 font-medium">
              — unlinked+
            </div>
          </div>

          <div className="text-xs text-gray-500 space-y-3">
            <div>
              <span className="font-bold text-navy">Di sini, kita...</span>
              <ul className="mt-2 space-y-1 pl-3">
                <li>• Saling dukung</li>
                <li>• Jujur & apa adanya</li>
                <li>• Tanpa penilaian</li>
              </ul>
            </div>
          </div>

          <div className="mt-6 p-4 bg-navy/5 rounded-xl">
            <p className="text-[10px] text-navy/70 italic">
              "Nggak harus sukses untuk punya cerita."
            </p>
          </div>
        </aside>
      </div>

      {/* Mobile Tab Content */}
      <main className="md:hidden">
        {activeSection === 'feed' && (
          <div className="max-w-lg mx-auto px-4 pt-4">
            <PollCard loggedIn={loggedIn} onAuthRequired={handleAuthRequired} />
            <FailFeed loggedIn={loggedIn} onAuthRequired={handleAuthRequired} newPost={newPost} />
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
