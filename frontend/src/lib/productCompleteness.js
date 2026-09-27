/**
 * Compute product completeness score 0-100.
 * Mirrors backend _compute_product_completeness().
 */
export function computeCompleteness(product) {
  if (!product) return 0;
  let score = 0;
  if (product.photo_base64)                score += 20;
  if (product.name?.trim())                score += 15;
  if (product.category?.trim())            score += 10;
  if (product.ingredients?.length >= 1)    score += 20;
  if (product.benefits?.length >= 1)       score += 20;
  if (product.target_skin?.length >= 1)    score += 5;
  if (product.usp?.trim())                 score += 5;
  if (product.how_to_use?.trim())          score += 3;
  if (product.price != null)               score += 2;
  return Math.min(score, 100);
}

/** Return label, color, and icon for a given completeness score. */
export function completenessLabel(score) {
  if (score >= 100) return { label: "Lengkap", sub: "Hasil konten optimal", color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-200", icon: "✅" };
  if (score >= 60)  return { label: `${score}% Lengkap`, sub: "Lengkapi untuk hasil lebih tajam", color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-200", icon: "⚡" };
  return { label: `${score}% Kurang Lengkap`, sub: "Hasil mungkin kurang spesifik", color: "text-red-500", bg: "bg-red-50", border: "border-red-200", icon: "⚠️" };
}
