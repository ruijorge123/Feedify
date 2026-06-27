import { useEffect, useState } from "react";
import api from "@/lib/api";
import { toast } from 'react-toastify';
import {
  ShieldCheck,
  Camera,
  CircleNotch,
  Sparkle,
  CheckCircle,
  Warning,
  XCircle,
} from "@phosphor-icons/react";

export default function ConsistencyCheckerPage() {
  const [photo, setPhoto] = useState(null);
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [brand, setBrand] = useState(null);

  useEffect(() => {
    api.get("/brand-profile").then(({ data }) => setBrand(data)).catch(() => {});
  }, []);

  const handlePhoto = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Foto max 5MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => { setPhoto(reader.result); setResult(null); };
    reader.readAsDataURL(file);
  };

  const check = async () => {
    if (!photo) {
      toast.error("Upload foto dulu");
      return;
    }
    setLoading(true);
    try {
      const base64 = photo.split(",")[1];
      const mime = photo.split(";")[0].split(":")[1];
      const { data } = await api.post("/consistency/check", { image_base64: base64, mime_type: mime, note });
      if (data.error) {
        toast.error("Feedify gagal memproses, coba lagi");
        return;
      }
      setResult(data);
      toast.success("Analisis selesai!");
      setTimeout(() => document.getElementById("check-result")?.scrollIntoView({ behavior: "smooth" }), 100);
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Gagal cek konsistensi");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6" data-testid="consistency-checker-page">
      <div className="animate-fade-up">
        <div className="text-xs uppercase tracking-[0.2em] text-brand-light font-semibold mb-2">Dashboard · Consistency Check</div>
        <h1 className="font-heading text-3xl sm:text-4xl font-bold text-brand tracking-tight">Brand Consistency Checker</h1>
        <p className="text-stone-600 mt-2 max-w-2xl">
          Upload hasil konten yang sudah di-generate — Feedify akan skor konsistensi vs Brand DNA kamu dan kasih saran perbaikan visual.
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-5 animate-fade-up">
          <div className="feedify-card p-6 space-y-5">
            <label
              htmlFor="check-photo"
              data-testid="check-photo-label"
              className="block cursor-pointer border-2 border-dashed border-brand-sand rounded-xl p-6 hover:border-brand-light transition-all text-center"
            >
              {photo ? (
                <div>
                  <img src={photo} alt="check" className="max-h-80 mx-auto rounded-lg" />
                  <div className="text-xs text-stone-500 mt-2">Klik untuk ganti foto</div>
                </div>
              ) : (
                <div className="py-8">
                  <Camera size={40} className="mx-auto text-brand-light mb-3" weight="duotone" />
                  <div className="font-medium text-brand">Upload hasil gambar Anda</div>
                  <div className="text-xs text-stone-500 mt-1">PNG/JPG/WEBP, max 5MB</div>
                </div>
              )}
            </label>
            <input id="check-photo" type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={handlePhoto} data-testid="check-photo-input" />

            <div>
              <label className="text-xs font-semibold uppercase tracking-[0.15em] text-stone-500 mb-1.5 block">Catatan (opsional)</label>
              <textarea
                rows={2}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="input resize-none"
                placeholder="mis. Banner promo Lebaran"
                data-testid="check-note"
              />
            </div>

            <button
              onClick={check}
              disabled={loading || !photo}
              data-testid="check-submit-btn"
              className="w-full py-4 bg-brand text-brand-cream rounded-full font-bold text-lg hover:bg-brand-light btn-lift inline-flex items-center justify-center gap-2 disabled:opacity-60 shadow-lg"
            >
              {loading ? <><CircleNotch size={20} className="animate-spin" /> Menganalisis...</> : <><ShieldCheck size={20} weight="fill" /> Cek Konsistensi</>}
            </button>
          </div>
        </div>

        {brand && (
          <div className="lg:sticky lg:top-6 lg:self-start animate-fade-up">
            <div className="feedify-card p-5">
              <div className="text-xs uppercase tracking-[0.18em] text-brand-light font-bold mb-2">Brand DNA Reference</div>
              <div className="font-heading font-bold text-brand">{brand.brand_name}</div>
              <div className="text-xs text-stone-500 mb-3">{brand.category} · {brand.visual_style}</div>
              <div className="flex gap-1.5 mb-3">
                {[brand.color_primary, brand.color_secondary].map((c, i) => (
                  <div key={i} className="h-9 w-9 rounded-lg border border-white shadow-sm" style={{ background: c }} />
                ))}
              </div>
              <div className="text-xs text-stone-600">Tone: <span className="font-semibold text-brand">{brand.tone}</span></div>
            </div>
          </div>
        )}
      </div>

      {result && (
        <div id="check-result" className="space-y-5 animate-fade-up">
          <div className="feedify-card p-6">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-4">
                <ScoreBadge score={result.overall_score} />
                <div>
                  <div className="text-xs uppercase tracking-[0.18em] text-stone-500 font-bold">Verdict</div>
                  <div className="font-heading text-2xl font-bold text-brand">{result.alignment_verdict}</div>
                </div>
              </div>
            </div>
            <p className="mt-4 text-stone-700 leading-relaxed">{result.summary}</p>
          </div>

          {/* Subscores */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <SubScore label="Color" score={result.color_score} testid="score-color" />
            <SubScore label="Mood" score={result.mood_score} testid="score-mood" />
            <SubScore label="Composition" score={result.composition_score} testid="score-composition" />
            <SubScore label="Typography" score={result.typography_score} testid="score-typography" />
          </div>

          {/* Dominant colors */}
          {result.detected_dominant_colors?.length > 0 && (
            <div className="feedify-card p-5">
              <div className="text-xs uppercase tracking-[0.18em] text-brand-light font-bold mb-3">Warna dominan di gambar</div>
              <div className="flex gap-2 flex-wrap">
                {result.detected_dominant_colors.map((c, i) => (
                  <div key={i} className="flex flex-col items-center">
                    <div className="h-12 w-12 rounded-xl border border-white shadow-md" style={{ background: c }} />
                    <div className="text-[10px] font-mono text-stone-500 mt-1">{c}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Strengths & Weaknesses */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="feedify-card p-5">
              <div className="text-xs uppercase tracking-[0.18em] text-green-700 font-bold mb-3 flex items-center gap-1.5">
                <CheckCircle size={14} weight="fill" /> Strengths
              </div>
              <ul className="space-y-2">
                {(result.strengths || []).map((s, i) => (
                  <li key={i} className="text-sm text-stone-700 flex gap-2">
                    <span className="text-green-600">✓</span>{s}
                  </li>
                ))}
              </ul>
            </div>
            <div className="feedify-card p-5">
              <div className="text-xs uppercase tracking-[0.18em] text-amber-700 font-bold mb-3 flex items-center gap-1.5">
                <Warning size={14} weight="fill" /> Weaknesses
              </div>
              <ul className="space-y-2">
                {(result.weaknesses || []).map((w, i) => (
                  <li key={i} className="text-sm text-stone-700 flex gap-2">
                    <span className="text-amber-600">!</span>{w}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Actionable tips */}
          <div className="feedify-card p-5">
            <div className="text-xs uppercase tracking-[0.18em] text-brand-light font-bold mb-3 flex items-center gap-1.5">
              <Sparkle size={14} weight="fill" /> Saran perbaikan untuk prompt berikutnya
            </div>
            <ol className="space-y-2">
              {(result.actionable_tips || []).map((tip, i) => (
                <li key={i} className="text-sm text-stone-700 flex gap-3">
                  <span className="flex-shrink-0 h-6 w-6 rounded-full bg-brand-gold text-brand font-bold text-xs flex items-center justify-center">{i + 1}</span>
                  {tip}
                </li>
              ))}
            </ol>
          </div>
        </div>
      )}
    </div>
  );
}

function ScoreBadge({ score }) {
  const tone = score >= 75 ? "text-green-700 bg-green-50 border-green-200" : score >= 50 ? "text-amber-700 bg-amber-50 border-amber-200" : "text-red-700 bg-red-50 border-red-200";
  return (
    <div className={`h-24 w-24 rounded-full border-4 flex flex-col items-center justify-center ${tone}`} data-testid="overall-score">
      <div className="font-heading text-3xl font-bold leading-none">{score}</div>
      <div className="text-[10px] uppercase tracking-wider mt-0.5">/ 100</div>
    </div>
  );
}

function SubScore({ label, score, testid }) {
  return (
    <div className="feedify-card p-4" data-testid={testid}>
      <div className="text-xs uppercase tracking-[0.18em] text-stone-500 font-semibold">{label}</div>
      <div className="font-heading text-3xl font-bold text-brand mt-1">{score ?? "-"}</div>
      <div className="h-1.5 rounded-full bg-brand-sand mt-2 overflow-hidden">
        <div className="h-full bg-brand transition-all" style={{ width: `${score || 0}%` }} />
      </div>
    </div>
  );
}
