import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import {
  Palette, Plus, CircleNotch, ArrowLeft, Package, ListChecks, CheckCircle, Trash,
  PencilSimple, UploadSimple, X, DownloadSimple, FloppyDisk,
} from "@phosphor-icons/react";
import api from "@/lib/api";
import BrandDnaForm from "@/components/agency/BrandDnaForm";
import { emptyBrandDna } from "@/lib/brandDna";
import { compressImageFile } from "@/lib/imageCompress";
import { setActiveClient, getActiveClient, fetchClientList } from "@/lib/clientPicker";

/**
 * Brand Saya — the owner's own brands: own products, demo brands for Feedify's
 * content, and one brand per prospect for DM samples.
 *
 * Each brand behaves exactly like a client in the tools (picker, generators,
 * Produksi Batch) but is never counted as one. The Brand DNA and product forms
 * are the client's own, so both sides are filled in the same way.
 */

const errMsg = (e, fallback) => e?.response?.data?.detail || fallback;

function refreshPicker() {
  fetchClientList(true).catch(() => {});
}

export default function BrandSayaPage() {
  const [data, setData] = useState(null);
  const [editing, setEditing] = useState(null); // brand summary being edited

  const load = useCallback(async () => {
    try {
      const { data } = await api.get("/admin/brand-saya");
      setData(data);
      return data;
    } catch (e) {
      toast.error(errMsg(e, "Gagal memuat Brand Saya"));
      setData({ brands: [], brand_lama: false, sudah_impor: false });
      return null;
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (!data) {
    return <div className="flex justify-center py-24"><CircleNotch size={26} className="animate-spin text-brand" /></div>;
  }

  if (editing) {
    return (
      <Editor
        brand={editing}
        onBack={async () => { setEditing(null); await load(); refreshPicker(); }}
        onRenamed={(b) => setEditing(b)}
      />
    );
  }

  return <Daftar data={data} onChanged={async () => { await load(); refreshPicker(); }} onEdit={setEditing} />;
}

/* ── list ─────────────────────────────────────────────────────────────────── */

function Daftar({ data, onChanged, onEdit }) {
  const navigate = useNavigate();
  const [nama, setNama] = useState("");
  const [busy, setBusy] = useState(false);
  const [importing, setImporting] = useState(false);

  const tambah = async () => {
    if (!nama.trim()) { toast.error("Tulis nama brand dulu"); return; }
    setBusy(true);
    try {
      const { data: b } = await api.post("/admin/brand-saya", { nama });
      setNama("");
      toast.success(`${b.nama} ditambahkan`);
      await onChanged();
      onEdit(b);
    } catch (e) {
      toast.error(errMsg(e, "Gagal menambah brand"));
    } finally {
      setBusy(false);
    }
  };

  const impor = async () => {
    setImporting(true);
    try {
      const { data: b } = await api.post("/admin/brand-saya/impor");
      toast.success(`Brand Kit lama disalin sebagai "${b.nama}"`);
      await onChanged();
    } catch (e) {
      toast.error(errMsg(e, "Gagal mengimpor brand lama"));
    } finally {
      setImporting(false);
    }
  };

  const pakai = (b) => {
    setActiveClient({ user_id: b.user_id, name: b.nama, nickname: b.nama, internal: true, brand_name: b.brand_name, product_count: b.product_count });
    toast.success(`Tools sekarang memakai ${b.nama}`);
  };

  const produksi = (b) => {
    setActiveClient({ user_id: b.user_id, name: b.nama, nickname: b.nama, internal: true, brand_name: b.brand_name, product_count: b.product_count });
    navigate("/produksi");
  };

  const hapus = async (b) => {
    if (!window.confirm(`Hapus "${b.nama}"? Brand DNA, semua produk, dan rencana Produksi Batch-nya ikut terhapus.`)) return;
    try {
      await api.delete(`/admin/brand-saya/${b.user_id}`);
      if (getActiveClient()?.user_id === b.user_id) setActiveClient(null);
      toast.success(`${b.nama} dihapus`);
      await onChanged();
    } catch (e) {
      toast.error(errMsg(e, "Gagal menghapus"));
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-5 py-8 sm:px-8 sm:py-10">
      <div className="flex items-center gap-3">
        <div className="grid h-11 w-11 place-items-center rounded-2xl bg-brand">
          <Palette size={22} weight="duotone" className="text-brand-gold" />
        </div>
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight text-brand sm:text-3xl">Brand Saya</h1>
          <p className="text-sm text-stone-500">Produk sendiri, brand demo, dan contoh untuk prospek. Tidak dihitung sebagai klien.</p>
        </div>
      </div>

      {data.brand_lama && !data.sudah_impor && (
        <div className="mt-6 flex flex-wrap items-center gap-4 rounded-2xl border border-brand-sand bg-white p-5" data-testid="brand-saya-impor-banner">
          <DownloadSimple size={22} weight="duotone" className="flex-shrink-0 text-brand-light" />
          <div className="min-w-0 flex-1">
            <div className="font-heading font-semibold text-brand">Ada Brand Kit lama di akunmu</div>
            <p className="text-sm text-stone-500">Salin ke Brand Saya supaya bisa dipakai di Produksi Batch. Data aslinya tidak diubah.</p>
          </div>
          <button onClick={impor} disabled={importing} className="inline-flex items-center gap-2 rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-brand-cream hover:bg-brand-light disabled:opacity-50" data-testid="brand-saya-impor">
            {importing ? <CircleNotch size={15} className="animate-spin" /> : <DownloadSimple size={15} weight="bold" />} Salin brand lama
          </button>
        </div>
      )}

      <div className="mt-6 flex flex-wrap gap-3 rounded-2xl border border-brand-sand bg-white p-5">
        <input
          value={nama}
          onChange={(e) => setNama(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") tambah(); }}
          placeholder="Nama brand, misal: FREESE, Demo Parfum, Prospek: Rina Skin"
          className="feedify-input min-w-[240px] flex-1"
          maxLength={60}
          data-testid="brand-saya-nama-baru"
        />
        <button onClick={tambah} disabled={busy} className="inline-flex items-center gap-2 rounded-full bg-brand px-6 py-3 text-sm font-semibold text-brand-cream hover:bg-brand-light disabled:opacity-50" data-testid="brand-saya-tambah">
          {busy ? <CircleNotch size={15} className="animate-spin" /> : <Plus size={15} weight="bold" />} Tambah brand
        </button>
      </div>

      {data.brands.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-brand-sand p-10 text-center text-sm text-stone-400">
          Belum ada brand. Tambahkan yang pertama di atas.
        </div>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.brands.map((b) => (
            <div key={b.user_id} className="flex flex-col rounded-2xl border border-brand-sand bg-white p-5" data-testid="brand-saya-kartu">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate font-heading text-lg font-bold text-brand">{b.nama}</div>
                  <div className="truncate text-xs text-stone-400">{b.brand_name ? `${b.brand_name}${b.category ? ` · ${b.category}` : ""}` : "Brand DNA belum diisi"}</div>
                </div>
                <button onClick={() => hapus(b)} className="flex-shrink-0 p-1.5 text-stone-300 hover:text-red-500" aria-label={`Hapus ${b.nama}`} data-testid="brand-saya-hapus">
                  <Trash size={15} weight="duotone" />
                </button>
              </div>
              <div className="mt-3 flex items-center gap-2">
                {b.colors.length > 0
                  ? b.colors.map((c) => <span key={c} className="h-5 w-5 rounded-full border border-black/10" style={{ background: c }} title={c} />)
                  : <span className="text-xs text-stone-300">Belum ada warna</span>}
                <span className="ml-auto inline-flex items-center gap-1 text-xs text-stone-500"><Package size={13} weight="duotone" /> {b.product_count} produk</span>
              </div>
              <div className="mt-4 flex flex-wrap gap-2 border-t border-brand-sand pt-4">
                <button onClick={() => onEdit(b)} className="inline-flex items-center gap-1.5 rounded-full bg-brand px-4 py-2 text-xs font-semibold text-brand-cream hover:bg-brand-light" data-testid="brand-saya-edit">
                  <PencilSimple size={12} weight="bold" /> Edit
                </button>
                <button onClick={() => pakai(b)} className="inline-flex items-center gap-1.5 rounded-full border border-brand-sand px-4 py-2 text-xs font-semibold text-stone-600 hover:border-brand hover:text-brand" data-testid="brand-saya-pakai">
                  <CheckCircle size={12} weight="bold" /> Pakai di tools
                </button>
                <button onClick={() => produksi(b)} className="inline-flex items-center gap-1.5 rounded-full border border-brand-sand px-4 py-2 text-xs font-semibold text-stone-600 hover:border-brand hover:text-brand" data-testid="brand-saya-produksi">
                  <ListChecks size={12} weight="bold" /> Produksi
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── editor ───────────────────────────────────────────────────────────────── */

function Editor({ brand, onBack, onRenamed }) {
  const [tab, setTab] = useState("dna");
  const [nama, setNama] = useState(brand.nama);
  const [renaming, setRenaming] = useState(false);

  const simpanNama = async () => {
    if (!nama.trim() || nama.trim() === brand.nama) { setNama(brand.nama); return; }
    setRenaming(true);
    try {
      const { data: b } = await api.patch(`/admin/brand-saya/${brand.user_id}`, { nama });
      onRenamed(b);
      const act = getActiveClient();
      if (act?.user_id === b.user_id) setActiveClient({ ...act, name: b.nama, nickname: b.nama });
      toast.success("Nama diubah");
    } catch (e) {
      toast.error(errMsg(e, "Gagal mengubah nama"));
      setNama(brand.nama);
    } finally {
      setRenaming(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-5 py-8 sm:px-8 sm:py-10">
      <button onClick={onBack} className="inline-flex items-center gap-2 text-sm text-stone-500 hover:text-brand" data-testid="brand-saya-kembali">
        <ArrowLeft size={15} weight="bold" /> Brand Saya
      </button>

      <div className="mt-4 flex items-center gap-3">
        <input
          value={nama}
          onChange={(e) => setNama(e.target.value)}
          onBlur={simpanNama}
          onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }}
          maxLength={60}
          className="min-w-0 flex-1 rounded-xl border border-transparent bg-transparent px-2 py-1 font-heading text-2xl font-bold tracking-tight text-brand hover:border-brand-sand focus:border-brand focus:outline-none sm:text-3xl"
          aria-label="Nama brand"
          data-testid="brand-saya-ganti-nama"
        />
        {renaming && <CircleNotch size={18} className="animate-spin text-brand" />}
      </div>

      <div className="mt-6 inline-flex rounded-full border border-brand-sand bg-white p-1">
        {[["dna", "Brand DNA"], ["produk", "Produk"]].map(([id, label]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`rounded-full px-5 py-2 text-sm font-semibold transition-colors ${tab === id ? "bg-brand text-brand-cream" : "text-stone-500 hover:text-brand"}`}
            data-testid={`brand-saya-tab-${id}`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {tab === "dna" ? <DnaTab bid={brand.user_id} /> : <ProdukTab bid={brand.user_id} />}
      </div>
    </div>
  );
}

function DnaTab({ bid }) {
  const [dna, setDna] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let alive = true;
    api.get(`/admin/brand-saya/${bid}/brand-dna`)
      .then(({ data }) => { if (alive) setDna({ ...emptyBrandDna(), ...(data || {}) }); })
      .catch((e) => { toast.error(errMsg(e, "Gagal memuat Brand DNA")); if (alive) setDna(emptyBrandDna()); });
    return () => { alive = false; };
  }, [bid]);

  const save = async () => {
    if (!dna.brand_name?.trim()) { toast.error("Nama brand wajib diisi"); return; }
    setSaving(true);
    try {
      const { data } = await api.put(`/admin/brand-saya/${bid}/brand-dna`, dna);
      setDna({ ...emptyBrandDna(), ...data });
      toast.success("Brand DNA disimpan");
    } catch (e) {
      toast.error(errMsg(e, "Gagal menyimpan Brand DNA"));
    } finally {
      setSaving(false);
    }
  };

  if (!dna) return <div className="flex justify-center py-16"><CircleNotch size={22} className="animate-spin text-brand" /></div>;

  return (
    <div className="rounded-2xl border border-brand-sand bg-white p-6 sm:p-8">
      <BrandDnaForm value={dna} onChange={setDna} />
      <div className="mt-8 border-t border-brand-sand pt-6">
        <button onClick={save} disabled={saving} className="inline-flex items-center gap-2 rounded-full bg-brand px-7 py-3.5 font-semibold text-brand-cream hover:bg-brand-light disabled:opacity-50" data-testid="brand-saya-simpan-dna">
          {saving ? <CircleNotch size={17} className="animate-spin" /> : <FloppyDisk size={17} weight="bold" />} Simpan Brand DNA
        </button>
      </div>
    </div>
  );
}

const EMPTY_PRODUK = { id: null, name: "", description: "", allocation: 0, photo_base64: null };

function ProdukTab({ bid }) {
  const [items, setItems] = useState(null);
  const [form, setForm] = useState(null); // product being added or edited
  const [saving, setSaving] = useState(false);
  const fileRef = useRef(null);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get(`/admin/brand-saya/${bid}/produk`);
      setItems(data);
    } catch (e) {
      toast.error(errMsg(e, "Gagal memuat produk"));
      setItems([]);
    }
  }, [bid]);

  useEffect(() => { load(); }, [load]);

  const pilihFoto = async (file) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast.error("File harus berupa gambar"); return; }
    try {
      const photo = await compressImageFile(file, { maxDimension: 1280, quality: 0.85 });
      setForm((f) => ({ ...f, photo_base64: photo, fotoBaru: true }));
    } catch {
      toast.error("Gagal membaca foto");
    }
  };

  const simpan = async () => {
    if (!form.name.trim()) { toast.error("Nama produk wajib diisi"); return; }
    setSaving(true);
    const body = {
      name: form.name,
      description: form.description || "",
      allocation: Number(form.allocation) || 0,
      photo_base64: form.id && !form.fotoBaru ? "__keep" : form.photo_base64,
    };
    try {
      if (form.id) await api.put(`/admin/brand-saya/${bid}/produk/${form.id}`, body);
      else await api.post(`/admin/brand-saya/${bid}/produk`, body);
      toast.success(form.id ? "Produk diperbarui" : "Produk ditambahkan");
      setForm(null);
      if (fileRef.current) fileRef.current.value = "";
      await load();
    } catch (e) {
      toast.error(errMsg(e, "Gagal menyimpan produk"));
    } finally {
      setSaving(false);
    }
  };

  const hapus = async (p) => {
    if (!window.confirm(`Hapus produk "${p.name}"?`)) return;
    try {
      await api.delete(`/admin/brand-saya/${bid}/produk/${p.id}`);
      toast.success("Produk dihapus");
      await load();
    } catch (e) {
      toast.error(errMsg(e, "Gagal menghapus produk"));
    }
  };

  if (!items) return <div className="flex justify-center py-16"><CircleNotch size={22} className="animate-spin text-brand" /></div>;

  return (
    <div className="space-y-4">
      {items.map((p) => (
        <div key={p.id} className="flex items-center gap-4 rounded-2xl border border-brand-sand bg-white p-4" data-testid="brand-saya-produk">
          <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-xl bg-brand-sand/50">
            {p.photo_base64
              ? <img src={p.photo_base64} alt={p.name} className="h-full w-full object-cover" />
              : <div className="grid h-full w-full place-items-center text-stone-300"><Package size={20} weight="duotone" /></div>}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate font-semibold text-brand">{p.name}</div>
            <div className="truncate text-xs text-stone-400">{p.description || "Tanpa deskripsi"}</div>
            <div className="mt-0.5 text-[11px] text-stone-400">Porsi di Produksi Batch: {p.allocation || 0}</div>
          </div>
          <button onClick={() => setForm({ ...EMPTY_PRODUK, ...p, fotoBaru: false })} className="p-2 text-stone-400 hover:text-brand" aria-label={`Ubah ${p.name}`} data-testid="brand-saya-produk-edit">
            <PencilSimple size={16} weight="duotone" />
          </button>
          <button onClick={() => hapus(p)} className="p-2 text-stone-300 hover:text-red-500" aria-label={`Hapus ${p.name}`} data-testid="brand-saya-produk-hapus">
            <Trash size={16} weight="duotone" />
          </button>
        </div>
      ))}

      {form ? (
        <div className="space-y-4 rounded-2xl border border-brand bg-white p-5 sm:p-6" data-testid="brand-saya-produk-form">
          <div className="flex items-center justify-between">
            <div className="font-heading font-semibold text-brand">{form.id ? "Ubah produk" : "Produk baru"}</div>
            <button onClick={() => setForm(null)} className="p-1 text-stone-300 hover:text-brand" aria-label="Tutup"><X size={16} weight="bold" /></button>
          </div>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-stone-500">Nama produk</span>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} maxLength={80} className="feedify-input" data-testid="brand-saya-produk-nama" />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-stone-500">Deskripsi, bahan, dan manfaat</span>
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} maxLength={1000} placeholder="AI hanya menulis klaim yang tertulis di sini." className="feedify-input resize-none" data-testid="brand-saya-produk-deskripsi" />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-stone-500">Porsi di Produksi Batch (opsional)</span>
            <input type="number" min={0} max={60} value={form.allocation} onChange={(e) => setForm({ ...form, allocation: e.target.value })} className="feedify-input max-w-[140px]" data-testid="brand-saya-produk-porsi" />
          </label>
          <div className="flex items-center gap-4">
            <div className="h-20 w-20 overflow-hidden rounded-xl bg-brand-sand/50">
              {form.photo_base64 && <img src={form.photo_base64} alt="Foto produk" className="h-full w-full object-cover" />}
            </div>
            <button type="button" onClick={() => fileRef.current?.click()} className="inline-flex items-center gap-2 rounded-full border-2 border-dashed border-brand-sand px-4 py-2.5 text-sm font-medium text-stone-500 hover:border-brand-gold hover:text-brand" data-testid="brand-saya-produk-foto">
              <UploadSimple size={15} weight="duotone" /> {form.photo_base64 ? "Ganti foto" : "Unggah foto produk"}
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => pilihFoto(e.target.files?.[0])} />
          </div>
          <button onClick={simpan} disabled={saving} className="inline-flex items-center gap-2 rounded-full bg-brand px-6 py-3 text-sm font-semibold text-brand-cream hover:bg-brand-light disabled:opacity-50" data-testid="brand-saya-produk-simpan">
            {saving ? <CircleNotch size={15} className="animate-spin" /> : <FloppyDisk size={15} weight="bold" />} Simpan produk
          </button>
        </div>
      ) : (
        <button onClick={() => setForm({ ...EMPTY_PRODUK })} className="inline-flex items-center gap-2 rounded-full border-2 border-dashed border-brand-sand px-5 py-3 text-sm font-medium text-stone-500 hover:border-brand-gold hover:text-brand" data-testid="brand-saya-produk-tambah">
          <Plus size={15} weight="bold" /> Tambah produk
        </button>
      )}
    </div>
  );
}
