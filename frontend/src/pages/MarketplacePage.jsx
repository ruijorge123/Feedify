import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { toast } from "react-toastify";
import {
  Storefront, Sparkle, CircleNotch, Images,
  Crown, Minus, CheckCircle, Package, CaretDown,
  X, Lightning, User, Info,
} from "@phosphor-icons/react";
import BrandDnaCard from "@/components/BrandDnaCard";
import InspirationGallery from "@/components/InspirationGallery";
import PromptSuccessCard from "@/components/PromptSuccessCard";
import DebugJsonButton from "@/components/DebugJsonButton";

// ── Constants ──────────────────────────────────────────────────────────────────

const THUMBNAIL_STYLES = [
  { id: "clean",           label: "Clean Marketplace", desc: "Produk jelas, cocok semua kategori", Icon: Storefront, color: "text-brand",       bg: "bg-brand-sand" },
  { id: "high_conversion", label: "High Conversion",   desc: "Kontras tinggi, badge kuat, cocok untuk iklan", Icon: Lightning, color: "text-amber-600", bg: "bg-amber-50", recommended: true },
  { id: "premium",         label: "Premium",            desc: "Elegan & mewah",                    Icon: Crown,      color: "text-violet-600",   bg: "bg-violet-50" },
  { id: "minimal",         label: "Minimal",            desc: "Tanpa elemen berlebihan",           Icon: Minus,      color: "text-stone-500",    bg: "bg-stone-100" },
];

const MODEL_STYLES = [
  { id: "hijab",        label: "Hijab",        emoji: "🧕", value: "Berhijab, gaya modest fashion Indonesia" },
  { id: "hijab-modern", label: "Hijab Modern", emoji: "✨", value: "Hijab modern kontemporer, hijab trendy" },
  { id: "korean",       label: "Korean",        emoji: "🌸", value: "Korean beauty style, K-beauty aesthetic" },
  { id: "natural",      label: "Natural",       emoji: "🌿", value: "Penampilan natural, minimal makeup" },
  { id: "sporty",       label: "Sporty",        emoji: "⚡", value: "Sporty casual, athleisure" },
  { id: "kasual",       label: "Kasual",        emoji: "👕", value: "Kasual sehari-hari" },
  { id: "elegan",       label: "Elegan",        emoji: "💎", value: "Elegan dan sophisticated" },
  { id: "profesional",  label: "Profesional",   emoji: "👔", value: "Profesional, business attire" },
];

const MODEL_AGES = [
  { id: "18-22", label: "18–22 th" },
  { id: "22-27", label: "22–27 th" },
  { id: "27-35", label: "27–35 th" },
  { id: "35-45", label: "35–45 th" },
];

// Gallery-picked inspiration photos are static asset URLs (e.g. /gallery/skincare/xxx.png), not
// base64 — need to fetch + re-encode before they can be sent to the backend as
// reference_image_base64 (mirrors CarouselGeneratorPage/BannerGeneratorPage's gallery handlers).
function urlToBase64(url) {
  return fetch(url)
    .then((r) => r.blob())
    .then((blob) => new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    }));
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function MarketplacePage() {
  const { user } = useAuth();

  // Product library
  const [selectedProductId, setSelectedProductId] = useState(null);
  const [productDropdownOpen, setProductDropdownOpen] = useState(false);

  // Form fields
  const [photo, setPhoto] = useState(null);
  const [benefitUtama, setBenefitUtama] = useState("");
  const [productPrice, setProductPrice] = useState("");
  const [originalPrice, setOriginalPrice] = useState("");
  const [thumbnailStyle, setThumbnailStyle] = useState("high_conversion");
  const [creativeDirection, setCreativeDirection] = useState("");

  // Model / Talent
  const [modelEnabled, setModelEnabled] = useState(false);
  const [modelGender, setModelGender]   = useState("wanita");
  const [modelStyle, setModelStyle]     = useState(null);
  const [modelAge, setModelAge]         = useState(null);

  // Gallery
  const [galleryOpen, setGalleryOpen] = useState(false);

  // Generate
  const [generating, setGenerating] = useState(false);
  const [promptResult, setPromptResult] = useState(null);

  // Products from library
  const { data: products = [], isLoading: productsLoading } = useQuery({
    queryKey: ["products"],
    queryFn: async () => { const { data } = await api.get("/products"); return data; },
  });
  const selectedProduct = products.find(p => p.id === selectedProductId) || null;

  // Auto-fill benefit_utama from product knowledge when product changes
  useEffect(() => {
    if (!selectedProduct) return;
    const benefits = selectedProduct.benefits || [];
    const usp = selectedProduct.usp || "";
    const autoFill = [
      ...benefits.slice(0, 5).map(b => `• ${b}`),
      ...(usp ? [`• ${usp}`] : []),
    ].join("\n");
    if (autoFill) setBenefitUtama(autoFill);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProductId]);

  // Discount preview
  const origNum = parseFloat((originalPrice || "").replace(/[^0-9]/g, ""));
  const saleNum = parseFloat((productPrice || "").replace(/[^0-9]/g, ""));
  const discountPct = (origNum > 0 && saleNum > 0 && origNum > saleNum)
    ? Math.round(((origNum - saleNum) / origNum) * 100)
    : 0;

  // ── Generate ──────────────────────────────────────────────────────────────────

  const generate = async () => {
    if (!benefitUtama.trim()) { toast.error("Benefit utama wajib diisi"); return; }
    setGenerating(true);
    setPromptResult(null);
    try {
      const payload = {
        product_name:        selectedProduct?.name || "",
        benefit_utama:       benefitUtama,
        tagline:             benefitUtama,
        product_price:       productPrice,
        original_price:      originalPrice,
        discount_percent:    discountPct,
        thumbnail_style:     thumbnailStyle,
        creative_direction:  creativeDirection,
        platform:            "general",
        promo_label:         "",
        include_model:       modelEnabled,
        save:                true,
      };
      if (selectedProduct?.photo_base64) {
        const b64 = selectedProduct.photo_base64;
        payload.product_photo_base64 = b64.includes(",") ? b64.split(",")[1] : b64;
      }
      // "Foto Inspirasi" — previously sent as `inspiration_photo_url`, a field the backend schema
      // never had at all, so it was silently dropped and never reached the prompt builder despite
      // being marked mandatory in the UI. Also needs fetch+base64 conversion since gallery photos
      // are static URLs, not embeddable directly.
      if (photo) payload.reference_image_base64 = await urlToBase64(photo);
      if (selectedProduct) payload.product_id = selectedProduct.id;
      if (modelEnabled) {
        payload.human_enabled   = true;
        payload.human_mode      = "manual";
        payload.model_character = modelGender === "wanita" ? "Wanita Indonesia" : "Pria Indonesia";
        if (modelStyle) payload.outfit_style = MODEL_STYLES.find(s => s.id === modelStyle)?.value || modelStyle;
        if (modelAge)   payload.model_age    = modelAge;
      }
      const { data } = await api.post("/prompt/preview-marketplace", payload);
      setPromptResult(data);
    } catch {
      toast.error("Gagal membuat prompt. Coba lagi.");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-4 pb-20" data-testid="marketplace-page">

      {/* Header */}
      <div className="animate-fade-up">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand-gold bg-brand-gold/10 px-2.5 py-1 rounded-full border border-brand-gold/20">
            M.A.K.O Framework
          </span>
        </div>
        <h1 className="font-heading text-3xl sm:text-4xl font-bold text-brand tracking-tight">Marketplace</h1>
        <p className="text-stone-400 mt-1 text-sm">Thumbnail yang dirancang untuk meningkatkan CTR dan konversi penjualan.</p>
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
                <p className="text-xs text-stone-500">Benefit utama akan otomatis terisi dari library produk</p>
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
                  data-testid="mp-product-selector-btn"
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
                      <button onClick={e => { e.stopPropagation(); setSelectedProductId(null); setBenefitUtama(""); }}
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
                        data-testid={`mp-product-option-${p.id}`}>
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
          <div className={`feedify-card p-5 space-y-3 ${!photo ? "border-2 border-red-200" : ""}`}>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-brand text-white text-xs font-bold flex items-center justify-center flex-shrink-0">3</div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-heading text-base font-bold text-brand">Foto Inspirasi</h3>
                  <span className="text-[9px] font-bold text-red-500 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded-full">★ Wajib</span>
                </div>
                <p className="text-xs text-stone-500">Pilih referensi gaya thumbnail dari galeri</p>
              </div>
            </div>

            {photo ? (
              <div className="relative border border-stone-100 rounded-xl overflow-hidden">
                <img src={photo} alt="inspirasi" className="max-h-44 w-full object-contain bg-stone-50" />
                <button type="button" onClick={() => setPhoto(null)}
                  className="absolute top-2 right-2 bg-white/90 rounded-full p-1.5 shadow hover:bg-red-50">
                  <X size={12} weight="bold" className="text-stone-500" />
                </button>
                <div className="text-center text-xs text-stone-400 py-1.5">Klik galeri untuk ganti</div>
              </div>
            ) : null}

            <button type="button" onClick={() => setGalleryOpen(true)} data-testid="mp-gallery-btn"
              className={`w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed rounded-xl text-sm font-semibold transition-all ${
                photo
                  ? "border-brand-sand text-brand-light hover:border-brand hover:text-brand hover:bg-brand-sand/40"
                  : "border-red-200 text-red-400 hover:border-brand hover:text-brand hover:bg-brand-sand/40"
              }`}>
              <Images size={16} weight="duotone" /> {photo ? "Ganti dari Gallery Inspirasi" : "Pilih dari Gallery Inspirasi"}
            </button>
          </div>

          {/* ④ BENEFIT UTAMA */}
          <div className="feedify-card p-5 space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-brand text-white text-xs font-bold flex items-center justify-center flex-shrink-0">4</div>
              <div className="flex-1">
                <h3 className="font-heading text-base font-bold text-brand">Benefit Utama</h3>
                <p className="text-xs text-stone-500">
                  {selectedProduct ? "Otomatis terisi dari product knowledge — kamu bisa edit" : "Tuliskan manfaat yang paling membuat orang membeli"}
                </p>
              </div>
              {selectedProduct && (
                <span className="text-[9px] bg-green-100 text-green-700 font-bold px-2 py-0.5 rounded-full flex-shrink-0">Auto-filled</span>
              )}
            </div>
            <textarea
              className="w-full px-3 py-2.5 rounded-xl border border-stone-200 text-sm resize-none focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand/20 leading-relaxed"
              rows={5}
              value={benefitUtama}
              onChange={e => setBenefitUtama(e.target.value)}
              placeholder={"• SPF50 PA++++\n• Anti Whitecast\n• Waterproof 12 Jam\n• Bebas Paraben\n• Dermatologically Tested"}
              data-testid="mp-benefit"
            />
          </div>

          {/* ⑤ HARGA */}
          <div className="feedify-card p-5 space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-brand text-white text-xs font-bold flex items-center justify-center flex-shrink-0">5</div>
              <div>
                <h3 className="font-heading text-base font-bold text-brand">Harga</h3>
                <p className="text-xs text-stone-500">Isi harga coret untuk otomatis membuat badge diskon</p>
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] uppercase tracking-widest font-bold text-stone-400 block mb-1.5">Harga Jual</label>
                <input type="text" value={productPrice} onChange={e => setProductPrice(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-stone-200 text-sm focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand/20"
                  placeholder="mis. Rp 89.000" data-testid="mp-price" />
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-widest font-bold text-stone-400 block mb-1.5">Harga Coret <span className="normal-case font-normal">(opsional)</span></label>
                <input type="text" value={originalPrice} onChange={e => setOriginalPrice(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-stone-200 text-sm focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand/20"
                  placeholder="mis. Rp 120.000" data-testid="mp-original-price" />
              </div>
            </div>
            {discountPct > 0 && (
              <div className="flex items-center gap-2 text-xs text-green-700 bg-green-50 border border-green-200 rounded-xl px-3 py-2.5">
                <CheckCircle size={14} weight="fill" className="text-green-500 flex-shrink-0" />
                AI akan otomatis membuat badge <span className="font-bold">-{discountPct}% OFF</span> pada thumbnail
              </div>
            )}
          </div>

          {/* ⑥ GAYA THUMBNAIL */}
          <div className="feedify-card p-5 space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-brand text-white text-xs font-bold flex items-center justify-center flex-shrink-0">6</div>
              <div>
                <h3 className="font-heading text-base font-bold text-brand">Gaya Thumbnail</h3>
                <p className="text-xs text-stone-500">Pilih tujuan thumbnail — bukan style desain</p>
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-2.5">
              {THUMBNAIL_STYLES.map(({ id, label, desc, Icon, color, bg, recommended }) => {
                const active = thumbnailStyle === id;
                return (
                  <button key={id} type="button" data-testid={`style-${id}`}
                    onClick={() => setThumbnailStyle(id)}
                    className={`relative text-left p-4 rounded-xl border-2 transition-all ${
                      active ? "border-brand bg-brand-sand shadow-sm" : "border-stone-100 bg-white hover:border-brand/30"
                    }`}>
                    {recommended && (
                      <span className="absolute top-2.5 right-2.5 text-[9px] font-bold bg-brand-gold text-brand px-2 py-0.5 rounded-full">
                        ⭐ Rekomen
                      </span>
                    )}
                    <div className={`h-8 w-8 rounded-xl ${bg} flex items-center justify-center mb-2.5`}>
                      <Icon size={16} weight="duotone" className={color} />
                    </div>
                    <div className={`font-semibold text-sm ${active ? "text-brand" : "text-stone-700"}`}>{label}</div>
                    <div className="text-[10px] text-stone-400 mt-0.5 leading-snug">{desc}</div>
                    {active && <CheckCircle size={15} weight="fill" className="text-brand absolute bottom-3 right-3" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ⑦ AI CREATIVE DIRECTION */}
          <div className="feedify-card p-4 space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-brand text-white text-xs font-bold flex items-center justify-center flex-shrink-0">7</div>
              <div>
                <h3 className="font-heading text-base font-bold text-brand">AI Creative Direction</h3>
                <p className="text-xs text-stone-500">Opsional — kalau kosong, AI pilih arahan terbaik otomatis</p>
              </div>
            </div>
            <textarea
              className="w-full px-3 py-2.5 rounded-xl border border-stone-200 text-sm resize-none focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand/20"
              rows={3}
              value={creativeDirection}
              onChange={e => setCreativeDirection(e.target.value)}
              placeholder={"mis. background hijau fresh\nNuansa premium, warna emas hitam\nEstetik skincare · vibe clean laboratory"}
              data-testid="mp-creative-direction"
            />
          </div>

          {/* ⑧ MODEL / TALENT */}
          <div className="feedify-card p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-heading text-sm font-bold text-brand">Model / Talent</h3>
                <p className="text-xs text-stone-500 mt-0.5">Tampilkan orang dalam thumbnail? (opsional)</p>
              </div>
              <button type="button" role="switch" aria-checked={modelEnabled}
                onClick={() => setModelEnabled(v => !v)}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors ${modelEnabled ? "bg-brand" : "bg-stone-200"}`}
                data-testid="mp-model-toggle">
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
                        }`} data-testid={`mp-model-gender-${g.id}`}>
                        <span className="text-base">{g.emoji}</span> {g.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Penampilan */}
                <div className="space-y-1.5">
                  <p className="text-[10px] uppercase tracking-widest font-bold text-stone-400">Penampilan</p>
                  <div className="flex flex-wrap gap-1.5">
                    {MODEL_STYLES.filter(s => modelGender === "pria"
                      ? !["hijab", "hijab-modern"].includes(s.id) : true
                    ).map(s => (
                      <button key={s.id} type="button"
                        onClick={() => setModelStyle(v => v === s.id ? null : s.id)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                          modelStyle === s.id
                            ? "bg-brand text-white border-brand"
                            : "bg-white text-stone-600 border-stone-200 hover:border-brand/40 hover:text-brand"
                        }`} data-testid={`mp-model-style-${s.id}`}>
                        {s.emoji} {s.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Usia */}
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
                        }`} data-testid={`mp-model-age-${a.id}`}>
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

          {/* ChatGPT akan otomatis */}
          <div className="rounded-2xl border border-green-100 p-4 bg-gradient-to-br from-green-50/60 to-white" data-testid="mp-ai-card">
            <div className="flex items-center gap-2 mb-3">
              <Sparkle size={13} weight="fill" className="text-brand-gold" />
              <p className="text-sm font-semibold text-brand">Dengan prompt ini, ChatGPT akan otomatis</p>
            </div>
            <div className="space-y-2">
              {[
                "Menganalisis foto produk dan mengidentifikasi elemen visual utama",
                "Menerapkan framework M.A.K.O untuk meningkatkan CTR thumbnail",
                "Membuat badge diskon dari selisih harga secara otomatis",
                "Menonjolkan benefit utama agar terbaca dalam 3 detik",
                "Menghasilkan thumbnail siap upload ke semua marketplace",
              ].map(item => (
                <div key={item} className="flex items-start gap-2">
                  <CheckCircle size={13} weight="fill" className="text-green-500 flex-shrink-0 mt-0.5" />
                  <span className="text-xs text-stone-600">{item}</span>
                </div>
              ))}
            </div>
            <p className="text-[10px] text-stone-400 mt-3 border-t border-stone-100 pt-2">
              💡 Setelah klik GENERATE — salin prompt, buka ChatGPT, upload foto produk, dan paste.
            </p>

            {/* Generate — nempel dengan card ini (semua viewport) */}
            <button onClick={generate} disabled={generating || !photo}
              className="mt-3 w-full h-12 bg-brand hover:bg-brand/90 text-brand-cream rounded-full font-heading font-bold text-sm btn-lift inline-flex items-center justify-center gap-2 disabled:opacity-60 shadow-md transition-colors tracking-wide"
              data-testid="mp-generate-btn">
              {generating
                ? <><CircleNotch size={15} className="animate-spin" /> Menyusun...</>
                : <><Sparkle size={15} weight="fill" /> GENERATE</>}
            </button>
          </div>

          {/* Prompt result */}
          {promptResult && (
            <PromptSuccessCard
              promptData={promptResult}
              hasReferenceImage={!!photo}
              referenceImg={photo || null}
              productPhoto={selectedProduct?.photo_base64 || null}
              onReset={() => setPromptResult(null)}
              dashboardType="marketplace"
              title={selectedProduct?.name || "Marketplace"}
            />
          )}
          {promptResult && (
            <div className="mt-3">
              <DebugJsonButton data={promptResult?.prompt_json} title="marketplace-prompt.json" />
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
              {selectedProduct.usp && (
                <p className="text-xs text-stone-500 italic border-t border-stone-100 pt-2">"{selectedProduct.usp}"</p>
              )}
            </div>
          )}

          {/* MAKO edu card */}
          <div className="rounded-2xl border border-brand-sand bg-gradient-to-br from-brand-sand/40 to-white p-4 space-y-3">
            <div className="flex items-start gap-2">
              <Info size={15} weight="duotone" className="text-brand flex-shrink-0 mt-0.5" />
              <p className="text-xs font-bold text-brand leading-snug">Kenapa Thumbnail Feedify Bisa Meningkatkan Penjualan?</p>
            </div>
            <div className="space-y-2.5">
              {[
                { key: "M", label: "Manfaat", text: "Harus terbaca kurang dari 3 detik." },
                { key: "A", label: "Aksen",   text: "Hanya 2–3 aksen visual agar fokus tidak pecah." },
                { key: "K", label: "Kontras", text: "Produk lebih menonjol di antara ratusan kompetitor." },
                { key: "O", label: "Objek",   text: "Produk selalu jadi fokus utama sehingga langsung dikenali." },
              ].map(({ key, label, text }) => (
                <div key={key} className="flex items-start gap-2">
                  <div className="h-5 w-5 rounded-md bg-brand flex-shrink-0 flex items-center justify-center mt-0.5">
                    <span className="text-[9px] font-black text-brand-gold">{key}</span>
                  </div>
                  <div className="text-[11px] text-stone-600">
                    <span className="font-semibold text-stone-700">{label} — </span>{text}
                  </div>
                </div>
              ))}
            </div>
            <p className="text-[10px] text-stone-400 border-t border-stone-100 pt-2">
              Semua prinsip diterapkan otomatis oleh AI — kamu tidak perlu memahami desain.
            </p>
          </div>
        </div>
      </div>

      <InspirationGallery
        open={galleryOpen}
        onClose={() => setGalleryOpen(false)}
        context="marketplace"
        onSelect={(p) => {
          setPhoto(p.url);
          setGalleryOpen(false);
        }}
      />
    </div>
  );
}
