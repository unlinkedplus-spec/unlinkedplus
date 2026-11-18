'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { authRegister, authLogin } from '../lib/api';

export default function WaitlistForm({ mode }: { mode: 'hero' | 'nav' }) {
  const router = useRouter();
  const [step, setStep] = useState<'idle' | 'form' | 'loading' | 'done'>('idle');
  const [tab, setTab] = useState<'register' | 'login'>('register');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setStep('loading');
    try {
      if (tab === 'register') {
        await authRegister({ username: username || undefined, password });
      } else {
        await authLogin({ username, password });
      }
      router.push('/app');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal login');
      setStep('form');
    }
  }

  if (mode === 'nav') {
    return (
      <button
        onClick={() => router.push('/app')}
        className="bg-navy text-white font-semibold px-5 py-2 rounded-full text-sm hover:bg-navy/90 transition"
      >
        Masuk ke App →
      </button>
    );
  }

  if (step === 'idle') {
    return (
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <button
          onClick={() => { setTab('register'); setStep('form'); }}
          className="bg-navy text-white font-bold px-8 py-3 rounded-full text-lg hover:bg-navy/90 transition shadow-lg"
        >
          Daftar Gratis →
        </button>
        <button
          onClick={() => { setTab('login'); setStep('form'); }}
          className="bg-white/80 text-navy font-bold px-8 py-3 rounded-full text-lg hover:bg-white transition"
        >
          Sudah punya akun
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl p-6 max-w-sm mx-auto shadow-xl border border-gray-100">
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
        <input
          type="text"
          placeholder={tab === 'register' ? 'Username (opsional)' : 'Username'}
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          minLength={tab === 'login' ? 1 : 0}
          required={tab === 'login'}
        />
        <input
          type="password"
          placeholder="Password (min. 8 karakter)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={8}
          className="border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        />
        {error && <p className="text-red-500 text-xs">{error}</p>}
        <button
          type="submit"
          disabled={step === 'loading'}
          className="bg-navy text-white font-bold py-2 rounded-xl text-sm hover:bg-navy/90 transition disabled:opacity-50"
        >
          {step === 'loading' ? 'Loading...' : tab === 'register' ? 'Daftar & Masuk' : 'Masuk'}
        </button>
      </form>
    </div>
  );
}
