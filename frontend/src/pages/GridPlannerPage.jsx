import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "@/lib/api";
import { toast } from 'react-toastify';
import {
  GridFour,
  X,
  FloppyDisk,
  ImageSquare,
  Stack,
  PenNib,
  ForkKnife,
  DotsSixVertical,
} from "@phosphor-icons/react";
import ColorPicker from "@/components/ColorPicker";

const EMPTY_SLOTS = Array.from({ length: 9 }, (_, i) => ({
  slot_index: i,
  label: "",
  note: "",
  color_tag: "",
  prompt_id: null,
}));

export default function GridPlannerPage() {
  const [slots, setSlots] = useState(EMPTY_SLOTS);
  const [prompts, setPrompts] = useState([]);
  const [brand, setBrand] = useState(null);
  const [saving, setSaving] = useState(false);
  const [activeSlot, setActiveSlot] = useState(null);
  const [draggingIdx, setDraggingIdx] = useState(null);
  const [draggingColor, setDraggingColor] = useState(null);
  const [dragOverIdx, setDragOverIdx] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const [g, p, b] = await Promise.all([
          api.get("/grid-planner"),
          api.get("/prompts"),
          api.get("/brand-profile"),
        ]);
        setBrand(b.data);
        setPrompts(p.data);
        if (g.data?.slots?.length) {
          const filled = [...EMPTY_SLOTS];
          g.data.slots.forEach((s) => {
            if (s.slot_index >= 0 && s.slot_index < 9) filled[s.slot_index] = s;
          });
          setSlots(filled);
        }
      } catch {}
    })();
  }, []);

  const updateSlot = (i, patch) => {
    setSlots((arr) => arr.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));
  };

  const clearSlot = (i) => {
    setSlots((arr) => arr.map((s, idx) => (idx === i ? { ...EMPTY_SLOTS[i] } : s)));
  };

  const handleDragStart = (i) => {
    setDraggingIdx(i);
    setDraggingColor(null);
  };
  const handleColorDragStart = (color) => {
    setDraggingColor(color);
    setDraggingIdx(null);
  };
  const handleDragOver = (e, i) => {
    e.preventDefault();
    setDragOverIdx(i);
  };
  const handleDragLeave = (e) => {
    // Only clear if actually leaving the slot element (not entering a child)
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setDragOverIdx(null);
    }
  };
  const handleDrop = (target) => {
    setDragOverIdx(null);
    if (draggingColor) {
      // Color drag → apply color to target slot
      updateSlot(target, { color_tag: draggingColor });
      setDraggingColor(null);
      setActiveSlot(target);
      return;
    }
    if (draggingIdx !== null && draggingIdx !== target) {
      // Slot drag → swap positions
      setSlots((arr) => {
        const next = [...arr];
        [next[draggingIdx], next[target]] = [next[target], next[draggingIdx]];
        return next.map((s, i) => ({ ...s, slot_index: i }));
      });
    }
    setDraggingIdx(null);
  };
  const handleDragEnd = () => {
    setDraggingIdx(null);
    setDraggingColor(null);
    setDragOverIdx(null);
  };

  const save = async () => {
    setSaving(true);
    try {
      await api.post("/grid-planner", { name: "My Feed Grid", slots });
      toast.success("Grid layout disimpan!");
    } catch {
      toast.error("Gagal menyimpan");
    } finally {
      setSaving(false);
    }
  };

  const getPrompt = (id) => prompts.find((p) => p.id === id);

  const brandColors = brand
    ? [brand.color_primary, brand.color_secondary]
    : ["#0B3D2E", "#FDFBF7"];

  // Consistency check: count unique color tags
  const uniqueTags = [...new Set(slots.filter((s) => s.color_tag).map((s) => s.color_tag))];
  const consistencyScore =
    uniqueTags.length === 0 ? null : Math.max(0, 100 - (uniqueTags.length - 1) * 15);

  return (
    <div className="space-y-6" data-testid="grid-planner-page">
      <div className="animate-fade-up">
        <div className="text-xs uppercase tracking-[0.2em] text-brand-light font-semibold mb-2">Dashboard · Grid Planner</div>
        <h1 className="font-heading text-3xl sm:text-4xl font-bold text-brand tracking-tight">Feed Grid Planner</h1>
        <p className="text-stone-600 mt-2 max-w-2xl">
          Rencanakan visual 3×3 Instagram Anda. Drag-drop antar slot, tag warna untuk cek konsistensi, link ke prompt yang sudah ada.
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* 3x3 grid */}
        <div className="lg:col-span-2 animate-fade-up">
          <div className="feedify-card p-4 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="text-xs uppercase tracking-[0.18em] text-brand-light font-bold flex items-center gap-1.5">
                <GridFour size={14} weight="fill" /> 3×3 Feed Layout
              </div>
              <div className="text-xs text-stone-500">Drag untuk tukar posisi</div>
            </div>
            <div className="grid grid-cols-3 gap-2 sm:gap-3" data-testid="feed-grid">
              {slots.map((slot, i) => {
                const linked = getPrompt(slot.prompt_id);
                const isActive = activeSlot === i;
                const isDragTarget = dragOverIdx === i;
                const isDragging = draggingIdx === i;
                const slotBg = slot.color_tag || brand?.color_secondary || "#FDFBF7";
                const textColor = getContrastColor(slotBg);
                return (
                  <div
                    key={i}
                    draggable
                    onDragStart={() => handleDragStart(i)}
                    onDragOver={(e) => handleDragOver(e, i)}
                    onDragLeave={handleDragLeave}
                    onDragEnd={handleDragEnd}
                    onDrop={() => handleDrop(i)}
                    onClick={() => setActiveSlot(i)}
                    data-testid={`grid-slot-${i}`}
                    className={`aspect-square relative rounded-xl border-2 cursor-grab active:cursor-grabbing transition-all overflow-hidden select-none ${
                      isDragging
                        ? "opacity-40 scale-95 border-dashed border-brand"
                        : isDragTarget
                        ? "border-brand-gold border-dashed scale-105 ring-2 ring-brand-gold ring-offset-1"
                        : isActive
                        ? "border-brand ring-2 ring-brand scale-[1.02] shadow-lg"
                        : "border-brand-sand hover:border-brand-light hover:shadow-md"
                    }`}
                    style={{ background: slotBg }}
                  >
                    {/* Drag-target overlay */}
                    {isDragTarget && (
                      <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
                        <div className="bg-white/80 backdrop-blur-sm rounded-lg px-2 py-1">
                          <span className="text-[10px] font-bold text-brand">
                            {draggingColor ? "Drop warna" : "Tukar posisi"}
                          </span>
                        </div>
                      </div>
                    )}

                    <div className="absolute top-1.5 left-1.5 text-[10px] font-bold" style={{ color: textColor, opacity: 0.6 }}>
                      {i + 1}
                    </div>
                    {linked && (
                      <div className="absolute top-1.5 right-1.5" style={{ color: textColor, opacity: 0.7 }}>
                        {linked.dashboard_type === "banner" && <ImageSquare size={13} weight="fill" />}
                        {linked.dashboard_type === "carousel" && <Stack size={13} weight="fill" />}
                        {linked.dashboard_type === "copywriting" && <PenNib size={13} weight="fill" />}
                        {linked.dashboard_type === "food-menu" && <ForkKnife size={13} weight="fill" />}
                      </div>
                    )}
                    {slot.color_tag && (
                      <div className="absolute bottom-1.5 right-1.5 h-3 w-3 rounded-full border border-white/50 shadow-sm" style={{ background: slot.color_tag }} />
                    )}
                    <div className="absolute inset-0 flex flex-col items-center justify-center p-2 text-center">
                      {slot.label ? (
                        <div className="text-xs font-bold leading-tight drop-shadow-sm" style={{ color: textColor }}>
                          {slot.label}
                        </div>
                      ) : (
                        <DotsSixVertical size={20} style={{ color: textColor, opacity: 0.3 }} />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Color drag legend */}
            {(draggingColor || draggingIdx !== null) && (
              <div className="mt-3 flex items-center gap-2 text-xs text-brand font-semibold animate-pulse">
                <div className="h-4 w-4 rounded-sm border-2 border-dashed border-brand" style={{ background: draggingColor || "transparent" }} />
                {draggingColor ? `Drag warna ${draggingColor} ke slot yang mau diubah` : "Drag slot ke posisi baru"}
              </div>
            )}

            <div className="mt-5 flex flex-wrap items-center gap-2 justify-between">
              {consistencyScore !== null ? (
                <div className="flex items-center gap-2">
                  <div className="text-xs text-stone-500">Skor konsistensi warna:</div>
                  <div
                    className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                      consistencyScore >= 75 ? "bg-green-100 text-green-800" :
                      consistencyScore >= 50 ? "bg-amber-100 text-amber-800" :
                      "bg-red-100 text-red-800"
                    }`}
                    data-testid="consistency-score"
                  >
                    {consistencyScore}/100
                  </div>
                </div>
              ) : <div />}
              <button
                onClick={save}
                disabled={saving}
                data-testid="save-grid-btn"
                className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-brand text-brand-cream rounded-full font-semibold hover:bg-brand-light btn-lift btn-touch disabled:opacity-60"
              >
                <FloppyDisk size={16} weight="fill" /> {saving ? "Menyimpan..." : "Simpan Grid"}
              </button>
            </div>
          </div>
        </div>

        {/* Slot editor */}
        <div className="lg:sticky lg:top-6 lg:self-start animate-fade-up">
          <div className="feedify-card p-5">
            <div className="text-xs uppercase tracking-[0.18em] text-brand-light font-bold mb-3">
              {activeSlot !== null ? `Edit Slot ${activeSlot + 1}` : "Pilih slot dulu"}
            </div>
            {activeSlot !== null ? (
              <div className="space-y-3" data-testid="slot-editor">
                <div>
                  <label className="text-xs font-semibold uppercase tracking-[0.15em] text-stone-500 mb-1 block">Label</label>
                  <input
                    type="text"
                    className="input"
                    value={slots[activeSlot].label}
                    onChange={(e) => updateSlot(activeSlot, { label: e.target.value })}
                    placeholder="mis. Promo Lebaran"
                    data-testid="slot-label-input"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase tracking-[0.15em] text-stone-500 mb-1 block">Note</label>
                  <textarea
                    rows={2}
                    className="input resize-none"
                    value={slots[activeSlot].note}
                    onChange={(e) => updateSlot(activeSlot, { note: e.target.value })}
                    placeholder="Catatan internal..."
                    data-testid="slot-note-input"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase tracking-[0.15em] text-stone-500 mb-2 block">Color Tag</label>

                  {/* Brand quick swatches — draggable to any slot */}
                  <div className="mb-3">
                    <div className="text-[9px] uppercase tracking-[0.12em] text-stone-400 font-semibold mb-1.5">
                      Brand — drag ke slot manapun
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => updateSlot(activeSlot, { color_tag: "" })}
                        className={`h-8 w-8 rounded-xl border-2 flex items-center justify-center flex-shrink-0 transition-all ${!slots[activeSlot].color_tag ? "border-brand ring-1 ring-brand" : "border-stone-200 hover:border-stone-400"}`}
                        style={{ background: "white" }}
                        title="Hapus warna"
                        data-testid="slot-color-clear"
                      >
                        <X size={11} className="text-stone-400" />
                      </button>
                      {brandColors.map((c) => (
                        <button
                          key={c}
                          draggable
                          onDragStart={() => handleColorDragStart(c)}
                          onDragEnd={handleDragEnd}
                          onClick={() => updateSlot(activeSlot, { color_tag: c })}
                          title={`${c} — klik atau drag ke slot`}
                          data-testid={`slot-color-${c.replace('#', '')}`}
                          className={`h-8 w-8 rounded-xl border-2 flex-shrink-0 transition-all cursor-grab active:cursor-grabbing hover:scale-110 ${
                            slots[activeSlot].color_tag === c
                              ? "border-brand scale-110 ring-2 ring-brand-gold shadow-md"
                              : "border-white shadow-sm"
                          }`}
                          style={{ background: c }}
                        />
                      ))}
                      {/* Current color drag swatch */}
                      {slots[activeSlot].color_tag && !brandColors.includes(slots[activeSlot].color_tag) && (
                        <button
                          draggable
                          onDragStart={() => handleColorDragStart(slots[activeSlot].color_tag)}
                          onDragEnd={handleDragEnd}
                          title={`${slots[activeSlot].color_tag} — drag ke slot lain`}
                          className="h-8 w-8 rounded-xl border-2 border-brand-gold ring-2 ring-brand-gold flex-shrink-0 cursor-grab active:cursor-grabbing shadow-md"
                          style={{ background: slots[activeSlot].color_tag }}
                        />
                      )}
                    </div>
                  </div>

                  {/* Full ColorPicker — Canva-style */}
                  <ColorPicker
                    color={slots[activeSlot].color_tag || "#FDFBF7"}
                    onChange={(c) => updateSlot(activeSlot, { color_tag: c })}
                    testid="slot-color-picker"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase tracking-[0.15em] text-stone-500 mb-1.5 block">Link ke Prompt</label>
                  <select
                    className="input"
                    value={slots[activeSlot].prompt_id || ""}
                    onChange={(e) => updateSlot(activeSlot, { prompt_id: e.target.value || null })}
                    data-testid="slot-prompt-link"
                  >
                    <option value="">— tidak dilink —</option>
                    {prompts.slice(0, 30).map((p) => (
                      <option key={p.id} value={p.id}>
                        [{p.dashboard_type}] {p.title.slice(0, 40)}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  onClick={() => { clearSlot(activeSlot); }}
                  data-testid="clear-slot-btn"
                  className="w-full py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg font-medium"
                >
                  Kosongkan slot
                </button>
              </div>
            ) : (
              <p className="text-sm text-stone-500">Klik salah satu slot di grid untuk mulai mengisi.</p>
            )}
          </div>

          <div className="feedify-card p-5 mt-4">
            <div className="text-xs uppercase tracking-[0.18em] text-brand-light font-bold mb-2">Tips konsistensi</div>
            <ul className="text-xs text-stone-600 space-y-1.5">
              <li>• Pakai 2-3 warna tag yang sama berulang untuk feed yang harmonis</li>
              <li>• Variasi konten: 1 hero, 2 quote/edukasi, 1 testimoni dst</li>
              <li>• Drag slot untuk re-arrange visual flow</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

function getContrastColor(hex) {
  if (!hex || !hex.startsWith("#")) return "#1C1917";
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum > 0.6 ? "#1C1917" : "#FDFBF7";
}
