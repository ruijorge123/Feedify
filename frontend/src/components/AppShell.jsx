import { Outlet, NavLink, Link, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import ProductTour from "@/components/ProductTour";
import api from "@/lib/api";
import { useMenuLockStatus, menuMode } from "@/lib/menuLock";
import {
  HouseSimple,
  ImageSquare,
  Stack,
  PenNib,
  ClockCounterClockwise,
  Gear,
  SignOut,
  Sparkle,
  DotsThreeOutline,
  Brain,
  ForkKnife,
  CalendarBlank,
  Storefront,
  Palette,
  ShieldStar,
  FilmSlate,
  Wrench,
  Camera,
  Microphone,
  CaretDown,
  Package,
  EyeSlash,
  SquaresFour,
} from "@phosphor-icons/react";

const mobileNav = [
  { to: "/dashboard",             label: "Home",           icon: HouseSimple,    testid: "nav-home" },
  { to: "/generate/banner",       label: "Feed & Banner",  icon: ImageSquare,    testid: "nav-banner",        lockKey: "banner" },
  { to: "/generate/feed-generator", label: "Feed Gen",     icon: SquaresFour,    testid: "nav-feed-generator", lockKey: "feed-generator" },
  { to: "/studio",                label: "Studio",         icon: Camera,         testid: "nav-studio",        lockKey: "studio" },
  { to: "/more",                  label: "More",           icon: DotsThreeOutline, testid: "nav-more" },
];

const sidebarSections = [
  {
    items: [
      { to: "/dashboard", label: "Home", icon: HouseSimple, testid: "nav-home" },
    ],
  },
  {
    title: "Toolkit",
    items: [
      { to: "/generate/banner", label: "Feed & Banner", icon: ImageSquare, testid: "nav-banner", lockKey: "banner" },
      { to: "/generate/feed-generator", label: "Feed Generator", icon: SquaresFour, testid: "nav-feed-generator", lockKey: "feed-generator" },
      { to: "/studio", label: "Studio", icon: Camera, testid: "nav-studio", lockKey: "studio" },
      { to: "/generate/carousel", label: "Carousel", icon: Stack, testid: "nav-carousel", lockKey: "carousel" },
      { to: "/generate/marketplace", label: "Marketplace", icon: Storefront, testid: "nav-marketplace", lockKey: "marketplace" },
      { to: "/generate/copywriting", label: "Copywriting", icon: PenNib, testid: "nav-copy", lockKey: "copywriting" },
      { to: "/growth-consultant", label: "Growth Consultant", icon: Brain, testid: "nav-growth", lockKey: "growth-consultant" },
      { to: "/calendar", label: "Calendar Planner", icon: CalendarBlank, testid: "nav-calendar", lockKey: "calendar" },
      { to: "/generate/reels", label: "Reels", icon: FilmSlate, testid: "nav-reels", lockKey: "reels" },
      { to: "/generate/talking-avatar", label: "Video Presenter", icon: Microphone, testid: "nav-talking-avatar", lockKey: "talking-avatar" },
      { to: "/generate/food", label: "F&B Menu", icon: ForkKnife, testid: "nav-food", adminOnly: true, lockKey: "food" },
    ],
  },
  {
    title: "Library",
    items: [
      { to: "/history", label: "History", icon: ClockCounterClockwise, testid: "nav-history" },
      { to: "/brand-kit", label: "Brand Kit", icon: Palette, testid: "nav-brand-kit" },
    ],
  },
];

export default function AppShell() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [activeBrand, setActiveBrand] = useState(null);
  const [collapsedSections, setCollapsedSections] = useState({});
  const lockStatus = useMenuLockStatus();
  const isAdmin = user?.role === "admin";
  const isHidden = (item) => !isAdmin && item.lockKey && menuMode(lockStatus, item.lockKey) === "hidden";
  const isMaintenance = (item) => item.lockKey && menuMode(lockStatus, item.lockKey) === "maintenance";
  const isHiddenAdmin = (item) => isAdmin && item.lockKey && menuMode(lockStatus, item.lockKey) === "hidden";
  const toggleSection = (title) => setCollapsedSections(prev => ({ ...prev, [title]: !prev[title] }));

  const fetchBrand = () => {
    api.get("/brand-profile").then(({ data }) => setActiveBrand(data)).catch(() => {});
  };

  // Refetch on every route change so sidebar stays in sync
  useEffect(() => {
    fetchBrand();
  }, [location.pathname]);

  // Also listen for explicit save events (same-page updates)
  useEffect(() => {
    window.addEventListener("brand-updated", fetchBrand);
    return () => window.removeEventListener("brand-updated", fetchBrand);
  }, []);

  return (
    <div className="min-h-screen bg-brand-cream relative overflow-x-hidden" data-testid="app-shell">
      {/* Mesh gradient ambient blobs — desktop only (heavy blur freezes mobile GPU) */}
      <div className="hidden lg:block pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="absolute top-[-8%] left-[15%] w-[50vw] h-[50vw] rounded-full bg-brand/[0.07] blur-[140px]" />
        <div className="absolute top-[20%] right-[-5%] w-[38vw] h-[38vw] rounded-full bg-brand-gold/[0.06] blur-[120px]" />
        <div className="absolute bottom-[5%] left-[5%] w-[42vw] h-[42vw] rounded-full bg-brand/[0.05] blur-[130px]" />
      </div>

      {/* Desktop Sidebar — bold emerald */}
      <aside className="hidden lg:flex fixed left-0 top-0 h-screen w-64 flex-col bg-brand z-30" data-testid="sidebar">
        {/* Logo */}
        <div className="px-6 py-7 border-b border-white/10">
          <NavLink to="/dashboard" className="flex items-center gap-2.5" data-testid="brand-logo-link">
            <div className="h-9 w-9 rounded-xl bg-brand-gold/20 border border-brand-gold/30 flex items-center justify-center shadow-md">
              <Sparkle size={20} weight="fill" className="text-brand-gold" />
            </div>
            <div>
              <div className="font-heading text-xl font-bold text-brand-cream tracking-tight">Feedify</div>
              <div className="text-[10px] uppercase tracking-[0.18em] text-brand-cream/40 -mt-0.5">brand studio</div>
            </div>
          </NavLink>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 overflow-y-auto">
          {sidebarSections.map((section, si) => {
            const eligible = section.items.filter(item => (!item.adminOnly || isAdmin) && !isHidden(item));
            const activeItems = eligible.filter(i => !isMaintenance(i) && !isHiddenAdmin(i));
            const maintItems  = eligible.filter(i =>  isMaintenance(i));
            const hiddenAdminItems = eligible.filter(i => isHiddenAdmin(i));
            const sorted = [...activeItems, ...maintItems, ...hiddenAdminItems];
            const isCollapsed = !!collapsedSections[section.title];

            return (
              <div key={si} className={section.title ? "mt-1" : ""}>
                {section.title ? (
                  <>
                    {/* Divider + collapsible section header */}
                    <div className="mx-1 h-px bg-white/8 mb-3" />
                    <button
                      onClick={() => toggleSection(section.title)}
                      className="w-full flex items-center gap-2 px-3 mb-2 group"
                    >
                      <span className="text-brand-gold/70 text-[8px] leading-none">✦</span>
                      <span className="flex-1 text-left text-[10px] uppercase tracking-[0.22em] font-semibold text-brand-cream/40 group-hover:text-brand-cream/60 transition-colors">
                        {section.title}
                      </span>
                      <CaretDown
                        size={10}
                        weight="bold"
                        className={`text-brand-cream/25 transition-transform duration-200 ${isCollapsed ? "-rotate-90" : ""}`}
                      />
                    </button>
                  </>
                ) : (
                  <div className="mb-1" />
                )}

                {!isCollapsed && (
                  <div className="space-y-0.5">
                    {sorted.map((item) => {
                      const underMaintenance = isMaintenance(item);
                      const underHiddenAdmin = isHiddenAdmin(item);
                      return (
                        <NavLink
                          key={item.to}
                          to={item.to}
                          data-testid={item.testid}
                          className={({ isActive }) =>
                            `flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                              underMaintenance || underHiddenAdmin
                                ? "opacity-50 text-brand-cream/55 hover:bg-white/8 hover:opacity-70"
                                : isActive
                                  ? "bg-brand-gold/20 text-brand-gold border border-brand-gold/25"
                                  : "text-brand-cream/70 hover:bg-white/10 hover:text-brand-cream"
                            }`
                          }
                        >
                          <item.icon size={18} weight={location.pathname === item.to ? "fill" : "regular"} />
                          <span className="flex-1 truncate">{item.label}</span>
                          {underMaintenance && (
                            <span className="flex items-center gap-1 bg-amber-500/20 text-amber-400 text-[9px] font-bold px-1.5 py-0.5 rounded-full border border-amber-500/25 flex-shrink-0">
                              <Wrench size={9} weight="fill" /> maint
                            </span>
                          )}
                          {underHiddenAdmin && (
                            <span className="flex items-center gap-1 bg-red-500/20 text-red-400 text-[9px] font-bold px-1.5 py-0.5 rounded-full border border-red-500/25 flex-shrink-0">
                              <EyeSlash size={9} weight="fill" /> hidden
                            </span>
                          )}
                        </NavLink>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>



        {/* Bottom */}
        <div className="p-3 border-t border-white/10 space-y-0.5">
          {user?.role === "admin" && (
            <NavLink
              to="/admin"
              data-testid="nav-admin"
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive ? "bg-brand-gold text-brand" : "text-brand-gold hover:bg-brand-gold/15"
                }`
              }
            >
              <ShieldStar size={18} weight="duotone" />
              Admin Panel
            </NavLink>
          )}
          <NavLink
            to="/settings"
            data-testid="nav-settings"
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isActive ? "bg-brand-gold/20 text-brand-gold border border-brand-gold/25" : "text-brand-cream/70 hover:bg-white/10 hover:text-brand-cream"
              }`
            }
          >
            <Gear size={18} />
            Settings
          </NavLink>
          <button
            onClick={logout}
            data-testid="logout-button"
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium text-brand-cream/60 hover:bg-red-900/30 hover:text-red-300 transition-all"
          >
            <SignOut size={18} />
            Keluar
          </button>
          <NavLink
            to="/products"
            data-testid="nav-products"
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isActive ? "bg-brand-gold/20 text-brand-gold border border-brand-gold/25" : "text-brand-cream/70 hover:bg-white/10 hover:text-brand-cream"
              }`
            }
          >
            <Package size={18} weight={location.pathname === "/products" ? "fill" : "regular"} />
            Produk
          </NavLink>

          {activeBrand && (
            <NavLink to="/settings" className="mx-1 mt-1 flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-white/10 transition-all group">
              <div className="h-7 w-7 rounded-lg flex-shrink-0 border border-white/20 overflow-hidden flex items-center justify-center"
                style={{ background: activeBrand.color_secondary || "#FDFBF7" }}>
                {activeBrand.logo_base64
                  ? <img src={activeBrand.logo_base64} alt="logo" className="h-full w-full object-cover" />
                  : <span className="font-heading font-bold text-xs" style={{ color: activeBrand.color_primary || "#0B3D2E" }}>
                      {(activeBrand.brand_name?.[0] || "?").toUpperCase()}
                    </span>
                }
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold text-brand-cream truncate">{activeBrand.brand_name}</div>
                <div className="text-[9px] text-brand-cream/40 group-hover:text-brand-cream/60">Ganti brand →</div>
              </div>
            </NavLink>
          )}
          {user && (
            <div className="px-4 pt-1 pb-1 text-xs">
              <div className="text-brand-cream/35 truncate">{user.email}</div>
            </div>
          )}
        </div>
      </aside>

      {/* Mobile Top Bar — bold emerald */}
      <header className="lg:hidden sticky top-0 z-30 bg-brand px-4 py-3 flex items-center justify-between" data-testid="mobile-header">
        <NavLink to="/dashboard" className="flex items-center gap-2" data-testid="brand-logo-mobile">
          <div className="h-8 w-8 rounded-lg bg-brand-gold/20 border border-brand-gold/30 flex items-center justify-center">
            <Sparkle size={16} weight="fill" className="text-brand-gold" />
          </div>
          <div>
            <span className="font-heading text-lg font-bold text-brand-cream">Feedify</span>
            {activeBrand && (
              <div className="text-[9px] text-brand-cream/50 leading-none -mt-0.5">{activeBrand.brand_name}</div>
            )}
          </div>
        </NavLink>
        <div className="flex items-center gap-2">
          
          <NavLink
            to="/settings"
            className="h-9 w-9 rounded-full bg-white/15 flex items-center justify-center text-brand-cream"
            data-testid="settings-mobile-link"
          >
            <Gear size={18} />
          </NavLink>
        </div>
      </header>

      {/* Main Content */}
      <main className="lg:ml-64 pb-24 lg:pb-8 relative z-10 overflow-x-hidden">
        <div className={`mx-auto py-6 lg:py-10 min-w-0 ${
          location.pathname.startsWith("/admin") ? "max-w-7xl px-3 sm:px-4 lg:px-6" : "max-w-6xl px-4 sm:px-6 lg:px-10"
        }`}>
          <Outlet />
        </div>
      </main>

      {/* Mobile Bottom Nav — bold emerald */}
      <nav
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-brand border-t border-brand-light/30"
        data-testid="mobile-bottom-nav"
      >
        <div className="grid grid-cols-5 px-1 py-1.5 safe-area-inset-bottom">
          {mobileNav.filter(item => !isHidden(item)).map((item) => {
            const isActive = location.pathname === item.to;
            const underMaintenance = isMaintenance(item);
            const underHiddenAdmin = isHiddenAdmin(item);
            const statusIcon = underMaintenance ? (
              <span className="absolute -top-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-amber-500 border-2 border-brand flex items-center justify-center">
                <Wrench size={7} weight="fill" className="text-white" />
              </span>
            ) : underHiddenAdmin ? (
              <span className="absolute -top-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-red-500 border-2 border-brand flex items-center justify-center">
                <EyeSlash size={7} weight="fill" className="text-white" />
              </span>
            ) : null;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                data-testid={`${item.testid}-mobile`}
                className={`flex flex-col items-center justify-center gap-1 py-1 rounded-xl text-[10px] font-medium transition-all btn-touch ${
                  (underMaintenance || underHiddenAdmin) ? "text-brand-cream/40 opacity-60" : isActive ? "text-brand-gold" : "text-brand-cream/55"
                }`}
              >
                <div className={`relative h-9 w-9 rounded-xl flex items-center justify-center transition-all ${
                  isActive && !underMaintenance && !underHiddenAdmin ? "bg-white/15" : "bg-transparent"
                }`}>
                  <item.icon size={20} weight={isActive ? "fill" : "regular"} />
                  {statusIcon}
                </div>
                <span className="leading-none">{item.label}</span>
              </NavLink>
            );
          })}
        </div>
      </nav>

      {/* Product Tour — auto on first login for new users */}
      <ProductTour />
    </div>
  );
}
