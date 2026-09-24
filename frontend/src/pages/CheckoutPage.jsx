import { useState, useEffect, useCallback, useRef } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowLeft, Check, CheckCircle, ShieldCheck, Timer, UploadSimple,
  CircleNotch, WarningCircle, XCircle, ArrowClockwise, QrCode,
  DownloadSimple, WhatsappLogo, X,
} from "@phosphor-icons/react";
import { toast } from "react-toastify";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import FeedifyLogo from "@/components/FeedifyLogo";
import { useAgencyConfig, formatRupiah, waLink } from "@/lib/agency";
import { compressImageFile } from "@/lib/imageCompress";

function fmtCountdown(total) {
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/**
 * QRIS checkout.
 *
 * QRIS is the only channel: the buyer scans, pays the package price exactly, and
 * uploads the screenshot. Approval is a human step (Telegram / Admin Panel), so
 * this page's job is to make the three actions unmissable — scan, pay, upload —
 * and then to keep the buyer informed while they wait for a person to confirm.
 */
export default function CheckoutPage() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const { user, refreshUser } = useAuth();
  const cfg = useAgencyConfig();

  const paket = params.get("paket") || "populer";
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [secondsLeft, setSecondsLeft] = useState(null);
  const [proofPreview, setProofPreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [reuploading, setReuploading] = useState(false);
  const [zoomQr, setZoomQr] = useState(false);
  // Collected here rather than after signup: this is the number the team
  // contacts and delivers to, and the payment alert is useless without it.
  const [waNumber, setWaNumber] = useState("");
  // createOrder is memoised on [navigate] but reads the number the buyer is
  // still typing; a ref keeps it current without re-creating the callback on
  // every keystroke (which would refire the effect that calls it).
  const waRef = useRef("");
  const [waSaved, setWaSaved] = useState(false);
  const fileRef = useRef(null);

  const packages = cfg?.packages || [];
  const selected = packages.find((p) => p.id === (order?.paket_id || paket));
  const isPreview = order?.preview === true;

  const createOrder = useCallback(async (pkgId) => {
    setLoading(true);
    try {
      const { data } = await api.post("/checkout/manual/create", { paket: pkgId, whatsapp: waRef.current });
      setOrder(data);
      if (data?.whatsapp) { setWaNumber(data.whatsapp); setWaSaved(true); }
      setProofPreview(null);
      setReuploading(false);
    } catch (err) {
      if (err.response?.status === 401) {
        toast("Silakan masuk dulu untuk melanjutkan.");
        setTimeout(() => navigate(`/login?redirect=/checkout?paket=${pkgId}`), 1200);
      } else {
        toast.error(err?.response?.data?.detail || "Gagal membuat pesanan. Coba lagi.");
      }
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => { createOrder(paket); }, [paket, createOrder]);

  // Countdown to expiry
  useEffect(() => {
    if (!order?.expires_at) return;
    const tick = () => setSecondsLeft(
      Math.max(0, Math.floor((new Date(order.expires_at) - new Date()) / 1000))
    );
    tick();
    const iv = setInterval(tick, 1000);
    return () => clearInterval(iv);
  }, [order?.expires_at]);

  // Poll ONLY while waiting for admin verification, never during upload states —
  // otherwise a poll would overwrite the buyer's in-progress "upload ulang".
  useEffect(() => {
    if (!order?.id || isPreview || order.status !== "menunggu_verifikasi") return;
    const iv = setInterval(async () => {
      try {
        const { data } = await api.get(`/checkout/manual/${order.id}`);
        setOrder((prev) => (prev ? { ...prev, ...data } : prev));
      } catch { /* transient */ }
    }, 5000);
    return () => clearInterval(iv);
  }, [order?.id, order?.status, isPreview]);

  // Approved: pull the new entitlement and move into the app.
  useEffect(() => {
    if (order?.status !== "lunas") return;
    (async () => {
      await refreshUser();
      toast.success("Pembayaran dikonfirmasi. Selamat datang di Feedify!");
      setTimeout(() => navigate(user?.has_brand_profile ? "/dashboard" : "/onboarding"), 1400);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order?.status]);

  const pickProof = async (file) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast.error("File harus berupa gambar"); return; }
    if (file.size > 20 * 1024 * 1024) { toast.error("Ukuran maksimal 20 MB"); return; }
    try {
      setProofPreview(await compressImageFile(file, { maxDimension: 1280, quality: 0.85 }));
    } catch {
      const reader = new FileReader();
      reader.onload = () => setProofPreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const submitProof = async () => {
    if (!proofPreview || !order?.id) return;
    if (isPreview) { toast.info("Ini mode pratinjau admin — bukti tidak dikirim."); return; }
    if (waDigits.length < 9) { toast.error("Isi nomor WhatsApp dulu"); return; }
    setUploading(true);
    try {
      if (!waSaved) {
        await api.post("/checkout/manual/create", { paket: order.paket_id || paket, whatsapp: waNumber });
        setWaSaved(true);
      }
      const { data } = await api.post(`/checkout/manual/${order.id}/proof`, { photo_base64: proofPreview });
      setOrder((prev) => ({ ...prev, status: "menunggu_verifikasi" }));
      setReuploading(false);
      if (data?.admin_notified === false) {
        toast.warn("Bukti tersimpan, tapi notifikasi ke admin gagal. Verifikasi bisa lebih lama — hubungi kami kalau lewat 1x24 jam.", { autoClose: 10000 });
      } else {
        toast.success("Bukti terkirim. Menunggu konfirmasi admin.");
      }
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Gagal mengirim bukti. Coba lagi.");
    } finally {
      setUploading(false);
    }
  };

  const wa = waLink(cfg?.whatsapp || "6281210117905",
    `Halo Feedify, saya sudah bayar paket ${selected?.name || ""} tapi belum dikonfirmasi.`);

  const waDigits = String(waNumber || "").replace(/\D/g, "");
  waRef.current = waNumber;
  const status = order?.status;
  const expired = secondsLeft === 0 && status === "menunggu_transfer";
  const showUpload = !status || status === "menunggu_transfer" || status === "ditolak" || reuploading;

  if (loading && !order) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-brand-cream">
        <CircleNotch size={26} className="animate-spin text-brand" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-cream">
      {/* header */}
      <div className="bg-brand-terminal px-5 py-5 sm:px-8">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <button onClick={() => navigate("/#harga")} className="inline-flex items-center gap-2 text-sm text-brand-cream/60 transition-colors hover:text-brand-cream" data-testid="checkout-back">
            <ArrowLeft size={15} weight="bold" /> Ganti paket
          </button>
          <Link to="/"><FeedifyLogo size={32} tone="light" /></Link>
        </div>
      </div>

      {isPreview && (
        <div className="bg-brand-gold/20 px-5 py-3 text-center text-sm font-medium text-brand">
          Mode pratinjau admin — akunmu sudah punya akses penuh, jadi tidak ada pesanan yang dibuat.
        </div>
      )}

      <div className="mx-auto max-w-5xl px-5 py-10 sm:px-8 sm:py-14">
        <div className="grid gap-8 lg:grid-cols-[1fr_.8fr] lg:items-start">

          {/* ── kiri: langkah pembayaran ─────────────────────── */}
          <div className="order-2 lg:order-1">
            {status === "lunas" ? (
              <Panel>
                <div className="py-10 text-center">
                  <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-brand">
                    <CheckCircle size={32} weight="fill" className="text-brand-gold" />
                  </div>
                  <h2 className="mt-6 font-heading text-2xl font-bold text-brand">Pembayaran dikonfirmasi</h2>
                  <p className="mt-2 text-sm text-stone-500">Mengarahkan kamu ke dashboard...</p>
                </div>
              </Panel>
            ) : status === "menunggu_verifikasi" && !reuploading ? (
              <Panel>
                <div className="py-8 text-center">
                  <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-brand-gold/15">
                    <CircleNotch size={26} className="animate-spin text-brand-gold" />
                  </div>
                  <h2 className="mt-6 font-heading text-xl font-bold text-brand">Bukti sedang diperiksa</h2>
                  <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-stone-500">
                    Admin kami memeriksa pembayaranmu. Biasanya tidak sampai satu jam pada
                    jam kerja. Halaman ini akan berubah sendiri begitu disetujui — tidak
                    perlu dimuat ulang.
                  </p>
                  <div className="mt-7 flex flex-wrap justify-center gap-3">
                    <a href={wa} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-full border border-brand px-5 py-2.5 text-sm font-semibold text-brand transition-all hover:bg-brand hover:text-brand-cream">
                      <WhatsappLogo size={15} weight="fill" /> Hubungi Admin
                    </a>
                    <button onClick={() => setReuploading(true)} className="rounded-full px-5 py-2.5 text-sm font-medium text-stone-500 hover:text-brand">
                      Kirim ulang bukti
                    </button>
                  </div>
                </div>
              </Panel>
            ) : (
              <div className="space-y-4">
                {status === "ditolak" && (
                  <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4">
                    <XCircle size={18} weight="fill" className="mt-0.5 flex-shrink-0 text-red-500" />
                    <div>
                      <div className="text-sm font-semibold text-red-700">Bukti sebelumnya ditolak</div>
                      <p className="mt-1 text-xs leading-relaxed text-red-600">
                        Biasanya karena nominal tidak cocok atau screenshot tidak terbaca.
                        Kirim ulang screenshot yang jelas — pesananmu masih aktif.
                      </p>
                    </div>
                  </div>
                )}

                {expired && (
                  <div className="flex items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4">
                    <div className="flex items-start gap-3">
                      <WarningCircle size={18} weight="fill" className="mt-0.5 flex-shrink-0 text-amber-500" />
                      <div className="text-sm text-amber-800">Waktu pesanan habis. Buat ulang untuk melanjutkan.</div>
                    </div>
                    <button onClick={() => createOrder(paket)} className="inline-flex flex-shrink-0 items-center gap-1.5 rounded-full bg-amber-500 px-4 py-2 text-xs font-bold text-white">
                      <ArrowClockwise size={13} weight="bold" /> Buat ulang
                    </button>
                  </div>
                )}

                {/* langkah 1 — scan */}
                <Panel>
                  <Step n="1" title="Scan QRIS ini dan bayar" />
                  <div className="mt-5 flex flex-col items-center gap-5 sm:flex-row sm:items-start">
                    <button
                      onClick={() => setZoomQr(true)}
                      className="group relative flex-shrink-0 overflow-hidden rounded-2xl border-2 border-brand-sand bg-white p-2 transition-all hover:border-brand-gold"
                      data-testid="qris-image"
                    >
                      <img src={order?.qris_image || "/datapenting/qris2.jpeg"} alt="Kode QRIS Feedify" className="h-52 w-52 object-contain" />
                      <span className="absolute inset-x-2 bottom-2 rounded-lg bg-brand/90 py-1.5 text-[11px] font-bold text-brand-cream opacity-0 transition-opacity group-hover:opacity-100">
                        Ketuk untuk perbesar
                      </span>
                    </button>

                    <div className="w-full flex-1">
                      <div className="rounded-2xl bg-brand p-5 text-center sm:text-left">
                        <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-brand-cream/45">
                          Nominal yang harus dibayar
                        </div>
                        <div className="mt-1.5 font-heading text-3xl font-bold text-brand-gold">
                          {formatRupiah(order?.amount)}
                        </div>
                        <div className="mt-1 text-xs text-brand-cream/50">
                          Bayar pas sejumlah ini — jangan dibulatkan.
                        </div>
                      </div>
                      <a
                        href={order?.qris_image || "/datapenting/qris2.jpeg"}
                        download="qris-feedify.jpeg"
                        className="mt-3 flex w-full items-center justify-center gap-2 rounded-full border border-brand-sand py-2.5 text-sm font-medium text-brand transition-colors hover:border-brand"
                      >
                        <DownloadSimple size={15} weight="bold" /> Simpan kode QRIS
                      </a>
                      <p className="mt-3 text-xs leading-relaxed text-stone-400">
                        Bisa dibayar dari GoPay, OVO, DANA, ShopeePay, atau m-banking apa pun
                        yang mendukung QRIS.
                      </p>
                    </div>
                  </div>

                  {secondsLeft != null && !expired && (
                    <div className="mt-5 flex items-center justify-center gap-2 rounded-xl bg-brand-sand/50 py-2.5 text-sm">
                      <Timer size={15} weight="duotone" className="text-brand-light" />
                      <span className="text-stone-500">Selesaikan dalam</span>
                      <span className="font-mono font-bold text-brand">{fmtCountdown(secondsLeft)}</span>
                    </div>
                  )}
                </Panel>

                {/* langkah 2 — upload */}
                {showUpload && (
                  <Panel>
                    <Step n="2" title="Nomor WhatsApp kamu" />
                    <p className="mt-2 text-sm text-stone-500">
                      Ke nomor ini tim kami menghubungi dan mengirim semua kontenmu.
                    </p>
                    <input
                      value={waNumber}
                      onChange={(e) => { setWaNumber(e.target.value); setWaSaved(false); }}
                      placeholder="0812xxxxxxx"
                      inputMode="tel"
                      className="feedify-input mt-4"
                      data-testid="checkout-wa"
                    />

                    <div className="mt-8">
                      <Step n="3" title="Kirim screenshot buktinya" />
                      <p className="mt-2 text-sm text-stone-500">
                        Pastikan nominal dan waktu pembayaran terbaca jelas di screenshot.
                      </p>
                    </div>

                    {proofPreview ? (
                      <div className="relative mt-5 overflow-hidden rounded-2xl border-2 border-brand/15">
                        <img src={proofPreview} alt="Bukti pembayaran" className="max-h-72 w-full bg-stone-50 object-contain" />
                        <button
                          onClick={() => { setProofPreview(null); if (fileRef.current) fileRef.current.value = ""; }}
                          className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-full bg-black/60 text-white backdrop-blur"
                          aria-label="Hapus bukti"
                        >
                          <X size={14} weight="bold" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => fileRef.current?.click()}
                        className="mt-5 flex w-full flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-brand-gold/50 bg-brand-gold/5 px-6 py-9 transition-colors hover:border-brand-gold hover:bg-brand-gold/10"
                        data-testid="checkout-upload"
                      >
                        <div className="grid h-11 w-11 place-items-center rounded-full bg-brand-gold/15">
                          <UploadSimple size={20} weight="duotone" className="text-brand-gold" />
                        </div>
                        <span className="font-semibold text-brand">Pilih screenshot pembayaran</span>
                        <span className="text-xs text-stone-400">JPG atau PNG, maksimal 20 MB</span>
                      </button>
                    )}
                    <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => pickProof(e.target.files?.[0])} />

                    <button
                      onClick={submitProof}
                      disabled={!proofPreview || uploading || expired || waDigits.length < 9}
                      className="mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-brand py-4 font-semibold text-brand-cream transition-all hover:bg-brand-light disabled:opacity-40"
                      data-testid="checkout-submit-proof"
                    >
                      {uploading ? <><CircleNotch size={17} className="animate-spin" /> Mengirim...</> : <><Check size={17} weight="bold" /> Kirim Bukti Pembayaran</>}
                    </button>
                    {waDigits.length > 0 && waDigits.length < 9 && (
                      <p className="mt-2.5 text-center text-xs text-amber-600">Nomor WhatsApp belum lengkap.</p>
                    )}
                  </Panel>
                )}
              </div>
            )}
          </div>

          {/* ── kanan: ringkasan paket ───────────────────────── */}
          <div className="order-1 lg:sticky lg:top-8 lg:order-2">
            <Panel>
              <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-stone-400">Pesananmu</div>

              {selected ? (
                <>
                  <div className="mt-3 flex items-baseline justify-between gap-3">
                    <span className="font-heading text-2xl font-bold text-brand">Paket {selected.name}</span>
                    <span className="flex-shrink-0 rounded-full bg-brand-sand px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-brand-light">
                      {selected.feeds} feed
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-stone-500">{selected.tagline}</p>

                  <ul className="mt-6 space-y-2.5 border-t border-brand-sand pt-6">
                    {(selected.features || []).map((f) => (
                      <li key={f} className="flex items-start gap-2.5 text-sm">
                        <Check size={14} weight="bold" className="mt-1 flex-shrink-0 text-brand-light" />
                        <span className="text-stone-600">{f}</span>
                      </li>
                    ))}
                  </ul>

                  <div className="mt-6 flex items-baseline justify-between border-t border-brand-sand pt-5">
                    <span className="text-sm font-medium text-stone-500">Total</span>
                    <span className="font-heading text-2xl font-bold text-brand">{formatRupiah(order?.amount ?? selected.price_idr)}</span>
                  </div>

                  {/* switching package re-uses the same order row on the server */}
                  {packages.length > 1 && status === "menunggu_transfer" && (
                    <div className="mt-5 border-t border-brand-sand pt-5">
                      <div className="text-xs font-semibold text-stone-400">Ganti paket</div>
                      <div className="mt-2.5 flex flex-wrap gap-2">
                        {packages.filter((p) => p.id !== selected.id).map((p) => (
                          <button
                            key={p.id}
                            onClick={() => setParams({ paket: p.id })}
                            className="rounded-full border border-brand-sand px-3.5 py-1.5 text-xs font-medium text-stone-500 transition-colors hover:border-brand hover:text-brand"
                          >
                            {p.name} · {formatRupiah(p.price_idr)}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="mt-4 space-y-3">
                  <div className="h-7 w-40 animate-pulse rounded bg-brand-sand" />
                  <div className="h-4 w-28 animate-pulse rounded bg-brand-sand" />
                </div>
              )}

              <div className="mt-6 flex items-start gap-2.5 rounded-xl bg-brand-sand/50 p-3.5">
                <ShieldCheck size={16} weight="duotone" className="mt-0.5 flex-shrink-0 text-brand-light" />
                <p className="text-xs leading-relaxed text-stone-500">
                  Pembayaran dicek manual oleh admin, bukan robot. Kalau ada yang tidak
                  beres, uangmu tidak hangus — hubungi kami lewat WhatsApp.
                </p>
              </div>
            </Panel>
          </div>
        </div>
      </div>

      {/* QRIS diperbesar — orang membayar dari HP yang sama, jadi harus bisa dizoom */}
      {zoomQr && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/85 p-6 backdrop-blur-sm" onClick={() => setZoomQr(false)}>
          <button className="absolute right-5 top-5 grid h-11 w-11 place-items-center rounded-full bg-white/10 text-white" aria-label="Tutup">
            <X size={18} weight="bold" />
          </button>
          <div className="w-full max-w-sm rounded-3xl bg-white p-5" onClick={(e) => e.stopPropagation()}>
            <img src={order?.qris_image || "/datapenting/qris2.jpeg"} alt="Kode QRIS Feedify" className="w-full object-contain" />
            <div className="mt-4 text-center">
              <div className="text-xs text-stone-400">Nominal</div>
              <div className="font-heading text-2xl font-bold text-brand">{formatRupiah(order?.amount)}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Panel({ children }) {
  return <div className="rounded-3xl border border-brand-sand bg-white p-6 shadow-sm sm:p-8">{children}</div>;
}

function Step({ n, title }) {
  return (
    <div className="flex items-center gap-3">
      <span className="grid h-7 w-7 flex-shrink-0 place-items-center rounded-full bg-brand font-heading text-xs font-bold text-brand-gold">
        {n}
      </span>
      <h2 className="font-heading text-lg font-bold text-brand">{title}</h2>
    </div>
  );
}
