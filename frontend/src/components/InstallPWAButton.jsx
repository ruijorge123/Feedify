import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { DownloadSimple, X, ShareNetwork, DotsThreeVertical } from "@phosphor-icons/react";

function detectPlatform() {
  const ua = navigator.userAgent || "";
  // iPadOS reports itself as "Macintosh" in the UA string — the touch-point check is what
  // actually distinguishes a real iPad from a real Mac.
  const isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const isMac = /Macintosh/.test(ua) && !isIOS;
  const isSafari = /^((?!chrome|android|crios|fxios).)*safari/i.test(ua);
  return { isIOS, isMac, isSafari };
}

function isStandalone() {
  return window.matchMedia?.("(display-mode: standalone)")?.matches || window.navigator.standalone === true;
}

// Cross-platform "install app" button — Android/Desktop Chrome & Edge get the native
// beforeinstallprompt flow; iOS Safari and macOS Safari have no such API at all, so those
// get a short manual-steps modal instead (Apple never exposes a programmatic install prompt).
export default function InstallPWAButton({ className }) {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [installed, setInstalled] = useState(isStandalone());
  const [showInstructions, setShowInstructions] = useState(false);

  useEffect(() => {
    const onBeforeInstall = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    const onInstalled = () => { setInstalled(true); setDeferredPrompt(null); };
    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (installed) return null;

  const { isIOS, isMac, isSafari } = detectPlatform();

  const handleClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") setInstalled(true);
      setDeferredPrompt(null);
      return;
    }
    setShowInstructions(true);
  };

  return (
    <>
      <button
        onClick={handleClick}
        data-testid="pwa-install-btn"
        className={className || "inline-flex items-center gap-2 px-6 py-4 rounded-full font-bold text-sm text-white border border-white/25 hover:border-white/50 hover:bg-white/10 transition-all btn-lift btn-touch"}
      >
        <DownloadSimple size={18} weight="bold" />
        Pasang Aplikasi
      </button>

      {showInstructions && createPortal(
        <div
          className="fixed inset-0 z-[80] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-6"
          onClick={() => setShowInstructions(false)}
          data-testid="pwa-install-modal"
        >
          <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-t-3xl sm:rounded-3xl max-w-sm w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="font-heading text-lg font-bold text-brand">Pasang Feedify</div>
              <button
                onClick={() => setShowInstructions(false)}
                data-testid="close-pwa-install-modal"
                className="h-8 w-8 rounded-full bg-brand-sand hover:bg-brand-gold/30 text-brand flex items-center justify-center flex-shrink-0"
              >
                <X size={14} weight="bold" />
              </button>
            </div>

            {isIOS ? (
              <ol className="space-y-3 text-sm text-stone-700 list-decimal list-inside leading-relaxed">
                <li>Buka Feedify lewat <strong>Safari</strong> di iPhone/iPad kamu</li>
                <li>Tap ikon <ShareNetwork size={14} weight="bold" className="inline -mt-0.5" /> <strong>Share</strong> di bar bawah layar</li>
                <li>Pilih <strong>"Add to Home Screen"</strong> (Tambah ke Layar Utama)</li>
                <li>Tap <strong>Add</strong> — ikon Feedify langsung muncul di Home Screen</li>
              </ol>
            ) : isMac && isSafari ? (
              <ol className="space-y-3 text-sm text-stone-700 list-decimal list-inside leading-relaxed">
                <li>Buka Feedify lewat <strong>Safari</strong> di Mac kamu</li>
                <li>Klik menu <strong>File</strong> di menu bar atas → pilih <strong>"Add to Dock..."</strong></li>
                <li>Feedify akan muncul sebagai app terpisah di Dock kamu</li>
              </ol>
            ) : (
              <p className="text-sm text-stone-700 leading-relaxed">
                Buka Feedify lewat <strong>Chrome</strong> atau <strong>Edge</strong>, lalu cari ikon install di address bar
                (atau menu <DotsThreeVertical size={14} weight="bold" className="inline -mt-0.5" /> di pojok browser),
                lalu pilih <strong>"Install Feedify"</strong>.
              </p>
            )}
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
