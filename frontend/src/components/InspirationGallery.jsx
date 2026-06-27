import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  X, MagnifyingGlass, CheckCircle, Images,
  TShirt, ForkKnife, Drop, Storefront,
  DeviceMobile, GraduationCap, User, Laptop,
  Books, BookOpen, Package, Star, Tag,
  Coffee, Wine, Hamburger, Cake, Camera,
  House,
} from "@phosphor-icons/react";

const ICON_MAP = {
  TShirt, ForkKnife, Drop, Storefront, StoreFront: Storefront,
  DeviceMobile, GraduationCap, User, Laptop,
  Books, BookOpen, Package, Star, Tag,
  Coffee, Wine, Hamburger, Cake, Camera,
  House,
};

const CONTEXT_LABELS = {
  banner: "Inspirasi Feed Post Brand",
  carousel: "Inspirasi Carousel Brand",
  food: "Inspirasi Foto F&B",
  marketplace: "Inspirasi Thumbnail Marketplace",
};

const CONTEXT_DESC = {
  banner: "Pilih foto postingan brand sebagai referensi gaya visual",
  carousel: "Foto tampil urut per brand — pilih sebagai referensi slide",
  food: "Referensi foto makanan & minuman profesional",
  marketplace: "Referensi thumbnail produk marketplace",
};

export default function InspirationGallery({ open, onClose, onSelect, context = "banner" }) {
  const [catalog, setCatalog] = useState(null);
  const [activeCategory, setActiveCategory] = useState("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    if (!open) return;
    setActiveCategory("all");
    setSearch("");
    setSelected(null);
    fetch("/gallery/index.json")
      .then((r) => r.json())
      .then(setCatalog)
      .catch(() => {});
  }, [open]);

  if (!open) return null;

  // Support both v1 (categories array) and v2 (contexts object)
  const contextData = catalog?.contexts?.[context];
  const categories = contextData?.categories ?? catalog?.categories ?? [];

  const allPhotos = categories.flatMap((c) =>
    (c.photos || []).map((p) => ({ ...p, category: c.id, categoryName: c.name }))
  );

  const filtered = allPhotos.filter((p) => {
    const matchCat = activeCategory === "all" || p.category === activeCategory;
    const matchSearch =
      !search ||
      p.description?.toLowerCase().includes(search.toLowerCase()) ||
      p.tags?.some((t) => t.toLowerCase().includes(search.toLowerCase()));
    return matchCat && matchSearch;
  });

  // For carousel: group photos by their "set" field (brand/set name), show as ordered rows
  const isCarousel = context === "carousel";

  const handleSelect = () => {
    if (!selected) return;
    onSelect(selected);
    onClose();
  };

  const title = CONTEXT_LABELS[context] ?? "Gallery Inspirasi";
  const desc = CONTEXT_DESC[context] ?? "Pilih foto sebagai referensi gaya visual";

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-white w-full sm:max-w-4xl max-h-[96vh] sm:max-h-[90vh] rounded-t-3xl sm:rounded-2xl flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-3 p-5 border-b border-stone-100">
          <div className="h-9 w-9 rounded-xl bg-brand-sand flex items-center justify-center">
            <Images size={18} weight="duotone" className="text-brand" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-heading text-lg font-bold text-brand">{title}</h2>
            <p className="text-xs text-stone-500 truncate">{desc}</p>
          </div>
          <button onClick={onClose} className="h-9 w-9 rounded-full hover:bg-stone-100 flex items-center justify-center text-stone-500 flex-shrink-0">
            <X size={18} weight="bold" />
          </button>
        </div>

        {/* Search */}
        <div className="px-5 pt-3 pb-0">
          <div className="flex items-center gap-2 bg-stone-50 border border-stone-200 rounded-xl px-3 py-2.5">
            <MagnifyingGlass size={16} className="text-stone-400 flex-shrink-0" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari berdasarkan tag atau deskripsi..."
              className="flex-1 bg-transparent text-sm outline-none text-stone-700 placeholder:text-stone-400"
            />
          </div>
        </div>

        {/* Category tabs */}
        <div className="border-b border-stone-100">
          <div className="flex gap-2 px-4 py-3 overflow-x-auto no-scrollbar"
               style={{ WebkitOverflowScrolling: "touch" }}>
            <button
              onClick={() => setActiveCategory("all")}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all whitespace-nowrap ${
                activeCategory === "all" ? "bg-brand text-white" : "bg-stone-100 text-stone-600 hover:bg-stone-200"
              }`}
            >
              Semua
            </button>
            {categories.map((cat) => {
              const Icon = ICON_MAP[cat.icon] || Images;
              return (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all whitespace-nowrap ${
                    activeCategory === cat.id ? "bg-brand text-white" : "bg-stone-100 text-stone-600 hover:bg-stone-200"
                  }`}
                >
                  <Icon size={12} weight="duotone" />
                  {cat.name}
                </button>
              );
            })}
          </div>
        </div>

        {/* Photo area */}
        <div className="flex-1 overflow-y-auto px-4 pt-4 pb-4">
          {!catalog ? (
            <div className="flex items-center justify-center h-40 text-stone-400 text-sm">Memuat gallery...</div>
          ) : filtered.length === 0 ? (
            <EmptyState category={activeCategory} categories={categories} context={context} />
          ) : isCarousel ? (
            // Carousel: neat list per brand/set, ordered rows
            <CarouselLayout photos={filtered} selected={selected} onSelect={setSelected} />
          ) : (
            // Default: responsive grid
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {filtered.map((photo) => {
                const isSelected = selected?.id === photo.id;
                return (
                  <PhotoCard key={photo.id} photo={photo} isSelected={isSelected} onSelect={() => setSelected(isSelected ? null : photo)} />
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-stone-100 bg-white flex items-center gap-3">
          {selected ? (
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <img
                src={`/gallery/${selected.category}/${selected.filename}`}
                alt=""
                className="h-10 w-10 rounded-lg object-cover flex-shrink-0 border border-brand-sand"
              />
              <div className="min-w-0">
                <div className="text-sm font-semibold text-brand truncate">{selected.description}</div>
                <div className="text-xs text-stone-400 truncate">{selected.tags?.slice(0, 3).join(", ")}</div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-stone-400 flex-1">Belum ada foto dipilih</p>
          )}
          <button onClick={onClose} className="px-4 py-2.5 rounded-full border border-stone-200 text-stone-600 text-sm font-medium hover:bg-stone-50">
            Batal
          </button>
          <button
            onClick={handleSelect}
            disabled={!selected}
            className="px-5 py-2.5 rounded-full bg-brand text-white text-sm font-semibold disabled:opacity-40 hover:bg-brand-light transition-all"
          >
            Pakai Referensi Ini
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

function PhotoCard({ photo, isSelected, onSelect }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`relative rounded-xl overflow-hidden aspect-[4/5] group border-2 transition-all ${
        isSelected ? "border-brand shadow-lg scale-[0.98]" : "border-transparent hover:border-brand/30"
      }`}
    >
      <img
        src={`/gallery/${photo.category}/${photo.filename}`}
        alt={photo.description}
        className="w-full h-full object-cover object-top"
        loading="lazy"
      />
      <div className={`absolute inset-0 bg-brand/60 flex flex-col items-center justify-center p-2 transition-opacity ${isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}>
        {isSelected && <CheckCircle size={28} weight="fill" className="text-white mb-1" />}
        <span className="text-white text-xs font-medium text-center leading-tight">{photo.description}</span>
      </div>
      {isSelected && (
        <div className="absolute top-2 right-2">
          <div className="h-6 w-6 rounded-full bg-brand flex items-center justify-center">
            <CheckCircle size={14} weight="fill" className="text-white" />
          </div>
        </div>
      )}
    </button>
  );
}

// Carousel: group by set, display as horizontal rows (ordered slides)
function CarouselLayout({ photos, selected, onSelect }) {
  // Group by set field (if exists), else by categoryName
  const groups = {};
  photos.forEach((p) => {
    const key = p.set || p.categoryName || "Lainnya";
    if (!groups[key]) groups[key] = [];
    groups[key].push(p);
  });

  return (
    <div className="space-y-6">
      {Object.entries(groups).map(([groupName, groupPhotos]) => (
        <div key={groupName}>
          <div className="text-xs uppercase tracking-[0.15em] font-bold text-stone-400 mb-2">{groupName}</div>
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
            {groupPhotos.map((photo, slideIdx) => {
              const isSelected = selected?.id === photo.id;
              return (
                <button
                  key={photo.id}
                  type="button"
                  onClick={() => onSelect(isSelected ? null : photo)}
                  className={`flex-shrink-0 w-28 rounded-xl overflow-hidden border-2 transition-all ${
                    isSelected ? "border-brand shadow-md scale-[0.97]" : "border-stone-200 hover:border-brand/40"
                  }`}
                >
                  <div className="relative aspect-square">
                    <img
                      src={`/gallery/${photo.category}/${photo.filename}`}
                      alt={photo.description}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                    <div className="absolute top-1 left-1 h-5 w-5 rounded-full bg-black/50 text-white text-[9px] font-bold flex items-center justify-center">
                      {slideIdx + 1}
                    </div>
                    {isSelected && (
                      <div className="absolute inset-0 bg-brand/50 flex items-center justify-center">
                        <CheckCircle size={22} weight="fill" className="text-white" />
                      </div>
                    )}
                  </div>
                  <div className="px-1.5 py-1 bg-white">
                    <div className="text-[9px] text-stone-500 truncate">{photo.description || `Slide ${slideIdx + 1}`}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState({ category, categories, context }) {
  const cat = categories?.find((c) => c.id === category);
  const folderHint = category === "all" ? "<kategori>" : category;
  return (
    <div className="flex flex-col items-center justify-center h-56 text-center px-6">
      <div className="h-16 w-16 rounded-2xl bg-stone-100 flex items-center justify-center mb-4">
        <Images size={28} className="text-stone-300" weight="duotone" />
      </div>
      <p className="font-semibold text-stone-600 mb-1">
        {category === "all" ? "Gallery masih kosong" : `"${cat?.name || category}" masih kosong`}
      </p>
      <p className="text-xs text-stone-400 max-w-xs leading-relaxed">
        Tambahkan foto ke folder{" "}
        <code className="bg-stone-100 px-1 py-0.5 rounded text-stone-500">
          public/gallery/{folderHint}/
        </code>{" "}
        dan daftarkan di{" "}
        <code className="bg-stone-100 px-1 py-0.5 rounded text-stone-500">index.json</code> di bagian context <strong>{context}</strong>.
      </p>
    </div>
  );
}
