import { DownloadSimple } from "@phosphor-icons/react";

/**
 * "Upload ke ChatGPT via 📎" reminder — shows the product photo (and optional
 * inspiration photo) the user must attach in ChatGPT before pasting the prompt.
 * Shared by Feed & Banner, Studio, Marketplace, Carousel, and Feed Generator.
 */
export default function PhotoPrepBlock({ productPhoto, hasReferenceImage, referenceImg }) {
  if (!productPhoto && !hasReferenceImage) return null;

  return (
    <div className="bg-white rounded-xl border border-amber-200 p-3 space-y-3">
      <p className="text-[10px] uppercase tracking-widest font-bold text-stone-400">
        Upload ke ChatGPT via 📎
      </p>

      {productPhoto && (
        <div className="flex items-center gap-3">
          <img src={productPhoto} alt="produk"
            className="w-10 h-10 rounded-lg object-cover flex-shrink-0 border border-stone-200" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-stone-700">① Foto produk kamu</p>
            <p className="text-[10px] text-stone-400">Produk yang akan di-generate oleh AI</p>
          </div>
          <span className="text-[10px] bg-amber-100 text-amber-700 font-bold px-2 py-0.5 rounded-full flex-shrink-0">Wajib</span>
        </div>
      )}

      {hasReferenceImage && (
        <div className="flex items-center gap-3">
          {referenceImg ? (
            <img src={referenceImg} alt="inspirasi"
              className="w-10 h-10 rounded-lg object-cover flex-shrink-0 border border-stone-200" />
          ) : (
            <div className="w-10 h-10 rounded-lg bg-brand/10 flex items-center justify-center flex-shrink-0">
              <span className="text-base">🖼️</span>
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-stone-700">
              {productPhoto ? "② Foto inspirasi kamu" : "① Foto inspirasi kamu"}
            </p>
            <p className="text-[10px] text-stone-400">AI tiru konsep & komposisinya — bukan warna/produknya</p>
          </div>
          <div className="flex flex-col items-end gap-1 flex-shrink-0">
            <span className="text-[10px] bg-amber-100 text-amber-700 font-bold px-2 py-0.5 rounded-full">Wajib</span>
            {referenceImg && (
              <a href={referenceImg} download="foto-inspirasi.jpg"
                className="text-[10px] text-brand flex items-center gap-0.5 hover:underline">
                <DownloadSimple size={10} weight="bold" /> Download
              </a>
            )}
          </div>
        </div>
      )}

      <div className="pt-1 border-t border-stone-100">
        <p className="text-[10px] text-stone-400 leading-relaxed">
          <span className="font-semibold text-stone-500">Tips:</span> AI hanya meniru
          komposisi, pencahayaan, dan suasana foto inspirasi — bukan menyalin warna brand atau produknya.
        </p>
      </div>
    </div>
  );
}
