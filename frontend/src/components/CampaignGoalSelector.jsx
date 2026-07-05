const GOALS = [
  { id: "launch",          emoji: "🚀", name: "Launch",         desc: "Perkenalkan produk baru dan bangun excitement." },
  { id: "promo",           emoji: "🏷️", name: "Promo",          desc: "Tingkatkan penjualan dengan diskon dan penawaran." },
  { id: "edukasi",         emoji: "📖", name: "Edukasi",        desc: "Jelaskan manfaat, bahan, atau cara pemakaian." },
  { id: "testimonial",     emoji: "⭐", name: "Testimoni",      desc: "Bangun kepercayaan melalui pengalaman pelanggan." },
  { id: "best_seller",     emoji: "🔥", name: "Best Seller",    desc: "Tampilkan produk terlaris dan paling diminati." },
  { id: "brand_awareness", emoji: "❤️", name: "Brand Awareness",desc: "Perkuat identitas visual dan nilai brand kamu." },
  { id: "restock",         emoji: "♻️", name: "Restok",         desc: "Umumkan stok kembali tersedia, ciptakan urgensi." },
];

export default function CampaignGoalSelector({ value, onChange, defaultValue = "brand_awareness" }) {
  const selected = value || defaultValue;
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3 gap-2">
      {GOALS.map(g => (
        <button
          key={g.id}
          type="button"
          data-testid={`goal-${g.id}`}
          onClick={() => onChange(g.id)}
          className={`text-left p-3 rounded-xl border-2 transition-colors duration-150 btn-touch ${
            selected === g.id
              ? "border-brand bg-brand-sand"
              : "border-stone-100 hover:border-brand/30 bg-white"
          }`}
        >
          <div className="text-xl leading-none mb-2">{g.emoji}</div>
          <div className={`font-heading font-bold text-xs leading-tight ${selected === g.id ? "text-brand" : "text-stone-700"}`}>{g.name}</div>
          <div className="text-[10px] text-stone-400 leading-snug mt-0.5">{g.desc}</div>
        </button>
      ))}
    </div>
  );
}

export { GOALS };
