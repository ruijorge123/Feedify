/**
 * Shared choice controls for the agency forms.
 *
 * Onboarding and the standalone Brand DNA page edit exactly the same fields, so
 * they share these rather than each growing its own copy that drifts. Everything
 * is a real <button>, not a styled div: a client filling this on a phone with
 * assistive tech still gets a focusable, announceable control.
 */

import { Check } from "@phosphor-icons/react";

export function Field({ label, hint, required, children, className = "" }) {
  return (
    <div className={className}>
      <label className="mb-2 block text-xs font-bold uppercase tracking-[0.14em] text-stone-500">
        {label} {required && <span className="text-red-400">*</span>}
      </label>
      {children}
      {hint && <p className="mt-2 text-xs leading-relaxed text-stone-400">{hint}</p>}
    </div>
  );
}

/** Single choice. `options` may be strings or {id,label,hint}. */
export function ChipPick({ options, value, onChange, testId }) {
  return (
    <div className="flex flex-wrap gap-2" data-testid={testId}>
      {options.map((o) => {
        const id = typeof o === "string" ? o : o.id;
        const label = typeof o === "string" ? o : o.label;
        const hint = typeof o === "string" ? null : o.hint;
        const on = value === id;
        return (
          <button
            key={id}
            type="button"
            onClick={() => onChange(on ? "" : id)}
            aria-pressed={on}
            className={`rounded-2xl border px-4 py-2.5 text-left transition-all ${
              on
                ? "border-brand bg-brand text-brand-cream shadow-md shadow-brand/15"
                : "border-brand-sand bg-white text-stone-600 hover:border-brand-light"
            }`}
          >
            <span className="block text-sm font-medium">{label}</span>
            {hint && (
              <span className={`mt-0.5 block text-[11px] ${on ? "text-brand-cream/55" : "text-stone-400"}`}>
                {hint}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/** Multiple choice with an optional ceiling. */
export function ChipMulti({ options, value = [], onChange, max, testId }) {
  const toggle = (id) => {
    if (value.includes(id)) return onChange(value.filter((v) => v !== id));
    if (max && value.length >= max) return;   // silently ignore: the cap is stated in the hint
    onChange([...value, id]);
  };

  return (
    <div className="flex flex-wrap gap-2" data-testid={testId}>
      {options.map((o) => {
        const id = typeof o === "string" ? o : o.id;
        const label = typeof o === "string" ? o : o.label;
        const on = value.includes(id);
        const full = max && value.length >= max && !on;
        return (
          <button
            key={id}
            type="button"
            onClick={() => toggle(id)}
            aria-pressed={on}
            disabled={full}
            className={`inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-medium transition-all ${
              on
                ? "border-brand bg-brand text-brand-cream"
                : full
                ? "border-brand-sand bg-white text-stone-300"
                : "border-brand-sand bg-white text-stone-600 hover:border-brand-light hover:text-brand"
            }`}
          >
            {on && <Check size={12} weight="bold" />} {label}
          </button>
        );
      })}
    </div>
  );
}

/** Plain <select> styled like the rest of the forms. */
export function Select({ value, onChange, options, placeholder = "Pilih...", testId }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="feedify-input"
      data-testid={testId}
    >
      <option value="">{placeholder}</option>
      {options.map((o) => {
        const id = typeof o === "string" ? o : o.id;
        const label = typeof o === "string" ? o : o.label;
        return <option key={id} value={id}>{label}</option>;
      })}
    </select>
  );
}
