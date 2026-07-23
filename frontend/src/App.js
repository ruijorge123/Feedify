import { lazy, Suspense, useEffect } from "react";
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import AppShell from "@/components/AppShell";
import AdminPinGate from "@/components/AdminPinGate";
import MenuLockGate from "@/components/MenuLockGate";
import "@/App.css";

// ── Lazy-loaded pages ─────────────────────────────────────────────────────────
const LandingPage           = lazy(() => import("@/pages/LandingPage"));
const LoginPage             = lazy(() => import("@/pages/LoginPage"));
const RegisterPage          = lazy(() => import("@/pages/RegisterPage"));
const VerifyEmailPage       = lazy(() => import("@/pages/VerifyEmailPage"));
const ForgotPasswordPage    = lazy(() => import("@/pages/ForgotPasswordPage"));
const OnboardingPage        = lazy(() => import("@/pages/OnboardingPage"));
const PricingPage           = lazy(() => import("@/pages/PricingPage"));
const CheckoutPage          = lazy(() => import("@/pages/CheckoutPage"));
const MaintenancePage       = lazy(() => import("@/pages/MaintenancePage"));
const DashboardPage         = lazy(() => import("@/pages/DashboardPage"));
const BannerGeneratorPage   = lazy(() => import("@/pages/BannerGeneratorPage"));
const CarouselGeneratorPage = lazy(() => import("@/pages/CarouselGeneratorPage"));
const CopywritingPage       = lazy(() => import("@/pages/CopywritingPage"));
const FoodMenuPage          = lazy(() => import("@/pages/FoodMenuPage"));
const MarketplacePage       = lazy(() => import("@/pages/MarketplacePage"));
const ReelsGeneratorPage    = lazy(() => import("@/pages/ReelsGeneratorPage"));
const GrowthConsultantPage  = lazy(() => import("@/pages/GrowthConsultantPage"));
const StudioPage            = lazy(() => import("@/pages/StudioPage"));
const TalkingAvatarPage     = lazy(() => import("@/pages/TalkingAvatarPage"));
const ContentCalendarPage   = lazy(() => import("@/pages/ContentCalendarPage"));
const HistoryPage           = lazy(() => import("@/pages/HistoryPage"));
const SettingsPage          = lazy(() => import("@/pages/SettingsPage"));
const BrandKitPage          = lazy(() => import("@/pages/BrandKitPage"));
const FeedbackPage          = lazy(() => import("@/pages/FeedbackPage"));
const MorePage              = lazy(() => import("@/pages/MorePage"));
const BuyCreditsPage        = lazy(() => import("@/pages/BuyCreditsPage"));
const ProductLibraryPage    = lazy(() => import("@/pages/ProductLibraryPage"));
const AdminPage             = lazy(() => import("@/pages/AdminPage"));
const FeedGeneratorPage     = lazy(() => import("@/pages/FeedGeneratorPage"));

function PageLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-brand-cream">
      <div className="w-8 h-8 rounded-full border-2 border-brand border-t-transparent animate-spin" />
    </div>
  );
}

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return null;
}

function ProtectedRoute({ children, requireBrand = true }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-brand-cream">
        <div className="animate-pulse text-brand text-lg font-heading">Memuat...</div>
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  // Non-admin users must have paid (lifetime access) before entering the app
  const hasAccess = user.role === "admin" || user.is_lifetime;
  if (!hasAccess) return <Navigate to="/pricing" replace />;
  if (requireBrand && !user.has_brand_profile) return <Navigate to="/onboarding" replace />;
  return children;
}

function AdminRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-brand-cream">
        <div className="animate-pulse text-brand text-lg font-heading">Memuat...</div>
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== "admin") return <Navigate to="/dashboard" replace />;
  return children;
}

function PublicOnly({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) {
    const hasAccess = user.role === "admin" || user.is_lifetime;
    if (!hasAccess) return children; // Not paid yet — let them see login/register
    return <Navigate to={user.has_brand_profile ? "/dashboard" : "/onboarding"} replace />;
  }
  return children;
}

function LogoutPage() {
  const { logout } = useAuth();
  useEffect(() => { logout(); }, []); // eslint-disable-line
  return null;
}

// Checkout only requires login, not payment (user comes here TO pay)
function LoginRequired({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login?redirect=/checkout?plan=lifetime" replace />;
  return children;
}

function App() {
  return (
    <GoogleOAuthProvider clientId={process.env.REACT_APP_GOOGLE_CLIENT_ID}>
    <AuthProvider>
      <BrowserRouter>
        <ScrollToTop />
        <ToastContainer
          position="top-right"
          autoClose={3000}
          hideProgressBar={false}
          newestOnTop
          closeOnClick
          pauseOnFocusLoss
          draggable
          pauseOnHover
          theme="light"
        />
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/"                element={<LandingPage />} />
            <Route path="/logout"          element={<LogoutPage />} />
            <Route path="/pricing"         element={<BuyCreditsPage />} />
            <Route path="/checkout"        element={<LoginRequired><CheckoutPage /></LoginRequired>} />
            <Route path="/login"           element={<LoginPage />} />
            <Route path="/register"        element={<PublicOnly><RegisterPage /></PublicOnly>} />
            <Route path="/verify-email"    element={<VerifyEmailPage />} />
            <Route path="/forgot-password" element={<PublicOnly><ForgotPasswordPage /></PublicOnly>} />
            <Route path="/maintenance"     element={<MaintenancePage />} />
            <Route path="/onboarding"      element={
              <ProtectedRoute requireBrand={false}><OnboardingPage /></ProtectedRoute>
            } />
            <Route element={<ProtectedRoute><AppShell /></ProtectedRoute>}>
              <Route path="/dashboard"             element={<DashboardPage />} />
              <Route path="/studio"                 element={<MenuLockGate menuKey="studio"><StudioPage /></MenuLockGate>} />
              <Route path="/generate/banner"       element={<MenuLockGate menuKey="banner"><BannerGeneratorPage /></MenuLockGate>} />
              <Route path="/generate/carousel"     element={<MenuLockGate menuKey="carousel"><CarouselGeneratorPage /></MenuLockGate>} />
              <Route path="/generate/copywriting"  element={<MenuLockGate menuKey="copywriting"><CopywritingPage /></MenuLockGate>} />
              <Route path="/generate/reels"            element={<MenuLockGate menuKey="reels"><ReelsGeneratorPage /></MenuLockGate>} />
              <Route path="/generate/talking-avatar"  element={<MenuLockGate menuKey="talking-avatar"><TalkingAvatarPage /></MenuLockGate>} />
              <Route path="/generate/food"             element={<AdminRoute><MenuLockGate menuKey="food"><FoodMenuPage /></MenuLockGate></AdminRoute>} />
              <Route path="/generate/marketplace"     element={<MenuLockGate menuKey="marketplace"><MarketplacePage /></MenuLockGate>} />
              <Route path="/generate/feed-generator"  element={<MenuLockGate menuKey="feed-generator"><FeedGeneratorPage /></MenuLockGate>} />
              <Route path="/growth-consultant"         element={<MenuLockGate menuKey="growth-consultant"><GrowthConsultantPage /></MenuLockGate>} />
              <Route path="/calendar"              element={<MenuLockGate menuKey="calendar"><ContentCalendarPage /></MenuLockGate>} />
              <Route path="/history"               element={<HistoryPage />} />
              <Route path="/products"              element={<ProductLibraryPage />} />
              <Route path="/settings"             element={<SettingsPage />} />
              <Route path="/brand-kit"             element={<BrandKitPage />} />
              <Route path="/feedback"              element={<FeedbackPage />} />
              <Route path="/more"                  element={<MorePage />} />
              <Route path="/admin"                 element={<AdminRoute><AdminPinGate><AdminPage /></AdminPinGate></AdminRoute>} />
              <Route path="/credits"               element={<BuyCreditsPage />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </AuthProvider>
    </GoogleOAuthProvider>
  );
}

export default App;
