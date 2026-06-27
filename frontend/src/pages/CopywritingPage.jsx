import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import api from "@/lib/api";
import { toast } from 'react-toastify';
import { handleGenerateError } from "@/lib/moderation";
import {
  Sparkle, CircleNotch, CheckCircle, Copy, Check,
  Target, Article, MegaphoneSimple, Hash,
  ImageSquare, Stack, Storefront, HouseSimple, ArrowRight,
} from "@phosphor-icons/react";
import BrandDnaCard from "@/components/BrandDnaCard";

// ── Constants ─────────────────────────────────────────────────────────────────

const AUDIENCE_CHIPS = [
  "Wanita 18–24", "Wanita 25–34", "Pria", "Gen Z", "Millennial",
  "Pemilik Bisnis", "Ibu", "Mahasiswa", "Pekerja Kantoran",
];

const BRAND_VOICES = [
  { id: "friendly",     name: "Friendly" },
  { id: "professional", name: "Professional" },
  { id: "premium",      name: "Premium" },
  { id: "luxury",       name: "Luxury" },
  { id: "elegant",      name: "Elegant" },
  { id: "minimal",      name: "Minimal" },
  { id: "casual",       name: "Casual" },
  { id: "gen_z",        name: "Gen Z" },
  { id: "educational",  name: "Educational" },
];

const PRIMARY_GOALS = [
  { id: "brand_awareness", name: "Brand Awareness",  color: "bg-stone-50 border-stone-300 text-stone-700" },
  { id: "education",       name: "Education",        color: "bg-blue-50 border-blue-200 text-blue-700" },
  { id: "soft_selling",    name: "Soft Selling",     color: "bg-green-50 border-green-200 text-green-700" },
  { id: "hard_selling",    name: "Hard Selling",     color: "bg-red-50 border-red-200 text-red-700" },
  { id: "product_launch",  name: "Product Launch",   color: "bg-purple-50 border-purple-200 text-purple-700" },
  { id: "flash_sale",      name: "Flash Sale",       color: "bg-orange-50 border-orange-200 text-orange-700" },
];

const CTA_STRENGTHS = [
  { id: "soft",   name: "Soft",   example: "Yuk coba kalau cocok 😊" },
  { id: "medium", name: "Medium", example: "Klik link bio sekarang." },
  { id: "strong", name: "Strong", example: "Promo berakhir hari ini." },
];

const CAPTION_LENGTHS = [
  { id: "short",  name: "Short",  desc: "1–3 kalimat" },
  { id: "medium", name: "Medium", desc: "4–6 kalimat" },
  { id: "long",   name: "Long",   desc: "7–10 kalimat" },
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
  brand_voice:        "friendly",
  primary_goal:       "soft_selling",
  cta_strength:       "medium",
  caption_length:     "medium",
  save:               true,
};

// ── Main Component ─────────────────────────────────────────────────────────────

export default function CopywritingPage() {
  const [searchParams] = useSearchParams();
  const navigate       = useNavigate();
  const from           = searchParams.get("from"); // "banner"|"carousel"|"marketplace"

  const [form, setForm]           = useState(DEFAULT_FORM);
  const [audience, setAudience]   = useState("");      // chip or custom
  const [customAud, setCustomAud] = useState("");
  const [isCustomAud, setIsCustomAud] = useState(false);
  const [generating, setGenerating]   = useState(false);
  const [result, setResult]           = useState(null);
  const [brand, setBrand]             = useState(null);

  const upd = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  useEffect(() => {
    api.get("/brand-profile").then(({ data }) => {
      setBrand(data);
    }).catch(() => {});
  }, []);

  const selectChip = (chip) => {
    if (chip === "Other") {
      setIsCustomAud(true);
      setAudience("");
    } else {
      setIsCustomAud(false);
      setAudience(chip);
      setCustomAud("");
    }
  };

  const effectiveAudience = isCustomAud ? customAud : audience;

  const generate = async () => {
    if (!form.product_name.trim())        { toast.error("Nama produk wajib diisi"); return; }
    if (!form.product_description.trim()) { toast.error("Deskripsi produk wajib diisi"); return; }
    if (!effectiveAudience.trim())        { toast.error("Target audiens wajib diisi"); return; }

    setGenerating(true);
    setResult(null);
    try {
      const payload = {
        product_name:        form.product_name,
        product_description: form.product_description,
        main_problem:        form.usp,           // backward compat
        usp:                 form.usp,
        target_audience:     effectiveAudience,
        brand_voice:         form.brand_voice,
        content_purpose:     form.primary_goal,  // backward compat
        primary_goal:        form.primary_goal,
        cta_strength:        form.cta_strength,
        caption_length:      form.caption_length,
        platform:            "instagram",        // always instagram, not shown in UI
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
    <div className="space-y-6" data-testid="copywriting-page">
      <div className="animate-fade-up">
        <h1 className="font-heading text-3xl sm:text-4xl font-bold text-brand tracking-tight">Marketing Copywriting</h1>
        <p className="text-stone-600 mt-2 max-w-2xl">
          Generate headline, caption, CTA, dan SEO keywords siap pakai — dalam satu klik.
        </p>
      </div>

      <div className="grid lg:grid-cols-5 gap-6">
        {/* ── Form ─────────────────────────────────────────────────────────── */}
        <div className="lg:col-span-3 space-y-4 animate-fade-up">

          {/* Product */}
          <div className="feedify-card p-6 space-y-5">
            <Field label="Product Name *">
              <input
                type="text"
                data-testid="copy-product-name"
                value={form.product_name}
                onChange={(e) => upd("product_name", e.target.value)}
                placeholder="mis. Voyoa Sunscreen SPF 50+"
                className="input"
              />
            </Field>

            <Field label="Product Description *">
              <textarea
                data-testid="copy-product-desc"
                value={form.product_description}
                onChange={(e) => upd("product_description", e.target.value)}
                placeholder="Jelaskan manfaat, bahan, dan keunggulan produk Anda"
                rows={3}
                className="input resize-none"
              />
            </Field>

            <Field label="USP — Unique Selling Point">
              <textarea
                data-testid="copy-usp"
                value={form.usp}
                onChange={(e) => upd("usp", e.target.value)}
                placeholder="mis. Tidak bikin whitecast, ringan di kulit, cocok cuaca tropis"
                rows={2}
                className="input resize-none"
              />
            </Field>
          </div>

          {/* Audience + Voice */}
          <div className="feedify-card p-6 space-y-5">
            <Field label="Target Audience *">
              <div className="flex flex-wrap gap-2 mb-2">
                {AUDIENCE_CHIPS.map((chip) => (
                  <button
                    key={chip}
                    type="button"
                    data-testid={`audience-chip-${chip}`}
                    onClick={() => selectChip(chip)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                      audience === chip && !isCustomAud
                        ? "bg-brand text-white border-brand"
                        : "bg-white border-stone-200 text-stone-600 hover:border-brand/40"
                    }`}
                  >
                    {chip}
                  </button>
                ))}
                <button
                  type="button"
                  data-testid="audience-chip-other"
                  onClick={() => selectChip("Other")}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                    isCustomAud
                      ? "bg-brand text-white border-brand"
                      : "bg-white border-stone-200 text-stone-600 hover:border-brand/40"
                  }`}
                >
                  Other
                </button>
              </div>
              {isCustomAud && (
                <input
                  type="text"
                  autoFocus
                  data-testid="audience-custom"
                  value={customAud}
                  onChange={(e) => setCustomAud(e.target.value)}
                  placeholder="Describe your target audience..."
                  className="input mt-1 animate-fade-up"
                />
              )}
            </Field>

            <Field label="Brand Voice">
              <div className="flex flex-wrap gap-2">
                {BRAND_VOICES.map(({ id, name }) => (
                  <button
                    key={id}
                    type="button"
                    data-testid={`brand-voice-${id}`}
                    onClick={() => upd("brand_voice", id)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                      form.brand_voice === id
                        ? "bg-brand-gold text-brand border-brand-gold"
                        : "bg-white border-stone-200 text-stone-600 hover:border-stone-300"
                    }`}
                  >
                    {name}
                  </button>
                ))}
              </div>
            </Field>
          </div>

          {/* Goal + CTA + Length */}
          <div className="feedify-card p-6 space-y-5">
            <Field label="Primary Goal">
              <div className="flex flex-wrap gap-2">
                {PRIMARY_GOALS.map(({ id, name, color }) => (
                  <button
                    key={id}
                    type="button"
                    data-testid={`goal-${id}`}
                    onClick={() => upd("primary_goal", id)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                      form.primary_goal === id
                        ? color + " ring-1 ring-offset-1 ring-current"
                        : "bg-white border-stone-200 text-stone-600 hover:border-stone-300"
                    }`}
                  >
                    {name}
                  </button>
                ))}
              </div>
            </Field>

            <Field label="CTA Strength">
              <div className="grid grid-cols-3 gap-2">
                {CTA_STRENGTHS.map(({ id, name, example }) => (
                  <button
                    key={id}
                    type="button"
                    data-testid={`cta-strength-${id}`}
                    onClick={() => upd("cta_strength", id)}
                    className={`p-3 rounded-xl border-2 text-left transition-all ${
                      form.cta_strength === id
                        ? "border-brand bg-brand-sand"
                        : "border-stone-100 hover:border-brand/30 bg-white"
                    }`}
                  >
                    <div className={`font-bold text-sm ${form.cta_strength === id ? "text-brand" : "text-stone-700"}`}>{name}</div>
                    <div className="text-[10px] text-stone-400 mt-1 leading-tight italic">{example}</div>
                  </button>
                ))}
              </div>
            </Field>

            <Field label="Caption Length">
              <div className="grid grid-cols-3 gap-2">
                {CAPTION_LENGTHS.map(({ id, name, desc }) => (
                  <button
                    key={id}
                    type="button"
                    data-testid={`caption-length-${id}`}
                    onClick={() => upd("caption_length", id)}
                    className={`p-3 rounded-xl border-2 text-center transition-all ${
                      form.caption_length === id
                        ? "border-brand bg-brand-sand"
                        : "border-stone-100 hover:border-brand/30 bg-white"
                    }`}
                  >
                    <div className={`font-bold text-sm ${form.caption_length === id ? "text-brand" : "text-stone-700"}`}>{name}</div>
                    <div className="text-[10px] text-stone-400 mt-0.5">{desc}</div>
                  </button>
                ))}
              </div>
            </Field>
          </div>

          <button
            type="button"
            onClick={generate}
            disabled={generating}
            data-testid="generate-copy-btn"
            className="w-full py-4 bg-brand text-brand-cream rounded-full font-bold text-lg hover:bg-brand-light btn-lift inline-flex items-center justify-center gap-2 disabled:opacity-60 shadow-lg"
          >
            {generating
              ? <><CircleNotch size={20} className="animate-spin" /> Sedang menulis...</>
              : <><Sparkle size={20} weight="fill" /> Generate Marketing Copy</>}
          </button>
        </div>

        {/* ── Sidebar ──────────────────────────────────────────────────────── */}
        <div className="lg:col-span-2 lg:sticky lg:top-6 lg:self-start space-y-4">
          {/* Live summary */}
          <div className="feedify-card p-4 space-y-2.5">
            <div className="text-xs uppercase tracking-[0.18em] text-brand-light font-bold">Copy Settings</div>
            <SummaryRow label="Voice"   value={BRAND_VOICES.find(v => v.id === form.brand_voice)?.name || "-"} />
            <SummaryRow label="Goal"    value={PRIMARY_GOALS.find(g => g.id === form.primary_goal)?.name || "-"} />
            <SummaryRow label="CTA"     value={CTA_STRENGTHS.find(c => c.id === form.cta_strength)?.name || "-"} />
            <SummaryRow label="Length"  value={CAPTION_LENGTHS.find(l => l.id === form.caption_length)?.name || "-"} />
            <SummaryRow label="Audience" value={effectiveAudience || "-"} />
          </div>
          <BrandDnaCard />
        </div>
      </div>

      {/* ── Results ─────────────────────────────────────────────────────────── */}
      {result?.result && !result.result.error && (
        <div id="copy-result" className="space-y-5 animate-fade-up">
          <div className="flex items-center gap-2">
            <CheckCircle size={24} weight="fill" className="text-green-600" />
            <h2 className="font-heading text-2xl font-bold text-brand">Marketing Copy Anda Siap!</h2>
          </div>

          {/* Headlines */}
          <ResultSection icon={Target} title="Headlines" subtitle="5 pilihan — pilih yang paling kuat">
            <div className="space-y-2">
              {(result.result.headlines || []).map((h, i) => (
                <CopyableLine key={i} text={h} testid={`headline-${i}`} />
              ))}
            </div>
          </ResultSection>

          {/* Captions */}
          <ResultSection icon={Article} title="Captions" subtitle="3 gaya berbeda — Educational · Storytelling · Selling">
            <div className="space-y-3">
              {(result.result.captions || []).map((c, i) => (
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

          {/* CTAs */}
          <ResultSection icon={MegaphoneSimple} title="Call-to-Action" subtitle="5 opsi siap pakai">
            <div className="flex flex-wrap gap-2">
              {(result.result.cta_options || []).map((c, i) => (
                <CopyableChip key={i} text={c} testid={`cta-${i}`} />
              ))}
            </div>
          </ResultSection>

          {/* SEO Keywords */}
          <ResultSection icon={Hash} title="SEO Keywords" subtitle="8 keyword relevan untuk caption & bio">
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

          {/* Continue with Feedify */}
          <div className="feedify-card p-5">
            <div className="text-xs uppercase tracking-[0.18em] text-brand-light font-bold mb-3">Lanjutkan dengan Feedify</div>
            <div className="grid sm:grid-cols-2 gap-2">
              {NEXT_ACTIONS.filter(a => a.id !== from).map(({ id, label, href, Icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => navigate(href)}
                  data-testid={`next-action-${id}`}
                  className="flex items-center gap-3 p-3 rounded-xl border border-stone-100 hover:border-brand/30 hover:bg-brand-sand/30 transition-all text-left group"
                >
                  <Icon size={18} weight="duotone" className="text-brand-light group-hover:text-brand transition-colors flex-shrink-0" />
                  <span className="text-sm font-semibold text-stone-700 group-hover:text-brand transition-colors">{label}</span>
                  <ArrowRight size={14} className="text-stone-300 group-hover:text-brand ml-auto transition-colors" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function ResultSection({ icon: Icon, title, subtitle, children }) {
  return (
    <div className="feedify-card p-5">
      <div className="flex items-start gap-2 mb-3">
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
    <button
      type="button"
      onClick={async () => { try { await navigator.clipboard.writeText(text); toast.success("Disalin!"); } catch {} }}
      data-testid={testid}
      className="px-3 py-2 bg-brand-gold/20 hover:bg-brand-gold/40 border border-brand-gold/40 rounded-full text-sm font-medium text-brand transition-all"
    >
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
    <button
      type="button"
      onClick={handle}
      data-testid={testid}
      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-brand hover:bg-brand-sand rounded-full transition-all"
    >
      {copied ? <Check size={12} weight="bold" /> : <Copy size={12} weight="bold" />}
      {label || (copied ? "OK" : "Copy")}
    </button>
  );
}

function SummaryRow({ label, value }) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-stone-400">{label}</span>
      <span className="font-semibold text-stone-700 text-right max-w-[60%] truncate">{value}</span>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label className="text-xs font-semibold uppercase tracking-[0.15em] text-stone-500 mb-1.5 block">{label}</label>
      {children}
    </div>
  );
}
