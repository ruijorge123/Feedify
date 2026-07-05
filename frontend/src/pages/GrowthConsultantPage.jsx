import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import api from "@/lib/api";
import { toast } from "react-toastify";
import {
  TrendUp, Storefront, InstagramLogo, FilmSlate, PenNib,
  RocketLaunch, ChartBar, Lightbulb, ArrowLeft, ArrowRight,
  Sparkle, CircleNotch, CheckCircle, ImageSquare, Stack,
  Brain, CalendarBlank, Check,
} from "@phosphor-icons/react";

// ─── Tool icon map ─────────────────────────────────────────────────────────────

const TOOL_ICON_MAP = {
  "Feed Post":           ImageSquare,
  "Carousel":            Stack,
  "Reels":               FilmSlate,
  "Copywriting":         PenNib,
  "Marketplace":         Storefront,
  "Calendar":            CalendarBlank,
  "Studio":              Brain,
};

// ─── Category definitions ─────────────────────────────────────────────────────

const MODES = [
  {
    id: "increase_sales",
    emoji: "📈",
    Icon: TrendUp,
    title: "Tingkatkan Penjualan",
    desc: "Konversi, penawaran, positioning, dan kepercayaan pelanggan",
    color: { ring: "border-emerald-200", bg: "bg-emerald-50", icon: "text-emerald-600", badge: "bg-emerald-100 text-emerald-700" },
    questions: [
      { key: "produk",   label: "Apa produk yang kamu jual?",           type: "text",        placeholder: "mis. Sunscreen SPF50, baju muslim, martabak..." },
      { key: "harga",    label: "Berapa kisaran harga produkmu?",        type: "chips",       options: ["<50rb", "50-150rb", "150-500rb", ">500rb"] },
      { key: "platform", label: "Di mana kamu jualan?",                 type: "multi-chips", options: ["Shopee", "Tokopedia", "TikTok Shop", "Instagram", "WhatsApp", "Offline"] },
      { key: "hambatan", label: "Apa hambatan terbesar closing?",        type: "chips",       options: ["Harga dianggap mahal", "Sepi yang lihat", "Banyak nanya tapi gak beli", "Kalah sama kompetitor", "Gak tau kenapa"] },
      { key: "target",   label: "Target penjualan yang diinginkan?",     type: "text",        placeholder: "mis. 2x penjualan dalam 3 bulan, 50 order/hari..." },
    ],
  },
  {
    id: "marketplace",
    emoji: "🛒",
    Icon: Storefront,
    title: "Marketplace Optimization",
    desc: "CTR thumbnail, visibilitas produk, dan konversi listing",
    color: { ring: "border-orange-200", bg: "bg-orange-50", icon: "text-orange-500", badge: "bg-orange-100 text-orange-700" },
    questions: [
      { key: "produk",            label: "Produk apa yang kamu jual?",          type: "text",  placeholder: "mis. Skincare, fashion, makanan, elektronik..." },
      { key: "marketplace_fokus", label: "Marketplace mana fokusmu?",           type: "chips", options: ["Shopee", "Tokopedia", "TikTok Shop", "Lazada"] },
      { key: "masalah",           label: "Masalah utama di marketplace?",       type: "chips", options: ["Listing gak muncul", "Banyak dilihat sedikit dibeli", "Thumbnail kurang menarik", "Kalah harga", "Review sedikit"] },
      { key: "iklan",             label: "Sudah pakai iklan marketplace?",      type: "chips", options: ["Belum pernah", "Pernah tapi boncos", "Lagi pakai sekarang"] },
      { key: "target",            label: "Target yang diinginkan?",             type: "text",  placeholder: "mis. Masuk halaman 1 Shopee, CTR naik 2x..." },
    ],
  },
  {
    id: "instagram",
    emoji: "📱",
    Icon: InstagramLogo,
    title: "Instagram & Branding",
    desc: "Identitas brand, konsistensi visual, dan content strategy",
    color: { ring: "border-pink-200", bg: "bg-pink-50", icon: "text-pink-500", badge: "bg-pink-100 text-pink-700" },
    questions: [
      { key: "brand",      label: "Brand kamu jualan apa?",             type: "text",  placeholder: "mis. Skincare herbal, fashion hijab, kue kering..." },
      { key: "follower",   label: "Berapa follower IG sekarang?",       type: "chips", options: ["<1rb", "1-5rb", "5-10rb", ">10rb"] },
      { key: "masalah",    label: "Masalah branding terbesar?",         type: "chips", options: ["Feed gak konsisten", "Gak ada identity jelas", "Engagement rendah", "Bingung mau posting apa", "Kalah estetik sama kompetitor"] },
      { key: "frekuensi",  label: "Seberapa sering posting?",          type: "chips", options: ["Hampir gak pernah", "Seminggu sekali", "2-3x seminggu", "Tiap hari"] },
      { key: "target",     label: "Mau brand kamu dikenal sebagai apa?",type: "text", placeholder: "mis. Brand skincare halal terpercaya untuk ibu muda..." },
    ],
  },
  {
    id: "reels",
    emoji: "🎬",
    Icon: FilmSlate,
    title: "Reels & Video Marketing",
    desc: "Hook kuat, storytelling, dan video yang mengkonversi",
    color: { ring: "border-violet-200", bg: "bg-violet-50", icon: "text-violet-600", badge: "bg-violet-100 text-violet-700" },
    questions: [
      { key: "produk",      label: "Produk yang mau di-video-kan?",   type: "text",  placeholder: "mis. Serum wajah, tas kulit, kue kering..." },
      { key: "pengalaman",  label: "Sudah pernah bikin Reels?",       type: "chips", options: ["Belum pernah", "Pernah tapi gak nonton", "Lumayan ada yang nonton"] },
      { key: "kendala",     label: "Kendala bikin video?",            type: "chips", options: ["Gak bisa edit", "Gak ada ide", "Malu di depan kamera", "Gak tau hook yang bagus", "Gak ada waktu"] },
      { key: "gaya",        label: "Gaya konten yang diinginkan?",    type: "chips", options: ["Estetik/cinematic", "Lucu/relatable", "Edukasi", "Behind the scenes", "Hard selling"] },
      { key: "target",      label: "Target dari video?",             type: "text",  placeholder: "mis. Viral di TikTok, dapat 100 order dari Reels..." },
    ],
  },
  {
    id: "copywriting",
    emoji: "✍️",
    Icon: PenNib,
    title: "Copywriting",
    desc: "Headline, CTA, deskripsi produk, dan copy promosi",
    color: { ring: "border-blue-200", bg: "bg-blue-50", icon: "text-blue-600", badge: "bg-blue-100 text-blue-700" },
    questions: [
      { key: "produk",          label: "Produk yang mau di-copy-kan?",  type: "text",  placeholder: "mis. Skincare herbal, jasa desain logo, kuliner..." },
      { key: "keperluan",       label: "Untuk keperluan apa?",          type: "chips", options: ["Caption IG", "Deskripsi marketplace", "Iklan berbayar", "Broadcast WA", "Bio profil"] },
      { key: "tone",            label: "Tone brand kamu?",             type: "chips", options: ["Santai/friendly", "Formal/profesional", "Lucu/playful", "Elegan/premium", "Hangat/personal"] },
      { key: "target_customer", label: "Siapa target customermu?",     type: "text",  placeholder: "mis. Ibu muda 25-35 tahun, anak muda aktif medsos..." },
      { key: "keunggulan",      label: "Apa keunggulan utama produkmu?",type: "text", placeholder: "mis. Bahan alami, harga terjangkau, tahan 12 jam..." },
    ],
  },
  {
    id: "product_launch",
    emoji: "🚀",
    Icon: RocketLaunch,
    title: "Product Launch",
    desc: "Strategi launch, hype building, dan first impression",
    color: { ring: "border-amber-200", bg: "bg-amber-50", icon: "text-amber-600", badge: "bg-amber-100 text-amber-700" },
    questions: [
      { key: "produk",    label: "Produk baru apa yang mau di-launch?", type: "text",  placeholder: "mis. Sabun kojic, tas edisi limited, menu baru..." },
      { key: "kapan",     label: "Kapan rencana launch?",              type: "chips", options: ["Minggu ini", "2 minggu lagi", "Bulan depan", "Belum tentukan"] },
      { key: "audience",  label: "Sudah punya audience?",             type: "chips", options: ["Belum ada", "Sedikit", "Lumayan banyak"] },
      { key: "budget",    label: "Budget marketing launch?",          type: "chips", options: ["Minim/organik", "Ada sedikit", "Lumayan"] },
      { key: "target",    label: "Target launch day?",               type: "text",  placeholder: "mis. 100 order hari pertama, 500 reach di IG..." },
    ],
  },
  {
    id: "competitor",
    emoji: "📊",
    Icon: ChartBar,
    title: "Competitor Analysis",
    desc: "Analisis kompetitor dan temukan peluang diferensiasi",
    color: { ring: "border-red-200", bg: "bg-red-50", icon: "text-red-500", badge: "bg-red-100 text-red-700" },
    questions: [
      { key: "kategori",             label: "Di kategori apa kamu bersaing?",          type: "text", placeholder: "mis. Skincare lokal, fashion hijab, kedai kopi..." },
      { key: "kompetitor",           label: "Sebutkan 2-3 kompetitor utama kamu",      type: "text", placeholder: "mis. Brand X, Toko Y, @akun_z..." },
      { key: "kelebihan_kompetitor", label: "Apa yang membuat kompetitor unggul?",     type: "text", placeholder: "mis. Harga lebih murah, followers lebih banyak..." },
      { key: "kelebihan_kamu",       label: "Apa kelebihan bisnis kamu?",             type: "text", placeholder: "mis. Bahan lebih berkualitas, pelayanan lebih cepat..." },
      { key: "diferensiasi",         label: "Ingin jadi pilihan utama untuk siapa?",  type: "text", placeholder: "mis. Pelanggan yang mau premium tapi harga wajar..." },
    ],
  },
  {
    id: "content_ideas",
    emoji: "💡",
    Icon: Lightbulb,
    title: "Content Ideas",
    desc: "Ide konten berdasarkan tujuan dan audiens bisnis kamu",
    color: { ring: "border-yellow-200", bg: "bg-yellow-50", icon: "text-yellow-600", badge: "bg-yellow-100 text-yellow-700" },
    questions: [
      { key: "kategori",         label: "Apa kategori bisnis kamu?",                   type: "text", placeholder: "mis. Skincare, kuliner, fashion, jasa..." },
      { key: "audiens",          label: "Siapa target audiens utama?",                 type: "text", placeholder: "mis. Ibu muda 25-35, anak muda 18-25..." },
      { key: "tujuan",           label: "Apa tujuan utama konten kamu?",              type: "text", placeholder: "mis. Awareness brand, direct sale, edukasi..." },
      { key: "produk_unggulan",  label: "Produk apa yang paling ingin dipromosikan?", type: "text", placeholder: "mis. Produk bestseller, produk baru..." },
    ],
  },
];

// ─── Chip selector ─────────────────────────────────────────────────────────────

function ChipGroup({ options, value, onChange, multi = false }) {
  const toggle = (opt) => {
    if (multi) {
      const arr = Array.isArray(value) ? value : [];
      onChange(arr.includes(opt) ? arr.filter((x) => x !== opt) : [...arr, opt]);
    } else {
      onChange(opt === value ? "" : opt);
    }
  };
  const isActive = (opt) =>
    multi ? Array.isArray(value) && value.includes(opt) : value === opt;

  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => (
        <button
          key={opt}
          type="button"
          onClick={() => toggle(opt)}
          className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all btn-touch select-none ${
            isActive(opt)
              ? "bg-brand text-brand-cream border-brand shadow-sm"
              : "bg-white text-stone-600 border-stone-200 hover:border-brand/40 hover:text-brand"
          }`}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}

// ─── Task item (interactive checklist row) ────────────────────────────────────

function TaskItem({ task, index, onToggle }) {
  const ToolIcon = task.tool ? (TOOL_ICON_MAP[task.tool] ?? Sparkle) : null;
  return (
    <div
      className={`flex items-start gap-3 p-4 rounded-xl border transition-all duration-200 ${
        task.completed
          ? "bg-brand/5 border-brand/15"
          : "bg-white border-stone-100 hover:border-brand/20"
      }`}
    >
      <button
        onClick={() => onToggle(task.id)}
        className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center mt-0.5 transition-all duration-200 ${
          task.completed
            ? "bg-brand border-brand scale-100"
            : "border-stone-300 hover:border-brand scale-100"
        }`}
        aria-label={task.completed ? "Tandai belum selesai" : "Tandai selesai"}
      >
        {task.completed && (
          <Check size={12} weight="bold" className="text-brand-gold" />
        )}
      </button>
      <div className="flex-1 min-w-0">
        <p
          className={`text-sm font-medium leading-snug transition-colors ${
            task.completed ? "text-stone-400 line-through" : "text-brand"
          }`}
        >
          {task.text}
        </p>
        <div className="flex items-center gap-3 mt-2 flex-wrap">
          {task.duration && (
            <span className="text-[10px] text-stone-400 flex items-center gap-1">
              ⏱ {task.duration}
            </span>
          )}
          {task.tool_path && (
            <Link
              to={task.tool_path}
              className="inline-flex items-center gap-1.5 text-[10px] font-bold text-brand bg-brand/8 px-2.5 py-1 rounded-full hover:bg-brand hover:text-brand-cream transition-all"
              onClick={(e) => e.stopPropagation()}
            >
              {ToolIcon && <ToolIcon size={11} weight="duotone" />}
              Kerjakan di {task.tool} →
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Loading screen ───────────────────────────────────────────────────────────

function LoadingScreen({ label = "Sedang menganalisis bisnismu..." }) {
  const steps = ["Membaca kondisi bisnis...", "Merumuskan diagnosis...", "Menyusun action plan..."];
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 animate-fade-up">
      <div className="relative">
        <div className="h-20 w-20 rounded-2xl bg-brand flex items-center justify-center shadow-lg shadow-brand/30">
          <Brain size={36} weight="duotone" className="text-brand-gold" />
        </div>
        <div className="absolute -bottom-1 -right-1 h-7 w-7 rounded-full bg-brand-gold flex items-center justify-center">
          <CircleNotch size={16} className="animate-spin text-brand" />
        </div>
      </div>
      <div className="text-center space-y-2">
        <h2 className="font-heading text-xl font-bold text-brand">{label}</h2>
        <p className="text-stone-400 text-sm max-w-xs">Konsultan sedang menyusun strategi yang dipersonalisasi untuk kondisi bisnis kamu</p>
      </div>
      <div className="space-y-2.5 w-full max-w-xs">
        {steps.map((s, i) => (
          <div key={i} className="flex items-center gap-2.5 text-xs text-stone-400">
            <div className={`h-1.5 w-1.5 rounded-full flex-shrink-0 ${i === 0 ? "bg-brand-gold animate-pulse" : "bg-stone-200"}`} />
            {s}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function GrowthConsultantPage() {
  const [view, setView] = useState("home"); // home | questions | followup | loading | result
  const [selectedMode, setSelectedMode] = useState(null);
  const [answers, setAnswers] = useState({});

  // Step 1 → Step 2 data
  const [consultationId, setConsultationId] = useState(null);
  const [followupQuestions, setFollowupQuestions] = useState([]);
  const [detectedChallenge, setDetectedChallenge] = useState("");
  const [followupAnswers, setFollowupAnswers] = useState({});

  // Result data
  const [diagnosis, setDiagnosis] = useState("");
  const [tasks, setTasks] = useState([]);
  const [target, setTarget] = useState("");
  const [quickWin, setQuickWin] = useState("");

  // Home state
  const [activeConsultation, setActiveConsultation] = useState(null);
  const [tierStatus, setTierStatus] = useState(null);
  const [loadingHome, setLoadingHome] = useState(true);

  const [submitting, setSubmitting] = useState(false);
  const resultRef = useRef(null);

  const mode = MODES.find((m) => m.id === selectedMode);

  useEffect(() => {
    Promise.all([
      api.get("/growth-consultant/active"),
      api.get("/growth-consultant/tier"),
    ])
      .then(([activeRes, tierRes]) => {
        setActiveConsultation(activeRes.data || null);
        setTierStatus(tierRes.data || null);
      })
      .catch(() => {})
      .finally(() => setLoadingHome(false));
  }, []);

  // ── Helpers ────────────────────────────────────────────────────────────────

  const scrollTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

  const goHome = () => {
    setView("home");
    setSelectedMode(null);
    setAnswers({});
    setConsultationId(null);
    setFollowupQuestions([]);
    setFollowupAnswers({});
    setDiagnosis(""); setTasks([]); setTarget(""); setQuickWin("");
    scrollTop();
  };

  const enterResult = (data) => {
    setDiagnosis(data.diagnosis || "");
    setTasks(data.tasks || []);
    setTarget(data.target || "");
    setQuickWin(data.quick_win || "");
    setView("result");
    scrollTop();
  };

  const resumeConsultation = () => {
    if (!activeConsultation) return;
    setConsultationId(activeConsultation.id);
    enterResult(activeConsultation);
  };

  const setAnswer = (key, val) => setAnswers((a) => ({ ...a, [key]: val }));

  // Completion stats
  const answeredCount = mode
    ? mode.questions.filter((q) => {
        const val = answers[q.key];
        return q.type === "multi-chips"
          ? Array.isArray(val) && val.length > 0
          : typeof val === "string" && val.trim().length > 0;
      }).length
    : 0;
  const isReady = mode ? answeredCount === mode.questions.length : false;

  // Follow-up completion
  const allFollowupsAnswered = followupQuestions.every(
    (q) => (followupAnswers[q.id] || "").trim().length > 0
  );

  // ── Step 1: Submit initial answers → get follow-up questions ──────────────

  const handleStartConsultation = async () => {
    if (!isReady) { toast.error("Isi semua pertanyaan dulu ya"); return; }
    setSubmitting(true);
    setView("loading");
    scrollTop();
    try {
      const { data } = await api.post("/growth-consultant/start", {
        category: selectedMode,
        answers,
      });
      setConsultationId(data.consultation_id);
      setFollowupQuestions(data.followup_questions || []);
      setDetectedChallenge(data.detected_challenge || "");
      setView("followup");
      scrollTop();
    } catch (err) {
      const status = err?.response?.status;
      if (status === 402) {
        toast.error(
          <span className="text-sm">
            Konsultasi gratis sudah habis.{" "}
            <a href="/credits" className="underline font-bold">Top Up kredit →</a>
          </span>
        );
      } else {
        toast.error(err?.response?.data?.detail || "Gagal memulai konsultasi. Coba lagi.");
      }
      setView("questions");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Step 2: Submit follow-up answers → get action plan ────────────────────

  const handleCompleteConsultation = async () => {
    if (!allFollowupsAnswered) { toast.error("Jawab semua pertanyaan follow-up dulu ya"); return; }
    setSubmitting(true);
    setView("loading");
    scrollTop();
    try {
      const { data } = await api.post("/growth-consultant/complete", {
        consultation_id: consultationId,
        followup_answers: followupAnswers,
      });
      // Refresh active consultation for next time
      setActiveConsultation({
        id: data.consultation_id,
        category_name: mode?.title || "",
        diagnosis: data.diagnosis,
        tasks: data.tasks,
        target: data.target,
        quick_win: data.quick_win,
      });
      enterResult(data);
    } catch (err) {
      const status = err?.response?.status;
      if (status === 402) toast.error("Kredit tidak cukup.");
      else toast.error(err?.response?.data?.detail || "Gagal membuat action plan. Coba lagi.");
      setView("followup");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Task toggle (optimistic) ──────────────────────────────────────────────

  const toggleTask = async (taskId) => {
    // Optimistic update
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, completed: !t.completed } : t))
    );
    // Also update activeConsultation so resume is accurate
    setActiveConsultation((prev) =>
      prev
        ? {
            ...prev,
            tasks: (prev.tasks || []).map((t) =>
              t.id === taskId ? { ...t, completed: !t.completed } : t
            ),
          }
        : prev
    );
    try {
      await api.patch(`/growth-consultant/tasks/${taskId}`);
    } catch {
      // Revert on error
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, completed: !t.completed } : t))
      );
      toast.error("Gagal menyimpan. Coba lagi.");
    }
  };

  // ── Progress ──────────────────────────────────────────────────────────────

  const completedCount = tasks.filter((t) => t.completed).length;
  const progressPct = tasks.length > 0 ? (completedCount / tasks.length) * 100 : 0;

  // ─────────────────────────────────────────────────────────────────────────
  // VIEWS
  // ─────────────────────────────────────────────────────────────────────────

  // ── Loading ────────────────────────────────────────────────────────────────
  if (view === "loading") return <LoadingScreen />;

  // ── Home ───────────────────────────────────────────────────────────────────
  if (view === "home") {
    const ac = activeConsultation;
    const acCompleted = ac ? (ac.tasks || []).filter((t) => t.completed).length : 0;
    const acTotal     = ac ? (ac.tasks || []).length : 0;

    return (
      <div className="space-y-8 animate-fade-up" data-testid="growth-consultant-page">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Brain size={20} weight="duotone" className="text-brand-gold" />
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand-gold bg-brand-gold/10 px-2.5 py-1 rounded-full border border-brand-gold/20">
              AI Business Coach
            </span>
          </div>
          <h1 className="font-heading text-3xl sm:text-4xl font-bold text-brand tracking-tight">
            Growth Consultant
          </h1>
          <p className="text-stone-500 mt-2 max-w-xl text-sm leading-relaxed">
            Bukan saran generik — konsultasi nyata dengan action plan 7 hari yang bisa langsung kamu kerjakan.
          </p>
          {tierStatus && (
            <div className="mt-3">
              {tierStatus.is_free ? (
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-full">
                  <CheckCircle size={12} weight="fill" />
                  Konsultasi gratis: {tierStatus.free_remaining}/3 tersisa
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-full">
                  <Sparkle size={12} weight="fill" />
                  1 kredit per konsultasi
                </span>
              )}
            </div>
          )}
        </div>

        {/* Resume banner */}
        {!loadingHome && ac && acTotal > 0 && (
          <div className="feedify-card p-5 border-l-4 border-brand-gold">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex-1 min-w-0">
                <div className="text-[10px] uppercase tracking-[0.2em] text-brand-gold font-bold mb-1">Action Plan Terakhir</div>
                <div className="font-heading font-bold text-brand text-base leading-tight truncate">{ac.category_name || "Konsultasi"}</div>
                <div className="mt-2">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="flex-1 h-1.5 bg-brand-sand rounded-full overflow-hidden">
                      <div
                        className="h-full bg-brand rounded-full transition-all duration-500"
                        style={{ width: `${acTotal > 0 ? (acCompleted / acTotal) * 100 : 0}%` }}
                      />
                    </div>
                    <span className="text-xs font-bold text-brand whitespace-nowrap">{acCompleted}/{acTotal} selesai</span>
                  </div>
                </div>
              </div>
              <button
                onClick={resumeConsultation}
                className="flex-shrink-0 px-5 py-2.5 bg-brand text-brand-cream rounded-full font-bold text-sm hover:bg-brand-light btn-lift"
              >
                Lanjutkan →
              </button>
            </div>
          </div>
        )}

        {/* Mode grid */}
        <div>
          <div className="text-[10px] uppercase tracking-[0.2em] text-stone-400 font-bold mb-4">Pilih topik konsultasi</div>
          <div className="grid sm:grid-cols-2 gap-4">
            {MODES.map((m) => (
              <button
                key={m.id}
                type="button"
                data-testid={`mode-${m.id}`}
                onClick={() => { setSelectedMode(m.id); setAnswers({}); setView("questions"); scrollTop(); }}
                className={`group text-left p-5 rounded-2xl border-2 bg-white hover:shadow-md transition-all btn-touch ${m.color.ring} hover:border-brand/40`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className={`h-11 w-11 rounded-xl ${m.color.bg} flex items-center justify-center flex-shrink-0`}>
                    <m.Icon size={22} weight="duotone" className={m.color.icon} />
                  </div>
                  <ArrowRight size={16} className="text-stone-300 group-hover:text-brand group-hover:translate-x-0.5 transition-all mt-1" />
                </div>
                <div className="font-heading font-bold text-brand text-base">{m.title}</div>
                <div className="text-xs text-stone-400 mt-1 leading-snug">{m.desc}</div>
                <div className="mt-3">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${m.color.badge}`}>
                    {m.questions.length} pertanyaan
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── Questions ───────────────────────────────────────────────────────────────
  if (view === "questions") {
    return (
      <div className="max-w-2xl mx-auto space-y-6 animate-fade-up" data-testid="questions-view">
        <button onClick={goHome} className="flex items-center gap-2 text-sm text-stone-500 hover:text-brand transition-colors font-medium">
          <ArrowLeft size={16} /> Kembali
        </button>

        <div>
          <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold ${mode.color.badge} mb-3`}>
            <mode.Icon size={13} weight="fill" /> {mode.title}
          </div>
          <h2 className="font-heading text-2xl font-bold text-brand">Quick Diagnosis</h2>
          <p className="text-stone-400 text-sm mt-1">
            Jawab {mode.questions.length} pertanyaan agar konsultasi bisa dipersonalisasi untuk bisnismu.
          </p>
        </div>

        {/* Progress */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-1.5 bg-stone-100 rounded-full overflow-hidden">
            <div className="h-full bg-brand rounded-full transition-all duration-300" style={{ width: `${(answeredCount / mode.questions.length) * 100}%` }} />
          </div>
          <span className="text-xs font-semibold text-brand whitespace-nowrap">{answeredCount}/{mode.questions.length} dijawab</span>
        </div>

        {/* Questions */}
        <div className="space-y-4">
          {mode.questions.map((q, i) => {
            const val = answers[q.key];
            const answered = q.type === "multi-chips"
              ? Array.isArray(val) && val.length > 0
              : typeof val === "string" && val.trim().length > 0;
            return (
              <div key={q.key} className={`feedify-card p-5 space-y-3 transition-all ${answered ? "border-brand/30" : ""}`}>
                <div className="flex items-center gap-2">
                  <span className={`h-5 w-5 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${answered ? "bg-brand" : "bg-stone-100"}`}>
                    {answered
                      ? <Check size={11} weight="bold" className="text-brand-gold" />
                      : <span className="text-[10px] font-black text-stone-400">{i + 1}</span>
                    }
                  </span>
                  <label className="text-sm font-semibold text-brand">
                    {q.label}
                    {q.type === "multi-chips" && <span className="text-stone-400 font-normal ml-1">(pilih semua yang sesuai)</span>}
                  </label>
                </div>
                {q.type === "text" ? (
                  <input
                    type="text"
                    className="input text-sm w-full"
                    placeholder={q.placeholder}
                    value={answers[q.key] || ""}
                    onChange={(e) => setAnswer(q.key, e.target.value)}
                    data-testid={`question-${i}`}
                  />
                ) : (
                  <ChipGroup
                    options={q.options}
                    value={answers[q.key] || (q.type === "multi-chips" ? [] : "")}
                    onChange={(val) => setAnswer(q.key, val)}
                    multi={q.type === "multi-chips"}
                  />
                )}
              </div>
            );
          })}
        </div>

        <button
          type="button"
          onClick={handleStartConsultation}
          disabled={!isReady || submitting}
          data-testid="start-consultation-btn"
          className="w-full py-4 bg-brand text-brand-cream rounded-full font-heading font-bold text-base flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-brand/20 hover:bg-brand-light btn-lift transition-all"
        >
          {submitting ? <CircleNotch size={18} className="animate-spin" /> : <Sparkle size={18} weight="fill" />}
          {submitting ? "Memproses..." : "Lanjut ke Follow-up →"}
        </button>
        {!isReady && (
          <p className="text-center text-xs text-stone-400">{mode.questions.length - answeredCount} pertanyaan belum dijawab</p>
        )}
      </div>
    );
  }

  // ── Follow-up ───────────────────────────────────────────────────────────────
  if (view === "followup") {
    return (
      <div className="max-w-2xl mx-auto space-y-6 animate-fade-up" data-testid="followup-view">
        <button onClick={() => setView("questions")} className="flex items-center gap-2 text-sm text-stone-500 hover:text-brand transition-colors font-medium">
          <ArrowLeft size={16} /> Kembali ke pertanyaan awal
        </button>

        {/* Detected challenge pill */}
        <div>
          <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold ${mode.color.badge} mb-3`}>
            <mode.Icon size={13} weight="fill" /> {mode.title}
          </div>
          <h2 className="font-heading text-2xl font-bold text-brand">Sedikit lagi...</h2>
          <p className="text-stone-400 text-sm mt-1">
            Konsultan perlu 1-2 detail tambahan sebelum menyusun action plan untuk kamu.
          </p>
        </div>

        {detectedChallenge && (
          <div className="flex items-center gap-3 px-4 py-3 bg-brand-gold/10 border border-brand-gold/30 rounded-xl">
            <Lightbulb size={16} weight="duotone" className="text-brand-gold flex-shrink-0" />
            <p className="text-sm text-brand leading-snug">
              Tantangan utama yang terdeteksi: <strong>{detectedChallenge}</strong>
            </p>
          </div>
        )}

        {/* Follow-up question cards */}
        <div className="space-y-4">
          {followupQuestions.map((fq, i) => {
            const answered = (followupAnswers[fq.id] || "").trim().length > 0;
            return (
              <div key={fq.id} className={`feedify-card p-5 space-y-3 transition-all ${answered ? "border-brand/30" : ""}`}>
                <div className="flex items-center gap-2">
                  <span className={`h-5 w-5 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${answered ? "bg-brand" : "bg-stone-100"}`}>
                    {answered
                      ? <Check size={11} weight="bold" className="text-brand-gold" />
                      : <span className="text-[10px] font-black text-stone-400">{i + 1}</span>
                    }
                  </span>
                  <label className="text-sm font-semibold text-brand">{fq.question}</label>
                </div>
                <textarea
                  rows={3}
                  className="input text-sm w-full resize-none"
                  placeholder="Jawab sejujurnya — semakin spesifik, semakin tajam action plan-nya"
                  value={followupAnswers[fq.id] || ""}
                  onChange={(e) => setFollowupAnswers((prev) => ({ ...prev, [fq.id]: e.target.value }))}
                  data-testid={`followup-${i}`}
                />
              </div>
            );
          })}
        </div>

        <button
          type="button"
          onClick={handleCompleteConsultation}
          disabled={!allFollowupsAnswered || submitting}
          data-testid="complete-consultation-btn"
          className="w-full py-4 bg-brand text-brand-cream rounded-full font-heading font-bold text-base flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-brand/20 hover:bg-brand-light btn-lift transition-all"
        >
          {submitting ? <CircleNotch size={18} className="animate-spin" /> : <RocketLaunch size={18} weight="fill" />}
          {submitting ? "Menyusun action plan..." : "Buat Action Plan →"}
        </button>
        <p className="text-center text-xs text-stone-400">
          {tierStatus?.is_free ? "✨ Konsultasi ini gratis" : "Konsultasi ini menggunakan 1 kredit"}
        </p>
      </div>
    );
  }

  // ── Result ──────────────────────────────────────────────────────────────────
  if (view === "result") {
    return (
      <div className="max-w-2xl mx-auto space-y-5 animate-fade-up" data-testid="result-view" ref={resultRef}>
        {/* Nav */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <button onClick={goHome} className="flex items-center gap-2 text-sm text-stone-500 hover:text-brand transition-colors font-medium">
            <ArrowLeft size={16} /> Konsultasi Baru
          </button>
          {mode && (
            <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold ${mode.color.badge}`}>
              <mode.Icon size={13} weight="fill" /> {mode.title}
            </div>
          )}
        </div>

        {/* Diagnosis */}
        {diagnosis && (
          <div className="feedify-card p-5 border-l-4 border-brand-gold">
            <div className="flex items-center gap-2 mb-3">
              <Lightbulb size={14} weight="duotone" className="text-brand-gold" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-brand-light">🎯 Diagnosis</span>
            </div>
            <p className="text-sm text-stone-700 leading-relaxed">{diagnosis}</p>
          </div>
        )}

        {/* Action Plan checklist */}
        {tasks.length > 0 && (
          <div className="feedify-card p-5">
            {/* Header + progress bar */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <CheckCircle size={16} weight="duotone" className="text-brand-gold" />
                <h3 className="font-heading font-bold text-brand text-sm">📋 Action Plan (7 Hari ke Depan)</h3>
              </div>
              <span className="text-xs font-bold text-brand">{completedCount}/{tasks.length} selesai</span>
            </div>
            <div className="h-1.5 bg-brand-sand rounded-full overflow-hidden mb-5">
              <div
                className="h-full bg-brand rounded-full transition-all duration-500"
                style={{ width: `${progressPct}%` }}
              />
            </div>

            {/* Tasks */}
            <div className="space-y-2.5">
              {tasks.map((task, i) => (
                <TaskItem key={task.id} task={task} index={i} onToggle={toggleTask} />
              ))}
            </div>
          </div>
        )}

        {/* Target */}
        {target && (
          <div className="feedify-card p-5">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm">📈</span>
              <h3 className="font-heading font-bold text-brand text-sm">Target Realistis</h3>
            </div>
            <p className="text-sm text-stone-600 leading-relaxed">{target}</p>
          </div>
        )}

        {/* Quick win highlight */}
        {quickWin && (
          <div className="feedify-card p-5 bg-brand text-brand-cream">
            <div className="flex items-start gap-3">
              <div className="text-xl flex-shrink-0">⚡</div>
              <div>
                <div className="text-[10px] uppercase tracking-[0.2em] text-brand-cream/60 font-bold mb-1">Mulai Sekarang</div>
                <p className="text-sm font-semibold text-brand-cream leading-snug">{quickWin}</p>
              </div>
            </div>
          </div>
        )}

        {/* Bottom actions */}
        <div className="flex gap-3 pt-1">
          <button
            onClick={goHome}
            className="flex-1 py-3 border-2 border-stone-200 text-stone-600 rounded-full font-bold text-sm hover:border-brand hover:text-brand transition-colors"
          >
            Konsultasi Baru
          </button>
          <Link
            to="/generate/banner"
            className="flex-1 py-3 bg-brand text-brand-cream rounded-full font-bold text-sm hover:bg-brand-light transition-colors flex items-center justify-center gap-2"
          >
            <Sparkle size={15} weight="fill" /> Mulai Eksekusi
          </Link>
        </div>
      </div>
    );
  }

  return null;
}
