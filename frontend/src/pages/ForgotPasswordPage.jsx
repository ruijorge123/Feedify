import { useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "@/lib/api";
import { toast } from "react-toastify";
import { Lock, EnvelopeSimple, ArrowLeft, CircleNotch, CheckCircle } from "@phosphor-icons/react";
import { FORGOT_PASSWORD } from "@/constants/testIds/auth";
import PasswordInput from "@/components/PasswordInput";

export default function ForgotPasswordPage() {
  const [step, setStep] = useState("email"); // "email" | "reset"
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const inputs = useRef([]);
  const navigate = useNavigate();

  const otpValue = otp.join("");

  const handleChange = (i, val) => {
    if (!/^\d?$/.test(val)) return;
    const next = [...otp];
    next[i] = val;
    setOtp(next);
    if (val && i < 5) inputs.current[i + 1]?.focus();
  };

  const handleKeyDown = (i, e) => {
    if (e.key === "Backspace" && !otp[i] && i > 0) inputs.current[i - 1]?.focus();
  };

  const requestOtp = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post("/auth/forgot-password", { email: email.toLowerCase().trim() });
      toast.success("Kode OTP dikirim jika email terdaftar");
      setStep("reset");
      setTimeout(() => inputs.current[0]?.focus(), 50);
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Gagal mengirim OTP");
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (e) => {
    e.preventDefault();
    if (otpValue.length < 6) { toast.error("Masukkan 6 digit kode OTP"); return; }
    if (newPassword.length < 6) { toast.error("Password minimal 6 karakter"); return; }
    if (newPassword !== confirmPassword) { toast.error("Konfirmasi password tidak cocok"); return; }
    setLoading(true);
    try {
      await api.post("/auth/reset-password", {
        email: email.toLowerCase().trim(),
        otp: otpValue,
        new_password: newPassword,
      });
      toast.success("Password berhasil diganti, silakan masuk");
      navigate("/login", { replace: true });
    } catch (err) {
      const msg = err?.response?.data?.detail || "Gagal mengganti password";
      toast.error(msg);
      if (msg.includes("kode baru")) setOtp(["", "", "", "", "", ""]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-brand-cream flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-3xl shadow-xl shadow-brand/8 border border-stone-100 overflow-hidden">
          <div className="bg-brand px-8 py-8 text-center">
            <div className="h-14 w-14 rounded-2xl bg-brand-gold/20 border border-brand-gold/30 flex items-center justify-center mx-auto mb-4">
              {step === "email" ? (
                <EnvelopeSimple size={28} weight="fill" className="text-brand-gold" />
              ) : (
                <Lock size={28} weight="fill" className="text-brand-gold" />
              )}
            </div>
            <h1 className="font-heading text-2xl font-bold text-brand-cream">Lupa Password</h1>
            <p className="text-brand-cream/60 text-sm mt-1">
              {step === "email" ? "Masukkan email akun kamu" : "Masukkan kode OTP & password baru"}
            </p>
          </div>

          <div className="px-8 py-8 space-y-6">
            {step === "email" ? (
              <form onSubmit={requestOtp} className="space-y-5" data-testid="forgot-password-form">
                <div>
                  <label className="text-xs font-semibold uppercase tracking-[0.15em] text-stone-500 mb-1.5 block">Email</label>
                  <div className="relative">
                    <EnvelopeSimple size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" />
                    <input type="email" required value={email} data-testid={FORGOT_PASSWORD.emailInput}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-11 pr-4 py-3.5 bg-white border border-brand-sand rounded-xl focus:ring-2 focus:ring-brand-gold focus:border-brand outline-none transition-all"
                      placeholder="kamu@email.com" />
                  </div>
                </div>
                <button type="submit" disabled={loading} data-testid={FORGOT_PASSWORD.requestSubmitButton}
                  className="w-full py-3.5 rounded-2xl bg-brand text-brand-cream font-heading font-bold text-base flex items-center justify-center gap-2 transition-all disabled:opacity-50 hover:bg-brand-light btn-lift shadow-lg shadow-brand/20">
                  {loading ? <><CircleNotch size={20} className="animate-spin" /> Mengirim...</> : "Kirim Kode OTP"}
                </button>
              </form>
            ) : (
              <form onSubmit={resetPassword} className="space-y-5" data-testid="reset-password-form">
                <p className="text-center text-stone-500 text-sm leading-relaxed">
                  Kode OTP dikirim ke <strong className="text-brand">{email}</strong>, berlaku <strong className="text-brand">15 menit</strong>.
                </p>

                <div className="flex gap-2 justify-center">
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
                      data-testid={`${FORGOT_PASSWORD.otpInput}-${i}`}
                      className={`w-11 h-13 text-center text-xl font-bold rounded-xl border-2 bg-brand-sand/30 outline-none transition-all ${
                        digit ? "border-brand text-brand" : "border-stone-200 text-stone-800"
                      } focus:border-brand focus:bg-white`}
                    />
                  ))}
                </div>

                <div>
                  <label className="text-xs font-semibold uppercase tracking-[0.15em] text-stone-500 mb-1.5 block">Password Baru</label>
                  <PasswordInput value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
                    dataTestId={FORGOT_PASSWORD.newPasswordInput} placeholder="Min. 6 karakter" autoComplete="new-password" />
                </div>

                <div>
                  <label className="text-xs font-semibold uppercase tracking-[0.15em] text-stone-500 mb-1.5 block">Konfirmasi Password</label>
                  <PasswordInput value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Ulangi password baru" autoComplete="new-password" />
                </div>

                <button type="submit" disabled={loading} data-testid={FORGOT_PASSWORD.resetSubmitButton}
                  className="w-full py-3.5 rounded-2xl bg-brand text-brand-cream font-heading font-bold text-base flex items-center justify-center gap-2 transition-all disabled:opacity-50 hover:bg-brand-light btn-lift shadow-lg shadow-brand/20">
                  {loading ? <><CircleNotch size={20} className="animate-spin" /> Memproses...</> : <><CheckCircle size={20} weight="fill" /> Ganti Password</>}
                </button>
              </form>
            )}

            <Link to="/login" data-testid={FORGOT_PASSWORD.backToLoginLink}
              className="w-full flex items-center justify-center gap-1.5 text-sm text-stone-400 hover:text-stone-600 transition-all">
              <ArrowLeft size={14} /> Kembali ke Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
