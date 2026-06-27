import { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import api from "@/lib/api";
import { toast } from 'react-toastify';
import { handleGenerateError } from "@/lib/moderation";
import { useAuth } from "@/context/AuthContext";
import { Stack, Sparkle, CircleNotch, CheckCircle, ArrowsHorizontal, ArrowsClockwise,
         DownloadSimple, ChatCircle, Copy, Check, Hash, Images, Camera, Users,
         Person, GridFour, Shuffle, Lightning, Sliders, CaretDown, CaretUp,
         Package, BookOpen, Palette, WarningCircle, HourglassMedium, ArrowRight, Eye, X } from "@phosphor-icons/react";
import JsonOutput from "@/components/JsonOutput";
import BrandDnaCard from "@/components/BrandDnaCard";
import NoCreditsModal from "@/components/NoCreditsModal";
import ReferenceUpload from "@/components/ReferenceUpload";
import InspirationGallery from "@/components/InspirationGallery";
import { notifyCreditsUpdate } from "@/lib/credits";

// ── Constants ─────────────────────────────────────────────────────────────────

const TEMPLATES = [
  { id: "problem-solution", name: "Masalah → Solusi", desc: "Hook · Problem · Agitasi · Solusi · CTA", icon: "⚡" },
  { id: "listicle",         name: "Listicle / Tips",   desc: "Hook · Tips 1-4 · CTA", icon: "📋" },
  { id: "story",            name: "Storytelling",      desc: "Konteks · Tantangan · Transformasi · Hasil · CTA", icon: "✨" },
  { id: "testimonial",      name: "Testimoni",         desc: "Hook · Kredibilitas · Testimoni · Social Proof · CTA", icon: "💬" },
];

const CONTENT_GOALS = [
  { id: "edukasi",         name: "Edukasi",         color: "bg-blue-50 border-blue-200 text-blue-700" },
  { id: "promo",           name: "Promo",            color: "bg-red-50 border-red-200 text-red-700" },
  { id: "launch",          name: "Launch",           color: "bg-purple-50 border-purple-200 text-purple-700" },
  { id: "testimoni",       name: "Testimoni",        color: "bg-green-50 border-green-200 text-green-700" },
  { id: "best_seller",     name: "Best Seller",      color: "bg-amber-50 border-amber-200 text-amber-700" },
  { id: "brand_awareness", name: "Brand Awareness",  color: "bg-stone-50 border-stone-300 text-stone-700" },
  { id: "restock",         name: "Restock",          color: "bg-orange-50 border-orange-200 text-orange-700" },
];

const VISUAL_TYPES = [
  { id: "product_only",   name: "Product Only",     desc: "Studio product hero", Icon: Camera },
  { id: "human_product",  name: "Product + Human",  desc: "Model pakai produk",  Icon: Users },
  { id: "human_only",     name: "Human Lifestyle",  desc: "Lifestyle portrait",  Icon: Person },
  { id: "graphic_design", name: "Graphic Design",   desc: "Typography-based",    Icon: GridFour },
  { id: "mixed",          name: "Mixed",            desc: "Kombinasi dinamis",   Icon: Shuffle },
];

const PHOTO_STYLES = [
  { id: "auto",       name: "Auto (Feedify Pilih)" },
  { id: "studio",     name: "Studio" },
  { id: "lifestyle",  name: "Lifestyle" },
  { id: "ugc",        name: "UGC" },
  { id: "editorial",  name: "Editorial" },
  { id: "commercial", name: "Commercial" },
  { id: "flatlay",    name: "Flatlay" },
];

const STYLE_PRESETS = [
  "Minimal Clean", "Minimal Korean", "Editorial Bold", "Luxury Editorial",
  "Luxury Spa", "Lifestyle Natural", "Lifestyle Social", "Vibrant Pop",
  "Dark Moody", "Warm Artisan",
];

const VISUAL_PRIORITIES = [
  { id: "product_first", name: "Product First", desc: "Produk dominan 60%+" },
  { id: "balanced",      name: "Balanced",      desc: "Proporsi seimbang" },
  { id: "human_first",   name: "Human First",   desc: "Model dominan 60%+" },
];

const ASPECT_RATIOS = ["1:1 (Square Feed)", "4:5 (Portrait Feed)", "9:16 (Story/Reels)"];

const MODEL_GENDERS = [
  { id: "auto",   name: "Auto" },
  { id: "female", name: "Female" },
  { id: "male",   name: "Male" },
];
const MODEL_ETHNICITIES = [
  { id: "auto",        name: "Auto" },
  { id: "indonesian",  name: "Indonesian" },
  { id: "asian",       name: "Asian" },
  { id: "korean",      name: "Korean" },
  { id: "western",     name: "Western" },
];
const MODEL_AGES = [
  { id: "teen",        name: "Teen (15–19)" },
  { id: "young_adult", name: "Young Adult (20–30)" },
  { id: "adult",       name: "Adult (30–45)" },
  { id: "mature",      name: "Mature (45+)" },
];
const MODEL_FASHION = [
  { id: "auto",         name: "Auto" },
  { id: "casual",       name: "Casual" },
  { id: "smart_casual", name: "Smart Casual" },
  { id: "editorial",    name: "Editorial" },
  { id: "luxury",       name: "Luxury" },
  { id: "streetwear",   name: "Streetwear" },
];
const MODEL_EXPRESSIONS = [
  { id: "auto",       name: "Auto" },
  { id: "confident",  name: "Confident" },
  { id: "warm_smile", name: "Warm Smile" },
  { id: "natural",    name: "Natural" },
  { id: "focused",    name: "Focused" },
];
const MODEL_INTERACTIONS = [
  { id: "auto",      name: "Auto" },
  { id: "holding",   name: "Holding Product" },
  { id: "applying",  name: "Applying Product" },
  { id: "showcase",  name: "Showcasing" },
  { id: "lifestyle", name: "Lifestyle" },
];

// Which visual types require / allow human
const VISUAL_HUMAN_MODE = {
  product_only:   "none",
  graphic_design: "none",
  human_product:  "required",
  human_only:     "required",
  mixed:          "optional",
};

const DIRECTOR_MODES = [
  { id: "simple",   name: "Simple",  desc: "Isi sedikit, Feedify lengkapi sisanya" },
  { id: "smart",    name: "Smart",   desc: "Feedify Visual Director penuh (recommended)", badge: true },
  { id: "advanced", name: "Advanced", desc: "Kontrol manual semua visual" },
];

const DEFAULT_FORM = {
  // Section 1
  topic: "",
  target_audience: "",
  content_goal: "brand_awareness",
  final_cta: "",
  // Section 2
  brand_name: "",
  product_name: "",
  // Section 4
  template: "problem-solution",
  slide_count: 5,
  aspect_ratio: "1:1 (Square Feed)",
  // Section 3 — Visual Direction
  visual_type: "human_product",
  photo_style: "auto",
  style_preset: "Minimal Clean",
  visual_priority: "balanced",
  // Model Settings (shown when visual type includes human)
  model_gender: "auto",
  model_ethnicity: "auto",
  model_age: "young_adult",
  model_fashion: "auto",
  model_expression: "auto",
  model_interaction: "auto",
  mixed_allow_human: true,
  // Section 5 — Advanced
  ai_director_mode: "smart",
  mood_override: "",
  lighting_override: "",
  composition_override: "",
  camera_style_override: "",
};

// ── Main Component ─────────────────────────────────────────────────────────────

export default function CarouselGeneratorPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const [form, setForm] = useState(DEFAULT_FORM);
  const upd = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const [brand, setBrand] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [carouselId, setCarouselId] = useState(null);
  const [totalSlides, setTotalSlides] = useState(0);
  const [slideStatuses, setSlideStatuses] = useState([]);   // "waiting"|"generating"|"completed"|"failed"
  const [slideImages, setSlideImages] = useState([]);        // base64 per index
  const [slideRoles, setSlideRoles] = useState([]);
  const [genPhase, setGenPhase] = useState("");              // status text shown to user
  const [selectedSlide, setSelectedSlide] = useState(0);
  const [noCredits, setNoCredits] = useState(false);
  const [regeneratingSlide, setRegeneratingSlide] = useState(null);
  const [referenceImg, setReferenceImg] = useState(null);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [ratioPreviewOpen, setRatioPreviewOpen] = useState(false);
  const [captions, setCaptions] = useState(null);
  const [generatingCaptions, setGeneratingCaptions] = useState(false);
  const [promptPreview, setPromptPreview] = useState(null);
  const [previewing, setPreviewing] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [validationWarnings, setValidationWarnings] = useState([]);
  const [carouselMeta, setCarouselMeta] = useState(null);
  const readerRef = useRef(null);

  useEffect(() => {
    api.get("/brand-profile").then(({ data }) => {
      setBrand(data);
      if (data?.target_audience) upd("target_audience", data.target_audience);
      if (data?.brand_name) upd("brand_name", data.brand_name);
    }).catch(() => {});
  }, []);

  const buildPayload = () => {
    const humanMode = VISUAL_HUMAN_MODE[form.visual_type] ?? "none";
    const humanEnabled =
      humanMode === "required" ||
      (humanMode === "optional" && form.mixed_allow_human);

    return {
      ...form,
      campaign_goal: form.content_goal,
      call_to_action: form.final_cta,
      human_enabled: humanEnabled,
      human_mode: humanMode,
      talent_gender:    humanEnabled ? form.model_gender    : "auto",
      talent_ethnicity: humanEnabled ? form.model_ethnicity : "auto",
      talent_age_group: humanEnabled ? form.model_age       : "young_adult",
      model_fashion:    humanEnabled ? form.model_fashion   : "auto",
      model_expression: humanEnabled ? form.model_expression: "auto",
      model_interaction:humanEnabled ? form.model_interaction:"auto",
      save: true,
      ...(referenceImg ? { reference_image_base64: referenceImg.split(",")[1] } : {}),
    };
  };

  const validate = () => {
    if (!form.topic.trim()) { toast.error("Topic wajib diisi"); return false; }
    if (!form.target_audience.trim()) { toast.error("Target Audiens wajib diisi"); return false; }
    return true;
  };

  const generateCaptions = async () => {
    setGeneratingCaptions(true);
    setCaptions(null);
    try {
      const { data } = await api.post("/prompt/generate-caption-bundle", {
        product_name: form.product_name || brand?.brand_name || "",
        headline: form.topic,
        target_audience: form.target_audience,
        platform: "instagram",
        content_purpose: "soft_selling",
      });
      if (!data.error) setCaptions(data);
    } catch {}
    finally { setGeneratingCaptions(false); }
  };

  const generate = async () => {
    if (!validate()) return;

    // Reset all progressive state
    setGenerating(true);
    setCarouselId(null);
    setTotalSlides(form.slide_count);
    setSlideStatuses(Array(form.slide_count).fill("waiting"));
    setSlideImages(Array(form.slide_count).fill(null));
    setSlideRoles(Array(form.slide_count).fill(""));
    setCarouselMeta(null);
    setCaptions(null);
    setValidationWarnings([]);
    setSelectedSlide(0);
    setGenPhase("Menyiapkan Creative Brief...");

    const token = localStorage.getItem("feedify_token");
    const backendUrl = process.env.REACT_APP_BACKEND_URL;

    try {
      const response = await fetch(`${backendUrl}/api/prompt/generate-carousel-stream`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify(buildPayload()),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        if (response.status === 402) { setNoCredits(true); return; }
        throw new Error(err.detail || "Gagal generate");
      }

      const reader = response.body.getReader();
      readerRef.current = reader;
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop(); // keep incomplete line

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          let evt;
          try { evt = JSON.parse(line.slice(6)); } catch { continue; }

          switch (evt.type) {
            case "brief_ready":
              setCarouselId(evt.carousel_id);
              setTotalSlides(evt.total_slides);
              setGenPhase("Merancang Story Structure...");
              break;

            case "planning":
              setSlideRoles(evt.roles || []);
              setCarouselMeta(evt.meta || null);
              setSlideStatuses(Array(evt.roles?.length || form.slide_count).fill("waiting"));
              setSlideImages(Array(evt.roles?.length || form.slide_count).fill(null));
              setGenPhase("Memulai generasi slide...");
              // Scroll to result area
              setTimeout(() => document.getElementById("carousel-result")?.scrollIntoView({ behavior: "smooth" }), 200);
              break;

            case "slide_start":
              setGenPhase(`Generating Slide ${evt.index + 1} of ${evt.total} — ${evt.role}...`);
              setSlideStatuses(prev => {
                const next = [...prev];
                next[evt.index] = "generating";
                return next;
              });
              break;

            case "slide_retry":
              setGenPhase(`Slide ${evt.index + 1}: retry attempt ${evt.attempt}...`);
              break;

            case "slide_complete":
              setSlideImages(prev => {
                const next = [...prev];
                next[evt.index] = evt.image_base64;
                return next;
              });
              setSlideStatuses(prev => {
                const next = [...prev];
                next[evt.index] = "completed";
                return next;
              });
              // Auto-select first completed slide
              setSelectedSlide(s => (s === 0 && evt.index === 0) ? 0 : s === evt.index - 1 ? evt.index : s);
              setGenPhase(`Slide ${evt.index + 1} selesai ✓`);
              break;

            case "slide_failed":
              setSlideStatuses(prev => {
                const next = [...prev];
                next[evt.index] = "failed";
                return next;
              });
              toast.error(`Slide ${evt.index + 1} gagal — kredit di-refund`);
              break;

            case "carousel_complete": {
              const warns = evt.validation_warnings || [];
              if (warns.length) setValidationWarnings(warns);
              if (evt.credits) notifyCreditsUpdate(evt.credits);
              setGenPhase("");
              setGenerating(false);
              if (evt.success > 0) {
                toast.success(`${evt.success} slide siap!${evt.failed > 0 ? ` (${evt.failed} gagal, kredit dikembalikan)` : ""}`);
                generateCaptions();
              } else {
                toast.error("Semua slide gagal. Kredit sudah dikembalikan.");
              }
              break;
            }

            default:
              break;
          }
        }
      }
    } catch (err) {
      if (err?.response?.status === 402) setNoCredits(true);
      else {
        const handled = handleGenerateError(err);
        if (!handled) toast.error(err.message || "Gagal generate. Coba lagi.");
      }
    } finally {
      setGenerating(false);
      setGenPhase("");
      readerRef.current = null;
    }
  };

  const previewPrompt = async () => {
    if (!validate()) return;
    setPreviewing(true);
    setPromptPreview(null);
    try {
      const { data } = await api.post("/prompt/preview-carousel", buildPayload());
      setPromptPreview(data);
      setTimeout(() => document.getElementById("carousel-preview-panel")?.scrollIntoView({ behavior: "smooth" }), 100);
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Gagal memuat preview");
    } finally { setPreviewing(false); }
  };

  const regenerateSlide = async (idx) => {
    if (!carouselId) return;
    setRegeneratingSlide(idx);
    setSlideStatuses(prev => { const n = [...prev]; n[idx] = "generating"; return n; });
    try {
      const { data } = await api.post("/prompt/regenerate-slide", { prompt_id: carouselId, slide_index: idx });
      setSlideImages(prev => { const n = [...prev]; n[idx] = data.image_base64; return n; });
      setSlideStatuses(prev => { const n = [...prev]; n[idx] = "completed"; return n; });
      if (data.credits) notifyCreditsUpdate(data.credits);
      toast.success(`Slide ${idx + 1} regenerated!`);
    } catch (err) {
      setSlideStatuses(prev => { const n = [...prev]; n[idx] = "failed"; return n; });
      if (err?.response?.status === 402) setNoCredits(true);
      else toast.error("Gagal regenerate");
    } finally { setRegeneratingSlide(null); }
  };

  const downloadSlide = (idx) => {
    const img = slideImages[idx];
    if (!img) return;
    const a = document.createElement("a");
    a.href = `data:image/png;base64,${img}`;
    a.download = `feedify-slide-${idx + 1}.png`;
    a.click();
  };

  const isComplete = !generating && slideImages.some(Boolean);
  const hasAnySlide = slideImages.some(Boolean) || generating;

  return (
    <div className="space-y-6" data-testid="carousel-generator-page">
      {/* Header */}
      <div className="animate-fade-up min-w-0">
        <h1 className="font-heading text-2xl sm:text-4xl font-bold text-brand tracking-tight">Carousel Builder</h1>
        <p className="text-stone-500 mt-1.5 max-w-xl text-sm">
          Isi brief sederhana — Feedify Visual Director mengubahnya menjadi carousel Instagram level agency.
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6 min-w-0">
        {/* ── Left: Form ─────────────────────────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-4 animate-fade-up min-w-0">

          {/* SECTION 1 — Campaign */}
          <SectionCard num="01" title="Campaign" icon={<BookOpen size={16} weight="duotone" />}>
            <Field label="Topic / Narasi Utama *">
              <textarea
                data-testid="carousel-topic"
                value={form.topic}
                onChange={(e) => upd("topic", e.target.value)}
                placeholder="mis. 5 alasan skincare lokal lebih cocok untuk kulit Indonesia"
                rows={2}
                className="input resize-none"
              />
            </Field>

            <Field label="Target Audiens *">
              <input
                type="text"
                data-testid="carousel-audience"
                value={form.target_audience}
                onChange={(e) => upd("target_audience", e.target.value)}
                className="input"
                placeholder="mis. Wanita 20-35 tahun, ibu muda, pemilik UMKM"
              />
            </Field>

            <Field label="Content Goal">
              <div className="flex flex-wrap gap-1.5">
                {CONTENT_GOALS.map((g) => (
                  <button
                    key={g.id}
                    type="button"
                    data-testid={`goal-${g.id}`}
                    onClick={() => upd("content_goal", g.id)}
                    className={`px-2.5 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                      form.content_goal === g.id ? g.color + " ring-1 ring-offset-1 ring-current" : "bg-white border-stone-200 text-stone-600 hover:border-stone-300"
                    }`}
                  >
                    {g.name}
                  </button>
                ))}
              </div>
            </Field>

            <Field label="Final CTA">
              <input
                type="text"
                data-testid="carousel-cta"
                value={form.final_cta}
                onChange={(e) => upd("final_cta", e.target.value)}
                className="input"
                placeholder="mis. Follow IG, Order WA, Beli di Shopee..."
              />
              <div className="flex flex-wrap gap-1.5 mt-2">
                {[
                  `Follow IG @${brand?.brand_name || "namabrand"}`,
                  "Order via WhatsApp",
                  "Beli di Shopee",
                  "Kunjungi Website Kami",
                  "DM untuk Info Harga",
                ].map((chip) => (
                  <button
                    key={chip}
                    type="button"
                    onClick={() => upd("final_cta", chip)}
                    className="text-[10px] px-2.5 py-1 rounded-full bg-stone-100 text-stone-500 hover:bg-brand-sand hover:text-brand transition-all border border-stone-200 hover:border-brand/30"
                  >
                    {chip}
                  </button>
                ))}
              </div>
            </Field>
          </SectionCard>

          {/* SECTION 2 — Brand */}
          <SectionCard num="02" title="Brand" icon={<Package size={16} weight="duotone" />}>
            <Field label="Brand Name">
              <input
                type="text"
                data-testid="carousel-brand-name"
                value={form.brand_name}
                onChange={(e) => upd("brand_name", e.target.value)}
                className="input"
                placeholder="mis. Voyoa, Green Teaa, Kopi Lokal..."
              />
              {brand?.brand_name && form.brand_name === brand.brand_name && (
                <p className="text-xs text-stone-400 mt-1">
                  Dari <span className="text-brand font-semibold">Brand Profile</span>
                </p>
              )}
            </Field>
            <Field label="Product Name (opsional)">
              <input
                type="text"
                data-testid="carousel-product"
                value={form.product_name}
                onChange={(e) => upd("product_name", e.target.value)}
                className="input"
                placeholder="mis. Sunscreen SPF 50+, Serum Niacinamide..."
              />
            </Field>
          </SectionCard>

          {/* SECTION 3 — Visual Direction */}
          <SectionCard num="03" title="Visual Direction" icon={<Palette size={16} weight="duotone" />}>
            <Field label="Visual Type">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {VISUAL_TYPES.map(({ id, name, desc, Icon }) => (
                  <button
                    key={id}
                    type="button"
                    data-testid={`visual-type-${id}`}
                    onClick={() => upd("visual_type", id)}
                    className={`p-3 rounded-xl border-2 text-left transition-all min-w-0 ${
                      form.visual_type === id
                        ? "border-brand bg-brand-sand"
                        : "border-stone-100 hover:border-brand/30 bg-white"
                    }`}
                  >
                    <Icon size={18} weight="duotone" className={form.visual_type === id ? "text-brand" : "text-stone-400"} />
                    <div className={`font-semibold text-xs mt-1.5 leading-tight ${form.visual_type === id ? "text-brand" : "text-stone-700"}`}>{name}</div>
                    <div className="text-[10px] text-stone-400 mt-0.5 leading-tight">{desc}</div>
                  </button>
                ))}
              </div>
            </Field>

            {/* ── Model Settings — muncul otomatis berdasarkan visual type ── */}
            {VISUAL_HUMAN_MODE[form.visual_type] === "optional" && (
              <div className="flex items-center justify-between p-3 rounded-xl bg-stone-50 border border-stone-100">
                <div>
                  <div className="font-semibold text-sm text-stone-700">Sertakan Model Manusia</div>
                  <div className="text-[11px] text-stone-400 mt-0.5">Feedify akan memutuskan jika diperlukan</div>
                </div>
                <button
                  type="button"
                  data-testid="mixed-allow-human-toggle"
                  onClick={() => upd("mixed_allow_human", !form.mixed_allow_human)}
                  className={`w-11 h-6 rounded-full transition-all relative flex-shrink-0 ${form.mixed_allow_human ? "bg-brand" : "bg-stone-200"}`}
                >
                  <span className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all ${form.mixed_allow_human ? "left-6" : "left-1"}`} />
                </button>
              </div>
            )}

            {(VISUAL_HUMAN_MODE[form.visual_type] === "required" ||
              (VISUAL_HUMAN_MODE[form.visual_type] === "optional" && form.mixed_allow_human)) && (
              <div className="rounded-xl border border-brand/20 bg-brand-sand/30 p-4 space-y-4 animate-fade-up">
                <div className="text-xs font-bold text-brand uppercase tracking-wider flex items-center gap-1.5">
                  <Person size={13} weight="duotone" /> Model Settings
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    { label: "Gender",       items: MODEL_GENDERS,      key: "model_gender" },
                    { label: "Ethnicity",    items: MODEL_ETHNICITIES,  key: "model_ethnicity" },
                    { label: "Age Range",    items: MODEL_AGES,          key: "model_age" },
                    { label: "Fashion Style",items: MODEL_FASHION,      key: "model_fashion" },
                    { label: "Expression",  items: MODEL_EXPRESSIONS,  key: "model_expression" },
                    { label: "Interaction", items: MODEL_INTERACTIONS, key: "model_interaction" },
                  ].map(({ label, items, key }) => (
                    <div key={key} className="min-w-0">
                      <div className="text-[11px] font-semibold text-stone-500 mb-1.5">{label}</div>
                      <div className="flex flex-wrap gap-1">
                        {items.map(({ id, name }) => (
                          <button key={id} type="button" onClick={() => upd(key, id)}
                            className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-all ${
                              form[key] === id ? "bg-brand text-white border-brand" : "bg-white border-stone-200 text-stone-600"
                            }`}>{name}</button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <Field label="Photo Style">
              <div className="flex flex-wrap gap-2">
                {PHOTO_STYLES.map(({ id, name }) => (
                  <button
                    key={id}
                    type="button"
                    data-testid={`photo-style-${id}`}
                    onClick={() => upd("photo_style", id)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                      form.photo_style === id
                        ? "bg-brand text-brand-cream border-brand"
                        : "bg-white border-stone-200 text-stone-600 hover:border-stone-300"
                    }`}
                  >
                    {name}
                  </button>
                ))}
              </div>
            </Field>

            <Field label="Style Preset">
              <div className="flex flex-wrap gap-2">
                {STYLE_PRESETS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    data-testid={`carousel-style-${s.toLowerCase().replace(/\s+/g, '-')}`}
                    onClick={() => upd("style_preset", s)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                      form.style_preset === s
                        ? "bg-brand-gold text-brand border-brand-gold"
                        : "bg-white border-stone-200 text-stone-700 hover:border-stone-300"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </Field>

            <Field label="Visual Priority">
              <div className="grid grid-cols-3 gap-2">
                {VISUAL_PRIORITIES.map(({ id, name, desc }) => (
                  <button
                    key={id}
                    type="button"
                    data-testid={`visual-priority-${id}`}
                    onClick={() => upd("visual_priority", id)}
                    className={`p-2 sm:p-3 rounded-xl border-2 text-center transition-all min-w-0 ${
                      form.visual_priority === id
                        ? "border-brand bg-brand-sand"
                        : "border-stone-100 hover:border-brand/30 bg-white"
                    }`}
                  >
                    <div className={`font-semibold text-xs leading-tight ${form.visual_priority === id ? "text-brand" : "text-stone-700"}`}>{name}</div>
                    <div className="text-[10px] text-stone-400 mt-0.5 leading-tight hidden sm:block">{desc}</div>
                  </button>
                ))}
              </div>
            </Field>
          </SectionCard>

          {/* SECTION 4 — Content */}
          <SectionCard num="04" title="Content" icon={<BookOpen size={16} weight="duotone" />}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {TEMPLATES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  data-testid={`template-${t.id}`}
                  onClick={() => upd("template", t.id)}
                  className={`text-left p-3 sm:p-4 rounded-xl border-2 transition-all min-w-0 ${
                    form.template === t.id
                      ? "border-brand bg-brand-sand"
                      : "border-stone-100 hover:border-brand/30 bg-white"
                  }`}
                >
                  <div className="text-xl mb-1">{t.icon}</div>
                  <div className="font-heading font-semibold text-brand text-sm">{t.name}</div>
                  <div className="text-[10px] text-stone-500 mt-0.5 leading-tight">{t.desc}</div>
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-1">
              <Field label="Jumlah Slide">
                <div className="flex gap-1.5">
                  {[3, 4, 5, 6, 7].map((n) => (
                    <button
                      key={n}
                      type="button"
                      data-testid={`slide-count-${n}`}
                      onClick={() => upd("slide_count", n)}
                      className={`flex-1 min-w-0 py-2.5 rounded-xl border-2 font-heading font-bold text-sm sm:text-base transition-all ${
                        form.slide_count === n
                          ? "border-brand bg-brand text-brand-cream"
                          : "border-stone-100 text-stone-600 hover:border-brand/30"
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-stone-400 mt-1">{form.slide_count} kredit per generate</p>
              </Field>

              <Field label="Aspect Ratio">
                <div className="grid grid-cols-3 gap-2">
                  {ASPECT_RATIOS.map((r) => {
                    const active = form.aspect_ratio === r;
                    const key0 = r.split(" ")[0]; // "1:1" / "4:5" / "9:16"
                    const boxCls = key0 === "1:1"
                      ? "w-[18px] h-[18px]"
                      : key0 === "4:5"
                        ? "w-[14px] h-[18px]"
                        : "w-[10px] h-[18px]";
                    return (
                      <button
                        key={r}
                        type="button"
                        data-testid={`carousel-ratio-${key0}`}
                        onClick={() => upd("aspect_ratio", r)}
                        className={`flex flex-col items-center gap-1.5 px-1 sm:px-2 py-2.5 rounded-xl border-2 transition-all min-w-0 ${
                          active
                            ? "bg-brand border-brand text-brand-cream"
                            : "bg-white border-stone-200 text-stone-600 hover:border-stone-300"
                        }`}
                      >
                        <div className={`${boxCls} rounded-sm border-2 flex-shrink-0 ${
                          active ? "border-brand-gold bg-brand-gold/30" : "border-stone-400 bg-stone-100"
                        }`} />
                        <span className="text-[10px] font-bold tracking-tight leading-none">{key0}</span>
                      </button>
                    );
                  })}
                </div>
                <button
                  type="button"
                  onClick={() => setRatioPreviewOpen(true)}
                  data-testid="carousel-ratio-preview-btn"
                  className="mt-3 w-full flex items-center justify-center gap-2 py-2 rounded-xl border border-dashed border-brand-sand text-xs font-semibold text-brand-light hover:border-brand hover:text-brand hover:bg-brand-sand/40 transition-all"
                >
                  <Eye size={14} weight="duotone" />
                  Lihat Preview {form.aspect_ratio.split(" ")[0]}
                </button>
              </Field>
            </div>
          </SectionCard>

          {/* SECTION 5 — Advanced */}
          <SectionCard num="05" title="Advanced" icon={<Images size={16} weight="duotone" />}>
            <ReferenceUpload value={referenceImg} onChange={setReferenceImg} testid="carousel-reference" />
            <button
              type="button"
              onClick={() => setGalleryOpen(true)}
              data-testid="carousel-gallery-btn"
              className="mt-2 w-full flex items-center justify-center gap-2 py-2.5 border border-dashed border-brand-sand rounded-xl text-sm font-semibold text-brand-light hover:border-brand hover:text-brand hover:bg-brand-sand/40 transition-all"
            >
              <Images size={16} weight="duotone" />
              Pilih dari Gallery Inspirasi
            </button>
            <div className="border-t border-stone-100 pt-4 mt-2">
              <div className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <Lightning size={12} weight="duotone" /> Feedify Visual Director
              </div>
              <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
              {DIRECTOR_MODES.map(({ id, name, desc, badge }) => (
                <button
                  key={id}
                  type="button"
                  data-testid={`director-mode-${id}`}
                  onClick={() => { upd("ai_director_mode", id); if (id !== "advanced") setShowAdvanced(false); }}
                  className={`p-2 sm:p-3 rounded-xl border-2 text-left transition-all relative min-w-0 ${
                    form.ai_director_mode === id
                      ? "border-brand bg-brand-sand"
                      : "border-stone-100 hover:border-brand/30 bg-white"
                  }`}
                >
                  {badge && (
                    <span className="absolute -top-2 left-2 sm:left-3 text-[8px] sm:text-[9px] bg-brand-gold text-brand font-bold px-1 sm:px-1.5 py-0.5 rounded-full uppercase tracking-wide whitespace-nowrap">
                      Rekomendasi
                    </span>
                  )}
                  <div className={`font-heading font-bold text-xs sm:text-sm ${form.ai_director_mode === id ? "text-brand" : "text-stone-700"}`}>{name}</div>
                  <div className="text-[9px] sm:text-[10px] text-stone-400 mt-1 leading-tight hidden sm:block">{desc}</div>
                </button>
              ))}
            </div>

            {form.ai_director_mode === "smart" && (
              <div className="p-3 rounded-xl bg-brand-sand/50 border border-brand/10 mt-2">
                <p className="text-xs text-brand font-medium">
                  Feedify Director otomatis menentukan: komposisi · sudut kamera · pencahayaan · focal point · mood · text placement · prop recommendation
                </p>
              </div>
            )}

            {form.ai_director_mode === "advanced" && (
              <div className="space-y-3 mt-2 animate-fade-up">
                <button
                  type="button"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="flex items-center gap-2 text-xs font-semibold text-brand-light hover:text-brand transition-colors"
                >
                  {showAdvanced ? <CaretUp size={12} /> : <CaretDown size={12} />}
                  {showAdvanced ? "Sembunyikan" : "Tampilkan"} Advanced Controls
                </button>
                {showAdvanced && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 animate-fade-up">
                    <Field label="Mood Override">
                      <input type="text" value={form.mood_override} onChange={(e) => upd("mood_override", e.target.value)}
                        className="input text-sm" placeholder="mis. dark moody, warm cozy, bright energetic" />
                    </Field>
                    <Field label="Lighting Override">
                      <input type="text" value={form.lighting_override} onChange={(e) => upd("lighting_override", e.target.value)}
                        className="input text-sm" placeholder="mis. golden hour, softbox studio, neon" />
                    </Field>
                    <Field label="Composition Override">
                      <input type="text" value={form.composition_override} onChange={(e) => upd("composition_override", e.target.value)}
                        className="input text-sm" placeholder="mis. rule of thirds, centered, asymmetric" />
                    </Field>
                    <Field label="Camera Style Override">
                      <input type="text" value={form.camera_style_override} onChange={(e) => upd("camera_style_override", e.target.value)}
                        className="input text-sm" placeholder="mis. macro close-up, wide angle, portrait" />
                    </Field>
                  </div>
                )}
              </div>
            )}
            </div>
          </SectionCard>

          {/* Validation warnings */}
          {validationWarnings.length > 0 && (
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 space-y-1 animate-fade-up">
              <div className="text-xs font-bold text-amber-700 uppercase tracking-wide mb-2">Feedify Director: Auto-Fix Applied</div>
              {validationWarnings.map((w, i) => (
                <p key={i} className="text-xs text-amber-600 flex gap-1.5">
                  <span className="flex-shrink-0">⚡</span>{w}
                </p>
              ))}
            </div>
          )}

          {/* Generate Button */}
          <div className={isAdmin ? "flex flex-col sm:flex-row gap-3" : ""}>
            {isAdmin && (
              <button
                type="button"
                onClick={previewPrompt}
                disabled={previewing || generating}
                data-testid="preview-carousel-btn"
                className="flex-1 py-4 bg-white border-2 border-brand text-brand rounded-full font-bold text-base hover:bg-brand-sand btn-lift inline-flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {previewing
                  ? <><CircleNotch size={18} className="animate-spin" /> Memuat...</>
                  : <><Sliders size={18} weight="duotone" /> Preview Brief JSON</>}
              </button>
            )}
            <button
              type="button"
              onClick={generate}
              disabled={generating}
              data-testid="generate-carousel-btn"
              className={`${isAdmin ? "flex-1" : "w-full"} py-4 bg-brand text-brand-cream rounded-full font-bold text-lg hover:bg-brand-light btn-lift inline-flex items-center justify-center gap-2 disabled:opacity-60 shadow-lg`}
            >
              {generating
                ? <><CircleNotch size={20} className="animate-spin" /> {genPhase || `Generating...`}</>
                : <><Sparkle size={20} weight="fill" /> Generate {form.slide_count} Slides <span className="opacity-70 text-sm font-medium">({form.slide_count} kredit)</span></>}
            </button>
          </div>

          {isAdmin && promptPreview && (
            <div id="carousel-preview-panel" className="animate-fade-up space-y-3">
              <div className="flex items-center gap-2">
                <Stack size={18} weight="duotone" className="text-brand" />
                <span className="font-heading font-bold text-brand">Prompt per Slide</span>
                <span className="text-xs text-stone-400">— copy satu per satu ke ChatGPT</span>
              </div>
              {(promptPreview.prompt_json?.slides || []).map((slide, i) => (
                <SlidePromptCard key={i} index={i} slide={slide} />
              ))}
            </div>
          )}
        </div>

        {/* ── Right: Sidebar ─────────────────────────────────────────────────── */}
        <div className="lg:sticky lg:top-6 lg:self-start space-y-4 min-w-0 order-last lg:order-none">
          {/* Slide Preview */}
          <div className="feedify-card p-5">
            <div className="text-xs uppercase tracking-[0.18em] text-brand-light font-bold mb-3 flex items-center gap-1.5">
              <Stack size={14} weight="fill" /> Preview Slides
            </div>
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2 snap-x">
              {Array.from({ length: form.slide_count }).map((_, i) => (
                <div
                  key={i}
                  className="flex-shrink-0 w-20 h-20 sm:w-24 sm:h-24 rounded-xl border-2 flex items-center justify-center snap-start"
                  style={{
                    background: brand?.color_secondary || "#FDFBF7",
                    borderColor: brand?.color_primary || "#0B3D2E",
                  }}
                >
                  <div className="text-center" style={{ color: brand?.color_primary || "#0B3D2E" }}>
                    <div className="text-xl font-heading font-bold">{i + 1}</div>
                    <div className="text-[9px] uppercase tracking-wider opacity-60">slide</div>
                  </div>
                </div>
              ))}
            </div>
            <div className="text-[10px] text-stone-400 text-center mt-2 flex items-center justify-center gap-1">
              <ArrowsHorizontal size={11} /> swipe untuk lihat semua
            </div>
          </div>

          {/* Director summary */}
          <div className="feedify-card p-4 space-y-2.5">
            <div className="text-xs uppercase tracking-[0.18em] text-brand-light font-bold">Feedify Director Setting</div>
            <DirectorSummaryRow label="Mode"     value={DIRECTOR_MODES.find(m => m.id === form.ai_director_mode)?.name || "Smart"} />
            <DirectorSummaryRow label="Visual"   value={VISUAL_TYPES.find(v => v.id === form.visual_type)?.name || "-"} />
            <DirectorSummaryRow label="Photo"    value={PHOTO_STYLES.find(p => p.id === form.photo_style)?.name || "-"} />
            <DirectorSummaryRow label="Priority" value={VISUAL_PRIORITIES.find(p => p.id === form.visual_priority)?.name || "-"} />
            {(() => {
              const hm = VISUAL_HUMAN_MODE[form.visual_type];
              const enabled = hm === "required" || (hm === "optional" && form.mixed_allow_human);
              if (!enabled) return <DirectorSummaryRow label="Model" value="None" />;
              const parts = [form.model_gender, form.model_ethnicity, form.model_age]
                .filter(v => v && v !== "auto")
                .map(v => MODEL_AGES.find(a => a.id === v)?.name || v);
              return <DirectorSummaryRow label="Model" value={parts.length ? parts.join(" · ") : "Auto"} />;
            })()}
          </div>

          <BrandDnaCard />
        </div>
      </div>

      {/* ── Progressive Result Section ─────────────────────────────────────── */}
      {hasAnySlide && (
        <div id="carousel-result" className="space-y-4 animate-fade-up">

          {/* Header */}
          <div className="flex items-start gap-3 min-w-0">
            <div className="flex-shrink-0 mt-0.5">
              {generating
                ? <CircleNotch size={22} className="animate-spin text-brand" />
                : <CheckCircle size={22} weight="fill" className="text-green-600" />}
            </div>
            <div className="min-w-0">
              <h2 className="font-heading text-lg sm:text-xl font-bold text-brand break-words">
                {generating
                  ? genPhase || "Generating..."
                  : `${slideImages.filter(Boolean).length} dari ${totalSlides} Slide Selesai`}
              </h2>
              {generating && (
                <p className="text-xs text-stone-400 mt-0.5">
                  Slide berikutnya akan muncul otomatis saat selesai
                </p>
              )}
            </div>
          </div>

          {/* Slide Status Strip */}
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1" data-testid="slide-tabs">
            {Array.from({ length: totalSlides }).map((_, i) => {
              const status = slideStatuses[i] || "waiting";
              const img    = slideImages[i];
              const role   = slideRoles[i] || "";
              const isActive = selectedSlide === i;

              return (
                <button
                  key={i}
                  onClick={() => img && setSelectedSlide(i)}
                  data-testid={`slide-tab-${i}`}
                  disabled={!img}
                  className={`flex-shrink-0 w-20 h-20 rounded-xl border-2 overflow-hidden transition-all relative
                    ${isActive && img ? "border-brand scale-105 ring-2 ring-brand-gold" : "border-stone-200"}
                    ${!img ? "cursor-default" : "cursor-pointer"}`}
                >
                  {img ? (
                    <img src={`data:image/png;base64,${img}`} alt={`slide ${i+1}`} className="h-full w-full object-cover" />
                  ) : (
                    <div className="h-full w-full flex flex-col items-center justify-center bg-stone-50 gap-1">
                      <SlideStatusIcon status={status} />
                      <span className="text-[9px] text-stone-400 font-medium uppercase tracking-wide">{status}</span>
                    </div>
                  )}
                  {/* Slide number badge */}
                  <div className="absolute top-1 left-1 bg-brand/80 text-white text-[9px] font-bold px-1 rounded">
                    {i + 1}
                  </div>
                  {status === "completed" && !isActive && (
                    <div className="absolute inset-0 bg-brand/0 hover:bg-brand/10 transition-colors" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Active Slide Preview */}
          {slideImages[selectedSlide] && (
            <div className="feedify-card p-4 sm:p-5" data-testid="active-slide-preview">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
                <div className="font-heading font-bold text-brand capitalize">
                  Slide {selectedSlide + 1}
                  {slideRoles[selectedSlide] && <span className="text-stone-400 font-normal"> · {slideRoles[selectedSlide]}</span>}
                </div>
                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={() => downloadSlide(selectedSlide)}
                    data-testid={`download-slide-${selectedSlide}`}
                    className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1 px-3 py-1.5 bg-brand text-brand-cream rounded-full text-xs font-semibold hover:bg-brand-light"
                  >
                    <DownloadSimple size={12} weight="bold" /> Download
                  </button>
                  <button
                    onClick={() => regenerateSlide(selectedSlide)}
                    disabled={regeneratingSlide === selectedSlide || generating}
                    data-testid={`regenerate-slide-${selectedSlide}`}
                    className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1 px-3 py-1.5 bg-brand-gold text-brand rounded-full text-xs font-semibold hover:opacity-80 disabled:opacity-50"
                  >
                    {regeneratingSlide === selectedSlide
                      ? <CircleNotch size={12} className="animate-spin" />
                      : <ArrowsClockwise size={12} weight="bold" />}
                    Regenerate (1 kredit)
                  </button>
                </div>
              </div>
              <div className="aspect-square sm:aspect-[4/5] max-w-md mx-auto rounded-2xl overflow-hidden border-2 border-brand">
                <img
                  src={`data:image/png;base64,${slideImages[selectedSlide]}`}
                  alt=""
                  className="h-full w-full object-cover"
                  data-testid="active-slide-image"
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Caption Bundle */}
      {(generatingCaptions || captions) && (
        <div className="animate-fade-up space-y-4" data-testid="carousel-caption-bundle">
          <div className="flex items-center gap-2">
            <ChatCircle size={22} weight="duotone" className="text-brand" />
            <h2 className="font-heading text-xl font-bold text-brand">Caption Bundle</h2>
            {generatingCaptions && <CircleNotch size={16} className="animate-spin text-brand-light" />}
          </div>
          {captions && (
            <>
              <div className="grid sm:grid-cols-2 gap-3">
                {(captions.captions || []).map((c, i) => (
                  <div key={i} className="feedify-card p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <div className="font-heading text-sm font-bold text-brand">{c.style}</div>
                        <div className="text-[10px] text-stone-500">{c.label}</div>
                      </div>
                      <CopyBtn text={c.text} />
                    </div>
                    <p className="text-sm text-stone-700 leading-relaxed">{c.text}</p>
                  </div>
                ))}
              </div>
              {captions.hashtags?.length > 0 && (
                <div className="feedify-card p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5">
                      <Hash size={14} weight="bold" className="text-brand-light" />
                      <span className="text-xs uppercase tracking-[0.15em] text-brand-light font-semibold">Hashtags</span>
                    </div>
                    <CopyBtn text={captions.hashtags.join(" ")} label="Copy semua" />
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {captions.hashtags.map((h, i) => (
                      <span key={i} className="px-2.5 py-1 bg-brand-sand rounded-full text-xs font-medium text-brand">{h}</span>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {ratioPreviewOpen && createPortal(
        <div className="fixed inset-0 z-[100] bg-brand/40 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 animate-backdrop-fade"
          data-testid="carousel-ratio-preview-modal" onClick={() => setRatioPreviewOpen(false)}>
          <div onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl max-w-sm sm:max-w-xl w-full p-7 sm:p-10 animate-sheet-up">
            <div className="flex items-start justify-between mb-5 sm:mb-7">
              <div>
                <h3 className="font-heading text-lg sm:text-2xl font-bold text-brand tracking-tight">Preview Carousel</h3>
                <p className="text-sm text-stone-500 mt-0.5">{form.aspect_ratio.split(" ")[0]} · {form.slide_count} slide</p>
              </div>
              <button onClick={() => setRatioPreviewOpen(false)} data-testid="close-carousel-ratio-preview"
                className="h-9 w-9 rounded-full bg-brand-sand hover:bg-brand-gold/30 text-brand flex items-center justify-center flex-shrink-0">
                <X size={16} weight="bold" />
              </button>
            </div>
            <div className="bg-brand-sand/30 rounded-2xl p-4 sm:p-8">
              <CarouselWireframe ratio={form.aspect_ratio} slideCount={form.slide_count} />
            </div>
          </div>
        </div>,
        document.body
      )}

      <NoCreditsModal open={noCredits} onClose={() => setNoCredits(false)} />
      <InspirationGallery
        open={galleryOpen}
        onClose={() => setGalleryOpen(false)}
        context="carousel"
        onSelect={(photo) => {
          fetch(`/gallery/${photo.category}/${photo.filename}`)
            .then((r) => r.blob())
            .then((blob) => {
              const reader = new FileReader();
              reader.onload = () => setReferenceImg(reader.result);
              reader.readAsDataURL(blob);
            });
        }}
      />
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SlidePromptCard({ index, slide }) {
  const [copied, setCopied] = useState(false);
  const prompt = slide.natural_prompt || "";
  const copy = () => {
    navigator.clipboard.writeText(prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="feedify-card p-4 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-brand text-white text-xs font-bold flex items-center justify-center">{index + 1}</span>
          <span className="font-semibold text-brand capitalize text-sm">{slide.slide_role || `Slide ${index + 1}`}</span>
        </div>
        <button
          onClick={copy}
          className="inline-flex items-center gap-1 px-3 py-1 bg-brand-gold text-brand rounded-full text-xs font-semibold hover:opacity-80 transition-all"
        >
          {copied ? <><Check size={12} weight="bold" /> Copied!</> : <><Copy size={12} weight="bold" /> Copy Prompt</>}
        </button>
      </div>
      <p className="text-xs text-stone-600 leading-relaxed bg-stone-50 rounded-xl p-3 font-mono whitespace-pre-wrap">{prompt}</p>
    </div>
  );
}

function SlideStatusIcon({ status }) {
  switch (status) {
    case "generating": return <CircleNotch size={20} className="animate-spin text-brand" />;
    case "completed":  return <CheckCircle size={20} weight="fill" className="text-green-500" />;
    case "failed":     return <WarningCircle size={20} weight="fill" className="text-red-400" />;
    case "waiting":
    default:           return <HourglassMedium size={20} className="text-stone-300" />;
  }
}

function SectionCard({ num, title, icon, children }) {
  return (
    <div className="feedify-card p-5 sm:p-6 space-y-4">
      <div className="flex items-center gap-2.5">
        <span className="text-[10px] font-bold text-brand-light font-mono">{num}</span>
        <div className="text-brand">{icon}</div>
        <h3 className="font-heading text-base font-bold text-brand">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function DirectorSummaryRow({ label, value }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-stone-400">{label}</span>
      <span className="text-xs font-semibold text-stone-700 text-right max-w-[55%] truncate">{value}</span>
    </div>
  );
}

function CopyBtn({ text, label }) {
  const [copied, setCopied] = useState(false);
  const handle = async () => {
    try { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch {}
  };
  return (
    <button onClick={handle} className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-brand hover:bg-brand-sand rounded-full flex-shrink-0">
      {copied ? <Check size={12} weight="bold" /> : <Copy size={12} weight="bold" />}
      {label || (copied ? "OK" : "Copy")}
    </button>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label className="text-xs font-semibold uppercase tracking-[0.15em] text-stone-400 mb-2 block">{label}</label>
      {children}
    </div>
  );
}

// ── Carousel Wireframe Previews ───────────────────────────────────────────────
// Center slide has FIXED HEIGHT, width varies by ratio so shape difference is obvious.
// SVG viewBox width varies → when rendered at w-full, 9:16 appears tallest.

function CarouselWireframe({ ratio, slideCount }) {
  const is916 = ratio.startsWith("9:16");
  const is45  = ratio.startsWith("4:5");

  // Center slide: height fixed at 100, width by ratio
  const CH = 100;
  const CW = is916 ? 56 : is45 ? 80 : CH; // 9:16=56, 4:5=80, 1:1=100

  // Side slides: same ratio, 62% size
  const SH = Math.round(CH * 0.62);
  const SW = Math.round(CW * 0.62);

  const GAP = 10, PAD_X = 16, PAD_Y = 14, DOTS_H = 20;
  const totalW = SW + GAP + CW + GAP + SW;
  const vbW = totalW + PAD_X * 2;
  const vbH = PAD_Y + CH + DOTS_H + PAD_Y; // top gap + slides + dots room + bottom gap

  const sx1X = PAD_X;
  const cX   = sx1X + SW + GAP;
  const sx2X = cX + CW + GAP;
  const cY    = PAD_Y;
  const sideY = PAD_Y + (CH - SH) / 2; // vertically centre side slides

  const dotCount = Math.min(slideCount, 6);

  return (
    <svg viewBox={`0 0 ${vbW} ${vbH}`} className="w-full">
      {/* Side slide 1 */}
      <WireSlide x={sx1X} y={sideY} w={SW} h={SH} active={false} />
      {/* Center slide */}
      <WireSlide x={cX} y={cY} w={CW} h={CH} active={true} />
      {/* Center border highlight */}
      <rect x={cX - 1.5} y={cY - 1.5} width={CW + 3} height={CH + 3} rx={5}
        fill="none" stroke="#0B3D2E" strokeWidth={2} />
      {/* Side slide 2 */}
      <WireSlide x={sx2X} y={sideY} w={SW} h={SH} active={false} />
      {/* Nav dots */}
      <g transform={`translate(${cX + CW / 2 - (dotCount - 1) * 4.5}, ${cY + CH + 10})`}>
        {Array.from({ length: dotCount }).map((_, i) => (
          <circle key={i} cx={i * 9} cy={0} r={i === 1 ? 3 : 2}
            fill={i === 1 ? "#0B3D2E" : "#C8D0C4"} />
        ))}
      </g>
    </svg>
  );
}

function WireSlide({ x, y, w, h, active }) {
  const imgH = h * 0.6;
  const pad  = w * 0.12;
  return (
    <g opacity={active ? 1 : 0.55}>
      {/* Image zone */}
      <rect x={x} y={y} width={w} height={imgH} rx={active ? 4 : 3}
        fill={active ? "#1C4A32" : "#C8D0C4"} />
      {/* Gold top accent on active */}
      {active && <rect x={x} y={y} width={w * 0.4} height={3} rx={1.5} fill="#E5C158" />}
      {/* Text zone */}
      <rect x={x} y={y + imgH} width={w} height={h - imgH} rx={active ? 4 : 3}
        fill={active ? "#FDFBF7" : "#EDEEE9"} />
      {/* Headline bar */}
      <rect x={x + pad} y={y + imgH + h * 0.08} width={w * 0.72} height={active ? 4 : 3} rx={2}
        fill={active ? "#1A2E22" : "#A8B0A4"} />
      {/* Subtext bar */}
      <rect x={x + pad} y={y + imgH + h * 0.2} width={w * 0.52} height={active ? 3 : 2} rx={1.5}
        fill={active ? "#7A8A7D" : "#C4CAC0"} />
      {/* CTA pill (active only) */}
      {active && h > 60 && (
        <rect x={x + pad} y={y + imgH + h * 0.34} width={w * 0.5} height={Math.max(6, h * 0.1)} rx={3}
          fill="#E5C158" />
      )}
    </g>
  );
}
