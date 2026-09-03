import { useEffect, useState, useCallback, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { toast } from "react-toastify";
import {
  Camera, Sparkle, X, CircleNotch,
  CheckCircle, Images, Package, CaretDown,
  ArrowRight, DownloadSimple,
} from "@phosphor-icons/react";
import BrandDnaCard from "@/components/BrandDnaCard";
import InspirationGallery from "@/components/InspirationGallery";
import PromptSuccessCard from "@/components/PromptSuccessCard";
import DebugJsonButton from "@/components/DebugJsonButton";
import CampaignGoalSelector, { GOALS as CAMPAIGN_GOALS } from "@/components/CampaignGoalSelector";
import ModelTalentPicker from "@/components/ModelTalentPicker";
import { MODEL_STYLES } from "@/lib/modelOptions";
import ActiveBrandChip from "@/components/ActiveBrandChip";

// Banner hanya pakai 4 tujuan konten inti — Edukasi, Best Seller, dan Restock disembunyikan
// dari halaman ini (masih ada di CampaignGoalSelector buat halaman lain, mis. Food Menu).
const BANNER_GOALS = CAMPAIGN_GOALS.filter(g => ["launch", "promo", "testimonial", "brand_awareness"].includes(g.id));

const ASPECT_RATIOS = [
  { id: "1:1 (Square Feed)",   label: "1:1",  sub: "Square Feed",  w: 1,  h: 1  },
  { id: "4:5 (Portrait Feed)", label: "4:5",  sub: "Rekomendasi",  w: 4,  h: 5, recommended: true },
  { id: "9:16 (Story/Reels)", label: "9:16", sub: "Story · Reels", w: 9,  h: 16 },
  { id: "16:9 (Landscape)",   label: "16:9", sub: "Landscape",     w: 16, h: 9  },
];

function RatioFrame({ w, h, active }) {
  const max = 34;
  const dw = w >= h ? max : Math.round((w / h) * max);
  const dh = w >= h ? Math.round((h / w) * max) : max;
  return (
    <div
      className={`rounded border-2 transition-colors ${active ? "border-brand bg-brand/10" : "border-stone-300 bg-stone-50"}`}
      style={{ width: dw, height: dh }}
    />
  );
}

function toBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function BannerGeneratorPage() {
  const { user } = useAuth();

  const [aspectRatio, setAspectRatio]   = useState("4:5 (Portrait Feed)");
  const [campaignGoal, setCampaignGoal] = useState("brand_awareness");

  // Model
  const [modelEnabled, setModelEnabled] = useState(false);
  const [modelGender, setModelGender]   = useState(null);
  const [modelStyle, setModelStyle]     = useState(null);
  const [modelAge, setModelAge]         = useState(null);

  // Product selection
  const [selectedProductId, setSelectedProductId] = useState(null);
  const [productDropdownOpen, setProductDropdownOpen] = useState(false);

  // Inspiration photo
  const [referenceImg, setReferenceImg] = useState(null);
  const [galleryOpen, setGalleryOpen]   = useState(false);

  const [generating, setGenerating]     = useState(false);
  const [loadingStep, setLoadingStep]   = useState("");
  const [promptResult, setPromptResult] = useState(null);
  const promptCardRef                   = useRef(null);

  // Fetch product library
  const { data: products = [], isLoading: productsLoading } = useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      const { data } = await api.get("/products");
      return data;
    },
  });

  const selectedProduct = products.find((p) => p.id === selectedProductId) || null;

  // ── Photo handlers ─────────────────────────────────────────────────────────

  const handleReferenceFile = useCallback(async (file) => {
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) { toast.error("Foto max 8MB"); return; }
    const b64 = await toBase64(file);
    setReferenceImg(b64);
  }, []);

  const handleReferenceChange = (e) => handleReferenceFile(e.target.files?.[0]);

  // ── Generate ───────────────────────────────────────────────────────────────

  const generate = async () => {
    if (!referenceImg) {
      toast.error("Foto referensi / inspirasi wajib diupload dulu!");
      return;
    }
    setGenerating(true);
    setPromptResult(null);
    setLoadingStep("Analisa foto inspirasi...");
    try {
      const payload = {
        campaign_goal:          campaignGoal,
        aspect_ratio:           aspectRatio,
        reference_image_base64: referenceImg.split(",")[1],
      };
      if (selectedProductId) payload.product_id = selectedProductId;
      if (modelEnabled) {
        payload.human_enabled = true;
        payload.human_mode    = "manual";
        payload.model_character = modelGender === "wanita" ? "Wanita Indonesia" : "Pria Indonesia";
        if (modelStyle) payload.outfit_style = MODEL_STYLES.find(s => s.id === modelStyle)?.value || modelStyle;
        if (modelAge)   payload.model_age    = modelAge;
      }
      setLoadingStep("Susun prompt AI...");
      const { data } = await api.post("/prompt/preview-banner", payload);
      setPromptResult(data);
      setTimeout(() => promptCardRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Gagal membuat prompt. Coba lagi.");
    } finally {
      setGenerating(false);
      setLoadingStep("");
    }
  };

  const canGenerate = !generating && !!referenceImg && (!modelEnabled || (!!modelGender && !!modelStyle && !!modelAge));

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4 pb-20" data-testid="banner-generator-page">
      {/* Header */}
      <div className="animate-fade-up">
        <h1 className="font-heading text-3xl sm:text-4xl font-bold text-brand tracking-tight">Feed & Banner</h1>
        <p className="text-stone-400 mt-1 text-sm">Pilih produk + foto inspirasi, AI generate prompt siap pakai.</p>
        <div className="mt-3"><ActiveBrandChip /></div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4 animate-fade-up">

          {/* ① BRAND DNA — auto */}
          <div className="feedify-card p-4 flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-brand text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
              1
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider">Brand DNA</p>
              <p className="text-sm text-stone-700 font-medium truncate">Otomatis dibaca dari profil brand kamu</p>
            </div>
            <CheckCircle size={18} weight="fill" className="text-brand flex-shrink-0" />
          </div>

          {/* ② PRODUCT KNOWLEDGE */}
          <div className={`feedify-card p-5 space-y-3 ${!selectedProductId ? "border-2 border-red-200" : ""}`}>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-brand text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
                2
              </div>
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
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-stone-500">Belum ada produk tersimpan.</p>
                  <a href="/products" className="text-xs font-semibold text-brand hover:underline">
                    + Tambah produk ke library →
                  </a>
                </div>
              </div>
            ) : (
              <div className="relative">
                <button
                  onClick={() => setProductDropdownOpen((v) => !v)}
                  className="w-full flex items-center gap-3 p-3 rounded-xl border border-stone-200 hover:border-brand/50 transition-all text-left bg-white"
                  data-testid="product-selector-btn"
                >
                  {selectedProduct ? (
                    <>
                      {selectedProduct.photo_base64 ? (
                        <img
                          src={selectedProduct.photo_base64}
                          alt=""
                          className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-brand/10 flex items-center justify-center flex-shrink-0">
                          <Package size={18} weight="duotone" className="text-brand" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-stone-800 truncate">{selectedProduct.name}</p>
                        {selectedProduct.category && (
                          <p className="text-xs text-stone-500">{selectedProduct.category}</p>
                        )}
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); setSelectedProductId(null); }}
                        className="p-1.5 rounded-lg text-stone-400 hover:text-red-500 hover:bg-red-50 transition-all"
                        data-testid="clear-product-btn"
                      >
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
                    {products.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => { setSelectedProductId(p.id); setProductDropdownOpen(false); }}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 hover:bg-brand/5 transition-all text-left ${p.id === selectedProductId ? "bg-brand/8" : ""}`}
                        data-testid={`product-option-${p.id}`}
                      >
                        {p.photo_base64 ? (
                          <img src={p.photo_base64} alt="" className="w-9 h-9 rounded-lg object-cover flex-shrink-0" />
                        ) : (
                          <div className="w-9 h-9 rounded-lg bg-brand/10 flex items-center justify-center flex-shrink-0">
                            <Package size={15} weight="duotone" className="text-brand" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-stone-800 truncate">{p.name}</p>
                          {p.category && <p className="text-xs text-stone-400">{p.category}</p>}
                        </div>
                        {p.id === selectedProductId && (
                          <CheckCircle size={14} weight="fill" className="text-brand flex-shrink-0" />
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ③ INSPIRATION PHOTO */}
          <div className={`feedify-card p-5 space-y-3 ${!referenceImg ? "border-2 border-red-200" : ""}`}>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-brand text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
                3
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-heading text-base font-bold text-brand">Foto Inspirasi</h3>
                  <span className="text-[9px] font-bold text-red-500 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">★ Wajib</span>
                </div>
                <p className="text-xs text-stone-500">ChatGPT akan analisa komposisi, mood, pencahayaan, dan layout dari foto ini</p>
              </div>
            </div>

            {referenceImg ? (
              <div className="space-y-2">
                <div className="relative rounded-xl overflow-hidden border-2 border-brand/20">
                  <img src={referenceImg} alt="referensi" className="w-full max-h-60 object-contain" data-testid="banner-reference-preview" />
                  {/* Delete */}
                  <button
                    onClick={() => setReferenceImg(null)}
                    className="absolute top-2 right-2 bg-white/90 rounded-full p-1.5 shadow hover:bg-red-50 transition-colors"
                    data-testid="banner-reference-clear"
                  >
                    <X size={13} weight="bold" className="text-stone-500" />
                  </button>
                  {/* Download — user needs this to upload to ChatGPT later */}
                  <a
                    href={referenceImg}
                    download="foto-inspirasi.jpg"
                    className="absolute top-2 left-2 bg-white/90 rounded-full p-1.5 shadow hover:bg-brand/10 transition-colors"
                    title="Download foto inspirasi (untuk diupload ke ChatGPT)"
                    data-testid="banner-reference-download"
                  >
                    <DownloadSimple size={13} weight="bold" className="text-stone-600" />
                  </a>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-xs text-green-700 bg-green-50 rounded-full px-3 py-1.5 w-fit">
                    <CheckCircle size={12} weight="fill" /> Foto inspirasi terpilih — AI analisa komposisi & mood
                  </div>
                  <p className="text-[11px] text-stone-400 px-1">
                    💡 Foto ini perlu kamu upload juga ke ChatGPT nanti — tombol download ada di pojok kiri foto
                  </p>
                </div>
              </div>
            ) : (
              <label
                htmlFor="banner-reference-input"
                className="block cursor-pointer border-2 border-dashed border-brand-gold/60 bg-brand-gold/5 rounded-xl p-6 text-center hover:border-brand-gold hover:bg-brand-gold/8 transition-colors"
                data-testid="banner-reference-label"
              >
                <Images size={30} className="mx-auto text-brand-gold mb-2" weight="duotone" />
                <div className="font-semibold text-brand text-sm">Upload foto inspirasi</div>
                <div className="text-xs text-stone-400 mt-1">AI analisa komposisi, mood, headline, dan gaya visual</div>
              </label>
            )}
            <input
              id="banner-reference-input"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={handleReferenceChange}
              data-testid="banner-reference-input"
            />

            <div className="relative flex items-center gap-3">
              <div className="flex-1 border-t border-stone-200" />
              <span className="text-xs text-stone-400 font-medium flex-shrink-0">atau dari gallery</span>
              <div className="flex-1 border-t border-stone-200" />
            </div>

            <button
              type="button"
              onClick={() => setGalleryOpen(true)}
              className={`w-full flex items-center justify-center gap-2 py-2.5 border-2 border-dashed rounded-xl text-sm font-semibold transition-all ${
                referenceImg
                  ? "border-brand-sand text-brand-light hover:border-brand hover:text-brand hover:bg-brand-sand/40"
                  : "border-red-200 text-red-400 hover:border-brand hover:text-brand hover:bg-brand-sand/40"
              }`}
              data-testid="banner-gallery-btn"
            >
              <Images size={16} weight="duotone" />
              {referenceImg ? "Ganti dari Gallery Inspirasi" : "Pilih dari Gallery Inspirasi"}
            </button>
          </div>

          {/* ④ TUJUAN KONTEN */}
          <div className="feedify-card p-4 space-y-2.5">
            <h3 className="font-heading text-sm font-bold text-brand">Tujuan Konten</h3>
            <p className="text-xs text-stone-500">Mempengaruhi tone visual dan suasana keseluruhan foto.</p>
            <CampaignGoalSelector value={campaignGoal} onChange={setCampaignGoal} goals={BANNER_GOALS} columnsClassName="grid-cols-2" />
          </div>

          {/* ⑤ FORMAT */}
          <div className="feedify-card p-4 space-y-3">
            <h3 className="font-heading text-sm font-bold text-brand">Format</h3>
            <div className="grid grid-cols-4 gap-2">
              {ASPECT_RATIOS.map((r) => {
                const active = aspectRatio === r.id;
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setAspectRatio(r.id)}
                    className={`relative flex flex-col items-center gap-2 py-4 px-2 rounded-xl border-2 transition-colors ${
                      active ? "border-brand bg-brand-sand" : "border-stone-100 bg-white hover:border-brand/30"
                    }`}
                    data-testid={`ratio-${r.id.split(" ")[0]}`}
                  >
                    {r.recommended && (
                      <span className="absolute -top-2 left-1/2 -translate-x-1/2 text-[7px] bg-brand-gold text-brand font-bold px-1.5 py-0.5 rounded-full whitespace-nowrap">
                        Rekomen
                      </span>
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

          {/* ⑥ MODEL */}
          <div className="feedify-card p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-heading text-sm font-bold text-brand">Model / Talent</h3>
                <p className="text-xs text-stone-500 mt-0.5">Tampilkan orang dalam konten? (opsional)</p>
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
              <div className="animate-fade-up">
                <ModelTalentPicker
                  gender={modelGender} onGenderChange={setModelGender}
                  style={modelStyle} onStyleChange={setModelStyle}
                  age={modelAge} onAgeChange={setModelAge}
                  testidPrefix="model"
                />
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
                "Membaca foto inspirasi untuk meniru komposisi, sudut kamera & pencahayaan",
                "Menerapkan warna & identitas brand kamu — bukan warna dari foto inspirasi",
                "Menampilkan foto produk persis seperti yang kamu upload, tanpa diubah",
                "Menyesuaikan tone visual sesuai tujuan konten yang dipilih",
                "Menghasilkan visual siap posting di feed Instagram & media sosial lainnya",
              ].map(item => (
                <div key={item} className="flex items-start gap-2">
                  <CheckCircle size={13} weight="fill" className="text-green-500 flex-shrink-0 mt-0.5" />
                  <span className="text-xs text-stone-600">{item}</span>
                </div>
              ))}
            </div>
            <p className="text-[10px] text-stone-400 mt-3 border-t border-stone-100 pt-2">
              💡 Setelah klik GENERATE — salin prompt lalu buka ChatGPT, upload foto, dan paste.
            </p>

            {/* Generate — nempel dengan card ini (semua viewport) */}
            <button
              onClick={generate}
              disabled={!canGenerate}
              className="mt-3 w-full h-12 bg-brand hover:bg-brand/90 text-brand-cream rounded-full font-heading font-bold text-sm btn-lift inline-flex items-center justify-center gap-2 disabled:opacity-60 shadow-md transition-colors tracking-wide"
              data-testid="generate-banner-btn"
            >
              {generating
                ? <><CircleNotch size={15} className="animate-spin" /> {loadingStep || "Memproses..."}</>
                : "GENERATE"}
            </button>
          </div>

          {/* Prompt success */}
          {promptResult && (
            <div ref={promptCardRef}>
              <PromptSuccessCard
                promptData={promptResult}
                hasReferenceImage={true}
                referenceImg={referenceImg}
                productPhoto={selectedProduct?.photo_base64 || null}
                onReset={() => setPromptResult(null)}
                dashboardType="banner"
                title={promptResult?.prompt_json?.prompt_structure?.branding_elements?.headline || selectedProduct?.name || "Feed & Banner"}
              />
              <div className="mt-3">
                <DebugJsonButton data={promptResult?.prompt_json} title="banner-prompt.json" />
              </div>
            </div>
          )}

        </div>

        {/* Right sidebar */}
        <div className="lg:sticky lg:top-6 lg:self-start space-y-4">
          <BrandDnaCard />
          {selectedProduct && (
            <div className="feedify-card p-4 space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-stone-500">Produk Dipilih</p>
              <div className="flex items-center gap-3">
                {selectedProduct.photo_base64 ? (
                  <img src={selectedProduct.photo_base64} alt="" className="w-14 h-14 rounded-xl object-cover" />
                ) : (
                  <div className="w-14 h-14 rounded-xl bg-brand/10 flex items-center justify-center">
                    <Package size={22} weight="duotone" className="text-brand" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm text-stone-800 truncate">{selectedProduct.name}</p>
                  {selectedProduct.category && <p className="text-xs text-stone-500">{selectedProduct.category}</p>}
                </div>
              </div>
              {selectedProduct.benefits?.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {selectedProduct.benefits.slice(0, 5).map((b) => (
                    <span key={b} className="text-[10px] px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-full font-medium">
                      {b}
                    </span>
                  ))}
                </div>
              )}
              {selectedProduct.usp && (
                <p className="text-xs text-stone-500 italic">"{selectedProduct.usp}"</p>
              )}
            </div>
          )}
        </div>
      </div>

      <InspirationGallery
        open={galleryOpen}
        onClose={() => setGalleryOpen(false)}
        context="banner"
        onSelect={(photo) => {
          fetch(photo.url)
            .then((r) => r.blob())
            .then((blob) => {
              const reader = new FileReader();
              reader.onload = () => setReferenceImg(reader.result);
              reader.readAsDataURL(blob);
            });
          setGalleryOpen(false);
        }}
      />
    </div>
  );
}
