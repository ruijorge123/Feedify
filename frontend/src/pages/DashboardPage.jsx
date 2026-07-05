import { useEffect, useState, useRef, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { useCredits } from "@/lib/credits";
import { toast } from "react-toastify";
import {
  ImageSquare, Sparkle, Palette, Lightning,
  ArrowRight, ArrowClockwise, Camera, FilmSlate,
  Stack, PenNib, Storefront, CaretDown, CaretUp,
} from "@phosphor-icons/react";

// ── Pure helpers ───────────────────────────────────────────────────────────────

function getTimeGreeting() {
  const h = new Date().getHours();
  if (h >= 5  && h < 11) return "Selamat pagi";
  if (h >= 11 && h < 14) return "Selamat siang";
  if (h >= 14 && h < 18) return "Selamat sore";
  return "Selamat malam";
}

function getSubtitle(h) {
  if (h >= 5  && h < 11) return "siap tampil beda hari ini? ☀️";
  if (h >= 11 && h < 14) return "yuk tambah satu konten produktif!";
  if (h >= 14 && h < 18) return "konsisten sore ini = brand authority besok.";
  return "masih semangat? satu konten lagi boleh! 🌙";
}

function computeHealth(brand, stats, recent) {
  const visual =
    10 +
    (brand?.visual_style ? 22 : 0) +
    (brand?.brand_personality?.length > 0 ? 22 : 0) +
    (brand?.color_primary ? 22 : 0) +
    (brand?.target_audience ? 14 : 0) +
    (brand?.brand_donts?.length > 0 ? 10 : 0);
  const types = [stats?.banner, stats?.carousel, stats?.copywriting, stats?.marketplace].filter(Boolean).length;
  const diversity = Math.min(types * 25, 100);
  let momentum = 20;
  if (recent?.length > 0) {
    const days = (Date.now() - new Date(recent[0].created_at)) / 86400000;
    momentum = days < 1 ? 95 : days < 3 ? 82 : days < 7 ? 66 : days < 14 ? 50 : 35;
  }
  const mkt = stats?.marketplace > 0 ? Math.min(50 + stats.marketplace * 12, 92) : 28;
  const score = Math.min(Math.round(visual * 0.3 + diversity * 0.3 + momentum * 0.25 + mkt * 0.15), 99);
  return {
    score,
    breakdown: {
      "Visual Consistency":    Math.min(visual, 100),
      "Content Diversity":     diversity,
      "Posting Momentum":      momentum,
      "Marketplace Readiness": mkt,
    },
  };
}

function healthMeta(s) {
  if (s >= 80) return { label: "Brand Kuat",  emoji: "🔥", color: "#0B3D2E" };
  if (s >= 60) return { label: "Berkembang",  emoji: "📈", color: "#1A5F4A" };
  if (s >= 40) return { label: "Baru Mulai",  emoji: "🌱", color: "#E5C158" };
  return              { label: "Mari Mulai",  emoji: "🌱", color: "#C28E6E" };
}

function barColor(v) {
  if (v >= 70) return "#0B3D2E";
  if (v >= 40) return "#E5C158";
  return "#D45F3C";
}

function computeStreak(prompts) {
  if (!prompts?.length) return { streak: 0, todayActive: false };
  const today = new Date(); today.setHours(0,0,0,0);
  const days = new Set(prompts.map(p => { const d = new Date(p.created_at); d.setHours(0,0,0,0); return d.getTime(); }));
  const todayActive = days.has(today.getTime());
  let streak = 0, day = today.getTime();
  while (days.has(day)) { streak++; day -= 86400000; }
  if (streak === 0) { day = today.getTime() - 86400000; while (days.has(day)) { streak++; day -= 86400000; } }
  return { streak, todayActive };
}

const BREAKDOWN_HINTS = {
  "Visual Consistency":    { text: "Lengkapi Brand DNA",       to: "/settings" },
  "Content Diversity":     { text: "Coba format Carousel",     to: "/generate/carousel" },
  "Posting Momentum":      { text: "Generate konten hari ini", to: "/generate/banner" },
  "Marketplace Readiness": { text: "Bikin foto marketplace",   to: "/generate/marketplace" },
};

// ── Count-up animation hook ────────────────────────────────────────────────────

function useCountUp(target, duration = 1200, delay = 0) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!target) { setVal(0); return; }
    let raf, t0 = null;
    const run = (ts) => {
      if (!t0) t0 = ts;
      const el = ts - t0 - delay;
      if (el < 0) { raf = requestAnimationFrame(run); return; }
      const p = Math.min(el / duration, 1);
      setVal(Math.round((1 - Math.pow(1 - p, 3)) * target));
      if (p < 1) raf = requestAnimationFrame(run);
    };
    raf = requestAnimationFrame(run);
    return () => cancelAnimationFrame(raf);
  }, [target, duration, delay]);
  return val;
}

// ── Animated ring (for expanded brand pulse) ───────────────────────────────────

function HealthRingExpanded({ score }) {
  const r = 44, sw = 9, circ = 2 * Math.PI * r;
  const display = useCountUp(score, 1400);
  const { color } = healthMeta(score);
  return (
    <div className="relative flex items-center justify-center flex-shrink-0" style={{ width: 112, height: 112 }}>
      <svg width="112" height="112" viewBox="0 0 112 112" style={{ transform: "rotate(-90deg)" }}>
        <circle cx="56" cy="56" r={r} fill="none" stroke="#E5ECE7" strokeWidth={sw} />
        <circle cx="56" cy="56" r={r} fill="none" stroke={color} strokeWidth={sw}
          strokeDasharray={circ} strokeDashoffset={circ - (display / 100) * circ} strokeLinecap="round" />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="font-heading font-black text-2xl leading-none tabular-nums" style={{ color }}>{display}</div>
        <div className="text-[9px] text-stone-400 font-semibold mt-0.5">Score</div>
      </div>
    </div>
  );
}

// ── Animated metric bar ────────────────────────────────────────────────────────

function AnimBar({ label, value, delay = 0 }) {
  const [filled, setFilled] = useState(false);
  useEffect(() => { const t = setTimeout(() => setFilled(true), delay + 200); return () => clearTimeout(t); }, [delay]);
  const color = barColor(value);
  const hint = value < 70 ? BREAKDOWN_HINTS[label] : null;
  return (
    <div>
      <div className="flex justify-between mb-1">
        <span className="text-[11px] text-stone-500 font-medium">{label}</span>
        <span className="text-[11px] font-bold tabular-nums" style={{ color }}>{value}%</span>
      </div>
      <div className="h-1 bg-stone-100 rounded-full overflow-hidden">
        <div className="h-full rounded-full" style={{ width: filled ? `${value}%` : "0%", background: color, transition: "width 0.9s cubic-bezier(0.25,0.46,0.45,0.94)" }} />
      </div>
      {hint && (
        <Link to={hint.to} className="mt-0.5 inline-flex items-center gap-0.5 text-[10px] font-semibold text-stone-400 hover:text-brand transition-colors">
          → {hint.text}
        </Link>
      )}
    </div>
  );
}

// ── Brand Pulse pill (collapsible) ─────────────────────────────────────────────

function BrandPulsePill({ health, expanded, onToggle }) {
  const { label, emoji, color } = healthMeta(health.score);
  return (
    <div>
      <button
        onClick={onToggle}
        data-testid="brand-pulse-pill"
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-bold transition-all hover:brightness-105"
        style={{ borderColor: color + "45", background: color + "12", color }}
      >
        <span>{emoji}</span>
        Brand Score: {health.score}
        <span className="text-[9px] opacity-60 ml-0.5">{label}</span>
        {expanded ? <CaretUp size={10} /> : <CaretDown size={10} />}
      </button>

      {expanded && (
        <div className="mt-3 p-4 rounded-2xl bg-white border border-stone-100 shadow-sm animate-fade-up">
          <div className="flex items-start gap-5">
            <HealthRingExpanded score={health.score} />
            <div className="flex-1 space-y-3 min-w-0">
              {Object.entries(health.breakdown).map(([label, val], i) => (
                <AnimBar key={label} label={label} value={val} delay={i * 100} />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Daily Recommendation Card ──────────────────────────────────────────────────

function RecommendationCard({ rec, loading, onRefresh }) {
  const navigate = useNavigate();
  return (
    <div
      className="rounded-2xl border border-brand/15 bg-gradient-to-br from-white to-brand-sand/30 p-6 shadow-sm animate-fade-up"
      style={{ animationDelay: "120ms" }}
      data-testid="daily-recommendation"
    >
      <div className="flex items-center gap-2 mb-3">
        <div className="w-7 h-7 rounded-xl bg-brand-gold/20 flex items-center justify-center flex-shrink-0">
          <Sparkle size={14} weight="fill" className="text-brand-gold" />
        </div>
        <div className="text-[10px] uppercase tracking-[0.2em] font-bold text-brand-light">
          Rekomendasi hari ini
        </div>
      </div>

      {/* Recommendation text */}
      <div className="min-h-[60px] mb-5">
        {loading ? (
          <div className="space-y-2 pt-1">
            <div className="h-3.5 bg-stone-100 rounded-full animate-pulse w-full" />
            <div className="h-3.5 bg-stone-100 rounded-full animate-pulse w-5/6" />
            <div className="h-3.5 bg-stone-100 rounded-full animate-pulse w-3/5" />
          </div>
        ) : rec?.recommendation ? (
          <p className="text-sm text-stone-700 leading-relaxed animate-fade-up">
            {rec.recommendation}
          </p>
        ) : (
          <p className="text-sm text-stone-400 italic">
            Tidak bisa memuat rekomendasi saat ini.
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => rec?.action_route && navigate(rec.action_route)}
          disabled={loading || !rec}
          className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-brand text-brand-cream rounded-full font-bold text-sm hover:bg-brand-light btn-lift shadow-sm shadow-brand/20 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          data-testid="rec-action-btn"
        >
          <Sparkle size={14} weight="fill" /> Bikin Sekarang
        </button>
        <button
          onClick={onRefresh}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full border-2 border-stone-200 text-stone-500 text-sm font-semibold hover:border-brand hover:text-brand transition-all disabled:opacity-40"
          data-testid="rec-refresh-btn"
        >
          <ArrowClockwise size={14} className={loading ? "animate-spin" : ""} /> Ide Lain
        </button>
      </div>
    </div>
  );
}

// ── Action tiles ───────────────────────────────────────────────────────────────

const ACTION_TILES = [
  {
    emoji:    "📸",
    label:    "Foto Produk",
    sub:      "Feed & banner premium",
    to:       "/generate/banner",
    gradient: "from-[#0B3D2E] to-[#1E6B50]",
    textDark: false,
    Icon:     Camera,
  },
  {
    emoji:    "🎬",
    label:    "Video Reels",
    sub:      "Iklan produk otomatis",
    to:       "/generate/reels",
    gradient: "from-[#1A1614] to-[#3D3020]",
    textDark: false,
    Icon:     FilmSlate,
  },
  {
    emoji:    "📊",
    label:    "Carousel",
    sub:      "Multi-slide storytelling",
    to:       "/generate/carousel",
    gradient: "from-[#B8860B] to-[#E5C158]",
    textDark: true,
    Icon:     Stack,
  },
  {
    emoji:    "✍️",
    label:    "Caption",
    sub:      "Copy yang mengkonversi",
    to:       "/generate/copywriting",
    gradient: "from-[#6B3A2A] to-[#C17B3C]",
    textDark: false,
    Icon:     PenNib,
  },
  {
    emoji:    "🛒",
    label:    "Marketplace",
    sub:      "Foto listing Shopee/Tokped",
    to:       "/generate/marketplace",
    gradient: "from-[#2D4A3E] to-[#557A66]",
    textDark: false,
    Icon:     Storefront,
  },
];

function ActionTile({ emoji, label, sub, to, gradient, textDark, Icon }) {
  const textBase  = textDark ? "text-[#0B3D2E]"     : "text-white";
  const textMuted = textDark ? "text-[#0B3D2E]/65"  : "text-white/65";
  const arrowCls  = textDark ? "text-[#0B3D2E]/50"  : "text-white/50";

  return (
    <Link
      to={to}
      className={`group flex-shrink-0 flex flex-col bg-gradient-to-br ${gradient} rounded-2xl p-5
        hover:shadow-xl hover:-translate-y-1 hover:brightness-110
        transition-all duration-300 cursor-pointer
        w-[160px] sm:w-auto sm:flex-1`}
      style={{ minHeight: 180 }}
    >
      <div className="text-3xl mb-3 group-hover:scale-110 transition-transform duration-200">
        {emoji}
      </div>
      <div className={`font-heading font-bold text-base leading-tight mb-1 ${textBase}`}>
        {label}
      </div>
      <div className={`text-[11px] leading-snug flex-1 ${textMuted}`}>
        {sub}
      </div>
      <div className={`mt-4 flex items-center gap-1 text-[11px] font-bold group-hover:gap-2 transition-all duration-200 ${arrowCls}`}>
        Buat <ArrowRight size={11} />
      </div>
    </Link>
  );
}

function ActionTiles() {
  return (
    <div className="animate-fade-up" style={{ animationDelay: "200ms" }}>
      <div className="text-[10px] uppercase tracking-[0.22em] text-stone-400 font-bold mb-4">
        Apa yang mau kamu bikin hari ini?
      </div>
      {/* Horizontal scroll on mobile, flex row on desktop */}
      <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 sm:overflow-visible sm:grid sm:grid-cols-5">
        {ACTION_TILES.map(tile => <ActionTile key={tile.to} {...tile} />)}
      </div>
    </div>
  );
}

// ── Continue strip ─────────────────────────────────────────────────────────────

const TYPE_LABEL = {
  banner: "Feed", carousel: "Carousel",
  copywriting: "Copy", marketplace: "Mkt",
  studio: "Studio", reels: "Reels",
};

function ContinueStrip({ recent }) {
  const stripRef = useRef(null);
  return (
    <div className="animate-fade-up" style={{ animationDelay: "280ms" }}>
      <div className="flex items-center justify-between mb-3">
        <div className="text-[10px] uppercase tracking-[0.22em] text-stone-400 font-bold">
          Lanjutkan kerjamu
        </div>
        <Link to="/history" className="text-xs font-semibold text-brand hover:underline" data-testid="see-all-history">
          Lihat semua →
        </Link>
      </div>

      <div
        ref={stripRef}
        className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-hide"
      >
        {recent.map(item => {
          const thumb = item.image_base64 || (item.slide_images?.[0]);
          return (
            <Link
              key={item.id}
              to="/history"
              className="group flex-shrink-0 relative overflow-hidden rounded-xl border border-stone-100 hover:border-brand/20 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300"
              style={{ width: 88, height: 88 }}
              data-testid={`recent-${item.id}`}
            >
              {thumb ? (
                <img
                  src={`data:image/png;base64,${thumb}`}
                  alt=""
                  className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
              ) : (
                <div className="h-full w-full bg-brand-sand/50 flex items-center justify-center">
                  <ImageSquare size={20} weight="duotone" className="text-brand-light/30" />
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-brand/60 via-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded-full bg-white/90 text-[8px] uppercase tracking-wider font-bold text-brand">
                {TYPE_LABEL[item.dashboard_type] ?? item.dashboard_type}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { user }    = useAuth();
  const { credits } = useCredits();
  const navigate    = useNavigate();

  const [stats,         setStats]         = useState(null);
  const [recent,        setRecent]        = useState([]);
  const [brand,         setBrand]         = useState(null);
  const [streakData,    setStreakData]    = useState({ streak: 0, todayActive: false });
  const [dailyRec,      setDailyRec]     = useState(null);
  const [recLoading,    setRecLoading]   = useState(true);
  const [pulseExpanded, setPulseExpanded]= useState(false);

  useEffect(() => {
    api.get("/stats").then(r => setStats(r.data)).catch(() => setStats({}));
    api.get("/prompts").then(r => {
      setRecent(r.data.slice(0, 8));
      setStreakData(computeStreak(r.data));
    }).catch(() => {});
    api.get("/brand-profile").then(r => setBrand(r.data)).catch(() => {});

    setRecLoading(true);
    api.get("/dashboard/daily-recommendation")
      .then(r => setDailyRec(r.data))
      .catch(() => setDailyRec(null))
      .finally(() => setRecLoading(false));
  }, []);

  const handleRefreshRec = useCallback(async () => {
    setRecLoading(true);
    try {
      const { data } = await api.get("/dashboard/daily-recommendation?force=true");
      setDailyRec(data);
    } catch {
      toast.error("Gagal refresh rekomendasi. Coba lagi.");
    } finally {
      setRecLoading(false);
    }
  }, []);

  const health   = computeHealth(brand, stats, recent);
  const balance  = credits?.balance ?? credits?.credits_remaining ?? null;
  const { color: scoreColor, emoji: scoreEmoji } = healthMeta(health.score);
  const brandName = brand?.brand_name || user?.name?.split(" ")[0] || "Brand Kamu";
  const h         = new Date().getHours();
  const greeting  = getTimeGreeting();
  const subtitle  = getSubtitle(h);

  return (
    <div className="space-y-7 pb-14" data-testid="dashboard-page">

      {/* ── GREETING HERO ────────────────────────────────────────────────────── */}
      <div className="animate-fade-up">
        {/* Main greeting */}
        <div className="mb-5">
          <div className="text-sm text-stone-400 font-medium mb-1">{greeting}</div>
          <h1 className="font-heading font-black text-brand tracking-tight leading-none" style={{ fontSize: "clamp(2rem, 5vw, 3.25rem)" }}>
            {brandName} <span className="inline-block">👋</span>
          </h1>
          <p className="text-stone-500 mt-2 text-base font-medium leading-snug">
            {subtitle}
          </p>
        </div>

        {/* Micro indicator row */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Streak */}
          {streakData.streak > 0 && (
            <div
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-orange-50 border border-orange-200 text-xs font-bold text-orange-700 ${streakData.todayActive ? "" : "opacity-60"}`}
            >
              <span style={streakData.todayActive ? { animation: "glow-pulse 2s ease-in-out infinite" } : {}}>🔥</span>
              {streakData.streak} hari
            </div>
          )}

          {/* Credits */}
          {balance !== null && (
            balance === 0 ? (
              <Link
                to="/credits"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-50 border border-amber-200 text-xs font-bold text-amber-700 hover:bg-amber-100 transition-colors"
              >
                <Lightning size={12} weight="fill" className="text-amber-500" /> Top Up Kredit
              </Link>
            ) : (
              <div
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-bold ${balance <= 5 ? "bg-brand-gold/15 border-brand-gold/40 text-brand" : "bg-brand/8 border-brand/15 text-brand"}`}
              >
                <Lightning size={12} weight="fill" className="text-brand-gold" />
                {balance} kredit
              </div>
            )
          )}

          {/* Brand Pulse pill */}
          <BrandPulsePill
            health={health}
            expanded={pulseExpanded}
            onToggle={() => setPulseExpanded(v => !v)}
          />
        </div>

        {/* Expanded brand pulse (below micro row) */}
        {pulseExpanded && (
          <div className="mt-3 p-5 rounded-2xl bg-white border border-stone-100 shadow-sm animate-fade-up">
            <div className="text-[10px] uppercase tracking-[0.2em] font-bold text-brand-light mb-4">Brand Health Detail</div>
            <div className="flex items-start gap-6">
              <HealthRingExpanded score={health.score} />
              <div className="flex-1 space-y-3.5 min-w-0">
                {Object.entries(health.breakdown).map(([lbl, val], i) => (
                  <AnimBar key={lbl} label={lbl} value={val} delay={i * 100} />
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── DAILY AI RECOMMENDATION ──────────────────────────────────────────── */}
      <RecommendationCard
        rec={dailyRec}
        loading={recLoading}
        onRefresh={handleRefreshRec}
      />

      {/* ── ACTION TILES ─────────────────────────────────────────────────────── */}
      <ActionTiles />

      {/* ── CONTINUE STRIP (only if has projects) ────────────────────────────── */}
      {recent.length > 0 && <ContinueStrip recent={recent} />}

    </div>
  );
}
