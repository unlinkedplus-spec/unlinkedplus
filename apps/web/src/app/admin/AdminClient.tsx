'use client';

import { useCallback, useEffect, useState } from 'react';
import { authLogin, authMe } from '../../lib/api';

/** A hung session check must never leave the panel stuck on a spinner. */
function withTimeout<T>(promise: Promise<T>, ms = 8000): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => window.setTimeout(() => reject(new Error('Sesi tidak merespons')), ms)),
  ]);
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface Report {
  id: string;
  targetType: string;
  targetId: string;
  reason: string | null;
  status: string;
  createdAt: string;
}

interface Page<T> {
  data: T[];
  total: number;
  page: number;
  totalPages: number;
}

// ─── API helpers ──────────────────────────────────────────────────────────────

const BASE = process.env.NEXT_PUBLIC_API_URL ?? '/api';

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    credentials: 'include',
    headers: {
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try {
      const d = await res.json() as { message?: string };
      if (d.message) msg = Array.isArray(d.message) ? d.message.join(', ') : d.message;
    } catch {}
    throw new Error(msg);
  }
  return res.json() as Promise<T>;
}

const getReports = (page: number) =>
  apiFetch<Page<Report>>(`/admin/reports?page=${page}&limit=20`);

const resolveReport = (id: string, action: 'dismiss' | 'hide') =>
  apiFetch<Report>(`/admin/reports/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ action }),
  });

// ─── Login form ───────────────────────────────────────────────────────────────

function LoginForm({ onSuccess }: { onSuccess: () => void }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [busy, setBusy]         = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await withTimeout(authLogin({ username, password }), 10000);
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login gagal');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-8">
        <div className="mb-6 text-center">
          <span className="font-display font-black text-2xl text-navy">
            unlinked<span className="text-primary">+</span>
          </span>
          <p className="text-sm text-gray-500 mt-1">Panel Moderasi</p>
        </div>

        <form onSubmit={submit} className="flex flex-col gap-4">
          <div>
            <label className="text-xs font-bold text-gray-500 block mb-1">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoFocus
              autoComplete="username"
              className="w-full border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-500 block mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              className="w-full border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {error && (
            <div className="text-red-600 text-xs bg-red-50 rounded-lg px-3 py-2 flex items-center justify-between gap-2">
              <span>{error}</span>
              <button type="button" onClick={() => window.location.reload()}
                className="font-bold underline shrink-0">Muat ulang</button>
            </div>
          )}
          {!error && (
            <p className="text-[11px] text-gray-400">
              Tidak merespons? Muat ulang halaman (Ctrl+F5), lalu coba lagi.
            </p>
          )}

          <button
            type="submit"
            disabled={busy}
            className="bg-navy text-white font-bold py-2.5 rounded-xl hover:bg-navy/90 transition disabled:opacity-50"
          >
            {busy ? 'Memuat…' : 'Masuk'}
          </button>
        </form>
      </div>
    </div>
  );
}

// ─── Report row ───────────────────────────────────────────────────────────────

function ReportRow({
  report,
  onAction,
}: {
  report: Report;
  onAction: (id: string, action: 'dismiss' | 'hide') => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);

  async function act(action: 'dismiss' | 'hide') {
    setBusy(true);
    await onAction(report.id, action);
    setBusy(false);
  }

  const typeLabel: Record<string, string> = {
    post: 'Postingan',
    comment: 'Komentar',
    user: 'Pengguna',
  };

  return (
    <tr className="border-b border-gray-100 hover:bg-gray-50 transition">
      <td className="px-4 py-3 text-xs text-gray-400 font-mono">
        {report.id.slice(0, 8)}…
      </td>
      <td className="px-4 py-3">
        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-bold ${
          report.targetType === 'post'    ? 'bg-blue-100 text-blue-700'   :
          report.targetType === 'comment' ? 'bg-purple-100 text-purple-700' :
                                            'bg-orange-100 text-orange-700'
        }`}>
          {typeLabel[report.targetType] ?? report.targetType}
        </span>
      </td>
      <td className="px-4 py-3 text-xs text-gray-500 font-mono max-w-[140px] truncate">
        {report.targetId.slice(0, 8)}…
      </td>
      <td className="px-4 py-3 text-sm text-gray-700 max-w-[220px]">
        {report.reason ?? <span className="text-gray-400 italic">—</span>}
      </td>
      <td className="px-4 py-3 text-xs text-gray-400">
        {new Date(report.createdAt).toLocaleString('id-ID', {
          day: '2-digit', month: 'short', year: 'numeric',
          hour: '2-digit', minute: '2-digit',
        })}
      </td>
      <td className="px-4 py-3">
        <div className="flex gap-2">
          <button
            disabled={busy}
            onClick={() => act('dismiss')}
            className="px-3 py-1 rounded-lg text-xs font-bold bg-gray-100 text-gray-600 hover:bg-gray-200 transition disabled:opacity-40"
          >
            Abaikan
          </button>
          <button
            disabled={busy}
            onClick={() => act('hide')}
            className="px-3 py-1 rounded-lg text-xs font-bold bg-red-100 text-red-600 hover:bg-red-200 transition disabled:opacity-40"
          >
            Sembunyikan
          </button>
        </div>
      </td>
    </tr>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

function Dashboard({ onLogout }: { onLogout: () => void }) {
  const [page, setPage]       = useState(1);
  const [data, setData]       = useState<Page<Report> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const [toast, setToast]     = useState('');

  const load = useCallback(async (p: number) => {
    setLoading(true);
    setError('');
    try {
      const result = await getReports(p);
      setData(result);
      setPage(p);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat laporan');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(1); }, [load]);

  async function handleAction(id: string, action: 'dismiss' | 'hide') {
    try {
      await resolveReport(id, action);
      setToast(action === 'dismiss' ? 'Laporan diabaikan.' : 'Konten disembunyikan.');
      setTimeout(() => setToast(''), 3000);
      await load(page);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Aksi gagal');
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-navy text-white px-6 py-4 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-3">
          <span className="font-display font-black text-xl">
            unlinked<span className="text-primary">+</span>
          </span>
          <span className="text-white/40">|</span>
          <span className="text-sm font-semibold text-white/80">Panel Moderasi</span>
        </div>
        <div className="flex items-center gap-4">
          <a href="/cms" className="text-sm text-primary font-bold nav-fx">
            CMS
          </a>
          <a href="/admin/dashboard" className="text-sm text-primary font-bold nav-fx">
            Dashboard
          </a>
          <button
            onClick={onLogout}
            className="text-sm text-white/60 hover:text-white transition"
          >
            Keluar
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        {/* Title row */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-display font-black text-2xl text-navy">Laporan Pending</h1>
            {data && (
              <p className="text-sm text-gray-500 mt-0.5">
                {data.total} laporan menunggu tindakan
              </p>
            )}
          </div>
          <button
            onClick={() => load(page)}
            disabled={loading}
            className="text-sm font-bold text-navy border border-navy/20 px-4 py-2 rounded-xl hover:bg-navy/5 transition disabled:opacity-40"
          >
            {loading ? 'Memuat…' : '↻ Refresh'}
          </button>
        </div>

        {/* Toast */}
        {toast && (
          <div className="mb-4 bg-green-50 text-green-700 text-sm font-medium px-4 py-3 rounded-xl border border-green-200">
            {toast}
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mb-4 bg-red-50 text-red-700 text-sm px-4 py-3 rounded-xl border border-red-200">
            {error}
          </div>
        )}

        {/* Table */}
        {loading && !data ? (
          <div className="text-center py-16 text-gray-400">Memuat laporan…</div>
        ) : data?.data.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-4xl mb-3">🎉</div>
            <p className="font-display font-bold text-lg text-navy">Tidak ada laporan pending</p>
            <p className="text-sm text-gray-500 mt-1">Semua laporan sudah ditangani.</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-400 uppercase tracking-wide">ID</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-400 uppercase tracking-wide">Tipe</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-400 uppercase tracking-wide">Target</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-400 uppercase tracking-wide">Alasan</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-400 uppercase tracking-wide">Waktu</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-400 uppercase tracking-wide">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.data.map((r) => (
                    <ReportRow key={r.id} report={r} onAction={handleAction} />
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {data && data.totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50">
                <span className="text-xs text-gray-400">
                  Halaman {data.page} dari {data.totalPages}
                </span>
                <div className="flex gap-2">
                  <button
                    disabled={page <= 1 || loading}
                    onClick={() => load(page - 1)}
                    className="px-3 py-1 rounded-lg text-xs font-bold bg-white border border-gray-200 text-gray-600 hover:bg-gray-100 disabled:opacity-40 transition"
                  >
                    ← Sebelumnya
                  </button>
                  <button
                    disabled={page >= data.totalPages || loading}
                    onClick={() => load(page + 1)}
                    className="px-3 py-1 rounded-lg text-xs font-bold bg-white border border-gray-200 text-gray-600 hover:bg-gray-100 disabled:opacity-40 transition"
                  >
                    Selanjutnya →
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

// ─── Page root ────────────────────────────────────────────────────────────────

type State = 'loading' | 'login' | 'forbidden' | 'dashboard';

export default function AdminPage() {
  const [state, setState] = useState<State>('loading');

  // On mount: check if already logged in as admin
  useEffect(() => {
    withTimeout(authMe())
      .then((user) => {
        if (user.role === 'admin') {
          setState('dashboard');
        } else {
          setState('forbidden');
        }
      })
      .catch(() => setState('login'));
  }, []);

  function handleLoginSuccess() {
    withTimeout(authMe())
      .then((user) => {
        if (user.role === 'admin') {
          setState('dashboard');
        } else {
          setState('forbidden');
        }
      })
      .catch(() => setState('login'));
  }

  async function handleLogout() {
    try {
      await fetch(`${BASE}/auth/logout`, { method: 'POST', credentials: 'include' });
    } catch {}
    setState('login');
  }

  if (state === 'loading') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-gray-400">Memeriksa sesi…</p>
      </div>
    );
  }

  if (state === 'forbidden') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center">
          <div className="text-5xl mb-4">🚫</div>
          <h1 className="font-display font-black text-2xl text-navy mb-2">Akses Ditolak</h1>
          <p className="text-gray-500 text-sm">Akun ini tidak memiliki hak akses moderasi.</p>
          <button
            onClick={handleLogout}
            className="mt-6 text-sm font-bold text-navy underline"
          >
            Keluar dan coba akun lain
          </button>
        </div>
      </div>
    );
  }

  if (state === 'login') {
    return <LoginForm onSuccess={handleLoginSuccess} />;
  }

  return <Dashboard onLogout={handleLogout} />;
}
