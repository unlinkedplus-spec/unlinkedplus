'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { getPosts } from '../lib/api';
import { buildAvatarSVG } from '../lib/avatar-svg';
import type { Post } from '../lib/types';
import { getLevelName } from '../lib/types';
import { relativeTime } from '../lib/time';
import EmptyState from './EmptyState';
import LoadingState from './LoadingState';
import ReactionBar from './ReactionBar';
import CertificateModal from './CertificateModal';
import AuthModal from './AuthModal';
import SponsoredPost from './SponsoredPost';

const CATEGORY_COLORS: Record<string, string> = {
  'Ditolak HRD':      'bg-red-100 text-red-700',
  'Salah Kirim Chat': 'bg-orange-100 text-orange-700',
  'Dimarahi Bos':     'bg-purple-100 text-purple-700',
  'Bisnis Boncos':    'bg-cyan-100 text-cyan-700',
  'Salah Jurusan':    'bg-emerald-100 text-emerald-700',
};

const LEVEL_COLORS: Record<number, string> = {
  1: 'bg-gray-100 text-gray-600',
  2: 'bg-blue-100 text-blue-700',
  3: 'bg-purple-100 text-purple-700',
  4: 'bg-orange-100 text-orange-700',
  5: 'bg-yellow-100 text-yellow-700',
};

interface Props {
  loggedIn: boolean;
  onAuthRequired: () => void;
  newPost?: Post | null;
}

export default function FailFeed({ loggedIn, onAuthRequired, newPost }: Props) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [certPost, setCertPost] = useState<Post | null>(null);
  const [authModal, setAuthModal] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const loadPage = useCallback(async (p: number, replace = false) => {
    if (loading) return;
    setLoading(true);
    try {
      const res = await getPosts(p);
      setPosts((prev) => replace ? res.data : [...prev, ...res.data]);
      setPage(p);
      setTotalPages(res.totalPages);
    } finally {
      setLoading(false);
    }
  }, [loading]);

  useEffect(() => { void loadPage(1, true); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Prepend newly created post
  useEffect(() => {
    if (newPost) setPosts((prev) => [newPost, ...prev.filter((p) => p.id !== newPost.id)]);
  }, [newPost]);

  // Infinite scroll
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const obs = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting && page < totalPages && !loading) {
        void loadPage(page + 1);
      }
    }, { threshold: 0.1 });
    obs.observe(el);
    return () => obs.disconnect();
  }, [page, totalPages, loading, loadPage]);

  function handleCertClick(post: Post) {
    if (!loggedIn) { setAuthModal(true); return; }
    setCertPost(post);
  }

  function renderPost(post: Post) {
    const avatarConfig = post.user?.profile?.avatarConfig ?? null;
    const level = post.user?.profile?.mentalLevel ?? 1;
    const levelColor = LEVEL_COLORS[level] ?? LEVEL_COLORS[1];
    const catColor = CATEGORY_COLORS[post.category] ?? 'bg-gray-100 text-gray-600';

    return (
      <article key={post.id} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
        <div className="flex items-start gap-3 mb-3">
          <svg viewBox="0 0 300 300" width="48" height="48" className="shrink-0 rounded-xl bg-primary/10">
            <g dangerouslySetInnerHTML={{ __html: buildAvatarSVG(avatarConfig as Parameters<typeof buildAvatarSVG>[0]) }} />
          </svg>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-navy text-sm">{post.user?.username ?? 'Anonim'}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${levelColor}`}>
                Lv.{level} {getLevelName(level)}
              </span>
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${catColor}`}>
                {post.category}
              </span>
              <span className="text-xs text-gray-400">{relativeTime(post.createdAt)}</span>
            </div>
          </div>
        </div>

        <p className="text-sm text-navy/90 leading-relaxed mb-3">{post.content}</p>

        <ReactionBar
          postId={post.id}
          initialCounts={post.reactionCounts ?? { pukpuk: 0, ngakak: 0, sama: 0 }}
          loggedIn={loggedIn}
        />

        {post.userId && (
          <button
            onClick={() => handleCertClick(post)}
            className="mt-3 text-xs text-gray-400 hover:text-accent transition font-medium"
          >
            🏆 Buat Sertifikat
          </button>
        )}
      </article>
    );
  }

  return (
    <div className="max-w-lg mx-auto pb-28 px-4 pt-4">
      <h2 className="font-display font-black text-xl text-navy mb-4">🏠 Feed Gagal</h2>

      {posts.length === 0 && !loading && (
        <div className="text-center py-12 text-gray-400">
          <div className="text-4xl mb-3">😶‍🌫️</div>
          <p>Belum ada cerita. Jadi yang pertama spill!</p>
        </div>
      )}

      <div className="flex flex-col gap-4">
        {posts.length > 1 && (
          <>
            <SponsoredPost />
            {posts.slice(0, 1).map((post) => renderPost(post))}
            <SponsoredPost />
            {posts.slice(1).map((post) => renderPost(post))}
          </>
        )}
        {posts.length === 1 && (
          <>
            <SponsoredPost />
            {posts.map((post) => renderPost(post))}
          </>
        )}
        {posts.length === 0 && null}
      </div>

      {loading && <LoadingState message="Memuat spill..." />}

      {!loading && posts.length === 0 && (
        <EmptyState
          title="Belum ada spill"
          description="Jadilah yang pertama bercerita kegagalan di sini"
          action={loggedIn ? { label: 'Buat Spill', onClick: onAuthRequired } : undefined}
        />
      )}

      <div ref={sentinelRef} className="h-4" />

      {certPost && (
        <CertificateModal post={certPost} onClose={() => setCertPost(null)} />
      )}
      {authModal && (
        <AuthModal
          onSuccess={() => { setAuthModal(false); window.location.reload(); }}
          onClose={() => setAuthModal(false)}
        />
      )}
    </div>
  );
}
