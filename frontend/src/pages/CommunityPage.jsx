import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import api from "@/lib/api";
import { toast } from "react-toastify";
import {
  WhatsappLogo, CheckCircle, Circle, Copy, Check,
  ArrowSquareOut, Users, Tag, Sparkle, Lock,
  CaretRight, CircleNotch, Phone,
} from "@phosphor-icons/react";

export default function CommunityPage() {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [joining, setJoining] = useState(false);

  const fetchStatus = useCallback(async () => {
    try {
      const { data } = await api.get("/community/status");
      setStatus(data);
    } catch {}
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  // Poll every 5 seconds until verified
  useEffect(() => {
    if (status?.community_verified) return;
    const interval = setInterval(fetchStatus, 5000);
    return () => clearInterval(interval);
  }, [status?.community_verified, fetchStatus]);

  const handleJoin = () => {
    setJoining(true);
    window.open(status?.community_link, "_blank");
    setTimeout(() => setJoining(false), 3000);
  };

  const copyVoucher = () => {
    if (!status?.voucher_code) return;
    navigator.clipboard.writeText(status.voucher_code);
    setCopied(true);
    toast.success("Kode voucher disalin!");
    setTimeout(() => setCopied(false), 2000);
  };

  const step1Done = status?.has_wa_number;
  const step2Done = status?.community_verified;
  const allDone = step1Done && step2Done;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <CircleNotch size={28} className="animate-spin text-brand-light" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-xl mx-auto" data-testid="community-page">
      {/* Header */}
      <div className="animate-fade-up">
        <div className="text-xs uppercase tracking-[0.2em] text-brand-light font-semibold mb-2">Eksklusif</div>
        <h1 className="font-heading text-3xl sm:text-4xl font-bold text-brand tracking-tight">Komunitas UMKM Feedify</h1>
        <p className="text-stone-600 mt-2">Bergabung ke komunitas WhatsApp kami dan dapatkan voucher diskon <strong>5%</strong> untuk semua paket Feedify.</p>
      </div>

      {/* Benefits */}
      <div className="grid grid-cols-3 gap-3 animate-fade-up">
        {[
          { icon: Users, label: "Tips & trik dari sesama UMKM" },
          { icon: Sparkle, label: "Update fitur Feedify pertama" },
          { icon: Tag, label: "Voucher diskon eksklusif" },
        ].map(({ icon: Icon, label }) => (
          <div key={label} className="feedify-card p-3 text-center">
            <Icon size={22} weight="duotone" className="text-brand-gold mx-auto mb-1.5" />
            <div className="text-[11px] text-stone-600 leading-tight">{label}</div>
          </div>
        ))}
      </div>

      {/* Steps card */}
      <div className="feedify-card p-6 space-y-5 animate-fade-up">
        <div className="font-heading font-bold text-brand text-lg">Langkah untuk klaim voucher</div>

        {/* Step 1 */}
        <div className={`rounded-2xl border-2 p-4 transition-all ${step1Done ? "border-green-200 bg-green-50" : "border-brand-sand bg-white"}`}>
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 mt-0.5">
              {step1Done
                ? <CheckCircle size={22} weight="fill" className="text-green-500" />
                : <Circle size={22} weight="regular" className="text-stone-300" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-widest text-stone-400">Langkah 1</span>
              </div>
              <div className="font-semibold text-brand mt-0.5">Simpan nomor WhatsApp kamu</div>
              {step1Done ? (
                <div className="flex items-center gap-1.5 mt-1.5">
                  <Phone size={13} weight="fill" className="text-green-500" />
                  <span className="text-xs text-green-600 font-medium">{status.whatsapp_phone}</span>
                </div>
              ) : (
                <div className="mt-2.5 space-y-2">
                  <p className="text-xs text-stone-500">Nomor WA digunakan untuk verifikasi keanggotaan komunitas secara otomatis.</p>
                  <Link
                    to="/settings"
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-brand text-brand-cream rounded-full text-xs font-semibold hover:bg-brand-light btn-touch"
                    data-testid="save-wa-link"
                  >
                    <Phone size={13} weight="fill" /> Update Nomor WA
                    <CaretRight size={11} weight="bold" />
                  </Link>
                  <p className="text-[10px] text-stone-400">Settings → bagian notifikasi</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Step 2 */}
        <div className={`rounded-2xl border-2 p-4 transition-all ${step2Done ? "border-green-200 bg-green-50" : step1Done ? "border-brand bg-brand/5" : "border-brand-sand bg-stone-50 opacity-60"}`}>
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 mt-0.5">
              {step2Done
                ? <CheckCircle size={22} weight="fill" className="text-green-500" />
                : <Circle size={22} weight="regular" className={step1Done ? "text-brand" : "text-stone-300"} />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[10px] font-bold uppercase tracking-widest text-stone-400">Langkah 2</div>
              <div className="font-semibold text-brand mt-0.5">Bergabung ke komunitas WhatsApp</div>
              {step2Done ? (
                <div className="flex items-center gap-1.5 mt-1.5">
                  <WhatsappLogo size={13} weight="fill" className="text-green-500" />
                  <span className="text-xs text-green-600 font-medium">Kamu sudah tergabung di komunitas!</span>
                </div>
              ) : step1Done ? (
                <div className="mt-2.5 space-y-3">
                  <button
                    onClick={handleJoin}
                    disabled={joining}
                    data-testid="join-community-btn"
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#25D366] text-white rounded-full text-sm font-semibold hover:bg-[#1db954] disabled:opacity-70 btn-touch"
                  >
                    {joining
                      ? <CircleNotch size={14} className="animate-spin" />
                      : <WhatsappLogo size={14} weight="fill" />}
                    Gabung Komunitas
                    <ArrowSquareOut size={12} />
                  </button>
                  <div className="bg-brand-sand/50 rounded-xl p-3 text-xs text-stone-600 space-y-1">
                    <div className="font-semibold text-brand">Setelah bergabung:</div>
                    <div>Perkenalkan diri kamu dengan kirim pesan di grup — verifikasi akan otomatis dalam beberapa detik.</div>
                    <div className="flex items-center gap-1.5 mt-1.5">
                      <CircleNotch size={11} className="animate-spin text-brand-light" />
                      <span className="text-stone-400">Menunggu verifikasi...</span>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-stone-400 mt-1">Selesaikan langkah 1 terlebih dahulu.</p>
              )}
            </div>
          </div>
        </div>

        {/* Voucher reveal */}
        <div className={`rounded-2xl border-2 p-5 transition-all duration-500 ${allDone ? "border-brand-gold bg-brand-gold/10" : "border-stone-100 bg-stone-50"}`}>
          <div className="text-center space-y-3">
            {allDone ? (
              <>
                <div className="flex items-center justify-center gap-2 text-brand-gold">
                  <Tag size={20} weight="fill" />
                  <span className="text-xs font-bold uppercase tracking-[0.2em]">Kode Voucher Kamu</span>
                </div>
                <div className="font-heading text-3xl font-bold text-brand tracking-widest" data-testid="voucher-code">
                  {status.voucher_code}
                </div>
                <div className="text-sm text-stone-600">
                  Hemat <strong>{status.discount_pct}%</strong> untuk semua paket Feedify
                </div>
                <button
                  onClick={copyVoucher}
                  data-testid="copy-voucher-btn"
                  className="inline-flex items-center gap-2 px-6 py-2.5 bg-brand text-brand-cream rounded-full font-semibold text-sm hover:bg-brand-light btn-touch"
                >
                  {copied ? <><Check size={14} weight="bold" /> Disalin!</> : <><Copy size={14} /> Salin Kode</>}
                </button>
                <p className="text-xs text-stone-400">Gunakan kode ini saat checkout paket Feedify</p>
              </>
            ) : (
              <>
                <Lock size={24} weight="duotone" className="text-stone-300 mx-auto" />
                <div className="font-heading text-2xl font-bold text-stone-200 tracking-[0.4em] select-none blur-sm">
                  COM5-XXXXXX
                </div>
                <div className="text-xs text-stone-400 font-medium">
                  Selesaikan 2 langkah di atas untuk reveal kode
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {allDone && (
        <div className="animate-fade-up">
          <Link
            to="/pricing"
            className="w-full py-4 bg-brand text-brand-cream rounded-full font-heading font-bold text-base hover:bg-brand-light btn-lift inline-flex items-center justify-center gap-2 btn-touch"
            data-testid="go-pricing-btn"
          >
            <Tag size={18} weight="fill" /> Pakai Voucher Sekarang
            <CaretRight size={16} weight="bold" />
          </Link>
        </div>
      )}
    </div>
  );
}
