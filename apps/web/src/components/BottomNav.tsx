'use client';

import NavIcon, { type NavIconName } from './NavIcon';

export type TabId = 'feed' | 'confession' | 'spill' | 'avatar' | 'shop' | 'profile';

const TABS: { id: TabId; icon: NavIconName; label: string }[] = [
  { id: 'feed',       icon: 'home',    label: 'Beranda'  },
  { id: 'confession', icon: 'mask',    label: 'Confess'  },
  { id: 'spill',      icon: 'pen',     label: 'Spill'    },
  { id: 'avatar',     icon: 'avatar',  label: 'Avatar'   },
  { id: 'shop',       icon: 'store',   label: 'Toko'     },
  { id: 'profile',    icon: 'profile', label: 'Profil'   },
];

interface Props {
  active: TabId;
  onChange: (tab: TabId) => void;
}

export default function BottomNav({ active, onChange }: Props) {
  return (
    <nav aria-label="Navigasi utama" className="safe-pb fixed bottom-0 left-0 right-0 z-50 border-t border-navy/10 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-lg">
        {TABS.map((tab) => {
          const isActive = active === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              aria-current={isActive ? 'page' : undefined}
              onClick={() => onChange(tab.id)}
              className={`focus-ring relative flex flex-1 flex-col items-center gap-1 py-2.5 transition-colors ${
                isActive ? 'text-navy' : 'text-navy/40'
              }`}
            >
              {isActive && <span className="absolute -top-px h-1 w-9 rounded-full bg-sunshine" />}
              <span className={`transition-transform duration-200 ${isActive ? '-translate-y-0.5' : ''}`}>
                <NavIcon name={tab.icon} size={20} />
              </span>
              <span className={`text-[10px] ${isActive ? 'font-black' : 'font-semibold'}`}>{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
