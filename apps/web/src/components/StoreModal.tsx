'use client';

import { useState } from 'react';
import { buildAvatarSVG } from '../lib/avatar-svg';

interface Props {
  onClose: () => void;
}

export default function StoreModal({ onClose }: Props) {
  const [activeTab, setActiveTab] = useState<'semua' | 'avatar' | 'stiker' | 'frame' | 'badge'>('semua');

  const avatarItems = [
    { id: 'kacamata', name: 'Kacamata Sultan', price: 5000, icon: '🕶️' },
    { id: 'kardus', name: 'Topi Kardus Premium', price: 7500, icon: '📦' },
    { id: 'kopi', name: 'Topi Kopi Galon', price: 7500, icon: '☕' },
  ];

  const stickers = [
    { id: 'capek', name: 'Capek Banget!!', price: 2000, icon: '😫' },
    { id: 'kerja', name: 'Kerja Lagi?', price: 2000, icon: '💼' },
    { id: 'gas', name: 'Gas Dikit Lagi...', price: 2000, icon: '⛽' },
  ];

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center">
      <div className="bg-white w-full max-w-lg rounded-t-3xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between">
          <h2 className="font-display font-black text-lg text-navy">unlinked+ Store</h2>
          <button onClick={onClose} className="text-gray-400 text-2xl">×</button>
        </div>

        {/* Banner */}
        <div className="bg-gradient-to-r from-primary to-orange-400 mx-4 mt-4 rounded-2xl p-4 text-white">
          <p className="text-xs font-bold mb-1">Ekspresikan dirimu dengan gaya ala budak korporat!</p>
          <div className="flex items-center gap-2">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <span className="text-2xl">👑</span>
            </div>
            <span className="text-sm font-medium">Karakter mata panda berhak tampil keren!</span>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 px-4 py-4 overflow-x-auto">
          {(['semua', 'avatar', 'stiker', 'frame', 'badge'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-full text-xs font-medium whitespace-nowrap ${
                activeTab === tab
                  ? 'bg-navy text-white'
                  : 'bg-gray-100 text-gray-600'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Avatar Items */}
        {(activeTab === 'semua' || activeTab === 'avatar') && (
          <div className="px-4 mb-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-sm text-navy">Avatar Item</h3>
              <button className="text-xs text-primary font-medium">Lihat Semua &gt;</button>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {avatarItems.map((item) => (
                <div key={item.id} className="bg-background rounded-xl p-3 text-center">
                  <div className="w-16 h-16 mx-auto mb-2 bg-white rounded-xl flex items-center justify-center text-3xl">
                    {item.icon}
                  </div>
                  <p className="text-xs font-medium text-navy truncate">{item.name}</p>
                  <p className="text-xs text-gray-500">Rp{item.price.toLocaleString()}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Stiker Ekspresi */}
        {(activeTab === 'semua' || activeTab === 'stiker') && (
          <div className="px-4 mb-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-sm text-navy">Stiker Ekspresi</h3>
              <button className="text-xs text-primary font-medium">Lihat Semua &gt;</button>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {stickers.map((item) => (
                <div key={item.id} className="bg-background rounded-xl p-3 text-center">
                  <div className="w-16 h-16 mx-auto mb-2 bg-white rounded-xl flex items-center justify-center text-3xl">
                    {item.icon}
                  </div>
                  <p className="text-xs font-medium text-navy truncate">{item.name}</p>
                  <p className="text-xs text-gray-500">Rp{item.price.toLocaleString()}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty state for other tabs */}
        {activeTab === 'frame' || activeTab === 'badge' ? (
          <div className="px-4 py-8 text-center">
            <div className="text-4xl mb-3">🚧</div>
            <p className="text-sm text-gray-500">Segera hadir!</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
