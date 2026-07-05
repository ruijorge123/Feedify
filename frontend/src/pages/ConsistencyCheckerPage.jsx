import { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import api from "@/lib/api";
import { toast } from "react-toastify";
import {
  ShieldCheck,
  CircleNotch,
  CheckCircle,
  Star,
  UploadSimple,
  Lightbulb,
  Camera,
  Palette,
  Storefront,
  Brain,
  Eye,
  Sparkle,
  ArrowClockwise,
  Info,
} from "@phosphor-icons/react";

const PROCESSING_STEPS = [
  "Reading Brand DNA",
  "Detecting Product",
  "Checking Photography Quality",
  "Detecting Brand Colors",
  "Analysing Typography",
  "Measuring White Space",
  "Analysing Composition",
  "Predicting Visual Attention",
  "Calculating Commercial Score",
  "Generating Recommendations",
];

const STAR_RATING_LABELS = {
  commercial_readiness: "Commercial Readiness",
  photography_quality: "Photography Quality",
  marketplace_ready: "Marketplace Ready",
  luxury_impression: "Luxury Impression",
  brand_consistency: "Brand Consistency",
  visual_hierarchy: "Visual Hierarchy",
  trust_score: "Trust Score",
  conversion_potential: "Conversion Potential",
};

const CATEGORY_CONFIG = [
  { key: "brand_identity", label: "Brand Identity", icon: Palette },
  { key: "photography", label: "Photography", icon: Camera },
  { key: "marketplace", label: "Marketplace", icon: Storefront },
  { key: "psychology", label: "Psychology", icon: Brain },
];

function scoreBarColor(score) {
  if (score >= 80) return "bg-green-500";
  if (score >= 60) return "bg-amber-400";
  return "bg-red-400";
}

function scoreChipColor(score) {
  if (score >= 80) return "text-green-700 bg-green-50";
  if (score >= 60) return "text-amber-700 bg-amber-50";
  return "text-red-700 bg-red-50";
}

function statusConfig(status) {
  const map = {
    Excellent: { color: "text-green-700", bg: "bg-green-50 border-green-200", dot: "bg-green-500" },
    Good: { color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200", dot: "bg-emerald-500" },
    Fair: { color: "text-amber-700", bg: "bg-amber-50 border-amber-200", dot: "bg-amber-500" },
    Poor: { color: "text-red-700", bg: "bg-red-50 border-red-200", dot: "bg-red-500" },
  };
  return map[status] || map.Fair;
}

function ScoreRing({ score, status }) {
  const cfg = statusConfig(status);
  const circumference = 2 * Math.PI * 54;
  const dash = (Math.min(score, 100) / 100) * circumference;
  const strokeColor = score >= 80 ? "#22c55e" : score >= 60 ? "#f59e0b" : "#ef4444";
  return (
    <div className="flex flex-col items-center">
      <div className="relative w-32 h-32">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
          <circle cx="60" cy="60" r="54" fill="none" stroke="#e7e5e4" strokeWidth="8" />
          <circle
            cx="60" cy="60" r="54" fill="none"
            stroke={strokeColor} strokeWidth="8"
            strokeDasharray={`${dash} ${circumference}`}
            strokeLinecap="round"
            className="transition-all duration-1000"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-heading text-4xl font-bold text-brand leading-none">{score}</span>
          <span className="text-xs text-stone-500 font-semibold">/ 100</span>
        </div>
      </div>
      <div className={`mt-3 px-4 py-1 rounded-full border text-sm font-bold flex items-center gap-1.5 ${cfg.bg} ${cfg.color}`}>
        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${cfg.dot}`} />
        {status}
      </div>
    </div>
  );
}

function StarRow({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2 border-b border-brand-sand/50 last:border-0">
      <span className="text-sm text-stone-600">{label}</span>
      <div className="flex gap-0.5 flex-shrink-0">
        {[1, 2, 3, 4, 5].map((n) => (
          <Star key={n} size={13} weight={n <= value ? "fill" : "regular"} className={n <= value ? "text-brand-gold" : "text-stone-300"} />
        ))}
      </div>
    </div>
  );
}

function AnimatedBar({ score }) {
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setWidth(score), 80);
    return () => clearTimeout(t);
  }, [score]);
  return (
    <div className="h-1.5 rounded-full bg-stone-100 overflow-hidden mt-1.5">
      <div className={`h-full rounded-full transition-all duration-700 ${scoreBarColor(score)}`} style={{ width: `${width}%` }} />
    </div>
  );
}

function CategoryItem({ item }) {
  return (
    <div className="py-3 border-b border-brand-sand/40 last:border-0">
      <div className="flex items-center justify-between gap-3 mb-0.5">
        <span className="text-sm font-semibold text-brand">{item.label}</span>
        <span className={`text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${scoreChipColor(item.score)}`}>{item.score}</span>
      </div>
      <AnimatedBar score={item.score} />
      {item.explanation && <p className="text-xs text-stone-500 mt-1.5 leading-relaxed">{item.explanation}</p>}
    </div>
  );
}

export default function ConsistencyCheckerPage() {
  const navigate = useNavigate();
  const [image, setImage] = useState(null);
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [processingStep, setProcessingStep] = useState(-1);
  const [result, setResult] = useState(null);
  const [brand, setBrand] = useState(null);
  const [activeCategory, setActiveCategory] = useState("brand_identity");
  const [dragging, setDragging] = useState(false);
  const dropRef = useRef(null);

  useEffect(() => {
    api.get("/brand-profile").then(({ data }) => setBrand(data)).catch(() => {});
  }, []);

  const processFile = useCallback((file) => {
    if (!file || !file.type.startsWith("image/")) {
      toast.error("File harus berupa gambar");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Gambar maksimal 10MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setImage(reader.result);
      setResult(null);
    };
    reader.readAsDataURL(file);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragging(false);
    processFile(e.dataTransfer?.files?.[0]);
  }, [processFile]);

  const handleSubmit = async () => {
    if (!image) { toast.error("Upload gambar dulu"); return; }
    setLoading(true);
    setResult(null);
    setProcessingStep(0);

    const animationDone = (async () => {
      for (let i = 0; i < PROCESSING_STEPS.length; i++) {
        setProcessingStep(i);
        await new Promise((r) => setTimeout(r, 700));
      }
    })();

    const base64 = image.split(",")[1];
    const mime = image.split(";")[0].split(":")[1];
    const apiFetch = api.post("/consistency/check", { image_base64: base64, mime_type: mime, note });

    try {
      const [, { data }] = await Promise.all([animationDone, apiFetch]);
      if (data.error) { toast.error("Gagal menganalisis, coba lagi"); return; }
      setResult(data);
      toast.success("Brand Audit selesai!");
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Audit gagal. Coba lagi.");
    } finally {
      setLoading(false);
      setProcessingStep(-1);
    }
  };

  const activeCategoryItems = result?.categories?.[activeCategory] || [];

  return (
    <div className="flex flex-col" data-testid="brand-audit-page">
      {/* Header */}
      <div className="animate-fade-up mb-6">
        <div className="text-xs uppercase tracking-[0.2em] text-brand-light font-semibold mb-1">Dashboard · QA</div>
        <h1 className="font-heading text-3xl sm:text-4xl font-bold text-brand tracking-tight">Brand Audit</h1>
        <p className="text-stone-600 mt-1 max-w-2xl text-sm">
          Analisis kualitas visual, fotografi komersial, dan konsistensi terhadap Brand DNA sebelum konten dipublikasikan.
        </p>
      </div>

      {/* Main grid */}
      <div className="grid lg:grid-cols-[40%_1fr] gap-6">
        {/* LEFT: Upload */}
        <div className="space-y-4 animate-fade-up">
          <div className="feedify-card p-5">
            <div className="text-xs font-bold uppercase tracking-[0.18em] text-stone-500 mb-1">Upload Content</div>
            <p className="text-xs text-stone-500 mb-3">Upload gambar hasil Feedify atau desain lain untuk dianalisis oleh AI.</p>
            <div
              ref={dropRef}
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              onClick={() => !loading && document.getElementById("audit-photo-input").click()}
              data-testid="audit-drop-zone"
              className={`cursor-pointer border-2 border-dashed rounded-xl transition-all overflow-hidden ${
                dragging ? "border-brand bg-brand/5" : "border-brand-sand hover:border-brand-light"
              } ${loading ? "pointer-events-none opacity-60" : ""}`}
            >
              {image ? (
                <div className="relative">
                  <img src={image} alt="audit" className="w-full max-h-64 object-contain rounded-xl p-2" />
                  <div className="absolute bottom-2 right-2 bg-black/60 text-white text-[10px] px-2 py-0.5 rounded-full">Klik untuk ganti</div>
                </div>
              ) : (
                <div className="py-10 flex flex-col items-center text-center px-4">
                  <UploadSimple size={36} className="text-brand-light mb-2" weight="duotone" />
                  <div className="font-semibold text-brand text-sm">Drag & drop gambar di sini</div>
                  <div className="text-xs text-stone-500 mt-1">atau klik untuk browse</div>
                  <div className="mt-2 flex gap-1.5 flex-wrap justify-center">
                    {["PNG", "JPG", "JPEG", "WEBP"].map((f) => (
                      <span key={f} className="text-[10px] px-2 py-0.5 rounded-full bg-brand-sand text-stone-600 font-mono">{f}</span>
                    ))}
                  </div>
                  <div className="text-[10px] text-stone-400 mt-1">Maks. 10 MB</div>
                </div>
              )}
            </div>
            <input
              id="audit-photo-input"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={(e) => processFile(e.target.files?.[0])}
              data-testid="audit-photo-input"
            />
          </div>

          <div className="feedify-card p-5">
            <label className="text-xs font-bold uppercase tracking-[0.18em] text-stone-500 mb-1 block">Catatan (opsional)</label>
            <p className="text-xs text-stone-500 mb-2">Membantu AI memahami konteks penggunaan gambar.</p>
            <textarea
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="input resize-none text-sm"
              placeholder="mis. Banner promo Ramadan untuk Instagram Feed"
              data-testid="audit-note"
              disabled={loading}
            />
          </div>

          {!brand && (
            <div className="feedify-card p-4 border border-amber-200 bg-amber-50/50">
              <div className="flex items-start gap-2">
                <Info size={16} className="text-amber-600 mt-0.5 flex-shrink-0" weight="duotone" />
                <div>
                  <div className="text-xs font-bold text-amber-700">No Brand DNA Connected</div>
                  <div className="text-xs text-amber-600 mt-0.5">Analisis dilakukan berdasarkan standar commercial photography tanpa referensi Brand DNA.</div>
                </div>
              </div>
            </div>
          )}

          {brand && (
            <div className="feedify-card p-4">
              <div className="text-xs font-bold uppercase tracking-[0.18em] text-brand-light mb-2">Brand DNA Reference</div>
              <div className="font-heading font-bold text-brand text-sm">{brand.brand_name}</div>
              <div className="text-xs text-stone-500 mb-2">{brand.category} · {brand.visual_style}</div>
              <div className="flex gap-1.5">
                {[brand.color_primary, brand.color_secondary].filter(Boolean).map((c, i) => (
                  <div key={i} className="h-8 w-8 rounded-lg border border-white shadow-sm" style={{ background: c }} title={c} />
                ))}
              </div>
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={loading || !image}
            data-testid="audit-submit-btn"
            className="w-full py-4 bg-brand text-brand-cream rounded-full font-bold text-base hover:bg-brand-light btn-lift inline-flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg transition-all"
          >
            {loading
              ? <><CircleNotch size={20} className="animate-spin" /> Menganalisis...</>
              : <><ShieldCheck size={20} weight="fill" /> Run Brand Audit</>
            }
          </button>
        </div>

        {/* RIGHT: Results */}
        <div className="space-y-4 animate-fade-up">
          {/* Empty state */}
          {!loading && !result && (
            <div className="feedify-card p-10 flex flex-col items-center text-center min-h-[400px] justify-center">
              <div className="w-20 h-20 rounded-full bg-brand/5 flex items-center justify-center mb-4">
                <ShieldCheck size={36} className="text-brand-light" weight="duotone" />
              </div>
              <h3 className="font-heading font-bold text-brand text-lg">Belum ada gambar untuk dianalisis</h3>
              <p className="text-stone-500 text-sm mt-2 max-w-xs">Upload gambar untuk melihat analisis visual dan rekomendasi AI.</p>
            </div>
          )}

          {/* Processing checklist */}
          {loading && (
            <div className="feedify-card p-8">
              <div className="text-xs font-bold uppercase tracking-[0.18em] text-brand-light mb-5">Menganalisis Gambar...</div>
              <div className="space-y-3.5">
                {PROCESSING_STEPS.map((step, i) => {
                  const done = i < processingStep;
                  const active = i === processingStep;
                  return (
                    <div
                      key={step}
                      className={`flex items-center gap-3 transition-all duration-300 ${i > processingStep ? "opacity-25" : "opacity-100"}`}
                    >
                      {done ? (
                        <CheckCircle size={18} className="text-green-500 flex-shrink-0" weight="fill" />
                      ) : active ? (
                        <CircleNotch size={18} className="text-brand animate-spin flex-shrink-0" />
                      ) : (
                        <div className="w-[18px] h-[18px] rounded-full border-2 border-stone-300 flex-shrink-0" />
                      )}
                      <span className={`text-sm transition-all ${done ? "text-stone-400 line-through" : active ? "text-brand font-semibold" : "text-stone-400"}`}>
                        {step}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Results */}
          {result && !loading && (
            <>
              {/* Hero score */}
              <div className="feedify-card p-6">
                <div className="flex flex-col sm:flex-row items-center gap-6">
                  <ScoreRing score={result.overall_score} status={result.status} />
                  <div className="flex-1 text-center sm:text-left">
                    <div className="text-xs font-bold uppercase tracking-[0.18em] text-stone-500 mb-1">Brand Quality Score</div>
                    <p className="text-stone-700 text-sm leading-relaxed">{result.summary}</p>
                    {!result.has_brand_dna && (
                      <div className="mt-3 inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-full bg-amber-100 text-amber-700 border border-amber-200">
                        <Info size={10} weight="fill" />
                        No Brand DNA Connected
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Star ratings */}
              {result.star_ratings && (
                <div className="feedify-card p-5">
                  <div className="text-xs font-bold uppercase tracking-[0.18em] text-brand-light mb-3">Commercial Scores</div>
                  <div className="grid sm:grid-cols-2 gap-x-6">
                    {Object.entries(STAR_RATING_LABELS).map(([key, label]) => (
                      <StarRow key={key} label={label} value={result.star_ratings[key] ?? 0} />
                    ))}
                  </div>
                </div>
              )}

              {/* Category tabs */}
              {result.categories && (
                <div className="feedify-card p-5">
                  <div className="text-xs font-bold uppercase tracking-[0.18em] text-brand-light mb-3">AI Audit Categories</div>
                  <div className="flex gap-1.5 mb-4 flex-wrap">
                    {CATEGORY_CONFIG.map((cat) => {
                      const Icon = cat.icon;
                      const active = activeCategory === cat.key;
                      return (
                        <button
                          key={cat.key}
                          onClick={() => setActiveCategory(cat.key)}
                          data-testid={`category-tab-${cat.key}`}
                          className={`px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all ${
                            active ? "bg-brand text-brand-cream shadow-sm" : "bg-stone-100 text-stone-600 hover:bg-stone-200"
                          }`}
                        >
                          <Icon size={12} weight="duotone" />
                          {cat.label}
                        </button>
                      );
                    })}
                  </div>
                  <div>
                    {activeCategoryItems.map((item) => (
                      <CategoryItem key={item.key} item={item} />
                    ))}
                    {activeCategoryItems.length === 0 && (
                      <p className="text-xs text-stone-400 text-center py-4">Tidak ada data untuk kategori ini.</p>
                    )}
                  </div>
                </div>
              )}

              {/* AI Recommendations */}
              {result.recommendations?.length > 0 && (
                <div className="feedify-card p-5">
                  <div className="text-xs font-bold uppercase tracking-[0.18em] text-brand-light mb-3 flex items-center gap-1.5">
                    <Lightbulb size={14} className="text-brand-gold" weight="fill" />
                    AI Recommendations
                  </div>
                  <ol className="space-y-4">
                    {result.recommendations.map((rec, i) => (
                      <li key={i} className="flex gap-3">
                        <span className="flex-shrink-0 h-6 w-6 rounded-full bg-brand-gold text-brand font-bold text-xs flex items-center justify-center">{i + 1}</span>
                        <div>
                          <div className="text-sm font-semibold text-brand">{rec.text}</div>
                          {rec.why && <div className="text-xs text-stone-500 mt-0.5"><span className="font-semibold">Why:</span> {rec.why}</div>}
                          {rec.expected_improvement && (
                            <div className="text-xs text-green-700 mt-0.5 flex items-center gap-1">
                              <CheckCircle size={10} weight="fill" />
                              {rec.expected_improvement}
                            </div>
                          )}
                        </div>
                      </li>
                    ))}
                  </ol>
                </div>
              )}

              {/* Dominant colors */}
              {result.detected_dominant_colors?.length > 0 && (
                <div className="feedify-card p-5">
                  <div className="text-xs font-bold uppercase tracking-[0.18em] text-brand-light mb-3">Dominant Colors Detected</div>
                  <div className="flex gap-2 flex-wrap">
                    {result.detected_dominant_colors.map((c, i) => (
                      <div key={i} className="flex flex-col items-center">
                        <div className="h-10 w-10 rounded-xl border border-white shadow-md" style={{ background: c }} />
                        <div className="text-[10px] font-mono text-stone-500 mt-1">{c}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Advanced Insights */}
              {result.advanced_insights && (
                <div className="feedify-card p-5">
                  <div className="text-xs font-bold uppercase tracking-[0.18em] text-brand-light mb-3 flex items-center gap-1.5">
                    <Sparkle size={14} className="text-brand-gold" weight="fill" />
                    Advanced Insights
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {[
                      { key: "predicted_ctr", label: "Predicted CTR", format: (v) => `+${v}%`, highlight: true },
                      { key: "luxury_feeling", label: "Luxury Feeling", format: (v) => `${v}%` },
                      { key: "marketplace_score", label: "Marketplace Score", format: (v) => `${v}%` },
                      { key: "visual_balance", label: "Visual Balance", format: (v) => `${v}%` },
                      { key: "premium_impression", label: "Premium Impression", format: (v) => `${v}%` },
                      { key: "text_readability", label: "Text Readability", format: (v) => `${v}%` },
                      { key: "hero_product_visibility", label: "Hero Visibility", format: (v) => `${v}%` },
                    ].map(({ key, label, format, highlight }) => {
                      const val = result.advanced_insights[key];
                      if (val == null) return null;
                      return (
                        <div key={key} className={`rounded-xl p-3 text-center ${highlight ? "bg-brand/5 border border-brand/10" : "bg-stone-50"}`}>
                          <div className={`font-heading text-2xl font-bold ${highlight ? "text-brand" : "text-stone-700"}`}>{format(val)}</div>
                          <div className="text-[10px] text-stone-500 mt-0.5">{label}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Heatmap Preview (Premium) */}
              {image && (
                <div className="feedify-card p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-xs font-bold uppercase tracking-[0.18em] text-brand-light flex items-center gap-1.5">
                      <Eye size={14} weight="duotone" />
                      Visual Attention Heatmap
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-brand-gold/20 text-brand border border-brand-gold/40">PREMIUM</span>
                  </div>
                  <div className="relative rounded-xl overflow-hidden">
                    <img src={image} alt="heatmap" className="w-full max-h-52 object-contain blur-sm opacity-70" />
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-brand/30 backdrop-blur-sm">
                      <Sparkle size={28} className="text-brand-gold mb-2" weight="fill" />
                      <div className="text-white font-bold text-sm">Segera Hadir</div>
                      <div className="text-white/80 text-xs mt-1">Upgrade ke Premium untuk melihat heatmap visual</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Improvement Actions */}
              <div className="feedify-card p-5 space-y-3">
                <button
                  onClick={() => navigate("/studio")}
                  data-testid="btn-generate-new"
                  className="w-full py-3.5 bg-brand text-brand-cream rounded-full font-bold flex items-center justify-center gap-2 hover:bg-brand-light btn-lift transition-all"
                >
                  <ArrowClockwise size={18} weight="bold" />
                  Generate New Version
                </button>
                <button
                  onClick={() => toast.info("Fitur 'Improve Automatically' segera hadir!")}
                  data-testid="btn-improve-auto"
                  className="w-full py-3 border-2 border-brand text-brand rounded-full font-semibold flex items-center justify-center gap-2 hover:bg-brand/5 transition-all"
                >
                  <Sparkle size={16} weight="fill" />
                  Improve Automatically
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-brand-gold/20 text-brand border border-brand-gold/40 ml-1">SOON</span>
                </button>
                <p className="text-xs text-stone-400 text-center">AI akan memperbaiki komposisi, pencahayaan, dan tata letak tanpa mengubah identitas produk.</p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
