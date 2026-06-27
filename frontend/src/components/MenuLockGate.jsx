import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "@/lib/api";
import { Wrench, CircleNotch } from "@phosphor-icons/react";

export default function MenuLockGate({ menuKey, children }) {
  const [status, setStatus] = useState("loading"); // loading | open | maintenance
  const navigate = useNavigate();

  useEffect(() => {
    let active = true;
    setStatus("loading");
    api.get("/menu-lockdown-status")
      .then(({ data }) => {
        if (!active) return;
        const mode = data[menuKey]?.mode || "active";
        if (mode === "hidden") {
          navigate("/dashboard", { replace: true });
        } else if (mode === "maintenance") {
          setStatus("maintenance");
        } else {
          setStatus("open");
        }
      })
      .catch(() => { if (active) setStatus("open"); });
    return () => { active = false; };
  }, [menuKey, navigate]);

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <CircleNotch size={28} className="animate-spin text-brand" />
      </div>
    );
  }

  if (status === "open") return children;

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center" data-testid="menu-lock-gate">
      <div className="h-16 w-16 rounded-2xl bg-brand-gold/20 border border-brand-gold/30 flex items-center justify-center mb-5">
        <Wrench size={28} weight="duotone" className="text-brand-gold" />
      </div>
      <h2 className="font-heading text-xl font-bold text-brand mb-2">Menu Sedang Maintenance</h2>
      <p className="text-stone-500 max-w-sm">Menu ini sedang maintenance. Coba lagi nanti.</p>
    </div>
  );
}
