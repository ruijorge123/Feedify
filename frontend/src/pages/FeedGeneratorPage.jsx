import { useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { copyToClipboard, openChatGPT } from "@/lib/chatgpt";
import ChatGptImageSteps from "@/components/ChatGptImageSteps";
import PhotoPrepBlock from "@/components/PhotoPrepBlock";
import DebugJsonButton from "@/components/DebugJsonButton";
import {
  SquaresFour,
  Package,
  Sliders,
  Sparkle,
  Copy,
  Check,
  ArrowSquareOut,
  ArrowCounterClockwise,
  Info,
  Lightning,
  Heart,
  BookOpen,
  Tag,
  ChatCircle,
  X,
  CaretDown,
  CheckCircle,
  Confetti,
} from "@phosphor-icons/react";

// ── Content type config ────────────────────────────────────────────────
const CONTENT_TYPES = [
  { id: "awareness",    label: "Awareness",   color: "bg-blue-100 text-blue-700",       icon: Sparkle },
  { id: "soft_selling", label: "Soft Selling", color: "bg-emerald-100 text-emerald-700", icon: Heart },
  { id: "promo",        label: "Promo",        color: "bg-amber-100 text-amber-700",     icon: Tag },
  { id: "testimonial",  label: "Testimoni",    color: "bg-purple-100 text-purple-700",   icon: ChatCircle },
  { id: "education",    label: "Edukasi",      color: "bg-sky-100 text-sky-700",         icon: BookOpen },
  { id: "hard_selling", label: "Hard Selling", color: "bg-red-100 text-red-700",         icon: Lightning },
];

const TYPE_MAP = Object.fromEntries(CONTENT_TYPES.map((t) => [t.id, t]));

// ── Numbered circle ────────────────────────────────────────────────────
function NumCircle({ n }) {
  return (
    <div className="w-8 h-8 rounded-full bg-brand text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
      {n}
    </div>
  );
}

// ── Result: 1-at-a-time stepper ───────────────────────────────────────
function PromptStepper({ prompts, onReset, productPhoto }) {
  const [activeIdx, setActiveIdx] = useState(0);
  const [copied, setCopied] = useState(new Set());
  const total = prompts.length;
  const item = prompts[activeIdx];
  const allDone = copied.size >= total;

  const typeInfo = TYPE_MAP[item?.content_type] || {
    label: item?.content_type_label || item?.content_type || "",
    color: "bg-stone-100 text-stone-600",
    icon: Sparkle,
  };
  const Icon = typeInfo.icon;

  const handleCopy = async () => {
    await copyToClipboard(item.chatgpt_prompt);
    setCopied(prev => new Set([...prev, activeIdx]));
  };

  const handleNext = () => {
    if (activeIdx < total - 1) setActiveIdx(activeIdx + 1);
  };

  if (allDone) {
    return (
      <div className="feedify-card p-8 flex flex-col items-center text-center gap-4">
        <div className="w-16 h-16 rounded-2xl bg-brand/10 flex items-center justify-center">
          <Confetti size={32} weight="fill" className="text-brand" />
        </div>
        <div>
          <p className="font-heading font-bold text-xl text-brand mb-1">Semua prompt siap!</p>
          <p className="text-sm text-stone-500">{total} prompt sudah disalin — tinggal generate di ChatGPT satu per satu.</p>
        </div>
        <button
          onClick={openChatGPT}
          className="h-11 px-6 rounded-full bg-brand text-brand-cream font-semibold text-sm inline-flex items-center gap-2 hover:bg-brand/90 transition-all"
        >
          <ArrowSquareOut size={15} /> Buka ChatGPT
        </button>
        <button onClick={onReset} className="text-xs text-stone-400 hover:text-brand underline mt-1">
          Generate lagi
        </button>
      </div>
    );
  }

  return (
    <div className="feedify-card p-5 flex flex-col gap-4">
      {/* Slide tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
        {prompts.map((_, idx) => {
          const isDone = copied.has(idx);
          const isActive = idx === activeIdx;
          return (
            <button
              key={idx}
              onClick={() => setActiveIdx(idx)}
              className={`flex-shrink-0 h-7 min-w-[28px] px-2 rounded-full text-[11px] font-bold transition-all ${
                isDone
                  ? "bg-emerald-600 text-white"
                  : isActive
                  ? "bg-brand text-white"
                  : "bg-stone-100 text-stone-500 hover:bg-stone-200"
              }`}
            >
              {isDone ? <Check size={11} weight="bold" /> : idx + 1}
            </button>
          );
        })}
        <span className="text-xs text-stone-400 ml-1 flex-shrink-0">
          {copied.size}/{total} disalin
        </span>
      </div>

      {/* Content type badge */}
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-full bg-brand/10 text-brand text-xs font-bold flex items-center justify-center flex-shrink-0">
          {activeIdx + 1}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${typeInfo.color}`}>
              <Icon size={11} weight="fill" />
              {typeInfo.label}
            </span>
          </div>
          <p className="text-sm font-semibold text-brand-dark leading-snug">{item.purpose}</p>
        </div>
      </div>

      {/* Caption angle */}
      <div className="bg-brand-sand/60 rounded-xl px-4 py-2.5">
        <div className="text-[10px] uppercase tracking-widest text-stone-400 font-bold mb-0.5">Angle Caption</div>
        <p className="text-sm text-stone-700 italic">"{item.caption_angle}"</p>
      </div>

      {/* Prompt box */}
      <div>
        <div className="text-[10px] uppercase tracking-widest text-stone-400 font-bold mb-1.5">Prompt ChatGPT</div>
        <div className="bg-stone-50 border border-stone-200 rounded-xl p-3 text-xs text-stone-700 leading-relaxed font-mono max-h-40 overflow-y-auto">
          {item.chatgpt_prompt}
        </div>
      </div>

      {/* Tip */}
      {item.tip && (
        <div className="flex items-start gap-2 text-xs text-stone-500">
          <Info size={14} className="text-brand/60 flex-shrink-0 mt-0.5" />
          <span>{item.tip}</span>
        </div>
      )}

      {/* Phased: salin dulu (nyala-nyala), habis salin baru panduan + buka ChatGPT + next */}
      {!copied.has(activeIdx) ? (
        <button
          onClick={handleCopy}
          className="relative w-full h-12 rounded-2xl bg-[#10a37f] hover:bg-[#0d8a6c] active:scale-95 text-white text-sm font-bold transition-all shadow-md flex items-center justify-center gap-2"
        >
          <span className="absolute inset-0 rounded-2xl animate-ping bg-[#10a37f]/30 pointer-events-none" />
          <Copy size={17} weight="bold" /> Salin Prompt
        </button>
      ) : (
        <div className="space-y-3 animate-fade-up">
          <div className="flex items-center gap-2 text-[#0a6b52]">
            <span className="w-5 h-5 rounded-full bg-[#10a37f] flex items-center justify-center flex-shrink-0">
              <Check size={11} weight="bold" className="text-white" />
            </span>
            <p className="font-bold text-xs">Prompt {activeIdx + 1} tersalin! Begini cara generate fotonya:</p>
          </div>

          <ChatGptImageSteps />

          <PhotoPrepBlock productPhoto={productPhoto} hasReferenceImage={false} />

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={openChatGPT}
              className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-[#10a37f] hover:bg-[#0d8a6c] text-white text-xs font-bold transition-colors"
            >
              <ArrowSquareOut size={13} weight="bold" /> Buka ChatGPT
            </button>
            {activeIdx < total - 1 ? (
              <button
                onClick={handleNext}
                className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-brand hover:bg-brand/90 text-white text-xs font-bold transition-colors"
              >
                Prompt {activeIdx + 2} →
              </button>
            ) : (
              <button
                onClick={handleCopy}
                className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-[#10a37f]/40 text-[#0a6b52] text-xs font-medium hover:bg-[#10a37f]/5 transition-colors"
              >
                <Copy size={12} /> Salin lagi
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────
export default function FeedGeneratorPage() {
  const [productId, setProductId] = useState(null);
  const [productDropdownOpen, setProductDropdownOpen] = useState(false);
  const [count, setCount] = useState(5);
  const [typeMode, setTypeMode] = useState("auto");   // "auto" | "manual"
  const [manualTypes, setManualTypes] = useState([]);

  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  // Fetch products
  const { data: products = [], isLoading: productsLoading } = useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      const { data } = await api.get("/products");
      return data;
    },
  });

  const selectedProduct = products.find((p) => p.id === productId) || null;

  const toggleManualType = (id) => {
    setManualTypes((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]
    );
  };

  const canGenerate = !!productId && (typeMode === "auto" || manualTypes.length > 0);

  const generate = useCallback(async () => {
    if (!canGenerate) return;
    setGenerating(true);
    setError("");
    setResult(null);
    try {
      const { data } = await api.post("/feed-generator/generate", {
        product_id: productId,
        count,
        content_types: typeMode === "auto" ? [] : manualTypes,
      });
      setResult(data);
    } catch (err) {
      const msg = err?.response?.data?.detail || "Gagal generate. Coba lagi.";
      setError(msg);
    } finally {
      setGenerating(false);
    }
  }, [canGenerate, productId, count, typeMode, manualTypes]);

  // ── Result view ────────────────────────────────────────────────────
  if (result) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8 pb-28 lg:pb-10">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-brand text-white flex items-center justify-center">
            <SquaresFour size={20} weight="fill" />
          </div>
          <div>
            <h1 className="font-heading text-xl font-bold text-brand">Feed Generator</h1>
            <p className="text-xs text-stone-500">{result.product_name} — {result.prompts?.length} prompt siap dipakai</p>
          </div>
        </div>
        <PromptStepper prompts={result.prompts || []} onReset={() => setResult(null)} productPhoto={selectedProduct?.photo_base64 || null} />
        <div className="mt-3">
          <DebugJsonButton data={result.prompts} title="feed-generator-prompts.json" />
        </div>
      </div>
    );
  }

  // ── Form view ──────────────────────────────────────────────────────
  return (
    <div className="max-w-2xl mx-auto px-4 py-8 pb-32 lg:pb-10">
      {/* Page header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-brand text-white flex items-center justify-center">
          <SquaresFour size={20} weight="fill" />
        </div>
        <div>
          <h1 className="font-heading text-xl font-bold text-brand">Feed Generator</h1>
          <p className="text-xs text-stone-500">Generate banyak prompt foto produk sekaligus — konsisten tapi beragam</p>
        </div>
      </div>

      <div className="space-y-4">
        {/* ① Pilih Produk */}
        <div className={`feedify-card p-5 ${!productId ? "border-2 border-red-200" : ""}`}>
          <div className="flex items-center gap-3 mb-4">
            <NumCircle n="①" />
            <div>
              <div className="flex items-center gap-2">
                <div className="font-heading font-bold text-brand text-sm">Product Knowledge</div>
                <span className="text-[9px] font-bold text-red-500 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded-full">★ Wajib</span>
              </div>
              <div className="text-xs text-stone-400">Pilih produk dari library kamu</div>
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
            <div className={`relative ${!productId ? "rounded-xl border-2 border-red-200" : ""}`}>
              <button
                onClick={() => setProductDropdownOpen(v => !v)}
                className="w-full flex items-center gap-3 p-3 rounded-xl border border-stone-200 hover:border-brand/50 transition-all text-left bg-white"
                data-testid="feed-product-selector-btn"
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
                      onClick={(e) => { e.stopPropagation(); setProductId(null); }}
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
                      onClick={() => { setProductId(p.id); setProductDropdownOpen(false); }}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 hover:bg-brand/5 transition-all text-left ${p.id === productId ? "bg-brand/5" : ""}`}
                      data-testid={`feed-product-option-${p.id}`}
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
                      {p.id === productId && <CheckCircle size={14} weight="fill" className="text-brand flex-shrink-0" />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ② Berapa Prompt */}
        <div className="feedify-card p-5">
          <div className="flex items-center gap-3 mb-4">
            <NumCircle n="②" />
            <div>
              <div className="font-heading font-bold text-brand text-sm">Berapa Prompt?</div>
              <div className="text-xs text-stone-400">1 foto per prompt — generate ke ChatGPT satu per satu</div>
            </div>
            <Sliders size={18} className="text-brand/40 ml-auto" />
          </div>

          <div className="flex gap-2 flex-wrap">
            {[1, 2, 3, 4, 5, 6, 7].map((n) => (
              <button
                key={n}
                onClick={() => setCount(n)}
                className={`w-12 h-12 rounded-xl text-sm font-bold transition-all ${
                  count === n
                    ? "bg-brand text-white shadow-md scale-105"
                    : "bg-stone-100 text-stone-600 hover:bg-stone-200"
                }`}
              >
                {n}
              </button>
            ))}
          </div>

          <div className="mt-3 bg-brand-sand/60 rounded-xl px-4 py-2.5 flex items-center gap-2">
            <Sparkle size={14} className="text-brand/60" />
            <span className="text-xs text-stone-600">
              Generate <strong>{count} prompt</strong> → ChatGPT buat <strong>{count} foto</strong> berbeda
            </span>
          </div>
        </div>

        {/* ③ Tipe Konten */}
        <div className="feedify-card p-5">
          <div className="flex items-center gap-3 mb-4">
            <NumCircle n="③" />
            <div>
              <div className="font-heading font-bold text-brand text-sm">Tipe Konten</div>
              <div className="text-xs text-stone-400">Auto mix atau pilih manual</div>
            </div>
          </div>

          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setTypeMode("auto")}
              className={`flex-1 h-9 rounded-full text-xs font-semibold transition-all ${
                typeMode === "auto" ? "bg-brand text-white" : "bg-stone-100 text-stone-600 hover:bg-stone-200"
              }`}
            >
              Auto Mix
            </button>
            <button
              onClick={() => setTypeMode("manual")}
              className={`flex-1 h-9 rounded-full text-xs font-semibold transition-all ${
                typeMode === "manual" ? "bg-brand text-white" : "bg-stone-100 text-stone-600 hover:bg-stone-200"
              }`}
            >
              Pilih Manual
            </button>
          </div>

          {typeMode === "auto" ? (
            <p className="text-xs text-stone-500 bg-stone-50 rounded-xl px-4 py-3">
              Feedify otomatis pilih campuran terbaik: Awareness, Soft Selling, Testimoni, Promo, Edukasi sesuai jumlah prompt.
            </p>
          ) : (
            <div>
              <p className="text-xs text-stone-400 mb-3">Pilih minimal 1 tipe (urutan berulang jika jumlah prompt &gt; pilihan)</p>
              <div className="flex flex-wrap gap-2">
                {CONTENT_TYPES.map((t) => {
                  const Icon = t.icon;
                  const active = manualTypes.includes(t.id);
                  return (
                    <button
                      key={t.id}
                      onClick={() => toggleManualType(t.id)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all border ${
                        active
                          ? "bg-brand text-white border-brand"
                          : "bg-white text-stone-600 border-stone-200 hover:border-brand/30"
                      }`}
                    >
                      <Icon size={12} weight={active ? "fill" : "regular"} />
                      {t.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600">{error}</div>
        )}

        {/* GENERATE — nempel di bawah form (semua viewport) */}
        <button
          onClick={generate}
          disabled={generating || !canGenerate}
          className="inline-flex w-full h-12 bg-brand hover:bg-brand/90 text-brand-cream rounded-full font-heading font-bold text-sm btn-lift items-center justify-center gap-2 disabled:opacity-60 shadow-md transition-colors tracking-wide"
          data-testid="generate-feed-btn"
        >
          <Sparkle size={16} weight="fill" />
          {generating ? "Menyusun Prompt..." : `GENERATE — ${count} foto`}
        </button>
      </div>
    </div>
  );
}
