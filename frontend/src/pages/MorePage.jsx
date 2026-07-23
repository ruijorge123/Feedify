import { Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useMenuLockStatus, menuMode } from "@/lib/menuLock";
import {
  ForkKnife,
  CalendarBlank,
  ClockCounterClockwise,
  Gear,
  ArrowRight,
  PenNib,
  Stack,
  ImageSquare,
  ShieldStar,
  FilmSlate,
  Wrench,
  Camera,
  Microphone,
  SquaresFour,
  Brain,
  Storefront,
  Package,
  Palette,
  ChatCircleDots,
  EyeSlash,
} from "@phosphor-icons/react";

const sections = [
  {
    title: "Toolkit",
    items: [
      { to: "/generate/banner", label: "Feed & Banner", desc: "Konten feed Instagram siap posting", icon: ImageSquare, color: "bg-brand text-brand-cream", lockKey: "banner" },
      { to: "/generate/feed-generator", label: "Feed Generator", desc: "Banyak prompt foto sekaligus, konsisten & beragam", icon: SquaresFour, color: "bg-brand text-brand-cream", lockKey: "feed-generator" },
      { to: "/studio", label: "Feedify Studio", desc: "Commercial product photography dalam hitungan detik", icon: Camera, color: "bg-stone-900 text-white", lockKey: "studio" },
      { to: "/generate/carousel", label: "Carousel Builder", desc: "3–7 slide storytelling", icon: Stack, color: "bg-brand-gold text-brand", lockKey: "carousel" },
      { to: "/generate/marketplace", label: "Marketplace", desc: "Foto listing produk untuk Shopee, Tokopedia, dll", icon: Storefront, color: "bg-brand text-brand-cream", lockKey: "marketplace" },
      { to: "/generate/copywriting", label: "Copywriting", desc: "Headline, caption, hashtag dari data produkmu", icon: PenNib, color: "bg-brand text-brand-gold", lockKey: "copywriting" },
      { to: "/growth-consultant", label: "Growth Consultant", desc: "Strategi tumbuh & konsultasi bisnis berbasis AI", icon: Brain, color: "bg-brand text-brand-cream", lockKey: "growth-consultant" },
      { to: "/calendar", label: "Calendar Planner", desc: "Jadwalkan konten & notif pengingat", icon: CalendarBlank, color: "bg-stone-800 text-stone-50", lockKey: "calendar" },
      { to: "/generate/food", label: "F&B Menu Visual", desc: "Food photography prompt khusus", icon: ForkKnife, color: "bg-amber-700 text-amber-50", adminOnly: true, lockKey: "food" },
      { to: "/generate/reels", label: "Reels Generator", desc: "Video iklan pendek dari foto produk", icon: FilmSlate, color: "bg-stone-700 text-stone-50", lockKey: "reels" },
      { to: "/generate/talking-avatar", label: "Video Presenter", desc: "Foto produk jadi video presenter berbicara", icon: Microphone, color: "bg-stone-600 text-stone-50", lockKey: "talking-avatar" },
    ],
  },
  {
    title: "Library",
    items: [
      { to: "/products", label: "Product Knowledge", desc: "Simpan & kelola data produk untuk generate konten", icon: Package, color: "bg-brand text-brand-cream" },
      { to: "/brand-kit", label: "Brand DNA", desc: "DNA merek, warna, logo, dan identitas visualmu", icon: Palette, color: "bg-brand-gold text-brand" },
      { to: "/feedback", label: "Feedback", desc: "Kirim kritik & saran ke tim Feedify", icon: ChatCircleDots, color: "bg-brand text-brand-cream" },
      { to: "/history", label: "Prompt History", desc: "Semua prompt yang pernah dibuat", icon: ClockCounterClockwise, color: "bg-stone-700 text-stone-50" },
      { to: "/settings", label: "Settings", desc: "Edit brand profile, akun", icon: Gear, color: "bg-stone-500 text-stone-50" },
    ],
  },
];

export default function MorePage() {
  const { user } = useAuth();
  const lockStatus = useMenuLockStatus();

  return (
    <div className="space-y-8" data-testid="more-page">
      <div className="animate-fade-up">
        <div className="text-xs uppercase tracking-[0.2em] text-brand-light font-semibold mb-2">Semua Fitur</div>
        <h1 className="font-heading text-3xl sm:text-4xl font-bold text-brand tracking-tight">Toolkit Lengkap</h1>
        <p className="text-stone-600 mt-2">Pilih tools yang Anda butuhkan untuk membangun brand UMKM yang konsisten.</p>
      </div>

      {sections.map((sec) => (
        <div key={sec.title} className="animate-fade-up">
          <h2 className="font-heading text-xl font-bold text-brand mb-3">{sec.title}</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            {sec.items
              .filter(item => {
                if (item.adminOnly && user?.role !== "admin") return false;
                if (!item.lockKey) return true;
                const m = menuMode(lockStatus, item.lockKey);
                // Non-admin: hide "hidden" items entirely
                // Admin: always show (so admin can see hidden/maintenance state)
                return user?.role === "admin" || m !== "hidden";
              })
              .map((item) => {
                const mode = item.lockKey ? menuMode(lockStatus, item.lockKey) : "active";
                const isAdmin = user?.role === "admin";
                const underMaintenance = mode === "maintenance";
                const underHiddenAdmin = isAdmin && mode === "hidden";
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    data-testid={`more-link-${item.to.replace(/\//g, '-')}`}
                    className={`feedify-card p-5 flex items-center gap-4 group transition-all ${
                      underHiddenAdmin ? "opacity-50" : underMaintenance ? "opacity-60" : ""
                    }`}
                  >
                    <div className={`h-12 w-12 rounded-xl flex items-center justify-center shadow-sm flex-shrink-0 transition-all ${
                      underHiddenAdmin
                        ? "bg-red-50 text-red-400"
                        : underMaintenance
                          ? "bg-stone-200 text-stone-400"
                          : item.color
                    }`}>
                      {underHiddenAdmin
                        ? <EyeSlash size={22} weight="duotone" />
                        : underMaintenance
                          ? <Wrench size={22} weight="duotone" />
                          : <item.icon size={22} weight="duotone" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-heading font-semibold text-brand flex items-center gap-2 flex-wrap">
                        {item.label}
                        {underHiddenAdmin && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-red-100 text-red-500 border border-red-200 leading-none">
                            hidden
                          </span>
                        )}
                        {underMaintenance && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-600 border border-amber-200 leading-none">
                            {isAdmin ? "maint" : "Maintenance"}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-stone-500">
                        {underHiddenAdmin
                          ? "Menu disembunyikan dari user."
                          : underMaintenance && !isAdmin
                            ? "Sedang dalam perbaikan. Coba lagi nanti."
                            : item.desc}
                      </div>
                    </div>
                    {underHiddenAdmin
                      ? <EyeSlash size={16} className="text-red-400 flex-shrink-0" />
                      : underMaintenance && !isAdmin
                        ? <Wrench size={16} className="text-amber-400 flex-shrink-0" />
                        : <ArrowRight size={16} className="text-stone-400 group-hover:text-brand group-hover:translate-x-1 transition-all" />
                    }
                  </Link>
                );
              })}
          </div>
        </div>
      ))}

      {user?.role === "admin" && (
        <div className="animate-fade-up">
          <h2 className="font-heading text-xl font-bold text-brand mb-3">Admin</h2>
          <Link
            to="/admin"
            data-testid="more-link-admin"
            className="feedify-card p-5 flex items-center gap-4 group border-2 border-brand-gold/30"
          >
            <div className="h-12 w-12 rounded-xl bg-brand-gold text-brand flex items-center justify-center shadow-sm flex-shrink-0">
              <ShieldStar size={22} weight="duotone" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-heading font-semibold text-brand">Admin Panel</div>
              <div className="text-xs text-stone-500">Kelola user, role, dan data platform</div>
            </div>
            <ArrowRight size={16} className="text-stone-400 group-hover:text-brand group-hover:translate-x-1 transition-all" />
          </Link>
        </div>
      )}
    </div>
  );
}
