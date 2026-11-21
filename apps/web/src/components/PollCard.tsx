'use client';

import { useCallback, useEffect, useState } from 'react';
import { getActivePoll, getMyPollVote, votePoll } from '../lib/api';
import type { Poll } from '../lib/types';
import LoadingState from './LoadingState';

interface Props {
  loggedIn: boolean;
  onAuthRequired: () => void;
}

function timeLeft(endsAt: string): string {
  const diff = new Date(endsAt).getTime() - Date.now();
  if (diff <= 0) return 'Ditutup';
  const hours = Math.floor(diff / 3600_000);
  const minutes = Math.floor((diff % 3600_000) / 60_000);
  if (hours >= 24) return `${Math.floor(hours / 24)} hari lagi`;
  if (hours > 0) return `${hours} jam ${minutes} menit lagi`;
  return `${minutes} menit lagi`;
}

export default function PollCard({ loggedIn, onAuthRequired }: Props) {
  const [poll, setPoll] = useState<Poll | null>(null);
  const [loading, setLoading] = useState(true);
  const [voting, setVoting] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const active = await getActivePoll();
      setPoll(active);
      if (active && loggedIn) {
        const mine = await getMyPollVote(active.id);
        if (mine.optionId) {
          setPoll((prev) => prev ? { ...prev, myVoteId: mine.optionId } : prev);
        }
      }
    } catch {
      setPoll(null);
    } finally {
      setLoading(false);
    }
  }, [loggedIn]);

  useEffect(() => { void load(); }, [load]);

  async function handleVote(optionId: string) {
    if (!poll) return;
    if (!loggedIn) {
      onAuthRequired();
      return;
    }
    if (poll.myVoteId === optionId) return;
    setVoting(true);
    setError('');
    try {
      const updated = await votePoll(poll.id, optionId);
      setPoll(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memilih');
    } finally {
      setVoting(false);
    }
  }

  if (loading) return <LoadingState message="Memuat polling..." />;
  if (!poll) {
    return (
      <div className="fp-card">
        <div className="fp-big">Belum ada polling aktif.</div>
        <p className="fp-muted">
          Polling dibuka setelah pertanyaannya diverifikasi moderator. Kami tidak menampilkan
          angka palsu atau suara contoh supaya grafiknya selalu jujur.
        </p>
        <a className="fp-btn" href="/features/spill">Bagikan cerita dulu</a>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[11px] font-bold uppercase tracking-wider text-primary bg-primary/10 px-2.5 py-1 rounded-full">
          Polling Kantor
        </span>
        <span className="text-[11px] text-gray-400">
          {poll.isOpen ? `⏱ ${timeLeft(poll.endsAt)}` : 'Polling ditutup'}
        </span>
      </div>

      <h3 className="font-display font-bold text-navy text-base leading-snug mb-4">
        {poll.question}
      </h3>

      <div className="flex flex-col gap-2">
        {poll.options.map((option) => {
          const isMine = poll.myVoteId === option.id;
          const showResults = poll.myVoteId !== null || !poll.isOpen;
          return (
            <button
              key={option.id}
              disabled={voting || !poll.isOpen}
              onClick={() => void handleVote(option.id)}
              className={`relative w-full text-left rounded-xl border px-4 py-3 transition overflow-hidden ${
                isMine
                  ? 'border-primary bg-primary/5'
                  : 'border-gray-200 hover:border-primary/40 hover:bg-gray-50'
              } ${!poll.isOpen ? 'cursor-default' : ''} disabled:opacity-70`}
            >
              {showResults && (
                <div
                  className={`absolute inset-y-0 left-0 ${isMine ? 'bg-primary/15' : 'bg-gray-100'}`}
                  style={{ width: `${option.percentage}%` }}
                />
              )}
              <div className="relative flex items-center justify-between gap-3">
                <span className={`text-sm font-semibold ${isMine ? 'text-navy' : 'text-gray-700'}`}>
                  {option.label}
                </span>
                {showResults && (
                  <span className="text-xs font-bold text-gray-500 shrink-0">
                    {option.percentage}%
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      <div className="mt-3 flex items-center justify-between text-[11px] text-gray-400">
        <span>{poll.totalVotes} suara</span>
        {!loggedIn && poll.isOpen && (
          <span>Login untuk ikut voting</span>
        )}
        {poll.myVoteId && (
          <span className="text-primary font-semibold">Kamu sudah memilih — klik untuk ganti</span>
        )}
      </div>

      {error && <p className="mt-2 text-xs text-red-500">{error}</p>}
    </div>
  );
}
