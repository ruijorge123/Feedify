import { useState } from "react";
import { DownloadSimple, ArrowsClockwise, CircleNotch, ImageSquare, CalendarPlus } from "@phosphor-icons/react";
import { toast } from 'react-toastify';
import ScheduleModal from "@/components/ScheduleModal";

export default function GeneratedPreview({
  imageBase64,
  loading,
  aspectRatio = "1:1 (Square Feed)",
  onRegenerate,
  regenerating,
  testid = "generated-preview",
  promptId = null,
  dashboardType = "banner",
  defaultTitle = "",
  defaultCaption = "",
}) {
  const [scheduleOpen, setScheduleOpen] = useState(false);

  const ar = aspectRatio.toLowerCase();
  let aspect = "aspect-square";
  if (ar.includes("4:5")) aspect = "aspect-[4/5]";
  else if (ar.includes("9:16")) aspect = "aspect-[9/16]";
  else if (ar.includes("16:9")) aspect = "aspect-[16/9]";

  const dataUrl = imageBase64?.startsWith("data:") ? imageBase64 : `data:image/png;base64,${imageBase64}`;

  const download = () => {
    if (!imageBase64) return;
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `feedify-${Date.now()}.png`;
    a.click();
    toast.success("Gambar diunduh");
  };

  return (
    <div data-testid={testid} className="space-y-3">
      <div className={`${aspect} relative rounded-2xl overflow-hidden border-2 ${imageBase64 ? "border-brand" : "border-dashed border-brand-sand"} bg-brand-sand/30 flex items-center justify-center`}>
        {loading ? (
          <div className="text-center" data-testid={`${testid}-loading`}>
            <CircleNotch size={40} className="animate-spin text-brand mx-auto" weight="duotone" />
            <div className="mt-3 text-sm font-semibold text-brand">Feedify sedang memproses...</div>
            <div className="text-xs text-stone-500 mt-1">Estimasi 30-60 detik</div>
          </div>
        ) : imageBase64 ? (
          <img src={dataUrl} alt="Generated" className="h-full w-full object-cover" data-testid={`${testid}-image`} />
        ) : (
          <div className="text-center px-6" data-testid={`${testid}-empty`}>
            <ImageSquare size={36} className="text-brand-light/50 mx-auto mb-2" weight="duotone" />
            <div className="text-sm font-semibold text-stone-600">Hasil akan muncul di sini</div>
            <div className="text-xs text-stone-500 mt-1">setelah Anda klik Generate</div>
          </div>
        )}
      </div>

      {imageBase64 && !loading && (
        <>
          <div className="flex gap-2" data-testid={`${testid}-actions`}>
            <button onClick={download} data-testid={`${testid}-download`} className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2.5 bg-brand text-brand-cream hover:bg-brand-light rounded-full text-sm font-semibold btn-touch">
              <DownloadSimple size={14} weight="bold" /> Download
            </button>
            {onRegenerate && (
              <button onClick={onRegenerate} disabled={regenerating} data-testid={`${testid}-regenerate`} className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2.5 bg-brand-gold text-brand hover:bg-brand-amber rounded-full text-sm font-semibold btn-touch disabled:opacity-60">
                {regenerating ? <CircleNotch size={14} className="animate-spin" /> : <ArrowsClockwise size={14} weight="bold" />}
                Regenerate
              </button>
            )}
          </div>

          {/* Schedule button */}
          <button
            onClick={() => setScheduleOpen(true)}
            data-testid={`${testid}-schedule`}
            className="w-full inline-flex items-center justify-center gap-2 py-2.5 border-2 border-dashed border-brand-gold text-brand rounded-full text-sm font-semibold hover:bg-brand-gold/10 transition-all btn-touch"
          >
            <CalendarPlus size={16} weight="duotone" />
            Jadwalkan ke Calendar Planner
          </button>
        </>
      )}

      <ScheduleModal
        open={scheduleOpen}
        onClose={() => setScheduleOpen(false)}
        promptId={promptId}
        imageBase64={imageBase64}
        dashboardType={dashboardType}
        defaultTitle={defaultTitle}
        defaultCaption={defaultCaption}
      />
    </div>
  );
}
