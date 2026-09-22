import { Outlet, NavLink, useLocation, useNavigate } from "react-router-dom";
import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useMenuLockStatus, menuMode } from "@/lib/menuLock";
import { useClient, statusStyle } from "@/lib/client";
import { useActiveClient } from "@/lib/clientPicker";
import { useViewAs, exitViewAs } from "@/lib/viewAs";
import ClientPickerBar from "@/components/admin/ClientPickerBar";
import FeedifyLogo from "@/components/FeedifyLogo";
import {
  HouseSimple, Palette, Package, Brain, Receipt, Gear, SignOut,
  ImageSquare, SquaresFour, Camera, Stack, Storefront, PenNib,
  CalendarBlank, FilmSlate, Microphone, ForkKnife, ClockCounterClockwise,
  ShieldStar, ChatCircleDots, List, X, Wrench, Users, Notepad, Eye, SignOut as SignOutIcon,
} from "@phosphor-icons/react";

/**
 * Application shell.
 *
 * Two completely different products share this frame. A client sees five menus
 * and no tools at all — in the agency model they do not produce anything, and a
 * sidebar full of generators would only raise questions we then have to answer
 * on WhatsApp. The owner sees the whole toolkit.
 */

const CLIENT_NAV = [
  { to: "/dashboard", label: "Beranda", icon: HouseSimple, testid: "nav-beranda" },
  { to: "/brand-dna", label: "Brief & Brand DNA", icon: Palette, testid: "nav-brand-dna" },
  { to: "/produk", label: "Produk Saya", icon: Package, testid: "nav-produk" },
  { to: "/growth-consultant", label: "Growth Consultant", icon: Brain, testid: "nav-growth", lockKey: "growth-consultant" },
  { to: "/riwayat", label: "Riwayat Pesanan", icon: Receipt, testid: "nav-riwayat" },
];

const ADMIN_SECTIONS = [
  {
    title: "Agency",
    items: [
      { to: "/dashboard", label: "Beranda", icon: HouseSimple, testid: "nav-beranda" },
      { to: "/klien", label: "Daftar Klien", icon: Users, testid: "nav-klien" },
      { to: "/command-library", label: "Command Library", icon: Notepad, testid: "nav-command" },
      { to: "/admin", label: "Admin Panel", icon: ShieldStar, testid: "nav-admin" },
    ],
  },
  {
    title: "Tools Produksi",
    items: [
      { to: "/generate/banner", label: "Feed & Banner", icon: ImageSquare, testid: "nav-banner", lockKey: "banner" },
      { to: "/generate/feed-generator", label: "Feed Generator", icon: SquaresFour, testid: "nav-feed-generator", lockKey: "feed-generator" },
      { to: "/studio", label: "Studio", icon: Camera, testid: "nav-studio", lockKey: "studio" },
      { to: "/generate/carousel", label: "Carousel", icon: Stack, testid: "nav-carousel", lockKey: "carousel" },
      { to: "/generate/marketplace", label: "Marketplace", icon: Storefront, testid: "nav-marketplace", lockKey: "marketplace" },
      { to: "/generate/copywriting", label: "Copywriting", icon: PenNib, testid: "nav-copy", lockKey: "copywriting" },
      { to: "/generate/reels", label: "Reels", icon: FilmSlate, testid: "nav-reels", lockKey: "reels" },
      { to: "/generate/talking-avatar", label: "Video Presenter", icon: Microphone, testid: "nav-talking-avatar", lockKey: "talking-avatar" },
      { to: "/generate/food", label: "F&B Menu", icon: ForkKnife, testid: "nav-food", lockKey: "food" },
    ],
  },
  {
    title: "Pendukung",
    items: [
      { to: "/growth-consultant", label: "Growth Consultant", icon: Brain, testid: "nav-growth", lockKey: "growth-consultant" },
      { to: "/calendar", label: "Calendar Planner", icon: CalendarBlank, testid: "nav-calendar", lockKey: "calendar" },
      { to: "/history", label: "History", icon: ClockCounterClockwise, testid: "nav-history" },
      { to: "/brand-kit", label: "Brand Kit", icon: Palette, testid: "nav-brand-kit" },
      { to: "/feedback", label: "Feedback", icon: ChatCircleDots, testid: "nav-feedback" },
    ],
  },
];

export default function AppShell() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const lockStatus = useMenuLockStatus();
  const data = useClient();
  const [menuOpen, setMenuOpen] = useState(false);

  const viewAs = useViewAs();
  // While viewing as a client the owner IS looking at the client product: same
  // five menus, no toolkit. Leaving the admin sidebar up would make it unclear
  // which app the screen belongs to.
  const isAdmin = user?.role === "admin" && !viewAs;
  const sections = isAdmin
    ? ADMIN_SECTIONS
    : [{ title: null, items: CLIENT_NAV }];

  const hidden = (i) => !isAdmin && i.lockKey && menuMode(lockStatus, i.lockKey) === "hidden";
  const maint = (i) => i.lockKey && menuMode(lockStatus, i.lockKey) === "maintenance";

  const c = data?.client;
  const st = c ? statusStyle(c.status) : null;

  // The picker only belongs where content is produced. Showing it on the Admin
  // Panel or Feedback would imply those screens change with it; they do not.
  const activeClient = useActiveClient();
  const onToolPage = /^\/(generate|studio|calendar|history|brand-kit|products)/.test(location.pathname);

  const doLogout = () => { logout(); navigate("/"); };

  const keluarViewAs = () => { exitViewAs(); navigate("/klien"); };

  return (
    <div className="relative min-h-screen bg-brand-cream" data-testid="app-shell">
      {viewAs && (
        <div className="sticky top-0 z-50 flex flex-wrap items-center gap-3 bg-brand-gold px-5 py-2.5 sm:px-8" data-testid="view-as-bar">
          <Eye size={16} weight="duotone" className="flex-shrink-0 text-brand" />
          <span className="min-w-0 flex-1 text-sm font-semibold text-brand">
            Kamu sedang melihat sebagai{" "}
            <span className="font-bold">{viewAs.nickname || viewAs.name}</span>
            <span className="hidden font-normal text-brand/60 sm:inline"> — semua perubahan di sini mengubah data klien</span>
          </span>
          <button
            onClick={keluarViewAs}
            className="inline-flex flex-shrink-0 items-center gap-1.5 rounded-full bg-brand px-4 py-1.5 text-xs font-bold text-brand-cream transition-colors hover:bg-brand-light"
            data-testid="view-as-keluar"
          >
            <SignOutIcon size={12} weight="bold" /> Kembali jadi Admin
          </button>
        </div>
      )}
      {/* ── desktop sidebar ─────────────────────────────────── */}
      <aside className="fixed left-0 top-0 z-30 hidden h-screen w-64 flex-col bg-brand lg:flex" data-testid="sidebar">
        <div className="border-b border-white/10 px-6 py-6">
          <NavLink to="/dashboard" data-testid="brand-logo-link">
            <FeedifyLogo size={34} tone="light" />
          </NavLink>
          {isAdmin && (
            <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-brand-gold/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-brand-gold">
              <ShieldStar size={11} weight="fill" /> Admin
            </div>
          )}
        </div>

        {/* counter — the client's headline number, always in view */}
        {!isAdmin && c && (
          <div className="border-b border-white/10 px-6 py-5">
            <div className="text-[10px] font-bold uppercase tracking-[0.15em] text-brand-cream/35">Feed selesai</div>
            <div className="mt-1 font-heading text-2xl font-bold text-brand-gold">
              {c.counter ?? 0}<span className="text-brand-cream/25"> / {c.total_feeds ?? 0}</span>
            </div>
            {st && (
              <div className="mt-2 inline-flex items-center gap-1.5 text-[11px] text-brand-cream/50">
                <span className={`h-1.5 w-1.5 rounded-full ${st.dot}`} /> {st.label}
              </div>
            )}
          </div>
        )}

        <nav className="flex-1 overflow-y-auto px-3 py-4">
          {sections.map((sec, si) => (
            <div key={sec.title || si} className={si ? "mt-6" : ""}>
              {sec.title && (
                <div className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.15em] text-brand-cream/30">
                  {sec.title}
                </div>
              )}
              {sec.items.filter((i) => !hidden(i)).map((i) => (
                <NavItem key={i.to} item={i} maintenance={maint(i)} />
              ))}
            </div>
          ))}
        </nav>

        <div className="border-t border-white/10 p-3">
          <NavItem item={{ to: "/settings", label: "Pengaturan", icon: Gear, testid: "nav-settings" }} />
          <button
            onClick={doLogout}
            className="mt-1 flex w-full items-center gap-3 rounded-xl border border-white/10 px-3 py-2.5 text-sm font-medium text-brand-cream/80 transition-colors hover:border-red-400/40 hover:bg-red-500/10 hover:text-red-200"
            data-testid="nav-logout"
          >
            <SignOut size={18} weight="duotone" /> Keluar dari akun
          </button>
        </div>
      </aside>

      {/* ── mobile top bar ──────────────────────────────────── */}
      <header className="sticky top-0 z-40 flex items-center justify-between bg-brand px-5 py-3.5 lg:hidden">
        <NavLink to="/dashboard"><FeedifyLogo size={30} tone="light" /></NavLink>
        <div className="flex items-center gap-3">
          {!isAdmin && c && (
            <span className="font-heading text-sm font-bold text-brand-gold">
              {c.counter ?? 0}<span className="text-brand-cream/30">/{c.total_feeds ?? 0}</span>
            </span>
          )}
          <button
            onClick={doLogout}
            className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-2 text-xs font-semibold text-brand-cream transition-colors hover:bg-white/20"
            data-testid="mobile-logout"
          >
            <SignOut size={13} weight="bold" /> Keluar
          </button>
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="grid h-9 w-9 place-items-center rounded-full bg-white/10 text-brand-cream"
            aria-label="Menu"
            data-testid="mobile-menu-toggle"
          >
            {menuOpen ? <X size={17} weight="bold" /> : <List size={17} weight="bold" />}
          </button>
        </div>
      </header>

      {menuOpen && (
        <div className="fixed inset-0 z-30 bg-black/40 lg:hidden" onClick={() => setMenuOpen(false)}>
          <div
            className="absolute right-0 top-0 h-full w-72 overflow-y-auto bg-brand px-3 pb-8 pt-20"
            onClick={(e) => e.stopPropagation()}
          >
            {sections.map((sec, si) => (
              <div key={sec.title || si} className={si ? "mt-6" : ""}>
                {sec.title && (
                  <div className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.15em] text-brand-cream/30">{sec.title}</div>
                )}
                {sec.items.filter((i) => !hidden(i)).map((i) => (
                  <NavItem key={i.to} item={i} maintenance={maint(i)} onClick={() => setMenuOpen(false)} />
                ))}
              </div>
            ))}
            <div className="mt-6 border-t border-white/10 pt-3">
              <NavItem item={{ to: "/settings", label: "Pengaturan", icon: Gear, testid: "nav-settings" }} onClick={() => setMenuOpen(false)} />
              <button onClick={doLogout} className="mt-1 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-brand-cream/50 hover:text-brand-cream">
                <SignOut size={18} weight="duotone" /> Keluar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── content ─────────────────────────────────────────── */}
      {/* Keying on the selected client remounts the tool when it changes, so a
          page that loaded brand data on mount cannot keep showing the previous
          client's colours. */}
      <main className="pb-24 lg:ml-64 lg:pb-0" key={`${location.pathname}:${activeClient?.user_id || ""}`}>
        {isAdmin && onToolPage && <ClientPickerBar />}
        <Outlet />
      </main>

      {/* ── mobile bottom bar ───────────────────────────────── */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-brand-sand bg-brand-cream/95 backdrop-blur-xl lg:hidden" data-testid="mobile-nav">
        <div className="flex" style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
          {(isAdmin ? ADMIN_SECTIONS[1].items.slice(0, 4) : CLIENT_NAV.slice(0, 4))
            .filter((i) => !hidden(i))
            .concat([{ to: "/settings", label: "Pengaturan", icon: Gear, testid: "nav-settings-m" }])
            .map(({ to, label, icon: Icon, testid }) => (
              <NavLink
                key={to}
                to={to}
                data-testid={testid}
                className={({ isActive }) =>
                  `flex flex-1 flex-col items-center gap-1 py-2.5 text-[10px] font-medium transition-colors ${
                    isActive ? "text-brand" : "text-stone-400"
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon size={20} weight={isActive ? "fill" : "duotone"} />
                    <span className="truncate px-1">{label}</span>
                  </>
                )}
              </NavLink>
            ))}
        </div>
      </nav>
    </div>
  );
}

function NavItem({ item, maintenance, onClick }) {
  const { to, label, icon: Icon, testid } = item;
  return (
    <NavLink
      to={to}
      onClick={onClick}
      data-testid={testid}
      className={({ isActive }) =>
        `mb-0.5 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors ${
          isActive
            ? "bg-brand-gold/15 font-semibold text-brand-gold"
            : "text-brand-cream/60 hover:bg-white/5 hover:text-brand-cream"
        }`
      }
    >
      {({ isActive }) => (
        <>
          <Icon size={18} weight={isActive ? "fill" : "duotone"} />
          <span className="flex-1 truncate">{label}</span>
          {maintenance && <Wrench size={13} weight="duotone" className="text-amber-400" title="Sedang perbaikan" />}
        </>
      )}
    </NavLink>
  );
}
