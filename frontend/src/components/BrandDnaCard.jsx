import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "@/lib/api";
import { Pencil } from "@phosphor-icons/react";

export default function BrandDnaCard() {
  const [brand, setBrand] = useState(null);
  useEffect(() => { api.get("/brand-profile").then(({ data }) => setBrand(data)).catch(() => {}); }, []);
  if (!brand) return null;
  return (
    <div className="feedify-card p-5" data-testid="brand-dna-card">
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="text-xs uppercase tracking-[0.18em] text-brand-light font-bold">Brand DNA aktif</div>
        <Link to="/settings" data-testid="edit-brand-quick" className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-bold text-brand hover:bg-brand-sand rounded-full uppercase tracking-wider">
          <Pencil size={11} weight="bold" /> Edit
        </Link>
      </div>
      <div className="flex items-center gap-3">
        <div className="h-11 w-11 rounded-xl border border-brand-sand overflow-hidden flex items-center justify-center flex-shrink-0" style={{ background: brand.color_secondary || "#FDFBF7" }}>
          {brand.logo_base64 ? (
            <img src={brand.logo_base64} alt="logo" className="h-full w-full object-cover" />
          ) : (
            <span className="font-heading font-bold text-lg" style={{ color: brand.color_primary }}>{(brand.brand_name?.[0] || "?").toUpperCase()}</span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-heading font-bold text-brand truncate">{brand.brand_name}</div>
          <div className="text-[10px] text-stone-500 truncate">{brand.category}</div>
        </div>
      </div>
      {brand.archetype && (
        <div className="mt-3 inline-flex items-center px-2 py-0.5 rounded-full bg-brand-gold/20 text-brand text-[10px] font-bold uppercase tracking-wider">
          {archetypeLabel(brand.archetype)}
        </div>
      )}
      <div className="mt-3 flex gap-1.5">
        {[brand.color_primary, brand.color_secondary].map((c, i) => (
          <div key={i} className="h-6 w-6 rounded-md border border-white shadow-sm" style={{ background: c }} />
        ))}
      </div>
    </div>
  );
}

const ARCHETYPE_LABELS = {
  expert: "The Expert",
  friend: "The Friend",
  rebel: "The Rebel",
  caregiver: "The Caregiver",
  luxury: "The Luxury Icon",
  innovator: "The Innovator",
  everyman: "The Everyman",
};
function archetypeLabel(id) { return ARCHETYPE_LABELS[id] || id; }
