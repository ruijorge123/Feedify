import { useState, useEffect } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import {
  Sparkle, ArrowLeft, Check, CheckCircle,
  CreditCard, Lock, Lightning, ShieldCheck,
} from "@phosphor-icons/react";
import { toast } from 'react-toastify';
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { notifyCreditsUpdate } from "@/lib/credits";

const CREDIT_PKGS = {
  starter:   { name: "Coba Dulu",    credits: 10,  price: 15000,  savings: 0 },
  monthly:   { name: "1 Bulan Full", credits: 30,  price: 40000,  savings: 5000,   popular: true },
  bimonthly: { name: "2 Bulan Full", credits: 60,  price: 79000,  savings: 11000 },
  pro:       { name: "Pro Pack",     credits: 300, price: 350000, savings: 100000 },
};


function fmtRp(n) { return "Rp " + n.toLocaleString("id-ID"); }

function calcFinalPrice(price, voucher) {
  if (!voucher) return price;
  if (voucher.type === "percent") return Math.round(price * (1 - voucher.value / 100));
  return Math.max(0, price - voucher.value);
}

export default function CheckoutPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const pkgId = params.get("plan") || "monthly";
  const pkg = CREDIT_PKGS[pkgId] || CREDIT_PKGS.monthly;

  const urlVoucher = params.get("voucher") || "";

  const [appliedVoucher, setApplied]  = useState(null);
  const [processing, setProcessing]   = useState(false);

  // Auto-apply voucher from URL (passed from pricing page)
  useEffect(() => {
    if (!urlVoucher) return;
    api.post("/vouchers/validate", { code: urlVoucher.toUpperCase() })
      .then(({ data }) => setApplied({ ...data, code: urlVoucher.toUpperCase() }))
      .catch(() => {});
  }, [urlVoucher]);

  const finalPrice = calcFinalPrice(pkg.price, appliedVoucher);
  const finalPerCredit = Math.round(finalPrice / pkg.credits);

  const handlePayment = async () => {
    setProcessing(true);
    try {
      const { data } = await api.post("/credits/purchase", {
        package_id: pkgId,
        voucher_code: appliedVoucher?.code || null,
      });

      if (data.dev_mode) {
        notifyCreditsUpdate({ balance: data.new_balance, credits_remaining: data.new_balance });
        toast.success(`${data.credits_added} kredit berhasil ditambahkan!`);
        navigate(user?.has_brand_profile ? `/dashboard?credits_added=${data.credits_added}` : '/onboarding?topup=success');
        return;
      }

      if (data.payment_url) {
        window.location.href = data.payment_url;
      } else {
        toast.error("Gagal membuat link pembayaran. Coba lagi.");
      }
    } catch (err) {
      if (err.response?.status === 401) {
        toast("Silakan masuk dulu untuk melanjutkan pembayaran.");
        setTimeout(() => navigate(`/login?redirect=/checkout?plan=${pkgId}`), 1500);
      } else {
        toast.error("Terjadi kesalahan. Hubungi support jika berlanjut.");
      }
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-brand-cream">
      {/* Nav */}
      <nav className="sticky top-0 z-40 bg-white/80 backdrop-blur border-b border-brand-sand">
        <div className="max-w-[1280px] mx-auto px-5 lg:px-10 py-4 flex items-center justify-between">
          <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-stone-600 hover:text-brand text-sm font-medium">
            <ArrowLeft size={16} weight="bold" /> Kembali
          </button>
          <Link to="/" className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-brand flex items-center justify-center">
              <Sparkle size={13} weight="fill" className="text-brand-gold" />
            </div>
            <span className="font-heading text-base font-bold text-brand">Feedify</span>
          </Link>
          <div className="flex items-center gap-2 text-xs text-stone-400">
            <ShieldCheck size={14} className="text-green-500" /> Pembayaran Aman
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-5 lg:px-10 py-10">
        <h1 className="font-heading font-bold text-brand text-3xl mb-8 tracking-[-0.02em]">Beli Kredit</h1>

        <div className="grid lg:grid-cols-[1fr_360px] gap-6 items-start">
          {/* Left: details */}
          <div className="space-y-5">
            {/* Package summary */}
            <div className="bg-white rounded-3xl border border-brand-sand p-6">
              <div className="text-[10px] uppercase tracking-[0.2em] font-bold text-brand-light mb-4">Paket yang dipilih</div>
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-heading text-2xl font-bold text-brand">{pkg.name}</span>
                    {pkg.popular && (
                      <span className="text-[9px] uppercase tracking-[0.15em] font-bold px-2 py-0.5 rounded-full bg-brand-gold text-brand">Populer</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <Lightning size={22} weight="fill" className="text-brand-gold" />
                    <span className="font-heading text-4xl font-bold text-brand-gold">{pkg.credits}</span>
                    <span className="text-stone-500 text-sm">kredit · tidak expired</span>
                  </div>
                  {pkg.savings > 0 && (
                    <div className="text-xs text-green-600 font-medium mt-1">Hemat {fmtRp(pkg.savings)} dari harga normal</div>
                  )}
                </div>
                <div className="text-right">
                  <div className="font-heading text-2xl font-bold text-brand">{fmtRp(pkg.price)}</div>
                </div>
              </div>
              <button onClick={() => navigate(-1)} className="mt-3 inline-flex items-center gap-1 text-xs text-brand-light hover:text-brand font-medium">
                Ganti paket →
              </button>
            </div>

            {/* How credits work */}
            <div className="bg-white rounded-3xl border border-brand-sand p-6">
              <div className="text-[10px] uppercase tracking-[0.2em] font-bold text-brand-light mb-4">Cara kerja kredit</div>
              <div className="space-y-2.5 text-sm text-stone-700">
                {[
                  "1 kredit = 1 foto siap posting (Feed Post, Carousel, F&B, Marketplace)",
                  "30 kredit = 30 foto = 1 bulan konten IG tanpa bolong",
                  "Copywriting & Calendar Planner gratis, tidak pakai kredit",
                  "Kredit tidak expired — tidak ada biaya bulanan, beli sekali pakai kapan saja",
                  "Kredit bertambah otomatis setelah pembayaran dikonfirmasi",
                ].map((t, i) => (
                  <div key={i} className="flex items-start gap-2.5">
                    <span className="flex-shrink-0 h-5 w-5 rounded-full bg-brand-gold/20 flex items-center justify-center mt-0.5">
                      <Check size={10} weight="bold" className="text-brand" />
                    </span>
                    {t}
                  </div>
                ))}
              </div>
            </div>

            {/* Voucher applied badge — only shown if came from pricing with a code */}
            {appliedVoucher && (
              <div className="flex items-center gap-3 px-5 py-4 rounded-3xl bg-green-50 border border-green-200">
                <CheckCircle size={20} weight="fill" className="text-green-500 flex-shrink-0" />
                <div>
                  <div className="font-mono font-bold text-green-700 text-sm tracking-wider">{appliedVoucher.code}</div>
                  <div className="text-xs text-green-600">{appliedVoucher.label} · sudah diterapkan otomatis</div>
                </div>
              </div>
            )}

            {/* Payment methods */}
            <div className="bg-white rounded-3xl border border-brand-sand p-6">
              <div className="text-[10px] uppercase tracking-[0.2em] font-bold text-brand-light mb-5 flex items-center gap-1.5">
                <CreditCard size={11} /> Metode Pembayaran
              </div>

              <div className="flex flex-wrap gap-2 mb-5">
                {["BCA", "DANA", "OVO", "SeaBank", "Superbank", "QRIS"].map(m => (
                  <div key={m} className="px-3 py-1.5 rounded-lg border border-stone-200 bg-stone-50 text-xs font-bold text-stone-600 tracking-wide">{m}</div>
                ))}
              </div>

              <div className="flex items-center gap-3 pt-4 border-t border-stone-100">
                <ShieldCheck size={14} className="text-green-500 flex-shrink-0" />
                <span className="text-xs text-stone-400">Diproses via <span className="font-semibold text-stone-500">Xendit</span> · SSL Encrypted · PCI DSS Level 1</span>
              </div>
            </div>
          </div>

          {/* Right: order summary + CTA */}
          <div className="lg:sticky lg:top-24 space-y-4">
            <div className="bg-white rounded-3xl border border-brand-sand p-6 shadow-lg shadow-brand/5">
              <div className="text-[10px] uppercase tracking-[0.2em] font-bold text-brand-light mb-5">Ringkasan Pesanan</div>

              <div className="space-y-3 text-sm">
                <div className="flex justify-between text-stone-700">
                  <span>{pkg.name}</span>
                  <span className="font-medium">{fmtRp(pkg.price)}</span>
                </div>
                <div className="flex justify-between text-stone-700">
                  <span>Kredit</span>
                  <span className="font-medium flex items-center gap-1"><Lightning size={11} weight="fill" className="text-brand-gold" />{pkg.credits}</span>
                </div>
                {appliedVoucher && (
                  <div className="flex justify-between text-green-600">
                    <span>Diskon ({appliedVoucher.code})</span>
                    <span>−{fmtRp(pkg.price - finalPrice)}</span>
                  </div>
                )}
              </div>

              <div className="border-t border-stone-100 mt-4 pt-4">
                <div className="flex justify-between items-baseline mb-1">
                  <span className="font-bold text-brand">Total</span>
                  <div className="text-right">
                    {appliedVoucher && <div className="text-xs text-stone-400 line-through">{fmtRp(pkg.price)}</div>}
                    <span className="font-heading font-bold text-2xl text-brand">{fmtRp(finalPrice)}</span>
                  </div>
                </div>
                <div className="text-xs text-stone-500 text-right">{fmtRp(finalPerCredit)} / kredit</div>
              </div>

              <button onClick={handlePayment} disabled={processing} data-testid="pay-button"
                className="mt-6 w-full py-4 bg-brand-gold text-brand rounded-full font-bold text-base hover:bg-brand-amber disabled:opacity-60 disabled:cursor-not-allowed btn-lift shadow-lg shadow-brand-gold/20 flex items-center justify-center gap-2">
                {processing ? (
                  <><span className="animate-spin h-4 w-4 border-2 border-brand border-t-transparent rounded-full" /> Memproses...</>
                ) : (
                  <><Lightning size={18} weight="fill" /> Bayar {fmtRp(finalPrice)}</>
                )}
              </button>
              <p className="text-center text-xs text-stone-500 mt-3">
                Kredit ditambahkan otomatis setelah pembayaran dikonfirmasi.
              </p>
            </div>

            {/* Trust */}
            <div className="flex items-center justify-center gap-4 flex-wrap px-2">
              <div className="flex items-center gap-1.5 text-xs text-stone-500">
                <ShieldCheck size={14} className="text-green-500" /> SSL Secure
              </div>
              <div className="flex items-center gap-1.5 text-xs text-stone-500">
                <Lightning size={14} weight="fill" className="text-brand-gold" /> Tidak Expired
              </div>
              <div className="flex items-center gap-1.5 text-xs text-stone-500">
                <Lock size={14} className="text-green-500" /> Xendit
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
