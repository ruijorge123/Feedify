import { useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { X, ArrowLeft, ArrowRight } from "@phosphor-icons/react";
import { subscribeTourTrigger } from "@/lib/tourTrigger";

export const TOUR_KEY = "feedify_tour_v1_done";

// Desktop target = sidebar nav testid
// Mobile target  = bottom-nav testid (suffix -mobile). "nav-more-mobile" for items only in More menu.
// `route`: page the target only exists on — the tour auto-navigates there first.
// Omit `route` for sidebar/bottom-nav items, which are always mounted (AppShell), on every page.
const STEPS = [
  {
    target:       "dash-visual-studio",
    mobileTarget: "dash-visual-studio",
    route: "/dashboard",
    emoji: "🎨",  title: "Feedify AI Visual Studio",  tag: "Semua Tools Editing Foto",
    desc: "Di halaman Home ada Visual Studio — semua tools editing foto jadi satu: edit foto, hapus background, gabung foto, pasang produk ke model, dan banyak lagi. Generate tanpa batas.",
  },
  {
    target:       "dash-market-research",
    mobileTarget: "dash-market-research",
    route: "/dashboard",
    emoji: "📊",  title: "Riset Pasar AI",   tag: "Cek Potensi Sebelum Buat Konten",
    desc: "Masih di Home, cek tren & potensi pasar dari keyword produkmu — Google Trends real-time, keyword research, dan rekomendasi ide konten. Riset dulu, baru generate konten yang relevan.",
  },
  {
    target:       "nav-banner",
    mobileTarget: "nav-banner-mobile",
    emoji: "🖼️",  title: "Feed & Banner",     tag: "Konten Foto",
    desc: "Buat foto iklan produk berkualitas tinggi. Pilih dari 5 style preset dan 4 ukuran (feed, story, landscape, square) — prompt AI langsung siap dipakai di ChatGPT.",
  },
  {
    target:       "nav-feed-generator",
    mobileTarget: "nav-more-mobile",
    emoji: "⚡",  title: "Feed Generator",     tag: "Batch Generate",
    desc: "Generate 1–7 prompt foto feed sekaligus dalam satu klik. Semua gambar konsisten secara visual — cocok untuk mengisi kalender konten seminggu penuh.",
  },
  {
    target:       "nav-studio",
    mobileTarget: "nav-studio-mobile",
    emoji: "📸",  title: "Studio Komersial",   tag: "Product Photography",
    desc: "Sesi foto produk bergaya commercial photography virtual. Upload foto produkmu, pilih latar dan mood, hasilkan foto katalog berkelas.",
  },
  {
    target:       "nav-carousel",
    mobileTarget: "nav-carousel-mobile",
    emoji: "📑",  title: "Carousel",           tag: "Multi-slide Instagram",
    desc: "Carousel 3–7 slide dengan alur cerita otomatis: hook menarik → problem → solusi → CTA. Setiap slide konsisten dengan Brand DNA kamu.",
  },
  {
    target:       "nav-marketplace",
    mobileTarget: "nav-more-mobile",
    emoji: "🛍️", title: "Marketplace",         tag: "Tokopedia & Shopee",
    desc: "Thumbnail produk siap upload ke Tokopedia & Shopee. Desain clean dan informatif yang terbukti meningkatkan click-through rate listing kamu.",
  },
  {
    target:       "nav-copy",
    mobileTarget: "nav-more-mobile",
    emoji: "✍️", title: "Copywriting AI",      tag: "Caption & Hashtag",
    desc: "Caption Instagram, hashtag, headline, dan deskripsi produk dalam Bahasa Indonesia. Gratis — tidak butuh generate image, langsung tersedia kapan saja.",
  },
  {
    target:       "nav-products",
    mobileTarget: "nav-more-mobile",
    emoji: "📦",  title: "Product Knowledge",  tag: "Database Produk",
    desc: "Simpan data produk: nama, varian, keunggulan, bahan, dan target market. Feedify otomatis pakai info ini saat generate — tidak perlu isi ulang tiap kali.",
  },
  {
    target:       "nav-brand-kit",
    mobileTarget: "nav-more-mobile",
    emoji: "🧬",  title: "Brand DNA",          tag: "Identitas Brand",
    desc: "Atur warna brand, gaya visual, tone, dan target audiens sekali saja. Semua dashboard otomatis menggunakan Brand DNA — konten selalu on-brand tanpa setting ulang.",
  },
];

/* ─── CSS injected once into <head> ─────────────────────────────────────── */
const TOUR_CSS = `
@keyframes _tbd  { from{opacity:0} to{opacity:1} }
@keyframes _tcrd { from{opacity:0;transform:translateX(-18px) scale(.96)} to{opacity:1;transform:translateX(0) scale(1)} }
@keyframes _tcrm { from{opacity:0;transform:scale(.95)} to{opacity:1;transform:scale(1)} }
@keyframes _tstep{ from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
@keyframes _tspot{
  0%,100%{box-shadow:0 0 0 9999px rgba(0,0,0,.74),0 0 0 2px #E5C158,0 0 10px 2px rgba(229,193,88,.25)}
  50%    {box-shadow:0 0 0 9999px rgba(0,0,0,.74),0 0 0 3px #E5C158,0 0 28px 8px rgba(229,193,88,.55)}
}
._tbd   { animation: _tbd   .25s ease both }
._tcrd  { animation: _tcrd  .38s cubic-bezier(.22,1,.36,1) both }
._tcrm  { animation: _tcrm  .32s cubic-bezier(.22,1,.36,1) both }
._tstep { animation: _tstep .28s cubic-bezier(.22,1,.36,1) both }
._tspot { animation: _tspot 2.4s ease-in-out infinite }
`;

function injectCSS() {
  if (!document.getElementById("_tour_css")) {
    const s = document.createElement("style");
    s.id = "_tour_css";
    s.textContent = TOUR_CSS;
    document.head.appendChild(s);
  }
}

function getRect(testid) {
  const el = document.querySelector(`[data-testid="${testid}"]`);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return (r.width === 0 && r.height === 0) ? null : r;
}

export function resetTour() { localStorage.removeItem(TOUR_KEY); }

/* ─── Component ──────────────────────────────────────────────────────────── */
export default function ProductTour({ forceOpen = false, onClose }) {
  const [step,    setStep]    = useState(0);
  const [visible, setVisible] = useState(false);
  const [rect,    setRect]    = useState(null);
  const [stepKey, setStepKey] = useState(0);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => { injectCSS(); }, []);

  /* Auto-show once for new users */
  useEffect(() => {
    if (forceOpen) { setStep(0); setStepKey(0); setVisible(true); return; }
    if (!localStorage.getItem(TOUR_KEY)) {
      const t = setTimeout(() => setVisible(true), 900);
      return () => clearTimeout(t);
    }
  }, [forceOpen]);

  /* External trigger — e.g. AdminPage's "Lihat Tour" button, which lives on a
     different page than steps that require /dashboard. Using this shared instance
     (mounted once in AppShell) instead of a per-page tour means the tour survives
     the cross-page navigation below instead of unmounting with the triggering page. */
  useEffect(() => {
    return subscribeTourTrigger(() => { setStep(0); setStepKey(0); setVisible(true); });
  }, []);

  /* Navigate to the step's required page (if any), then measure + spotlight the target.
     Cross-page steps need longer/more retries so we catch the lazy-loaded page once it mounts. */
  useEffect(() => {
    if (!visible) return;
    const cur = STEPS[step];
    const isDesktop = window.innerWidth >= 1024;
    const target = isDesktop ? cur.target : cur.mobileTarget;

    const needsNav = cur.route && location.pathname !== cur.route;
    if (needsNav) navigate(cur.route);

    const measure = () => {
      const el = document.querySelector(`[data-testid="${target}"]`);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
      setRect(getRect(target));
    };

    measure();
    const delays = needsNav ? [80, 200, 400, 650, 950] : [250, 550];
    const timers = delays.map((d) => setTimeout(measure, d));

    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      timers.forEach(clearTimeout);
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [visible, step, location.pathname, navigate]);

  const goTo = useCallback((i) => { setStep(i); setStepKey(k => k + 1); }, []);

  const handleClose = useCallback(() => {
    localStorage.setItem(TOUR_KEY, "1");
    setVisible(false);
    onClose?.();
  }, [onClose]);

  const handleNext = useCallback(() => {
    step < STEPS.length - 1 ? goTo(step + 1) : handleClose();
  }, [step, goTo, handleClose]);

  const handlePrev = useCallback(() => {
    step > 0 && goTo(step - 1);
  }, [step, goTo]);

  if (!visible) return null;

  const cur       = STEPS[step];
  const isLast    = step === STEPS.length - 1;
  const isDesktop = window.innerWidth >= 1024;

  /* ── Card sizing & positioning ────────────────────────────────────────── */
  const SIDEBAR_W = 256;
  const CARD_W    = 316;
  const GAP       = 18;

  let cardLeft, cardTop, cardBottom, cardWidth, cardClass;

  if (isDesktop) {
    cardWidth  = CARD_W;
    cardLeft   = SIDEBAR_W + GAP;
    cardBottom = undefined;
    cardTop    = rect
      ? Math.max(16, Math.min(rect.top + rect.height / 2 - 155, window.innerHeight - 370))
      : Math.round((window.innerHeight - 340) / 2);
    cardClass  = "_tcrd";
  } else {
    // ⚠️ Use pixel-based left (NOT "50%") so CSS animation transform doesn't conflict
    cardWidth  = Math.min(CARD_W, window.innerWidth - 32);
    cardLeft   = Math.round((window.innerWidth - cardWidth) / 2);
    cardBottom = 96;
    cardTop    = undefined;
    cardClass  = "_tcrm";
  }

  const pct = ((step + 1) / STEPS.length) * 100;

  return (
    <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 250 }}>

      {/* ── Backdrop ── */}
      {rect ? (
        /* Spotlight: box-shadow creates the dark veil with a transparent hole over the target */
        <div
          className="_tspot absolute rounded-xl pointer-events-auto"
          style={{ left: rect.left - 5, top: rect.top - 5,
            width: rect.width + 10, height: rect.height + 10, zIndex: 1 }}
          onClick={handleClose}
        />
      ) : (
        /* Solid dark backdrop when no rect (items not visible / in More menu) */
        <div
          className="_tbd absolute inset-0 pointer-events-auto"
          style={{ background: "rgba(0,0,0,0.74)" }}
          onClick={handleClose}
        />
      )}

      {/* ── Tour card ── */}
      <div
        className={`${cardClass} absolute pointer-events-auto bg-white`}
        style={{
          left: cardLeft, top: cardTop, bottom: cardBottom, width: cardWidth,
          zIndex: 2, borderRadius: 20,
          boxShadow: "0 20px 60px rgba(0,0,0,0.30), 0 4px 16px rgba(0,0,0,0.12)",
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Arrow → sidebar (desktop + rect only) */}
        {isDesktop && rect && (
          <div style={{
            position: "absolute", left: -11, top: 28, width: 0, height: 0,
            borderTop: "9px solid transparent", borderBottom: "9px solid transparent",
            borderRight: "11px solid #0B3D2E",
          }} />
        )}

        {/* ── Header bar ── */}
        <div style={{ background: "#0B3D2E", padding: "13px 18px", borderRadius: "20px 20px 0 0" }}
          className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span style={{ color: "#E5C158", fontSize: 12 }}>✦</span>
            <span style={{ color: "#E5C158", fontSize: 10.5, fontWeight: 700,
              letterSpacing: "0.16em", textTransform: "uppercase" }}>
              Tur Fitur Feedify
            </span>
          </div>
          <button onClick={handleClose} aria-label="Tutup"
            style={{ color: "rgba(255,255,255,0.4)", background: "none", border: "none",
              cursor: "pointer", lineHeight: 1, padding: 2 }}
            onMouseEnter={e => e.currentTarget.style.color = "white"}
            onMouseLeave={e => e.currentTarget.style.color = "rgba(255,255,255,0.4)"}>
            <X size={14} weight="bold" />
          </button>
        </div>

        {/* ── Animated progress bar ── */}
        <div style={{ background: "rgba(11,61,46,0.08)", height: 3 }}>
          <div style={{
            height: 3, background: "#E5C158", width: `${pct}%`,
            borderRadius: "0 2px 2px 0",
            transition: "width 0.42s cubic-bezier(0.4,0,0.2,1)",
          }} />
        </div>

        {/* ── Step body — key forces re-mount → slide-up animation on each step ── */}
        <div key={stepKey} className="_tstep" style={{ padding: "20px 20px 18px" }}>

          {/* Tag + step counter */}
          <div className="flex items-center justify-between" style={{ marginBottom: 14 }}>
            <span style={{
              background: "rgba(11,61,46,0.09)", color: "#0B3D2E",
              fontSize: 10.5, fontWeight: 700, padding: "3px 10px",
              borderRadius: 99, letterSpacing: "0.04em",
            }}>
              {cur.tag}
            </span>
            <span style={{ color: "#A8A29E", fontSize: 11, fontWeight: 600 }}>
              {step + 1} / {STEPS.length}
            </span>
          </div>

          {/* Emoji + Title */}
          <div className="flex items-center gap-3" style={{ marginBottom: 10 }}>
            <span style={{ fontSize: 36, lineHeight: 1, flexShrink: 0 }}>{cur.emoji}</span>
            <h3 style={{
              fontFamily: "'Outfit', sans-serif", fontWeight: 800,
              fontSize: 19, color: "#0B3D2E", lineHeight: 1.2, margin: 0,
            }}>
              {cur.title}
            </h3>
          </div>

          {/* Description */}
          <p style={{
            fontSize: 13, color: "#57534E", lineHeight: 1.65,
            margin: 0, minHeight: 66,
          }}>
            {cur.desc}
          </p>

          {/* ── Progress dots ── */}
          <div className="flex items-center gap-1.5" style={{ marginTop: 18, marginBottom: 18 }}>
            {STEPS.map((_, i) => (
              <button key={i} onClick={() => goTo(i)} aria-label={`Step ${i + 1}`}
                style={{
                  height: 6, borderRadius: 99, border: "none", cursor: "pointer", padding: 0,
                  width: i === step ? 22 : 7,
                  background: i === step ? "#0B3D2E" : i < step ? "rgba(11,61,46,0.28)" : "#E7E5E4",
                  transition: "width 0.3s ease, background 0.3s ease",
                }} />
            ))}
          </div>

          {/* ── Actions ── */}
          <div className="flex items-center justify-between">
            <button
              onClick={step === 0 ? handleClose : handlePrev}
              style={{ display: "flex", alignItems: "center", gap: 4,
                background: "none", border: "none", cursor: "pointer",
                fontSize: 13, color: "#A8A29E", padding: "6px 0" }}
              onMouseEnter={e => e.currentTarget.style.color = "#78716C"}
              onMouseLeave={e => e.currentTarget.style.color = "#A8A29E"}
            >
              {step > 0 && <ArrowLeft size={12} weight="bold" />}
              {step === 0 ? "Lewati" : "Kembali"}
            </button>

            <button
              onClick={handleNext}
              style={{
                display: "flex", alignItems: "center", gap: 7,
                background: "#0B3D2E", color: "white",
                fontSize: 13.5, fontWeight: 700,
                padding: "10px 22px", borderRadius: 99,
                border: "none", cursor: "pointer",
                transition: "background .18s, transform .12s",
              }}
              onMouseEnter={e => e.currentTarget.style.background = "#0a3228"}
              onMouseLeave={e => e.currentTarget.style.background = "#0B3D2E"}
              onMouseDown={e => e.currentTarget.style.transform = "scale(0.96)"}
              onMouseUp={e => e.currentTarget.style.transform = "scale(1)"}
            >
              {isLast
                ? "Selesai 🎉"
                : <><span>Lanjut</span><ArrowRight size={13} weight="bold" /></>
              }
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
