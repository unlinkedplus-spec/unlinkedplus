'use client';

import { useCallback, useEffect, useState } from 'react';
import { authMe, getAvatarItems, getInventory, updateProfile } from '../lib/api';
import {
  ACCESSORY_LABELS,
  ACCESSORY_SVG,
  CHARACTER_LABELS,
  CHARACTER_SVG,
  PREMIUM_ACCESSORIES,
  buildAvatarSVG,
} from '../lib/avatar-svg';
import type { AccessoryId, AvatarConfig, AvatarItem, CharacterId, InventoryItem } from '../lib/types';
import ShopModal from './ShopModal';

const CHARACTERS: CharacterId[] = ['panda', 'intern', 'php-victim', 'freelancer'];
const ACCESSORIES: AccessoryId[] = ['id-card', 'kardus', 'kopi', 'bendera', 'kacamata'];

interface Props {
  onSaved?: () => void;
}

export default function AvatarBuilder({ onSaved }: Props) {
  const [config, setConfig] = useState<AvatarConfig>({ character: 'panda', accessories: [] });
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [shopItems, setShopItems] = useState<AvatarItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showShop, setShowShop] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const [user, inv, items] = await Promise.all([authMe(), getInventory(), getAvatarItems()]);
      if (user.profile?.avatarConfig) setConfig(user.profile.avatarConfig as AvatarConfig);
      setInventory(inv);
      setShopItems(items);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const isOwned = (accId: AccessoryId) => {
    const item = shopItems.find((i) => i.slug === accId || i.id === accId);
    if (!item) return true; // assume free if not found in items list
    if (!item.isPremium) return true;
    return inventory.some((i) => i.itemId === item.id);
  };

  function toggleAccessory(id: AccessoryId) {
    if (PREMIUM_ACCESSORIES.includes(id) && !isOwned(id)) {
      setShowShop(true);
      return;
    }
    setConfig((c) => ({
      ...c,
      accessories: c.accessories.includes(id)
        ? c.accessories.filter((a) => a !== id)
        : [...c.accessories, id],
    }));
  }

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    try {
      await updateProfile({ avatarConfig: config });
      setSaved(true);
      onSaved?.();
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="flex justify-center py-12 text-gray-400">Memuat avatar...</div>;
  }

  return (
    <>
      <div className="max-w-lg mx-auto pb-24 px-4 pt-4">
        <h2 className="font-display font-black text-xl text-navy mb-4 text-center">🧑‍💼 Avatar Kamu</h2>

        {/* Preview */}
        <div className="flex justify-center mb-6">
          <svg viewBox="0 0 300 300" width="180" height="180" className="bg-primary/10 rounded-3xl border-2 border-primary/30">
            <g dangerouslySetInnerHTML={{ __html: buildAvatarSVG(config) }} />
          </svg>
        </div>

        {/* Character selector */}
        <div className="mb-5">
          <div className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-2">Karakter</div>
          <div className="grid grid-cols-2 gap-2">
            {CHARACTERS.map((id) => (
              <button
                key={id}
                onClick={() => setConfig((c) => ({ ...c, character: id }))}
                className={`flex items-center gap-3 p-3 rounded-xl border-2 transition ${
                  config.character === id ? 'border-primary bg-primary/10' : 'border-gray-100 bg-white hover:border-primary/40'
                }`}
              >
                <svg viewBox="0 0 300 300" width="40" height="40" className="shrink-0">
                  <g dangerouslySetInnerHTML={{ __html: CHARACTER_SVG[id] }} />
                </svg>
                <span className="text-xs font-bold text-navy text-left leading-tight">{CHARACTER_LABELS[id]}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Accessories */}
        <div className="mb-5">
          <div className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-2">Aksesori</div>
          <div className="flex flex-col gap-2">
            {ACCESSORIES.map((id) => {
              const equipped = config.accessories.includes(id);
              const owned = isOwned(id);
              const isPremium = PREMIUM_ACCESSORIES.includes(id);
              return (
                <button
                  key={id}
                  onClick={() => toggleAccessory(id)}
                  className={`flex items-center gap-3 p-3 rounded-xl border-2 transition ${
                    equipped ? 'border-primary bg-primary/10' : 'border-gray-100 bg-white hover:border-primary/40'
                  }`}
                >
                  <svg viewBox="0 0 300 300" width="40" height="40" className="shrink-0 bg-gray-50 rounded-lg">
                    <g dangerouslySetInnerHTML={{ __html: ACCESSORY_SVG[id] }} />
                  </svg>
                  <span className="text-sm font-bold text-navy flex-1 text-left">{ACCESSORY_LABELS[id]}</span>
                  {isPremium && !owned && (
                    <span className="text-xs bg-accent text-white px-2 py-0.5 rounded-full shrink-0">Premium</span>
                  )}
                  {equipped && <span className="text-xs text-primary font-bold shrink-0">✓ Pakai</span>}
                </button>
              );
            })}
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full bg-navy text-white font-bold py-3 rounded-2xl hover:bg-navy/90 transition disabled:opacity-50"
        >
          {saving ? 'Menyimpan...' : saved ? '✓ Tersimpan!' : 'Simpan Avatar'}
        </button>
      </div>

      {showShop && (
        <ShopModal
          onClose={() => setShowShop(false)}
          onInventoryUpdate={() => void load()}
        />
      )}
    </>
  );
}
