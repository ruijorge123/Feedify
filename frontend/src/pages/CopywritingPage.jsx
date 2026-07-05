import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import api from "@/lib/api";
import { toast } from 'react-toastify';
import { handleGenerateError } from "@/lib/moderation";
import {
  Sparkle, CircleNotch, CheckCircle, Copy, Check,
  Target, Article, MegaphoneSimple, Hash,
  ImageSquare, Stack, Storefront, HouseSimple, ArrowRight,
  Lightning, CaretDown, CaretUp,
} from "@phosphor-icons/react";
import BrandDnaCard from "@/components/BrandDnaCard";

// ── Constants ─────────────────────────────────────────────────────────────────

const BRAND_CACHE_KEY = "feedify_brand_cache";

const QUICK_PROMPTS = [
  {
    label: "Promo Diskon",
    desc:  "Skincare andalan kami kini diskon 30% — dari Rp 120.000 jadi Rp 84.000. Berlaku 3 hari, stok tersisa 50 pcs. Manfaat: melembapkan, mencerahkan, aman untuk kulit sensitif.",
    goal:  "hard_selling",
    cta:   "strong",
  },
  {
    label: "Launch Produk Baru",
    desc:  "Introducing formula terbaru kami untuk kulit kusam dan lelah — mengandung Vitamin C 20% + Niacinamide, lebih ringan dan cepat meresap. Harga perkenalan Rp 99.000 (normal Rp 150.000), berlaku 7 hari pertama.",
    goal:  "product_launch",
    cta:   "medium",
  },
  {
    label: "Edukasi",
    desc:  "80% masalah kulit berminyak ternyata disebabkan kurangnya hidrasi. Produk kami mengandung Hyaluronic Acid yang mengunci kelembapan 24 jam tanpa menyumbat pori — cocok untuk kulit berminyak, kombinasi, dan sensitif.",
    goal:  "education",
    cta:   "soft",
  },
  {
    label: "Soft Selling",
    desc:  "Rutinitas pagi jadi lebih simpel: moisturizer, sunscreen, dan primer dalam satu langkah. Tekstur ringan, bebas whitecast, nyaman dipakai seharian baik ke kantor maupun WFH.",
    goal:  "soft_selling",
    cta:   "soft",
  },
  {
    label: "Hard Selling",
    desc:  "Produk bestseller kami dengan 10.000+ ulasan bintang 5. Harga Rp 85.000 sudah termasuk gratis ongkir ke seluruh Indonesia. Order sekarang, proses hari ini, tiba 2–3 hari. Stok hampir habis!",
    goal:  "hard_selling",
    cta:   "strong",
  },
  {
    label: "Testimoni",
    desc:  "Lebih dari 5.000 pelanggan sudah membuktikan hasilnya — kulit lebih cerah dalam 2 minggu pemakaian. Rating 4.9/5 di semua platform. Bahan alami, bebas paraben, aman untuk ibu hamil dan menyusui.",
    goal:  "brand_awareness",
    cta:   "medium",
  },
  {
    label: "Flash Sale",
    desc:  "FLASH SALE 12 jam — produk skincare premium turun 50%! Harga normal Rp 200.000, sekarang hanya Rp 100.000. Stok hanya 30 pcs, first come first served. Jangan sampai kehabisan.",
    goal:  "flash_sale",
    cta:   "strong",
  },
  {
    label: "Limited Edition",
    desc:  "Hadir untuk pertama dan terakhir kalinya — edisi koleksi eksklusif dengan kemasan premium spesial. Formula yang sama, packaging berbeda. Hanya 200 pcs diproduksi, tidak akan ada restock. Harga Rp 150.000.",
    goal:  "product_launch",
    cta:   "strong",
  },
];

const AUDIENCE_OPTIONS = [
  { id: "auto",           name: "Auto",          sub: "Rekomen" },
  { id: "women",          name: "Wanita",         sub: null },
  { id: "men",            name: "Pria",           sub: null },
  { id: "parents",        name: "Parents",        sub: null },
  { id: "students",       name: "Mahasiswa",      sub: null },
  { id: "office_workers", name: "Pekerja Kantor", sub: null },
  { id: "business",       name: "Pebisnis",       sub: null },
  { id: "gen_z",          name: "Gen Z",          sub: null },
  { id: "millennials",    name: "Millennials",    sub: null },
  { id: "custom",         name: "Custom",         sub: null },
];

const AUDIENCE_LABEL_MAP = {
  auto:           "",
  women:          "Wanita",
  men:            "Pria",
  parents:        "Orang tua",
  students:       "Mahasiswa",
  office_workers: "Pekerja kantoran",
  business:       "Pemilik bisnis",
  gen_z:          "Gen Z",
  millennials:    "Millennials",
};

const BRAND_VOICES = [
  { id: "auto",         name: "Auto",         badge: "⭐" },
  { id: "friendly",     name: "Friendly",     badge: null },
  { id: "professional", name: "Professional", badge: null },
  { id: "luxury",       name: "Luxury",       badge: null },
  { id: "playful",      name: "Playful",      badge: null },
  { id: "educational",  name: "Educational",  badge: null },
  { id: "persuasive",   name: "Persuasive",   badge: null },
  { id: "minimal",      name: "Minimal",      badge: null },
];

const PRIMARY_GOALS = [
  { id: "auto",           name: "Auto",           badge: "⭐" },
  { id: "brand_awareness",name: "Brand Awareness",badge: null },
  { id: "education",      name: "Education",      badge: null },
  { id: "soft_selling",   name: "Soft Selling",   badge: null },
  { id: "hard_selling",   name: "Hard Selling",   badge: null },
  { id: "product_launch", name: "Product Launch", badge: null },
  { id: "flash_sale",     name: "Flash Sale",     badge: null },
];

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
  { id: "instagram",  name: "Instagram Caption",         recommended: true  },
  { id: "tiktok",     name: "TikTok Caption",            recommended: false },
  { id: "facebook",   name: "Facebook Post",             recommended: false },
  { id: "whatsapp",   name: "WhatsApp Promo",            recommended: false },
  { id: "google_ads", name: "Google Ads",                recommended: false },
  { id: "email",      name: "Email Marketing",           recommended: false },
  { id: "marketplace",name: "Marketplace (Shopee/Tokped)",recommended: false },
  { id: "blog",       name: "Blog Intro",                recommended: false },
];

const NEXT_ACTIONS = [
  { id: "banner",      label: "Create Feed Post",           href: "/generate/banner",      Icon: ImageSquare },
  { id: "carousel",    label: "Create Carousel",            href: "/generate/carousel",    Icon: Stack },
  { id: "marketplace", label: "Create Marketplace Listing", href: "/generate/marketplace", Icon: Storefront },
  { id: "home",        label: "Back to Dashboard",          href: "/dashboard",            Icon: HouseSimple },
];

const DEFAULT_FORM = {
  product_name:       "",
  product_description:"",
  usp:                "",
  audience:           "auto",
  audience_custom:    "",
  brand_voice:        "auto",
  primary_goal:       "auto",
  cta_strength:       "medium",
  caption_length:     "medium",
  output_type:        "instagram",
  save:               true,
};

// ── Main Component ─────────────────────────────────────────────────────────────

export default function CopywritingPage() {
  const [searchParams] = useSearchParams();
  const nav            = useNavigate();
  const from           = searchParams.get("from");

  const [form, setForm]         = useState(DEFAULT_FORM);
  const [generating, setGenerating] = useState(false);
  const [result, setResult]     = useState(null);
  const [showUsp, setShowUsp]   = useState(false);

  const upd = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  useEffect(() => {
    // Seed brand cache for BrandDnaCard
    api.get("/brand-profile").then(({ data }) => {
      localStorage.setItem(BRAND_CACHE_KEY, JSON.stringify(data));
    }).catch(() => {});
  }, []);

  const applyQuickPrompt = ({ desc, goal, cta }) => {
    upd("product_description", desc);
    upd("primary_goal", goal);
    upd("cta_strength", cta);
  };

  const effectiveAudience = form.audience === "custom"
    ? form.audience_custom
    : (AUDIENCE_LABEL_MAP[form.audience] || "");

  const generate = async () => {
    if (!form.product_name.trim())        { toast.error("Nama produk wajib diisi"); return; }
    if (!form.product_description.trim()) { toast.error("Deskripsi produk wajib diisi"); return; }

    setGenerating(true);
    setResult(null);
    try {
      const voiceToSend = form.brand_voice === "auto" ? "" : form.brand_voice;
      const goalToSend  = form.primary_goal  === "auto" ? "soft_selling" : form.primary_goal;
      const payload = {
        product_name:        form.product_name,
        product_description: form.product_description,
        main_problem:        form.usp,
        usp:                 form.usp,
        target_audience:     effectiveAudience,
        brand_voice:         voiceToSend,
        content_purpose:     goalToSend,
        primary_goal:        goalToSend,
        cta_strength:        form.cta_strength,
        caption_length:      form.caption_length,
        platform:            form.output_type,
        save:                form.save,
      };
      const { data } = await api.post("/prompt/generate-copywriting", payload);
      if (data.result?.error) { toast.error("Feedify gagal menghasilkan. Coba lagi."); return; }
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
    <div className="space-y-6 pb-32" data-testid="copywriting-page">
      {/* Header */}
      <div className="animate-fade-up">
        <h1 className="font-heading text-3xl sm:text-4xl font-bold text-brand tracking-tight">Marketing Copy</h1>
        <p className="text-stone-400 mt-1">Ceritakan produkmu — Feedify yang tulis copy-nya.</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* ── Main Form ─────────────────────────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-5 animate-fade-up min-w-0">

          {/* ① Product Brief */}
          <div className="feedify-card p-5 space-y-5">
            <SectionTitle>Product Brief</SectionTitle>

            <Field label="Nama Produk *" hint="Nama produk yang akan dipromosikan.">
              <input type="text" data-testid="copy-product-name"
                value={form.product_name}
                onChange={(e) => upd("product_name", e.target.value)}
                placeholder="mis. Voyoa Sunscreen SPF 50+"
                className="input" />
            </Field>

            <Field label="Deskripsi Produk *" hint="Jelaskan manfaat, bahan, harga, atau keunggulan produk. Atau pilih skenario di bawah sebagai titik awal — tinggal edit sesuai produkmu.">
              <textarea data-testid="copy-product-desc"
                value={form.product_description}
                onChange={(e) => upd("product_description", e.target.value)}
                placeholder="mis. Sunscreen ringan, non-comedogenic, cocok untuk kulit berminyak dan sensitif di cuaca tropis"
                rows={3} className="input resize-none" />
              {/* Quick prompt chips */}
              <div className="flex flex-wrap gap-1.5 mt-2.5">
                {QUICK_PROMPTS.map(({ label, desc, goal, cta }) => (
                  <button key={label} type="button" data-testid={`quick-prompt-${label}`}
                    onClick={() => applyQuickPrompt({ desc, goal, cta })}
                    className="text-[10px] px-2.5 py-1.5 rounded-full bg-stone-100 text-stone-500 hover:bg-brand-gold/15 hover:text-brand transition-all border border-stone-200 hover:border-brand-gold/40 font-medium">
                    ✨ {label}
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-stone-400 mt-1.5">Klik skenario → teks contoh muncul → edit angka & nama produk sesuai bisnismu</p>
            </Field>

            {/* USP — collapsible */}
            {!showUsp ? (
              <button type="button" onClick={() => setShowUsp(true)}
                className="flex items-center gap-1.5 text-[11px] text-stone-400 hover:text-brand transition-colors">
                <CaretDown size={10} /> Tambahkan USP (opsional)
              </button>
            ) : (
              <div className="animate-fade-up">
                <button type="button" onClick={() => setShowUsp(false)}
                  className="flex items-center gap-1.5 text-[11px] text-stone-400 hover:text-brand transition-colors mb-3">
                  <CaretUp size={10} /> Sembunyikan
                </button>
                <Field label="USP — Unique Selling Point" hint="Hal yang membuat produk berbeda dari kompetitor.">
                  <input type="text" data-testid="copy-usp"
                    value={form.usp}
                    onChange={(e) => upd("usp", e.target.value)}
                    placeholder="mis. Tidak bikin whitecast, ringan di kulit, aman untuk kulit sensitif"
                    className="input" />
                </Field>
              </div>
            )}
          </div>

          {/* ② Output Type */}
          <div className="feedify-card p-5 space-y-3">
            <SectionTitle>Output</SectionTitle>
            <div className="flex flex-wrap gap-2">
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
          </div>

          {/* ③ Audience */}
          <div className="feedify-card p-5 space-y-3">
            <SectionTitle>Audience</SectionTitle>
            <div className="flex flex-wrap gap-2">
              {AUDIENCE_OPTIONS.map(({ id, name, sub }) => (
                <button key={id} type="button" data-testid={`audience-${id}`}
                  onClick={() => upd("audience", id)}
                  className={`relative px-3.5 py-2 rounded-full border-2 text-xs font-semibold transition-all ${
                    form.audience === id
                      ? "bg-brand text-brand-cream border-brand"
                      : "bg-white border-stone-200 text-stone-600 hover:border-brand/40"
                  }`}>
                  {sub && form.audience !== id && (
                    <span className="absolute -top-2 -right-1 text-[7px] bg-brand-gold text-brand font-bold px-1.5 py-0.5 rounded-full">{sub}</span>
                  )}
                  {name}
                </button>
              ))}
            </div>
            {form.audience === "custom" && (
              <input type="text" autoFocus data-testid="audience-custom"
                value={form.audience_custom}
                onChange={(e) => upd("audience_custom", e.target.value)}
                placeholder="Deskripsikan target audience kamu..."
                className="input animate-fade-up" />
            )}
            {form.audience === "auto" && (
              <p className="text-[10px] text-stone-400">Feedify akan menentukan audience terbaik berdasarkan deskripsi produk.</p>
            )}
          </div>

          {/* ④ Brand Voice */}
          <div className="feedify-card p-5 space-y-3">
            <SectionTitle>Brand Voice</SectionTitle>
            <div className="flex flex-wrap gap-2">
              {BRAND_VOICES.map(({ id, name, badge }) => (
                <button key={id} type="button" data-testid={`brand-voice-${id}`}
                  onClick={() => upd("brand_voice", id)}
                  className={`relative px-3.5 py-2 rounded-full border-2 text-xs font-semibold transition-all ${
                    form.brand_voice === id
                      ? "bg-brand text-brand-cream border-brand"
                      : "bg-white border-stone-200 text-stone-600 hover:border-brand/40"
                  }`}>
                  {badge && form.brand_voice !== id && (
                    <span className="absolute -top-2 -right-1 text-[7px] bg-brand-gold text-brand font-bold px-1.5 py-0.5 rounded-full">{badge}</span>
                  )}
                  {name}
                </button>
              ))}
            </div>
            {form.brand_voice === "auto" && (
              <p className="text-[10px] text-stone-400">Feedify akan menyesuaikan voice dari Brand DNA kamu secara otomatis.</p>
            )}
          </div>

          {/* ⑤ Primary Goal */}
          <div className="feedify-card p-5 space-y-3">
            <SectionTitle>Primary Goal</SectionTitle>
            <div className="flex flex-wrap gap-2">
              {PRIMARY_GOALS.map(({ id, name, badge }) => (
                <button key={id} type="button" data-testid={`goal-${id}`}
                  onClick={() => upd("primary_goal", id)}
                  className={`relative px-3.5 py-2 rounded-full border-2 text-xs font-semibold transition-all ${
                    form.primary_goal === id
                      ? "bg-brand text-brand-cream border-brand"
                      : "bg-white border-stone-200 text-stone-600 hover:border-brand/40"
                  }`}>
                  {badge && form.primary_goal !== id && (
                    <span className="absolute -top-2 -right-1 text-[7px] bg-brand-gold text-brand font-bold px-1.5 py-0.5 rounded-full">{badge}</span>
                  )}
                  {name}
                </button>
              ))}
            </div>
          </div>

          {/* ⑥ CTA + Length */}
          <div className="feedify-card p-5 space-y-5">
            <div>
              <SectionTitle className="mb-3">CTA Strength</SectionTitle>
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
              <SectionTitle className="mb-3">Caption Length</SectionTitle>
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

          {/* ⑦ Feedify akan otomatis */}
          <div className="rounded-2xl border border-green-100 p-5 bg-gradient-to-br from-green-50/60 to-white" data-testid="copy-ai-card">
            <div className="flex items-center gap-2 mb-3">
              <Sparkle size={14} weight="fill" className="text-brand-gold" />
              <p className="text-sm font-semibold text-brand">Feedify akan otomatis</p>
            </div>
            <div className="space-y-2">
              {[
                "Menulis headline dan hook pembuka yang menarik perhatian",
                "Menyesuaikan tone dan voice dengan karakter brand kamu",
                "Menyusun body copy, CTA, dan closing yang efektif",
                "Menghasilkan versi dengan emoji dan tanpa emoji",
                "Menambahkan hashtag relevan dan keyword untuk SEO",
              ].map((item) => (
                <div key={item} className="flex items-center gap-2.5">
                  <CheckCircle size={14} weight="fill" className="text-green-500 flex-shrink-0" />
                  <span className="text-xs text-stone-600">{item}</span>
                </div>
              ))}
            </div>
            <p className="text-[11px] text-stone-400 mt-4">⏱ Estimasi proses ±10–20 detik.</p>
          </div>
        </div>

        {/* ── Sidebar ──────────────────────────────────────────────────────── */}
        <div className="lg:sticky lg:top-6 lg:self-start space-y-4">
          <BrandDnaCard />

          {/* Quick summary */}
          <div className="feedify-card p-4 space-y-2.5">
            <div className="text-xs uppercase tracking-[0.18em] text-brand-light font-bold">Konfigurasi</div>
            <SummaryRow label="Output"  value={OUTPUT_TYPES.find(o => o.id === form.output_type)?.name || "—"} />
            <SummaryRow label="Voice"   value={BRAND_VOICES.find(v => v.id === form.brand_voice)?.name || "—"} />
            <SummaryRow label="Goal"    value={PRIMARY_GOALS.find(g => g.id === form.primary_goal)?.name || "—"} />
            <SummaryRow label="CTA"     value={CTA_STRENGTHS.find(c => c.id === form.cta_strength)?.name || "—"} />
            <SummaryRow label="Length"  value={CAPTION_LENGTHS.find(l => l.id === form.caption_length)?.name || "—"} />
            <SummaryRow label="Audience" value={
              form.audience === "auto"   ? "Auto (AI pilihkan)" :
              form.audience === "custom" ? (form.audience_custom || "Custom") :
              (AUDIENCE_LABEL_MAP[form.audience] || form.audience)
            } />
          </div>
        </div>
      </div>

      {/* ── Results ─────────────────────────────────────────────────────────── */}
      {result?.result && !result.result.error && (
        <div id="copy-result" className="space-y-5 animate-fade-up">
          <div className="flex items-center gap-2">
            <CheckCircle size={24} weight="fill" className="text-green-600" />
            <h2 className="font-heading text-2xl font-bold text-brand">Marketing Copy Siap!</h2>
          </div>

          {(result.result.headlines || []).length > 0 && (
            <ResultSection icon={Target} title="Headlines" subtitle="Pilih yang paling kuat">
              <div className="space-y-2">
                {result.result.headlines.map((h, i) => (
                  <CopyableLine key={i} text={h} testid={`headline-${i}`} />
                ))}
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
                {result.result.cta_options.map((c, i) => (
                  <CopyableChip key={i} text={c} testid={`cta-${i}`} />
                ))}
              </div>
            </ResultSection>
          )}

          {(result.result.seo_keywords || result.result.hashtags || []).length > 0 && (
            <ResultSection icon={Hash} title="Hashtags & SEO Keywords" subtitle="Relevan untuk caption & bio">
              <div className="flex flex-wrap gap-1.5 mb-3">
                {(result.result.seo_keywords || result.result.hashtags || []).map((h, i) => (
                  <span key={i} className="px-2.5 py-1 bg-brand-sand rounded-full text-xs font-medium text-brand">{h}</span>
                ))}
              </div>
              <CopyButton
                text={(result.result.seo_keywords || result.result.hashtags || []).join(" ")}
                testid="keywords-copy-all"
                label="Copy semua"
              />
            </ResultSection>
          )}

          <div className="feedify-card p-5">
            <div className="text-xs uppercase tracking-[0.18em] text-brand-light font-bold mb-3">Lanjutkan dengan Feedify</div>
            <div className="grid sm:grid-cols-2 gap-2">
              {NEXT_ACTIONS.filter(a => a.id !== from).map(({ id, label, href, Icon }) => (
                <button key={id} type="button" onClick={() => nav(href)}
                  data-testid={`next-action-${id}`}
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

      {/* ── Sticky Generate Bar ──────────────────────────────────────────────── */}
      <div className="fixed bottom-0 left-0 right-0 z-40 lg:left-64 backdrop-blur-md border-t border-stone-200"
        style={{ background: "rgba(242,246,244,0.92)" }}>
        <div className="max-w-4xl mx-auto px-4 py-3 flex flex-col items-center gap-1">
          <button type="button" onClick={generate} disabled={generating} data-testid="generate-copy-btn"
            className="w-full py-4 bg-brand text-brand-cream rounded-full font-bold text-base hover:bg-brand-light btn-lift inline-flex items-center justify-center gap-2 disabled:opacity-60 shadow-lg shadow-brand/20">
            {generating
              ? <><CircleNotch size={20} className="animate-spin" /> Feedify sedang menulis...</>
              : <><Sparkle size={20} weight="fill" /> Generate Marketing Copy</>}
          </button>
          {!generating && (
            <p className="text-[10px] text-stone-400">≈ 10 detik &nbsp;·&nbsp; 1 kredit</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function SectionTitle({ children, className = "" }) {
  return (
    <div className={`text-[10px] uppercase tracking-[0.18em] text-brand-light font-bold ${className}`}>{children}</div>
  );
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

function SummaryRow({ label, value }) {
  return (
    <div className="flex items-center justify-between text-xs gap-2">
      <span className="text-stone-400 flex-shrink-0">{label}</span>
      <span className="font-semibold text-stone-700 text-right max-w-[60%] truncate">{value}</span>
    </div>
  );
}
