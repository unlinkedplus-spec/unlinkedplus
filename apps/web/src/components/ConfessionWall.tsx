'use client';

import { useCallback, useEffect, useState } from 'react';
import { createConfession, getConfessions } from '../lib/api';
import type { Confession } from '../lib/types';
import { relativeTime } from '../lib/time';
import { buildAvatarSVG } from '../lib/avatar-svg';
import { containsFlex } from '../lib/types';
import LoadingState from './LoadingState';

interface Props {
  loggedIn: boolean;
  onAuthRequired: () => void;
}

export default function ConfessionWall({ loggedIn, onAuthRequired }: Props) {
  const [confessions, setConfessions] = useState<Confession[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [content, setContent] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(true);
  const [scheduledAt, setScheduledAt] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadPage = useCallback(async (p: number, replace = false) => {
    if (loading) return;
    setLoading(true);
    try {
      const res = await getConfessions(p);
      setConfessions((prev) => replace ? res.data : [...prev, ...res.data]);
      setPage(p);
      setTotalPages(res.totalPages);
    } finally {
      setLoading(false);
    }
  }, [loading]);

  useEffect(() => { void loadPage(1, true); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!loggedIn) {
      onAuthRequired();
      return;
    }
    if (content.trim().length < 10) {
      setError('Minimal 10 karakter');
      return;
    }
    if (containsFlex(content)) {
      setError('Konten mengandung frasa flex yang tidak diizinkan');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      const newConfession = await createConfession({
        content: content.trim(),
        isAnonymous,
        scheduledAt: scheduledAt || undefined,
      });
      setConfessions((prev) => [newConfession, ...prev]);
      setContent('');
      setScheduledAt('');
      setShowForm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal mengirim confession');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-lg mx-auto pb-28 px-4 pt-4">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-display font-black text-xl text-navy">Confession Wall</h2>
            <p className="text-xs text-gray-500 mt-1">Berbagi rahasia kerja secara anonim</p>
          </div>
          {loggedIn && (
            <button
              onClick={() => setShowForm(!showForm)}
              className="bg-navy text-white text-xs font-bold px-4 py-2 rounded-full hover:bg-navy/90 transition"
            >
              {showForm ? 'Batal' : '+ Confess'}
            </button>
          )}
        </div>

        {showForm && (
          <form onSubmit={handleSubmit} className="border-t border-gray-100 pt-4">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Tulis confession kamu di sini..."
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
              rows={4}
              maxLength={500}
            />
            <div className="flex items-center justify-between mt-3">
              <label className="flex items-center gap-2 text-xs text-gray-600">
                <input
                  type="checkbox"
                  checked={isAnonymous}
                  onChange={(e) => setIsAnonymous(e.target.checked)}
                  className="rounded border-gray-300 text-primary focus:ring-primary"
                />
                Anonymous
              </label>
              <input
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                className="text-xs border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary"
                title="Jadwalkan tayang (opsional)"
              />
            </div>
            {error && <p className="text-xs text-red-500 mt-2">{error}</p>}
            <button
              type="submit"
              disabled={submitting}
              className="mt-3 w-full bg-primary text-navy font-bold py-2.5 rounded-xl hover:bg-primary/90 transition disabled:opacity-50"
            >
              {submitting ? 'Mengirim...' : 'Kirim Confession'}
            </button>
          </form>
        )}

        {!loggedIn && !showForm && (
          <LoadingState message="Login untuk confession" />
        )}
      </div>

      <div className="flex flex-col gap-3">
        {confessions.map((confession) => (
          <article key={confession.id} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-start gap-3 mb-3">
              {confession.isAnonymous ? (
                <div className="w-12 h-12 rounded-xl bg-gray-200 flex items-center justify-center shrink-0">
                  <span className="text-xl">🎭</span>
                </div>
              ) : (
                <svg viewBox="0 0 300 300" width="48" height="48" className="shrink-0 rounded-xl bg-primary/10">
                  <g dangerouslySetInnerHTML={{ __html: buildAvatarSVG(confession.user?.profile?.avatarConfig as Parameters<typeof buildAvatarSVG>[0]) }} />
                </svg>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-navy text-sm">
                    {confession.isAnonymous ? 'Anonim' : confession.user?.username ?? 'Anonim'}
                  </span>
                  <span className="text-xs text-gray-400">{relativeTime(confession.createdAt)}</span>
                </div>
                <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 font-semibold">
                  Confession
                </span>
              </div>
            </div>

            <p className="text-sm text-navy/90 leading-relaxed mb-3">{confession.content}</p>

            <div className="flex items-center gap-4 text-xs text-gray-500">
              <span>❤️ {confession.reactionCount}</span>
              <span>💬 {confession.commentCount}</span>
            </div>
          </article>
        ))}

        {loading && <div className="text-center py-4 text-gray-400 text-sm">Memuat...</div>}

        {page < totalPages && !loading && (
          <button
            onClick={() => void loadPage(page + 1)}
            className="bg-white border border-gray-200 rounded-xl py-3 text-sm font-semibold text-navy hover:bg-gray-50 transition"
          >
            Muat Lebih Banyak
          </button>
        )}
      </div>
    </div>
  );
}
