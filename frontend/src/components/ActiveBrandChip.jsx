import { Link } from "react-router-dom";
import { CaretRight } from "@phosphor-icons/react";
import { useActiveBrand } from "@/lib/activeBrand";

/**
 * Shows which brand the page is about to generate for.
 *
 * A user with several brand profiles has exactly one active at a time, and that choice
 * silently drives the palette, personality and tone of every generated prompt. The active
 * brand was previously only visible in the nav chrome, so on a generator page there was
 * nothing to catch "I'm still on my other brand" until the output came back wrong.
 * The two swatches are the brand's own colors, so a mismatch is obvious at a glance.
 */
export default function ActiveBrandChip({ className = "" }) {
  const brand = useActiveBrand();
  if (!brand?.brand_name) return null;

  const primary = brand.color_primary || "#0B3D2E";
  const secondary = brand.color_secondary || "#FDFBF7";

  return (
    <Link
      to="/settings"
      data-testid="active-brand-chip"
      className={`inline-flex items-center gap-2 pl-1.5 pr-2.5 py-1.5 rounded-full bg-white border border-brand-sand hover:border-brand/30 transition-colors ${className}`}
      title={`Konten dibuat untuk brand "${brand.brand_name}". Klik untuk ganti brand.`}
    >
      <span className="flex items-center -space-x-1.5 flex-shrink-0">
        <span className="h-4 w-4 rounded-full border border-white shadow-sm" style={{ background: primary }} />
        <span className="h-4 w-4 rounded-full border border-white shadow-sm" style={{ background: secondary }} />
      </span>
      <span className="text-[11px] text-stone-400 leading-none">Brand</span>
      <span className="text-xs font-semibold text-brand leading-none truncate max-w-[9rem]">
        {brand.brand_name}
      </span>
      <CaretRight size={11} weight="bold" className="text-stone-300 flex-shrink-0" />
    </Link>
  );
}
