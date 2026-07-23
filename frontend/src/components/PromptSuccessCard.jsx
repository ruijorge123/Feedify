import { Copy, Check, ArrowSquareOut, ArrowCounterClockwise } from "@phosphor-icons/react";
import { useState, useRef } from "react";
import { buildPromptForChatGPT, buildCarouselSlidePrompt, copyToClipboard, openChatGPT, savePromptToHistory } from "@/lib/chatgpt";
import ChatGptImageSteps from "@/components/ChatGptImageSteps";
import PhotoPrepBlock from "@/components/PhotoPrepBlock";

// Save the copied prompt to History (best-effort, dedupes via the passed ref).
function persistPrompt({ idRef, dashboardType, title, promptData, productPhoto, referenceImg }) {
  if (!dashboardType || !promptData?.prompt_json) return;
  savePromptToHistory({
    id: idRef.current || undefined,
    dashboard_type: dashboardType,
    title: title || promptData?.prompt_json?.branding_elements?.headline || "Prompt",
    prompt_json: promptData.prompt_json,
    product: promptData?.product || null,
    product_photo_base64: productPhoto || null,
    reference_image_base64: referenceImg || null,
  }).then((savedId) => { if (savedId) idRef.current = savedId; });
}

// ── Carousel per-slide mode ────────────────────────────────────────────────────

function CarouselPromptCard({ promptData, referenceImg, productPhoto, onReset, dashboardType, title }) {
  const slides     = promptData?.prompt_json?.slides || [];
  const meta       = promptData?.prompt_json?.carousel_meta || {};
  const total      = slides.length;

  const [activeIdx, setActiveIdx]   = useState(0);
  const [copied, setCopied]         = useState(new Set());
  const [copying, setCopying]       = useState(false);
  const savedIdRef = useRef(null);

  const allDone = copied.size >= total;
  const slide   = slides[activeIdx] || {};
  const roleLabel = (slide.slide_role || `Slide ${activeIdx + 1}`).replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase());
  const isCopied  = copied.has(activeIdx);

  const handleCopy = async () => {
    if (copying) return;
    setCopying(true);
    const text = buildCarouselSlidePrompt(promptData, activeIdx);
    await copyToClipboard(text);
    // Save the whole carousel to History (once, deduped) on first copy
    persistPrompt({
      idRef: savedIdRef,
      dashboardType: dashboardType || "carousel",
      title: title || meta.topic || "Carousel",
      promptData, productPhoto, referenceImg,
    });
    setTimeout(() => {
      setCopying(false);
      setCopied(prev => new Set([...prev, activeIdx]));
    }, 600);
  };

  const goNext = () => {
    if (activeIdx < total - 1) setActiveIdx(activeIdx + 1);
  };

  if (allDone) {
    return (
      <div className="feedify-card border-2 border-[#10a37f]/30 bg-[#f0fdf8] p-5 space-y-4 animate-fade-up">
        <div className="text-center space-y-1">
          <div className="text-2xl">🎉</div>
          <p className="font-bold text-[#0a6b52] text-sm">Semua {total} prompt slide selesai di-copy!</p>
        </div>

        <div className="bg-white rounded-xl border border-stone-100 p-3 space-y-1.5">
          <p className="text-[10px] uppercase tracking-widest font-bold text-stone-400">Slide yang sudah di-generate</p>
          {slides.map((s, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="w-4 h-4 rounded-full bg-[#10a37f] text-white text-[9px] font-bold flex items-center justify-center flex-shrink-0">{i + 1}</span>
              <p className="text-xs text-stone-600 capitalize">{(s.slide_role || `slide-${i + 1}`).replace(/-/g, " ")}</p>
              <Check size={11} weight="bold" className="text-green-500 ml-auto flex-shrink-0" />
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          {onReset && (
            <button onClick={onReset}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-brand text-white text-sm font-semibold hover:bg-brand/90 transition-colors"
              data-testid="reset-prompt-btn">
              <ArrowCounterClockwise size={14} weight="bold" /> Buat Ulang
            </button>
          )}
          <button onClick={openChatGPT}
            className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border border-[#10a37f] text-[#0a6b52] text-sm font-medium hover:bg-[#10a37f]/5 transition-colors"
            data-testid="open-chatgpt-again-btn">
            <ArrowSquareOut size={14} /> Buka ChatGPT
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="feedify-card border-2 border-[#10a37f]/30 bg-[#f0fdf8] overflow-hidden">

      {/* Slide stepper */}
      <div className="px-4 pt-4 pb-2 space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs font-bold text-[#0a6b52]">Prompt Carousel — copy tiap slide satu per satu</p>
          <p className="text-[10px] text-stone-400">{copied.size}/{total} selesai</p>
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {slides.map((s, i) => {
            const done = copied.has(i);
            const active = i === activeIdx;
            return (
              <button key={i} type="button" onClick={() => setActiveIdx(i)}
                className={`relative flex items-center justify-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border transition-all ${
                  active   ? "bg-brand text-white border-brand shadow-sm" :
                  done     ? "bg-green-100 text-green-700 border-green-200" :
                             "bg-white text-stone-500 border-stone-200 hover:border-brand/40"
                }`} data-testid={`slide-tab-${i + 1}`}>
                {done ? <Check size={9} weight="bold" /> : null}
                Slide {i + 1}
              </button>
            );
          })}
        </div>
      </div>

      <div className="px-4 pb-4 space-y-3">
        {/* Slide info */}
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-full bg-brand text-white text-[9px] font-bold flex items-center justify-center flex-shrink-0">{activeIdx + 1}</div>
          <div>
            <p className="text-sm font-bold text-[#0a6b52]">{roleLabel}</p>
            <p className="text-[10px] text-stone-400">Slide {activeIdx + 1} dari {total}</p>
          </div>
        </div>

        {/* Copy / done state */}
        {!isCopied ? (
          <>
            <button onClick={handleCopy} disabled={copying}
              className="relative w-full h-12 rounded-2xl bg-[#10a37f] hover:bg-[#0d8a6c] active:scale-95 text-white text-sm font-bold transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-80"
              data-testid={`copy-slide-${activeIdx + 1}-btn`}>
              {!copying && <span className="absolute inset-0 rounded-2xl animate-ping bg-[#10a37f]/30 pointer-events-none" />}
              {copying ? <><Check size={17} weight="bold" /> Tersalin!</> : <><Copy size={17} weight="bold" /> Salin Prompt Slide {activeIdx + 1}</>}
            </button>
            <p className="text-center text-[10px] text-stone-400">Setelah disalin, kami panduin ke ChatGPT</p>
          </>
        ) : (
          <div className="space-y-2 animate-fade-up">
            <div className="flex items-center gap-2 text-[#0a6b52]">
              <span className="w-5 h-5 rounded-full bg-[#10a37f] flex items-center justify-center flex-shrink-0">
                <Check size={11} weight="bold" className="text-white" />
              </span>
              <p className="font-bold text-xs">Slide {activeIdx + 1} tersalin! Begini cara generate fotonya:</p>
            </div>
            <ChatGptImageSteps />
            <PhotoPrepBlock productPhoto={productPhoto} hasReferenceImage={!!referenceImg} referenceImg={referenceImg} />
            <div className="grid grid-cols-2 gap-2">
              <button onClick={openChatGPT}
                className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-[#10a37f] hover:bg-[#0d8a6c] text-white text-xs font-bold transition-colors"
                data-testid="open-chatgpt-btn">
                <ArrowSquareOut size={13} weight="bold" /> Buka ChatGPT
              </button>
              {activeIdx < total - 1 ? (
                <button onClick={goNext}
                  className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-brand hover:bg-brand/90 text-white text-xs font-bold transition-colors"
                  data-testid={`next-slide-${activeIdx + 2}-btn`}>
                  Slide {activeIdx + 2} →
                </button>
              ) : (
                <button onClick={() => setCopied(new Set([...Array(total).keys()]))}
                  className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-brand hover:bg-brand/90 text-white text-xs font-bold transition-colors"
                  data-testid="all-done-btn">
                  Selesai 🎉
                </button>
              )}
            </div>
            <button onClick={handleCopy}
              className="w-full py-1.5 text-[10px] text-[#0a6b52] hover:underline text-center"
              data-testid="copy-slide-again-btn">
              <Copy size={10} className="inline mr-1" /> Copy Slide {activeIdx + 1} lagi
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Banner / Marketplace / Food / Studio (single prompt) ──────────────────────

// phase: "copy" → "open" → "done"

export default function PromptSuccessCard({
  promptData,
  hasReferenceImage,
  referenceImg,
  productPhoto,
  onReset,
  dashboardType,
  title,
}) {
  const [phase,   setPhase]   = useState("copy");
  const [copying, setCopying] = useState(false);
  const savedIdRef = useRef(null);

  const isCarousel = Boolean(promptData?.prompt_json?.slides);

  // Carousel → dedicated multi-slide component
  if (isCarousel) {
    return (
      <CarouselPromptCard
        promptData={promptData}
        referenceImg={referenceImg}
        productPhoto={productPhoto}
        onReset={onReset}
        dashboardType={dashboardType}
        title={title}
      />
    );
  }

  const promptText = promptData ? buildPromptForChatGPT(promptData) : "";

  const handleCopy = async () => {
    if (copying) return;
    setCopying(true);
    await copyToClipboard(promptText);
    persistPrompt({ idRef: savedIdRef, dashboardType, title, promptData, productPhoto, referenceImg });
    setTimeout(() => {
      setCopying(false);
      setPhase("open");
    }, 700);
  };

  const handleOpen = () => {
    openChatGPT();
    setPhase("done");
  };

  return (
    <div className="feedify-card border-2 border-[#10a37f]/30 bg-[#f0fdf8] overflow-hidden">

      {/* ── PHASE: COPY ─────────────────────────────────────────────── */}
      {phase === "copy" && (
        <div className="p-5 space-y-4">
          <div className="text-center space-y-1">
            <p className="font-bold text-[#0a6b52] text-base">Prompt siap!</p>
            <p className="text-xs text-[#0a6b52]/70">Langkah pertama: salin prompt ke clipboard.</p>
          </div>

          <button
            onClick={handleCopy}
            disabled={copying}
            className="relative w-full h-14 rounded-2xl bg-[#10a37f] hover:bg-[#0d8a6c] active:scale-95 text-white text-base font-bold transition-all shadow-lg flex items-center justify-center gap-2.5 disabled:opacity-80"
            data-testid="copy-prompt-btn"
          >
            {!copying && (
              <span className="absolute inset-0 rounded-2xl animate-ping bg-[#10a37f]/30 pointer-events-none" />
            )}
            {copying ? (
              <><Check size={20} weight="bold" /> Tersalin!</>
            ) : (
              <><Copy size={20} weight="bold" /> Salin Prompt</>
            )}
          </button>

          <p className="text-center text-[11px] text-stone-400">Setelah disalin, kami panduin ke ChatGPT</p>
        </div>
      )}

      {/* ── PHASE: OPEN CHATGPT ─────────────────────────────────────── */}
      {phase === "open" && (
        <div className="p-5 space-y-4 animate-fade-up">
          <div className="flex items-center gap-2 text-[#0a6b52]">
            <span className="w-6 h-6 rounded-full bg-[#10a37f] flex items-center justify-center flex-shrink-0">
              <Check size={13} weight="bold" className="text-white" />
            </span>
            <p className="font-bold text-sm">Prompt ter-copy! Begini cara generate fotonya:</p>
          </div>

          <ChatGptImageSteps />

          <PhotoPrepBlock productPhoto={productPhoto} hasReferenceImage={hasReferenceImage} referenceImg={referenceImg} />

          <div className="space-y-2">
            <button
              onClick={handleOpen}
              className="w-full py-3.5 rounded-2xl bg-[#10a37f] hover:bg-[#0d8a6c] active:scale-95 text-white text-sm font-bold transition-all shadow-md flex items-center justify-center gap-2"
              data-testid="open-chatgpt-btn"
            >
              <ArrowSquareOut size={17} weight="bold" />
              Buka ChatGPT & Paste
            </button>
            <button
              onClick={handleCopy}
              className="w-full py-2 rounded-xl border border-[#10a37f]/40 text-[#0a6b52] text-xs font-medium hover:bg-[#10a37f]/5 transition-colors flex items-center justify-center gap-1.5"
              data-testid="copy-again-btn"
            >
              <Copy size={12} /> Copy lagi
            </button>
          </div>
        </div>
      )}

      {/* ── PHASE: DONE ─────────────────────────────────────────────── */}
      {phase === "done" && (
        <div className="p-5 space-y-4 animate-fade-up">
          <div className="text-center space-y-1">
            <div className="text-2xl mb-1">🎉</div>
            <p className="font-bold text-[#0a6b52] text-sm">ChatGPT sudah terbuka!</p>
            <p className="text-xs text-[#0a6b52]/70">Ikuti 3 langkah tadi (klik + → Buat gambar → paste), lalu tunggu hasilnya.</p>
          </div>

          <div className="flex gap-2">
            {onReset && (
              <button
                onClick={onReset}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-brand text-white text-sm font-semibold hover:bg-brand/90 transition-colors"
                data-testid="reset-prompt-btn"
              >
                <ArrowCounterClockwise size={14} weight="bold" /> Buat Lagi
              </button>
            )}
            <button
              onClick={handleOpen}
              className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border border-[#10a37f] text-[#0a6b52] text-sm font-medium hover:bg-[#10a37f]/5 transition-colors"
              data-testid="open-chatgpt-again-btn"
            >
              <ArrowSquareOut size={14} /> Buka Lagi
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
