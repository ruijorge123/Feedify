import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, WhatsappLogo, SignOut, CircleNotch } from "@phosphor-icons/react";
import { useAuth } from "@/context/AuthContext";
import FeedifyLogo from "@/components/FeedifyLogo";
import { useAgencyConfig, formatRupiah, waLink } from "@/lib/agency";
import api from "@/lib/api";

/**
 * Where a deactivated client lands.
 *
 * Their data is untouched and waiting — saying so is the whole job of this page.
 * The alternative (a blank dashboard, or a 403) reads as "we deleted your
 * account", which is the opposite of the message a lapsed customer should get.
 */
export default function InactiveAccountPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const cfg = useAgencyConfig();
  const [ringkasan, setRingkasan] = useState(null);

  useEffect(() => {
    api.get("/client/overview").then(({ data }) => setRingkasan(data)).catch(() => setRingkasan(false));
  }, []);

  // An owner reactivation should not leave them stranded here.
  useEffect(() => {
    if (user && user.client_status && user.client_status !== "nonaktif") navigate("/dashboard", { replace: true });
  }, [user, navigate]);

  const wa = waLink(cfg?.whatsapp || "6281210117905",
    `Halo tim Feedify, saya ${ringkasan?.client?.nickname || user?.name || ""} mau perpanjang paket.`);
  const packages = cfg?.packages || [];

  return (
    <div className="min-h-screen bg-brand">
      <div className="mx-auto max-w-2xl px-5 py-8 sm:px-8">
        <div className="flex items-center justify-between">
          <FeedifyLogo size={32} tone="light" />
          <button
            onClick={() => { logout(); navigate("/"); }}
            className="inline-flex items-center gap-2 text-sm text-brand-cream/50 transition-colors hover:text-brand-cream"
            data-testid="nonaktif-logout"
          >
            <SignOut size={15} weight="bold" /> Keluar
          </button>
        </div>

        <div className="mt-14 text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.15em] text-brand-cream/60">
            <span className="h-2 w-2 rounded-full bg-stone-400" /> Akun tidak aktif
          </span>

          <h1 className="mt-7 font-heading text-3xl font-bold leading-tight tracking-tight text-brand-cream sm:text-4xl">
            Paketmu sudah habis
          </h1>
          <p className="mx-auto mt-4 max-w-md leading-relaxed text-brand-cream/60">
            Semua datamu masih tersimpan — Brand DNA, produk, dan riwayat pesanan.
            Begitu kamu ambil paket baru, semuanya langsung jalan lagi tanpa perlu
            mengisi ulang apa pun.
          </p>
        </div>

        {/* what is waiting for them */}
        {ringkasan === null ? (
          <div className="mt-10 flex justify-center"><CircleNotch size={22} className="animate-spin text-brand-cream/40" /></div>
        ) : ringkasan ? (
          <div className="mt-10 grid grid-cols-3 gap-3 rounded-2xl bg-white/5 p-5 ring-1 ring-white/10">
            {[
              ["Brand DNA", ringkasan.brand?.brand_name ? "Tersimpan" : "-"],
              ["Produk", `${ringkasan.products?.length || 0} produk`],
              ["Feed terakhir", `${ringkasan.client?.counter ?? 0} selesai`],
            ].map(([label, value]) => (
              <div key={label} className="text-center">
                <div className="font-heading text-sm font-bold text-brand-gold">{value}</div>
                <div className="mt-0.5 text-[11px] text-brand-cream/40">{label}</div>
              </div>
            ))}
          </div>
        ) : null}

        {/* packages */}
        {packages.length > 0 && (
          <div className="mt-10">
            <div className="text-center text-[11px] font-bold uppercase tracking-[0.15em] text-brand-cream/40">
              Ambil paket baru
            </div>
            <div className="mt-5 space-y-3">
              {packages.map((p) => (
                <Link
                  key={p.id}
                  to={`/checkout?paket=${p.id}`}
                  className="flex items-center gap-4 rounded-2xl bg-white/5 p-5 ring-1 ring-white/10 transition-all hover:-translate-y-0.5 hover:bg-white/10 hover:ring-brand-gold/40"
                  data-testid={`nonaktif-paket-${p.id}`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="font-heading font-semibold text-brand-cream">Paket {p.name}</div>
                    <div className="text-xs text-brand-cream/45">{p.feeds} feed siap posting</div>
                  </div>
                  <div className="flex-shrink-0 text-right">
                    <div className="font-heading font-bold text-brand-gold">{formatRupiah(p.price_idr)}</div>
                  </div>
                  <ArrowRight size={16} weight="bold" className="flex-shrink-0 text-brand-cream/30" />
                </Link>
              ))}
            </div>
            {/* A renewal starts a fresh count — saying it here avoids the
                "why is my counter back to zero" message later. */}
            <p className="mt-4 text-center text-xs text-brand-cream/35">
              Paket baru dimulai dari hitungan 0, bukan melanjutkan yang lama.
            </p>
          </div>
        )}

        <div className="mt-10 text-center">
          <a
            href={wa}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-full border border-brand-cream/25 px-6 py-3.5 font-semibold text-brand-cream transition-all hover:bg-white/5"
            data-testid="nonaktif-wa"
          >
            <WhatsappLogo size={16} weight="fill" /> Tanya Tim Feedify
          </a>
        </div>
      </div>
    </div>
  );
}
