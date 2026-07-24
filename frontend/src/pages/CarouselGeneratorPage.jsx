import { useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { toast } from "react-toastify";
import { useAuth } from "@/context/AuthContext";
import {
  Sparkle, CircleNotch, CheckCircle, X,
  Images, Package, CaretDown, DownloadSimple, User,
} from "@phosphor-icons/react";
import BrandDnaCard from "@/components/BrandDnaCard";
import InspirationGallery from "@/components/InspirationGallery";
import PromptSuccessCard from "@/components/PromptSuccessCard";
import DebugJsonButton from "@/components/DebugJsonButton";

// ── Constants ─────────────────────────────────────────────────────────────────

const INTENTS = [
  { id: "sell",        emoji: "🛒", label: "Jualan",      goal: "promo",   flow: "problem_solution", desc: "Promo, launch, soft selling" },
  { id: "educate",     emoji: "📚", label: "Edukasi",     goal: "edukasi", flow: "listicle",         desc: "Tips, myth vs fact, how-to" },
  { id: "storytelling",emoji: "✨", label: "Storytelling", goal: "edukasi", flow: "story_brand",      desc: "Before-after, brand journey" },
];

const STORY_FLOWS = [
  { id: "auto",             emoji: "✨", label: "Auto",            desc: "AI pilih flow terbaik" },
  { id: "problem_solution", emoji: "⚡", label: "Masalah → Solusi", desc: "" },
  { id: "myth_fact",        emoji: "🔍", label: "Myth vs Fact",    desc: "" },
  { id: "before_after",     emoji: "🔄", label: "Before After",    desc: "" },
  { id: "step_by_step",     emoji: "📋", label: "Step by Step",    desc: "" },
  { id: "listicle",         emoji: "📝", label: "Listicle",        desc: "" },
  { id: "story_brand",      emoji: "📖", label: "Story Brand",     desc: "" },
];

const ASPECT_RATIOS = [
  { key: "1:1",  label: "1:1",  sub: "Square",         value: "1:1 (Square Feed)",      w: 1, h: 1 },
  { key: "4:5",  label: "4:5",  sub: "Rekomendasi",    value: "4:5 (Portrait Feed)",    w: 4, h: 5, recommended: true },
  { key: "9:16", label: "9:16", sub: "Story · Reels",  value: "9:16 (Story/Reels)",     w: 9, h: 16 },
];

// Slide roles per story flow × slide count
const FLOW_ROLES = {
  auto: {
    3: ["Hook", "Isi Utama", "CTA"],
    4: ["Hook", "Point 1", "Point 2", "CTA"],
    5: ["Hook", "Point 1", "Point 2", "Point 3", "CTA"],
    6: ["Hook", "Point 1", "Point 2", "Point 3", "Point 4", "CTA"],
    7: ["Hook", "Point 1", "Point 2", "Point 3", "Point 4", "Point 5", "CTA"],
  },
  problem_solution: {
    3: ["Hook 🎯", "Masalah", "Solusi + CTA"],
    4: ["Hook 🎯", "Masalah", "Solusi", "CTA"],
    5: ["Hook 🎯", "Masalah", "Kenapa?", "Solusi", "CTA"],
    6: ["Hook 🎯", "Masalah", "Kenapa?", "Dampak", "Solusi", "CTA"],
    7: ["Hook 🎯", "Masalah", "Kenapa?", "Dampak", "Insight", "Solusi", "CTA"],
  },
  myth_fact: {
    3: ["Hook 🔍", "Mitos", "Fakta + CTA"],
    4: ["Hook 🔍", "Mitos 1", "Fakta 1", "CTA"],
    5: ["Hook 🔍", "Mitos 1", "Fakta 1", "Mitos 2", "CTA"],
    6: ["Hook 🔍", "Mitos 1", "Fakta 1", "Mitos 2", "Fakta 2", "CTA"],
    7: ["Hook 🔍", "Mitos 1", "Fakta 1", "Mitos 2", "Fakta 2", "Fakta 3", "CTA"],
  },
  before_after: {
    3: ["Hook 🔄", "Before", "After + CTA"],
    4: ["Hook 🔄", "Before", "Proses", "After + CTA"],
    5: ["Hook 🔄", "Before", "Proses", "After", "CTA"],
    6: ["Hook 🔄", "Before", "Masalah", "Proses", "After", "CTA"],
    7: ["Hook 🔄", "Before", "Masalah", "Proses", "Hasil", "After", "CTA"],
  },
  step_by_step: {
    3: ["Hook 📋", "Step 1 & 2", "Step 3 + CTA"],
    4: ["Hook 📋", "Step 1", "Step 2", "Step 3 + CTA"],
    5: ["Hook 📋", "Step 1", "Step 2", "Step 3", "CTA"],
    6: ["Hook 📋", "Step 1", "Step 2", "Step 3", "Step 4", "CTA"],
    7: ["Hook 📋", "Step 1", "Step 2", "Step 3", "Step 4", "Step 5", "CTA"],
  },
  listicle: {
    3: ["Hook 📝", "Tips 1–3", "CTA"],
    4: ["Hook 📝", "Tips 1–2", "Tips 3–4", "CTA"],
    5: ["Hook 📝", "Tip 1", "Tip 2", "Tip 3", "CTA"],
    6: ["Hook 📝", "Tip 1", "Tip 2", "Tip 3", "Tip 4", "CTA"],
    7: ["Hook 📝", "Tip 1", "Tip 2", "Tip 3", "Tip 4", "Tip 5", "CTA"],
  },
  story_brand: {
    3: ["Hook 📖", "Perjalanan", "Hasil + CTA"],
    4: ["Hook 📖", "Problem", "Perubahan", "Hasil + CTA"],
    5: ["Hook 📖", "Before", "Problem", "Turning Point", "After + CTA"],
    6: ["Hook 📖", "Before", "Problem", "Turning Point", "After", "CTA"],
    7: ["Hook 📖", "Before", "Problem", "Turning Point", "Bukti", "After", "CTA"],
  },
};

const MODEL_STYLES = [
  { id: "hijab",         label: "Hijab",        emoji: "🧕", value: "Berhijab, gaya modest fashion Indonesia" },
  { id: "hijab-modern",  label: "Hijab Modern", emoji: "✨", value: "Hijab modern kontemporer, hijab trendy" },
  { id: "korean",        label: "Korean",        emoji: "🌸", value: "Korean beauty style, K-beauty aesthetic" },
  { id: "natural",       label: "Natural",       emoji: "🌿", value: "Penampilan natural, minimal makeup" },
  { id: "sporty",        label: "Sporty",        emoji: "⚡", value: "Sporty casual, athleisure" },
  { id: "kasual",        label: "Kasual",        emoji: "👕", value: "Kasual sehari-hari" },
  { id: "elegan",        label: "Elegan",        emoji: "💎", value: "Elegan dan sophisticated" },
  { id: "profesional",   label: "Profesional",   emoji: "👔", value: "Profesional, business attire" },
];

const MODEL_AGES = [
  { id: "18-22", label: "18–22 th" },
  { id: "22-27", label: "22–27 th" },
  { id: "27-35", label: "27–35 th" },
  { id: "35-45", label: "35–45 th" },
];

const CTA_SUGGESTIONS = [
  "Pesan Sekarang", "Beli Sekarang", "Coba Gratis",
  "DM untuk Info", "Klik Link Bio", "Shop Now", "Dapatkan Promo",
];

function toBase64(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function CarouselGeneratorPage() {
  const { user } = useAuth();

  // Product library
  const [selectedProductId, setSelectedProductId] = useState(null);
  const [productDropdownOpen, setProductDropdownOpen] = useState(false);

  // Inspiration photo
  const [referenceImg, setReferenceImg]    = useState(null);  // manual upload (single)
  const [referenceSlides, setReferenceSlides] = useState([]); // gallery multi-select (N slides)
  const [galleryOpen, setGalleryOpen]      = useState(false);

  // Content config
  const [intent, setIntent]         = useState("sell");
  const [storyFlow, setStoryFlow]   = useState("auto");
  const [topic, setTopic]           = useState("");
  const [slideCount, setSlideCount] = useState(3);
  const [aspectRatio, setAspectRatio] = useState("4:5 (Portrait Feed)");

  // Model
  const [modelEnabled, setModelEnabled] = useState(false);
  const [modelGender, setModelGender]   = useState("wanita");
  const [modelStyle, setModelStyle]     = useState(null);
  const [modelAge, setModelAge]         = useState(null);

  // CTA
  const [ctaEnabled, setCtaEnabled] = useState(false);
  const [ctaText, setCtaText]       = useState("");

  // Generate state
  const [generating, setGenerating]   = useState(false);
  const [promptResult, setPromptResult] = useState(null);
  const promptCardRef = useRef(null);

  // Clear gallery slides when slide count changes
  useEffect(() => { setReferenceSlides([]); }, [slideCount]);

  // Products
  const { data: products = [], isLoading: productsLoading } = useQuery({
    queryKey: ["products"],
    queryFn: async () => { const { data } = await api.get("/products"); return data; },
  });
  const selectedProduct = products.find(p => p.id === selectedProductId) || null;

  const activeIntent = INTENTS.find(i => i.id === intent) || INTENTS[0];

  // ── Generate ──────────────────────────────────────────────────────────────────

  const generate = async () => {
    setGenerating(true);
    setPromptResult(null);
    try {
      const payload = {
        topic:        topic.trim() || activeIntent.desc,
        content_goal: activeIntent.goal,
        campaign_goal:activeIntent.goal,
        template:     activeIntent.flow,
        story_flow:   storyFlow === "auto" ? activeIntent.flow : storyFlow,
        slide_count:  slideCount,
        aspect_ratio: aspectRatio,
        visual_type:  "product_only",
        ai_director_mode: "smart",
        style_preset: "Minimal Clean",
        mood_override: "",
        save: true,
      };
      if (selectedProduct) {
        payload.product_name = selectedProduct.name || "";
        payload.brand_name   = selectedProduct.brand_name || "";
        if (selectedProduct.photo_base64)
          payload.product_photo_base64 = selectedProduct.photo_base64.split(",")[1] || selectedProduct.photo_base64;
        if (selectedProduct.benefits?.length)
          payload.final_cta = selectedProduct.usp || "";
        payload.product_id = selectedProduct.id;
      }
      if (ctaEnabled && ctaText.trim()) {
        payload.call_to_action = ctaText.trim();
        payload.final_cta      = ctaText.trim();
      }
      if (modelEnabled) {
        payload.human_enabled  = true;
        payload.visual_type    = "human_product";
        payload.talent_gender  = modelGender === "wanita" ? "female" : "male";
        payload.model_character = modelGender === "wanita" ? "Wanita Indonesia" : "Pria Indonesia";
        if (modelStyle) {
          const s = MODEL_STYLES.find(x => x.id === modelStyle);
          payload.outfit_style   = s?.value || modelStyle;
          payload.model_fashion  = s?.value || modelStyle;
          if (modelStyle === "korean") payload.talent_ethnicity = "korean";
        }
        if (modelAge) {
          payload.model_age = modelAge;
          const ageMap = { "18-22": "teen", "22-27": "young_adult", "27-35": "adult", "35-45": "mature" };
          payload.talent_age_group = ageMap[modelAge] || "young_adult";
        }
      }
      const { data } = await api.post("/prompt/preview-carousel", payload);
      setPromptResult(data);
      setTimeout(() => promptCardRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Gagal membuat prompt. Coba lagi.");
    } finally {
      setGenerating(false);
    }
  };

  // ── Reference photo handlers ──────────────────────────────────────────────────

  const handleRefFile = async (file) => {
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) { toast.error("Foto max 8MB"); return; }
    setReferenceImg(await toBase64(file));
  };

  // ── Slide storyboard preview ──────────────────────────────────────────────────

  // Use the active flow key — if "auto", fall back to the intent's default flow
  const activeFlowKey = storyFlow === "auto" ? activeIntent.flow : storyFlow;
  const slideRoles = (FLOW_ROLES[activeFlowKey] || FLOW_ROLES.auto)[slideCount]
    || (FLOW_ROLES[activeFlowKey] || FLOW_ROLES.auto)[3];
  const ar = ASPECT_RATIOS.find(r => r.value === aspectRatio) || ASPECT_RATIOS[1];
  const maxH = 44;
  const scale = maxH / ar.h;
  const fw = Math.round(ar.w * scale);

  return (
    <div className="space-y-4 pb-20" data-testid="carousel-generator-page">
      {/* Header */}
      <div className="animate-fade-up">
        <h1 className="font-heading text-3xl sm:text-4xl font-bold text-brand tracking-tight">Carousel</h1>
        <p className="text-stone-400 mt-1 text-sm">Pilih produk, pilih tujuan konten, AI generate seluruh slide.</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4 animate-fade-up">

          {/* ① BRAND DNA */}
          <div className="feedify-card p-4 flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-brand text-white text-xs font-bold flex items-center justify-center flex-shrink-0">1</div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider">Brand DNA</p>
              <p className="text-sm text-stone-700 font-medium truncate">Otomatis dibaca dari profil brand kamu</p>
            </div>
            <CheckCircle size={18} weight="fill" className="text-brand flex-shrink-0" />
          </div>

          {/* ② PRODUCT KNOWLEDGE */}
          <div className={`feedify-card p-5 space-y-3 ${!selectedProductId ? "border-2 border-red-200" : ""}`}>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-brand text-white text-xs font-bold flex items-center justify-center flex-shrink-0">2</div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-heading text-base font-bold text-brand">Product Knowledge</h3>
                  <span className="text-[9px] font-bold text-red-500 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded-full">★ Wajib</span>
                </div>
                <p className="text-xs text-stone-500">Pilih produk dari library</p>
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
                  onClick={() => setProductDropdownOpen(v => !v)}
                  className="w-full flex items-center gap-3 p-3 rounded-xl border border-stone-200 hover:border-brand/50 transition-all text-left bg-white"
                  data-testid="product-selector-btn"
                >
                  {selectedProduct ? (
                    <>
                      {selectedProduct.photo_base64
                        ? <img src={selectedProduct.photo_base64} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
                        : <div className="w-10 h-10 rounded-lg bg-brand/10 flex items-center justify-center flex-shrink-0"><Package size={18} weight="duotone" className="text-brand" /></div>
                      }
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-stone-800 truncate">{selectedProduct.name}</p>
                        {selectedProduct.category && <p className="text-xs text-stone-500">{selectedProduct.category}</p>}
                      </div>
                      <button onClick={e => { e.stopPropagation(); setSelectedProductId(null); }}
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
                {productDropdownOpen && (
                  <div className="absolute left-0 right-0 top-full mt-1 z-20 bg-white rounded-xl border border-stone-200 shadow-lg max-h-56 overflow-y-auto">
                    {products.map(p => (
                      <button key={p.id} onClick={() => { setSelectedProductId(p.id); setProductDropdownOpen(false); }}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 hover:bg-brand/5 transition-all text-left ${p.id === selectedProductId ? "bg-brand/8" : ""}`}
                        data-testid={`product-option-${p.id}`}>
                        {p.photo_base64
                          ? <img src={p.photo_base64} alt="" className="w-9 h-9 rounded-lg object-cover flex-shrink-0" />
                          : <div className="w-9 h-9 rounded-lg bg-brand/10 flex items-center justify-center flex-shrink-0"><Package size={15} weight="duotone" className="text-brand" /></div>
                        }
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-stone-800 truncate">{p.name}</p>
                          {p.category && <p className="text-xs text-stone-400">{p.category}</p>}
                        </div>
                        {p.id === selectedProductId && <CheckCircle size={14} weight="fill" className="text-brand flex-shrink-0" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ③ FOTO INSPIRASI */}
          {(() => {
            const hasRef = !!referenceImg || referenceSlides.length > 0;
            return (
              <div className={`feedify-card p-5 space-y-3 ${!hasRef ? "border-2 border-red-200" : ""}`}>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-brand text-white text-xs font-bold flex items-center justify-center flex-shrink-0">3</div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-heading text-base font-bold text-brand">Foto Inspirasi</h3>
                      <span className="text-[9px] font-bold text-red-500 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">★ Wajib</span>
                    </div>
                    <p className="text-xs text-stone-500">
                      {referenceSlides.length > 0
                        ? `${referenceSlides.length} slide referensi dipilih — AI akan tiru komposisi & mood tiap slide`
                        : "ChatGPT akan tiru komposisi & mood — warna dan produk kamu tidak diubah"}
                    </p>
                  </div>
                </div>

                {/* Multi-slide gallery references */}
                {referenceSlides.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex gap-2 flex-wrap">
                      {referenceSlides.map((photo, i) => (
                        <div key={photo.id} className="relative flex-shrink-0">
                          <img src={photo.url} alt={photo.description} className="h-20 w-20 rounded-xl object-cover border-2 border-brand/30" />
                          <div className="absolute top-1 left-1 h-4 w-4 rounded-full bg-brand text-white text-[8px] font-bold flex items-center justify-center shadow">{i + 1}</div>
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="flex items-center gap-1.5 text-xs text-green-700 bg-green-50 rounded-full px-3 py-1.5">
                        <CheckCircle size={12} weight="fill" /> {referenceSlides.length}/{slideCount} slide referensi
                      </div>
                      <button onClick={() => setReferenceSlides([])}
                        className="text-xs text-red-400 hover:text-red-600 px-2 py-1 rounded-full hover:bg-red-50 transition-colors">
                        <X size={11} weight="bold" className="inline mr-0.5" />Hapus
                      </button>
                    </div>
                    <p className="text-[11px] text-stone-400 px-1">💡 Upload semua slide ini ke ChatGPT bersama foto produk kamu</p>
                  </div>
                )}

                {/* Single manual upload reference */}
                {!referenceSlides.length && referenceImg && (
                  <div className="space-y-2">
                    <div className="relative rounded-xl overflow-hidden border-2 border-brand/20">
                      <img src={referenceImg} alt="referensi" className="w-full max-h-48 object-contain" />
                      <button onClick={() => setReferenceImg(null)}
                        className="absolute top-2 right-2 bg-white/90 rounded-full p-1.5 shadow hover:bg-red-50 transition-colors">
                        <X size={13} weight="bold" className="text-stone-500" />
                      </button>
                      <a href={referenceImg} download="foto-inspirasi.jpg"
                        className="absolute top-2 left-2 bg-white/90 rounded-full p-1.5 shadow hover:bg-brand/10 transition-colors"
                        title="Download untuk upload ke ChatGPT">
                        <DownloadSimple size={13} weight="bold" className="text-stone-600" />
                      </a>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-green-700 bg-green-50 rounded-full px-3 py-1.5 w-fit">
                      <CheckCircle size={12} weight="fill" /> Foto inspirasi terpilih
                    </div>
                    <p className="text-[11px] text-stone-400 px-1">💡 Upload juga foto ini ke ChatGPT — tombol download di pojok kiri foto</p>
                  </div>
                )}

                {/* Upload zone (shown when no ref at all) */}
                {!referenceSlides.length && !referenceImg && (
                  <label htmlFor="carousel-ref-input"
                    className="block cursor-pointer border-2 border-dashed border-brand-gold/60 bg-brand-gold/5 rounded-xl p-5 text-center hover:border-brand-gold hover:bg-brand-gold/8 transition-colors">
                    <Images size={26} className="mx-auto text-brand-gold mb-2" weight="duotone" />
                    <div className="font-semibold text-brand text-sm">Upload foto inspirasi</div>
                    <div className="text-xs text-stone-400 mt-1">AI analisa komposisi, mood, dan pencahayaan</div>
                  </label>
                )}
                <input id="carousel-ref-input" type="file" accept="image/png,image/jpeg,image/webp"
                  className="hidden" onChange={e => { handleRefFile(e.target.files?.[0]); setReferenceSlides([]); }} />

                <div className="relative flex items-center gap-3">
                  <div className="flex-1 border-t border-stone-200" />
                  <span className="text-xs text-stone-400 font-medium flex-shrink-0">
                    {referenceSlides.length > 0 ? "atau ganti dari gallery" : "atau dari gallery"}
                  </span>
                  <div className="flex-1 border-t border-stone-200" />
                </div>
                <button type="button" onClick={() => setGalleryOpen(true)}
                  className={`w-full flex items-center justify-center gap-2 py-2.5 border-2 border-dashed rounded-xl text-sm font-semibold transition-all ${
                    referenceSlides.length > 0
                      ? "border-brand bg-brand-sand/40 text-brand"
                      : hasRef
                        ? "border-brand-sand text-brand-light hover:border-brand hover:text-brand hover:bg-brand-sand/40"
                        : "border-red-200 text-red-400 hover:border-brand hover:text-brand hover:bg-brand-sand/40"
                  }`}>
                  <Images size={16} weight="duotone" />
                  {referenceSlides.length > 0
                    ? `Ganti Referensi (${referenceSlides.length}/${slideCount} slide)`
                    : `Pilih ${slideCount} Referensi Slide dari Gallery`}
                </button>
              </div>
            );
          })()}

          {/* ④ TUJUAN KONTEN */}
          <div className="feedify-card p-5 space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-brand text-white text-xs font-bold flex items-center justify-center flex-shrink-0">4</div>
              <div>
                <h3 className="font-heading text-base font-bold text-brand">Tujuan Konten</h3>
                <p className="text-xs text-stone-500">Carousel ini dibuat untuk apa?</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {INTENTS.map(item => (
                <button key={item.id} type="button" onClick={() => { setIntent(item.id); if (storyFlow === "auto") {} }}
                  className={`flex flex-col items-center gap-1.5 p-3.5 rounded-xl border-2 transition-colors text-center ${
                    intent === item.id ? "border-brand bg-brand-sand" : "border-stone-100 bg-white hover:border-brand/30"
                  }`} data-testid={`intent-${item.id}`}>
                  <span className="text-xl">{item.emoji}</span>
                  <span className={`text-xs font-bold ${intent === item.id ? "text-brand" : "text-stone-700"}`}>{item.label}</span>
                  <span className="text-[9px] text-stone-400 leading-tight">{item.desc}</span>
                </button>
              ))}
            </div>

            {/* Optional topic */}
            <div>
              <label className="text-[10px] uppercase tracking-widest font-bold text-stone-400 block mb-1.5">
                Spesifikasi tambahan <span className="normal-case font-normal">(opsional)</span>
              </label>
              <textarea
                value={topic}
                onChange={e => setTopic(e.target.value)}
                rows={2}
                placeholder={`Contoh: bahas 5 mitos skincare yang sering dipercaya target wanita 20–30 tahun`}
                className="w-full px-3 py-2.5 rounded-xl border border-stone-200 text-sm resize-none focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand/20"
                data-testid="carousel-topic"
              />
            </div>
          </div>

          {/* ⑤ STORY FLOW */}
          <div className="feedify-card p-4 space-y-3">
            <h3 className="font-heading text-sm font-bold text-brand">Story Flow</h3>
            <div className="flex flex-wrap gap-1.5">
              {STORY_FLOWS.map(sf => (
                <button key={sf.id} type="button" onClick={() => setStoryFlow(sf.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                    storyFlow === sf.id
                      ? "bg-brand text-white border-brand"
                      : "bg-white text-stone-600 border-stone-200 hover:border-brand/40 hover:text-brand"
                  }`} data-testid={`flow-${sf.id}`}>
                  <span>{sf.emoji}</span> {sf.label}
                </button>
              ))}
            </div>
          </div>

          {/* ⑥ FORMAT & SLIDE */}
          <div className="feedify-card p-4 space-y-4">
            <h3 className="font-heading text-sm font-bold text-brand">Format & Jumlah Slide</h3>

            {/* Aspect ratio */}
            <div className="grid grid-cols-3 gap-2">
              {ASPECT_RATIOS.map(r => {
                const active = aspectRatio === r.value;
                const max = 34;
                const dw = r.w >= r.h ? max : Math.round((r.w / r.h) * max);
                const dh = r.w >= r.h ? Math.round((r.h / r.w) * max) : max;
                return (
                  <button key={r.key} type="button" onClick={() => setAspectRatio(r.value)}
                    className={`relative flex flex-col items-center gap-2 py-4 px-2 rounded-xl border-2 transition-colors ${
                      active ? "border-brand bg-brand-sand" : "border-stone-100 bg-white hover:border-brand/30"
                    }`} data-testid={`ratio-${r.key}`}>
                    {r.recommended && (
                      <span className="absolute -top-2 left-1/2 -translate-x-1/2 text-[7px] bg-brand-gold text-brand font-bold px-1.5 py-0.5 rounded-full whitespace-nowrap">Rekomen</span>
                    )}
                    <div className={`rounded border-2 transition-colors ${active ? "border-brand bg-brand/10" : "border-stone-300 bg-stone-50"}`}
                      style={{ width: dw, height: dh }} />
                    <div className="text-center">
                      <div className={`text-[11px] font-bold ${active ? "text-brand" : "text-stone-600"}`}>{r.label}</div>
                      <div className={`text-[9px] mt-0.5 ${active ? "text-brand/60" : "text-stone-400"}`}>{r.sub}</div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Slide count */}
            <div className="space-y-2">
              <p className="text-[10px] uppercase tracking-widest font-bold text-stone-400">Jumlah Slide</p>
              <div className="flex gap-1.5">
                {[3, 4, 5, 6, 7].map(n => (
                  <button key={n} type="button" onClick={() => setSlideCount(n)}
                    className={`relative flex-1 py-2.5 rounded-xl border-2 font-heading font-bold text-sm transition-colors ${
                      slideCount === n ? "border-brand bg-brand text-white" : "border-stone-100 text-stone-600 hover:border-brand/30"
                    }`} data-testid={`slide-count-${n}`}>
                    {n === 3 && slideCount !== 3 && (
                      <span className="absolute -top-2 left-1/2 -translate-x-1/2 text-[7px] bg-brand-gold text-brand font-bold px-1.5 py-0.5 rounded-full whitespace-nowrap">Rekomen</span>
                    )}
                    {n}
                  </button>
                ))}
              </div>
            </div>

            {/* Storyboard preview */}
            <div className="border-t border-stone-100 pt-3">
              <div className="flex items-center gap-2 mb-2.5">
                <p className="text-[10px] uppercase tracking-widest font-bold text-stone-400">Alur slide yang akan dibuat</p>
                {storyFlow === "auto" && (
                  <span className="text-[9px] bg-brand/10 text-brand font-semibold px-2 py-0.5 rounded-full">
                    {STORY_FLOWS.find(f => f.id === activeFlowKey)?.label || activeFlowKey}
                  </span>
                )}
              </div>
              <div className="flex items-end gap-2 overflow-x-auto pb-1">
                {slideRoles.map((name, i) => {
                  const isFirst = i === 0;
                  const isLast  = i === slideRoles.length - 1;
                  return (
                    <div key={i} className="flex items-end gap-2 flex-shrink-0">
                      <div className="flex flex-col items-center gap-1.5">
                        <div className="rounded-[3px] border overflow-hidden relative"
                          style={{
                            width: fw, height: maxH,
                            background: isFirst ? "rgba(11,61,46,0.08)" : isLast ? "rgba(229,193,88,0.15)" : "rgba(11,61,46,0.03)",
                            borderColor: isFirst ? "rgba(11,61,46,0.3)" : isLast ? "rgba(229,193,88,0.5)" : "rgba(11,61,46,0.12)",
                          }}>
                          <div className="absolute inset-0 flex flex-col justify-end p-[3px] gap-[2px]">
                            {isLast
                              ? <div className="rounded-full mx-auto" style={{ width: "65%", height: 4, background: "rgba(229,193,88,0.7)" }} />
                              : <>
                                  <div className="rounded-full bg-brand/25 w-full" style={{ height: 2.5 }} />
                                  <div className="rounded-full bg-brand/15 w-3/4" style={{ height: 1.5 }} />
                                </>
                            }
                          </div>
                          <div className="absolute top-1 left-1 text-[7px] font-bold text-stone-400">{i + 1}</div>
                        </div>
                        <span className="text-[8px] font-semibold text-stone-500 text-center leading-tight" style={{ maxWidth: fw + 8 }}>{name}</span>
                      </div>
                      {!isLast && <div className="text-stone-300 text-xs mb-5 flex-shrink-0">›</div>}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ⑦ MODEL */}
          <div className="feedify-card p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-heading text-sm font-bold text-brand">Model / Talent</h3>
                <p className="text-xs text-stone-500 mt-0.5">Tampilkan orang dalam carousel? (opsional)</p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={modelEnabled}
                onClick={() => setModelEnabled(v => !v)}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors ${modelEnabled ? "bg-brand" : "bg-stone-200"}`}
                data-testid="model-toggle"
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${modelEnabled ? "translate-x-6" : "translate-x-1"}`} />
              </button>
            </div>

            {modelEnabled && (
              <div className="space-y-4 animate-fade-up">
                {/* Gender */}
                <div className="space-y-1.5">
                  <p className="text-[10px] uppercase tracking-widest font-bold text-stone-400">Gender</p>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { id: "wanita", label: "Cewek", emoji: "👩" },
                      { id: "pria",   label: "Cowok", emoji: "👨" },
                    ].map(g => (
                      <button key={g.id} type="button" onClick={() => setModelGender(g.id)}
                        className={`flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 text-sm font-semibold transition-colors ${
                          modelGender === g.id ? "border-brand bg-brand-sand text-brand" : "border-stone-100 text-stone-600 hover:border-brand/30"
                        }`} data-testid={`model-gender-${g.id}`}>
                        <span className="text-base">{g.emoji}</span> {g.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Style / Penampilan */}
                <div className="space-y-1.5">
                  <p className="text-[10px] uppercase tracking-widest font-bold text-stone-400">Penampilan</p>
                  <div className="flex flex-wrap gap-1.5">
                    {MODEL_STYLES.filter(s => modelGender === "pria"
                      ? !["hijab", "hijab-modern"].includes(s.id)
                      : true
                    ).map(s => (
                      <button key={s.id} type="button"
                        onClick={() => setModelStyle(v => v === s.id ? null : s.id)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                          modelStyle === s.id
                            ? "bg-brand text-white border-brand"
                            : "bg-white text-stone-600 border-stone-200 hover:border-brand/40 hover:text-brand"
                        }`} data-testid={`model-style-${s.id}`}>
                        {s.emoji} {s.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Age range */}
                <div className="space-y-1.5">
                  <p className="text-[10px] uppercase tracking-widest font-bold text-stone-400">Kisaran Usia</p>
                  <div className="flex gap-1.5 flex-wrap">
                    {MODEL_AGES.map(a => (
                      <button key={a.id} type="button"
                        onClick={() => setModelAge(v => v === a.id ? null : a.id)}
                        className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                          modelAge === a.id
                            ? "bg-brand text-white border-brand"
                            : "bg-white text-stone-600 border-stone-200 hover:border-brand/40 hover:text-brand"
                        }`} data-testid={`model-age-${a.id}`}>
                        {a.label}
                      </button>
                    ))}
                  </div>
                </div>

                {!modelStyle && !modelAge && (
                  <p className="text-[11px] text-stone-400 bg-stone-50 rounded-lg px-3 py-2">
                    <User size={11} weight="bold" className="inline mr-1" />
                    Tanpa pilihan spesifik, AI otomatis pilih model sesuai Brand DNA kamu.
                  </p>
                )}
              </div>
            )}
          </div>

          {/* ⑧ CTA */}
          <div className="feedify-card p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-heading text-sm font-bold text-brand">Tombol CTA</h3>
                <p className="text-xs text-stone-500 mt-0.5">Tambahkan ajakan bertindak? (opsional)</p>
              </div>
              <button type="button" role="switch" aria-checked={ctaEnabled}
                onClick={() => { setCtaEnabled(v => !v); if (ctaEnabled) setCtaText(""); }}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors ${ctaEnabled ? "bg-brand" : "bg-stone-200"}`}
                data-testid="cta-toggle">
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${ctaEnabled ? "translate-x-6" : "translate-x-1"}`} />
              </button>
            </div>
            {ctaEnabled && (
              <div className="space-y-3 animate-fade-up">
                <div className="flex flex-wrap gap-1.5">
                  {CTA_SUGGESTIONS.map(s => (
                    <button key={s} type="button" onClick={() => setCtaText(s)}
                      className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                        ctaText === s ? "bg-brand text-white border-brand" : "bg-white text-stone-600 border-stone-200 hover:border-brand/50 hover:text-brand"
                      }`}>
                      {s}
                    </button>
                  ))}
                </div>
                <input type="text" value={ctaText} onChange={e => setCtaText(e.target.value)}
                  placeholder="Atau ketik CTA sendiri..."
                  className="w-full px-3 py-2 rounded-xl border border-stone-200 text-sm focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand/20"
                  maxLength={40} data-testid="cta-input" />
              </div>
            )}
          </div>

          {/* ChatGPT akan otomatis card */}
          <div className="rounded-2xl border border-green-100 p-4 bg-gradient-to-br from-green-50/60 to-white">
            <div className="flex items-center gap-2 mb-3">
              <Sparkle size={13} weight="fill" className="text-brand-gold" />
              <p className="text-sm font-semibold text-brand">Dengan prompt ini, ChatGPT akan otomatis</p>
            </div>
            <div className="space-y-2">
              {[
                "Membaca foto inspirasi untuk meniru komposisi, layout, dan suasana tiap slide",
                "Menyesuaikan identitas brand kamu — warna dan elemen visual tetap milik kamu",
                "Mengatur alur cerita sesuai story flow yang kamu pilih, slide per slide",
                "Menampilkan foto produk persis seperti yang kamu upload, tanpa diubah",
                "Menghasilkan teks headline dan subheadline yang relevan per slide",
              ].map(item => (
                <div key={item} className="flex items-start gap-2">
                  <CheckCircle size={13} weight="fill" className="text-green-500 flex-shrink-0 mt-0.5" />
                  <span className="text-xs text-stone-600">{item}</span>
                </div>
              ))}
            </div>
            <p className="text-[10px] text-stone-400 mt-3 border-t border-stone-100 pt-2">
              💡 Setelah klik GENERATE — salin prompt tiap slide, buka ChatGPT, upload foto, dan paste.
            </p>

            {/* Generate — nempel dengan card ini (semua viewport) */}
            <button onClick={generate} disabled={generating || (!referenceImg && referenceSlides.length === 0)}
              className="mt-3 w-full h-12 bg-brand hover:bg-brand/90 text-brand-cream rounded-full font-heading font-bold text-sm btn-lift inline-flex items-center justify-center gap-2 disabled:opacity-60 shadow-md transition-colors tracking-wide"
              data-testid="generate-carousel-btn">
              {generating
                ? <><CircleNotch size={15} className="animate-spin" /> Menyusun...</>
                : <><Sparkle size={15} weight="fill" /> GENERATE</>}
            </button>
          </div>

          {/* Prompt result */}
          {promptResult && (
            <div ref={promptCardRef}>
              <PromptSuccessCard
                promptData={promptResult}
                hasReferenceImage={!!referenceImg || referenceSlides.length > 0}
                referenceImg={referenceImg || referenceSlides[0]?.url || null}
                productPhoto={selectedProduct?.photo_base64 || null}
                onReset={() => setPromptResult(null)}
                dashboardType="carousel"
                title={promptResult?.prompt_json?.carousel_meta?.topic || selectedProduct?.name || "Carousel"}
              />
              <div className="mt-3">
                <DebugJsonButton data={promptResult?.prompt_json} title="carousel-prompt.json" />
              </div>
            </div>
          )}

        </div>

        {/* Sidebar */}
        <div className="lg:sticky lg:top-6 lg:self-start space-y-4">
          <BrandDnaCard />

          {selectedProduct && (
            <div className="feedify-card p-4 space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-stone-500">Produk Dipilih</p>
              <div className="flex items-center gap-3">
                {selectedProduct.photo_base64
                  ? <img src={selectedProduct.photo_base64} alt="" className="w-14 h-14 rounded-xl object-cover" />
                  : <div className="w-14 h-14 rounded-xl bg-brand/10 flex items-center justify-center"><Package size={22} weight="duotone" className="text-brand" /></div>
                }
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm text-stone-800 truncate">{selectedProduct.name}</p>
                  {selectedProduct.category && <p className="text-xs text-stone-500">{selectedProduct.category}</p>}
                </div>
              </div>
              {selectedProduct.benefits?.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {selectedProduct.benefits.slice(0, 4).map(b => (
                    <span key={b} className="text-[10px] px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-full font-medium">{b}</span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Mini creative brief */}
          <div className="feedify-card p-4 space-y-2">
            <p className="text-[10px] uppercase tracking-widest font-bold text-stone-400">Creative Brief</p>
            {[
              ["Tujuan", activeIntent.label],
              ["Flow", STORY_FLOWS.find(f => f.id === storyFlow)?.label || "Auto"],
              ["Slide", `${slideCount} slide`],
              ["Format", ar.label],
              ctaEnabled && ctaText ? ["CTA", ctaText] : null,
              modelEnabled ? ["Model", `${modelGender === "wanita" ? "Cewek" : "Cowok"}${modelAge ? ` · ${modelAge} th` : ""}${modelStyle ? ` · ${MODEL_STYLES.find(s=>s.id===modelStyle)?.label||""}` : ""}`] : null,
            ].filter(Boolean).map(([label, value]) => (
              <div key={label} className="flex items-center justify-between text-xs gap-2">
                <span className="text-stone-400 flex-shrink-0">{label}</span>
                <span className="font-semibold text-stone-700 text-right truncate max-w-[65%]">{value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <InspirationGallery
        open={galleryOpen}
        onClose={() => setGalleryOpen(false)}
        context="carousel"
        requiredCount={slideCount}
        onSelect={(photos) => {
          // photos is an array of N selected slides (multi-select)
          setReferenceSlides(photos);
          setReferenceImg(null);
          setGalleryOpen(false);
        }}
      />
    </div>
  );
}
