import { useState, useMemo, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft, ArrowRight, Images, Camera, Storefront, Stack, X, CaretLeft, CaretRight,
  FilmSlate, Play,
} from "@phosphor-icons/react";
import WORKS from "@/lib/portfolioManifest";
import FeedifyLogo from "@/components/FeedifyLogo";

/**
 * Videos are listed here rather than in the generated manifest: the build script
 * scans images, and three clips are not worth teaching it a second media type.
 * Drop a file in /public and add a line.
 */
const VIDEO_WORKS = [
  { type: "video", cat: "Video Produk", title: "Iklan Produk 1", video: "/video1.mp4", images: [] },
  { type: "video", cat: "Video Produk", title: "Iklan Produk 2", video: "/video2.mp4", images: [] },
  { type: "video", cat: "Video Produk", title: "Iklan Produk 3", video: "/video3.mp4", images: [] },
  { type: "video", cat: "Video Produk", title: "Iklan Produk 4", video: "/video4.mp4", images: [] },
  { type: "video", cat: "Video Produk", title: "Iklan Produk 5", video: "/video5.mp4", images: [] },
  { type: "video", cat: "Video Produk", title: "Iklan Produk 6", video: "/video6.mp4", images: [] },
  { type: "video", cat: "Video Produk", title: "Iklan Produk 7", video: "/video7.mp4", images: [] },
];

const ALL_WORKS = [...VIDEO_WORKS, ...WORKS];

const FILTERS = [
  { id: "all", label: "Semua", icon: null },
  { id: "video", label: "Video", icon: FilmSlate },
  { id: "feed", label: "Konten Feed", icon: Images },
  { id: "studio", label: "Foto Studio", icon: Camera },
  { id: "marketplace", label: "Marketplace", icon: Storefront },
  { id: "carousel", label: "Carousel", icon: Stack },
];

const TYPE_LABEL = {
  feed: "Feed", studio: "Studio", marketplace: "Marketplace", carousel: "Carousel",
  video: "Video",
};

// 279 works is far too many images to mount at once on a phone, so the grid
// grows in pages instead — every tile is lazy-loaded on top of that.
const PAGE = 48;

export default function PortfolioPage() {
  const [filter, setFilter] = useState("all");
  const [limit, setLimit] = useState(PAGE);
  const [zoom, setZoom] = useState(null);      // index into `shown`
  const [slide, setSlide] = useState(0);        // slide within a carousel work

  const shown = useMemo(
    () => (filter === "all" ? ALL_WORKS : ALL_WORKS.filter((w) => w.type === filter)),
    [filter]
  );

  const counts = useMemo(() => {
    const c = { all: ALL_WORKS.length };
    for (const w of ALL_WORKS) c[w.type] = (c[w.type] || 0) + 1;
    return c;
  }, []);

  useEffect(() => { setLimit(PAGE); }, [filter]);

  const close = useCallback(() => setZoom(null), []);
  const step = useCallback((d) => {
    setZoom((i) => (i == null ? i : (i + d + shown.length) % shown.length));
    setSlide(0);
  }, [shown.length]);

  // Keyboard control for the lightbox — arrows to move, Esc to leave.
  useEffect(() => {
    if (zoom == null) return;
    const onKey = (e) => {
      if (e.key === "Escape") close();
      if (e.key === "ArrowRight") step(1);
      if (e.key === "ArrowLeft") step(-1);
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [zoom, close, step]);

  const current = zoom == null ? null : shown[zoom];

  return (
    <div className="min-h-screen bg-brand-cream">
      {/* header */}
      <div className="bg-brand px-5 pb-16 pt-8 sm:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="flex items-center justify-between">
            <Link to="/" className="inline-flex items-center gap-2 text-sm text-brand-cream/60 transition-colors hover:text-brand-cream">
              <ArrowLeft size={15} weight="bold" /> Beranda
            </Link>
            <Link to="/"><FeedifyLogo size={32} tone="light" /></Link>
          </div>

          <div className="mt-10 max-w-2xl">
            <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-brand-gold">Portofolio</span>
            <h1 className="mt-3 font-heading text-3xl font-bold leading-tight tracking-tight text-brand-cream sm:text-5xl">
              Hasil kerja yang bisa dilihat.
            </h1>
            <p className="mt-4 leading-relaxed text-brand-cream/60">
              Semuanya dibuat dari foto produk apa adanya yang dikirim lewat WhatsApp —
              foto studio, etalase marketplace, konten feed, sampai carousel.
            </p>
            <div className="mt-7 flex flex-wrap gap-x-8 gap-y-3">
              {[[String(ALL_WORKS.length), "karya"], ["318", "foto"], [String(VIDEO_WORKS.length), "video"], ["5", "jenis konten"]].map(([n, l]) => (
                <div key={l}>
                  <div className="font-heading text-2xl font-bold text-brand-gold">{n}</div>
                  <div className="text-xs text-brand-cream/45">{l}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* filter */}
      <div className="sticky top-0 z-30 border-b border-brand-sand bg-brand-cream/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center gap-2 overflow-x-auto px-5 py-4 no-scrollbar sm:px-8">
          {FILTERS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setFilter(id)}
              className={`inline-flex flex-shrink-0 items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all ${
                filter === id
                  ? "bg-brand text-brand-cream"
                  : "border border-brand-sand text-stone-500 hover:border-brand-light hover:text-brand"
              }`}
              data-testid={`portfolio-filter-${id}`}
            >
              {Icon && <Icon size={14} weight="duotone" />} {label}
              <span className={filter === id ? "text-brand-cream/50" : "text-stone-300"}>{counts[id] || 0}</span>
            </button>
          ))}
        </div>
      </div>

      {/* grid */}
      <div className="mx-auto max-w-7xl px-5 py-12 sm:px-8">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4">
          {shown.slice(0, limit).map((w, i) => (
            <button
              key={w.video || w.images[0]}
              onClick={() => { setZoom(i); setSlide(0); }}
              className="group text-left"
              data-testid="portfolio-item"
            >
              <div className="relative overflow-hidden rounded-2xl bg-white p-1.5 shadow-sm transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-xl">
                <div className="aspect-square overflow-hidden rounded-xl bg-brand-sand">
                  {w.video ? (
                    <div className="relative h-full w-full bg-black">
                      <video
                        src={`${w.video}#t=0.5`}
                        muted
                        playsInline
                        preload="metadata"
                        className="h-full w-full object-cover"
                      />
                      <span className="absolute inset-0 grid place-items-center bg-black/25 transition-colors group-hover:bg-black/10">
                        <span className="grid h-11 w-11 place-items-center rounded-full bg-white/90 text-brand shadow-lg">
                          <Play size={17} weight="fill" />
                        </span>
                      </span>
                    </div>
                  ) : (
                    <img
                      src={w.images[0]}
                      alt={w.title}
                      loading="lazy"
                      decoding="async"
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  )}
                </div>
                {w.images.length > 1 && (
                  <span className="absolute right-3 top-3 rounded-full bg-black/55 px-2.5 py-1 text-[10px] font-bold text-white backdrop-blur">
                    {w.images.length} slide
                  </span>
                )}
              </div>
              <div className="mt-2.5 flex items-start justify-between gap-2 px-1">
                <div className="min-w-0">
                  <div className="truncate font-heading text-sm font-semibold text-brand">{w.title}</div>
                  <div className="truncate text-[11px] text-stone-400">{w.cat}</div>
                </div>
                <span className="mt-0.5 flex-shrink-0 rounded-full bg-brand-sand px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-brand-light">
                  {TYPE_LABEL[w.type]}
                </span>
              </div>
            </button>
          ))}
        </div>

        {limit < shown.length && (
          <div className="mt-12 text-center">
            <button
              onClick={() => setLimit((l) => l + PAGE)}
              className="rounded-full border border-brand px-8 py-3.5 font-semibold text-brand transition-all hover:bg-brand hover:text-brand-cream"
              data-testid="portfolio-load-more"
            >
              Tampilkan lebih banyak · sisa {shown.length - limit}
            </button>
          </div>
        )}
      </div>

      {/* cta */}
      <div className="bg-brand px-5 py-20 text-center sm:px-8">
        <h2 className="mx-auto max-w-xl font-heading text-3xl font-bold leading-tight tracking-tight text-brand-cream sm:text-4xl">
          Produkmu bisa tampil seperti ini juga.
        </h2>
        <p className="mx-auto mt-4 max-w-md leading-relaxed text-brand-cream/60">
          Kirim satu foto produk, kami buatkan contohnya gratis.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link to="/sample" className="inline-flex items-center gap-2 rounded-full bg-brand-gold px-7 py-3.5 font-semibold text-brand transition-all hover:-translate-y-0.5 hover:bg-brand-amber">
            Minta Sample Gratis <ArrowRight size={15} weight="bold" />
          </Link>
          <Link to="/#harga" className="rounded-full border border-brand-cream/25 px-7 py-3.5 font-semibold text-brand-cream transition-all hover:bg-white/5">
            Lihat Paket
          </Link>
        </div>
      </div>

      {/* lightbox */}
      {current && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm"
          onClick={close}
          data-testid="portfolio-lightbox"
        >
          <button className="absolute right-4 top-4 grid h-11 w-11 place-items-center rounded-full bg-white/10 text-white" onClick={close} aria-label="Tutup">
            <X size={18} weight="bold" />
          </button>

          <button
            className="absolute left-3 top-1/2 z-10 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
            onClick={(e) => { e.stopPropagation(); step(-1); }}
            aria-label="Karya sebelumnya"
          >
            <CaretLeft size={18} weight="bold" />
          </button>
          <button
            className="absolute right-3 top-1/2 z-10 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
            onClick={(e) => { e.stopPropagation(); step(1); }}
            aria-label="Karya berikutnya"
          >
            <CaretRight size={18} weight="bold" />
          </button>

          <div className="max-h-[88vh] w-full max-w-2xl" onClick={(e) => e.stopPropagation()}>
            {current.video ? (
              <video
                src={current.video}
                controls
                autoPlay
                loop
                playsInline
                className="mx-auto max-h-[70vh] w-auto rounded-2xl bg-black"
              />
            ) : (
              <img
                src={current.images[Math.min(slide, current.images.length - 1)]}
                alt={current.title}
                className="mx-auto max-h-[70vh] w-auto rounded-2xl object-contain"
              />
            )}
            {!current.video && current.images.length > 1 && (
              <div className="mt-4 flex justify-center gap-2">
                {current.images.map((src, i) => (
                  <button
                    key={src}
                    onClick={() => setSlide(i)}
                    className={`h-14 w-14 overflow-hidden rounded-lg ring-2 transition-all ${
                      i === slide ? "ring-brand-gold" : "ring-transparent opacity-50 hover:opacity-100"
                    }`}
                  >
                    <img src={src} alt="" className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            )}
            <div className="mt-5 text-center">
              <div className="font-heading text-lg font-semibold text-white">{current.title}</div>
              <div className="mt-1 text-sm text-white/50">
                {current.cat} · {zoom + 1} dari {shown.length}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
