import { useState } from "react";
import { User, CaretDown, CaretUp, Sparkle } from "@phosphor-icons/react";

const MODEL_CHARACTERS = [
  "Wanita Indonesia",
  "Wanita Indonesia Hijab",
  "Wanita Asia Timur (Korean Look)",
  "Wanita Asia Timur (Japanese Look)",
  "Wanita Asia Timur (Chinese Look)",
  "Pria Indonesia",
  "Pria Korean Look",
  "Pria Asia Timur",
  "Ibu Muda",
  "Pasangan",
  "Keluarga",
  "Custom",
];

const AGE_RANGES = ["18–24", "25–34", "35–44", "45+"];

const INTERACTION_STYLES = [
  "Memegang produk",
  "Menggunakan produk",
  "Menunjukkan produk ke kamera",
  "Produk di samping model",
  "Lifestyle natural",
  "Candid",
  "Studio portrait",
  "Mirror selfie",
];

const COMPOSITION_STYLES = ["Produk dominan", "Seimbang", "Model dominan"];

const OUTFIT_STYLES = [
  "Kasual",
  "Clean Minimal",
  "Korean Fashion",
  "Smart Casual",
  "Formal",
  "Hijab Modern",
  "Luxury",
  "Sporty",
  "Custom",
];

const EXPRESSION_STYLES = [
  "Natural",
  "Senyum",
  "Fresh",
  "Percaya diri",
  "Elegan",
  "Serius",
  "Bahagia",
];

function ChipSelect({ options, value, onChange }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((opt) => (
        <button
          key={opt}
          type="button"
          onClick={() => onChange(value === opt ? "" : opt)}
          className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all btn-touch ${
            value === opt
              ? "bg-brand text-brand-cream border-brand"
              : "bg-white border-stone-200 text-stone-600 hover:border-brand-light"
          }`}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}

function ManualFields({ state, onChange }) {
  const [open, setOpen] = useState(true);

  return (
    <div className="mt-3 rounded-xl border border-brand-sand overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 bg-stone-50 hover:bg-brand-sand/40 transition-all"
        data-testid="model-talent-manual-toggle"
      >
        <span className="text-xs font-bold text-brand uppercase tracking-[0.15em]">
          Pengaturan Model
        </span>
        {open ? (
          <CaretUp size={14} className="text-stone-400" />
        ) : (
          <CaretDown size={14} className="text-stone-400" />
        )}
      </button>

      {open && (
        <div className="p-4 space-y-4">
          {/* Karakter Model */}
          <div>
            <div className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider mb-2">
              Karakter Model
            </div>
            <ChipSelect
              options={MODEL_CHARACTERS}
              value={state.modelCharacter}
              onChange={(v) => onChange("modelCharacter", v)}
            />
          </div>

          {/* Rentang Usia + Ekspresi in 2 cols */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider mb-2">
                Rentang Usia
              </div>
              <div className="flex flex-col gap-1.5">
                {AGE_RANGES.map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() =>
                      onChange(
                        "modelAge",
                        state.modelAge === opt ? "" : opt
                      )
                    }
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all btn-touch text-left ${
                      state.modelAge === opt
                        ? "bg-brand text-brand-cream border-brand"
                        : "bg-white border-stone-200 text-stone-600 hover:border-brand-light"
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider mb-2">
                Ekspresi
              </div>
              <div className="flex flex-col gap-1.5">
                {EXPRESSION_STYLES.map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() =>
                      onChange(
                        "expressionStyle",
                        state.expressionStyle === opt ? "" : opt
                      )
                    }
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all btn-touch text-left ${
                      state.expressionStyle === opt
                        ? "bg-brand text-brand-cream border-brand"
                        : "bg-white border-stone-200 text-stone-600 hover:border-brand-light"
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Gaya Interaksi */}
          <div>
            <div className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider mb-2">
              Gaya Interaksi
            </div>
            <ChipSelect
              options={INTERACTION_STYLES}
              value={state.interactionStyle}
              onChange={(v) => onChange("interactionStyle", v)}
            />
          </div>

          {/* Outfit */}
          <div>
            <div className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider mb-2">
              Outfit
            </div>
            <ChipSelect
              options={OUTFIT_STYLES}
              value={state.outfitStyle}
              onChange={(v) => onChange("outfitStyle", v)}
            />
          </div>

          {/* Komposisi */}
          <div>
            <div className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider mb-2">
              Komposisi
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {COMPOSITION_STYLES.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() =>
                    onChange(
                      "compositionStyleHuman",
                      state.compositionStyleHuman === opt ? "" : opt
                    )
                  }
                  className={`px-2 py-2 rounded-xl text-xs font-medium border transition-all btn-touch text-center ${
                    state.compositionStyleHuman === opt
                      ? "bg-brand text-brand-cream border-brand"
                      : "bg-white border-stone-200 text-stone-600 hover:border-brand-light"
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ModelTalentSection({ state, onChange }) {
  return (
    <div className="feedify-card p-5" data-testid="model-talent-section">
      {/* Header with toggle */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg bg-brand-sand flex items-center justify-center flex-shrink-0">
            <User size={16} weight="duotone" className="text-brand" />
          </div>
          <div>
            <div className="font-heading font-bold text-brand text-sm">
              Model & Talent
            </div>
            <div className="text-[11px] text-stone-400">
              Sertakan manusia dalam foto
            </div>
          </div>
        </div>

        {/* Toggle switch */}
        <button
          type="button"
          onClick={() => onChange("humanEnabled", !state.humanEnabled)}
          data-testid="human-enabled-toggle"
          className={`relative h-6 w-11 rounded-full transition-colors flex-shrink-0 ${
            state.humanEnabled ? "bg-brand" : "bg-stone-200"
          }`}
        >
          <span
            className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
              state.humanEnabled ? "translate-x-5" : "translate-x-0"
            }`}
          />
        </button>
      </div>

      {/* Expanded content when enabled */}
      {state.humanEnabled && (
        <div className="mt-4 space-y-3">
          {/* Mode selector */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => onChange("humanMode", "auto")}
              data-testid="human-mode-auto"
              className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 transition-all ${
                state.humanMode === "auto"
                  ? "border-brand bg-brand/5"
                  : "border-stone-200 bg-white hover:border-brand-sand"
              }`}
            >
              <div
                className={`h-4 w-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                  state.humanMode === "auto"
                    ? "border-brand"
                    : "border-stone-300"
                }`}
              >
                {state.humanMode === "auto" && (
                  <div className="h-2 w-2 rounded-full bg-brand" />
                )}
              </div>
              <div className="text-left min-w-0">
                <div className="text-xs font-bold text-brand leading-tight flex items-center gap-1">
                  <Sparkle size={10} weight="fill" className="text-brand-gold flex-shrink-0" />
                  Feedify Pilihkan
                </div>
                <div className="text-[10px] text-stone-400 leading-tight">
                  Otomatis terbaik
                </div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => onChange("humanMode", "manual")}
              data-testid="human-mode-manual"
              className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 transition-all ${
                state.humanMode === "manual"
                  ? "border-brand bg-brand/5"
                  : "border-stone-200 bg-white hover:border-brand-sand"
              }`}
            >
              <div
                className={`h-4 w-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                  state.humanMode === "manual"
                    ? "border-brand"
                    : "border-stone-300"
                }`}
              >
                {state.humanMode === "manual" && (
                  <div className="h-2 w-2 rounded-full bg-brand" />
                )}
              </div>
              <div className="text-left min-w-0">
                <div className="text-xs font-bold text-brand leading-tight">
                  Atur Sendiri
                </div>
                <div className="text-[10px] text-stone-400 leading-tight">
                  Kontrol penuh
                </div>
              </div>
            </button>
          </div>

          {/* Auto mode hint */}
          {state.humanMode === "auto" && (
            <div className="px-3 py-2 bg-brand/5 rounded-xl text-[11px] text-brand-light leading-relaxed">
              Feedify akan menentukan karakter, outfit, pose, dan ekspresi model yang paling sesuai dengan brand DNA kamu.
            </div>
          )}

          {/* Manual mode fields */}
          {state.humanMode === "manual" && (
            <ManualFields state={state} onChange={onChange} />
          )}
        </div>
      )}
    </div>
  );
}

export const defaultHumanState = {
  humanEnabled: false,
  humanMode: "auto",
  modelCharacter: "",
  modelAge: "",
  interactionStyle: "",
  compositionStyleHuman: "",
  outfitStyle: "",
  expressionStyle: "",
};

export function humanStateToPayload(state) {
  return {
    human_enabled: state.humanEnabled,
    human_mode: state.humanMode,
    model_character: state.humanMode === "manual" ? state.modelCharacter : "",
    model_age: state.humanMode === "manual" ? state.modelAge : "",
    interaction_style: state.humanMode === "manual" ? state.interactionStyle : "",
    composition_style_human: state.humanMode === "manual" ? state.compositionStyleHuman : "",
    outfit_style: state.humanMode === "manual" ? state.outfitStyle : "",
    expression_style: state.humanMode === "manual" ? state.expressionStyle : "",
  };
}
