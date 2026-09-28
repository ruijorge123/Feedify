import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  UserSwitch, CaretDown, MagnifyingGlass, X, WarningCircle, Check, Palette,
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
 *
 * The roster holds two kinds of entry: the owner's own brands (Brand Saya) and
 * paying clients. They are listed in separate groups so producing a demo can
 * never be mistaken for producing a client's paid feed.
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
    return list.filter((c) => [c.name, c.nickname, c.brand_name].filter(Boolean)
      .some((v) => v.toLowerCase().includes(t)));
  }, [list, q]);

  const own = shown.filter((c) => c.internal);
  const clients = shown.filter((c) => !c.internal);
  const pick = (c) => { setActiveClient(c); setOpen(false); };

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
              {active.internal
                ? <Palette size={18} weight="duotone" className="flex-shrink-0 text-brand-light" />
                : <UserSwitch size={18} weight="duotone" className="flex-shrink-0 text-brand-light" />}
              <div className="min-w-0 flex-1">
                <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-stone-400">
                  {active.internal ? "Sedang mengerjakan brand sendiri" : "Sedang mengerjakan untuk"}
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
                Belum pilih klien atau Brand Saya — tools akan pakai Brand Kit lama milikmu.
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
            {active ? "Ganti" : "Pilih"} <CaretDown size={11} weight="bold" />
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
              <h2 className="font-heading text-lg font-bold text-brand">Pilih klien atau brand</h2>
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
                  placeholder="Cari klien atau brand..."
                  className="feedify-input pl-11"
                  autoFocus
                  data-testid="client-picker-search"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-3">
              {active && (
                <button
                  onClick={() => pick(null)}
                  className="mb-2 flex w-full items-center gap-3 rounded-2xl border border-dashed border-brand-sand p-4 text-left transition-colors hover:border-brand"
                  data-testid="client-picker-clear"
                >
                  <X size={15} weight="bold" className="flex-shrink-0 text-stone-400" />
                  <span className="text-sm text-stone-500">Lepas pilihan</span>
                </button>
              )}

              {list === null && <div className="py-10 text-center text-sm text-stone-400">Memuat...</div>}

              {list && shown.length === 0 && (
                <div className="py-10 text-center">
                  <p className="text-sm text-stone-400">Tidak ada yang cocok.</p>
                  <div className="mt-2 flex justify-center gap-4 text-sm font-medium">
                    <Link to="/brand-saya" onClick={() => setOpen(false)} className="text-brand-light hover:text-brand">Buka Brand Saya</Link>
                    <Link to="/klien" onClick={() => setOpen(false)} className="text-brand-light hover:text-brand">Buka Daftar Klien</Link>
                  </div>
                </div>
              )}

              {own.length > 0 && <GroupLabel>Brand saya</GroupLabel>}
              {own.map((c) => {
                const on = active?.user_id === c.user_id;
                return (
                  <button
                    key={c.user_id}
                    onClick={() => pick(c)}
                    className={`mb-1.5 flex w-full items-center gap-3 rounded-2xl border p-4 text-left transition-colors ${
                      on ? "border-brand bg-brand-sand/40" : "border-brand-sand hover:border-brand-light"
                    }`}
                    data-testid={`client-pick-${c.user_id}`}
                  >
                    <Palette size={15} weight="duotone" className="flex-shrink-0 text-brand-light" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-semibold text-brand">{c.nickname || c.name}</div>
                      <div className="truncate text-xs text-stone-400">
                        {c.brand_name || "Brand DNA belum diisi"} · {c.product_count || 0} produk
                      </div>
                    </div>
                    {on && <Check size={15} weight="bold" className="flex-shrink-0 text-brand" />}
                  </button>
                );
              })}

              {own.length > 0 && clients.length > 0 && <GroupLabel>Klien</GroupLabel>}
              {clients.map((c) => {
                const st = statusStyle(c.status);
                const on = active?.user_id === c.user_id;
                return (
                  <button
                    key={c.user_id}
                    onClick={() => pick(c)}
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

function GroupLabel({ children }) {
  return (
    <div className="mb-2 mt-3 px-2 text-[10px] font-bold uppercase tracking-[0.16em] text-stone-400 first:mt-0">
      {children}
    </div>
  );
}
