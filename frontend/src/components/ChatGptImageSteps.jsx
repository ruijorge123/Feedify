// Visual step-by-step: how to generate the photo in ChatGPT.
// Shared by PromptSuccessCard (Banner/Studio/Marketplace/Carousel) and Feed Generator.
export default function ChatGptImageSteps() {
  return (
    <div className="bg-white rounded-xl border border-stone-100 p-3 space-y-3">
      <p className="text-[10px] uppercase tracking-widest font-bold text-stone-400">
        Cara generate foto di ChatGPT
      </p>

      <div className="grid grid-cols-2 gap-2.5">
        {[
          { n: 1, img: "/datapenting/step1.webp", pre: "Klik tombol", em: "+" },
          { n: 2, img: "/datapenting/step2.webp", pre: "Pilih", em: "Buat gambar" },
        ].map((s) => (
          <div key={s.n} className="space-y-1.5">
            <div className="relative rounded-lg overflow-hidden border border-stone-200 bg-stone-50">
              <img
                src={s.img}
                alt={`Langkah ${s.n} di ChatGPT`}
                loading="lazy"
                decoding="async"
                className="w-full h-36 object-cover object-bottom"
              />
              <span className="absolute top-1.5 left-1.5 w-5 h-5 rounded-full bg-[#10a37f] text-white text-[10px] font-bold flex items-center justify-center shadow-md">
                {s.n}
              </span>
            </div>
            <p className="text-[11px] text-stone-600 text-center leading-tight">
              {s.pre} <span className="font-bold text-[#0a6b52]">{s.em}</span>
            </p>
          </div>
        ))}
      </div>

      <div className="flex items-start gap-2 bg-[#f0fdf8] rounded-lg p-2.5 border border-[#10a37f]/20">
        <span className="w-5 h-5 rounded-full bg-[#10a37f] text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
          3
        </span>
        <p className="text-[11px] text-stone-600 leading-snug">
          <span className="font-bold text-[#0a6b52]">Paste prompt Feedify</span> yang tadi di-copy (tekan &amp; tahan di kolom chat → Tempel), lalu tekan <span className="font-semibold">kirim</span>. ChatGPT langsung buat fotonya ✨
        </p>
      </div>
    </div>
  );
}
