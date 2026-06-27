import { useEffect, useState, useRef } from "react";
import api from "@/lib/api";
import { Wrench, ArrowsClockwise } from "@phosphor-icons/react";

export default function MaintenancePage() {
  const [message, setMessage] = useState("Feedify sedang dalam maintenance. Kami akan segera kembali.");
  const [checking, setChecking] = useState(false);
  const pollRef = useRef(null);

  const check = async () => {
    setChecking(true);
    try {
      const { data } = await api.get("/maintenance-status");
      if (data.message) setMessage(data.message);
      if (!data.enabled) {
        window.location.href = "/";
      }
    } catch {
      // tetap di halaman ini kalau gagal cek
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => {
    check();
    pollRef.current = setInterval(check, 15000);
    return () => clearInterval(pollRef.current);
  }, []);

  return (
    <div className="min-h-screen bg-brand-cream flex items-center justify-center px-4" data-testid="maintenance-page">
      <div className="w-full max-w-md text-center">
        <div className="bg-white rounded-3xl shadow-xl shadow-brand/8 border border-stone-100 p-10">
          <div className="h-16 w-16 rounded-2xl bg-brand-gold/20 border border-brand-gold/30 flex items-center justify-center mx-auto mb-6">
            <Wrench size={30} weight="duotone" className="text-brand-gold" />
          </div>
          <h1 className="font-heading text-2xl font-bold text-brand mb-3 tracking-tight">Sedang Maintenance</h1>
          <p className="text-stone-500 leading-relaxed">{message}</p>

          <button
            onClick={check}
            disabled={checking}
            data-testid="maintenance-retry-btn"
            className="mt-7 w-full py-3.5 rounded-2xl bg-brand text-brand-cream font-heading font-bold text-base flex items-center justify-center gap-2 transition-all disabled:opacity-50 hover:bg-brand-light btn-lift"
          >
            <ArrowsClockwise size={18} className={checking ? "animate-spin" : ""} />
            {checking ? "Memeriksa..." : "Cek Lagi"}
          </button>
        </div>
        <p className="text-center text-xs text-stone-400 mt-6">Halaman ini otomatis memeriksa status setiap 15 detik</p>
      </div>
    </div>
  );
}
