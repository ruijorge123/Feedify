import { useState, useRef } from "react";
import { X, Plus } from "@phosphor-icons/react";

/**
 * Chip-style multi-tag input.
 * Props:
 *   value: string[]
 *   onChange: (tags: string[]) => void
 *   suggestions: string[]   — preset suggestions shown below input
 *   placeholder: string
 *   maxTags: number
 */
export default function TagInput({
  value = [],
  onChange,
  suggestions = [],
  placeholder = "Tambah tag...",
  maxTags = 20,
}) {
  const [draft, setDraft] = useState("");
  const inputRef = useRef(null);

  const add = (tag) => {
    const trimmed = tag.trim();
    if (!trimmed || value.includes(trimmed) || value.length >= maxTags) return;
    onChange([...value, trimmed]);
    setDraft("");
  };

  const remove = (tag) => onChange(value.filter((t) => t !== tag));

  const handleKeyDown = (e) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      add(draft);
    } else if (e.key === "Backspace" && draft === "" && value.length > 0) {
      remove(value[value.length - 1]);
    }
  };

  const unusedSuggestions = suggestions.filter((s) => !value.includes(s));

  return (
    <div className="space-y-2">
      {/* Tags + input row */}
      <div
        className="min-h-[44px] flex flex-wrap gap-1.5 items-center border border-stone-200 rounded-xl px-3 py-2 bg-white cursor-text focus-within:ring-2 focus-within:ring-brand/30 focus-within:border-brand/60 transition-all"
        onClick={() => inputRef.current?.focus()}
      >
        {value.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 bg-brand/10 text-brand text-xs font-semibold px-2.5 py-1 rounded-full"
          >
            {tag}
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); remove(tag); }}
              className="text-brand/60 hover:text-brand transition-colors"
              data-testid={`tag-remove-${tag}`}
            >
              <X size={10} weight="bold" />
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={() => { if (draft.trim()) add(draft); }}
          placeholder={value.length === 0 ? placeholder : ""}
          className="flex-1 min-w-[120px] text-sm outline-none bg-transparent text-stone-700 placeholder:text-stone-400"
          data-testid="tag-input-field"
        />
        {draft.trim() && (
          <button
            type="button"
            onClick={() => add(draft)}
            className="text-brand/70 hover:text-brand transition-colors"
          >
            <Plus size={14} weight="bold" />
          </button>
        )}
      </div>

      {/* Suggestions */}
      {unusedSuggestions.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {unusedSuggestions.slice(0, 12).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => add(s)}
              className="text-[11px] px-2.5 py-1 rounded-full border border-stone-200 text-stone-500 hover:border-brand/50 hover:text-brand hover:bg-brand/5 transition-all"
              data-testid={`tag-suggestion-${s}`}
            >
              + {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
