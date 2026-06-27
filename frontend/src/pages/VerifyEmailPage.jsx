import { useState, useRef, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import api from "@/lib/api";
import { toast } from "react-toastify";
import { EnvelopeSimple, ArrowLeft, CircleNotch, CheckCircle } from "@phosphor-icons/react";

export default function VerifyEmailPage() {
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const inputs = useRef([]);
  const navigate = useNavigate();
  const location = useLocation();
  const { loginWithToken } = useAuth();

  const email = location.state?.email || "";

  useEffect(() => {
    if (!email) { navigate("/register", { replace: true }); return; }
    inputs.current[0]?.focus();
  }, [email, navigate]);

  // Countdown timer untuk resend
  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  const handleChange = (i, val) => {
    if (!/^\d?$/.test(val)) return;
    const next = [...otp];
    next[i] = val;
    setOtp(next);
    if (val && i < 5) inputs.current[i + 1]?.focus();
  };

  const handleKeyDown = (i, e) => {
    if (e.key === "Backspace" && !otp[i] && i > 0) {
      inputs.current[i - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pasted) return;
    e.preventDefault();
    const next = [...otp];
    pasted.split("").forEach((c, i) => { next[i] = c; });
    setOtp(next);
    inputs.current[Math.min(pasted.length, 5)]?.focus();
  };

  const otpValue = otp.join("");

  const verify = async () => {
    if (otpValue.length < 6) { toast.error("Masukkan 6 digit kode OTP"); return; }
    setLoading(true);
    try {
      const { data } = await api.post("/auth/verify-otp", { email, otp: otpValue });
      await loginWithToken(data.token, data.user);
      toast.success("Email berhasil diverifikasi!");
      navigate(data.user.has_brand_profile ? "/dashboard" : "/onboarding", { replace: true });
    } catch (err) {
      const msg = err?.response?.data?.detail || "Kode OTP salah";
      toast.error(msg);
      if (msg.includes("kode baru")) setOtp(["", "", "", "", "", ""]);
    } finally {
      setLoading(false);
    }
  };

  const resend = async () => {
    if (countdown > 0) return;
    setResending(true);
    try {
      await api.post("/auth/resend-otp", { email });
      toast.success("Kode OTP baru dikirim!");
      setCountdown(60);
      setOtp(["", "", "", "", "", ""]);
      inputs.current[0]?.focus();
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Gagal kirim ulang OTP");
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen bg-brand-cream flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Card */}
        <div className="bg-white rounded-3xl shadow-xl shadow-brand/8 border border-stone-100 overflow-hidden">
          {/* Header */}
          <div className="bg-brand px-8 py-8 text-center">
            <div className="h-14 w-14 rounded-2xl bg-brand-gold/20 border border-brand-gold/30 flex items-center justify-center mx-auto mb-4">
              <EnvelopeSimple size={28} weight="fill" className="text-brand-gold" />
            </div>
            <h1 className="font-heading text-2xl font-bold text-brand-cream">Verifikasi Email</h1>
            <p className="text-brand-cream/60 text-sm mt-1">Kode OTP dikirim ke</p>
            <p className="text-brand-gold font-semibold text-sm mt-0.5 truncate px-4">{email}</p>
          </div>

          {/* Body */}
          <div className="px-8 py-8 space-y-6">
            <p className="text-center text-stone-500 text-sm leading-relaxed">
              Masukkan 6 digit kode yang dikirim ke email kamu. Kode berlaku <strong className="text-brand">15 menit</strong>.
            </p>

            {/* OTP Input */}
            <div className="flex gap-2 justify-center" onPaste={handlePaste}>
              {otp.map((digit, i) => (
                <input
                  key={i}
                  ref={el => inputs.current[i] = el}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={e => handleChange(i, e.target.value)}
                  onKeyDown={e => handleKeyDown(i, e)}
                  data-testid={`otp-input-${i}`}
                  className={`w-11 h-13 text-center text-xl font-bold rounded-xl border-2 bg-brand-sand/30 outline-none transition-all ${
                    digit ? "border-brand text-brand" : "border-stone-200 text-stone-800"
                  } focus:border-brand focus:bg-white`}
                />
              ))}
            </div>

            {/* Verify Button */}
            <button
              onClick={verify}
              disabled={loading || otpValue.length < 6}
              data-testid="verify-otp-btn"
              className="w-full py-3.5 rounded-2xl bg-brand text-brand-cream font-heading font-bold text-base flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:bg-brand-light btn-lift shadow-lg shadow-brand/20"
            >
              {loading ? (
                <><CircleNotch size={20} className="animate-spin" /> Memverifikasi...</>
              ) : (
                <><CheckCircle size={20} weight="fill" /> Verifikasi Akun</>
              )}
            </button>

            {/* Resend */}
            <div className="text-center">
              <p className="text-sm text-stone-400 mb-1">Tidak dapat kode?</p>
              <button
                onClick={resend}
                disabled={countdown > 0 || resending}
                data-testid="resend-otp-btn"
                className="text-sm font-semibold text-brand disabled:text-stone-300 disabled:cursor-not-allowed hover:underline transition-all"
              >
                {resending ? "Mengirim..." : countdown > 0 ? `Kirim ulang dalam ${countdown}s` : "Kirim Ulang Kode"}
              </button>
            </div>

            {/* Back */}
            <button
              onClick={() => navigate("/register")}
              className="w-full flex items-center justify-center gap-1.5 text-sm text-stone-400 hover:text-stone-600 transition-all"
            >
              <ArrowLeft size={14} /> Kembali ke Register
            </button>
          </div>
        </div>

        <p className="text-center text-xs text-stone-400 mt-6">
          Cek folder <strong>Spam</strong> jika email tidak masuk dalam 1 menit
        </p>
      </div>
    </div>
  );
}
