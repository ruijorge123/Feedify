import { useState, useEffect } from "react";
import { toast } from "react-toastify";
import { FloppyDisk, CircleNotch, Palette } from "@phosphor-icons/react";
import api from "@/lib/api";
import BrandDnaForm from "@/components/agency/BrandDnaForm";
import { emptyBrandDna } from "@/lib/brandDna";
import { setClient, useClient } from "@/lib/client";

/**
 * Standalone Brand DNA editor.
 *
 * Same form as onboarding, different promise: here a change affects work that is
 * already in progress, so the page says so rather than letting a client quietly
 * change the look mid-package and wonder why nothing changed.
 */
export default function ClientBrandDnaPage() {
  const data = useClient();
  const [dna, setDna] = useState(null);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (dna || !data) return;
    setDna({ ...emptyBrandDna(), ...(data.brand || {}) });
  }, [data, dna]);

  const update = (v) => { setDna(v); setDirty(true); };

  const save = async () => {
    if (!dna.brand_name.trim()) { toast.error("Nama brand wajib diisi"); return; }
    setSaving(true);
    try {
      const { data: res } = await api.put("/client/brand-dna", dna);
      setClient(res);
      setDirty(false);
      toast.success("Brand DNA tersimpan");
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Gagal menyimpan");
    } finally { setSaving(false); }
  };

  if (!dna) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <CircleNotch size={24} className="animate-spin text-brand" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-5 py-8 sm:px-8 sm:py-10">
      <div className="flex items-start gap-4">
        <div className="grid h-12 w-12 flex-shrink-0 place-items-center rounded-2xl bg-brand-sand">
          <Palette size={22} weight="duotone" className="text-brand-light" />
        </div>
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight text-brand sm:text-3xl">Brief & Brand DNA</h1>
          <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-stone-500">
            Ini yang membuat semua kontenmu terlihat satu keluarga. Boleh diubah kapan
            saja — perubahan berlaku untuk feed yang belum dikerjakan.
          </p>
        </div>
      </div>

      <div className="mt-8 rounded-3xl border border-brand-sand bg-white p-6 shadow-sm sm:p-8">
        <BrandDnaForm value={dna} onChange={update} />
      </div>

      {/* Sticky so a long form never hides its own save button on a phone. */}
      <div className="sticky bottom-4 mt-6 flex justify-end">
        <button
          onClick={save}
          disabled={saving || !dirty}
          className="inline-flex items-center gap-2 rounded-full bg-brand px-7 py-3.5 font-semibold text-brand-cream shadow-xl transition-all hover:bg-brand-light disabled:opacity-40"
          data-testid="dna-simpan"
        >
          {saving ? <><CircleNotch size={16} className="animate-spin" /> Menyimpan...</>
            : <><FloppyDisk size={16} weight="bold" /> {dirty ? "Simpan Perubahan" : "Tersimpan"}</>}
        </button>
      </div>
    </div>
  );
}
