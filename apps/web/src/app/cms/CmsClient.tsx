'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { authLogin, authLogout, authMe } from '../../lib/api';
import type { User } from '../../lib/types';
import { AdsPanel, CertificatesPanel, ContentPanel, PollsPanel, StorePanel } from '../../components/CmsPanels';

type Tab = 'content' | 'polls' | 'store' | 'ads' | 'certificates';
const TABS: Array<{ id: Tab; label: string }> = [
  { id: 'content', label: 'Fitur & Konten' },
  { id: 'polls', label: 'Poll' },
  { id: 'store', label: 'Toko' },
  { id: 'ads', label: 'Iklan' },
  { id: 'certificates', label: 'Sertifikat' },
];

/** Never let a hanging session check leave the operator staring at a spinner. */
function withTimeout<T>(promise: Promise<T>, ms = 8000): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => window.setTimeout(() => reject(new Error('Sesi tidak merespons')), ms)),
  ]);
}

export default function CmsClient() {
  const [state, setState] = useState<'loading' | 'login' | 'ready'>('loading');
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [tab, setTab] = useState<Tab>('content');

  useEffect(() => {
    let active = true;
    withTimeout(authMe())
      .then((me: User) => { if (active) setState(me.role === 'admin' ? 'ready' : 'login'); })
      .catch(() => { if (active) setState('login'); });
    return () => { active = false; };
  }, []);

  async function login(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    try {
      await withTimeout(authLogin({ username, password }));
      const me = await withTimeout(authMe());
      if (me.role !== 'admin') {
        await authLogout();
        setError('Akun ini bukan admin.');
        return;
      }
      setState('ready');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal masuk');
    }
  }

  async function logout() {
    await authLogout().catch(() => undefined);
    setState('login');
  }

  const notify = (message: string) => {
    setNotice(message);
    window.setTimeout(() => setNotice(''), 4000);
  };

  if (state === 'loading') {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center text-sm text-gray-400">
        Memeriksa sesi…
      </main>
    );
  }

  if (state === 'login') {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center p-4">
        <form onSubmit={(e) => void login(e)} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 max-w-sm w-full">
          <span className="text-xs font-bold tracking-widest text-primary">UNLINKED+ · CMS</span>
          <h1 className="font-display font-black text-2xl text-navy mt-2 mb-1">Panel Konten</h1>
          <p className="text-xs text-gray-400 mb-6">Kelola fitur dan konten yang tampil di landing.</p>
          <div className="flex flex-col gap-3">
            <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Username admin"
              className="border border-gray-200 rounded-xl px-4 py-2 text-sm" />
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password"
              className="border border-gray-200 rounded-xl px-4 py-2 text-sm" />
            {error && <p className="text-xs text-red-500">{error}</p>}
            <button className="bg-navy text-white font-bold py-2.5 rounded-xl text-sm">Masuk</button>
          </div>
          <p className="text-xs text-gray-400 mt-4">
            Ringkasan ada di <Link href="/admin/dashboard" className="text-primary nav-fx">/admin/dashboard</Link>.
          </p>
        </form>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background p-4 sm:p-8">
      <div className="max-w-6xl mx-auto">
        <header className="flex flex-wrap items-center justify-between gap-3 mb-5">
          <div>
            <span className="text-xs font-bold tracking-widest text-primary">UNLINKED+ · CMS</span>
            <h1 className="font-display font-black text-2xl text-navy">Panel Konten</h1>
          </div>
          <div className="flex gap-2">
            <Link href="/admin/dashboard" className="border border-gray-200 rounded-xl px-4 py-2 text-sm font-bold text-navy nav-fx">Ringkasan</Link>
            <button onClick={() => void logout()} className="bg-navy text-white rounded-xl px-4 py-2 text-sm font-bold">Keluar</button>
          </div>
        </header>

        <nav className="flex flex-wrap gap-2 mb-5">
          {TABS.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`tab-fx rounded-xl px-4 py-2 text-sm font-bold ${tab === t.id ? 'bg-primary text-navy' : 'bg-white border border-gray-200 text-gray-500'}`}>
              {t.label}
            </button>
          ))}
        </nav>

        {notice && <p className="bg-yellow-50 border border-yellow-200 text-yellow-800 text-sm rounded-xl px-4 py-2 mb-4">{notice}</p>}

        {tab === 'content' && <ContentPanel notify={notify} />}
        {tab === 'polls' && <PollsPanel notify={notify} />}
        {tab === 'store' && <StorePanel notify={notify} />}
        {tab === 'ads' && <AdsPanel notify={notify} />}
        {tab === 'certificates' && <CertificatesPanel notify={notify} />}
      </div>
    </main>
  );
}
