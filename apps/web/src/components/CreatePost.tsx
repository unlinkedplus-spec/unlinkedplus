'use client';

import { useState } from 'react';
import { createPost } from '../lib/api';
import { ANTI_FLEX_PHRASES, POST_CATEGORIES, containsFlex } from '../lib/types';
import type { Post } from '../lib/types';

interface Props {
  onCreated: (post: Post) => void;
  onAuthRequired: () => void;
  loggedIn: boolean;
}

const CATEGORY_COLORS: Record<string, string> = {
  'Ditolak HRD':      'bg-red-100 text-red-700 border-red-200',
  'Salah Kirim Chat': 'bg-orange-100 text-orange-700 border-orange-200',
  'Dimarahi Bos':     'bg-purple-100 text-purple-700 border-purple-200',
  'Bisnis Boncos':    'bg-cyan-100 text-cyan-700 border-cyan-200',
  'Salah Jurusan':    'bg-emerald-100 text-emerald-700 border-emerald-200',
};

export default function CreatePost({ onCreated, onAuthRequired, loggedIn }: Props) {
  const [category, setCategory] = useState<typeof POST_CATEGORIES[number]>(POST_CATEGORIES[0]);
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const flexWarning = containsFlex(content);
  const canSubmit = content.trim().length >= 10 && !flexWarning && !submitting;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!loggedIn) { onAuthRequired(); return; }
    if (!canSubmit) return;
    setError('');
    setSubmitting(true);
    try {
      const post = await createPost({ category, content: content.trim() });
      setContent('');
      onCreated(post);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal posting');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-lg mx-auto pb-24 px-4 pt-4">
      <h2 className="font-display font-black text-xl text-navy mb-4">✍️ Spill Cerita Gagalmu</h2>

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
        {/* Category */}
        <div className="mb-4">
          <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-2">Kategori</label>
          <div className="flex flex-wrap gap-2">
            {POST_CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategory(cat)}
                className={`text-xs font-bold px-3 py-1.5 rounded-full border transition ${
                  category === cat
                    ? (CATEGORY_COLORS[cat] ?? 'bg-primary text-navy border-primary')
                    : 'bg-gray-50 text-gray-500 border-gray-200 hover:border-primary'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Textarea */}
        <div className="mb-4">
          <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-2">Cerita</label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Ceritain kegagalanmu di sini... (min. 10 karakter)"
            maxLength={280}
            rows={4}
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
          />
          <div className="flex justify-between text-xs text-gray-400 mt-1">
            <span>{content.length} / 280</span>
            {content.length < 10 && content.length > 0 && (
              <span className="text-orange-400">Min. 10 karakter</span>
            )}
          </div>
        </div>

        {/* Anti-flex warning */}
        {flexWarning && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl px-4 py-3 mb-4">
            🚫 <strong>Sensor Anti-Pamer aktif:</strong> Kontenmu mengandung kata-kata yang terdeteksi sebagai pamer.
            Hapus frasa seperti: {ANTI_FLEX_PHRASES.filter((p) => content.toLowerCase().includes(p)).join(', ')}.
          </div>
        )}

        {error && <p className="text-red-500 text-sm mb-3">{error}</p>}

        <button
          type="submit"
          disabled={!canSubmit && loggedIn}
          onClick={!loggedIn ? onAuthRequired : undefined}
          className="w-full bg-navy text-white font-bold py-3 rounded-xl hover:bg-navy/90 transition disabled:opacity-40"
        >
          {submitting ? 'Posting...' : !loggedIn ? 'Login dulu untuk Spill' : 'Spill Sekarang 🚀'}
        </button>
      </form>
    </div>
  );
}
