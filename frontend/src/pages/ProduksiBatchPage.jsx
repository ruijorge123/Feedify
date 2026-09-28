import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import {
  MagicWand, Copy, ArrowSquareOut, DownloadSimple, ClipboardText, FileCsv, Plus, X,
  CircleNotch, WarningCircle, CheckCircle, ArrowCounterClockwise, ImageSquare, Package,
  Palette, UserSwitch, ListChecks, Sparkle,
} from "@phosphor-icons/react";
import api from "@/lib/api";
import { useActiveClient } from "@/lib/clientPicker";
import { copyToClipboard, openChatGPT } from "@/lib/chatgpt";
import InspirationGallery from "@/components/InspirationGallery";

/**
 * Produksi Batch — plan a client's whole package, then work it feed by feed.
 *
 * Layar 1 (Siapkan) turns the client's Brand DNA, products and allocation plus a
 * few owner choices into N empty slots. Layar 2 (Rencana) fills each slot with an
 * idea, on-image text and caption (Groq), and hands the owner a ChatGPT prompt to
 * paste alongside the inspiration and product photos.
 *
 * The prompt is always rebuilt server-side from what was last saved, so every
 * copy action saves the row first — copying a prompt that predates the last edit
 * would silently produce the wrong text on the image.
 */

const BATCH = 10;       // rows per delivery batch (display grouping)
const AI_CHUNK = 5;     // rows per Groq request — matches the server's limit

const errMsg = (e, fallback) => e?.response?.data?.detail || fallback;
const isEmpty = (r) => !r.ide?.trim() && !r.teks?.trim() && !r.caption?.trim();
const slug = (s) => (s || "file").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "file";

function triggerDownload(href, filename) {
  const a = document.createElement("a");
  a.href = href;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

// Product photos are base64 in Mongo and reused by every row of the same
// product, so they are fetched once per page visit.
const _photoCache = new Map();
function fetchProductPhoto(clientId, productId) {
  const key = `${clientId}:${productId}`;
  if (!_photoCache.has(key)) {
    _photoCache.set(
      key,
      api.get(`/admin/produksi/${clientId}/produk/${productId}/foto`)
        .then(({ data }) => data)
        .catch((e) => { _photoCache.delete(key); throw e; }),
    );
  }
  return _photoCache.get(key);
}

export default function ProduksiBatchPage() {
  const client = useActiveClient();
  const clientId = client?.user_id;
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState("rencana");

  const load = useCallback(async () => {
    if (!clientId) return;
    setLoading(true);
    try {
      const { data } = await api.get(`/admin/produksi/${clientId}`);
      setData(data);
      setMode(data.rencana ? "rencana" : "siapkan");
    } catch (e) {
      toast.error(errMsg(e, "Gagal memuat data klien"));
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => { setData(null); load(); }, [load]);

  if (!clientId) {
    return (
      <Shell>
        <div className="rounded-2xl border border-dashed border-brand-sand bg-white p-10 text-center" data-testid="produksi-no-client">
          <UserSwitch size={34} weight="duotone" className="mx-auto text-brand-light" />
          <h2 className="mt-4 font-heading text-xl font-bold text-brand">Pilih klien dulu</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-stone-500">
            Pakai pemilih klien di bagian atas, atau buka Daftar Klien lalu klik tombol Produksi Batch pada klien yang mau dikerjakan.
          </p>
          <Link to="/klien" className="mt-6 inline-flex items-center gap-2 rounded-full bg-brand px-6 py-3 text-sm font-semibold text-brand-cream hover:bg-brand-light" data-testid="produksi-ke-klien">
            Buka Daftar Klien
          </Link>
        </div>
      </Shell>
    );
  }

  if (loading || !data) {
    return (
      <Shell>
        <div className="flex justify-center py-24"><CircleNotch size={26} className="animate-spin text-brand" /></div>
      </Shell>
    );
  }

  return (
    <Shell nama={data.client.nama}>
      {mode === "siapkan" || !data.rencana ? (
        <Siapkan
          data={data}
          onCancel={data.rencana ? () => setMode("rencana") : null}
          onCreated={(plan) => { setData((d) => ({ ...d, rencana: plan })); setMode("rencana"); }}
        />
      ) : (
        <Rencana
          key={data.rencana.id}
          data={data}
          onNew={() => setMode("siapkan")}
        />
      )}
    </Shell>
  );
}

function Shell({ nama, children }) {
  return (
    <div className="mx-auto max-w-6xl px-5 py-8 sm:px-8 sm:py-10">
      <div className="flex items-center gap-3">
        <div className="grid h-11 w-11 place-items-center rounded-2xl bg-brand">
          <ListChecks size={22} weight="duotone" className="text-brand-gold" />
        </div>
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight text-brand sm:text-3xl">Produksi Batch</h1>
          <p className="text-sm text-stone-500">{nama ? `Klien: ${nama}` : "Rencanakan satu paket, kerjakan per feed."}</p>
        </div>
      </div>
      <div className="mt-8">{children}</div>
    </div>
  );
}

/* ── Layar 1: Siapkan ─────────────────────────────────────────────────────── */

function Siapkan({ data, onCreated, onCancel }) {
  const { client, brand, products, campuran } = data;
  const sisa = Math.max(0, client.total_feeds - client.counter);
  const [jumlah, setJumlah] = useState(sisa || 10);
  const [pilihan, setPilihan] = useState("seimbang");
  const [gaya, setGaya] = useState([]);
  const [momen, setMomen] = useState("");
  const [gallery, setGallery] = useState(null); // context name when open
  const [busy, setBusy] = useState(false);

  const colors = brand.colors?.length
    ? brand.colors
    : [brand.color_primary, brand.color_secondary, brand.color_accent].filter(Boolean);
  const tanpaFoto = products.filter((p) => !p.has_photo);
  const warnings = [
    !brand.brand_name && "Brand DNA belum diisi — prompt akan tanpa warna dan suasana brand.",
    !products.length && "Klien belum menambahkan produk.",
    tanpaFoto.length > 0 && `Belum ada foto untuk: ${tanpaFoto.map((p) => p.name).join(", ")}.`,
  ].filter(Boolean);

  const addGaya = (ctx) => (photo) => {
    setGaya((g) => {
      const id = `${ctx}:${photo.id}`;
      if (g.some((x) => x.id === id) || g.length >= data.max_gaya) return g;
      return [...g, {
        id,
        url: photo.url,
        description: photo.description || "",
        categoryName: photo.categoryName || "",
        tags: photo.tags || [],
      }];
    });
  };

  const buat = async () => {
    const n = Number(jumlah);
    if (!n || n < 1 || n > data.max_jumlah) { toast.error(`Jumlah feed harus 1–${data.max_jumlah}`); return; }
    setBusy(true);
    try {
      const { data: plan } = await api.post(`/admin/produksi/${client.user_id}/rencana`, {
        jumlah: n, campuran: pilihan, gaya, momen,
      });
      toast.success(`Rencana ${n} feed dibuat`);
      onCreated(plan);
    } catch (e) {
      toast.error(errMsg(e, "Gagal membuat rencana"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* brief klien */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card title="Paket">
          <div className="font-heading text-4xl font-bold text-brand">{client.counter}<span className="text-xl text-stone-300"> / {client.total_feeds}</span></div>
          <p className="mt-1 text-sm text-stone-500">feed selesai · sisa <strong className="text-brand">{sisa}</strong></p>
        </Card>
        <Card title="Brand DNA">
          <div className="font-heading font-semibold text-brand">{brand.brand_name || "Belum diisi"}</div>
          {colors.length > 0 && (
            <div className="mt-2 flex gap-1.5">
              {colors.map((c) => <span key={c} className="h-6 w-6 rounded-full border border-black/10" style={{ background: c }} title={c} />)}
            </div>
          )}
          <p className="mt-2 text-sm text-stone-500">{brand.mood || "Mood belum diisi"}</p>
          {(brand.donts?.length > 0 || brand.donts_notes) && (
            <p className="mt-1 text-xs text-stone-400">Larangan: {[...(brand.donts || []), brand.donts_notes].filter(Boolean).join(", ")}</p>
          )}
        </Card>
        <Card title="Produk">
          {products.length === 0 ? (
            <p className="text-sm text-stone-400">Belum ada produk</p>
          ) : (
            <ul className="space-y-1.5 text-sm">
              {products.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-2">
                  <span className="truncate text-stone-700">{p.name}</span>
                  <span className="flex-shrink-0 text-xs text-stone-400">{p.allocation} feed{!p.has_photo && " · tanpa foto"}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {warnings.length > 0 && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800" data-testid="produksi-peringatan">
          {warnings.map((w) => (
            <div key={w} className="flex items-start gap-2"><WarningCircle size={17} weight="fill" className="mt-0.5 flex-shrink-0 text-amber-500" />{w}</div>
          ))}
        </div>
      )}

      {/* pengaturan */}
      <div className="space-y-7 rounded-2xl border border-brand-sand bg-white p-6 sm:p-8">
        <Field label="Jumlah feed" hint={`Sisa paket klien: ${sisa} feed. Nanti dibagi per batch ${BATCH}.`}>
          <input
            type="number" min={1} max={data.max_jumlah} value={jumlah}
            onChange={(e) => setJumlah(e.target.value)}
            className="feedify-input max-w-[160px]" data-testid="produksi-jumlah"
          />
        </Field>

        <Field label="Campuran konten">
          <div className="grid gap-3 sm:grid-cols-3">
            {Object.entries(campuran).map(([id, c]) => (
              <button
                key={id} type="button" onClick={() => setPilihan(id)}
                className={`rounded-2xl border p-4 text-left transition-colors ${pilihan === id ? "border-brand bg-brand/5" : "border-brand-sand hover:border-brand-light"}`}
                data-testid={`produksi-campuran-${id}`}
              >
                <div className="font-heading font-semibold text-brand">{c.label}</div>
                <div className="mt-2 flex flex-wrap gap-1">
                  {Object.entries(c.persen).map(([t, v]) => (
                    <span key={t} className="rounded-full bg-brand-sand/70 px-2 py-0.5 text-[11px] text-stone-600">{data.tipe_label[t]} {v}%</span>
                  ))}
                </div>
              </button>
            ))}
          </div>
        </Field>

        <Field label={`Gaya inspirasi (maks. ${data.max_gaya})`} hint="Dibagikan bergiliran ke semua feed. Bisa diganti per feed di rencana.">
          <div className="flex flex-wrap gap-3">
            {gaya.map((g, i) => (
              <div key={g.id} className="relative h-32 w-24 overflow-hidden rounded-xl border border-brand-sand bg-brand-sand/40">
                <img src={g.url} alt={g.description || `Gaya ${i + 1}`} className="h-full w-full object-cover" />
                <span className="absolute left-1.5 top-1.5 rounded-full bg-brand px-2 py-0.5 text-[10px] font-bold text-brand-cream">{i + 1}</span>
                <button
                  type="button" onClick={() => setGaya((x) => x.filter((y) => y.id !== g.id))}
                  className="absolute right-1.5 top-1.5 grid h-6 w-6 place-items-center rounded-full bg-white/90 text-stone-600 hover:text-red-500"
                  aria-label="Hapus gaya" data-testid={`produksi-hapus-gaya-${i + 1}`}
                >
                  <X size={12} weight="bold" />
                </button>
              </div>
            ))}
            {gaya.length < data.max_gaya && (
              <div className="flex flex-col gap-2">
                <button type="button" onClick={() => setGallery("banner")} className="inline-flex items-center gap-2 rounded-full border-2 border-dashed border-brand-sand px-4 py-2.5 text-sm font-medium text-stone-500 hover:border-brand-gold hover:text-brand" data-testid="produksi-tambah-gaya-feed">
                  <Plus size={14} weight="bold" /> Dari galeri Feed
                </button>
                <button type="button" onClick={() => setGallery("studio")} className="inline-flex items-center gap-2 rounded-full border-2 border-dashed border-brand-sand px-4 py-2.5 text-sm font-medium text-stone-500 hover:border-brand-gold hover:text-brand" data-testid="produksi-tambah-gaya-studio">
                  <Plus size={14} weight="bold" /> Dari galeri Studio
                </button>
              </div>
            )}
          </div>
          {gaya.length === 0 && <p className="mt-2 text-xs text-stone-400">Tanpa gaya pun bisa — prompt akan meminta ChatGPT membuat desain dari Brand DNA saja.</p>}
        </Field>

        <Field label="Momen bulan ini (opsional)" hint="Hanya dipakai di feed Promo. Contoh: Gajian 25, Harbolnas 11.11, Ramadan.">
          <input value={momen} onChange={(e) => setMomen(e.target.value)} placeholder="Kosongkan kalau tidak ada" className="feedify-input" data-testid="produksi-momen" />
        </Field>

        <div className="flex flex-wrap items-center gap-3 border-t border-brand-sand pt-6">
          <button onClick={buat} disabled={busy} className="inline-flex items-center gap-2 rounded-full bg-brand px-7 py-3.5 font-semibold text-brand-cream hover:bg-brand-light disabled:opacity-50" data-testid="produksi-buat-rencana">
            {busy ? <CircleNotch size={17} className="animate-spin" /> : <Sparkle size={17} weight="fill" />}
            Buat rencana {Number(jumlah) || ""} feed
          </button>
          {onCancel && (
            <button onClick={onCancel} className="rounded-full px-5 py-3 text-sm font-medium text-stone-500 hover:text-brand" data-testid="produksi-batal">
              Kembali ke rencana
            </button>
          )}
        </div>
      </div>

      <InspirationGallery
        open={Boolean(gallery)}
        context={gallery || "banner"}
        onClose={() => setGallery(null)}
        onSelect={addGaya(gallery || "banner")}
      />
    </div>
  );
}

/* ── Layar 2: Rencana ─────────────────────────────────────────────────────── */

function Rencana({ data, onNew }) {
  const plan = data.rencana;
  const clientId = data.client.user_id;
  const gayaList = plan.settings?.gaya || [];
  const gayaById = Object.fromEntries(gayaList.map((g) => [g.id, g]));
  const productById = Object.fromEntries(data.products.map((p) => [p.id, p]));

  const [rows, setRows] = useState(plan.rows);
  const rowsRef = useRef(plan.rows);
  const savedRef = useRef(Object.fromEntries(plan.rows.map((r) => [r.no, r])));
  const [saving, setSaving] = useState({});
  const [filling, setFilling] = useState({});
  const [progress, setProgress] = useState(null);

  // rowsRef is the source of truth and is updated synchronously, so a save that
  // runs right after an edit always sees the edit — no dependence on when React
  // gets round to running a state updater.
  const setRowsBoth = (fn) => {
    rowsRef.current = fn(rowsRef.current);
    setRows(rowsRef.current);
  };

  const applyServerRow = (row) => {
    savedRef.current[row.no] = row;
    setRowsBoth((prev) => prev.map((r) => (r.no === row.no ? row : r)));
  };

  const edit = (no, patch) => setRowsBoth((prev) => prev.map((r) => (r.no === no ? { ...r, ...patch } : r)));

  const FIELDS = ["ide", "teks", "perubahan", "caption", "gaya_id", "product_id", "tipe"];

  /** Save a row if it changed, and return the row with a prompt matching what was saved. */
  const flush = async (no) => {
    const cur = rowsRef.current.find((r) => r.no === no);
    const saved = savedRef.current[no];
    const diff = {};
    FIELDS.forEach((k) => { if ((cur[k] ?? "") !== (saved[k] ?? "")) diff[k] = cur[k] ?? ""; });
    if (!Object.keys(diff).length) return cur;
    setSaving((s) => ({ ...s, [no]: true }));
    try {
      const { data: row } = await api.patch(`/admin/produksi/rencana/${plan.id}/baris/${no}`, diff);
      // Keep anything typed while the request was in flight.
      const latest = rowsRef.current.find((r) => r.no === no);
      const merged = { ...row };
      FIELDS.forEach((k) => { if ((latest[k] ?? "") !== (cur[k] ?? "")) merged[k] = latest[k]; });
      savedRef.current[no] = row;
      setRowsBoth((prev) => prev.map((r) => (r.no === no ? merged : r)));
      return row;
    } catch (e) {
      toast.error(errMsg(e, `Gagal menyimpan feed #${no}`));
      throw e;
    } finally {
      setSaving((s) => ({ ...s, [no]: false }));
    }
  };

  const setAndSave = (no, patch) => { edit(no, patch); flush(no).catch(() => {}); };

  const fill = async (nos) => {
    setFilling((f) => ({ ...f, ...Object.fromEntries(nos.map((n) => [n, true])) }));
    try {
      await Promise.all(nos.map((n) => flush(n).catch(() => {})));
      const { data: res } = await api.post(`/admin/produksi/rencana/${plan.id}/isi`, { nomor: nos });
      res.baris.forEach(applyServerRow);
      return res.baris.length;
    } finally {
      setFilling((f) => ({ ...f, ...Object.fromEntries(nos.map((n) => [n, false])) }));
    }
  };

  const fillOne = async (row) => {
    if (!isEmpty(row) && !window.confirm(`Isi ulang feed #${row.no}? Ide, teks, dan caption sekarang akan diganti.`)) return;
    try {
      await fill([row.no]);
      toast.success(`Feed #${row.no} diisi`);
    } catch (e) {
      toast.error(errMsg(e, "AI gagal mengisi. Coba lagi."));
    }
  };

  const fillAll = async () => {
    const empties = rowsRef.current.filter(isEmpty).map((r) => r.no);
    if (!empties.length) { toast.info("Semua feed sudah terisi"); return; }
    setProgress({ done: 0, total: empties.length });
    let done = 0;
    for (let i = 0; i < empties.length; i += AI_CHUNK) {
      const chunk = empties.slice(i, i + AI_CHUNK);
      try {
        done += await fill(chunk);
      } catch (e) {
        toast.error(errMsg(e, "AI berhenti di tengah jalan. Klik lagi untuk melanjutkan."));
        break;
      }
      setProgress({ done, total: empties.length });
    }
    setProgress(null);
    const left = rowsRef.current.filter(isEmpty).length;
    if (left) toast.warn(`${left} feed belum terisi — klik "Isi otomatis semua" sekali lagi.`);
    else toast.success("Semua feed terisi");
  };

  const copyPrompt = async (no, open = false) => {
    try {
      const row = await flush(no);
      const ok = await copyToClipboard(row.prompt);
      if (!ok) { toast.error("Gagal menyalin"); return; }
      if (open) {
        openChatGPT();
        toast.success("Prompt tersalin. Tempel di ChatGPT, lalu lampirkan foto inspirasi dan foto produk.", { autoClose: 6000 });
      } else {
        toast.success(`Prompt feed #${no} tersalin`);
      }
    } catch { /* flush already reported */ }
  };

  const copyCaption = async (row) => {
    if (!row.caption?.trim()) { toast.info("Caption masih kosong"); return; }
    if (await copyToClipboard(row.caption)) toast.success(`Caption feed #${row.no} tersalin`);
  };

  const downloadInspirasi = (row) => {
    const g = gayaById[row.gaya_id];
    if (!g) { toast.info("Feed ini tanpa inspirasi"); return; }
    const ext = (g.url.split(".").pop() || "webp").split("?")[0];
    triggerDownload(g.url, `inspirasi-feed-${row.no}.${ext}`);
  };

  const downloadProduk = async (row) => {
    const p = productById[row.product_id];
    if (!p) { toast.info("Feed ini belum punya produk"); return; }
    if (!p.has_photo) { toast.error(`Foto ${p.name} belum diunggah klien`); return; }
    try {
      const { photo_base64 } = await fetchProductPhoto(clientId, p.id);
      const ext = (photo_base64.match(/^data:image\/(\w+)/) || [])[1] || "jpg";
      triggerDownload(photo_base64, `${slug(p.name)}.${ext}`);
    } catch (e) {
      toast.error(errMsg(e, "Gagal mengunduh foto produk"));
    }
  };

  const brandName = data.brand.brand_name || data.client.nama;

  const copyRingkasan = async () => {
    const lines = [`Rencana konten ${brandName} — ${rows.length} feed`, ""];
    rows.forEach((r, i) => {
      if (i % BATCH === 0) lines.push(`Batch ${i / BATCH + 1}`);
      const teks = (r.teks || "").split("\n").map((t) => t.trim()).filter(Boolean).join(" / ");
      lines.push(`${r.no}. ${r.product_name || "-"} · ${r.tipe_label} — ${r.ide || "(ide belum diisi)"}`);
      if (teks) lines.push(`   Teks: "${teks}"`);
      if (i % BATCH === BATCH - 1 || i === rows.length - 1) lines.push("");
    });
    lines.push('Balas "OK" kalau sudah sesuai, atau sebut nomornya kalau ada yang mau diganti.');
    if (await copyToClipboard(lines.join("\n"))) toast.success("Ringkasan tersalin — tinggal tempel di WhatsApp klien");
  };

  const downloadCsv = () => {
    const esc = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const head = ["No", "Batch", "Produk", "Tipe", "Ide", "Teks di foto", "Perubahan lain", "Caption", "Prompt"];
    const body = rows.map((r, i) => [
      r.no, Math.floor(i / BATCH) + 1, r.product_name, r.tipe_label, r.ide, r.teks, r.perubahan, r.caption, r.prompt,
    ].map(esc).join(","));
    const blob = new Blob(["﻿" + [head.map(esc).join(","), ...body].join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    triggerDownload(url, `rencana-${slug(brandName)}.csv`);
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  };

  const terisi = rows.filter((r) => !isEmpty(r)).length;
  const batches = [];
  for (let i = 0; i < rows.length; i += BATCH) batches.push(rows.slice(i, i + BATCH));

  return (
    <div className="space-y-6">
      {/* header */}
      <div className="rounded-2xl border border-brand-sand bg-white p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="font-heading text-xl font-bold text-brand">Rencana {rows.length} feed · {brandName}</h2>
            <p className="mt-1 text-sm text-stone-500">
              {data.campuran[plan.settings?.campuran]?.label || "-"} · {gayaList.length} gaya inspirasi
              {plan.settings?.momen ? ` · Momen: ${plan.settings.momen}` : ""} · <strong className="text-brand">{terisi}/{rows.length}</strong> terisi
            </p>
          </div>
          <button onClick={() => { if (window.confirm("Buat rencana baru? Rencana ini tidak akan tampil lagi di halaman ini.")) onNew(); }} className="inline-flex items-center gap-2 rounded-full border border-brand-sand px-4 py-2 text-xs font-semibold text-stone-600 hover:border-brand hover:text-brand" data-testid="produksi-rencana-baru">
            <ArrowCounterClockwise size={13} weight="bold" /> Buat rencana baru
          </button>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          <button onClick={fillAll} disabled={Boolean(progress)} className="inline-flex items-center gap-2 rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-brand-cream hover:bg-brand-light disabled:opacity-60" data-testid="produksi-isi-semua">
            {progress ? <CircleNotch size={15} className="animate-spin" /> : <MagicWand size={15} weight="duotone" />}
            {progress ? `Mengisi ${progress.done}/${progress.total}…` : "Isi otomatis semua"}
          </button>
          <button onClick={copyRingkasan} className="inline-flex items-center gap-2 rounded-full border border-brand-sand bg-white px-5 py-2.5 text-sm font-semibold text-brand hover:border-brand" data-testid="produksi-salin-ringkasan">
            <ClipboardText size={15} weight="duotone" /> Salin ringkasan untuk klien
          </button>
          <button onClick={downloadCsv} className="inline-flex items-center gap-2 rounded-full border border-brand-sand bg-white px-5 py-2.5 text-sm font-semibold text-brand hover:border-brand" data-testid="produksi-unduh-csv">
            <FileCsv size={15} weight="duotone" /> Unduh Excel (CSV)
          </button>
        </div>

        <div className="mt-5 flex items-start gap-2 rounded-xl bg-amber-50 p-3.5 text-xs leading-relaxed text-amber-800">
          <WarningCircle size={16} weight="fill" className="mt-0.5 flex-shrink-0 text-amber-500" />
          <span>Cek sebelum dikirim: semua klaim (bahan, angka, manfaat) harus sesuai data produk klien. Feed Testimoni memakai kutipan <strong>asli</strong> pelanggan — ganti "[kutipan asli pelanggan]" sebelum membuat gambarnya.</span>
        </div>
      </div>

      {batches.map((list, bi) => (
        <section key={bi} className="space-y-4">
          <h3 className="px-1 text-xs font-bold uppercase tracking-[0.18em] text-stone-400">
            Batch {bi + 1} · feed {list[0].no}–{list[list.length - 1].no}
          </h3>
          {list.map((r) => (
            <Baris
              key={r.no}
              row={r}
              clientId={clientId}
              gaya={gayaById[r.gaya_id]}
              gayaList={gayaList}
              products={data.products}
              product={productById[r.product_id]}
              tipeLabel={data.tipe_label}
              saving={saving[r.no]}
              filling={filling[r.no]}
              onEdit={(patch) => edit(r.no, patch)}
              onBlur={() => flush(r.no).catch(() => {})}
              onSetAndSave={(patch) => setAndSave(r.no, patch)}
              onFill={() => fillOne(r)}
              onCopyPrompt={() => copyPrompt(r.no)}
              onOpenChatGPT={() => copyPrompt(r.no, true)}
              onCopyCaption={() => copyCaption(r)}
              onDownloadInspirasi={() => downloadInspirasi(r)}
              onDownloadProduk={() => downloadProduk(r)}
            />
          ))}
        </section>
      ))}
    </div>
  );
}

function Baris({
  row, clientId, gaya, gayaList, products, product, tipeLabel, saving, filling,
  onEdit, onBlur, onSetAndSave, onFill, onCopyPrompt, onOpenChatGPT, onCopyCaption,
  onDownloadInspirasi, onDownloadProduk,
}) {
  const [showPrompt, setShowPrompt] = useState(false);
  const n = String(row.no).padStart(2, "0");

  return (
    <div className="rounded-2xl border border-brand-sand bg-white p-5 sm:p-6" data-testid={`produksi-baris-${row.no}`}>
      <div className="flex flex-wrap items-center gap-2.5">
        <span className="mr-1 font-heading text-2xl font-bold text-brand">#{n}</span>
        <select value={row.product_id || ""} onChange={(e) => onSetAndSave({ product_id: e.target.value })} className="rounded-full border border-brand-sand bg-brand-cream px-3 py-1.5 text-xs font-semibold text-brand" data-testid={`produksi-produk-${row.no}`} aria-label="Produk">
          {!row.product_id && <option value="">Tanpa produk</option>}
          {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <select value={row.tipe} onChange={(e) => onSetAndSave({ tipe: e.target.value })} className="rounded-full border border-brand-sand bg-brand-cream px-3 py-1.5 text-xs font-semibold text-brand" data-testid={`produksi-tipe-${row.no}`} aria-label="Tipe konten">
          {Object.entries(tipeLabel).map(([id, l]) => <option key={id} value={id}>{l}</option>)}
        </select>
        <select value={row.gaya_id || ""} onChange={(e) => onSetAndSave({ gaya_id: e.target.value })} className="rounded-full border border-brand-sand bg-brand-cream px-3 py-1.5 text-xs font-semibold text-brand" data-testid={`produksi-gaya-${row.no}`} aria-label="Gaya inspirasi">
          <option value="">Tanpa inspirasi</option>
          {gayaList.map((g, i) => <option key={g.id} value={g.id}>Gaya {i + 1}</option>)}
        </select>
        <span className="ml-auto flex items-center gap-2 text-xs text-stone-400">
          {saving ? <><CircleNotch size={12} className="animate-spin" /> Menyimpan</> : row.diisi_ai ? <><CheckCircle size={13} weight="fill" className="text-emerald-500" /> Diisi AI</> : null}
        </span>
        <button onClick={onFill} disabled={filling} className="inline-flex items-center gap-1.5 rounded-full border border-brand-sand px-3.5 py-1.5 text-xs font-semibold text-brand hover:border-brand disabled:opacity-50" data-testid={`produksi-isi-${row.no}`}>
          {filling ? <CircleNotch size={12} className="animate-spin" /> : <MagicWand size={12} weight="duotone" />} Isi otomatis
        </button>
      </div>

      <div className="mt-5 grid gap-5 md:grid-cols-[208px,minmax(0,1fr)]">
        <div className="flex gap-4">
          <Thumb label="Inspirasi" src={gaya?.url} icon={ImageSquare} empty="Tanpa inspirasi" />
          <ProductThumb clientId={clientId} product={product} />
        </div>

        <div className="space-y-3">
          <TextField label="Ide foto" value={row.ide} onChange={(v) => onEdit({ ide: v })} onBlur={onBlur} placeholder="Apa yang terlihat di foto" testid={`produksi-ide-${row.no}`} />
          <TextField label="Teks di foto" multiline rows={3} value={row.teks} onChange={(v) => onEdit({ teks: v })} onBlur={onBlur} placeholder={"Satu baris per teks, misal:\nMengandung BHA\nPori bersih setiap hari"} testid={`produksi-teks-${row.no}`} />
          <TextField label="Perubahan lain (opsional)" value={row.perubahan} onChange={(v) => onEdit({ perubahan: v })} onBlur={onBlur} placeholder="Misal: daun diganti irisan jeruk" testid={`produksi-perubahan-${row.no}`} />
          <TextField label="Caption" multiline rows={4} value={row.caption} onChange={(v) => onEdit({ caption: v })} onBlur={onBlur} placeholder="Caption + hashtag" testid={`produksi-caption-${row.no}`} />
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-2 border-t border-brand-sand pt-4">
        <ActionBtn primary onClick={onOpenChatGPT} icon={ArrowSquareOut} testid={`produksi-chatgpt-${row.no}`}>Salin & buka ChatGPT</ActionBtn>
        <ActionBtn onClick={onCopyPrompt} icon={Copy} testid={`produksi-salin-prompt-${row.no}`}>Salin prompt</ActionBtn>
        <ActionBtn onClick={onDownloadInspirasi} icon={DownloadSimple} testid={`produksi-unduh-inspirasi-${row.no}`}>Unduh inspirasi</ActionBtn>
        <ActionBtn onClick={onDownloadProduk} icon={Package} testid={`produksi-unduh-produk-${row.no}`}>Unduh foto produk</ActionBtn>
        <ActionBtn onClick={onCopyCaption} icon={ClipboardText} testid={`produksi-salin-caption-${row.no}`}>Salin caption</ActionBtn>
        <button onClick={() => setShowPrompt((v) => !v)} className="ml-auto text-xs font-medium text-stone-400 hover:text-brand" data-testid={`produksi-lihat-prompt-${row.no}`}>
          {showPrompt ? "Tutup prompt" : "Lihat prompt"}
        </button>
      </div>

      {showPrompt && (
        <pre className="mt-3 max-h-80 overflow-auto rounded-xl bg-brand-terminal p-4 font-mono text-[11px] leading-relaxed text-emerald-100">{row.prompt}</pre>
      )}
    </div>
  );
}

/* ── small pieces ─────────────────────────────────────────────────────────── */

function Card({ title, children }) {
  return (
    <div className="rounded-2xl border border-brand-sand bg-white p-5">
      <div className="mb-3 text-[11px] font-bold uppercase tracking-[0.16em] text-stone-400">{title}</div>
      {children}
    </div>
  );
}

function Field({ label, hint, children }) {
  return (
    <div>
      <div className="mb-2 font-heading font-semibold text-brand">{label}</div>
      {children}
      {hint && <p className="mt-2 text-xs text-stone-400">{hint}</p>}
    </div>
  );
}

function TextField({ label, value, onChange, onBlur, placeholder, multiline, rows, testid }) {
  const common = {
    value: value || "",
    onChange: (e) => onChange(e.target.value),
    onBlur,
    placeholder,
    className: "feedify-input text-sm",
    "data-testid": testid,
  };
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.12em] text-stone-400">{label}</span>
      {multiline ? <textarea rows={rows} {...common} className="feedify-input resize-y text-sm" /> : <input {...common} />}
    </label>
  );
}

function Thumb({ label, src, icon: Icon, empty }) {
  return (
    <div className="w-24">
      <div className="h-[120px] w-24 overflow-hidden rounded-xl border border-brand-sand bg-brand-sand/40">
        {src ? <img src={src} alt={label} className="h-full w-full object-cover" /> : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-1 p-2 text-center text-[10px] text-stone-400">
            <Icon size={18} weight="duotone" />{empty}
          </div>
        )}
      </div>
      <div className="mt-1.5 text-center text-[10px] font-semibold uppercase tracking-[0.12em] text-stone-400">{label}</div>
    </div>
  );
}

function ProductThumb({ clientId, product }) {
  const [src, setSrc] = useState(null);
  const productId = product?.id;
  const hasPhoto = Boolean(product?.has_photo);
  useEffect(() => {
    let alive = true;
    setSrc(null);
    if (productId && hasPhoto) {
      fetchProductPhoto(clientId, productId)
        .then((d) => { if (alive) setSrc(d.photo_base64); })
        .catch(() => {});
    }
    return () => { alive = false; };
  }, [clientId, productId, hasPhoto]);
  return <Thumb label="Produk" src={src} icon={Palette} empty={product ? "Foto belum ada" : "Tanpa produk"} />;
}

function ActionBtn({ primary, onClick, icon: Icon, children, testid }) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold transition-colors ${
        primary ? "bg-brand text-brand-cream hover:bg-brand-light" : "border border-brand-sand bg-white text-stone-600 hover:border-brand hover:text-brand"
      }`}
      data-testid={testid}
    >
      <Icon size={13} weight="duotone" /> {children}
    </button>
  );
}
