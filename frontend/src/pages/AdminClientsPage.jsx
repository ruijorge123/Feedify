import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Users, MagnifyingGlass, CircleNotch, Eye, FloppyDisk, Plus, Minus,
  WhatsappLogo, InstagramLogo, FolderOpen, Package, Palette, Clock,
  CheckCircle, WarningCircle, ArrowLeft, Power, X, FilePdf, TiktokLogo,
  EnvelopeSimple, CalendarBlank, Storefront, Receipt, ClockCounterClockwise,
  ArrowsDownUp, LinkSimple, Copy, Check,
} from "@phosphor-icons/react";
import { toast } from "react-toastify";
import api from "@/lib/api";
import { statusStyle } from "@/lib/client";
import { formatRupiah, waLink } from "@/lib/agency";
import { setActiveClient } from "@/lib/clientPicker";
import { enterViewAs } from "@/lib/viewAs";
import { copyToClipboard } from "@/lib/chatgpt";

const STATUS_OPTS = [
  { id: "kuning", label: "Menunggu approval" },
  { id: "hijau", label: "Aktif dikerjakan" },
  { id: "selesai", label: "Paket selesai" },
  { id: "nonaktif", label: "Tidak aktif" },
];

const SORTS = [
  { id: "baru", label: "Terbaru" },
  { id: "progres", label: "Progres terendah" },
  { id: "sisa", label: "Sisa feed terbanyak" },
  { id: "nama", label: "Nama A–Z" },
];

function tgl(iso, withTime = false) {
  if (!iso) return "-";
  try {
    return new Date(iso).toLocaleDateString("id-ID", {
      day: "numeric", month: "short", year: "numeric",
      ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
    });
  } catch { return "-"; }
}

/** Days since a timestamp — the owner's real question is "how long has this sat?" */
function umur(iso) {
  if (!iso) return null;
  const d = Math.floor((Date.now() - new Date(iso)) / 86400000);
  return Number.isFinite(d) ? d : null;
}

/**
 * Client management, as a full page rather than a panel.
 *
 * This is the owner's daily work surface, not a setting — it needs the whole
 * screen for the roster, and the detail view needs room to show everything a
 * client has ever told us without collapsing it behind accordions.
 */
export default function AdminClientsPage() {
  const [rows, setRows] = useState(null);
  const [stats, setStats] = useState(null);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("semua");
  const [sort, setSort] = useState("baru");
  const [open, setOpen] = useState(null);
  const navigate = useNavigate();

  /** Step fully into that client's app — not a preview window. */
  const lihatSebagai = (r) => {
    enterViewAs({ user_id: r.user_id, name: r.name, nickname: r.nickname });
    navigate("/dashboard");
  };

  const load = async () => {
    try {
      const [{ data: list }, { data: s }] = await Promise.all([
        api.get("/admin/clients"),
        api.get("/admin/clients-stats"),
      ]);
      setRows(list);
      setStats(s);
    } catch { toast.error("Gagal memuat daftar klien"); setRows([]); }
  };
  useEffect(() => { load(); }, []);

  const shown = useMemo(() => {
    if (!rows) return [];
    const term = q.trim().toLowerCase();
    let out = rows.filter((r) => {
      if (filter === "belum_lengkap" && r.kelengkapan?.lengkap) return false;
      if (filter !== "semua" && filter !== "belum_lengkap" && r.status !== filter) return false;
      if (!term) return true;
      return [r.name, r.email, r.nickname, r.whatsapp, r.instagram]
        .filter(Boolean).some((v) => String(v).toLowerCase().includes(term));
    });
    const pct = (r) => (r.total_feeds ? r.counter / r.total_feeds : 1);
    out = [...out].sort((a, b) => {
      if (sort === "nama") return (a.nickname || a.name || "").localeCompare(b.nickname || b.name || "");
      if (sort === "progres") return pct(a) - pct(b);
      if (sort === "sisa") return (b.total_feeds - b.counter) - (a.total_feeds - a.counter);
      return String(b.created_at || "").localeCompare(String(a.created_at || ""));
    });
    return out;
  }, [rows, q, filter, sort]);

  if (open) return <DetailKlien userId={open} onBack={() => { setOpen(null); load(); }} />;

  return (
    <div className="mx-auto max-w-6xl px-5 py-8 sm:px-8 sm:py-10">
      <div className="flex items-start gap-4">
        <div className="grid h-12 w-12 flex-shrink-0 place-items-center rounded-2xl bg-brand-sand">
          <Users size={22} weight="duotone" className="text-brand-light" />
        </div>
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight text-brand sm:text-3xl">Daftar Klien</h1>
          <p className="mt-1.5 text-sm text-stone-500">Semua klien yang sudah membayar, beserta progres dan kelengkapan datanya.</p>
        </div>
      </div>

      {stats && (
        <div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Total klien" value={stats.total_klien} />
          <Stat label="Menunggu approval" value={stats.menunggu_approval} tone="amber" />
          <Stat label="Data belum lengkap" value={stats.data_belum_lengkap} tone="amber" />
          <Stat label="Feed terkirim" value={stats.feed_terkirim} tone="emerald" />
        </div>
      )}

      <div className="mt-6 flex flex-wrap gap-3">
        <div className="relative min-w-[220px] flex-1">
          <MagnifyingGlass size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-300" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari nama, email, WA, atau IG..." className="feedify-input pl-11" data-testid="klien-cari" />
        </div>
        <select value={filter} onChange={(e) => setFilter(e.target.value)} className="feedify-input w-auto" data-testid="klien-filter">
          <option value="semua">Semua status</option>
          {STATUS_OPTS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
          <option value="belum_lengkap">Data belum lengkap</option>
        </select>
        <select value={sort} onChange={(e) => setSort(e.target.value)} className="feedify-input w-auto" data-testid="klien-sort">
          {SORTS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
        </select>
      </div>

      {rows === null ? (
        <div className="flex justify-center py-20"><CircleNotch size={26} className="animate-spin text-brand" /></div>
      ) : shown.length === 0 ? (
        <div className="mt-6 rounded-2xl border-2 border-dashed border-brand-sand py-20 text-center">
          <Users size={32} weight="duotone" className="mx-auto text-stone-300" />
          <p className="mt-3 text-sm text-stone-400">
            {rows.length === 0 ? "Belum ada klien. Mereka muncul di sini setelah pembayaran kamu setujui." : "Tidak ada klien yang cocok."}
          </p>
        </div>
      ) : (
        <>
          <div className="mt-4 text-xs text-stone-400">{shown.length} dari {rows.length} klien</div>
          <div className="mt-3 space-y-3">
            {shown.map((r) => <RowKlien key={r.user_id} r={r} onOpen={() => setOpen(r.user_id)} onPreview={() => lihatSebagai(r)} />)}
          </div>
        </>
      )}

    </div>
  );
}

function RowKlien({ r, onOpen, onPreview }) {
  const st = statusStyle(r.status);
  const pct = r.total_feeds ? Math.round((r.counter / r.total_feeds) * 100) : 0;
  const hari = umur(r.created_at);
  const k = r.kelengkapan || {};

  return (
    <div className="rounded-2xl border border-brand-sand bg-white p-5" data-testid="klien-row">
      <div className="flex flex-wrap items-start gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-heading font-bold text-brand">{r.nickname || r.name || "-"}</span>
            <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${st.chip}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${st.dot}`} /> {st.label}
            </span>
            {!k.lengkap && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-[11px] font-semibold text-amber-700">
                <WarningCircle size={11} weight="fill" /> Data belum lengkap
              </span>
            )}
          </div>

          <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-stone-400">
            <span className="inline-flex items-center gap-1"><EnvelopeSimple size={12} weight="duotone" /> {r.email || "-"}</span>
            {r.whatsapp && <span className="inline-flex items-center gap-1"><WhatsappLogo size={12} weight="fill" /> {r.whatsapp}</span>}
            {r.instagram && <span className="inline-flex items-center gap-1"><InstagramLogo size={12} weight="fill" /> @{r.instagram}</span>}
            <span className="inline-flex items-center gap-1"><CalendarBlank size={12} weight="duotone" /> Gabung {tgl(r.created_at)}{hari != null && ` · ${hari} hari lalu`}</span>
          </div>

          <div className="mt-3 flex flex-wrap gap-1.5">
            {[["profil", "Data diri"], ["brand_dna", "Brand DNA"], ["produk", "Produk"], ["alokasi", "Pembagian"]].map(([key, label]) => (
              <span key={key} className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                k[key] ? "bg-emerald-50 text-emerald-700" : "bg-stone-100 text-stone-400"
              }`}>
                {k[key] ? <Check size={9} weight="bold" /> : <X size={9} weight="bold" />} {label}
              </span>
            ))}
          </div>
        </div>

        <div className="w-full flex-shrink-0 sm:w-40">
          <div className="flex items-baseline justify-between">
            <span className="font-heading text-lg font-bold text-brand">{r.counter}<span className="text-stone-300">/{r.total_feeds}</span></span>
            <span className="text-[11px] text-stone-400">{pct}%</span>
          </div>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-brand-sand">
            <div className="h-full rounded-full bg-brand-gold transition-[width]" style={{ width: `${pct}%` }} />
          </div>
          <div className="mt-1 text-[11px] text-stone-400">
            {Math.max(0, r.total_feeds - r.counter)} feed belum dikerjakan
          </div>

          <div className="mt-3 flex gap-1.5">
            {r.whatsapp && (
              <a href={`https://wa.me/${r.whatsapp}`} target="_blank" rel="noopener noreferrer"
                 className="grid h-9 w-9 place-items-center rounded-full border border-emerald-200 bg-emerald-50 text-emerald-600 hover:bg-emerald-100" title="Chat WhatsApp">
                <WhatsappLogo size={14} weight="fill" />
              </a>
            )}
            <button
              onClick={onPreview}
              className="grid h-9 w-9 place-items-center rounded-full border border-brand-sand text-stone-500 hover:border-brand hover:text-brand"
              title="Lihat sebagai klien"
              data-testid="klien-preview"
            >
              <Eye size={14} weight="duotone" />
            </button>
            <button
              onClick={() => { setActiveClient({ user_id: r.user_id, name: r.name, nickname: r.nickname, status: r.status, counter: r.counter, total_feeds: r.total_feeds, lengkap: k.lengkap }); toast.success(`Tools sekarang pakai brand ${r.nickname || r.name}`); }}
              className="grid h-9 w-9 place-items-center rounded-full border border-brand-sand text-stone-500 hover:border-brand hover:text-brand"
              title="Pakai brand ini di tools"
              data-testid="klien-pakai-brand"
            >
              <Palette size={14} weight="duotone" />
            </button>
            <button onClick={onOpen} className="flex-1 rounded-full bg-brand px-4 py-2 text-xs font-semibold text-brand-cream hover:bg-brand-light" data-testid="klien-detail">
              Kelola
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, tone }) {
  const color = tone === "amber" ? "text-amber-600" : tone === "emerald" ? "text-emerald-600" : "text-brand";
  return (
    <div className="rounded-2xl border border-brand-sand bg-white p-4">
      <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-stone-400">{label}</div>
      <div className={`mt-1 font-heading text-2xl font-bold ${color}`}>{value}</div>
    </div>
  );
}

/* ── detail ────────────────────────────────────────────────────────────────── */

function DetailKlien({ userId, onBack }) {
  const navigate = useNavigate();
  const [d, setD] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({});
  const [copied, setCopied] = useState(false);

  const load = async () => {
    const { data } = await api.get(`/admin/clients/${userId}`);
    setD(data);
    setForm({
      status: data.client.status,
      counter: data.client.counter,
      total_feeds: data.client.total_feeds,
      drive_link: data.client.drive_link || "",
      note: data.client.note || "",
    });
  };
  useEffect(() => { load(); }, [userId]);

  const save = async () => {
    setSaving(true);
    try { await api.patch(`/admin/clients/${userId}`, form); toast.success("Tersimpan"); await load(); }
    catch (e) { toast.error(e?.response?.data?.detail || "Gagal menyimpan"); }
    finally { setSaving(false); }
  };

  const toggleAktif = async () => {
    const off = d.client.status !== "nonaktif";
    try {
      await api.post(`/admin/clients/${userId}/${off ? "deactivate" : "activate"}`);
      toast.success(off ? "Akun dinonaktifkan" : "Akun diaktifkan");
      await load();
    } catch { toast.error("Gagal mengubah status"); }
  };

  if (!d) return <div className="flex justify-center py-20"><CircleNotch size={26} className="animate-spin text-brand" /></div>;

  const c = d.client, k = d.kelengkapan, b = d.brand || {}, u = d.user || {};
  const wa = c.whatsapp || u.whatsapp;
  const terpakai = d.products.reduce((a, p) => a + (p.allocation || 0), 0);

  return (
    <div className="mx-auto max-w-6xl px-5 py-8 sm:px-8 sm:py-10">
      <button onClick={onBack} className="inline-flex items-center gap-2 text-sm text-stone-500 hover:text-brand">
        <ArrowLeft size={15} weight="bold" /> Daftar klien
      </button>

      <div className="mt-5 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight text-brand sm:text-3xl">
            {c.nickname || u.name || "-"}
          </h1>
          <p className="mt-1 text-sm text-stone-400">{u.name} · {u.email}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Btn
            onClick={() => { enterViewAs({ user_id: userId, name: u.name, nickname: c.nickname }); navigate("/dashboard"); }}
            icon={Eye}
          >
            Lihat sebagai klien
          </Btn>
          <Btn onClick={() => setActiveClient({ user_id: userId, name: u.name, nickname: c.nickname, status: c.status, counter: c.counter, total_feeds: c.total_feeds, lengkap: k.lengkap }) || toast.success("Tools memakai brand ini")} icon={Palette}>Pakai di tools</Btn>
          <Btn onClick={() => exportBriefPdf(d)} icon={FilePdf}>Cetak brief</Btn>
          <button onClick={toggleAktif} className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold ${
            c.status === "nonaktif" ? "bg-emerald-600 text-white hover:bg-emerald-700" : "border border-red-200 text-red-600 hover:bg-red-50"
          }`}>
            <Power size={13} weight="bold" /> {c.status === "nonaktif" ? "Aktifkan" : "Nonaktifkan"}
          </button>
        </div>
      </div>

      <div className="mt-7 grid gap-5 lg:grid-cols-[1fr_.9fr]">
        {/* kolom kiri: yang bisa diubah */}
        <div className="space-y-5">
          <Panel title="Paket & progres">
            <div className="grid gap-4 sm:grid-cols-2">
              <NumberField label="Feed selesai" value={form.counter} onChange={(v) => setForm({ ...form, counter: v })} testId="admin-counter" />
              <NumberField label="Total paket" value={form.total_feeds} onChange={(v) => setForm({ ...form, total_feeds: v })} testId="admin-total" />
            </div>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-brand-sand">
              <div className="h-full rounded-full bg-brand-gold" style={{ width: `${form.total_feeds ? Math.round((form.counter / form.total_feeds) * 100) : 0}%` }} />
            </div>
            <label className="mt-5 block text-xs font-bold uppercase tracking-[0.14em] text-stone-500">Status</label>
            <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="feedify-input mt-2" data-testid="admin-status">
              {STATUS_OPTS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
            <p className="mt-2 text-xs text-stone-400">Otomatis jadi "Paket selesai" begitu counter menyentuh total.</p>
          </Panel>

          <Panel title="Folder Google Drive" icon={FolderOpen}>
            <input value={form.drive_link} onChange={(e) => setForm({ ...form, drive_link: e.target.value })} placeholder="https://drive.google.com/drive/folders/..." className="feedify-input" data-testid="admin-drive" />
            <div className="mt-2 flex items-center justify-between">
              <p className="text-xs text-stone-400">Muncul di Beranda klien.</p>
              {c.drive_link && (
                <a href={c.drive_link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs font-medium text-brand-light hover:text-brand">
                  <LinkSimple size={12} weight="bold" /> Buka
                </a>
              )}
            </div>
          </Panel>

          <Panel title="Catatan internal">
            <textarea value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} rows={3} placeholder="Hanya kamu yang bisa melihat ini." className="feedify-input resize-none" />
          </Panel>

          <button onClick={save} disabled={saving} className="inline-flex items-center gap-2 rounded-full bg-brand px-7 py-3.5 font-semibold text-brand-cream disabled:opacity-40" data-testid="admin-simpan-klien">
            {saving ? <><CircleNotch size={15} className="animate-spin" /> Menyimpan...</> : <><FloppyDisk size={15} weight="bold" /> Simpan Perubahan</>}
          </button>
        </div>

        {/* kolom kanan: semua yang klien pernah isi */}
        <div className="space-y-5">
          <Panel title="Kontak & akun">
            <Row icon={EnvelopeSimple} label="Email" value={u.email} />
            <Row icon={WhatsappLogo} label="WhatsApp" value={wa} href={wa ? `https://wa.me/${wa}` : null} />
            <Row icon={InstagramLogo} label="Instagram" value={c.instagram && `@${c.instagram}`} href={c.instagram ? `https://instagram.com/${c.instagram}` : null} />
            <Row icon={TiktokLogo} label="TikTok" value={c.tiktok && `@${c.tiktok}`} />
            <Row icon={Clock} label="Jam dihubungi" value={c.contact_time} />
            <Row icon={CalendarBlank} label="Gabung" value={tgl(c.created_at)} />
            <Row icon={ClockCounterClockwise} label="Terakhir ubah" value={tgl(c.updated_at, true)} />
            {c.store_links?.length > 0 && (
              <div className="pt-1.5">
                <div className="mb-1 text-xs text-stone-400">Toko online</div>
                {c.store_links.map((l) => (
                  <a key={l} href={l} target="_blank" rel="noopener noreferrer" className="block truncate text-sm text-brand-light hover:underline">{l}</a>
                ))}
              </div>
            )}
            {c.reference_accounts?.length > 0 && (
              <Row icon={InstagramLogo} label="Referensi" value={c.reference_accounts.map((a) => `@${a}`).join(", ")} />
            )}
          </Panel>

          <Panel title="Kelengkapan data">
            {[["profil", "Data diri"], ["brand_dna", "Brand DNA"], ["produk", `Produk (${k.produk_count})`], ["alokasi", `Pembagian ${k.alokasi_terpakai}/${k.alokasi_total}`]].map(([key, label]) => (
              <div key={key} className="flex items-center gap-2.5 py-1.5">
                {k[key] ? <CheckCircle size={15} weight="fill" className="text-emerald-500" /> : <WarningCircle size={15} weight="fill" className="text-amber-500" />}
                <span className={`text-sm ${k[key] ? "text-stone-600" : "font-medium text-amber-700"}`}>{label}</span>
              </div>
            ))}
          </Panel>

          <Panel title="Brand DNA" icon={Palette}>
            {b.brand_name ? (
              <>
                {b.logo_base64 && <img src={b.logo_base64} alt="Logo" className="mb-3 h-14 w-14 rounded-xl object-contain ring-1 ring-brand-sand" />}
                <Row label="Brand" value={b.brand_name} />
                <Row label="Kategori" value={b.category} />
                <Row label="Target" value={b.target_audience} />
                <Row label="Rasa" value={b.mood} />
                <Row label="Cahaya" value={b.lighting} />
                <Row label="Material" value={(b.materials || []).join(", ")} />
                <Row label="Komposisi" value={b.composition} />
                <Row label="Nada caption" value={b.caption_tone} />
                <Row label="Larangan" value={[...(b.donts || []), b.donts_notes].filter(Boolean).join(", ")} />
                {b.notes && (
                  <div className="mt-2 rounded-xl bg-brand-sand/40 p-3">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-stone-400">Catatan klien</div>
                    <p className="mt-1 whitespace-pre-line text-sm text-stone-600">{b.notes}</p>
                  </div>
                )}
                {b.colors?.length > 0 && (
                  <div className="mt-3 flex items-center gap-2">
                    {b.colors.map((col) => (
                      <button key={col} onClick={async () => { await copyToClipboard(col); setCopied(col); setTimeout(() => setCopied(false), 1200); }}
                        className="flex items-center gap-1.5 rounded-lg border border-brand-sand px-2 py-1" title="Salin kode warna">
                        <span className="h-5 w-5 rounded ring-1 ring-black/10" style={{ background: col }} />
                        <span className="font-mono text-[10px] text-stone-500">{copied === col ? "tersalin" : col}</span>
                      </button>
                    ))}
                  </div>
                )}
              </>
            ) : <p className="text-sm text-stone-400">Belum diisi.</p>}
          </Panel>

          <Panel title={`Produk — ${terpakai}/${c.total_feeds} feed dibagi`} icon={Package}>
            {d.products.length === 0 && <p className="text-sm text-stone-400">Belum ada produk.</p>}
            {d.products.map((p) => (
              <div key={p.id} className="flex items-center gap-3 border-b border-brand-sand py-2.5 last:border-0">
                <div className="h-11 w-11 flex-shrink-0 overflow-hidden rounded-lg bg-brand-sand">
                  {p.photo_base64 && <img src={p.photo_base64} alt="" className="h-full w-full object-cover" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium text-brand">{p.name}</div>
                  {p.description && <div className="truncate text-xs text-stone-400">{p.description}</div>}
                </div>
                <span className="flex-shrink-0 rounded-full bg-brand-sand px-2.5 py-1 text-[11px] font-bold text-brand">{p.allocation || 0} feed</span>
              </div>
            ))}
          </Panel>

          <Panel title="Riwayat pesanan" icon={Receipt}>
            {d.orders.length === 0 && <p className="text-sm text-stone-400">Belum ada pesanan tercatat.</p>}
            {d.orders.map((o) => (
              <div key={o.id} className="flex items-center justify-between border-b border-brand-sand py-2 text-sm last:border-0">
                <div>
                  <span className="font-medium text-brand">{o.package_name}</span>
                  <span className="ml-2 text-xs text-stone-400">{o.kind} · {tgl(o.created_at)}</span>
                </div>
                <span className="font-heading font-bold text-brand">+{o.feeds}</span>
              </div>
            ))}
          </Panel>

          <Panel title="Aktivitas" icon={ClockCounterClockwise}>
            {d.activity.length === 0 && <p className="text-sm text-stone-400">Belum ada aktivitas.</p>}
            {d.activity.slice(0, 20).map((a) => (
              <div key={a.id} className="flex gap-3 py-1.5 text-xs">
                <span className="w-28 flex-shrink-0 text-stone-400">{tgl(a.created_at, true)}</span>
                <span className="font-medium text-stone-600">{a.action}</span>
                <span className="truncate text-stone-400">{a.detail}</span>
              </div>
            ))}
          </Panel>
        </div>
      </div>

    </div>
  );
}

/* ── bits ──────────────────────────────────────────────────────────────────── */

function Btn({ onClick, icon: Icon, children }) {
  return (
    <button onClick={onClick} className="inline-flex items-center gap-2 rounded-full border border-brand-sand bg-white px-4 py-2 text-xs font-semibold text-stone-600 transition-colors hover:border-brand hover:text-brand">
      <Icon size={13} weight="duotone" /> {children}
    </button>
  );
}

function Panel({ title, icon: Icon, children }) {
  return (
    <div className="rounded-2xl border border-brand-sand bg-white p-5">
      <div className="mb-4 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.14em] text-stone-400">
        {Icon && <Icon size={14} weight="duotone" />} {title}
      </div>
      {children}
    </div>
  );
}

function Row({ icon: Icon, label, value, href }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-2.5 py-1.5">
      {Icon && <Icon size={14} weight="duotone" className="mt-0.5 flex-shrink-0 text-stone-300" />}
      <span className="w-24 flex-shrink-0 text-xs text-stone-400">{label}</span>
      {href
        ? <a href={href} target="_blank" rel="noopener noreferrer" className="min-w-0 flex-1 break-words text-sm text-brand-light hover:underline">{value}</a>
        : <span className="min-w-0 flex-1 break-words text-sm text-stone-600">{value}</span>}
    </div>
  );
}

function NumberField({ label, value, onChange, testId }) {
  return (
    <div>
      <label className="block text-xs font-bold uppercase tracking-[0.14em] text-stone-500">{label}</label>
      <div className="mt-2 flex items-center gap-2">
        <button onClick={() => onChange(Math.max(0, (Number(value) || 0) - 1))} className="grid h-10 w-10 flex-shrink-0 place-items-center rounded-full border border-brand-sand text-brand hover:bg-brand-sand" aria-label="Kurangi">
          <Minus size={14} weight="bold" />
        </button>
        <input value={value ?? 0} onChange={(e) => onChange(Math.max(0, Number(e.target.value.replace(/\D/g, "")) || 0))} inputMode="numeric"
          className="w-full rounded-xl border border-brand-sand py-2.5 text-center font-heading text-lg font-bold text-brand" data-testid={testId} />
        <button onClick={() => onChange((Number(value) || 0) + 1)} className="grid h-10 w-10 flex-shrink-0 place-items-center rounded-full border border-brand-sand text-brand hover:bg-brand-sand" aria-label="Tambah">
          <Plus size={14} weight="bold" />
        </button>
      </div>
    </div>
  );
}

/** Brief as a printable page — attached to the first WhatsApp message. */
function exportBriefPdf(d) {
  const c = d.client, b = d.brand || {}, u = d.user || {};
  const esc = (v) => String(v ?? "-").replace(/[<>&]/g, (m) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" }[m]));
  const row = (k, v) => `<tr><th>${esc(k)}</th><td>${esc(v)}</td></tr>`;
  const html = `<!doctype html><meta charset="utf-8"><title>Brief ${esc(b.brand_name || u.name)}</title>
<style>body{font-family:system-ui,-apple-system,sans-serif;color:#1C1917;max-width:720px;margin:32px auto;padding:0 24px}
h1{font-size:24px;margin:0 0 4px;color:#0B3D2E}.sub{color:#78716c;font-size:13px;margin-bottom:24px}
h2{font-size:13px;text-transform:uppercase;letter-spacing:.12em;color:#78716c;margin:28px 0 8px}
table{width:100%;border-collapse:collapse;font-size:14px}
th{text-align:left;width:150px;color:#78716c;font-weight:500;padding:6px 0;vertical-align:top}td{padding:6px 0}
.sw{display:inline-block;width:28px;height:28px;border-radius:6px;margin-right:6px;border:1px solid #0001}
.p{padding:8px 0;border-bottom:1px solid #eee;font-size:14px}@media print{body{margin:0}}</style>
<h1>Brief — ${esc(b.brand_name || u.name)}</h1>
<div class="sub">Paket ${esc(c.counter)}/${esc(c.total_feeds)} feed · ${esc(c.status_label)}</div>
<h2>Kontak</h2><table>
${row("Nama", u.name)}${row("Panggilan", c.nickname)}${row("WhatsApp", c.whatsapp || u.whatsapp)}${row("Email", u.email)}
${row("Instagram", c.instagram && "@" + c.instagram)}${row("TikTok", c.tiktok && "@" + c.tiktok)}
${row("Jam dihubungi", c.contact_time)}${row("Toko online", (c.store_links || []).join(", "))}
${row("Akun referensi", (c.reference_accounts || []).map((a) => "@" + a).join(", "))}</table>
<h2>Brand DNA</h2><table>
${row("Kategori", b.category)}${row("Target", b.target_audience)}${row("Rasa", b.mood)}${row("Cahaya", b.lighting)}
${row("Material", (b.materials || []).join(", "))}${row("Komposisi", b.composition)}${row("Nada caption", b.caption_tone)}
${row("Larangan", [...(b.donts || []), b.donts_notes].filter(Boolean).join(", "))}${row("Catatan", b.notes)}</table>
${(b.colors || []).length ? `<h2>Warna</h2>${b.colors.map((x) => `<span class="sw" style="background:${esc(x)}"></span>`).join("")} ${esc((b.colors || []).join("  "))}` : ""}
<h2>Produk & pembagian feed</h2>
${d.products.map((p) => `<div class="p"><b>${esc(p.name)}</b> — ${esc(p.allocation || 0)} feed${p.description ? ` · ${esc(p.description)}` : ""}</div>`).join("") || "<p>-</p>"}
<script>window.onload=()=>window.print()</script>`;
  const w = window.open("", "_blank");
  if (!w) { toast.error("Izinkan pop-up untuk mencetak brief"); return; }
  w.document.write(html);
  w.document.close();
}
