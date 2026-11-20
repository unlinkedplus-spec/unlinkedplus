'use client';

import { useCallback, useEffect, useState } from 'react';
import { authLogout, authMe, getAdPreferences, getMyPosts, getMyStats, updateAdPreferences } from '../lib/api';
import { buildAvatarSVG } from '../lib/avatar-svg';
import { getLevelName, getXpProgress, LEVEL_THRESHOLDS } from '../lib/types';
import type { AdPreferences, Post, User, UserStats } from '../lib/types';
import { relativeTime } from '../lib/time';

interface Props {
  onLogout: () => void;
}

const LEVEL_COLORS: Record<number, string> = {
  1: 'bg-gray-100 text-gray-600',
  2: 'bg-blue-100 text-blue-700',
  3: 'bg-purple-100 text-purple-700',
  4: 'bg-orange-100 text-orange-700',
  5: 'bg-yellow-200 text-yellow-800',
};

export default function ProfileTab({ onLogout }: Props) {
  const [user, setUser] = useState<User | null>(null);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [ads, setAds] = useState<AdPreferences>({ adsEnabled: true, maxPerSession: 5 });
  const [adSaving, setAdSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const [me, s, myPosts, adPrefs] = await Promise.all([
        authMe(), getMyStats(), getMyPosts(1), getAdPreferences(),
      ]);
      setUser(me);
      setStats(s);
      setPosts(myPosts.data);
      setAds(adPrefs);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function saveAds(next: AdPreferences) {
    setAds(next);
    setAdSaving(true);
    try { await updateAdPreferences(next); } catch { void load(); }
    finally { setAdSaving(false); }
  }

  async function handleLogout() {
    try { await authLogout(); } catch {}
    onLogout();
  }

  if (loading) {
    return <div className="flex justify-center py-16 text-gray-400">Memuat profil...</div>;
  }

  if (!user) return null;

  const profile = user.profile;
  const xp = profile?.mentalXp ?? 0;
  const level = profile?.mentalLevel ?? 1;
  const levelColor = LEVEL_COLORS[level] ?? LEVEL_COLORS[1];
  const { pct } = getXpProgress(xp);
  const nextThreshold = LEVEL_THRESHOLDS.find((t) => t.level === level + 1);
  const avatarConfig = profile?.avatarConfig ?? null;

  return (
    <div className="max-w-lg mx-auto pb-28 px-4 pt-4">
      {/* Header card */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 mb-4">
        <div className="flex items-center gap-4 mb-4">
          <svg viewBox="0 0 300 300" width="80" height="80" className="rounded-2xl bg-primary/10 shrink-0">
            <g dangerouslySetInnerHTML={{ __html: buildAvatarSVG(avatarConfig as Parameters<typeof buildAvatarSVG>[0]) }} />
          </svg>
          <div className="flex-1 min-w-0">
            <div className="font-display font-black text-xl text-navy truncate">{user.username}</div>
            <span className={`inline-block text-xs font-bold px-3 py-1 rounded-full mt-1 ${levelColor}`}>
              Level {level} · {getLevelName(level)}
            </span>
          </div>
        </div>

        {/* XP Bar */}
        <div className="mb-3">
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>Mental XP: {xp}</span>
            <span>{nextThreshold ? `Next: Lv.${level + 1} (${nextThreshold.minXp} XP)` : 'MAX LEVEL 🏆'}</span>
          </div>
          <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        {profile?.bio && (
          <p className="text-sm text-gray-600 italic">&ldquo;{profile.bio}&rdquo;</p>
        )}
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm text-center">
            <div className="font-black text-2xl text-navy">{stats.totalPosts}</div>
            <div className="text-xs text-gray-500 mt-1">Total Spill</div>
          </div>
          <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm text-center">
            <div className="font-black text-2xl text-navy">{stats.totalReactionsReceived}</div>
            <div className="text-xs text-gray-500 mt-1">Reaksi Diterima</div>
          </div>
        </div>
      )}

      {/* My posts */}
      {posts.length > 0 && (
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm mb-4">
          <div className="font-bold text-navy mb-3">Post Saya</div>
          <div className="flex flex-col gap-2">
            {posts.slice(0, 5).map((post) => (
              <div key={post.id} className="text-sm border-b border-gray-50 pb-2 last:border-0">
                <div className="font-semibold text-xs text-gray-500 mb-0.5">{post.category}</div>
                <p className="text-navy/80 leading-snug line-clamp-2">{post.content}</p>
                <span className="text-xs text-gray-400">{relativeTime(post.createdAt)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SEC-04: user-controlled ad preferences */}
      <section className="bg-white rounded-2xl p-5 border border-gray-100 mt-4">
        <h3 className="font-display font-bold text-sm text-navy mb-2">Preferensi iklan</h3>
        <p className="text-xs text-gray-500 mb-4">
          Iklan tidak pernah dipilih berdasarkan isi Spill, dugaan kondisi mental, atau identitas anonim kamu.
        </p>
        <label className="flex items-center justify-between text-sm mb-3">
          <span>Tampilkan iklan</span>
          <input
            type="checkbox"
            checked={ads.adsEnabled}
            disabled={adSaving}
            onChange={(e) => void saveAds({ ...ads, adsEnabled: e.target.checked })}
          />
        </label>
        <label className="flex items-center justify-between text-sm gap-3">
          <span>Batas iklan per hari</span>
          <select
            value={ads.maxPerSession}
            disabled={adSaving || !ads.adsEnabled}
            onChange={(e) => void saveAds({ ...ads, maxPerSession: Number(e.target.value) })}
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm"
          >
            {[1, 3, 5, 10, 20].map((n) => <option key={n} value={n}>{n} iklan</option>)}
          </select>
        </label>
      </section>

      {/* Logout */}
      <button
        onClick={handleLogout}
        className="w-full bg-red-50 text-red-600 font-bold py-3 rounded-2xl hover:bg-red-100 transition border border-red-200"
      >
        🚪 Keluar
      </button>
    </div>
  );
}
