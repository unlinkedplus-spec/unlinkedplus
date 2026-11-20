export default function SponsoredPost() {
  return (
    <article className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 mb-3">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Sponsored</span>
      </div>
      <div className="flex items-start gap-3 mb-3">
        <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center shrink-0">
          <span className="text-lg">📚</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm text-navy">SkillHub Indonesia</span>
            <span className="text-xs text-gray-400">2 jam lalu</span>
          </div>
        </div>
      </div>
      <p className="text-sm text-navy/90 leading-relaxed mb-3">
        Upgrade skill, jangan cuma upgrade emosi. Mulai belajar online sekarang!
      </p>
      <button className="bg-primary text-navy font-bold px-4 py-2 rounded-xl text-xs hover:bg-primary/90 transition">
        Skill Baru Untuk Karier Lebih Baik →
      </button>
    </article>
  );
}
