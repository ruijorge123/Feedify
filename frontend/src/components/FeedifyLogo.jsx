import { Sparkle } from "@phosphor-icons/react";

/**
 * The Feedify lockup — emerald tile, gold sparkle, cream wordmark. Same as the
 * app icon in /public/icon-512.png.
 *
 * These are the signature colors and the signature mark; they are not a design
 * choice to revisit. This component exists only so every page draws the same
 * lockup at the same proportions, not to reinterpret it.
 *
 * `tone="light"` for dark backgrounds (emerald hero/footer), `"dark"` for cream.
 */

export function FeedifyMark({ size = 36, className = "" }) {
  return (
    <span
      className={`grid flex-shrink-0 place-items-center rounded-xl bg-brand ring-1 ring-white/10 ${className}`}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <Sparkle size={Math.round(size * 0.52)} weight="fill" className="text-brand-gold" />
    </span>
  );
}

export default function FeedifyLogo({ size = 36, tone = "light", className = "" }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <FeedifyMark size={size} />
      <span
        className={`font-heading font-bold tracking-tight ${
          tone === "light" ? "text-brand-cream" : "text-brand"
        }`}
        style={{ fontSize: Math.round(size * 0.56) }}
      >
        Feedify
      </span>
    </span>
  );
}
