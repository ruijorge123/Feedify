import { useEffect, useState, useRef } from "react";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { toast } from 'react-toastify';
import { handleGenerateError } from "@/lib/moderation";
import {
  Camera, Sparkle, X, Plus, CircleNotch, Lightning,
  CheckCircle, Images, Copy, Check, ChatCircle, Hash,
  CaretDown, CaretUp,
} from "@phosphor-icons/react";
import GeneratedPreview from "@/components/GeneratedPreview";
import BrandDnaCard from "@/components/BrandDnaCard";
import NoCreditsModal from "@/components/NoCreditsModal";
import ReferenceUpload from "@/components/ReferenceUpload";
import JsonOutput from "@/components/JsonOutput";
import InspirationGallery from "@/components/InspirationGallery";
import { notifyCreditsUpdate } from "@/lib/credits";
import CampaignGoalSelector from "@/components/CampaignGoalSelector";

// ── Constants ──────────────────────────────────────────────────────────────────

const BRAND_CACHE_KEY = "feedify_brand_cache";

const ASPECT_RATIOS = [
  { id: "1:1 (Square Feed)",   label: "1:1",  sub: "Square Feed",  w: 1, h: 1 },
  { id: "4:5 (Portrait Feed)", label: "4:5",  sub: "Rekomendasi",  w: 4, h: 5, recommended: true },
  { id: "9:16 (Story/Reels)", label: "9:16", sub: "Story · Reels", w: 9, h: 16 },
  { id: "16:9 (Landscape)",   label: "16:9", sub: "Landscape",      w: 16, h: 9 },
];

const BRAND_STYLE_MAP = {
  "minimal-clean":    "Minimal Clean",
  "minimal-korean":   "Minimal Clean",
  "editorial-bold":   "Editorial Bold",
  "editorial":        "Editorial Bold",
  "vibrant-pop":      "Vibrant Pop",
  "neon-street":      "Vibrant Pop",
  "lifestyle-natural":"Lifestyle Natural",
  "lifestyle-social": "Lifestyle Natural",
  "lifestyle":        "Lifestyle Natural",
  "luxury-editorial": "Luxury Editorial",
  "luxury-spa":       "Luxury Editorial",
  "luxury-korean":    "Luxury Editorial",
  "luxury":           "Luxury Editorial",
  "dark-moody":       "Dark Moody",
  "warm-artisan":     "Warm Artisan",
};

// 4 primary visual styles — AI picks best internally for other styles
const VISUAL_CONCEPTS = [
  {
    id:     "hero_studio",
    name:   "Bersih & Terang",
    desc:   "Produk tampil jelas di latar putih bersih.",
    best:   "Skincare · Fashion · Elektronik · Marketplace",
    bg:     "radial-gradient(ellipse at 50% 25%, #ffffff 0%, #f4f9f6 45%, #e2ede8 100%)",
    accent: "#0B3D2E",
  },
  {
    id:     "lifestyle_scene",
    name:   "Natural & Hangat",
    desc:   "Produk dalam suasana nyata yang hangat.",
    best:   "Makanan · Kopi · Fashion · Home Living",
    bg:     "linear-gradient(170deg, #b89070 0%, #d4b896 35%, #ead5bc 70%, #f5ede0 100%)",
    accent: "#8B5E3C",
  },
  {
    id:     "flat_lay",
    name:   "Disusun dari Atas",
    desc:   "Ditata rapi dari atas dengan gaya estetis.",
    best:   "Kosmetik · Makanan · Aksesoris · Gift Box",
    bg:     "linear-gradient(145deg, #faf6f0 0%, #f2ede4 100%)",
    accent: "#2d5a3d",
  },
  {
    id:     "shadow_drama",
    name:   "Mewah & Eksklusif",
    desc:   "Nuansa gelap premium dengan cahaya dramatis.",
    best:   "Parfum · Jam · Perhiasan · Luxury · Launch",
    bg:     "linear-gradient(135deg, #0c0c0c 0%, #1c1c1c 50%, #0a0a0a 100%)",
    accent: "#E5C158",
  },
];

const VISUAL_MOODS = [
  { id: "auto",    name: "Auto",    desc: "Feedify pilih mood terbaik.",   preset: "Minimal Clean",    recommended: true },
  { id: "minimal", name: "Minimal", desc: "Clean & modern.",               preset: "Minimal Clean" },
  { id: "premium", name: "Premium", desc: "Elegant commercial look.",      preset: "Luxury Editorial" },
  { id: "luxury",  name: "Luxury",  desc: "High-end branding.",            preset: "Luxury Spa" },
  { id: "bold",    name: "Bold",    desc: "High contrast & eye-catching.", preset: "Editorial Bold" },
];

const PEOPLE_GENDERS = [
  { id: "auto",   name: "Auto" },
  { id: "female", name: "Female" },
  { id: "male",   name: "Male" },
  { id: "couple", name: "Couple" },
  { id: "family", name: "Family" },
];
const PEOPLE_AGES = [
  { id: "young_adult", name: "Young Adult" },
  { id: "adult",       name: "Adult" },
  { id: "mature",      name: "Mature" },
];
const SCENE_FOCUS = [
  { id: "product_first", name: "Product Focus" },
  { id: "balanced",      name: "Balanced" },
  { id: "human_first",   name: "Human Focus" },
];

const DEFAULT_FORM = {
  headline:           "",
  subheadline:        "",
  description:        "",
  call_to_action:     "",
  features:           [],
  brand_name:         "",
  product_name:       "",
  aspect_ratio:       "4:5 (Portrait Feed)",
  style_preset:       "Minimal Clean",
  visual_mood:        "auto",
  composition_concept:"",
  campaign_goal:      "brand_awareness",
  // People settings
  include_people:     false,
  people_gender:      "auto",
  people_age:         "young_adult",
  people_appearance:  "",
  wardrobe_notes:     "",
  scene_focus:        "product_first",
  // Advanced creative direction
  mood_override:      "",
  lighting_override:  "",
  color_direction:    "",
  negative_prompt:    "",
  camera_notes:       "",
};

// ── Component ──────────────────────────────────────────────────────────────────

export default function BannerGeneratorPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const [form, setForm] = useState(() => {
    try {
      const cached = localStorage.getItem(BRAND_CACHE_KEY);
      if (cached) {
        const b = JSON.parse(cached);
        return {
          ...DEFAULT_FORM,
          style_preset: BRAND_STYLE_MAP[b?.visual_style] || "Minimal Clean",
          brand_name:   b?.brand_name || "",
        };
      }
    } catch {}
    return DEFAULT_FORM;
  });

  const [brand, setBrand] = useState(() => {
    try { return JSON.parse(localStorage.getItem(BRAND_CACHE_KEY)); } catch { return null; }
  });
  const [featureInput, setFeatureInput]     = useState("");
  const [photo, setPhoto]                   = useState(null);
  const [generating, setGenerating]         = useState(false);
  const [regenerating, setRegenerating]     = useState(false);
  const [result, setResult]                 = useState(null);
  const [noCredits, setNoCredits]           = useState(false);
  const [referenceImg, setReferenceImg]     = useState(null);
  const [promptPreview, setPromptPreview]   = useState(null);
  const [previewing, setPreviewing]         = useState(false);
  const [galleryOpen, setGalleryOpen]       = useState(false);
  const [captions, setCaptions]             = useState(null);
  const [generatingCaptions, setGeneratingCaptions] = useState(false);
  const [showAdvanced, setShowAdvanced]     = useState(false);
  const [showContentAdvanced, setShowContentAdvanced] = useState(false);
  const photoSectionRef = useRef(null);

  useEffect(() => {
    api.get("/brand-profile").then(({ data }) => {
      setBrand(data);
      localStorage.setItem(BRAND_CACHE_KEY, JSON.stringify(data));
      if (data?.visual_style) upd("style_preset", BRAND_STYLE_MAP[data.visual_style] || "Minimal Clean");
      if (data?.brand_name)   upd("brand_name",   data.brand_name);
    }).catch(() => {});
  }, []);

  const upd = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handlePhoto = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error("Foto max 5MB"); return; }
    const reader = new FileReader();
    reader.onload = () => setPhoto(reader.result);
    reader.readAsDataURL(file);
  };

  const addFeature = () => {
    if (!featureInput.trim()) return;
    upd("features", [...form.features, featureInput.trim()]);
    setFeatureInput("");
  };
  const removeFeature = (i) => upd("features", form.features.filter((_, idx) => idx !== i));

  const buildPayload = () => {
    const moodPreset = VISUAL_MOODS.find(m => m.id === form.visual_mood)?.preset || form.style_preset;
    return {
      ...form,
      style_preset: moodPreset,
      // People / talent fields mapped to backend expectations
      human_enabled:            form.include_people,
      talent_gender:            form.include_people ? form.people_gender : "auto",
      model_gender:             form.include_people ? form.people_gender : "auto",
      talent_age_group:         form.include_people ? form.people_age    : "young_adult",
      model_age:                form.include_people ? form.people_age    : "",
      talent_ethnicity:         "auto",
      model_ethnicity:          "auto",
      model_character:          form.include_people ? form.people_appearance : "",
      outfit_style:             form.include_people ? form.wardrobe_notes    : "",
      visual_priority:          form.scene_focus,
      composition_style_human:  form.scene_focus,
      interaction_style:        "",
      expression_style:         "",
      human_mode:               form.include_people ? "manual" : "none",
      placement_rule:           "center",
    };
  };

  const generateCaptions = async (formData) => {
    setGeneratingCaptions(true);
    setCaptions(null);
    try {
      const { data } = await api.post("/prompt/generate-caption-bundle", {
        product_name:        formData.product_name,
        product_description: formData.description,
        headline:            formData.headline,
        platform:            "instagram",
        content_purpose:     "soft_selling",
      });
      if (!data.error) setCaptions(data);
    } catch {}
    finally { setGeneratingCaptions(false); }
  };

  const generate = async () => {
    if (!form.headline.trim()) { toast.error("Pesan Utama wajib diisi"); return; }
    if (!photo) {
      toast.info("Upload foto produk dulu ya!");
      photoSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    setGenerating(true);
    setResult(null);
    setCaptions(null);
    try {
      const payload = buildPayload();
      payload.product_photo_base64 = photo.split(",")[1];
      if (referenceImg) payload.reference_image_base64 = referenceImg.split(",")[1];
      const { data } = await api.post("/prompt/generate-banner", payload);
      setResult(data);
      if (data.credits) notifyCreditsUpdate(data.credits);
      toast.success("Visual siap!");
      generateCaptions(form);
    } catch (err) {
      if (err?.response?.status === 402) setNoCredits(true);
      else {
        const handled = handleGenerateError(err);
        if (!handled) toast.error("Gagal generate. Coba lagi.");
        else if (typeof handled === "string") toast.error(handled);
      }
    } finally { setGenerating(false); }
  };

  const regenerate = async () => {
    if (!result?.id) return;
    setRegenerating(true);
    try {
      const { data } = await api.post("/prompt/regenerate", { prompt_id: result.id });
      setResult({ ...result, image_base64: data.image_base64 });
      if (data.credits) notifyCreditsUpdate(data.credits);
      toast.success("Regenerated!");
    } catch (err) {
      if (err?.response?.status === 402) setNoCredits(true);
      else toast.error("Gagal regenerate");
    } finally { setRegenerating(false); }
  };

  const previewPrompt = async () => {
    if (!form.headline.trim()) { toast.error("Pesan Utama wajib diisi dulu"); return; }
    setPreviewing(true);
    setPromptPreview(null);
    try {
      const payload = buildPayload();
      if (photo) payload.product_photo_base64 = photo.split(",")[1];
      if (referenceImg) payload.reference_image_base64 = referenceImg.split(",")[1];
      const { data } = await api.post("/prompt/preview-banner", payload);
      setPromptPreview(data);
      setTimeout(() => document.getElementById("prompt-preview-panel")?.scrollIntoView({ behavior: "smooth" }), 100);
    } catch (err) {
      toast.error("Gagal memuat preview");
    } finally { setPreviewing(false); }
  };

  return (
    <div className="space-y-4 pb-20" data-testid="banner-generator-page">
      {/* Header */}
      <div className="animate-fade-up">
        <h1 className="font-heading text-3xl sm:text-4xl font-bold text-brand tracking-tight">Feed Post</h1>
        <p className="text-stone-400 mt-1">Ceritakan idemu — Feedify yang urus Creative Direction-nya.</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4 animate-fade-up min-w-0">

          {/* ① CREATIVE BRIEF */}
          <div className="feedify-card p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-heading text-base font-bold text-brand">Creative Brief</h3>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] text-stone-400 font-medium block mb-1">Brand <span className="text-stone-300">(auto)</span></label>
                <input data-testid="banner-brand-name" value={form.brand_name || ""}
                  onChange={(e) => upd("brand_name", e.target.value)}
                  placeholder={brand?.brand_name || "Nama brand"}
                  className="input" />
              </div>
              <div>
                <label className="text-[10px] text-stone-400 font-medium block mb-1">Produk <span className="text-stone-300">(opsional)</span></label>
                <input data-testid="banner-product-name" value={form.product_name}
                  onChange={(e) => upd("product_name", e.target.value)}
                  placeholder="Nama produk"
                  className="input" />
              </div>
            </div>

            <Field label="Pesan Utama *">
              <input required data-testid="banner-headline" value={form.headline}
                onChange={(e) => upd("headline", e.target.value)}
                placeholder={form.product_name ? `mis. ${form.product_name} — solusi terbaik untuk kamu` : "mis. Sunscreen ringan tanpa whitecast"}
                className="input" />
            </Field>

            {/* Brand style badge */}
            <div className="flex flex-wrap gap-2">
              <div className="flex items-center gap-1.5 text-xs bg-brand-sand px-3 py-1.5 rounded-full text-brand-light">
                <CheckCircle size={11} weight="fill" className="text-green-500" />
                Gaya: <span className="font-semibold text-brand">{form.style_preset}</span>
                <span className="text-stone-300">·</span>dari Brand DNA
              </div>
            </div>

            {/* Content advanced toggle */}
            <button type="button" onClick={() => setShowContentAdvanced(v => !v)}
              className="flex items-center gap-1.5 text-[11px] text-stone-400 hover:text-brand transition-colors">
              {showContentAdvanced ? <CaretUp size={10} /> : <CaretDown size={10} />}
              Tambah detail (tagline, CTA, fitur)
            </button>

            {showContentAdvanced && (
              <div className="space-y-4 pt-3 border-t border-stone-100 animate-fade-up">
                <Field label="Tagline Pendukung">
                  <input data-testid="banner-subheadline" value={form.subheadline}
                    onChange={(e) => upd("subheadline", e.target.value)}
                    placeholder="mis. Diformulasikan oleh dermatolog"
                    className="input" />
                </Field>
                <Field label="Deskripsi Singkat">
                  <textarea data-testid="banner-description" value={form.description}
                    onChange={(e) => upd("description", e.target.value)}
                    placeholder="1-2 kalimat tentang produk"
                    rows={2} className="input resize-none" />
                </Field>
                <Field label="Call-to-Action">
                  <input data-testid="banner-cta" value={form.call_to_action}
                    onChange={(e) => upd("call_to_action", e.target.value)}
                    placeholder="mis. Order via WhatsApp"
                    className="input" />
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {[`Follow IG @${brand?.brand_name || "namabramu"}`, "Order via WhatsApp", "Beli di Shopee", "Beli di Tokopedia", "DM untuk Info Harga"].map(chip => (
                      <button key={chip} type="button" onClick={() => upd("call_to_action", chip)}
                        className="text-[10px] px-2.5 py-1 rounded-full bg-stone-100 text-stone-400 hover:bg-brand-gold/15 hover:text-brand transition-all border border-stone-200 hover:border-brand-gold/30">
                        {chip}
                      </button>
                    ))}
                  </div>
                </Field>
                <Field label="Fitur Unggulan">
                  <div className="flex flex-wrap gap-2 mb-2">
                    {form.features.map((f, i) => (
                      <span key={i} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-brand-sand rounded-full text-sm text-brand">
                        {f}<button onClick={() => removeFeature(i)} data-testid={`remove-feature-${i}`}><X size={14} weight="bold" /></button>
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input data-testid="feature-input" value={featureInput}
                      onChange={(e) => setFeatureInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addFeature())}
                      placeholder="mis. SPF 50+, Non-comedogenic..."
                      className="input flex-1" />
                    <button onClick={addFeature} data-testid="add-feature-btn"
                      className="px-4 py-3 bg-brand-sand text-brand rounded-xl hover:bg-brand-gold/30 font-semibold">
                      <Plus size={18} weight="bold" />
                    </button>
                  </div>
                </Field>
              </div>
            )}
          </div>

          {/* ② FOTO PRODUK */}
          <div className="feedify-card p-5 space-y-4" ref={photoSectionRef}>
            <div className="flex items-center gap-2">
              <h3 className="font-heading text-base font-bold text-brand">Foto Produk</h3>
              <span className="text-[10px] uppercase tracking-widest font-bold text-red-500 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">Wajib</span>
            </div>
            <label htmlFor="banner-photo" data-testid="banner-photo-label"
              className={`block cursor-pointer border-2 border-dashed rounded-xl p-6 hover:border-brand-light text-center transition-colors ${photo ? "border-brand-light" : "border-red-300 bg-red-50/30"}`}>
              {photo
                ? <div><img src={photo} alt="produk" className="max-h-48 mx-auto rounded-lg" /><div className="text-xs text-stone-500 mt-2">Klik untuk ganti</div></div>
                : <div className="py-4"><Camera size={32} className="mx-auto text-red-400 mb-2" weight="duotone" /><div className="font-medium text-brand">Upload foto produk</div><div className="text-xs text-stone-500 mt-1">Feedify butuh foto produk asli untuk generate visual</div></div>
              }
            </label>
            <input id="banner-photo" type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={handlePhoto} data-testid="banner-photo-input" />
            <ReferenceUpload value={referenceImg} onChange={setReferenceImg} testid="banner-reference" />
            <button type="button" onClick={() => setGalleryOpen(true)}
              className="w-full flex items-center justify-center gap-2 py-2.5 border border-dashed border-brand-sand rounded-xl text-sm font-semibold text-brand-light hover:border-brand hover:text-brand hover:bg-brand-sand/40 transition-all">
              <Images size={16} weight="duotone" /> Pilih dari Gallery Inspirasi
            </button>
          </div>

          {/* ③ VISUAL STYLE */}
          <div className="feedify-card p-4 space-y-3">
            <div className="flex items-baseline gap-2">
              <h3 className="font-heading text-sm font-bold text-brand">Tampilan Visual</h3>
              <span className="text-[10px] text-stone-400">Feedify sesuaikan dengan Brand DNA kamu</span>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              {VISUAL_CONCEPTS.map((c) => {
                const active = form.composition_concept === c.id;
                return (
                  <button key={c.id} type="button" data-testid={`concept-${c.id}`}
                    onClick={() => upd("composition_concept", active ? "" : c.id)}
                    className={`group relative text-left rounded-xl overflow-hidden border-2 transition-all duration-150 ${
                      active ? "border-brand ring-2 ring-brand-gold/40 scale-[1.02]" : "border-stone-100 hover:border-brand/30 hover:scale-[1.01]"
                    }`}>
                    <div className="h-20 w-full relative overflow-hidden" style={{ background: c.bg }}>
                      <ConceptVisual id={c.id} accent={c.accent} />
                      {active && (
                        <div className="absolute top-2 right-2">
                          <CheckCircle size={16} weight="fill" className="text-brand drop-shadow" />
                        </div>
                      )}
                    </div>
                    <div className="px-3 py-2.5 bg-white">
                      <div className={`text-xs font-bold leading-tight ${active ? "text-brand" : "text-stone-700"}`}>{c.name}</div>
                      <div className="text-[10px] text-stone-400 leading-tight mt-0.5">{c.desc}</div>
                      <div className={`text-[9px] leading-tight mt-1.5 ${active ? "text-brand/60" : "text-stone-300"}`}>{c.best}</div>
                    </div>
                  </button>
                );
              })}
            </div>
            {!form.composition_concept && (
              <p className="text-[10px] text-stone-400 italic">Belum dipilih — Feedify pilih otomatis berdasarkan produk.</p>
            )}
          </div>

          {/* ④ VISUAL MOOD */}
          <div className="feedify-card p-4 space-y-3">
            <h3 className="font-heading text-sm font-bold text-brand">Visual Mood</h3>
            <div className="grid grid-cols-5 gap-2">
              {VISUAL_MOODS.map((m) => (
                <button key={m.id} type="button" data-testid={`mood-${m.id}`}
                  onClick={() => upd("visual_mood", m.id)}
                  className={`relative flex flex-col items-center gap-1 px-1 py-3 rounded-xl border-2 text-center transition-colors ${
                    form.visual_mood === m.id ? "border-brand bg-brand-sand" : "border-stone-100 bg-white hover:border-brand/30"
                  }`}>
                  {m.recommended && (
                    <span className="absolute -top-2 left-1/2 -translate-x-1/2 text-[7px] bg-brand-gold text-brand font-bold px-1.5 py-0.5 rounded-full whitespace-nowrap">⭐</span>
                  )}
                  <span className={`text-xs font-bold ${form.visual_mood === m.id ? "text-brand" : "text-stone-700"}`}>{m.name}</span>
                  <span className="text-[8px] text-stone-400 leading-tight">{m.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* ⑤ TUJUAN KONTEN */}
          <div className="feedify-card p-4 space-y-2.5">
            <h3 className="font-heading text-sm font-bold text-brand">Tujuan Konten</h3>
            <CampaignGoalSelector value={form.campaign_goal} onChange={v => upd("campaign_goal", v)} />
          </div>

          {/* ⑥ FORMAT */}
          <div className="feedify-card p-4 space-y-3">
            <h3 className="font-heading text-sm font-bold text-brand">Format</h3>
            <div className="grid grid-cols-4 gap-2">
              {ASPECT_RATIOS.map((r) => {
                const active = form.aspect_ratio === r.id;
                return (
                  <button key={r.id} type="button" data-testid={`ratio-${r.id.split(" ")[0]}`}
                    onClick={() => upd("aspect_ratio", r.id)}
                    className={`relative flex flex-col items-center gap-2 py-4 px-2 rounded-xl border-2 transition-colors duration-150 ${
                      active ? "border-brand bg-brand-sand" : "border-stone-100 bg-white hover:border-brand/30"
                    }`}>
                    {r.recommended && (
                      <span className="absolute -top-2 left-1/2 -translate-x-1/2 text-[7px] bg-brand-gold text-brand font-bold px-1.5 py-0.5 rounded-full whitespace-nowrap">Rekomen</span>
                    )}
                    <RatioFrame w={r.w} h={r.h} active={active} />
                    <div className="text-center">
                      <div className={`text-[11px] font-bold ${active ? "text-brand" : "text-stone-600"}`}>{r.label}</div>
                      <div className={`text-[9px] leading-tight mt-0.5 ${active ? "text-brand/60" : "text-stone-400"}`}>{r.sub}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ⑦ INCLUDE PEOPLE */}
          <div className="feedify-card p-5 space-y-4">
            <h3 className="font-heading text-base font-bold text-brand">Orang dalam Visual</h3>

            {/* Toggle */}
            <button type="button" data-testid="toggle-include-people"
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

            {/* People settings */}
            {form.include_people && (
              <div className="space-y-4 animate-fade-up">
                {/* Gender */}
                <div>
                  <p className="text-[10px] uppercase tracking-[0.15em] text-stone-400 font-semibold mb-2">Gender</p>
                  <div className="flex flex-wrap gap-2">
                    {PEOPLE_GENDERS.map(({ id, name }) => (
                      <button key={id} type="button" data-testid={`people-gender-${id}`}
                        onClick={() => upd("people_gender", id)}
                        className={`px-3.5 py-2 rounded-full text-xs font-semibold border transition-all ${
                          form.people_gender === id ? "bg-brand text-brand-cream border-brand" : "bg-white border-stone-200 text-stone-600 hover:border-brand/30"
                        }`}>{name}</button>
                    ))}
                  </div>
                </div>

                {/* Age */}
                <div>
                  <p className="text-[10px] uppercase tracking-[0.15em] text-stone-400 font-semibold mb-2">Usia</p>
                  <div className="flex gap-2">
                    {PEOPLE_AGES.map(({ id, name }) => (
                      <button key={id} type="button" data-testid={`people-age-${id}`}
                        onClick={() => upd("people_age", id)}
                        className={`flex-1 py-2.5 rounded-xl border-2 text-xs font-semibold text-center transition-all ${
                          form.people_age === id ? "border-brand bg-brand-sand text-brand" : "border-stone-100 text-stone-600 hover:border-brand/30"
                        }`}>{name}</button>
                    ))}
                  </div>
                </div>

                {/* Appearance */}
                <div>
                  <p className="text-[10px] uppercase tracking-[0.15em] text-stone-400 font-semibold mb-2">Appearance</p>
                  <input type="text" value={form.people_appearance}
                    onChange={(e) => upd("people_appearance", e.target.value)}
                    className="input"
                    placeholder="mis. Natural beauty · Professional executive · Hijab · Chef" />
                  <p className="text-[10px] text-stone-400 mt-1.5">Feedify akan menginterpretasi ini secara otomatis.</p>
                </div>

                {/* Scene Focus */}
                <div>
                  <p className="text-[10px] uppercase tracking-[0.15em] text-stone-400 font-semibold mb-2">Scene Focus</p>
                  <div className="flex gap-2">
                    {SCENE_FOCUS.map(({ id, name }) => (
                      <button key={id} type="button" data-testid={`scene-focus-${id}`}
                        onClick={() => upd("scene_focus", id)}
                        className={`flex-1 py-2.5 rounded-xl border-2 text-[11px] font-semibold text-center transition-all ${
                          form.scene_focus === id ? "border-brand bg-brand-sand text-brand" : "border-stone-100 text-stone-600 hover:border-brand/30"
                        }`}>{name}</button>
                    ))}
                  </div>
                </div>

                {/* Wardrobe Notes — optional */}
                <div>
                  <p className="text-[10px] uppercase tracking-[0.15em] text-stone-400 font-semibold mb-2">Wardrobe Notes <span className="normal-case font-normal">(opsional)</span></p>
                  <input type="text" value={form.wardrobe_notes}
                    onChange={(e) => upd("wardrobe_notes", e.target.value)}
                    className="input"
                    placeholder="mis. Luxury black suit · White minimal · Hijab formal · Sportswear" />
                </div>
              </div>
            )}
          </div>

          {/* ⑧ ADVANCED CREATIVE DIRECTION */}
          <div className="feedify-card overflow-hidden">
            <button type="button" onClick={() => setShowAdvanced(v => !v)} data-testid="toggle-advanced"
              className="w-full flex items-center justify-between p-5 hover:bg-stone-50/80 transition-colors">
              <div className="text-left">
                <p className="text-sm font-semibold text-stone-500">Advanced Creative Direction</p>
                <p className="text-[10px] text-stone-400 mt-0.5">Mood, lighting, color, negative instructions</p>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[9px] bg-stone-100 text-stone-400 px-2 py-0.5 rounded-full">Optional</span>
                {showAdvanced ? <CaretUp size={13} className="text-stone-400" /> : <CaretDown size={13} className="text-stone-400" />}
              </div>
            </button>

            {showAdvanced && (
              <div className="px-5 pb-5 space-y-4 border-t border-stone-100 animate-fade-up">
                <div className="pt-4 grid gap-3">
                  {[
                    { key: "mood_override",     label: "Mood Override",          ph: "mis. Warm golden hour · Dark moody editorial" },
                    { key: "lighting_override",  label: "Lighting Override",      ph: "mis. Soft diffused · Hard cinematic shadows" },
                    { key: "color_direction",    label: "Color Direction",        ph: "mis. Monochrome green tones · Warm terracotta palette" },
                    { key: "negative_prompt",    label: "Negative Instructions",  ph: "mis. No people · No busy background · No text overlay" },
                    { key: "camera_notes",       label: "Camera Notes",           ph: "mis. Macro close-up · Wide angle · Shallow depth of field" },
                  ].map(({ key, label, ph }) => (
                    <div key={key}>
                      <p className="text-[10px] uppercase tracking-[0.15em] text-stone-400 font-semibold mb-1.5">{label}</p>
                      <input type="text" value={form[key]}
                        onChange={(e) => upd(key, e.target.value)}
                        className="input text-sm w-full"
                        placeholder={ph} />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {isAdmin && promptPreview && (
            <div id="prompt-preview-panel" className="animate-fade-up">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs uppercase tracking-[0.18em] text-brand-light font-semibold">Detail Konten</span>
              </div>
              <JsonOutput json={promptPreview.prompt_json} title="Banner Prompt JSON" testid="banner-json-output" />
            </div>
          )}

          {/* AI Capability Card */}
          <div className="rounded-2xl border border-green-100 p-4 bg-gradient-to-br from-green-50/60 to-white" data-testid="ai-capability-card">
            <div className="flex items-center gap-2 mb-3">
              <Sparkle size={14} weight="fill" className="text-brand-gold" />
              <p className="text-xs font-semibold text-brand">Feedify sedang menyiapkan desain terbaik untuk brand Anda</p>
            </div>
            <div className="space-y-1.5">
              {[
                "Menganalisis karakter visual dan Brand DNA secara otomatis",
                "Memilih konsep, komposisi, dan pencahayaan yang paling sesuai",
                "Menyesuaikan warna, mood, dan gaya desain agar konsisten",
                "Mengoptimalkan visual agar konsisten dengan identitas dan karakter brand",
                "Menghasilkan visual resolusi tinggi yang siap dipublikasikan",
              ].map((item) => (
                <div key={item} className="flex items-start gap-2">
                  <CheckCircle size={12} weight="fill" className="text-green-500 flex-shrink-0 mt-0.5" />
                  <span className="text-[11px] text-stone-600 leading-snug">{item}</span>
                </div>
              ))}
            </div>
            <p className="text-[10px] text-stone-400 mt-3">⏱ Estimasi proses sekitar 20–40 detik.</p>
          </div>

          {/* Desktop inline buttons */}
          <div className="hidden lg:block space-y-2 pt-1">
            {isAdmin && (
              <button onClick={previewPrompt} disabled={previewing || generating}
                data-testid="preview-prompt-btn"
                className="w-full h-10 border-2 border-brand text-brand rounded-full font-bold text-sm hover:bg-brand-sand transition-colors disabled:opacity-60 inline-flex items-center justify-center gap-1.5">
                {previewing ? <CircleNotch size={13} className="animate-spin" /> : <CheckCircle size={13} weight="duotone" />}
                Preview Prompt
              </button>
            )}
            <button onClick={generate} disabled={generating} data-testid="generate-banner-btn"
              className="w-full h-11 bg-brand text-brand-cream rounded-full font-bold text-sm hover:bg-brand-light btn-lift inline-flex items-center justify-center gap-2 disabled:opacity-60 shadow-md shadow-brand/20 transition-colors">
              {generating
                ? <><CircleNotch size={15} className="animate-spin" /> Sedang bekerja...</>
                : <><Sparkle size={15} weight="fill" /> Generate Feed Post</>}
            </button>
          </div>
        </div>

        {/* ── Right Sidebar ─────────────────────────────────────────────────────── */}
        <div className="lg:sticky lg:top-6 lg:self-start space-y-4">
          <div className="feedify-card p-4 space-y-2.5">
            <div className="text-xs uppercase tracking-[0.18em] text-brand-light font-bold">Creative Brief</div>
            <BriefRow label="Produk"  value={form.product_name || "—"} />
            <BriefRow label="Goal"    value={form.campaign_goal.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())} />
            <BriefRow label="Mood"    value={VISUAL_MOODS.find(m => m.id === form.visual_mood)?.name || "Auto"} />
            <BriefRow label="Style"   value={VISUAL_CONCEPTS.find(c => c.id === form.composition_concept)?.name || "Auto"} />
            <BriefRow label="Ratio"   value={form.aspect_ratio.split(" ")[0]} />
            <BriefRow label="People"  value={form.include_people ? "Ya" : "Tidak"} />
            {form.headline && <BriefRow label="Pesan Utama" value={form.headline} truncate />}
          </div>

          <BrandDnaCard />

          <div className="feedify-card p-5">
            <div className="text-xs uppercase tracking-[0.18em] text-brand-light font-bold mb-3 flex items-center gap-1.5">
              <Lightning size={14} weight="fill" /> Live Preview
            </div>
            <GeneratedPreview
              imageBase64={result?.image_base64}
              loading={generating}
              aspectRatio={form.aspect_ratio}
              onRegenerate={result?.id ? regenerate : null}
              regenerating={regenerating}
              testid="banner-preview"
            />
            {result && (
              <div className="mt-3 inline-flex items-center gap-1.5 text-xs text-green-700 bg-green-50 px-2 py-1 rounded-full">
                <CheckCircle size={12} weight="fill" /> Tersimpan di History
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Caption Bundle */}
      {(generatingCaptions || captions) && (
        <div className="animate-fade-up space-y-4" data-testid="caption-bundle">
          <div className="flex items-center gap-2">
            <ChatCircle size={22} weight="duotone" className="text-brand" />
            <h2 className="font-heading text-xl font-bold text-brand">Caption Bundle</h2>
            {generatingCaptions && <CircleNotch size={16} className="animate-spin text-brand-light" />}
          </div>
          {captions && (
            <>
              <div className="grid sm:grid-cols-2 gap-3">
                {(captions.captions || []).map((c, i) => (
                  <CaptionCard key={i} caption={c} />
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

      {/* ── Sticky Generate Bar (mobile only) ───────────────────────────────── */}
      <div className="lg:hidden fixed bottom-16 left-0 right-0 z-50 backdrop-blur-md border-t border-stone-200"
        style={{ background: "rgba(242,246,244,0.94)" }}>
        <div className="max-w-4xl mx-auto px-4 py-2.5 flex items-center gap-2.5">
          <div className="hidden sm:block flex-1" />
          {isAdmin && (
            <button onClick={previewPrompt} disabled={previewing || generating}
              data-testid="preview-prompt-btn"
              className="h-10 px-5 shrink-0 border-2 border-brand text-brand rounded-full font-bold text-sm hover:bg-brand-sand transition-colors disabled:opacity-60 inline-flex items-center gap-1.5">
              {previewing ? <CircleNotch size={13} className="animate-spin" /> : <CheckCircle size={13} weight="duotone" />}
              Preview
            </button>
          )}
          <button onClick={generate} disabled={generating} data-testid="generate-banner-btn"
            className="flex-1 sm:flex-none h-10 sm:px-7 sm:shrink-0 bg-brand text-brand-cream rounded-full font-bold text-sm hover:bg-brand-light btn-lift inline-flex items-center justify-center gap-2 disabled:opacity-60 shadow-md shadow-brand/20 transition-colors">
            {generating
              ? <><CircleNotch size={15} className="animate-spin" /> Sedang bekerja...</>
              : <><Sparkle size={15} weight="fill" /> Generate Feed Post</>}
          </button>
        </div>
      </div>

      <NoCreditsModal open={noCredits} onClose={() => setNoCredits(false)} />
      <InspirationGallery
        open={galleryOpen}
        onClose={() => setGalleryOpen(false)}
        context="banner"
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

// ── Visual concept CSS previews ────────────────────────────────────────────────

function ConceptVisual({ id, accent }) {
  const s = { position: "absolute", inset: 0, overflow: "hidden" };
  const center = { position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" };

  // ☀️ Bersih & Terang — clean white studio, product with soft shadow
  if (id === "hero_studio") return (
    <div style={s}>
      {/* soft spotlight from top */}
      <div style={{ position: "absolute", top: -20, left: "50%", transform: "translateX(-50%)", width: 80, height: 80, background: "radial-gradient(circle, rgba(255,255,255,0.9) 0%, transparent 70%)" }} />
      {/* product bottle */}
      <div style={{ ...center }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", position: "relative" }}>
          {/* cap */}
          <div style={{ width: 14, height: 7, background: accent, borderRadius: "4px 4px 0 0", opacity: 0.85 }} />
          {/* neck */}
          <div style={{ width: 11, height: 8, background: "linear-gradient(90deg, #d8ede5, #fff, #d0e9e0)" }} />
          {/* body */}
          <div style={{ width: 26, height: 36, borderRadius: "3px 3px 6px 6px", background: "linear-gradient(105deg, #d8ede5 0%, #fff 38%, #fcfffd 62%, #cce8db 100%)", boxShadow: "3px 5px 14px rgba(0,0,0,0.13), inset -2px 0 5px rgba(0,0,0,0.04)" }}>
            {/* label */}
            <div style={{ margin: "9px auto 0", width: 17, height: 14, background: accent + "1a", borderRadius: 2, border: `1px solid ${accent}22` }} />
            {/* highlight streak */}
            <div style={{ position: "absolute", top: 4, left: "28%", width: 3, height: "80%", background: "linear-gradient(180deg, rgba(255,255,255,0.55), transparent)", borderRadius: 2 }} />
          </div>
          {/* floor shadow */}
          <div style={{ position: "absolute", bottom: -6, left: "50%", transform: "translateX(-50%)", width: 38, height: 5, background: "rgba(0,0,0,0.07)", borderRadius: "50%", filter: "blur(3px)" }} />
        </div>
      </div>
    </div>
  );

  // 🌿 Natural & Hangat — warm environment, wood table, plants
  if (id === "lifestyle_scene") return (
    <div style={s}>
      {/* blurred bg atmosphere */}
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(184,144,112,0.5) 0%, rgba(234,213,188,0.3) 55%, rgba(212,184,150,0.8) 100%)" }} />
      {/* table surface */}
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "38%", background: "linear-gradient(180deg, #c8a87a 0%, #b08060 100%)", opacity: 0.75 }} />
      {/* table edge line */}
      <div style={{ position: "absolute", bottom: "38%", left: 0, right: 0, height: 1.5, background: "rgba(80,40,10,0.18)" }} />
      {/* leaf left */}
      <div style={{ position: "absolute", left: 10, bottom: "34%", zIndex: 1 }}>
        <div style={{ width: 14, height: 22, background: "#6a9060", borderRadius: "80% 20% 80% 20%", transform: "rotate(-30deg)", opacity: 0.75 }} />
        <div style={{ position: "absolute", top: 3, left: 2, width: 10, height: 18, background: "#7aa870", borderRadius: "80% 20% 80% 20%", transform: "rotate(-30deg)", opacity: 0.5 }} />
      </div>
      {/* leaf right */}
      <div style={{ position: "absolute", right: 12, bottom: "32%", zIndex: 1 }}>
        <div style={{ width: 12, height: 18, background: "#5a8050", borderRadius: "20% 80% 20% 80%", transform: "rotate(25deg)", opacity: 0.6 }} />
      </div>
      {/* product */}
      <div style={{ ...center, zIndex: 2 }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginTop: 8 }}>
          <div style={{ width: 12, height: 6, background: accent, borderRadius: "3px 3px 0 0", opacity: 0.8 }} />
          <div style={{ width: 10, height: 7, background: "linear-gradient(90deg, #e8d5c0, #fff, #e0ccb4)" }} />
          <div style={{ width: 23, height: 33, borderRadius: "2px 2px 5px 5px", background: "linear-gradient(100deg, #eddcc8 0%, #fff 35%, #fefdfb 65%, #e4cdb0 100%)", boxShadow: "0 4px 12px rgba(0,0,0,0.2), 0 1px 3px rgba(0,0,0,0.1)" }}>
            <div style={{ margin: "8px auto 0", width: 14, height: 13, background: "rgba(139,94,60,0.1)", borderRadius: 2 }} />
          </div>
        </div>
      </div>
    </div>
  );

  // 🎨 Disusun dari Atas — top-down flatlay with props
  if (id === "flat_lay") return (
    <div style={s}>
      {/* subtle texture */}
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at 50% 50%, #fff 0%, #f2ede4 100%)" }} />
      {/* flower top-left */}
      <div style={{ position: "absolute", top: 8, left: 12 }}>
        {[0,60,120,180,240,300].map(deg => (
          <div key={deg} style={{ position: "absolute", width: 6, height: 10, background: "#e8c4b8", borderRadius: "50%", transformOrigin: "50% 100%", transform: `rotate(${deg}deg) translateY(-5px)`, opacity: 0.7 }} />
        ))}
        <div style={{ position: "absolute", width: 6, height: 6, background: "#f0d4a0", borderRadius: "50%", top: -3, left: -3 }} />
      </div>
      {/* strip card top-right */}
      <div style={{ position: "absolute", top: 10, right: 10, width: 22, height: 14, background: "rgba(255,255,255,0.8)", borderRadius: 3, border: "1px solid rgba(0,0,0,0.06)", transform: "rotate(8deg)" }} />
      {/* small circle bottom-left */}
      <div style={{ position: "absolute", bottom: 10, left: 14, width: 14, height: 14, borderRadius: "50%", background: "radial-gradient(circle at 35% 35%, #fff 0%, #e8d8c8 100%)", boxShadow: "0 1px 4px rgba(0,0,0,0.1)" }} />
      {/* ribbon bottom-right */}
      <div style={{ position: "absolute", bottom: 12, right: 12, width: 20, height: 5, background: "linear-gradient(90deg, #d4c4b0, #e8ddd0)", borderRadius: 2, transform: "rotate(-12deg)" }} />
      {/* main product — center */}
      <div style={{ ...center }}>
        <div style={{ width: 32, height: 32, background: "white", borderRadius: 5, boxShadow: "0 3px 10px rgba(0,0,0,0.13), 0 0 0 1px rgba(0,0,0,0.04)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ width: 20, height: 16, background: accent + "18", borderRadius: 3, border: `1px solid ${accent}25` }} />
        </div>
      </div>
    </div>
  );

  // 💎 Mewah & Eksklusif — dark luxury, dramatic gold light
  if (id === "shadow_drama") return (
    <div style={s}>
      {/* dramatic light beam */}
      <div style={{ position: "absolute", top: -10, left: "38%", width: 40, height: 110, background: "linear-gradient(165deg, rgba(229,193,88,0.18) 0%, rgba(229,193,88,0.06) 45%, transparent 100%)", transform: "rotate(-12deg)" }} />
      {/* secondary soft fill */}
      <div style={{ position: "absolute", top: 0, right: 0, width: 60, height: 80, background: "radial-gradient(ellipse at 80% 20%, rgba(229,193,88,0.07) 0%, transparent 70%)" }} />
      {/* floor reflection */}
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "28%", background: "linear-gradient(180deg, transparent, rgba(229,193,88,0.05))" }} />
      {/* product */}
      <div style={{ ...center }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
          {/* cap */}
          <div style={{ width: 14, height: 8, borderRadius: "4px 4px 0 0", background: "linear-gradient(90deg, #111 0%, #2e2e2e 40%, #444 55%, #1a1a1a 100%)", position: "relative" }}>
            <div style={{ position: "absolute", top: 0, left: 0, width: "35%", height: "100%", background: "rgba(229,193,88,0.35)", borderRadius: "4px 0 0 0" }} />
          </div>
          {/* neck */}
          <div style={{ width: 11, height: 8, background: "linear-gradient(90deg, #1a1a1a, #383838, #1c1c1c)" }} />
          {/* body */}
          <div style={{ width: 28, height: 40, borderRadius: "2px 2px 5px 5px", background: "linear-gradient(105deg, #0e0e0e 0%, #242424 28%, #3a3a3a 42%, #2a2a2a 60%, #0e0e0e 100%)", boxShadow: "5px 8px 20px rgba(0,0,0,0.85), -1px 0 8px rgba(229,193,88,0.08)", border: "1px solid rgba(255,255,255,0.03)", position: "relative" }}>
            {/* gold label */}
            <div style={{ margin: "9px auto 0", width: 17, height: 15, background: "rgba(229,193,88,0.07)", borderRadius: 2, border: "1px solid rgba(229,193,88,0.18)" }} />
            {/* highlight streak */}
            <div style={{ position: "absolute", top: 0, left: "22%", width: 3.5, height: "100%", background: "linear-gradient(180deg, rgba(229,193,88,0.18) 0%, rgba(255,255,255,0.06) 40%, transparent 100%)", borderRadius: 2 }} />
          </div>
          {/* floor shadow */}
          <div style={{ position: "absolute", bottom: 6, left: "50%", transform: "translateX(-50%)", width: 42, height: 4, background: "rgba(0,0,0,0.7)", borderRadius: "50%", filter: "blur(4px)" }} />
        </div>
      </div>
    </div>
  );

  return null;
}

// ── Utility components ─────────────────────────────────────────────────────────

function RatioFrame({ w, h, active }) {
  const maxW = 38, maxH = 38;
  const scale  = Math.min(maxW / w, maxH / h);
  const width  = Math.round(w * scale);
  const height = Math.round(h * scale);
  return (
    <div className="flex items-center justify-center" style={{ width: 44, height: 44 }}>
      <div
        className={`relative rounded-[3px] border-2 overflow-hidden transition-colors ${
          active ? "border-brand" : "border-stone-300"
        }`}
        style={{ width, height, background: active ? "rgba(11,61,46,0.1)" : "#f5f5f4" }}>
        {/* photo placeholder hint */}
        <div className="absolute inset-0 flex flex-col justify-end p-[3px] gap-[2px]">
          <div className={`rounded-full ${active ? "bg-brand/30" : "bg-stone-300"}`} style={{ height: 2 }} />
          <div className={`rounded-full w-3/4 ${active ? "bg-brand/20" : "bg-stone-200"}`} style={{ height: 1.5 }} />
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return <div><label className="text-xs font-semibold uppercase tracking-[0.15em] text-stone-500 mb-1.5 block">{label}</label>{children}</div>;
}

function BriefRow({ label, value, truncate }) {
  return (
    <div className="flex items-center justify-between text-xs gap-2">
      <span className="text-stone-400 flex-shrink-0">{label}</span>
      <span className={`font-semibold text-stone-700 text-right ${truncate ? "truncate max-w-[65%]" : "max-w-[65%]"}`}>{value}</span>
    </div>
  );
}

function CaptionCard({ caption }) {
  return (
    <div className="feedify-card p-4">
      <div className="flex items-center justify-between mb-2">
        <div>
          <div className="font-heading text-sm font-bold text-brand">{caption.style}</div>
          <div className="text-[10px] text-stone-500">{caption.label}</div>
        </div>
        <CopyBtn text={caption.text} />
      </div>
      <p className="text-sm text-stone-700 leading-relaxed">{caption.text}</p>
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
