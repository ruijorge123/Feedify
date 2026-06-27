import { useEffect, useState, useRef } from "react";
import api from "@/lib/api";
import { toast } from 'react-toastify';
import { handleGenerateError } from "@/lib/moderation";
import { useAuth } from "@/context/AuthContext";
import JsonOutput from "@/components/JsonOutput";
import {
  ForkKnife, Plus, X, Sparkle, CircleNotch, CheckCircle,
  Camera, Images, Warning,
} from "@phosphor-icons/react";
import GeneratedPreview from "@/components/GeneratedPreview";
import BrandDnaCard from "@/components/BrandDnaCard";
import NoCreditsModal from "@/components/NoCreditsModal";
import ReferenceUpload from "@/components/ReferenceUpload";
import InspirationGallery from "@/components/InspirationGallery";
import { notifyCreditsUpdate } from "@/lib/credits";
import CampaignGoalSelector from "@/components/CampaignGoalSelector";

// ── Constants ──────────────────────────────────────────────────────────────────

const POSTER_USAGES = [
  { id: "instagram_feed", name: "Instagram Feed", desc: "Post vertikal 4:5",    ratio: "4:5 (Portrait Feed)" },
  { id: "story_reels",    name: "Story / Reels",  desc: "Vertikal penuh 9:16",  ratio: "9:16 (Story/Reels)" },
  { id: "square_post",    name: "Square Post",    desc: "Feed kotak 1:1",       ratio: "1:1 (Square Feed)" },
  { id: "menu_board",     name: "Menu Board",     desc: "Display menu digital", ratio: "4:5 (Portrait Feed)" },
  { id: "flyer",          name: "Flyer / Promo",  desc: "Print & digital",      ratio: "4:5 (Portrait Feed)" },
];

const MOODS = [
  { id: "cozy",    name: "Cozy",    desc: "Hangat, intimate" },
  { id: "modern",  name: "Modern",  desc: "Minimal, clean" },
  { id: "rustic",  name: "Rustic",  desc: "Artisanal, natural" },
  { id: "luxury",  name: "Luxury",  desc: "Fine dining" },
  { id: "vibrant", name: "Vibrant", desc: "Bold, energetic" },
];

// Hero & Menu List removed — auto-derived only
const LAYOUTS = [
  { id: "auto",            name: "Auto",     desc: "AI pilih komposisi terbaik" },
  { id: "multi-grid",      name: "Grid",     desc: "Multi dish setara" },
  { id: "magazine-spread", name: "Magazine", desc: "Editorial premium" },
];

const ITEM_TAGS = [
  { id: "",            name: "None",        tagClass: "bg-stone-50 text-stone-400 border-stone-200" },
  { id: "best_seller", name: "Best Seller", tagClass: "bg-amber-50 text-amber-700 border-amber-200" },
  { id: "promo",       name: "Promo",       tagClass: "bg-red-50 text-red-700 border-red-200" },
  { id: "new",         name: "New",         tagClass: "bg-green-50 text-green-700 border-green-200" },
  { id: "signature",   name: "Signature",   tagClass: "bg-purple-50 text-purple-700 border-purple-200" },
  { id: "limited",     name: "Limited",     tagClass: "bg-blue-50 text-blue-700 border-blue-200" },
];


const GENERATE_STEPS = [
  "Feedify Photographer",
  "Feedify Food Stylist",
  "Feedify Layout Director",
  "Feedify Copy Director",
];

const CTA_CHIPS = (brandName) => [
  `Follow IG @${brandName || "brandmu"}`,
  "Order via WhatsApp",
  "Order di GoFood",
  "Order di GrabFood",
  "Order di ShopeeFood",
  "DM untuk Menu Lengkap",
];

// ── Derivation helpers ─────────────────────────────────────────────────────────

const getPosterRatio = (u) => POSTER_USAGES.find(p => p.id === u)?.ratio || "4:5 (Portrait Feed)";

const deriveLayout = (posterUsage, productCount, manualLayout, itemCount) => {
  if (manualLayout !== "auto") return manualLayout;
  const count = productCount === "auto" ? (itemCount || 1) : parseInt(productCount);
  if (posterUsage === "menu_board") return "menu-board";
  if (count === 1)  return "hero-single";
  if (count <= 4)   return "multi-grid";
  return "menu-board";
};

const deriveComposition = (count) => {
  if (count <= 1)  return "hero";
  if (count === 3) return "triangle";
  if (count >= 6)  return "grid_restaurant";
  return "grid";
};

const COMPOSITION_LABELS = {
  hero: "Hero Poster", triangle: "Triangle (3 dish)",
  grid_restaurant: "Restaurant Grid", grid: "Grid Layout",
};


const EMPTY_ITEM = { name: "", description: "", price: "", tag: "", photo: null };

const DEFAULT_FORM = {
  poster_usage:   "instagram_feed",
  campaign_goal:  "best_seller",
  headline:       "",
  call_to_action: "",
  items:          [],
  mood:           "cozy",
  layout:         "auto",
  menu_name:      "",
  save:           true,
};

// ── Main component ─────────────────────────────────────────────────────────────

export default function FoodMenuPage() {
  const { user }   = useAuth();
  const isAdmin    = user?.role === "admin";

  const [form, setForm]         = useState(DEFAULT_FORM);
  const [newItem, setNewItem]   = useState(EMPTY_ITEM);
  const [generating, setGenerating]   = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [genStep, setGenStep]   = useState(-1);
  const [result, setResult]     = useState(null);
  const [brand, setBrand]       = useState(null);
  const [referenceImg, setReferenceImg] = useState(null);
  const [noCredits, setNoCredits]   = useState(false);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [promptPreview, setPromptPreview] = useState(null);
  const [previewing, setPreviewing]   = useState(false);

  const newItemPhotoRef  = useRef(null);
  const editItemPhotoRef = useRef(null);
  const [editingPhotoIdx, setEditingPhotoIdx] = useState(null);

  const upd = (k, v) => setForm(f => ({ ...f, [k]: v }));

  useEffect(() => {
    api.get("/brand-profile").then(({ data }) => setBrand(data)).catch(() => {});
  }, []);

  // Fake progress steps during generation
  useEffect(() => {
    if (!generating) { setGenStep(-1); return; }
    setGenStep(0);
    const timers = [
      setTimeout(() => setGenStep(1), 1800),
      setTimeout(() => setGenStep(2), 4000),
      setTimeout(() => setGenStep(3), 7000),
    ];
    return () => timers.forEach(clearTimeout);
  }, [generating]);

  const handlePosterUsageChange = (id) => {
    setForm(f => ({ ...f, poster_usage: id }));
  };

  // ── Item management ──────────────────────────────────────────────────────────

  const readPhoto = (file, onLoad) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error("Foto max 5MB"); return; }
    const r = new FileReader();
    r.onload = () => onLoad(r.result);
    r.readAsDataURL(file);
  };

  const handleNewItemPhoto = (e) => {
    readPhoto(e.target.files?.[0], (src) => setNewItem(n => ({ ...n, photo: src })));
    e.target.value = "";
  };

  const handleEditItemPhoto = (e) => {
    readPhoto(e.target.files?.[0], (src) => {
      if (editingPhotoIdx === null) return;
      upd("items", form.items.map((item, i) => i === editingPhotoIdx ? { ...item, photo: src } : item));
      setEditingPhotoIdx(null);
    });
    e.target.value = "";
  };

  const addItem = () => {
    if (!newItem.name.trim()) { toast.error("Nama menu wajib diisi"); return; }
    upd("items", [...form.items, { ...newItem }]);
    setNewItem(EMPTY_ITEM);
  };

  const removeItem = (i) => upd("items", form.items.filter((_, idx) => idx !== i));

  // ── Payload ──────────────────────────────────────────────────────────────────

  const buildPayload = () => {
    const count          = form.items.length;
    const ratio          = getPosterRatio(form.poster_usage);
    const layoutStrategy = deriveLayout(form.poster_usage, String(count), form.layout, count);
    const composition    = deriveComposition(count);
    return {
      menu_name:            form.headline || form.campaign_goal,
      headline:             form.headline,
      call_to_action:       form.call_to_action,
      campaign_goal:        form.campaign_goal,
      mood:                 form.mood,
      layout:               layoutStrategy,
      aspect_ratio:         ratio,
      save:                 form.save,
      poster_usage:         form.poster_usage,
      product_count:        count,
      layout_strategy:      layoutStrategy,
      composition_strategy: composition,
      poster_strategy:      form.poster_usage,
      items: form.items.map(item => ({
        name:         item.name,
        description:  item.description,
        price:        item.price,
        tag:          item.tag,
        photo_base64: item.photo ? item.photo.split(",")[1] : null,
      })),
      ...(referenceImg ? { reference_image_base64: referenceImg.split(",")[1] } : {}),
    };
  };

  const validate = () => {
    if (form.items.length === 0) { toast.error("Tambahkan minimal satu item menu"); return false; }
    if (form.items.some(i => !i.photo))
      toast.warning("Beberapa item belum ada foto — hasil mungkin kurang optimal", { autoClose: 5000 });
    return true;
  };

  // ── API ──────────────────────────────────────────────────────────────────────

  const generate = async () => {
    if (!validate()) return;
    setGenerating(true); setResult(null);
    try {
      const { data } = await api.post("/prompt/generate-food-menu", buildPayload());
      setResult(data);
      if (data.credits) notifyCreditsUpdate(data.credits);
      toast.success("Food menu visual siap!");
    } catch (err) {
      if (err?.response?.status === 402) setNoCredits(true);
      else { const handled = handleGenerateError(err); if (!handled) toast.error("Gagal generate. Coba lagi."); }
    } finally { setGenerating(false); }
  };

  const previewPrompt = async () => {
    if (!validate()) return;
    setPreviewing(true); setPromptPreview(null);
    try {
      const { data } = await api.post("/prompt/preview-food-menu", buildPayload());
      setPromptPreview(data);
      setTimeout(() => document.getElementById("food-preview-panel")?.scrollIntoView({ behavior: "smooth" }), 100);
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Gagal memuat preview");
    } finally { setPreviewing(false); }
  };

  const regenerate = async () => {
    if (!result?.id) return;
    setRegenerating(true);
    try {
      const { data } = await api.post("/prompt/regenerate", { prompt_id: result.id });
      setResult({ ...result, image_base64: data.image_base64 });
      if (data.credits) notifyCreditsUpdate(data.credits);
    } catch (err) {
      if (err?.response?.status === 402) setNoCredits(true);
      else toast.error("Gagal regenerate");
    } finally { setRegenerating(false); }
  };

  // ── Derived UI ───────────────────────────────────────────────────────────────

  const itemCount       = form.items.length;
  const derivedLayout   = deriveLayout(form.poster_usage, String(itemCount), form.layout, itemCount);
  const compLabel       = COMPOSITION_LABELS[deriveComposition(itemCount)] || "Grid";
  const ratioLabel      = getPosterRatio(form.poster_usage);
  const itemsMissingPhoto = form.items.some(i => !i.photo);

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6" data-testid="food-menu-page">
      <input ref={newItemPhotoRef}  type="file" accept="image/*" className="hidden" onChange={handleNewItemPhoto} />
      <input ref={editItemPhotoRef} type="file" accept="image/*" className="hidden" onChange={handleEditItemPhoto} />

      <div className="animate-fade-up">
        <h1 className="font-heading text-3xl sm:text-4xl font-bold text-brand tracking-tight">F&B Creative Studio</h1>
        <p className="text-stone-600 mt-2 max-w-2xl">
          Upload foto menu, pilih kampanye, klik generate — Feedify merancang visual restoran siap posting.
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* ── Left column ─────────────────────────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-4 animate-fade-up min-w-0">

          {/* 1 — Poster Usage */}
          <div className="feedify-card p-6 space-y-3">
            <SectionLabel>Untuk apa?</SectionLabel>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {POSTER_USAGES.map(({ id, name, desc }) => (
                <button key={id} type="button" data-testid={`poster-usage-${id}`}
                  onClick={() => handlePosterUsageChange(id)}
                  className={`text-left p-3.5 rounded-xl border-2 transition-all ${
                    form.poster_usage === id ? "border-brand bg-brand-sand" : "border-stone-100 hover:border-brand/30 bg-white"
                  }`}>
                  <div className={`font-bold text-sm ${form.poster_usage === id ? "text-brand" : "text-stone-700"}`}>{name}</div>
                  <div className="text-[10px] text-stone-400 mt-0.5">{desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* 2 — Menu Items */}
          <div className="feedify-card p-6 space-y-4">
            <div className="flex items-center justify-between">
              <SectionLabel>Item Menu</SectionLabel>
              {form.items.length > 0 && (
                <span className="text-xs text-stone-400 font-medium">{form.items.length} item ditambahkan</span>
              )}
            </div>

            {/* Item list */}
            {form.items.length > 0 && (
              <div className="space-y-2" data-testid="food-items-list">
                {form.items.map((item, i) => {
                  const tagInfo = ITEM_TAGS.find(t => t.id === item.tag) || ITEM_TAGS[0];
                  return (
                    <div key={i} data-testid={`food-item-${i}`}
                      className="flex items-center gap-3 p-2.5 rounded-xl border border-stone-100 bg-white transition-all">
                      {/* Thumbnail */}
                      <button type="button" data-testid={`item-photo-btn-${i}`}
                        onClick={() => { setEditingPhotoIdx(i); editItemPhotoRef.current?.click(); }}
                        className="relative flex-shrink-0 w-14 h-14 rounded-xl overflow-hidden border border-stone-100 hover:border-brand/30 bg-stone-50 flex items-center justify-center group transition-all">
                        {item.photo
                          ? <img src={item.photo} alt={item.name} className="w-full h-full object-cover" />
                          : <Camera size={16} weight="duotone" className="text-stone-300" />
                        }
                        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all rounded-xl">
                          <Camera size={12} className="text-white" />
                        </div>
                        {!item.photo && (
                          <div className="absolute -top-1 -right-1 w-4 h-4 bg-amber-400 rounded-full flex items-center justify-center">
                            <Warning size={8} weight="fill" className="text-white" />
                          </div>
                        )}
                      </button>

                      {/* Info — Nama → Harga → Deskripsi */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold text-stone-800 text-sm truncate">{item.name}</span>
                          {item.tag && (
                            <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold border ${tagInfo.tagClass}`}>
                              {tagInfo.name}
                            </span>
                          )}
                        </div>
                        {item.price && (
                          <div className="text-xs font-semibold text-brand-light mt-0.5">{item.price}</div>
                        )}
                        {item.description && (
                          <div className="text-[10px] text-stone-400 mt-0.5 truncate">{item.description}</div>
                        )}
                      </div>

                      <button type="button" onClick={() => removeItem(i)} data-testid={`remove-item-${i}`}
                        className="flex-shrink-0 p-1.5 hover:bg-red-50 rounded-lg text-stone-300 hover:text-red-500 transition-all">
                        <X size={14} weight="bold" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Add item form — Foto → Nama → Harga → Deskripsi */}
            <div className="border-2 border-dashed border-stone-200 rounded-xl p-4 space-y-3 hover:border-brand/20 transition-all">
              {/* Photo upload */}
              <button type="button" data-testid="new-item-photo-btn"
                onClick={() => newItemPhotoRef.current?.click()}
                className="w-full h-24 rounded-xl border-2 border-dashed border-stone-200 hover:border-brand/30 bg-stone-50 hover:bg-brand-sand/30 overflow-hidden transition-all flex items-center justify-center">
                {newItem.photo
                  ? <img src={newItem.photo} alt="preview" className="w-full h-full object-cover rounded-xl" />
                  : (
                    <div className="flex flex-col items-center gap-1.5">
                      <Camera size={22} weight="duotone" className="text-stone-300" />
                      <span className="text-[11px] font-semibold text-stone-400">Upload Foto Menu</span>
                    </div>
                  )
                }
              </button>

              {/* Nama Menu */}
              <input type="text" className="input font-semibold"
                placeholder="Nama Menu  (mis. Es Kopi Susu Aren)"
                value={newItem.name}
                onChange={(e) => setNewItem(n => ({ ...n, name: e.target.value }))}
                onKeyDown={(e) => e.key === "Enter" && addItem()}
                data-testid="item-name-input" />

              {/* Harga */}
              <input type="text" className="input"
                placeholder="Harga  (mis. Rp 28.000)"
                value={newItem.price}
                onChange={(e) => setNewItem(n => ({ ...n, price: e.target.value }))}
                data-testid="item-price-input" />

              {/* Deskripsi */}
              <input type="text" className="input"
                placeholder="Deskripsi  (mis. Espresso + Fresh Milk)"
                value={newItem.description}
                onChange={(e) => setNewItem(n => ({ ...n, description: e.target.value }))}
                data-testid="item-desc-input" />

              {/* Badge dropdown */}
              <select
                className="input text-sm"
                value={newItem.tag}
                onChange={(e) => setNewItem(n => ({ ...n, tag: e.target.value }))}
                data-testid="item-tag-select">
                {ITEM_TAGS.map(({ id, name }) => (
                  <option key={id} value={id}>Badge: {name}</option>
                ))}
              </select>

              {/* Large Add button */}
              <button type="button" onClick={addItem} data-testid="add-item-btn"
                className="w-full py-3.5 bg-brand-sand hover:bg-brand/10 border-2 border-brand/20 hover:border-brand/40 text-brand rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2">
                <Plus size={16} weight="bold" /> Tambah Menu
              </button>
            </div>

          </div>

          {/* Smart Composition Strip */}
          {itemCount > 0 && (
            <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-brand-sand/50 border border-brand-sand text-xs animate-fade-up flex-wrap">
              <ForkKnife size={13} weight="duotone" className="text-brand-light flex-shrink-0" />
              <span className="text-stone-500">Feedify akan gunakan</span>
              <span className="font-bold text-brand">{compLabel}</span>
              <span className="text-stone-300">·</span>
              <span className="font-semibold text-stone-600">{ratioLabel}</span>
              <span className="text-stone-300">·</span>
              <span className="text-stone-500">{LAYOUTS.find(l => l.id === derivedLayout)?.name || derivedLayout}</span>
            </div>
          )}

          {/* 3 — Visual Direction */}
          <div className="feedify-card p-6 space-y-4">
            <SectionLabel>Visual Direction</SectionLabel>
            <Field label="Mood">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {MOODS.map(({ id, name, desc }) => (
                  <button key={id} type="button" data-testid={`food-mood-${id}`}
                    onClick={() => upd("mood", id)}
                    className={`text-left p-3 rounded-xl border-2 transition-all ${
                      form.mood === id ? "border-brand bg-brand-sand" : "border-stone-100 hover:border-brand/30 bg-white"
                    }`}>
                    <div className={`font-bold text-sm ${form.mood === id ? "text-brand" : "text-stone-700"}`}>{name}</div>
                    <div className="text-[10px] text-stone-400 mt-0.5">{desc}</div>
                  </button>
                ))}
              </div>
            </Field>

            <Field label="Layout">
              <div className="grid grid-cols-3 gap-2">
                {LAYOUTS.map(({ id, name, desc }) => (
                  <button key={id} type="button" data-testid={`food-layout-${id}`}
                    onClick={() => upd("layout", id)}
                    className={`text-left p-3 rounded-xl border-2 transition-all ${
                      form.layout === id ? "border-brand-gold bg-brand-gold/10" : "border-stone-100 hover:border-brand/30 bg-white"
                    }`}>
                    <div className={`font-bold text-sm ${form.layout === id ? "text-brand" : "text-stone-700"}`}>{name}</div>
                    <div className="text-[10px] text-stone-400 mt-0.5">{desc}</div>
                  </button>
                ))}
              </div>
            </Field>
          </div>

          {/* 4 — Campaign & Copy */}
          <div className="feedify-card p-6 space-y-4">
            <SectionLabel>Kampanye & Teks</SectionLabel>
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-stone-400 mb-2">Campaign Goal</div>
              <CampaignGoalSelector value={form.campaign_goal} onChange={v => upd("campaign_goal", v)} defaultValue="best_seller" />
            </div>

            {/* Promo Text (was Headline) */}
            <Field label="Promo Text (opsional)">
              <input type="text" className="input"
                value={form.headline}
                onChange={(e) => upd("headline", e.target.value)}
                placeholder="mis. BUY 1 GET 1 · Diskon 30% · Happy Hour"
                data-testid="food-headline" />
            </Field>

            <Field label="Call-to-Action (opsional)">
              <input type="text" className="input"
                value={form.call_to_action}
                onChange={(e) => upd("call_to_action", e.target.value)}
                placeholder="mis. Order via WhatsApp"
                data-testid="food-cta" />
              <div className="flex flex-wrap gap-1.5 mt-2">
                {CTA_CHIPS(brand?.brand_name).map(chip => (
                  <button key={chip} type="button" onClick={() => upd("call_to_action", chip)}
                    className="text-[10px] px-2.5 py-1 rounded-full bg-stone-50 text-stone-400 hover:bg-brand-gold/15 hover:text-brand transition-all border border-stone-200 hover:border-brand-gold/30">
                    {chip}
                  </button>
                ))}
              </div>
            </Field>
          </div>

          {/* 5 — Advanced */}
          <div className="feedify-card p-5 space-y-3">
            <ReferenceUpload value={referenceImg} onChange={setReferenceImg} testid="food-reference" />
            <button type="button" onClick={() => setGalleryOpen(true)} data-testid="food-gallery-btn"
              className="w-full flex items-center justify-center gap-2 py-2.5 border border-dashed border-brand-sand rounded-xl text-sm font-semibold text-brand-light hover:border-brand hover:text-brand hover:bg-brand-sand/40 transition-all">
              <Images size={16} weight="duotone" /> Pilih dari Gallery Inspirasi F&B
            </button>
          </div>

          {/* Missing photo warning */}
          {form.items.length > 0 && itemsMissingPhoto && (
            <div className="flex items-start gap-2.5 px-4 py-3 rounded-xl bg-amber-50 border border-amber-100 text-xs text-amber-700 animate-fade-up">
              <Warning size={14} weight="fill" className="flex-shrink-0 mt-0.5" />
              <span>Beberapa item belum ada foto. Klik thumbnail kamera pada item untuk upload.</span>
            </div>
          )}

          {/* Generate */}
          <div className={isAdmin ? "flex flex-col sm:flex-row gap-3" : ""}>
            {isAdmin && (
              <button onClick={previewPrompt} disabled={previewing || generating} data-testid="preview-food-btn"
                className="flex-1 py-4 bg-white border-2 border-brand text-brand rounded-full font-bold text-base hover:bg-brand-sand btn-lift inline-flex items-center justify-center gap-2 disabled:opacity-50">
                {previewing ? <><CircleNotch size={18} className="animate-spin" /> Memuat...</> : <><CheckCircle size={18} weight="duotone" /> Preview Prompt</>}
              </button>
            )}
            <button onClick={generate} disabled={generating} data-testid="generate-food-btn"
              className={`${isAdmin ? "flex-1" : "w-full"} py-4 bg-brand text-brand-cream rounded-full font-bold text-lg hover:bg-brand-light btn-lift inline-flex items-center justify-center gap-2 disabled:opacity-60 shadow-lg`}>
              {generating
                ? <><CircleNotch size={20} className="animate-spin" /> Generating...</>
                : <><Sparkle size={20} weight="fill" /> Generate Visual <span className="opacity-70 text-sm font-medium">(1 kredit)</span></>}
            </button>
          </div>

          {/* Fake progress steps */}
          {generating && genStep >= 0 && (
            <div className="feedify-card p-5 animate-fade-up">
              <div className="space-y-3">
                {GENERATE_STEPS.map((step, i) => (
                  <div key={i} className={`flex items-center gap-3 text-sm transition-all duration-500 ${i <= genStep ? "opacity-100" : "opacity-25"}`}>
                    {i < genStep
                      ? <CheckCircle size={18} weight="fill" className="text-green-500 flex-shrink-0" />
                      : i === genStep
                      ? <CircleNotch size={18} className="animate-spin text-brand flex-shrink-0" />
                      : <div className="w-[18px] h-[18px] rounded-full border-2 border-stone-200 flex-shrink-0" />
                    }
                    <span className={i <= genStep ? "text-stone-800 font-medium" : "text-stone-400"}>{step}</span>
                    {i < genStep && <span className="ml-auto text-green-500 text-xs font-semibold">Done</span>}
                  </div>
                ))}
                {genStep >= GENERATE_STEPS.length - 1 && (
                  <div className="flex items-center gap-3 text-sm text-brand pt-1 border-t border-stone-100">
                    <CircleNotch size={18} className="animate-spin flex-shrink-0" />
                    <span className="font-semibold">Rendering final image...</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {isAdmin && promptPreview && (
            <div id="food-preview-panel" className="animate-fade-up">
              <div className="text-xs uppercase tracking-[0.18em] text-brand-light font-semibold mb-2">Prompt JSON</div>
              <JsonOutput json={promptPreview.prompt_json} title="Food Menu Prompt JSON" testid="food-json-output" />
            </div>
          )}
        </div>

        {/* ── Sidebar ─────────────────────────────────────────────────────────── */}
        <div className="lg:sticky lg:top-6 lg:self-start space-y-4">

          {/* Creative Brief */}
          <div className="feedify-card p-4 space-y-2.5">
            <div className="text-xs uppercase tracking-[0.18em] text-brand-light font-bold">Creative Brief</div>
            {brand?.category && <SummaryRow label="Business" value={brand.category} />}
            <SummaryRow label="Goal"   value={form.campaign_goal.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())} />
            <SummaryRow label="Output" value={POSTER_USAGES.find(p => p.id === form.poster_usage)?.name || "-"} />
            <SummaryRow label="Menus"  value={itemCount > 0 ? `${itemCount} item` : "Belum ada"} />
            <SummaryRow label="Mood"   value={MOODS.find(m => m.id === form.mood)?.name || "-"} />
            <SummaryRow label="Layout" value={LAYOUTS.find(l => l.id === form.layout)?.name || "Auto"} />
            <SummaryRow label="Ratio"  value={ratioLabel} />
          </div>

          {/* Layout Wireframe Preview */}
          <div className="feedify-card p-4">
            <div className="text-xs uppercase tracking-[0.18em] text-brand-light font-bold mb-3">Layout Preview</div>
            {result?.image_base64 ? (
              <GeneratedPreview
                imageBase64={result.image_base64}
                loading={generating}
                aspectRatio={ratioLabel}
                onRegenerate={result?.id ? regenerate : null}
                regenerating={regenerating}
                testid="food-preview"
              />
            ) : (
              <LayoutWireframe layout={derivedLayout} count={itemCount} ratio={ratioLabel} />
            )}
          </div>

          <BrandDnaCard />
        </div>
      </div>

      <NoCreditsModal open={noCredits} onClose={() => setNoCredits(false)} />
      <InspirationGallery
        open={galleryOpen}
        onClose={() => setGalleryOpen(false)}
        context="food"
        onSelect={(photo) => {
          fetch(`/gallery/${photo.category}/${photo.filename}`)
            .then(r => r.blob())
            .then(blob => {
              const reader = new FileReader();
              reader.onload = () => setReferenceImg(reader.result);
              reader.readAsDataURL(blob);
            });
        }}
      />
    </div>
  );
}

// ── Layout Wireframe ───────────────────────────────────────────────────────────

function LayoutWireframe({ layout, count, ratio }) {
  const isPortrait = ratio?.includes("4:5") || ratio?.includes("9:16");
  const isSquare   = ratio?.includes("1:1");
  const h = isSquare ? "pb-[100%]" : isPortrait ? "pb-[125%]" : "pb-[125%]";

  return (
    <div className={`relative w-full ${h} rounded-xl overflow-hidden bg-stone-50 border border-stone-100`}>
      <div className="absolute inset-0 p-3 flex flex-col">
        {layout === "hero-single" || layout === "auto" && count <= 1 ? (
          <HeroWire />
        ) : layout === "multi-grid" || (layout === "auto" && count >= 2 && count <= 4) ? (
          <GridWire count={count || 2} />
        ) : layout === "magazine-spread" ? (
          <MagazineWire />
        ) : (
          <MenuBoardWire count={count || 6} />
        )}
      </div>
      <div className="absolute bottom-2 left-0 right-0 text-center">
        <span className="text-[9px] text-stone-300 font-semibold uppercase tracking-wider">
          {layout === "auto" ? "Auto Layout" : LAYOUTS.find(l => l.id === layout)?.name || layout}
        </span>
      </div>
    </div>
  );
}

function HeroWire() {
  return (
    <div className="flex flex-col h-full gap-2">
      <div className="h-3 w-16 bg-stone-200 rounded" />
      <div className="flex-1 bg-stone-200 rounded-lg flex items-center justify-center">
        <ForkKnife size={20} className="text-stone-300" weight="duotone" />
      </div>
      <div className="space-y-1.5">
        <div className="h-2.5 w-3/4 bg-brand/20 rounded" />
        <div className="h-2 w-1/3 bg-stone-200 rounded" />
        <div className="h-6 w-24 bg-brand/30 rounded-full mx-auto mt-1" />
      </div>
    </div>
  );
}

function GridWire({ count }) {
  const cols = 2;
  const rows = Math.ceil(Math.min(count, 4) / cols);
  return (
    <div className="flex flex-col h-full gap-2">
      <div className="h-2.5 w-20 bg-stone-200 rounded" />
      <div className="flex-1 grid grid-cols-2 gap-1.5">
        {Array.from({ length: Math.min(count, 4) }).map((_, i) => (
          <div key={i} className="bg-stone-200 rounded-lg flex flex-col justify-end p-1.5 gap-1">
            <div className="h-1.5 w-3/4 bg-stone-300 rounded" />
            <div className="h-1.5 w-1/2 bg-brand/20 rounded" />
          </div>
        ))}
      </div>
      <div className="h-5 w-20 bg-brand/25 rounded-full mx-auto" />
    </div>
  );
}

function MagazineWire() {
  return (
    <div className="flex flex-col h-full gap-2">
      <div className="flex-[2] bg-stone-200 rounded-lg flex items-center justify-center">
        <ForkKnife size={18} className="text-stone-300" weight="duotone" />
      </div>
      <div className="flex-1 space-y-1.5 px-1">
        <div className="h-3 w-3/4 bg-brand/20 rounded" />
        <div className="h-2 w-full bg-stone-200 rounded" />
        <div className="h-2 w-2/3 bg-stone-200 rounded" />
        <div className="h-5 w-16 bg-brand/30 rounded-full mt-1" />
      </div>
    </div>
  );
}

function MenuBoardWire({ count }) {
  return (
    <div className="flex flex-col h-full gap-1.5">
      <div className="bg-brand/20 rounded-lg py-2 px-2">
        <div className="h-2.5 w-20 bg-brand/30 rounded mx-auto" />
      </div>
      <div className="flex-1 space-y-1.5 overflow-hidden">
        {Array.from({ length: Math.min(count, 7) }).map((_, i) => (
          <div key={i} className="flex items-center gap-1.5 px-1">
            <div className="w-7 h-7 bg-stone-200 rounded-md flex-shrink-0" />
            <div className="flex-1 h-2 bg-stone-200 rounded" />
            <div className="w-8 h-2 bg-brand-gold/40 rounded" />
          </div>
        ))}
      </div>
      <div className="h-5 w-20 bg-brand/25 rounded-full mx-auto" />
    </div>
  );
}

// ── UI helpers ─────────────────────────────────────────────────────────────────

function SectionLabel({ children }) {
  return <div className="font-heading font-bold text-brand text-base">{children}</div>;
}

function Field({ label, children }) {
  return (
    <div>
      <label className="text-[10px] font-bold uppercase tracking-[0.18em] text-stone-400 mb-1.5 block">{label}</label>
      {children}
    </div>
  );
}

function SummaryRow({ label, value }) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-stone-400">{label}</span>
      <span className="font-semibold text-stone-700 text-right max-w-[65%] truncate capitalize">{value}</span>
    </div>
  );
}
