import { useEffect, useRef, useState } from "react";
import api from "@/lib/api";
import { toast } from 'react-toastify';
import { DownloadSimple, Sparkle, CircleNotch } from "@phosphor-icons/react";
import { BRAND_POSITIONINGS_LIST, BRAND_PERSONALITIES_LIST, BRAND_DONTS_CATEGORIES } from "@/lib/brandDna";

export default function BrandKitPage() {
  const [brand, setBrand] = useState(null);
  const [loading, setLoading] = useState(true);
  const printRef = useRef(null);

  useEffect(() => {
    api.get("/brand-profile")
      .then(({ data }) => setBrand(data))
      .catch(() => toast.error("Gagal memuat brand profile"))
      .finally(() => setLoading(false));
  }, []);

  const handlePrint = () => {
    window.print();
  };

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <CircleNotch size={28} className="animate-spin text-brand-light" />
    </div>
  );

  if (!brand) return (
    <div className="text-center py-20 text-stone-500">Brand profile tidak ditemukan.</div>
  );

  const swatches = [
    { label: "Warna Utama", color: brand.color_primary },
    { label: "Warna Pendukung", color: brand.color_secondary },
  ];

  const styleLabels = {
    "minimal-clean": "Minimal Clean",
    "editorial": "Editorial",
    "vibrant-pop": "Vibrant Pop",
    "lifestyle": "Lifestyle",
    "luxury": "Luxury",
  };


  const archetypeLabels = {
    expert: "Expert / Ahli",
    friend: "Sahabat",
    rebel: "Rebel / Anti-mainstream",
    caregiver: "Caregiver / Peduli",
    luxury: "Luxury / Prestis",
    innovator: "Innovator",
    everyman: "Everyman / Merakyat",
  };

  const positioningLabels = Object.fromEntries(BRAND_POSITIONINGS_LIST.map(p => [p.id, p.name]));
  const personalityLabels = Object.fromEntries(BRAND_PERSONALITIES_LIST.map(p => [p.id, p.name]));

  return (
    <div className="space-y-6" data-testid="brand-kit-page">
      {/* Action bar — hidden on print */}
      <div className="no-print animate-fade-up flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-heading text-3xl sm:text-4xl font-bold text-brand tracking-tight">Brand Kit</h1>
          <p className="text-stone-600 mt-2">Export panduan visual brand Anda sebagai PDF untuk tim atau klien.</p>
        </div>
        <button
          onClick={handlePrint}
          data-testid="download-brand-kit-btn"
          className="px-6 py-3 bg-brand text-brand-cream rounded-full font-semibold hover:bg-brand-light btn-lift inline-flex items-center gap-2 shadow-lg"
        >
          <DownloadSimple size={18} weight="bold" /> Download PDF
        </button>
      </div>

      {/* Brand Kit document — printed */}
      <div ref={printRef} className="brand-kit-doc feedify-card p-8 sm:p-12 space-y-10" data-testid="brand-kit-doc">

        {/* Header */}
        <div className="flex items-start justify-between border-b-2 pb-8" style={{ borderColor: brand.color_primary }}>
          <div>
            <div className="text-xs uppercase tracking-[0.25em] font-semibold mb-2" style={{ color: brand.color_primary }}>
              Brand Identity Kit
            </div>
            <h1 className="font-heading text-4xl sm:text-5xl font-bold mb-1" style={{ color: brand.color_primary }}>
              {brand.brand_name}
            </h1>
            <div className="text-stone-500 text-sm">{brand.category}</div>
          </div>
          {brand.logo_base64 && (
            <img src={brand.logo_base64} alt="logo" className="h-20 w-20 object-contain rounded-xl" />
          )}
        </div>

        {/* Color Palette */}
        <Section title="Palet Warna" accent={brand.color_primary}>
          <div className="flex flex-wrap gap-6">
            {swatches.map((s) => (
              <div key={s.label} className="flex flex-col items-center gap-2">
                <div
                  className="h-20 w-20 rounded-2xl border-2 border-white shadow-lg"
                  style={{ background: s.color }}
                />
                <div className="text-center">
                  <div className="text-xs font-bold text-stone-700">{s.label}</div>
                  <div className="text-xs font-mono text-stone-500">{s.color}</div>
                </div>
              </div>
            ))}
          </div>
        </Section>

        {/* Visual Identity */}
        <Section title="Identitas Visual" accent={brand.color_primary}>
          <div className="grid sm:grid-cols-2 gap-6 mb-6">
            <KitRow label="Gaya Visual" value={styleLabels[brand.visual_style] || brand.visual_style} />
            <KitRow label="Brand Archetype" value={archetypeLabels[brand.archetype] || brand.archetype} />
          </div>
          {brand.brand_positioning && (
            <div className="mb-6">
              <div className="text-xs uppercase tracking-[0.15em] text-stone-400 font-semibold mb-2">Brand Positioning</div>
              <span className="inline-block px-4 py-2 rounded-full text-sm font-semibold border-2 text-brand" style={{ borderColor: brand.color_primary, background: brand.color_primary + "22" }}>
                {positioningLabels[brand.brand_positioning] || brand.brand_positioning}
              </span>
            </div>
          )}
          {brand.brand_personality?.length > 0 && (
            <div className="mb-6">
              <div className="text-xs uppercase tracking-[0.15em] text-stone-400 font-semibold mb-2">Brand Personality</div>
              <div className="flex flex-wrap gap-2">
                {brand.brand_personality.map(id => (
                  <span key={id} className="px-3 py-1.5 rounded-full text-xs font-semibold" style={{ background: brand.color_primary + "18", color: brand.color_primary, border: `1px solid ${brand.color_primary}30` }}>
                    {personalityLabels[id] || id}
                  </span>
                ))}
              </div>
            </div>
          )}
          {brand.brand_donts?.length > 0 && (
            <div>
              <div className="text-xs uppercase tracking-[0.15em] text-stone-400 font-semibold mb-3">Brand Don'ts</div>
              <div className="space-y-3">
                {BRAND_DONTS_CATEGORIES.filter(cat => cat.items.some(item => brand.brand_donts.includes(item))).map(cat => (
                  <div key={cat.id}>
                    <div className="text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-1.5">{cat.label}</div>
                    <div className="flex flex-wrap gap-1.5">
                      {cat.items.filter(item => brand.brand_donts.includes(item)).map(item => (
                        <span key={item} className="px-2.5 py-1 rounded-full text-xs font-medium bg-red-50 text-red-600 border border-red-100">✕ {item}</span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Section>

        {/* Brand Story — target audience only */}
        {brand.target_audience && (
          <Section title="Tentang Brand" accent={brand.color_primary}>
            <div>
              <div className="text-xs uppercase tracking-[0.15em] text-stone-400 font-semibold mb-1">Target Audiens</div>
              <p className="text-stone-700">{brand.target_audience}</p>
            </div>
          </Section>
        )}

        {/* Brand Language */}
        {(brand.signature_phrase || (brand.words_always?.length > 0) || (brand.words_avoid?.length > 0) || (brand.proof_points?.length > 0)) && (
          <Section title="Brand Language" accent={brand.color_primary}>
            {brand.signature_phrase && (
              <div className="mb-4 p-4 rounded-xl border-l-4" style={{ borderColor: brand.color_primary, background: brand.color_secondary + "40" }}>
                <div className="text-xs uppercase tracking-[0.15em] text-stone-400 font-semibold mb-1">Signature Phrase</div>
                <div className="font-heading text-lg font-semibold" style={{ color: brand.color_primary }}>"{brand.signature_phrase}"</div>
              </div>
            )}
            <div className="grid sm:grid-cols-2 gap-6">
              {brand.words_always?.length > 0 && (
                <div>
                  <div className="text-xs uppercase tracking-[0.15em] text-stone-400 font-semibold mb-2">Kata Selalu Dipakai</div>
                  <div className="flex flex-wrap gap-2">
                    {brand.words_always.map((w, i) => (
                      <span key={i} className="px-3 py-1 rounded-full text-xs font-semibold text-white" style={{ background: brand.color_primary }}>{w}</span>
                    ))}
                  </div>
                </div>
              )}
              {brand.words_avoid?.length > 0 && (
                <div>
                  <div className="text-xs uppercase tracking-[0.15em] text-stone-400 font-semibold mb-2">Kata Dihindari</div>
                  <div className="flex flex-wrap gap-2">
                    {brand.words_avoid.map((w, i) => (
                      <span key={i} className="px-3 py-1 bg-red-50 text-red-600 rounded-full text-xs font-semibold border border-red-100">{w}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
            {brand.proof_points?.length > 0 && (
              <div className="mt-4">
                <div className="text-xs uppercase tracking-[0.15em] text-stone-400 font-semibold mb-2">Proof Points / Bukti Konkret</div>
                <ul className="space-y-1">
                  {brand.proof_points.map((p, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-stone-700">
                      <span className="mt-0.5 h-4 w-4 rounded-full flex-shrink-0 flex items-center justify-center text-[9px] font-bold text-white" style={{ background: brand.color_primary }}>✓</span>
                      {p}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </Section>
        )}

        {/* Footer */}
        <div className="border-t border-stone-200 pt-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkle size={14} weight="fill" className="text-brand-light" />
            <span className="text-xs text-stone-400">Generated by Feedify · feedify.id</span>
          </div>
          <div className="text-xs text-stone-400">{new Date().toLocaleDateString("id-ID", { dateStyle: "long" })}</div>
        </div>
      </div>

      {/* Print CSS */}
      <style>{`
        @media print {
          @page { margin: 8mm; }

          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }

          .no-print { display: none !important; }

          body, html { background: white !important; margin: 0 !important; padding: 0 !important; }

          /* Hide everything except the doc */
          body > * { display: none !important; }
          #root { display: block !important; }
          [data-testid="app-shell"] { display: block !important; }
          main { display: block !important; margin: 0 !important; padding: 0 !important; }
          [data-testid="brand-kit-page"] { display: block !important; }

          .brand-kit-doc {
            display: block !important;
            box-shadow: none !important;
            border: none !important;
            border-radius: 0 !important;
            padding: 0 !important;
            margin: 0 !important;
            width: 100% !important;
            /* Scale down to fit 1 page on any paper */
            zoom: 0.68;
          }

          /* Tighten all spacing inside the doc */
          .brand-kit-doc .space-y-10 > * + * { margin-top: 12px !important; }
          .brand-kit-doc .space-y-6 > * + * { margin-top: 8px !important; }
          .brand-kit-doc .space-y-4 > * + * { margin-top: 6px !important; }
          .brand-kit-doc .space-y-3 > * + * { margin-top: 4px !important; }
          .brand-kit-doc .gap-6 { gap: 10px !important; }
          .brand-kit-doc .gap-4 { gap: 8px !important; }
          .brand-kit-doc .mb-6 { margin-bottom: 8px !important; }
          .brand-kit-doc .mb-4 { margin-bottom: 6px !important; }
          .brand-kit-doc .pb-8 { padding-bottom: 10px !important; }
          .brand-kit-doc .pt-6 { padding-top: 8px !important; }
          .brand-kit-doc .mt-4 { margin-top: 6px !important; }

          /* Color swatches compact */
          .brand-kit-doc .h-20.w-20 { height: 48px !important; width: 48px !important; }

          /* No page breaks inside sections */
          .brand-kit-doc > div > div { page-break-inside: avoid; }
        }
      `}</style>
    </div>
  );
}

function Section({ title, accent, children }) {
  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <div className="h-1 w-6 rounded-full" style={{ background: accent }} />
        <h2 className="font-heading text-lg font-bold text-stone-800">{title}</h2>
      </div>
      {children}
    </div>
  );
}

function KitRow({ label, value }) {
  if (!value) return null;
  return (
    <div>
      <div className="text-xs uppercase tracking-[0.15em] text-stone-400 font-semibold mb-1">{label}</div>
      <div className="text-stone-800 font-medium">{value}</div>
    </div>
  );
}
