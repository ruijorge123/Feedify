import { Link } from "react-router-dom";
import { useState, useEffect } from "react";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import {
  Sparkle, ArrowRight, ArrowUpRight,
  CaretRight, Lightning,
} from "@phosphor-icons/react";
import SupportChatWidget from "@/components/SupportChatWidget";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-brand-cream text-stone-800 overflow-x-hidden selection:bg-brand-gold selection:text-brand relative">
      {/* Persistent mesh gradient blobs — desktop only (heavy blur crashes mobile GPU) */}
      <div className="hidden sm:block pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="absolute top-[30%] left-[-8%] w-[55vw] h-[55vw] rounded-full bg-brand/[0.04] blur-[150px]" />
        <div className="absolute top-[55%] right-[-10%] w-[45vw] h-[45vw] rounded-full bg-brand-gold/[0.04] blur-[130px]" />
        <div className="absolute bottom-[10%] left-[20%] w-[40vw] h-[40vw] rounded-full bg-brand/[0.03] blur-[120px]" />
      </div>
      <DarkHero />
      <Marquee />
      <Transformation />
      <HowItWorks />
      <Bento />
      <Testimonials />
      <Pricing />
      <SupportChat />
      <Footer />
    </div>
  );
}

/* ============ DARK HERO — full cinematic ============ */
function DarkHero() {
  const { user } = useAuth();
  return (
    <div className="relative min-h-screen min-h-[100dvh] overflow-hidden flex flex-col" data-testid="hero"
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
          <a href="#bento" className="hover:text-white transition-colors">Fitur</a>
          <a href="#pricing" className="hover:text-white transition-colors">Harga</a>
          <a href="#faq" className="hover:text-white transition-colors">FAQ</a>
        </div>

        <div className="flex items-center gap-2">
          <Link to="/login" data-testid="landing-login-btn"
            className="hidden sm:inline-flex px-4 py-2 text-sm font-medium text-white/60 hover:text-white rounded-full transition-all">
            Masuk
          </Link>
          <a href="#pricing" data-testid="nav-pricing-cta"
            className="inline-flex items-center gap-1.5 px-5 py-2.5 text-sm font-semibold bg-brand-gold text-brand hover:bg-brand-amber rounded-full transition-all shadow-lg shadow-brand-gold/20">
            Mulai Sekarang <ArrowRight size={14} weight="bold" />
          </a>
        </div>
      </nav>

      {/* HERO CONTENT */}
      <div className="relative z-10 flex-1 flex flex-col justify-center max-w-[1280px] mx-auto w-full px-5 lg:px-10 pt-8 pb-16 lg:pb-24">

        {/* Eyebrow */}
        <div className="inline-flex items-center gap-2 mb-8 px-3.5 py-1.5 rounded-full bg-white/5 border border-white/10 text-brand-gold text-[10px] font-bold uppercase tracking-[0.22em] w-fit" data-testid="hero-eyebrow">
          <span className="h-1.5 w-1.5 rounded-full bg-brand-gold animate-pulse" />
          Brand Studio · Untuk UMKM Indonesia
        </div>

        {/* Main headline — HUGE */}
        <h1
          className="font-heading font-bold text-white tracking-[-0.04em] leading-[0.9] max-w-[16ch]"
          style={{ fontSize: "clamp(3rem, 9vw, 8.5rem)" }}
          data-testid="hero-headline"
        >
          Konten brand yang bikin orang{" "}
          <span className="text-brand-gold italic font-medium">berhenti scroll.</span>
        </h1>

        {/* Sub + CTA row */}
        <div className="mt-10 lg:mt-14 flex flex-col lg:flex-row lg:items-end gap-8 lg:gap-16">
          <div className="max-w-md">
            <p className="text-white/60 leading-relaxed text-base lg:text-lg" data-testid="hero-sub">
              Calon pembeli menilai brand kamu dalam 3 detik pertama.
              Feedify pastikan 3 detik itu selalu berkesan — visual profesional,
              konsisten, siap posting. Cukup ceritakan brandmu, sisanya kami yang kerjakan.
            </p>
            <div className="mt-8 flex items-center gap-4 flex-wrap">
              <a href="#pricing" data-testid="hero-cta"
                className="inline-flex items-center gap-2 px-7 py-4 bg-brand-gold text-brand hover:bg-brand-amber rounded-full font-bold text-base shadow-2xl shadow-brand-gold/25 btn-lift">
                Lihat Paket & Mulai <ArrowRight size={18} weight="bold" />
              </a>
              <Link to="/login" data-testid="hero-cta-secondary"
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-white/50 hover:text-white transition-colors">
                Sudah punya akun?
                <ArrowUpRight size={14} weight="bold" />
              </Link>
            </div>
          </div>

          {/* Stats row */}
          <div className="flex items-center gap-8 lg:gap-12 lg:pb-1">
            <HeroStat num="< 30s" label="Per gambar" />
            <div className="h-10 w-px bg-white/10" />
            <HeroStat num="7" label="Dashboard" />
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
  { img: "/skincare-moisturizer.png", label: "Skincare", tag: "Moisturizer" },
  { img: "/cleanser.png", label: "Skincare", tag: "Cleanser", contain: true },
  { img: "/minuman-kaleng.png", label: "Minuman", tag: "Beverage", contain: true },
  { img: "/minuman-cup.png", label: "F&B", tag: "Minuman Cup", contain: true },
  { img: "/minuman-kopi.png", label: "Café", tag: "Menu Kopi", contain: true },
  { img: "/fashion-shirt.png", label: "Fashion", tag: "Pakaian" },
  { img: "/makanan.png", label: "Kuliner", tag: "Rice Bowl", contain: true },
  { img: "/aksesoris.png", label: "Aksesoris", tag: "Perhiasan", contain: true },
  { img: "/freese-after.png", label: "Skincare", tag: "Body Lotion", contain: true },
];

function ContentStrip() {
  const items = [...STRIP_ITEMS, ...STRIP_ITEMS];
  return (
    <div className="mt-16 lg:mt-20 relative" data-testid="hero-result-showcase">
      <div className="absolute left-0 top-0 bottom-0 w-24 z-10 pointer-events-none" style={{ background: "linear-gradient(to right, #060d09, transparent)" }} />
      <div className="absolute right-0 top-0 bottom-0 w-24 z-10 pointer-events-none" style={{ background: "linear-gradient(to left, #060d09, transparent)" }} />
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
    <section className="relative overflow-hidden bg-brand" data-testid="transformation">
      {/* Subtle texture */}
      <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)", backgroundSize: "32px 32px" }} />
      <div className="absolute top-0 right-0 w-[50vw] h-[60vh] rounded-full bg-brand-gold/8 blur-[120px] pointer-events-none" />

      <div className="relative max-w-[1280px] mx-auto px-5 lg:px-10 py-20 lg:py-32">

        {/* Top — headline */}
        <div className="max-w-3xl mb-14 lg:mb-20">
          <div className="inline-flex items-center gap-2 mb-6 px-3 py-1.5 rounded-full bg-brand-gold/15 border border-brand-gold/25 text-brand-gold text-[10px] font-bold uppercase tracking-[0.2em]">
            <Sparkle size={10} weight="fill" /> Hasil nyata
          </div>
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
              <img src="/freese-before.png" alt="Foto produk polos"
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
              <img src="/freese-after.png" alt="Hasil feed profesional"
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

        {/* Stats row */}
        <div className="mt-12 lg:mt-16 pt-10 border-t border-white/10 grid grid-cols-2 md:grid-cols-4 gap-6 lg:gap-10">
          {[
            { num: "< 30 dtk", label: "Generate satu foto" },
            { num: "7", label: "Dashboard konten lengkap" },
            { num: "999+", label: "Library inspirasi" },
            { num: "1×", label: "Setup Brand DNA selamanya" },
          ].map(({ num, label }) => (
            <div key={label}>
              <div className="font-heading text-2xl lg:text-3xl font-bold text-brand-gold">{num}</div>
              <div className="text-brand-cream/50 text-xs lg:text-sm mt-1 leading-snug">{label}</div>
            </div>
          ))}
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
    { n: "02", label: "Generate", title: "Pilih dashboard. Isi pesan inti.", desc: "Banner, carousel, food menu, atau copywriting. Anda hanya menulis apa yang ingin disampaikan — Feedify menyusun spesifikasi visual setara art director." },
    { n: "03", label: "Hasil", title: "Foto siap posting keluar otomatis.", desc: "Feedify mengolah spesifikasi visual dan langsung menghasilkan gambar — konsisten dengan Brand DNA Anda, siap diunduh dan diposting." },
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

/* ============ BENTO ============ */
function Bento() {
  return (
    <section id="bento" className="relative py-24 lg:py-36" data-testid="bento">
      <div className="max-w-[1280px] mx-auto px-5 lg:px-10">
        <div className="max-w-3xl mb-16 lg:mb-20">
          <div className="text-[10px] uppercase tracking-[0.25em] font-bold text-brand-light mb-4">Yang Anda dapat</div>
          <h2 className="font-heading font-bold text-brand tracking-[-0.03em] leading-[0.95]" style={{ fontSize: "clamp(2rem, 5.5vw, 4.5rem)" }}>
            Tujuh dashboard. <br /><span className="italic font-medium text-brand-light">Satu sistem brand yang utuh.</span>
          </h2>
        </div>
        <div className="grid grid-cols-6 gap-4 lg:gap-5 auto-rows-[minmax(180px,auto)]">
          <div className="col-span-6 lg:col-span-4 lg:row-span-2 rounded-3xl bg-brand text-brand-cream p-8 lg:p-10 relative overflow-hidden" data-testid="bento-brand-dna">
            <div className="absolute -top-20 -right-20 h-72 w-72 rounded-full bg-brand-gold/20 blur-3xl" />
            <div className="relative h-full flex flex-col justify-between gap-12">
              <div>
                <div className="text-[10px] uppercase tracking-[0.25em] font-bold text-brand-gold mb-5">Inti Sistem</div>
                <h3 className="font-heading font-bold tracking-[-0.02em] leading-[1.0]" style={{ fontSize: "clamp(1.8rem, 3.5vw, 3rem)" }}>Brand Visual DNA.</h3>
                <p className="mt-5 text-brand-cream/80 leading-relaxed max-w-md text-base">
                  Palet warna, tipografi, gaya, dan tone — tersimpan permanen. Setiap output di setiap dashboard otomatis konsisten dengan identitas Anda.
                </p>
              </div>
              <div className="bg-brand-cream/10 backdrop-blur border border-brand-cream/15 rounded-2xl p-5 flex items-center gap-4">
                <div className="h-12 w-12 rounded-xl flex items-center justify-center font-heading font-bold text-brand-gold text-lg bg-brand-gold/20 border border-brand-gold/30">F</div>
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] uppercase tracking-[0.2em] text-brand-cream/60 font-bold">Active brand</div>
                  <div className="font-heading text-lg font-bold">Feedify</div>
                </div>
                <div className="flex gap-1">
                  {["#0B3D2E","#FDFBF7","#E5C158"].map(c => <div key={c} className="h-8 w-8 rounded-lg ring-1 ring-white/20" style={{ background: c }} />)}
                </div>
              </div>
            </div>
          </div>
          <BentoTile testid="bento-banner" tag="Generator" title="Feed Post & Banner" desc="5 style preset, 5 placement, 4 aspect ratio. Visual setara brief art director." span="col-span-3 lg:col-span-2" />
          <BentoTile testid="bento-carousel" tag="Generator" title="Carousel Storytelling" desc="3–7 slide dengan role: hook, problem, solution, CTA — narasi siap pakai." span="col-span-3 lg:col-span-2" />
          <BentoTile testid="bento-copy" tag="Feedify Text" title="Copywriting Bahasa Indonesia" desc="Headline, 3 gaya caption, CTA, hashtag, hook lines. Natural & persuasif." span="col-span-6 lg:col-span-3" accent />
          <BentoTile testid="bento-food" tag="Khusus F&B" title="F&B Menu Visual" desc="Food photography prompt. 5 mood, 4 layout — warung, café, frozen food." span="col-span-3 lg:col-span-3" />
          <BentoTile testid="bento-grid" tag="Planning" title="Feed Grid Planner" desc="3×3 layout dengan drag-drop + color tagging. Visualisasi feed sebelum posting." span="col-span-3 lg:col-span-2" />
          <BentoTile testid="bento-consistency" tag="QA · Feedify Vision" title="Consistency Checker" desc="Upload hasil Feedify, dapat skor konsistensi vs Brand DNA + saran perbaikan." span="col-span-3 lg:col-span-2" />
          <BentoTile testid="bento-calendar" tag="Planning" title="Calendar Planner" desc="Jadwalkan konten ke kalender, notifikasi pengingat via WA atau Telegram." span="col-span-6 lg:col-span-2" />
        </div>
      </div>
    </section>
  );
}

function BentoTile({ testid, tag, title, desc, span, accent }) {
  return (
    <div className={`${span} rounded-3xl p-6 lg:p-7 flex flex-col justify-between gap-6 relative overflow-hidden ${accent ? "bg-brand-gold/20 border border-brand-gold/40" : "bg-white border border-brand-sand"}`} data-testid={testid}>
      <div>
        <div className="text-[10px] uppercase tracking-[0.22em] font-bold text-brand-light mb-3">{tag}</div>
        <h3 className="font-heading font-bold text-brand tracking-tight leading-[1.1]" style={{ fontSize: "clamp(1.1rem, 1.8vw, 1.5rem)" }}>{title}</h3>
        <p className="mt-2.5 text-stone-600 text-sm leading-relaxed">{desc}</p>
      </div>
      <CaretRight size={18} weight="bold" className="text-brand-light/40" />
    </div>
  );
}


/* ============ TESTIMONIALS ============ */
function Testimonials() {
  const items = [
    { quote: "Brand Profile sekali isi, langsung dipakai untuk banner, carousel, sampai caption. Konten Instagram kami akhirnya kelihatan satu identitas — bukan campur aduk seperti sebelumnya.", name: "Anisa Rachmawati", business: "Voyoa Skincare · Bandung", metric: "Posting 5× lebih konsisten / minggu" },
    { quote: "Sebelumnya saya bayar freelancer 2,5 juta per bulan. Sekarang saya kerjakan sendiri pakai Feedify, dan hasilnya justru lebih sesuai brand — karena saya yang paling tahu produk saya.", name: "Rizki Pratama", business: "Kopi Lokal · Yogyakarta", metric: "Hemat ± Rp 28 juta / tahun" },
    { quote: "Yang paling membantu Consistency Checker. Saya jadi tahu kapan hasil Feedify melenceng dari brand saya, dengan saran perbaikan yang konkret. Bukan tebak-tebakan lagi.", name: "Sari Maharani", business: "Linen by Sari · Jakarta", metric: "Konsistensi feed naik 87%" },
  ];
  return (
    <section className="relative py-24 lg:py-36 overflow-hidden" style={{ background: "radial-gradient(ellipse 120% 60% at 80% 100%, #0f3d22 0%, #060d09 55%, #060d09 100%)" }} data-testid="testimonials">
      <div className="max-w-[1280px] mx-auto px-5 lg:px-10">
        <div className="max-w-3xl mb-16 lg:mb-20">
          <div className="text-[10px] uppercase tracking-[0.25em] font-bold text-brand-gold/70 mb-4">Cerita Pengguna</div>
          <h2 className="font-heading font-bold text-brand-cream tracking-[-0.03em] leading-[0.95]" style={{ fontSize: "clamp(2rem, 5.5vw, 4.5rem)" }}>
            UMKM yang naik kelas <br /><span className="italic font-medium text-brand-gold">dengan brand mereka sendiri.</span>
          </h2>
        </div>
        <div className="grid md:grid-cols-3 gap-8 lg:gap-12">
          {items.map((t, i) => (
            <figure key={i} className="border-t border-white/10 pt-6" data-testid={`testimonial-${i + 1}`}>
              <blockquote className="font-heading text-brand-cream/90 font-medium tracking-tight leading-[1.25]" style={{ fontSize: "clamp(1.05rem, 1.5vw, 1.3rem)" }}>
                &ldquo;{t.quote}&rdquo;
              </blockquote>
              <figcaption className="mt-7 flex items-center gap-3">
                <div className="h-11 w-11 rounded-full flex items-center justify-center font-heading font-bold text-brand-gold text-base bg-white/10 border border-white/15">{t.name[0]}</div>
                <div>
                  <div className="font-heading font-bold text-brand-cream text-sm">{t.name}</div>
                  <div className="text-xs text-brand-cream/50">{t.business}</div>
                </div>
              </figcaption>
              <div className="mt-4 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/8 border border-white/10 text-brand-gold text-[10px] font-bold uppercase tracking-[0.15em]">
                <Lightning size={10} weight="fill" /> {t.metric}
              </div>
            </figure>
          ))}
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
        <h2 className="font-heading font-bold text-brand tracking-[-0.03em] leading-[0.95] mb-4" style={{ fontSize: "clamp(2rem, 5vw, 4rem)" }}>
          Mulai dari <span className="text-brand-gold">Rp 1.500</span> per konten.
        </h2>
        <p className="text-stone-500 text-base lg:text-lg max-w-2xl mx-auto mb-4 leading-relaxed">
          Konten yang tidak konsisten bikin calon pembeli ragu — bahkan sebelum mereka lihat produknya.
          Feedify hasilkan visual profesional dalam 30 detik, sesuai brand Anda, mulai Rp 1.500 per foto.
        </p>
        <div className="flex flex-wrap justify-center gap-x-6 gap-y-1 text-xs text-stone-400 mb-10">
          <span>❖ Tidak ada langganan bulanan</span>
          <span>❖ Kredit tidak pernah expired</span>
          <span>❖ Akses penuh semua fitur</span>
          <span>❖ Bayar sesuai kebutuhan</span>
        </div>
        <Link to="/pricing" data-testid="go-to-pricing"
          className="inline-flex items-center gap-2.5 px-10 py-4 bg-brand text-brand-cream hover:bg-brand-light rounded-full font-bold text-lg shadow-xl shadow-brand/20 btn-lift">
          Lihat Paket &amp; Harga <ArrowRight size={20} weight="bold" />
        </Link>
        <div className="mt-5 text-xs text-stone-400">4 pilihan paket · mulai Rp 15.000 · akses penuh sejak hari pertama</div>
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
          <a href="#bento" className="hover:text-brand">Fitur</a>
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
