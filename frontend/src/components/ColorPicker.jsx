import { useState, useRef, useCallback, useEffect } from "react";

// ── Color utils ──────────────────────────────────────────────────────────────
function hexToRgb(hex) {
  const h = hex.replace("#", "");
  return { r: parseInt(h.slice(0, 2), 16), g: parseInt(h.slice(2, 4), 16), b: parseInt(h.slice(4, 6), 16) };
}
function rgbToHex(r, g, b) {
  return "#" + [r, g, b].map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, "0")).join("");
}
function rgbToHsv(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
  let h = 0;
  if (d !== 0) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h = (h * 60 + 360) % 360;
  }
  return { h, s: max === 0 ? 0 : d / max, v: max };
}
function hsvToRgb(h, s, v) {
  const f = (n) => { const k = (n + h / 60) % 6; return v - v * s * Math.max(0, Math.min(k, 4 - k, 1)); };
  return { r: f(5) * 255, g: f(3) * 255, b: f(1) * 255 };
}
function hsvToHex(h, s, v) { const { r, g, b } = hsvToRgb(h, s, v); return rgbToHex(r, g, b); }
function hexToHsv(hex) {
  if (!/^#[0-9A-Fa-f]{6}$/.test(hex)) return { h: 0, s: 0, v: 1 };
  const { r, g, b } = hexToRgb(hex);
  return rgbToHsv(r, g, b);
}
export function firstHex(val) {
  if (!val) return "#000000";
  const m = val.match(/#[0-9A-Fa-f]{6}/);
  return m ? m[0] : val;
}

// ── Solid presets ─────────────────────────────────────────────────────────────
const SOLID_PRESETS = [
  "#0B3D2E","#1A5F4A","#2ECC71","#27AE60",
  "#E5C158","#D4AF37","#F39C12","#FF9500",
  "#0288D1","#33A3FF","#1565C0","#0097A7",
  "#9B59B6","#6A1B9A","#E91E63","#C62828",
  "#FF6B6B","#C28E6E","#1C1917","#FDFBF7",
];

// ── Gradient presets ──────────────────────────────────────────────────────────
const GRADIENT_PRESETS = [
  { from: "#0B3D2E", to: "#E5C158", angle: 135, label: "Hutan Emas" },
  { from: "#1A5F4A", to: "#5EEAD4", angle: 135, label: "Zamrud" },
  { from: "#0288D1", to: "#A78BFA", angle: 135, label: "Sapphire" },
  { from: "#E91E63", to: "#FF9500", angle: 135, label: "Sunset" },
  { from: "#6A1B9A", to: "#E91E63", angle: 135, label: "Galaxy" },
  { from: "#1C1917", to: "#44403C", angle: 135, label: "Obsidian" },
  { from: "#C62828", to: "#FF6B6B", angle: 135, label: "Coral" },
  { from: "#C28E6E", to: "#FDFBF7", angle: 135, label: "Latte" },
  { from: "#4F46E5", to: "#A78BFA", angle: 135, label: "Lavender" },
  { from: "#0F766E", to: "#F39C12", angle: 135, label: "Tropic" },
];

// ── Angle options ─────────────────────────────────────────────────────────────
const ANGLES = [
  { deg: 0,   icon: "↑" },
  { deg: 45,  icon: "↗" },
  { deg: 90,  icon: "→" },
  { deg: 135, icon: "↘" },
  { deg: 180, icon: "↓" },
  { deg: 225, icon: "↙" },
  { deg: 270, icon: "←" },
  { deg: 315, icon: "↖" },
];

// ── Sub-components ────────────────────────────────────────────────────────────
function HexInput({ color, onChange }) {
  const [val, setVal] = useState(color);
  useEffect(() => setVal(color), [color]);
  const commit = () => {
    const clean = val.startsWith("#") ? val : "#" + val;
    if (/^#[0-9A-Fa-f]{6}$/.test(clean)) onChange(clean.toUpperCase());
    else setVal(color);
  };
  return (
    <div className="flex items-center gap-2 mt-3">
      <div className="h-8 w-8 rounded-lg border border-brand-sand flex-shrink-0" style={{ background: color }} />
      <div className="flex items-center gap-1 flex-1 bg-brand-sand/60 border border-brand-sand rounded-xl px-3 py-2">
        <span className="text-stone-400 font-mono text-sm">#</span>
        <input
          type="text"
          value={val.replace("#", "").toUpperCase()}
          onChange={(e) => setVal("#" + e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => e.key === "Enter" && commit()}
          maxLength={6}
          className="flex-1 bg-transparent font-mono text-sm text-brand outline-none uppercase"
          spellCheck={false}
        />
      </div>
    </div>
  );
}

function Canvas({ hsv, onChange }) {
  const ref = useRef(null);
  const dragging = useRef(false);

  const pick = useCallback((e) => {
    const rect = ref.current.getBoundingClientRect();
    const s = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const v = Math.max(0, Math.min(1, 1 - (e.clientY - rect.top) / rect.height));
    onChange({ ...hsv, s, v });
  }, [hsv, onChange]);

  return (
    <div
      ref={ref}
      className="relative w-full rounded-xl overflow-hidden cursor-crosshair select-none mb-3"
      style={{ height: 160, background: `hsl(${hsv.h}, 100%, 50%)` }}
      onPointerDown={(e) => { dragging.current = true; e.currentTarget.setPointerCapture(e.pointerId); pick(e); }}
      onPointerMove={(e) => dragging.current && pick(e)}
      onPointerUp={() => { dragging.current = false; }}
    >
      <div className="absolute inset-0" style={{ background: "linear-gradient(to right, #fff, transparent)" }} />
      <div className="absolute inset-0" style={{ background: "linear-gradient(to top, #000, transparent)" }} />
      {/* Handle */}
      <div
        className="absolute pointer-events-none h-5 w-5 rounded-full border-2 border-white shadow-[0_0_0_1px_rgba(0,0,0,0.2)] -translate-x-1/2 -translate-y-1/2"
        style={{
          left: `${hsv.s * 100}%`,
          top: `${(1 - hsv.v) * 100}%`,
          background: hsvToHex(hsv.h, hsv.s, hsv.v),
        }}
      />
    </div>
  );
}

function HueSlider({ hue, onChange }) {
  const ref = useRef(null);
  const dragging = useRef(false);
  const pick = useCallback((e) => {
    const rect = ref.current.getBoundingClientRect();
    const h = Math.max(0, Math.min(360, ((e.clientX - rect.left) / rect.width) * 360));
    onChange(h);
  }, [onChange]);
  return (
    <div
      ref={ref}
      className="relative w-full h-4 rounded-full cursor-pointer select-none mb-4"
      style={{ background: "linear-gradient(to right,#f00,#ff0,#0f0,#0ff,#00f,#f0f,#f00)" }}
      onPointerDown={(e) => { dragging.current = true; e.currentTarget.setPointerCapture(e.pointerId); pick(e); }}
      onPointerMove={(e) => dragging.current && pick(e)}
      onPointerUp={() => { dragging.current = false; }}
    >
      <div
        className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 h-5 w-5 rounded-full border-2 border-white shadow-md pointer-events-none"
        style={{ left: `${(hue / 360) * 100}%`, background: `hsl(${hue}, 100%, 50%)` }}
      />
    </div>
  );
}

// ── Solid tab ─────────────────────────────────────────────────────────────────
function SolidPicker({ color, onChange }) {
  const [hsv, setHsv] = useState(() => hexToHsv(firstHex(color)));

  useEffect(() => {
    if (/^#[0-9A-Fa-f]{6}$/.test(color)) setHsv(hexToHsv(color));
  }, [color]);

  const commit = useCallback((newHsv) => {
    setHsv(newHsv);
    onChange(hsvToHex(newHsv.h, newHsv.s, newHsv.v));
  }, [onChange]);

  const currentHex = hsvToHex(hsv.h, hsv.s, hsv.v);

  return (
    <div>
      <Canvas hsv={hsv} onChange={commit} />
      <HueSlider hue={hsv.h} onChange={(h) => commit({ ...hsv, h })} />
      <HexInput color={currentHex} onChange={(hex) => { setHsv(hexToHsv(hex)); onChange(hex); }} />
      {/* Presets */}
      <div className="mt-4">
        <div className="text-xs text-stone-400 font-medium mb-2">Preset warna</div>
        <div className="grid grid-cols-10 gap-1.5">
          {SOLID_PRESETS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => { setHsv(hexToHsv(c)); onChange(c); }}
              className={`h-7 w-7 rounded-lg border-2 transition-all hover:scale-110 ${
                currentHex.toLowerCase() === c.toLowerCase()
                  ? "border-brand scale-110 shadow-md"
                  : "border-transparent hover:border-white"
              }`}
              style={{ background: c }}
              title={c}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Mini hue swatch for gradient stops ───────────────────────────────────────
function StopPicker({ label, color, onChange }) {
  const [hsv, setHsv] = useState(() => hexToHsv(color));
  useEffect(() => { if (/^#[0-9A-Fa-f]{6}$/.test(color)) setHsv(hexToHsv(color)); }, [color]);
  const commit = (newHsv) => { setHsv(newHsv); onChange(hsvToHex(newHsv.h, newHsv.s, newHsv.v)); };
  const currentHex = hsvToHex(hsv.h, hsv.s, hsv.v);
  return (
    <div className="flex-1 min-w-0">
      <div className="text-xs text-stone-500 font-medium mb-1.5">{label}</div>
      <Canvas hsv={hsv} onChange={commit} />
      <HueSlider hue={hsv.h} onChange={(h) => commit({ ...hsv, h })} />
      <HexInput color={currentHex} onChange={(hex) => { setHsv(hexToHsv(hex)); onChange(hex); }} />
    </div>
  );
}

// ── Gradient tab ──────────────────────────────────────────────────────────────
function parseGradient(val) {
  const m = val?.match(/linear-gradient\((\d+)deg,\s*(#[0-9A-Fa-f]{6}),\s*(#[0-9A-Fa-f]{6})\)/i);
  if (m) return { angle: parseInt(m[1]), from: m[2], to: m[3] };
  const hex = firstHex(val);
  return { angle: 135, from: hex, to: "#E5C158" };
}

function GradientPicker({ color, onChange }) {
  const [grad, setGrad] = useState(() => parseGradient(color));
  const [activeStop, setActiveStop] = useState("from");

  const update = (patch) => {
    const next = { ...grad, ...patch };
    setGrad(next);
    onChange(`linear-gradient(${next.angle}deg, ${next.from}, ${next.to})`);
  };

  const gradientCSS = `linear-gradient(${grad.angle}deg, ${grad.from}, ${grad.to})`;

  return (
    <div>
      {/* Big preview */}
      <div
        className="w-full h-20 rounded-2xl mb-4 border border-brand-sand/40 shadow-sm"
        style={{ background: gradientCSS }}
      />

      {/* Angle picker */}
      <div className="mb-4">
        <div className="text-xs text-stone-400 font-medium mb-2">Arah gradasi</div>
        <div className="grid grid-cols-8 gap-1.5">
          {ANGLES.map((a) => (
            <button
              key={a.deg}
              type="button"
              onClick={() => update({ angle: a.deg })}
              className={`h-9 rounded-xl text-base transition-all ${
                grad.angle === a.deg
                  ? "bg-brand text-brand-cream shadow-md scale-105"
                  : "bg-brand-sand text-stone-600 hover:bg-brand-sand/80"
              }`}
            >
              {a.icon}
            </button>
          ))}
        </div>
      </div>

      {/* Stop tabs */}
      <div className="flex gap-2 mb-3">
        {[
          { id: "from", label: "Warna Awal", color: grad.from },
          { id: "to",   label: "Warna Akhir", color: grad.to },
        ].map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setActiveStop(s.id)}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all flex-1 ${
              activeStop === s.id ? "bg-brand text-brand-cream" : "bg-brand-sand text-stone-600 hover:bg-brand-sand/80"
            }`}
          >
            <span
              className="h-4 w-4 rounded-full border-2 border-white/60 flex-shrink-0"
              style={{ background: s.color }}
            />
            {s.label}
          </button>
        ))}
      </div>

      {/* Active stop picker */}
      <div className="p-3 bg-brand-sand/30 rounded-2xl border border-brand-sand">
        {activeStop === "from" ? (
          <StopPicker label="" color={grad.from} onChange={(c) => update({ from: c })} />
        ) : (
          <StopPicker label="" color={grad.to} onChange={(c) => update({ to: c })} />
        )}
      </div>

      {/* Gradient presets */}
      <div className="mt-4">
        <div className="text-xs text-stone-400 font-medium mb-2">Preset gradasi</div>
        <div className="grid grid-cols-5 gap-2">
          {GRADIENT_PRESETS.map((p) => {
            const css = `linear-gradient(${p.angle}deg, ${p.from}, ${p.to})`;
            const isActive = grad.from === p.from && grad.to === p.to;
            return (
              <button
                key={p.label}
                type="button"
                onClick={() => update({ from: p.from, to: p.to, angle: p.angle })}
                className={`h-10 rounded-xl border-2 transition-all hover:scale-105 ${
                  isActive ? "border-brand scale-105 shadow-md" : "border-transparent hover:border-white"
                }`}
                style={{ background: css }}
                title={p.label}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Main ColorPicker ──────────────────────────────────────────────────────────
export default function ColorPicker({ color, onChange, testid = "color-picker" }) {
  const isGradient = typeof color === "string" && color.startsWith("linear-gradient");
  const [tab, setTab] = useState(isGradient ? "gradient" : "solid");

  const displayBg = color?.startsWith("linear-gradient") ? color : color;

  return (
    <div
      data-testid={testid}
      className="bg-white rounded-2xl border border-brand-sand shadow-sm p-4"
    >
      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-brand-sand/50 rounded-xl mb-4">
        {[
          { id: "solid",    label: "Warna Solid" },
          { id: "gradient", label: "Gradasi" },
        ].map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${
              tab === t.id
                ? "bg-white text-brand shadow-sm"
                : "text-stone-500 hover:text-brand"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "solid" ? (
        <SolidPicker color={firstHex(color)} onChange={onChange} />
      ) : (
        <GradientPicker color={color} onChange={onChange} />
      )}
    </div>
  );
}
