import { lazy, Suspense, useEffect } from "react";
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import AppShell from "@/components/AppShell";
import { useViewAs } from "@/lib/viewAs";
import AdminPinGate from "@/components/AdminPinGate";
import MenuLockGate from "@/components/MenuLockGate";
import "@/App.css";

// ── Lazy-loaded pages ─────────────────────────────────────────────────────────
const LandingPage           = lazy(() => import("@/pages/LandingPage"));
const PortfolioPage         = lazy(() => import("@/pages/PortfolioPage"));
const SampleRequestPage     = lazy(() => import("@/pages/SampleRequestPage"));
const LoginPage             = lazy(() => import("@/pages/LoginPage"));
const RegisterPage          = lazy(() => import("@/pages/RegisterPage"));
const VerifyEmailPage       = lazy(() => import("@/pages/VerifyEmailPage"));
const ForgotPasswordPage    = lazy(() => import("@/pages/ForgotPasswordPage"));
const OnboardingPage        = lazy(() => import("@/pages/OnboardingPage"));
const CheckoutPage          = lazy(() => import("@/pages/CheckoutPage"));
const MaintenancePage       = lazy(() => import("@/pages/MaintenancePage"));
const DashboardPage         = lazy(() => import("@/pages/DashboardPage"));
const ClientHomePage        = lazy(() => import("@/pages/ClientHomePage"));
const ClientBrandDnaPage    = lazy(() => import("@/pages/ClientBrandDnaPage"));
const ClientProductsPage    = lazy(() => import("@/pages/ClientProductsPage"));
const ClientOrdersPage      = lazy(() => import("@/pages/ClientOrdersPage"));
const InactiveAccountPage   = lazy(() => import("@/pages/InactiveAccountPage"));
const AdminClientsPage      = lazy(() => import("@/pages/AdminClientsPage"));
const CommandLibraryPage    = lazy(() => import("@/pages/CommandLibraryPage"));
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
  // Non-admin users must have paid before entering the app
  const hasAccess = user.role === "admin" || user.is_lifetime;
  if (!hasAccess) return <Navigate to="/#harga" replace />;
  // A client the owner deactivated keeps their account and data, but the
  // dashboard would only show a dead counter — send them somewhere that says so.
  if (user.role !== "admin" && user.client_status === "nonaktif") {
    return <Navigate to="/akun-nonaktif" replace />;
  }
  if (requireBrand && !user.has_brand_profile) return <Navigate to="/onboarding" replace />;
  return children;
}

function HomeByRole() {
  const { user } = useAuth();
  // While viewing as a client the owner should land on the CLIENT home, not
  // their own tool dashboard — otherwise the mode is only half on.
  const viewAs = useViewAs();
  if (viewAs) return <ClientHomePage />;
  return user?.role === "admin" ? <DashboardPage /> : <ClientHomePage />;
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
  const navigate = useNavigate();
  // Returning null left the screen blank after signing out, which reads as a
  // crash. Log out, then land them somewhere that exists.
  useEffect(() => {
    logout();
    navigate("/", { replace: true });
  }, []); // eslint-disable-line
  return (
    <div className="flex min-h-screen items-center justify-center bg-brand-cream">
      <div className="animate-pulse font-heading text-brand">Keluar...</div>
    </div>
  );
}

// Checkout only requires login, not payment (user comes here TO pay).
// The chosen package lives in the query string, so send them back to this exact
// URL after login — dropping it would silently reset them to the default package.
function LoginRequired({ children }) {
  const { user, loading } = useAuth();
  const { pathname, search } = useLocation();
  if (loading) return null;
  if (!user) {
    return <Navigate to={`/login?redirect=${encodeURIComponent(pathname + search)}`} replace />;
  }
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
            <Route path="/pricing"         element={<Navigate to="/#harga" replace />} />
            <Route path="/checkout"        element={<LoginRequired><CheckoutPage /></LoginRequired>} />
            <Route path="/login"           element={<LoginPage />} />
            <Route path="/register"        element={<PublicOnly><RegisterPage /></PublicOnly>} />
            <Route path="/verify-email"    element={<VerifyEmailPage />} />
            <Route path="/forgot-password" element={<PublicOnly><ForgotPasswordPage /></PublicOnly>} />
            <Route path="/maintenance"     element={<MaintenancePage />} />
            <Route path="/akun-nonaktif"   element={<LoginRequired><InactiveAccountPage /></LoginRequired>} />
            {/* Public sales pages — no login required on purpose: a prospect must be
                able to see the work and ask for a sample before creating an account. */}
            <Route path="/hasil-kerja"     element={<PortfolioPage />} />
            <Route path="/sample"          element={<SampleRequestPage />} />
            <Route path="/onboarding"      element={
              <ProtectedRoute requireBrand={false}><OnboardingPage /></ProtectedRoute>
            } />
            <Route element={<ProtectedRoute><AppShell /></ProtectedRoute>}>
              <Route path="/dashboard"             element={<HomeByRole />} />
              <Route path="/brand-dna"             element={<ClientBrandDnaPage />} />
              <Route path="/produk"                element={<ClientProductsPage />} />
              <Route path="/riwayat"               element={<ClientOrdersPage />} />
              <Route path="/studio"                 element={<AdminRoute><MenuLockGate menuKey="studio"><StudioPage /></MenuLockGate></AdminRoute>} />
              <Route path="/generate/banner"       element={<AdminRoute><MenuLockGate menuKey="banner"><BannerGeneratorPage /></MenuLockGate></AdminRoute>} />
              <Route path="/generate/carousel"     element={<AdminRoute><MenuLockGate menuKey="carousel"><CarouselGeneratorPage /></MenuLockGate></AdminRoute>} />
              <Route path="/generate/copywriting"  element={<AdminRoute><MenuLockGate menuKey="copywriting"><CopywritingPage /></MenuLockGate></AdminRoute>} />
              <Route path="/generate/reels"            element={<AdminRoute><MenuLockGate menuKey="reels"><ReelsGeneratorPage /></MenuLockGate></AdminRoute>} />
              <Route path="/generate/talking-avatar"  element={<AdminRoute><MenuLockGate menuKey="talking-avatar"><TalkingAvatarPage /></MenuLockGate></AdminRoute>} />
              <Route path="/generate/food"             element={<AdminRoute><MenuLockGate menuKey="food"><FoodMenuPage /></MenuLockGate></AdminRoute>} />
              <Route path="/generate/marketplace"     element={<AdminRoute><MenuLockGate menuKey="marketplace"><MarketplacePage /></MenuLockGate></AdminRoute>} />
              <Route path="/generate/feed-generator"  element={<AdminRoute><MenuLockGate menuKey="feed-generator"><FeedGeneratorPage /></MenuLockGate></AdminRoute>} />
              <Route path="/growth-consultant"         element={<MenuLockGate menuKey="growth-consultant"><GrowthConsultantPage /></MenuLockGate>} />
              <Route path="/calendar"              element={<AdminRoute><MenuLockGate menuKey="calendar"><ContentCalendarPage /></MenuLockGate></AdminRoute>} />
              <Route path="/history"               element={<AdminRoute><HistoryPage /></AdminRoute>} />
              <Route path="/products"              element={<AdminRoute><ProductLibraryPage /></AdminRoute>} />
              <Route path="/settings"             element={<SettingsPage />} />
              <Route path="/brand-kit"             element={<AdminRoute><BrandKitPage /></AdminRoute>} />
              <Route path="/feedback"              element={<FeedbackPage />} />
              <Route path="/more"                  element={<AdminRoute><MorePage /></AdminRoute>} />
              <Route path="/klien"                 element={<AdminRoute><AdminClientsPage /></AdminRoute>} />
              <Route path="/command-library"       element={<AdminRoute><CommandLibraryPage /></AdminRoute>} />
              <Route path="/admin"                 element={<AdminRoute><AdminPinGate><AdminPage /></AdminPinGate></AdminRoute>} />
              
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
