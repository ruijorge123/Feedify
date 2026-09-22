import { Link, useNavigate } from "react-router-dom";
import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  Sparkle, ArrowRight, ArrowUpRight, Check, CaretDown,
  WhatsappLogo, InstagramLogo, List, X, Images, Storefront,
  Camera, Stack, FilmSlate, ChatCircleDots, Clock, ShieldCheck,
  SpeakerSimpleSlash, SpeakerSimpleHigh, SignOut,
} from "@phosphor-icons/react";
import SupportChatWidget from "@/components/SupportChatWidget";
import WaitingListForm from "@/components/WaitingListForm";
import FeedifyLogo from "@/components/FeedifyLogo";
import InstallPWAButton from "@/components/InstallPWAButton";
import { useAgencyConfig, formatRupiah, waLink } from "@/lib/agency";
import WORKS from "@/lib/portfolioManifest";

/* ────────────────────────────────────────────────────────────────────────────
   Real work samples. These are actual files in /public, not placeholders —
   a sales page for a visual service has to show the visuals. Swap the arrays
   when new client work is cleared for publication; nothing else needs touching.
   ──────────────────────────────────────────────────────────────────────────── */
/**
 * Real client feeds, shown as the phone screens they actually live on.
 *
 * These are screenshots of finished Instagram profiles, not grids assembled from
 * loose photos: the proof is that the nine posts hang together AND that a real
 * account looks like this, which a bare 3x3 cannot show.
 *
 * To publish another: export the profile, convert to webp, add a line.
 */
/** Real, computed from the generated manifest — never a number typed by hand. */
const PORTFOLIO_COUNT = WORKS.length;

const FEED_MOCKUPS = [
  { src: "/feed1.webp", cat: "Skincare Natural" },
  { src: "/feed2.webp", cat: "Minuman Kemasan" },
  { src: "/feed3.webp", cat: "Lip Care" },
  { src: "/feed4.webp", cat: "Parfum" },
  { src: "/feed5.webp", cat: "Perlengkapan Bayi" },
  { src: "/feed6.webp", cat: "Serum Vitamin C" },
];

/** Screenshots of real client chats — social proof that costs nothing to show. */
const TESTIMONI = [
  { img: "/testimonihalamanawal/testimoni-skincare.webp", cat: "Skincare" },
  { img: "/testimonihalamanawal/testimoni-bodylotion.webp", cat: "Body Lotion" },
  { img: "/testimonihalamanawal/testimoni-kaos.webp", cat: "Fashion" },
  { img: "/testimonihalamanawal/testimoni-hiljab.webp", cat: "Hijab" },
];

const SHOWCASE = [
  {
    id: "feed",
    icon: Images,
    label: "Feed Instagram",
    desc: "Satu feed yang nyambung dari atas ke bawah, bukan foto satuan.",
    images: ["/skincare-serum2.webp", "/skincare-moisturizer2.webp", "/cleanser3.webp"],
  },
  {
    id: "studio",
    icon: Camera,
    label: "Foto Produk Studio",
    desc: "Produkmu difoto ulang seolah masuk studio profesional.",
    images: ["/studio/serum2.webp", "/studio/bodylotion1.webp", "/studio/perfume9.webp"],
  },
  {
    id: "marketplace",
    icon: Storefront,
    label: "Thumbnail Marketplace",
    desc: "Foto etalase Shopee & TikTok Shop yang bikin orang berhenti scroll.",
    images: ["/marketplace/facemist1.webp", "/marketplace/clay1.webp", "/marketplace/babylotion.webp"],
  },
  {
    id: "carousel",
    icon: Stack,
    label: "Carousel",
    desc: "Cerita bertahap yang bikin orang geser sampai slide terakhir.",
    images: ["/carousel/bodymist 3 slides/1.webp", "/carousel/bodymist 3 slides/2.webp", "/carousel/bodymist 3 slides/3.webp"],
  },
];

const PAINS = [
  { t: "Tiap hari bingung mau posting apa", d: "Buka Instagram, mau posting, tapi tidak tahu harus bikin konten apa lagi." },
  { t: "Foto produk seadanya", d: "Difoto di atas meja pakai HP, hasilnya kalah jauh dari kompetitor sebelah." },
  { t: "Feed berantakan", d: "Warna dan gaya beda-beda tiap posting, brand jadi tidak punya wajah." },
  { t: "Tidak sempat", d: "Waktumu habis untuk produksi, packing, dan balas chat — bukan untuk bikin konten." },
];

const STEPS = [
  { n: "01", t: "Pilih paket", d: "Bayar lewat QRIS, prosesnya sebentar. Tim kami langsung tahu pesananmu masuk." },
  { n: "02", t: "Isi data produk sekali", d: "Upload foto produk dan ceritakan brand-mu. Cukup sekali di awal, tersimpan selamanya." },
  { n: "03", t: "Terima konten jadi", d: "Tim kami hubungi lewat WhatsApp, diskusi, lalu kirim kontennya lengkap dengan caption." },
];

const FAQS = [
  { q: "Saya belum punya foto produk yang bagus, gimana?", a: "Justru itu yang paling sering kami kerjakan. Cukup kirim foto dari HP dengan background seadanya — yang penting produknya terlihat jelas dan tulisan di labelnya terbaca. Sisanya tim kami yang urus." },
  { q: "Kontennya nanti dikirim ke mana?", a: "Lewat WhatsApp, langsung ke nomormu, dalam kualitas penuh. Progres berapa konten yang sudah jadi juga bisa kamu pantau kapan saja di dashboard." },
  { q: "Caption-nya dibuatkan juga?", a: "Ya, sudah termasuk. Setiap konten datang lengkap dengan captionnya, disesuaikan dengan gaya bicara brand-mu. Tinggal salin dan posting." },
  { q: "Kalau hasilnya belum cocok?", a: "Bilang saja lewat WhatsApp, kami kerjakan ulang. Setiap konten punya jatah revisi, dan baru dihitung selesai setelah kamu setuju." },
  { q: "Paketnya ada masa berlaku?", a: "Tidak ada. Paketmu berlaku sampai semua feed-nya terkirim, tanpa dikejar tenggat." },
  { q: "Berapa lama sampai feed pertama jadi?", a: "Tergantung jumlah feed dan seberapa cepat foto produkmu masuk. Setelah pembayaran dikonfirmasi, tim kami menghubungi lewat WhatsApp dan jadwalnya kita sepakati bareng di sana — jadi kamu tahu persis kapan menerimanya, bukan sekadar janji umum." },
];

/* ── shared bits ─────────────────────────────────────────────────────────── */

/**
 * Fades sections in as they scroll into view.
 *
 * [data-rv] starts at opacity:0, so anything the observer never sees stays
 * invisible for good. Sections that render after their data arrives — the price
 * cards, most obviously — do not exist yet on mount, so a one-shot
 * querySelectorAll would silently hide them: a MutationObserver picks up
 * whatever React adds later.
 */
function useReveal() {
  useEffect(() => {
    if (!("IntersectionObserver" in window)) {
      document.querySelectorAll("[data-rv]").forEach((e) => e.classList.add("rv-in"));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => {
        if (e.isIntersecting) { e.target.classList.add("rv-in"); io.unobserve(e.target); }
      }),
      { threshold: 0.12, rootMargin: "0px 0px -60px" }
    );

    const watch = (root) => {
      if (root.nodeType !== 1) return;
      if (root.matches?.("[data-rv]") && !root.classList.contains("rv-in")) io.observe(root);
      root.querySelectorAll?.("[data-rv]:not(.rv-in)").forEach((e) => io.observe(e));
    };

    watch(document.body);
    const mo = new MutationObserver((muts) =>
      muts.forEach((m) => m.addedNodes.forEach(watch))
    );
    mo.observe(document.body, { childList: true, subtree: true });

    return () => { io.disconnect(); mo.disconnect(); };
  }, []);
}

function Eyebrow({ children, tone = "gold" }) {
  return (
    <span className={`inline-block text-[11px] font-bold uppercase tracking-[0.18em] mb-3 ${
      tone === "gold" ? "text-brand-gold" : "text-brand-light"
    }`}>
      {children}
    </span>
  );
}

/**
 * Draggable before/after — the single most persuasive element on the page.
 *
 * The right-hand side is a 2x2 of finished posts rather than one image: the pitch
 * is not "we retouch a photo", it is "one product shot becomes a set of content",
 * and four results say that where one cannot.
 */
const AFTER_SET = [
  { src: "/after2.webp", alt: "Konten Instagram hasil Feedify — highlight kandungan produk" },
  { src: "/after3.webp", alt: "Konten Instagram hasil Feedify — varian kedua" },
  { src: "/after4.webp", alt: "Konten Instagram hasil Feedify — varian ketiga" },
  { src: "/after5.webp", alt: "Konten Instagram hasil Feedify — varian keempat" },
];

function BeforeAfter() {
  const [pos, setPos] = useState(45);
  const ref = useRef(null);
  const dragging = useRef(false);

  const setFromClientX = useCallback((clientX) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setPos(Math.max(2, Math.min(98, ((clientX - r.left) / r.width) * 100)));
  }, []);

  useEffect(() => {
    const move = (e) => {
      if (!dragging.current) return;
      setFromClientX(e.touches ? e.touches[0].clientX : e.clientX);
    };
    const up = () => { dragging.current = false; };
    window.addEventListener("mousemove", move);
    window.addEventListener("touchmove", move, { passive: true });
    window.addEventListener("mouseup", up);
    window.addEventListener("touchend", up);
    return () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("touchmove", move);
      window.removeEventListener("mouseup", up);
      window.removeEventListener("touchend", up);
    };
  }, [setFromClientX]);

  return (
    <div>
      <div
        ref={ref}
        data-testid="before-after"
        className="relative aspect-[4/5] w-full cursor-ew-resize select-none overflow-hidden rounded-2xl bg-brand-sand"
        onMouseDown={(e) => { dragging.current = true; setFromClientX(e.clientX); }}
        onTouchStart={(e) => { dragging.current = true; setFromClientX(e.touches[0].clientX); }}
      >
        {/* result: four finished posts from that one product shot */}
        <div className="absolute inset-0 grid grid-cols-2 grid-rows-2 gap-1 bg-white">
          {AFTER_SET.map(({ src, alt }) => (
            <div key={src} className="overflow-hidden">
              <img src={src} alt={alt} loading="lazy" className="h-full w-full object-cover" draggable={false} />
            </div>
          ))}
        </div>

        {/* the raw photo, clipped to the handle. The inner image is pinned to the
            container's width so it never squashes as the clip narrows. */}
        <div className="absolute inset-0 overflow-hidden" style={{ width: `${pos}%` }}>
          <img
            src="/before.webp"
            alt="Foto produk apa adanya sebelum diolah"
            className="absolute inset-0 h-full w-full object-cover"
            style={{ width: ref.current ? `${ref.current.offsetWidth}px` : "100%" }}
            draggable={false}
          />
        </div>

        <span className="absolute left-3 top-3 rounded-full bg-black/55 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-white backdrop-blur">
          Foto asli
        </span>
        <span className="absolute right-3 top-3 rounded-full bg-brand-gold px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-brand">
          4 konten jadi
        </span>

        <div className="absolute inset-y-0 w-[2px] bg-white/90 shadow-lg" style={{ left: `${pos}%` }}>
          <div className="absolute left-1/2 top-1/2 flex h-10 w-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white shadow-xl">
            <ArrowRight size={12} weight="bold" className="-ml-0.5 rotate-180 text-brand" />
            <ArrowRight size={12} weight="bold" className="-mr-0.5 text-brand" />
          </div>
        </div>
      </div>

      <p className="mt-3 text-center text-xs text-stone-400">Geser untuk membandingkan</p>
    </div>
  );
}

/**
 * Full-bleed band of client feeds sliding past, edge to edge.
 *
 * One feed in a column reads as a single sample; a wall of them sliding by reads
 * as a roster, which is the whole claim this page makes. The track is rendered
 * twice back to back and translated by exactly -50%, so the loop closes on
 * itself with no visible jump and no JS driving the motion.
 */
function FeedMarquee() {
  const doubled = [...FEED_MOCKUPS, ...FEED_MOCKUPS];
  return (
    <section className="relative overflow-hidden bg-brand-terminal py-12 sm:py-16" data-testid="feed-marquee">
      <div className="mb-8 px-5 text-center sm:px-8">
        <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-brand-gold">
          Feed yang kami kerjakan
        </span>
      </div>

      <div className="marquee">
        <div className="marquee-track">
          {doubled.map((f, n) => (
            <figure key={`${f.src}-${n}`} className="marquee-card">
              <img
                src={f.src}
                alt={`Contoh feed Instagram ${f.cat}`}
                loading={n < 3 ? "eager" : "lazy"}
                decoding="async"
                className="w-full rounded-2xl"
              />
              <figcaption className="mt-2.5 flex items-center justify-center gap-1.5">
                <InstagramLogo size={12} weight="fill" className="flex-shrink-0 text-brand-gold" />
                <span className="truncate text-xs text-brand-cream/60">{f.cat}</span>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>

      {/* the band should look like it continues past the screen, not stop at it */}
      <div className="pointer-events-none absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-brand-terminal to-transparent sm:w-28" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-brand-terminal to-transparent sm:w-28" />
    </section>
  );
}

/**
 * Number that counts up the first time it scrolls into view.
 *
 * A static figure gets skimmed; one that moves gets read. It only ever runs once,
 * and anyone who asked for less motion is shown the final value immediately — the
 * point is the number, the animation is decoration.
 */
function CountUp({ to, suffix = "", duration = 1400, className = "" }) {
  const [n, setN] = useState(0);
  const ref = useRef(null);
  const done = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce || !("IntersectionObserver" in window)) { setN(to); return; }

    const io = new IntersectionObserver((entries) => {
      if (!entries[0].isIntersecting || done.current) return;
      done.current = true;
      io.disconnect();
      const t0 = performance.now();
      const tick = (now) => {
        const p = Math.min(1, (now - t0) / duration);
        // ease-out: fast at first, settling on the value rather than stopping dead
        setN(Math.round(to * (1 - Math.pow(1 - p, 3))));
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }, { threshold: 0.4 });

    io.observe(el);
    return () => io.disconnect();
  }, [to, duration]);

  return <span ref={ref} className={className}>{n}{suffix}</span>;
}

// Four clips, all the same size — one oversized "hero" video made the others
// look like afterthoughts. Labels name the product so the row reads as a range
// of work, not four takes of the same thing.
const VIDEOS = ["/video7.mp4", "/video1.mp4", "/video2.mp4", "/video3.mp4"];

/**
 * One vertical video in a phone frame.
 *
 * Autoplay only survives everywhere when the clip is muted and inline, and it is
 * paused whenever it is off-screen so several 720p loops never sit decoding
 * behind a section nobody is looking at — that is what drains a phone on a
 * landing page. Tapping toggles sound, because a muted-forever video reads as a
 * broken GIF.
 */
function PhoneVideo({ src }) {
  const ref = useRef(null);
  const [muted, setMuted] = useState(true);

  useEffect(() => {
    const el = ref.current;
    if (!el || !("IntersectionObserver" in window)) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) el.play?.().catch(() => {});
        else el.pause?.();
      },
      { threshold: 0.25 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <figure className="w-full max-w-[13rem]">
      <div className="relative overflow-hidden rounded-[2rem] bg-brand-terminal p-2 shadow-2xl ring-1 ring-white/10">
        <video
          ref={ref}
          src={src}
          muted={muted}
          loop
          playsInline
          autoPlay
          preload="metadata"
          className="aspect-[9/16] w-full rounded-[1.5rem] bg-black object-cover"
        />
        <button
          onClick={() => {
            const el = ref.current;
            if (!el) return;
            el.muted = !el.muted;
            setMuted(el.muted);
            el.play?.().catch(() => {});
          }}
          className="absolute bottom-5 right-5 grid h-10 w-10 place-items-center rounded-full bg-black/55 text-white backdrop-blur transition-colors hover:bg-black/75"
          aria-label={muted ? "Nyalakan suara" : "Matikan suara"}
        >
          {muted ? <SpeakerSimpleSlash size={16} weight="fill" /> : <SpeakerSimpleHigh size={16} weight="fill" />}
        </button>
      </div>
    </figure>
  );
}

function FaqItem({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-brand-sand">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-5 py-5 text-left"
        data-testid="faq-item"
      >
        <span className="font-heading text-base sm:text-lg font-semibold text-brand">{q}</span>
        <span className={`grid h-7 w-7 flex-shrink-0 place-items-center rounded-full border transition-all duration-300 ${
          open ? "rotate-180 border-brand bg-brand text-brand-cream" : "border-brand-sand text-brand"
        }`}>
          <CaretDown size={13} weight="bold" />
        </span>
      </button>
      <div className={`grid transition-all duration-500 ease-out ${open ? "grid-rows-[1fr] pb-5" : "grid-rows-[0fr]"}`}>
        <div className="overflow-hidden">
          <p className="max-w-2xl text-sm leading-relaxed text-stone-500">{a}</p>
        </div>
      </div>
    </div>
  );
}

/* ── page ────────────────────────────────────────────────────────────────── */

export default function LandingPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const cfg = useAgencyConfig();
  const [scrolled, setScrolled] = useState(false);
  const [menu, setMenu] = useState(false);
  useReveal();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const open = cfg?.registration_open !== false;
  const slotsLeft = cfg?.slots_left;
  const slotsTotal = cfg?.slots_total ?? 0;
  const slotsTaken = cfg?.slots_taken ?? 0;
  const slotPct = slotsTotal ? Math.round((slotsTaken / slotsTotal) * 100) : 0;
  // Owner-set and shown only when it is a real figure — an invented client count is
  // a false claim to a buyer, and it would contradict the slot counter on this very
  // page. Left at 0 the strip simply does not render.
  const clientsServed = cfg?.clients_served ?? 0;
  const packages = cfg?.packages || [];
  // Mirrors ProtectedRoute in App.js — what the dashboard itself will accept.
  const hasAccess = !!user && (user.role === "admin" || user.is_lifetime);
  const ctaPrimary = "inline-flex items-center gap-2 rounded-full bg-brand-gold px-7 py-4 font-semibold text-brand shadow-lg shadow-brand-gold/20 transition-all hover:-translate-y-0.5 hover:bg-brand-amber";
  const ctaSecondary = "inline-flex items-center gap-2 rounded-full border border-brand-cream/25 px-7 py-4 font-semibold text-brand-cream transition-all hover:border-brand-cream/50 hover:bg-white/5";
  const wa = waLink(cfg?.whatsapp || "6281210117905", "Halo Feedify, saya mau tanya soal paket konten.");

  const goCheckout = (pkgId) => {
    if (!open) { navigate("/sample"); return; }
    const target = `/checkout?paket=${pkgId}`;
    // The nested query string must be encoded or "?paket=" is read as a param of /login.
    navigate(user ? target : `/login?redirect=${encodeURIComponent(target)}`);
  };

  return (
    <div className="min-h-screen bg-brand-cream text-brand-ink overflow-x-hidden">
      {/* ── NAV ─────────────────────────────────────────────── */}
      <nav
        // The logo tile is brand emerald, so a transparent bar over the emerald hero
        // would swallow it. The bar sits a shade deeper than the hero at all times.
        className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
          scrolled
            ? "bg-brand-terminal/95 py-3 shadow-lg backdrop-blur-xl"
            : "bg-brand-terminal py-5 shadow-sm"
        }`}
        data-testid="landing-nav"
      >
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 sm:px-8">
          <Link to="/" data-testid="landing-logo">
            <FeedifyLogo size={36} tone="light" />
          </Link>

          <div className="hidden items-center gap-8 md:flex">
            {[["Hasil Kerja", "/hasil-kerja"], ["Cara Kerja", "#cara-kerja"], ["Harga", "#harga"]].map(([t, href]) =>
              href.startsWith("#") ? (
                <a key={t} href={href} className="text-sm text-brand-cream/60 transition-colors hover:text-brand-cream">{t}</a>
              ) : (
                <Link key={t} to={href} className="text-sm text-brand-cream/60 transition-colors hover:text-brand-cream">{t}</Link>
              )
            )}
            {user ? (
              <div className="flex items-center gap-2">
                <button onClick={() => navigate("/dashboard")} className="rounded-full bg-brand-gold px-5 py-2.5 text-sm font-semibold text-brand transition-all hover:bg-brand-amber" data-testid="nav-dashboard-cta">
                  Dashboard
                </button>
                <button
                  onClick={() => { logout(); navigate("/"); }}
                  className="inline-flex items-center gap-1.5 rounded-full border border-brand-cream/25 px-4 py-2.5 text-sm font-medium text-brand-cream/70 transition-colors hover:border-brand-cream/50 hover:text-brand-cream"
                  data-testid="landing-logout"
                >
                  <SignOut size={14} weight="bold" /> Keluar
                </button>
              </div>
            ) : (
              <Link to="/login" className="rounded-full bg-brand-gold px-5 py-2.5 text-sm font-semibold text-brand transition-all hover:bg-brand-amber" data-testid="landing-login-btn">
                Masuk
              </Link>
            )}
          </div>

          <button onClick={() => setMenu((v) => !v)} className="grid h-10 w-10 place-items-center rounded-full bg-white/10 text-brand-cream md:hidden" data-testid="nav-menu-toggle" aria-label="Menu">
            {menu ? <X size={18} weight="bold" /> : <List size={18} weight="bold" />}
          </button>
        </div>

        {menu && (
          <div className="mt-3 space-y-1 border-t border-white/10 bg-brand-terminal px-5 pb-5 pt-4 md:hidden">
            <Link to="/hasil-kerja" onClick={() => setMenu(false)} className="block py-2.5 text-brand-cream/80">Hasil Kerja</Link>
            <a href="#cara-kerja" onClick={() => setMenu(false)} className="block py-2.5 text-brand-cream/80">Cara Kerja</a>
            <a href="#harga" onClick={() => setMenu(false)} className="block py-2.5 text-brand-cream/80">Harga</a>
            <Link to={user ? "/dashboard" : "/login"} onClick={() => setMenu(false)} className="mt-2 block rounded-full bg-brand-gold py-3 text-center font-semibold text-brand">
              {user ? "Dashboard" : "Masuk"}
            </Link>
            {user && (
              <button
                onClick={() => { setMenu(false); logout(); navigate("/"); }}
                className="mt-2 flex w-full items-center justify-center gap-2 rounded-full border border-brand-cream/25 py-3 font-semibold text-brand-cream/70"
                data-testid="landing-logout-m"
              >
                <SignOut size={15} weight="bold" /> Keluar
              </button>
            )}
          </div>
        )}
      </nav>

      {/* ── HERO ────────────────────────────────────────────── */}
      <header className="relative overflow-hidden bg-brand pb-20 pt-32 sm:pb-28 sm:pt-40">
        {/* Soft glows — desktop only: heavy blur is a known GPU killer on low-end Android,
            which is a large slice of this audience. */}
        <div className="pointer-events-none absolute inset-0 hidden sm:block">
          <div className="absolute -left-40 -top-40 h-[34rem] w-[34rem] rounded-full bg-brand-light/25 blur-[120px]" />
          <div className="absolute -right-32 top-20 h-[28rem] w-[28rem] rounded-full bg-brand-gold/10 blur-[110px]" />
        </div>

        <div className="relative mx-auto max-w-3xl px-5 text-center sm:px-8">
          <div>
            {user && (
              <div data-rv className="rv mb-5 inline-flex items-center gap-2.5 rounded-full bg-white/8 px-4 py-2 ring-1 ring-white/15" data-testid="hero-welcome">
                <span className="grid h-6 w-6 place-items-center rounded-full bg-brand-gold text-[11px] font-bold text-brand">
                  {(user.name || user.email || "?").trim().charAt(0).toUpperCase()}
                </span>
                <span className="text-sm text-brand-cream/70">
                  Halo, <span className="font-semibold text-brand-cream">{(user.name || "").split(" ")[0] || "kamu"}</span>
                </span>
              </div>
            )}

            {cfg && !user && (
              <div data-rv className="rv mb-7 inline-flex items-center gap-2.5 rounded-full border border-brand-gold/30 bg-brand-gold/10 px-4 py-2" data-testid="slot-badge">
                <span className="relative flex h-2 w-2">
                  <span className={`absolute inline-flex h-full w-full rounded-full ${open ? "animate-ping bg-brand-gold/70" : "bg-stone-400"}`} />
                  <span className={`relative inline-flex h-2 w-2 rounded-full ${open ? "bg-brand-gold" : "bg-stone-400"}`} />
                </span>
                <span className="text-[11px] font-bold uppercase tracking-[0.15em] text-brand-gold">
                  {open ? "Slot batch ini" : "Slot sedang penuh"}
                </span>
                <span className="font-mono text-[11px] font-bold text-brand-cream">
                  {slotsTaken}/{slotsTotal}
                </span>
              </div>
            )}

            <h1 data-rv className="rv font-heading text-[2.6rem] font-bold leading-[1.04] tracking-[-0.035em] text-brand-cream sm:text-6xl">
              Feed Instagram brand kamu,
              <br />
              <span className="text-brand-gold">dikerjakan sampai beres.</span>
            </h1>

            <p data-rv className="rv mx-auto mt-6 max-w-xl text-base leading-relaxed text-brand-cream/60 sm:text-lg">
              Kirim foto produkmu sekali. Tim Feedify yang menyiapkan feed dan captionnya — kamu tinggal posting, tanpa mikir mau posting apa lagi.
            </p>

            {/* Three audiences land here, and each needs a different first button.
                A signed-in account that has not paid would be bounced straight back
                out by the dashboard's own guard, so it is never offered that door. */}
            <div data-rv className="rv mt-9 flex flex-wrap justify-center gap-3" data-testid="hero-cta-row">
              {hasAccess ? (
                <button onClick={() => navigate("/dashboard")} className={ctaPrimary} data-testid="hero-cta-dashboard">
                  {user?.has_brand_profile ? "Buka Dashboard" : "Lengkapi Data Brand"} <ArrowRight size={16} weight="bold" />
                </button>
              ) : user ? (
                <a href="#harga" className={ctaPrimary} data-testid="hero-cta-lanjut-bayar">
                  Pilih Paket & Mulai <ArrowRight size={16} weight="bold" />
                </a>
              ) : (
                <a href="#harga" className={ctaPrimary} data-testid="hero-cta-paket">
                  Lihat Paket <ArrowRight size={16} weight="bold" />
                </a>
              )}

              {hasAccess ? (
                <a href="#harga" className={ctaSecondary}>Lihat Paket</a>
              ) : (
                <Link to="/sample" className={ctaSecondary} data-testid="hero-cta-sample">
                  Minta Sample Gratis
                </Link>
              )}
            </div>

            {/* One number, then the industries it came from. "279 karya" counted
                files and "6 kategori usaha" measured something no buyer cares
                about — both read as filling space. An agency's credibility is who
                trusts it and in what business, so that is all this says. */}
            {clientsServed > 0 && (
              <div data-rv className="rv mt-10 inline-flex flex-col items-center gap-3 rounded-2xl bg-white/5 px-7 py-5 ring-1 ring-white/10" data-testid="trust-strip">
                <div className="flex items-baseline gap-2">
                  <CountUp to={clientsServed} suffix="+" className="font-heading text-3xl font-bold text-brand-gold" />
                  <span className="text-sm text-brand-cream/60">brand mempercayakan feed-nya</span>
                </div>
                <div className="h-px w-full bg-white/10" />
                <div className="flex flex-wrap items-center justify-center gap-x-2.5 gap-y-1.5">
                  {[...new Set(FEED_MOCKUPS.map((f) => f.cat))].map((c, i) => (
                    <span key={c} className="inline-flex items-center gap-2.5 text-[11px] text-brand-cream/45">
                      {i > 0 && <span className="h-1 w-1 rounded-full bg-brand-cream/20" />}
                      {c}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div data-rv className="rv mt-10 flex flex-wrap justify-center gap-x-9 gap-y-4">
              {[["Caption termasuk", "Tinggal salin & posting"], ["Revisi sampai sreg", `Maksimal ${cfg?.max_revisi ?? 2}x per konten`], ["Tanpa masa berlaku", "Sampai kontennya habis"]].map(([v, l]) => (
                <div key={v}>
                  <div className="text-sm font-semibold text-brand-cream">{v}</div>
                  <div className="text-xs text-brand-cream/45">{l}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </header>

      {/* ── PITA FEED ───────────────────────────────────────── */}
      <FeedMarquee />

      {/* ── VIDEO ───────────────────────────────────────────── */}
      <section className="bg-brand-terminal pb-20 pt-4 sm:pb-24" data-testid="video-section">
        <div className="mx-auto max-w-5xl px-5 sm:px-8">
          <div data-rv className="rv text-center">
            <Eyebrow>Bukan cuma foto diam</Eyebrow>
            <h2 className="font-heading text-3xl font-bold leading-tight tracking-tight text-brand-cream sm:text-4xl">
              Produkmu, dibuat bergerak.
            </h2>
            <p className="mx-auto mt-4 max-w-md leading-relaxed text-brand-cream/55">
              Dari foto produk yang sama, kami bisa membuat video pendek untuk Reels
              dan TikTok — bukan slideshow, tapi gerakan kamera sungguhan.
            </p>
          </div>

          <div data-rv className="rv mt-11 flex flex-wrap items-start justify-center gap-5 sm:gap-6">
            {VIDEOS.map((src) => <PhoneVideo key={src} src={src} />)}
          </div>

          <div data-rv className="rv mt-10 text-center">
            <a href={wa} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-full border border-brand-cream/25 px-6 py-3.5 font-semibold text-brand-cream transition-all hover:border-brand-cream/50 hover:bg-white/5">
              <WhatsappLogo size={16} weight="fill" /> Tanya Soal Video
            </a>
          </div>
        </div>
      </section>

      {/* ── BEFORE / AFTER ──────────────────────────────────── */}
      <section className="bg-brand-cream py-20 sm:py-24">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 sm:px-8 lg:grid-cols-2">
          <div data-rv className="rv">
            <Eyebrow tone="sage">Geser dan lihat sendiri</Eyebrow>
            <h2 className="font-heading text-3xl font-bold leading-tight tracking-tight text-brand sm:text-4xl">
              Kamu kirim satu foto.
              <br />Yang balik empat feed.
            </h2>
            <p className="mt-5 max-w-md leading-relaxed text-stone-500">
              Foto produk yang sama bisa dipakai berkali-kali tanpa terlihat mengulang —
              sudut, komposisi, dan pesannya kami buat berbeda tiap feed. Itu bedanya
              punya stok konten dan cuma punya satu foto bagus.
            </p>
          </div>
          <div data-rv className="rv"><BeforeAfter /></div>
        </div>
      </section>

      {/* ── MASALAH ─────────────────────────────────────────── */}
      <section className="bg-white py-20 sm:py-24">
        <div className="mx-auto max-w-6xl px-5 sm:px-8">
          <div data-rv className="rv max-w-2xl">
            <Eyebrow tone="sage">Kenapa ini ada</Eyebrow>
            <h2 className="font-heading text-3xl font-bold leading-tight tracking-tight text-brand sm:text-4xl">
              Jualan sudah capek. Mikirin konten jangan lagi.
            </h2>
          </div>
          <div className="mt-12 grid gap-px overflow-hidden rounded-2xl bg-brand-sand sm:grid-cols-2">
            {PAINS.map((p) => (
              <div key={p.t} data-rv className="rv bg-white p-7">
                <h3 className="font-heading text-lg font-semibold text-brand">{p.t}</h3>
                <p className="mt-2 text-sm leading-relaxed text-stone-500">{p.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CARA KERJA ──────────────────────────────────────── */}
      <section id="cara-kerja" className="bg-brand py-20 sm:py-24">
        <div className="mx-auto max-w-6xl px-5 sm:px-8">
          <div data-rv className="rv max-w-2xl">
            <Eyebrow>Cara Kerja</Eyebrow>
            <h2 className="font-heading text-3xl font-bold leading-tight tracking-tight text-brand-cream sm:text-4xl">
              Tiga langkah. Sisanya kami.
            </h2>
          </div>
          <div className="mt-12 grid gap-px overflow-hidden rounded-2xl bg-white/10 md:grid-cols-3">
            {STEPS.map((s) => (
              <div key={s.n} data-rv className="rv bg-brand p-8">
                <div className="font-heading text-3xl font-bold text-brand-gold">{s.n}</div>
                <h3 className="mt-5 font-heading text-lg font-semibold text-brand-cream">{s.t}</h3>
                <p className="mt-2 text-sm leading-relaxed text-brand-cream/55">{s.d}</p>
              </div>
            ))}
          </div>
          <div data-rv className="rv mt-6 flex items-start gap-3 rounded-2xl border border-brand-gold/20 bg-brand-gold/[0.07] p-5">
            <Clock size={18} weight="duotone" className="mt-0.5 flex-shrink-0 text-brand-gold" />
            <p className="text-sm leading-relaxed text-brand-gold/90">
              Setelah pembayaranmu masuk, tim kami menghubungi lewat WhatsApp untuk membahas detailnya — termasuk kapan kontenmu siap.
            </p>
          </div>
        </div>
      </section>

      {/* ── APA YANG DIKERJAKAN ─────────────────────────────── */}
      <section className="bg-brand-cream py-20 sm:py-24">
        <div className="mx-auto max-w-6xl px-5 sm:px-8">
          <div data-rv className="rv flex flex-wrap items-end justify-between gap-6">
            <div className="max-w-xl">
              <Eyebrow tone="sage">Yang Kami Kerjakan</Eyebrow>
              <h2 className="font-heading text-3xl font-bold leading-tight tracking-tight text-brand sm:text-4xl">
                Bukan cuma foto feed.
              </h2>
            </div>
            <Link to="/hasil-kerja" className="inline-flex items-center gap-2 text-sm font-semibold text-brand hover:underline" data-testid="go-to-portfolio">
              Lihat semua hasil kerja <ArrowUpRight size={15} weight="bold" />
            </Link>
          </div>

          <div className="mt-12 grid gap-6 sm:grid-cols-2">
            {SHOWCASE.map(({ id, icon: Icon, label, desc, images }) => (
              <div key={id} data-rv className="rv group overflow-hidden rounded-2xl border border-brand-sand bg-white p-4 transition-all hover:-translate-y-1 hover:shadow-xl">
                <div className="grid grid-cols-3 gap-1.5 overflow-hidden rounded-xl">
                  {images.map((src) => (
                    <div key={src} className="aspect-square overflow-hidden rounded-lg bg-brand-sand">
                      <img src={src} alt={label} loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                    </div>
                  ))}
                </div>
                <div className="flex items-start gap-3 px-2 pb-1 pt-5">
                  <Icon size={20} weight="duotone" className="mt-0.5 flex-shrink-0 text-brand-light" />
                  <div>
                    <h3 className="font-heading text-base font-semibold text-brand">{label}</h3>
                    <p className="mt-1 text-sm leading-relaxed text-stone-500">{desc}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HARGA ───────────────────────────────────────────── */}
      <section id="harga" className="bg-white py-20 sm:py-24">
        <div className="mx-auto max-w-6xl px-5 sm:px-8">
          <div data-rv className="rv text-center">
            <Eyebrow tone="sage">Harga</Eyebrow>
            <h2 className="font-heading text-3xl font-bold leading-tight tracking-tight text-brand sm:text-4xl">
              Bayar sekali, konten siap posting.
            </h2>
            <p className="mx-auto mt-4 max-w-md text-sm text-stone-500">
              Kami membatasi jumlah klien supaya tiap brand digarap serius.
            </p>

            {cfg && (
              <div className="mx-auto mt-7 max-w-sm" data-testid="slot-counter">
                <div className="flex items-baseline justify-between">
                  <span className="text-xs font-bold uppercase tracking-[0.14em] text-stone-400">
                    Slot terisi
                  </span>
                  <span className="font-heading text-xl font-bold text-brand">
                    {slotsTaken}<span className="text-stone-300">/{slotsTotal}</span>
                  </span>
                </div>
                <div className="mt-2.5 h-2 overflow-hidden rounded-full bg-brand-sand">
                  <div
                    className="h-full rounded-full bg-brand-gold transition-[width] duration-700 ease-out"
                    style={{ width: `${Math.max(slotPct, 3)}%` }}
                  />
                </div>
                <p className="mt-2.5 text-xs text-stone-400">
                  {open ? `Tersisa ${slotsLeft} slot di batch ini` : "Batch ini sudah penuh"}
                </p>
              </div>
            )}
          </div>

          {/* When the batch is closed every package button leads nowhere, so the
              waiting list takes the whole block rather than sitting beside it. */}
          {cfg && !open ? (
            <div className="mt-12"><WaitingListForm /></div>
          ) : (
            /* Three across from tablet up: the packages only sell by comparison,
               and stacking them turns the middle one into just a scroll stop. */
            <div className="mt-12 grid gap-5 md:grid-cols-3">
              {/* Skeletons hold the exact card footprint while the config loads, so
                  the section never collapses and jumps the page down on arrival. */}
            {!cfg && [0, 1, 2].map((i) => (
              <div key={i} className="animate-pulse rounded-3xl border border-brand-sand bg-white p-6 lg:p-8">
                <div className="h-3 w-20 rounded bg-brand-sand" />
                <div className="mt-5 h-3 w-24 rounded bg-brand-sand" />
                <div className="mt-3 h-9 w-40 rounded bg-brand-sand" />
                <div className="mt-8 space-y-3">
                  {[0, 1, 2, 3, 4].map((j) => <div key={j} className="h-3 w-full rounded bg-brand-sand/70" />)}
                </div>
                <div className="mt-8 h-12 w-full rounded-full bg-brand-sand" />
              </div>
            ))}

            {packages.map((p) => (
              <div
                key={p.id}
                data-rv
                className={`rv relative rounded-3xl p-6 transition-all hover:-translate-y-1.5 lg:p-8 ${
                  p.popular
                    ? "bg-brand text-brand-cream shadow-2xl shadow-brand/25"
                    : "border border-brand-sand bg-white hover:shadow-xl"
                }`}
                data-testid={`plan-${p.id}`}
              >
                {p.popular && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-brand-gold px-4 py-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-brand">
                    Paling Dipilih
                  </span>
                )}
                <div className={`text-[11px] font-bold uppercase tracking-[0.15em] ${p.popular ? "text-brand-gold" : "text-stone-400"}`}>
                  {p.name}
                </div>
                <div className={`mt-4 text-sm ${p.popular ? "text-brand-cream/60" : "text-stone-500"}`}>
                  {p.feeds} feed
                </div>
                <div className="mt-1 font-heading text-4xl font-bold tracking-tight">
                  {formatRupiah(p.price_idr)}
                </div>
                <p className={`mt-1 text-xs ${p.popular ? "text-brand-cream/45" : "text-stone-400"}`}>{p.tagline}</p>

                <ul className="mt-7 space-y-3">
                  {(p.features || []).map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-sm">
                      <Check size={14} weight="bold" className={`mt-1 flex-shrink-0 ${p.popular ? "text-brand-gold" : "text-brand-light"}`} />
                      <span className={p.popular ? "text-brand-cream/85" : "text-stone-600"}>{f}</span>
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => goCheckout(p.id)}
                  className={`mt-8 w-full rounded-full py-3.5 font-semibold transition-all ${
                    p.popular
                      ? "bg-brand-gold text-brand hover:bg-brand-amber"
                      : "border border-brand text-brand hover:bg-brand hover:text-brand-cream"
                  }`}
                  data-testid={`plan-cta-${p.id}`}
                >
                  {open ? `Pilih ${p.name}` : "Slot penuh"}
                </button>
              </div>
            ))}
            </div>
          )}

          <div data-rv className="rv mt-10 flex flex-wrap justify-center gap-x-8 gap-y-3 text-sm text-stone-500">
            {["Bayar lewat QRIS", "Caption sudah termasuk", "Brief cukup diisi sekali"].map((t) => (
              <span key={t} className="inline-flex items-center gap-2">
                <Check size={13} weight="bold" className="text-brand-light" /> {t}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── TESTIMONI ───────────────────────────────────────── */}
      <section className="bg-brand py-20 sm:py-24">
        <div className="mx-auto max-w-6xl px-5 sm:px-8">
          <div data-rv className="rv max-w-2xl">
            <Eyebrow>Kata mereka</Eyebrow>
            <h2 className="font-heading text-3xl font-bold leading-tight tracking-tight text-brand-cream sm:text-4xl">
              Bukan kami yang bilang bagus.
            </h2>
            <p className="mt-4 leading-relaxed text-brand-cream/60">
              Ini percakapan apa adanya dengan pemilik brand yang kontennya kami kerjakan.
            </p>
          </div>

          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {TESTIMONI.map(({ img, cat }) => (
              <figure
                key={img}
                data-rv
                className="rv overflow-hidden rounded-2xl bg-white/5 p-2 ring-1 ring-white/10 transition-all duration-500 hover:-translate-y-1.5 hover:ring-brand-gold/40"
              >
                <img src={img} alt={`Testimoni klien ${cat}`} loading="lazy" className="w-full rounded-xl object-cover" />
                <figcaption className="px-2 py-3 text-[11px] font-bold uppercase tracking-[0.14em] text-brand-gold">
                  {cat}
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ + ANITA ─────────────────────────────────────── */}
      <section className="bg-white py-20 sm:py-24">
        <div className="mx-auto max-w-3xl px-5 sm:px-8">
          <div data-rv className="rv text-center">
            <Eyebrow tone="sage">Pertanyaan</Eyebrow>
            <h2 className="font-heading text-3xl font-bold tracking-tight text-brand sm:text-4xl">Yang sering ditanya</h2>
          </div>
          <div data-rv className="rv mt-10">
            {FAQS.map((f) => <FaqItem key={f.q} {...f} />)}
          </div>
          {/* The chat sits here, directly under the FAQ, because this is the moment a
              reader's question is unanswered — not buried under the footer. */}
          <div data-rv className="rv mt-14">
            <SupportChatWidget
              title="Pertanyaanmu tidak ada di atas?"
              subtitle="Tanya Anita — asisten Feedify, jawab langsung."
            />
          </div>

          <div data-rv className="rv mt-8 text-center">
            <p className="text-sm text-stone-500">Lebih suka ngobrol dengan orangnya langsung?</p>
            <a
              href={wa}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex items-center gap-2 rounded-full border border-brand px-6 py-3 text-sm font-semibold text-brand transition-all hover:bg-brand hover:text-brand-cream"
              data-testid="faq-wa-cta"
            >
              <WhatsappLogo size={16} weight="fill" /> Chat Tim Feedify
            </a>
          </div>
        </div>
      </section>

      {/* ── CTA ─────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-brand py-24">
        <div className="pointer-events-none absolute left-1/2 top-1/2 hidden h-[40rem] w-[40rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand-gold/10 blur-[130px] sm:block" />
        <div className="relative mx-auto max-w-2xl px-5 text-center sm:px-8">
          <h2 data-rv className="rv font-heading text-3xl font-bold leading-tight tracking-tight text-brand-cream sm:text-5xl">
            Mau lihat dulu hasilnya?
          </h2>
          <p data-rv className="rv mx-auto mt-5 max-w-md leading-relaxed text-brand-cream/60">
            Kirim satu foto produkmu, kami buatkan satu contoh gratis. Tanpa bayar, tanpa komitmen.
          </p>
          <div data-rv className="rv mt-9 flex flex-wrap justify-center gap-3">
            <Link to="/sample" className="inline-flex items-center gap-2 rounded-full bg-brand-gold px-8 py-4 font-semibold text-brand shadow-lg shadow-brand-gold/20 transition-all hover:-translate-y-0.5 hover:bg-brand-amber" data-testid="cta-sample">
              Minta Sample Gratis <ArrowRight size={16} weight="bold" />
            </Link>
            <a href="#harga" className="inline-flex items-center gap-2 rounded-full border border-brand-cream/25 px-8 py-4 font-semibold text-brand-cream transition-all hover:border-brand-cream/50 hover:bg-white/5">
              Langsung Pilih Paket
            </a>
          </div>
        </div>
      </section>

      {/* ── FOOTER ──────────────────────────────────────────── */}
      <footer className="bg-brand py-12">
        <div className="mx-auto max-w-6xl px-5 sm:px-8">
          <div className="flex flex-wrap items-center justify-between gap-6 border-t border-white/10 pt-10">
            <Link to="/">
              <FeedifyLogo size={34} tone="light" />
            </Link>
            <div className="flex flex-wrap items-center gap-6 text-sm text-brand-cream/45">
              <Link to="/hasil-kerja" className="transition-colors hover:text-brand-cream">Hasil Kerja</Link>
              <a href="#harga" className="transition-colors hover:text-brand-cream">Harga</a>
              <Link to="/sample" className="transition-colors hover:text-brand-cream">Sample Gratis</Link>
              <a href={wa} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 transition-colors hover:text-brand-cream">
                <WhatsappLogo size={15} weight="fill" /> WhatsApp
              </a>
              <a href="https://www.instagram.com/feedify_id" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 transition-colors hover:text-brand-cream">
                <InstagramLogo size={15} weight="fill" /> Instagram
              </a>
            </div>
          </div>
          <div className="mt-8 flex flex-wrap items-center justify-between gap-3 text-xs text-brand-cream/30">
            <span>© {new Date().getFullYear()} Feedify · Konten media sosial untuk UMKM Indonesia</span>
            <InstallPWAButton />
          </div>
        </div>
      </footer>
    </div>
  );
}
