'use client';

export type TabId = 'feed' | 'confession' | 'spill' | 'avatar' | 'shop' | 'profile';

const TABS: { id: TabId; icon: string; label: string }[] = [
  { id: 'feed',       icon: '🏠', label: 'Beranda'  },
  { id: 'confession', icon: '🎭', label: 'Confess' },
  { id: 'spill',     icon: '✍️', label: 'Spill'    },
  { id: 'avatar',     icon: '🧑‍💼', label: 'Avatar'  },
  { id: 'shop',       icon: '🛒', label: 'Toko'    },
  { id: 'profile',    icon: '👤', label: 'Profil'  },
];

interface Props {
  active: TabId;
  onChange: (tab: TabId) => void;
}

export default function BottomNav({ active, onChange }: Props) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 safe-pb">
      <div className="max-w-lg mx-auto flex">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={`flex-1 flex flex-col items-center py-2 gap-0.5 transition ${
              active === tab.id
                ? 'text-primary border-t-2 border-primary font-bold'
                : 'text-gray-400 border-t-2 border-transparent'
            }`}
          >
            <span className="text-xl leading-none">{tab.icon}</span>
            <span className="text-[10px]">{tab.label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}
