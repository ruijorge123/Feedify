import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  Lightning, Check, Sparkle, ArrowRight,
  ShieldCheck, SealCheck, Warning, Plus, Minus,
} from "@phosphor-icons/react";
import { useAuth } from "@/context/AuthContext";

const FAQS = [
  { q: "Ini benar-benar lifetime?", a: "Ya. Bayar sekali, akses selamanya. Tidak ada renewal, tidak ada biaya bulanan, tidak ada expired." },
  { q: "Update fitur baru gratis?", a: "Ya. Semua fitur baru yang kami tambahkan otomatis masuk ke akun kamu tanpa biaya tambahan." },
  { q: "Perlu keahlian desain?", a: "Tidak. Isi nama produk, klik generate — selesai. Feedify yang urus sisanya." },
  { q: "Bisa langsung dipakai setelah bayar?", a: "Ya, akses aktif otomatis setelah pembayaran dikonfirmasi." },
];

function FaqItem({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`rounded-2xl border transition-all overflow-hidden ${open ? "border-brand/20" : "border-stone-200 bg-white"}`}>
      <button onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between gap-4 px-6 py-4 text-left">
        <span className="font-semibold text-brand text-sm">{q}</span>
        <div className={`h-6 w-6 rounded-full flex-shrink-0 flex items-center justify-center ${open ? "bg-brand text-white" : "bg-stone-100 text-stone-500"}`}>
          {open ? <Minus size={10} weight="bold" /> : <Plus size={10} weight="bold" />}
        </div>
      </button>
      {open && <div className="px-6 pb-4 text-sm text-stone-500 leading-relaxed bg-white border-t border-stone-100 pt-4">{a}</div>}
    </div>
  );
}

export default function BuyCreditsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const go = () => {
    if (!user) {
      navigate("/login?redirect=/pricing");
    } else {
      navigate("/checkout?plan=lifetime");
    }
  };

  return (
    <div className="min-h-screen bg-brand-cream overflow-x-hidden" data-testid="buy-credits-page">

      {/* ── NAV ─────────────────────────────────────────────── */}
      <nav className="max-w-5xl mx-auto px-6 py-6 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-xl bg-brand flex items-center justify-center">
            <Sparkle size={14} weight="fill" className="text-brand-gold" />
          </div>
          <span className="font-heading font-bold text-brand text-lg">Feedify</span>
        </Link>
      </nav>

      {/* ── HERO PUNCH ──────────────────────────────────────── */}
      <section className="max-w-3xl mx-auto px-6 pt-10 pb-20 text-center">

        {/* Urgency pill */}
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-[11px] font-bold uppercase tracking-[0.15em] mb-10">
          <Warning size={11} weight="fill" /> Harga early adopter — bisa naik kapan saja
        </div>

        {/* Headline */}
        <h1 className="font-heading font-bold text-brand tracking-[-0.04em] leading-[0.88] mb-6"
          style={{ fontSize: "clamp(2.8rem, 7vw, 5.5rem)" }}>
          Konten yang bikin<br />orang berhenti scroll<br />
          <span className="text-brand-gold italic font-medium">— mulai hari ini.</span>
        </h1>

        <p className="text-stone-500 text-base lg:text-lg max-w-xl mx-auto leading-relaxed mb-14">
          Setiap hari tanpa konten yang bagus = calon pembeli yang pergi ke kompetitor.<br />
          <strong className="text-stone-700">Rp68.000 sekali bayar</strong> — ubah itu selamanya.
        </p>

        {/* THE CARD */}
        <div className="max-w-md mx-auto rounded-3xl overflow-hidden shadow-2xl shadow-brand/15"
          style={{ background: "linear-gradient(160deg, #0B3D2E, #1a5c3a)" }}>

          {/* Top badge */}
          <div className="bg-brand-gold text-brand text-[10px] font-bold uppercase tracking-[0.2em] py-3 text-center">
            ⚡ Akses Lifetime — Satu Harga Saja
          </div>

          <div className="px-8 py-10">
            {/* Price anchor */}
            <div className="flex items-baseline justify-center gap-3 mb-2">
              <span className="text-white/25 text-base line-through">Rp367.000</span>
              <span className="text-white/40 text-xs">hemat 81%</span>
            </div>

            <div className="font-heading font-bold text-white text-center leading-none mb-2"
              style={{ fontSize: "clamp(3.5rem, 10vw, 5.5rem)" }}>
              Rp68.000
            </div>
            <p className="text-brand-gold/80 text-sm text-center mb-8">Bayar sekali · akses seumur hidup</p>

            {/* What's included */}
            <div className="space-y-3 mb-10">
              {[
                "Semua tools AI terbuka penuh",
                "Brand DNA tersimpan — konten selalu on-brand",
                "Generate prompt tanpa batas, selamanya",
                "Semua fitur baru otomatis gratis",
                "Tidak ada biaya bulanan, tidak ada kredit",
              ].map(t => (
                <div key={t} className="flex items-center gap-3">
                  <div className="h-5 w-5 rounded-full bg-brand-gold/20 border border-brand-gold/30 flex items-center justify-center flex-shrink-0">
                    <Check size={9} weight="bold" className="text-brand-gold" />
                  </div>
                  <span className="text-white/75 text-sm">{t}</span>
                </div>
              ))}
            </div>

            {/* CTA */}
            <button onClick={go}
              className="w-full h-16 rounded-2xl bg-brand-gold text-brand font-heading font-bold text-lg hover:bg-brand-amber transition-all shadow-xl shadow-brand-gold/25 hover:scale-[1.01] flex items-center justify-center gap-2"
              data-testid="main-cta">
              <Lightning size={20} weight="fill" />
              Ambil Akses Sekarang
            </button>

            <div className="flex items-center justify-center gap-4 mt-5 text-white/25 text-xs flex-wrap">
              <span className="flex items-center gap-1"><ShieldCheck size={11} className="text-brand-gold/40" /> Pembayaran aman</span>
              <span>·</span>
              <span className="flex items-center gap-1"><SealCheck size={11} className="text-brand-gold/40" /> Aktif langsung</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── 3 MANFAAT INTI ──────────────────────────────────── */}
      <section className="bg-white border-y border-stone-100 py-16">
        <div className="max-w-4xl mx-auto px-6 grid sm:grid-cols-3 gap-6 text-center">
          {[
            { n: "10×",  label: "Lebih cepat",   desc: "Konten yang biasanya 5 jam — selesai dalam 30 menit." },
            { n: "Rp0",  label: "Agency needed",  desc: "Tidak perlu fotografer. Tidak perlu designer. Tidak perlu siapa-siapa." },
            { n: "∞",    label: "Konten bisa dibuat", desc: "Tidak ada limit. Tidak ada kredit. Generate sepuasnya selamanya." },
          ].map(({ n, label, desc }) => (
            <div key={n} className="p-6">
              <div className="font-heading font-bold text-brand mb-1 leading-none"
                style={{ fontSize: "clamp(2.5rem, 6vw, 4rem)" }}>{n}</div>
              <div className="text-brand-gold text-sm font-bold mb-2">{label}</div>
              <p className="text-stone-500 text-sm leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── FOMO / URGENCY ──────────────────────────────────── */}
      <section className="max-w-3xl mx-auto px-6 py-20 text-center">
        <div className="rounded-3xl border border-amber-200 bg-amber-50 px-8 py-10 mb-12">
          <div className="text-2xl mb-4">⏰</div>
          <h2 className="font-heading font-bold text-stone-800 text-xl lg:text-2xl mb-3 tracking-tight">
            Harga Rp68.000 adalah harga early adopter.
          </h2>
          <p className="text-stone-600 text-sm lg:text-base leading-relaxed max-w-md mx-auto">
            Kami tidak bisa berjanji angka ini akan tetap sama minggu depan. Brand yang masuk lebih awal bayar lebih murah — selamanya.
          </p>
        </div>

        {/* Testimonials — short */}
        <div className="grid sm:grid-cols-2 gap-4 mb-16 text-left">
          {[
            { img: "/testimonihalamanawal/testimoni-hiljab.webp",     name: "Hijab Brand", quote: "Feed IG aku langsung keliatan profesional banget. Hemat jutaan per bulan." },
            { img: "/testimonihalamanawal/testimoni-skincare.webp",   name: "Skincare UMKM", quote: "Dulu malu-maluin. Sekarang sering dapet DM nanya beli di mana." },
          ].map(({ img, name, quote }) => (
            <div key={name} className="feedify-card p-5 flex gap-4 items-start">
              <div className="h-12 w-12 rounded-xl overflow-hidden flex-shrink-0">
                <img src={img} alt={name} className="w-full h-full object-cover" />
              </div>
              <div>
                <div className="flex gap-0.5 mb-2">
                  {[...Array(5)].map((_, i) => <span key={i} className="text-brand-gold text-xs">★</span>)}
                </div>
                <p className="text-stone-700 text-sm leading-snug italic">"{quote}"</p>
                <span className="text-stone-400 text-xs mt-1 block">{name}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Second CTA */}
        <button onClick={go}
          className="inline-flex items-center gap-3 px-10 py-5 bg-brand text-brand-cream hover:bg-brand-light rounded-full font-heading font-bold text-lg shadow-xl shadow-brand/20 transition-all hover:scale-[1.02] mb-5"
          data-testid="second-cta">
          <Lightning size={20} weight="fill" className="text-brand-gold" />
          Ambil Akses Rp68.000 Sekarang
          <ArrowRight size={18} weight="bold" />
        </button>

        <p className="text-stone-400 text-xs">Bayar sekali · akses seumur hidup · aktif langsung</p>
      </section>

      {/* ── FAQ — PENDEK ────────────────────────────────────── */}
      <section className="max-w-xl mx-auto px-6 pb-24">
        <h3 className="font-heading font-bold text-brand text-center text-xl mb-6">Ada yang bikin ragu?</h3>
        <div className="space-y-2">
          {FAQS.map(faq => <FaqItem key={faq.q} {...faq} />)}
        </div>
      </section>

    </div>
  );
}
