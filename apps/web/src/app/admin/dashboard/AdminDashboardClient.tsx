'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  adminOverview,
  adminPosts,
  adminReports,
  adminResolveReport,
  adminSetUserStatus,
  adminUsers,
  authLogin,
  authLogout,
  authMe,
} from '../../../lib/api';
import type {
  AdminOverview,
  AdminPost,
  AdminReport,
  AdminStats,
  AdminUser,
  PaginatedResponse,
  User,
} from '../../../lib/types';

/** A hung session check must never leave the dashboard stuck on a spinner. */
function withTimeout<T>(promise: Promise<T>, ms = 8000): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => window.setTimeout(() => reject(new Error('Sesi tidak merespons')), ms)),
  ]);
}

type State = 'loading' | 'login' | 'forbidden' | 'ready';

const STAT_LABELS: { key: keyof AdminStats; label: string }[] = [
  { key: 'users', label: 'Pengguna' },
  { key: 'activeUsers', label: 'Aktif' },
  { key: 'posts', label: 'Postingan' },
  { key: 'activePosts', label: 'Postingan aktif' },
  { key: 'comments', label: 'Komentar' },
  { key: 'pendingReports', label: 'Laporan pending' },
  { key: 'simulatedTransactions', label: 'Transaksi simulasi' },
  { key: 'activePolls', label: 'Poll aktif' },
  { key: 'pendingCertificates', label: 'Sertifikat pending' },
];

function dateLabel(value: string) {
  return new Date(value).toLocaleString('id-ID', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
  });
}

export default function AdminDashboardPage() {
  const [state, setState] = useState<State>('loading');
  const [emailOrUsername, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [busy, setBusy] = useState(false);
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [users, setUsers] = useState<PaginatedResponse<AdminUser> | null>(null);
  const [posts, setPosts] = useState<PaginatedResponse<AdminPost> | null>(null);
  const [reports, setReports] = useState<PaginatedResponse<AdminReport> | null>(null);
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    try {
      const [overviewData, usersData, postsData, reportsData] = await Promise.all([
        adminOverview(), adminUsers(1, 10), adminPosts(1, 5), adminReports(1, 10),
      ]);
      setOverview(overviewData);
      setUsers(usersData);
      setPosts(postsData);
      setReports(reportsData);
      setState('ready');
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Gagal memuat dashboard');
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const me: User = await withTimeout(authMe());
        if (!cancelled && me.role === 'admin') {
          setState('ready');
          void load();
        } else if (!cancelled) {
          setState('forbidden');
        }
      } catch {
        if (!cancelled) setState('login');
      }
    })();
    return () => { cancelled = true; };
  }, [load]);

  async function handleLogin(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setLoginError('');
    try {
      await withTimeout(authLogin({ username: emailOrUsername, password }));
      const me = await withTimeout(authMe());
      if (me.role !== 'admin') {
        await authLogout();
        setLoginError('Akun ini bukan admin.');
        return;
      }
      setState('ready');
      await load();
    } catch (error) {
      setLoginError(error instanceof Error ? error.message : 'Gagal masuk');
    } finally {
      setBusy(false);
    }
  }

  async function handleLogout() {
    await authLogout();
    setState('login');
    setOverview(null);
  }

  async function resolveReport(id: string, action: 'dismiss' | 'hide') {
    setBusy(true);
    setNotice('');
    try {
      await adminResolveReport(id, action);
      setNotice(action === 'hide' ? 'Target disembunyikan.' : 'Laporan ditolak.');
      await load();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Gagal memproses laporan');
    } finally {
      setBusy(false);
    }
  }

  async function toggleUserStatus(user: AdminUser) {
    const status = user.status === 'active' ? 'disabled' : 'active';
    setBusy(true);
    setNotice('');
    try {
      await adminSetUserStatus(user.id, status);
      setNotice(`@${user.username} sekarang ${status}.`);
      await load();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Gagal mengubah status');
    } finally {
      setBusy(false);
    }
  }

  if (state === 'loading') {
    return <main className="min-h-screen bg-background flex items-center justify-center text-sm text-gray-400">Memuat dashboard…</main>;
  }

  if (state === 'forbidden') {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl border border-gray-100 p-8 max-w-sm w-full text-center">
          <h1 className="font-display font-black text-xl text-navy mb-2">Akses admin diperlukan</h1>
          <p className="text-sm text-gray-500 mb-4">Akun kamu tidak punya hak akses ke dashboard ini.</p>
          <Link href="/app" className="text-primary font-bold text-sm hover:underline">Kembali ke aplikasi</Link>
        </div>
      </main>
    );
  }

  if (state === 'login') {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 max-w-sm w-full">
          <span className="text-xs font-bold tracking-widest text-primary">UNLINKED+ · ADMIN</span>
          <h1 className="font-display font-black text-2xl text-navy mt-2 mb-6">Dashboard</h1>
          <form onSubmit={handleLogin} className="flex flex-col gap-3">
            <input
              value={emailOrUsername} onChange={(e) => setUsername(e.target.value)}
              placeholder="Username admin" required autoComplete="username"
              className="w-full border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <input
              type="password" value={password} onChange={(e) => setPassword(e.target.value)}
              placeholder="Password" required autoComplete="current-password"
              className="w-full border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
            {loginError && <p className="text-red-500 text-xs">{loginError}</p>}
            <button
              disabled={busy}
              className="bg-navy text-white font-bold py-2.5 rounded-xl hover:bg-navy/90 disabled:opacity-50"
            >{busy ? 'Memuat…' : 'Masuk'}</button>
          </form>
          <p className="text-xs text-gray-400 mt-4">
            Moderasi laporan juga tersedia di <Link href="/admin" className="text-primary hover:underline">/admin</Link>.
          </p>
        </div>
      </main>
    );
  }

  const stats = overview?.stats;
  const maxPosts = Math.max(1, ...(overview?.activity.map((day) => day.posts) ?? [1]));

  return (
    <main className="min-h-screen bg-background p-4 sm:p-8">
      <div className="max-w-6xl mx-auto">
        <header className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div>
            <span className="text-xs font-bold tracking-widest text-primary">UNLINKED+ · ADMIN</span>
            <h1 className="font-display font-black text-2xl text-navy">Dashboard Ringkasan</h1>
          </div>
          <div className="flex gap-2">
            <Link href="/cms" className="border border-gray-200 rounded-xl px-4 py-2 text-sm font-bold text-navy hover:bg-gray-50 nav-fx">CMS</Link>
            <Link href="/admin" className="border border-gray-200 rounded-xl px-4 py-2 text-sm font-bold text-navy hover:bg-gray-50 nav-fx">Moderasi</Link>
            <button onClick={() => void handleLogout()} className="bg-navy text-white rounded-xl px-4 py-2 text-sm font-bold hover:bg-navy/90">Keluar</button>
          </div>
        </header>

        {notice && (
          <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 text-sm rounded-xl px-4 py-2 mb-4">{notice}</div>
        )}

        <button onClick={() => void load()} className="text-xs font-bold text-primary hover:underline mb-4">Muat ulang data</button>

        <p className="text-xs text-gray-400 mb-3">
          Transaksi simulasi bukan pendapatan nyata. Belum ada payment gateway resmi yang terhubung.
        </p>
        <section className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {STAT_LABELS.map(({ key, label }) => (
            <div key={key} className="bg-white rounded-2xl border border-gray-100 p-4">
              <p className="text-xs text-gray-400">{label}</p>
              <p className="font-display font-black text-2xl text-navy mt-1">{stats?.[key] ?? '—'}</p>
            </div>
          ))}
        </section>

        <section className="bg-white rounded-2xl border border-gray-100 p-5 mb-6">
          <h2 className="font-display font-bold text-lg text-navy mb-4">Aktivitas 7 hari terakhir</h2>
          <div className="flex items-end gap-2 h-32">
            {(overview?.activity ?? []).map((day) => (
              <div key={day.date} className="flex-1 flex flex-col items-center gap-1">
                <div
                  className="w-full bg-primary rounded-t-md min-h-[2px]"
                  style={{ height: `${Math.max(2, (day.posts / maxPosts) * 100)}%` }}
                  title={`${day.date}: ${day.posts} postingan`}
                />
                <span className="text-[10px] text-gray-400">{day.date.slice(5)}</span>
              </div>
            ))}
          </div>
        </section>

        <div className="grid lg:grid-cols-2 gap-6">
          <section className="bg-white rounded-2xl border border-gray-100 p-5">
            <h2 className="font-display font-bold text-lg text-navy mb-3">Pengguna terbaru</h2>
            <ul className="divide-y divide-gray-100">
              {(overview?.recent.users ?? []).map((user) => (
                <li key={user.id} className="flex items-center justify-between gap-2 py-2">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-navy truncate">@{user.username}</p>
                    <p className="text-xs text-gray-400">{dateLabel(user.createdAt)}</p>
                  </div>
                  <button
                    disabled={busy}
                    onClick={() => void toggleUserStatus(user)}
                    className={`text-xs font-bold rounded-lg px-3 py-1 ${user.status === 'active' ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-700'}`}
                  >{user.status === 'active' ? 'Nonaktifkan' : 'Aktifkan'}</button>
                </li>
              ))}
            </ul>
          </section>

          <section className="bg-white rounded-2xl border border-gray-100 p-5">
            <h2 className="font-display font-bold text-lg text-navy mb-3">Postingan terbaru</h2>
            <ul className="divide-y divide-gray-100">
              {(overview?.recent.posts ?? []).map((post) => (
                <li key={post.id} className="py-2">
                  <p className="text-sm text-navy line-clamp-2">{post.content}</p>
                  <p className="text-xs text-gray-400">{post.category} · {dateLabel(post.createdAt)}</p>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <section className="bg-white rounded-2xl border border-gray-100 p-5 mt-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display font-bold text-lg text-navy">Laporan pending</h2>
            <span className="text-xs text-gray-400">{reports?.total ?? 0} total</span>
          </div>
          <ul className="divide-y divide-gray-100">
            {(reports?.data ?? []).map((report) => (
              <li key={report.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-navy">{report.targetType} · {report.status}</p>
                  <p className="text-sm text-gray-500">{report.reason ?? 'Tanpa alasan'}</p>
                  <p className="text-xs text-gray-400">Target: {report.targetId} · {dateLabel(report.createdAt)}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    disabled={busy}
                    onClick={() => void resolveReport(report.id, 'dismiss')}
                    className="border border-gray-200 rounded-lg px-3 py-1 text-xs font-bold text-navy"
                  >Tolak</button>
                  <button
                    disabled={busy}
                    onClick={() => void resolveReport(report.id, 'hide')}
                    className="bg-red-50 text-red-600 rounded-lg px-3 py-1 text-xs font-bold"
                  >Sembunyikan</button>
                </div>
              </li>
            ))}
            {!reports?.data.length && <li className="py-4 text-sm text-gray-400">Tidak ada laporan pending.</li>}
          </ul>
        </section>

        <section className="bg-white rounded-2xl border border-gray-100 p-5 mt-6">
          <h2 className="font-display font-bold text-lg text-navy mb-3">Daftar pengguna ({users?.total ?? 0})</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-xs text-gray-400 border-b border-gray-100">
                  <th className="py-2">Username</th><th>Role</th><th>Status</th><th>Bergabung</th><th />
                </tr>
              </thead>
              <tbody>
                {(users?.data ?? []).map((user) => (
                  <tr key={user.id} className="border-b border-gray-50 text-sm">
                    <td className="py-2 font-bold text-navy">@{user.username}</td>
                    <td className="text-gray-500">{user.role}</td>
                    <td className="text-gray-500">{user.status}</td>
                    <td className="text-xs text-gray-400">{dateLabel(user.createdAt)}</td>
                    <td className="text-right">
                      <button
                        disabled={busy}
                        onClick={() => void toggleUserStatus(user)}
                        className="text-xs font-bold text-primary hover:underline"
                      >{user.status === 'active' ? 'Nonaktifkan' : 'Aktifkan'}</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-gray-400 mt-3">
            {posts?.total ?? 0} postingan terakhir · halaman {posts?.page ?? 1}/{posts?.totalPages ?? 1}
          </p>
        </section>
      </div>
    </main>
  );
}
