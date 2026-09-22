import { Link } from "react-router-dom";
import {
  WhatsappLogo, InstagramLogo, FolderOpen, ArrowRight, Package,
  Palette, ChartLineUp, Receipt, WarningCircle, CircleNotch,
} from "@phosphor-icons/react";
import { useClient, statusStyle, langkahBerikutnya } from "@/lib/client";
import { useAgencyConfig, waLink } from "@/lib/agency";

/**
 * Client home.
 *
 * One question dominates this screen — "how many of my feeds are done?" — so the
 * counter gets the most space and everything else arranges around it. No tools,
 * no generators: in the agency model the client does not produce anything here.
 */
export default function ClientHomePage() {
  const data = useClient();
  const cfg = useAgencyConfig();

  if (!data) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <CircleNotch size={24} className="animate-spin text-brand" />
      </div>
    );
  }

  const c = data.client || {};
  const k = data.kelengkapan || {};
  const st = statusStyle(c.status);
  const next = langkahBerikutnya(k);
  const total = c.total_feeds || 0;
  const pct = total ? Math.round((c.counter / total) * 100) : 0;
  const wa = waLink(cfg?.whatsapp || "6281210117905",
    `Halo tim Feedify, saya ${c.nickname || c.name || ""}.`);

  return (
    <div className="mx-auto max-w-5xl px-5 py-8 sm:px-8 sm:py-10">
      {/* greeting */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight text-brand sm:text-3xl">
            Halo, {c.nickname || c.name || "kamu"}
          </h1>
          <p className="mt-1.5 text-sm text-stone-500">
            {c.status === "selesai"
              ? "Semua feed paketmu sudah terkirim."
              : c.status === "nonaktif"
              ? "Paketmu sudah habis. Perpanjang kapan saja."
              : c.status === "kuning"
              ? "Tim kami akan segera menghubungimu lewat WhatsApp."
              : "Tim kami sedang mengerjakan kontenmu."}
          </p>
        </div>
        <span className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs font-semibold ${st.chip}`} data-testid="client-status">
          <span className={`h-2 w-2 rounded-full ${st.dot}`} /> {st.label}
        </span>
      </div>

      {/* incomplete data nudge — the owner cannot start without this */}
      {!k.lengkap && next && (
        <Link
          to={next.path}
          className="mt-6 flex items-center gap-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 transition-colors hover:bg-amber-100"
          data-testid="client-nudge"
        >
          <WarningCircle size={20} weight="fill" className="flex-shrink-0 text-amber-500" />
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold text-amber-800">Datamu belum lengkap</div>
            <div className="text-xs text-amber-700">
              Lanjutkan di bagian <span className="font-semibold">{next.label}</span> supaya tim kami bisa segera mulai.
            </div>
          </div>
          <ArrowRight size={16} weight="bold" className="flex-shrink-0 text-amber-600" />
        </Link>
      )}

      {/* counter */}
      <div className="mt-6 overflow-hidden rounded-3xl bg-brand p-7 sm:p-9" data-testid="client-counter">
        <div className="text-[11px] font-bold uppercase tracking-[0.15em] text-brand-cream/45">
          Feed yang sudah selesai
        </div>
        <div className="mt-3 flex items-end gap-2">
          <span className="font-heading text-6xl font-bold leading-none text-brand-gold sm:text-7xl">{c.counter ?? 0}</span>
          <span className="pb-2 font-heading text-2xl font-bold text-brand-cream/30">/ {total}</span>
        </div>

        <div className="mt-6 h-2.5 overflow-hidden rounded-full bg-white/10">
          <div className="h-full rounded-full bg-brand-gold transition-[width] duration-700 ease-out" style={{ width: `${pct}%` }} />
        </div>
        <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 text-xs text-brand-cream/45">
          <span>{pct}% selesai</span>
          <span>{Math.max(0, total - (c.counter ?? 0))} feed lagi</span>
        </div>

        {/* Counted only after the client approves on WhatsApp — saying so here
            prevents the "why is it still 7?" message that otherwise arrives. */}
        <p className="mt-5 border-t border-white/10 pt-4 text-xs leading-relaxed text-brand-cream/40">
          Angka ini naik setelah kamu menyetujui hasilnya lewat WhatsApp.
        </p>
      </div>

      {/* drive + contact */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {c.drive_link ? (
          <a
            href={c.drive_link}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-4 rounded-2xl border border-brand-sand bg-white p-5 transition-all hover:-translate-y-0.5 hover:shadow-md"
            data-testid="client-drive"
          >
            <div className="grid h-11 w-11 flex-shrink-0 place-items-center rounded-2xl bg-brand-sand">
              <FolderOpen size={20} weight="duotone" className="text-brand-light" />
            </div>
            <div className="min-w-0">
              <div className="font-semibold text-brand">Folder kontenmu</div>
              <div className="text-xs text-stone-400">Semua file kualitas penuh ada di sini</div>
            </div>
          </a>
        ) : (
          <div className="flex items-center gap-4 rounded-2xl border border-dashed border-brand-sand p-5">
            <div className="grid h-11 w-11 flex-shrink-0 place-items-center rounded-2xl bg-brand-sand/50">
              <FolderOpen size={20} weight="duotone" className="text-stone-300" />
            </div>
            <div className="min-w-0">
              <div className="font-semibold text-stone-400">Folder belum dibuat</div>
              <div className="text-xs text-stone-400">Muncul di sini setelah konten pertamamu jadi</div>
            </div>
          </div>
        )}

        <a
          href={wa}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-4 rounded-2xl border border-brand-sand bg-white p-5 transition-all hover:-translate-y-0.5 hover:shadow-md"
          data-testid="client-wa"
        >
          <div className="grid h-11 w-11 flex-shrink-0 place-items-center rounded-2xl bg-emerald-50">
            <WhatsappLogo size={20} weight="fill" className="text-emerald-600" />
          </div>
          <div className="min-w-0">
            <div className="font-semibold text-brand">Chat tim Feedify</div>
            <div className="text-xs text-stone-400">Revisi, pertanyaan, atau minta ubah gaya</div>
          </div>
        </a>
      </div>

      {/* shortcuts */}
      <div className="mt-8">
        <div className="text-xs font-bold uppercase tracking-[0.14em] text-stone-400">Data brandmu</div>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <Shortcut to="/brand-dna" icon={Palette} title="Brief & Brand DNA" desc={data.brand?.brand_name || "Belum diisi"} ok={k.brand_dna} />
          <Shortcut to="/produk" icon={Package} title="Produk Saya" desc={`${k.produk_count || 0} produk · ${k.alokasi_terpakai || 0}/${total} feed dibagi`} ok={k.produk && k.alokasi} />
          <Shortcut to="/riwayat" icon={Receipt} title="Riwayat Pesanan" desc="Paket yang pernah kamu beli" ok />
        </div>
      </div>

      {/* growth consultant */}
      <Link
        to="/growth-consultant"
        className="mt-6 flex items-center gap-4 rounded-2xl bg-brand-sand/60 p-5 transition-colors hover:bg-brand-sand"
        data-testid="client-gc"
      >
        <div className="grid h-11 w-11 flex-shrink-0 place-items-center rounded-2xl bg-white">
          <ChartLineUp size={20} weight="duotone" className="text-brand-light" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-semibold text-brand">Growth Consultant</div>
          <div className="text-xs text-stone-500">Jualan sepi? Tanya apa yang sebaiknya kamu lakukan — gratis, 3 sesi per hari.</div>
        </div>
        <ArrowRight size={16} weight="bold" className="flex-shrink-0 text-brand-light" />
      </Link>

      {/* footer contact */}
      <div className="mt-10 flex flex-wrap items-center justify-center gap-6 border-t border-brand-sand pt-7 text-sm text-stone-400">
        <a href={wa} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 hover:text-brand">
          <WhatsappLogo size={15} weight="fill" /> {cfg?.whatsapp ? `0${cfg.whatsapp.slice(2)}` : "081210117905"}
        </a>
        <a href={`https://instagram.com/${cfg?.instagram || "feedify_id"}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 hover:text-brand">
          <InstagramLogo size={15} weight="fill" /> @{cfg?.instagram || "feedify_id"}
        </a>
      </div>
    </div>
  );
}

function Shortcut({ to, icon: Icon, title, desc, ok }) {
  return (
    <Link
      to={to}
      className="group rounded-2xl border border-brand-sand bg-white p-5 transition-all hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="flex items-start justify-between">
        <Icon size={22} weight="duotone" className="text-brand-light" />
        {!ok && <span className="h-2 w-2 rounded-full bg-amber-400" title="Belum lengkap" />}
      </div>
      <div className="mt-4 font-heading font-semibold text-brand">{title}</div>
      <div className="mt-0.5 truncate text-xs text-stone-400">{desc}</div>
    </Link>
  );
}
