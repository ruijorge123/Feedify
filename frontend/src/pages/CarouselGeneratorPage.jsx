import { useEffect, useState, useRef, useMemo } from "react";
import api from "@/lib/api";
import { toast } from 'react-toastify';
import { handleGenerateError } from "@/lib/moderation";
import { useAuth } from "@/context/AuthContext";
import {
  Stack, Sparkle, CircleNotch, CheckCircle, ArrowsClockwise, Lightning,
  DownloadSimple, ChatCircle, Copy, Check, Hash, Images, Camera,
  WarningCircle, HourglassMedium, CaretDown, CaretUp, Plus,
} from "@phosphor-icons/react";
import BrandDnaCard from "@/components/BrandDnaCard";
import NoCreditsModal from "@/components/NoCreditsModal";
import ReferenceUpload from "@/components/ReferenceUpload";
import InspirationGallery from "@/components/InspirationGallery";
import { notifyCreditsUpdate } from "@/lib/credits";

// ── Constants ──────────────────────────────────────────────────────────────────

const CONTENT_INTENTS = [
  { id: "auto",  name: "Auto",           sub: "Feedify infer dari prompt",   template: "problem-solution", goal: "edukasi",  recommended: true },
  { id: "teach", name: "Teach Something",sub: "Edukasi, tips, myth vs fact", template: "listicle",         goal: "edukasi" },
  { id: "sell",  name: "Sell Something", sub: "Promo, launch, soft selling", template: "problem-solution", goal: "promo" },
];

const VISUAL_MOODS = [
  { id: "auto",    name: "Auto",    desc: "Feedify pilih mood terbaik.",   preset: "Minimal Clean",    recommended: true },
  { id: "minimal", name: "Minimal", desc: "Clean & modern.",               preset: "Minimal Clean" },
  { id: "premium", name: "Premium", desc: "Elegant commercial look.",      preset: "Luxury Editorial" },
  { id: "luxury",  name: "Luxury",  desc: "High-end branding.",            preset: "Luxury Spa" },
  { id: "bold",    name: "Bold",    desc: "High contrast & eye-catching.", preset: "Editorial Bold" },
];

const ASPECT_RATIOS = [
  { key: "1:1",  label: "Instagram Feed", sub: "1:1",  value: "1:1 (Square Feed)" },
  { key: "4:5",  label: "Portrait",       sub: "4:5",  value: "4:5 (Portrait Feed)", recommended: true },
  { key: "9:16", label: "Story / Reels",  sub: "9:16", value: "9:16 (Story/Reels)" },
];

const STORY_FLOWS = [
  { id: "auto",             emoji: "✨", name: "Auto",              desc: "Feedify pilih flow terbaik.",        recommended: true },
  { id: "problem_solution", emoji: "⚡", name: "Problem → Solution",desc: "Bangun masalah lalu solusi." },
  { id: "myth_fact",        emoji: "🔍", name: "Myth → Fact",       desc: "Edukasi, bongkar mitos." },
  { id: "before_after",     emoji: "🔄", name: "Before → After",    desc: "Transformasi visual." },
  { id: "step_by_step",     emoji: "📋", name: "Step by Step",      desc: "Tutorial langkah demi langkah." },
  { id: "story_brand",      emoji: "📖", name: "Story Brand",       desc: "Storytelling perjalanan brand." },
  { id: "listicle",         emoji: "📝", name: "Listicle",          desc: "Daftar poin actionable." },
];

const PEOPLE_GENDERS = [
  { id: "auto",   name: "Auto"   },
  { id: "female", name: "Female" },
  { id: "male",   name: "Male"   },
  { id: "couple", name: "Couple" },
  { id: "family", name: "Family" },
];
const PEOPLE_AGES = [
  { id: "young_adult", name: "Young Adult" },
  { id: "adult",       name: "Adult"       },
  { id: "mature",      name: "Mature"      },
];
const SCENE_FOCUS = [
  { id: "product_first", name: "Product Focus" },
  { id: "balanced",      name: "Balanced"      },
  { id: "human_first",   name: "Human Focus"   },
];

const FLOW_TEMPLATES = {
  auto:             ["Cover", "Hook", "Insight", "Proof", "CTA"],
  problem_solution: ["Masalah", "Kenapa Terjadi?", "Solusinya", "Bukti Nyata", "Mulai Sekarang"],
  myth_fact:        ["Mitos yang Beredar", "Kenapa Dipercaya?", "Faktanya Begini", "Perbandingan", "Kesimpulan"],
  before_after:     ["Kondisi Sebelum", "Masalah Utama", "Proses Perubahan", "Hasilnya Nyata", "Transformasi"],
  step_by_step:     ["Tujuan", "Yang Dibutuhkan", "Langkah 1", "Langkah 2", "Hasil Akhir"],
  story_brand:      ["Kondisi Awal", "Masalah Datang", "Solusi Ditemukan", "Transformasi", "Jadilah Bagian Cerita"],
  listicle:         ["5 Hal Penting", "Poin #1 & #2", "Poin #3", "Poin #4 & #5", "Simpan & Bagikan"],
};

const QUICK_CHIPS = [
  { label: "Myth vs Fact",   flow: "myth_fact",        text: "Buat carousel Myth vs Fact tentang sunscreen.\nTargetnya wanita usia 20–30 tahun.\nBahas 5 mitos yang paling sering dipercaya.\nVisual clean premium.\nCTA follow Instagram." },
  { label: "Promo",          flow: "problem_solution",  text: "Buat carousel promo untuk [produk saya].\nHighlight keunggulan utama dan harga spesial.\nTarget [target audiens].\nCTA order via WhatsApp." },
  { label: "Tips Praktis",   flow: "step_by_step",      text: "Buat carousel tips tentang [topik].\nBerikan 5 tips yang actionable dan mudah dipahami.\nTone santai tapi informatif." },
  { label: "Edukasi",        flow: "listicle",          text: "Buat carousel edukasi tentang [topik].\nJelaskan secara simpel dengan visual yang menarik.\nTarget [target audiens]." },
  { label: "Soft Selling",   flow: "story_brand",       text: "Buat konten soft selling untuk [produk].\nEdukasi dulu, bangun kepercayaan, lalu ajak beli di akhir dengan halus." },
  { label: "Product Launch", flow: "problem_solution",  text: "Saya mau launch produk baru: [nama produk].\nBangun excitement, perkenalkan fitur unggulan, dan ajak pre-order." },
  { label: "Before After",   flow: "before_after",      text: "Buat carousel before after penggunaan [produk].\nTunjukkan transformasi nyata dan hasil yang bisa dirasakan." },
  { label: "Story Brand",    flow: "story_brand",       text: "Buat storytelling tentang perjalanan brand kami.\nCeritakan asal-usul, nilai, dan kenapa kami berbeda dari kompetitor." },
];

const MODEL_GENDERS    = [{ id:"auto",name:"Auto" },{ id:"female",name:"Female" },{ id:"male",name:"Male" }];
const MODEL_AGES       = [{ id:"teen",name:"Teen" },{ id:"young_adult",name:"Young Adult" },{ id:"adult",name:"Adult" }];
const VISUAL_PRIORITIES= [{ id:"product_first",name:"Product" },{ id:"balanced",name:"Balanced" },{ id:"human_first",name:"Human" }];

const MOOD_CHIPS = ["Warm","Fresh","Luxury","Premium","Editorial","Soft","Natural","Golden Hour","Minimal","Cozy"];

// Slide roles
const SLIDE_ROLE_DATA = {
  cover:      { name: "Cover",      desc: "Visual kuat · Headline" },
  hook:       { name: "Hook",       desc: "Masalah · Pertanyaan" },
  insight:    { name: "Insight",    desc: "Penjelasan + visual" },
  comparison: { name: "Comparison", desc: "Before/After · Myth vs Fact" },
  tips:       { name: "Tips",       desc: "Poin singkat actionable" },
  cta:        { name: "CTA",        desc: "Logo · Pesan · Aksi" },
};

function getSlideRole(index, total) {
  if (index === 0) return "cover";
  if (index === total - 1) return "cta";
  const mids = ["hook", "insight", "comparison", "tips"];
  return mids[(index - 1) % mids.length];
}

const BRAND_CACHE_KEY = "feedify_brand_cache";

const DEFAULT_FORM = {
  describe:          "",
  content_intent:    "auto",
  brand_name:        "",
  product_name:      "",
  slide_count:       3,
  aspect_ratio:      "4:5 (Portrait Feed)",
  visual_mood:       "auto",
  photo_type:        "product_only",
  story_flow:        "auto",
  include_people:    false,
  people_gender:     "auto",
  people_age:        "young_adult",
  people_appearance: "",
  wardrobe_notes:    "",
  scene_focus:       "balanced",
  model_gender:      "auto",
  model_age:         "young_adult",
  visual_priority:   "balanced",
  mood_chips:        [],
  mood_custom:       "",
};

function parseDescribe(text) {
  if (!text.trim()) return null;
  const lower = text.toLowerCase();
  const result = {};
  const prodMatch = text.match(/(?:jual|produk|brand|product|launch)\s+([^\.\,\n]{3,35})/i);
  if (prodMatch) result.product = prodMatch[1].trim();
  let aud = [];
  if (/wanita|perempuan|ibu|cewek/i.test(lower)) aud.push("Wanita");
  else if (/pria|laki-laki|cowok/i.test(lower)) aud.push("Pria");
  const ageM = text.match(/usia\s+(\d+[\s–\-]+\d+)/i);
  if (ageM) aud.push(ageM[1].replace(/\s/g, ""));
  if (aud.length) result.audience = aud.join(" ");
  if (/whatsapp|wa\.me|\bwa\b/i.test(lower)) result.cta = "WhatsApp";
  else if (/shopee|tokopedia|marketplace/i.test(lower)) result.cta = "Marketplace";
  else if (/follow.*ig|instagram/i.test(lower)) result.cta = "Instagram";
  else if (/link bio/i.test(lower)) result.cta = "Link Bio";
  return result;
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function CarouselGeneratorPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const [form, setForm] = useState(() => {
    try {
      const cached = localStorage.getItem(BRAND_CACHE_KEY);
      if (cached) {
        const b = JSON.parse(cached);
        if (b?.brand_name) return { ...DEFAULT_FORM, brand_name: b.brand_name };
      }
    } catch {}
    return DEFAULT_FORM;
  });

  const upd = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const [brand, setBrand] = useState(() => {
    try { return JSON.parse(localStorage.getItem(BRAND_CACHE_KEY)); } catch { return null; }
  });

  const [productPhoto, setProductPhoto]     = useState(null);
  const [generating, setGenerating]         = useState(false);
  const [carouselId, setCarouselId]         = useState(null);
  const [totalSlides, setTotalSlides]       = useState(0);
  const [slideStatuses, setSlideStatuses]   = useState([]);
  const [slideImages, setSlideImages]       = useState([]);
  const [slideRoles, setSlideRoles]         = useState([]);
  const [genPhase, setGenPhase]             = useState("");
  const [selectedSlide, setSelectedSlide]   = useState(0);
  const [noCredits, setNoCredits]           = useState(false);
  const [regeneratingSlide, setRegeneratingSlide] = useState(null);
  const [referenceImg, setReferenceImg]     = useState(null);
  const [galleryOpen, setGalleryOpen]       = useState(false);
  const [captions, setCaptions]             = useState(null);
  const [generatingCaptions, setGeneratingCaptions] = useState(false);
  const [promptPreview, setPromptPreview]   = useState(null);
  const [previewing, setPreviewing]         = useState(false);
  const [validationWarnings, setValidationWarnings] = useState([]);
  const [showModelAdvanced, setShowModelAdvanced]   = useState(false);
  const [moodCustomMode, setMoodCustomMode] = useState(false);
  const readerRef = useRef(null);

  useEffect(() => {
    api.get("/brand-profile").then(({ data }) => {
      setBrand(data);
      localStorage.setItem(BRAND_CACHE_KEY, JSON.stringify(data));
      if (data?.brand_name) upd("brand_name", data.brand_name);
    }).catch(() => {});
  }, []);

  const smartSummary = useMemo(() => parseDescribe(form.describe), [form.describe]);
  const moodOverrideText = useMemo(() => {
    const parts = [...form.mood_chips, ...(form.mood_custom.trim() ? [form.mood_custom.trim()] : [])];
    return parts.join(", ");
  }, [form.mood_chips, form.mood_custom]);

  const buildPayload = () => {
    const intent = CONTENT_INTENTS.find(c => c.id === form.content_intent) || CONTENT_INTENTS[0];
    const mood   = VISUAL_MOODS.find(s => s.id === form.visual_mood) || VISUAL_MOODS[0];
    return {
      topic:            form.describe,
      target_audience:  smartSummary?.audience || "",
      content_goal:     intent.goal,
      campaign_goal:    intent.goal,
      final_cta:        smartSummary?.cta || "",
      call_to_action:   smartSummary?.cta || "",
      template:         intent.template,
      brand_name:       form.brand_name,
      product_name:     form.product_name || form.brand_name,
      slide_count:      form.slide_count,
      aspect_ratio:     form.aspect_ratio,
      visual_type:      form.include_people ? "human_product" : "product_only",
      photo_style:      "auto",
      style_preset:     mood.preset,
      visual_priority:  form.scene_focus,
      ai_director_mode: "smart",
      human_enabled:    form.include_people,
      human_mode:       form.include_people ? "manual" : "none",
      talent_gender:    form.include_people ? form.people_gender     : "auto",
      talent_age_group: form.include_people ? form.people_age        : "young_adult",
      talent_ethnicity: "auto",
      model_gender:     form.include_people ? form.people_gender     : "auto",
      model_age:        form.include_people ? form.people_age        : "young_adult",
      model_ethnicity:  "auto",
      model_fashion:    form.include_people ? form.wardrobe_notes    : "auto",
      model_expression: "auto",
      model_interaction:"auto",
      model_character:  form.include_people ? form.people_appearance : "",
      talent_role:      "auto",
      mood_override:    moodOverrideText,
      story_flow:       form.story_flow,
      lighting_override:    "",
      composition_override: "",
      camera_style_override:"",
      mixed_allow_human: false,
      save: true,
      ...(productPhoto ? { product_photo_base64: productPhoto.split(",")[1] } : {}),
    };
  };

  const validate = () => {
    if (!form.describe.trim()) { toast.error("Ceritakan dulu carousel-mu"); return false; }
    return true;
  };

  const generateCaptions = async () => {
    setGeneratingCaptions(true);
    setCaptions(null);
    try {
      const { data } = await api.post("/prompt/generate-caption-bundle", {
        product_name:    form.product_name || form.brand_name || brand?.brand_name || "",
        headline:        form.describe.slice(0, 80),
        target_audience: smartSummary?.audience || "",
        platform:        "instagram",
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
              setSlideStatuses(Array(evt.roles?.length || form.slide_count).fill("waiting"));
              setSlideImages(Array(evt.roles?.length || form.slide_count).fill(null));
              setGenPhase("Memulai generasi slide...");
              setTimeout(() => document.getElementById("carousel-result")?.scrollIntoView({ behavior: "smooth" }), 200);
              break;
            case "slide_start":
              setGenPhase(`Generating Slide ${evt.index + 1} of ${evt.total}...`);
              setSlideStatuses(prev => { const n = [...prev]; n[evt.index] = "generating"; return n; });
              break;
            case "slide_retry":
              setGenPhase(`Slide ${evt.index + 1}: retry ${evt.attempt}...`);
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

  const downloadAll = () => {
    const done = slideImages.filter(Boolean);
    if (!done.length) return;
    slideImages.forEach((img, i) => {
      if (!img) return;
      const a = document.createElement("a");
      a.href = `data:image/png;base64,${img}`;
      a.download = `feedify-carousel-slide-${i + 1}.png`;
      a.click();
    });
    toast.success(`${done.length} slide diunduh`);
  };

  const downloadSlide = (idx) => {
    const img = slideImages[idx];
    if (!img) return;
    const a = document.createElement("a");
    a.href = `data:image/png;base64,${img}`;
    a.download = `feedify-slide-${idx + 1}.png`;
    a.click();
  };

  const hasAnySlide = slideImages.some(Boolean) || generating;

  // Key changes when user updates slide count / ratio / intent → re-animates storyboard
  const handleProductPhoto = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error("Foto max 5MB"); return; }
    const reader = new FileReader();
    reader.onload = () => setProductPhoto(reader.result);
    reader.readAsDataURL(file);
  };

  const storyboardKey = `${form.slide_count}-${form.aspect_ratio}-${form.content_intent}`;

  const toggleMoodChip = (chip) => {
    const cur = form.mood_chips;
    upd("mood_chips", cur.includes(chip) ? cur.filter(c => c !== chip) : [...cur, chip]);
  };

  return (
    <div className="space-y-4 pb-20" data-testid="carousel-generator-page">
      {/* Header */}
      <div className="animate-fade-up">
        <h1 className="font-heading text-2xl sm:text-3xl font-bold text-brand tracking-tight">Carousel Builder</h1>
        <p className="text-stone-400 mt-1 text-sm max-w-2xl">Ceritakan idemu. Feedify menjadi Creative Director yang menyusun storyline, copywriting, visual direction, dan seluruh slide secara otomatis.</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        {/* ── Left: Form ──────────────────────────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-4 animate-fade-up">

          {/* ① HERO PROMPT */}
          <div className="feedify-card p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Sparkle size={14} weight="fill" className="text-brand-gold" />
              <span className="font-heading font-bold text-brand text-sm">Ceritakan Carousel Kamu</span>
              <span className="text-[10px] text-stone-400">Semakin lengkap idemu, semakin baik hasilnya.</span>
            </div>
            <textarea
              data-testid="carousel-describe"
              value={form.describe}
              onChange={(e) => upd("describe", e.target.value)}
              placeholder={"Buat carousel Myth vs Fact tentang sunscreen.\nTargetnya wanita usia 20–30 tahun.\nBahas 5 mitos yang paling sering dipercaya.\nVisual clean premium.\nCTA follow Instagram."}
              rows={5}
              className="input resize-none text-sm leading-relaxed w-full"
            />
            <div className="flex flex-wrap gap-1.5">
              {QUICK_CHIPS.map((chip) => (
                <button key={chip.label} type="button"
                  data-testid={`chip-${chip.label.toLowerCase().replace(/\s+/g,"-")}`}
                  onClick={() => {
                    upd("describe", chip.text);
                    if (chip.flow) upd("story_flow", chip.flow);
                  }}
                  className={`px-3 py-1.5 rounded-full text-[11px] font-semibold border transition-colors ${
                    form.story_flow === chip.flow && form.describe === chip.text
                      ? "border-brand bg-brand-sand text-brand"
                      : "border-stone-200 bg-white text-stone-500 hover:border-brand/40 hover:bg-brand-sand hover:text-brand"
                  }`}>
                  {chip.label}
                </button>
              ))}
            </div>
          </div>

          {/* ② BRAND & PRODUK */}
          <div className="feedify-card p-4">
            <p className="text-[10px] uppercase tracking-[0.15em] text-stone-400 font-semibold mb-3">Brand & Produk</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] text-stone-400 font-medium block mb-1">Brand <span className="text-stone-300">(auto)</span></label>
                <input type="text" data-testid="carousel-brand-name" value={form.brand_name}
                  onChange={(e) => upd("brand_name", e.target.value)}
                  className="input" placeholder={brand?.brand_name || "Nama brand"} />
              </div>
              <div>
                <label className="text-[10px] text-stone-400 font-medium block mb-1">Produk <span className="text-stone-300">(opsional)</span></label>
                <input type="text" data-testid="carousel-product" value={form.product_name}
                  onChange={(e) => upd("product_name", e.target.value)}
                  className="input" placeholder="Nama produk" />
              </div>
            </div>
          </div>

          {/* ③ FOTO PRODUK */}
          <div className="feedify-card p-5 space-y-4">
            <div className="flex items-center gap-2">
              <h3 className="font-heading text-base font-bold text-brand">Foto Produk</h3>
              <span className="text-[10px] uppercase tracking-widest font-bold text-red-500 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">Wajib</span>
            </div>
            <label htmlFor="carousel-product-photo" data-testid="carousel-photo-label"
              className={`block cursor-pointer border-2 border-dashed rounded-xl p-6 hover:border-brand-light text-center transition-colors ${productPhoto ? "border-brand-light" : "border-red-300 bg-red-50/30"}`}>
              {productPhoto
                ? <div><img src={productPhoto} alt="produk" className="max-h-48 mx-auto rounded-lg" /><div className="text-xs text-stone-500 mt-2">Klik untuk ganti</div></div>
                : <div className="py-4"><Camera size={32} className="mx-auto text-red-400 mb-2" weight="duotone" /><div className="font-medium text-brand">Upload foto produk</div><div className="text-xs text-stone-500 mt-1">Feedify butuh foto produk asli untuk generate visual</div></div>
              }
            </label>
            <input id="carousel-product-photo" type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={handleProductPhoto} data-testid="carousel-photo-input" />
            <ReferenceUpload value={referenceImg} onChange={setReferenceImg} testid="carousel-reference" />
            <button type="button" onClick={() => setGalleryOpen(true)} data-testid="carousel-gallery-btn"
              className="w-full flex items-center justify-center gap-2 py-2.5 border border-dashed border-brand-sand rounded-xl text-sm font-semibold text-brand-light hover:border-brand hover:text-brand hover:bg-brand-sand/40 transition-all">
              <Images size={16} weight="duotone" /> Pilih dari Gallery Inspirasi
            </button>
          </div>

          {/* ④ FORMAT */}
          <div className="feedify-card p-4 space-y-3">
            <h3 className="font-heading text-sm font-bold text-brand">Format</h3>
            <div className="grid grid-cols-3 gap-2">
              {ASPECT_RATIOS.map((r) => {
                const active = form.aspect_ratio === r.value;
                const dims = r.key === "1:1" ? { w: 1, h: 1 } : r.key === "4:5" ? { w: 4, h: 5 } : { w: 9, h: 16 };
                const maxW = 32, maxH = 36;
                const scale = Math.min(maxW / dims.w, maxH / dims.h);
                const fw = Math.round(dims.w * scale);
                const fh = Math.round(dims.h * scale);
                return (
                  <button key={r.key} type="button" data-testid={`carousel-ratio-${r.key}`}
                    onClick={() => upd("aspect_ratio", r.value)}
                    className={`relative flex flex-col items-center gap-2 py-4 px-2 rounded-xl border-2 transition-colors ${
                      active ? "border-brand bg-brand-sand" : "border-stone-100 bg-white hover:border-brand/30"
                    }`}>
                    {r.recommended && (
                      <span className="absolute -top-2 left-1/2 -translate-x-1/2 text-[7px] bg-brand-gold text-brand font-bold px-1.5 py-0.5 rounded-full whitespace-nowrap">Rekomen</span>
                    )}
                    <div className="flex items-center justify-center" style={{ width: 40, height: 40 }}>
                      <div className={`relative rounded-[3px] border-2 overflow-hidden transition-colors ${active ? "border-brand" : "border-stone-300"}`}
                        style={{ width: fw, height: fh, background: active ? "rgba(11,61,46,0.1)" : "#f5f5f4" }}>
                        <div className="absolute inset-0 flex flex-col justify-end p-[3px] gap-[2px]">
                          <div className={`rounded-full ${active ? "bg-brand/30" : "bg-stone-300"}`} style={{ height: 2 }} />
                          <div className={`rounded-full w-3/4 ${active ? "bg-brand/20" : "bg-stone-200"}`} style={{ height: 1.5 }} />
                        </div>
                      </div>
                    </div>
                    <div className="text-center">
                      <div className={`text-[11px] font-bold ${active ? "text-brand" : "text-stone-600"}`}>{r.label}</div>
                      <div className={`text-[9px] mt-0.5 ${active ? "text-brand/60" : "text-stone-400"}`}>{r.sub}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ⑤ JUMLAH SLIDE */}
          <div className="feedify-card p-4 space-y-3">
            <h3 className="font-heading text-sm font-bold text-brand">Jumlah Slide</h3>
            <div className="flex gap-1.5">
              {[3, 4, 5, 6, 7].map((n) => (
                <button key={n} type="button" data-testid={`slide-count-${n}`}
                  onClick={() => upd("slide_count", n)}
                  className={`relative flex-1 py-2.5 rounded-xl border-2 font-heading font-bold text-sm transition-colors ${
                    form.slide_count === n ? "border-brand bg-brand text-brand-cream" : "border-stone-100 text-stone-600 hover:border-brand/30"
                  }`}>
                  {n === 3 && form.slide_count !== 3 && (
                    <span className="absolute -top-2 left-1/2 -translate-x-1/2 text-[7px] bg-brand-gold text-brand font-bold px-1.5 py-0.5 rounded-full whitespace-nowrap">Rekomen</span>
                  )}
                  {n}
                </button>
              ))}
            </div>
            <p className="text-[10px] text-stone-400">{form.slide_count} kredit akan digunakan</p>
          </div>

          {/* ⑥ ORANG DALAM VISUAL */}
          <div className="feedify-card p-5 space-y-4">
            <h3 className="font-heading text-base font-bold text-brand">Orang dalam Visual</h3>
            <button type="button" data-testid="carousel-toggle-people"
              onClick={() => upd("include_people", !form.include_people)}
              className={`w-full flex items-center justify-between p-4 rounded-xl border-2 transition-all ${
                form.include_people ? "border-brand bg-brand-sand" : "border-stone-100 bg-stone-50"
              }`}>
              <div className="text-left">
                <p className={`font-semibold text-sm ${form.include_people ? "text-brand" : "text-stone-600"}`}>
                  {form.include_people ? "Product + People" : "Product Only"}
                </p>
                <p className="text-[11px] text-stone-400 mt-0.5">
                  {form.include_people ? "Sertakan model atau orang dalam visual" : "Feedify fokus pada produk tanpa model"}
                </p>
              </div>
              <div className={`w-12 h-6 rounded-full relative flex-shrink-0 transition-colors ${form.include_people ? "bg-brand" : "bg-stone-300"}`}>
                <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-all ${form.include_people ? "left-6" : "left-0.5"}`} />
              </div>
            </button>
            {form.include_people && (
              <div className="space-y-4 animate-fade-up">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.15em] text-stone-400 font-semibold mb-2">Gender</p>
                  <div className="flex flex-wrap gap-2">
                    {PEOPLE_GENDERS.map(({ id, name }) => (
                      <button key={id} type="button" data-testid={`carousel-gender-${id}`}
                        onClick={() => upd("people_gender", id)}
                        className={`px-3.5 py-2 rounded-full text-xs font-semibold border transition-all ${
                          form.people_gender === id ? "bg-brand text-brand-cream border-brand" : "bg-white border-stone-200 text-stone-600 hover:border-brand/30"
                        }`}>{name}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-[0.15em] text-stone-400 font-semibold mb-2">Usia</p>
                  <div className="flex gap-2">
                    {PEOPLE_AGES.map(({ id, name }) => (
                      <button key={id} type="button" data-testid={`carousel-age-${id}`}
                        onClick={() => upd("people_age", id)}
                        className={`flex-1 py-2.5 rounded-xl border-2 text-xs font-semibold text-center transition-all ${
                          form.people_age === id ? "border-brand bg-brand-sand text-brand" : "border-stone-100 text-stone-600 hover:border-brand/30"
                        }`}>{name}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-[0.15em] text-stone-400 font-semibold mb-2">Appearance</p>
                  <input type="text" value={form.people_appearance}
                    onChange={(e) => upd("people_appearance", e.target.value)}
                    className="input" placeholder="mis. Natural beauty · Professional · Hijab · Chef" />
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-[0.15em] text-stone-400 font-semibold mb-2">Scene Focus</p>
                  <div className="flex gap-2">
                    {SCENE_FOCUS.map(({ id, name }) => (
                      <button key={id} type="button" data-testid={`carousel-scene-${id}`}
                        onClick={() => upd("scene_focus", id)}
                        className={`flex-1 py-2.5 rounded-xl border-2 text-[11px] font-semibold text-center transition-all ${
                          form.scene_focus === id ? "border-brand bg-brand-sand text-brand" : "border-stone-100 text-stone-600 hover:border-brand/30"
                        }`}>{name}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-[0.15em] text-stone-400 font-semibold mb-2">Wardrobe Notes <span className="normal-case font-normal">(opsional)</span></p>
                  <input type="text" value={form.wardrobe_notes}
                    onChange={(e) => upd("wardrobe_notes", e.target.value)}
                    className="input" placeholder="mis. Luxury black suit · White minimal · Hijab formal" />
                </div>
              </div>
            )}
          </div>

          {/* ⑦ AI STORY FLOW */}
          <div className="feedify-card p-5 space-y-5">
            <div>
              <h3 className="font-heading text-sm font-bold text-brand">Story Flow</h3>
              <p className="text-xs text-stone-400 mt-0.5">Feedify otomatis menyusun alur slide terbaik.</p>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              {STORY_FLOWS.map((sf) => (
                <button key={sf.id} type="button" data-testid={`story-flow-${sf.id}`}
                  onClick={() => upd("story_flow", sf.id)}
                  className={`relative text-left p-3.5 rounded-xl border-2 transition-colors ${
                    form.story_flow === sf.id ? "border-brand bg-brand-sand" : "border-stone-100 bg-white hover:border-brand/30"
                  }`}>
                  {sf.recommended && (
                    <span className="absolute -top-2 left-3 text-[7px] bg-brand-gold text-brand font-bold px-1.5 py-0.5 rounded-full">Rekomen</span>
                  )}
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-base leading-none">{sf.emoji}</span>
                    <span className={`text-xs font-bold leading-tight ${form.story_flow === sf.id ? "text-brand" : "text-stone-700"}`}>{sf.name}</span>
                  </div>
                  <span className="text-[10px] text-stone-400 leading-tight">{sf.desc}</span>
                </button>
              ))}
            </div>

            {/* Dynamic slide flow preview — mini slide frames */}
            <div className="border-t border-stone-100 pt-4">
              <p className="text-[10px] uppercase tracking-[0.12em] text-stone-400 font-semibold mb-3">Alur slide yang akan dibuat</p>
              {(() => {
                const slides = (FLOW_TEMPLATES[form.story_flow] || FLOW_TEMPLATES.auto).slice(0, form.slide_count);
                const ar = form.aspect_ratio;
                const dims = ar.includes("9:16") ? { w: 18, h: 32 }
                           : ar.includes("4:5")  ? { w: 22, h: 28 }
                           :                       { w: 26, h: 26 };
                return (
                  <div className="flex items-end gap-1.5 overflow-x-auto pb-1">
                    {slides.map((name, i) => {
                      const isFirst = i === 0;
                      const isLast  = i === slides.length - 1;
                      const bg = isFirst ? "rgba(11,61,46,0.07)" : isLast ? "rgba(229,193,88,0.15)" : "rgba(11,61,46,0.03)";
                      const borderCol = isFirst ? "rgba(11,61,46,0.3)" : isLast ? "rgba(229,193,88,0.5)" : "rgba(11,61,46,0.12)";
                      return (
                        <div key={i} className="flex items-end gap-1.5 flex-shrink-0">
                          <div className="flex flex-col items-center gap-1.5">
                            <div className="relative rounded-[3px] overflow-hidden border"
                              style={{ width: dims.w, height: dims.h, background: bg, borderColor: borderCol }}>
                              <div className="absolute inset-0 flex flex-col justify-end p-[3px] gap-[2px]">
                                {isFirst ? (
                                  <>
                                    <div className="rounded-full bg-brand/25 w-full" style={{ height: 3 }} />
                                    <div className="rounded-full bg-brand/15 w-3/4" style={{ height: 1.5 }} />
                                  </>
                                ) : isLast ? (
                                  <div className="rounded-full mx-auto" style={{ width: "70%", height: 4, background: "rgba(229,193,88,0.6)" }} />
                                ) : (
                                  <>
                                    <div className="rounded-full bg-stone-300 w-full" style={{ height: 2 }} />
                                    <div className="rounded-full bg-stone-200 w-3/4" style={{ height: 1.5 }} />
                                    <div className="rounded-full bg-stone-100 w-1/2" style={{ height: 1.5 }} />
                                  </>
                                )}
                              </div>
                            </div>
                            <span className="text-[8.5px] font-semibold text-stone-500 text-center leading-tight" style={{ maxWidth: dims.w + 10 }}>{name}</span>
                          </div>
                          {!isLast && (
                            <div className="text-stone-300 text-xs mb-5 flex-shrink-0">›</div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          </div>

          {/* Validation warnings */}
          {validationWarnings.length > 0 && (
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 space-y-1 animate-fade-up">
              {validationWarnings.map((w, i) => (
                <p key={i} className="text-xs text-amber-600 flex gap-1.5"><span>⚡</span>{w}</p>
              ))}
            </div>
          )}

          {/* ⑦ FEEDIFY AKAN OTOMATIS */}
          <div className="rounded-2xl border border-green-100 p-5 bg-gradient-to-br from-green-50/60 to-white animate-fade-up" data-testid="carousel-ai-card">
            <div className="flex items-center gap-2 mb-3">
              <Sparkle size={14} weight="fill" className="text-brand-gold" />
              <p className="text-sm font-semibold text-brand">Feedify akan otomatis</p>
            </div>
            <div className="space-y-2">
              {[
                "Menyusun storyline carousel",
                "Menulis copywriting setiap slide",
                "Menentukan visual direction",
                "Menyesuaikan desain dengan Brand DNA",
                "Menghasilkan carousel siap upload",
              ].map((item) => (
                <div key={item} className="flex items-center gap-2.5">
                  <CheckCircle size={14} weight="fill" className="text-green-500 flex-shrink-0" />
                  <span className="text-xs text-stone-600">{item}</span>
                </div>
              ))}
            </div>
            <p className="text-[11px] text-stone-400 mt-4">⏱ Estimasi proses ±40–70 detik.</p>
          </div>

          {/* Desktop inline buttons */}
          <div className="hidden lg:block space-y-2 pt-1">
            {isAdmin && (
              <button onClick={previewPrompt} disabled={previewing || generating}
                data-testid="preview-carousel-btn"
                className="w-full h-10 border-2 border-brand text-brand rounded-full font-bold text-sm hover:bg-brand-sand transition-colors disabled:opacity-60 inline-flex items-center justify-center gap-1.5">
                {previewing ? <CircleNotch size={13} className="animate-spin" /> : <CheckCircle size={13} weight="duotone" />}
                Preview
              </button>
            )}
            <button type="button" onClick={generate} disabled={generating} data-testid="generate-carousel-btn"
              className="w-full py-3.5 bg-brand text-brand-cream rounded-full font-bold text-base hover:bg-brand-light btn-lift inline-flex items-center justify-center gap-2 disabled:opacity-60 shadow-lg shadow-brand/20 transition-colors">
              {generating
                ? <><CircleNotch size={18} className="animate-spin" /> {genPhase || "Menyiapkan..."}</>
                : <><Sparkle size={18} weight="fill" /> Generate Carousel</>}
            </button>
          </div>

          {isAdmin && promptPreview && (
            <div id="carousel-preview-panel" className="animate-fade-up space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Stack size={16} weight="duotone" className="text-brand" />
                  <span className="font-heading font-bold text-brand text-sm">Preview Prompt</span>
                </div>
                <span className="text-[10px] bg-brand-sand text-brand font-bold px-2.5 py-1 rounded-full">
                  {(promptPreview.prompt_json?.slides || []).length} prompt untuk {form.slide_count} slide
                </span>
              </div>
              {(promptPreview.prompt_json?.slides || []).map((slide, i) => (
                <SlidePromptCard key={i} index={i} slide={slide} />
              ))}
            </div>
          )}
        </div>

        {/* ── Right: Sidebar ───────────────────────────────────────────────────── */}
        <div className="lg:sticky lg:top-6 lg:self-start space-y-4">
          {/* Creative Brief */}
          <div className="feedify-card p-4 space-y-2.5">
            <div className="text-xs uppercase tracking-[0.18em] text-brand-light font-bold">Creative Brief</div>
            <CarouselBriefRow label="Brand"  value={form.brand_name || brand?.brand_name || "—"} />
            <CarouselBriefRow label="Produk" value={form.product_name || "—"} />
            <CarouselBriefRow label="Slide"  value={`${form.slide_count} slide`} />
            <CarouselBriefRow label="Format" value={form.aspect_ratio.split(" ")[0]} />
            <CarouselBriefRow label="Visual" value={form.include_people ? "Product + People" : "Product Only"} />
            <CarouselBriefRow label="Flow"   value={STORY_FLOWS.find(s => s.id === form.story_flow)?.name || "Auto"} />
            {form.describe && <CarouselBriefRow label="Ide" value={form.describe.slice(0, 40) + (form.describe.length > 40 ? "…" : "")} truncate />}
          </div>

          <BrandDnaCard />

          {/* Live Preview */}
          <div className="feedify-card p-4 space-y-3">
            <div className="text-xs uppercase tracking-[0.18em] text-brand-light font-bold flex items-center gap-1.5">
              <Lightning size={14} weight="fill" /> Live Preview
            </div>
            {hasAnySlide ? (
              <>
                {(() => {
                  const ar = form.aspect_ratio;
                  const aspectCls = ar.includes("9:16") ? "aspect-[9/16]"
                                  : ar.includes("4:5")  ? "aspect-[4/5]"
                                  : "aspect-square";
                  return (
                    <div className="grid grid-cols-3 gap-1.5">
                      {Array.from({ length: totalSlides }).map((_, i) => {
                        const img = slideImages[i];
                        const isSelected = selectedSlide === i;
                        const status = slideStatuses[i] || "waiting";
                        return (
                          <button key={i} type="button" onClick={() => img && setSelectedSlide(i)} disabled={!img}
                            className={`relative ${aspectCls} rounded-lg overflow-hidden border-2 transition-all
                              ${img ? (isSelected ? "border-brand ring-1 ring-brand/30" : "border-stone-200 hover:border-brand/40") : "border-dashed border-stone-200 cursor-default"}`}>
                            {img
                              ? <img src={`data:image/png;base64,${img}`} alt={`slide ${i+1}`} className="w-full h-full object-cover" />
                              : <div className="w-full h-full bg-stone-50 flex items-center justify-center">
                                  {generating && status === "generating"
                                    ? <CircleNotch size={12} className="animate-spin text-brand" />
                                    : <span className="text-[9px] text-stone-300 font-bold">{i+1}</span>
                                  }
                                </div>
                            }
                          </button>
                        );
                      })}
                    </div>
                  );
                })()}
                <p className="text-[10px] text-stone-400">
                  {generating
                    ? `${slideImages.filter(Boolean).length} dari ${totalSlides} selesai...`
                    : `${slideImages.filter(Boolean).length} slide selesai`}
                </p>
                {!generating && slideImages.some(Boolean) && (
                  <button onClick={downloadAll}
                    className="w-full inline-flex items-center justify-center gap-1.5 py-2 bg-brand text-brand-cream rounded-full text-xs font-bold hover:bg-brand-light transition-colors">
                    <DownloadSimple size={13} weight="bold" /> Download Semua Slide
                  </button>
                )}
              </>
            ) : (
              <div className="py-2 space-y-3">
                {(() => {
                  const ar = form.aspect_ratio;
                  const dims = ar.includes("9:16") ? { w: 9, h: 16 }
                             : ar.includes("4:5")  ? { w: 4, h: 5  }
                             :                       { w: 1, h: 1  };
                  const maxH = 52;
                  const scale = maxH / dims.h;
                  const fw = Math.round(dims.w * scale);
                  const fh = maxH;
                  const count = form.slide_count;
                  return (
                    <div className="flex items-end justify-center gap-1.5 overflow-hidden">
                      {Array.from({ length: Math.min(count, 6) }).map((_, i) => {
                        const isFirst = i === 0;
                        const w = isFirst ? fw + 8 : fw;
                        const h = isFirst ? fh : Math.round(fh * 0.85);
                        return (
                          <div key={i} className="flex-shrink-0 rounded-md overflow-hidden border border-stone-200 relative"
                            style={{ width: w, height: h, background: isFirst ? "linear-gradient(160deg,#eef5f1,#f8fdf9)" : "linear-gradient(160deg,#f7f7f5,#fafaf8)" }}>
                            <div className="absolute inset-0 flex flex-col justify-end p-[4px] gap-[2.5px]">
                              {isFirst && <div className="w-4/5 rounded-full bg-brand/15" style={{ height: 3 }} />}
                              <div className="w-full rounded-full bg-stone-200/80" style={{ height: 2 }} />
                              <div className="w-2/3 rounded-full bg-stone-200/50" style={{ height: 1.5 }} />
                            </div>
                            <div className="absolute top-1 left-1 text-[7px] font-bold text-stone-300">{i + 1}</div>
                          </div>
                        );
                      })}
                      {count > 6 && (
                        <div className="text-[9px] text-stone-300 font-bold self-end mb-1">+{count - 6}</div>
                      )}
                    </div>
                  );
                })()}
                <p className="text-center text-[10px] text-stone-400">
                  {form.slide_count} slide akan dibuat · klik Generate
                </p>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* ── Progressive Result Section ──────────────────────────────────────────── */}
      {hasAnySlide && (
        <div id="carousel-result" className="space-y-4 animate-fade-up">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 mt-0.5">
              {generating
                ? <CircleNotch size={22} className="animate-spin text-brand" />
                : <CheckCircle size={22} weight="fill" className="text-green-600" />}
            </div>
            <div>
              <h2 className="font-heading text-lg font-bold text-brand">
                {generating ? genPhase || "Generating..." : `${slideImages.filter(Boolean).length} dari ${totalSlides} Slide Selesai`}
              </h2>
              {generating && <p className="text-xs text-stone-400 mt-0.5">Slide berikutnya muncul otomatis saat selesai</p>}
            </div>
          </div>

          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1" data-testid="slide-tabs">
            {Array.from({ length: totalSlides }).map((_, i) => {
              const status   = slideStatuses[i] || "waiting";
              const img      = slideImages[i];
              const isActive = selectedSlide === i;
              return (
                <button key={i} onClick={() => img && setSelectedSlide(i)}
                  data-testid={`slide-tab-${i}`} disabled={!img}
                  className={`flex-shrink-0 w-20 h-20 rounded-xl border-2 overflow-hidden transition-all relative
                    ${isActive && img ? "border-brand scale-105 ring-2 ring-brand-gold" : "border-stone-200"}
                    ${!img ? "cursor-default" : "cursor-pointer"}`}>
                  {img ? (
                    <img src={`data:image/png;base64,${img}`} alt={`slide ${i+1}`} className="h-full w-full object-cover" />
                  ) : (
                    <div className="h-full w-full flex flex-col items-center justify-center bg-stone-50 gap-1">
                      <SlideStatusIcon status={status} />
                      <span className="text-[9px] text-stone-400 font-medium">{status}</span>
                    </div>
                  )}
                  <div className="absolute top-1 left-1 bg-brand/80 text-white text-[9px] font-bold px-1 rounded">{i + 1}</div>
                </button>
              );
            })}
          </div>

          {slideImages[selectedSlide] && (
            <div className="feedify-card p-4 sm:p-5" data-testid="active-slide-preview">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
                <div className="font-heading font-bold text-brand capitalize">
                  Slide {selectedSlide + 1}
                  {slideRoles[selectedSlide] && <span className="text-stone-400 font-normal"> · {slideRoles[selectedSlide]}</span>}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => downloadSlide(selectedSlide)} data-testid={`download-slide-${selectedSlide}`}
                    className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1 px-3 py-1.5 bg-brand text-brand-cream rounded-full text-xs font-semibold hover:bg-brand-light">
                    <DownloadSimple size={12} weight="bold" /> Download
                  </button>
                  <button onClick={() => regenerateSlide(selectedSlide)}
                    disabled={regeneratingSlide === selectedSlide || generating}
                    data-testid={`regenerate-slide-${selectedSlide}`}
                    className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1 px-3 py-1.5 bg-brand-gold text-brand rounded-full text-xs font-semibold hover:opacity-80 disabled:opacity-50">
                    {regeneratingSlide === selectedSlide
                      ? <CircleNotch size={12} className="animate-spin" />
                      : <ArrowsClockwise size={12} weight="bold" />}
                    Regenerate (1 kredit)
                  </button>
                </div>
              </div>
              <div className="aspect-square sm:aspect-[4/5] max-w-md mx-auto rounded-2xl overflow-hidden border-2 border-brand">
                <img src={`data:image/png;base64,${slideImages[selectedSlide]}`} alt=""
                  className="h-full w-full object-cover" data-testid="active-slide-image" />
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

      <InspirationGallery
        open={galleryOpen}
        onClose={() => setGalleryOpen(false)}
        context="carousel"
        onSelect={(photo) => {
          fetch(`/gallery/${photo.category}/${photo.filename}`)
            .then((r) => r.blob())
            .then((blob) => {
              const reader = new FileReader();
              reader.onload = () => setProductPhoto(reader.result);
              reader.readAsDataURL(blob);
            });
        }}
      />

      {/* ── Sticky Generate Bar (mobile only) ───────────────────────────────── */}
      <div className="lg:hidden fixed bottom-16 left-0 right-0 z-50 backdrop-blur-md border-t border-stone-200"
        style={{ background: "rgba(242,246,244,0.94)" }}>
        <div className="max-w-4xl mx-auto px-4 py-2.5 flex items-center gap-2.5">
          <div className="hidden sm:block flex-1" />
          {isAdmin && (
            <button onClick={previewPrompt} disabled={previewing || generating}
              data-testid="preview-carousel-btn"
              className="h-10 px-5 shrink-0 border-2 border-brand text-brand rounded-full font-bold text-sm hover:bg-brand-sand transition-colors disabled:opacity-60 inline-flex items-center gap-1.5">
              {previewing ? <CircleNotch size={13} className="animate-spin" /> : <CheckCircle size={13} weight="duotone" />}
              Preview
            </button>
          )}
          <button type="button" onClick={generate} disabled={generating}
            data-testid="generate-carousel-btn"
            className="flex-1 sm:flex-none h-10 sm:px-7 sm:shrink-0 bg-brand text-brand-cream rounded-full font-bold text-sm hover:bg-brand-light btn-lift inline-flex items-center justify-center gap-2 disabled:opacity-60 shadow-md shadow-brand/20 transition-colors">
            {generating
              ? <><CircleNotch size={15} className="animate-spin" /> {genPhase || "Menyiapkan..."}</>
              : <><Sparkle size={15} weight="fill" /> Generate Carousel · {form.slide_count} Kredit</>}
          </button>
        </div>
      </div>
    </div>
  );
}

function CarouselBriefRow({ label, value, truncate }) {
  return (
    <div className="flex items-center justify-between text-xs gap-2">
      <span className="text-stone-400 flex-shrink-0">{label}</span>
      <span className={`font-semibold text-stone-700 text-right ${truncate ? "truncate max-w-[65%]" : "max-w-[65%]"}`}>{value}</span>
    </div>
  );
}

// ── Storyboard Card ────────────────────────────────────────────────────────────

function StoryboardCard({ index, total, ratio, brand }) {
  const primary = brand?.color_primary || "#0B3D2E";
  const gold    = "#E5C158";
  const bg      = brand?.color_secondary || "#FDFBF7";
  const ratioKey = ratio.split(" ")[0];
  const role     = getSlideRole(index, total);
  const roleData = SLIDE_ROLE_DATA[role];

  // Card width/aspect per ratio — all cards have same visual height feel
  const cardW  = ratioKey === "9:16" ? "w-[44px]" : ratioKey === "4:5" ? "w-[60px]" : "w-[72px]";
  const aspect = ratioKey === "9:16" ? "aspect-[9/16]" : ratioKey === "4:5" ? "aspect-[4/5]" : "aspect-square";

  return (
    <div className="flex flex-col items-center gap-2 flex-shrink-0 animate-fade-up" style={{ animationDelay: `${index * 50}ms` }}>
      <div className={`${cardW} ${aspect} relative rounded-lg overflow-hidden border border-stone-200 shadow-sm`} style={{ background: bg }}>
        {role === "cover"      && <LayoutCover primary={primary} gold={gold} />}
        {role === "hook"       && <LayoutHook primary={primary} />}
        {role === "insight"    && <LayoutInsight primary={primary} />}
        {role === "comparison" && <LayoutComparison primary={primary} gold={gold} />}
        {role === "tips"       && <LayoutTips primary={primary} gold={gold} />}
        {role === "cta"        && <LayoutCTA primary={primary} gold={gold} />}
        {/* Slide number badge */}
        <div className="absolute top-1 left-1 w-3.5 h-3.5 rounded-full flex items-center justify-center text-[7px] font-bold text-white"
          style={{ background: primary }}>
          {index + 1}
        </div>
      </div>
      <div className="text-center">
        <div className={`text-[10px] font-bold ${role === "cta" ? "text-brand-gold" : "text-stone-600"}`}>{roleData.name}</div>
        <div className="text-[8px] text-stone-400 leading-tight" style={{ maxWidth: 72 }}>{roleData.desc}</div>
      </div>
    </div>
  );
}

function LayoutCover({ primary, gold }) {
  return (
    <>
      <div className="absolute top-0 left-0 right-0" style={{ height: "62%", background: primary, opacity: 0.15 }}>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-5 h-5 rounded opacity-20" style={{ background: primary }} />
        </div>
      </div>
      <div className="absolute left-0 right-0 bottom-0 p-1.5" style={{ height: "38%", background: "white" }}>
        <div className="h-1 rounded-sm mb-1" style={{ background: primary, opacity: 0.5, width: "88%" }} />
        <div className="h-0.5 rounded-sm mb-1" style={{ background: primary, opacity: 0.25, width: "68%" }} />
        <div className="h-2 rounded-full" style={{ background: gold, width: "44%" }} />
      </div>
    </>
  );
}

function LayoutHook({ primary }) {
  return (
    <>
      <div className="absolute top-0 left-0 right-0" style={{ height: "50%", background: primary, opacity: 0.13 }} />
      <div className="absolute left-0 right-0 bottom-0 p-1.5" style={{ height: "50%" }}>
        <div className="h-1.5 rounded-sm mb-0.5" style={{ background: primary, opacity: 0.55, width: "85%" }} />
        <div className="h-0.5 rounded-sm mb-0.5" style={{ background: primary, opacity: 0.3, width: "75%" }} />
        <div className="h-0.5 rounded-sm" style={{ background: primary, opacity: 0.2, width: "60%" }} />
      </div>
    </>
  );
}

function LayoutInsight({ primary }) {
  return (
    <>
      <div className="absolute top-0 left-0 right-0" style={{ height: "42%", background: primary, opacity: 0.11 }} />
      <div className="absolute left-0 right-0 bottom-0 p-1.5" style={{ height: "58%" }}>
        <div className="h-1 rounded-sm mb-0.5" style={{ background: primary, opacity: 0.5, width: "80%" }} />
        <div className="h-0.5 rounded-sm mb-0.5" style={{ background: primary, opacity: 0.25, width: "90%" }} />
        <div className="h-0.5 rounded-sm mb-0.5" style={{ background: primary, opacity: 0.2, width: "70%" }} />
        <div className="h-0.5 rounded-sm" style={{ background: primary, opacity: 0.15, width: "55%" }} />
      </div>
    </>
  );
}

function LayoutComparison({ primary, gold }) {
  return (
    <div className="absolute inset-0 flex">
      <div className="flex-1 flex flex-col">
        <div className="flex-1" style={{ background: primary, opacity: 0.08 }} />
        <div className="p-1">
          <div className="h-0.5 rounded-sm mb-0.5" style={{ background: primary, opacity: 0.3, width: "80%" }} />
          <div className="h-0.5 rounded-sm" style={{ background: primary, opacity: 0.18, width: "55%" }} />
        </div>
      </div>
      <div className="w-px" style={{ background: primary, opacity: 0.12 }} />
      <div className="flex-1 flex flex-col">
        <div className="flex-1" style={{ background: gold, opacity: 0.1 }} />
        <div className="p-1">
          <div className="h-0.5 rounded-sm mb-0.5" style={{ background: primary, opacity: 0.3, width: "80%" }} />
          <div className="h-0.5 rounded-sm" style={{ background: primary, opacity: 0.18, width: "55%" }} />
        </div>
      </div>
    </div>
  );
}

function LayoutTips({ primary, gold }) {
  return (
    <div className="absolute inset-0 p-1.5 flex flex-col">
      <div className="rounded mb-1" style={{ background: primary, opacity: 0.1, height: "28%" }} />
      <div className="space-y-0.5 flex-1">
        {[72, 85, 60, 78].map((w, i) => (
          <div key={i} className="flex items-center gap-0.5">
            <div className="w-0.5 h-0.5 rounded-full flex-shrink-0" style={{ background: gold }} />
            <div className="h-0.5 rounded-full" style={{ background: primary, opacity: 0.2, width: `${w}%` }} />
          </div>
        ))}
      </div>
    </div>
  );
}

function LayoutCTA({ primary, gold }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 p-1.5" style={{ background: primary }}>
      <div className="w-4 h-4 rounded-full mb-0.5 flex items-center justify-center" style={{ background: "rgba(255,255,255,0.15)" }}>
        <div className="w-2 h-2 rounded-full" style={{ background: gold }} />
      </div>
      <div className="h-1 rounded-sm" style={{ background: "white", opacity: 0.4, width: "68%" }} />
      <div className="h-0.5 rounded-sm" style={{ background: "white", opacity: 0.22, width: "50%" }} />
      <div className="h-2.5 rounded-full mt-0.5" style={{ background: gold, width: "62%" }} />
    </div>
  );
}

// ── Utility sub-components ─────────────────────────────────────────────────────

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
          className="inline-flex items-center gap-1 px-3 py-1 bg-brand-gold text-brand rounded-full text-xs font-semibold hover:opacity-80">
          {copied ? <><Check size={12} weight="bold" /> Copied!</> : <><Copy size={12} weight="bold" /> Copy</>}
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
    <button onClick={handle}
      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-brand hover:bg-brand-sand rounded-full flex-shrink-0">
      {copied ? <Check size={12} weight="bold" /> : <Copy size={12} weight="bold" />}
      {label || (copied ? "OK" : "Copy")}
    </button>
  );
}
