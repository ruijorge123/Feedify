import React, { useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Camera, CloudArrowUp, Check, ArrowLeft, ArrowRight,
  X, CaretDown, Download, ArrowsClockwise,
  BookmarkSimple, ImageSquare, Stack, Storefront, FilmSlate, Warning,
  Eye, CircleNotch, Copy, Sparkle,
} from "@phosphor-icons/react";
import api from "@/lib/api";
import { notifyCreditsUpdate } from "@/lib/credits";
import { useAuth } from "@/context/AuthContext";
import NoCreditsModal from "@/components/NoCreditsModal";

// ── Constants ────────────────────────────────────────────────────────────────

const STEPS = [
  { id: "upload",      label: "Upload" },
  { id: "category",   label: "Kategori" },
  { id: "goal",       label: "Tujuan" },
  { id: "style",      label: "Style" },
  { id: "composition",label: "Komposisi" },
  { id: "model",      label: "Model" },
  { id: "output",     label: "Output" },
];

const PRODUCT_CATEGORIES = [
  { key: "fashion",    label: "Fashion",         desc: "Baju, dress, jaket, celana, pakaian",          icon: "👗", isFashion: true },
  { key: "skincare",   label: "Skincare",         desc: "Krim, serum, toner, moisturizer",               icon: "✨" },
  { key: "parfum",     label: "Parfum",           desc: "Parfum, cologne, wewangian",                    icon: "🌹" },
  { key: "tas",        label: "Tas & Dompet",     desc: "Handbag, tote bag, dompet, aksesori tas",       icon: "👜" },
  { key: "sepatu",     label: "Sepatu",           desc: "Sneakers, flat shoes, heels, sandal",           icon: "👟" },
  { key: "aksesori",   label: "Aksesori",         desc: "Perhiasan, jam tangan, kacamata",               icon: "💍" },
  { key: "fnb",        label: "Food & Beverage",  desc: "Makanan, minuman, kuliner, kopi",               icon: "🍜" },
  { key: "elektronik", label: "Elektronik",       desc: "Gadget, earphone, smartwatch, perangkat",       icon: "📱" },
  { key: "general",    label: "Umum",             desc: "Produk lainnya tanpa spesialisasi khusus",      icon: "📦" },
];

const BUSINESS_GOALS = [
  { key: "marketplace",    label: "Marketplace",    desc: "Shopee · Tokopedia · Lazada",    icon: "🛒" },
  { key: "social_media",   label: "Social Media",   desc: "Instagram · TikTok feed",        icon: "📱" },
  { key: "brand_campaign", label: "Brand Campaign", desc: "Premium brand awareness",        icon: "✦", recommended: true },
  { key: "product_launch", label: "Product Launch", desc: "Campaign peluncuran produk",     icon: "🚀" },
  { key: "website_banner", label: "Website Banner", desc: "Hero & landing page",            icon: "🖥" },
  { key: "advertisement",  label: "Advertisement",  desc: "Print & digital ads",            icon: "📢" },
  { key: "packaging",      label: "Packaging",      desc: "Showcase kemasan produk",        icon: "📦" },
];

const PHOTOGRAPHY_STYLES = [
  { key: "commercial", label: "Commercial", desc: "Foto iklan profesional, pencahayaan studio terkontrol. Cocok untuk sebagian besar produk.", recommended: true },
  { key: "lifestyle",  label: "Lifestyle",  desc: "Suasana natural, interaksi nyata, cahaya ambient. Terasa autentik dan relatable." },
  { key: "luxury",     label: "Luxury",     desc: "Dramatis, bayangan dalam, premium. Setara kampanye Dior, Chanel, Rolex." },
  { key: "editorial",  label: "Editorial",  desc: "Kreatif, berbasis narasi, kuat secara visual. Kualitas majalah Vogue dan Elle." },
  { key: "minimal",    label: "Minimal",    desc: "Studio bersih, ruang kosong maksimal, produk sebagai satu-satunya hero. Presisi ala Apple." },
];

// General compositions (non-fashion products)
const COMPOSITIONS = [
  { key: "hero_product",    label: "Hero Product",    desc: "Produk sebagai pusat visual utama, dampak maksimal." },
  { key: "flat_lay",        label: "Flat Lay",        desc: "Tampilan dari atas, produk tersusun di permukaan." },
  { key: "floating",        label: "Floating",        desc: "Produk tampak melayang, kesan premium dan modern." },
  { key: "macro_detail",    label: "Macro Detail",    desc: "Close-up ekstrem pada tekstur, label, dan detail produk." },
  { key: "closeup",         label: "Close-up",        desc: "Pengambilan rapat, produk mengisi sebagian besar frame." },
  { key: "holding_product", label: "Holding Product", desc: "Model memegang produk secara natural dan realistis." },
  { key: "splash",          label: "Splash Shot",     desc: "Dinamis dengan percikan cairan atau partikel bergerak." },
  { key: "symmetrical",     label: "Symmetrical",     desc: "Komposisi cermin yang seimbang dan terkesan premium." },
  { key: "rule_of_thirds",  label: "Rule of Thirds",  desc: "Pembingkaian klasik komersial dengan alur mata natural." },
  { key: "eye_level",       label: "Eye Level",       desc: "Sudut pandang natural, terasa autentik dan relatable." },
  { key: "top_down",        label: "Top Down",        desc: "Tampilan dari atas, seluruh tata letak terlihat." },
  { key: "45_degree",       label: "45°",             desc: "Sudut klasik yang menampilkan kedalaman dan dimensi." },
  { key: "low_angle",       label: "Low Angle",       desc: "Sudut rendah, produk tampak megah dan berkesan kuat." },
  { key: "high_angle",      label: "High Angle",      desc: "Sudut tinggi, kesan editorial yang elegan." },
];

// Fashion-specific compositions
const FASHION_COMPOSITIONS = [
  { key: "full_body",      label: "Full Body",      desc: "Tampilan penuh kepala hingga kaki. Standar katalog fashion.", recommended: true },
  { key: "three_quarter",  label: "Three Quarter",  desc: "Kepala hingga bawah lutut. Komposisi katalog klasik." },
  { key: "lookbook",       label: "Lookbook",       desc: "Model dalam setting lifestyle. Editorial dan aspirasional." },
  { key: "detail_texture", label: "Detail Tekstur", desc: "Macro pada kain, jahitan, kancing, dan material." },
  { key: "flat_lay",       label: "Flat Lay",       desc: "Pakaian terbentang rapi dari atas, distilai dengan aksesori." },
  { key: "sitting",        label: "Sitting",        desc: "Model duduk natural, menampilkan drape pakaian saat duduk." },
  { key: "walking",        label: "Walking",        desc: "Model berjalan, menampilkan gerakan dan flow pakaian." },
  { key: "eye_level",      label: "Eye Level",      desc: "Sudut pandang natural setara mata. Relatable dan autentik." },
  { key: "low_angle",      label: "Low Angle",      desc: "Sudut rendah, model tampak tinggi dan berkesan kuat." },
  { key: "high_angle",     label: "High Angle",     desc: "Sudut tinggi, kesan editorial yang elegan." },
];

const MODEL_OPTIONS = [
  { key: "no_model",     label: "No Model",      desc: "Fokus murni pada produk, tanpa model manusia." },
  { key: "female",       label: "Female",         desc: "Model wanita Indonesia/Asia, tampilan komersial." },
  { key: "hijab_female", label: "Hijab Female",   desc: "Model wanita berhijab, tampilan modest fashion komersial." },
  { key: "male",         label: "Male",           desc: "Model pria Indonesia/Asia, tampilan komersial." },
  { key: "couple",       label: "Couple",         desc: "Pasangan Indonesia/Asia, gaya hidup aspirasional." },
  { key: "family",       label: "Family",         desc: "Suasana keluarga yang hangat dan autentik." },
];

// Standard campaign shots (non-fashion)
const CAMPAIGN_SHOTS_LABELS = [
  "Hero Shot", "Lifestyle", "Holding Product", "Studio Shot",
  "Close Up", "Marketplace Thumbnail", "Instagram Feed", "Advertising Banner",
];

// Fashion campaign shots
const FASHION_CAMPAIGN_SHOTS_LABELS = [
  "Full Body Front", "Full Body Back", "Three Quarter", "Detail Tekstur",
  "Lifestyle Outfit", "Flat Lay", "Close-up & Aksesori", "Editorial Campaign",
];

const OUTPUT_COUNTS = [1, 2, 4, 8, 16];

const LOADING_STEPS = [
  "Analysing Product",
  "Removing Background",
  "Building Photography Brief",
  "Setting Composition",
  "Rendering Lighting",
  "Final Color Grading",
  "Almost Done...",
];
const LOADING_DURATIONS = [1400, 1800, 1600, 2200, 3000, 2400, 800];

const ADV_BACKGROUNDS = [
  { key: "auto",            label: "Auto" },
  { key: "white_studio",    label: "White Studio" },
  { key: "gradient",        label: "Gradient" },
  { key: "luxury_marble",   label: "Marble" },
  { key: "wood",            label: "Wood" },
  { key: "concrete",        label: "Concrete" },
  { key: "kitchen",         label: "Kitchen" },
  { key: "bathroom",        label: "Bathroom" },
  { key: "cafe",            label: "Cafe" },
  { key: "modern_interior", label: "Modern Interior" },
  { key: "luxury_interior", label: "Luxury Interior" },
  { key: "nature",          label: "Nature" },
  { key: "minimal_studio",  label: "Minimal Studio" },
  { key: "transparent",     label: "Transparent" },
];

const ADV_LIGHTINGS = [
  { key: "auto",           label: "Auto" },
  { key: "soft_studio",    label: "Soft Studio" },
  { key: "luxury_rim",     label: "Luxury Rim" },
  { key: "natural_window", label: "Natural Window" },
  { key: "golden_hour",    label: "Golden Hour" },
  { key: "high_key",       label: "High Key" },
  { key: "low_key",        label: "Low Key" },
  { key: "moody",          label: "Moody" },
  { key: "hard_light",     label: "Hard Light" },
  { key: "back_light",     label: "Back Light" },
  { key: "cinematic",      label: "Cinematic" },
];

const ADV_TONES = [
  { key: "auto",    label: "Auto" },
  { key: "warm",    label: "Warm" },
  { key: "neutral", label: "Neutral" },
  { key: "cool",    label: "Cool" },
];

const ADV_DEPTHS = [
  { key: "auto",    label: "Auto" },
  { key: "shallow", label: "Shallow (Bokeh)" },
  { key: "medium",  label: "Medium" },
  { key: "deep",    label: "Deep (Sharp)" },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

const delay = (ms) => new Promise((r) => setTimeout(r, ms));

function downloadImage(b64, filename = "feedify-studio.png") {
  const bytes = atob(b64);
  const arr = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
  const blob = new Blob([arr], { type: "image/png" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function SectionHeader({ title, helper }) {
  return (
    <div className="mb-5">
      <h2 className="font-heading text-2xl font-bold text-brand">{title}</h2>
      {helper && <p className="text-stone-400 mt-1 text-sm leading-relaxed">{helper}</p>}
    </div>
  );
}

function ChipSelect({ options, value, onChange }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => (
        <button
          key={opt.key}
          onClick={() => onChange(opt.key)}
          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${
            value === opt.key
              ? "bg-brand text-brand-cream border-brand"
              : "bg-white text-stone-600 border-stone-200 hover:border-brand/40 hover:text-brand"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function StepIndicator({ currentStep }) {
  return (
    <div className="flex items-center justify-center gap-1 mb-10 flex-wrap">
      {STEPS.map((step, i) => {
        const done   = i < currentStep;
        const active = i === currentStep;
        return (
          <React.Fragment key={step.id}>
            <div
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium transition-all ${
                active ? "bg-brand text-brand-cream"
                : done  ? "bg-brand/10 text-brand"
                        : "bg-stone-100 text-stone-400"
              }`}
            >
              {done ? <Check size={9} weight="bold" /> : <span>{i + 1}</span>}
              <span className="hidden sm:inline">{step.label}</span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`h-px w-2 ${done ? "bg-brand/30" : "bg-stone-200"}`} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function StudioPage() {
  const navigate  = useNavigate();
  const { user }  = useAuth();
  const isAdmin   = user?.role === "admin";
  const fileInput = useRef(null);

  const [stepIdx,  setStepIdx]  = useState(0);
  const [view,     setView]     = useState("form");

  // Form state
  const [productB64,      setProductB64]      = useState(null);
  const [productPreview,  setProductPreview]  = useState(null);
  const [productCategory, setProductCategory] = useState("general");
  const [businessGoal,    setBusinessGoal]    = useState("brand_campaign");
  const [photoStyle,      setPhotoStyle]      = useState("commercial");
  const [composition,     setComposition]     = useState("hero_product");
  const [modelType,       setModelType]       = useState("no_model");
  const [outputCount,     setOutputCount]     = useState(4);
  const [isCampaignPack,  setIsCampaignPack]  = useState(false);
  const [showAdvanced,    setShowAdvanced]    = useState(false);
  const [advanced, setAdvanced] = useState({
    background: "auto", lighting: "auto", color_tone: "auto", depth: "auto",
  });

  // Loading / result
  const [loadingIdx, setLoadingIdx] = useState(-1);
  const [results,    setResults]    = useState([]);
  const [savedSet,   setSavedSet]   = useState(new Set());
  const [error,      setError]      = useState(null);
  const [noCredits,  setNoCredits]  = useState(false);

  // Admin preview
  const [previewing,    setPreviewing]    = useState(false);
  const [promptPreview, setPromptPreview] = useState(null);
  const [copied,        setCopied]        = useState(false);

  const isFashion = productCategory === "fashion";
  const activeCompositions = isFashion ? FASHION_COMPOSITIONS : COMPOSITIONS;
  const campaignShotLabels = isFashion ? FASHION_CAMPAIGN_SHOTS_LABELS : CAMPAIGN_SHOTS_LABELS;

  // When category changes, reset composition to the right default
  const handleCategoryChange = (cat) => {
    setProductCategory(cat);
    setComposition(cat === "fashion" ? "full_body" : "hero_product");
  };

  // File upload
  const handleFile = useCallback((file) => {
    if (!file) return;
    if (!["image/png","image/jpeg","image/jpg","image/webp"].includes(file.type)) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target.result;
      setProductPreview(dataUrl);
      setProductB64(dataUrl.split(",")[1]);
    };
    reader.readAsDataURL(file);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    handleFile(e.dataTransfer?.files?.[0]);
  }, [handleFile]);

  // Build payload
  const buildPayload = useCallback(() => ({
    product_image_base64: productB64,
    product_category:     productCategory,
    business_goal:        businessGoal,
    photography_style:    photoStyle,
    composition,
    model_type:           modelType,
    wearing_product:      isFashion && modelType !== "no_model",
    output_count:         isCampaignPack ? 8 : outputCount,
    is_campaign_pack:     isCampaignPack,
    ...advanced,
  }), [productB64, productCategory, businessGoal, photoStyle, composition,
       modelType, isFashion, outputCount, isCampaignPack, advanced]);

  // Generation
  const runGeneration = async (overridePayload = null) => {
    setError(null);
    setView("loading");
    setLoadingIdx(0);

    const payload  = overridePayload ?? buildPayload();
    const endpoint = isCampaignPack && !overridePayload
      ? "/studio/campaign-pack"
      : "/studio/generate";

    const runAnim = async () => {
      for (let i = 0; i < LOADING_STEPS.length; i++) {
        setLoadingIdx(i);
        await delay(LOADING_DURATIONS[i]);
      }
    };

    try {
      const [, res] = await Promise.all([runAnim(), api.post(endpoint, payload)]);
      const data    = res.data;
      notifyCreditsUpdate(data.credits);
      const normalised = Array.isArray(data.images)
        ? data.images.map((item) =>
            typeof item === "string"
              ? { image: item, label: null }
              : { image: item.image, label: item.label }
          )
        : [];
      setResults(normalised);
      setView("result");
    } catch (err) {
      setView("form");
      setStepIdx(STEPS.length - 1);
      if (err?.response?.status === 402) {
        setNoCredits(true);
      } else {
        setError(err.response?.data?.detail || "Gagal generate. Coba lagi.");
      }
    }
  };

  const handleRegenerateSimilar = async (currentResults) => {
    const prev = [...currentResults];
    await runGeneration({ ...buildPayload(), output_count: 1, is_campaign_pack: false });
    setResults((next) => [...prev, ...next]);
  };

  // Admin preview
  const handlePreview = async () => {
    setPreviewing(true);
    setPromptPreview(null);
    try {
      const { data } = await api.post("/studio/preview", buildPayload());
      setPromptPreview(data);
      setTimeout(() => document.getElementById("studio-preview-panel")?.scrollIntoView({ behavior: "smooth" }), 100);
    } catch { /* silent */ }
    finally { setPreviewing(false); }
  };

  const copyPrompt = () => {
    if (!promptPreview?.natural_prompt) return;
    navigator.clipboard.writeText(promptPreview.natural_prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const canContinue  = stepIdx !== 0 || !!productB64;
  const isLastStep   = stepIdx === STEPS.length - 1;
  const creditsNeeded = isCampaignPack ? 8 : outputCount;

  // ── LOADING VIEW ─────────────────────────────────────────────────────────────
  if (view === "loading") {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center py-16 animate-fade-up">
        <div className="mb-12 text-center">
          <div className="h-16 w-16 rounded-2xl bg-brand/10 flex items-center justify-center mx-auto mb-5">
            <Camera size={28} weight="duotone" className="text-brand" />
          </div>
          <h2 className="font-heading text-2xl font-bold text-brand">Feedify Studio</h2>
          <p className="text-stone-400 text-sm mt-1.5">Sedang memproses sesi foto Anda...</p>
        </div>
        <div className="w-full max-w-xs space-y-4">
          {LOADING_STEPS.map((label, i) => {
            const done   = i < loadingIdx;
            const active = i === loadingIdx;
            return (
              <div key={i} className={`flex items-center gap-3 transition-all duration-500 ${done || active ? "opacity-100" : "opacity-25"}`}>
                <div className={`h-5 w-5 rounded-full flex-shrink-0 flex items-center justify-center transition-all ${done ? "bg-brand" : active ? "border-2 border-brand" : "bg-stone-100"}`}>
                  {done   && <Check size={10} weight="bold" className="text-white" />}
                  {active && <div className="h-1.5 w-1.5 rounded-full bg-brand animate-pulse" />}
                </div>
                <span className={`text-sm font-medium ${done ? "text-brand" : active ? "text-stone-700" : "text-stone-300"}`}>
                  {label}{done ? " ✓" : ""}
                </span>
              </div>
            );
          })}
        </div>
        <p className="text-xs text-stone-400 mt-12">Estimasi 20–40 detik per foto</p>
      </div>
    );
  }

  // ── RESULT VIEW ──────────────────────────────────────────────────────────────
  if (view === "result") {
    return (
      <div className="space-y-8 animate-fade-up">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Camera size={16} weight="duotone" className="text-brand" />
              <span className="text-xs uppercase tracking-[0.18em] text-brand/50 font-semibold">Feedify Studio</span>
            </div>
            <h1 className="font-heading text-2xl font-bold text-brand">Hasil Foto</h1>
            <p className="text-stone-400 text-sm mt-0.5">{results.length} foto berhasil dibuat</p>
          </div>
          <button
            onClick={() => { setView("form"); setStepIdx(0); setResults([]); setSavedSet(new Set()); }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-full border border-stone-200 text-sm text-stone-600 hover:border-brand hover:text-brand transition-all"
          >
            <Camera size={14} />
            Sesi Baru
          </button>
        </div>

        <div className="columns-1 sm:columns-2 lg:columns-3 gap-4">
          {results.map((item, idx) => {
            const isSaved = savedSet.has(idx);
            return (
              <div key={idx} className="break-inside-avoid mb-4 bg-white rounded-2xl overflow-hidden border border-stone-100 shadow-sm">
                <div className="relative">
                  <img src={`data:image/png;base64,${item.image}`} alt={item.label || `Studio ${idx + 1}`} className="w-full object-cover" />
                  {item.label && (
                    <span className="absolute top-2 left-2 bg-black/50 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-1 rounded-full">
                      {item.label}
                    </span>
                  )}
                </div>
                <div className="p-3 space-y-2">
                  <div className="flex gap-2">
                    <button
                      onClick={() => downloadImage(item.image, `feedify-studio-${idx + 1}.png`)}
                      data-testid={`studio-download-${idx}`}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-brand text-brand-cream text-xs font-semibold hover:bg-brand/90 transition-colors"
                    >
                      <Download size={13} weight="bold" />
                      Download
                    </button>
                    <button
                      onClick={() => handleRegenerateSimilar(results)}
                      data-testid={`studio-regenerate-${idx}`}
                      className="flex items-center justify-center gap-1 px-3 py-2.5 rounded-xl border border-stone-200 text-stone-600 text-xs font-medium hover:border-brand hover:text-brand transition-colors"
                    >
                      <ArrowsClockwise size={13} />
                      Similar
                    </button>
                    <button
                      onClick={() => setSavedSet((s) => { const n = new Set(s); n.has(idx) ? n.delete(idx) : n.add(idx); return n; })}
                      data-testid={`studio-save-${idx}`}
                      title={isSaved ? "Tersimpan" : "Simpan"}
                      className={`flex items-center justify-center px-3 py-2.5 rounded-xl border text-xs font-medium transition-colors ${isSaved ? "border-brand bg-brand/5 text-brand" : "border-stone-200 text-stone-500 hover:border-brand hover:text-brand"}`}
                    >
                      <BookmarkSimple size={13} weight={isSaved ? "fill" : "regular"} />
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <button disabled className="flex-1 py-2 rounded-xl border border-dashed border-stone-150 text-[11px] text-stone-300 cursor-not-allowed">Edit — Coming Soon</button>
                    <button disabled className="flex-1 py-2 rounded-xl border border-dashed border-stone-150 text-[11px] text-stone-300 cursor-not-allowed">Upscale — Coming Soon</button>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {[
                      { label: "Feed Post",   Icon: ImageSquare, to: "/generate/banner" },
                      { label: "Carousel",    Icon: Stack,       to: "/generate/carousel" },
                      { label: "Marketplace", Icon: Storefront,  to: "/generate/marketplace" },
                      { label: "Reels",       Icon: FilmSlate,   to: "/generate/reels" },
                    ].map(({ label, Icon, to }) => (
                      <button key={label} onClick={() => navigate(to)} className="flex items-center gap-1.5 px-2.5 py-2 rounded-xl border border-stone-200 text-stone-500 text-[11px] font-medium hover:border-brand/40 hover:text-brand transition-colors">
                        <Icon size={11} />{label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ── FORM VIEW ─────────────────────────────────────────────────────────────────
  return (
    <>
    <div className="max-w-2xl mx-auto animate-fade-up">
      {/* Header */}
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-2">
          <div className="h-10 w-10 rounded-xl bg-brand/10 flex items-center justify-center">
            <Camera size={20} weight="duotone" className="text-brand" />
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-brand/40 font-semibold">Feedify</div>
            <h1 className="font-heading text-xl font-bold text-brand leading-none">Studio</h1>
          </div>
        </div>
        <p className="text-stone-400 text-sm">Commercial product photography berkualitas studio profesional.</p>
      </div>

      <StepIndicator currentStep={stepIdx} />

      <div className="min-h-72">

        {/* ── STEP 0: Upload ── */}
        {stepIdx === 0 && (
          <div className="space-y-5">
            <SectionHeader
              title="Upload Produk"
              helper="Upload foto produk dengan kualitas terbaik. AI akan mempertahankan bentuk, warna, label, dan semua detail produk secara akurat."
            />
            <div
              onDrop={(e) => { e.preventDefault(); handleFile(e.dataTransfer?.files?.[0]); }}
              onDragOver={(e) => e.preventDefault()}
              onClick={() => fileInput.current?.click()}
              className={`relative border-2 border-dashed rounded-2xl cursor-pointer transition-all group ${productPreview ? "border-brand/40 bg-brand/5" : "border-stone-200 hover:border-brand/40 hover:bg-stone-50/60"}`}
              style={{ minHeight: 260 }}
              data-testid="studio-upload-zone"
            >
              {productPreview ? (
                <div className="flex flex-col items-center justify-center py-8 px-6">
                  <img src={productPreview} alt="product" className="max-h-48 object-contain rounded-xl" />
                  <button
                    onClick={(e) => { e.stopPropagation(); setProductPreview(null); setProductB64(null); }}
                    className="absolute top-3 right-3 h-7 w-7 rounded-full bg-white shadow-md flex items-center justify-center text-stone-400 hover:text-red-500 transition-colors"
                  >
                    <X size={13} weight="bold" />
                  </button>
                  <p className="mt-4 text-xs text-brand font-semibold">Foto siap digunakan ✓</p>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
                  <div className="h-16 w-16 rounded-2xl bg-stone-100 group-hover:bg-brand/10 transition-colors flex items-center justify-center mb-4">
                    <CloudArrowUp size={26} className="text-stone-400 group-hover:text-brand transition-colors" />
                  </div>
                  <p className="font-semibold text-stone-700 text-sm mb-1">Drag & drop atau klik untuk upload</p>
                  <p className="text-xs text-stone-400">PNG · JPG · JPEG · WEBP</p>
                </div>
              )}
              <input ref={fileInput} type="file" accept="image/png,image/jpeg,image/jpg,image/webp" className="hidden" onChange={(e) => handleFile(e.target.files?.[0])} data-testid="studio-file-input" />
            </div>
            <div className="flex items-start gap-2.5 bg-brand/5 border border-brand/15 rounded-xl px-4 py-3">
              <Warning size={14} className="text-brand/70 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-stone-500 leading-relaxed">
                <span className="font-semibold text-brand">Tips:</span>{" "}
                PNG dengan background transparan menghasilkan foto terbaik. Background yang ada akan dihapus otomatis sebelum generate.
              </p>
            </div>
          </div>
        )}

        {/* ── STEP 1: Product Category ── */}
        {stepIdx === 1 && (
          <div className="space-y-5">
            <SectionHeader
              title="Kategori Produk"
              helper="Pilih kategori yang paling sesuai. AI menggunakan pendekatan fotografi yang berbeda untuk setiap jenis produk agar hasil lebih akurat dan profesional."
            />
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {PRODUCT_CATEGORIES.map((cat) => (
                <button
                  key={cat.key}
                  onClick={() => handleCategoryChange(cat.key)}
                  data-testid={`studio-category-${cat.key}`}
                  className={`relative p-4 rounded-2xl border text-left transition-all ${
                    productCategory === cat.key
                      ? "border-brand bg-brand/5 shadow-sm"
                      : "border-stone-200 bg-white hover:border-brand/30 hover:bg-stone-50/60"
                  }`}
                >
                  <div className="text-xl mb-2 leading-none">{cat.icon}</div>
                  <div className={`font-semibold text-sm mb-0.5 ${productCategory === cat.key ? "text-brand" : "text-stone-700"}`}>
                    {cat.label}
                  </div>
                  <div className="text-[11px] text-stone-400 leading-snug">{cat.desc}</div>
                  {cat.isFashion && (
                    <span className="absolute top-2 right-2 flex items-center gap-0.5 text-[8px] font-bold px-1.5 py-0.5 rounded-full bg-violet-100 text-violet-600 border border-violet-200">
                      <Sparkle size={7} weight="fill" />
                      Wear Mode
                    </span>
                  )}
                </button>
              ))}
            </div>
            {isFashion && (
              <div className="flex items-start gap-2.5 bg-violet-50 border border-violet-200 rounded-xl px-4 py-3">
                <Sparkle size={14} className="text-violet-500 mt-0.5 flex-shrink-0" weight="fill" />
                <p className="text-xs text-violet-700 leading-relaxed">
                  <span className="font-semibold">Fashion Mode aktif.</span>{" "}
                  Jika kamu memilih model, AI akan menampilkan model yang <em>mengenakan</em> pakaian yang di-upload — bukan hanya memegang produk.
                </p>
              </div>
            )}
          </div>
        )}

        {/* ── STEP 2: Business Purpose ── */}
        {stepIdx === 2 && (
          <div className="space-y-5">
            <SectionHeader
              title="Business Purpose"
              helper="Tentukan tujuan utama gambar. AI menyesuaikan komposisi, cropping, dan visual hierarchy berdasarkan media tujuan secara otomatis."
            />
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {BUSINESS_GOALS.map((g) => (
                <button
                  key={g.key}
                  onClick={() => setBusinessGoal(g.key)}
                  data-testid={`studio-goal-${g.key}`}
                  className={`relative p-4 rounded-2xl border text-left transition-all ${
                    businessGoal === g.key
                      ? "border-brand bg-brand/5 shadow-sm"
                      : "border-stone-200 bg-white hover:border-brand/30 hover:bg-stone-50/60"
                  }`}
                >
                  {g.recommended && (
                    <span className="absolute top-2 right-2 text-[8px] font-bold px-1.5 py-0.5 rounded-full bg-brand-gold/20 text-brand border border-brand-gold/25">⭐ Best</span>
                  )}
                  <div className="text-xl mb-2 leading-none">{g.icon}</div>
                  <div className={`font-semibold text-sm ${businessGoal === g.key ? "text-brand" : "text-stone-700"}`}>{g.label}</div>
                  <div className="text-[11px] text-stone-400 mt-0.5">{g.desc}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── STEP 3: Photography Style ── */}
        {stepIdx === 3 && (
          <div className="space-y-5">
            <SectionHeader
              title="Photography Style"
              helper="Pilih arah visual dan estetika keseluruhan. Setiap gaya mengontrol pencahayaan, color grading, dan suasana foto secara menyeluruh."
            />
            <div className="grid sm:grid-cols-2 gap-3">
              {PHOTOGRAPHY_STYLES.map((s) => (
                <button
                  key={s.key}
                  onClick={() => setPhotoStyle(s.key)}
                  data-testid={`studio-style-${s.key}`}
                  className={`relative p-5 rounded-2xl border text-left transition-all ${
                    photoStyle === s.key
                      ? "border-brand bg-brand/5 shadow-sm"
                      : "border-stone-200 bg-white hover:border-brand/30 hover:bg-stone-50/60"
                  }`}
                >
                  {s.recommended && (
                    <span className="absolute top-3 right-3 text-[8px] font-bold px-1.5 py-0.5 rounded-full bg-brand-gold/20 text-brand border border-brand-gold/25">⭐ Recommended</span>
                  )}
                  <div className={`font-heading font-bold text-base mb-1.5 ${photoStyle === s.key ? "text-brand" : "text-stone-800"}`}>{s.label}</div>
                  <div className="text-xs text-stone-500 leading-relaxed pr-10">{s.desc}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── STEP 4: Composition ── */}
        {stepIdx === 4 && (
          <div className="space-y-5">
            <SectionHeader
              title="Composition"
              helper={
                isFashion
                  ? "Pilih sudut dan cara pakaian ditampilkan. Setiap pilihan mengarahkan AI untuk menghasilkan pose dan framing yang berbeda."
                  : "Tentukan cara produk ditampilkan dalam frame agar hasil tampak lebih terarah dan profesional."
              }
            />
            <div className="grid grid-cols-2 gap-2.5">
              {activeCompositions.map((c) => (
                <button
                  key={c.key}
                  onClick={() => setComposition(c.key)}
                  data-testid={`studio-composition-${c.key}`}
                  className={`relative p-3.5 rounded-2xl border text-left transition-all ${
                    composition === c.key
                      ? "border-brand bg-brand/5 shadow-sm"
                      : "border-stone-200 bg-white hover:border-brand/30 hover:bg-stone-50/60"
                  }`}
                >
                  {c.recommended && (
                    <span className="absolute top-2 right-2 text-[8px] font-bold px-1.5 py-0.5 rounded-full bg-brand-gold/20 text-brand border border-brand-gold/25">⭐</span>
                  )}
                  <div className={`font-semibold text-sm mb-0.5 ${composition === c.key ? "text-brand" : "text-stone-700"}`}>{c.label}</div>
                  <div className="text-[11px] text-stone-400 leading-snug pr-6">{c.desc}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── STEP 5: Model ── */}
        {stepIdx === 5 && (
          <div className="space-y-5">
            <SectionHeader
              title="Model"
              helper={
                isFashion
                  ? "Pilih model yang akan mengenakan pakaian. Model secara otomatis ditampilkan sedang memakai produk yang di-upload."
                  : "Pilih apakah foto hanya menampilkan produk atau melibatkan model untuk konteks lifestyle komersial."
              }
            />
            {isFashion && (
              <div className="flex items-start gap-2.5 bg-violet-50 border border-violet-200 rounded-xl px-4 py-3">
                <Sparkle size={14} className="text-violet-500 mt-0.5 flex-shrink-0" weight="fill" />
                <p className="text-xs text-violet-700 leading-relaxed">
                  Model yang dipilih akan <strong>mengenakan pakaian yang di-upload</strong> secara langsung — AI mempertahankan warna, pola, dan detail garmen secara akurat.
                </p>
              </div>
            )}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {MODEL_OPTIONS.map((m) => (
                <button
                  key={m.key}
                  onClick={() => setModelType(m.key)}
                  data-testid={`studio-model-${m.key}`}
                  className={`p-4 rounded-2xl border text-left transition-all ${
                    modelType === m.key
                      ? "border-brand bg-brand/5 shadow-sm"
                      : "border-stone-200 bg-white hover:border-brand/30 hover:bg-stone-50/60"
                  }`}
                >
                  <div className={`font-semibold text-sm mb-0.5 ${modelType === m.key ? "text-brand" : "text-stone-700"}`}>{m.label}</div>
                  <div className="text-[11px] text-stone-400">{m.desc}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── STEP 6: Output ── */}
        {stepIdx === 6 && (
          <div className="space-y-5">
            <SectionHeader
              title="Output"
              helper="Tentukan jumlah variasi foto yang dihasilkan, atau pilih Campaign Pack untuk satu set konten marketing yang lengkap dan siap pakai."
            />

            {/* Campaign Pack */}
            <button
              onClick={() => setIsCampaignPack(!isCampaignPack)}
              data-testid="studio-campaign-pack"
              className={`w-full p-5 rounded-2xl border text-left transition-all ${
                isCampaignPack
                  ? "border-brand bg-brand/5 shadow-sm"
                  : "border-stone-200 bg-white hover:border-brand/30"
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`h-5 w-5 rounded-full border-2 flex-shrink-0 mt-0.5 flex items-center justify-center transition-all ${isCampaignPack ? "border-brand bg-brand" : "border-stone-300"}`}>
                  {isCampaignPack && <Check size={10} weight="bold" className="text-white" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1.5">
                    <span className="font-heading font-bold text-sm text-stone-800">Campaign Pack</span>
                    <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full bg-brand-gold/20 text-brand border border-brand-gold/25">⭐ Recommended</span>
                    {isFashion && (
                      <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full bg-violet-100 text-violet-600 border border-violet-200">Fashion Pack</span>
                    )}
                    <span className="text-xs text-stone-400 ml-auto">8 kredit</span>
                  </div>
                  <p className="text-xs text-stone-500 leading-relaxed mb-3">
                    {isFashion
                      ? "Generate 8 jenis foto fashion berbeda — satu set katalog & campaign fashion yang lengkap."
                      : "Generate 8 jenis foto berbeda — satu set kampanye marketing yang lengkap dan siap digunakan."}
                  </p>
                  <div className="grid grid-cols-2 gap-y-1 gap-x-3">
                    {campaignShotLabels.map((s) => (
                      <div key={s} className="flex items-center gap-1.5 text-[11px] text-stone-400">
                        <div className="h-1 w-1 rounded-full bg-stone-300 flex-shrink-0" />{s}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </button>

            {/* Output count */}
            {!isCampaignPack && (
              <div>
                <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-0.5">Jumlah Foto</p>
                <p className="text-xs text-stone-400 mb-3">Setiap foto menggunakan 1 kredit dan dihasilkan secara terpisah dengan variasi yang berbeda.</p>
                <div className="flex gap-2 flex-wrap">
                  {OUTPUT_COUNTS.map((n) => (
                    <button
                      key={n}
                      onClick={() => setOutputCount(n)}
                      data-testid={`studio-count-${n}`}
                      className={`h-11 w-11 rounded-xl border font-bold text-sm transition-all ${
                        outputCount === n
                          ? "border-brand bg-brand text-brand-cream shadow-sm"
                          : "border-stone-200 bg-white text-stone-700 hover:border-brand/40"
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-stone-400 mt-2">Total: {outputCount} kredit · estimasi {outputCount * 30} detik</p>
              </div>
            )}

            {/* Advanced */}
            <div className="border border-stone-200 rounded-2xl overflow-hidden">
              <button
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="w-full flex items-center justify-between px-5 py-4 text-sm font-medium text-stone-600 hover:bg-stone-50 transition-colors"
                data-testid="studio-advanced-toggle"
              >
                <div className="text-left">
                  <span className="font-semibold">Advanced Settings</span>
                  <p className="text-xs text-stone-400 font-normal mt-0.5">Kontrol manual untuk background, pencahayaan, dan karakter warna.</p>
                </div>
                <CaretDown size={13} className={`transition-transform flex-shrink-0 ml-3 ${showAdvanced ? "rotate-180" : ""}`} />
              </button>
              {showAdvanced && (
                <div className="px-5 pb-5 pt-1 space-y-5 border-t border-stone-100">
                  {[
                    { key: "background", label: "Background",      helper: "AI membuat background yang sesuai secara otomatis. Pilih manual untuk kontrol penuh.",                    options: ADV_BACKGROUNDS },
                    { key: "lighting",   label: "Lighting",        helper: "Pilih karakter pencahayaan yang membangun dimensi dan suasana foto.",                                       options: ADV_LIGHTINGS },
                    { key: "color_tone", label: "Color Tone",      helper: "Atur temperatur warna keseluruhan agar sesuai dengan karakter produk.",                                    options: ADV_TONES },
                    { key: "depth",      label: "Depth of Field",  helper: "Kontrol ketajaman latar belakang — bokeh halus atau ketajaman penuh.",                                     options: ADV_DEPTHS },
                  ].map(({ key, label, helper, options }) => (
                    <div key={key}>
                      <p className="text-xs font-bold text-stone-700 mb-0.5">{label}</p>
                      <p className="text-[11px] text-stone-400 mb-2">{helper}</p>
                      <ChipSelect options={options} value={advanced[key]} onChange={(v) => setAdvanced((a) => ({ ...a, [key]: v }))} />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600">{error}</div>
            )}
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between pt-8 mt-8 border-t border-stone-100">
        <button
          onClick={() => setStepIdx((i) => Math.max(0, i - 1))}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium transition-all border border-stone-200 text-stone-600 hover:border-brand hover:text-brand ${stepIdx === 0 ? "invisible" : ""}`}
        >
          <ArrowLeft size={14} />Back
        </button>

        {isLastStep ? (
          <div className="flex items-center gap-2">
            {isAdmin && (
              <button
                onClick={handlePreview}
                disabled={previewing}
                data-testid="studio-preview-btn"
                className="flex items-center gap-1.5 px-5 py-2.5 rounded-full border-2 border-brand text-brand text-sm font-bold hover:bg-brand/5 transition-all disabled:opacity-50"
              >
                {previewing ? <CircleNotch size={13} className="animate-spin" /> : <Eye size={13} weight="duotone" />}
                Preview Prompt
              </button>
            )}
            <button
              onClick={() => runGeneration()}
              data-testid="studio-generate-btn"
              className="flex items-center gap-2.5 px-8 py-3 rounded-full bg-brand text-brand-cream text-sm font-bold hover:bg-brand/90 transition-all shadow-md"
            >
              <Camera size={15} weight="fill" />
              Start Photoshoot
              <span className="text-brand-cream/50 font-normal text-xs">· {creditsNeeded} kredit</span>
            </button>
          </div>
        ) : (
          <button
            onClick={() => canContinue && setStepIdx((i) => i + 1)}
            disabled={!canContinue}
            data-testid="studio-continue-btn"
            className={`flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-bold transition-all ${canContinue ? "bg-brand text-brand-cream hover:bg-brand/90 shadow-sm" : "bg-stone-100 text-stone-400 cursor-not-allowed"}`}
          >
            Continue<ArrowRight size={14} />
          </button>
        )}
      </div>

      {/* Admin preview panel */}
      {isAdmin && promptPreview && isLastStep && (
        <div id="studio-preview-panel" className="mt-8 animate-fade-up space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-[0.18em] text-brand/50 font-semibold">Preview Prompt</span>
            <button onClick={copyPrompt} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-stone-200 text-xs text-stone-600 hover:border-brand hover:text-brand transition-all">
              <Copy size={11} />{copied ? "Tersalin!" : "Copy Prompt"}
            </button>
          </div>
          <div className="bg-stone-50 border border-stone-200 rounded-2xl p-4">
            <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-2">Natural Prompt</p>
            <p className="text-xs text-stone-700 leading-relaxed font-mono whitespace-pre-wrap break-words">{promptPreview.natural_prompt}</p>
          </div>
          <details className="group">
            <summary className="cursor-pointer text-xs text-stone-400 hover:text-brand transition-colors list-none flex items-center gap-1.5">
              <CaretDown size={11} className="group-open:rotate-180 transition-transform" />Lihat JSON Spec
            </summary>
            <div className="mt-2 bg-stone-900 rounded-xl p-4 overflow-x-auto">
              <pre className="text-[11px] text-green-400 font-mono whitespace-pre">{JSON.stringify(promptPreview.prompt_json, null, 2)}</pre>
            </div>
          </details>
        </div>
      )}
    </div>
    <NoCreditsModal open={noCredits} onClose={() => setNoCredits(false)} />
    </>
  );
}
