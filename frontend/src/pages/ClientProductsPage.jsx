import { useState, useEffect, useRef, useMemo } from "react";
import { toast } from "react-toastify";
import {
  Package, Plus, Trash, UploadSimple, CircleNotch, X, PencilSimple,
  FloppyDisk, Info,
} from "@phosphor-icons/react";
import api from "@/lib/api";
import { compressImageFile } from "@/lib/imageCompress";
import { useClient, setClient, refreshClient } from "@/lib/client";

/**
 * Products and how the package is split across them.
 *
 * Both live on one page because they are one decision: adding a product always
 * raises the question of which feeds it takes, and splitting them on a separate
 * screen would mean saving a basket that no longer matches what is on it.
 */
export default function ClientProductsPage() {
  const data = useClient();
  const [products, setProducts] = useState([]);
  const [alloc, setAlloc] = useState({});
  const [allocDirty, setAllocDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState(null);

  const total = data?.client?.total_feeds || 0;

  useEffect(() => {
    if (!data) return;
    setProducts(data.products || []);
    setAlloc(Object.fromEntries((data.products || []).map((p) => [p.id, p.allocation || 0])));
  }, [data]);

  const terpakai = useMemo(
    () => Object.values(alloc).reduce((a, b) => a + (Number(b) || 0), 0),
    [alloc]
  );
  const sisa = total - terpakai;

  const reload = async () => {
    const { data: list } = await api.get("/client/products");
    setProducts(list);
    setAlloc(Object.fromEntries(list.map((p) => [p.id, p.allocation || 0])));
    await refreshClient();
  };

  const setOne = (id, n) => {
    setAlloc((a) => ({ ...a, [id]: Math.max(0, Number(n) || 0) }));
    setAllocDirty(true);
  };

  const bagiRata = () => {
    if (!products.length) return;
    const dasar = Math.floor(total / products.length);
    const sisaBagi = total - dasar * products.length;
    setAlloc(Object.fromEntries(products.map((p, i) => [p.id, dasar + (i < sisaBagi ? 1 : 0)])));
    setAllocDirty(true);
  };

  const saveAlloc = async () => {
    if (terpakai !== total) {
      toast.error(`Pembagian harus pas ${total} feed (sekarang ${terpakai})`);
      return;
    }
    setSaving(true);
    try {
      const { data: res } = await api.put("/client/allocation", { allocation: alloc });
      setClient(res);
      setAllocDirty(false);
      toast.success("Pembagian feed tersimpan");
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Gagal menyimpan");
    } finally { setSaving(false); }
  };

  const remove = async (p) => {
    if (!window.confirm(`Hapus produk "${p.name}"? Jatah feed-nya harus dibagi ulang.`)) return;
    try { await api.delete(`/client/products/${p.id}`); await reload(); setAllocDirty(true); }
    catch { toast.error("Gagal menghapus"); }
  };

  return (
    <div className="mx-auto max-w-3xl px-5 py-8 sm:px-8 sm:py-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="grid h-12 w-12 flex-shrink-0 place-items-center rounded-2xl bg-brand-sand">
            <Package size={22} weight="duotone" className="text-brand-light" />
          </div>
          <div>
            <h1 className="font-heading text-2xl font-bold tracking-tight text-brand sm:text-3xl">Produk Saya</h1>
            <p className="mt-1.5 text-sm text-stone-500">
              Produk yang kontennya kami kerjakan, dan berapa feed untuk masing-masing.
            </p>
          </div>
        </div>
        <button
          onClick={() => setAdding(true)}
          className="inline-flex items-center gap-2 rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-brand-cream transition-colors hover:bg-brand-light"
          data-testid="produk-tambah"
        >
          <Plus size={15} weight="bold" /> Tambah Produk
        </button>
      </div>

      {/* allocation summary */}
      {total === 0 && (
        <div className="mt-7 rounded-2xl border border-brand-sand bg-brand-sand/40 p-4 text-sm text-stone-500" data-testid="belum-ada-paket">
          Belum ada paket aktif. Kamu tetap bisa menambahkan produk sekarang —
          pembagian jatah feed muncul setelah pembayaranmu dikonfirmasi.
        </div>
      )}

      {total > 0 && (
        <div className={`mt-7 flex flex-wrap items-center justify-between gap-3 rounded-2xl border p-4 ${
          sisa === 0 ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"
        }`} data-testid="alokasi-ringkasan">
          <div>
            <div className={`text-sm font-semibold ${sisa === 0 ? "text-emerald-700" : "text-amber-700"}`}>
              {sisa === 0 ? "Pembagian sudah pas" : sisa > 0 ? `Kurang ${sisa} feed lagi` : `Kelebihan ${-sisa} feed`}
            </div>
            <div className={`text-xs ${sisa === 0 ? "text-emerald-600" : "text-amber-600"}`}>
              Terpakai {terpakai} dari {total} feed
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={bagiRata} className="rounded-full border border-stone-300 bg-white px-4 py-2 text-xs font-bold text-stone-600 hover:border-brand">
              Bagi rata
            </button>
            <button
              onClick={saveAlloc}
              disabled={saving || !allocDirty}
              className="inline-flex items-center gap-1.5 rounded-full bg-brand px-4 py-2 text-xs font-bold text-brand-cream disabled:opacity-40"
              data-testid="alokasi-simpan"
            >
              {saving ? <CircleNotch size={12} className="animate-spin" /> : <FloppyDisk size={12} weight="bold" />} Simpan
            </button>
          </div>
        </div>
      )}

      {/* list */}
      <div className="mt-6 space-y-3">
        {products.length === 0 && (
          <div className="rounded-2xl border-2 border-dashed border-brand-sand py-14 text-center">
            <Package size={30} weight="duotone" className="mx-auto text-stone-300" />
            <p className="mt-3 text-sm text-stone-400">Belum ada produk. Tambahkan yang pertama.</p>
          </div>
        )}

        {products.map((p) => (
          <div key={p.id} className="flex items-center gap-4 rounded-2xl border border-brand-sand bg-white p-3.5">
            <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-xl bg-brand-sand">
              {p.photo_base64
                ? <img src={p.photo_base64} alt={p.name} className="h-full w-full object-cover" />
                : <div className="grid h-full w-full place-items-center"><Package size={18} weight="duotone" className="text-brand-light" /></div>}
            </div>

            <div className="min-w-0 flex-1">
              <div className="truncate font-semibold text-brand">{p.name}</div>
              {p.description && <div className="truncate text-xs text-stone-400">{p.description}</div>}
              <div className="mt-1.5 flex items-center gap-2">
                <button onClick={() => setOne(p.id, (alloc[p.id] || 0) - 1)} className="grid h-6 w-6 place-items-center rounded-full border border-brand-sand text-xs text-brand hover:bg-brand-sand" aria-label="Kurangi">−</button>
                <input
                  value={alloc[p.id] ?? 0}
                  onChange={(e) => setOne(p.id, e.target.value)}
                  inputMode="numeric"
                  className="w-12 rounded-lg border border-brand-sand py-1 text-center text-sm font-bold text-brand"
                  data-testid={`produk-alokasi-${p.id}`}
                />
                <button onClick={() => setOne(p.id, (alloc[p.id] || 0) + 1)} className="grid h-6 w-6 place-items-center rounded-full border border-brand-sand text-xs text-brand hover:bg-brand-sand" aria-label="Tambah">+</button>
                <span className="text-[11px] text-stone-400">feed</span>
              </div>
            </div>

            <div className="flex flex-shrink-0 flex-col gap-1">
              <button onClick={() => setEditing(p)} className="p-2 text-stone-300 transition-colors hover:text-brand" aria-label="Ubah produk">
                <PencilSimple size={15} weight="duotone" />
              </button>
              <button onClick={() => remove(p)} className="p-2 text-stone-300 transition-colors hover:text-red-500" aria-label="Hapus produk">
                <Trash size={15} weight="duotone" />
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 flex items-start gap-2.5 rounded-xl bg-brand-sand/50 p-4">
        <Info size={16} weight="duotone" className="mt-0.5 flex-shrink-0 text-brand-light" />
        <p className="text-xs leading-relaxed text-stone-500">
          Foto produk tidak harus bagus — foto dari HP pun cukup, asal produknya terlihat
          utuh dan tulisan di kemasannya terbaca. Tim kami yang mengolahnya.
        </p>
      </div>

      {(adding || editing) && (
        <ProductDialog
          product={editing}
          onClose={() => { setAdding(false); setEditing(null); }}
          onSaved={async () => { setAdding(false); setEditing(null); await reload(); }}
        />
      )}
    </div>
  );
}

function ProductDialog({ product, onClose, onSaved }) {
  const isEdit = !!product;
  const [form, setForm] = useState({
    name: product?.name || "",
    description: product?.description || "",
    photo_base64: product?.photo_base64 || null,
  });
  const [busy, setBusy] = useState(false);
  const fileRef = useRef(null);
  const touchedPhoto = useRef(false);

  const pick = async (file) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast.error("File harus berupa gambar"); return; }
    try {
      touchedPhoto.current = true;
      const photo = await compressImageFile(file, { maxDimension: 1280, quality: 0.85 });
      setForm((f) => ({ ...f, photo_base64: photo }));
    } catch { toast.error("Gagal membaca foto"); }
  };

  const save = async () => {
    if (!form.name.trim()) { toast.error("Nama produk wajib diisi"); return; }
    setBusy(true);
    try {
      if (isEdit) {
        await api.put(`/client/products/${product.id}`, {
          ...form,
          // Re-sending an untouched photo would push the whole base64 back up
          // for nothing; the sentinel tells the server to leave it alone.
          photo_base64: touchedPhoto.current ? form.photo_base64 : "__keep",
        });
      } else {
        await api.post("/client/products", form);
      }
      await onSaved();
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Gagal menyimpan");
    } finally { setBusy(false); }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/50 p-0 backdrop-blur-sm sm:items-center sm:p-5" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-t-3xl bg-white p-6 sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
        data-testid="produk-dialog"
      >
        <div className="flex items-center justify-between">
          <h2 className="font-heading text-lg font-bold text-brand">{isEdit ? "Ubah produk" : "Tambah produk"}</h2>
          <button onClick={onClose} className="p-1 text-stone-300 hover:text-brand" aria-label="Tutup"><X size={17} weight="bold" /></button>
        </div>

        <div className="mt-6 flex gap-4">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="grid h-24 w-24 flex-shrink-0 place-items-center overflow-hidden rounded-xl border-2 border-dashed border-brand-gold/50 bg-brand-gold/5 hover:border-brand-gold"
          >
            {form.photo_base64
              ? <img src={form.photo_base64} alt="" className="h-full w-full object-cover" />
              : <UploadSimple size={20} weight="duotone" className="text-brand-gold" />}
          </button>
          <div className="flex-1 space-y-3">
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nama produk" className="feedify-input" data-testid="produk-nama" />
            <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Keterangan (opsional)" className="feedify-input" />
          </div>
        </div>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => pick(e.target.files?.[0])} />

        <button
          onClick={save}
          disabled={busy}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-brand py-3.5 font-semibold text-brand-cream disabled:opacity-40"
          data-testid="produk-simpan"
        >
          {busy ? <><CircleNotch size={15} className="animate-spin" /> Menyimpan...</> : "Simpan"}
        </button>
        {!isEdit && (
          <p className="mt-3 text-center text-xs text-stone-400">
            Produk baru mulai dari 0 feed — atur pembagiannya setelah ini.
          </p>
        )}
      </div>
    </div>
  );
}
