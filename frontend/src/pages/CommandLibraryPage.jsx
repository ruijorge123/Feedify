import { useState, useEffect, useMemo } from "react";
import { toast } from "react-toastify";
import {
  Notepad, Plus, Trash, Copy, Check, CircleNotch, X, PencilSimple, MagnifyingGlass,
} from "@phosphor-icons/react";
import api from "@/lib/api";
import { copyToClipboard } from "@/lib/chatgpt";

/**
 * The owner's prompt scratchpad, as its own page.
 *
 * Deliberately thin: no tags, no sharing, no versioning. It exists so the lines
 * the owner keeps retyping into the generators live somewhere other than their
 * head, and the interaction that matters is "copy this".
 */
export default function CommandLibraryPage() {
  const [items, setItems] = useState(null);
  const [editing, setEditing] = useState(null);
  const [copied, setCopied] = useState(null);
  const [q, setQ] = useState("");

  const load = async () => {
    try { const { data } = await api.get("/admin/commands"); setItems(data); }
    catch { setItems([]); }
  };
  useEffect(() => { load(); }, []);

  const shown = useMemo(() => {
    if (!items) return [];
    const t = q.trim().toLowerCase();
    if (!t) return items;
    return items.filter((i) => `${i.title} ${i.body}`.toLowerCase().includes(t));
  }, [items, q]);

  const save = async () => {
    if (!editing.body.trim()) { toast.error("Isi catatan tidak boleh kosong"); return; }
    try {
      if (editing.id) await api.put(`/admin/commands/${editing.id}`, editing);
      else await api.post("/admin/commands", editing);
      setEditing(null);
      await load();
    } catch (e) { toast.error(e?.response?.data?.detail || "Gagal menyimpan"); }
  };

  const remove = async (id) => {
    if (!window.confirm("Hapus catatan ini?")) return;
    try { await api.delete(`/admin/commands/${id}`); await load(); }
    catch { toast.error("Gagal menghapus"); }
  };

  const copy = async (it) => {
    await copyToClipboard(it.body);
    setCopied(it.id);
    setTimeout(() => setCopied(null), 1500);
  };

  return (
    <div className="mx-auto max-w-4xl px-5 py-8 sm:px-8 sm:py-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="grid h-12 w-12 flex-shrink-0 place-items-center rounded-2xl bg-brand-sand">
            <Notepad size={22} weight="duotone" className="text-brand-light" />
          </div>
          <div>
            <h1 className="font-heading text-2xl font-bold tracking-tight text-brand sm:text-3xl">Command Library</h1>
            <p className="mt-1.5 text-sm text-stone-500">Catatan prompt pribadimu. Hanya kamu yang bisa melihatnya.</p>
          </div>
        </div>
        <button
          onClick={() => setEditing({ title: "", body: "" })}
          className="inline-flex items-center gap-2 rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-brand-cream transition-colors hover:bg-brand-light"
          data-testid="command-tambah"
        >
          <Plus size={15} weight="bold" /> Tambah Catatan
        </button>
      </div>

      {items && items.length > 4 && (
        <div className="relative mt-6">
          <MagnifyingGlass size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-300" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari catatan..." className="feedify-input pl-11" />
        </div>
      )}

      {items === null ? (
        <div className="flex justify-center py-20"><CircleNotch size={24} className="animate-spin text-brand" /></div>
      ) : shown.length === 0 ? (
        <div className="mt-6 rounded-2xl border-2 border-dashed border-brand-sand py-20 text-center">
          <Notepad size={32} weight="duotone" className="mx-auto text-stone-300" />
          <p className="mt-3 text-sm text-stone-400">
            {items.length === 0 ? "Belum ada catatan. Simpan prompt yang sering kamu pakai di sini." : "Tidak ada yang cocok."}
          </p>
        </div>
      ) : (
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {shown.map((it) => (
            <div key={it.id} className="flex flex-col rounded-2xl border border-brand-sand bg-white p-5" data-testid="command-row">
              <div className="flex items-start gap-2">
                <div className="min-w-0 flex-1 font-heading font-semibold text-brand">{it.title}</div>
                <div className="flex flex-shrink-0 gap-0.5">
                  <button onClick={() => setEditing({ id: it.id, title: it.title, body: it.body })} className="p-1.5 text-stone-300 transition-colors hover:text-brand" aria-label="Ubah">
                    <PencilSimple size={14} weight="duotone" />
                  </button>
                  <button onClick={() => remove(it.id)} className="p-1.5 text-stone-300 transition-colors hover:text-red-500" aria-label="Hapus">
                    <Trash size={14} weight="duotone" />
                  </button>
                </div>
              </div>
              <p className="mt-2 flex-1 whitespace-pre-line break-words font-mono text-xs leading-relaxed text-stone-500 line-clamp-6">{it.body}</p>
              <button
                onClick={() => copy(it)}
                className="mt-4 inline-flex items-center justify-center gap-2 rounded-full bg-brand-sand py-2.5 text-xs font-bold text-brand transition-colors hover:bg-brand hover:text-brand-cream"
              >
                {copied === it.id ? <><Check size={13} weight="bold" /> Tersalin</> : <><Copy size={13} weight="duotone" /> Salin</>}
              </button>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <div className="fixed inset-0 z-[130] flex items-end justify-center bg-black/50 backdrop-blur-sm sm:items-center sm:p-5" onClick={() => setEditing(null)}>
          <div className="w-full max-w-lg rounded-t-3xl bg-white p-6 sm:rounded-3xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="font-heading text-lg font-bold text-brand">{editing.id ? "Ubah catatan" : "Catatan baru"}</h3>
              <button onClick={() => setEditing(null)} className="p-1 text-stone-300 hover:text-brand" aria-label="Tutup"><X size={17} weight="bold" /></button>
            </div>
            <input value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} placeholder="Judul (opsional)" className="feedify-input mt-5" data-testid="command-judul" />
            <textarea value={editing.body} onChange={(e) => setEditing({ ...editing, body: e.target.value })} rows={10}
              placeholder="Tempel prompt atau catatanmu di sini..." className="feedify-input mt-3 resize-none font-mono text-xs" data-testid="command-isi" />
            <button onClick={save} className="mt-5 w-full rounded-full bg-brand py-3.5 font-semibold text-brand-cream transition-colors hover:bg-brand-light" data-testid="command-simpan">
              Simpan
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
