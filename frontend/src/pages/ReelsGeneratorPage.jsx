import { useState, useRef, useEffect } from "react";
import api from "@/lib/api";
import { toast } from "react-toastify";
import { useAuth } from "@/context/AuthContext";
import { notifyCreditsUpdate } from "@/lib/credits";
import NoCreditsModal from "@/components/NoCreditsModal";
import {
  FilmSlate, UploadSimple, Image as ImageIcon, CircleNotch,
  CheckCircle, DownloadSimple, ArrowsClockwise, Sparkle, Lightning,
  CaretDown, VideoCamera, Notepad, Clock, FrameCorners, XCircle,
} from "@phosphor-icons/react";

const VIDEO_GOALS = [
  { id: "new_launch",      label: "New Launch",       desc: "Debut produk baru" },
  { id: "promo_diskon",    label: "Promo Diskon",      desc: "Iklan promo & diskon" },
  { id: "brand_awareness", label: "Brand Awareness",   desc: "Perkenalan brand" },
  { id: "best_seller",     label: "Best Seller",       desc: "Produk terlaris" },
  { id: "restock",         label: "Restock",           desc: "Produk kembali tersedia" },
  { id: "grand_opening",   label: "Grand Opening",     desc: "Pembukaan toko/outlet" },
  { id: "testimoni",       label: "Testimoni",         desc: "Social proof & review" },
  { id: "edukasi_produk",  label: "Edukasi Produk",    desc: "Cara pakai & manfaat" },
];

const DURATIONS = [
  { value: 5,  label: "5 Detik",  desc: "Singkat & impactful" },
  { value: 8,  label: "8 Detik",  desc: "Standard Reels" },
  { value: 10, label: "10 Detik", desc: "Full story" },
];

const ASPECT_RATIOS = [
  { value: "9:16", label: "9:16", desc: "Reels · TikTok",   w: 9,  h: 16, recommended: true },
  { value: "1:1",  label: "1:1",  desc: "Feed · WA Status", w: 1,  h: 1  },
  { value: "4:5",  label: "4:5",  desc: "Portrait Feed",    w: 4,  h: 5  },
];

const QUICK_IDEAS = [
  { emoji: "✨", label: "Apple Style",  value: "buat seperti iklan Apple, clean dan cinematic" },
  { emoji: "🎥", label: "Cinematic",    value: "cinematic dengan gerakan kamera lambat dan dramatis" },
  { emoji: "💎", label: "Luxury",       value: "nuansa luxury premium, hitam emas, dramatic lighting" },
  { emoji: "🔥", label: "Viral TikTok", value: "energik dan catchy seperti konten viral TikTok" },
];

const RANDOM_IDEAS = [
  "Cinematic luxury advertisement with slow orbit camera.",
  "Modern Apple style commercial with clean studio lighting.",
  "Luxury perfume advertisement with dramatic shadow.",
  "Premium product reveal with golden hour lighting.",
  "Minimal clean commercial with smooth dolly movement.",
  "High-end beauty advertisement with soft bokeh.",
  "Elegant brand film with warm cafe atmosphere.",
  "Dynamic product close-up with cinematic depth of field.",
];

const GEN_PHASES = [
  "Feedify Video Director menganalisis produk...",
  "Menyusun brief sinematik...",
  "Mengirim ke Kling Video...",
  "Merender video Reels-mu...",
  "Sentuhan akhir...",
];

const CREDITS_PER_VIDEO = 3;

export default function ReelsGeneratorPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const [image, setImage]               = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [isDragging, setIsDragging]     = useState(false);
  const [directorNotes, setDirectorNotes] = useState("");
  const [form, setForm] = useState({
    video_goal:   "new_launch",
    duration:     5,
    aspect_ratio: "9:16",
  });
  const [generating, setGenerating] = useState(false);
  const [noCredits,  setNoCredits]  = useState(false);
  const [genPhase, setGenPhase]     = useState("");
  const [result, setResult]         = useState(null);

  const fileInputRef = useRef(null);

  const upd = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  const handleFile = (file) => {
    if (!file || !file.type.startsWith("image/")) {
      toast.error("File harus berupa gambar (JPG, PNG, WebP)");
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      toast.error("Ukuran gambar maksimal 20 MB");
      return;
    }
    setImage(file);
    const reader = new FileReader();
    reader.onload = (e) => setImagePreview(e.target.result);
    reader.readAsDataURL(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const pickIdea = (value) => setDirectorNotes(value);

  const randomIdea = () => {
    const current = directorNotes.trim();
    const pool = RANDOM_IDEAS.filter(r => r !== current);
    const pick = pool[Math.floor(Math.random() * pool.length)];
    setDirectorNotes(pick);
  };

  useEffect(() => {
    if (!generating) { setGenPhase(""); return; }
    let i = 0;
    setGenPhase(GEN_PHASES[0]);
    const iv = setInterval(() => {
      i = (i + 1) % GEN_PHASES.length;
      setGenPhase(GEN_PHASES[i]);
    }, 20000);
    return () => clearInterval(iv);
  }, [generating]);

  const generate = async () => {
    if (!image) { toast.error("Upload foto produk dulu"); return; }
    setGenerating(true);
    setResult(null);

    const formData = new FormData();
    formData.append("image",          image);
    formData.append("video_goal",     form.video_goal);
    formData.append("duration",       form.duration.toString());
    formData.append("aspect_ratio",   form.aspect_ratio);
    formData.append("director_notes", directorNotes.trim());

    try {
      const { data } = await api.post("/reels/generate", formData, {
        headers: { "Content-Type": "multipart/form-data" },
        timeout: 360000,
      });
      setResult(data.video);
      notifyCreditsUpdate();
      toast.success("Video Reels berhasil dibuat!");
      setTimeout(() => document.getElementById("reels-result")?.scrollIntoView({ behavior: "smooth" }), 100);
    } catch (err) {
      if (err?.response?.status === 402) {
        setNoCredits(true);
      } else {
        const msg = err?.response?.data?.detail || "Gagal generate video, coba lagi";
        toast.error(msg);
      }
      notifyCreditsUpdate();
    } finally {
      setGenerating(false);
    }
  };

  const reset = () => { setResult(null); };

  const selectedGoal  = VIDEO_GOALS.find(g => g.id === form.video_goal);
  const selectedRatio = ASPECT_RATIOS.find(r => r.value === form.aspect_ratio);

  const ratioContainerClass = form.aspect_ratio === "9:16"
    ? "aspect-[9/16] max-w-[280px]"
    : form.aspect_ratio === "1:1"
      ? "aspect-square max-w-sm"
      : "aspect-[4/5] max-w-[280px]";

  return (
    <>
    <div className="space-y-6" data-testid="reels-generator-page">
      {/* Header */}
      <div className="animate-fade-up">
        <div className="flex items-center gap-2.5 mb-2">
          <div className="h-9 w-9 rounded-xl bg-brand flex items-center justify-center flex-shrink-0">
            <FilmSlate size={18} weight="fill" className="text-brand-gold" />
          </div>
          <div>
            <h1 className="font-heading text-2xl font-bold text-brand leading-tight">Reels Generator</h1>
            <p className="text-xs text-stone-400 font-medium">Upload foto produk · Pilih tujuan · Feedify yang kerja</p>
          </div>
        </div>
        <p className="text-stone-500 mt-1 text-sm max-w-xl">
          Ubah satu foto produkmu menjadi video iklan pendek berkualitas profesional untuk Instagram Reels, TikTok, dan WhatsApp Status.
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* ── Form ── */}
        <div className="lg:col-span-2 space-y-4 animate-fade-up min-w-0">

          {/* 01 FOTO PRODUK */}
          <div className="feedify-card p-5 sm:p-6 space-y-4">
            <SectionHeader num="01" icon={<ImageIcon size={15} weight="duotone" />} title="Foto Produk" />

            <div
              onClick={() => fileInputRef.current?.click()}
              onDrop={handleDrop}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              data-testid="reels-image-upload"
              className={`relative cursor-pointer rounded-2xl border-2 border-dashed transition-all ${
                isDragging ? "border-brand bg-brand-sand/50"
                : imagePreview ? "border-brand/40 bg-brand-sand/20"
                : "border-stone-200 hover:border-brand/40 hover:bg-brand-sand/20"
              }`}
            >
              {imagePreview ? (
                <div className="relative">
                  <img src={imagePreview} alt="Preview" className="w-full max-h-72 object-contain rounded-2xl p-3" />
                  <div className="absolute bottom-3 right-3">
                    <span className="bg-brand/80 text-brand-cream text-[10px] font-bold uppercase tracking-[0.15em] px-3 py-1 rounded-full">
                      Ganti Foto
                    </span>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                  <div className="h-14 w-14 rounded-2xl bg-brand-sand border border-brand-sand/80 flex items-center justify-center mb-4">
                    <UploadSimple size={24} weight="duotone" className="text-brand" />
                  </div>
                  <div className="font-heading font-semibold text-stone-700 text-sm">Drag & drop atau klik untuk upload</div>
                  <div className="text-xs text-stone-400 mt-1">JPG, PNG, WebP · Maksimal 20 MB</div>
                  <div className="mt-4 px-5 py-2 bg-brand text-brand-cream rounded-full text-sm font-semibold">
                    Pilih Foto
                  </div>
                </div>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              data-testid="reels-file-input"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
            />

            {imagePreview && (
              <p className="text-[11px] text-stone-400 text-center">
                Feedify akan menjaga tampilan produk — logo, label, warna, dan bentuk tetap identik
              </p>
            )}
          </div>

          {/* 02 TUJUAN VIDEO */}
          <div className="feedify-card p-5 sm:p-6 space-y-4">
            <SectionHeader num="02" icon={<Notepad size={15} weight="duotone" />} title="Tujuan Video" />

            <div className="relative">
              <select
                value={form.video_goal}
                onChange={(e) => upd("video_goal", e.target.value)}
                data-testid="reels-video-goal"
                className="input w-full appearance-none pr-10 font-semibold text-brand cursor-pointer"
              >
                {VIDEO_GOALS.map(g => (
                  <option key={g.id} value={g.id}>{g.label} — {g.desc}</option>
                ))}
              </select>
              <CaretDown size={16} weight="bold" className="absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
            </div>

            {selectedGoal && (
              <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-brand-sand/50 border border-brand-sand text-sm">
                <Sparkle size={13} weight="fill" className="text-brand-gold flex-shrink-0" />
                <span className="text-stone-600">
                  Feedify akan menyesuaikan gerakan kamera dan suasana untuk iklan{" "}
                  <strong className="text-brand">{selectedGoal.label}</strong>
                </span>
              </div>
            )}
          </div>

          {/* 03 PENGATURAN VIDEO */}
          <div className="feedify-card p-5 sm:p-6 space-y-5">
            <SectionHeader num="03" icon={<VideoCamera size={15} weight="duotone" />} title="Pengaturan Video" />

            {/* Duration */}
            <div>
              <label className="text-[10px] font-semibold uppercase tracking-[0.15em] text-stone-400 mb-2.5 flex items-center gap-1.5">
                <Clock size={12} weight="duotone" /> Durasi
              </label>
              <div className="grid grid-cols-3 gap-2">
                {DURATIONS.map(d => (
                  <button key={d.value} type="button" data-testid={`reels-duration-${d.value}`}
                    onClick={() => upd("duration", d.value)}
                    className={`flex flex-col items-center gap-1 py-3 rounded-xl border-2 transition-all ${
                      form.duration === d.value
                        ? "bg-brand border-brand text-brand-cream"
                        : "bg-white border-stone-200 text-stone-600 hover:border-stone-300"
                    }`}>
                    <span className="font-heading font-bold text-base leading-none">{d.label}</span>
                    <span className={`text-[10px] leading-none ${form.duration === d.value ? "text-brand-cream/70" : "text-stone-400"}`}>{d.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Aspect Ratio */}
            <div>
              <label className="text-[10px] font-semibold uppercase tracking-[0.15em] text-stone-400 mb-2.5 flex items-center gap-1.5">
                <FrameCorners size={12} weight="duotone" /> Format Video
              </label>
              <div className="grid grid-cols-3 gap-2">
                {ASPECT_RATIOS.map(r => {
                  const active = form.aspect_ratio === r.value;
                  const maxW = 24, maxH = 28;
                  const scale = Math.min(maxW / r.w, maxH / r.h);
                  const fw = Math.round(r.w * scale);
                  const fh = Math.round(r.h * scale);
                  return (
                    <button key={r.value} type="button"
                      data-testid={`reels-ratio-${r.value.replace(":", "-")}`}
                      onClick={() => upd("aspect_ratio", r.value)}
                      className={`relative flex flex-col items-center gap-2 py-3 px-2 rounded-xl border-2 transition-all ${
                        active ? "border-brand bg-brand-sand" : "border-stone-100 bg-white hover:border-brand/30"
                      }`}>
                      {r.recommended && (
                        <span className="absolute -top-2 left-1/2 -translate-x-1/2 text-[7px] bg-brand-gold text-brand font-bold px-1.5 py-0.5 rounded-full whitespace-nowrap">Rekomen</span>
                      )}
                      <div className="flex items-center justify-center" style={{ width: 28, height: 30 }}>
                        <div className={`relative rounded-[3px] border-2 overflow-hidden transition-colors ${active ? "border-brand" : "border-stone-300"}`}
                          style={{ width: fw, height: fh, background: active ? "rgba(11,61,46,0.1)" : "#f5f5f4" }}>
                          <div className="absolute inset-0 flex flex-col justify-end p-[2px] gap-[1.5px]">
                            <div className={`rounded-full ${active ? "bg-brand/30" : "bg-stone-300"}`} style={{ height: 1.5 }} />
                            <div className={`rounded-full w-3/4 ${active ? "bg-brand/20" : "bg-stone-200"}`} style={{ height: 1 }} />
                          </div>
                        </div>
                      </div>
                      <span className={`font-bold text-[11px] leading-none ${active ? "text-brand" : "text-stone-600"}`}>{r.label}</span>
                      <span className={`text-[9px] leading-none text-center ${active ? "text-brand/60" : "text-stone-400"}`}>{r.desc}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* 04 VIDEO DIRECTOR */}
          <div className="feedify-card p-5 sm:p-6 space-y-4">
            <div className="flex items-center gap-2.5">
              <span className="text-[10px] font-bold text-brand-light font-mono">04</span>
              <span className="text-brand"><Sparkle size={15} weight="duotone" /></span>
              <h3 className="font-heading text-base font-bold text-brand">Video Director</h3>
              <span className="ml-auto text-[10px] text-stone-400 bg-stone-100 px-2.5 py-0.5 rounded-full font-semibold">Opsional</span>
            </div>

            <p className="text-xs text-stone-500 -mt-1">
              Tulis jika ada keinginan khusus. Kosongkan jika ingin Feedify menentukan semuanya secara otomatis.
            </p>

            {/* Textarea */}
            <div className="relative">
              <textarea
                value={directorNotes}
                onChange={(e) => setDirectorNotes(e.target.value)}
                rows={4}
                data-testid="reels-director-notes"
                className="input w-full resize-none"
                placeholder={"Contoh:\n• buat seperti iklan Apple\n• kamera bergerak pelan mengelilingi produk\n• nuansa premium hitam emas\n• fokus memperlihatkan tekstur produk"}
              />
              {directorNotes.trim() && (
                <button type="button" onClick={() => setDirectorNotes("")}
                  className="absolute top-2.5 right-2.5 text-stone-300 hover:text-stone-400 transition-colors">
                  <XCircle size={15} weight="fill" />
                </button>
              )}
            </div>

            {/* Quick Ideas + Acak Ide */}
            <div className="flex flex-wrap items-center gap-2">
              {QUICK_IDEAS.map(({ emoji, label, value }) => (
                <button key={label} type="button"
                  data-testid={`quick-idea-${label.replace(/\s+/g, "-").toLowerCase()}`}
                  onClick={() => pickIdea(value)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold border transition-all ${
                    directorNotes === value
                      ? "bg-brand text-brand-cream border-brand"
                      : "bg-white border-stone-200 text-stone-600 hover:border-brand/30 hover:text-brand"
                  }`}>
                  <span>{emoji}</span> {label}
                </button>
              ))}
              <button type="button" onClick={randomIdea} data-testid="random-idea-btn"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold border border-dashed border-brand-gold text-brand-gold hover:bg-brand-gold/10 transition-all">
                <Sparkle size={12} weight="fill" /> Acak Ide
              </button>
            </div>
          </div>

          {/* Feedify akan otomatis */}
          <div className="rounded-2xl border border-green-100 p-5 bg-gradient-to-br from-green-50/60 to-white" data-testid="reels-ai-card">
            <div className="flex items-center gap-2 mb-3">
              <Sparkle size={14} weight="fill" className="text-brand-gold" />
              <p className="text-sm font-semibold text-brand">Feedify akan otomatis</p>
            </div>
            <div className="space-y-2">
              {[
                "Menganalisis foto produk untuk memahami karakter visual",
                "Menyusun prompt sinematik dengan GPT-4o Video Director",
                "Menyesuaikan gerakan kamera dan pencahayaan otomatis",
                "Menghasilkan video dengan Kling v2.5 resolusi tinggi",
                "Menghasilkan video siap upload ke Reels, TikTok, atau WA Status",
              ].map((item) => (
                <div key={item} className="flex items-center gap-2.5">
                  <CheckCircle size={14} weight="fill" className="text-green-500 flex-shrink-0" />
                  <span className="text-xs text-stone-600">{item}</span>
                </div>
              ))}
            </div>
            <p className="text-[11px] text-stone-400 mt-4">⏱ Estimasi proses ±60–120 detik.</p>
          </div>

          {/* Desktop Generate Button */}
          <div className="hidden lg:block space-y-2 pt-1">
            <button onClick={generate} disabled={generating || !image} data-testid="reels-generate-btn-desktop"
              className="w-full py-3.5 rounded-full font-heading font-bold text-base flex items-center justify-center gap-2 transition-all btn-lift disabled:opacity-50 disabled:cursor-not-allowed bg-brand text-brand-cream hover:bg-brand-light shadow-md shadow-brand/20">
              {generating ? (
                <><CircleNotch size={18} className="animate-spin" /> Sedang render video...</>
              ) : (
                <><FilmSlate size={18} weight="fill" /> Generate Video · {CREDITS_PER_VIDEO} Kredit</>
              )}
            </button>
          </div>
        </div>

        {/* ── Sidebar ── */}
        <div className="lg:sticky lg:top-6 lg:self-start space-y-4">
          {/* Brief Summary */}
          <div className="feedify-card p-4 space-y-3">
            <div className="text-xs uppercase tracking-[0.18em] text-brand-light font-bold flex items-center gap-1.5">
              <FilmSlate size={13} weight="duotone" /> Video Brief
            </div>
            <BriefRow label="Foto"    value={image ? image.name.slice(0, 20) + (image.name.length > 20 ? "…" : "") : "Belum diupload"} empty={!image} />
            <BriefRow label="Tujuan"  value={selectedGoal?.label || "—"} />
            <BriefRow label="Durasi"  value={`${form.duration} detik`} />
            <BriefRow label="Format"  value={`${form.aspect_ratio} · ${selectedRatio?.desc}`} />
            {directorNotes.trim() && (
              <BriefRow label="Arahan" value={directorNotes.slice(0, 24) + (directorNotes.length > 24 ? "…" : "")} />
            )}
            <div className="border-t border-stone-100 pt-2 mt-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-stone-400">Biaya Generate</span>
                <span className="font-bold text-brand-gold flex items-center gap-1">
                  <Lightning size={11} weight="fill" /> {CREDITS_PER_VIDEO} kredit
                </span>
              </div>
            </div>
          </div>

          {/* Sidebar Generate Button (desktop only — also shown here for easy access) */}
          <button onClick={generate} disabled={generating || !image} data-testid="reels-generate-btn"
            className="w-full py-4 rounded-2xl font-heading font-bold text-base flex items-center justify-center gap-2 transition-all shadow-lg btn-lift disabled:opacity-50 disabled:cursor-not-allowed bg-brand text-brand-cream hover:bg-brand-light shadow-brand/20">
            {generating ? (
              <><CircleNotch size={20} className="animate-spin" /> Generating...</>
            ) : (
              <><FilmSlate size={20} weight="fill" /> Generate Video · {CREDITS_PER_VIDEO} Kredit</>
            )}
          </button>

          {generating && (
            <div className="feedify-card p-4 animate-fade-up">
              <div className="flex items-center gap-2.5 mb-3">
                <CircleNotch size={16} className="animate-spin text-brand flex-shrink-0" />
                <span className="text-xs font-semibold text-brand">Sedang Render</span>
              </div>
              <p className="text-xs text-stone-500 leading-relaxed">{genPhase}</p>
              <p className="text-[10px] text-stone-400 mt-2">
                Estimasi waktu: 1–3 menit. Jangan tutup halaman ini.
              </p>
              <div className="mt-3 h-1 bg-stone-100 rounded-full overflow-hidden">
                <div className="h-full bg-brand/60 rounded-full animate-pulse w-2/3" />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Mobile Sticky Bar ── */}
      <div className="lg:hidden fixed bottom-16 left-0 right-0 z-50 backdrop-blur-md border-t border-stone-200"
        style={{ background: "rgba(242,246,244,0.94)" }}>
        <div className="max-w-4xl mx-auto px-4 py-2.5">
          <button onClick={generate} disabled={generating || !image} data-testid="reels-generate-btn-mobile"
            className="w-full h-11 bg-brand text-brand-cream rounded-full font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-60 shadow-md shadow-brand/20 btn-lift transition-colors">
            {generating
              ? <><CircleNotch size={15} className="animate-spin" /> Sedang render video...</>
              : <><FilmSlate size={15} weight="fill" /> Generate Video · {CREDITS_PER_VIDEO} Kredit</>
            }
          </button>
        </div>
      </div>

      {/* ── Result ── */}
      {result && (
        <div id="reels-result" className="space-y-4 animate-fade-up">
          <div className="flex items-center gap-3">
            <CheckCircle size={22} weight="fill" className="text-green-600" />
            <div>
              <h2 className="font-heading text-xl font-bold text-brand">Video Siap!</h2>
              <p className="text-xs text-stone-400 mt-0.5">{selectedGoal?.label} · {result.duration}s · {result.aspect_ratio}</p>
            </div>
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            {/* Video Player */}
            <div className="lg:col-span-2">
              <div className="feedify-card p-4">
                <div className={`${ratioContainerClass} mx-auto rounded-2xl overflow-hidden bg-stone-900`}>
                  <video src={result.video_url} controls autoPlay loop playsInline
                    className="w-full h-full object-contain" data-testid="reels-video-player" />
                </div>

                <div className="flex gap-2 mt-4 justify-center">
                  <a href={result.video_url}
                    download={`feedify-reels-${result.id?.slice(0, 8)}.mp4`}
                    target="_blank" rel="noreferrer"
                    data-testid="reels-download-btn"
                    className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-brand text-brand-cream rounded-full font-bold text-sm hover:bg-brand-light transition-all btn-lift">
                    <DownloadSimple size={15} weight="bold" /> Download Video
                  </a>
                  <button onClick={reset} data-testid="reels-new-btn"
                    className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-white border border-stone-200 text-stone-700 rounded-full font-semibold text-sm hover:border-stone-300 transition-all">
                    <ArrowsClockwise size={14} weight="bold" /> Buat Baru
                  </button>
                </div>
              </div>
            </div>

            {/* Video Info Sidebar */}
            <div className="space-y-4">
              <div className="feedify-card p-4 space-y-3">
                <div className="text-xs uppercase tracking-[0.18em] text-brand-light font-bold">Detail Video</div>
                <BriefRow label="Tujuan"   value={result.video_goal_label} />
                <BriefRow label="Durasi"   value={`${result.duration} detik`} />
                <BriefRow label="Format"   value={result.aspect_ratio} />
                <BriefRow label="Provider" value="Kling v2.5" />
              </div>

              {isAdmin && result.prompt_used && (
                <div className="feedify-card p-4 space-y-2">
                  <div className="text-xs uppercase tracking-[0.18em] text-brand-light font-bold">Prompt Sinematik</div>
                  <p className="text-[11px] text-stone-600 leading-relaxed">{result.prompt_used}</p>
                </div>
              )}

              <div className="feedify-card p-4 space-y-2">
                <div className="text-xs uppercase tracking-[0.18em] text-brand-light font-bold">Platform yang Cocok</div>
                {[
                  result.aspect_ratio === "9:16" ? "Instagram Reels" : null,
                  result.aspect_ratio === "9:16" ? "TikTok" : null,
                  "WhatsApp Status",
                  result.aspect_ratio === "1:1" ? "Instagram Feed" : null,
                  result.aspect_ratio === "4:5" ? "Instagram Feed" : null,
                  "Facebook Reels",
                ].filter(Boolean).map(p => (
                  <div key={p} className="flex items-center gap-1.5 text-xs text-stone-600">
                    <span className="text-green-500">✓</span> {p}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
    <NoCreditsModal open={noCredits} onClose={() => setNoCredits(false)} />
    </>
  );
}

function SectionHeader({ num, icon, title }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="text-[10px] font-bold text-brand-light font-mono">{num}</span>
      <span className="text-brand">{icon}</span>
      <h3 className="font-heading text-base font-bold text-brand">{title}</h3>
    </div>
  );
}

function BriefRow({ label, value, empty }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-xs text-stone-400 flex-shrink-0">{label}</span>
      <span className={`text-xs font-semibold text-right truncate max-w-[65%] ${empty ? "text-stone-300" : "text-stone-700"}`}>
        {value}
      </span>
    </div>
  );
}
