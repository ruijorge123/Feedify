import { useEffect, useState } from "react";
import api from "@/lib/api";
import { toast } from 'react-toastify';
import { ImageSquare, Stack, PenNib, ForkKnife, Trash, ClockCounterClockwise, Copy, Check, CalendarPlus, Storefront, Camera, SquaresFour, Package } from "@phosphor-icons/react";
import JsonOutput from "@/components/JsonOutput";
import ScheduleModal from "@/components/ScheduleModal";
import ConfirmDialog from "@/components/ConfirmDialog";

const TYPE_META = {
  banner:         { name: "Feed & Banner", icon: ImageSquare },
  feed_generator: { name: "Feed Generator", icon: SquaresFour },
  carousel:       { name: "Carousel", icon: Stack },
  studio:         { name: "Studio", icon: Camera },
  marketplace:    { name: "Marketplace", icon: Storefront },
  copywriting:    { name: "Copywriting", icon: PenNib },
  "food-menu":    { name: "F&B Menu", icon: ForkKnife },
};

const TYPE_FILTERS = [
  { id: "", name: "Semua" },
  { id: "banner", name: "Feed & Banner", icon: ImageSquare },
  { id: "feed_generator", name: "Feed Generator", icon: SquaresFour },
  { id: "carousel", name: "Carousel", icon: Stack },
  { id: "studio", name: "Studio", icon: Camera },
  { id: "marketplace", name: "Marketplace", icon: Storefront },
  { id: "copywriting", name: "Copywriting", icon: PenNib },
  { id: "food-menu", name: "F&B Menu", icon: ForkKnife },
];

export default function HistoryPage() {
  const [items, setItems] = useState([]);
  const [filter, setFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [scheduling, setScheduling] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState({ open: false, id: null, deleting: false });

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/prompts", { params: filter ? { dashboard_type: filter } : {} });
      setItems(data);
    } catch {}
    finally { setLoading(false); }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, [filter]);

  const remove = async (id, e) => {
    e?.stopPropagation();
    setDeleteConfirm({ open: true, id, deleting: false });
  };

  const confirmDelete = async () => {
    const id = deleteConfirm.id;
    setDeleteConfirm((s) => ({ ...s, deleting: true }));
    try {
      await api.delete(`/prompts/${id}`);
      toast.success("Prompt dihapus");
      setItems((arr) => arr.filter((p) => p.id !== id));
      if (selected?.id === id) setSelected(null);
      setDeleteConfirm({ open: false, id: null, deleting: false });
    } catch {
      toast.error("Gagal menghapus");
      setDeleteConfirm((s) => ({ ...s, deleting: false }));
    }
  };

  return (
    <div className="space-y-6" data-testid="history-page">
      <div className="animate-fade-up">
        <div className="text-xs uppercase tracking-[0.2em] text-brand-light font-semibold mb-2">Library</div>
        <h1 className="font-heading text-3xl sm:text-4xl font-bold text-brand tracking-tight">History Konten</h1>
        <p className="text-stone-600 mt-2">Semua foto & caption hasil generate Feedify. Klik <strong>Jadwalkan</strong> untuk simpan ke Calendar Planner.</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2" data-testid="history-filters">
        {TYPE_FILTERS.map((t) => (
          <button
            key={t.id}
            onClick={() => setFilter(t.id)}
            data-testid={`filter-${t.id || 'all'}`}
            className={`px-4 py-2 rounded-full text-sm font-medium border transition-all btn-touch ${
              filter === t.id ? "bg-brand text-brand-cream border-brand" : "bg-white border-brand-sand text-stone-700 hover:border-brand"
            }`}
          >
            {t.name}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="feedify-card p-5 shimmer h-32" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="feedify-card p-14 text-center">
          <ClockCounterClockwise size={40} className="mx-auto text-stone-400 mb-3" />
          <p className="text-stone-500 mb-4">Belum ada prompt. Generate yang pertama!</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((p) => {
            const thumb = p.image_base64 || (p.slide_images && p.slide_images[0]) || p.product_photo_base64 || p.reference_image_base64;
            const meta = TYPE_META[p.dashboard_type] || { name: p.dashboard_type, icon: ImageSquare };
            const TypeIcon = meta.icon;
            const hasProduct = !!(p.product_photo_base64 || p.product?.name);
            const hasInspiration = !!p.reference_image_base64;
            return (
              <div key={p.id} className="feedify-card overflow-hidden group flex flex-col" data-testid={`prompt-card-${p.id}`}>
                {/* Thumbnail */}
                <button onClick={() => setSelected(p)} className="w-full aspect-video bg-brand-sand/40 relative overflow-hidden">
                  {thumb ? (
                    <img src={thumb.startsWith("data:") ? thumb : `data:image/png;base64,${thumb}`} alt={p.title} className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center text-brand-light/40">
                      <TypeIcon size={32} weight="duotone" />
                    </div>
                  )}
                  <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-brand text-brand-cream text-[10px] font-bold uppercase tracking-wide">{meta.name}</div>
                  {/* Data completeness chips */}
                  <div className="absolute bottom-2 left-2 flex gap-1">
                    {hasProduct && <span className="px-1.5 py-0.5 rounded-full bg-white/90 text-brand text-[9px] font-bold flex items-center gap-0.5"><Package size={9} weight="fill" /> Produk</span>}
                    {hasInspiration && <span className="px-1.5 py-0.5 rounded-full bg-white/90 text-brand text-[9px] font-bold flex items-center gap-0.5"><Camera size={9} weight="fill" /> Inspirasi</span>}
                  </div>
                </button>

                {/* Info */}
                <div className="p-4 flex-1 flex flex-col">
                  <button onClick={() => setSelected(p)} className="text-left flex-1">
                    <div className="font-heading font-semibold text-brand line-clamp-2 mb-1">{p.title}</div>
                    <div className="text-xs text-stone-500">{new Date(p.created_at).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })}</div>
                  </button>

                  {/* Actions */}
                  <div className="flex items-center gap-2 mt-3 pt-3 border-t border-stone-100">
                    <button onClick={() => setScheduling(p)} data-testid={`schedule-${p.id}`}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 bg-brand text-brand-cream rounded-full text-xs font-semibold hover:bg-brand-light btn-touch">
                      <CalendarPlus size={13} weight="fill" /> Jadwalkan
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); setSelected(p); }} data-testid={`view-${p.id}`}
                      className="px-3 py-2 border border-brand-sand text-brand rounded-full text-xs font-semibold hover:bg-brand-sand btn-touch">
                      Lihat
                    </button>
                    <button onClick={(e) => remove(p.id, e)} data-testid={`delete-${p.id}`}
                      className="p-2 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-full btn-touch">
                      <Trash size={14} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Schedule Modal */}
      {scheduling && (
        <ScheduleModal
          open={!!scheduling}
          onClose={() => setScheduling(null)}
          promptId={scheduling.id}
          imageBase64={scheduling.image_base64 || (scheduling.slide_images && scheduling.slide_images[0])}
          dashboardType={scheduling.dashboard_type}
          defaultTitle={scheduling.title}
          defaultCaption={scheduling.prompt_json?.captions?.[0]?.instagram || ""}
        />
      )}

      {/* Detail Modal */}
      {selected && (
        <div
          className="fixed inset-0 z-50 bg-brand/40 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-6"
          onClick={() => setSelected(null)}
          data-testid="prompt-modal"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-t-3xl sm:rounded-3xl max-w-3xl w-full max-h-[90vh] overflow-y-auto"
          >
            <div className="sticky top-0 bg-white border-b border-brand-sand px-6 py-4 flex items-center justify-between z-10 gap-3">
              <div className="min-w-0 flex-1">
                <div className="text-xs uppercase tracking-[0.18em] text-brand-light font-bold">{selected.dashboard_type}</div>
                <div className="font-heading text-lg font-bold text-brand truncate">{selected.title}</div>
              </div>
              <button onClick={() => { setScheduling(selected); setSelected(null); }} data-testid="modal-schedule-btn"
                className="flex-shrink-0 inline-flex items-center gap-1.5 px-4 py-2 bg-brand text-brand-cream rounded-full text-sm font-semibold hover:bg-brand-light btn-touch">
                <CalendarPlus size={14} weight="fill" /> Jadwalkan
              </button>
              <button
                onClick={() => setSelected(null)}
                data-testid="close-modal"
                className="h-9 w-9 rounded-full bg-brand-sand hover:bg-brand-gold/30 text-brand font-bold flex-shrink-0 flex items-center justify-center"
              >
                ✕
              </button>
            </div>
            <div className="p-6 space-y-4">
              {/* Data lengkap: produk + inspirasi */}
              <PromptAssets item={selected} />

              {selected.dashboard_type === "copywriting" ? (
                <CopyViewer data={selected.prompt_json} />
              ) : selected.dashboard_type === "carousel" ? (
                <CarouselViewer data={selected.prompt_json} />
              ) : selected.dashboard_type === "feed_generator" ? (
                <FeedGenViewer data={selected.prompt_json} />
              ) : (
                <JsonOutput json={selected.prompt_json} title={`${selected.title}.json`} testid="modal-json-output" />
              )}
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={deleteConfirm.open}
        onOpenChange={(v) => setDeleteConfirm((s) => ({ ...s, open: v }))}
        title="Hapus konten ini?"
        description="Prompt dan hasil generate ini akan dihapus permanen. Tindakan tidak bisa dibatalkan."
        confirmLabel="Hapus"
        variant="danger"
        loading={deleteConfirm.deleting}
        onConfirm={confirmDelete}
      />
    </div>
  );
}

// Product photo + inspiration photo + product knowledge shown at top of detail modal
function PromptAssets({ item }) {
  const product = item.product || null;
  const productPhoto = item.product_photo_base64;
  const inspiration = item.reference_image_base64;
  const benefits = product?.benefits || product?.features || [];
  if (!productPhoto && !inspiration && !product) return null;

  const src = (v) => (v?.startsWith("data:") ? v : `data:image/png;base64,${v}`);

  return (
    <div className="rounded-2xl border border-brand-sand bg-brand-sand/20 p-4 space-y-3">
      <div className="text-[10px] uppercase tracking-[0.18em] text-brand-light font-bold">Data yang dipakai</div>
      <div className="grid grid-cols-2 gap-3">
        {(productPhoto || product?.name) && (
          <div className="flex items-center gap-2.5">
            {productPhoto ? (
              <img src={src(productPhoto)} alt="produk" className="w-14 h-14 rounded-xl object-cover border border-stone-200 flex-shrink-0" />
            ) : (
              <div className="w-14 h-14 rounded-xl bg-brand/10 flex items-center justify-center flex-shrink-0"><Package size={22} weight="duotone" className="text-brand" /></div>
            )}
            <div className="min-w-0">
              <div className="text-[10px] text-stone-400 font-semibold">Produk</div>
              <div className="text-sm font-bold text-brand truncate">{product?.name || "Foto produk"}</div>
              {product?.category && <div className="text-[11px] text-stone-500 truncate">{product.category}</div>}
            </div>
          </div>
        )}
        {inspiration && (
          <div className="flex items-center gap-2.5">
            <img src={src(inspiration)} alt="inspirasi" className="w-14 h-14 rounded-xl object-cover border border-stone-200 flex-shrink-0" />
            <div className="min-w-0">
              <div className="text-[10px] text-stone-400 font-semibold">Foto inspirasi</div>
              <div className="text-sm font-bold text-brand">Referensi gaya</div>
              <a href={src(inspiration)} download="foto-inspirasi.jpg" className="text-[11px] text-brand hover:underline">Download</a>
            </div>
          </div>
        )}
      </div>
      {benefits.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-1">
          {benefits.slice(0, 6).map((b, i) => (
            <span key={i} className="text-[10px] px-2 py-0.5 bg-white text-brand rounded-full border border-brand-sand font-medium">{b}</span>
          ))}
        </div>
      )}
    </div>
  );
}

// Feed Generator saves { prompts:[{content_type,purpose,caption_angle,chatgpt_prompt,tip}], count, product_name }
function FeedGenViewer({ data }) {
  const prompts = data?.prompts || [];
  const [idx, setIdx] = useState(0);
  if (prompts.length === 0) return <JsonOutput json={data} title="feed-generator.json" testid="modal-json-output" />;
  const p = prompts[idx];
  return (
    <div className="space-y-3">
      <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
        {prompts.map((_, i) => (
          <button key={i} onClick={() => setIdx(i)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border ${idx === i ? "bg-brand text-brand-cream border-brand" : "bg-white border-brand-sand text-stone-700"}`}>
            {i + 1}
          </button>
        ))}
      </div>
      {p?.purpose && <div className="text-sm font-semibold text-brand">{p.purpose}</div>}
      {p?.caption_angle && (
        <div className="bg-brand-sand/40 rounded-xl px-3 py-2">
          <div className="text-[10px] uppercase tracking-widest text-stone-400 font-bold mb-0.5">Angle Caption</div>
          <p className="text-sm text-stone-700 italic">"{p.caption_angle}"</p>
        </div>
      )}
      <Line text={p?.chatgpt_prompt || ""} />
    </div>
  );
}

function CarouselViewer({ data }) {
  const [idx, setIdx] = useState(0);
  return (
    <div className="space-y-3">
      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
        {data.slides.map((s, i) => (
          <button
            key={i}
            onClick={() => setIdx(i)}
            className={`flex-shrink-0 px-3 py-2 rounded-full text-xs font-semibold border ${
              idx === i ? "bg-brand text-brand-cream border-brand" : "bg-white border-brand-sand text-stone-700"
            }`}
          >
            Slide {i + 1} · {s.slide_role}
          </button>
        ))}
      </div>
      <JsonOutput json={data.slides[idx]} title={`slide-${idx + 1}.json`} testid="modal-carousel-output" />
    </div>
  );
}

function CopyViewer({ data }) {
  return (
    <div className="space-y-4">
      {data.headlines && (
        <Section title="Headlines">
          {data.headlines.map((h, i) => <Line key={i} text={h} />)}
        </Section>
      )}
      {data.captions && (
        <Section title="Captions">
          {data.captions.map((c, i) => (
            <div key={i} className="p-3 bg-brand-sand/40 rounded-xl">
              <div className="text-xs uppercase tracking-wider text-brand-light font-bold mb-1">{c.style}</div>
              <div className="text-sm whitespace-pre-wrap">{c.text}</div>
            </div>
          ))}
        </Section>
      )}
      {data.cta_options && (
        <Section title="CTA Options">
          <div className="flex flex-wrap gap-2">
            {data.cta_options.map((c, i) => <span key={i} className="px-3 py-1.5 bg-brand-gold/20 rounded-full text-sm">{c}</span>)}
          </div>
        </Section>
      )}
      {data.hashtags && (
        <Section title="Hashtags">
          <div className="text-sm text-brand">{data.hashtags.join(" ")}</div>
        </Section>
      )}
    </div>
  );
}

function Section({ title, children }) {
  return <div>
    <div className="text-xs uppercase tracking-[0.15em] text-stone-500 font-semibold mb-2">{title}</div>
    <div className="space-y-2">{children}</div>
  </div>;
}

function Line({ text }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={async () => { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
      className="w-full flex items-center gap-2 p-3 bg-brand-sand/40 rounded-xl text-left hover:bg-brand-sand"
    >
      <span className="text-sm text-stone-700 flex-1">{text}</span>
      {copied ? <Check size={14} className="text-green-600" /> : <Copy size={14} className="text-stone-400" />}
    </button>
  );
}
