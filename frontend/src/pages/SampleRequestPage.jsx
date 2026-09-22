import { useState, useRef } from "react";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import {
  Sparkle, ArrowLeft, UploadSimple, CheckCircle, CircleNotch,
  WhatsappLogo, Image as ImageIcon, X,
} from "@phosphor-icons/react";
import api from "@/lib/api";
import { compressImageFile } from "@/lib/imageCompress";

const KATEGORI = [
  "Skincare / Beauty", "Fashion / Aksesori", "Makanan / Minuman",
  "Kesehatan / Herbal", "Perlengkapan Rumah", "Elektronik / Gadget", "Lainnya",
];

/**
 * Free sample request — the top of the funnel.
 *
 * No account required on purpose: asking a stranger to register before they have
 * seen any proof of quality loses most of them. All we need is a way to send the
 * sample back (WhatsApp) and something to work from (one product photo).
 */
export default function SampleRequestPage() {
  const [form, setForm] = useState({ name: "", whatsapp: "", brand_name: "", category: "", note: "" });
  const [photo, setPhoto] = useState(null);
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const fileRef = useRef(null);

  const upd = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const pickPhoto = async (file) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast.error("File harus berupa gambar"); return; }
    if (file.size > 20 * 1024 * 1024) { toast.error("Ukuran foto maksimal 20 MB"); return; }
    try {
      const compressed = await compressImageFile(file, { maxDimension: 1280, quality: 0.85 });
      setPhoto(compressed);
    } catch {
      const reader = new FileReader();
      reader.onload = () => setPhoto(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const valid = form.name.trim().length >= 2 && form.whatsapp.replace(/\D/g, "").length >= 9 && !!photo;

  const submit = async (e) => {
    e.preventDefault();
    if (!valid || sending) return;
    setSending(true);
    try {
      await api.post("/sample-request", { ...form, photo_base64: photo });
      setDone(true);
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Gagal mengirim. Coba lagi sebentar lagi.");
    } finally {
      setSending(false);
    }
  };

  if (done) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-brand px-5 py-16">
        <div className="w-full max-w-md text-center">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-brand-gold">
            <CheckCircle size={32} weight="fill" className="text-brand" />
          </div>
          <h1 className="mt-7 font-heading text-3xl font-bold tracking-tight text-brand-cream">Permintaanmu masuk!</h1>
          <p className="mx-auto mt-4 max-w-sm leading-relaxed text-brand-cream/60">
            Tim Feedify akan menghubungi kamu lewat WhatsApp di nomor{" "}
            <span className="font-semibold text-brand-cream">{form.whatsapp}</span> dan mengirimkan
            satu contoh konten dari foto produkmu.
          </p>
          <div className="mt-9 flex flex-col gap-3">
            <Link to="/#harga" className="rounded-full bg-brand-gold py-3.5 font-semibold text-brand transition-all hover:bg-brand-amber">
              Lihat Paket Sambil Menunggu
            </Link>
            <Link to="/" className="rounded-full border border-brand-cream/25 py-3.5 font-semibold text-brand-cream transition-all hover:bg-white/5">
              Kembali ke Beranda
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-cream">
      {/* header */}
      <div className="bg-brand px-5 pb-24 pt-8 sm:px-8">
        <div className="mx-auto max-w-2xl">
          <Link to="/" className="inline-flex items-center gap-2 text-sm text-brand-cream/60 transition-colors hover:text-brand-cream">
            <ArrowLeft size={15} weight="bold" /> Kembali
          </Link>
          <div className="mt-8 flex items-center gap-2.5">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-brand-gold">
              <Sparkle size={17} weight="fill" className="text-brand" />
            </div>
            <span className="font-heading text-lg font-bold text-brand-cream">Feedify</span>
          </div>
          <h1 className="mt-6 font-heading text-3xl font-bold leading-tight tracking-tight text-brand-cream sm:text-4xl">
            Coba dulu, gratis.
          </h1>
          <p className="mt-4 max-w-md leading-relaxed text-brand-cream/60">
            Kirim satu foto produkmu — foto dari HP pun tidak apa-apa. Kami buatkan satu contoh
            konten dan kirimkan lewat WhatsApp. Tanpa bayar, tanpa komitmen.
          </p>
        </div>
      </div>

      {/* form */}
      <div className="mx-auto max-w-2xl px-5 pb-20 sm:px-8">
        <form onSubmit={submit} className="-mt-16 rounded-3xl border border-brand-sand bg-white p-6 shadow-xl sm:p-9" data-testid="sample-form">
          {/* foto */}
          <label className="mb-2 block text-xs font-bold uppercase tracking-[0.14em] text-stone-500">
            Foto produk <span className="text-red-400">*</span>
          </label>
          {photo ? (
            <div className="relative overflow-hidden rounded-2xl border-2 border-brand/15">
              <img src={photo} alt="Produk" className="max-h-72 w-full bg-stone-50 object-contain" />
              <button
                type="button"
                onClick={() => { setPhoto(null); if (fileRef.current) fileRef.current.value = ""; }}
                className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-full bg-black/60 text-white backdrop-blur"
                data-testid="sample-remove-photo"
              >
                <X size={14} weight="bold" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="flex w-full flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-brand-gold/50 bg-brand-gold/5 px-6 py-10 transition-colors hover:border-brand-gold hover:bg-brand-gold/10"
              data-testid="sample-upload"
            >
              <div className="grid h-12 w-12 place-items-center rounded-full bg-brand-gold/15">
                <UploadSimple size={22} weight="duotone" className="text-brand-gold" />
              </div>
              <span className="font-semibold text-brand">Pilih foto produk</span>
              <span className="text-xs text-stone-400">JPG atau PNG, maksimal 20 MB</span>
            </button>
          )}
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => pickPhoto(e.target.files?.[0])} data-testid="sample-file-input" />

          <div className="mt-4 flex items-start gap-2.5 rounded-xl bg-brand-sand/50 p-3.5">
            <ImageIcon size={16} weight="duotone" className="mt-0.5 flex-shrink-0 text-brand-light" />
            <p className="text-xs leading-relaxed text-stone-500">
              Tips supaya hasilnya maksimal: foto di tempat terang, produk terlihat utuh, dan
              tulisan di kemasan terbaca jelas. Background berantakan tidak masalah.
            </p>
          </div>

          {/* identitas */}
          <div className="mt-7 grid gap-5 sm:grid-cols-2">
            <Field label="Nama kamu" required>
              <input
                value={form.name}
                onChange={(e) => upd("name", e.target.value)}
                placeholder="Rina"
                className="feedify-input"
                data-testid="sample-name"
              />
            </Field>
            <Field label="Nomor WhatsApp" required hint="Contoh sample dikirim ke sini">
              <input
                value={form.whatsapp}
                onChange={(e) => upd("whatsapp", e.target.value)}
                placeholder="0812xxxxxxx"
                inputMode="tel"
                className="feedify-input"
                data-testid="sample-wa"
              />
            </Field>
            <Field label="Nama brand">
              <input
                value={form.brand_name}
                onChange={(e) => upd("brand_name", e.target.value)}
                placeholder="Opsional"
                className="feedify-input"
                data-testid="sample-brand"
              />
            </Field>
            <Field label="Kategori produk">
              <select
                value={form.category}
                onChange={(e) => upd("category", e.target.value)}
                className="feedify-input"
                data-testid="sample-category"
              >
                <option value="">Pilih kategori</option>
                {KATEGORI.map((k) => <option key={k} value={k}>{k}</option>)}
              </select>
            </Field>
          </div>

          <div className="mt-5">
            <Field label="Ada gaya yang kamu inginkan?">
              <textarea
                value={form.note}
                onChange={(e) => upd("note", e.target.value)}
                rows={3}
                placeholder="Opsional — misalnya: nuansa cerah dan bersih, atau mewah dan gelap."
                className="feedify-input resize-none"
                data-testid="sample-note"
              />
            </Field>
          </div>

          <button
            type="submit"
            disabled={!valid || sending}
            className="mt-8 flex w-full items-center justify-center gap-2 rounded-full bg-brand py-4 font-semibold text-brand-cream transition-all hover:bg-brand-light disabled:opacity-40"
            data-testid="sample-submit"
          >
            {sending ? <><CircleNotch size={17} className="animate-spin" /> Mengirim...</> : <><WhatsappLogo size={17} weight="fill" /> Kirim & Tunggu Sample</>}
          </button>
          {!valid && (
            <p className="mt-3 text-center text-xs text-stone-400">
              Foto produk, nama, dan nomor WhatsApp wajib diisi.
            </p>
          )}
        </form>
      </div>
    </div>
  );
}

function Field({ label, hint, required, children }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-bold uppercase tracking-[0.14em] text-stone-500">
        {label} {required && <span className="text-red-400">*</span>}
      </label>
      {children}
      {hint && <p className="mt-1.5 text-[11px] text-stone-400">{hint}</p>}
    </div>
  );
}
