import { useEffect, useState, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import api from "@/lib/api";
import { toast } from 'react-toastify';
import { handleGenerateError } from "@/lib/moderation";
import { useAuth } from "@/context/AuthContext";
import {
  Stack, Sparkle, CircleNotch, CheckCircle, ArrowsHorizontal, ArrowsClockwise,
  DownloadSimple, ChatCircle, Copy, Check, Hash, Images, Camera, Users,
  Person, GridFour, Lightning, Sliders, CaretDown, CaretUp,
  Package, BookOpen, Palette, WarningCircle, HourglassMedium, Eye, X,
  TextAlignLeft, Star, MagicWand, RocketLaunch
} from "@phosphor-icons/react";
import BrandDnaCard from "@/components/BrandDnaCard";
import NoCreditsModal from "@/components/NoCreditsModal";
import ReferenceUpload from "@/components/ReferenceUpload";
import InspirationGallery from "@/components/InspirationGallery";
import { notifyCreditsUpdate } from "@/lib/credits";

// ── Constants ──────────────────────────────────────────────────────────────────

const CONTENT_TYPES = [
  { id: "carousel_edukasi", name: "Carousel Edukasi", icon: "📚", template: "listicle",         goal: "edukasi" },
  { id: "carousel_promo",   name: "Carousel Promo",   icon: "🎯", template: "problem-solution", goal: "promo" },
  { id: "storytelling",     name: "Storytelling",     icon: "✨", template: "story",             goal: "brand_awareness" },
  { id: "testimoni",        name: "Testimoni",        icon: "💬", template: "testimonial",       goal: "testimoni" },
  { id: "tips",             name: "Tips",             icon: "💡", template: "listicle",          goal: "edukasi" },
  { id: "launch",           name: "Launch",           icon: "🚀", template: "problem-solution",  goal: "launch" },
];

const VISUAL_STYLES = [
  { id: "auto",      name: "Auto",      desc: "Feedify Pilih",    preset: "Minimal Clean",    recommended: true },
  { id: "clean",     name: "Clean",     desc: "Minimalis modern", preset: "Minimal Clean" },
  { id: "korean",    name: "Korean",    desc: "Soft & aesthetic", preset: "Minimal Korean" },
  { id: "luxury",    name: "Luxury",    desc: "Editorial premium",preset: "Luxury Editorial" },
  { id: "editorial", name: "Editorial", desc: "Bold & graphic",   preset: "Editorial Bold" },
  { id: "dark",      name: "Dark",      desc: "Moody & dramatic", preset: "Dark Moody" },
];

const PHOTO_TYPES = [
  { id: "auto",          name: "Auto",            visual_type: "human_product",  human: "optional" },
  { id: "product_only",  name: "Product Only",    visual_type: "product_only",   human: "none" },
  { id: "human_product", name: "Product + Model", visual_type: "human_product",  human: "required" },
  { id: "lifestyle",     name: "Lifestyle",       visual_type: "human_only",     human: "required" },
  { id: "graphic",       name: "Graphic Design",  visual_type: "graphic_design", human: "none" },
];

const QUICK_CHIPS = [
  { label: "Promo",          text: "Saya ingin membuat carousel promo untuk produk saya. Tampilkan keunggulan produk, harga terbaik, dan ajak order lewat WhatsApp." },
  { label: "Edukasi",        text: "Saya ingin membuat carousel edukasi tentang [topik]. Jelaskan secara simpel dan menarik untuk target audiens saya." },
  { label: "Tips",           text: "Saya ingin carousel tips praktis tentang [topik]. Buat setiap tip singkat, actionable, dan mudah dipahami." },
  { label: "Before After",   text: "Saya ingin carousel before after penggunaan produk saya. Tunjukkan transformasi nyata dan testimonial hasil." },
  { label: "Story Brand",    text: "Saya ingin storytelling tentang perjalanan brand kami. Ceritakan asal-usul, nilai, dan kenapa kami berbeda." },
  { label: "Soft Selling",   text: "Saya ingin konten soft selling — edukasi dulu, bangun kepercayaan, lalu secara halus ajak beli di akhir." },
  { label: "Hard Selling",   text: "Saya ingin konten hard selling — langsung ke value proposition, harga, dan strong CTA untuk beli sekarang." },
  { label: "Product Launch", text: "Saya mau launch produk baru! Bangun excitement, perkenalkan fitur unggulan, dan ajak pre-order atau follow." },
  { label: "FAQ",            text: "Saya ingin carousel FAQ — jawab pertanyaan yang paling sering ditanya customer tentang produk saya." },
  { label: "Myth vs Fact",   text: "Saya ingin carousel Myth vs Fact tentang [topik]. Luruskan misconception dan edukasi audiens dengan fakta." },
];

const ASPECT_RATIOS = ["1:1 (Square Feed)", "4:5 (Portrait Feed)", "9:16 (Story/Reels)"];

// Advanced-mode extras (hidden by default)
const MODEL_GENDERS     = [{ id:"auto",name:"Auto" },{ id:"female",name:"Female" },{ id:"male",name:"Male" }];
const MODEL_ETHNICITIES = [{ id:"auto",name:"Auto" },{ id:"indonesian",name:"Indonesian" },{ id:"asian",name:"Asian" },{ id:"korean",name:"Korean" },{ id:"western",name:"Western" }];
const MODEL_AGES        = [{ id:"teen",name:"Teen (15–19)" },{ id:"young_adult",name:"Young Adult (20–30)" },{ id:"adult",name:"Adult (30–45)" },{ id:"mature",name:"Mature (45+)" }];
const MODEL_FASHION     = [{ id:"auto",name:"Auto" },{ id:"casual",name:"Casual" },{ id:"smart_casual",name:"Smart Casual" },{ id:"editorial",name:"Editorial" },{ id:"luxury",name:"Luxury" }];
const MODEL_EXPRESSIONS = [{ id:"auto",name:"Auto" },{ id:"confident",name:"Confident" },{ id:"warm_smile",name:"Warm Smile" },{ id:"natural",name:"Natural" }];
const MODEL_INTERACTIONS= [{ id:"auto",name:"Auto" },{ id:"holding",name:"Holding" },{ id:"applying",name:"Applying" },{ id:"showcase",name:"Showcasing" }];
const VISUAL_PRIORITIES = [{ id:"product_first",name:"Product First" },{ id:"balanced",name:"Balanced" },{ id:"human_first",name:"Human First" }];

const SLIDE_ROLES_MAP = {
  carousel_edukasi: ["Cover", "Insight 1", "Insight 2", "Insight 3", "Insight 4", "Insight 5", "CTA"],
  carousel_promo:   ["Hook", "Problem", "Solution", "Promo", "Value", "Urgency", "CTA"],
  storytelling:     ["Intro", "Konteks", "Tantangan", "Turning Point", "Hasil", "Pesan", "CTA"],
  testimoni:        ["Hook", "Testimoni 1", "Testimoni 2", "Testimoni 3", "Social Proof", "Value", "CTA"],
  tips:             ["Cover", "Tip 1", "Tip 2", "Tip 3", "Tip 4", "Tip 5", "CTA"],
  launch:           ["Teaser", "Announcement", "Feature 1", "Feature 2", "Benefit", "Promo", "CTA"],
};

const DEFAULT_FORM = {
  describe:      "",
  content_type:  "carousel_edukasi",
  brand_name:    "",
  product_name:  "",
  slide_count:   5,
  aspect_ratio:  "1:1 (Square Feed)",
  visual_style:  "auto",
  photo_type:    "auto",
  // Advanced
  model_gender:       "auto",
  model_ethnicity:    "auto",
  model_age:          "young_adult",
  model_fashion:      "auto",
  model_expression:   "auto",
  model_interaction:  "auto",
  visual_priority:    "balanced",
  mood_override:      "",
  lighting_override:  "",
  composition_override:    "",
  camera_style_override:   "",
};

// ── Smart Summary Parser ───────────────────────────────────────────────────────

function parseDescribe(text, contentType) {
  if (!text.trim()) return null;
  const lower = text.toLowerCase();
  const result = {};

  const prodMatch = text.match(/(?:jual|produk|brand|product)\s+([^\.\,\n]{3,35})/i);
  if (prodMatch) result.product = prodMatch[1].trim();

  let aud = [];
  if (/wanita|perempuan|ibu|cewek/i.test(lower)) aud.push("Wanita");
  else if (/pria|laki-laki|cowok/i.test(lower)) aud.push("Pria");
  const ageM = text.match(/usia\s+(\d+[\s–\-]+\d+)/i);
  if (ageM) aud.push(ageM[1].replace(/\s/g, ""));
  if (aud.length) result.audience = aud.join(", ");

  if (/whatsapp|wa\.me|\bwa\b/i.test(lower)) result.cta = "Order via WhatsApp";
  else if (/shopee|tokopedia|marketplace/i.test(lower)) result.cta = "Beli di Marketplace";
  else if (/follow.*ig|instagram/i.test(lower)) result.cta = "Follow Instagram";
  else if (/link bio/i.test(lower)) result.cta = "Klik Link Bio";

  if (/premium|luxury|mewah/i.test(lower)) result.tone = "Premium";
  else if (/clean|minimalis/i.test(lower)) result.tone = "Clean Minimal";
  else if (/fun|playful|lucu/i.test(lower)) result.tone = "Fun & Playful";
  else if (/casual|santai/i.test(lower)) result.tone = "Casual";

  result.contentLabel = CONTENT_TYPES.find(c => c.id === contentType)?.name;
  return result;
}

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
  const [slideStatuses, setSlideStatuses] = useState([]);
  const [slideImages, setSlideImages] = useState([]);
  const [slideRoles, setSlideRoles] = useState([]);
  const [genPhase, setGenPhase] = useState("");
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
      if (data?.brand_name) upd("brand_name", data.brand_name);
    }).catch(() => {});
  }, []);

  const smartSummary = useMemo(() => parseDescribe(form.describe, form.content_type), [form.describe, form.content_type]);

  const buildPayload = () => {
    const ct = CONTENT_TYPES.find(c => c.id === form.content_type) || CONTENT_TYPES[0];
    const vs = VISUAL_STYLES.find(s => s.id === form.visual_style) || VISUAL_STYLES[0];
    const pt = PHOTO_TYPES.find(p => p.id === form.photo_type) || PHOTO_TYPES[0];

    return {
      topic: form.describe,
      target_audience: smartSummary?.audience || "sesuai deskripsi",
      content_goal: ct.goal,
      campaign_goal: ct.goal,
      final_cta: smartSummary?.cta || "",
      call_to_action: smartSummary?.cta || "",
      template: ct.template,
      brand_name: form.brand_name,
      product_name: form.product_name,
      slide_count: form.slide_count,
      aspect_ratio: form.aspect_ratio,
      visual_type: pt.visual_type,
      photo_style: "auto",
      style_preset: vs.preset,
      visual_priority: form.visual_priority,
      ai_director_mode: "smart",
      human_enabled: pt.human === "required" || pt.human === "optional",
      human_mode: pt.human,
      talent_gender:     form.model_gender,
      talent_ethnicity:  form.model_ethnicity,
      talent_age_group:  form.model_age,
      model_fashion:     form.model_fashion,
      model_expression:  form.model_expression,
      model_interaction: form.model_interaction,
      mood_override:        form.mood_override,
      lighting_override:    form.lighting_override,
      composition_override: form.composition_override,
      camera_style_override:form.camera_style_override,
      mixed_allow_human: true,
      save: true,
      ...(referenceImg ? { reference_image_base64: referenceImg.split(",")[1] } : {}),
    };
  };

  const validate = () => {
    if (!form.describe.trim()) { toast.error("Ceritakan dulu carousel-mu di kolom utama"); return false; }
    return true;
  };

  const generateCaptions = async () => {
    setGeneratingCaptions(true);
    setCaptions(null);
    try {
      const { data } = await api.post("/prompt/generate-caption-bundle", {
        product_name: form.product_name || brand?.brand_name || "",
        headline: form.describe.slice(0, 80),
        target_audience: smartSummary?.audience || "",
        platform: "instagram",
        content_purpose: "soft_selling",
      });
      if (!data.error) setCaptions(data);
    } catch {}
    finally { setGeneratingCaptions(false); }
  };

  const generate = async () => {
    if (!validate()) return;
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
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
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
        buffer = lines.pop();

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
              setTimeout(() => document.getElementById("carousel-result")?.scrollIntoView({ behavior: "smooth" }), 200);
              break;
            case "slide_start":
              setGenPhase(`Generating Slide ${evt.index + 1} of ${evt.total} — ${evt.role}...`);
              setSlideStatuses(prev => { const n = [...prev]; n[evt.index] = "generating"; return n; });
              break;
            case "slide_retry":
              setGenPhase(`Slide ${evt.index + 1}: retry attempt ${evt.attempt}...`);
              break;
            case "slide_complete":
              setSlideImages(prev => { const n = [...prev]; n[evt.index] = evt.image_base64; return n; });
              setSlideStatuses(prev => { const n = [...prev]; n[evt.index] = "completed"; return n; });
              setSelectedSlide(s => (s === 0 && evt.index === 0) ? 0 : s === evt.index - 1 ? evt.index : s);
              setGenPhase(`Slide ${evt.index + 1} selesai ✓`);
              break;
            case "slide_failed":
              setSlideStatuses(prev => { const n = [...prev]; n[evt.index] = "failed"; return n; });
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
            default: break;
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

  // Slide roles for storyboard preview
  const storyboardRoles = useMemo(() => {
    const roleList = SLIDE_ROLES_MAP[form.content_type] || SLIDE_ROLES_MAP.carousel_edukasi;
    return Array.from({ length: form.slide_count }).map((_, i) => {
      if (i === form.slide_count - 1) return "CTA";
      return roleList[i] || `Slide ${i + 1}`;
    });
  }, [form.content_type, form.slide_count]);

  return (
    <div className="space-y-6" data-testid="carousel-generator-page">
      {/* Header */}
      <div className="animate-fade-up min-w-0">
        <h1 className="font-heading text-2xl sm:text-3xl font-bold text-brand tracking-tight">Carousel Builder</h1>
        <p className="text-stone-500 mt-1 text-sm">
          Ceritakan idemu — Feedify jadi Creative Director-nya.
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6 min-w-0">
        {/* ── Left: Form ──────────────────────────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-4 animate-fade-up min-w-0">

          {/* SECTION 1 — Main describe input */}
          <div className="feedify-card p-5 sm:p-6 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-brand flex items-center justify-center flex-shrink-0 mt-0.5">
                <TextAlignLeft size={16} weight="fill" className="text-brand-cream" />
              </div>
              <div>
                <h3 className="font-heading text-base font-bold text-brand">Ceritakan Carousel Kamu</h3>
                <p className="text-xs text-stone-400 mt-0.5">Jelaskan idemu — Feedify yang urus sisanya</p>
              </div>
            </div>

            <textarea
              data-testid="carousel-describe"
              value={form.describe}
              onChange={(e) => upd("describe", e.target.value)}
              placeholder={`Contoh:\n\nAku jual body lotion premium.\nAku ingin membuat carousel edukasi tentang kenapa body lotion lebih efektif dipakai malam hari.\nTarget wanita usia 20–35 tahun.\nTone clean premium.\nDi akhir ajak order lewat WhatsApp.`}
              rows={6}
              className="input resize-none text-sm leading-relaxed w-full"
            />

            {/* Quick chips */}
            <div>
              <div className="text-[10px] uppercase tracking-[0.15em] text-stone-400 font-semibold mb-2">Mulai dari template</div>
              <div className="flex flex-wrap gap-1.5">
                {QUICK_CHIPS.map((chip) => (
                  <button
                    key={chip.label}
                    type="button"
                    data-testid={`chip-${chip.label.toLowerCase().replace(/\s+/g,"-")}`}
                    onClick={() => upd("describe", chip.text)}
                    className="px-3 py-1.5 rounded-full text-[11px] font-semibold border border-stone-200 bg-white text-stone-600 hover:border-brand/40 hover:bg-brand-sand hover:text-brand transition-all"
                  >
                    {chip.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* SECTION 2 — Content Type */}
          <div className="feedify-card p-5 sm:p-6 space-y-3">
            <div className="flex items-center gap-2">
              <Star size={16} weight="duotone" className="text-brand" />
              <h3 className="font-heading text-base font-bold text-brand">Tipe Konten</h3>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {CONTENT_TYPES.map((ct) => (
                <button
                  key={ct.id}
                  type="button"
                  data-testid={`content-type-${ct.id}`}
                  onClick={() => upd("content_type", ct.id)}
                  className={`flex items-center gap-2.5 px-3 py-3 rounded-xl border-2 text-left transition-all ${
                    form.content_type === ct.id
                      ? "border-brand bg-brand-sand"
                      : "border-stone-100 bg-white hover:border-brand/30"
                  }`}
                >
                  <span className="text-lg flex-shrink-0">{ct.icon}</span>
                  <span className={`text-xs font-bold leading-tight ${form.content_type === ct.id ? "text-brand" : "text-stone-700"}`}>
                    {ct.name}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* SECTION 3 — Brand & Produk */}
          <div className="feedify-card p-5 sm:p-6 space-y-4">
            <div className="flex items-center gap-2">
              <Package size={16} weight="duotone" className="text-brand" />
              <h3 className="font-heading text-base font-bold text-brand">Brand & Produk</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-[0.15em] text-stone-400 mb-1.5 block">Brand Name</label>
                <input
                  type="text"
                  data-testid="carousel-brand-name"
                  value={form.brand_name}
                  onChange={(e) => upd("brand_name", e.target.value)}
                  className="input"
                  placeholder="mis. Voyoa, Green Teaa..."
                />
                {brand?.brand_name && form.brand_name === brand.brand_name && (
                  <p className="text-[11px] text-stone-400 mt-1">Dari <span className="text-brand font-semibold">Brand Profile</span></p>
                )}
              </div>
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-[0.15em] text-stone-400 mb-1.5 block">Product Name <span className="normal-case font-normal">(opsional)</span></label>
                <input
                  type="text"
                  data-testid="carousel-product"
                  value={form.product_name}
                  onChange={(e) => upd("product_name", e.target.value)}
                  className="input"
                  placeholder="mis. Sunscreen SPF 50+..."
                />
              </div>
            </div>
          </div>

          {/* SECTION 4 — Visual & Slides */}
          <div className="feedify-card p-5 sm:p-6 space-y-5">
            <div className="flex items-center gap-2">
              <Palette size={16} weight="duotone" className="text-brand" />
              <h3 className="font-heading text-base font-bold text-brand">Visual & Slide</h3>
            </div>

            {/* Visual Style */}
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-[0.15em] text-stone-400 mb-2 block">Visual Style</label>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {VISUAL_STYLES.map((vs) => (
                  <button
                    key={vs.id}
                    type="button"
                    data-testid={`visual-style-${vs.id}`}
                    onClick={() => upd("visual_style", vs.id)}
                    className={`relative flex flex-col items-center gap-1 px-2 py-2.5 rounded-xl border-2 transition-all text-center ${
                      form.visual_style === vs.id
                        ? "border-brand bg-brand-sand"
                        : "border-stone-100 bg-white hover:border-brand/30"
                    }`}
                  >
                    {vs.recommended && (
                      <span className="absolute -top-2 left-1/2 -translate-x-1/2 text-[8px] bg-brand-gold text-brand font-bold px-1.5 py-0.5 rounded-full whitespace-nowrap">
                        Rekomen
                      </span>
                    )}
                    <span className={`text-xs font-bold leading-tight ${form.visual_style === vs.id ? "text-brand" : "text-stone-700"}`}>{vs.name}</span>
                    <span className="text-[9px] text-stone-400 leading-tight">{vs.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Photo Type */}
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-[0.15em] text-stone-400 mb-2 block">Photo Type</label>
              <div className="flex flex-wrap gap-2">
                {PHOTO_TYPES.map((pt) => (
                  <button
                    key={pt.id}
                    type="button"
                    data-testid={`photo-type-${pt.id}`}
                    onClick={() => upd("photo_type", pt.id)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                      form.photo_type === pt.id
                        ? "bg-brand text-brand-cream border-brand"
                        : "bg-white border-stone-200 text-stone-600 hover:border-brand/30"
                    }`}
                  >
                    {pt.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Slide Count + Aspect Ratio */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-[0.15em] text-stone-400 mb-2 block">Jumlah Slide</label>
                <div className="flex gap-1.5">
                  {[3, 4, 5, 6, 7].map((n) => (
                    <button
                      key={n}
                      type="button"
                      data-testid={`slide-count-${n}`}
                      onClick={() => upd("slide_count", n)}
                      className={`flex-1 min-w-0 py-2.5 rounded-xl border-2 font-heading font-bold text-sm transition-all ${
                        form.slide_count === n
                          ? "border-brand bg-brand text-brand-cream"
                          : "border-stone-100 text-stone-600 hover:border-brand/30"
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
                <p className="text-[11px] text-stone-400 mt-1">{form.slide_count} kredit per generate</p>
              </div>

              <div>
                <label className="text-[11px] font-semibold uppercase tracking-[0.15em] text-stone-400 mb-2 block">Aspect Ratio</label>
                <div className="grid grid-cols-3 gap-2">
                  {ASPECT_RATIOS.map((r) => {
                    const active = form.aspect_ratio === r;
                    const key0 = r.split(" ")[0];
                    const boxCls = key0 === "1:1" ? "w-[18px] h-[18px]" : key0 === "4:5" ? "w-[14px] h-[18px]" : "w-[10px] h-[18px]";
                    return (
                      <button
                        key={r}
                        type="button"
                        data-testid={`carousel-ratio-${key0}`}
                        onClick={() => upd("aspect_ratio", r)}
                        className={`flex flex-col items-center gap-1.5 px-1 py-2.5 rounded-xl border-2 transition-all ${
                          active ? "bg-brand border-brand text-brand-cream" : "bg-white border-stone-200 text-stone-600 hover:border-stone-300"
                        }`}
                      >
                        <div className={`${boxCls} rounded-sm border-2 flex-shrink-0 ${active ? "border-brand-gold bg-brand-gold/30" : "border-stone-400 bg-stone-100"}`} />
                        <span className="text-[10px] font-bold tracking-tight leading-none">{key0}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 5 — Reference Image */}
          <div className="feedify-card p-5 sm:p-6 space-y-4">
            <div className="flex items-center gap-2">
              <Images size={16} weight="duotone" className="text-brand" />
              <h3 className="font-heading text-base font-bold text-brand">Referensi Visual</h3>
            </div>
            <p className="text-xs text-stone-500 -mt-1">
              Feedify akan ikuti gaya visualnya dan sesuaikan dengan brand kamu.
            </p>

            <ReferenceUpload value={referenceImg} onChange={setReferenceImg} testid="carousel-reference" />

            <button
              type="button"
              onClick={() => setGalleryOpen(true)}
              data-testid="carousel-gallery-btn"
              className="w-full flex items-center justify-center gap-2 py-2.5 border border-dashed border-brand-sand rounded-xl text-sm font-semibold text-brand-light hover:border-brand hover:text-brand hover:bg-brand-sand/40 transition-all"
            >
              <Images size={16} weight="duotone" />
              Pilih dari Gallery Inspirasi
            </button>
          </div>

          {/* SECTION 6 — Advanced Settings (collapsed) */}
          <div className="feedify-card overflow-hidden">
            <button
              type="button"
              data-testid="toggle-advanced"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="w-full flex items-center justify-between p-5 text-left hover:bg-stone-50 transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <Sliders size={16} weight="duotone" className="text-stone-400" />
                <span className="text-sm font-semibold text-stone-600">Advanced Settings</span>
                <span className="text-[10px] bg-stone-100 text-stone-500 px-2 py-0.5 rounded-full font-medium">Opsional</span>
              </div>
              {showAdvanced ? <CaretUp size={14} className="text-stone-400" /> : <CaretDown size={14} className="text-stone-400" />}
            </button>

            {showAdvanced && (
              <div className="px-5 pb-5 space-y-5 animate-fade-up border-t border-stone-100">
                {/* Model Settings */}
                <div className="pt-4">
                  <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-stone-400 mb-3 flex items-center gap-1.5">
                    <Person size={11} weight="duotone" /> Model Settings
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {[
                      { label: "Gender",       items: MODEL_GENDERS,      key: "model_gender" },
                      { label: "Ethnicity",    items: MODEL_ETHNICITIES,  key: "model_ethnicity" },
                      { label: "Age Range",    items: MODEL_AGES,         key: "model_age" },
                      { label: "Fashion",      items: MODEL_FASHION,      key: "model_fashion" },
                      { label: "Expression",   items: MODEL_EXPRESSIONS,  key: "model_expression" },
                      { label: "Interaction",  items: MODEL_INTERACTIONS, key: "model_interaction" },
                    ].map(({ label, items, key }) => (
                      <div key={key}>
                        <div className="text-[10px] font-semibold text-stone-400 mb-1.5">{label}</div>
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

                {/* Visual Priority */}
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-stone-400 mb-2">Visual Priority</div>
                  <div className="flex gap-2">
                    {VISUAL_PRIORITIES.map(({ id, name }) => (
                      <button key={id} type="button" onClick={() => upd("visual_priority", id)}
                        data-testid={`visual-priority-${id}`}
                        className={`flex-1 py-2 rounded-xl border-2 text-center text-xs font-semibold transition-all ${
                          form.visual_priority === id ? "border-brand bg-brand-sand text-brand" : "border-stone-100 text-stone-600"
                        }`}>{name}</button>
                    ))}
                  </div>
                </div>

                {/* Camera / Lighting overrides */}
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-stone-400 mb-3">Override Controls</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-semibold text-stone-400 mb-1 block">Mood Override</label>
                      <input type="text" value={form.mood_override} onChange={(e) => upd("mood_override", e.target.value)}
                        className="input text-sm" placeholder="mis. dark moody, warm cozy..." />
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold text-stone-400 mb-1 block">Lighting Override</label>
                      <input type="text" value={form.lighting_override} onChange={(e) => upd("lighting_override", e.target.value)}
                        className="input text-sm" placeholder="mis. golden hour, softbox..." />
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold text-stone-400 mb-1 block">Composition Override</label>
                      <input type="text" value={form.composition_override} onChange={(e) => upd("composition_override", e.target.value)}
                        className="input text-sm" placeholder="mis. rule of thirds, centered..." />
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold text-stone-400 mb-1 block">Camera Style Override</label>
                      <input type="text" value={form.camera_style_override} onChange={(e) => upd("camera_style_override", e.target.value)}
                        className="input text-sm" placeholder="mis. macro, wide angle, portrait..." />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Validation warnings */}
          {validationWarnings.length > 0 && (
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 space-y-1 animate-fade-up">
              <div className="text-xs font-bold text-amber-700 uppercase tracking-wide mb-2">Feedify Director: Auto-Fix Applied</div>
              {validationWarnings.map((w, i) => (
                <p key={i} className="text-xs text-amber-600 flex gap-1.5"><span className="flex-shrink-0">⚡</span>{w}</p>
              ))}
            </div>
          )}

          {/* Smart Summary */}
          {smartSummary && form.describe.trim().length > 20 && (
            <div className="feedify-card p-4 border border-brand/20 bg-brand-sand/30 animate-fade-up">
              <div className="flex items-center gap-2 mb-3">
                <MagicWand size={14} weight="duotone" className="text-brand" />
                <span className="text-xs font-bold uppercase tracking-[0.15em] text-brand">Feedify Memahami</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {[
                  { label: "Tipe Konten", value: smartSummary.contentLabel },
                  { label: "Produk", value: form.product_name || smartSummary.product || "Dari deskripsi" },
                  { label: "Target", value: smartSummary.audience || "Dari deskripsi" },
                  { label: "Tone", value: smartSummary.tone || "Auto" },
                  { label: "CTA", value: smartSummary.cta || "Dari deskripsi" },
                  { label: "Slide", value: `${form.slide_count} slides` },
                ].map(({ label, value }) => value && (
                  <div key={label} className="flex items-start gap-1.5">
                    <CheckCircle size={12} weight="fill" className="text-brand mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="text-[9px] uppercase text-stone-400 font-semibold">{label}</div>
                      <div className="text-xs font-semibold text-stone-700 leading-tight">{value}</div>
                    </div>
                  </div>
                ))}
              </div>
              {(!smartSummary.audience || !smartSummary.cta) && (
                <p className="text-[10px] text-stone-400 mt-3 italic">
                  Semakin detail deskripsimu → semakin baik hasilnya. Tambahkan target audiens dan CTA kalau belum ada.
                </p>
              )}
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
            <div className={`${isAdmin ? "flex-1" : "w-full"} space-y-1.5`}>
              <button
                type="button"
                onClick={generate}
                disabled={generating}
                data-testid="generate-carousel-btn"
                className="w-full py-4 bg-brand text-brand-cream rounded-full font-bold text-base hover:bg-brand-light btn-lift inline-flex items-center justify-center gap-2 disabled:opacity-60 shadow-lg shadow-brand/20"
              >
                {generating
                  ? <><CircleNotch size={20} className="animate-spin" /> {genPhase || "Generating..."}</>
                  : <><Sparkle size={20} weight="fill" /> Generate Professional Carousel</>}
              </button>
              {!generating && (
                <p className="text-center text-[11px] text-stone-400">
                  Estimasi 40–70 detik · OpenAI GPT Image akan generate tiap slide via Feedify Visual Director
                </p>
              )}
            </div>
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

        {/* ── Right: Sidebar ───────────────────────────────────────────────────── */}
        <div className="lg:sticky lg:top-6 lg:self-start space-y-4 min-w-0">

          {/* Storyboard Preview */}
          <div className="feedify-card p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="text-xs uppercase tracking-[0.18em] text-brand-light font-bold flex items-center gap-1.5">
                <Stack size={13} weight="fill" /> Storyboard
              </div>
              <span className="text-[10px] text-stone-400">{form.slide_count} slides</span>
            </div>
            <div className="space-y-2 max-h-[500px] overflow-y-auto no-scrollbar pr-0.5">
              {storyboardRoles.map((role, i) => (
                <SlideArtboard
                  key={i}
                  index={i}
                  role={role}
                  ratio={form.aspect_ratio}
                  isLast={i === form.slide_count - 1}
                  brand={brand}
                />
              ))}
            </div>
            <p className="text-[10px] text-stone-400 text-center mt-3">
              Preview struktur — bukan hasil akhir
            </p>
          </div>

          <BrandDnaCard />
        </div>
      </div>

      {/* ── Progressive Result Section ─────────────────────────────────────────── */}
      {hasAnySlide && (
        <div id="carousel-result" className="space-y-4 animate-fade-up">
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
                <p className="text-xs text-stone-400 mt-0.5">Slide berikutnya akan muncul otomatis saat selesai</p>
              )}
            </div>
          </div>

          {/* Slide Status Strip */}
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1" data-testid="slide-tabs">
            {Array.from({ length: totalSlides }).map((_, i) => {
              const status = slideStatuses[i] || "waiting";
              const img    = slideImages[i];
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
                  <div className="absolute top-1 left-1 bg-brand/80 text-white text-[9px] font-bold px-1 rounded">{i + 1}</div>
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
            <div className="flex items-start justify-between mb-5">
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

// ── Sub-components ─────────────────────────────────────────────────────────────

function SlideArtboard({ index, role, ratio, isLast, brand }) {
  const is916 = ratio.startsWith("9:16");
  const is45  = ratio.startsWith("4:5");
  const aspectClass = is916 ? "aspect-[9/16]" : is45 ? "aspect-[4/5]" : "aspect-square";

  const primaryColor = brand?.color_primary || "#0B3D2E";
  const goldColor    = "#E5C158";
  const bgColor      = brand?.color_secondary || "#FDFBF7";

  return (
    <div className="flex items-center gap-3">
      {/* Slide number */}
      <div className="w-5 text-[10px] font-bold text-stone-400 text-right flex-shrink-0">{index + 1}</div>

      {/* Artboard */}
      <div
        className={`${aspectClass} w-14 flex-shrink-0 rounded-lg overflow-hidden border border-stone-200 relative`}
        style={{ background: bgColor }}
      >
        {isLast ? (
          /* CTA slide layout */
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-0.5 p-1"
            style={{ background: primaryColor }}>
            <div className="w-6 h-0.5 rounded-full" style={{ background: goldColor }} />
            <div className="w-8 h-1 rounded-sm bg-white/30 mt-1" />
            <div className="w-5 h-0.5 rounded-full bg-white/20" />
            <div className="w-6 h-2 rounded-full mt-1.5" style={{ background: goldColor }} />
          </div>
        ) : index === 0 ? (
          /* Cover slide layout */
          <>
            <div className="absolute inset-0" style={{ background: primaryColor, opacity: 0.85 }} />
            <div className="absolute inset-0 flex flex-col justify-end p-1">
              <div className="w-full h-1.5 rounded-sm bg-white/40 mb-1" />
              <div className="w-3/4 h-1 rounded-sm bg-white/25" />
            </div>
            <div className="absolute top-1 right-1 w-2 h-2 rounded-full" style={{ background: goldColor }} />
          </>
        ) : (
          /* Content slide layout */
          <>
            <div className="absolute top-0 left-0 right-0 h-[55%]" style={{ background: primaryColor, opacity: 0.15 }} />
            <div className="absolute top-0 left-0 right-0 h-[55%] flex items-center justify-center">
              <div className="w-6 h-6 rounded" style={{ background: primaryColor, opacity: 0.25 }} />
            </div>
            <div className="absolute bottom-0 left-0 right-0 p-1 space-y-0.5">
              <div className="w-full h-1 rounded-sm" style={{ background: primaryColor, opacity: 0.5 }} />
              <div className="w-4/5 h-0.5 rounded-sm bg-stone-300" />
              <div className="w-3/5 h-0.5 rounded-sm bg-stone-200" />
            </div>
          </>
        )}
      </div>

      {/* Role label */}
      <div className="flex-1 min-w-0">
        <div className={`text-[11px] font-semibold truncate ${isLast ? "text-brand-gold" : "text-stone-700"}`}>{role}</div>
        <div className="text-[9px] text-stone-400 mt-0.5">{isLast ? "Call to Action" : index === 0 ? "Cover / Hook" : "Konten"}</div>
      </div>
    </div>
  );
}

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
        <button onClick={copy}
          className="inline-flex items-center gap-1 px-3 py-1 bg-brand-gold text-brand rounded-full text-xs font-semibold hover:opacity-80 transition-all">
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
    default:           return <HourglassMedium size={20} className="text-stone-300" />;
  }
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

// ── Carousel Wireframe (modal preview) ────────────────────────────────────────

function CarouselWireframe({ ratio, slideCount }) {
  const is916 = ratio.startsWith("9:16");
  const is45  = ratio.startsWith("4:5");
  const CH = 100;
  const CW = is916 ? 56 : is45 ? 80 : CH;
  const SH = Math.round(CH * 0.62);
  const SW = Math.round(CW * 0.62);
  const GAP = 10, PAD_X = 16, PAD_Y = 14, DOTS_H = 20;
  const totalW = SW + GAP + CW + GAP + SW;
  const vbW = totalW + PAD_X * 2;
  const vbH = PAD_Y + CH + DOTS_H + PAD_Y;
  const sx1X = PAD_X;
  const cX   = sx1X + SW + GAP;
  const sx2X = cX + CW + GAP;
  const cY    = PAD_Y;
  const sideY = PAD_Y + (CH - SH) / 2;
  const dotCount = Math.min(slideCount, 6);
  return (
    <svg viewBox={`0 0 ${vbW} ${vbH}`} className="w-full">
      <WireSlide x={sx1X} y={sideY} w={SW} h={SH} active={false} />
      <WireSlide x={cX} y={cY} w={CW} h={CH} active={true} />
      <rect x={cX - 1.5} y={cY - 1.5} width={CW + 3} height={CH + 3} rx={5} fill="none" stroke="#0B3D2E" strokeWidth={2} />
      <WireSlide x={sx2X} y={sideY} w={SW} h={SH} active={false} />
      <g transform={`translate(${cX + CW / 2 - (dotCount - 1) * 4.5}, ${cY + CH + 10})`}>
        {Array.from({ length: dotCount }).map((_, i) => (
          <circle key={i} cx={i * 9} cy={0} r={i === 1 ? 3 : 2} fill={i === 1 ? "#0B3D2E" : "#C8D0C4"} />
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
      <rect x={x} y={y} width={w} height={imgH} rx={active ? 4 : 3} fill={active ? "#1C4A32" : "#C8D0C4"} />
      {active && <rect x={x} y={y} width={w * 0.4} height={3} rx={1.5} fill="#E5C158" />}
      <rect x={x} y={y + imgH} width={w} height={h - imgH} rx={active ? 4 : 3} fill={active ? "#FDFBF7" : "#EDEEE9"} />
      <rect x={x + pad} y={y + imgH + h * 0.08} width={w * 0.72} height={active ? 4 : 3} rx={2} fill={active ? "#1A2E22" : "#A8B0A4"} />
      <rect x={x + pad} y={y + imgH + h * 0.2}  width={w * 0.52} height={active ? 3 : 2} rx={1.5} fill={active ? "#7A8A7D" : "#C4CAC0"} />
      {active && h > 60 && (
        <rect x={x + pad} y={y + imgH + h * 0.34} width={w * 0.5} height={Math.max(6, h * 0.1)} rx={3} fill="#E5C158" />
      )}
    </g>
  );
}
