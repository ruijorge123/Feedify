import { useState, useEffect } from "react";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { toast } from "react-toastify";
import { LockKey, ShieldCheck, CircleNotch } from "@phosphor-icons/react";
import { ADMIN_PIN } from "@/constants/testIds/auth";

function sessionKey(userId) {
  return `feedify_admin_pin_ok_${userId}`;
}

export default function AdminPinGate({ children }) {
  const { user } = useAuth();
  const [status, setStatus] = useState("loading"); // loading | unlocked | needs_setup | needs_pin
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!user) return;
    if (sessionStorage.getItem(sessionKey(user.id)) === "1") {
      setStatus("unlocked");
      return;
    }
    api.get("/admin/pin/status")
      .then(({ data }) => setStatus(data.has_pin ? "needs_pin" : "needs_setup"))
      .catch(() => setStatus("needs_pin"));
  }, [user]);

  const setup = async (e) => {
    e.preventDefault();
    if (!/^\d{6}$/.test(pin)) { toast.error("PIN harus 6 digit angka"); return; }
    if (pin !== confirmPin) { toast.error("Konfirmasi PIN tidak cocok"); return; }
    setSubmitting(true);
    try {
      await api.post("/admin/pin/setup", { pin });
      sessionStorage.setItem(sessionKey(user.id), "1");
      toast.success("PIN admin berhasil dibuat");
      setStatus("unlocked");
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Gagal membuat PIN");
    } finally {
      setSubmitting(false);
    }
  };

  const verify = async (e) => {
    e.preventDefault();
    if (!/^\d{6}$/.test(pin)) { toast.error("PIN harus 6 digit angka"); return; }
    setSubmitting(true);
    try {
      await api.post("/admin/pin/verify", { pin });
      sessionStorage.setItem(sessionKey(user.id), "1");
      setStatus("unlocked");
    } catch (err) {
      toast.error(err?.response?.data?.detail || "PIN salah");
      setPin("");
    } finally {
      setSubmitting(false);
    }
  };

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-brand-cream">
        <CircleNotch size={28} className="animate-spin text-brand" />
      </div>
    );
  }

  if (status === "unlocked") return children;

  const isSetup = status === "needs_setup";

  return (
    <div className="flex min-h-screen items-center justify-center bg-brand-cream px-4" data-testid="admin-pin-gate">
      <div className="w-full max-w-sm bg-white rounded-3xl shadow-xl shadow-brand/8 border border-stone-100 p-8 text-center">
        <div className="h-14 w-14 rounded-2xl bg-brand-gold/20 border border-brand-gold/30 flex items-center justify-center mx-auto mb-4">
          {isSetup
            ? <ShieldCheck size={28} weight="fill" className="text-brand-gold" />
            : <LockKey size={28} weight="fill" className="text-brand-gold" />}
        </div>
        <h1 className="font-heading text-xl font-bold text-brand mb-1">
          {isSetup ? "Buat PIN Admin" : "Masukkan PIN Admin"}
        </h1>
        <p className="text-stone-500 text-sm mb-6">
          {isSetup
            ? "Lindungi panel admin dengan PIN 6 digit. Hanya kamu yang tahu PIN ini."
            : "Masukkan PIN admin untuk membuka panel admin."}
        </p>

        <form onSubmit={isSetup ? setup : verify} className="space-y-4">
          <input type="password" inputMode="numeric" maxLength={6} value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
            data-testid={ADMIN_PIN.input}
            className="w-full text-center text-2xl tracking-[0.5em] py-3 bg-brand-sand/30 border-2 border-stone-200 rounded-xl focus:border-brand outline-none transition-all"
            placeholder="••••••" autoFocus />

          {isSetup && (
            <input type="password" inputMode="numeric" maxLength={6} value={confirmPin}
              onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ""))}
              className="w-full text-center text-2xl tracking-[0.5em] py-3 bg-brand-sand/30 border-2 border-stone-200 rounded-xl focus:border-brand outline-none transition-all"
              placeholder="Ulangi PIN" />
          )}

          <button type="submit" disabled={submitting}
            data-testid={isSetup ? ADMIN_PIN.setupSubmitButton : ADMIN_PIN.verifySubmitButton}
            className="w-full py-3.5 rounded-2xl bg-brand text-brand-cream font-heading font-bold text-base flex items-center justify-center gap-2 transition-all disabled:opacity-50 hover:bg-brand-light btn-lift shadow-lg shadow-brand/20">
            {submitting ? <CircleNotch size={20} className="animate-spin" /> : isSetup ? "Buat PIN" : "Masuk"}
          </button>
        </form>
      </div>
    </div>
  );
}
