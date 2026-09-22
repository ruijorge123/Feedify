/**
 * The Brand DNA questionnaire — short on purpose.
 *
 * The first version asked thirteen things: age bracket, buyer type, lighting,
 * surface material, framing, caption tone, a checklist of don'ts. Every one of
 * them changes the output, but asking a shop owner all of it up front is how a
 * form gets abandoned. What is left is the minimum that decides how a photo
 * looks; the rest is settled on WhatsApp, where the team can ask only what that
 * particular brand actually needs.
 *
 * The dropped fields still exist in the data model — the team can fill them from
 * the Admin Panel — so nothing downstream breaks.
 */

import { useRef } from "react";
import { toast } from "react-toastify";
import { UploadSimple, X, Plus } from "@phosphor-icons/react";
import ColorPicker from "@/components/ColorPicker";
import { compressImageFile } from "@/lib/imageCompress";
import { Field, ChipPick, ChipMulti, Select } from "@/components/agency/Pickers";
import { KATEGORI, SIAPA, MOOD, WARNA_SARAN } from "@/lib/brandDna";

const MAX_WARNA = 3;

export default function BrandDnaForm({ value, onChange }) {
  const v = value;
  const logoRef = useRef(null);
  const set = (k, val) => onChange({ ...v, [k]: val });

  const pickLogo = async (file) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast.error("File harus berupa gambar"); return; }
    try {
      set("logo_base64", await compressImageFile(file, { maxDimension: 512, quality: 0.9 }));
    } catch {
      toast.error("Gagal membaca file logo");
    }
  };

  const setColor = (i, hex) => {
    const next = [...(v.colors || [])];
    next[i] = hex;
    set("colors", next);
  };
  const addColor = () => {
    if ((v.colors || []).length >= MAX_WARNA) return;
    const used = v.colors || [];
    set("colors", [...used, WARNA_SARAN.find((c) => !used.includes(c)) || "#0B3D2E"]);
  };
  const removeColor = (i) => set("colors", (v.colors || []).filter((_, n) => n !== i));

  return (
    <div className="space-y-9">
      {/* ── identitas ─────────────────────────────────────────── */}
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Nama brand" required>
          <input
            value={v.brand_name}
            onChange={(e) => set("brand_name", e.target.value)}
            placeholder="Contoh: Rina Skin"
            className="feedify-input"
            data-testid="dna-brand-name"
          />
        </Field>
        <Field label="Kategori usaha">
          <Select
            value={v.category}
            onChange={(x) => set("category", x)}
            options={KATEGORI}
            placeholder="Pilih kategori"
            testId="dna-kategori"
          />
        </Field>
      </div>

      {/* ── logo ──────────────────────────────────────────────── */}
      <Field label="Logo" hint="Opsional. Dipakai kalau kamu mau logonya muncul di konten.">
        {v.logo_base64 ? (
          <div className="inline-flex items-center gap-4 rounded-2xl border border-brand-sand bg-white p-3">
            <img src={v.logo_base64} alt="Logo brand" className="h-16 w-16 rounded-xl object-contain" />
            <button
              type="button"
              onClick={() => { set("logo_base64", null); if (logoRef.current) logoRef.current.value = ""; }}
              className="inline-flex items-center gap-1.5 text-sm text-stone-500 hover:text-red-500"
            >
              <X size={13} weight="bold" /> Hapus
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => logoRef.current?.click()}
            className="inline-flex items-center gap-2 rounded-2xl border-2 border-dashed border-brand-sand px-5 py-4 text-sm font-medium text-stone-500 transition-colors hover:border-brand-gold hover:text-brand"
            data-testid="dna-logo-upload"
          >
            <UploadSimple size={17} weight="duotone" /> Unggah logo
          </button>
        )}
        <input ref={logoRef} type="file" accept="image/*" className="hidden" onChange={(e) => pickLogo(e.target.files?.[0])} />
      </Field>

      {/* ── warna ─────────────────────────────────────────────── */}
      <Field
        label="Warna brand"
        hint={`Maksimal ${MAX_WARNA} warna. Warna pertama yang paling dominan di kontenmu.`}
      >
        <div className="flex flex-wrap items-center gap-3">
          {(v.colors || []).map((c, i) => (
            <div key={i} className="flex items-center gap-2 rounded-2xl border border-brand-sand bg-white p-2 pr-3">
              <ColorPicker color={c} onChange={(hex) => setColor(i, hex)} testid={`dna-warna-${i}`} />
              <span className="font-mono text-xs text-stone-500">{c}</span>
              <button type="button" onClick={() => removeColor(i)} className="text-stone-300 hover:text-red-500" aria-label="Hapus warna">
                <X size={13} weight="bold" />
              </button>
            </div>
          ))}
          {(v.colors || []).length < MAX_WARNA && (
            <button
              type="button"
              onClick={addColor}
              className="inline-flex items-center gap-1.5 rounded-2xl border-2 border-dashed border-brand-sand px-4 py-3 text-sm font-medium text-stone-500 transition-colors hover:border-brand-gold hover:text-brand"
              data-testid="dna-add-color"
            >
              <Plus size={14} weight="bold" /> Tambah warna
            </button>
          )}
        </div>
      </Field>

      {/* ── siapa pembelinya ──────────────────────────────────── */}
      <Field label="Siapa pembelimu" hint="Boleh pilih lebih dari satu, maksimal 3.">
        <ChipMulti options={SIAPA} value={v.audience_who} onChange={(x) => set("audience_who", x)} max={3} testId="dna-siapa" />
      </Field>

      {/* ── rasa: satu-satunya pilihan gaya yang kami minta ───── */}
      <Field
        label="Kontenmu mau terasa seperti apa?"
        required
        hint="Ini yang paling menentukan wajah kontenmu. Detail lain seperti pencahayaan dan komposisi kami bicarakan lewat WhatsApp."
      >
        <ChipPick options={MOOD} value={v.mood} onChange={(x) => set("mood", x)} testId="dna-mood" />
      </Field>

      {/* ── larangan, sebagai teks bebas ──────────────────────── */}
      <Field label="Yang tidak boleh ada" hint="Opsional. Contoh: jangan pakai model manusia, jangan warna neon.">
        <textarea
          value={v.donts_notes}
          onChange={(e) => set("donts_notes", e.target.value)}
          rows={2}
          placeholder="Kosongkan kalau tidak ada"
          className="feedify-input resize-none"
          data-testid="dna-larangan"
        />
      </Field>

      {/* ── catatan ───────────────────────────────────────────── */}
      <Field
        label="Catatan untuk tim Feedify"
        hint="Apa saja yang ingin kamu sampaikan — produk andalan, gaya yang kamu suka, atau akun lain yang kontennya kamu kagumi."
      >
        <textarea
          value={v.notes}
          onChange={(e) => set("notes", e.target.value)}
          rows={4}
          placeholder="Opsional, tapi sangat membantu."
          className="feedify-input resize-none"
          data-testid="dna-catatan"
        />
      </Field>

      <p className="rounded-xl bg-brand-sand/50 p-4 text-xs leading-relaxed text-stone-500">
        Cukup sampai di sini. Detail lainnya — pencahayaan, material latar, cara
        pengambilan gambar, gaya caption — akan kami tanyakan langsung lewat
        WhatsApp, menyesuaikan produkmu.
      </p>
    </div>
  );
}
