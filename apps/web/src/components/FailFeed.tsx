'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { getPosts } from '../lib/api';
import { buildAvatarSVG } from '../lib/avatar-svg';
import type { Post } from '../lib/types';
import { getLevelName } from '../lib/types';
import { relativeTime } from '../lib/time';
import EmptyState from './EmptyState';
import LoadingState from './LoadingState';
import NavIcon from './NavIcon';
import ReactionBar from './ReactionBar';
import CertificateModal from './CertificateModal';
import AuthModal from './AuthModal';
import SponsoredPost from './SponsoredPost';

const CATEGORY_COLORS: Record<string, string> = {
  'Ditolak HRD':      'bg-rose-100 text-rose-700',
  'Salah Kirim Chat': 'bg-sunshine/35 text-navy',
  'Dimarahi Bos':     'bg-lavender/35 text-navy',
  'Bisnis Boncos':    'bg-sky-100 text-sky-700',
  'Salah Jurusan':    'bg-emerald-100 text-emerald-700',
};

const LEVEL_COLORS: Record<number, string> = {
  1: 'bg-cream text-navy/60',
  2: 'bg-lavender/30 text-navy',
  3: 'bg-lavender/50 text-navy',
  4: 'bg-sunshine/40 text-navy',
  5: 'bg-sunshine text-navy',
};

interface Props {
  loggedIn: boolean;
  onAuthRequired: () => void;
  newPost?: Post | null;
  /** Active topic filter coming from the Trending rail. */
  hashtag?: string | null;
  onClearHashtag?: () => void;
}

export default function FailFeed({ loggedIn, onAuthRequired, newPost, hashtag, onClearHashtag }: Props) {
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

  const keyword = hashtag?.trim().toLowerCase() ?? '';
  const visiblePosts = keyword
    ? posts.filter((post) =>
        post.category.toLowerCase().includes(keyword) || post.content.toLowerCase().includes(keyword))
    : posts;

  function renderPost(post: Post) {
    const avatarConfig = post.user?.profile?.avatarConfig ?? null;
    const level = post.user?.profile?.mentalLevel ?? 1;
    const levelColor = LEVEL_COLORS[level] ?? LEVEL_COLORS[1];
    const catColor = CATEGORY_COLORS[post.category] ?? 'bg-cream text-navy/70';

    return (
      <article key={post.id} className="surface-card animate-popin p-5 transition-transform duration-200 hover:-translate-y-0.5">
        <div className="mb-4 flex items-start gap-3">
          <div className="h-12 w-12 shrink-0 overflow-hidden rounded-2xl border-2 border-lavender/70 bg-sunshine/20 shadow-sm">
            <svg viewBox="0 0 300 300" width="48" height="48" aria-hidden="true">
              <g dangerouslySetInnerHTML={{ __html: buildAvatarSVG(avatarConfig as Parameters<typeof buildAvatarSVG>[0]) }} />
            </svg>
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-black text-navy">{post.user?.username ?? 'Anonim'}</span>
              <span className={`pill-soft ${levelColor}`}>
                Lv.{level} {getLevelName(level)}
              </span>
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <span className={`pill-soft ${catColor}`}>{post.category}</span>
              <span className="text-[11px] text-navy/40">{relativeTime(post.createdAt)}</span>
            </div>
          </div>
        </div>

        <p className="mb-1 whitespace-pre-wrap text-sm leading-relaxed text-navy/90">{post.content}</p>

        <ReactionBar
          postId={post.id}
          initialCounts={post.reactionCounts ?? { pukpuk: 0, ngakak: 0, sama: 0 }}
          loggedIn={loggedIn}
        />

        {loggedIn && (
          <button
            type="button"
            onClick={() => handleCertClick(post)}
            className="focus-ring mt-3 inline-flex items-center gap-1.5 text-[11px] font-bold text-navy/50 transition hover:text-navy"
          >
            <NavIcon name="sparkles" size={13} /> Buat Sertifikat
          </button>
        )}
      </article>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-4 pb-28 pt-4">
      <div className="mb-4 flex items-end justify-between">
        <div>
          <h2 className="font-display text-xl font-black text-navy">Spill Feed</h2>
          <p className="text-[11px] text-navy/50">Cerita jujur, tanpa panggung pencapaian.</p>
        </div>
        <span className="pill-soft bg-lavender/25 text-navy">
          <NavIcon name="sparkles" size={12} /> {posts.length} cerita
        </span>
      </div>

      {hashtag && (
        <div className="mb-4 flex items-center justify-between rounded-2xl border border-lavender/50 bg-lavender/15 px-4 py-2.5">
          <span className="text-xs font-bold text-navy">Menampilkan topik: {hashtag}</span>
          {onClearHashtag && (
            <button type="button" onClick={onClearHashtag} className="focus-ring text-[11px] font-bold text-navy/60 hover:text-navy">
              Hapus
            </button>
          )}
        </div>
      )}

      {visiblePosts.length === 0 && !loading && !hashtag && (
        <div className="py-12 text-center text-navy/40">
          <div className="mb-3 text-4xl">😶‍🌫️</div>
          <p>Belum ada cerita. Jadi yang pertama spill!</p>
        </div>
      )}

      <div className="flex flex-col gap-4">
        {visiblePosts.length > 1 && (
          <>
            <SponsoredPost />
            {visiblePosts.slice(0, 1).map((post) => renderPost(post))}
            <SponsoredPost />
            {visiblePosts.slice(1).map((post) => renderPost(post))}
          </>
        )}
        {visiblePosts.length === 1 && (
          <>
            <SponsoredPost />
            {visiblePosts.map((post) => renderPost(post))}
          </>
        )}
        {visiblePosts.length === 0 && hashtag && (
          <div className="surface-card p-6 text-center">
            <p className="text-sm font-bold text-navy">Belum ada spill untuk topik ini.</p>
            <p className="mt-1 text-xs text-navy/50">Coba topik lain, atau lihat semua cerita.</p>
          </div>
        )}
      </div>

      {loading && <LoadingState message="Memuat spill..." />}

      {!loading && posts.length === 0 && !hashtag && (
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
