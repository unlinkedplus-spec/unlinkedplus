'use client';

import { useState } from 'react';
import { confirmPurchase } from '../lib/api';
import type { AvatarItem, Transaction } from '../lib/types';

interface Props {
  transaction: Transaction;
  item: AvatarItem;
  onSuccess: () => void;
  onClose: () => void;
}

/** Deterministic pseudo-QRIS grid from transaction id */
function QrisGrid({ id }: { id: string }) {
  const SIZE = 10;
  const cells: boolean[] = [];
  for (let i = 0; i < SIZE * SIZE; i++) {
    const charCode = id.charCodeAt(i % id.length);
    cells.push((charCode + i) % 3 !== 0);
  }
  return (
    <svg viewBox="0 0 100 100" width="160" height="160" className="border-4 border-navy rounded-lg">
      {cells.map((filled, idx) => {
        const col = idx % SIZE;
        const row = Math.floor(idx / SIZE);
        return filled ? (
          <rect key={idx} x={col * 10} y={row * 10} width="9" height="9" fill="#172B4D" />
        ) : null;
      })}
      {/* Corner squares */}
      <rect x="0" y="0" width="30" height="30" fill="none" stroke="#172B4D" strokeWidth="4"/>
      <rect x="70" y="0" width="30" height="30" fill="none" stroke="#172B4D" strokeWidth="4"/>
      <rect x="0" y="70" width="30" height="30" fill="none" stroke="#172B4D" strokeWidth="4"/>
      <rect x="5" y="5" width="20" height="20" fill="#172B4D"/>
      <rect x="75" y="5" width="20" height="20" fill="#172B4D"/>
      <rect x="5" y="75" width="20" height="20" fill="#172B4D"/>
    </svg>
  );
}

export default function QRISModal({ transaction, item, onSuccess, onClose }: Props) {
  const [state, setState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [errMsg, setErrMsg] = useState('');

  async function handleConfirm() {
    setState('loading');
    try {
      await confirmPurchase(transaction.id);
      setState('done');
      // Fire confetti
      const confetti = (await import('canvas-confetti')).default;
      confetti({ particleCount: 120, spread: 70, origin: { y: 0.6 }, colors: ['#F5C542', '#F57C00', '#172B4D'] });
      setTimeout(onSuccess, 1500);
    } catch (e) {
      setErrMsg(e instanceof Error ? e.message : 'Konfirmasi gagal');
      setState('error');
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl max-w-xs w-full p-6 shadow-2xl text-center" onClick={(e) => e.stopPropagation()}>
        <h2 className="font-display font-black text-xl text-navy mb-1">Bayar via QRIS</h2>
        <p className="text-sm text-gray-500 mb-4">{item.name}</p>

        <div className="flex justify-center mb-4">
          <QrisGrid id={transaction.id} />
        </div>

        <div className="bg-primary/20 rounded-xl p-3 mb-4">
          <div className="text-xs text-gray-500">Total Bayar</div>
          <div className="font-black text-2xl text-navy">
            Rp {item.price.toLocaleString('id-ID')}
          </div>
        </div>

        <p className="text-xs text-gray-400 mb-4 italic">
          Simulasi pembayaran — tidak ada uang nyata yang diproses.
        </p>

        {state === 'done' && (
          <div className="text-green-600 font-bold mb-3">🎉 Berhasil! Item ditambahkan ke inventori.</div>
        )}
        {state === 'error' && (
          <p className="text-red-500 text-sm mb-3">{errMsg}</p>
        )}

        {state !== 'done' && (
          <button
            onClick={handleConfirm}
            disabled={state === 'loading'}
            className="w-full bg-navy text-white font-bold py-2.5 rounded-xl hover:bg-navy/90 transition disabled:opacity-50 mb-2"
          >
            {state === 'loading' ? 'Memproses...' : 'Konfirmasi Bayar'}
          </button>
        )}

        <button onClick={onClose} className="w-full text-gray-400 text-sm hover:text-gray-600 transition">
          Batal
        </button>
      </div>
    </div>
  );
}
