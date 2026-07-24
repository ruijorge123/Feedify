import { useState } from "react";
import { Code, X } from "@phosphor-icons/react";
import { useAuth } from "@/context/AuthContext";
import JsonOutput from "@/components/JsonOutput";

// QA-only: lets one specific account inspect the raw prompt JSON sent to ChatGPT,
// to debug why a generated image doesn't match the brief. Invisible to everyone else.
const DEBUG_EMAIL = "ruijorge800.rj@gmail.com";

export default function DebugJsonButton({ data, title = "prompt.json" }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);

  if (user?.email !== DEBUG_EMAIL || !data) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        data-testid="debug-preview-json-btn"
        className="w-full flex items-center justify-center gap-2 py-2 rounded-xl border-2 border-dashed border-stone-300 text-stone-500 text-xs font-semibold hover:border-brand hover:text-brand transition-colors"
      >
        <Code size={14} weight="bold" /> Preview JSON (khusus QA)
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-6"
          onClick={() => setOpen(false)}
          data-testid="debug-json-modal"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-t-3xl sm:rounded-3xl max-w-2xl w-full max-h-[85vh] overflow-y-auto"
          >
            <div className="sticky top-0 bg-white border-b border-brand-sand px-5 py-3 flex items-center justify-between z-10">
              <span className="font-heading font-bold text-brand text-sm">Prompt JSON — {title}</span>
              <button onClick={() => setOpen(false)} className="h-8 w-8 rounded-full bg-brand-sand hover:bg-brand-gold/30 text-brand font-bold flex items-center justify-center">
                <X size={14} weight="bold" />
              </button>
            </div>
            <div className="p-5">
              <JsonOutput json={data} title={title} testid="debug-json-output" />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
