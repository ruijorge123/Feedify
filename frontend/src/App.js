import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import LoginPage from "@/pages/LoginPage";
import RegisterPage from "@/pages/RegisterPage";
import LandingPage from "@/pages/LandingPage";
import OnboardingPage from "@/pages/OnboardingPage";
import DashboardPage from "@/pages/DashboardPage";
import BannerGeneratorPage from "@/pages/BannerGeneratorPage";
import CarouselGeneratorPage from "@/pages/CarouselGeneratorPage";
import CopywritingPage from "@/pages/CopywritingPage";
import FoodMenuPage from "@/pages/FoodMenuPage";
import GridPlannerPage from "@/pages/GridPlannerPage";
import ConsistencyCheckerPage from "@/pages/ConsistencyCheckerPage";
import ContentCalendarPage from "@/pages/ContentCalendarPage";
import MarketplacePage from "@/pages/MarketplacePage";
import BrandKitPage from "@/pages/BrandKitPage";
import HistoryPage from "@/pages/HistoryPage";
import SettingsPage from "@/pages/SettingsPage";
import MorePage from "@/pages/MorePage";
import PricingPage from "@/pages/PricingPage";
import CheckoutPage from "@/pages/CheckoutPage";
import AdminPage from "@/pages/AdminPage";
import ReelsGeneratorPage from "@/pages/ReelsGeneratorPage";
import VerifyEmailPage from "@/pages/VerifyEmailPage";
import CommunityPage from "@/pages/CommunityPage";
import BuyCreditsPage from "@/pages/BuyCreditsPage";
import AppShell from "@/components/AppShell";
import "@/App.css";

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
    return <Navigate to={user.has_brand_profile ? "/dashboard" : "/onboarding"} replace />;
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
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/pricing" element={<PricingPage />} />
          <Route path="/checkout" element={<CheckoutPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<PublicOnly><RegisterPage /></PublicOnly>} />
          <Route path="/verify-email" element={<VerifyEmailPage />} />
          <Route path="/onboarding" element={
            <ProtectedRoute requireBrand={false}><OnboardingPage /></ProtectedRoute>
          } />
          <Route element={<ProtectedRoute><AppShell /></ProtectedRoute>}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/generate/banner" element={<BannerGeneratorPage />} />
            <Route path="/generate/carousel" element={<CarouselGeneratorPage />} />
            <Route path="/generate/copywriting" element={<CopywritingPage />} />
            <Route path="/generate/reels" element={<ReelsGeneratorPage />} />
            <Route path="/generate/food" element={<AdminRoute><FoodMenuPage /></AdminRoute>} />
            <Route path="/generate/marketplace" element={<MarketplacePage />} />
            <Route path="/grid-planner" element={<GridPlannerPage />} />
            <Route path="/consistency" element={<ConsistencyCheckerPage />} />
            <Route path="/calendar" element={<ContentCalendarPage />} />
            <Route path="/history" element={<HistoryPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/brand-kit" element={<BrandKitPage />} />
            <Route path="/more" element={<MorePage />} />
            <Route path="/admin" element={<AdminPage />} />
            <Route path="/community" element={<CommunityPage />} />
            <Route path="/credits" element={<BuyCreditsPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
    </GoogleOAuthProvider>
  );
}

export default App;
