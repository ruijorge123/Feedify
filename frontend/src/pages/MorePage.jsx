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
} from "@phosphor-icons/react";

const sections = [
  {
    title: "Generators",
    items: [
      { to: "/generate/banner", label: "Feed Post Generator", desc: "Konten feed Instagram siap posting", icon: ImageSquare, color: "bg-brand text-brand-cream", lockKey: "banner" },
      { to: "/studio", label: "Feedify Studio", desc: "Commercial product photography dalam hitungan detik", icon: Camera, color: "bg-stone-900 text-white", lockKey: "studio" },
      { to: "/generate/carousel", label: "Carousel Builder", desc: "3–7 slide storytelling", icon: Stack, color: "bg-brand-gold text-brand", lockKey: "carousel" },
      { to: "/generate/reels", label: "Reels Generator", desc: "Video iklan pendek dari foto produk", icon: FilmSlate, color: "bg-violet-700 text-violet-50", lockKey: "reels" },
      { to: "/generate/talking-avatar", label: "Talking Avatar", desc: "Foto produk jadi video avatar berbicara", icon: Microphone, color: "bg-teal-700 text-teal-50", lockKey: "talking-avatar" },
      { to: "/generate/copywriting", label: "Copywriting", desc: "Headline, caption, hashtag", icon: PenNib, color: "bg-brand-clay text-white", lockKey: "copywriting" },
      { to: "/generate/food", label: "F&B Menu Visual", desc: "Food photography prompt khusus", icon: ForkKnife, color: "bg-amber-700 text-amber-50", adminOnly: true, lockKey: "food" },
    ],
  },
  {
    title: "Planning & QA",
    items: [
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
              .filter(item => (!item.adminOnly || user?.role === "admin") && (!item.lockKey || menuMode(lockStatus, item.lockKey) !== "hidden"))
              .map((item) => {
                const mode = item.lockKey ? menuMode(lockStatus, item.lockKey) : "active";
                const underMaintenance = mode === "maintenance" && user?.role !== "admin";
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    data-testid={`more-link-${item.to.replace(/\//g, '-')}`}
                    className={`feedify-card p-5 flex items-center gap-4 group transition-all ${underMaintenance ? "opacity-60" : ""}`}
                  >
                    <div className={`h-12 w-12 rounded-xl ${underMaintenance ? "bg-stone-200 text-stone-400" : item.color} flex items-center justify-center shadow-sm flex-shrink-0 transition-all`}>
                      {underMaintenance ? <Wrench size={22} weight="duotone" /> : <item.icon size={22} weight="duotone" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-heading font-semibold text-brand flex items-center gap-2">
                        {item.label}
                        {underMaintenance && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-600 border border-amber-200 leading-none">
                            Maintenance
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-stone-500">
                        {underMaintenance ? "Sedang dalam perbaikan. Coba lagi nanti." : item.desc}
                      </div>
                    </div>
                    {underMaintenance
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
