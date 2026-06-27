import { useEffect, useState } from "react";
import api from "@/lib/api";
import { toast } from 'react-toastify';
import {
  Camera,
  Sparkle,
  X,
  Plus,
  CircleNotch,
  Lightning,
  CheckCircle,
  Code,
  Images,
  Copy,
  Check,
  ChatCircle,
  Hash,
} from "@phosphor-icons/react";
import GeneratedPreview from "@/components/GeneratedPreview";
import BrandDnaCard from "@/components/BrandDnaCard";
import NoCreditsModal from "@/components/NoCreditsModal";
import ReferenceUpload from "@/components/ReferenceUpload";
import JsonOutput from "@/components/JsonOutput";
import InspirationGallery from "@/components/InspirationGallery";
import { notifyCreditsUpdate } from "@/lib/credits";

const ASPECT_RATIOS = [
  { id: "1:1 (Square Feed)", label: "1:1 Square", w: 100, h: 100 },
  { id: "4:5 (Portrait Feed)", label: "4:5 Portrait", w: 80, h: 100 },
  { id: "9:16 (Story/Reels)", label: "9:16 Story", w: 56, h: 100 },
  { id: "16:9 (Landscape)", label: "16:9 Landscape", w: 100, h: 56 },
];
const STYLE_PRESETS = ["Minimal Clean", "Editorial", "Vibrant Pop", "Lifestyle", "Luxury"];
const PLACEMENTS = [
  { id: "center", label: "Tengah" },
  { id: "left", label: "Kiri" },
  { id: "right", label: "Kanan" },
  { id: "top", label: "Atas" },
  { id: "bottom", label: "Bawah" },
];

export default function BannerGeneratorPage() {
  const [form, setForm] = useState({
    headline: "",
    subheadline: "",
    description: "",
    call_to_action: "",
    features: [],
    product_name: "",
    aspect_ratio: "4:5 (Portrait Feed)",
    style_preset: "Minimal Clean",
    placement_rule: "center",
  });
  const [featureInput, setFeatureInput] = useState("");
  const [photo, setPhoto] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [result, setResult] = useState(null);
  const [noCredits, setNoCredits] = useState(false);
  const [referenceImg, setReferenceImg] = useState(null);
  const [promptPreview, setPromptPreview] = useState(null);
  const [previewing, setPreviewing] = useState(false);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [captions, setCaptions] = useState(null);
  const [generatingCaptions, setGeneratingCaptions] = useState(false);

  useEffect(() => {
    api.get("/brand-profile").then(({ data }) => {
      if (data?.default_cta) setForm((f) => ({ ...f, call_to_action: data.default_cta }));
    }).catch(() => {});
  }, []);

  const upd = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handlePhoto = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error("Foto max 5MB"); return; }
    const reader = new FileReader();
    reader.onload = () => setPhoto(reader.result);
    reader.readAsDataURL(file);
  };

  const addFeature = () => {
    if (!featureInput.trim()) return;
    upd("features", [...form.features, featureInput.trim()]);
    setFeatureInput("");
  };
  const removeFeature = (i) => upd("features", form.features.filter((_, idx) => idx !== i));

  const generateCaptions = async (formData) => {
    setGeneratingCaptions(true);
    setCaptions(null);
    try {
      const { data } = await api.post("/prompt/generate-caption-bundle", {
        product_name: formData.product_name,
        product_description: formData.description,
        headline: formData.headline,
        tone: "friendly",
        platform: "instagram",
        content_purpose: "soft_selling",
      });
      if (!data.error) setCaptions(data);
    } catch {}
    finally { setGeneratingCaptions(false); }
  };

  const generate = async () => {
    if (!form.headline.trim()) { toast.error("Headline wajib diisi"); return; }
    setGenerating(true);
    setResult(null);
    setCaptions(null);
    try {
      const payload = { ...form };
      if (photo) payload.product_photo_base64 = photo.split(",")[1];
      if (referenceImg) payload.reference_image_base64 = referenceImg.split(",")[1];
      const { data } = await api.post("/prompt/generate-banner", payload);
      setResult(data);
      if (data.credits) notifyCreditsUpdate(data.credits);
      toast.success("Gambar berhasil dibuat!");
      generateCaptions(form);
    } catch (err) {
      if (err?.response?.status === 402) {
        setNoCredits(true);
      } else {
        toast.error(err?.response?.data?.detail || "Gagal generate");
      }
    } finally {
      setGenerating(false);
    }
  };

  const regenerate = async () => {
    if (!result?.id) return;
    setRegenerating(true);
    try {
      const { data } = await api.post("/prompt/regenerate", { prompt_id: result.id });
      setResult({ ...result, image_base64: data.image_base64 });
      if (data.credits) notifyCreditsUpdate(data.credits);
      toast.success("Regenerated!");
    } catch (err) {
      if (err?.response?.status === 402) setNoCredits(true);
      else toast.error("Gagal regenerate");
    } finally {
      setRegenerating(false);
    }
  };

  const previewPrompt = async () => {
    if (!form.headline.trim()) { toast.error("Headline wajib diisi dulu"); return; }
    setPreviewing(true);
    setPromptPreview(null);
    try {
      const payload = { ...form };
      if (photo) payload.product_photo_base64 = photo.split(",")[1];
      if (referenceImg) payload.reference_image_base64 = referenceImg.split(",")[1];
      const { data } = await api.post("/prompt/preview-banner", payload);
      setPromptPreview(data);
      setTimeout(() => document.getElementById("prompt-preview-panel")?.scrollIntoView({ behavior: "smooth" }), 100);
    } catch {
      toast.error("Gagal memuat prompt");
    } finally {
      setPreviewing(false);
    }
  };

  return (
    <div className="space-y-6" data-testid="banner-generator-page">
      <div className="animate-fade-up">
        <div className="text-xs uppercase tracking-[0.2em] text-brand-light font-semibold mb-2">Generate · Feed Post</div>
        <h1 className="font-heading text-3xl sm:text-4xl font-bold text-brand tracking-tight">Feed Post Generator</h1>
        <p className="text-stone-600 mt-2 max-w-2xl">Generate konten feed Instagram siap posting — isi info produk, pilih gaya visual, upload foto, dan hasilnya langsung muncul.</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6 animate-fade-up">
          <div className="feedify-card p-6 space-y-5">
            <h3 className="font-heading text-lg font-semibold text-brand">Info Konten</h3>
            <Field label="Headline *"><input required data-testid="banner-headline" value={form.headline} onChange={(e) => upd("headline", e.target.value)} placeholder="mis. Sunscreen ringan tanpa whitecast" className="input" /></Field>
            <Field label="Tagline Pendukung (opsional)"><input data-testid="banner-subheadline" value={form.subheadline} onChange={(e) => upd("subheadline", e.target.value)} placeholder="mis. Diformulasikan oleh dermatolog" className="input" /></Field>
            <Field label="Nama Produk"><input data-testid="banner-product-name" value={form.product_name} onChange={(e) => upd("product_name", e.target.value)} placeholder="mis. Voyoa Sunscreen SPF 50+" className="input" /></Field>
            <Field label="Deskripsi"><textarea data-testid="banner-description" value={form.description} onChange={(e) => upd("description", e.target.value)} placeholder="1-2 kalimat tentang produk" rows={2} className="input resize-none" /></Field>
            <Field label="Call-to-Action"><input data-testid="banner-cta" value={form.call_to_action} onChange={(e) => upd("call_to_action", e.target.value)} placeholder="Beli di Shopee" className="input" /></Field>

            <Field label="Fitur Unggulan (opsional)">
              <div className="flex flex-wrap gap-2 mb-2">
                {form.features.map((f, i) => (
                  <span key={i} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-brand-sand rounded-full text-sm text-brand">
                    {f}<button onClick={() => removeFeature(i)} data-testid={`remove-feature-${i}`}><X size={14} weight="bold" /></button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input data-testid="feature-input" value={featureInput} onChange={(e) => setFeatureInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addFeature())} placeholder="Tambahkan fitur..." className="input flex-1" />
                <button onClick={addFeature} data-testid="add-feature-btn" className="px-4 py-3 bg-brand-sand text-brand rounded-xl hover:bg-brand-gold/30 font-semibold"><Plus size={18} weight="bold" /></button>
              </div>
            </Field>
          </div>

          <div className="feedify-card p-6 space-y-4">
            <h3 className="font-heading text-lg font-semibold text-brand">Foto Produk (opsional)</h3>
            <label htmlFor="banner-photo" data-testid="banner-photo-label" className="block cursor-pointer border-2 border-dashed border-brand-sand rounded-xl p-6 hover:border-brand-light text-center">
              {photo ? <div><img src={photo} alt="produk" className="max-h-48 mx-auto rounded-lg" /><div className="text-xs text-stone-500 mt-2">Klik untuk ganti</div></div> : (
                <div className="py-4"><Camera size={32} className="mx-auto text-brand-light mb-2" weight="duotone" /><div className="font-medium text-brand">Upload foto produk</div><div className="text-xs text-stone-500">Feedify akan menyesuaikan style</div></div>
              )}
            </label>
            <input id="banner-photo" type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={handlePhoto} data-testid="banner-photo-input" />
            <ReferenceUpload value={referenceImg} onChange={setReferenceImg} testid="banner-reference" />
            <button
              type="button"
              onClick={() => setGalleryOpen(true)}
              className="mt-2 w-full flex items-center justify-center gap-2 py-2.5 border border-dashed border-brand-sand rounded-xl text-sm font-semibold text-brand-light hover:border-brand hover:text-brand hover:bg-brand-sand/40 transition-all"
            >
              <Images size={16} weight="duotone" />
              Atau pilih dari Gallery Inspirasi
            </button>
          </div>

          <div className="feedify-card p-6 space-y-5">
            <h3 className="font-heading text-lg font-semibold text-brand">Layout & Gaya</h3>
            <Field label="Aspect Ratio">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {ASPECT_RATIOS.map((r) => (
                  <button key={r.id} type="button" data-testid={`ratio-${r.id.split(" ")[0]}`} onClick={() => upd("aspect_ratio", r.id)} className={`p-3 rounded-xl border-2 text-xs font-semibold btn-touch ${form.aspect_ratio === r.id ? "border-brand bg-brand-sand text-brand" : "border-brand-sand text-stone-600"}`}>
                    <div className="flex justify-center mb-1"><div className="border border-current rounded" style={{ width: r.w * 0.36, height: r.h * 0.36 }} /></div>
                    {r.label}
                  </button>
                ))}
              </div>
            </Field>
            <Field label="Style Preset">
              <div className="flex flex-wrap gap-2">
                {STYLE_PRESETS.map((s) => (
                  <button key={s} type="button" data-testid={`style-${s.toLowerCase().replace(/\s+/g, "-")}`} onClick={() => upd("style_preset", s)} className={`px-4 py-2.5 rounded-full text-sm font-medium border btn-touch ${form.style_preset === s ? "bg-brand text-brand-cream border-brand" : "bg-white border-brand-sand text-stone-700"}`}>{s}</button>
                ))}
              </div>
            </Field>
            <Field label="Posisi Produk">
              <div className="flex flex-wrap gap-2">
                {PLACEMENTS.map((p) => (
                  <button key={p.id} type="button" data-testid={`placement-${p.id}`} onClick={() => upd("placement_rule", p.id)} className={`px-4 py-2.5 rounded-full text-sm font-medium border btn-touch ${form.placement_rule === p.id ? "bg-brand-gold text-brand border-brand-gold" : "bg-white border-brand-sand text-stone-700"}`}>{p.label}</button>
                ))}
              </div>
            </Field>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={previewPrompt}
              disabled={previewing || generating}
              data-testid="preview-prompt-btn"
              className="flex-1 py-4 bg-white border-2 border-brand text-brand rounded-full font-bold text-base hover:bg-brand-sand btn-lift inline-flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {previewing ? <><CircleNotch size={18} className="animate-spin" /> Memuat...</> : <><CheckCircle size={18} weight="duotone" /> Preview Konten</>}
            </button>
            <button
              onClick={generate}
              disabled={generating}
              data-testid="generate-banner-btn"
              className="flex-1 py-4 bg-brand text-brand-cream rounded-full font-bold text-base hover:bg-brand-light btn-lift inline-flex items-center justify-center gap-2 disabled:opacity-60 shadow-lg"
            >
              {generating ? <><CircleNotch size={20} className="animate-spin" /> Memproses...</> : <><Sparkle size={20} weight="fill" /> Generate <span className="opacity-70 text-sm font-medium">(1 kredit)</span></>}
            </button>
          </div>

          {/* Prompt preview panel */}
          {promptPreview && (
            <div id="prompt-preview-panel" className="animate-fade-up">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs uppercase tracking-[0.18em] text-brand-light font-semibold">Detail Konten Feedify</span>
                {promptPreview.has_reference_image && (
                  <span className="text-xs bg-brand-gold/20 text-brand px-2 py-0.5 rounded-full font-medium">+ Referensi Foto</span>
                )}
              </div>
              <JsonOutput json={promptPreview.prompt_json} title="Banner Prompt JSON" testid="banner-json-output" />
            </div>
          )}
        </div>

        <div className="lg:sticky lg:top-6 lg:self-start space-y-4">
          <div className="feedify-card p-5">
            <div className="text-xs uppercase tracking-[0.18em] text-brand-light font-bold mb-3 flex items-center gap-1.5">
              <Lightning size={14} weight="fill" /> Live Preview
            </div>
            <GeneratedPreview
              imageBase64={result?.image_base64}
              loading={generating}
              aspectRatio={form.aspect_ratio}
              onRegenerate={result?.id ? regenerate : null}
              regenerating={regenerating}
              testid="banner-preview"
            />
            {result && (
              <div className="mt-3 inline-flex items-center gap-1.5 text-xs text-green-700 bg-green-50 px-2 py-1 rounded-full">
                <CheckCircle size={12} weight="fill" /> Tersimpan di History
              </div>
            )}
          </div>
          <BrandDnaCard />
        </div>
      </div>

      {/* Caption Bundle */}
      {(generatingCaptions || captions) && (
        <div className="animate-fade-up space-y-4" data-testid="caption-bundle">
          <div className="flex items-center gap-2">
            <ChatCircle size={22} weight="duotone" className="text-brand" />
            <h2 className="font-heading text-xl font-bold text-brand">Caption Bundle</h2>
            {generatingCaptions && <CircleNotch size={16} className="animate-spin text-brand-light" />}
          </div>

          {captions && (
            <>
              <div className="grid sm:grid-cols-2 gap-3">
                {(captions.captions || []).map((c, i) => (
                  <CaptionCard key={i} caption={c} />
                ))}
              </div>

              {captions.hook_lines?.length > 0 && (
                <div className="feedify-card p-5">
                  <div className="text-xs uppercase tracking-[0.15em] text-brand-light font-semibold mb-3">Hook Lines</div>
                  <div className="space-y-2">
                    {captions.hook_lines.map((h, i) => (
                      <CopyableLine key={i} text={h} />
                    ))}
                  </div>
                </div>
              )}

              {captions.hashtags?.length > 0 && (
                <div className="feedify-card p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5">
                      <Hash size={14} weight="bold" className="text-brand-light" />
                      <span className="text-xs uppercase tracking-[0.15em] text-brand-light font-semibold">Hashtags</span>
                    </div>
                    <CopyBtn text={captions.hashtags.join(" ")} label="Copy semua" />
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {captions.hashtags.map((h, i) => (
                      <span key={i} className="px-2.5 py-1 bg-brand-sand rounded-full text-xs font-medium text-brand">{h}</span>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      <NoCreditsModal open={noCredits} onClose={() => setNoCredits(false)} />
      <InspirationGallery
        open={galleryOpen}
        onClose={() => setGalleryOpen(false)}
        context="banner"
        onSelect={(photo) => {
          fetch(`/gallery/${photo.category}/${photo.filename}`)
            .then((r) => r.blob())
            .then((blob) => {
              const reader = new FileReader();
              reader.onload = () => setReferenceImg(reader.result);
              reader.readAsDataURL(blob);
            });
        }}
      />
    </div>
  );
}

function Field({ label, children }) {
  return <div><label className="text-xs font-semibold uppercase tracking-[0.15em] text-stone-500 mb-1.5 block">{label}</label>{children}</div>;
}

function CaptionCard({ caption }) {
  return (
    <div className="feedify-card p-4">
      <div className="flex items-center justify-between mb-2">
        <div>
          <div className="font-heading text-sm font-bold text-brand">{caption.style}</div>
          <div className="text-[10px] text-stone-500">{caption.label}</div>
        </div>
        <CopyBtn text={caption.text} />
      </div>
      <p className="text-sm text-stone-700 leading-relaxed">{caption.text}</p>
    </div>
  );
}

function CopyableLine({ text }) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-brand-sand/40 rounded-xl">
      <span className="text-sm text-stone-700 flex-1">{text}</span>
      <CopyBtn text={text} />
    </div>
  );
}

function CopyBtn({ text, label }) {
  const [copied, setCopied] = useState(false);
  const handle = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };
  return (
    <button onClick={handle} className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-brand hover:bg-brand-sand rounded-full flex-shrink-0">
      {copied ? <Check size={12} weight="bold" /> : <Copy size={12} weight="bold" />}
      {label || (copied ? "OK" : "Copy")}
    </button>
  );
}
