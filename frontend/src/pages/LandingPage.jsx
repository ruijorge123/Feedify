import { Link, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import {
  Sparkle, ArrowRight, ArrowUpRight,
  Lightning, Lock, CheckCircle,
  CircleNotch, XCircle,
} from "@phosphor-icons/react";
import SupportChatWidget from "@/components/SupportChatWidget";
import InstallPWAButton from "@/components/InstallPWAButton";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-brand-cream text-stone-800 overflow-x-hidden selection:bg-brand-gold selection:text-brand relative">
      {/* Persistent mesh gradient blobs — desktop only (heavy blur crashes mobile GPU) */}
      <div className="hidden sm:block pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="absolute top-[30%] left-[-8%] w-[55vw] h-[55vw] rounded-full bg-brand/[0.04] blur-[150px]" />
        <div className="absolute top-[55%] right-[-10%] w-[45vw] h-[45vw] rounded-full bg-brand-gold/[0.04] blur-[130px]" />
        <div className="absolute bottom-[10%] left-[20%] w-[40vw] h-[40vw] rounded-full bg-brand/[0.03] blur-[120px]" />
      </div>
      <main>
        <DarkHero />
        <Marquee />
        <PainAgitation />
        <Transformation />
        <HowItWorks />
        <ComparisonTable />
        <Testimonials />
        <Pricing />
        <SupportChat />
      </main>
      <Footer />
    </div>
  );
}

/* ============ DARK HERO — full cinematic ============ */
function DarkHero() {
  const { user, logout } = useAuth();
  const navigate         = useNavigate();
  const hasAccess        = user && (user.role === "admin" || user.is_lifetime === true);
  const [pendingOrder, setPendingOrder] = useState(null);

  useEffect(() => {
    if (!user || hasAccess) return;
    let iv;
    const fetchActive = () => api.get("/checkout/manual/active").then(({ data }) => {
      setPendingOrder(data);
      // No order at all — stop polling, most landing-page visitors never checked out.
      if (!data && iv) clearInterval(iv);
    }).catch(() => {});
    fetchActive();
    // Keep polling while there's an order still awaiting a verdict — the reject/approve
    // action happens out-of-band via the Telegram bot, so nothing pushes the update here.
    iv = setInterval(fetchActive, 8000);
    return () => clearInterval(iv);
  }, [user, hasAccess]);

  return (
    <div className="relative sm:min-h-screen sm:min-h-[100dvh] overflow-x-hidden flex flex-col" data-testid="hero"
      style={{ background: "radial-gradient(ellipse 120% 60% at 20% 30%, #0f3d22 0%, #060d09 55%, #060d09 100%)" }}>

      {/* Ambient glows — desktop only (hidden on mobile to avoid black-out) */}
      <div className="hidden sm:block glow-pulse absolute top-[-15%] left-[-10%] w-[65vw] h-[65vw] rounded-full bg-brand/40 blur-[130px] pointer-events-none" />
      <div className="hidden sm:block glow-pulse-delay absolute top-[10%] right-[-10%] w-[50vw] h-[50vw] rounded-full bg-brand-gold/12 blur-[110px] pointer-events-none" />
      <div className="hidden sm:block glow-pulse absolute bottom-[5%] left-[10%] w-[55vw] h-[55vw] rounded-full bg-emerald-800/35 blur-[100px] pointer-events-none" />
      {/* Mobile glow — lighter, smaller, works on small screens */}
      <div className="sm:hidden absolute top-0 left-0 w-full h-[50vh] rounded-full bg-brand/20 blur-[80px] pointer-events-none" />

      {/* NAV */}
      <nav className="relative z-30 max-w-[1280px] mx-auto w-full px-5 lg:px-10 py-6 flex items-center justify-between" data-testid="landing-nav">
        <Link to="/" className="flex items-center gap-2.5" data-testid="landing-logo">
          <div className="h-9 w-9 rounded-xl bg-brand flex items-center justify-center">
            <Sparkle size={18} weight="fill" className="text-brand-gold" />
          </div>
          <span className="font-heading text-xl font-bold text-white tracking-tight">Feedify</span>
        </Link>

        <div className="hidden md:flex items-center gap-8 text-sm text-white/50 font-medium">
          <a href="#how" className="hover:text-white transition-colors">Cara kerja</a>
          <a href="#pricing" className="hover:text-white transition-colors">Harga</a>
          <a href="#faq" className="hover:text-white transition-colors">FAQ</a>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {user ? (
            <>
              <button onClick={logout} data-testid="landing-logout-btn"
                className="inline-flex items-center gap-2 px-4 sm:px-5 py-2.5 text-xs sm:text-sm font-semibold text-white border border-white/25 hover:border-white/50 hover:bg-white/10 rounded-full transition-all">
                {user.picture
                  ? <img src={user.picture} alt="" className="w-5 h-5 rounded-full object-cover" />
                  : <div className="w-5 h-5 rounded-full bg-brand-gold/40 flex items-center justify-center text-[10px] font-bold text-brand-gold">{(user.name || user.email || "U")[0].toUpperCase()}</div>
                }
                Logout
              </button>
              {hasAccess ? (
                <button onClick={() => navigate("/dashboard")} data-testid="nav-dashboard-cta"
                  className="inline-flex items-center gap-1.5 px-4 sm:px-5 py-2.5 text-xs sm:text-sm font-semibold bg-brand-gold text-brand hover:bg-brand-amber rounded-full transition-all shadow-lg shadow-brand-gold/20">
                  Masuk Dashboard <ArrowRight size={14} weight="bold" />
                </button>
              ) : pendingOrder?.status === "menunggu_verifikasi" ? (
                <button onClick={() => navigate("/checkout?plan=lifetime")} data-testid="nav-pending-badge"
                  className="inline-flex items-center gap-1.5 px-4 sm:px-5 py-2.5 text-xs sm:text-sm font-semibold bg-amber-400/15 text-amber-300 border border-amber-400/40 rounded-full transition-all hover:bg-amber-400/25">
                  <CircleNotch size={14} weight="bold" className="animate-spin" /> Menunggu Konfirmasi
                </button>
              ) : pendingOrder?.status === "ditolak" ? (
                <button onClick={() => navigate("/checkout?plan=lifetime")} data-testid="nav-rejected-badge"
                  className="inline-flex items-center gap-1.5 px-4 sm:px-5 py-2.5 text-xs sm:text-sm font-semibold bg-red-400/15 text-red-300 border border-red-400/40 rounded-full transition-all hover:bg-red-400/25">
                  <XCircle size={14} weight="bold" /> Bukti Ditolak
                </button>
              ) : (
                <a href="#pricing" data-testid="nav-pricing-cta"
                  className="inline-flex items-center gap-1.5 px-4 sm:px-5 py-2.5 text-xs sm:text-sm font-semibold bg-brand-gold text-brand hover:bg-brand-amber rounded-full transition-all shadow-lg shadow-brand-gold/20">
                  Beli Lifetime <ArrowRight size={14} weight="bold" />
                </a>
              )}
            </>
          ) : (
            <>
              <Link to="/login" data-testid="landing-login-btn"
                className="inline-flex items-center justify-center px-4 sm:px-5 py-2.5 text-xs sm:text-sm font-semibold text-white border border-white/25 hover:border-white/50 hover:bg-white/10 rounded-full transition-all">
                Masuk
              </Link>
              <a href="#pricing" data-testid="nav-pricing-cta"
                className="inline-flex items-center gap-1.5 px-4 sm:px-5 py-2.5 text-xs sm:text-sm font-semibold bg-brand-gold text-brand hover:bg-brand-amber rounded-full transition-all shadow-lg shadow-brand-gold/20">
                Mulai Sekarang <ArrowRight size={14} weight="bold" />
              </a>
            </>
          )}
        </div>
      </nav>

      {/* HERO CONTENT */}
      <div className="relative z-10 flex-1 flex flex-col justify-center max-w-[1280px] mx-auto w-full min-w-0 px-5 lg:px-0 pt-6 pb-4 lg:pb-24">

        {/* Eyebrow */}
        <div className="inline-flex items-center gap-2 mb-8 px-3.5 py-1.5 rounded-full bg-white/5 border border-white/10 text-brand-gold text-[10px] font-bold uppercase tracking-[0.22em] w-fit" data-testid="hero-eyebrow">
          <span className="h-1.5 w-1.5 rounded-full bg-brand-gold animate-pulse" />
          Brand Studio · Untuk UMKM Indonesia
        </div>

        {/* Main headline — HUGE */}
        <h1
          className="font-heading font-bold text-white tracking-[-0.04em] leading-[0.92] max-w-full sm:max-w-[18ch] break-words"
          style={{ fontSize: "clamp(2rem, 7.5vw, 7.5rem)", overflowWrap: "anywhere" }}
          data-testid="hero-headline"
        >
          Capek mikir konten tiap hari,<br className="hidden sm:block" />
          {" "}tapi feed tetap{" "}
          <span className="text-brand-gold italic font-medium">sepi?</span>
        </h1>

        {/* Sub + CTA row */}
        <div className="mt-10 lg:mt-14 flex flex-col lg:flex-row lg:items-end gap-8 lg:gap-16 min-w-0">
          <div className="max-w-full sm:max-w-lg min-w-0">
            <p className="text-white/60 leading-relaxed text-base lg:text-lg" data-testid="hero-sub">
              Setiap hari mikirin mau posting apa. Foto produk seadanya. Feed berantakan.
              Sementara kompetitor makin rapi dan laku. Feedify ubah itu — konten brand
              profesional, konsisten, siap posting dalam 30 detik.
            </p>
            {/* Hero CTA — changes based on auth state */}
            {user ? (
              <div className="mt-8">
                {hasAccess ? (
                  /* Logged in + has access */
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                    <InstallPWAButton />
                    <button
                      onClick={() => navigate("/dashboard")}
                      data-testid="hero-dashboard-cta"
                      className="inline-flex items-center gap-2.5 px-7 py-4 bg-brand-gold text-brand hover:bg-brand-amber rounded-full font-bold text-base shadow-2xl shadow-brand-gold/25 btn-lift">
                      <CheckCircle size={20} weight="fill" />
                      Masuk ke Dashboard
                      <ArrowRight size={18} weight="bold" />
                    </button>
                    <p className="text-white/40 text-xs">
                      Login sebagai <span className="text-white/70 font-semibold">{user.name || user.email}</span>
                    </p>
                  </div>
                ) : (
                  /* Logged in but hasn't paid */
                  <div className="flex flex-col gap-4">
                    <div className="inline-flex items-center gap-3 px-5 py-3.5 rounded-2xl border border-white/10 bg-white/5 w-fit">
                      <Lock size={16} className="text-white/40 flex-shrink-0" />
                      <div>
                        <p className="text-white/80 text-sm font-semibold">Akun terdaftar sebagai <span className="text-brand-gold">{user.name || user.email}</span></p>
                        <p className="text-white/40 text-xs mt-0.5">Selesaikan pembayaran untuk mengakses dashboard</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 flex-wrap">
                      <a href="#pricing" data-testid="hero-cta"
                        className="inline-flex items-center gap-2 px-7 py-4 bg-brand-gold text-brand hover:bg-brand-amber rounded-full font-bold text-base shadow-2xl shadow-brand-gold/25 btn-lift">
                        Selesaikan Pembayaran <ArrowRight size={18} weight="bold" />
                      </a>
                      <button disabled
                        className="inline-flex items-center gap-2 px-6 py-4 rounded-full font-bold text-sm text-white/30 border border-white/10 cursor-not-allowed">
                        <Lock size={15} />
                        Dashboard (Terkunci)
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* Not logged in */
              <div className="mt-8 flex items-center gap-4 flex-wrap">
                <a href="#pricing" data-testid="hero-cta"
                  className="inline-flex items-center gap-2 px-7 py-4 bg-brand-gold text-brand hover:bg-brand-amber rounded-full font-bold text-base shadow-2xl shadow-brand-gold/25 btn-lift">
                  Mulai Sekarang <ArrowRight size={18} weight="bold" />
                </a>
                <a href="#pain" data-testid="hero-cta-secondary"
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-white/50 hover:text-white transition-colors">
                  Lihat Contoh Hasil ↓
                </a>
              </div>
            )}
          </div>

          {/* Stats row */}
          <div className="flex items-center gap-8 lg:gap-12 lg:pb-1">
            <HeroStat num="< 30s" label="Per gambar" />
            <div className="h-10 w-px bg-white/10" />
            <HeroStat num="∞" label="Tools AI" />
            <div className="h-10 w-px bg-white/10" />
            <HeroStat num="999+" label="Library inspirasi" />
          </div>
        </div>

        {/* Scrolling content strip */}
        <ContentStrip />
      </div>

      {/* Bottom fade to page background */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-b from-transparent to-brand-cream pointer-events-none" />
    </div>
  );
}

function HeroStat({ num, label }) {
  return (
    <div>
      <div className="font-heading font-bold text-white text-2xl lg:text-3xl tracking-tight leading-none">{num}</div>
      <div className="text-white/40 text-xs mt-1 font-medium">{label}</div>
    </div>
  );
}

const STRIP_ITEMS = [
  { img: "/skincare-moisturizer.webp",                          label: "Skincare",    tag: "Moisturizer",   contain: false },
  { img: "/skincare-moisturizer1.webp",                         label: "Skincare",    tag: "Moisturizer",   contain: true },
  { img: "/studio/skincare-moisturizer birutema.webp",          label: "Skincare",    tag: "Moisturizer",   contain: true },
  { img: "/perfume1.webp",                                      label: "Parfum",      tag: "Perfume",       contain: true },
  { img: "/perfume2.webp",                                      label: "Parfum",      tag: "Perfume",       contain: true },
  { img: "/studio/perfume3.webp",                               label: "Parfum",      tag: "Perfume",       contain: true },
  { img: "/cleanser1.webp",                                     label: "Skincare",    tag: "Cleanser",      contain: true },
  { img: "/cleanser2.webp",                                     label: "Skincare",    tag: "Cleanser",      contain: true },
  { img: "/cleanser3.webp",                                     label: "Skincare",    tag: "Cleanser",      contain: true },
  { img: "/studio/skincare-facewash.webp",                      label: "Skincare",    tag: "Face Wash",     contain: true },
  { img: "/skincare-serum5.webp",                               label: "Skincare",    tag: "Serum",         contain: true },
  { img: "/skincare-serumtestimoni.webp",                       label: "Skincare",    tag: "Serum",         contain: true },
  { img: "/skincare-serumtestimoni2.webp",                      label: "Skincare",    tag: "Serum",         contain: true },
  { img: "/studio/skincare-serum.webp",                         label: "Skincare",    tag: "Serum",         contain: true },
  { img: "/studio/skincare-serum2.webp",                        label: "Skincare",    tag: "Serum",         contain: true },
  { img: "/studio/skincare-ampoule.webp",                       label: "Skincare",    tag: "Ampoule",       contain: true },
  { img: "/bodycare-bodywash.webp",                             label: "Bodycare",    tag: "Body Wash",     contain: true },
  { img: "/bodycare-scrubtestimoni.webp",                       label: "Bodycare",    tag: "Scrub",         contain: true },
  { img: "/minuman-matcha.webp",                                label: "Café",        tag: "Matcha",        contain: true },
  { img: "/minuman-bery.webp",                                  label: "Minuman",     tag: "Berry Drink",   contain: true },
  { img: "/minuman-kalengtea.webp",                             label: "Minuman",     tag: "Tea Kaleng",    contain: true },
  { img: "/minuman-kaleng.webp",                                label: "Minuman",     tag: "Beverage",      contain: true },
  { img: "/minuman-cup.webp",                                   label: "F&B",         tag: "Minuman Cup",   contain: true },
  { img: "/minuman-kopi.webp",                                  label: "Café",        tag: "Menu Kopi",     contain: true },
  { img: "/makanan-crunch.webp",                                label: "Kuliner",     tag: "Snack",         contain: true },
  { img: "/makanan-sambal.webp",                                label: "Kuliner",     tag: "Sambal",        contain: true },
  { img: "/makanan.webp",                                       label: "Kuliner",     tag: "Rice Bowl",     contain: true },
  { img: "/fashion-baju.webp",                                  label: "Fashion",     tag: "Baju",          contain: true },
  { img: "/fashion-shirt.webp",                                 label: "Fashion",     tag: "Pakaian",       contain: false },
  { img: "/headset1.webp",                                      label: "Elektronik",  tag: "Headset",       contain: true },
  { img: "/jamtangan1.webp",                                    label: "Aksesoris",   tag: "Jam Tangan",    contain: true },
  { img: "/aksesoris.webp",                                     label: "Aksesoris",   tag: "Perhiasan",     contain: true },
  { img: "/skincare-toner1.webp",                               label: "Skincare",    tag: "Toner",         contain: true },
  { img: "/freese-after.webp",                                  label: "Skincare",    tag: "Body Lotion",   contain: true },
  { img: "/marketplace/skincare-moisturizer.webp",              label: "Marketplace", tag: "Moisturizer",   contain: true },
  { img: "/marketplace/skincare-toneuplotion.webp",             label: "Marketplace", tag: "Toner Lotion",  contain: true },
  { img: "/studio/lipstick1.webp",                              label: "Kosmetik",    tag: "Lipstik",       contain: true },
  { img: "/studio/moisturizer1.webp",                           label: "Skincare",    tag: "Moisturizer",   contain: true },
  { img: "/studio/serum.webp",                                  label: "Skincare",    tag: "Serum",         contain: true },
  { img: "/studio/tumbler2.webp",                               label: "Lifestyle",   tag: "Tumbler",       contain: true },
  { img: "/studio/micellerwater1.webp",                         label: "Skincare",    tag: "Micellar Water",contain: true },
  { img: "/marketplace/susncreen1.webp",                        label: "Marketplace", tag: "Sunscreen",     contain: true },
  { img: "/marketplace/toner1.webp",                            label: "Marketplace", tag: "Toner",         contain: true },
  { img: "/marketplace/shirt1.webp",                            label: "Fashion",     tag: "Kaos",          contain: true },
  { img: "/marketplace/liptint1.webp",                          label: "Kosmetik",    tag: "Lip Tint",      contain: true },
  { img: "/marketplace/hairpowder1.webp",                       label: "Haircare",    tag: "Hair Powder",   contain: true },
  { img: "/marketplace/casing1.webp",                           label: "Gadget",      tag: "Casing HP",     contain: true },
  { img: "/marketplace/babylotion.webp",                        label: "Baby Care",   tag: "Baby Lotion",   contain: true },
  { img: "/marketplace/parfume2.webp",                          label: "Parfum",      tag: "Perfume",       contain: true },
  { img: "/marketplace/makeup1.webp",                           label: "Kosmetik",    tag: "Makeup",        contain: true },
];

function ContentStrip() {
  const items = [...STRIP_ITEMS, ...STRIP_ITEMS];
  return (
    <div className="mt-8 sm:mt-14 lg:mt-20 pb-10 relative" data-testid="hero-result-showcase">
      <div className="absolute left-0 top-0 bottom-50 w-24 z-10 pointer-events-none" style={{ background: "linear-gradient(to right, #060d09, transparent)" }} />
      <div className="absolute right-0 top-0 bottom-50 w-24 z-10 pointer-events-none" style={{ background: "linear-gradient(to left, #060d09, transparent)" }} />
      <div className="overflow-hidden">
        <div className="strip-scroll flex gap-3 w-max pb-2">
          {items.map((item, i) => (
            <StripCard key={i} item={item} />
          ))}
        </div>
      </div>
      <div className="mt-5 flex items-center justify-center gap-3 text-white/25 text-xs font-medium">
        <div className="h-px w-12 bg-white/10" />
        Kategori UMKM yang bisa dibuat dengan Feedify
        <div className="h-px w-12 bg-white/10" />
      </div>
    </div>
  );
}

function StripCard({ item }) {
  return (
    <div className="flex-shrink-0 w-44 sm:w-48 rounded-2xl overflow-hidden group cursor-default"
      style={{ boxShadow: "0 20px 50px -12px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.07)" }}>
      <div className="relative aspect-[3/4] bg-[#111]">
        <img src={item.img} alt={item.label}
          className={`h-full w-full transition-transform duration-700 ease-out group-hover:scale-[1.04] ${item.contain ? "object-contain p-3" : "object-cover"}`}
          loading="lazy"
          onError={(e) => { e.currentTarget.style.display = "none"; }} />
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/5 to-transparent" />
        <div className="absolute top-3 left-3">
          <span className="text-[8px] font-bold uppercase tracking-[0.15em] text-white/80 bg-black/50 sm:backdrop-blur-sm px-2 py-1 rounded-full">
            {item.tag}
          </span>
        </div>
        <div className="absolute bottom-3 left-3 right-3">
          <div className="text-white text-xs font-semibold tracking-wide">{item.label}</div>
        </div>
      </div>
    </div>
  );
}

/* ============ MARQUEE ============ */
function Marquee() {
  const tags = ["F&B & Café","Skincare","Fashion Lokal","Hijab & Modest","Frozen Food","Catering","Jasa Lokal","Retail UMKM","Edukasi & Course","Kuliner Daerah"];
  return (
    <section className="relative py-8 lg:py-10 border-y border-brand-sand bg-white" data-testid="marquee">
      <div className="max-w-[1280px] mx-auto px-5 lg:px-10 flex items-center gap-6 flex-wrap justify-center text-stone-500">
        <span className="text-[10px] uppercase tracking-[0.25em] font-bold text-brand-light">Dipakai UMKM dari berbagai kategori</span>
        <div className="hidden sm:block h-4 w-px bg-brand-sand" />
        <div className="flex items-center gap-x-7 gap-y-2 flex-wrap justify-center font-heading font-semibold text-sm text-stone-700">
          {tags.map(t => <span key={t}>{t}</span>)}
        </div>
      </div>
    </section>
  );
}

/* ============ TRANSFORMATION ============ */
function Transformation() {
  return (
    <section id="pain" className="relative overflow-hidden bg-brand" data-testid="transformation">
      {/* Subtle texture */}
      <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)", backgroundSize: "32px 32px" }} />
      <div className="absolute top-0 right-0 w-[50vw] h-[60vh] rounded-full bg-brand-gold/8 blur-[120px] pointer-events-none" />

      <div className="relative max-w-[1280px] mx-auto px-5 lg:px-10 py-20 lg:py-32">

        {/* Top — headline */}
        <div className="max-w-3xl mb-14 lg:mb-20">
          <div className="inline-flex items-center gap-2 mb-6 px-3 py-1.5 rounded-full bg-brand-gold/15 border border-brand-gold/25 text-brand-gold text-[10px] font-bold uppercase tracking-[0.2em]">
            <Sparkle size={10} weight="fill" /> Hasil nyata
          </div>
          <p className="text-brand-cream/50 text-sm font-semibold uppercase tracking-[0.15em] mb-3">Ini yang berubah setelah pakai Feedify:</p>
          <h2 className="font-heading font-bold text-brand-cream leading-[1.0] tracking-[-0.03em]" style={{ fontSize: "clamp(2rem, 5.5vw, 4.5rem)" }}>
            Ribuan orang scroll feed-mu<br />
            setiap hari —<br />
            <span className="text-brand-gold italic font-medium">berapa yang benar-benar berhenti?</span>
          </h2>
          <p className="mt-6 text-brand-cream/60 text-base lg:text-lg leading-relaxed max-w-xl">
            Orang tidak berhenti karena produknya bagus. Mereka berhenti karena visualnya menarik perhatian. Feedify pastikan setiap foto yang kamu posting punya daya tarik itu — otomatis, konsisten, sesuai brand.
          </p>
        </div>

        {/* Before / After — horizontal on desktop, stacked on mobile */}
        <div className="grid lg:grid-cols-2 gap-5 lg:gap-8 items-end" data-testid="transformation-grid">

          {/* Before */}
          <div className="relative group">
            <div className="flex items-center gap-2.5 mb-3">
              <div className="h-6 w-6 rounded-full bg-white/10 border border-white/15 flex items-center justify-center">
                <span className="text-[9px] font-bold text-white/50">✕</span>
              </div>
              <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/30">Sebelum Feedify</span>
            </div>
            <div className="rounded-2xl overflow-hidden bg-white/5 border border-white/10 aspect-[4/5] relative">
              <img src="/freese-before.webp" alt="Foto produk polos"
                className="h-full w-full object-contain p-10 opacity-90" loading="lazy" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-5">
                <div className="space-y-1.5">
                  {["Foto polos tanpa layout", "Tidak ada identitas brand", "Follower tidak tahu harus ngapain"].map(t => (
                    <div key={t} className="flex items-center gap-2">
                      <span className="text-red-400 text-xs">✕</span>
                      <span className="text-white/50 text-xs">{t}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* After */}
          <div className="relative group">
            <div className="flex items-center gap-2.5 mb-3">
              <div className="h-6 w-6 rounded-full bg-brand-gold/20 border border-brand-gold/40 flex items-center justify-center">
                <Sparkle size={10} weight="fill" className="text-brand-gold" />
              </div>
              <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-brand-gold">Setelah Feedify</span>
            </div>
            <div className="rounded-2xl overflow-hidden border-2 border-brand-gold/40 aspect-[4/5] relative shadow-2xl shadow-black/40">
              <img src="/freese-after.webp" alt="Hasil feed profesional"
                className="h-full w-full object-cover" loading="lazy" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-5">
                <div className="space-y-1.5">
                  {["Visual setara brand global", "Warna & gaya sesuai brand DNA", "Siap posting, langsung convert"].map(t => (
                    <div key={t} className="flex items-center gap-2">
                      <span className="text-brand-gold text-xs">✓</span>
                      <span className="text-white/80 text-xs font-medium">{t}</span>
                    </div>
                  ))}
                </div>
              </div>
              {/* Time badge */}
              <div className="absolute top-4 right-4 px-3 py-1.5 rounded-full bg-brand-gold text-brand text-[10px] font-bold uppercase tracking-[0.15em] shadow-lg">
                ⚡ 30 detik
              </div>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}

function Outcome({ num, label }) {
  return (
    <div className="border-l-2 border-brand-gold pl-5">
      <div className="font-heading font-bold text-brand tracking-[-0.04em] leading-none" style={{ fontSize: "clamp(2rem, 4vw, 3.5rem)" }}>{num}</div>
      <div className="mt-2 text-xs sm:text-sm text-stone-600 leading-snug">{label}</div>
    </div>
  );
}

/* ============ HOW IT WORKS ============ */
function HowItWorks() {
  const steps = [
    { n: "01", label: "Brand DNA", title: "Isi Brand Profile, sekali saja.", desc: "Nama brand, palet warna, gaya visual, dan tone. Lima menit. Disimpan permanen sebagai DNA visual yang otomatis dipakai di setiap dashboard." },
    { n: "02", label: "Generate", title: "Pilih dashboard. Isi pesan inti.", desc: "Feed & Banner, Carousel, Studio, Feed Generator, atau Marketplace. Anda hanya menulis apa yang ingin disampaikan — Feedify menyusun spesifikasi visual setara art director." },
    { n: "03", label: "Hasil", title: "Foto siap posting.", desc: "Feedify menyusun spesifikasi visual lengkap — konsisten dengan Brand DNA Anda, siap diunduh dan diposting." },
  ];
  return (
    <section id="how" className="relative py-24 lg:py-36 bg-white border-y border-brand-sand" data-testid="how-it-works">
      <div className="max-w-[1280px] mx-auto px-5 lg:px-10">
        <div className="max-w-3xl mb-16 lg:mb-20">
          <div className="text-[10px] uppercase tracking-[0.25em] font-bold text-brand-light mb-4">Cara kerja</div>
          <h2 className="font-heading font-bold text-brand tracking-[-0.03em] leading-[0.95]" style={{ fontSize: "clamp(2rem, 5.5vw, 4.5rem)" }}>
            Tiga langkah. <span className="italic font-medium text-brand-light">Tanpa belajar tools baru.</span>
          </h2>
        </div>
        <div className="space-y-12 lg:space-y-0 lg:grid lg:grid-cols-3 lg:gap-12">
          {steps.map((s, i) => (
            <div key={i} className="relative group" data-testid={`step-${i + 1}`}>
              <div className="flex items-baseline gap-4 mb-6 pb-6 border-b border-brand-sand">
                <span className="font-heading text-2xl font-bold text-brand-gold tracking-tight">{s.n}</span>
                <span className="text-[10px] uppercase tracking-[0.25em] font-bold text-stone-400">{s.label}</span>
              </div>
              <h3 className="font-heading font-bold text-brand tracking-tight leading-[1.05] mb-4" style={{ fontSize: "clamp(1.4rem, 2.4vw, 2rem)" }}>{s.title}</h3>
              <p className="text-stone-600 leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ============ TESTIMONIALS ============ */
const TESTIMONIALS = [
  { img: "/testimonihalamanawal/testimoni-hiljab.webp",     badge: "Hemat biaya agency",        glow: "rgba(229,193,88,0.15)" },
  { img: "/testimonihalamanawal/testimoni-bodylotion.webp", badge: "Feeds makin estetik",       glow: "rgba(11,61,46,0.4)" },
  { img: "/testimonihalamanawal/testimoni-skincare.webp",   badge: "Followers naik terus",      glow: "rgba(229,193,88,0.12)" },
  { img: "/testimonihalamanawal/testimoni-kaos.webp",       badge: "Customer makin yakin beli", glow: "rgba(11,61,46,0.35)" },
];

function Testimonials() {
  return (
    <section
      className="relative py-20 lg:py-32 overflow-hidden"
      style={{ background: "radial-gradient(ellipse 140% 80% at 50% 110%, #0f3d22 0%, #060d09 50%, #060d09 100%)" }}
      data-testid="testimonials"
    >
      {/* Background glows */}
      <div className="absolute top-[10%] left-[-5%] w-[40vw] h-[40vw] rounded-full bg-brand-gold/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[10%] right-[-5%] w-[35vw] h-[35vw] rounded-full bg-brand/30 blur-[100px] pointer-events-none" />

      <div className="max-w-[1280px] mx-auto px-5 lg:px-10">

        {/* Header */}
        <div className="text-center mb-12 lg:mb-16">
          <div className="inline-flex items-center gap-2 mb-5 px-3.5 py-1.5 rounded-full bg-white/5 border border-white/10 text-brand-gold text-[10px] font-bold uppercase tracking-[0.22em]">
            <span className="h-1.5 w-1.5 rounded-full bg-brand-gold animate-pulse" />
            Bukan kata kami
          </div>
          <h2
            className="font-heading font-bold text-brand-cream tracking-[-0.03em] leading-[0.95]"
            style={{ fontSize: "clamp(2rem, 5.5vw, 4.5rem)" }}
          >
            Kata mereka yang sudah<br />
            <span className="text-brand-gold italic font-medium">buktikan sendiri.</span>
          </h2>
          <p className="mt-4 text-white/40 text-sm max-w-md mx-auto leading-relaxed">
            Apa kata mereka setelah pakai Feedify.
          </p>
        </div>

        {/* Marquee strip */}
        <div className="relative mt-4" data-testid="testimonial-marquee">
          {/* Left fade */}
          <div className="absolute left-0 top-0 bottom-0 w-20 sm:w-32 z-10 pointer-events-none"
            style={{ background: "linear-gradient(to right, #060d09, transparent)" }} />
          {/* Right fade */}
          <div className="absolute right-0 top-0 bottom-0 w-20 sm:w-32 z-10 pointer-events-none"
            style={{ background: "linear-gradient(to left, #060d09, transparent)" }} />

          <div className="overflow-hidden">
            <div className="testimoni-scroll flex gap-5 w-max pb-3">
              {[...TESTIMONIALS, ...TESTIMONIALS].map((t, i) => (
                <div
                  key={i}
                  className="flex-shrink-0 w-[240px] sm:w-[280px] flex flex-col gap-2.5"
                  data-testid={i < TESTIMONIALS.length ? `testimonial-${i + 1}` : undefined}
                >
                  {/* Badge */}
                  <div className="flex justify-center">
                    <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-brand-gold text-brand text-[9px] sm:text-[10px] font-bold shadow-lg shadow-brand-gold/25 whitespace-nowrap">
                      <Lightning size={9} weight="fill" /> {t.badge}
                    </span>
                  </div>

                  {/* Phone frame */}
                  <div
                    className="rounded-[22px] overflow-hidden bg-[#f0f2f5]"
                    style={{ boxShadow: `0 20px 50px -10px rgba(0,0,0,0.8), 0 0 0 1.5px rgba(255,255,255,0.08), 0 0 30px -8px ${t.glow}` }}
                  >
                    {/* Top chrome */}
                    <div className="h-7 bg-[#1c1c1e] flex items-center justify-between px-3">
                      <div className="text-white/30 text-[8px] font-medium">9:41</div>
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-1.5 bg-white/25 rounded-sm" />
                        <div className="w-1 h-1 rounded-full bg-white/25" />
                        <div className="w-3 h-1.5 border border-white/25 rounded-sm" />
                      </div>
                    </div>

                    {/* Full screenshot — no crop */}
                    <img
                      src={t.img}
                      alt={`Testimoni ${(i % TESTIMONIALS.length) + 1}`}
                      className="w-full h-auto block"
                      loading="lazy"
                      onError={(e) => { e.currentTarget.style.display = "none"; }}
                    />

                    {/* Bottom chrome */}
                    <div className="h-5 bg-[#f0f2f5] flex items-center justify-center">
                      <div className="w-16 h-1 bg-black/15 rounded-full" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom trust line */}
        <div className="mt-14 flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-8 text-white/25 text-xs">
          <span className="flex items-center gap-2"><span className="h-px w-8 bg-white/15" />Feedback langsung dari pengguna<span className="h-px w-8 bg-white/15" /></span>
          <span className="hidden sm:block h-3 w-px bg-white/15" />
          <span className="flex items-center gap-2"><Lightning size={10} weight="fill" className="text-brand-gold/40" />Hasil bisa berbeda tiap brand</span>
        </div>
      </div>
    </section>
  );
}

function Pricing() {
  return (
    <section id="pricing" className="relative py-20 lg:py-28 bg-white border-y border-brand-sand" data-testid="pricing">
      <div className="max-w-[1280px] mx-auto px-5 lg:px-10 text-center">
        <div className="text-[10px] uppercase tracking-[0.25em] font-bold text-brand-light mb-4">Harga</div>
        <div className="flex flex-col items-center gap-1 mb-4">
          <div className="relative inline-flex items-center gap-3">
            <span className="font-heading font-bold text-stone-400 relative" style={{ fontSize: "clamp(2rem, 5vw, 3.5rem)" }}>
              Rp 367.000
              <span className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-[3px] bg-red-500 rounded-full" />
            </span>
            <span className="text-base font-black px-3 py-1.5 rounded-full bg-red-500 text-white shadow-lg tracking-wide">−82%</span>
          </div>
          <p className="text-xs text-red-500 font-semibold tracking-wide uppercase">Harga normal agency · kamu bayar jauh lebih murah</p>
        </div>
        <h2 className="font-heading font-bold text-brand tracking-[-0.03em] leading-[0.95] mb-4" style={{ fontSize: "clamp(2rem, 5vw, 4rem)" }}>
          Bayar sekali. <span className="text-brand-gold">Rp 68.000</span> seumur hidup.
        </h2>
        <p className="text-stone-500 text-base lg:text-lg max-w-2xl mx-auto mb-8 leading-relaxed">
          Bukan langganan bulanan. Bukan per-foto. Satu kali bayar Rp 68.000 —
          semua dashboard, semua fitur, selamanya. Konten brand profesional kapan pun kamu mau.
        </p>

        {/* Risk reversal badges */}
        <div className="inline-flex flex-col items-start gap-2 mb-10 text-left mx-auto">
          {[
            "Bayar sekali Rp 68.000 — akses selamanya, bukan per bulan",
            "Semua tools AI langsung terbuka penuh sejak hari pertama",
            "Kalau generate gagal, prompt otomatis bisa dicoba ulang",
            "Tidak ada biaya tambahan, tidak ada hidden fee",
          ].map((line) => (
            <div key={line} className="flex items-center gap-2.5 text-sm text-stone-600">
              <div className="w-5 h-5 rounded-full bg-brand/10 border border-brand/20 flex items-center justify-center flex-shrink-0">
                <span className="text-brand text-[10px] font-bold">✓</span>
              </div>
              {line}
            </div>
          ))}
        </div>

        {/* Urgency */}
        <p className="text-xs text-stone-400 mb-5 italic">
          Setiap hari nunda = kompetitormu makin jauh di depan.
        </p>

        <Link to="/pricing" data-testid="go-to-pricing"
          className="inline-flex items-center gap-2.5 px-10 py-4 bg-brand text-brand-cream hover:bg-brand-light rounded-full font-bold text-lg shadow-xl shadow-brand/20 btn-lift">
          Lihat Paket &amp; Harga <ArrowRight size={20} weight="bold" />
        </Link>
        <div className="mt-5 text-xs text-stone-400">Satu harga · Rp 68.000 · akses seumur hidup · semua dashboard terbuka</div>
      </div>
    </section>
  );
}
/* ============ SUPPORT CHAT ============ */
function SupportChat() {
  return (
    <section id="faq" className="relative py-20 lg:py-32 bg-brand-cream" data-testid="faq">
      <div className="max-w-[1100px] mx-auto px-5 lg:px-10">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 mb-4 px-3 py-1.5 rounded-full bg-brand/8 border border-brand/15 text-brand text-[10px] font-bold uppercase tracking-[0.2em]">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Asisten Online
          </div>
          <h2 className="font-heading font-bold text-brand tracking-[-0.03em] leading-[0.95]" style={{ fontSize: "clamp(2rem, 4.5vw, 4rem)" }}>
            Ada pertanyaan? <br />
            <span className="italic font-medium text-brand-light">Tanya langsung di sini.</span>
          </h2>
          <p className="mt-4 text-stone-500 max-w-md mx-auto text-sm lg:text-base">
            Asisten Feedify siap jawab apa pun — harga, fitur, cara kerja, sampai cocok atau tidaknya buat bisnis kamu.
          </p>
        </div>
        <SupportChatWidget title="" subtitle="" />
      </div>
    </section>
  );
}


/* ============ PAIN AGITATION ============ */
const PAIN_POINTS = [
  "😩 Tiap hari bingung mau posting apa",
  "📉 Feed berantakan, warna nggak konsisten",
  "📸 Foto produk terlihat murahan & seadanya",
  "💸 Mau sewa fotografer/agency, tapi mahal (Rp 500rb–1jt/bulan)",
  "🤳 Nggak punya model buat promosi produk",
  "⏰ Waktu habis buat edit, jualan malah keteteran",
  "😔 Udah posting rutin tapi tetap sepi pembeli",
  "🎨 Nggak ngerti desain, hasil selalu kelihatan amatir",
];

function PainAgitation() {
  return (
    <section
      className="relative py-20 lg:py-28 overflow-hidden"
      style={{ background: "linear-gradient(180deg, #FFFAF5 0%, #FFF5EC 100%)" }}
      data-testid="pain-agitation"
    >
      {/* Subtle warm texture */}
      <div className="absolute inset-0 opacity-[0.025]" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, #c28e6e 1px, transparent 0)", backgroundSize: "28px 28px" }} />

      <div className="relative max-w-[1280px] mx-auto px-5 lg:px-10">

        {/* Header */}
        <div className="text-center mb-12 lg:mb-16">
          <h2
            className="font-heading font-bold text-brand tracking-[-0.03em] leading-[1.05]"
            style={{ fontSize: "clamp(1.8rem, 4.5vw, 3.5rem)" }}
          >
            Kalau kamu ngalamin ini,<br />
            kamu nggak sendirian 👇
          </h2>
        </div>

        {/* Pain grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 mb-14 lg:mb-16">
          {PAIN_POINTS.map((pain) => (
            <div
              key={pain}
              className="bg-white rounded-2xl px-5 py-4 border border-rose-100 shadow-sm flex items-start gap-3 group hover:border-rose-200 hover:shadow-md transition-all duration-200"
            >
              <div className="w-7 h-7 rounded-full bg-rose-50 border border-rose-100 flex items-center justify-center flex-shrink-0 mt-0.5 text-sm">
                ✕
              </div>
              <p className="text-sm text-stone-700 leading-snug font-medium">{pain}</p>
            </div>
          ))}
        </div>

        {/* Transition text */}
        <div className="max-w-2xl mx-auto text-center">
          <div className="rounded-3xl border border-amber-200 bg-amber-50/80 px-8 py-8 mb-8">
            <p className="text-stone-700 leading-relaxed text-base lg:text-lg">
              Masalahnya bukan produkmu jelek.{" "}
              <br className="hidden sm:block" />
              Masalahnya calon pembeli menilai dari tampilan dulu — dan tampilan yang
              berantakan bikin mereka <strong>scroll pergi sebelum lihat produkmu.</strong>
            </p>
            <p className="mt-4 font-heading font-bold text-brand text-lg lg:text-xl">
              Feedify hadir untuk mastiin itu nggak kejadian lagi.
            </p>
          </div>
          <a
            href="#pricing"
            className="inline-flex items-center gap-2.5 px-8 py-4 bg-brand text-brand-cream hover:bg-brand-light rounded-full font-bold text-base shadow-lg shadow-brand/20 btn-lift"
          >
            Aku Mau Konten yang Rapi <ArrowRight size={18} weight="bold" />
          </a>
        </div>
      </div>
    </section>
  );
}

/* ============ COMPARISON TABLE ============ */
const COST_ITEMS = [
  { label: "Fotografer Produk",          cost: "Rp 300.000",  per: "/ sesi",   monthly: 600000,   note: "~2 sesi/bulan = Rp 600.000" },
  { label: "Editor Foto Freelance",      cost: "Rp 100.000",  per: "/ foto",   monthly: 2000000,  note: "~20 foto/bulan = Rp 2.000.000" },
  { label: "Agency Edit Feeds IG",       cost: "Rp 500.000",  per: "/ bulan",  monthly: 500000,   note: "Paket paling murah" },
  { label: "Canva Pro",                  cost: "Rp 200.000",  per: "/ bulan",  monthly: 200000,   note: "Template doang, tetap kerjain sendiri" },
];

const FEATURE_ROWS = [
  { label: "Waktu per konten",  old: "Berjam-jam nunggu revisi",  feedify: "< 30 detik" },
  { label: "Konsistensi brand", old: "Tergantung mood tim",       feedify: "Otomatis on-brand tiap saat" },
  { label: "Skill dibutuhkan",  old: "Harus bisa desain / brief", feedify: "Nggak perlu skill apapun" },
  { label: "Kontrol output",    old: "Terbatas, revisi berbayar", feedify: "Penuh — generate ulang gratis" },
  { label: "Biaya berikutnya",  old: "Tagihan lagi bulan depan",  feedify: "Rp 0 — sudah bayar selamanya" },
];

function ComparisonTable() {
  return (
    <section className="relative py-20 lg:py-28 bg-brand-cream border-y border-brand-sand" data-testid="comparison-table">
      <div className="max-w-[1280px] mx-auto px-5 lg:px-10">

        {/* Header */}
        <div className="max-w-2xl mb-12 lg:mb-16">
          <div className="text-[10px] uppercase tracking-[0.25em] font-bold text-brand-light mb-4">Perbandingan Biaya</div>
          <h2 className="font-heading font-bold text-brand tracking-[-0.03em] leading-[0.95]" style={{ fontSize: "clamp(2rem, 5vw, 4rem)" }}>
            Cara lama habiskan{" "}
            <span className="italic text-red-500">jutaan</span>{" "}
            per bulan.
          </h2>
          <p className="text-stone-500 mt-4 text-base lg:text-lg leading-relaxed">
            Sebelum beli Feedify, coba hitung dulu berapa yang kamu keluarkan sekarang.
          </p>
        </div>

        {/* Cost breakdown card */}
        <div className="grid lg:grid-cols-2 gap-6 mb-10">

          {/* Left: cost breakdown */}
          <div className="rounded-3xl border border-red-100 bg-white overflow-hidden">
            <div className="px-6 py-4 bg-red-50 border-b border-red-100">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-red-500">Pengeluaran cara lama / bulan</p>
            </div>
            <div className="divide-y divide-stone-100">
              {COST_ITEMS.map(({ label, cost, per, note }) => (
                <div key={label} className="px-6 py-4 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-stone-700">{label}</p>
                    <p className="text-[11px] text-stone-400 mt-0.5">{note}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-heading font-bold text-red-500 text-sm">{cost}</p>
                    <p className="text-[10px] text-stone-400">{per}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="px-6 py-4 bg-red-500 flex items-center justify-between">
              <p className="font-heading font-bold text-white text-sm">Total per bulan</p>
              <p className="font-heading font-bold text-white text-xl">Rp 3.300.000</p>
            </div>
            <div className="px-6 py-3 bg-red-600 text-center">
              <p className="text-xs text-white/80">= <strong className="text-white">Rp 39.600.000 per tahun</strong> hanya untuk konten</p>
            </div>
          </div>

          {/* Right: Feedify */}
          <div className="rounded-3xl overflow-hidden shadow-2xl shadow-brand/15" style={{ background: "linear-gradient(160deg, #0B3D2E, #1a5c3a)" }}>
            <div className="px-6 py-4 bg-brand-gold text-center">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand">Feedify — bayar sekali, selesai</p>
            </div>
            <div className="px-6 py-8 flex flex-col items-center justify-center text-center flex-1 gap-4">
              <div>
                <p className="text-white/40 text-sm mb-1">Kamu hemat</p>
                <p className="font-heading font-bold text-brand-gold leading-none" style={{ fontSize: "clamp(2.5rem, 6vw, 4rem)" }}>
                  Rp 3.300.000
                </p>
                <p className="text-white/50 text-sm mt-1">setiap bulan dibanding cara lama</p>
              </div>
              <div className="w-full border-t border-white/10 pt-5">
                <p className="text-white/40 text-xs mb-2 uppercase tracking-wider">Yang kamu bayar</p>
                <p className="font-heading font-bold text-white" style={{ fontSize: "clamp(2.2rem, 5vw, 3.5rem)" }}>Rp 68.000</p>
                <p className="text-brand-gold text-sm font-semibold mt-1">Sekali · Seumur hidup · Tidak ada lagi</p>
              </div>
              <div className="w-full space-y-2 pt-2">
                {["Semua tools langsung aktif", "Generate ulang gratis selamanya", "Update fitur baru otomatis gratis"].map(t => (
                  <div key={t} className="flex items-center gap-2 text-left">
                    <div className="w-4 h-4 rounded-full bg-brand-gold/20 border border-brand-gold/40 flex items-center justify-center flex-shrink-0">
                      <span className="text-brand-gold text-[8px] font-bold">✓</span>
                    </div>
                    <span className="text-white/70 text-xs">{t}</span>
                  </div>
                ))}
              </div>
            </div>
            <a href="#pricing"
              className="block w-full py-4 bg-brand-gold text-brand font-heading font-bold text-center text-base hover:bg-brand-amber transition-colors">
              Ambil Akses Rp 68.000 →
            </a>
          </div>
        </div>

        {/* Feature comparison rows */}
        <div className="rounded-3xl overflow-hidden border border-brand-sand">
          <div className="grid grid-cols-3 bg-stone-50 border-b border-brand-sand">
            <div className="px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-stone-400">Aspek</div>
            <div className="px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-stone-400 border-l border-brand-sand">Cara Lama</div>
            <div className="px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-brand-gold border-l border-brand-sand">✦ Feedify</div>
          </div>
          {FEATURE_ROWS.map(({ label, old, feedify }, i) => (
            <div key={label} className={`grid grid-cols-3 border-b border-brand-sand last:border-0 ${i % 2 === 0 ? "bg-white" : "bg-brand-sand/20"}`}>
              <div className="px-5 py-4 text-xs font-bold text-stone-600">{label}</div>
              <div className="px-5 py-4 text-xs text-stone-400 border-l border-brand-sand/60 flex items-center gap-1.5">
                <span className="text-red-400 flex-shrink-0">✗</span> {old}
              </div>
              <div className="px-5 py-4 text-xs font-semibold text-brand border-l border-brand-sand/60 flex items-center gap-1.5">
                <span className="text-brand-gold flex-shrink-0">✓</span> {feedify}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-10 text-center">
          <a href="#pricing"
            className="inline-flex items-center gap-2 px-7 py-3.5 bg-brand text-brand-cream hover:bg-brand-light rounded-full font-bold text-sm shadow-lg shadow-brand/20 btn-lift">
            Mulai Hemat Sekarang <ArrowRight size={16} weight="bold" />
          </a>
          <p className="mt-3 text-xs text-stone-400">Bayar Rp 68.000 sekali — hemat jutaan tiap bulannya</p>
        </div>
      </div>
    </section>
  );
}

/* ============ FOOTER ============ */
function Footer() {
  return (
    <footer className="relative py-12 lg:py-16 border-t border-brand-sand" data-testid="footer">
      <div className="max-w-[1280px] mx-auto px-5 lg:px-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <Link to="/" className="flex items-center gap-2.5 mb-3">
            <div className="h-9 w-9 rounded-xl bg-brand text-brand-gold flex items-center justify-center">
              <Sparkle size={18} weight="fill" />
            </div>
            <span className="font-heading text-xl font-bold text-brand tracking-tight">Feedify</span>
          </Link>
          <div className="text-xs text-stone-500 max-w-xs">Brand Studio untuk UMKM Indonesia. Made with care in Jakarta.</div>
        </div>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-8 text-sm text-stone-600">
          <a href="#how" className="hover:text-brand">Cara kerja</a>
          <a href="#pricing" className="hover:text-brand">Harga</a>
          <a href="#faq" className="hover:text-brand">FAQ</a>
          <Link to="/login" className="hover:text-brand">Masuk</Link>
        </div>
      </div>
      <div className="max-w-[1280px] mx-auto px-5 lg:px-10 mt-8 pt-6 border-t border-brand-sand text-xs text-stone-500">
        © {new Date().getFullYear()} Feedify. All rights reserved.
      </div>
    </footer>
  );
}
