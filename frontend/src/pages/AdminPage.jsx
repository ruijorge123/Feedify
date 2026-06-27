import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import api from "@/lib/api";
import { toast } from 'react-toastify';
import * as DialogPrimitive from "@radix-ui/react-dialog";
import {
  Users,
  MagnifyingGlass,
  Crown,
  UserCircle,
  Coin,
  Images,
  GoogleLogo,
  CalendarBlank,
  ShieldStar,
  ArrowClockwise,
  CaretLeft,
  CaretRight,
  X,
  PencilSimple,
  InstagramLogo,
  Copy,
  ArrowsClockwise,
  CheckCircle,
  Plus,
  Minus,
  TrendUp,
  ChartBar,
  UserPlus,
  Lightning,
  ImageSquare,
  Stack,
  PenNib,
  ForkKnife,
  Storefront,
  CaretDown,
  Package,
} from "@phosphor-icons/react";

const ROLE_BADGE = {
  admin: "bg-brand-gold/20 text-brand border border-brand-gold/40",
  user: "bg-stone-100 text-stone-600 border border-stone-200",
};

const TYPE_LABEL = {
  banner: "Feed Post",
  carousel: "Carousel",
  copywriting: "Copywriting",
  food_menu: "F&B Menu",
  marketplace: "Marketplace",
};

const TYPE_ICON = {
  banner: ImageSquare,
  carousel: Stack,
  copywriting: PenNib,
  food_menu: ForkKnife,
  marketplace: Storefront,
};

function formatDate(iso) {
  if (!iso) return "-";
  return new Date(iso).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
}

function formatDateTime(iso) {
  if (!iso) return "-";
  return new Date(iso).toLocaleString("id-ID", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

// ─── Role Dialog ───────────────────────────────────────────────────────────

function RoleDialog({ target, currentUserId, open, onOpenChange, onSaved }) {
  const [selectedRole, setSelectedRole] = useState(target?.role || "user");
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (target) setSelectedRole(target.role); }, [target]);

  const save = async () => {
    if (!target || selectedRole === target.role) { onOpenChange(false); return; }
    setSaving(true);
    try {
      await api.patch(`/admin/users/${target.id}/role`, { role: selectedRole });
      toast.success(`Role ${target.name} diubah ke ${selectedRole}`);
      onSaved(target.id, selectedRole);
      onOpenChange(false);
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Gagal mengubah role");
    } finally { setSaving(false); }
  };

  if (!target) return null;

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 bg-white rounded-2xl shadow-2xl p-6 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95">
          <DialogPrimitive.Close className="absolute right-4 top-4 p-1.5 rounded-full text-stone-400 hover:text-stone-600 hover:bg-stone-100 transition-all">
            <X size={16} />
          </DialogPrimitive.Close>
          <div className="flex items-center gap-3 mb-5">
            <div className="h-11 w-11 rounded-full bg-brand text-brand-cream flex items-center justify-center font-heading font-bold text-lg flex-shrink-0">
              {target.name?.[0]?.toUpperCase() || "?"}
            </div>
            <div>
              <DialogPrimitive.Title className="font-heading text-lg font-bold text-brand leading-tight">Ubah Role</DialogPrimitive.Title>
              <DialogPrimitive.Description className="text-xs text-stone-500 mt-0.5">{target.name} · {target.email}</DialogPrimitive.Description>
            </div>
          </div>
          <div className="space-y-2 mb-5">
            <label className="text-xs font-semibold uppercase tracking-[0.15em] text-stone-500 block mb-2">Pilih Role</label>
            {[
              { value: "user", label: "User", desc: "Akses standar — generate konten, kelola brand", icon: UserCircle },
              { value: "admin", label: "Admin", desc: "Akses penuh — termasuk panel admin & kelola semua user", icon: Crown },
            ].map(({ value, label, desc, icon: Icon }) => (
              <button key={value} type="button" onClick={() => setSelectedRole(value)} data-testid={`role-option-${value}`}
                className={`w-full flex items-center gap-3 p-4 rounded-xl border-2 text-left transition-all ${selectedRole === value ? value === "admin" ? "border-brand-gold bg-brand-gold/10" : "border-brand bg-brand/5" : "border-stone-200 hover:border-stone-300 bg-white"}`}>
                <div className={`h-9 w-9 rounded-full flex items-center justify-center flex-shrink-0 ${selectedRole === value ? value === "admin" ? "bg-brand-gold text-brand" : "bg-brand text-brand-cream" : "bg-stone-100 text-stone-400"}`}>
                  <Icon size={18} weight={selectedRole === value ? "fill" : "regular"} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className={`font-semibold text-sm ${selectedRole === value ? "text-brand" : "text-stone-700"}`}>{label}</div>
                  <div className="text-xs text-stone-500 leading-tight mt-0.5">{desc}</div>
                </div>
                <div className={`h-4 w-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${selectedRole === value ? "border-brand bg-brand" : "border-stone-300"}`}>
                  {selectedRole === value && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
                </div>
              </button>
            ))}
          </div>
          {selectedRole !== target.role && (
            <div className="mb-4 px-3 py-2.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-700">
              Role akan diubah dari <strong>{target.role}</strong> → <strong>{selectedRole}</strong>
            </div>
          )}
          <div className="flex gap-2">
            <DialogPrimitive.Close asChild>
              <button className="flex-1 py-3 border border-brand-sand text-stone-700 rounded-full font-semibold hover:bg-brand-sand transition-all btn-touch">Batal</button>
            </DialogPrimitive.Close>
            <button onClick={save} disabled={saving || selectedRole === target.role} data-testid="role-dialog-save"
              className="flex-1 py-3 bg-brand text-brand-cream rounded-full font-semibold hover:bg-brand-light transition-all btn-touch disabled:opacity-50">
              {saving ? "Menyimpan..." : "Simpan"}
            </button>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

// ─── Kredit Dialog ─────────────────────────────────────────────────────────

function CreditDialog({ target, open, onOpenChange, onSaved }) {
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const parsed = parseInt(amount) || 0;

  useEffect(() => { if (open) { setAmount(""); setNote(""); } }, [open]);

  const save = async (sign) => {
    const final = Math.abs(parsed) * sign;
    if (!final) { toast.error("Masukkan jumlah kredit"); return; }
    setSaving(true);
    try {
      const { data } = await api.patch(`/admin/users/${target.id}/credits`, { amount: final, note: note || (sign > 0 ? "Tambah kredit manual" : "Kurangi kredit manual") });
      toast.success(`Kredit ${target.name} sekarang ${data.new_balance}`);
      onSaved(target.id, data.new_balance);
      onOpenChange(false);
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Gagal update kredit");
    } finally { setSaving(false); }
  };

  if (!target) return null;

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 bg-white rounded-2xl shadow-2xl p-6 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95">
          <DialogPrimitive.Close className="absolute right-4 top-4 p-1.5 rounded-full text-stone-400 hover:text-stone-600 hover:bg-stone-100 transition-all">
            <X size={16} />
          </DialogPrimitive.Close>
          <div className="flex items-center gap-3 mb-5">
            <div className="h-11 w-11 rounded-full bg-brand-gold/20 border border-brand-gold/40 flex items-center justify-center flex-shrink-0">
              <Coin size={20} weight="duotone" className="text-brand-gold" />
            </div>
            <div>
              <DialogPrimitive.Title className="font-heading text-lg font-bold text-brand leading-tight">Kelola Kredit</DialogPrimitive.Title>
              <DialogPrimitive.Description className="text-xs text-stone-500 mt-0.5">{target.name} · Saldo: {target.credit_balance} kredit</DialogPrimitive.Description>
            </div>
          </div>

          <div className="space-y-4 mb-5">
            <div>
              <label className="text-xs font-semibold uppercase tracking-[0.15em] text-stone-500 block mb-2">Jumlah Kredit</label>
              <input
                type="number"
                min="1"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="mis. 10"
                data-testid="credit-amount-input"
                className="input w-full text-center text-2xl font-bold text-brand"
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-[0.15em] text-stone-500 block mb-2">Catatan (opsional)</label>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="mis. Kompensasi error generate"
                className="input w-full text-sm"
                data-testid="credit-note-input"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => save(-1)} disabled={saving || !parsed}
              data-testid="credit-deduct-btn"
              className="py-3 bg-red-50 border border-red-200 text-red-600 rounded-full font-bold hover:bg-red-100 transition-all btn-touch disabled:opacity-40 flex items-center justify-center gap-1.5">
              <Minus size={15} weight="bold" /> Kurangi
            </button>
            <button onClick={() => save(1)} disabled={saving || !parsed}
              data-testid="credit-add-btn"
              className="py-3 bg-brand text-brand-cream rounded-full font-bold hover:bg-brand-light transition-all btn-touch disabled:opacity-40 flex items-center justify-center gap-1.5">
              <Plus size={15} weight="bold" /> Tambah
            </button>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

// ─── User Detail Drawer ────────────────────────────────────────────────────

function UserDetailDrawer({ userId, open, onClose }) {
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !userId) return;
    setDetail(null);
    setLoading(true);
    api.get(`/admin/users/${userId}/detail`)
      .then(({ data }) => setDetail(data))
      .catch(() => toast.error("Gagal memuat detail user"))
      .finally(() => setLoading(false));
  }, [open, userId]);

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed right-0 top-0 h-full w-full max-w-md z-50 bg-white shadow-2xl flex flex-col animate-in slide-in-from-right duration-200 min-w-0">
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-brand-sand">
          <div className="font-heading font-bold text-brand text-lg">Detail User</div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-stone-100 text-stone-400 transition-all btn-touch">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading && (
            <div className="flex items-center justify-center py-20">
              <ArrowClockwise size={24} className="animate-spin text-brand-light" />
            </div>
          )}

          {detail && (
            <div className="p-4 sm:p-6 space-y-6">
              {/* User info */}
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-full bg-brand text-brand-cream flex items-center justify-center font-heading font-bold text-xl sm:text-2xl flex-shrink-0">
                  {detail.user.name?.[0]?.toUpperCase() || "?"}
                </div>
                <div className="min-w-0">
                  <div className="font-heading font-bold text-brand text-base sm:text-lg flex items-center gap-1.5 flex-wrap">
                    <span className="truncate">{detail.user.name}</span>
                    {detail.user.role === "admin" && <Crown size={14} weight="fill" className="text-brand-gold flex-shrink-0" />}
                    {detail.user.google_linked && <GoogleLogo size={14} weight="fill" className="text-blue-400 flex-shrink-0" />}
                  </div>
                  <div className="text-sm text-stone-500 truncate">{detail.user.email}</div>
                  <div className="text-xs text-stone-400 mt-0.5">Daftar {formatDate(detail.user.created_at)}</div>
                </div>
              </div>

              {/* Stats row */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: "Kredit", value: detail.credit_balance, icon: Coin, color: "text-brand-gold" },
                  { label: "Konten", value: detail.recent_content?.length > 0 ? "ada" : "0", icon: Images, color: "text-emerald-600", raw: detail.recent_content?.length },
                  { label: "Referral", value: detail.user.referral_count, icon: UserPlus, color: "text-brand" },
                ].map(({ label, value, icon: Icon, color, raw }) => (
                  <div key={label} className="feedify-card p-3 text-center">
                    <Icon size={18} weight="duotone" className={`${color} mx-auto mb-1`} />
                    <div className="font-heading font-bold text-brand text-lg">{raw !== undefined ? raw : value}</div>
                    <div className="text-[10px] text-stone-400 uppercase tracking-wider">{label}</div>
                  </div>
                ))}
              </div>

              {/* Brand Profile */}
              {detail.brand ? (
                <div>
                  <div className="text-xs font-bold uppercase tracking-[0.15em] text-stone-400 mb-3">Brand Profile</div>
                  <div className="feedify-card p-4 space-y-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-10 w-10 rounded-xl overflow-hidden flex-shrink-0 border border-brand-sand flex items-center justify-center"
                        style={{ background: detail.brand.color_secondary || "#FDFBF7" }}>
                        {detail.brand.logo_base64
                          ? <img src={detail.brand.logo_base64} alt="logo" className="h-full w-full object-cover" />
                          : <span className="font-heading font-bold text-sm" style={{ color: detail.brand.color_primary || "#0B3D2E" }}>
                              {(detail.brand.brand_name?.[0] || "?").toUpperCase()}
                            </span>
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-brand truncate">{detail.brand.brand_name}</div>
                        <div className="text-xs text-stone-500 truncate">{detail.brand.category}</div>
                      </div>
                      <div className="flex-shrink-0 flex gap-1.5">
                        {[detail.brand.color_primary, detail.brand.color_secondary].filter(Boolean).map((c) => (
                          <div key={c} className="h-5 w-5 rounded-full border border-white shadow-sm" style={{ background: c }} title={c} />
                        ))}
                      </div>
                    </div>
                    {detail.brand.target_audience && (
                      <div className="text-xs text-stone-500 pt-1 border-t border-brand-sand/50">
                        <span className="font-semibold text-stone-600">Target:</span> {detail.brand.target_audience}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="feedify-card p-4 text-center text-stone-400 text-sm">Belum membuat brand profile</div>
              )}

              {/* Recent content */}
              {detail.recent_content?.length > 0 && (
                <div>
                  <div className="text-xs font-bold uppercase tracking-[0.15em] text-stone-400 mb-3">5 Konten Terakhir</div>
                  <div className="space-y-2">
                    {detail.recent_content.map((c, i) => {
                      const Icon = TYPE_ICON[c.prompt_type] || Package;
                      const title = c.headline || c.topic || c.product_name || "—";
                      return (
                        <div key={i} className="flex items-center gap-3 p-3 bg-stone-50 rounded-xl">
                          <div className="h-8 w-8 rounded-lg bg-brand-sand flex items-center justify-center flex-shrink-0">
                            <Icon size={15} weight="duotone" className="text-brand" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-semibold text-stone-700 truncate">{title}</div>
                            <div className="text-[10px] text-stone-400">{TYPE_LABEL[c.prompt_type] || c.prompt_type} · {formatDateTime(c.created_at)}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Credit history */}
              {detail.credit_history?.length > 0 && (
                <div>
                  <div className="text-xs font-bold uppercase tracking-[0.15em] text-stone-400 mb-3">Riwayat Kredit (10 Terakhir)</div>
                  <div className="space-y-1.5">
                    {detail.credit_history.map((t, i) => {
                      const isAdd = t.amount > 0;
                      return (
                        <div key={i} className="flex items-center gap-3 p-2.5 bg-stone-50 rounded-xl">
                          <div className={`h-7 w-7 rounded-full flex items-center justify-center flex-shrink-0 ${isAdd ? "bg-emerald-100" : "bg-red-100"}`}>
                            {isAdd ? <Plus size={12} weight="bold" className="text-emerald-600" /> : <Minus size={12} weight="bold" className="text-red-500" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-semibold text-stone-700 truncate">{t.description || t.type}</div>
                            <div className="text-[10px] text-stone-400">{formatDateTime(t.created_at)}</div>
                          </div>
                          <div className={`text-sm font-bold flex-shrink-0 ${isAdd ? "text-emerald-600" : "text-red-500"}`}>
                            {isAdd ? "+" : ""}{t.amount}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// ─── Analytics Panel ───────────────────────────────────────────────────────

function AnalyticsPanel() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(true);

  useEffect(() => {
    api.get("/admin/analytics")
      .then(({ data }) => setData(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const maxDay = data ? Math.max(...(data.daily_chart?.map((d) => d.count) || [1]), 1) : 1;

  return (
    <div className="feedify-card overflow-hidden" data-testid="analytics-panel">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-brand-sand/20 transition-all"
      >
        <div className="flex items-center gap-2.5">
          <ChartBar size={18} weight="duotone" className="text-brand" />
          <span className="font-heading font-bold text-brand">Platform Analytics</span>
          {data && <span className="text-[10px] bg-brand-sand text-brand-light px-2 py-0.5 rounded-full font-semibold">7 hari terakhir</span>}
        </div>
        <CaretDown size={14} className={`text-stone-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="px-4 sm:px-5 pb-4 sm:pb-5 space-y-5 border-t border-brand-sand/50">
          {loading && <div className="py-6 text-center text-stone-400 text-sm">Memuat analytics...</div>}

          {data && (
            <>
              {/* Quick stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4">
                {[
                  { label: "Konten Hari Ini", value: data.content.today, icon: TrendUp, color: "text-emerald-600", bg: "bg-emerald-50" },
                  { label: "Konten Minggu Ini", value: data.content.week, icon: ChartBar, color: "text-brand", bg: "bg-brand/5" },
                  { label: "User Baru Minggu Ini", value: data.users.new_week, icon: UserPlus, color: "text-blue-500", bg: "bg-blue-50" },
                  { label: "Kredit Dikeluarkan", value: data.credits_issued_week, icon: Lightning, color: "text-brand-gold", bg: "bg-brand-gold/10" },
                ].map(({ label, value, icon: Icon, color, bg }) => (
                  <div key={label} className={`${bg} rounded-xl p-3.5`}>
                    <Icon size={16} weight="duotone" className={`${color} mb-1.5`} />
                    <div className="font-heading font-bold text-brand text-xl">{value}</div>
                    <div className="text-[10px] text-stone-500 leading-tight mt-0.5">{label}</div>
                  </div>
                ))}
              </div>

              {/* Daily bar chart — 7 days */}
              {data.daily_chart?.length > 0 && (
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.15em] text-stone-400 mb-3">Konten per Hari</div>
                  <div className="flex items-end gap-1.5 h-24">
                    {data.daily_chart.map((d) => (
                      <div key={d.date} className="flex-1 flex flex-col items-center gap-1">
                        <div className="text-[9px] font-bold text-stone-500">{d.count}</div>
                        <div
                          className="w-full rounded-t-md bg-brand transition-all"
                          style={{ height: `${Math.max(4, (d.count / maxDay) * 72)}px` }}
                        />
                        <div className="text-[8px] text-stone-400 whitespace-nowrap">
                          {new Date(d.date).toLocaleDateString("id-ID", { day: "2-digit", month: "short" })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* By type breakdown */}
              {Object.keys(data.content.by_type || {}).length > 0 && (
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.15em] text-stone-400 mb-3">Breakdown per Tipe (All Time)</div>
                  <div className="space-y-2">
                    {Object.entries(data.content.by_type)
                      .sort(([, a], [, b]) => b - a)
                      .map(([type, count]) => {
                        const Icon = TYPE_ICON[type] || Package;
                        const pct = Math.round((count / data.content.total) * 100);
                        return (
                          <div key={type} className="flex items-center gap-2 sm:gap-3 min-w-0">
                            <Icon size={14} weight="duotone" className="text-brand flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between mb-1 gap-2 min-w-0">
                                <span className="text-xs font-semibold text-stone-600 truncate">{TYPE_LABEL[type] || type}</span>
                                <span className="text-xs text-stone-400 flex-shrink-0">{count} ({pct}%)</span>
                              </div>
                              <div className="h-1.5 bg-stone-100 rounded-full overflow-hidden">
                                <div className="h-full bg-brand rounded-full" style={{ width: `${pct}%` }} />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Daily Voucher Panel ───────────────────────────────────────────────────

function DailyVoucherPanel() {
  const [voucher, setVoucher] = useState(null);
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  const load = async () => {
    try {
      const { data } = await api.get("/admin/daily-voucher");
      setVoucher(data);
    } catch { toast.error("Gagal memuat voucher harian"); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const regenerate = async () => {
    if (!window.confirm("Generate kode baru hari ini? Kode lama tidak bisa dipakai lagi.")) return;
    setRegenerating(true);
    try {
      const { data } = await api.post("/admin/daily-voucher/regenerate");
      toast.success(`Kode baru: ${data.code}`);
      await load();
    } catch { toast.error("Gagal generate kode"); }
    finally { setRegenerating(false); }
  };

  const copy = () => {
    if (!voucher?.code) return;
    navigator.clipboard.writeText(voucher.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) return (
    <div className="feedify-card p-6 animate-pulse">
      <div className="h-4 bg-stone-100 rounded w-1/3 mb-3" />
      <div className="h-10 bg-stone-100 rounded w-1/2" />
    </div>
  );

  const isFull = voucher?.is_full;
  const remaining = voucher?.claims_remaining ?? 0;

  return (
    <div className="feedify-card p-4 sm:p-6 space-y-5" data-testid="daily-voucher-panel">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 min-w-0">
          <InstagramLogo size={20} weight="duotone" className="text-pink-500 flex-shrink-0" />
          <span className="font-heading font-bold text-brand text-base sm:text-lg">Voucher Harian IG Story</span>
        </div>
        <button onClick={regenerate} disabled={regenerating}
          className="flex-shrink-0 flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border border-stone-200 text-stone-500 hover:border-brand hover:text-brand transition-all disabled:opacity-50">
          <ArrowsClockwise size={13} className={regenerating ? "animate-spin" : ""} />
          Generate ulang
        </button>
      </div>
      <div className="flex items-center gap-3 p-3 sm:p-4 bg-brand rounded-2xl min-w-0">
        <div className="flex-1 min-w-0">
          <div className="text-[10px] uppercase tracking-[0.2em] text-brand-cream/60 font-bold mb-1">Kode hari ini · {voucher?.date}</div>
          <div className="font-heading text-2xl sm:text-3xl font-bold text-brand-gold tracking-widest break-all">{voucher?.code}</div>
          <div className="text-xs text-brand-cream/70 mt-1">Diskon {voucher?.discount_pct}% · Max {voucher?.max_claims} pengguna</div>
        </div>
        <button onClick={copy}
          className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl bg-brand-cream/10 hover:bg-brand-cream/20 text-brand-cream text-xs font-semibold transition-all">
          {copied ? <CheckCircle size={15} weight="fill" className="text-green-400" /> : <Copy size={15} />}
          {copied ? "Tersalin!" : "Salin"}
        </button>
      </div>
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-stone-600">Progress Klaim</span>
          <span className={`text-xs font-bold ${isFull ? "text-red-500" : "text-emerald-600"}`}>
            {voucher?.claims_used}/{voucher?.max_claims} diklaim{isFull ? " · PENUH" : ` · ${remaining} sisa`}
          </span>
        </div>
        <div className="h-2 bg-stone-100 rounded-full overflow-hidden">
          <div className={`h-full rounded-full transition-all ${isFull ? "bg-red-400" : "bg-emerald-500"}`}
            style={{ width: `${((voucher?.claims_used || 0) / (voucher?.max_claims || 5)) * 100}%` }} />
        </div>
      </div>
      {voucher?.claimants?.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs font-semibold uppercase tracking-[0.15em] text-stone-400">Yang Sudah Klaim</div>
          {voucher.claimants.map((c, i) => (
            <div key={i} className="flex items-center gap-3 p-2.5 bg-stone-50 rounded-xl">
              <div className="h-7 w-7 rounded-full bg-brand text-brand-gold flex items-center justify-center font-heading font-bold text-xs flex-shrink-0">{i + 1}</div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-stone-700 truncate">{c.name || "—"}</div>
                <div className="text-xs text-stone-400 truncate">{c.email}</div>
              </div>
              <CheckCircle size={16} weight="fill" className="text-emerald-500 flex-shrink-0" />
            </div>
          ))}
        </div>
      )}
      {voucher?.claimants?.length === 0 && (
        <div className="text-center py-4 text-stone-400 text-sm">Belum ada yang klaim — post kode ke IG Story @feedify.id</div>
      )}
    </div>
  );
}

// ─── Main AdminPage ────────────────────────────────────────────────────────

export default function AdminPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [roleDialog, setRoleDialog] = useState({ open: false, target: null });
  const [creditDialog, setCreditDialog] = useState({ open: false, target: null });
  const [detailDrawer, setDetailDrawer] = useState({ open: false, userId: null });

  const LIMIT = 20;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/admin/users", { params: { page, limit: LIMIT, search } });
      setUsers(data.users);
      setTotal(data.total);
    } catch (err) {
      if (err?.response?.status === 403) { toast.error("Akses ditolak"); navigate("/dashboard"); }
      else toast.error("Gagal memuat data");
    } finally { setLoading(false); }
  }, [page, search, navigate]);

  useEffect(() => {
    if (user?.role !== "admin") { navigate("/dashboard"); return; }
    load();
  }, [user, load, navigate]);

  const handleSearch = (e) => { e.preventDefault(); setSearch(searchInput); setPage(1); };
  const handleRoleSaved = (userId, newRole) => setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, role: newRole } : u));
  const handleCreditSaved = (userId, newBalance) => setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, credit_balance: newBalance } : u));

  const totalPages = Math.ceil(total / LIMIT);
  const adminCount = users.filter((u) => u.role === "admin").length;
  const withBrand = users.filter((u) => u.has_brand_profile).length;
  const googleCount = users.filter((u) => u.google_linked).length;

  return (
    <div className="space-y-6" data-testid="admin-page">
      <div className="animate-fade-up min-w-0">
        <div className="text-xs uppercase tracking-[0.2em] text-brand-light font-semibold mb-2">Admin</div>
        <h1 className="font-heading text-2xl sm:text-4xl font-bold text-brand tracking-tight flex items-center gap-2">
          <ShieldStar size={28} weight="duotone" className="text-brand-gold flex-shrink-0" />
          Panel Admin
        </h1>
        <p className="text-stone-500 text-sm mt-1">Kelola semua pengguna Feedify</p>
      </div>

      <DailyVoucherPanel />
      <AnalyticsPanel />

      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 animate-fade-up">
        {[
          { label: "Total User", value: total, icon: Users, color: "text-brand" },
          { label: "Admin", value: adminCount, icon: Crown, color: "text-brand-gold" },
          { label: "Punya Brand", value: withBrand, icon: Images, color: "text-emerald-600" },
          { label: "Google Login", value: googleCount, icon: GoogleLogo, color: "text-blue-500" },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="feedify-card p-3 sm:p-4 flex items-center gap-2 sm:gap-3 min-w-0">
            <Icon size={20} weight="duotone" className={`${color} flex-shrink-0`} />
            <div className="min-w-0">
              <div className="font-heading text-lg sm:text-xl font-bold text-brand">{value}</div>
              <div className="text-xs text-stone-500 truncate">{label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="feedify-card p-4 animate-fade-up">
        <form onSubmit={handleSearch} className="flex gap-2 min-w-0">
          <div className="relative flex-1 min-w-0">
            <MagnifyingGlass size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
            <input type="text" placeholder="Cari nama / email..." value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)} data-testid="admin-search"
              className="w-full pl-9 pr-2 py-2.5 bg-white border border-brand-sand rounded-xl text-sm focus:ring-2 focus:ring-brand-gold focus:border-brand outline-none" />
          </div>
          <button type="submit" data-testid="admin-search-btn"
            className="flex-shrink-0 px-3 sm:px-4 py-2.5 bg-brand text-brand-cream rounded-xl text-sm font-semibold hover:bg-brand-light btn-touch">Cari</button>
          <button type="button" onClick={() => { setSearchInput(""); setSearch(""); setPage(1); }} title="Reset"
            className="flex-shrink-0 px-2.5 py-2.5 border border-brand-sand text-stone-500 rounded-xl hover:bg-brand-sand btn-touch">
            <ArrowClockwise size={16} />
          </button>
        </form>
      </div>

      {/* User table */}
      <div className="feedify-card overflow-hidden animate-fade-up">
        <div className="px-4 sm:px-5 py-4 border-b border-brand-sand/50 flex items-center justify-between gap-2 min-w-0">
          <span className="font-heading font-bold text-brand text-sm truncate min-w-0">
            {total} pengguna{search ? ` · hasil: "${search}"` : ""}
          </span>
          {loading && <ArrowClockwise size={16} className="animate-spin text-stone-400 flex-shrink-0" />}
        </div>

        {/* Desktop */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-brand-sand/30 text-left">
                {["User", "Daftar", "Role", "Kredit", "Konten", "Referral", "Aksi"].map((h) => (
                  <th key={h} className="px-4 py-3 text-xs uppercase tracking-[0.12em] text-stone-500 font-semibold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-sand/30">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-brand-sand/10 transition-colors" data-testid={`admin-user-${u.id}`}>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => setDetailDrawer({ open: true, userId: u.id })}
                      className="flex items-center gap-2.5 text-left hover:opacity-80 transition-opacity"
                      data-testid={`user-detail-${u.id}`}
                    >
                      <div className="h-8 w-8 rounded-full bg-brand text-brand-cream flex items-center justify-center font-heading font-bold text-xs flex-shrink-0">
                        {u.name?.[0]?.toUpperCase() || "?"}
                      </div>
                      <div>
                        <div className="font-semibold text-brand flex items-center gap-1">
                          {u.name}
                          {u.google_linked && <GoogleLogo size={12} weight="fill" className="text-blue-400" />}
                        </div>
                        <div className="text-xs text-stone-400 truncate max-w-[180px]">{u.email}</div>
                      </div>
                    </button>
                  </td>
                  <td className="px-4 py-3 text-stone-500 text-xs whitespace-nowrap">
                    <div className="flex items-center gap-1"><CalendarBlank size={12} />{formatDate(u.created_at)}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${ROLE_BADGE[u.role] || ROLE_BADGE.user}`}>
                      {u.role === "admin" ? <Crown size={10} weight="fill" /> : <UserCircle size={10} />}
                      {u.role}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 text-stone-700 font-semibold text-xs">
                      <Coin size={13} weight="duotone" className="text-brand-gold" />
                      {u.credit_balance}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-stone-600 text-xs font-semibold">{u.content_count}</td>
                  <td className="px-4 py-3 text-xs text-stone-500">
                    <code className="bg-brand-sand/50 px-1.5 py-0.5 rounded font-mono text-[10px]">{u.referral_code}</code>
                    <span className="ml-1 text-stone-400">({u.referral_count}x)</span>
                  </td>
                  <td className="px-4 py-3">
                    {u.id !== user?.id ? (
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => setCreditDialog({ open: true, target: u })}
                          data-testid={`edit-credits-${u.id}`}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-semibold border border-brand-gold/40 text-brand-gold hover:bg-brand-gold/10 btn-touch transition-all"
                        >
                          <Coin size={11} weight="duotone" /> Kredit
                        </button>
                        <button
                          onClick={() => setRoleDialog({ open: true, target: u })}
                          data-testid={`edit-role-${u.id}`}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-semibold border border-brand-sand text-stone-600 hover:bg-brand-sand hover:text-brand btn-touch transition-all"
                        >
                          <PencilSimple size={11} /> Role
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs text-stone-400 italic">Anda</span>
                    )}
                  </td>
                </tr>
              ))}
              {!loading && users.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-10 text-center text-stone-400 text-sm">Tidak ada user ditemukan</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile cards */}
        <div className="sm:hidden divide-y divide-brand-sand/30">
          {users.map((u) => (
            <div key={u.id} className="p-4 space-y-3" data-testid={`admin-user-mobile-${u.id}`}>
              <button
                onClick={() => setDetailDrawer({ open: true, userId: u.id })}
                className="flex items-center justify-between gap-2 w-full text-left"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="h-9 w-9 rounded-full bg-brand text-brand-cream flex items-center justify-center font-heading font-bold text-sm flex-shrink-0">
                    {u.name?.[0]?.toUpperCase() || "?"}
                  </div>
                  <div className="min-w-0">
                    <div className="font-semibold text-brand truncate flex items-center gap-1">
                      {u.name}
                      {u.google_linked && <GoogleLogo size={11} weight="fill" className="text-blue-400 flex-shrink-0" />}
                    </div>
                    <div className="text-xs text-stone-400 truncate">{u.email}</div>
                  </div>
                </div>
                <span className={`flex-shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${ROLE_BADGE[u.role] || ROLE_BADGE.user}`}>
                  {u.role === "admin" ? <Crown size={10} weight="fill" /> : <UserCircle size={10} />}
                  {u.role}
                </span>
              </button>
              <div className="flex items-center gap-4 text-xs text-stone-500">
                <span className="flex items-center gap-1"><CalendarBlank size={11} />{formatDate(u.created_at)}</span>
                <span className="flex items-center gap-1"><Coin size={11} weight="duotone" className="text-brand-gold" />{u.credit_balance}</span>
                <span className="flex items-center gap-1"><Images size={11} />{u.content_count}</span>
              </div>
              {u.id !== user?.id && (
                <div className="flex items-center gap-2">
                  <button onClick={() => setCreditDialog({ open: true, target: u })}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-full text-xs font-semibold border border-brand-gold/40 text-brand-gold hover:bg-brand-gold/10 btn-touch">
                    <Coin size={12} weight="duotone" /> Kredit
                  </button>
                  <button onClick={() => setRoleDialog({ open: true, target: u })}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-full text-xs font-semibold border border-brand-sand text-stone-600 hover:bg-brand-sand btn-touch">
                    <PencilSimple size={12} /> Role
                  </button>
                </div>
              )}
            </div>
          ))}
          {!loading && users.length === 0 && (
            <div className="py-10 text-center text-stone-400 text-sm">Tidak ada user ditemukan</div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-4 sm:px-5 py-4 border-t border-brand-sand/50 flex items-center justify-between gap-2 flex-wrap">
            <span className="text-xs text-stone-500">Halaman {page} dari {totalPages}</span>
            <div className="flex items-center gap-2">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                className="p-2 border border-brand-sand rounded-xl hover:bg-brand-sand disabled:opacity-40 btn-touch">
                <CaretLeft size={14} />
              </button>
              <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                className="p-2 border border-brand-sand rounded-xl hover:bg-brand-sand disabled:opacity-40 btn-touch">
                <CaretRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      <RoleDialog
        open={roleDialog.open}
        onOpenChange={(v) => setRoleDialog((s) => ({ ...s, open: v }))}
        target={roleDialog.target}
        currentUserId={user?.id}
        onSaved={handleRoleSaved}
      />
      <CreditDialog
        open={creditDialog.open}
        onOpenChange={(v) => setCreditDialog((s) => ({ ...s, open: v }))}
        target={creditDialog.target}
        onSaved={handleCreditSaved}
      />
      <UserDetailDrawer
        open={detailDrawer.open}
        userId={detailDrawer.userId}
        onClose={() => setDetailDrawer({ open: false, userId: null })}
      />
    </div>
  );
}
