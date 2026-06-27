import { useState } from "react";
import { Lock, Eye, EyeSlash } from "@phosphor-icons/react";

export default function PasswordInput({ value, onChange, placeholder, dataTestId, required = true, autoComplete }) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" />
      <input type={visible ? "text" : "password"} required={required} value={value}
        onChange={onChange} data-testid={dataTestId} autoComplete={autoComplete}
        className="w-full pl-11 pr-11 py-3.5 bg-white border border-brand-sand rounded-xl focus:ring-2 focus:ring-brand-gold focus:border-brand outline-none transition-all"
        placeholder={placeholder} />
      <button type="button" onClick={() => setVisible(v => !v)} tabIndex={-1}
        aria-label={visible ? "Sembunyikan password" : "Lihat password"}
        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 transition-colors">
        {visible ? <EyeSlash size={18} /> : <Eye size={18} />}
      </button>
    </div>
  );
}
