import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  UserSwitch, CaretDown, MagnifyingGlass, X, WarningCircle, Check,
} from "@phosphor-icons/react";
import { useActiveClient, setActiveClient, useClientList } from "@/lib/clientPicker";
import { statusStyle } from "@/lib/client";

/**
 * "You are producing for …" bar, pinned above every generator.
 *
 * The failure this exists to prevent is silent: making a whole batch of carousels
 * against the wrong brand's colours and only noticing at delivery. So the bar is
 * always visible, states the client by name, and turns amber when nobody is
 * selected rather than quietly defaulting to the owner's own profile.
 */
export default function ClientPickerBar() {
  const active = useActiveClient();
  const list = useClientList();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");

  const shown = useMemo(() => {
    if (!list) return [];
    const t = q.trim().toLowerCase();
    if (!t) return list;
    return list.filter((c) => [c.name, c.nickname].filter(Boolean)
      .some((v) => v.toLowerCase().includes(t)));
  }, [list, q]);

  return (
    <>
      <div
        className={`sticky top-0 z-20 border-b backdrop-blur ${
          active ? "border-brand-sand bg-brand-cream/95" : "border-amber-200 bg-amber-50/95"
        }`}
        data-testid="client-picker-bar"
      >
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-5 py-3 sm:px-8">
          {active ? (
            <>
              <UserSwitch size={18} weight="duotone" className="flex-shrink-0 text-brand-light" />
              <div className="min-w-0 flex-1">
                <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-stone-400">
                  Sedang mengerjakan untuk
                </div>
                <div className="truncate text-sm font-semibold text-brand">
                  {active.nickname || active.name}
                </div>
              </div>
            </>
          ) : (
            <>
              <WarningCircle size={18} weight="fill" className="flex-shrink-0 text-amber-500" />
              <div className="min-w-0 flex-1 text-sm font-medium text-amber-800">
                Belum pilih klien — tools akan pakai brand milikmu sendiri.
              </div>
            </>
          )}

          <button
            onClick={() => { setOpen(true); setQ(""); }}
            className={`inline-flex flex-shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold transition-colors ${
              active
                ? "border border-brand-sand text-stone-600 hover:border-brand hover:text-brand"
                : "bg-amber-500 text-white hover:bg-amber-600"
            }`}
            data-testid="client-picker-open"
          >
            {active ? "Ganti" : "Pilih Klien"} <CaretDown size={11} weight="bold" />
          </button>
        </div>
      </div>

      {open && (
        <div className="fixed inset-0 z-[120] flex items-end justify-center bg-black/50 backdrop-blur-sm sm:items-center sm:p-5" onClick={() => setOpen(false)}>
          <div
            className="flex max-h-[80vh] w-full max-w-md flex-col rounded-t-3xl bg-white sm:rounded-3xl"
            onClick={(e) => e.stopPropagation()}
            data-testid="client-picker-dialog"
          >
            <div className="flex items-center justify-between border-b border-brand-sand p-5">
              <h2 className="font-heading text-lg font-bold text-brand">Pilih klien</h2>
              <button onClick={() => setOpen(false)} className="p-1 text-stone-300 hover:text-brand" aria-label="Tutup">
                <X size={17} weight="bold" />
              </button>
            </div>

            <div className="border-b border-brand-sand p-4">
              <div className="relative">
                <MagnifyingGlass size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-300" />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Cari nama klien..."
                  className="feedify-input pl-11"
                  autoFocus
                  data-testid="client-picker-search"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-3">
              {active && (
                <button
                  onClick={() => { setActiveClient(null); setOpen(false); }}
                  className="mb-2 flex w-full items-center gap-3 rounded-2xl border border-dashed border-brand-sand p-4 text-left transition-colors hover:border-brand"
                >
                  <X size={15} weight="bold" className="flex-shrink-0 text-stone-400" />
                  <span className="text-sm text-stone-500">Lepas pilihan — pakai brand sendiri</span>
                </button>
              )}

              {list === null && <div className="py-10 text-center text-sm text-stone-400">Memuat...</div>}

              {list && shown.length === 0 && (
                <div className="py-10 text-center">
                  <p className="text-sm text-stone-400">Tidak ada klien yang cocok.</p>
                  <Link to="/admin" onClick={() => setOpen(false)} className="mt-2 inline-block text-sm font-medium text-brand-light hover:text-brand">
                    Buka Admin Panel
                  </Link>
                </div>
              )}

              {shown.map((c) => {
                const st = statusStyle(c.status);
                const on = active?.user_id === c.user_id;
                return (
                  <button
                    key={c.user_id}
                    onClick={() => { setActiveClient(c); setOpen(false); }}
                    className={`mb-1.5 flex w-full items-center gap-3 rounded-2xl border p-4 text-left transition-colors ${
                      on ? "border-brand bg-brand-sand/40" : "border-brand-sand hover:border-brand-light"
                    }`}
                    data-testid={`client-pick-${c.user_id}`}
                  >
                    <span className={`h-2 w-2 flex-shrink-0 rounded-full ${st.dot}`} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="truncate font-semibold text-brand">{c.nickname || c.name}</span>
                        {!c.lengkap && <WarningCircle size={12} weight="fill" className="flex-shrink-0 text-amber-500" title="Data belum lengkap" />}
                      </div>
                      <div className="truncate text-xs text-stone-400">{c.counter}/{c.total_feeds} feed · {st.label}</div>
                    </div>
                    {on && <Check size={15} weight="bold" className="flex-shrink-0 text-brand" />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
