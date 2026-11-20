'use client';

import { useState } from 'react';
import { toggleReaction } from '../lib/api';
import type { ReactionCounts } from '../lib/types';

interface Props {
  postId: string;
  initialCounts: ReactionCounts;
  initialUserReactions?: { pukpuk: boolean; ngakak: boolean; sama: boolean };
  loggedIn: boolean;
}

const REACTIONS = [
  { key: 'pukpuk' as const, label: '🫂 Puk-Puk' },
  { key: 'ngakak' as const, label: '😂 Ngakak Maaf' },
  { key: 'sama'   as const, label: '🤝 Sama Banget' },
];

export default function ReactionBar({ postId, initialCounts, initialUserReactions, loggedIn }: Props) {
  const [counts, setCounts] = useState<ReactionCounts>(initialCounts);
  const [mine, setMine] = useState(initialUserReactions ?? { pukpuk: false, ngakak: false, sama: false });
  const [pending, setPending] = useState(false);

  async function handleToggle(type: 'pukpuk' | 'ngakak' | 'sama') {
    if (!loggedIn || pending) return;
    // Optimistic update
    const wasActive = mine[type];
    setCounts((c) => ({ ...c, [type]: c[type] + (wasActive ? -1 : 1) }));
    setMine((m) => ({ ...m, [type]: !wasActive }));
    setPending(true);
    try {
      const res = await toggleReaction(postId, type);
      setCounts(res.counts);
      setMine((m) => ({ ...m, [type]: res.added }));
    } catch {
      // Revert on error
      setCounts((c) => ({ ...c, [type]: c[type] + (wasActive ? 1 : -1) }));
      setMine((m) => ({ ...m, [type]: wasActive }));
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex gap-2 flex-wrap mt-2">
      {REACTIONS.map((r) => (
        <button
          key={r.key}
          onClick={() => handleToggle(r.key)}
          disabled={!loggedIn}
          className={`text-xs px-3 py-1.5 rounded-full border transition ${
            mine[r.key]
              ? 'bg-primary border-primary text-navy font-bold'
              : 'bg-white border-gray-200 text-gray-600 hover:border-primary'
          } disabled:opacity-50`}
        >
          {r.label} {counts[r.key] > 0 && <span className="ml-1 font-bold">{counts[r.key]}</span>}
        </button>
      ))}
    </div>
  );
}
