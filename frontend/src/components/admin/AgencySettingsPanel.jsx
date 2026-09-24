import { useState, useEffect } from "react";
import { toast } from "react-toastify";
import { Gear, FloppyDisk, CircleNotch, CaretDown, Users, Lock, LockOpen } from "@phosphor-icons/react";
import api from "@/lib/api";
import { formatRupiah } from "@/lib/agency";

/**
 * Batch settings the owner changes without a deploy.
 *
 * Slot count, the public client tally and the registration switch are all
 * decisions about how much work the owner can take on this month — exactly the
 * kind of thing that must not require a developer.
 */
export default function AgencySettingsPanel() {
  const [open, setOpen] = useState(false);
  const [cfg, setCfg] = useState(null);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      const { data } = await api.get("/admin/agency-settings");
      setCfg(data);
      setForm({
        slots_total: data.slots_total,
        slots_taken: data.slots_taken,
        clients_served: data.clients_served ?? 0,
        max_revisi: data.max_revisi,
        registration_open: data.registration_open,
        packages: (data.packages || []).map((p) => ({ ...p })),
      });
    } catch { toast.error("Gagal memuat pengaturan agency"); }
  };

  // Loads once, the first time the panel is opened. `cfg` is deliberately not
  // a dependency: it is what this effect sets, so including it would loop.
  useEffect(() => { if (open && !cfg) load(); }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const setPkg = (i, patch) =>
    setForm((f) => ({ ...f, packages: f.packages.map((p, n) => (n === i ? { ...p, ...patch } : p)) }));

  // Only one package can carry the "Populer" badge — two highlighted cards
  // highlight nothing.
  const setPopular = (i, on) =>
    setForm((f) => ({ ...f, packages: f.packages.map((p, n) => ({ ...p, popular: on && n === i })) }));

  const save = async () => {
    setSaving(true);
    try {
      await api.put("/admin/agency-settings", form);
      toast.success("Pengaturan tersimpan");
      await load();
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Gagal menyimpan");
    } finally { setSaving(false); }
  };

  return (
    <div className="mb-4 overflow-hidden rounded-2xl border border-brand-sand bg-white">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-3 px-5 py-4 text-left"
        data-testid="admin-agency-toggle"
      >
        <Gear size={20} weight="duotone" className="flex-shrink-0 text-brand-light" />
        <span className="flex-1 font-heading font-bold text-brand">Pengaturan Agency</span>
        {cfg && (
          <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${
            cfg.registration_open ? "bg-emerald-50 text-emerald-700" : "bg-stone-100 text-stone-500"
          }`}>
            {cfg.registration_open ? "Pendaftaran buka" : "Pendaftaran tutup"}
          </span>
        )}
        <CaretDown size={15} weight="bold" className={`text-stone-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="border-t border-brand-sand p-5">
          {!cfg ? (
            <div className="flex justify-center py-10"><CircleNotch size={22} className="animate-spin text-brand" /></div>
          ) : (
            <>
              <div className="grid gap-5 sm:grid-cols-3">
                <Num label="Slot terisi" value={form.slots_taken} onChange={(v) => setForm({ ...form, slots_taken: v })} testId="agency-slots-taken" />
                <Num label="Total slot batch" value={form.slots_total} onChange={(v) => setForm({ ...form, slots_total: v })} testId="agency-slots-total" />
                <Num label="Maks revisi per feed" value={form.max_revisi} onChange={(v) => setForm({ ...form, max_revisi: v })} testId="agency-revisi" />
              </div>

              <div className="mt-5">
                <Num
                  label="Jumlah brand dilayani"
                  value={form.clients_served}
                  onChange={(v) => setForm({ ...form, clients_served: v })}
                  testId="agency-clients"
                />
                <p className="mt-2 text-xs text-stone-400">
                  Muncul di landing page sebagai "X+ brand dilayani". Isi 0 untuk menyembunyikannya.
                  Angka ini klaim ke calon pembeli — isi yang sebenarnya.
                </p>
              </div>

              <button
                onClick={() => setForm({ ...form, registration_open: !form.registration_open })}
                className={`mt-6 flex w-full items-center gap-3 rounded-2xl border p-4 text-left transition-colors ${
                  form.registration_open
                    ? "border-emerald-200 bg-emerald-50"
                    : "border-stone-200 bg-stone-50"
                }`}
                data-testid="agency-toggle-registrasi"
              >
                {form.registration_open
                  ? <LockOpen size={20} weight="duotone" className="flex-shrink-0 text-emerald-600" />
                  : <Lock size={20} weight="duotone" className="flex-shrink-0 text-stone-500" />}
                <div className="flex-1">
                  <div className={`text-sm font-semibold ${form.registration_open ? "text-emerald-800" : "text-stone-700"}`}>
                    {form.registration_open ? "Pendaftaran terbuka" : "Pendaftaran ditutup"}
                  </div>
                  <div className={`text-xs ${form.registration_open ? "text-emerald-600" : "text-stone-500"}`}>
                    {form.registration_open
                      ? "Calon klien bisa langsung beli paket di landing page."
                      : "Tombol paket berubah jadi ajakan minta sample gratis."}
                  </div>
                </div>
                <span className={`h-6 w-11 flex-shrink-0 rounded-full p-1 transition-colors ${form.registration_open ? "bg-emerald-500" : "bg-stone-300"}`}>
                  <span className={`block h-4 w-4 rounded-full bg-white transition-transform ${form.registration_open ? "translate-x-5" : ""}`} />
                </span>
              </button>

              {/* Editable here so opening a new batch at a new price never needs a
                  deploy. These numbers are what a buyer is charged, so the server
                  revalidates every one of them. */}
              <div className="mt-6 rounded-2xl bg-brand-sand/40 p-4">
                <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.14em] text-stone-500">
                  <Users size={13} weight="duotone" /> Paket & harga
                </div>
                <div className="mt-4 space-y-3">
                  {(form.packages || []).map((p, i) => (
                    <div key={p.id} className="rounded-xl bg-white p-3.5" data-testid={`paket-${p.id}`}>
                      <div className="flex items-center gap-2">
                        <input
                          value={p.name}
                          onChange={(e) => setPkg(i, { name: e.target.value })}
                          className="min-w-0 flex-1 rounded-lg border border-brand-sand px-3 py-2 text-sm font-semibold text-brand"
                          placeholder="Nama paket"
                        />
                        <label className="flex flex-shrink-0 items-center gap-1.5 text-[11px] text-stone-400">
                          <input
                            type="checkbox"
                            checked={!!p.popular}
                            onChange={(e) => setPopular(i, e.target.checked)}
                            className="h-3.5 w-3.5 accent-brand"
                          />
                          Populer
                        </label>
                      </div>
                      <div className="mt-2.5 flex items-center gap-2">
                        <div className="flex-1">
                          <div className="text-[10px] text-stone-400">Jumlah feed</div>
                          <input
                            value={p.feeds}
                            onChange={(e) => setPkg(i, { feeds: Math.max(1, Number(e.target.value.replace(/\D/g, "")) || 1) })}
                            inputMode="numeric"
                            className="mt-1 w-full rounded-lg border border-brand-sand px-3 py-2 text-center text-sm font-bold text-brand"
                          />
                        </div>
                        <div className="flex-[2]">
                          <div className="text-[10px] text-stone-400">Harga (Rp)</div>
                          <input
                            value={p.price_idr}
                            onChange={(e) => setPkg(i, { price_idr: Math.max(0, Number(e.target.value.replace(/\D/g, "")) || 0) })}
                            inputMode="numeric"
                            className="mt-1 w-full rounded-lg border border-brand-sand px-3 py-2 text-center text-sm font-bold text-brand"
                          />
                        </div>
                      </div>
                      <div className="mt-1.5 text-right text-[11px] text-stone-400">
                        {formatRupiah(p.price_idr)} · {p.feeds ? formatRupiah(Math.round(p.price_idr / p.feeds)) : "-"}/feed
                      </div>
                    </div>
                  ))}
                </div>
                <p className="mt-3 text-xs text-stone-400">
                  Perubahan harga langsung berlaku untuk pesanan baru. Pesanan yang sudah
                  dibuat tetap memakai harga lamanya.
                </p>
              </div>

              <button
                onClick={save}
                disabled={saving}
                className="mt-6 inline-flex items-center gap-2 rounded-full bg-brand px-7 py-3.5 font-semibold text-brand-cream disabled:opacity-40"
                data-testid="agency-simpan"
              >
                {saving ? <><CircleNotch size={15} className="animate-spin" /> Menyimpan...</> : <><FloppyDisk size={15} weight="bold" /> Simpan</>}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function Num({ label, value, onChange, testId }) {
  return (
    <div>
      <label className="block text-xs font-bold uppercase tracking-[0.14em] text-stone-500">{label}</label>
      <input
        value={value ?? 0}
        onChange={(e) => onChange(Math.max(0, Number(e.target.value.replace(/\D/g, "")) || 0))}
        inputMode="numeric"
        className="feedify-input mt-2 text-center font-heading text-lg font-bold text-brand"
        data-testid={testId}
      />
    </div>
  );
}
