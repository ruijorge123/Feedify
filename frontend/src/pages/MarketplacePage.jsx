import { useState } from "react";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { toast } from "react-toastify";
import { handleGenerateError } from "@/lib/moderation";
import {
  Storefront, Sparkle, CircleNotch, Camera, Images,
  Star, Lightning, Crown, Minus, CheckCircle, Tag,
  User, ArrowRight, Info,
} from "@phosphor-icons/react";
import GeneratedPreview from "@/components/GeneratedPreview";
import BrandDnaCard from "@/components/BrandDnaCard";
import NoCreditsModal from "@/components/NoCreditsModal";
import JsonOutput from "@/components/JsonOutput";
import InspirationGallery from "@/components/InspirationGallery";
import { notifyCreditsUpdate } from "@/lib/credits";

const THUMBNAIL_STYLES = [
  {
    id: "clean",
    label: "Clean Marketplace",
    desc: "Produk jelas, cocok semua kategori",
    Icon: Storefront,
    color: "text-brand",
    bg: "bg-brand-sand",
  },
  {
    id: "high_conversion",
    label: "High Conversion",
    desc: "Kontras tinggi, badge kuat, cocok untuk iklan",
    Icon: Lightning,
    color: "text-amber-600",
    bg: "bg-amber-50",
    recommended: true,
  },
  {
    id: "premium",
    label: "Premium",
    desc: "Elegan & mewah",
    Icon: Crown,
    color: "text-violet-600",
    bg: "bg-violet-50",
  },
  {
    id: "minimal",
    label: "Minimal",
    desc: "Tanpa elemen berlebihan",
    Icon: Minus,
    color: "text-stone-500",
    bg: "bg-stone-100",
  },
];

const MAKO_DIMS = [
  { key: "M", label: "Manfaat", desc: "Terbaca < 3 detik" },
  { key: "A", label: "Aksen", desc: "2–3 aksen visual" },
  { key: "K", label: "Kontras", desc: "Menonjol di antara kompetitor" },
  { key: "O", label: "Objek", desc: "Produk sebagai fokus utama" },
];

const DEFAULT_FORM = {
  product_name: "",
  benefit_utama: "",
  product_price: "",
  original_price: "",
  thumbnail_style: "high_conversion",
  creative_direction: "",
  include_model: false,
  save: true,
};

export default function MarketplacePage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const [form, setForm] = useState(DEFAULT_FORM);
  const [photo, setPhoto] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState(null);
  const [noCredits, setNoCredits] = useState(false);
  const [promptPreview, setPromptPreview] = useState(null);
  const [previewing, setPreviewing] = useState(false);
  const [galleryOpen, setGalleryOpen] = useState(false);

  const upd = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handlePhoto = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error("Foto max 5MB"); return; }
    const reader = new FileReader();
    reader.onload = () => setPhoto(reader.result);
    reader.readAsDataURL(file);
  };

  const buildPayload = () => {
    const orig = parseFloat((form.original_price || "").replace(/[^0-9]/g, ""));
    const sale = parseFloat((form.product_price || "").replace(/[^0-9]/g, ""));
    const discount_percent = (orig > 0 && sale > 0 && orig > sale)
      ? Math.round(((orig - sale) / orig) * 100)
      : 0;
    const payload = {
      ...form,
      tagline: form.benefit_utama,
      platform: "general",
      promo_label: "",
      discount_percent,
    };
    if (photo) payload.product_photo_base64 = photo.split(",")[1];
    return payload;
  };

  const generate = async () => {
    if (!form.product_name.trim()) { toast.error("Nama produk wajib diisi"); return; }
    setGenerating(true);
    setResult(null);
    try {
      const { data } = await api.post("/prompt/generate-marketplace", buildPayload());
      setResult(data);
      if (data.credits) notifyCreditsUpdate(data.credits);
      toast.success("Thumbnail marketplace siap!");
    } catch (err) {
      if (err?.response?.status === 402) setNoCredits(true);
      else { const handled = handleGenerateError(err); if (!handled) toast.error("Gagal generate. Coba lagi."); }
    } finally {
      setGenerating(false);
    }
  };

  const previewPrompt = async () => {
    if (!form.product_name.trim()) { toast.error("Nama produk wajib diisi dulu"); return; }
    setPreviewing(true);
    setPromptPreview(null);
    try {
      const { data } = await api.post("/prompt/preview-marketplace", buildPayload());
      setPromptPreview(data);
    } catch {
      toast.error("Gagal memuat prompt");
    } finally {
      setPreviewing(false);
    }
  };

  return (
    <div className="space-y-6" data-testid="marketplace-page">

      {/* Header */}
      <div className="animate-fade-up">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand-gold bg-brand-gold/10 px-2.5 py-1 rounded-full border border-brand-gold/20">
            M.A.K.O Framework
          </span>
        </div>
        <h1 className="font-heading text-3xl sm:text-4xl font-bold text-brand tracking-tight">
          Marketplace Generator
        </h1>
        <p className="text-stone-600 mt-2 max-w-2xl">
          Thumbnail yang tidak hanya bagus — tapi dirancang untuk meningkatkan CTR dan konversi penjualan.
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">

        {/* ── Left column ── */}
        <div className="lg:col-span-2 space-y-5 animate-fade-up min-w-0">

          {/* 01 Produk */}
          <div className="feedify-card p-6 space-y-5">
            <SectionHeader num="01" title="Produk" />

            {/* Foto */}
            <Field label="Upload Foto Produk">
              <label htmlFor="mp-photo" data-testid="mp-photo-label"
                className="block cursor-pointer border-2 border-dashed border-brand-sand rounded-xl hover:border-brand-light transition-colors text-center">
                {photo ? (
                  <div className="p-3">
                    <img src={photo} alt="produk" className="max-h-44 mx-auto rounded-lg object-contain" />
                    <div className="text-xs text-stone-400 mt-2">Klik untuk ganti</div>
                  </div>
                ) : (
                  <div className="py-7 px-4">
                    <Camera size={32} className="mx-auto text-brand-light mb-2" weight="duotone" />
                    <div className="text-sm font-semibold text-brand">Upload foto produk</div>
                    <div className="text-[11px] text-stone-400 mt-1">JPG, PNG, WEBP · max 5MB</div>
                  </div>
                )}
              </label>
              <input id="mp-photo" type="file" accept="image/png,image/jpeg,image/webp"
                className="hidden" onChange={handlePhoto} data-testid="mp-photo-input" />
              <button type="button" onClick={() => setGalleryOpen(true)} data-testid="mp-gallery-btn"
                className="mt-2 w-full flex items-center justify-center gap-2 py-2.5 border border-dashed border-brand-sand rounded-xl text-sm font-semibold text-brand-light hover:border-brand hover:text-brand hover:bg-brand-sand/40 transition-all">
                <Images size={16} weight="duotone" />
                Atau pilih dari Gallery Inspirasi
              </button>
            </Field>

            {/* Nama Produk */}
            <Field label="Nama Produk *">
              <input type="text" className="input" value={form.product_name}
                onChange={(e) => upd("product_name", e.target.value)}
                placeholder="mis. Sunscreen SPF 50+ Voyoa 30ml"
                data-testid="mp-product-name" />
            </Field>

            {/* Benefit Utama */}
            <Field
              label="Benefit Utama *"
              hint="Tuliskan manfaat yang paling membuat orang membeli."
            >
              <textarea
                className="input resize-none text-sm leading-relaxed"
                rows={4}
                value={form.benefit_utama}
                onChange={(e) => upd("benefit_utama", e.target.value)}
                placeholder={"• SPF50 PA++++\n• Anti Whitecast\n• Waterproof 12 Jam\n• Menghilangkan Bau Kaki\n• Anti Bocor"}
                data-testid="mp-benefit"
              />
            </Field>
          </div>

          {/* 02 Harga */}
          <div className="feedify-card p-6 space-y-5">
            <SectionHeader num="02" title="Harga" />

            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Harga Jual">
                <input type="text" className="input" value={form.product_price}
                  onChange={(e) => upd("product_price", e.target.value)}
                  placeholder="mis. Rp 89.000"
                  data-testid="mp-price" />
              </Field>
              <Field label="Harga Coret (opsional)" hint="Jika diisi, AI otomatis membuat badge diskon.">
                <input type="text" className="input" value={form.original_price}
                  onChange={(e) => upd("original_price", e.target.value)}
                  placeholder="mis. Rp 120.000"
                  data-testid="mp-original-price" />
              </Field>
            </div>

            {/* Live discount preview */}
            {(() => {
              const orig = parseFloat((form.original_price || "").replace(/[^0-9]/g, ""));
              const sale = parseFloat((form.product_price || "").replace(/[^0-9]/g, ""));
              if (orig > 0 && sale > 0 && orig > sale) {
                const pct = Math.round(((orig - sale) / orig) * 100);
                return (
                  <div className="flex items-center gap-2 text-xs text-green-700 bg-green-50 border border-green-200 rounded-xl px-3 py-2.5">
                    <CheckCircle size={14} weight="fill" className="text-green-500 flex-shrink-0" />
                    AI akan otomatis membuat badge <span className="font-bold">-{pct}% OFF</span> pada thumbnail
                  </div>
                );
              }
              return null;
            })()}
          </div>

          {/* 03 Gaya Thumbnail */}
          <div className="feedify-card p-6 space-y-4">
            <div>
              <SectionHeader num="03" title="Gaya Thumbnail" />
              <p className="text-xs text-stone-400 mt-1">Pilih tujuan thumbnail — bukan style desain.</p>
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              {THUMBNAIL_STYLES.map(({ id, label, desc, Icon, color, bg, recommended }) => {
                const active = form.thumbnail_style === id;
                return (
                  <button
                    key={id}
                    type="button"
                    data-testid={`style-${id}`}
                    onClick={() => upd("thumbnail_style", id)}
                    className={`relative text-left p-4 rounded-2xl border-2 transition-all btn-touch ${
                      active
                        ? "border-brand bg-brand-sand shadow-sm"
                        : "border-stone-100 bg-white hover:border-brand/30"
                    }`}
                  >
                    {recommended && (
                      <span className="absolute top-2.5 right-2.5 text-[9px] font-bold bg-brand-gold text-brand px-2 py-0.5 rounded-full">
                        ⭐ Recommended
                      </span>
                    )}
                    <div className={`h-9 w-9 rounded-xl ${bg} flex items-center justify-center mb-3`}>
                      <Icon size={18} weight="duotone" className={color} />
                    </div>
                    <div className={`font-semibold text-sm ${active ? "text-brand" : "text-stone-700"}`}>{label}</div>
                    <div className="text-[11px] text-stone-400 mt-0.5 leading-snug">{desc}</div>
                    {active && (
                      <div className="absolute bottom-3 right-3">
                        <CheckCircle size={16} weight="fill" className="text-brand" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 04 AI Creative Direction */}
          <div className="feedify-card p-6 space-y-4">
            <div>
              <SectionHeader num="04" title="AI Creative Direction" optional />
              <p className="text-xs text-stone-400 mt-1">
                Jika dikosongkan, Feedify akan memilih arahan terbaik secara otomatis.
              </p>
            </div>

            <textarea
              className="input resize-none text-sm"
              rows={3}
              value={form.creative_direction}
              onChange={(e) => upd("creative_direction", e.target.value)}
              placeholder={"Misalnya:\n• background hijau fresh\n• nuansa premium, warna emas hitam\n• estetik skincare · vibe clean laboratory"}
              data-testid="mp-creative-direction"
            />
          </div>

          {/* 05 Model */}
          <div className="feedify-card p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <SectionHeader num="05" title="Tampilkan Model" />
                <p className="text-xs text-stone-400 mt-1">Produk saja lebih fokus dan lebih cepat dikenali.</p>
              </div>
              <button
                type="button"
                data-testid="mp-model-toggle"
                onClick={() => upd("include_model", !form.include_model)}
                className={`relative flex-shrink-0 w-12 h-6 rounded-full transition-colors mt-1 ${
                  form.include_model ? "bg-brand" : "bg-stone-200"
                }`}
              >
                <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${
                  form.include_model ? "left-[calc(100%-1.375rem)]" : "left-0.5"
                }`} />
              </button>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <button type="button" onClick={() => upd("include_model", false)}
                data-testid="mp-model-none"
                className={`flex items-center gap-2.5 px-4 py-3 rounded-xl border-2 text-sm font-medium transition-all btn-touch ${
                  !form.include_model
                    ? "border-brand bg-brand-sand text-brand"
                    : "border-stone-100 text-stone-500 hover:border-stone-200"
                }`}>
                <Storefront size={16} weight={!form.include_model ? "fill" : "regular"} />
                <div className="text-left">
                  <div className="font-semibold text-xs">Produk Saja</div>
                  <div className="text-[10px] text-stone-400">Recommended</div>
                </div>
              </button>
              <button type="button" onClick={() => upd("include_model", true)}
                data-testid="mp-model-include"
                className={`flex items-center gap-2.5 px-4 py-3 rounded-xl border-2 text-sm font-medium transition-all btn-touch ${
                  form.include_model
                    ? "border-brand bg-brand-sand text-brand"
                    : "border-stone-100 text-stone-500 hover:border-stone-200"
                }`}>
                <User size={16} weight={form.include_model ? "fill" : "regular"} />
                <div className="text-left">
                  <div className="font-semibold text-xs">Sertakan Model</div>
                  <div className="text-[10px] text-stone-400">Lifestyle feel</div>
                </div>
              </button>
            </div>
          </div>

          {/* Feedify akan otomatis */}
          <div className="rounded-2xl border border-green-100 p-5 bg-gradient-to-br from-green-50/60 to-white" data-testid="mp-ai-card">
            <div className="flex items-center gap-2 mb-3">
              <Sparkle size={14} weight="fill" className="text-brand-gold" />
              <p className="text-sm font-semibold text-brand">Feedify akan otomatis</p>
            </div>
            <div className="space-y-2">
              {[
                "Menganalisis foto produk dan identifikasi visual utama",
                "Menerapkan framework M.A.K.O untuk meningkatkan CTR",
                "Membuat badge diskon dari selisih harga secara otomatis",
                "Menonjolkan benefit utama agar terbaca dalam 3 detik",
                "Menghasilkan thumbnail siap upload ke semua marketplace",
              ].map((item) => (
                <div key={item} className="flex items-center gap-2.5">
                  <CheckCircle size={14} weight="fill" className="text-green-500 flex-shrink-0" />
                  <span className="text-xs text-stone-600">{item}</span>
                </div>
              ))}
            </div>
            <p className="text-[11px] text-stone-400 mt-4">⏱ Estimasi proses sekitar 20–40 detik.</p>
          </div>

          {/* Desktop Generate */}
          <div className="hidden lg:block space-y-2 pt-1">
            {isAdmin && (
              <button onClick={previewPrompt} disabled={previewing || generating}
                data-testid="mp-preview-btn"
                className="w-full h-10 border-2 border-brand text-brand rounded-full font-bold text-sm hover:bg-brand-sand transition-colors disabled:opacity-60 inline-flex items-center justify-center gap-1.5">
                {previewing ? <CircleNotch size={13} className="animate-spin" /> : <CheckCircle size={13} weight="duotone" />}
                Preview Prompt
              </button>
            )}
            <button onClick={generate} disabled={generating} data-testid="mp-generate-btn"
              className="w-full py-4 bg-brand text-brand-cream rounded-full font-bold text-base hover:bg-brand-light btn-lift inline-flex flex-col items-center justify-center gap-0.5 disabled:opacity-60 shadow-lg shadow-brand/20 transition-colors">
              {generating ? (
                <span className="flex items-center gap-2"><CircleNotch size={18} className="animate-spin" /> Sedang mengoptimalkan...</span>
              ) : (
                <>
                  <span className="flex items-center gap-2"><Sparkle size={18} weight="fill" /> Generate High Conversion Thumbnail</span>
                  <span className="text-[11px] font-normal text-brand-cream/60">Dioptimalkan menggunakan framework M.A.K.O</span>
                </>
              )}
            </button>
          </div>

          {isAdmin && promptPreview && (
            <div className="animate-fade-up">
              <JsonOutput json={promptPreview.prompt_json} title="Marketplace Prompt JSON" testid="mp-json-output" />
            </div>
          )}
        </div>

        {/* ── Sidebar ── */}
        <div className="lg:sticky lg:top-6 lg:self-start space-y-4">

          {/* M.A.K.O Score */}
          <div className="feedify-card p-5 space-y-4">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-xl bg-brand-gold/15 border border-brand-gold/25 flex items-center justify-center flex-shrink-0">
                <Star size={16} weight="fill" className="text-brand-gold" />
              </div>
              <div>
                <div className="font-heading font-bold text-sm text-brand">Marketplace Score</div>
                <div className="text-[10px] text-stone-400 font-semibold tracking-wider">M.A.K.O Framework</div>
              </div>
            </div>

            <div className="space-y-3">
              {MAKO_DIMS.map(({ key, label, desc }) => (
                <div key={key} className="flex items-center gap-3">
                  <div className="h-7 w-7 rounded-lg bg-brand flex-shrink-0 flex items-center justify-center">
                    <span className="text-[10px] font-black text-brand-gold">{key}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-xs font-semibold text-stone-700">{label}</span>
                      <div className="flex gap-0.5">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star key={i} size={10} weight="fill" className="text-brand-gold" />
                        ))}
                      </div>
                    </div>
                    <div className="text-[10px] text-stone-400">{desc}</div>
                  </div>
                </div>
              ))}
            </div>

            <p className="text-[10px] text-stone-400 border-t border-stone-100 pt-3">
              AI mengoptimalkan semua dimensi M.A.K.O secara otomatis.
            </p>
          </div>

          {/* Preview */}
          <div className="feedify-card p-5">
            <div className="text-xs uppercase tracking-[0.18em] text-brand-light font-bold mb-3 flex items-center gap-1.5">
              <Storefront size={14} weight="fill" /> Preview
            </div>
            <GeneratedPreview
              imageBase64={result?.image_base64}
              loading={generating}
              aspectRatio="1:1 (Square Feed)"
              testid="mp-preview"
            />
            {result && (
              <div className="mt-3">
                <div className="text-xs text-green-700 bg-green-50 px-2 py-1 rounded-full inline-flex items-center gap-1">
                  ✓ Tersimpan di History
                </div>
              </div>
            )}
          </div>

          <BrandDnaCard />

          {/* Edukasi M.A.K.O */}
          <div className="rounded-2xl border border-brand-sand bg-gradient-to-br from-brand-sand/40 to-white p-5 space-y-4">
            <div className="flex items-start gap-2">
              <Info size={16} weight="duotone" className="text-brand flex-shrink-0 mt-0.5" />
              <p className="text-xs font-bold text-brand leading-snug">
                Kenapa Thumbnail Feedify Bisa Meningkatkan Penjualan?
              </p>
            </div>
            <p className="text-[11px] text-stone-500 leading-relaxed">
              Feedify menggunakan framework <strong className="text-brand">M.A.K.O</strong> yang dirancang berdasarkan perilaku pembeli marketplace.
            </p>
            <div className="space-y-3">
              {[
                { key: "M", label: "Manfaat", text: "Harus terbaca kurang dari 3 detik." },
                { key: "A", label: "Aksen", text: "Hanya 2–3 aksen visual agar fokus tidak pecah." },
                { key: "K", label: "Kontras", text: "Produk lebih menonjol di antara ratusan kompetitor." },
                { key: "O", label: "Objek", text: "Produk selalu jadi fokus utama sehingga langsung dikenali." },
              ].map(({ key, label, text }) => (
                <div key={key} className="flex items-start gap-2.5">
                  <div className="h-5 w-5 rounded-md bg-brand flex-shrink-0 flex items-center justify-center mt-0.5">
                    <span className="text-[9px] font-black text-brand-gold">{key}</span>
                  </div>
                  <div className="text-[11px] text-stone-600">
                    <span className="font-semibold text-stone-700">{label} — </span>{text}
                  </div>
                </div>
              ))}
            </div>
            <p className="text-[10px] text-stone-400 border-t border-stone-100 pt-3">
              Semua prinsip diterapkan otomatis oleh AI — kamu tidak perlu memahami desain.
            </p>
          </div>
        </div>
      </div>

      {/* Mobile sticky generate */}
      <div className="lg:hidden fixed bottom-16 left-0 right-0 z-50 px-4 pb-3 pt-2 bg-gradient-to-t from-brand-cream via-brand-cream/95 to-transparent">
        <button onClick={generate} disabled={generating} data-testid="mp-generate-btn-mobile"
          className="w-full py-3.5 bg-brand text-brand-cream rounded-full font-heading font-bold text-base flex flex-col items-center justify-center gap-0 disabled:opacity-60 shadow-lg shadow-brand/20 btn-lift transition-all">
          {generating ? (
            <span className="flex items-center gap-2"><CircleNotch size={18} className="animate-spin" /> Sedang mengoptimalkan...</span>
          ) : (
            <>
              <span className="flex items-center gap-2"><Sparkle size={18} weight="fill" /> Generate High Conversion Thumbnail</span>
              <span className="text-[10px] font-normal text-brand-cream/60">Dioptimalkan dengan framework M.A.K.O</span>
            </>
          )}
        </button>
      </div>

      <NoCreditsModal open={noCredits} onClose={() => setNoCredits(false)} />
      <InspirationGallery
        open={galleryOpen}
        onClose={() => setGalleryOpen(false)}
        context="marketplace"
        onSelect={(photo) => {
          fetch(`/gallery/${photo.category}/${photo.filename}`)
            .then((r) => r.blob())
            .then((blob) => {
              const reader = new FileReader();
              reader.onload = () => setPhoto(reader.result);
              reader.readAsDataURL(blob);
            });
        }}
      />
    </div>
  );
}

function SectionHeader({ num, title, optional }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="text-[10px] font-black text-brand-gold bg-brand px-2 py-0.5 rounded-full tracking-widest">{num}</span>
      <h3 className="font-heading text-base font-bold text-brand">{title}</h3>
      {optional && (
        <span className="text-[10px] font-semibold text-stone-400 bg-stone-100 px-2 py-0.5 rounded-full">Opsional</span>
      )}
    </div>
  );
}

function Field({ label, hint, children }) {
  return (
    <div>
      <label className="text-xs font-semibold uppercase tracking-[0.15em] text-stone-500 mb-1.5 block">{label}</label>
      {children}
      {hint && <p className="text-[10px] text-stone-400 mt-1.5">{hint}</p>}
    </div>
  );
}
