'use client';

/** User-owned ad preferences: never derived from Spill content. */
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getAdPreferences, updateAdPreferences } from '../lib/api';
import type { AdPreferences } from '../lib/types';

interface Props {
  authenticated: boolean;
  onAuthRequired: () => void;
}

export default function AdPreferencesPanel({ authenticated, onAuthRequired }: Props) {
  const [prefs, setPrefs] = useState<AdPreferences | null>(null);
  const [draft, setDraft] = useState<AdPreferences | null>(null);
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!authenticated) return;
    let active = true;
    getAdPreferences()
      .then((value) => { if (active) { setPrefs(value); setDraft(value); } })
      .catch(() => { if (active) setNotice('Gagal memuat preferensi iklan.'); });
    return () => { active = false; };
  }, [authenticated]);

  async function save() {
    if (!draft) return;
    setBusy(true);
    setNotice('');
    try {
      const saved = await updateAdPreferences(draft);
      setPrefs(saved);
      setDraft(saved);
      setNotice('Preferensi disimpan. Berlaku untuk akunmu di semua perangkat.');
    } catch (err) {
      setNotice(err instanceof Error ? err.message : 'Gagal menyimpan preferensi');
    } finally {
      setBusy(false);
    }
  }

  if (!authenticated) {
    return (
      <div className="fp-card">
        <div className="fp-big">Masuk untuk mengatur preferensi iklan.</div>
        <p className="fp-muted">Pengaturan ini milik kamu, bukan hasil membaca isi Spill.</p>
        <button className="fp-btn" onClick={onAuthRequired}>Masuk / Daftar</button>
      </div>
    );
  }

  const value = draft ?? prefs;

  return (
    <>
      <div className="fp-card">
        {notice && <p className="fp-note" style={{ background: '#F7F8FE' }}>{notice}</p>}
        {!value && <p className="fp-muted">Memuat preferensi…</p>}
        {value && (
          <>
            <label className="fp-muted" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input type="checkbox" checked={value.adsEnabled}
                onChange={(e) => setDraft({ ...value, adsEnabled: e.target.checked })} />
              Tampilkan iklan berlabel (SPONSORED)
            </label>
            <label className="fp-muted" htmlFor="ad-cap" style={{ display: 'block', marginTop: 12 }}>
              Maksimal tayang iklan per sesi
            </label>
            <input id="ad-cap" className="fp-input" type="number" min={1} max={20}
              value={value.maxPerSession}
              onChange={(e) => setDraft({ ...value, maxPerSession: Number(e.target.value) })} />
            <button className="fp-btn" disabled={busy || !draft ||
              (prefs !== null && draft !== null && JSON.stringify(prefs) === JSON.stringify(draft))}
              onClick={() => void save()} style={{ opacity: busy ? 0.6 : 1 }}>
              {busy ? 'Menyimpan…' : 'Simpan preferensi'}
            </button>
          </>
        )}
      </div>
      <p className="fp-note">
        unlinked+ tidak menjual data pribadi, tidak memakai curhat sensitif untuk menargetkan iklan,
        dan tidak membuka identitas anonim kepada pengiklan. Preferensi ini berbeda dengan pengaturan
        global operator di CMS.
      </p>
      <Link className="fp-back" href="/home">← Kembali ke Beranda</Link>
    </>
  );
}
