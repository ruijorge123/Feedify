import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Sparkle, Check, Copy, CheckCircle,
  WhatsappLogo, InstagramLogo, TiktokLogo, Gift,
  Users, Lightning, Star, X, Tag,
} from "@phosphor-icons/react";
import { toast } from 'react-toastify';
import api from "@/lib/api";
import SupportChatWidget from "@/components/SupportChatWidget";

/* ─── Social proof popup data ─────────────────────── */
const SOCIAL_PROOF = [
  { name: "Rina", city: "Jakarta", action: "baru beli 50 kredit Popular Pack", time: "2 mnt lalu", avatar: "👩" },
  { name: "Brand Glowskin", city: "Bandung", action: "baru generate 12 foto produk", time: "5 mnt lalu", avatar: "✨" },
  { name: "Dian", city: "Surabaya", action: "baru daftar dan beli kredit pertama", time: "1 mnt lalu", avatar: "🧑" },
  { name: "Toko FreshFrozen", city: "Semarang", action: "selesai buat 8 konten carousel", time: "7 mnt lalu", avatar: "🧊" },
  { name: "Mira", city: "Yogyakarta", action: "beli Pro Pack 300 kredit", time: "3 mnt lalu", avatar: "👩‍💼" },
  { name: "Studio Rasa", city: "Bali", action: "baru generate menu F&B", time: "4 mnt lalu", avatar: "🍽️" },
];

/* ─── Credit packages ──────────────────────────────── */
const CREDIT_PKGS = [
  {
    id: "starter",
    name: "Coba Dulu",
    credits: 10,
    price: 15000,
    savings: 0,
    perCredit: 1500,
    tagline: "Trial sebelum komit",
    value: null,
    popular: false,
  },
  {
    id: "monthly",
    name: "1 Bulan Full",
    credits: 30,
    price: 40000,
    savings: 5000,
    perCredit: 1333,
    tagline: "1 foto/hari · 30 hari tanpa bolong",
    value: {
      headline: "= 1 bulan konten IG penuh",
      sub: "Rp 40rb vs Rp 300–500rb/bulan jasa desainer",
      days: 30,
    },
    popular: true,
  },
  {
    id: "bimonthly",
    name: "2 Bulan Full",
    credits: 60,
    price: 79000,
    savings: 11000,
    perCredit: 1317,
    tagline: "2 bulan posting tanpa bolos",
    value: {
      headline: "= 2 bulan konten IG non-stop",
      sub: "Hemat Rp 11rb vs beli 2x paket bulanan",
      days: 60,
    },
    popular: false,
  },
  {
    id: "pro",
    name: "Pro Pack",
    credits: 300,
    price: 350000,
    savings: 100000,
    perCredit: 1167,
    tagline: "Untuk agensi & brand multi-produk",
    value: {
      headline: "= 10 bulan konten atau 5 brand sekaligus",
      sub: "Harga kredit termurah — Rp 1.167/foto",
      days: 300,
    },
    popular: false,
  },
];

const VALID_VOUCHERS = {
  FEEDIFY5:  { type: "percent", value: 5,     label: "Diskon 5%" },
  EARLYBIRD: { type: "percent", value: 10,    label: "Diskon 10% Early Bird" },
  FIRST50:   { type: "flat",    value: 50000, label: "Diskon Rp 50.000" },
};

function fmtRp(n) {
  return "Rp " + n.toLocaleString("id-ID");
}

function calcDiscount(price, voucher) {
  if (!voucher) return price;
  if (voucher.type === "percent") return Math.round(price * (1 - voucher.value / 100));
  return Math.max(0, price - voucher.value);
}

function getCountdownTarget() {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  d.setHours(23, 59, 59, 0);
  return d;
}

/* ─── WA / IG / TikTok links — ISI OLEH OWNER ──── */
const WA_LINK     = "https://wa.me/6281234567890?text=Halo+saya+mau+gabung+komunitas+Feedify";
const IG_LINK     = "https://instagram.com/feedify.id";
const TIKTOK_LINK = "https://tiktok.com/@feedify.id";

export default function PricingPage() {
  const navigate = useNavigate();
  const [voucherOpen, setVoucherOpen]   = useState(false);

  useEffect(() => { window.scrollTo({ top: 0, behavior: "instant" }); }, []);
  const [appliedVoucher, setApplied]    = useState(null);
  const [voucherInput, setVoucherInput] = useState("");
  const [voucherError, setVoucherError] = useState("");

  const applyCode = (code) => {
    const c = (code || voucherInput).trim().toUpperCase();
    if (!c) { setVoucherError("Masukkan kode voucher"); return; }
    const v = VALID_VOUCHERS[c];
    if (!v) { setVoucherError("Kode tidak valid. Cek kembali kode dari Feedify."); setApplied(null); return; }
    setApplied({ ...v, code: c });
    setVoucherInput(c);
    setVoucherError("");
    toast.success(`✅ Voucher ${v.label} berhasil! Harga semua paket sudah diperbarui.`);
  };

  const removeVoucher = () => { setApplied(null); setVoucherInput(""); setVoucherError(""); };

  const goCheckout = (planId) => {
    const p = new URLSearchParams({ plan: planId });
    if (appliedVoucher) p.set("voucher", appliedVoucher.code);
    navigate(`/checkout?${p.toString()}`);
  };

  return (
    <div className="min-h-screen bg-brand-cream" style={{ overflowX: "clip" }}>
      {/* Nav */}
      <nav className="sticky top-0 z-40 bg-white/80 backdrop-blur border-b border-brand-sand">
        <div className="max-w-[1280px] mx-auto px-5 lg:px-10 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-xl bg-brand flex items-center justify-center">
              <Sparkle size={16} weight="fill" className="text-brand-gold" />
            </div>
            <span className="font-heading text-lg font-bold text-brand">Feedify</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link to="/login" className="text-sm font-medium text-stone-600 hover:text-brand px-3 py-2">Masuk</Link>
            <Link to="/register" className="px-4 py-2 bg-brand text-brand-cream rounded-full text-sm font-semibold hover:bg-brand-light">Daftar Gratis</Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <div className="max-w-[1280px] mx-auto px-5 lg:px-10 pt-14 pb-6 text-center">
        <div className="inline-flex items-center gap-2 mb-5 px-3.5 py-1.5 rounded-full bg-brand-gold/15 border border-brand-gold/30 text-brand text-[10px] font-bold uppercase tracking-[0.2em]">
          <Lightning size={12} weight="fill" className="text-brand-gold" /> Early Bird Pricing
        </div>
        <h1 className="font-heading font-bold text-brand tracking-[-0.03em] leading-[0.95]"
          style={{ fontSize: "clamp(2.4rem, 5.5vw, 4.5rem)" }}>
          Feed IG kamu penuh tiap hari,<br />
          <span className="italic font-medium text-brand-light">tanpa sewa agency.</span>
        </h1>
        <p className="mt-5 text-stone-600 text-base lg:text-lg max-w-2xl mx-auto">
          1 kredit = 1 foto siap posting. Beli sekali, pakai kapan saja — kredit tidak expired.
        </p>
        {/* Value anchor pill */}
        <div className="mt-6 inline-flex items-center gap-3 px-5 py-3 rounded-2xl bg-white border border-brand-sand shadow-sm text-sm">
          <span className="text-2xl">📅</span>
          <div className="text-left">
            <div className="font-bold text-brand text-sm">30 kredit = 30 foto = 1 bulan full konten IG</div>
            <div className="text-stone-500 text-xs">hanya Rp 40.000 · vs Rp 300–500rb/bulan jasa desainer</div>
          </div>
        </div>
      </div>

      {/* Countdown */}
      <CountdownBanner />

      {/* Agency vs Feedify comparison bar */}
      <div className="max-w-[1280px] mx-auto px-5 lg:px-10 mb-6">
        <div className="rounded-2xl bg-white border border-brand-sand overflow-hidden">
          <div className="grid grid-cols-2 divide-x divide-brand-sand">
            <div className="px-5 py-4">
              <div className="text-[9px] uppercase tracking-[0.2em] font-bold text-stone-400 mb-2">😮 Jasa Desainer Freelance</div>
              <div className="font-heading font-bold text-xl text-stone-400 line-through">Rp 300–500 ribu</div>
              <div className="text-xs text-stone-400 mt-0.5">per bulan · gaya bisa beda-beda</div>
              <div className="mt-2 space-y-0.5">
                {["Brief & revisi makan waktu", "Hasil tidak selalu sesuai brand", "Bayar rutin tiap bulan"].map((t, i) => (
                  <div key={i} className="text-[10px] text-stone-400 flex items-center gap-1.5">
                    <span className="text-stone-300">✗</span> {t}
                  </div>
                ))}
              </div>
            </div>
            <div className="px-5 py-4 bg-brand-gold/5">
              <div className="text-[9px] uppercase tracking-[0.2em] font-bold text-brand-light mb-2">✅ Feedify</div>
              <div className="font-heading font-bold text-xl text-brand">Rp 40.000</div>
              <div className="text-xs text-stone-500 mt-0.5">1 bulan penuh · tanpa brief</div>
              <div className="mt-2 space-y-0.5">
                {["30 foto dalam hitungan menit", "999+ inspirasi foto siap pakai", "Beli sekali, tidak expired"].map((t, i) => (
                  <div key={i} className="text-[10px] text-brand flex items-center gap-1.5">
                    <span className="text-brand-gold">✓</span> {t}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Credit package cards */}
      <div className="max-w-[1280px] mx-auto px-5 lg:px-10 pb-10">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-5 items-stretch pt-10">
          {CREDIT_PKGS.map(pkg => (
            <CreditCard key={pkg.id} pkg={pkg} voucher={appliedVoucher} onSelect={() => goCheckout(pkg.id)} />
          ))}
        </div>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-1 text-xs text-stone-500">
          <span>✅ 1 kredit = 1 foto siap posting</span>
          <span>✅ Tidak perlu bayar bulanan</span>
          <span>✅ Kredit tidak expired · beli lagi kapan saja</span>
          <span>✅ Tanpa kontrak · tanpa langganan</span>
        </div>
      </div>

      {/* Voucher section — combined earn + input */}
      <VoucherSection
        voucher={appliedVoucher}
        voucherInput={voucherInput}
        setVoucherInput={setVoucherInput}
        voucherError={voucherError}
        setVoucherError={setVoucherError}
        onApply={applyCode}
        onRemove={removeVoucher}
        onOpenModal={() => setVoucherOpen(true)}
      />

      {/* Referral section */}
      <ReferralSection />

      {/* Mini FAQ */}
      <MiniFAQ />

      {/* Footer */}
      <footer className="border-t border-brand-sand py-8 text-center text-xs text-stone-500">
        © {new Date().getFullYear()} Feedify · Brand Studio untuk UMKM Indonesia
        <span className="mx-2">·</span>
        <Link to="/" className="hover:text-brand">Beranda</Link>
        <span className="mx-2">·</span>
        <Link to="/login" className="hover:text-brand">Masuk</Link>
      </footer>

      {/* Floating social proof popup */}
      <SocialProofPopup />

      {/* Voucher modal */}
      {voucherOpen && (
        <VoucherModal
          onClose={() => setVoucherOpen(false)}
        />
      )}
    </div>
  );
}

/* ─── Social proof floating popup ─────────────────── */
function SocialProofPopup() {
  const [idx, setIdx]           = useState(0);
  const [visible, setVisible]   = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    const first = setTimeout(() => setVisible(true), 3000);
    return () => clearTimeout(first);
  }, []);

  useEffect(() => {
    if (!visible || dismissed) return;
    timerRef.current = setTimeout(() => {
      setVisible(false);
      setTimeout(() => {
        setIdx(i => (i + 1) % SOCIAL_PROOF.length);
        setVisible(true);
      }, 700);
    }, 5500);
    return () => clearTimeout(timerRef.current);
  }, [visible, idx, dismissed]);

  if (dismissed) return null;
  const item = SOCIAL_PROOF[idx];

  return (
    <div className={`fixed bottom-6 left-5 z-50 max-w-[300px] transition-all duration-500 ease-out
      ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"}`}>
      <div className="bg-white rounded-2xl shadow-2xl border border-stone-100 p-3.5 flex items-center gap-3">
        <div className="h-11 w-11 rounded-full bg-brand/8 flex items-center justify-center text-xl flex-shrink-0 border-2 border-brand/10">
          {item.avatar}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-brand text-sm leading-snug">
            {item.name}{" "}
            <span className="font-normal text-stone-500 text-xs">dari {item.city}</span>
          </div>
          <div className="text-xs text-stone-600 mt-0.5 leading-snug">{item.action}</div>
          <div className="text-[10px] text-stone-400 mt-1 flex items-center gap-1">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-green-400" />
            {item.time}
          </div>
        </div>
        <button onClick={() => { setDismissed(true); setVisible(false); }}
          className="flex-shrink-0 h-6 w-6 rounded-full hover:bg-stone-100 flex items-center justify-center self-start">
          <X size={11} weight="bold" className="text-stone-300 hover:text-stone-500" />
        </button>
      </div>
    </div>
  );
}

/* ─── Countdown banner ──────────────────────────── */
function CountdownBanner() {
  const [time, setTime] = useState({ h: "00", m: "00", s: "00" });
  useEffect(() => {
    const target = getCountdownTarget();
    const tick = () => {
      const diff = Math.max(0, target - Date.now());
      setTime({
        h: String(Math.floor(diff / 3600000)).padStart(2, "0"),
        m: String(Math.floor((diff % 3600000) / 60000)).padStart(2, "0"),
        s: String(Math.floor((diff % 60000) / 1000)).padStart(2, "0"),
      });
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="max-w-[1280px] mx-auto px-5 lg:px-10 mb-6">
      <div className="rounded-2xl bg-brand-gold/15 border border-brand-gold/30 px-5 py-3 flex items-center justify-center gap-4 flex-wrap">
        <Lightning size={15} weight="fill" className="text-brand-gold flex-shrink-0" />
        <span className="text-sm font-semibold text-brand">Harga early bird berakhir dalam</span>
        <div className="flex items-center gap-1.5">
          {[time.h, time.m, time.s].map((val, i) => (
            <span key={i} className="inline-flex items-center gap-1">
              <span className="font-heading font-bold text-brand text-xl bg-white rounded-lg px-2.5 py-1 shadow-sm min-w-[2.5rem] text-center">{val}</span>
              {i < 2 && <span className="font-bold text-brand-light text-lg">:</span>}
            </span>
          ))}
        </div>
        <span className="text-xs text-stone-600">jam : menit : detik</span>
      </div>
    </div>
  );
}

/* ─── Credit package card ────────────────────────── */
function CreditCard({ pkg, voucher, onSelect }) {
  const isDark = pkg.popular;
  const finalPrice = calcDiscount(pkg.price, voucher);
  const hasDiscount = voucher && finalPrice !== pkg.price;
  const finalPerCredit = Math.round(finalPrice / pkg.credits);

  return (
    <div className={`relative rounded-3xl flex flex-col transition-all duration-300
      ${isDark ? "bg-brand text-brand-cream shadow-2xl ring-2 ring-brand-gold/40 scale-[1.02]" : "bg-white border border-brand-sand"}`}
      data-testid={`pkg-${pkg.id}`}>

      {pkg.popular && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2 inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-brand-gold text-brand text-[10px] uppercase tracking-[0.2em] font-bold shadow-lg z-10">
          <Star size={11} weight="fill" /> Paling Laku
        </div>
      )}
      {hasDiscount && (
        <div className="absolute top-3 right-3 inline-flex items-center px-2.5 py-0.5 rounded-full bg-green-500 text-white text-[10px] font-bold shadow animate-fade-up">
          -{voucher.value}{voucher.type === "percent" ? "%" : ""}
        </div>
      )}
      {!hasDiscount && pkg.savings > 0 && (
        <div className="absolute top-3 right-3 inline-flex items-center px-2.5 py-0.5 rounded-full bg-brand-gold text-brand text-[9px] font-bold shadow">
          Hemat {fmtRp(pkg.savings)}
        </div>
      )}

      <div className="p-6 flex-1 flex flex-col">
        {/* Package name + tagline */}
        <div className={`text-[10px] uppercase tracking-[0.2em] font-bold mb-0.5 ${isDark ? "text-brand-gold" : "text-brand-light"}`}>{pkg.name}</div>
        <div className={`text-xs mb-4 ${isDark ? "text-brand-cream/65" : "text-stone-500"}`}>{pkg.tagline}</div>

        {/* Credit count — hero */}
        <div className={`font-heading font-bold leading-none mb-1 ${isDark ? "text-brand-cream" : "text-brand"}`}
          style={{ fontSize: "clamp(2.5rem, 4vw, 3.5rem)" }}>
          {pkg.credits}
          <span className={`text-base font-normal ml-1.5 ${isDark ? "text-brand-cream/50" : "text-stone-500"}`}>kredit</span>
        </div>
        <div className={`text-xs mb-4 ${isDark ? "text-brand-cream/50" : "text-stone-400"}`}>= {pkg.credits} foto siap posting</div>

        {/* Price */}
        <div className="mb-1">
          {hasDiscount && (
            <div className={`text-sm line-through mb-0.5 ${isDark ? "text-brand-cream/40" : "text-stone-400"}`}>{fmtRp(pkg.price)}</div>
          )}
          <span className={`font-heading font-bold text-2xl ${isDark ? "text-brand-cream" : "text-brand"}`}>{fmtRp(finalPrice)}</span>
        </div>
        <div className={`text-xs mb-5 ${isDark ? "text-brand-cream/50" : "text-stone-400"}`}>
          {fmtRp(finalPerCredit)} / foto · tidak expired
        </div>

        {/* Value frame — only for non-starter */}
        {pkg.value && (
          <div className={`rounded-2xl p-3.5 mb-5 ${isDark ? "bg-white/10 border border-white/15" : "bg-brand-gold/8 border border-brand-gold/20"}`}>
            <div className={`font-semibold text-sm leading-snug mb-1 ${isDark ? "text-brand-gold" : "text-brand"}`}>
              📅 {pkg.value.headline}
            </div>
            <div className={`text-xs leading-relaxed ${isDark ? "text-brand-cream/55" : "text-stone-500"}`}>
              {pkg.value.sub}
            </div>
          </div>
        )}

        <div className="flex-1" />

        <button onClick={onSelect} data-testid={`buy-${pkg.id}`}
          className={`w-full py-3 rounded-full font-bold text-sm btn-lift transition-all ${
            isDark
              ? "bg-brand-gold text-brand hover:bg-brand-amber shadow-lg shadow-brand-gold/20"
              : "bg-brand text-brand-cream hover:bg-brand-light"
          }`}>
          Pilih Paket Ini
        </button>
      </div>
    </div>
  );
}

/* ─── Voucher section — combined ───────────────── */
function VoucherSection({ voucher, voucherInput, setVoucherInput, voucherError, setVoucherError, onApply, onRemove, onOpenModal }) {
  return (
    <section className="max-w-[1280px] mx-auto px-5 lg:px-10 py-12">
      <div className="rounded-3xl bg-gradient-to-br from-brand to-brand-light text-brand-cream p-7 lg:p-10 overflow-hidden relative">
        <div className="absolute -top-10 -right-10 h-48 w-48 rounded-full bg-brand-gold/15 blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center gap-7">
          {/* Left: label + desc */}
          <div className="flex items-center gap-4 flex-1">
            <div className="h-12 w-12 rounded-2xl bg-brand-gold/20 flex items-center justify-center flex-shrink-0">
              <Gift size={22} weight="duotone" className="text-brand-gold" />
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-[0.2em] font-bold text-brand-gold mb-0.5">Voucher Diskon</div>
              <h3 className="font-heading text-xl font-bold leading-tight">Dapat voucher atau masukkan kode</h3>
              <p className="text-brand-cream/60 text-xs mt-1">Follow sosmed Feedify → dapat kode → harga langsung berubah</p>
            </div>
          </div>

          {/* Right: input OR applied state */}
          <div className="flex-shrink-0 w-full lg:w-auto">
            {voucher ? (
              /* Applied state */
              <div className="flex items-center gap-3 bg-white/10 border border-white/20 rounded-2xl px-4 py-3">
                <CheckCircle size={20} weight="fill" className="text-brand-gold flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="font-mono font-bold text-brand-gold tracking-widest text-sm">{voucher.code}</div>
                  <div className="text-brand-cream/60 text-xs">{voucher.label} aktif · harga sudah diperbarui</div>
                </div>
                <button onClick={onRemove} data-testid="remove-voucher"
                  className="h-7 w-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center flex-shrink-0">
                  <X size={12} weight="bold" className="text-brand-cream/60" />
                </button>
              </div>
            ) : (
              /* Input state */
              <div className="space-y-2">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={voucherInput}
                    onChange={e => { setVoucherInput(e.target.value.toUpperCase()); setVoucherError(""); }}
                    onKeyDown={e => e.key === "Enter" && onApply()}
                    placeholder="Punya kode? Input di sini"
                    className="flex-1 lg:w-52 px-4 py-2.5 bg-white/10 border border-white/25 rounded-xl text-brand-cream placeholder-brand-cream/40 text-sm font-medium focus:outline-none focus:border-brand-gold/60 focus:bg-white/15 uppercase tracking-wider transition-all"
                    data-testid="pricing-voucher-input"
                  />
                  <button onClick={() => onApply()} data-testid="pricing-apply-voucher"
                    className="px-4 py-2.5 bg-brand-gold text-brand rounded-xl font-bold text-sm hover:bg-brand-amber whitespace-nowrap btn-lift">
                    Terapkan
                  </button>
                </div>
                {voucherError && <div className="text-red-300 text-xs">{voucherError}</div>}
                <button onClick={onOpenModal} data-testid="get-voucher-btn"
                  className="inline-flex items-center gap-1.5 text-brand-cream/60 hover:text-brand-gold text-xs font-medium transition-colors group">
                  <InstagramLogo size={13} weight="fill" className="text-pink-400 group-hover:text-brand-gold transition-colors" />
                  Cara dapat kode voucher diskon →
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─── Voucher modal ─────────────────────────────── */
function VoucherModal({ onClose }) {
  const STEPS = [
    {
      num: "01",
      icon: <InstagramLogo size={20} weight="fill" className="text-pink-500" />,
      title: "Follow @feedify.id di Instagram",
      desc: "Pastikan kamu follow akun resmi Feedify agar tidak ketinggalan update apapun.",
      action: (
        <a href={IG_LINK} target="_blank" rel="noreferrer"
          className="inline-flex items-center gap-2 mt-3 px-4 py-2 rounded-full text-xs font-bold text-white bg-gradient-to-r from-[#f9ce34] via-[#ee2a7b] to-[#6228d7] hover:opacity-90 transition-opacity shadow-sm">
          <InstagramLogo size={14} weight="fill" /> Buka Instagram
        </a>
      ),
    },
    {
      num: "02",
      icon: <span className="text-lg">👀</span>,
      title: "Pantau Story Feedify",
      desc: "Sesekali kami posting kode voucher eksklusif di Story — hanya untuk followers setia. Tidak rutin, jadi jangan sampai kelewatan.",
    },
    {
      num: "03",
      icon: <Tag size={20} weight="duotone" className="text-brand-gold" />,
      title: "Input kode di kolom voucher",
      desc: "Kalau ada Story dengan kode, langsung salin dan tempel di kolom \"Punya kode voucher?\" — berlaku terbatas.",
      action: (
        <button onClick={onClose}
          className="inline-flex items-center gap-2 mt-3 px-4 py-2 rounded-full text-xs font-bold bg-brand text-brand-gold hover:bg-brand-light transition-colors">
          <Tag size={13} weight="bold" /> Input kode sekarang
        </button>
      ),
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[90dvh] sm:max-h-none overflow-hidden">

        {/* Header */}
        <div className="relative bg-brand px-6 pt-8 pb-6 overflow-hidden">
          <div className="absolute -top-10 -right-10 h-40 w-40 rounded-full bg-brand-gold/15 blur-2xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 right-0 h-px bg-white/10" />
          <button onClick={onClose}
            className="absolute top-4 right-4 h-8 w-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors">
            <X size={14} weight="bold" className="text-white/70" />
          </button>
          <div className="flex items-center gap-3 mb-3">
            <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-[#f9ce34] via-[#ee2a7b] to-[#6228d7] flex items-center justify-center shadow-lg">
              <InstagramLogo size={20} weight="fill" className="text-white" />
            </div>
            <div>
              <div className="font-heading text-xl font-bold text-white leading-tight">Dapat Voucher Diskon</div>
              <div className="text-brand-cream/60 text-xs">Eksklusif untuk followers Feedify</div>
            </div>
          </div>
          <p className="text-brand-cream/80 text-sm leading-relaxed">
            Kami sesekali membagikan kode voucher spesial lewat <span className="text-brand-gold font-semibold">Instagram Story</span> — tidak rutin, jadi follow sekarang agar tidak terlewat.
          </p>
        </div>

        {/* Scrollable body — only on mobile */}
        <div className="overflow-y-auto sm:overflow-y-visible overscroll-contain flex-1 sm:flex-none">
        {/* Steps */}
        <div className="p-6 space-y-1">
          {STEPS.map((s, i) => (
            <div key={i} className="flex gap-4">
              {/* line */}
              <div className="flex flex-col items-center">
                <div className="h-9 w-9 rounded-2xl bg-brand-sand flex items-center justify-center flex-shrink-0 border border-brand-sand">
                  {s.icon}
                </div>
                {i < STEPS.length - 1 && <div className="w-px flex-1 bg-stone-100 my-1.5" />}
              </div>
              {/* content */}
              <div className="pb-5 flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-stone-300">{s.num}</span>
                </div>
                <div className="font-heading font-semibold text-brand text-sm leading-snug">{s.title}</div>
                <div className="text-stone-500 text-xs leading-relaxed mt-1">{s.desc}</div>
                {s.action}
              </div>
            </div>
          ))}
        </div>

        {/* Footer note */}
        <div className="mx-6 mb-6 p-4 rounded-2xl bg-brand-sand/60 border border-brand-sand flex items-start gap-3">
          <span className="text-base flex-shrink-0 mt-0.5">💡</span>
          <p className="text-xs text-stone-600 leading-relaxed">
            Kode voucher di Story bersifat <span className="font-semibold text-brand">terbatas</span> — hanya berlaku untuk beberapa pengguna tercepat. Aktifkan notifikasi postingan IG kami agar tidak kehabisan.
          </p>
        </div>
        </div>{/* end scrollable */}
      </div>
    </div>
  );
}

/* ─── Referral section ──────────────────────────── */
function ReferralSection() {
  const [refCode, setRefCode]   = useState("");
  const [refError, setRefError] = useState("");
  const [refApplied, setApplied] = useState(false);
  const [loading, setLoading]   = useState(false);

  const applyRef = async () => {
    const code = refCode.trim().toLowerCase();
    if (!code) { setRefError("Masukkan kode referral"); return; }
    setLoading(true);
    setRefError("");
    try {
      const { data } = await api.post("/referral/apply", { referral_code: code });
      setApplied(true);
      toast.success("🎁 " + data.message);
    } catch (err) {
      if (err.response?.status === 401) {
        setRefError("Kamu harus login dulu. Daftar atau masuk untuk apply kode referral.");
      } else {
        setRefError(err.response?.data?.detail || "Kode referral tidak ditemukan");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="max-w-[1280px] mx-auto px-5 lg:px-10 pb-14">
      <div className="rounded-3xl bg-white border border-brand-sand p-8 lg:p-12">
        <div className="flex items-start gap-4 mb-8 flex-wrap">
          <div className="h-14 w-14 rounded-2xl bg-brand-gold/15 flex items-center justify-center flex-shrink-0">
            <Users size={26} weight="duotone" className="text-brand-gold" />
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-[0.2em] font-bold text-brand-light mb-1">Program Referral</div>
            <h3 className="font-heading text-2xl font-bold text-brand">Ajak teman, sama-sama dapat kredit gratis</h3>
            <p className="text-stone-600 mt-2 text-sm leading-relaxed max-w-xl">
              Masukkan kode referral teman yang sudah pakai Feedify —
              kalian berdua dapat <strong>bonus kredit gratis</strong> secara otomatis dari Feedify.
            </p>
          </div>
        </div>

        <div className="grid sm:grid-cols-3 gap-4 mb-8">
          {[
            { icon: "🔗", title: "Minta kode dari temanmu", desc: "Teman yang sudah pakai Feedify punya kode unik di dashboard mereka" },
            { icon: "⌨️", title: "Input kode di bawah", desc: "Masukkan kode referral teman, lalu klik Apply" },
            { icon: "🎁", title: "Kalian berdua dapat bonus kredit", desc: "Feedify kasih kredit gratis untuk kamu dan temanmu secara otomatis" },
          ].map((item, i) => (
            <div key={i} className="rounded-2xl bg-brand-sand/50 p-5">
              <div className="text-2xl mb-3">{item.icon}</div>
              <div className="font-semibold text-brand text-sm mb-1">{item.title}</div>
              <div className="text-xs text-stone-500 leading-relaxed">{item.desc}</div>
            </div>
          ))}
        </div>

        {refApplied ? (
          <div className="flex items-center gap-3 p-4 rounded-2xl bg-green-50 border border-green-200 max-w-md">
            <CheckCircle size={24} weight="fill" className="text-green-500 flex-shrink-0" />
            <div>
              <div className="font-semibold text-green-700">Referral berhasil diterapkan!</div>
              <div className="text-sm text-green-600">Bonus kredit gratis sudah ditambahkan ke akunmu.</div>
            </div>
          </div>
        ) : (
          <>
            <div className="flex gap-2 max-w-md">
              <input
                type="text"
                value={refCode}
                onChange={e => { setRefCode(e.target.value); setRefError(""); }}
                onKeyDown={e => e.key === "Enter" && applyRef()}
                placeholder="Masukkan kode referral teman..."
                className="input flex-1 text-sm"
                data-testid="referral-code-input"
              />
              <button onClick={applyRef} disabled={loading} data-testid="apply-referral"
                className="px-5 py-2.5 bg-brand text-brand-cream rounded-xl font-semibold text-sm hover:bg-brand-light disabled:opacity-60 whitespace-nowrap">
                {loading ? "..." : "Apply"}
              </button>
            </div>
            {refError && <div className="text-red-500 text-xs mt-2">{refError}</div>}
            <p className="text-xs text-stone-500 mt-3">
              Kode referral milikmu akan muncul di dashboard setelah daftar dan buat brand profile.
            </p>
          </>
        )}
      </div>
    </section>
  );
}

/* ─── Mini FAQ (Chat) ──────────────────────────────────── */
function MiniFAQ() {
  return (
    <section className="max-w-3xl mx-auto px-5 lg:px-10 pb-16">
      <SupportChatWidget
        title="Masih ada pertanyaan?"
        subtitle="Tanya langsung — Ara siap jawab soal harga, fitur, atau cara mulai."
      />
    </section>
  );
}
