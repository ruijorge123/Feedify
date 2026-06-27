import { useEffect, useState } from "react";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import ModelTalentSection, { defaultHumanState, humanStateToPayload } from "@/components/ModelTalentSection";
import { toast } from 'react-toastify';
import { handleGenerateError } from "@/lib/moderation";
import {
  Storefront,
  Sparkle,
  CircleNotch,
  Camera,
  Tag,
  Percent,
  Images,
} from "@phosphor-icons/react";
import GeneratedPreview from "@/components/GeneratedPreview";
import BrandDnaCard from "@/components/BrandDnaCard";
import NoCreditsModal from "@/components/NoCreditsModal";
import JsonOutput from "@/components/JsonOutput";
import InspirationGallery from "@/components/InspirationGallery";
import { notifyCreditsUpdate } from "@/lib/credits";

const PLATFORMS = [
  { id: "shopee", name: "Shopee", color: "bg-orange-500" },
  { id: "tokopedia", name: "Tokopedia", color: "bg-green-600" },
  { id: "general", name: "General", color: "bg-brand" },
];

const PROMO_LABELS = ["Flash Sale", "Best Seller", "Gratis Ongkir", "Limited Stock", "New Arrival", "Bestseller"];

export default function MarketplacePage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [form, setForm] = useState({
    product_name: "",
    product_price: "",
    original_price: "",
    discount_percent: 0,
    promo_label: "",
    platform: "shopee",
    tagline: "",
    save: true,
  });
  const [photo, setPhoto] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [result, setResult] = useState(null);
  const [noCredits, setNoCredits] = useState(false);
  const [promptPreview, setPromptPreview] = useState(null);
  const [previewing, setPreviewing] = useState(false);
  const [humanState, setHumanState] = useState(defaultHumanState);
  const updHuman = (k, v) => setHumanState((s) => ({ ...s, [k]: v }));
  const [galleryOpen, setGalleryOpen] = useState(false);

  const upd = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  useEffect(() => {}, []);

  const handlePhoto = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error("Foto max 5MB"); return; }
    const reader = new FileReader();
    reader.onload = () => setPhoto(reader.result);
    reader.readAsDataURL(file);
  };

  const generate = async () => {
    if (!form.product_name.trim()) { toast.error("Nama produk wajib diisi"); return; }
    setGenerating(true);
    setResult(null);
    try {
      const payload = { ...form, ...humanStateToPayload(humanState) };
      if (photo) payload.product_photo_base64 = photo.split(",")[1];
      const { data } = await api.post("/prompt/generate-marketplace", payload);
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
      const payload = { ...form, ...humanStateToPayload(humanState) };
      if (photo) payload.product_photo_base64 = photo.split(",")[1];
      const { data } = await api.post("/prompt/preview-marketplace", payload);
      setPromptPreview(data);
    } catch {
      toast.error("Gagal memuat prompt");
    } finally {
      setPreviewing(false);
    }
  };

  const discountFromPrices = () => {
    const orig = parseFloat((form.original_price || "").replace(/[^0-9]/g, ""));
    const sale = parseFloat((form.product_price || "").replace(/[^0-9]/g, ""));
    if (orig > 0 && sale > 0 && orig > sale) {
      const pct = Math.round(((orig - sale) / orig) * 100);
      upd("discount_percent", pct);
    }
  };

  return (
    <div className="space-y-6" data-testid="marketplace-page">
      <div className="animate-fade-up">
        <h1 className="font-heading text-3xl sm:text-4xl font-bold text-brand tracking-tight">Marketplace Thumbnail</h1>
        <p className="text-stone-600 mt-2 max-w-2xl">
          Generate thumbnail produk siap upload ke Shopee, Tokopedia, atau marketplace lain — dengan price badge, discount tag, dan promo label otomatis.
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-5 animate-fade-up min-w-0">

          {/* Platform */}
          <div className="feedify-card p-6 space-y-5">
            <h3 className="font-heading text-lg font-semibold text-brand">Platform</h3>
            <div className="flex gap-3">
              {PLATFORMS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  data-testid={`platform-${p.id}`}
                  onClick={() => upd("platform", p.id)}
                  className={`flex-1 py-3 rounded-xl border-2 font-heading font-semibold text-sm transition-all btn-touch ${
                    form.platform === p.id
                      ? "border-brand bg-brand text-brand-cream"
                      : "border-brand-sand text-stone-600 hover:border-brand-light"
                  }`}
                >
                  {p.name}
                </button>
              ))}
            </div>
          </div>

          {/* Product info */}
          <div className="feedify-card p-6 space-y-5">
            <h3 className="font-heading text-lg font-semibold text-brand">Info Produk</h3>

            <Field label="Foto Produk (opsional)">
              <label htmlFor="mp-photo" data-testid="mp-photo-label" className="block cursor-pointer border-2 border-dashed border-brand-sand rounded-xl p-5 hover:border-brand-light text-center">
                {photo
                  ? <div><img src={photo} alt="produk" className="max-h-40 mx-auto rounded-lg" /><div className="text-xs text-stone-500 mt-2">Klik untuk ganti</div></div>
                  : <div className="py-3"><Camera size={28} className="mx-auto text-brand-light mb-1.5" weight="duotone" /><div className="text-sm font-medium text-brand">Upload foto produk</div><div className="text-[10px] text-stone-500">Foto asli digunakan sebagai referensi visual</div></div>
                }
              </label>
              <input id="mp-photo" type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={handlePhoto} data-testid="mp-photo-input" />
              <button
                type="button"
                onClick={() => setGalleryOpen(true)}
                data-testid="mp-gallery-btn"
                className="mt-2 w-full flex items-center justify-center gap-2 py-2.5 border border-dashed border-brand-sand rounded-xl text-sm font-semibold text-brand-light hover:border-brand hover:text-brand hover:bg-brand-sand/40 transition-all"
              >
                <Images size={16} weight="duotone" />
                Atau pilih dari Gallery Inspirasi Marketplace
              </button>
            </Field>

            <Field label="Nama Produk *">
              <input
                type="text"
                className="input"
                value={form.product_name}
                onChange={(e) => upd("product_name", e.target.value)}
                placeholder="mis. Sunscreen SPF 50+ Voyoa 30ml"
                data-testid="mp-product-name"
              />
            </Field>

            <Field label="Tagline / Deskripsi Singkat (opsional)">
              <input
                type="text"
                className="input"
                value={form.tagline}
                onChange={(e) => upd("tagline", e.target.value)}
                placeholder="mis. Beli sekarang, gratis ongkir!"
                data-testid="mp-tagline"
              />
            </Field>
          </div>

          {/* Pricing */}
          <div className="feedify-card p-6 space-y-5">
            <h3 className="font-heading text-lg font-semibold text-brand flex items-center gap-2">
              <Tag size={18} weight="duotone" /> Harga & Promo
            </h3>

            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Harga Jual">
                <input
                  type="text"
                  className="input"
                  value={form.product_price}
                  onChange={(e) => upd("product_price", e.target.value)}
                  onBlur={discountFromPrices}
                  placeholder="mis. Rp 89.000"
                  data-testid="mp-price"
                />
              </Field>
              <Field label="Harga Asli (opsional)">
                <input
                  type="text"
                  className="input"
                  value={form.original_price}
                  onChange={(e) => upd("original_price", e.target.value)}
                  onBlur={discountFromPrices}
                  placeholder="mis. Rp 120.000"
                  data-testid="mp-original-price"
                />
              </Field>
            </div>

            <Field label="Diskon (%)">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 flex-1 border border-brand-sand rounded-xl px-4 py-3 bg-white">
                  <Percent size={16} className="text-brand-light" />
                  <input
                    type="number"
                    min={0}
                    max={99}
                    className="flex-1 bg-transparent outline-none text-brand font-bold text-lg"
                    value={form.discount_percent || ""}
                    onChange={(e) => upd("discount_percent", parseInt(e.target.value) || 0)}
                    placeholder="0"
                    data-testid="mp-discount"
                  />
                  <span className="text-stone-400 text-sm">OFF</span>
                </div>
                {form.discount_percent > 0 && (
                  <div className="px-4 py-2 bg-red-500 text-white rounded-xl font-bold text-lg">
                    -{form.discount_percent}%
                  </div>
                )}
              </div>
            </Field>

            <Field label="Promo Label">
              <div className="flex flex-wrap gap-2 mb-2">
                {PROMO_LABELS.map((l) => (
                  <button
                    key={l}
                    type="button"
                    data-testid={`promo-label-${l}`}
                    onClick={() => upd("promo_label", form.promo_label === l ? "" : l)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold border btn-touch transition-all ${
                      form.promo_label === l
                        ? "bg-brand-gold text-brand border-brand-gold"
                        : "bg-white border-brand-sand text-stone-600"
                    }`}
                  >
                    {l}
                  </button>
                ))}
              </div>
              <input
                type="text"
                className="input"
                value={form.promo_label}
                onChange={(e) => upd("promo_label", e.target.value)}
                placeholder="atau ketik label kustom"
                data-testid="mp-promo-label"
              />
            </Field>
          </div>

          <ModelTalentSection state={humanState} onChange={updHuman} />

          {/* Actions */}
          <div className={isAdmin ? "flex flex-col sm:flex-row gap-3" : ""}>
            {isAdmin && (
              <button
                onClick={previewPrompt}
                disabled={previewing || generating}
                data-testid="mp-preview-btn"
                className="flex-1 py-4 bg-white border-2 border-brand text-brand rounded-full font-bold text-base hover:bg-brand-sand btn-lift inline-flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {previewing ? <><CircleNotch size={18} className="animate-spin" /> Memuat...</> : "Preview Konten"}
              </button>
            )}
            <button
              onClick={generate}
              disabled={generating}
              data-testid="mp-generate-btn"
              className={`${isAdmin ? "flex-1" : "w-full"} py-4 bg-brand text-brand-cream rounded-full font-bold text-base hover:bg-brand-light btn-lift inline-flex items-center justify-center gap-2 disabled:opacity-60 shadow-lg`}
            >
              {generating
                ? <><CircleNotch size={20} className="animate-spin" /> Memproses...</>
                : <><Sparkle size={20} weight="fill" /> Generate Thumbnail <span className="opacity-70 text-sm font-medium">(1 kredit)</span></>
              }
            </button>
          </div>

          {isAdmin && promptPreview && (
            <div className="animate-fade-up">
              <div className="text-xs uppercase tracking-[0.18em] text-brand-light font-semibold mb-2">Detail Konten</div>
              <JsonOutput json={promptPreview.prompt_json} title="Marketplace Prompt JSON" testid="mp-json-output" />
            </div>
          )}
        </div>

        <div className="lg:sticky lg:top-6 lg:self-start space-y-4">
          <div className="feedify-card p-5">
            <div className="text-xs uppercase tracking-[0.18em] text-brand-light font-bold mb-3 flex items-center gap-1.5">
              <Storefront size={14} weight="fill" /> Preview Thumbnail
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
        </div>
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

function Field({ label, children }) {
  return (
    <div>
      <label className="text-xs font-semibold uppercase tracking-[0.15em] text-stone-500 mb-1.5 block">{label}</label>
      {children}
    </div>
  );
}
