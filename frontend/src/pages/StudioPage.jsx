import { useState, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Check, X, CaretDown,
  Sparkle, CircleNotch, CheckCircle,
  Images, Package, DownloadSimple,
} from "@phosphor-icons/react";
import api from "@/lib/api";
import PromptSuccessCard from "@/components/PromptSuccessCard";
import DebugJsonButton from "@/components/DebugJsonButton";
import InspirationGallery from "@/components/InspirationGallery";
import ModelTalentPicker from "@/components/ModelTalentPicker";
import { MODEL_STYLES } from "@/lib/modelOptions";
import { toast } from "react-toastify";
import ActiveBrandChip from "@/components/ActiveBrandChip";

// ── Chip selector ──────────────────────────────────────────────────────────────

function Chips({ options, value, onChange }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((opt) => (
        <button key={opt.key} type="button" onClick={() => onChange(opt.key)}
          className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
            value === opt.key
              ? "bg-brand text-white border-brand"
              : "bg-white text-stone-600 border-stone-200 hover:border-brand/40 hover:text-brand"
          }`}>
          {opt.label}
        </button>
      ))}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function StudioPage() {
  const promptCardRef = useRef(null);

  // Product library state
  const [selectedProductId, setSelectedProductId] = useState(null);
  const [productDropdownOpen, setProductDropdownOpen] = useState(false);

  // Inspiration photo state
  const [referenceImg,   setReferenceImg]   = useState(null);
  const [galleryOpen,    setGalleryOpen]    = useState(false);

  // Model state
  const [modelEnabled,   setModelEnabled]   = useState(false);
  const [modelGender,    setModelGender]    = useState(null);
  const [modelStyle,     setModelStyle]     = useState(null);
  const [modelAge,       setModelAge]       = useState(null);

  // UI state
  const [generating,     setGenerating]     = useState(false);
  const [promptResult,   setPromptResult]   = useState(null);
  const [error,          setError]          = useState(null);

  // Product library
  const { data: products = [], isLoading: productsLoading } = useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      const { data } = await api.get("/products");
      return data;
    },
  });

  const selectedProduct = products.find((p) => p.id === selectedProductId) || null;
  const isFashion = selectedProduct?.category === "fashion";

  // Derive model_type from toggle/gender/style
  const resolvedModelType = () => {
    if (!modelEnabled) return "no_model";
    if (modelGender === "pria") return "male";
    if (modelStyle === "hijab" || modelStyle === "hijab-modern") return "hijab_female";
    return "female";
  };

  const generate = async () => {
    setGenerating(true);
    setError(null);
    setPromptResult(null);
    try {
      const { data } = await api.post("/studio/preview", {
        product_id:           selectedProductId || undefined,
        product_category:     selectedProduct?.category || "general",
        business_goal:        "brand_campaign",
        reference_image_base64: referenceImg ? referenceImg.split(",")[1] : undefined,
        model_type:           resolvedModelType(),
        wearing_product:      isFashion && modelEnabled,
        // modelGender can be null when the model toggle is off (nothing to pick) — backend
        // expects a plain string here, and it's irrelevant anyway when model_type="no_model".
        model_gender:         modelGender || "wanita",
        model_outfit_style:   modelStyle
          ? (MODEL_STYLES.find(s => s.id === modelStyle)?.value || null)
          : null,
        model_age_range:      modelAge,
        output_count:         1,
        is_campaign_pack:     false,
      });
      setPromptResult(data);
      setTimeout(() => promptCardRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
    } catch (err) {
      setError(err.response?.data?.detail || "Gagal membuat prompt. Coba lagi.");
    } finally {
      setGenerating(false);
    }
  };

  const catLabel   = selectedProduct?.category || "general";

  return (
    <div className="space-y-4 pb-20" data-testid="studio-page">

      {/* Header */}
      <div className="animate-fade-up">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand-gold bg-brand-gold/10 px-2.5 py-1 rounded-full border border-brand-gold/20">
            Commercial Photography
          </span>
        </div>
        <h1 className="font-heading text-3xl sm:text-4xl font-bold text-brand tracking-tight">Studio</h1>
        <p className="text-stone-400 mt-1 text-sm">Commercial product photography berkualitas studio profesional — dibangun oleh ChatGPT.</p>
        <div className="mt-3"><ActiveBrandChip /></div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* ── Main column ─────────────────────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-4 animate-fade-up">

          {/* ① Product Knowledge */}
          <div className={`feedify-card p-5 space-y-3 ${!selectedProductId ? "border-2 border-red-200" : ""}`}>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-brand text-white text-xs font-bold flex items-center justify-center flex-shrink-0">1</div>
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
                  <a href="/products" className="text-xs font-semibold text-brand hover:underline">+ Tambah produk ke library →</a>
                </div>
              </div>
            ) : (
              <div className="relative">
                <button
                  onClick={() => setProductDropdownOpen(v => !v)}
                  className="w-full flex items-center gap-3 p-3 rounded-xl border border-stone-200 hover:border-brand/50 transition-all text-left bg-white"
                  data-testid="studio-product-selector-btn"
                >
                  {selectedProduct ? (
                    <>
                      {selectedProduct.photo_base64 ? (
                        <img src={selectedProduct.photo_base64} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-brand/10 flex items-center justify-center flex-shrink-0">
                          <Package size={18} weight="duotone" className="text-brand" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-stone-800 truncate">{selectedProduct.name}</p>
                        {selectedProduct.category && <p className="text-xs text-stone-500">{selectedProduct.category}</p>}
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); setSelectedProductId(null); }}
                        className="p-1.5 rounded-lg text-stone-400 hover:text-red-500 hover:bg-red-50 transition-all"
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
                        className={`w-full flex items-center gap-3 px-3 py-2.5 hover:bg-brand/5 transition-all text-left ${p.id === selectedProductId ? "bg-brand/5" : ""}`}
                        data-testid={`studio-product-option-${p.id}`}
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
                        {p.id === selectedProductId && <CheckCircle size={14} weight="fill" className="text-brand flex-shrink-0" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ② Foto Inspirasi */}
          <div className={`feedify-card p-5 space-y-3 ${!referenceImg ? "border-2 border-red-200" : ""}`}>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-brand text-white text-xs font-bold flex items-center justify-center flex-shrink-0">2</div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-heading text-base font-bold text-brand">Foto Inspirasi</h3>
                  <span className="text-[9px] font-bold text-red-500 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded-full">★ Wajib</span>
                </div>
                <p className="text-xs text-stone-500">Pilih gaya foto komersial sebagai referensi visual</p>
              </div>
            </div>

            {referenceImg ? (
              <div className="space-y-2">
                <div className="relative rounded-xl overflow-hidden border-2 border-brand/20">
                  <img src={referenceImg} alt="referensi" className="w-full max-h-52 object-contain" />
                  <button onClick={() => setReferenceImg(null)}
                    className="absolute top-2 right-2 bg-white/90 rounded-full p-1.5 shadow hover:bg-red-50 transition-colors">
                    <X size={13} weight="bold" className="text-stone-500" />
                  </button>
                  <a href={referenceImg} download="foto-inspirasi-studio.jpg"
                    className="absolute top-2 left-2 bg-white/90 rounded-full p-1.5 shadow hover:bg-brand/10 transition-colors">
                    <DownloadSimple size={13} weight="bold" className="text-stone-600" />
                  </a>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-green-700 bg-green-50 rounded-full px-3 py-1.5 w-fit">
                  <CheckCircle size={12} weight="fill" /> Foto inspirasi terpilih
                </div>
              </div>
            ) : null}

            <button
              type="button"
              onClick={() => setGalleryOpen(true)}
              className={`w-full flex items-center justify-center gap-2 py-2.5 border-2 border-dashed rounded-xl text-sm font-semibold transition-all ${
                referenceImg
                  ? "border-brand-sand text-brand-light hover:border-brand hover:text-brand hover:bg-brand-sand/40"
                  : "border-red-200 text-red-400 hover:border-brand hover:text-brand hover:bg-brand-sand/40"
              }`}
              data-testid="studio-gallery-btn"
            >
              <Images size={16} weight="duotone" />
              {referenceImg ? "Ganti dari Gallery Inspirasi" : "Pilih dari Gallery Inspirasi"}
            </button>
          </div>

          {/* ⑤ Model */}
          <div className="feedify-card p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-heading text-sm font-bold text-brand">Model / Talent</h3>
                <p className="text-xs text-stone-500 mt-0.5">
                  {isFashion ? "Model akan mengenakan pakaian yang di-upload" : "Tampilkan orang dalam foto? (opsional)"}
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={modelEnabled}
                onClick={() => setModelEnabled(v => !v)}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors ${modelEnabled ? "bg-brand" : "bg-stone-200"}`}
                data-testid="studio-model-toggle"
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${modelEnabled ? "translate-x-6" : "translate-x-1"}`} />
              </button>
            </div>

            {modelEnabled && (
              <div className="space-y-4 animate-fade-up">
                {isFashion && (
                  <div className="flex items-start gap-2 bg-violet-50 border border-violet-200 rounded-xl px-3 py-2.5">
                    <Sparkle size={13} className="text-violet-500 mt-0.5 flex-shrink-0" weight="fill" />
                    <p className="text-xs text-violet-700">
                      Model yang dipilih akan <strong>mengenakan pakaian yang di-upload</strong> — AI mempertahankan warna, pola, dan detail garmen.
                    </p>
                  </div>
                )}
                <ModelTalentPicker
                  gender={modelGender} onGenderChange={setModelGender}
                  style={modelStyle} onStyleChange={setModelStyle}
                  age={modelAge} onAgeChange={setModelAge}
                  testidPrefix="studio-model"
                />
              </div>
            )}
          </div>

          {/* ChatGPT akan otomatis */}
          <div className="rounded-2xl border border-green-100 p-4 bg-gradient-to-br from-green-50/60 to-white" data-testid="studio-ai-card">
            <div className="flex items-center gap-2 mb-3">
              <Sparkle size={13} weight="fill" className="text-brand-gold" />
              <p className="text-sm font-semibold text-brand">Dengan prompt ini, ChatGPT akan otomatis</p>
            </div>
            <div className="space-y-2">
              {[
                "Menganalisis foto produk dan memahami bentuk, warna, label secara akurat",
                "Membangun photography brief profesional sesuai kategori & gaya yang dipilih",
                "Menghapus background dan menempatkan produk di setting baru",
                "Mengaplikasikan pencahayaan studio komersial yang tepat",
                "Menghasilkan foto siap pakai untuk semua keperluan marketing",
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
            <button onClick={generate} disabled={generating || (modelEnabled && (!modelGender || !modelStyle || !modelAge))}
              className="mt-3 w-full h-12 bg-brand hover:bg-brand/90 text-brand-cream rounded-full font-heading font-bold text-sm btn-lift inline-flex items-center justify-center gap-2 disabled:opacity-60 shadow-md transition-colors tracking-wide"
              data-testid="studio-generate-btn">
              {generating
                ? <><CircleNotch size={15} className="animate-spin" /> Menyusun prompt...</>
                : <><Sparkle size={15} weight="fill" /> GENERATE</>}
            </button>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600">{error}</div>
          )}

          {/* Prompt result */}
          {promptResult && (
            <div ref={promptCardRef}>
              <PromptSuccessCard
                promptData={promptResult}
                hasReferenceImage={!!referenceImg}
                referenceImg={referenceImg}
                productPhoto={selectedProduct?.photo_base64 || null}
                onReset={() => setPromptResult(null)}
                dashboardType="studio"
                title={selectedProduct?.name || "Studio"}
              />
              <div className="mt-3">
                <DebugJsonButton data={promptResult?.prompt_json} title="studio-prompt.json" />
              </div>
            </div>
          )}

        </div>

        {/* ── Sidebar (stacks below form on mobile, sticky beside it on desktop) ── */}
        <div className="lg:sticky lg:top-6 lg:self-start space-y-4">

          {/* Creative Brief */}
          <div className="feedify-card p-4 space-y-3">
            <p className="text-[10px] uppercase tracking-widest font-bold text-stone-400">Creative Brief</p>
            {selectedProduct && (
              <div className="flex items-center gap-2 pb-2 border-b border-stone-100">
                {selectedProduct.photo_base64 ? (
                  <img src={selectedProduct.photo_base64} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
                ) : (
                  <div className="w-10 h-10 rounded-lg bg-brand/10 flex items-center justify-center flex-shrink-0">
                    <Package size={16} weight="duotone" className="text-brand" />
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-stone-700 truncate">{selectedProduct.name}</p>
                  <p className="text-[10px] text-stone-400">{selectedProduct.category}</p>
                </div>
              </div>
            )}
            {[
              ["Gaya foto", referenceImg ? "Ikuti foto inspirasi" : "Belum pilih foto inspirasi"],
              ["Model",     modelEnabled ? (modelGender === "wanita" ? "Wanita" : "Pria") + (modelStyle ? ` · ${MODEL_STYLES.find(s=>s.id===modelStyle)?.label}` : "") : "Tanpa model"],
            ].map(([label, value]) => (
              <div key={label} className="flex items-center justify-between text-xs gap-2">
                <span className="text-stone-400 flex-shrink-0">{label}</span>
                <span className="font-semibold text-stone-700 text-right truncate max-w-[60%]">{value}</span>
              </div>
            ))}
          </div>

          {/* Tips */}
          <div className="rounded-2xl border border-brand-sand bg-gradient-to-br from-brand-sand/40 to-white p-4 space-y-3">
            <p className="text-xs font-bold text-brand">Tips untuk hasil terbaik</p>
            <div className="space-y-2">
              {[
                { icon: "📸", tip: "Gunakan foto dengan pencahayaan yang rata, hindari bayangan terlalu keras" },
                { icon: "🏳️", tip: "PNG transparan lebih akurat — background akan dihapus otomatis" },
                { icon: "🔍", tip: "Pastikan semua detail produk (label, kemasan) terlihat jelas" },
                { icon: "📐", tip: "Foto dari sudut yang menampilkan bentuk produk 3D paling baik" },
              ].map(({ icon, tip }) => (
                <div key={tip} className="flex items-start gap-2">
                  <span className="text-sm flex-shrink-0">{icon}</span>
                  <p className="text-[11px] text-stone-600 leading-relaxed">{tip}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Product library link */}
          <div className="feedify-card p-3 flex items-center gap-3">
            <Package size={16} weight="duotone" className="text-brand flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-stone-700">Gunakan foto dari library produk</p>
              <p className="text-[10px] text-stone-400">Produk tersimpan di satu tempat</p>
            </div>
            <a href="/products" className="text-[10px] font-bold text-brand hover:underline flex-shrink-0">Buka →</a>
          </div>
        </div>
      </div>

      <InspirationGallery
        open={galleryOpen}
        onClose={() => setGalleryOpen(false)}
        context="studio"
        onSelect={(photo) => {
          fetch(photo.url)
            .then(r => r.blob())
            .then(blob => {
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
