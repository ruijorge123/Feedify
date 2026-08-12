import { useState, useEffect, useCallback, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Sparkle, ArrowLeft, Check, CheckCircle, Copy,
  ShieldCheck, Timer, Image as ImageIcon, UploadSimple,
  CircleNotch, WarningCircle, XCircle, ArrowClockwise,
} from "@phosphor-icons/react";
import { toast } from "react-toastify";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { copyToClipboard } from "@/lib/chatgpt";
import { fbTrack } from "@/lib/metaPixel";

function fmtRp(n) { return "Rp " + Number(n || 0).toLocaleString("id-ID"); }

function fmtCountdown(totalSeconds) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function CheckoutPage() {
  const navigate = useNavigate();
  const { user, refreshUser } = useAuth();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [secondsLeft, setSecondsLeft] = useState(null);
  const [copiedField, setCopiedField] = useState(null);
  const [proofPreview, setProofPreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [reuploading, setReuploading] = useState(false);
  const fileInputRef = useRef(null);

  const createOrder = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.post("/checkout/manual/create");
      setOrder(data);
      setProofPreview(null);
      setReuploading(false);
    } catch (err) {
      if (err.response?.status === 401) {
        toast("Silakan masuk dulu untuk melanjutkan.");
        setTimeout(() => navigate("/login?redirect=/checkout?plan=lifetime"), 1200);
      } else if (err.response?.status === 409) {
        // Already a lifetime user — no need to pay again
        toast.success("Akunmu sudah Lifetime aktif 🎉");
        setTimeout(() => navigate("/dashboard"), 1000);
      } else {
        toast.error("Gagal membuat pesanan. Coba lagi.");
      }
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    // Already have access? Skip checkout entirely.
    if (user && (user.is_lifetime || user.role === "admin")) {
      toast.success("Akunmu sudah punya akses penuh 🎉");
      navigate("/dashboard");
      return;
    }
    createOrder();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [createOrder]);

  // Countdown to expiry
  useEffect(() => {
    if (!order?.expires_at) return;
    const tick = () => {
      const diff = Math.max(0, Math.floor((new Date(order.expires_at) - new Date()) / 1000));
      setSecondsLeft(diff);
    };
    tick();
    const iv = setInterval(tick, 1000);
    return () => clearInterval(iv);
  }, [order?.expires_at]);

  // Poll ONLY while waiting for admin verification (proof already uploaded).
  // Never poll during menunggu_transfer / ditolak, or it would overwrite the
  // user's in-progress "upload ulang" state back to the server status.
  useEffect(() => {
    if (!order?.id || order.status !== "menunggu_verifikasi") return;
    const iv = setInterval(async () => {
      try {
        const { data } = await api.get(`/checkout/manual/${order.id}`);
        setOrder((prev) => (prev ? { ...prev, ...data } : prev));
      } catch { /* ignore transient poll errors */ }
    }, 5000);
    return () => clearInterval(iv);
  }, [order?.id, order?.status]);

  // On confirmed payment: refresh auth state and move into the app
  useEffect(() => {
    if (order?.status !== "lunas") return;
    // Meta Pixel: the only client-visible moment payment success actually happens —
    // approval itself is server-side (Telegram bot / Admin Panel), the browser only
    // learns about it via this page's polling picking up status: "lunas".
    // Deterministic eventID (purchase_<order.id>) + a persisted guard keyed by that same
    // order id: a page refresh or back-navigation while status is already "lunas" would
    // otherwise re-run this effect and re-fire Purchase for a payment already reported.
    const orderId = String(order.id);
    const firedKey = `feedify_purchase_fired_${orderId}`;
    if (!localStorage.getItem(firedKey)) {
      localStorage.setItem(firedKey, "1");
      // order.amount is already a plain int from the backend (base price + random
      // suffix) — Number() here is defensive, not a format fix.
      fbTrack("Purchase", { value: Number(order.amount) || 0, currency: "IDR" }, `purchase_${orderId}`);
    }
    (async () => {
      await refreshUser();
      toast.success("Lifetime aktif! Selamat datang di Feedify 🎉");
      setTimeout(() => {
        navigate(user?.has_brand_profile ? "/dashboard" : "/onboarding?topup=success");
      }, 1200);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order?.status]);

  const handleCopy = async (field, value) => {
    await copyToClipboard(String(value));
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 1500);
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("File harus berupa gambar (screenshot/foto bukti pembayaran)");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setProofPreview(reader.result);
    reader.readAsDataURL(file);
  };

  const submitProof = async () => {
    if (!proofPreview || !order?.id) return;
    setUploading(true);
    try {
      await api.post(`/checkout/manual/${order.id}/proof`, { photo_base64: proofPreview });
      setOrder((prev) => ({ ...prev, status: "menunggu_verifikasi" }));
      setReuploading(false);
      toast.success("Bukti pembayaran terkirim! Menunggu verifikasi.");
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Gagal mengirim bukti pembayaran. Coba lagi.");
    } finally {
      setUploading(false);
    }
  };

  // Timer only matters while the user still needs to transfer. Once proof is uploaded
  // (menunggu_verifikasi), paid (lunas), or rejected (ditolak), the 60-min window is irrelevant.
  const expired = order?.status === "menunggu_transfer" && secondsLeft === 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-brand-cream flex items-center justify-center">
        <CircleNotch size={28} className="animate-spin text-brand-light" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-cream">
      {/* Nav */}
      <nav className="sticky top-0 z-40 bg-white/80 backdrop-blur border-b border-brand-sand">
        <div className="max-w-2xl mx-auto px-5 py-4 flex items-center justify-between">
          <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-stone-600 hover:text-brand text-sm font-medium">
            <ArrowLeft size={16} weight="bold" /> Kembali
          </button>
          <Link to="/" className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-brand flex items-center justify-center">
              <Sparkle size={13} weight="fill" className="text-brand-gold" />
            </div>
            <span className="font-heading text-base font-bold text-brand">Feedify</span>
          </Link>
          <div className="flex items-center gap-1.5 text-xs text-stone-400">
            <ShieldCheck size={14} className="text-green-500" /> Diverifikasi Manual
          </div>
        </div>
      </nav>

      <div className="max-w-2xl mx-auto px-5 py-10 space-y-6">
        <div className="text-center sm:text-left">
          <div className="inline-flex items-center gap-1.5 mb-3 px-3 py-1 rounded-full bg-brand-gold/10 border border-brand-gold/30">
            <Sparkle size={11} weight="fill" className="text-brand-gold" />
            <span className="text-[10px] uppercase tracking-[0.18em] font-bold text-brand">Akses Selamanya</span>
          </div>
          <h1 className="font-heading font-bold text-brand text-3xl sm:text-[34px] tracking-[-0.02em] leading-[1.1]">Aktivasi Lifetime Feedify</h1>
          <p className="text-stone-500 text-sm mt-2 leading-relaxed">Scan QRIS di bawah, bayar nominal uniknya, lalu upload bukti — tim kami aktifkan akunmu.</p>
        </div>

        {/* Step 1 — QRIS scan + unique nominal */}
        <div className="bg-white rounded-3xl border border-brand-sand shadow-[0_1px_2px_rgba(11,61,46,0.04)] p-6 sm:p-7" data-testid="manual-qris-card">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2.5">
              <span className="flex-shrink-0 h-6 w-6 rounded-full bg-brand text-brand-cream text-[11px] font-bold flex items-center justify-center">1</span>
              <span className="text-xs font-bold text-brand uppercase tracking-[0.12em]">Scan &amp; Bayar QRIS</span>
            </div>
            {secondsLeft !== null && !expired && order?.status === "menunggu_transfer" && (
              <div className={`flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full tabular-nums ${secondsLeft < 300 ? "bg-red-50 text-red-500" : "bg-stone-100 text-stone-500"}`}>
                <Timer size={12} weight="bold" /> {fmtCountdown(secondsLeft)}
              </div>
            )}
          </div>

          {expired ? (
            <div className="text-center py-6">
              <WarningCircle size={32} className="text-amber-500 mx-auto mb-3" weight="fill" />
              <p className="font-semibold text-stone-700 mb-1">Waktu pembayaran sudah habis</p>
              <p className="text-sm text-stone-500 mb-4">Nominal unik-nya sudah kadaluarsa. Buat pesanan baru untuk dapat nominal yang baru.</p>
              <button onClick={createOrder} data-testid="manual-recreate-btn"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand text-brand-cream rounded-full font-semibold text-sm hover:bg-brand-light">
                <ArrowClockwise size={16} weight="bold" /> Buat Pesanan Baru
              </button>
            </div>
          ) : (
            <>
              {/* QRIS image */}
              <div className="rounded-2xl bg-white border border-stone-200 p-4 mb-5 flex justify-center">
                <img
                  src="/datapenting/qris2.jpeg"
                  alt="QRIS Feedify — scan untuk bayar"
                  className="w-full max-w-[280px] rounded-lg"
                  data-testid="qris-image"
                />
              </div>

              {/* Nominal — wajib persis */}
              <div className="relative rounded-2xl bg-white border border-brand-sand p-5 mb-3 overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-brand-gold/20 via-brand-gold to-brand-gold/20" />
                <div className="text-[10px] uppercase tracking-[0.14em] text-stone-400 font-bold mb-2">Bayar persis nominal ini</div>
                <div className="flex items-center justify-between gap-3">
                  <span className="font-heading font-extrabold text-brand text-[32px] leading-none tracking-tight tabular-nums" data-testid="manual-unique-amount">{fmtRp(order?.amount)}</span>
                  <button onClick={() => handleCopy("nominal", order?.amount)} data-testid="manual-copy-amount-btn"
                    className="flex-shrink-0 inline-flex items-center gap-1.5 h-10 pl-3.5 pr-4 rounded-full bg-brand text-brand-cream hover:bg-brand-light text-xs font-bold transition-colors">
                    {copiedField === "nominal" ? <><Check size={15} weight="bold" /> Tersalin</> : <><Copy size={15} weight="bold" /> Salin</>}
                  </button>
                </div>
              </div>

              <div className="flex items-start gap-2.5 rounded-xl bg-stone-50 border border-stone-100 p-3.5">
                <WarningCircle size={16} weight="fill" className="text-brand-gold flex-shrink-0 mt-0.5" />
                <p className="text-xs text-stone-500 leading-relaxed">
                  Scan QRIS di atas pakai aplikasi apa aja (GoPay, DANA, OVO, ShopeePay, atau m-banking), lalu masukkan nominal <b className="text-brand">persis {fmtRp(order?.amount)}</b> sampai 3 digit terakhir — jangan dibulatkan. Nominal unik ini yang bikin kami cepat mengenali pembayaranmu.
                </p>
              </div>
            </>
          )}
        </div>

        {/* Step 2 — upload proof / status */}
        {!expired && (
          <div className="bg-white rounded-3xl border border-brand-sand shadow-[0_1px_2px_rgba(11,61,46,0.04)] p-6 sm:p-7" data-testid="manual-proof-card">
            <div className="flex items-center gap-2.5 mb-6">
              <span className="flex-shrink-0 h-6 w-6 rounded-full bg-brand text-brand-cream text-[11px] font-bold flex items-center justify-center">2</span>
              <span className="text-xs font-bold text-brand uppercase tracking-[0.12em]">Bukti Pembayaran</span>
            </div>

            {order?.status === "lunas" ? (
              <div className="text-center py-4">
                <CheckCircle size={40} weight="fill" className="text-green-500 mx-auto mb-3" />
                <p className="font-heading font-bold text-brand text-lg">Pembayaran dikonfirmasi!</p>
                <p className="text-sm text-stone-500 mt-1">Lifetime kamu aktif. Mengalihkan ke dashboard...</p>
              </div>
            ) : order?.status === "ditolak" && !reuploading ? (
              <div className="text-center py-4">
                <XCircle size={40} weight="fill" className="text-red-400 mx-auto mb-3" />
                <p className="font-heading font-bold text-brand text-lg">Bukti pembayaran ditolak</p>
                <p className="text-sm text-stone-500 mt-1 mb-4">Kemungkinan foto kurang jelas atau nominal tidak sesuai. Upload ulang bukti pembayaran yang benar.</p>
                <button onClick={() => setReuploading(true)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand text-brand-cream rounded-full font-semibold text-sm hover:bg-brand-light">
                  <ArrowClockwise size={16} weight="bold" /> Upload Ulang
                </button>
              </div>
            ) : order?.status === "menunggu_verifikasi" ? (
              <div className="text-center py-4">
                {proofPreview && (
                  <img src={proofPreview} alt="Bukti pembayaran" className="max-h-40 mx-auto rounded-xl border border-stone-200 mb-4 object-contain" />
                )}
                <CircleNotch size={24} className="animate-spin text-brand-light mx-auto mb-3" />
                <p className="font-semibold text-stone-700">Bukti pembayaran sedang diverifikasi</p>
                <p className="text-sm text-stone-500 mt-1 mb-5">Biasanya selesai dalam beberapa menit. Kamu bisa tinggalkan halaman ini — status "Menunggu Konfirmasi" akan tetap muncul di halaman utama.</p>
                <Link to="/" data-testid="manual-back-home-btn"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border-2 border-stone-200 text-stone-600 text-sm font-semibold hover:border-brand hover:text-brand transition-colors">
                  <ArrowLeft size={15} weight="bold" /> Kembali ke Beranda
                </Link>
              </div>
            ) : (
              <>
                {proofPreview ? (
                  <div className="space-y-4">
                    <div className="relative rounded-2xl overflow-hidden border-2 border-brand/20">
                      <img src={proofPreview} alt="Preview bukti pembayaran" className="w-full max-h-64 object-contain bg-stone-50" />
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => fileInputRef.current?.click()}
                        className="flex-1 py-2.5 rounded-full border-2 border-stone-200 text-stone-600 text-sm font-semibold hover:border-brand hover:text-brand">
                        Ganti Foto
                      </button>
                      <button onClick={submitProof} disabled={uploading} data-testid="manual-submit-proof-btn"
                        className="flex-1 py-2.5 rounded-full bg-brand text-brand-cream text-sm font-bold hover:bg-brand-light disabled:opacity-60 inline-flex items-center justify-center gap-2">
                        {uploading ? <><CircleNotch size={15} className="animate-spin" /> Mengirim...</> : "Kirim Bukti Pembayaran"}
                      </button>
                    </div>
                  </div>
                ) : (
                  <label htmlFor="proof-upload" data-testid="manual-upload-dropzone"
                    className="block cursor-pointer border-2 border-dashed border-brand-gold/50 bg-brand-gold/5 rounded-2xl p-9 text-center hover:border-brand-gold hover:bg-brand-gold/10 transition-colors">
                    <div className="h-12 w-12 rounded-full bg-brand-gold/15 flex items-center justify-center mx-auto mb-3">
                      <UploadSimple size={22} className="text-brand-gold" weight="duotone" />
                    </div>
                    <div className="font-bold text-brand text-sm">Upload Bukti Pembayaran</div>
                    <div className="text-xs text-stone-400 mt-1">Screenshot atau foto struk transfer</div>
                  </label>
                )}
                <input ref={fileInputRef} id="proof-upload" type="file" accept="image/png,image/jpeg,image/webp"
                  className="hidden" onChange={handleFileChange} data-testid="manual-upload-input" />
              </>
            )}
          </div>
        )}

        {/* Trust footer */}
        <div className="flex items-center justify-center gap-x-5 gap-y-2 flex-wrap px-2 pt-1">
          <div className="flex items-center gap-1.5 text-xs text-stone-500">
            <ShieldCheck size={15} className="text-green-500" /> Bayar via QRIS
          </div>
          <span className="h-3 w-px bg-stone-200 hidden sm:block" />
          <div className="flex items-center gap-1.5 text-xs text-stone-500">
            <ImageIcon size={15} className="text-brand-gold" weight="duotone" /> Verifikasi bukti pembayaran
          </div>
          <span className="h-3 w-px bg-stone-200 hidden sm:block" />
          <div className="flex items-center gap-1.5 text-xs text-stone-500">
            <Sparkle size={15} weight="fill" className="text-brand-gold" /> Aktif otomatis setelah dikonfirmasi
          </div>
        </div>
      </div>
    </div>
  );
}
