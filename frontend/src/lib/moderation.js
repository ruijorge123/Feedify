import { toast } from "react-toastify";

/**
 * Parses an axios error and checks if it's a content moderation violation.
 * If so, shows a styled toast and returns true.
 * Otherwise returns false so the caller can handle it normally.
 */
export function handleGenerateError(err) {
  const detail = err?.response?.data?.detail;

  if (detail && typeof detail === "object" && detail.type === "content_violation") {
    toast.error(
      <div>
        <div className="font-bold mb-1">Konten Tidak Diizinkan ⚠️</div>
        <div className="text-sm font-semibold text-red-200 mb-0.5">{detail.category}</div>
        <div className="text-sm">{detail.message}</div>
      </div>,
      {
        autoClose: 7000,
        style: { background: "#7f1d1d", color: "#fff", borderLeft: "4px solid #ef4444" },
        icon: false,
      }
    );
    return true;
  }

  // Generic error — let caller handle or pass a fallback message
  const msg =
    typeof detail === "string"
      ? detail
      : err?.response?.data?.detail?.message || null;

  return msg || false;
}
