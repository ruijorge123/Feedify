import { useState, useEffect } from "react";
import { Receipt, CircleNotch, Plus, CheckCircle } from "@phosphor-icons/react";
import api from "@/lib/api";
import { useClient } from "@/lib/client";

const KIND_LABEL = {
  pertama: "Paket pertama",
  tambah: "Tambah paket",
  perpanjang: "Perpanjangan",
};

function tanggal(iso) {
  if (!iso) return "-";
  try {
    return new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
  } catch { return "-"; }
}

/**
 * Purchase history.
 *
 * Deliberately a receipt list, not an invoice system: the client's real question
 * is "what did I buy and how many feeds did it add", and the answer to both is
 * one line each.
 */
export default function ClientOrdersPage() {
  const data = useClient();
  const [orders, setOrders] = useState(null);

  useEffect(() => {
    api.get("/client/orders").then(({ data }) => setOrders(data)).catch(() => setOrders([]));
  }, []);

  const total = data?.client?.total_feeds || 0;
  const counter = data?.client?.counter || 0;

  return (
    <div className="mx-auto max-w-3xl px-5 py-8 sm:px-8 sm:py-10">
      <div className="flex items-start gap-4">
        <div className="grid h-12 w-12 flex-shrink-0 place-items-center rounded-2xl bg-brand-sand">
          <Receipt size={22} weight="duotone" className="text-brand-light" />
        </div>
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight text-brand sm:text-3xl">Riwayat Pesanan</h1>
          <p className="mt-1.5 text-sm text-stone-500">Paket yang pernah kamu beli dan jatah feed yang ditambahkan.</p>
        </div>
      </div>

      <div className="mt-7 rounded-2xl bg-brand p-6">
        <div className="text-[11px] font-bold uppercase tracking-[0.15em] text-brand-cream/45">Jatah berjalan</div>
        <div className="mt-2 font-heading text-3xl font-bold text-brand-gold">
          {counter}<span className="text-brand-cream/30"> / {total} feed</span>
        </div>
      </div>

      <div className="mt-6 space-y-3">
        {orders === null && (
          <div className="flex justify-center py-12"><CircleNotch size={22} className="animate-spin text-brand" /></div>
        )}

        {orders?.length === 0 && (
          <div className="rounded-2xl border-2 border-dashed border-brand-sand py-14 text-center">
            <Receipt size={30} weight="duotone" className="mx-auto text-stone-300" />
            <p className="mt-3 text-sm text-stone-400">Belum ada riwayat pesanan.</p>
          </div>
        )}

        {orders?.map((o) => (
          <div key={o.id} className="flex items-center gap-4 rounded-2xl border border-brand-sand bg-white p-5" data-testid="order-row">
            <div className="grid h-10 w-10 flex-shrink-0 place-items-center rounded-full bg-emerald-50">
              <CheckCircle size={18} weight="fill" className="text-emerald-600" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-semibold text-brand">Paket {o.package_name || "-"}</div>
              <div className="text-xs text-stone-400">
                {KIND_LABEL[o.kind] || o.kind} · {tanggal(o.created_at)}
              </div>
            </div>
            <div className="flex-shrink-0 text-right">
              <div className="font-heading font-bold text-brand">+{o.feeds}</div>
              <div className="text-[11px] text-stone-400">feed</div>
            </div>
          </div>
        ))}
      </div>

      {/* Adding a package stacks onto the remaining quota — worth saying, because
          the alternative assumption is that it replaces it. */}
      <a
        href="/#harga"
        className="mt-8 flex items-center gap-4 rounded-2xl border border-dashed border-brand-sand p-5 transition-colors hover:border-brand hover:bg-white"
        data-testid="order-tambah-paket"
      >
        <div className="grid h-10 w-10 flex-shrink-0 place-items-center rounded-full bg-brand-sand">
          <Plus size={17} weight="bold" className="text-brand" />
        </div>
        <div className="min-w-0">
          <div className="font-semibold text-brand">Tambah paket</div>
          <div className="text-xs text-stone-400">Jatah baru ditambahkan ke sisa yang sekarang, bukan menggantikannya.</div>
        </div>
      </a>
    </div>
  );
}
