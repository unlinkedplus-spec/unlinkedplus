'use client';

import { useState } from 'react';
import { toggleReaction } from '../lib/api';
import type { ReactionCounts } from '../lib/types';
import NavIcon, { type NavIconName } from './NavIcon';

interface Props {
  postId: string;
  initialCounts: ReactionCounts;
  initialUserReactions?: { pukpuk: boolean; ngakak: boolean; sama: boolean };
  loggedIn: boolean;
}

type ReactionKey = 'pukpuk' | 'ngakak' | 'sama';

const REACTIONS: { key: ReactionKey; label: string; icon: NavIconName; active: string }[] = [
  { key: 'pukpuk', label: 'Puk-puk', icon: 'hug',   active: 'bg-lavender/30 border-lavender text-navy' },
  { key: 'ngakak', label: 'Ngakak', icon: 'laugh', active: 'bg-sunshine/35 border-sunshine text-navy' },
  { key: 'sama',   label: 'Sama',   icon: 'heart', active: 'bg-rose-100 border-rose-300 text-navy' },
];

export default function ReactionBar({ postId, initialCounts, initialUserReactions, loggedIn }: Props) {
  const [counts, setCounts] = useState<ReactionCounts>(initialCounts);
  const [mine, setMine] = useState(initialUserReactions ?? { pukpuk: false, ngakak: false, sama: false });
  const [pending, setPending] = useState(false);

  async function handleToggle(type: ReactionKey) {
    if (!loggedIn || pending) return;
    // Optimistic update — same de-duplication contract as the API.
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
    <div className="mt-4 flex flex-wrap gap-2 border-t border-navy/5 pt-3">
      {REACTIONS.map((r) => (
        <button
          key={r.key}
          type="button"
          aria-pressed={mine[r.key]}
          onClick={() => handleToggle(r.key)}
          disabled={!loggedIn}
          className={`focus-ring inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold transition-all duration-150 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 ${
            mine[r.key]
              ? `${r.active} shadow-sm`
              : 'border-navy/10 bg-cream/70 text-navy/60 hover:-translate-y-0.5 hover:border-lavender hover:text-navy'
          }`}
        >
          <NavIcon name={r.icon} size={14} />
          <span>{r.label}</span>
          <span className={`ml-0.5 min-w-4 rounded-full px-1.5 text-center text-[10px] ${mine[r.key] ? 'bg-white/80' : 'bg-white'}`}>
            {counts[r.key] > 0 ? counts[r.key] : 0}
          </span>
        </button>
      ))}
    </div>
  );
}
