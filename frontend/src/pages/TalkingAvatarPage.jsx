import { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import {
  Microphone,
  UploadSimple,
  Sparkle,
  ArrowLeft,
  Lightning,
  Play,
  DownloadSimple,
  ClockCounterClockwise,
  Timer,
  CheckCircle,
  X,
  Hourglass,
  Info,
} from "@phosphor-icons/react";
import api from "@/lib/api";
import { useCredits, notifyCreditsUpdate } from "@/lib/credits";

// ── Constants ─────────────────────────────────────────────────────────────────

const VOICES = [
  { id: "id_budi",  label: "Budi",  desc: "Pria · Friendly",      flag: "🇮🇩" },
  { id: "id_siti",  label: "Siti",  desc: "Wanita · Profesional", flag: "🇮🇩" },
  { id: "id_andi",  label: "Andi",  desc: "Pria · Energik",       flag: "🇮🇩" },
  { id: "id_dewi",  label: "Dewi",  desc: "Wanita · Hangat",      flag: "🇮🇩" },
];

const BACKGROUNDS = [
  { id: "blur",       label: "Blur",       preview: "bg-gradient-to-br from-stone-300 to-stone-500" },
  { id: "office",     label: "Office",     preview: "bg-gradient-to-br from-slate-200 to-slate-400" },
  { id: "gradient",   label: "Gradient",   preview: "bg-gradient-to-br from-brand to-brand-light" },
  { id: "studio",     label: "Studio",     preview: "bg-gradient-to-br from-neutral-800 to-neutral-950" },
];

const DURATIONS = [
  { seconds: 15, credits: 20, label: "15 detik" },
  { seconds: 30, credits: 40, label: "30 detik" },
];

// ── Coming Soon overlay ────────────────────────────────────────────────────────

function ComingSoonState() {
  return (
    <div className="flex flex-col items-center justify-center py-24 px-6 text-center">
      <div
        className="w-20 h-20 rounded-3xl flex items-center justify-center mb-6"
        style={{ background: "linear-gradient(135deg, rgba(11,61,46,0.12), rgba(229,193,88,0.15))", border: "1px solid rgba(229,193,88,0.25)" }}
      >
        <Microphone size={36} weight="duotone" className="text-brand-gold" />
      </div>
      <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand-gold/15 border border-brand-gold/30 mb-5">
        <Hourglass size={13} weight="fill" className="text-brand-gold" />
        <span className="text-xs font-bold text-brand-gold uppercase tracking-wider">Segera Hadir</span>
      </div>
      <h2 className="font-heading text-2xl font-bold text-brand mb-3">Talking Avatar</h2>
      <p className="text-stone-500 text-sm leading-relaxed max-w-sm mb-8">
        Ubah foto produk menjadi video avatar berbicara yang mempromosikan brand kamu — dengan suara Indonesia yang natural.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-lg w-full mb-8">
        {[
          { icon: "📸", title: "Upload Foto", desc: "Foto produk atau avatar kamu" },
          { icon: "📝", title: "Tulis Script", desc: "AI bantu buat script promosi" },
          { icon: "🎬", title: "Video Siap", desc: "Avatar berbicara langsung" },
        ].map((f) => (
          <div key={f.title} className="feedify-card p-4 text-center">
            <div className="text-2xl mb-2">{f.icon}</div>
            <div className="text-sm font-semibold text-brand mb-1">{f.title}</div>
            <div className="text-xs text-stone-400">{f.desc}</div>
          </div>
        ))}
      </div>
      <p className="text-xs text-stone-400 flex items-center gap-1.5">
        <Info size={13} />
        Tim kami sedang menyiapkan integrasi HeyGen. Fitur ini akan aktif segera.
      </p>
    </div>
  );
}

// ── Photo Upload ───────────────────────────────────────────────────────────────

function PhotoUpload({ value, onChange }) {
  const ref = useRef();

  const handleFile = (file) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast.error("File harus berupa gambar"); return; }
    if (file.size > 10 * 1024 * 1024) { toast.error("Ukuran file maks 10MB"); return; }
    const reader = new FileReader();
    reader.onload = (e) => onChange({ file, preview: e.target.result });
    reader.readAsDataURL(file);
  };

  return (
    <div>
      <label className="text-xs font-semibold uppercase tracking-[0.15em] text-stone-500 mb-2 block">
        1. Foto Produk / Avatar
      </label>
      {value ? (
        <div className="relative w-full aspect-square max-w-[200px] rounded-2xl overflow-hidden border-2 border-brand/30 group">
          <img src={value.preview} alt="preview" className="w-full h-full object-cover" />
          <button
            onClick={() => onChange(null)}
            className="absolute top-2 right-2 h-7 w-7 rounded-full bg-black/50 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <X size={14} weight="bold" />
          </button>
        </div>
      ) : (
        <button
          onClick={() => ref.current?.click()}
          className="w-full aspect-video max-h-40 border-2 border-dashed border-brand/25 rounded-2xl flex flex-col items-center justify-center gap-2 hover:border-brand/50 hover:bg-brand/5 transition-all group"
        >
          <div className="h-12 w-12 rounded-xl bg-brand/10 flex items-center justify-center group-hover:bg-brand/15 transition-colors">
            <UploadSimple size={22} className="text-brand" />
          </div>
          <span className="text-sm font-medium text-brand">Upload foto</span>
          <span className="text-xs text-stone-400">JPG, PNG, WebP — maks 10MB</span>
        </button>
      )}
      <input ref={ref} type="file" accept="image/*" className="hidden" onChange={(e) => handleFile(e.target.files?.[0])} />
    </div>
  );
}

// ── Script Input ───────────────────────────────────────────────────────────────

function ScriptInput({ value, onChange, photo, loading, onAutoGenerate }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="text-xs font-semibold uppercase tracking-[0.15em] text-stone-500">
          2. Script Promosi
        </label>
        <button
          onClick={onAutoGenerate}
          disabled={loading || !photo}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-brand-gold/15 border border-brand-gold/30 text-brand text-[11px] font-semibold hover:bg-brand-gold/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <span className="h-3 w-3 border border-brand border-t-transparent rounded-full animate-spin" />
          ) : (
            <Sparkle size={12} weight="fill" className="text-brand-gold" />
          )}
          Buatkan otomatis
        </button>
      </div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={5}
        maxLength={500}
        placeholder="Tulis script yang akan dibacakan avatar...&#10;&#10;Contoh: Halo! Perkenalkan produk terbaru kami, body lotion premium yang melembapkan kulit dalam 24 jam. Dapatkan sekarang dengan harga spesial!"
        className="w-full px-4 py-3 bg-white border border-brand-sand rounded-xl text-sm text-brand focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand resize-none leading-relaxed transition-all"
      />
      <div className="flex justify-between mt-1">
        <span className="text-[11px] text-stone-400">Script dibacakan oleh avatar</span>
        <span className={`text-[11px] ${value.length > 450 ? "text-amber-500" : "text-stone-400"}`}>{value.length}/500</span>
      </div>
    </div>
  );
}

// ── Result Video ───────────────────────────────────────────────────────────────

function VideoResult({ url }) {
  return (
    <div className="feedify-card p-5 space-y-4">
      <div className="flex items-center gap-2 text-brand font-semibold text-sm">
        <CheckCircle size={18} weight="fill" className="text-green-500" />
        Video berhasil dibuat!
      </div>
      <video
        src={url}
        controls
        className="w-full rounded-xl"
        style={{ maxHeight: 400 }}
      />
      <a
        href={url}
        download="talking-avatar.mp4"
        className="w-full flex items-center justify-center gap-2 py-3 bg-brand text-brand-cream rounded-xl font-semibold text-sm hover:bg-brand-light transition-colors"
      >
        <DownloadSimple size={18} weight="bold" />
        Download Video
      </a>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export default function TalkingAvatarPage() {
  const { credits } = useCredits();
  const balance = credits?.balance ?? credits?.credits_remaining ?? null;

  const [available, setAvailable] = useState(null); // null = loading, true/false
  const [photo,     setPhoto]     = useState(null);
  const [script,    setScript]    = useState("");
  const [voice,     setVoice]     = useState(VOICES[0].id);
  const [bg,        setBg]        = useState(BACKGROUNDS[0].id);
  const [duration,  setDuration]  = useState(15);
  const [scriptLoading,  setScriptLoading]  = useState(false);
  const [generating, setGenerating] = useState(false);
  const [jobStatus,  setJobStatus]  = useState(null); // null | "waiting" | "done" | "error"
  const [videoUrl,   setVideoUrl]   = useState(null);
  const pollRef = useRef(null);

  // Check if HeyGen is configured on the backend
  useEffect(() => {
    api.get("/talking-avatar/status")
      .then(({ data }) => setAvailable(data.available))
      .catch(() => setAvailable(false));
  }, []);

  const selectedDuration = DURATIONS.find(d => d.seconds === duration);
  const canGenerate = photo && script.trim().length >= 20 && !generating;

  const handleAutoScript = async () => {
    if (!photo) { toast.info("Upload foto dulu untuk generate script otomatis"); return; }
    setScriptLoading(true);
    try {
      const { data } = await api.post("/talking-avatar/generate-script", {
        photo_base64: photo.preview,
      });
      setScript(data.script);
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Gagal generate script");
    } finally {
      setScriptLoading(false);
    }
  };

  const handleGenerate = async () => {
    if (balance !== null && balance < selectedDuration.credits) {
      toast.error(`Kredit tidak cukup. Butuh ${selectedDuration.credits} kredit, kamu punya ${balance}.`);
      return;
    }
    setGenerating(true);
    setJobStatus("waiting");
    setVideoUrl(null);

    try {
      const { data } = await api.post("/talking-avatar/generate", {
        photo_base64: photo.preview,
        script: script.trim(),
        voice_id: voice,
        background: bg,
        duration_seconds: duration,
      });

      if (data.video_url) {
        // Immediate result
        setVideoUrl(data.video_url);
        setJobStatus("done");
        if (data.credits) notifyCreditsUpdate(data.credits);
      } else if (data.job_id) {
        // Poll for completion
        pollRef.current = setInterval(async () => {
          try {
            const { data: poll } = await api.get(`/talking-avatar/status/${data.job_id}`);
            if (poll.status === "completed") {
              clearInterval(pollRef.current);
              setVideoUrl(poll.video_url);
              setJobStatus("done");
              if (poll.credits) notifyCreditsUpdate(poll.credits);
              setGenerating(false);
            } else if (poll.status === "failed") {
              clearInterval(pollRef.current);
              setJobStatus("error");
              setGenerating(false);
              toast.error("Gagal membuat video. Kredit dikembalikan.");
            }
          } catch {
            clearInterval(pollRef.current);
            setJobStatus("error");
            setGenerating(false);
          }
        }, 8000);
      }
    } catch (err) {
      setJobStatus("error");
      setGenerating(false);
      toast.error(err?.response?.data?.detail || "Gagal memulai generate");
    }
  };

  useEffect(() => () => clearInterval(pollRef.current), []);

  // Loading state while checking availability
  if (available === null) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="h-8 w-8 rounded-full border-2 border-brand border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link to="/dashboard" className="text-stone-400 hover:text-brand transition-colors">
              <ArrowLeft size={18} />
            </Link>
            <div className="h-10 w-10 rounded-2xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, #0B3D2E, #1E6B50)" }}>
              <Microphone size={20} weight="fill" color="#E5C158" />
            </div>
            <div>
              <h1 className="font-heading text-2xl font-bold text-brand">Talking Avatar</h1>
              <p className="text-stone-500 text-sm">Foto produk → video avatar berbicara</p>
            </div>
          </div>
        </div>
        {/* Credit info */}
        <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
          {DURATIONS.map(d => (
            <div key={d.seconds} className="flex items-center gap-1.5 text-xs text-stone-500">
              <Lightning size={12} weight="fill" className="text-brand-gold" />
              <span>{d.label} = <strong className="text-brand">{d.credits} kredit</strong></span>
            </div>
          ))}
        </div>
      </div>

      {/* Coming Soon if HeyGen not configured */}
      {!available ? (
        <ComingSoonState />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* ── Left: Inputs ── */}
          <div className="space-y-6">
            <div className="feedify-card p-6 space-y-6">
              {/* Photo */}
              <PhotoUpload value={photo} onChange={setPhoto} />

              {/* Script */}
              <ScriptInput
                value={script}
                onChange={setScript}
                photo={photo}
                loading={scriptLoading}
                onAutoGenerate={handleAutoScript}
              />
            </div>

            <div className="feedify-card p-6 space-y-5">
              {/* Voice */}
              <div>
                <label className="text-xs font-semibold uppercase tracking-[0.15em] text-stone-500 mb-3 block">
                  3. Pilih Suara
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {VOICES.map((v) => (
                    <button
                      key={v.id}
                      onClick={() => setVoice(v.id)}
                      className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border text-left transition-all ${
                        voice === v.id
                          ? "border-brand bg-brand/8 text-brand"
                          : "border-brand-sand bg-white text-stone-600 hover:border-brand/40"
                      }`}
                    >
                      <span className="text-base">{v.flag}</span>
                      <div>
                        <div className="text-sm font-semibold">{v.label}</div>
                        <div className="text-[10px] text-stone-400">{v.desc}</div>
                      </div>
                      {voice === v.id && <CheckCircle size={14} weight="fill" className="text-brand ml-auto" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Background */}
              <div>
                <label className="text-xs font-semibold uppercase tracking-[0.15em] text-stone-500 mb-3 block">
                  4. Background
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {BACKGROUNDS.map((b) => (
                    <button
                      key={b.id}
                      onClick={() => setBg(b.id)}
                      className={`flex flex-col items-center gap-1.5 transition-all`}
                    >
                      <div className={`w-full aspect-video rounded-xl ${b.preview} ${
                        bg === b.id ? "ring-2 ring-brand ring-offset-2" : "opacity-75 hover:opacity-100"
                      }`} />
                      <span className={`text-[10px] font-medium ${bg === b.id ? "text-brand" : "text-stone-500"}`}>
                        {b.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Duration */}
              <div>
                <label className="text-xs font-semibold uppercase tracking-[0.15em] text-stone-500 mb-3 block">
                  5. Durasi Video
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {DURATIONS.map((d) => (
                    <button
                      key={d.seconds}
                      onClick={() => setDuration(d.seconds)}
                      className={`flex items-center justify-between px-4 py-3 rounded-xl border transition-all ${
                        duration === d.seconds
                          ? "border-brand bg-brand/8"
                          : "border-brand-sand bg-white hover:border-brand/40"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Timer size={16} className={duration === d.seconds ? "text-brand" : "text-stone-400"} />
                        <span className={`text-sm font-semibold ${duration === d.seconds ? "text-brand" : "text-stone-600"}`}>
                          {d.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Lightning size={11} weight="fill" className="text-brand-gold" />
                        <span className="text-xs font-bold text-brand">{d.credits}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Generate Button */}
            <button
              onClick={handleGenerate}
              disabled={!canGenerate}
              className="w-full py-4 bg-brand text-brand-cream rounded-xl font-semibold text-sm flex items-center justify-center gap-2 hover:bg-brand-light disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md shadow-brand/20 btn-lift"
            >
              {generating ? (
                <>
                  <span className="h-4 w-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  Membuat video...
                </>
              ) : (
                <>
                  <Play size={18} weight="fill" />
                  Generate Video
                  <span className="ml-1 flex items-center gap-1 text-brand-gold text-xs">
                    <Lightning size={11} weight="fill" />
                    {selectedDuration?.credits}
                  </span>
                </>
              )}
            </button>
          </div>

          {/* ── Right: Status / Result ── */}
          <div>
            {jobStatus === "waiting" && (
              <div className="feedify-card p-8 flex flex-col items-center text-center gap-4">
                <div className="h-16 w-16 rounded-2xl bg-brand/8 flex items-center justify-center">
                  <Hourglass size={32} weight="duotone" className="text-brand animate-pulse" />
                </div>
                <div>
                  <div className="font-semibold text-brand mb-1">Sedang membuat video...</div>
                  <div className="text-sm text-stone-500 leading-relaxed">
                    Proses memakan waktu 1–3 menit.<br />Jangan tutup halaman ini.
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs text-stone-400">
                  <ClockCounterClockwise size={13} className="animate-spin" />
                  HeyGen sedang merender avatar
                </div>
              </div>
            )}

            {jobStatus === "done" && videoUrl && (
              <VideoResult url={videoUrl} />
            )}

            {jobStatus === "error" && (
              <div className="feedify-card p-8 flex flex-col items-center text-center gap-3">
                <div className="h-14 w-14 rounded-2xl bg-red-50 flex items-center justify-center">
                  <X size={28} weight="bold" className="text-red-400" />
                </div>
                <div className="font-semibold text-red-600">Gagal membuat video</div>
                <p className="text-sm text-stone-500">Kredit kamu sudah dikembalikan. Coba lagi.</p>
                <button
                  onClick={() => { setJobStatus(null); setGenerating(false); }}
                  className="px-4 py-2 bg-brand text-brand-cream rounded-full text-sm font-semibold hover:bg-brand-light transition-colors"
                >
                  Coba Lagi
                </button>
              </div>
            )}

            {!jobStatus && (
              <div className="feedify-card p-8 flex flex-col items-center text-center gap-4 border-dashed">
                <div className="h-16 w-16 rounded-2xl bg-brand/6 flex items-center justify-center">
                  <Microphone size={32} weight="duotone" className="text-brand/40" />
                </div>
                <div>
                  <div className="font-semibold text-stone-400 mb-1">Preview video muncul di sini</div>
                  <div className="text-sm text-stone-400">
                    Isi form di sebelah kiri, lalu klik Generate Video.
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
