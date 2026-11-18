'use client';
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { api, ApiError, errorMessage, isAborted, json, type User } from '../lib/api';
import { Alert, Modal } from './ui';
import { Icon } from './icons';
type Session = {
  user: User | null; checking: boolean; epoch: number; sessionError: string;
  request: typeof api; refreshMe: () => Promise<User>; setUser: (user: User) => void;
  openAuth: (mode?: 'login' | 'register') => void; requireUser: () => boolean;
  logout: () => Promise<void>; notify: (message: string) => void; retrySession: () => void;
};
const Context = createContext<Session | null>(null);
export function useSession() { const value = useContext(Context); if (!value) throw new Error('Session provider missing'); return value; }
export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, updateUser] = useState<User | null>(null);
  const [checking, setChecking] = useState(true);
  const [epoch, setEpoch] = useState(0);
  const [sessionError, setSessionError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [auth, setAuth] = useState<'login' | 'register' | null>(null);
  const [notice, setNotice] = useState('');
  const request: typeof api = useCallback(async <T,>(path: string, options?: RequestInit): Promise<T> => {
    try { return await api<T>(path, options); }
    catch (error) {
      if (error instanceof ApiError && error.status === 401) { updateUser(null); setNotice(''); setAuth('login'); }
      throw error;
    }
  }, []);
  useEffect(() => {
    const controller = new AbortController(); setChecking(true); setSessionError('');
    api<User>('/auth/me', { signal: controller.signal }).then(updateUser).catch(error => {
      if (isAborted(error)) return;
      if (error instanceof ApiError && error.status === 401) updateUser(null);
      else setSessionError(errorMessage(error));
    }).finally(() => { if (!controller.signal.aborted) setChecking(false); });
    return () => controller.abort();
  }, [attempt]);
  const refreshMe = useCallback(async () => { const next = await request<User>('/auth/me'); updateUser(next); return next; }, [request]);
  const openAuth = useCallback((mode: 'login' | 'register' = 'login') => setAuth(mode), []);
  const value: Session = {
    user, checking, epoch, sessionError, request, refreshMe, setUser: updateUser, openAuth,
    requireUser: () => { if (user) return true; setAuth('login'); return false; },
    logout: async () => { await request('/auth/logout', { method: 'POST' }); updateUser(null); setAuth(null); setEpoch(n => n + 1); setSessionError(''); setNotice('Kamu sudah keluar. Sampai ketemu lagi.'); },
    notify: setNotice, retrySession: () => setAttempt(n => n + 1),
  };
  return <Context.Provider value={value}>{children}{notice && <div className="toast" role="status"><Icon name="check"/><span>{notice}</span><button className="icon-button" aria-label="Tutup pemberitahuan" onClick={() => setNotice('')}><Icon name="close"/></button></div>}{auth && <AuthForm key={auth} mode={auth} onMode={setAuth} onClose={() => setAuth(null)}/>}</Context.Provider>;
}
function AuthForm({ mode, onMode, onClose }: { mode: 'login' | 'register'; onMode: (mode: 'login' | 'register') => void; onClose: () => void }) {
  const { request, setUser, notify } = useSession();
  const [username, setUsername] = useState(''); const [password, setPassword] = useState('');
  const [error, setError] = useState(''); const [busy, setBusy] = useState(false); const [show, setShow] = useState(false);
  const register = mode === 'register';
  return <Modal title={register ? 'Di sini, cukup jadi manusia.' : 'Selamat datang kembali.'} onClose={onClose} busy={busy}>
    <p className="muted">{register ? 'Tidak perlu email, nama asli, atau CV. Pilih nama samaranmu.' : 'Masuk dengan nama samaran dan kata sandi yang kamu simpan.'}</p>
    <form onSubmit={async event => {
      event.preventDefault(); if (busy) return; setError('');
      const bytes = new TextEncoder().encode(password).length;
      if (register && Array.from(password).length < 12) { setError('Kata sandi baru harus minimal 12 karakter.'); return; }
      if (bytes < 1 || bytes > 72) { setError('Kata sandi harus terisi dan maksimal 72 byte. Beberapa karakter memakai lebih dari 1 byte.'); return; }
      setBusy(true);
      try { const result = await request<{ user: User }>(register ? '/auth/register' : '/auth/login', { method: 'POST', body: json({ ...(username.trim() ? { username: username.trim() } : {}), password }) }); setUser(result.user); notify(register ? `Akun dibuat. Simpan nama samaranmu: ${result.user.username}` : `Senang melihatmu lagi, ${result.user.username}.`); onClose(); }
      catch (error) { setError(errorMessage(error)); } finally { setBusy(false); }
    }}>
      <label className="field">Nama samaran {register && <span className="optional">(opsional)</span>}<input autoFocus name="username" autoComplete="username" minLength={register ? 3 : undefined} maxLength={50} pattern={register ? '[a-zA-Z0-9_]+' : undefined} required={!register} value={username} onChange={e => setUsername(e.target.value)} disabled={busy} placeholder={register ? 'Kosongkan untuk dibuatkan' : 'Nama samaranmu'} aria-describedby="username-help"/></label>
      <p className="field-hint" id="username-help">3–50 huruf, angka, atau garis bawah. Nama ini terlihat oleh pengguna lain.</p>
      <label className="field">Kata sandi<input name="password" type={show ? 'text' : 'password'} autoComplete={register ? 'new-password' : 'current-password'} required maxLength={72} value={password} onChange={e => setPassword(e.target.value)} disabled={busy} aria-describedby="password-help"/></label>
      <label className="check-field"><input type="checkbox" checked={show} onChange={e => setShow(e.target.checked)}/>Tampilkan kata sandi</label>
      <p className="field-hint" id="password-help">{register ? 'Minimal 12 karakter dan maksimal 72 byte.' : 'Masukkan kata sandi akunmu (maksimal 72 byte).'} Simpan nama samaran dan kata sandimu; belum ada pemulihan akun. Nama samaran bukan jaminan anonimitas mutlak.</p>
      <Alert>{error}</Alert><button className="button primary full" disabled={busy}>{busy ? 'Memproses…' : register ? 'Buat ruang untuk ceritamu' : 'Masuk'}<Icon name="arrow"/></button>
    </form>
    <p className="auth-switch">{register ? 'Sudah punya akun?' : 'Baru di sini?'} <button className="text-button" disabled={busy} onClick={() => onMode(register ? 'login' : 'register')}>{register ? 'Masuk' : 'Buat akun'}</button></p>
  </Modal>;
}
export function useResource<T>(path: string | null, key: string | number = '') {
  const { request } = useSession(); const [revision, setRevision] = useState(0);
  const [state, setState] = useState<{ data: T | null; loading: boolean; error: string }>({ data: null, loading: !!path, error: '' });
  const reload = useCallback(() => setRevision(n => n + 1), []);
  const current = useRef(path); current.current = path;
  useEffect(() => {
    if (!path) { setState({ data: null, loading: false, error: '' }); return; }
    const controller = new AbortController(); setState({ data: null, loading: true, error: '' });
    request<T>(path, { signal: controller.signal }).then(data => { if (!controller.signal.aborted) setState({ data, loading: false, error: '' }); }).catch(error => { if (!controller.signal.aborted) setState({ data: null, loading: false, error: errorMessage(error) }); });
    return () => controller.abort();
  }, [path, request, revision, key]);
  return { ...state, reload };
}
export function SignInPrompt({ title = 'Cerita boleh pakai nama samaran.' }: { title?: string }) {
  const { openAuth, checking } = useSession();
  return <div className="sign-in-prompt"><Icon name="shield" width="32" height="32"/><h3>{title}</h3><p>Baca dulu juga boleh. Masuk untuk ikut berbagi, menyimpan avatar, dan memberi dukungan.</p><button className="button primary" disabled={checking} onClick={() => openAuth('login')}>{checking ? 'Memeriksa sesi…' : 'Masuk / buat akun'}<Icon name="arrow"/></button></div>;
}
