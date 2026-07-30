import { User } from "@phosphor-icons/react";
import { MODEL_STYLES, MODEL_AGES } from "@/lib/modelOptions";

// Shared gender/penampilan/usia picker for the model-toggle sections on Banner, Studio,
// Carousel, Marketplace, and Feed Generator. Purely presentational/controlled — each page
// still translates the raw selection (gender/style/age ids) into whatever payload shape it
// already sends; this component has no knowledge of any backend field names.
export default function ModelTalentPicker({
  gender, onGenderChange,
  style, onStyleChange,
  age, onAgeChange,
  testidPrefix = "model",
}) {
  return (
    <div className="space-y-4">
      {/* Gender */}
      <div className="space-y-1.5">
        <p className="text-[10px] uppercase tracking-widest font-bold text-stone-400">
          Gender <span className="text-red-500">*</span>
        </p>
        <div className="grid grid-cols-2 gap-2">
          {[
            { id: "wanita", label: "Cewek", emoji: "👩" },
            { id: "pria",   label: "Cowok", emoji: "👨" },
          ].map(g => (
            <button key={g.id} type="button" onClick={() => onGenderChange(g.id)}
              className={`flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 text-sm font-semibold transition-colors ${
                gender === g.id ? "border-brand bg-brand-sand text-brand" : "border-stone-100 text-stone-600 hover:border-brand/30"
              }`} data-testid={`${testidPrefix}-gender-${g.id}`}>
              <span className="text-base">{g.emoji}</span> {g.label}
            </button>
          ))}
        </div>
      </div>

      {/* Style / Penampilan */}
      <div className="space-y-1.5">
        <p className="text-[10px] uppercase tracking-widest font-bold text-stone-400">
          Penampilan <span className="text-red-500">*</span>
        </p>
        <div className="flex flex-wrap gap-1.5">
          {MODEL_STYLES.filter(s => gender === "pria"
            ? !["hijab", "hijab-modern"].includes(s.id)
            : true
          ).map(s => (
            <button key={s.id} type="button"
              onClick={() => onStyleChange(s.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                style === s.id
                  ? "bg-brand text-white border-brand"
                  : "bg-white text-stone-600 border-stone-200 hover:border-brand/40 hover:text-brand"
              }`} data-testid={`${testidPrefix}-style-${s.id}`}>
              {s.emoji} {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Age range */}
      <div className="space-y-1.5">
        <p className="text-[10px] uppercase tracking-widest font-bold text-stone-400">
          Kisaran Usia <span className="text-red-500">*</span>
        </p>
        <div className="flex gap-1.5 flex-wrap">
          {MODEL_AGES.map(a => (
            <button key={a.id} type="button"
              onClick={() => onAgeChange(a.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                age === a.id
                  ? "bg-brand text-white border-brand"
                  : "bg-white text-stone-600 border-stone-200 hover:border-brand/40 hover:text-brand"
              }`} data-testid={`${testidPrefix}-age-${a.id}`}>
              {a.label}
            </button>
          ))}
        </div>
      </div>

      {(!gender || !style || !age) && (
        <p className="text-[11px] text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          <User size={11} weight="bold" className="inline mr-1" />
          Pilih gender, penampilan, dan usia dulu untuk bisa generate.
        </p>
      )}
    </div>
  );
}
