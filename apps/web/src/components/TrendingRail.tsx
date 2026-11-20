'use client';

import NavIcon from './NavIcon';

/** Curated topics; selecting one filters the posts already loaded in the feed. */
export const TRENDING_TOPICS = [
  { tag: '#DitolakHRD', keyword: 'Ditolak HRD' },
  { tag: '#SalahKirim', keyword: 'Salah Kirim Chat' },
  { tag: '#DimarahiBos', keyword: 'Dimarahi Bos' },
  { tag: '#BisnisBoncos', keyword: 'Bisnis Boncos' },
  { tag: '#SalahJurusan', keyword: 'Salah Jurusan' },
] as const;

interface Props {
  active?: string | null;
  onSelect: (keyword: string) => void;
}

export default function TrendingRail({ active, onSelect }: Props) {
  return (
    <section className="surface-card p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-display text-sm font-black text-navy">Trending Spill</h3>
        <span className="pill-soft bg-lavender/25 text-navy">
          <NavIcon name="trend" size={12} /> Topik
        </span>
      </div>
      <p className="mb-3 text-[11px] leading-relaxed text-navy/55">
        Topik yang paling sering jadi cerita. Klik untuk menyaring feed kamu.
      </p>
      <div className="flex flex-wrap gap-2">
        {TRENDING_TOPICS.map((topic, index) => {
          const selected = active === topic.keyword;
          return (
            <button
              key={topic.tag}
              type="button"
              onClick={() => onSelect(selected ? '' : topic.keyword)}
              className={`focus-ring group inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold transition-all duration-200 active:scale-95 ${
                selected
                  ? 'border-navy bg-navy text-white shadow-pop'
                  : 'border-navy/10 bg-cream text-navy hover:-translate-y-0.5 hover:border-lavender hover:bg-lavender/20'
              }`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${selected ? 'bg-sunshine' : index % 2 ? 'bg-lavender' : 'bg-sunshine'}`} />
              {topic.tag}
            </button>
          );
        })}
      </div>
      {active && (
        <button
          type="button"
          onClick={() => onSelect('')}
          className="focus-ring mt-3 text-[11px] font-bold text-navy/60 underline decoration-lavender decoration-2 underline-offset-2 hover:text-navy"
        >
          Hapus filter topik
        </button>
      )}
    </section>
  );
}
