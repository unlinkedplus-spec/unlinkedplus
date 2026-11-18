'use client';

import { useRef, useState } from 'react';
import { createCertificate } from '../lib/api';
import type { Post } from '../lib/types';

interface Props {
  post: Post;
  onClose: () => void;
}

const CATEGORY_COLORS: Record<string, string> = {
  'Ditolak HRD':      '#EF4444',
  'Salah Kirim Chat': '#F97316',
  'Dimarahi Bos':     '#8B5CF6',
  'Bisnis Boncos':    '#06B6D4',
  'Salah Jurusan':    '#10B981',
};

export default function CertificateModal({ post, onClose }: Props) {
  const certRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [certId, setCertId] = useState<string | null>(null);
  const [errMsg, setErrMsg] = useState('');

  async function handleCreate() {
    setStatus('loading');
    try {
      const cert = await createCertificate(post.id);
      setCertId(cert.id);
      setStatus('ready');
    } catch (e) {
      setErrMsg(e instanceof Error ? e.message : 'Gagal membuat sertifikat');
      setStatus('error');
    }
  }

  async function handleDownload() {
    if (!certRef.current) return;
    // Dynamic import to avoid SSR issues
    const html2canvas = (await import('html2canvas')).default;
    const canvas = await html2canvas(certRef.current, { scale: 2, useCORS: true });
    const url = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = `unlinked-cert-${certId ?? post.id}.png`;
    a.click();
  }

  const color = CATEGORY_COLORS[post.category] ?? '#F5C542';
  const username = post.user?.username ?? 'Anonim';

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <h2 className="font-display font-black text-xl text-navy mb-4">Sertifikat Ketahanan Mental</h2>

        {/* Certificate card */}
        <div
          ref={certRef}
          className="bg-primary rounded-2xl p-6 border-4 border-navy text-navy text-center mb-4"
          style={{ fontFamily: 'Inter, sans-serif' }}
        >
          <div className="text-xs font-bold uppercase tracking-widest opacity-60 mb-1">
            Sertifikat Ketahanan Mental
          </div>
          <div className="font-black text-2xl mb-1" style={{ fontFamily: 'Nunito, sans-serif' }}>
            unlinked+
          </div>
          <div className="text-sm mb-3 opacity-80">menyatakan bahwa</div>
          <div className="font-bold text-lg mb-3">{username}</div>
          <div
            className="text-xs font-bold uppercase px-2 py-0.5 rounded-full inline-block mb-3"
            style={{ background: color, color: 'white' }}
          >
            {post.category}
          </div>
          <p className="text-sm italic opacity-80 leading-relaxed">
            &ldquo;{post.content.slice(0, 120)}{post.content.length > 120 ? '...' : ''}&rdquo;
          </p>
          <div className="mt-4 text-xs opacity-50">
            {new Date(post.createdAt).toLocaleDateString('id-ID')}
          </div>
        </div>

        {status === 'idle' && (
          <button onClick={handleCreate} className="w-full bg-navy text-white font-bold py-2.5 rounded-xl hover:bg-navy/90 transition">
            Buat Sertifikat
          </button>
        )}
        {status === 'loading' && (
          <div className="text-center text-sm text-gray-500">Memproses sertifikat...</div>
        )}
        {status === 'ready' && (
          <button onClick={handleDownload} className="w-full bg-accent text-white font-bold py-2.5 rounded-xl hover:bg-accent/90 transition">
            ⬇ Download PNG
          </button>
        )}
        {status === 'error' && (
          <p className="text-red-500 text-sm text-center">{errMsg}</p>
        )}

        <button onClick={onClose} className="w-full mt-2 text-gray-400 text-sm hover:text-gray-600 transition">
          Tutup
        </button>
      </div>
    </div>
  );
}
