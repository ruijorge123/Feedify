import { Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useMenuLockStatus, menuMode } from "@/lib/menuLock";
import {
  GridFour,
  ShieldCheck,
  ForkKnife,
  CalendarBlank,
  ClockCounterClockwise,
  Gear,
  ArrowRight,
  PenNib,
  Stack,
  ImageSquare,
  ShieldStar,
  WhatsappLogo,
  Tag,
  FilmSlate,
} from "@phosphor-icons/react";

const sections = [
  {
    title: "Generators",
    items: [
      { to: "/generate/banner", label: "Feed Post Generator", desc: "Konten feed Instagram siap posting", icon: ImageSquare, color: "bg-brand text-brand-cream", lockKey: "banner" },
      { to: "/generate/carousel", label: "Carousel Builder", desc: "3–7 slide storytelling", icon: Stack, color: "bg-brand-gold text-brand", lockKey: "carousel" },
      { to: "/generate/reels", label: "Reels Generator", desc: "Video iklan pendek dari foto produk", icon: FilmSlate, color: "bg-violet-700 text-violet-50", lockKey: "reels" },
      { to: "/generate/copywriting", label: "Copywriting", desc: "Headline, caption, hashtag", icon: PenNib, color: "bg-brand-clay text-white", lockKey: "copywriting" },
      { to: "/generate/food", label: "F&B Menu Visual", desc: "Food photography prompt khusus", icon: ForkKnife, color: "bg-amber-700 text-amber-50", adminOnly: true, lockKey: "food" },
    ],
  },
  {
    title: "Planning & QA",
    items: [
      { to: "/grid-planner", label: "Feed Grid Planner", desc: "Plan 3×3 Instagram feed", icon: GridFour, color: "bg-emerald-700 text-emerald-50", lockKey: "grid-planner" },
      { to: "/consistency", label: "Consistency Checker", desc: "Skor konsistensi vs Brand DNA", icon: ShieldCheck, color: "bg-rose-700 text-rose-50", lockKey: "consistency" },
      { to: "/calendar", label: "Calendar Planner", desc: "Jadwalkan konten & notif pengingat", icon: CalendarBlank, color: "bg-indigo-700 text-indigo-50", lockKey: "calendar" },
    ],
  },
  {
    title: "Library",
    items: [
      { to: "/history", label: "Prompt History", desc: "Semua prompt yang pernah dibuat", icon: ClockCounterClockwise, color: "bg-stone-700 text-stone-50" },
      { to: "/settings", label: "Settings", desc: "Edit brand profile, akun", icon: Gear, color: "bg-stone-500 text-stone-50" },
    ],
  },
  {
    title: "Eksklusif",
    items: [
      { to: "/community", label: "Komunitas Feedify", desc: "Gabung komunitas & klaim voucher 5%", icon: WhatsappLogo, color: "bg-[#25D366] text-white" },
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
            {sec.items.filter(item => (!item.adminOnly || user?.role === "admin") && (!item.lockKey || menuMode(lockStatus, item.lockKey) !== "hidden")).map((item) => (
              <Link
                key={item.to}
                to={item.to}
                data-testid={`more-link-${item.to.replace(/\//g, '-')}`}
                className="feedify-card p-5 flex items-center gap-4 group"
              >
                <div className={`h-12 w-12 rounded-xl ${item.color} flex items-center justify-center shadow-sm flex-shrink-0`}>
                  <item.icon size={22} weight="duotone" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-heading font-semibold text-brand">{item.label}</div>
                  <div className="text-xs text-stone-500">{item.desc}</div>
                </div>
                <ArrowRight size={16} className="text-stone-400 group-hover:text-brand group-hover:translate-x-1 transition-all" />
              </Link>
            ))}
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
