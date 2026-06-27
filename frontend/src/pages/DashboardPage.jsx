import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { useCredits } from "@/lib/credits";
import {
  ImageSquare,
  Stack,
  PenNib,
  ClockCounterClockwise,
  ArrowRight,
  TrendUp,
  Sparkle,
  Palette,
  ForkKnife,
  GridFour,
  ShieldCheck,
  CalendarBlank,
  Lightning,
} from "@phosphor-icons/react";

export default function DashboardPage() {
  const { user } = useAuth();
  const { credits } = useCredits();
  const [stats, setStats] = useState({ total: 0, banner: 0, carousel: 0, copywriting: 0 });
  const [recent, setRecent] = useState([]);
  const [brand, setBrand] = useState(null);
  const [recommendation, setRecommendation] = useState(null);

  useEffect(() => {
    api.get("/stats").then(({ data }) => setStats(data)).catch(() => {});
    api.get("/prompts").then(({ data }) => setRecent(data.slice(0, 5))).catch(() => {});
    api.get("/brand-profile").then(({ data }) => setBrand(data)).catch(() => {});
    api.get("/content-recommendation").then(({ data }) => setRecommendation(data)).catch(() => {});
  }, []);

  const goalToDashboard = {
    launch: "/generate/banner",
    promo: "/generate/banner",
    testimonial: "/generate/carousel",
    edukasi: "/generate/carousel",
    best_seller: "/generate/banner",
    brand_awareness: "/generate/carousel",
    restock: "/generate/banner",
  };

  const goalIcon = {
    launch: "🚀", promo: "💸", testimonial: "🌟",
    edukasi: "💡", best_seller: "🏆", brand_awareness: "🎯", restock: "🔄",
  };

  const actions = [
    {
      to: "/generate/banner",
      title: "Banner Generator",
      desc: "Visual banner promosi premium siap posting.",
      icon: ImageSquare,
      tone: "bg-brand text-brand-cream",
      testid: "action-banner",
    },
    {
      to: "/generate/carousel",
      title: "Carousel Builder",
      desc: "3–7 slide storytelling otomatis.",
      icon: Stack,
      tone: "bg-brand-gold text-brand",
      testid: "action-carousel",
    },
    {
      to: "/generate/copywriting",
      title: "Copywriting",
      desc: "Headline, caption, hashtag siap pakai.",
      icon: PenNib,
      tone: "bg-brand-clay text-white",
      testid: "action-copywriting",
    },
    {
      to: "/generate/food",
      title: "F&B Menu Visual",
      desc: "Food photography prompt khusus UMKM kuliner.",
      icon: ForkKnife,
      tone: "bg-amber-700 text-amber-50",
      testid: "action-food",
    },
    {
      to: "/grid-planner",
      title: "Grid Planner",
      desc: "Rencanakan 3×3 feed Instagram Anda.",
      icon: GridFour,
      tone: "bg-emerald-700 text-emerald-50",
      testid: "action-grid",
    },
    {
      to: "/consistency",
      title: "Consistency Checker",
      desc: "Skor konsistensi visual vs Brand DNA Anda.",
      icon: ShieldCheck,
      tone: "bg-rose-700 text-rose-50",
      testid: "action-consistency",
    },
  ];

  return (
    <div className="space-y-8" data-testid="dashboard-page">
      {/* Greeting */}
      <div className="animate-fade-up">
        <div className="text-xs uppercase tracking-[0.2em] text-brand-light font-semibold mb-2">Dashboard</div>
        <h1 className="font-heading text-3xl sm:text-4xl lg:text-5xl font-bold text-brand tracking-tight">
          Halo, {user?.name?.split(" ")[0] || "kreator"}.
        </h1>
        <p className="text-stone-600 mt-2 text-lg">
          Siap bikin konten brand <span className="text-brand font-semibold">{brand?.brand_name || "Anda"}</span> yang konsisten?
        </p>
      </div>

      {/* Credits balance card */}
      <CreditBalanceCard credits={credits} />

      {/* Content Recommendation — always first, even for new users */}
      {recommendation && (
        <div
          className={`feedify-card animate-fade-up overflow-hidden ${recommendation.is_new_user ? "" : "border-l-4 border-brand-gold"}`}
          data-testid="content-recommendation"
        >
          {recommendation.is_new_user ? (
            /* New user — full onboarding card */
            <div className="p-6 sm:p-7">
              <div className="flex items-start gap-4">
                <div className="h-12 w-12 rounded-2xl bg-brand flex items-center justify-center flex-shrink-0 shadow-md">
                  <Sparkle size={22} weight="fill" className="text-brand-gold" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] uppercase tracking-[0.2em] text-brand-light font-bold mb-1">Langkah Pertama</div>
                  <div className="font-heading font-bold text-brand text-lg leading-tight">Mulai dengan konten <span className="text-brand-gold">{recommendation.recommended_name}</span></div>
                  <p className="text-sm text-stone-500 mt-1.5 leading-relaxed">{recommendation.reason}</p>
                  {recommendation.tip && (
                    <div className="mt-3 inline-flex items-center gap-1.5 text-xs text-brand bg-brand/8 px-3 py-1.5 rounded-full font-medium">
                      <Lightning size={12} weight="fill" className="text-brand-gold" />
                      {recommendation.tip}
                    </div>
                  )}
                </div>
              </div>
              <div className="mt-5 flex flex-col sm:flex-row gap-2.5">
                <Link
                  to={goalToDashboard[recommendation.recommended_goal] || "/generate/banner"}
                  data-testid="recommendation-cta"
                  className="flex-1 py-3 bg-brand text-brand-cream rounded-full font-bold text-sm hover:bg-brand-light btn-lift inline-flex items-center justify-center gap-2 shadow-md"
                >
                  <Sparkle size={16} weight="fill" /> Buat Konten {recommendation.recommended_name}
                </Link>
                <Link to="/generate/carousel" className="flex-1 py-3 border-2 border-brand-sand text-brand rounded-full font-semibold text-sm hover:border-brand hover:bg-brand-sand/40 inline-flex items-center justify-center gap-2 transition-all">
                  <Stack size={16} weight="duotone" /> Coba Carousel
                </Link>
              </div>
            </div>
          ) : (
            /* Returning user — compact rotation card */
            <div className="p-5 flex items-start gap-4">
              <div className="h-10 w-10 rounded-xl bg-brand-gold/15 flex items-center justify-center flex-shrink-0 text-lg">
                {goalIcon[recommendation.recommended_goal] || "🎯"}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[10px] uppercase tracking-[0.18em] text-brand-light font-bold mb-0.5">Saran Konten Berikutnya</div>
                <div className="font-heading font-bold text-brand text-base">{recommendation.recommended_name}</div>
                <div className="text-xs text-stone-500 mt-0.5">{recommendation.reason}</div>
              </div>
              <Link
                to={goalToDashboard[recommendation.recommended_goal] || "/generate/banner"}
                data-testid="recommendation-cta"
                className="flex-shrink-0 text-xs font-bold text-brand hover:text-brand-light px-4 py-2 rounded-full border border-brand-sand hover:border-brand transition-all whitespace-nowrap"
              >
                Buat →
              </Link>
            </div>
          )}
        </div>
      )}

      {/* Stats — only when user has content */}
      {stats.total > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 animate-fade-up">
          <StatCard label="Total Konten" value={stats.total} icon={Sparkle} />
          <StatCard label="Feed Post" value={stats.banner} icon={ImageSquare} />
          <StatCard label="Carousel" value={stats.carousel} icon={Stack} />
          <StatCard label="Copywriting" value={stats.copywriting} icon={PenNib} />
        </div>
      )}

      {/* Brand DNA card */}
      {brand && (
        <Link to="/settings" className="block animate-fade-up" data-testid="brand-dna-card">
          <div className="feedify-card p-6 flex items-center gap-5">
            <div className="h-16 w-16 rounded-2xl border border-brand-sand flex items-center justify-center overflow-hidden" style={{ background: brand.color_secondary }}>
              {brand.logo_base64 ? (
                <img src={brand.logo_base64} alt="logo" className="h-full w-full object-cover" />
              ) : (
                <Palette size={26} style={{ color: brand.color_primary }} weight="duotone" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs uppercase tracking-[0.18em] text-stone-500 font-semibold">Brand Visual DNA</div>
              <div className="font-heading text-xl font-bold text-brand truncate">{brand.brand_name}</div>
              <div className="text-xs text-stone-500 mt-0.5">{brand.category}</div>
            </div>
            <div className="hidden sm:flex gap-1.5">
              {[brand.color_primary, brand.color_secondary].map((c, i) => (
                <div key={i} className="h-8 w-8 rounded-lg border border-white shadow-sm" style={{ background: c }} />
              ))}
            </div>
          </div>
        </Link>
      )}

      {/* Quick actions */}
      <div className="animate-fade-up">
        <h2 className="font-heading text-2xl font-bold text-brand mb-4 tracking-tight">Generate konten</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {actions.map((a) => (
            <Link
              key={a.to}
              to={a.to}
              data-testid={a.testid}
              className="feedify-card p-6 group flex flex-col"
            >
              <div className={`h-12 w-12 rounded-xl ${a.tone} flex items-center justify-center mb-4 shadow-sm`}>
                <a.icon size={24} weight="duotone" />
              </div>
              <h3 className="font-heading text-xl font-semibold text-brand mb-1">{a.title}</h3>
              <p className="text-sm text-stone-600 leading-relaxed flex-1">{a.desc}</p>
              <div className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-brand">
                Mulai <ArrowRight size={16} weight="bold" className="group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Recent prompts */}
      <div className="animate-fade-up">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-heading text-2xl font-bold text-brand tracking-tight">Riwayat terakhir</h2>
          <Link to="/history" className="text-sm font-semibold text-brand hover:underline" data-testid="see-all-history">
            Lihat semua →
          </Link>
        </div>
        {recent.length === 0 ? (
          <div className="feedify-card p-10 text-center">
            <ClockCounterClockwise size={32} className="mx-auto text-stone-400 mb-3" />
            <p className="text-stone-500">Belum ada prompt. Generate yang pertama yuk!</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {recent.map((p) => {
              const thumb = p.image_base64 || (p.slide_images && p.slide_images[0]);
              return (
                <Link key={p.id} to="/history" data-testid={`recent-${p.id}`} className="feedify-card overflow-hidden group">
                  <div className="aspect-square bg-brand-sand/40 relative">
                    {thumb ? (
                      <img src={`data:image/png;base64,${thumb}`} alt={p.title} className="h-full w-full object-cover" />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center text-brand-light/50">
                        {p.dashboard_type === "banner" && <ImageSquare size={28} weight="duotone" />}
                        {p.dashboard_type === "carousel" && <Stack size={28} weight="duotone" />}
                        {p.dashboard_type === "copywriting" && <PenNib size={28} weight="duotone" />}
                        {p.dashboard_type === "food-menu" && <ForkKnife size={28} weight="duotone" />}
                      </div>
                    )}
                    <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded bg-white/90 text-[9px] uppercase tracking-wider font-bold text-brand">
                      {p.dashboard_type === "food-menu" ? "F&B" : p.dashboard_type}
                    </div>
                  </div>
                  <div className="p-3">
                    <div className="text-xs font-semibold text-brand truncate">{p.title}</div>
                    <div className="text-[10px] text-stone-500 mt-0.5">{new Date(p.created_at).toLocaleDateString("id-ID")}</div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function CreditBalanceCard({ credits }) {
  const balance = credits?.balance ?? credits?.credits_remaining ?? 0;
  const totalBought = credits?.total_purchased ?? 0;
  const [history, setHistory] = useState([]);
  useEffect(() => {
    api.get("/credits/history").then(({ data }) => setHistory(data.slice(0, 5))).catch(() => {});
  }, []);

  const typeLabel = (t) => ({ purchase: "Beli kredit", usage: "Generate", refund: "Refund", bonus: "Bonus" })[t] || t;
  const typeColor = (t) => ({ purchase: "text-green-600", usage: "text-stone-500", refund: "text-blue-500", bonus: "text-brand-gold" })[t] || "text-stone-500";

  return (
    <div className="feedify-card p-6 animate-fade-up" data-testid="credits-card">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-5">
        <div>
          <div className="text-xs uppercase tracking-[0.18em] text-brand-light font-bold flex items-center gap-1.5 mb-2">
            <Lightning size={14} weight="fill" /> Kredit Kamu
          </div>
          <div className="flex items-center gap-2">
            <div className="h-11 w-11 rounded-2xl bg-brand-gold/15 flex items-center justify-center flex-shrink-0">
              <Lightning size={22} weight="fill" className="text-brand-gold" />
            </div>
            <span className="font-heading text-5xl font-bold text-brand" data-testid="credits-remaining">{balance}</span>
          </div>
          <div className="text-xs text-stone-500 mt-1">
            kredit tersisa · tidak expired · total dibeli: <strong>{totalBought}</strong>
          </div>
        </div>
        <Link to="/credits" data-testid="buy-credits-link"
          className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-brand-gold text-brand hover:bg-brand-amber rounded-full font-bold text-sm btn-lift shadow-md shadow-brand-gold/20 whitespace-nowrap flex-shrink-0">
          + Beli Kredit
        </Link>
      </div>

      {/* Last 5 transactions */}
      {history.length > 0 && (
        <div className="border-t border-stone-100 pt-4">
          <div className="text-[10px] uppercase tracking-[0.18em] text-brand-light font-bold mb-3">Riwayat Terakhir</div>
          <div className="space-y-1.5">
            {history.map((tx, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span className={`font-medium ${typeColor(tx.type)}`}>{typeLabel(tx.type)}</span>
                  {tx.description && <span className="text-stone-400 text-xs hidden sm:inline truncate max-w-[180px]">{tx.description}</span>}
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className={`font-mono font-semibold ${tx.amount > 0 ? "text-green-600" : "text-stone-500"}`}>
                    {tx.type === "bonus" ? "+🎁" : tx.amount > 0 ? `+${tx.amount}` : tx.amount}
                  </span>
                  <span className="text-stone-400 text-xs">{new Date(tx.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {balance === 0 && (
        <div className="mt-4 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-700">
          Kredit kamu habis. <Link to="/credits" className="font-semibold underline">Beli kredit sekarang →</Link>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, icon: Icon }) {
  return (
    <div className="feedify-card p-5" data-testid={`stat-${label.toLowerCase().replace(/\s+/g, '-')}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="text-xs uppercase tracking-[0.15em] text-stone-500 font-semibold">{label}</div>
        <Icon size={18} className="text-brand-light" weight="duotone" />
      </div>
      <div className="font-heading text-3xl font-bold text-brand">{value}</div>
    </div>
  );
}
