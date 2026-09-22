import { useState, useEffect } from "react";
import { toast } from "react-toastify";
import { BellRinging, CaretDown, Trash, WhatsappLogo, CircleNotch } from "@phosphor-icons/react";
import api from "@/lib/api";

function tanggal(iso) {
  try {
    return new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
  } catch { return "-"; }
}

/**
 * People waiting for the next batch.
 *
 * These are the warmest leads the business has — they tried to buy and could
 * not — so each row is one tap away from a WhatsApp conversation.
 */
export default function WaitingListPanel() {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState(null);

  const load = async () => {
    try { const { data } = await api.get("/admin/waiting-list"); setRows(data); }
    catch { setRows([]); }
  };
  useEffect(() => { if (open && rows === null) load(); }, [open]);

  const remove = async (id) => {
    if (!window.confirm("Hapus dari daftar tunggu?")) return;
    try { await api.delete(`/admin/waiting-list/${id}`); await load(); }
    catch { toast.error("Gagal menghapus"); }
  };

  return (
    <div className="mb-4 overflow-hidden rounded-2xl border border-brand-sand bg-white">
      <button onClick={() => setOpen((v) => !v)} className="flex w-full items-center gap-3 px-5 py-4 text-left" data-testid="admin-waiting-toggle">
        <BellRinging size={20} weight="duotone" className="flex-shrink-0 text-brand-light" />
        <span className="flex-1 font-heading font-bold text-brand">Daftar Tunggu</span>
        {rows && rows.length > 0 && (
          <span className="rounded-full bg-brand-gold/20 px-2.5 py-1 text-[11px] font-bold text-brand">{rows.length} orang</span>
        )}
        <CaretDown size={15} weight="bold" className={`text-stone-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="border-t border-brand-sand p-5">
          <p className="mb-4 text-xs text-stone-400">
            Orang yang mendaftar saat slot penuh. Hubungi mereka duluan saat batch berikutnya dibuka.
          </p>

          {rows === null ? (
            <div className="flex justify-center py-8"><CircleNotch size={20} className="animate-spin text-brand" /></div>
          ) : rows.length === 0 ? (
            <p className="py-6 text-center text-sm text-stone-400">Belum ada yang mendaftar.</p>
          ) : (
            <div className="space-y-2">
              {rows.map((r) => (
                <div key={r.id} className="flex items-center gap-3 rounded-2xl border border-brand-sand p-3.5" data-testid="waiting-row">
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-semibold text-brand">{r.name}</div>
                    <div className="text-xs text-stone-400">{tanggal(r.created_at)}</div>
                  </div>
                  <a
                    href={`https://wa.me/${r.whatsapp}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex flex-shrink-0 items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3.5 py-2 text-xs font-semibold text-emerald-700 transition-colors hover:bg-emerald-100"
                  >
                    <WhatsappLogo size={13} weight="fill" /> Chat
                  </a>
                  <button onClick={() => remove(r.id)} className="flex-shrink-0 p-2 text-stone-300 transition-colors hover:text-red-500" aria-label="Hapus">
                    <Trash size={15} weight="duotone" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
