import { useEffect, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import api from "@/lib/api";
import { invalidateMenuLockCache } from "@/lib/menuLock";
import { toast } from 'react-toastify';
import * as DialogPrimitive from "@radix-ui/react-dialog";
import {
  Users,
  MagnifyingGlass,
  Crown,
  UserCircle,
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
  Wrench,
  FilmSlate,
  Camera,
  Microphone,
  EyeSlash,
  Receipt,
  XCircle,
  Timer,
  WarningCircle,
  ChatCircleDots,
} from "@phosphor-icons/react";
import { Switch } from "@/components/ui/switch";
import ProductTour, { resetTour } from "@/components/ProductTour";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  PieChart, Pie, Cell,
} from "recharts";

const ROLE_BADGE = {
  admin: "bg-brand-gold/20 text-brand border border-brand-gold/40",
  user: "bg-stone-100 text-stone-600 border border-stone-200",
};

const TYPE_LABEL = {
  banner: "Feed & Banner",
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
      toast.success(`Role ${target.name} diubah ke ${selectedRole === "admin" ? "Admin" : "User"}`);
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
              Role akan diubah dari <strong className="capitalize">{target.role}</strong> → <strong className="capitalize">{selectedRole}</strong>
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
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Konten", icon: Images, color: "text-emerald-600", raw: detail.recent_content?.length },
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

            </div>
          )}
        </div>
      </div>
    </>
  );
}

// ─── Shared collapsible card wrapper for admin panel sections ──────────────

function CollapsibleCard({ icon: Icon, iconClassName, title, badge, defaultOpen = true, children, testid, cardClassName = "" }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className={`feedify-card overflow-hidden ${cardClassName}`} data-testid={testid}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-2 px-5 py-4 hover:bg-brand-sand/20 transition-all"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <Icon size={18} weight="duotone" className={iconClassName || "text-brand"} />
          <span className="font-heading font-bold text-brand truncate">{title}</span>
          {badge}
        </div>
        <CaretDown size={14} className={`text-stone-400 transition-transform duration-300 flex-shrink-0 ${open ? "rotate-180" : ""}`} />
      </button>
      <div
        className="grid transition-[grid-template-rows] duration-300 ease-out"
        style={{ gridTemplateRows: open ? "1fr" : "0fr" }}
      >
        <div className="overflow-hidden min-h-0">
          <div
            className={`px-4 sm:px-5 pb-4 sm:pb-5 pt-4 border-t border-brand-sand/50 space-y-4 transition-all duration-300 ${
              open ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2"
            }`}
          >
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Analytics Panel ───────────────────────────────────────────────────────

const PIE_COLORS = ["#0B3D2E", "#E5C158", "#3B82F6", "#C28E6E", "#E0607E"];

function zeroFillDaily(dailyChart) {
  const map = new Map((dailyChart || []).map((d) => [d.date, d.count]));
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    days.push({
      date: key,
      label: d.toLocaleDateString("id-ID", { day: "2-digit", month: "short" }),
      count: map.get(key) || 0,
    });
  }
  return days;
}

function AnalyticsPanel() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/admin/analytics")
      .then(({ data }) => setData(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <CollapsibleCard icon={ChartBar} title="Platform Analytics" testid="analytics-panel"
      badge={data && <span className="text-[10px] bg-brand-sand text-brand-light px-2 py-0.5 rounded-full font-semibold flex-shrink-0">7 hari terakhir</span>}>
      {loading && <div className="py-6 text-center text-stone-400 text-sm">Memuat analytics...</div>}

      {data && (
            <>
              {/* Quick stats */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {[
                  { label: "Konten Hari Ini", value: data.content.today, icon: TrendUp, color: "text-emerald-600", bg: "bg-emerald-50" },
                  { label: "Konten Minggu Ini", value: data.content.week, icon: ChartBar, color: "text-brand", bg: "bg-brand/5" },
                  { label: "User Baru Minggu Ini", value: data.users.new_week, icon: UserPlus, color: "text-blue-500", bg: "bg-blue-50" },
                ].map(({ label, value, icon: Icon, color, bg }) => (
                  <div key={label} className={`${bg} rounded-xl p-3.5`}>
                    <Icon size={16} weight="duotone" className={`${color} mb-1.5`} />
                    <div className="font-heading font-bold text-brand text-xl">{value}</div>
                    <div className="text-[10px] text-stone-500 leading-tight mt-0.5">{label}</div>
                  </div>
                ))}
              </div>

              {/* Daily trend — 7 days */}
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.15em] text-stone-400 mb-3">Konten per Hari</div>
                <ResponsiveContainer width="100%" height={180}>
                  <AreaChart data={zeroFillDaily(data.daily_chart)} margin={{ top: 5, right: 8, left: -22, bottom: 0 }}>
                    <defs>
                      <linearGradient id="contentGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#0B3D2E" stopOpacity={0.35} />
                        <stop offset="100%" stopColor="#0B3D2E" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid vertical={false} stroke="#EDEEE9" />
                    <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#A8B0A4" }} axisLine={false} tickLine={false} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: "#A8B0A4" }} axisLine={false} tickLine={false} width={28} />
                    <RechartsTooltip
                      contentStyle={{ borderRadius: 12, border: "1px solid #EDEEE9", fontSize: 12 }}
                      labelStyle={{ fontWeight: 700, color: "#0B3D2E" }}
                      formatter={(value) => [`${value} konten`, ""]}
                    />
                    <Area type="monotone" dataKey="count" stroke="#0B3D2E" strokeWidth={2.5} fill="url(#contentGradient)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* By type breakdown */}
              {Object.keys(data.content.by_type || {}).length > 0 && (
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.15em] text-stone-400 mb-3">Breakdown per Tipe (All Time)</div>
                  <div className="flex flex-col sm:flex-row items-center gap-4">
                    <ResponsiveContainer width="100%" height={160} className="sm:!w-40 sm:flex-shrink-0">
                      <PieChart>
                        <Pie
                          data={Object.entries(data.content.by_type).map(([type, count]) => ({ type, count }))}
                          dataKey="count" nameKey="type" innerRadius={45} outerRadius={70} paddingAngle={2} stroke="none"
                        >
                          {Object.keys(data.content.by_type).map((type, i) => (
                            <Cell key={type} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                          ))}
                        </Pie>
                        <RechartsTooltip
                          contentStyle={{ borderRadius: 12, border: "1px solid #EDEEE9", fontSize: 12 }}
                          formatter={(value, _name, item) => [`${value} (${Math.round((value / data.content.total) * 100)}%)`, TYPE_LABEL[item.payload.type] || item.payload.type]}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="flex-1 w-full space-y-2">
                      {Object.entries(data.content.by_type)
                        .sort(([, a], [, b]) => b - a)
                        .map(([type, count], i) => {
                          const Icon = TYPE_ICON[type] || Package;
                          const pct = Math.round((count / data.content.total) * 100);
                          return (
                            <div key={type} className="flex items-center gap-2 min-w-0">
                              <span className="h-2 w-2 rounded-full flex-shrink-0" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                              <Icon size={13} weight="duotone" className="text-brand flex-shrink-0" />
                              <span className="text-xs font-semibold text-stone-600 truncate flex-1">{TYPE_LABEL[type] || type}</span>
                              <span className="text-xs text-stone-400 flex-shrink-0">{count} ({pct}%)</span>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                </div>
              )}
            </>
      )}
    </CollapsibleCard>
  );
}

// ─── Shared confirm modal for lockdown toggles ──────────────────────────────

function ConfirmLockModal({ open, title, description, confirmLabel, danger, loading, onConfirm, onCancel }) {
  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-[100] bg-brand/40 backdrop-blur-sm flex items-center justify-center p-4 animate-backdrop-fade"
      onClick={onCancel} data-testid="lockdown-confirm-modal">
      <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-3xl max-w-sm w-full p-7 animate-sheet-up">
        <h3 className="font-heading text-lg font-bold text-brand mb-2">{title}</h3>
        <p className="text-sm text-stone-500 leading-relaxed mb-6">{description}</p>
        <div className="flex gap-2">
          <button onClick={onCancel} data-testid="lockdown-confirm-cancel"
            className="flex-1 py-2.5 rounded-xl border border-stone-200 text-stone-600 font-semibold text-sm hover:bg-stone-50 transition-all">
            Batal
          </button>
          <button onClick={onConfirm} disabled={loading} data-testid="lockdown-confirm-ok"
            className={`flex-1 py-2.5 rounded-xl font-semibold text-sm text-white disabled:opacity-50 transition-all ${danger ? "bg-red-500 hover:bg-red-600" : "bg-brand hover:bg-brand-light"}`}>
            {loading ? "Memproses..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ─── Payment Verification Panel (manual transfer — Lifetime plan) ──────────

const PAYMENT_STATUS_BADGE = {
  menunggu_transfer:   { label: "Belum Transfer",       cls: "bg-stone-100 text-stone-500" },
  menunggu_verifikasi: { label: "Menunggu Verifikasi",  cls: "bg-amber-100 text-amber-700" },
  lunas:               { label: "Lunas",                cls: "bg-emerald-100 text-emerald-600" },
  ditolak:             { label: "Ditolak",               cls: "bg-red-100 text-red-500" },
};

const PAYMENT_FILTERS = [
  { key: "",                    label: "Semua" },
  { key: "menunggu_verifikasi", label: "Menunggu Verifikasi" },
  { key: "lunas",                label: "Lunas" },
  { key: "ditolak",               label: "Ditolak" },
];

function ProofImageModal({ src, onClose }) {
  if (!src) return null;
  return createPortal(
    <div className="fixed inset-0 z-[110] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-backdrop-fade"
      onClick={onClose} data-testid="payment-verification-image-modal">
      <button onClick={onClose} className="absolute top-4 right-4 h-9 w-9 rounded-full bg-white/90 flex items-center justify-center text-stone-600">
        <X size={16} weight="bold" />
      </button>
      <img src={src} alt="Bukti transfer" onClick={(e) => e.stopPropagation()}
        className="max-h-[85vh] max-w-full rounded-2xl object-contain shadow-2xl" />
    </div>,
    document.body
  );
}

function PaymentVerificationPanel() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [confirmAction, setConfirmAction] = useState(null); // {order, newStatus, danger, title, description}
  const [saving, setSaving] = useState(false);
  const [previewSrc, setPreviewSrc] = useState(null);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get("/admin/manual-payments", { params: filter ? { status: filter } : {} });
      setItems(data);
    } catch { toast.error("Gagal memuat data verifikasi pembayaran"); }
    finally { setLoading(false); }
  }, [filter]);

  useEffect(() => { setLoading(true); load(); }, [load]);

  const applyAction = async () => {
    if (!confirmAction) return;
    setSaving(true);
    try {
      if (confirmAction.newStatus === "lunas") {
        await api.post(`/admin/manual-payments/${confirmAction.order.id}/approve`);
      } else {
        await api.post(`/admin/manual-payments/${confirmAction.order.id}/reject`, { status: confirmAction.newStatus });
      }
      toast.success("Status pembayaran diperbarui");
      setConfirmAction(null);
      load();
    } catch { toast.error("Gagal memperbarui status"); }
    finally { setSaving(false); }
  };

  const pendingCount = items.filter((i) => i.status === "menunggu_verifikasi").length;

  if (loading) return (
    <div className="feedify-card p-6 animate-pulse">
      <div className="h-4 bg-stone-100 rounded w-1/3 mb-3" />
      <div className="h-10 bg-stone-100 rounded w-1/2" />
    </div>
  );

  return (
    <CollapsibleCard icon={Receipt} title="Verifikasi Pembayaran Manual" testid="payment-verification-panel"
      iconClassName={pendingCount > 0 ? "text-amber-500" : "text-brand"}
      badge={pendingCount > 0 && (
        <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold flex-shrink-0 bg-amber-100 text-amber-700">
          {pendingCount} menunggu
        </span>
      )}>
      <div className="flex gap-2 flex-wrap mb-4">
        {PAYMENT_FILTERS.map((f) => (
          <button key={f.key} onClick={() => setFilter(f.key)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
              filter === f.key ? "bg-brand text-white" : "bg-stone-100 text-stone-600 hover:bg-stone-200"
            }`}>
            {f.label}
          </button>
        ))}
      </div>

      {items.length === 0 ? (
        <div className="text-center py-8 text-sm text-stone-400">Belum ada order untuk filter ini.</div>
      ) : (
        <div className="space-y-2 overflow-x-auto">
          {items.map((o) => {
            const badge = PAYMENT_STATUS_BADGE[o.status] || { label: o.status, cls: "bg-stone-100 text-stone-500" };
            return (
              <div key={o.id} className="flex items-center gap-3 p-3 rounded-xl border border-stone-100 hover:border-stone-200 transition-colors"
                data-testid={`payment-verification-row-${o.id}`}>
                {o.proof_photo_base64 ? (
                  <button onClick={() => setPreviewSrc(o.proof_photo_base64)} className="flex-shrink-0">
                    <img src={o.proof_photo_base64} alt="" className="h-12 w-12 rounded-lg object-cover border border-stone-200" />
                  </button>
                ) : (
                  <div className="flex-shrink-0 h-12 w-12 rounded-lg bg-stone-50 border border-stone-200 flex items-center justify-center">
                    <Receipt size={16} className="text-stone-300" weight="duotone" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-stone-800 truncate">{o.name || o.email}</p>
                  <p className="text-xs text-stone-400 truncate">{o.email} · Rp{Number(o.amount).toLocaleString("id-ID")}</p>
                </div>
                <span className={`flex-shrink-0 text-[10px] font-bold px-2 py-1 rounded-full ${badge.cls}`}>{badge.label}</span>
                <div className="flex-shrink-0 flex gap-1.5">
                  {o.status === "lunas" ? (
                    <button
                      onClick={() => setConfirmAction({ order: o, newStatus: "menunggu_verifikasi", danger: true,
                        title: "Batalkan status Lunas?", description: `Akun ${o.email} akan kembali jadi belum bayar dan akses Lifetime dicabut. Kredit yang sudah ditambahkan tidak ditarik kembali.` })}
                      data-testid={`payment-verification-revert-${o.id}`}
                      className="px-3 py-1.5 rounded-full text-xs font-semibold border border-stone-200 text-stone-500 hover:border-red-300 hover:text-red-500">
                      Batalkan
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={() => setConfirmAction({ order: o, newStatus: "lunas", danger: false,
                          title: "Tandai Lunas?", description: `Akses Lifetime akan langsung aktif untuk ${o.email}.` })}
                        data-testid={`payment-verification-approve-${o.id}`}
                        className="px-3 py-1.5 rounded-full text-xs font-semibold bg-brand text-white hover:bg-brand-light">
                        Tandai Lunas
                      </button>
                      {o.status !== "ditolak" && (
                        <button
                          onClick={() => setConfirmAction({ order: o, newStatus: "ditolak", danger: true,
                            title: "Tolak bukti transfer?", description: `Order ${o.email} akan ditandai ditolak. User bisa upload ulang bukti transfer.` })}
                          data-testid={`payment-verification-reject-${o.id}`}
                          className="px-3 py-1.5 rounded-full text-xs font-semibold border border-red-200 text-red-500 hover:bg-red-50">
                          Tolak
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ConfirmLockModal
        open={!!confirmAction}
        title={confirmAction?.title}
        description={confirmAction?.description}
        confirmLabel={confirmAction?.newStatus === "lunas" ? "Ya, Tandai Lunas" : "Ya, Lanjutkan"}
        danger={confirmAction?.danger}
        loading={saving}
        onConfirm={applyAction}
        onCancel={() => setConfirmAction(null)}
      />
      <ProofImageModal src={previewSrc} onClose={() => setPreviewSrc(null)} />
    </CollapsibleCard>
  );
}

// ─── Feedback / Masukan User Panel ──────────────────────────────────────────

function FeedbackPanel() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get("/admin/feedback");
      setItems(data);
    } catch { toast.error("Gagal memuat masukan user"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const toggleRead = async (item) => {
    const next = !item.read;
    setItems((prev) => prev.map((f) => f.id === item.id ? { ...f, read: next } : f)); // optimistic
    try {
      await api.post(`/admin/feedback/${item.id}/read`, { read: next });
    } catch {
      setItems((prev) => prev.map((f) => f.id === item.id ? { ...f, read: !next } : f)); // revert
      toast.error("Gagal memperbarui status");
    }
  };

  const unreadCount = items.filter((f) => !f.read).length;

  if (loading) return (
    <div className="feedify-card p-6 animate-pulse">
      <div className="h-4 bg-stone-100 rounded w-1/3 mb-3" />
      <div className="h-10 bg-stone-100 rounded w-1/2" />
    </div>
  );

  return (
    <CollapsibleCard icon={ChatCircleDots} title="Masukan & Kritik User" testid="feedback-panel"
      iconClassName={unreadCount > 0 ? "text-brand-gold" : "text-brand"}
      badge={unreadCount > 0 && (
        <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold flex-shrink-0 bg-brand-gold/20 text-brand">
          {unreadCount} baru
        </span>
      )}>
      {items.length === 0 ? (
        <div className="text-center py-8 text-sm text-stone-400">Belum ada masukan dari user.</div>
      ) : (
        <div className="space-y-2.5">
          {items.map((f) => (
            <div key={f.id}
              className={`p-4 rounded-xl border transition-colors ${f.read ? "border-stone-100 bg-white" : "border-brand-gold/40 bg-brand-gold/5"}`}
              data-testid={`feedback-item-${f.id}`}>
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-stone-800 truncate">{f.name || f.email}</span>
                    {!f.read && <span className="text-[9px] font-bold text-brand bg-brand-gold/30 px-1.5 py-0.5 rounded-full">BARU</span>}
                  </div>
                  <div className="text-xs text-stone-400 truncate">{f.email} · {formatDate(f.created_at)}</div>
                </div>
                <button
                  onClick={() => toggleRead(f)}
                  data-testid={`feedback-toggle-read-${f.id}`}
                  className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                    f.read
                      ? "border border-stone-200 text-stone-500 hover:border-brand hover:text-brand"
                      : "bg-brand text-white hover:bg-brand-light"
                  }`}>
                  {f.read ? "Tandai belum dibaca" : "Tandai sudah dibaca"}
                </button>
              </div>
              <p className="text-sm text-stone-700 leading-relaxed whitespace-pre-wrap break-words">{f.message}</p>
            </div>
          ))}
        </div>
      )}
    </CollapsibleCard>
  );
}

// ─── Maintenance Lockdown Panel ─────────────────────────────────────────────

function MaintenancePanel() {
  const [status, setStatus] = useState(null);
  const [confirmTarget, setConfirmTarget] = useState(null); // boolean (target enabled state) or null
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      const { data } = await api.get("/admin/maintenance");
      setStatus(data);
    } catch { toast.error("Gagal memuat status maintenance"); }
  };

  useEffect(() => { load(); }, []);

  const apply = async () => {
    const enabled = confirmTarget;
    setSaving(true);
    try {
      const { data } = await api.post("/admin/maintenance", { enabled, message: "" });
      setStatus(data);
      toast.success(enabled ? "Maintenance diaktifkan" : "Maintenance dimatikan");
      setConfirmTarget(null);
    } catch { toast.error("Gagal mengubah status maintenance"); }
    finally { setSaving(false); }
  };

  if (!status) return (
    <div className="feedify-card p-6 animate-pulse">
      <div className="h-4 bg-stone-100 rounded w-1/3 mb-3" />
      <div className="h-10 bg-stone-100 rounded w-1/2" />
    </div>
  );

  return (
    <CollapsibleCard icon={Wrench} title="Lockdown Menu (Maintenance)" testid="maintenance-panel"
      iconClassName={status.enabled ? "text-red-500" : "text-brand"}
      cardClassName={status.enabled ? "border-2 border-red-300" : ""}
      badge={
        <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold flex-shrink-0 ${status.enabled ? "bg-red-100 text-red-600" : "bg-emerald-100 text-emerald-600"}`}>
          {status.enabled ? "AKTIF" : "Normal"}
        </span>
      }>
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className="text-sm text-stone-500 flex-1 min-w-[180px]">Saat diaktifkan, semua user (selain admin) akan melihat halaman maintenance dan tidak bisa mengakses aplikasi sama sekali.</p>
        <Switch
          checked={status.enabled}
          disabled={saving}
          data-testid="maintenance-switch"
          onCheckedChange={(checked) => setConfirmTarget(checked)}
        />
      </div>
      {status.updated_at && (
        <p className="text-xs text-stone-400">
          Terakhir diubah {formatDateTime(status.updated_at)}{status.updated_by_name ? ` oleh ${status.updated_by_name}` : ""}
        </p>
      )}

      <ConfirmLockModal
        open={confirmTarget !== null}
        loading={saving}
        danger={confirmTarget === true}
        title={confirmTarget ? "Aktifkan maintenance seluruh app?" : "Matikan mode maintenance?"}
        description={confirmTarget
          ? "Semua user (selain admin) akan langsung diarahkan ke halaman maintenance dan tidak bisa mengakses aplikasi sampai kamu matikan lagi."
          : "User bisa mengakses aplikasi seperti biasa lagi."}
        confirmLabel={confirmTarget ? "Ya, Aktifkan" : "Ya, Matikan"}
        onConfirm={apply}
        onCancel={() => setConfirmTarget(null)}
      />
    </CollapsibleCard>
  );
}

// ─── Per-Menu Lockdown Panel ─────────────────────────────────────────────────

const MENU_LOCK_ICONS = {
  banner: ImageSquare,
  studio: Camera,
  carousel: Stack,
  copywriting: PenNib,
  reels: FilmSlate,
  "talking-avatar": Microphone,
  food: ForkKnife,
  marketplace: Storefront,
  calendar: CalendarBlank,
};

const MODE_META = {
  active: {
    label: "Aktif", icon: CheckCircle,
    badge: "bg-emerald-100 text-emerald-600",
    ring: "border-stone-100 bg-white",
  },
  maintenance: {
    label: "Maintenance", icon: Wrench,
    badge: "bg-amber-100 text-amber-600",
    ring: "border-amber-200 bg-amber-50/40",
  },
  hidden: {
    label: "Hidden", icon: EyeSlash,
    badge: "bg-red-100 text-red-600",
    ring: "border-red-200 bg-red-50/40",
  },
};

const MODE_CONFIRM = {
  active: { title: (label) => `Aktifkan menu ${label}?`, desc: "Menu ini akan terlihat & bisa diakses user lagi seperti biasa.", confirmLabel: "Ya, Aktifkan", danger: false },
  maintenance: { title: (label) => `Set ${label} ke mode Maintenance?`, desc: "Menu tetap terlihat di navigasi, tapi user akan melihat halaman maintenance saat membukanya.", confirmLabel: "Ya, Maintenance", danger: true },
  hidden: { title: (label) => `Sembunyikan menu ${label}?`, desc: "Menu ini akan hilang total dari navigasi user — seolah menu ini tidak ada sama sekali.", confirmLabel: "Ya, Sembunyikan", danger: true },
};

function MenuLockdownPanel() {
  const [menus, setMenus] = useState(null);
  const [confirmTarget, setConfirmTarget] = useState(null); // {key, mode} or null
  const [saving, setSaving] = useState(null);

  const load = async () => {
    try {
      const { data } = await api.get("/admin/menu-lockdown");
      setMenus(data);
    } catch { toast.error("Gagal memuat status menu"); }
  };

  useEffect(() => { load(); }, []);

  const apply = async () => {
    const { key, mode } = confirmTarget;
    setSaving(key);
    try {
      await api.post("/admin/menu-lockdown", { menu_key: key, mode });
      setMenus((prev) => ({ ...prev, [key]: { ...prev[key], mode } }));
      invalidateMenuLockCache();
      toast.success(`${menus[key].label} → ${MODE_META[mode].label}`);
      setConfirmTarget(null);
    } catch { toast.error("Gagal mengubah status menu"); }
    finally { setSaving(null); }
  };

  if (!menus) return (
    <div className="feedify-card p-6 animate-pulse">
      <div className="h-4 bg-stone-100 rounded w-1/3 mb-3" />
      <div className="h-20 bg-stone-100 rounded-2xl" />
    </div>
  );

  const inactiveCount = Object.values(menus).filter((m) => m.mode !== "active").length;

  return (
    <CollapsibleCard icon={Lightning} title="Lockdown Per Menu" testid="menu-lockdown-panel"
      badge={inactiveCount > 0 && (
        <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-red-100 text-red-600 flex-shrink-0">
          {inactiveCount} menu tidak aktif
        </span>
      )}>
      <p className="text-sm text-stone-500">
        <strong className="text-amber-600 font-semibold">Maintenance</strong> = menu tetap kelihatan, tapi gak bisa dibuka.{" "}
        <strong className="text-red-500 font-semibold">Hidden</strong> = menu hilang total dari navigasi user.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {Object.entries(menus).map(([key, m]) => {
          const Icon = MENU_LOCK_ICONS[key] || Package;
          const meta = MODE_META[m.mode] || MODE_META.active;
          return (
            <div key={key}
              className={`p-4 rounded-2xl border-2 transition-all ${meta.ring}`}
              data-testid={`menu-lockdown-card-${key}`}>
              <div className="flex items-center gap-3 mb-3.5">
                <div className={`h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0 ${m.mode === "active" ? "bg-brand-sand text-brand" : meta.badge}`}>
                  <Icon size={18} weight="duotone" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm text-stone-700 truncate">{m.label}</div>
                  <div className={`flex items-center gap-1 mt-0.5 text-xs font-medium ${m.mode === "active" ? "text-emerald-600" : m.mode === "maintenance" ? "text-amber-600" : "text-red-500"}`}>
                    <meta.icon size={12} weight="bold" /> {meta.label}
                  </div>
                </div>
              </div>
              <Select
                value={m.mode}
                disabled={saving === key}
                onValueChange={(modeKey) => modeKey !== m.mode && setConfirmTarget({ key, mode: modeKey })}
              >
                <SelectTrigger data-testid={`menu-lockdown-select-${key}`} className="h-9 text-xs font-semibold bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(MODE_META).map(([modeKey, mm]) => (
                    <SelectItem key={modeKey} value={modeKey} className="text-xs font-medium">
                      <span className="flex items-center gap-1.5">
                        <mm.icon size={13} weight="bold" className={
                          modeKey === "active" ? "text-emerald-500" : modeKey === "maintenance" ? "text-amber-500" : "text-red-500"
                        } />
                        {mm.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          );
        })}
      </div>

      <ConfirmLockModal
        open={!!confirmTarget}
        loading={!!saving}
        danger={confirmTarget ? MODE_CONFIRM[confirmTarget.mode].danger : false}
        title={confirmTarget ? MODE_CONFIRM[confirmTarget.mode].title(menus[confirmTarget.key]?.label) : ""}
        description={confirmTarget ? MODE_CONFIRM[confirmTarget.mode].desc : ""}
        confirmLabel={confirmTarget ? MODE_CONFIRM[confirmTarget.mode].confirmLabel : ""}
        onConfirm={apply}
        onCancel={() => setConfirmTarget(null)}
      />
    </CollapsibleCard>
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
    <CollapsibleCard
      icon={InstagramLogo}
      iconClassName="text-pink-500"
      title="Voucher Harian IG Story"
      badge={
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isFull ? "bg-red-100 text-red-600" : "bg-emerald-100 text-emerald-600"}`}>
          {voucher?.claims_used}/{voucher?.max_claims}{isFull ? " · PENUH" : ""}
        </span>
      }
      testid="daily-voucher-panel"
    >
      <div className="flex items-center justify-end gap-2 -mt-1">
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
    </CollapsibleCard>
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
  const [detailDrawer, setDetailDrawer] = useState({ open: false, userId: null });
  const [tourOpen, setTourOpen] = useState(false);

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

      {/* Tur Fitur preview */}
      <div className="feedify-card p-4 flex items-center justify-between gap-4 animate-fade-up">
        <div>
          <p className="font-semibold text-brand text-sm">Tur Fitur Onboarding</p>
          <p className="text-xs text-stone-500 mt-0.5">Preview tour yang dilihat user baru saat pertama login</p>
        </div>
        <button
          onClick={() => { resetTour(); setTourOpen(true); }}
          className="flex-shrink-0 flex items-center gap-2 bg-brand text-brand-cream text-sm font-semibold px-4 py-2 rounded-full hover:bg-brand-light transition-colors"
          data-testid="admin-preview-tour"
        >
          ▶ Lihat Tour
        </button>
      </div>

      <MaintenancePanel />
      <PaymentVerificationPanel />
      <FeedbackPanel />
      <MenuLockdownPanel />
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
                {["User", "Daftar", "Role", "Konten", "Referral", "Aksi"].map((h) => (
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
                        {u.role !== "admin" && (
                          <span className={`inline-flex items-center gap-1 mt-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold ${u.is_lifetime ? "bg-emerald-100 text-emerald-600" : "bg-amber-100 text-amber-700"}`}>
                            {u.is_lifetime ? "✅ Lifetime" : "Belum bayar"}
                          </span>
                        )}
                      </div>
                    </button>
                  </td>
                  <td className="px-4 py-3 text-stone-500 text-xs whitespace-nowrap">
                    <div className="flex items-center gap-1"><CalendarBlank size={12} />{formatDate(u.created_at)}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${ROLE_BADGE[u.role] || ROLE_BADGE.user}`}>
                      {u.role === "admin" ? <Crown size={10} weight="fill" /> : <UserCircle size={10} />}
                      {u.role}
                    </span>
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
                <tr><td colSpan={6} className="px-4 py-10 text-center text-stone-400 text-sm">Tidak ada user ditemukan</td></tr>
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
                    {u.role !== "admin" && (
                      <span className={`inline-flex items-center gap-1 mt-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold ${u.is_lifetime ? "bg-emerald-100 text-emerald-600" : "bg-amber-100 text-amber-700"}`}>
                        {u.is_lifetime ? "✅ Lifetime" : "Belum bayar"}
                      </span>
                    )}
                  </div>
                </div>
                <span className={`flex-shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${ROLE_BADGE[u.role] || ROLE_BADGE.user}`}>
                  {u.role === "admin" ? <Crown size={10} weight="fill" /> : <UserCircle size={10} />}
                  {u.role}
                </span>
              </button>
              <div className="flex items-center gap-4 text-xs text-stone-500">
                <span className="flex items-center gap-1"><CalendarBlank size={11} />{formatDate(u.created_at)}</span>
                <span className="flex items-center gap-1"><Images size={11} />{u.content_count}</span>
              </div>
              {u.id !== user?.id && (
                <div className="flex items-center gap-2">
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
      <UserDetailDrawer
        open={detailDrawer.open}
        userId={detailDrawer.userId}
        onClose={() => setDetailDrawer({ open: false, userId: null })}
      />
      <ProductTour forceOpen={tourOpen} onClose={() => setTourOpen(false)} />
    </div>
  );
}
