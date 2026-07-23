import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { toast } from "react-toastify";
import { Sparkle, Envelope, ArrowRight, ArrowLeft } from "@phosphor-icons/react";
import { useGoogleLogin } from "@react-oauth/google";
import api from "@/lib/api";
import { LOGIN } from "@/constants/testIds/auth";
import PasswordInput from "@/components/PasswordInput";

// ── Google button (unchanged) ──────────────────────────────────────────────────

function GoogleButton({ onClick, loading }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      data-testid="google-login-button"
      className="w-full flex items-center justify-center gap-3 py-3.5 bg-white border border-stone-200 rounded-xl font-semibold text-stone-700 hover:bg-stone-50 hover:border-stone-300 hover:shadow-md transition-all duration-200 disabled:opacity-60 shadow-sm"
    >
      {loading ? (
        <span className="h-5 w-5 border-2 border-stone-300 border-t-blue-500 rounded-full animate-spin" />
      ) : (
        <svg width="20" height="20" viewBox="0 0 48 48" fill="none">
          <path d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z" fill="#FFC107"/>
          <path d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z" fill="#FF3D00"/>
          <path d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0 1 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z" fill="#4CAF50"/>
          <path d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z" fill="#1976D2"/>
        </svg>
      )}
      {loading ? "Memproses..." : "Lanjutkan dengan Google"}
    </button>
  );
}

// ── Mini Instagram-style product card ─────────────────────────────────────────

function FloatingCard({ photoSrc, avatarGradient, floatAnim, delay = 0, rotation = "0deg", width = 148, top, left, right, bottom, className = "" }) {
  return (
    <div
      className={`absolute ${className}`}
      style={{ top, left, right, bottom }}
    >
      <div
        className="bg-white rounded-2xl overflow-hidden"
        style={{
          width,
          transform: `rotate(${rotation})`,
          boxShadow: "0 24px 64px rgba(0,0,0,0.38), 0 4px 12px rgba(0,0,0,0.18)",
          animation: `${floatAnim} ease-in-out ${delay}s infinite`,
        }}
      >
        {/* Header row */}
        <div className="flex items-center gap-2 px-3 pt-3 pb-1.5">
          <div
            className="w-6 h-6 rounded-full flex-shrink-0"
            style={{ background: avatarGradient }}
          />
          <div className="flex-1 space-y-1">
            <div className="h-1.5 rounded-full bg-stone-200 w-14" />
            <div className="h-1 rounded-full bg-stone-100 w-10" />
          </div>
          <div className="text-stone-300 text-xs leading-none">···</div>
        </div>
        {/* Photo */}
        <img
          src={photoSrc}
          alt=""
          draggable={false}
          style={{ width: "100%", height: width * 0.88, objectFit: "cover", display: "block" }}
        />
        {/* Engagement row */}
        <div className="px-3 py-2.5 space-y-1.5">
          <div className="flex gap-2.5 text-stone-400" style={{ fontSize: 12 }}>
            <span>♡</span><span>💬</span><span>✈</span>
          </div>
          <div className="h-1.5 rounded-full bg-stone-100 w-full" />
          <div className="h-1.5 rounded-full bg-stone-100 w-3/4" />
        </div>
      </div>
    </div>
  );
}

// ── Before → After transformation card ────────────────────────────────────────

function TransformCard({ compact = false }) {
  const W = compact ? 130 : 176;
  const H = compact ? 215 : 290;
  const PHOTO_H = compact ? 118 : 165;
  const cardBase = {
    position: "absolute",
    inset: 0,
    borderRadius: compact ? 16 : 20,
    overflow: "hidden",
    background: "#fff",
  };

  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ zIndex: 10 }}>
      <div className="relative" style={{ width: W, height: H }}>

        {/* BEFORE — plain, boring */}
        <div
          style={{
            ...cardBase,
            animation: "transformHide 9s ease-in-out 0.5s infinite",
            boxShadow: "0 8px 24px rgba(0,0,0,0.18)",
          }}
        >
          {/* header */}
          <div className="flex items-center gap-2 px-3 pt-3 pb-1.5">
            <div className="w-7 h-7 rounded-full bg-stone-200 flex-shrink-0" />
            <div className="flex-1 space-y-1">
              <div className="h-2 rounded bg-stone-200 w-20" />
              <div className="h-1.5 rounded bg-stone-100 w-14" />
            </div>
          </div>
          {/* dull photo — raw product shot */}
          <img
            src="/freese-before.webp"
            alt=""
            draggable={false}
            style={{ width: "100%", height: PHOTO_H, objectFit: "cover", display: "block", filter: "grayscale(35%) brightness(0.92)" }}
          />
          {/* footer */}
          <div className="px-3 py-3 space-y-2">
            <div className="flex gap-3 text-stone-300 text-sm">♡ 💬 ✈</div>
            <div className="h-2 rounded bg-stone-100 w-full" />
            <div className="h-2 rounded bg-stone-100 w-4/5" />
          </div>
          {/* label */}
          <div className="absolute top-2 right-2 bg-stone-100 text-stone-400 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full">
            Sebelum
          </div>
        </div>

        {/* AFTER — branded, polished */}
        <div
          style={{
            ...cardBase,
            animation: "transformReveal 9s ease-in-out 0.5s infinite",
            boxShadow: "0 28px 72px rgba(11,61,46,0.45), 0 4px 16px rgba(11,61,46,0.2)",
            outline: "2px solid rgba(229,193,88,0.4)",
          }}
        >
          {/* header */}
          <div className="flex items-center gap-2 px-3 pt-3 pb-1.5">
            <div
              className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, #0B3D2E, #1E6B50)" }}
            >
              <Sparkle size={12} weight="fill" color="#E5C158" />
            </div>
            <div className="flex-1 space-y-1">
              <div className="h-2 rounded w-20" style={{ background: "rgba(11,61,46,0.18)" }} />
              <div className="h-1.5 rounded w-14" style={{ background: "rgba(229,193,88,0.3)" }} />
            </div>
          </div>
          {/* branded photo — AI-polished result */}
          <div className="relative" style={{ height: PHOTO_H }}>
            <img
              src="/freese-after.webp"
              alt=""
              draggable={false}
              style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
            />
            {/* subtle brand overlay */}
            <div
              className="absolute inset-0 flex items-end justify-end p-2"
              style={{ background: "linear-gradient(to top, rgba(11,61,46,0.45) 0%, transparent 55%)" }}
            >
              <div
                className="flex items-center gap-1 px-2 py-0.5 rounded-full"
                style={{ background: "rgba(229,193,88,0.92)" }}
              >
                <Sparkle size={8} weight="fill" color="#0B3D2E" />
                <span style={{ fontSize: 8, fontWeight: 800, color: "#0B3D2E", letterSpacing: "0.05em" }}>AI</span>
              </div>
            </div>
          </div>
          {/* footer */}
          <div className="px-3 py-3 space-y-2">
            <div className="flex gap-3 text-stone-400 text-sm">♡ 💬 ✈</div>
            <div className="h-2 rounded w-full" style={{ background: "rgba(11,61,46,0.12)" }} />
            <div className="h-2 rounded w-4/5" style={{ background: "rgba(229,193,88,0.2)" }} />
          </div>
          {/* label */}
          <div
            className="absolute top-2 right-2 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
            style={{ background: "rgba(229,193,88,0.9)", color: "#0B3D2E" }}
          >
            Sesudah ✦
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Sparkle particles ─────────────────────────────────────────────────────────

const SPARKLES = [
  { x: "12%", y: "78%", delay: 0,   dur: 4.5, size: 10 },
  { x: "22%", y: "82%", delay: 1.4, dur: 5.2, size: 7  },
  { x: "38%", y: "86%", delay: 0.6, dur: 4.0, size: 9  },
  { x: "55%", y: "80%", delay: 2.1, dur: 5.8, size: 6  },
  { x: "68%", y: "84%", delay: 0.9, dur: 4.3, size: 8  },
  { x: "78%", y: "76%", delay: 1.7, dur: 5.0, size: 7  },
  { x: "88%", y: "83%", delay: 0.3, dur: 6.0, size: 6  },
  { x: "46%", y: "89%", delay: 2.8, dur: 4.7, size: 8  },
];

function SparkleField() {
  return (
    <>
      {SPARKLES.map((s, i) => (
        <div
          key={i}
          className="absolute select-none pointer-events-none hidden lg:block"
          style={{
            left: s.x,
            top: s.y,
            fontSize: s.size,
            color: "#E5C158",
            opacity: 0,
            animation: `sparkleRise ${s.dur}s ease-in-out ${s.delay}s infinite`,
          }}
        >
          ✦
        </div>
      ))}
    </>
  );
}

// ── Living Canvas (left panel) ─────────────────────────────────────────────────

function LivingCanvas({ compact = false }) {
  return (
    <div
      className="relative overflow-hidden"
      style={{
        background: "linear-gradient(135deg, #0B3D2E 0%, #163d28 30%, #0d2e20 60%, #0B3D2E 100%)",
        backgroundSize: "300% 300%",
        animation: "meshShift 16s ease-in-out infinite",
        height: compact ? 288 : undefined,
        minHeight: compact ? undefined : "100%",
      }}
    >
      {/* Ambient blobs */}
      <div
        className="absolute rounded-full blur-3xl"
        style={{
          width: compact ? 200 : 420,
          height: compact ? 200 : 420,
          top: "-20%",
          right: "-10%",
          background: "radial-gradient(circle, rgba(229,193,88,0.22) 0%, transparent 70%)",
          animation: "floatB 9s ease-in-out infinite",
        }}
      />
      <div
        className="absolute rounded-full blur-3xl"
        style={{
          width: compact ? 160 : 380,
          height: compact ? 160 : 380,
          bottom: "-15%",
          left: "-8%",
          background: "radial-gradient(circle, rgba(45,122,90,0.28) 0%, transparent 70%)",
          animation: "floatA 11s ease-in-out infinite",
        }}
      />
      <div
        className="absolute rounded-full blur-2xl"
        style={{
          width: compact ? 100 : 250,
          height: compact ? 100 : 250,
          top: "40%",
          left: "30%",
          background: "radial-gradient(circle, rgba(229,193,88,0.12) 0%, transparent 70%)",
          animation: "floatC 7s ease-in-out 3s infinite",
        }}
      />

      {/* ── Mobile: 2 mini corner cards + transform card ─────────────────── */}
      <FloatingCard
        photoSrc="/skincare-moisturizer.webp"
        avatarGradient="linear-gradient(135deg, #E5C158, #0B3D2E)"
        floatAnim="floatA 8s"
        delay={0}
        rotation="-10deg"
        width={96}
        top="12px"
        left="-14px"
        className="block lg:hidden"
      />
      <FloatingCard
        photoSrc="/makanan.webp"
        avatarGradient="linear-gradient(135deg, #E5C158, #8B2500)"
        floatAnim="floatB 7s"
        delay={0.8}
        rotation="9deg"
        width={92}
        top="12px"
        right="-14px"
        className="block lg:hidden"
      />

      {/* ── Desktop: 4 full-size cards + transform card ───────────────────── */}
      <FloatingCard
        photoSrc="/skincare-moisturizer.webp"
        avatarGradient="linear-gradient(135deg, #E5C158, #0B3D2E)"
        floatAnim="floatA 8s"
        delay={0}
        rotation="-7deg"
        width={140}
        top="10%"
        left="6%"
        className="hidden lg:block"
      />
      <FloatingCard
        photoSrc="/minuman-kopi.webp"
        avatarGradient="linear-gradient(135deg, #0B3D2E, #E5C158)"
        floatAnim="floatB 6.5s"
        delay={1}
        rotation="5deg"
        width={132}
        top="8%"
        right="7%"
        className="hidden lg:block"
      />
      <FloatingCard
        photoSrc="/fashion-shirt.webp"
        avatarGradient="linear-gradient(135deg, #E5C158, #6B3A20)"
        floatAnim="floatC 10s"
        delay={2}
        rotation="-4deg"
        width={148}
        bottom="16%"
        left="4%"
        className="hidden lg:block"
      />
      <FloatingCard
        photoSrc="/makanan.webp"
        avatarGradient="linear-gradient(135deg, #E5C158, #8B2500)"
        floatAnim="floatD 7.5s"
        delay={0.5}
        rotation="8deg"
        width={118}
        bottom="12%"
        right="6%"
        className="hidden lg:block"
      />
      <TransformCard compact={compact} />

      {/* ── Sparkle particles ─────────────────────────────────────────────── */}
      <SparkleField />

      {/* ── Logo + tagline overlay (desktop only) ─────────────────────────── */}
      {!compact && <div
        className="absolute bottom-0 left-0 right-0 px-10 pt-24 pb-10 pointer-events-none"
        style={{ background: "linear-gradient(to top, rgba(11,61,46,0.97) 0%, rgba(11,61,46,0.5) 60%, transparent 100%)" }}
      >
        <div className="flex items-center gap-2.5 mb-4">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: "rgba(229,193,88,0.15)", border: "1px solid rgba(229,193,88,0.3)" }}
          >
            <Sparkle size={18} weight="fill" color="#E5C158" />
          </div>
          <span className="font-heading text-xl font-bold text-white tracking-tight">Feedify</span>
        </div>
        <h2
          className="font-heading font-black text-white leading-tight tracking-tight mb-3"
          style={{ fontSize: "clamp(1.65rem, 2.5vw, 2.5rem)" }}
        >
          Konten brand yang<br />bicara sendiri.
        </h2>
        <p className="text-white/60 text-sm leading-relaxed max-w-xs">
          Dari foto produk jadi visual siap posting — konsisten, profesional, dan sesuai identitas brand.
        </p>
      </div>}

      {/* Compact mobile — logo di pojok kiri bawah */}
      {compact && (
        <div
          className="absolute bottom-0 left-0 right-0 px-5 py-4 pointer-events-none"
          style={{ background: "linear-gradient(to top, rgba(11,61,46,0.88) 0%, transparent 100%)" }}
        >
          <div className="flex items-center gap-2">
            <Sparkle size={15} weight="fill" color="#E5C158" />
            <span className="font-heading text-base font-bold text-white tracking-tight">Feedify</span>
          </div>
          <p className="text-white/55 text-[11px] mt-0.5">Konten brand yang bicara sendiri.</p>
        </div>
      )}
    </div>
  );
}

// ── Main Login Page ────────────────────────────────────────────────────────────

export default function LoginPage() {
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [loading,  setLoading]  = useState(false);
  const [gLoading, setGLoading] = useState(false);
  const { login, setUser }      = useAuth();
  const navigate                = useNavigate();
  const [searchParams]          = useSearchParams();
  const redirectTo              = searchParams.get("redirect") || null;

  const afterLoginNav = (u) => {
    if (redirectTo) return navigate(redirectTo);
    // Always land on the homepage after login — user taps "Masuk Dashboard" manually,
    // regardless of role/lifetime/onboarding status. No auto-jump into the app.
    navigate("/");
  };

  /* ── Auth handlers (UNCHANGED) ─────────────────────────────────────────── */

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const u = await login(email, password);
      toast.success("Berhasil masuk!");
      afterLoginNav(u);
    } catch (err) {
      const detail = err?.response?.data?.detail;
      if (detail === "EMAIL_NOT_VERIFIED") {
        const emailHeader = err?.response?.headers?.["x-email"] || email;
        toast.info("Email belum diverifikasi, OTP baru dikirim");
        navigate("/verify-email", { state: { email: emailHeader } });
      } else {
        toast.error(detail || "Gagal masuk");
      }
    } finally {
      setLoading(false);
    }
  };

  const googleLogin = useGoogleLogin({
    onSuccess: async ({ access_token }) => {
      setGLoading(true);
      try {
        const { data } = await api.post("/auth/google-token", { access_token });
        localStorage.setItem("feedify_token", data.token);
        localStorage.setItem("feedify_user", JSON.stringify(data.user));
        setUser(data.user);
        toast.success(`Halo, ${data.user.name.split(" ")[0]}!`);
        afterLoginNav(data.user);
      } catch {
        toast.error("Gagal masuk dengan Google. Coba lagi.");
        setGLoading(false);
      }
    },
    onError:        () => { toast.error("Login Google dibatalkan"); setGLoading(false); },
    onNonOAuthError:() => { setGLoading(false); },
  });

  /* ── Render ────────────────────────────────────────────────────────────── */

  return (
    <div className="min-h-screen flex flex-col lg:grid lg:grid-cols-2 overflow-hidden">

      {/* ── Mobile compact canvas (top hero) ──────────────────────────────── */}
      <div className="lg:hidden">
        <LivingCanvas compact />
      </div>

      {/* ── Desktop full canvas (left half) ───────────────────────────────── */}
      <div className="hidden lg:block">
        <LivingCanvas />
      </div>

      {/* ── Form area (right half) ────────────────────────────────────────── */}
      <div
        className="flex items-center justify-center p-6 sm:p-10 flex-1 lg:flex-none"
        style={{ background: "#FDFBF7" }}
      >
        <div className="w-full max-w-md">

          {/* Back + mobile logo */}
          <div className="flex items-center justify-between mb-10 animate-fade-up" style={{ animationDelay: "0ms" }}>
            <Link
              to="/"
              data-testid="back-to-home"
              className="flex items-center gap-2 text-stone-400 hover:text-brand transition-colors text-sm font-medium group"
            >
              <ArrowLeft size={16} weight="bold" className="group-hover:-translate-x-0.5 transition-transform" />
              Kembali
            </Link>
            {/* Mobile-only logo */}
            <Link to="/" className="lg:hidden flex items-center gap-2">
              <div
                className="h-8 w-8 rounded-xl flex items-center justify-center"
                style={{ background: "linear-gradient(135deg, #0B3D2E, #1A5F4A)" }}
              >
                <Sparkle size={15} weight="fill" color="#E5C158" />
              </div>
              <span className="font-heading text-lg font-bold text-brand">Feedify</span>
            </Link>
          </div>

          {/* Heading block */}
          <div className="mb-8 animate-fade-up" style={{ animationDelay: "60ms" }}>
            <div className="flex items-center gap-2 mb-2">
              <span
                className="text-xs uppercase tracking-[0.2em] text-brand-light font-semibold"
              >
                Selamat datang kembali
              </span>
              <span
                className="text-base animate-sparkle-pop inline-block"
                style={{ animationDelay: "400ms" }}
              >
                ✨
              </span>
            </div>
            <h1 className="font-heading text-3xl sm:text-4xl font-bold text-brand mb-2 tracking-tight">
              Masuk ke akun
            </h1>
            <p className="text-stone-500 text-sm leading-relaxed">
              Lanjutkan membangun konten brand yang konsisten.
            </p>
          </div>

          {/* Google button */}
          <div className="animate-fade-up" style={{ animationDelay: "120ms" }}>
            <GoogleButton onClick={googleLogin} loading={gLoading} />
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3 my-6 animate-fade-up" style={{ animationDelay: "160ms" }}>
            <div className="flex-1 h-px bg-stone-200" />
            <span className="text-xs text-stone-400 font-medium">atau dengan email</span>
            <div className="flex-1 h-px bg-stone-200" />
          </div>

          {/* Form */}
          <form onSubmit={submit} className="space-y-4" data-testid="login-form">
            {/* Email */}
            <div className="animate-fade-up" style={{ animationDelay: "200ms" }}>
              <label className="text-xs font-semibold uppercase tracking-[0.15em] text-stone-500 mb-1.5 block">
                Email
              </label>
              <div className="relative">
                <Envelope
                  size={18}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none"
                />
                <input
                  type="email"
                  required
                  data-testid="login-email-input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-11 pr-4 py-3.5 bg-white border border-brand-sand rounded-xl focus:ring-2 focus:ring-brand/25 focus:border-brand outline-none transition-all duration-200 text-sm"
                  style={{ boxShadow: "none" }}
                  onFocus={(e) => { e.target.style.boxShadow = "0 0 0 4px rgba(11,61,46,0.07)"; }}
                  onBlur={(e)  => { e.target.style.boxShadow = "none"; }}
                  placeholder="kamu@email.com"
                />
              </div>
            </div>

            {/* Password */}
            <div className="animate-fade-up" style={{ animationDelay: "250ms" }}>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold uppercase tracking-[0.15em] text-stone-500">
                  Password
                </label>
                <Link
                  to="/forgot-password"
                  data-testid={LOGIN.forgotPasswordLink}
                  className="text-xs font-semibold text-brand hover:underline transition-colors"
                >
                  Lupa password?
                </Link>
              </div>
              <PasswordInput
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                dataTestId="login-password-input"
                placeholder="Min. 6 karakter"
                autoComplete="current-password"
              />
            </div>

            {/* Submit */}
            <div className="animate-fade-up pt-1" style={{ animationDelay: "310ms" }}>
              <button
                type="submit"
                disabled={loading}
                data-testid="login-submit-button"
                className="w-full py-4 bg-brand text-brand-cream rounded-xl font-semibold hover:bg-brand-light btn-lift btn-shine inline-flex items-center justify-center gap-2 disabled:opacity-60 transition-all duration-200 shadow-md shadow-brand/20 text-sm"
              >
                {loading
                  ? "Memuat..."
                  : <><span>Masuk</span><ArrowRight size={18} weight="bold" /></>}
              </button>
            </div>
          </form>

          {/* Register link */}
          <p className="mt-7 text-center text-sm text-stone-500 animate-fade-up" style={{ animationDelay: "370ms" }}>
            Belum punya akun?{" "}
            <Link
              to="/register"
              data-testid="link-to-register"
              className="text-brand font-semibold hover:underline transition-colors"
            >
              Daftar gratis
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
