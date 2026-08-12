import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { toast } from 'react-toastify';
import { handleGenerateError } from "@/lib/moderation";
import { fbTrack, getCachedUserId } from "@/lib/metaPixel";
import {
  Sparkle, CircleNotch, CheckCircle, Copy, Check,
  Target, Article, MegaphoneSimple, Hash,
  ImageSquare, Stack, Storefront, HouseSimple, ArrowRight,
  Lightning, Package, X, CaretDown,
} from "@phosphor-icons/react";
import BrandDnaCard from "@/components/BrandDnaCard";

const BRAND_CACHE_KEY = "feedify_brand_cache";

/* ─── Content types ──────────────────────────────────────── */
const CONTENT_TYPES = [
  { id: "soft_selling",   label: "Soft Selling",   goal: "soft_selling",    cta: "soft"   },
  { id: "hard_selling",   label: "Hard Selling",   goal: "hard_selling",    cta: "strong" },
  { id: "product_launch", label: "Launch",         goal: "product_launch",  cta: "medium" },
  { id: "promo",          label: "Promo / Diskon", goal: "hard_selling",    cta: "strong" },
  { id: "education",      label: "Edukasi",        goal: "education",       cta: "soft"   },
  { id: "testimonial",    label: "Testimoni",      goal: "brand_awareness", cta: "medium" },
  { id: "flash_sale",     label: "Flash Sale",     goal: "flash_sale",      cta: "strong" },
  { id: "awareness",      label: "Awareness",      goal: "awareness",       cta: "soft"   },
];

/* Build description from product data + type */
function buildDescription(product, typeId) {
  if (!product) return "";
  const lines = [];
  if (product.name)        lines.push(`Produk: ${product.name}`);
  if (product.category)    lines.push(`Kategori: ${product.category}`);
  if (product.description) lines.push(`Info: ${product.description}`);
  if (product.usp)         lines.push(`Keunggulan: ${product.usp}`);
  if ((product.benefits || []).length)    lines.push(`Manfaat: ${product.benefits.join(", ")}`);
  if ((product.ingredients || []).length) lines.push(`Bahan: ${product.ingredients.join(", ")}`);

  const base = lines.join("\n");

  const toneMap = {
    soft_selling:   "Tone: Soft & value-driven. Ceritakan manfaat secara natural, tanpa hard sell.",
    hard_selling:   "Tone: Direct & urgent. Tekankan harga, stok terbatas, dan alasan beli sekarang.",
    product_launch: "Tone: Exciting & eksklusif. Peluncuran produk baru — tekankan formula/kemasan baru, harga perkenalan, batas waktu.",
    promo:          "Tone: Promosi diskon. Cantumkan persentase/nominal diskon, harga sebelum & sesudah, batas waktu promo.",
    education:      "Tone: Informatif & edukatif. Jelaskan bahan aktif, cara kerja, atau fakta menarik tentang produk ini.",
    testimonial:    "Tone: Social proof. Gunakan bukti nyata — rating, jumlah pelanggan, atau testimoni untuk membangun kepercayaan.",
    flash_sale:     "Tone: FOMO & urgensi tinggi. Flash sale terbatas waktu, stok terbatas, harga jauh di bawah normal.",
    awareness:      "Tone: Perkenalan brand/produk. Ringan, intriguing, buat orang penasaran tanpa langsung hard sell.",
  };

  return base + (toneMap[typeId] ? `\n\n${toneMap[typeId]}` : "");
}

/* ─── Options ────────────────────────────────────────────── */
const AUDIENCE_OPTIONS = [
  { id: "auto",           name: "Auto"          },
  { id: "women",          name: "Wanita"         },
  { id: "men",            name: "Pria"           },
  { id: "parents",        name: "Parents"        },
  { id: "students",       name: "Mahasiswa"      },
  { id: "office_workers", name: "Pekerja Kantor" },
  { id: "business",       name: "Pebisnis"       },
  { id: "gen_z",          name: "Gen Z"          },
  { id: "millennials",    name: "Millennials"    },
  { id: "custom",         name: "Custom"         },
];

const AUDIENCE_LABEL_MAP = {
  auto: "", women: "Wanita", men: "Pria", parents: "Orang tua",
  students: "Mahasiswa", office_workers: "Pekerja kantoran",
  business: "Pemilik bisnis", gen_z: "Gen Z", millennials: "Millennials",
};

const CTA_STRENGTHS = [
  { id: "soft",   name: "Soft",   example: "\"Coba lihat produknya 😊\"" },
  { id: "medium", name: "Medium", example: "\"Klik link bio sekarang.\"" },
  { id: "strong", name: "Strong", example: "\"Promo berakhir hari ini.\"" },
];

const CAPTION_LENGTHS = [
  { id: "short",  name: "Short",  est: "50–100 kata" },
  { id: "medium", name: "Medium", est: "100–180 kata" },
  { id: "long",   name: "Long",   est: "180–300 kata" },
];

const OUTPUT_TYPES = [
  { id: "instagram",   name: "Instagram",   recommended: true  },
  { id: "tiktok",      name: "TikTok",      recommended: false },
  { id: "whatsapp",    name: "WhatsApp",    recommended: false },
  { id: "marketplace", name: "Marketplace", recommended: false },
  { id: "email",       name: "Email",       recommended: false },
];

const NEXT_ACTIONS = [
  { id: "banner",      label: "Create Feed & Banner",  href: "/generate/banner",      Icon: ImageSquare },
  { id: "carousel",    label: "Create Carousel",       href: "/generate/carousel",    Icon: Stack },
  { id: "marketplace", label: "Marketplace Listing",   href: "/generate/marketplace", Icon: Storefront },
  { id: "home",        label: "Back to Dashboard",     href: "/dashboard",            Icon: HouseSimple },
];

const DEFAULT_FORM = {
  content_type:        "soft_selling",
  product_description: "",
  audience:            "auto",
  audience_custom:     "",
  cta_strength:        "medium",
  caption_length:      "medium",
  output_type:         "instagram",
  save:                true,
};

/* ─── sub-components ─────────────────────────────────────── */
function NumCircle({ n }) {
  return (
    <div className="w-8 h-8 rounded-full bg-brand text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
      {n}
    </div>
  );
}

function SectionTitle({ children }) {
  return <div className="text-[10px] uppercase tracking-[0.18em] text-brand-light font-bold mb-3">{children}</div>;
}

function Field({ label, hint, children }) {
  return (
    <div>
      <label className="text-xs font-semibold uppercase tracking-[0.15em] text-stone-500 mb-1.5 block">{label}</label>
      {hint && <p className="text-[10px] text-stone-400 mb-2 leading-relaxed">{hint}</p>}
      {children}
    </div>
  );
}

function ResultSection({ icon: Icon, title, subtitle, children }) {
  return (
    <div className="feedify-card p-5">
      <div className="flex items-start gap-2 mb-4">
        {Icon && <Icon size={18} weight="duotone" className="text-brand-light flex-shrink-0 mt-0.5" />}
        <div>
          <h3 className="font-heading text-base font-bold text-brand leading-tight">{title}</h3>
          {subtitle && <p className="text-[11px] text-stone-400 mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {children}
    </div>
  );
}

function CopyButton({ text, testid, label }) {
  const [copied, setCopied] = useState(false);
  const handle = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success("Disalin!");
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };
  return (
    <button type="button" onClick={handle} data-testid={testid}
      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-brand hover:bg-brand-sand rounded-full transition-all flex-shrink-0">
      {copied ? <Check size={12} weight="bold" /> : <Copy size={12} weight="bold" />}
      {label || (copied ? "OK" : "Copy")}
    </button>
  );
}

function CopyableLine({ text, testid }) {
  return (
    <div className="flex items-center gap-2 p-3 bg-brand-sand/40 border border-brand-sand rounded-xl" data-testid={testid}>
      <span className="text-sm text-stone-700 flex-1">{text}</span>
      <CopyButton text={text} testid={`${testid}-copy`} />
    </div>
  );
}

function CopyableChip({ text, testid }) {
  return (
    <button type="button"
      onClick={async () => { try { await navigator.clipboard.writeText(text); toast.success("Disalin!"); } catch {} }}
      data-testid={testid}
      className="px-3 py-2 bg-brand-gold/20 hover:bg-brand-gold/40 border border-brand-gold/40 rounded-full text-sm font-medium text-brand transition-all">
      {text}
    </button>
  );
}

/* ─── main ───────────────────────────────────────────────── */
export default function CopywritingPage() {
  const [searchParams] = useSearchParams();
  const nav = useNavigate();
  const from = searchParams.get("from");

  /* Product library */
  const [productId, setProductId] = useState(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const { data: products = [], isLoading: productsLoading } = useQuery({
    queryKey: ["products"],
    queryFn: async () => { const { data } = await api.get("/products"); return data; },
  });
  const selectedProduct = products.find(p => p.id === productId) || null;

  const [form, setForm] = useState(DEFAULT_FORM);
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState(null);
  const upd = (k, v) => setForm(f => ({ ...f, [k]: v }));

  useEffect(() => {
    api.get("/brand-profile").then(({ data }) => {
      localStorage.setItem(BRAND_CACHE_KEY, JSON.stringify(data));
    }).catch(() => {});
  }, []);

  /* When product changes, rebuild description */
  const selectProduct = (p) => {
    setProductId(p.id);
    setDropdownOpen(false);
    setForm(f => ({ ...f, product_description: buildDescription(p, f.content_type) }));
  };

  /* When type changes, rebuild description from current product */
  const selectContentType = (typeId) => {
    const ct = CONTENT_TYPES.find(t => t.id === typeId);
    setForm(f => ({
      ...f,
      content_type: typeId,
      cta_strength: ct?.cta || f.cta_strength,
      product_description: selectedProduct
        ? buildDescription(selectedProduct, typeId)
        : f.product_description,
    }));
  };

  const effectiveAudience = form.audience === "custom"
    ? form.audience_custom
    : (AUDIENCE_LABEL_MAP[form.audience] || "");

  const canGenerate = !!selectedProduct;

  const generate = async () => {
    if (!selectedProduct) { toast.error("Pilih produk dari library dulu"); return; }
    if (!form.product_description.trim()) { toast.error("Deskripsi produk wajib diisi"); return; }

    setGenerating(true);
    setResult(null);
    try {
      const ct = CONTENT_TYPES.find(t => t.id === form.content_type);
      const payload = {
        product_name:        selectedProduct.name,
        product_description: form.product_description,
        main_problem:        "",
        usp:                 selectedProduct.usp || "",
        target_audience:     effectiveAudience,
        brand_voice:         "",
        content_purpose:     ct?.goal || "soft_selling",
        primary_goal:        ct?.goal || "soft_selling",
        cta_strength:        form.cta_strength,
        caption_length:      form.caption_length,
        platform:            form.output_type,
        save:                form.save,
      };
      const { data } = await api.post("/prompt/generate-copywriting", payload);
      if (data.result?.error) { toast.error("Feedify gagal menghasilkan. Coba lagi."); return; }
      // Meta Pixel: same deterministic trial_<userId> as the other 3 generation entry points.
      if (data?.is_first_ever) {
        const uid = getCachedUserId();
        if (uid) fbTrack("StartTrial", {}, `trial_${uid}`);
      }
      setResult(data);
      toast.success("Marketing copy siap!");
      setTimeout(() => document.getElementById("copy-result")?.scrollIntoView({ behavior: "smooth" }), 100);
    } catch (err) {
      const handled = handleGenerateError(err);
      if (!handled) toast.error("Gagal generate. Coba lagi.");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 pb-32 lg:pb-10 space-y-4" data-testid="copywriting-page">

      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-brand text-white flex items-center justify-center">
          <Lightning size={20} weight="fill" />
        </div>
        <div>
          <h1 className="font-heading text-xl font-bold text-brand">Marketing Copy</h1>
          <p className="text-xs text-stone-500">Ceritakan produkmu — Feedify yang tulis copy-nya</p>
        </div>
      </div>

      {/* ① Product Knowledge */}
      <div className={`feedify-card p-5 ${!productId ? "border-2 border-red-200" : ""}`}>
        <div className="flex items-center gap-3 mb-4">
          <NumCircle n="①" />
          <div>
            <div className="flex items-center gap-2">
              <div className="font-heading font-bold text-brand text-sm">Product Knowledge</div>
              <span className="text-[9px] font-bold text-red-500 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded-full">★ Wajib</span>
            </div>
            <div className="text-xs text-stone-400">Pilih produk dari library kamu</div>
          </div>
        </div>

        {!productsLoading && products.length === 0 ? (
          <div className="flex items-center gap-3 p-3 rounded-xl bg-stone-50 border border-stone-200">
            <Package size={20} weight="duotone" className="text-stone-400 flex-shrink-0" />
            <div>
              <p className="text-xs text-stone-500">Belum ada produk tersimpan.</p>
              <a href="/products" className="text-xs font-semibold text-brand hover:underline">+ Tambah produk ke library →</a>
            </div>
          </div>
        ) : (
          <div className="relative">
            <button
              onClick={() => setDropdownOpen(v => !v)}
              className="w-full flex items-center gap-3 p-3 rounded-xl border border-stone-200 hover:border-brand/50 transition-all text-left bg-white"
              data-testid="copy-product-selector-btn">
              {selectedProduct ? (
                <>
                  {selectedProduct.photo_base64 ? (
                    <img src={selectedProduct.photo_base64} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-brand/10 flex items-center justify-center flex-shrink-0">
                      <Package size={18} weight="duotone" className="text-brand" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-stone-800 truncate">{selectedProduct.name}</p>
                    {selectedProduct.category && <p className="text-xs text-stone-500">{selectedProduct.category}</p>}
                  </div>
                  <button
                    onClick={e => { e.stopPropagation(); setProductId(null); upd("product_description", ""); }}
                    className="p-1.5 rounded-lg text-stone-400 hover:text-red-500 hover:bg-red-50 transition-all">
                    <X size={13} weight="bold" />
                  </button>
                </>
              ) : (
                <>
                  <Package size={18} weight="duotone" className="text-stone-400 flex-shrink-0" />
                  <span className="flex-1 text-sm text-stone-400">Pilih produk dari library...</span>
                  <CaretDown size={14} className="text-stone-400 flex-shrink-0" />
                </>
              )}
            </button>

            {dropdownOpen && (
              <div className="absolute left-0 right-0 top-full mt-1 z-20 bg-white rounded-xl border border-stone-200 shadow-lg max-h-56 overflow-y-auto">
                {products.map(p => (
                  <button key={p.id} onClick={() => selectProduct(p)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 hover:bg-brand/5 transition-all text-left ${p.id === productId ? "bg-brand/5" : ""}`}
                    data-testid={`copy-product-option-${p.id}`}>
                    {p.photo_base64 ? (
                      <img src={p.photo_base64} alt="" className="w-9 h-9 rounded-lg object-cover flex-shrink-0" />
                    ) : (
                      <div className="w-9 h-9 rounded-lg bg-brand/10 flex items-center justify-center flex-shrink-0">
                        <Package size={15} weight="duotone" className="text-brand" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-stone-800 truncate">{p.name}</p>
                      {p.category && <p className="text-xs text-stone-400">{p.category}</p>}
                    </div>
                    {p.id === productId && <CheckCircle size={14} weight="fill" className="text-brand flex-shrink-0" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ② Tipe Konten */}
      <div className="feedify-card p-5">
        <div className="flex items-center gap-3 mb-4">
          <NumCircle n="②" />
          <div>
            <div className="font-heading font-bold text-brand text-sm">Tipe Konten</div>
            <div className="text-xs text-stone-400">Pilih tipe — deskripsi otomatis terisi dari produk yang dipilih</div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {CONTENT_TYPES.map(({ id, label }) => (
            <button key={id} type="button"
              onClick={() => selectContentType(id)}
              className={`px-4 py-2 rounded-full border-2 text-xs font-semibold transition-all ${
                form.content_type === id
                  ? "bg-brand text-brand-cream border-brand"
                  : "bg-white border-stone-200 text-stone-600 hover:border-brand/40"
              }`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ③ Deskripsi (auto-filled, editable) */}
      <div className="feedify-card p-5">
        <div className="flex items-center gap-3 mb-4">
          <NumCircle n="③" />
          <div>
            <div className="font-heading font-bold text-brand text-sm">Deskripsi Produk</div>
            <div className="text-xs text-stone-400">Otomatis terisi — kamu masih bisa edit</div>
          </div>
        </div>
        <textarea
          data-testid="copy-product-desc"
          value={form.product_description}
          onChange={e => upd("product_description", e.target.value)}
          placeholder="Pilih produk dan tipe konten di atas — deskripsi akan otomatis muncul di sini"
          rows={5} className="input resize-none text-sm w-full" />
      </div>

      {/* ④ Output + Audience */}
      <div className="feedify-card p-5 space-y-5">
        <div>
          <div className="flex items-center gap-3 mb-3">
            <NumCircle n="④" />
            <div className="font-heading font-bold text-brand text-sm">Platform & Audience</div>
          </div>
          <SectionTitle>Platform Output</SectionTitle>
          <div className="flex flex-wrap gap-2 mb-4">
            {OUTPUT_TYPES.map(({ id, name, recommended }) => (
              <button key={id} type="button" data-testid={`output-type-${id}`}
                onClick={() => upd("output_type", id)}
                className={`relative px-3.5 py-2 rounded-full border-2 text-xs font-semibold transition-all ${
                  form.output_type === id
                    ? "bg-brand text-brand-cream border-brand"
                    : "bg-white border-stone-200 text-stone-600 hover:border-brand/40"
                }`}>
                {recommended && form.output_type !== id && (
                  <span className="absolute -top-2 -right-1 text-[7px] bg-brand-gold text-brand font-bold px-1.5 py-0.5 rounded-full">⭐</span>
                )}
                {name}
              </button>
            ))}
          </div>

          <SectionTitle>Target Audience</SectionTitle>
          <div className="flex flex-wrap gap-2">
            {AUDIENCE_OPTIONS.map(({ id, name }) => (
              <button key={id} type="button" data-testid={`audience-${id}`}
                onClick={() => upd("audience", id)}
                className={`px-3.5 py-2 rounded-full border-2 text-xs font-semibold transition-all ${
                  form.audience === id
                    ? "bg-brand text-brand-cream border-brand"
                    : "bg-white border-stone-200 text-stone-600 hover:border-brand/40"
                }`}>
                {name}
              </button>
            ))}
          </div>
          {form.audience === "custom" && (
            <input type="text" autoFocus data-testid="audience-custom"
              value={form.audience_custom}
              onChange={e => upd("audience_custom", e.target.value)}
              placeholder="Deskripsikan target audience kamu..."
              className="input mt-3 animate-fade-up" />
          )}
        </div>
      </div>

      {/* ⑤ CTA + Length */}
      <div className="feedify-card p-5 space-y-5">
        <div className="flex items-center gap-3 mb-1">
          <NumCircle n="⑤" />
          <div className="font-heading font-bold text-brand text-sm">Gaya Penulisan</div>
        </div>

        <div>
          <SectionTitle>CTA Strength</SectionTitle>
          <div className="grid grid-cols-3 gap-2.5">
            {CTA_STRENGTHS.map(({ id, name, example }) => (
              <button key={id} type="button" data-testid={`cta-strength-${id}`}
                onClick={() => upd("cta_strength", id)}
                className={`p-3.5 rounded-xl border-2 text-left transition-all ${
                  form.cta_strength === id ? "border-brand bg-brand-sand" : "border-stone-100 hover:border-brand/30 bg-white"
                }`}>
                <div className={`font-bold text-sm mb-1.5 ${form.cta_strength === id ? "text-brand" : "text-stone-700"}`}>{name}</div>
                <div className="text-[10px] text-stone-400 leading-relaxed italic">{example}</div>
              </button>
            ))}
          </div>
        </div>

        <div>
          <SectionTitle>Caption Length</SectionTitle>
          <div className="grid grid-cols-3 gap-2.5">
            {CAPTION_LENGTHS.map(({ id, name, est }) => (
              <button key={id} type="button" data-testid={`caption-length-${id}`}
                onClick={() => upd("caption_length", id)}
                className={`p-3.5 rounded-xl border-2 text-center transition-all ${
                  form.caption_length === id ? "border-brand bg-brand-sand" : "border-stone-100 hover:border-brand/30 bg-white"
                }`}>
                <div className={`font-bold text-sm mb-1 ${form.caption_length === id ? "text-brand" : "text-stone-700"}`}>{name}</div>
                <div className={`text-[10px] ${form.caption_length === id ? "text-brand/60" : "text-stone-400"}`}>{est}</div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Results ───────────────────────────────────────────── */}
      {result?.result && !result.result.error && (
        <div id="copy-result" className="space-y-5 animate-fade-up">
          <div className="flex items-center gap-2">
            <CheckCircle size={24} weight="fill" className="text-green-600" />
            <h2 className="font-heading text-2xl font-bold text-brand">Marketing Copy Siap!</h2>
          </div>

          {(result.result.headlines || []).length > 0 && (
            <ResultSection icon={Target} title="Headlines" subtitle="Pilih yang paling kuat">
              <div className="space-y-2">
                {result.result.headlines.map((h, i) => <CopyableLine key={i} text={h} testid={`headline-${i}`} />)}
              </div>
            </ResultSection>
          )}

          {(result.result.captions || []).length > 0 && (
            <ResultSection icon={Article} title="Captions" subtitle="Variasi gaya berbeda">
              <div className="space-y-3">
                {result.result.captions.map((c, i) => (
                  <div key={i} className="border border-brand-sand rounded-xl p-4 bg-brand-sand/30">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs uppercase tracking-[0.15em] text-brand-light font-bold">{c.style}</span>
                      <CopyButton text={c.text} testid={`caption-copy-${i}`} />
                    </div>
                    <p className="text-sm text-stone-700 whitespace-pre-wrap leading-relaxed">{c.text}</p>
                  </div>
                ))}
              </div>
            </ResultSection>
          )}

          {(result.result.cta_options || []).length > 0 && (
            <ResultSection icon={MegaphoneSimple} title="Call-to-Action" subtitle="Siap pakai">
              <div className="flex flex-wrap gap-2">
                {result.result.cta_options.map((c, i) => <CopyableChip key={i} text={c} testid={`cta-${i}`} />)}
              </div>
            </ResultSection>
          )}

          {(result.result.seo_keywords || result.result.hashtags || []).length > 0 && (
            <ResultSection icon={Hash} title="Hashtags & Keywords">
              <div className="flex flex-wrap gap-1.5 mb-3">
                {(result.result.seo_keywords || result.result.hashtags || []).map((h, i) => (
                  <span key={i} className="px-2.5 py-1 bg-brand-sand rounded-full text-xs font-medium text-brand">{h}</span>
                ))}
              </div>
              <CopyButton text={(result.result.seo_keywords || result.result.hashtags || []).join(" ")} testid="keywords-copy-all" label="Copy semua" />
            </ResultSection>
          )}

          <div className="feedify-card p-5">
            <div className="text-xs uppercase tracking-[0.18em] text-brand-light font-bold mb-3">Lanjutkan dengan Feedify</div>
            <div className="grid sm:grid-cols-2 gap-2">
              {NEXT_ACTIONS.filter(a => a.id !== from).map(({ id, label, href, Icon }) => (
                <button key={id} type="button" onClick={() => nav(href)} data-testid={`next-action-${id}`}
                  className="flex items-center gap-3 p-3 rounded-xl border border-stone-100 hover:border-brand/30 hover:bg-brand-sand/30 transition-all text-left group">
                  <Icon size={18} weight="duotone" className="text-brand-light group-hover:text-brand transition-colors flex-shrink-0" />
                  <span className="text-sm font-semibold text-stone-700 group-hover:text-brand transition-colors">{label}</span>
                  <ArrowRight size={14} className="text-stone-300 group-hover:text-brand ml-auto transition-colors" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── GENERATE — nempel di bawah form (semua viewport) ─── */}
      <button
        onClick={generate}
        disabled={generating || !canGenerate}
        className="inline-flex w-full h-12 bg-brand hover:bg-brand/90 text-brand-cream rounded-full font-heading font-bold text-sm btn-lift items-center justify-center gap-2 disabled:opacity-60 shadow-md transition-colors tracking-wide"
        data-testid="generate-copy-btn">
        {generating
          ? <><CircleNotch size={16} className="animate-spin" /> Feedify sedang menulis...</>
          : <><Lightning size={16} weight="fill" /> GENERATE — Marketing Copy</>}
      </button>
    </div>
  );
}
