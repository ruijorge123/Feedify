import { useState, useEffect, useRef } from "react";
import { toast } from "react-toastify";
import {
  Brain, PaperPlaneRight, CircleNotch, ArrowCounterClockwise, Warning,
  Target, ListChecks, Lightbulb, CheckCircle,
} from "@phosphor-icons/react";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

const CONTOH = [
  "Penjualan saya stuck 3 bulan padahal follower terus naik",
  "Produk saya bagus tapi orang selalu bilang kemahalan",
  "Baru mulai jualan, bingung harus fokus di mana dulu",
  "Banyak yang tanya di DM tapi jarang jadi beli",
];

/**
 * Growth Consultant as an actual consultation.
 *
 * The old version asked a fixed form then dumped a task list. A consultant does
 * not work that way: they take the case, work out what they still do not know,
 * ask for exactly that, and only commit to advice once the picture is clear. The
 * server decides each turn whether it knows enough — this page just carries the
 * conversation and renders whichever of the two shapes comes back.
 */
export default function GrowthConsultantPage() {
  const { user } = useAuth();
  const [pesan, setPesan] = useState([]);       // {role, content}
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [hasil, setHasil] = useState(null);     // final answer
  const [kuota, setKuota] = useState(null);
  const bawahRef = useRef(null);

  useEffect(() => {
    api.get("/growth-consultant/kuota").then(({ data }) => setKuota(data)).catch(() => {});
  }, []);

  useEffect(() => {
    bawahRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [pesan, loading, hasil]);

  const kirim = async (teks) => {
    const isi = (teks ?? input).trim();
    if (!isi || loading) return;

    const baru = [...pesan, { role: "user", content: isi }];
    setPesan(baru);
    setInput("");
    setLoading(true);

    try {
      const { data } = await api.post("/growth-consultant/consult", { messages: baru });
      if (data.mode === "jawab") {
        setHasil(data);
        if (data.sisa_hari_ini != null) setKuota((k) => ({ ...k, sisa: data.sisa_hari_ini }));
      } else {
        // The analysis is shown above the question so the client can see the
        // consultant is reasoning, not just interrogating.
        setPesan([...baru, {
          role: "assistant",
          content: data.pertanyaan,
          analisis: data.analisis,
          alasan: data.alasan,
          putaran: data.putaran,
        }]);
      }
    } catch (err) {
      const d = err?.response?.data?.detail;
      toast.error(d || "Konsultan sedang sibuk. Coba lagi sebentar ya.");
      setPesan(pesan);           // roll back so the client can retry the same message
      setInput(isi);
    } finally {
      setLoading(false);
    }
  };

  const ulang = () => { setPesan([]); setHasil(null); setInput(""); };

  const habis = kuota && !kuota.unlimited && kuota.sisa === 0;

  return (
    <div className="mx-auto max-w-3xl px-5 py-8 sm:px-8 sm:py-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="grid h-12 w-12 flex-shrink-0 place-items-center rounded-2xl bg-brand-sand">
            <Brain size={22} weight="duotone" className="text-brand-light" />
          </div>
          <div>
            <h1 className="font-heading text-2xl font-bold tracking-tight text-brand sm:text-3xl">Growth Consultant</h1>
            <p className="mt-1.5 max-w-lg text-sm leading-relaxed text-stone-500">
              Ceritakan kondisi bisnismu. Konsultan akan menggali dulu dengan beberapa
              pertanyaan sebelum memberi rekomendasi — supaya sarannya benar-benar untuk kasusmu.
            </p>
          </div>
        </div>
        {kuota && !kuota.unlimited && (
          <span className="flex-shrink-0 rounded-full bg-brand-sand px-3.5 py-1.5 text-xs font-bold text-brand" data-testid="gc-kuota">
            Sisa {kuota.sisa} dari {kuota.limit} hari ini
          </span>
        )}
      </div>

      {habis && !hasil && (
        <div className="mt-7 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <Warning size={20} weight="fill" className="mt-0.5 flex-shrink-0 text-amber-500" />
          <div>
            <div className="font-semibold text-amber-800">Jatah konsultasi hari ini sudah habis</div>
            <p className="mt-1 text-sm text-amber-700">
              Setiap akun dapat {kuota.limit} konsultasi per hari. Silakan lanjut besok ya Kak.
            </p>
          </div>
        </div>
      )}

      {/* ── percakapan ─────────────────────────────────────── */}
      {!hasil && !habis && (
        <>
          {pesan.length === 0 && (
            <div className="mt-8">
              <div className="text-xs font-bold uppercase tracking-[0.14em] text-stone-400">
                Contoh kondisi yang bisa dibahas
              </div>
              <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
                {CONTOH.map((c) => (
                  <button
                    key={c}
                    onClick={() => kirim(c)}
                    className="rounded-2xl border border-brand-sand bg-white p-4 text-left text-sm text-stone-600 transition-all hover:-translate-y-0.5 hover:border-brand-light hover:shadow-sm"
                    data-testid="gc-contoh"
                  >
                    "{c}"
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="mt-7 space-y-4">
            {pesan.map((m, i) => (
              m.role === "user" ? (
                <div key={i} className="flex justify-end">
                  <div className="max-w-[85%] rounded-2xl rounded-tr-md bg-brand px-5 py-3.5 text-sm leading-relaxed text-brand-cream">
                    {m.content}
                  </div>
                </div>
              ) : (
                <div key={i} className="rounded-2xl border border-brand-sand bg-white p-5" data-testid="gc-pertanyaan">
                  {m.analisis && (
                    <p className="border-b border-brand-sand pb-3 text-xs leading-relaxed text-stone-500">
                      {m.analisis}
                    </p>
                  )}
                  <p className="mt-3 font-heading font-semibold leading-snug text-brand">{m.content}</p>
                  {m.alasan && <p className="mt-2 text-xs leading-relaxed text-stone-400">{m.alasan}</p>}
                </div>
              )
            ))}

            {loading && (
              <div className="flex items-center gap-3 rounded-2xl border border-brand-sand bg-white p-5">
                <CircleNotch size={18} className="animate-spin text-brand-light" />
                <span className="text-sm text-stone-500">
                  {pesan.length <= 1 ? "Membaca kondisi bisnismu..." : "Menganalisis jawabanmu..."}
                </span>
              </div>
            )}
          </div>

          <div ref={bawahRef} />

          {/* input */}
          <div className="sticky bottom-4 mt-6">
            <div className="flex items-end gap-2 rounded-2xl border border-brand-sand bg-white p-2.5 shadow-lg">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); kirim(); }
                }}
                rows={2}
                placeholder={pesan.length === 0
                  ? "Ceritakan kondisi bisnismu, sedetail mungkin..."
                  : "Jawab pertanyaan di atas..."}
                className="flex-1 resize-none bg-transparent px-3 py-2 text-sm leading-relaxed text-stone-700 outline-none placeholder:text-stone-400"
                data-testid="gc-input"
              />
              <button
                onClick={() => kirim()}
                disabled={!input.trim() || loading}
                className="grid h-11 w-11 flex-shrink-0 place-items-center rounded-xl bg-brand text-brand-cream transition-colors hover:bg-brand-light disabled:opacity-30"
                aria-label="Kirim"
                data-testid="gc-kirim"
              >
                <PaperPlaneRight size={17} weight="fill" />
              </button>
            </div>
            <p className="mt-2 text-center text-[11px] text-stone-400">
              Makin lengkap angkanya, makin tajam analisanya. Jatah hanya terpakai saat
              rekomendasi akhir keluar.
            </p>
          </div>
        </>
      )}

      {/* ── hasil akhir ────────────────────────────────────── */}
      {hasil && (
        <div className="mt-8 space-y-5" data-testid="gc-hasil">
          <div className="rounded-3xl bg-brand p-7">
            <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.15em] text-brand-gold">
              <Target size={14} weight="duotone" /> Akar masalah
            </div>
            <p className="mt-3 leading-relaxed text-brand-cream">{hasil.akar_masalah}</p>
            {hasil.analisis && (
              <p className="mt-4 border-t border-white/10 pt-4 text-sm leading-relaxed text-brand-cream/60">
                {hasil.analisis}
              </p>
            )}
          </div>

          {hasil.prioritas && (
            <div className="flex items-start gap-4 rounded-2xl border border-brand-gold/40 bg-brand-gold/10 p-5">
              <Lightbulb size={20} weight="duotone" className="mt-0.5 flex-shrink-0 text-brand-gold" />
              <div>
                <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-brand">Kerjakan ini dulu</div>
                <p className="mt-1.5 text-sm leading-relaxed text-stone-700">{hasil.prioritas}</p>
              </div>
            </div>
          )}

          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-stone-400">
              <ListChecks size={14} weight="duotone" /> Rekomendasi
            </div>
            <div className="mt-4 space-y-3">
              {(hasil.rekomendasi || []).map((r, i) => (
                <div key={i} className="rounded-2xl border border-brand-sand bg-white p-5">
                  <div className="flex items-start gap-3">
                    <span className="grid h-6 w-6 flex-shrink-0 place-items-center rounded-full bg-brand font-heading text-[11px] font-bold text-brand-gold">
                      {i + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-heading font-semibold text-brand">{r.judul}</h3>
                      {r.kenapa && <p className="mt-1.5 text-xs leading-relaxed text-stone-400">{r.kenapa}</p>}
                      {r.langkah && (
                        <p className="mt-3 whitespace-pre-line border-t border-brand-sand pt-3 text-sm leading-relaxed text-stone-600">
                          {r.langkah}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-brand-sand pt-6">
            <span className="inline-flex items-center gap-1.5 text-xs text-stone-400">
              <CheckCircle size={13} weight="fill" className="text-emerald-500" /> Konsultasi selesai
              {hasil.sisa_hari_ini != null && ` · sisa ${hasil.sisa_hari_ini} hari ini`}
            </span>
            <button
              onClick={ulang}
              disabled={hasil.sisa_hari_ini === 0}
              className="inline-flex items-center gap-2 rounded-full border border-brand px-5 py-2.5 text-sm font-semibold text-brand transition-colors hover:bg-brand hover:text-brand-cream disabled:opacity-40"
              data-testid="gc-ulang"
            >
              <ArrowCounterClockwise size={14} weight="bold" /> Konsultasi Baru
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
