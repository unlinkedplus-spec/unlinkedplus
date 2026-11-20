import NavIcon from './NavIcon';

/**
 * Advertorial slot. Kept visually close to a post so the feed stays calm,
 * but the "Iklan" ribbon is always visible and no fake action is offered.
 */
export default function SponsoredPost() {
  return (
    <article className="relative overflow-hidden rounded-[26px] border border-dashed border-lavender bg-gradient-to-br from-white via-cream to-lavender/15 p-4 shadow-sm">
      <div className="absolute -right-6 -top-8 h-24 w-24 rounded-full bg-lavender/20 blur-xl" />
      <div className="relative mb-3 flex items-center gap-2">
        <span className="pill-soft border border-lavender/50 bg-white text-navy">
          <NavIcon name="sparkles" size={12} /> Iklan
        </span>
        <span className="text-[10px] font-semibold uppercase tracking-widest text-navy/40">Sponsored</span>
      </div>
      <div className="relative flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-sunshine/30 text-lg">📚</div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-navy">SkillHub Indonesia</p>
          <p className="text-[11px] text-navy/45">Konten sponsoring</p>
        </div>
      </div>
      <p className="relative mb-2 mt-3 text-sm leading-relaxed text-navy/80">
        Upgrade skill, jangan cuma upgrade emosi. Mulai belajar online sekarang!
      </p>
      <p className="relative text-[10px] text-navy/45">
        Iklan dari pihak ketiga. unlinked+ tidak menjamin hasilnya.
      </p>
    </article>
  );
}
