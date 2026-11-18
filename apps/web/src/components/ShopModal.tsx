'use client';

import { useCallback, useEffect, useState } from 'react';
import { getAvatarItems, getInventory, purchase } from '../lib/api';
import type { AvatarItem, InventoryItem, Transaction } from '../lib/types';
import QRISModal from './QRISModal';

interface Props {
  onClose: () => void;
  onInventoryUpdate?: () => void;
}

export default function ShopModal({ onClose, onInventoryUpdate }: Props) {
  const [items, setItems] = useState<AvatarItem[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [qrisData, setQrisData] = useState<{ transaction: Transaction; item: AvatarItem } | null>(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const [itemList, inv] = await Promise.all([getAvatarItems(), getInventory()]);
      setItems(itemList);
      setInventory(inv);
    } catch {
      setError('Gagal memuat toko');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const isOwned = (itemId: string) => inventory.some((i) => i.itemId === itemId);

  async function handleBuy(item: AvatarItem) {
    setPurchasing(item.id);
    setError('');
    try {
      const tx = await purchase(item.id);
      setQrisData({ transaction: tx, item });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal membeli');
    } finally {
      setPurchasing(null);
    }
  }

  function handlePurchaseSuccess() {
    setQrisData(null);
    void load();
    onInventoryUpdate?.();
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/60 flex items-center justify-center p-4" onClick={onClose}>
        <div className="bg-white rounded-2xl max-w-md w-full max-h-[80vh] overflow-y-auto shadow-2xl" onClick={(e) => e.stopPropagation()}>
          <div className="sticky top-0 bg-white px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-display font-black text-xl text-navy">🛒 Toko Avatar</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
          </div>

          <div className="p-4">
            {loading && <div className="text-center py-8 text-gray-400">Memuat...</div>}
            {error && <p className="text-red-500 text-sm text-center mb-4">{error}</p>}

            <div className="grid grid-cols-2 gap-3">
              {items.map((item) => {
                const owned = isOwned(item.id);
                return (
                  <div key={item.id} className="border border-gray-100 rounded-xl p-3 bg-gray-50">
                    <div className="font-bold text-sm text-navy mb-1">{item.name}</div>
                    <div className="flex items-center gap-1 mb-2">
                      {item.itemType && (
                        <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full">{item.itemType}</span>
                      )}
                      {item.isPremium && (
                        <span className="text-xs bg-accent text-white px-2 py-0.5 rounded-full">Premium</span>
                      )}
                    </div>
                    <div className="text-sm font-bold text-navy mb-2">
                      {item.price === 0 ? 'Gratis' : `Rp ${item.price.toLocaleString('id-ID')}`}
                    </div>
                    {owned ? (
                      <span className="text-xs bg-green-100 text-green-700 font-bold px-3 py-1.5 rounded-xl block text-center">
                        ✓ Dimiliki
                      </span>
                    ) : (
                      <button
                        onClick={() => handleBuy(item)}
                        disabled={purchasing === item.id}
                        className="w-full bg-navy text-white text-xs font-bold py-1.5 rounded-xl hover:bg-navy/90 transition disabled:opacity-50"
                      >
                        {purchasing === item.id ? '...' : 'Beli'}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {qrisData && (
        <QRISModal
          transaction={qrisData.transaction}
          item={qrisData.item}
          onSuccess={handlePurchaseSuccess}
          onClose={() => setQrisData(null)}
        />
      )}
    </>
  );
}
