'use client';

import { useState } from 'react';
import { authLogin, authRegister } from '../lib/api';

interface Props {
  defaultTab?: 'register' | 'login';
  onSuccess: () => void;
  onClose: () => void;
}

export default function AuthModal({ defaultTab = 'register', onSuccess, onClose }: Props) {
  const [tab, setTab] = useState<'register' | 'login'>(defaultTab);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (tab === 'register') {
        await authRegister({ username: username || undefined, password });
      } else {
        await authLogin({ username, password });
      }
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-display font-black text-xl text-navy">
            {tab === 'register' ? 'Daftar Akun' : 'Masuk'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
        </div>

        <div className="flex gap-2 mb-4">
          <button
            className={`flex-1 py-2 rounded-xl font-bold text-sm transition ${tab === 'register' ? 'bg-primary text-navy' : 'bg-gray-100 text-gray-500'}`}
            onClick={() => setTab('register')}
          >Daftar</button>
          <button
            className={`flex-1 py-2 rounded-xl font-bold text-sm transition ${tab === 'login' ? 'bg-primary text-navy' : 'bg-gray-100 text-gray-500'}`}
            onClick={() => setTab('login')}
          >Masuk</button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div>
            <label className="text-xs font-bold text-gray-500 block mb-1">
              Username{tab === 'register' ? ' (opsional — auto-generate jika kosong)' : ''}
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder={tab === 'register' ? 'BudakKantor_... (opsional)' : 'Username'}
              required={tab === 'login'}
              minLength={tab === 'login' ? 1 : undefined}
              pattern={tab === 'register' && username ? '[a-zA-Z0-9_]+' : undefined}
              className="w-full border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-500 block mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Min. 8 karakter"
              required
              minLength={8}
              className="w-full border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {error && <p className="text-red-500 text-xs">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="bg-navy text-white font-bold py-2.5 rounded-xl hover:bg-navy/90 transition disabled:opacity-50"
          >
            {loading ? 'Loading...' : tab === 'register' ? 'Daftar & Masuk' : 'Masuk'}
          </button>
        </form>
      </div>
    </div>
  );
}
