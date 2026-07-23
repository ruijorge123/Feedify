import { useRef, useState, useCallback, useEffect } from "react";

/**
 * Interactive canvas: shows product photo on white background.
 * Text elements (headline + feature columns) are draggable.
 * Positions stored as x_pct / y_pct (0.0–1.0 relative to canvas size).
 *
 * Props:
 *   productPhoto  — data URL of uploaded product photo (or null)
 *   aspectRatio   — "4:5 (Portrait Feed)" | "9:16..." | "1:1..." | "16:9..."
 *   elements      — [{ id, type: "headline"|"feature", text, x_pct, y_pct }]
 *   onUpdatePos   — (id, x_pct, y_pct) => void
 *   brandName     — string from Brand DNA
 *   brandColor    — hex string, e.g. "#0B3D2E"
 */
export default function TextCanvas({ productPhoto, aspectRatio, elements, onUpdatePos, brandName, brandColor = "#0B3D2E" }) {
  const containerRef = useRef(null);
  const [dragging, setDragging] = useState(null); // { id, startX, startY, origX, origY }

  // Derive aspect ratio CSS
  const ar = (aspectRatio || "").toLowerCase();
  let paddingBottom = "125%"; // 4:5 default
  if (ar.includes("1:1") || ar.includes("square"))   paddingBottom = "100%";
  else if (ar.includes("9:16") || ar.includes("story"))  paddingBottom = "177.78%";
  else if (ar.includes("16:9") || ar.includes("landscape")) paddingBottom = "56.25%";

  const getCanvasRect = useCallback(() => containerRef.current?.getBoundingClientRect(), []);

  const onPointerDown = useCallback((e, id) => {
    e.preventDefault();
    e.stopPropagation();
    const el = elements.find(el => el.id === id);
    if (!el) return;
    const rect = getCanvasRect();
    if (!rect) return;
    setDragging({
      id,
      startClientX: e.clientX,
      startClientY: e.clientY,
      origX: el.x_pct,
      origY: el.y_pct,
      rectW: rect.width,
      rectH: rect.height,
    });
    e.currentTarget.setPointerCapture(e.pointerId);
  }, [elements, getCanvasRect]);

  const onPointerMove = useCallback((e) => {
    if (!dragging) return;
    const dx = (e.clientX - dragging.startClientX) / dragging.rectW;
    const dy = (e.clientY - dragging.startClientY) / dragging.rectH;
    const newX = Math.max(0.02, Math.min(0.98, dragging.origX + dx));
    const newY = Math.max(0.02, Math.min(0.98, dragging.origY + dy));
    onUpdatePos(dragging.id, newX, newY);
  }, [dragging, onUpdatePos]);

  const onPointerUp = useCallback(() => {
    setDragging(null);
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative w-full rounded-2xl overflow-hidden border-2 border-stone-200 bg-white select-none"
      style={{ paddingBottom }}
      data-testid="text-canvas"
    >
      <div className="absolute inset-0">
        {/* White background */}
        <div className="absolute inset-0 bg-white" />

        {/* Product photo centered */}
        {productPhoto && (
          <img
            src={productPhoto}
            alt="produk"
            className="absolute inset-0 w-full h-full object-contain pointer-events-none"
            draggable={false}
          />
        )}

        {!productPhoto && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center opacity-30">
              <div className="w-16 h-20 mx-auto border-2 border-stone-300 rounded-lg mb-2" />
              <p className="text-xs text-stone-400">Upload foto produk</p>
            </div>
          </div>
        )}

        {/* Draggable text elements */}
        {elements.map((el) => {
          const isEmpty = !el.text.trim();
          if (isEmpty) return null;
          const isHeadline = el.type === "headline";
          const isDragging = dragging?.id === el.id;

          return (
            <div
              key={el.id}
              data-testid={`canvas-element-${el.id}`}
              onPointerDown={(e) => onPointerDown(e, el.id)}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              style={{
                position: "absolute",
                left: `${el.x_pct * 100}%`,
                top: `${el.y_pct * 100}%`,
                transform: "translate(-50%, -50%)",
                cursor: isDragging ? "grabbing" : "grab",
                touchAction: "none",
                zIndex: isDragging ? 20 : 10,
              }}
            >
              <div
                style={{
                  background: isDragging ? "rgba(255,255,255,0.97)" : "rgba(255,255,255,0.92)",
                  backdropFilter: "blur(4px)",
                  border: `1.5px ${isDragging ? "solid" : "dashed"} ${brandColor}`,
                  borderRadius: isHeadline ? "6px" : "20px",
                  padding: isHeadline ? "4px 10px" : "3px 10px",
                  whiteSpace: "nowrap",
                  boxShadow: isDragging
                    ? `0 4px 16px rgba(0,0,0,0.18), 0 0 0 2px ${brandColor}40`
                    : "0 2px 8px rgba(0,0,0,0.08)",
                  transition: "box-shadow 0.15s, border-style 0.15s",
                }}
              >
                <span
                  style={{
                    color: brandColor,
                    fontSize: isHeadline ? "13px" : "10px",
                    fontWeight: isHeadline ? 700 : 600,
                    fontFamily: isHeadline ? "'Outfit', sans-serif" : "'Plus Jakarta Sans', sans-serif",
                    letterSpacing: isHeadline ? "-0.01em" : "0.02em",
                    lineHeight: 1.2,
                    display: "block",
                  }}
                >
                  {el.text}
                </span>
              </div>
            </div>
          );
        })}

        {/* Canvas hint overlay when no elements */}
        {elements.every(el => !el.text.trim()) && (
          <div className="absolute inset-x-0 bottom-3 flex justify-center pointer-events-none">
            <span className="text-[10px] text-stone-400 bg-white/70 px-2 py-1 rounded-full">
              Isi text di bawah lalu drag posisinya di sini
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
