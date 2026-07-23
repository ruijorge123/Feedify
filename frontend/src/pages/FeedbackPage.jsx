import { useState } from "react";
import api from "@/lib/api";
import { toast } from "react-toastify";
import { ChatCircleDots, PaperPlaneRight, CircleNotch, CheckCircle } from "@phosphor-icons/react";
import { useAuth } from "@/context/AuthContext";

export default function FeedbackPage() {
  const { user } = useAuth();
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async () => {
    const text = message.trim();
    if (!text) {
      toast.error("Tulis dulu masukan kamu ya");
      return;
    }
    setSending(true);
    try {
      await api.post("/feedback", { message: text });
      setSent(true);
      setMessage("");
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Gagal mengirim masukan. Coba lagi.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto" data-testid="feedback-page">
      {/* Header */}
      <div className="animate-fade-up mb-6">
        <div className="text-xs uppercase tracking-[0.2em] text-brand-light font-semibold mb-2">Masukan</div>
        <h1 className="font-heading text-3xl sm:text-4xl font-bold text-brand tracking-tight flex items-center gap-2.5">
          <ChatCircleDots size={30} weight="duotone" className="text-brand-gold flex-shrink-0" />
          Feedback
        </h1>
        <p className="text-stone-600 mt-2 max-w-xl">
          Punya kritik, saran, atau masukan apa pun buat Feedify? Tulis di sini — tim kami baca semuanya dan pakai buat bikin Feedify makin bagus.
        </p>
      </div>

      {sent ? (
        <div className="feedify-card p-8 text-center animate-fade-up" data-testid="feedback-sent">
          <CheckCircle size={44} weight="fill" className="text-green-500 mx-auto mb-3" />
          <h2 className="font-heading text-xl font-bold text-brand mb-1">Masukan terkirim, terima kasih! 🙏</h2>
          <p className="text-sm text-stone-500 mb-6">Setiap masukan kamu kami baca dan pertimbangkan.</p>
          <button
            onClick={() => setSent(false)}
            data-testid="feedback-send-another"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border-2 border-brand-sand text-brand font-semibold text-sm hover:border-brand hover:bg-brand-sand/40 transition-all"
          >
            <ChatCircleDots size={16} weight="duotone" /> Kirim masukan lagi
          </button>
        </div>
      ) : (
        <div className="feedify-card p-5 sm:p-6 space-y-4 animate-fade-up">
          <div>
            <label className="text-xs font-semibold uppercase tracking-[0.15em] text-stone-500 mb-2 block">
              Masukan kamu
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              maxLength={5000}
              rows={7}
              placeholder="Tulis kritik, saran, atau masukan apa pun di sini..."
              data-testid="feedback-textarea"
              className="w-full px-4 py-3 rounded-xl border border-stone-200 text-sm text-stone-700 resize-none focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand/20 leading-relaxed"
            />
            <div className="text-right text-[11px] text-stone-400 mt-1">{message.length}/5000</div>
          </div>

          <div className="flex items-center justify-between gap-3 flex-wrap">
            <p className="text-xs text-stone-400">
              Dikirim sebagai <span className="font-semibold text-stone-600">{user?.email}</span>
            </p>
            <button
              onClick={submit}
              disabled={sending || !message.trim()}
              data-testid="feedback-submit"
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-brand text-brand-cream font-heading font-bold text-sm hover:bg-brand-light disabled:opacity-50 transition-all btn-lift"
            >
              {sending ? (
                <><CircleNotch size={16} className="animate-spin" /> Mengirim...</>
              ) : (
                <><PaperPlaneRight size={16} weight="fill" /> Kirim Masukan</>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
