import { useState } from "react"; // eslint-disable-line
import { useNavigate, Link } from "react-router-dom";
import {
  Lightning, Check, ArrowLeft, Sparkle,
  ImageSquare, Stack, PenNib, Storefront,
  ChartBar, Coin,
  Clock, ShieldCheck, Headset,
} from "@phosphor-icons/react";
import { useCredits } from "@/lib/credits";

function fmtRp(n) {
  return "Rp " + n.toLocaleString("id-ID");
}

const CREDIT_PKGS = [
  {
    id: "monthly",
    name: "1 Bulan Full",
    credits: 30,
    price: 43000,
    originalPrice: 54000,
    savings: 11000,
    perCredit: 1433,
    tagline: "1 foto/hari selama 30 hari",
    popular: true,
    highlight: "Paling Populer",
  },
  {
    id: "bimonthly",
    name: "2 Bulan Full",
    credits: 60,
    price: 79000,
    originalPrice: 99000,
    savings: 20000,
    perCredit: 1317,
    tagline: "2 bulan posting tanpa bolos",
    popular: false,
    highlight: "Terbaik untuk konsistensi",
  },
  {
    id: "pro",
    name: "Pro Pack",
    credits: 300,
    price: 379000,
    originalPrice: 474000,
    savings: 95000,
    perCredit: 1263,
    tagline: "Untuk brand aktif & agensi",
    popular: false,
    highlight: "Harga termurah/kredit",
  },
];

const USAGE_EXAMPLES = [
  { icon: ImageSquare, label: "Feed Post / Banner",   credits: 1, color: "text-brand" },
  { icon: Stack,       label: "Carousel (per slide)", credits: 1, color: "text-indigo-600" },
  { icon: Storefront,  label: "Marketplace Listing",  credits: 1, color: "text-amber-600" },
  { icon: PenNib,      label: "Copywriting",          credits: 0, color: "text-emerald-600", free: true },
];


export default function BuyCreditsPage() {
  const navigate = useNavigate();
  const { balance } = useCredits();

  const goCheckout = (planId) => {
    navigate(`/checkout?plan=${planId}`);
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto" data-testid="buy-credits-page">

      {/* Header */}
      <div className="animate-fade-up">
        <button onClick={() => navigate(-1)} className="inline-flex items-center gap-1.5 text-sm text-stone-500 hover:text-brand mb-4 transition-colors">
          <ArrowLeft size={15} weight="bold" /> Kembali
        </button>
        <div className="text-xs uppercase tracking-[0.2em] text-brand-light font-semibold mb-2">Kredit</div>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="font-heading text-3xl sm:text-4xl font-bold text-brand tracking-tight">Isi Ulang Kredit</h1>
            <p className="text-stone-600 mt-2">Kredit tidak expired — beli sesuai kebutuhan, pakai kapan saja.</p>
          </div>
          {balance !== null && (
            <div className="flex items-center gap-2 px-4 py-2.5 bg-brand-gold/10 border border-brand-gold/25 rounded-2xl">
              <Coin size={18} weight="duotone" className="text-brand-gold" />
              <div>
                <div className="text-[10px] text-stone-500 font-medium uppercase tracking-wider">Kredit Sekarang</div>
                <div className="font-heading font-bold text-brand text-lg leading-none">{balance}</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Usage reference */}
      <div className="feedify-card p-5 animate-fade-up">
        <div className="text-xs uppercase tracking-[0.15em] font-bold text-stone-400 mb-3">1 kredit = 1 konten</div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {USAGE_EXAMPLES.map(({ icon: Icon, label, credits, color, free }) => (
            <div key={label} className="flex items-center gap-2.5 p-3 bg-brand-sand/30 rounded-xl">
              <Icon size={18} weight="duotone" className={color} />
              <div>
                <div className="text-xs font-semibold text-brand leading-tight">{label}</div>
                <div className="text-[10px] text-stone-500 mt-0.5">
                  {free ? <span className="text-green-600 font-bold">Gratis</span> : `${credits} kredit`}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Paket Kredit */}
      <div className="animate-fade-up">
        <div className="text-xs uppercase tracking-[0.15em] font-bold text-stone-400 mb-4">Pilih Paket</div>
        <div className="grid sm:grid-cols-3 gap-4">
          {CREDIT_PKGS.map(pkg => (
            <div
              key={pkg.id}
              className={`feedify-card flex flex-col relative overflow-hidden transition-all hover:shadow-lg ${
                pkg.popular ? "ring-2 ring-brand" : ""
              }`}
            >
              {pkg.highlight && (
                <div className={`text-[9px] uppercase tracking-[0.18em] font-bold px-3 py-1.5 text-center ${
                  pkg.popular ? "bg-brand text-brand-cream" : "bg-brand-sand text-brand-light"
                }`}>
                  {pkg.highlight}
                </div>
              )}
              <div className="p-5 flex flex-col flex-1">
                <div className="flex items-start justify-between gap-2 mb-0.5">
                  <div className="font-heading font-bold text-brand text-base">{pkg.name}</div>
                  <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-red-500 text-white flex-shrink-0">-20%</span>
                </div>
                <div className="text-xs text-stone-500 mt-0.5 mb-4">{pkg.tagline}</div>

                <div className="mt-auto">
                  <div className="flex items-end gap-1 mb-1">
                    <span className="font-heading text-3xl font-bold text-brand">{pkg.credits}</span>
                    <span className="text-stone-400 text-sm mb-1">kredit</span>
                  </div>
                  {/* Harga coret + diskon */}
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm line-through text-stone-400">{fmtRp(pkg.originalPrice)}</span>
                    <span className="text-[9px] font-bold text-red-500 bg-red-50 px-1.5 py-0.5 rounded-full border border-red-100">
                      Hemat {fmtRp(pkg.savings)}
                    </span>
                  </div>
                  <div className="font-heading text-xl font-bold text-brand mb-0.5">{fmtRp(pkg.price)}</div>
                  <div className="text-[10px] text-stone-400 mb-4">💡 {fmtRp(pkg.perCredit)}/foto · tidak expired</div>

                  <button
                    onClick={() => goCheckout(pkg.id)}
                    data-testid={`buy-${pkg.id}`}
                    className={`w-full py-2.5 rounded-full font-semibold text-sm btn-touch transition-all ${
                      pkg.popular
                        ? "bg-brand text-brand-cream hover:bg-brand-light"
                        : "bg-brand-sand text-brand hover:bg-brand-gold/20"
                    }`}
                  >
                    Beli Sekarang
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-center gap-x-6 gap-y-1.5 text-xs text-stone-500">
          {[
            { icon: Clock,       text: "Kredit tidak expired" },
            { icon: ShieldCheck, text: "Tanpa langganan bulanan" },
            { icon: Lightning,   text: "Beli kapan saja" },
            { icon: Headset,     text: "Konfirmasi 1×24 jam" },
          ].map(({ icon: Icon, text }) => (
            <span key={text} className="flex items-center gap-1.5">
              <Icon size={12} weight="fill" className="text-brand-gold" /> {text}
            </span>
          ))}
        </div>
      </div>

      {/* Nilai kredit calculator */}
      <div className="feedify-card p-6 animate-fade-up">
        <div className="flex items-center gap-2 mb-4">
          <ChartBar size={18} weight="duotone" className="text-brand-gold" />
          <span className="font-heading font-bold text-brand">Berapa lama kredit kamu bertahan?</span>
        </div>
        <div className="grid sm:grid-cols-3 gap-4">
          {[
            { credits: 30,  days: "~1 bulan",  note: "Konsisten tiap hari" },
            { credits: 60,  days: "~2 bulan",  note: "Posting tanpa bolos" },
            { credits: 300, days: "~10 bulan", note: "Multi-brand atau agensi" },
          ].map(({ credits, days, note }) => (
            <div key={credits} className="bg-brand-sand/40 rounded-xl p-4 text-center">
              <div className="font-heading text-2xl font-bold text-brand">{credits} kredit</div>
              <div className="font-semibold text-brand-light text-sm mt-1">{days}</div>
              <div className="text-xs text-stone-500 mt-0.5">{note}</div>
            </div>
          ))}
        </div>
      </div>


    </div>
  );
}
