const GOALS = [
  { id: "launch",          emoji: "🚀", name: "Launch",         desc: "Produk baru hadir — reveal & excitement" },
  { id: "promo",           emoji: "💸", name: "Promo",          desc: "Diskon / penawaran — urgency & konversi" },
  { id: "testimonial",     emoji: "🌟", name: "Testimonial",    desc: "Social proof — review & kepercayaan" },
  { id: "edukasi",         emoji: "💡", name: "Edukasi",        desc: "Informasi / how-to — bangun expertise" },
  { id: "best_seller",     emoji: "🏆", name: "Best Seller",    desc: "Terlaris — popularitas & social proof" },
  { id: "brand_awareness", emoji: "🎯", name: "Brand Awareness",desc: "Identitas brand — storytelling & values" },
  { id: "restock",         emoji: "🔄", name: "Restok",         desc: "Kembali hadir — FOMO & urgensi stok" },
];

export default function CampaignGoalSelector({ value, onChange, defaultValue = "brand_awareness" }) {
  const selected = value || defaultValue;
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3 gap-2">
        {GOALS.map(g => (
          <button
            key={g.id}
            type="button"
            data-testid={`goal-${g.id}`}
            onClick={() => onChange(g.id)}
            className={`text-left p-3 rounded-xl border-2 transition-all btn-touch ${
              selected === g.id
                ? "border-brand bg-brand-sand"
                : "border-brand-sand hover:border-brand-light bg-white"
            }`}
          >
            <div className="text-base leading-none mb-1">{g.emoji}</div>
            <div className="font-heading font-bold text-brand text-xs leading-tight">{g.name}</div>
            <div className="text-[10px] text-stone-500 leading-tight mt-0.5">{g.desc}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

export { GOALS };
