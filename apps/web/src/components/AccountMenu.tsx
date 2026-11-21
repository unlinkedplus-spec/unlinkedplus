'use client';

/** Shared Figma-style account dropdown used on every authenticated surface. */
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { authLogout, authMe } from '../lib/api';

interface Props {
  authenticated: boolean;
  /** Trigger position inside the scaled canvas. */
  trigger: { left: number; top: number; width: number; height: number };
  /** Where the menu opens relative to the canvas. */
  menu?: { left: number; top: number };
  /** Mobile layout: anchor to viewport instead of canvas. */
  mobile?: boolean;
  ariaLabel?: string;
}

export default function AccountMenu({
  authenticated, trigger, menu, mobile = false, ariaLabel = 'Menu akun',
}: Props) {
  const [open, setOpen] = useState(false);
  const [username, setUsername] = useState<string | null>(null);

  useEffect(() => {
    if (!authenticated) return;
    let active = true;
    void authMe().then((u) => { if (active) setUsername(u.username); }).catch(() => undefined);
    return () => { active = false; };
  }, [authenticated]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  async function logout() {
    await authLogout().catch(() => undefined);
    window.location.href = '/';
  }

  const items = [
    { href: '/features/profil', icon: '♙', label: 'Profil Saya', sub: 'Avatar, bio, dan perjalananmu' },
    { href: '/features/notifications', icon: '♡', label: 'Aktivitas', sub: 'Reaksi & komentar pada ceritamu' },
    { href: '/features/iklan', icon: '⚙', label: 'Preferensi Iklan', sub: 'Iklan berlabel, tanpa target sensitif' },
    { href: '/features/toko', icon: '▣', label: 'Toko & Avatar', sub: 'Kosmetik, bukan status sosial' },
  ];

  return (
    <>
      <button type="button" className={mobile ? 'acct-trigger acct-trigger-mobile' : 'acct-trigger'}
        style={mobile ? undefined : trigger} aria-label={ariaLabel} aria-expanded={open}
        data-hotspot="avatar-top" onClick={() => authenticated && setOpen((v) => !v)} />

      {open && (
        <>
          <div className="acct-backdrop" aria-hidden="true" onClick={() => setOpen(false)} />
          <div className={mobile ? 'acct-menu acct-menu-mobile' : 'acct-menu'}
            style={mobile ? undefined : menu} role="menu" aria-label={ariaLabel} data-hotspot="account-dropdown">
            <div className="acct-head">
              <img src="/images/mascot-avatar.png" alt="" className="acct-avatar object-contain" />
              <div>
                <b>@{username ?? 'kamu'}</b>
                <small>Manusia biasa, bukan pencapaian.</small>
              </div>
            </div>
            {items.map((item) => (
              <Link key={item.href} href={item.href} role="menuitem" onClick={() => setOpen(false)}>
                <span className="acct-ic">{item.icon}</span>
                <span><span className="acct-label">{item.label}</span><span className="acct-sub">{item.sub}</span></span>
              </Link>
            ))}
            <div className="acct-divider" />
            <button type="button" role="menuitem" className="acct-danger" onClick={() => void logout()}>
              <span className="acct-ic">↩</span>
              <span><span className="acct-label">Keluar</span><span className="acct-sub">Kembali ke landing</span></span>
            </button>
          </div>
        </>
      )}
    </>
  );
}
