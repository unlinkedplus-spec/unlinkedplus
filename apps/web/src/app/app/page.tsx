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

export default function AppPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [checking, setChecking] = useState(true);
  const [activeTab, setActiveTab] = useState<TabId>('feed');
  const [authModal, setAuthModal] = useState(false);
  const [showShop, setShowShop] = useState(false);
  const [newPost, setNewPost] = useState<Post | null>(null);

  const checkAuth = useCallback(async () => {
    try {
      const me = await authMe();
      setUser(me);
    } catch {
      // Not logged in — stay on app page but show auth modal features
      setUser(null);
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => { void checkAuth(); }, [checkAuth]);

  function handleAuthRequired() {
    setAuthModal(true);
  }

  function handleAuthSuccess() {
    setAuthModal(false);
    void checkAuth();
  }

  function handleLogout() {
    setUser(null);
    router.push('/');
  }

  function handlePostCreated(post: Post) {
    setNewPost(post);
    setActiveTab('feed');
  }

  if (checking) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-gray-400 text-sm">Memuat...</div>
      </div>
    );
  }

  const loggedIn = user !== null;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between max-w-lg mx-auto">
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

      {/* Tab content */}
      <main>
        {activeTab === 'feed' && (
          <FailFeed loggedIn={loggedIn} onAuthRequired={handleAuthRequired} newPost={newPost} />
        )}
        {activeTab === 'create' && (
          <CreatePost
            loggedIn={loggedIn}
            onCreated={handlePostCreated}
            onAuthRequired={handleAuthRequired}
          />
        )}
        {activeTab === 'avatar' && (
          <AvatarBuilder onSaved={() => void checkAuth()} />
        )}
        {activeTab === 'shop' && (
          <div className="max-w-lg mx-auto pb-28 px-4 pt-4">
            <h2 className="font-display font-black text-xl text-navy mb-4">🛒 Toko Avatar</h2>
            {loggedIn ? (
              <ShopModal onClose={() => setActiveTab('feed')} />
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
        {activeTab === 'profile' && (
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

      <BottomNav active={activeTab} onChange={setActiveTab} />

      {authModal && (
        <AuthModal
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
