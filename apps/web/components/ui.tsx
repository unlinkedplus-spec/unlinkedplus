'use client';
import { useEffect, useId, useRef, type ReactNode } from 'react';
import { Icon } from './icons';
export function Alert({ children }: { children?: ReactNode }) { return children ? <div className="alert" role="alert">{children}</div> : null; }
export function Loading({ label = 'Memuat…' }: { label?: string }) { return <div className="loading" role="status"><span className="spinner"/>{label}</div>; }
export function Empty({ title, children }: { title: string; children?: ReactNode }) { return <div className="empty"><span className="empty-symbol"><Icon name="heart" width="28" height="28"/></span><h3>{title}</h3>{children}</div>; }
export function Modal({ title, onClose, children, busy = false }: { title: string; onClose: () => void; children: ReactNode; busy?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null);
  const id = useId();
  useEffect(() => { const dialog = ref.current; dialog?.showModal(); return () => dialog?.close(); }, []);
  return <dialog ref={ref} className="modal" aria-labelledby={id} onCancel={event => { event.preventDefault(); if (!busy) onClose(); }}><div className="modal-heading"><h2 id={id}>{title}</h2><button className="icon-button" type="button" aria-label="Tutup dialog" disabled={busy} onClick={onClose}><Icon name="close"/></button></div>{children}</dialog>;
}
export function Pagination({ page, pages, onPage, busy = false }: { page: number; pages: number; onPage: (page: number) => void; busy?: boolean }) {
  if (pages < 2) return null;
  return <nav className="pagination" aria-label="Halaman hasil"><button className="button secondary" disabled={busy || page <= 1} onClick={() => onPage(page - 1)}>Sebelumnya</button><span>{page} / {pages}</span><button className="button secondary" disabled={busy || page >= pages} onClick={() => onPage(page + 1)}>Berikutnya</button></nav>;
}
export function Confirm({ title, description, label = 'Hapus', action, onClose }: { title: string; description: string; label?: string; action: () => Promise<void>; onClose: () => void }) {
  return <ConfirmForm title={title} description={description} label={label} action={action} onClose={onClose}/>;
}
import { useState } from 'react';
import { errorMessage } from '../lib/api';
function ConfirmForm({ title, description, label, action, onClose }: { title: string; description: string; label: string; action: () => Promise<void>; onClose: () => void }) {
  const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  return <Modal title={title} onClose={onClose} busy={busy}><p>{description}</p><Alert>{error}</Alert><div className="form-actions"><button autoFocus className="button secondary" disabled={busy} onClick={onClose}>Batal</button><button className="button danger" disabled={busy} onClick={async () => { setBusy(true); setError(''); try { await action(); onClose(); } catch (e) { setError(errorMessage(e)); } finally { setBusy(false); } }}>{busy ? 'Memproses…' : label}</button></div></Modal>;
}
