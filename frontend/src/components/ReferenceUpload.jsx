import { Sparkle, X } from "@phosphor-icons/react";
import { toast } from 'react-toastify';

/**
 * Optional reference image upload — for AI to mimic composition/style.
 * value: full data URL (data:image/png;base64,...) or null
 * onChange(dataUrl | null)
 */
export default function ReferenceUpload({ value, onChange, testid = "reference-upload" }) {
  const handle = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error("Foto max 5MB"); return; }
    const reader = new FileReader();
    reader.onload = () => onChange(reader.result);
    reader.readAsDataURL(file);
  };

  return (
    <div className="rounded-2xl border-2 border-dashed border-brand-gold/40 bg-brand-gold/5 p-4" data-testid={testid}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5 text-brand">
          <Sparkle size={14} weight="fill" className="text-brand-gold" />
          <span className="text-xs uppercase tracking-[0.18em] font-bold">Foto Referensi (opsional)</span>
        </div>
        {value && (
          <button onClick={() => onChange(null)} data-testid={`${testid}-clear`} className="text-xs text-stone-500 hover:text-red-600 inline-flex items-center gap-1">
            <X size={12} weight="bold" /> Hapus
          </button>
        )}
      </div>
      {value ? (
        <div className="flex items-center gap-3">
          <img src={value} alt="reference" className="h-20 w-20 object-cover rounded-lg border border-brand-sand" data-testid={`${testid}-preview`} />
          <div className="text-xs text-stone-600 flex-1">Feedify akan meniru komposisi & gaya foto ini, lalu menyesuaikan dengan Brand DNA Anda (warna, tone, branding).</div>
        </div>
      ) : (
        <label htmlFor={`${testid}-input`} className="block cursor-pointer text-center py-4" data-testid={`${testid}-label`}>
          <div className="text-sm font-medium text-brand">+ Upload foto referensi</div>
          <div className="text-[10px] text-stone-500 mt-0.5">Feedify buat semirip mungkin, lalu adaptasi ke karakter brand Anda</div>
        </label>
      )}
      <input id={`${testid}-input`} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={handle} data-testid={`${testid}-input`} />
    </div>
  );
}
