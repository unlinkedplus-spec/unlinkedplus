'use client';

/** Post detail reached from a real notification. */
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getPost } from '../lib/api';
import type { Post } from '../lib/types';
import { SPILL_MODE_META, getLevelName } from '../lib/types';
import type { SpillMode } from '../lib/types';
import { relativeTime } from '../lib/time';

export default function PostDetail({ id }: { id: string }) {
  const [post, setPost] = useState<Post | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    getPost(id).then((p) => { if (active) setPost(p); })
      .catch((e) => { if (active) setError(e instanceof Error ? e.message : 'Post tidak ditemukan'); });
    return () => { active = false; };
  }, [id]);

  if (error) return <main className="min-h-screen bg-background p-6 text-center text-red-600">{error}</main>;
  if (!post) return <main className="min-h-screen bg-background p-6 text-center text-gray-400">Memuat cerita…</main>;
  const mode = SPILL_MODE_META[(post.spillMode as SpillMode) || 'listen'];

  return (
    <main className="min-h-screen bg-background px-4 py-8 font-body">
      <article className="mx-auto w-full max-w-2xl rounded-2xl border border-gray-100 bg-white p-6">
        <Link href="/home" className="fp-back">← Kembali ke Beranda</Link>
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-xl bg-[#FFF3D4] text-xl">🧑‍🎤</div>
          <div>
            <b className="block text-sm text-navy">{post.user?.username ?? 'Anonim'}</b>
            <small className="text-gray-400">
              Lv.{post.user?.profile?.mentalLevel ?? 1} {getLevelName(post.user?.profile?.mentalLevel ?? 1)} · {relativeTime(post.createdAt)}
            </small>
          </div>
        </div>
        <p className="mt-5 text-[15px] leading-relaxed text-navy">{post.content}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <span className="rounded-full bg-primary/20 px-3 py-1 text-xs font-bold">{post.category}</span>
          <span className="rounded-full bg-primary/20 px-3 py-1 text-xs font-bold">{mode.label}</span>
        </div>
        {post.videoUrl && (
          <a href={post.videoUrl} target="_blank" rel="noopener noreferrer"
            className="mt-4 inline-block rounded-xl border border-gray-200 px-4 py-2 text-xs font-bold">▶ Tonton Video Spill</a>
        )}
        <p className="mt-6 text-xs text-gray-400">{mode.hint}</p>
      </article>
    </main>
  );
}
