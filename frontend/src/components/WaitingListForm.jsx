import { useState } from "react";
import { toast } from "react-toastify";
import { CircleNotch, CheckCircle, BellRinging } from "@phosphor-icons/react";
import api from "@/lib/api";

/**
 * Shown on the landing page in place of the packages when registration is closed.
 *
 * Two fields and no account: someone who arrives to a closed shop will not sign
 * up first, and every extra field loses more of them. The only job here is to
 * capture a way to tell them when the next batch opens.
 */
export default function WaitingListForm() {
  const [form, setForm] = useState({ name: "", whatsapp: "" });
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);

  const valid = form.name.trim().length >= 2 && form.whatsapp.replace(/\D/g, "").length >= 9;

  const submit = async (e) => {
    e.preventDefault();
    if (!valid || sending) return;
    setSending(true);
    try {
      const { data } = await api.post("/waiting-list", form);
      setDone(true);
      if (data?.duplicate) toast.info("Nomormu sudah terdaftar sebelumnya.");
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Gagal mendaftar. Coba lagi.");
    } finally { setSending(false); }
  };

  if (done) {
    return (
      <div className="mx-auto max-w-md rounded-3xl border border-brand-sand bg-white p-8 text-center" data-testid="waiting-list-done">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-brand">
          <CheckCircle size={26} weight="fill" className="text-brand-gold" />
        </div>
        <h3 className="mt-5 font-heading text-xl font-bold text-brand">Kamu masuk daftar tunggu</h3>
        <p className="mt-2.5 text-sm leading-relaxed text-stone-500">
          Kami kabari lewat WhatsApp begitu slot berikutnya dibuka. Sementara itu,
          kamu tetap bisa minta contoh konten gratis.
        </p>
        <a
          href="/sample"
          className="mt-6 inline-block rounded-full border border-brand px-6 py-3 text-sm font-semibold text-brand transition-colors hover:bg-brand hover:text-brand-cream"
        >
          Minta Sample Gratis
        </a>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="mx-auto max-w-md rounded-3xl border border-brand-sand bg-white p-7 shadow-sm sm:p-8" data-testid="waiting-list-form">
      <div className="text-center">
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-brand-sand">
          <BellRinging size={22} weight="duotone" className="text-brand-light" />
        </div>
        <h3 className="mt-4 font-heading text-xl font-bold text-brand">Slot batch ini sudah penuh</h3>
        <p className="mx-auto mt-2.5 max-w-xs text-sm leading-relaxed text-stone-500">
          Tinggalkan nama dan nomormu — kamu yang pertama kami kabari saat slot
          berikutnya dibuka.
        </p>
      </div>

      <div className="mt-7 space-y-4">
        <input
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="Nama kamu"
          className="feedify-input"
          data-testid="waiting-name"
        />
        <input
          value={form.whatsapp}
          onChange={(e) => setForm({ ...form, whatsapp: e.target.value })}
          placeholder="0812xxxxxxx"
          inputMode="tel"
          className="feedify-input"
          data-testid="waiting-wa"
        />
      </div>

      <button
        type="submit"
        disabled={!valid || sending}
        className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-brand py-4 font-semibold text-brand-cream transition-colors hover:bg-brand-light disabled:opacity-40"
        data-testid="waiting-submit"
      >
        {sending ? <><CircleNotch size={16} className="animate-spin" /> Mendaftar...</> : "Masuk Daftar Tunggu"}
      </button>
      <p className="mt-3 text-center text-xs text-stone-400">Gratis, dan kamu tidak perlu bikin akun.</p>
    </form>
  );
}
