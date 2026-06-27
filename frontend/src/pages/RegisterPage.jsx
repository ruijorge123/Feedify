import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { toast } from 'react-toastify';
import { Sparkle, User, Envelope, ArrowRight, ArrowLeft } from "@phosphor-icons/react";
import { useGoogleLogin } from "@react-oauth/google";
import api from "@/lib/api";
import PasswordInput from "@/components/PasswordInput";

function GoogleButton({ onClick, loading }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      data-testid="google-register-button"
      className="w-full flex items-center justify-center gap-3 py-3.5 bg-white border border-stone-200 rounded-xl font-semibold text-stone-700 hover:bg-stone-50 hover:border-stone-300 transition-all disabled:opacity-60 shadow-sm"
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
      {loading ? "Memproses..." : "Daftar dengan Google"}
    </button>
  );
}

export default function RegisterPage() {
  const [name, setName]       = useState("");
  const [email, setEmail]     = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading]   = useState(false);
  const [gLoading, setGLoading] = useState(false);
  const { register, setUser }   = useAuth();
  const navigate = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    if (password.length < 6) { toast.error("Password minimal 6 karakter"); return; }
    setLoading(true);
    try {
      const result = await register(name, email, password);
      if (result.requires_verification) {
        toast.success("Kode OTP dikirim ke email kamu!");
        navigate("/verify-email", { state: { email: result.email } });
      } else {
        navigate("/onboarding");
      }
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Gagal mendaftar");
    } finally {
      setLoading(false);
    }
  };

  const googleRegister = useGoogleLogin({
    onSuccess: async ({ access_token }) => {
      setGLoading(true);
      try {
        const { data } = await api.post("/auth/google-token", { access_token });
        localStorage.setItem("feedify_token", data.token);
        localStorage.setItem("feedify_user", JSON.stringify(data.user));
        setUser(data.user);
        toast.success(`Halo, ${data.user.name.split(" ")[0]}! Akun berhasil dibuat.`);
        navigate(data.user.has_brand_profile ? "/dashboard" : "/onboarding");
      } catch {
        toast.error("Gagal daftar dengan Google. Coba lagi.");
      } finally {
        setGLoading(false);
      }
    },
    onError: () => toast.error("Pendaftaran Google dibatalkan"),
  });

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-brand-cream">
      <div className="hidden lg:flex relative brand-gradient items-center justify-center p-12 overflow-hidden">
        <div className="absolute top-10 right-10 w-72 h-72 rounded-full bg-brand-gold/20 blur-3xl" />
        <div className="absolute bottom-20 left-10 w-80 h-80 rounded-full bg-emerald-400/10 blur-3xl" />
        <div className="relative max-w-md text-brand-cream">
          <div className="inline-flex items-center gap-2 mb-6">
            <Sparkle size={28} weight="fill" className="text-brand-gold" />
            <span className="font-heading text-2xl font-bold">Feedify</span>
          </div>
          <h2 className="font-heading text-4xl xl:text-5xl font-bold leading-tight tracking-tight mb-4">
            Bangun brand UMKM<br />yang dikenang.
          </h2>
          <p className="text-brand-cream/85 leading-relaxed">
            Hemat waktu, hemat budget. Tidak perlu desainer — generate konten profesional kapan saja.
          </p>
          <div className="mt-8 grid grid-cols-3 gap-3">
            {["Banner", "Carousel", "Caption"].map((t) => (
              <div key={t} className="px-3 py-2 rounded-full border border-brand-cream/30 text-center text-xs uppercase tracking-wider">
                {t}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-md animate-fade-up">
          <div className="flex items-center justify-between mb-8">
            <Link to="/login" data-testid="back-to-login"
              className="flex items-center gap-2 text-stone-500 hover:text-brand transition-colors text-sm font-medium">
              <ArrowLeft size={16} weight="bold" /> Kembali
            </Link>
            <Link to="/" className="lg:hidden flex items-center gap-2">
              <div className="h-8 w-8 rounded-xl brand-gradient flex items-center justify-center">
                <Sparkle size={15} weight="fill" className="text-brand-gold" />
              </div>
              <span className="font-heading text-lg font-bold text-brand">Feedify</span>
            </Link>
          </div>

          <div className="text-xs uppercase tracking-[0.2em] text-brand-light font-semibold mb-2">Daftar Gratis</div>
          <h1 className="font-heading text-3xl sm:text-4xl font-bold text-brand mb-2 tracking-tight">Buat akun</h1>
          <p className="text-stone-600 mb-7">Mulai bangun brand profesional Anda.</p>

          <GoogleButton onClick={googleRegister} loading={gLoading} />

          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px bg-stone-200" />
            <span className="text-xs text-stone-400 font-medium">atau daftar dengan email</span>
            <div className="flex-1 h-px bg-stone-200" />
          </div>

          <form onSubmit={submit} className="space-y-4" data-testid="register-form">
            <div>
              <label className="text-xs font-semibold uppercase tracking-[0.15em] text-stone-500 mb-1.5 block">Nama</label>
              <div className="relative">
                <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" />
                <input type="text" required data-testid="register-name-input" value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-11 pr-4 py-3.5 bg-white border border-brand-sand rounded-xl focus:ring-2 focus:ring-brand-gold focus:border-brand outline-none transition-all"
                  placeholder="Nama lengkap Anda" />
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-[0.15em] text-stone-500 mb-1.5 block">Email</label>
              <div className="relative">
                <Envelope size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" />
                <input type="email" required data-testid="register-email-input" value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-11 pr-4 py-3.5 bg-white border border-brand-sand rounded-xl focus:ring-2 focus:ring-brand-gold focus:border-brand outline-none transition-all"
                  placeholder="kamu@email.com" />
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-[0.15em] text-stone-500 mb-1.5 block">Password</label>
              <PasswordInput value={password} onChange={(e) => setPassword(e.target.value)}
                dataTestId="register-password-input" placeholder="Min. 6 karakter" autoComplete="new-password" />
            </div>
            <button type="submit" disabled={loading} data-testid="register-submit-button"
              className="w-full py-4 bg-brand text-brand-cream rounded-xl font-semibold hover:bg-brand-light btn-lift inline-flex items-center justify-center gap-2 disabled:opacity-60">
              {loading ? "Memuat..." : <>Buat Akun <ArrowRight size={18} weight="bold" /></>}
            </button>
          </form>

          <p className="mt-7 text-center text-sm text-stone-600">
            Sudah punya akun?{" "}
            <Link to="/login" data-testid="link-to-login" className="text-brand font-semibold hover:underline">
              Masuk di sini
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
