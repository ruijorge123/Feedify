import { useState, useRef } from "react";
import { toast } from 'react-toastify';
import { Check, Copy } from "@phosphor-icons/react";

export default function JsonOutput({ json, title = "JSON Prompt", testid = "json-output" }) {
  const [copied, setCopied] = useState(false);
  const textRef = useRef(null);

  const jsonStr = typeof json === "string" ? json : JSON.stringify(json, null, 2);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(jsonStr);
      setCopied(true);
      toast.success("Prompt disalin ke clipboard!");
      setTimeout(() => setCopied(false), 2200);
    } catch {
      // fallback
      if (textRef.current) {
        textRef.current.select();
        document.execCommand("copy");
        setCopied(true);
        toast.success("Prompt disalin!");
        setTimeout(() => setCopied(false), 2200);
      }
    }
  };

  return (
    <div className="feedify-card overflow-hidden" data-testid={testid}>
      <div className="flex items-center justify-between p-4 border-b border-brand-sand bg-brand-sand/40">
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            <div className="h-2.5 w-2.5 rounded-full bg-red-300" />
            <div className="h-2.5 w-2.5 rounded-full bg-amber-300" />
            <div className="h-2.5 w-2.5 rounded-full bg-emerald-300" />
          </div>
          <span className="ml-2 text-xs uppercase tracking-[0.18em] text-stone-500 font-semibold">{title}</span>
        </div>
        <button
          onClick={copy}
          data-testid={`${testid}-copy-btn`}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-brand text-brand-cream rounded-full text-xs font-semibold hover:bg-brand-light btn-lift"
        >
          {copied ? <Check size={14} weight="bold" /> : <Copy size={14} weight="bold" />}
          {copied ? "Tersalin" : "Copy JSON"}
        </button>
      </div>
      <pre className="terminal-block !rounded-none !mt-0 whitespace-pre-wrap break-words">
{jsonStr}
      </pre>
      <textarea ref={textRef} value={jsonStr} readOnly className="sr-only" />
    </div>
  );
}
