'use client';

import { useState } from 'react';
import { authLogin, authRegister, requestPasswordReset, resetPassword } from '../lib/api';

type Tab = 'register' | 'login' | 'forgot' | 'reset';

interface Props {
  defaultTab?: Tab;
  /** Prefilled when the app is opened from a reset link (?reset=<token>). */
  resetToken?: string;
  onSuccess: () => void;
  onClose: () => void;
}

export default function AuthModal({ defaultTab = 'register', resetToken = '', onSuccess, onClose }: Props) {
  const [tab, setTab] = useState<Tab>(resetToken ? 'reset' : defaultTab);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [token, setToken] = useState(resetToken);
  const [recoveryCode, setRecoveryCode] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function switchTab(next: Tab) {
    setTab(next);
    setError('');
    setNotice('');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setNotice('');
    setLoading(true);
    try {
      if (tab === 'register') {
        const result = await authRegister({
          username: username || undefined,
          password,
          email: email || undefined,
        });
        if (result.recoveryCode) {
          // One-time code: show it before entering the app so the user can save it.
          setRecoveryCode(result.recoveryCode);
        } else {
          onSuccess();
        }
      } else if (tab === 'login') {
        await authLogin({ username, password });
        onSuccess();
      } else if (tab === 'forgot') {
        const result = await requestPasswordReset(email);
        setNotice(result.emailSent
          ? 'Tautan reset sudah dikirim ke email kamu. Cek inbox dan folder spam.'
          : 'Kalau email terdaftar, tautan reset akan dikirim. Cek inbox dan folder spam.');
      } else {
        await resetPassword(token.trim(), password);
        setNotice('Kata sandi berhasil diganti. Semua sesi lama sudah dicabut. Silakan masuk lagi.');
        setPassword('');
        setTab('login');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan');
    } finally {
      setLoading(false);
    }
  }

  if (recoveryCode) {
    return (
      <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={onClose}>
        <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
          <h2 className="font-display font-black text-xl text-navy mb-2">Simpan kode pemulihanmu</h2>
          <p className="text-sm text-gray-500 mb-3">
            Kode ini hanya muncul sekali. Pakai kode ini di menu <b>Lupa kata sandi</b> kalau kamu tidak bisa mengakses email.
          </p>
          <code className="block bg-gray-100 rounded-xl p-3 text-xs break-all select-all mb-4">{recoveryCode}</code>
          <button
            onClick={() => { navigator.clipboard?.writeText(recoveryCode).catch(() => {}); }}
            className="w-full border border-gray-200 rounded-xl py-2 text-sm font-bold text-navy mb-2 hover:bg-gray-50"
          >Salin kode</button>
          <button
            onClick={onSuccess}
            className="w-full bg-navy text-white font-bold py-2.5 rounded-xl hover:bg-navy/90"
          >Sudah disimpan, lanjut</button>
        </div>
      </div>
    );
  }

  const title = tab === 'register' ? 'Daftar Akun'
    : tab === 'login' ? 'Masuk'
    : tab === 'forgot' ? 'Pulihkan Akun'
    : 'Ganti Kata Sandi';

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-display font-black text-xl text-navy">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
        </div>

        {(tab === 'register' || tab === 'login') && (
          <div className="flex gap-2 mb-4">
            <button
              className={`flex-1 py-2 rounded-xl font-bold text-sm transition ${tab === 'register' ? 'bg-primary text-navy' : 'bg-gray-100 text-gray-500'}`}
              onClick={() => switchTab('register')}
            >Daftar</button>
            <button
              className={`flex-1 py-2 rounded-xl font-bold text-sm transition ${tab === 'login' ? 'bg-primary text-navy' : 'bg-gray-100 text-gray-500'}`}
              onClick={() => switchTab('login')}
            >Masuk</button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          {tab === 'register' && (
            <div>
              <label className="text-xs font-bold text-gray-500 block mb-1">Email (opsional, untuk pemulihan)</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="manusia@example.com"
                className="w-full border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          )}

          {tab === 'forgot' && (
            <div>
              <label className="text-xs font-bold text-gray-500 block mb-1">Email terdaftar</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="manusia@example.com"
                required
                className="w-full border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <p className="text-xs text-gray-400 mt-1">
                Bisa juga pakai kode pemulihan sekali pakai yang kamu simpan saat daftar.
              </p>
            </div>
          )}

          {tab === 'reset' && (
            <div>
              <label className="text-xs font-bold text-gray-500 block mb-1">Kode / tautan reset</label>
              <input
                type="text"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="Tempel kode pemulihan atau token dari email"
                required
                className="w-full border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          )}

          {(tab === 'register' || tab === 'login') && (
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
                pattern={tab === 'register' && username ? '[a-zA-Z0-9_]+' : undefined}
                className="w-full border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          )}

          {tab !== 'forgot' && (
            <div>
              <label className="text-xs font-bold text-gray-500 block mb-1">
                {tab === 'reset' ? 'Kata sandi baru' : 'Password'}
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min. 12 karakter"
                required
                minLength={12}
                maxLength={72}
                className="w-full border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          )}

          {error && <p className="text-red-500 text-xs">{error}</p>}
          {notice && <p className="text-green-600 text-xs">{notice}</p>}

          <button
            type="submit"
            disabled={loading}
            className="bg-navy text-white font-bold py-2.5 rounded-xl hover:bg-navy/90 transition disabled:opacity-50"
          >
            {loading ? 'Loading...' : tab === 'register' ? 'Daftar & Masuk'
              : tab === 'login' ? 'Masuk'
              : tab === 'forgot' ? 'Kirim Tautan Reset'
              : 'Simpan Kata Sandi Baru'}
          </button>
        </form>

        <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 mt-4 text-xs">
          {tab === 'login' && (
            <button onClick={() => switchTab('forgot')} className="text-primary font-bold hover:underline">
              Lupa kata sandi?
            </button>
          )}
          {tab !== 'login' && tab !== 'register' && (
            <button onClick={() => switchTab('login')} className="text-gray-500 font-bold hover:underline">
              Kembali ke masuk
            </button>
          )}
          {tab === 'forgot' && (
            <button onClick={() => switchTab('reset')} className="text-gray-500 font-bold hover:underline">
              Sudah punya kode/tautan?
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
