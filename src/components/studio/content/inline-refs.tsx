"use client";

import { useUnifiedStudioStore, type RefMode } from "@/stores/unified-studio-store";

const MODE_LABELS: Record<RefMode, string> = {
  exact: "Exact",
  scene: "Same Scene",
  vibe: "Vibe",
};

export function InlineRefs() {
  const { attachedRefs, detachRef, setRefMode, inspirationPhotos, removeInspirationPhoto } = useUnifiedStudioStore();

  if (attachedRefs.length === 0 && inspirationPhotos.length === 0) return null;

  return (
    <div className="sv2-inline-refs">
      {attachedRefs.map(({ ref, mode }) => (
        <div key={ref.id} className="sv2-inline-ref">
          <div
            className="sv2-inline-ref-thumb"
            style={{ background: ref.imageUrl ? `url(${ref.imageUrl}) center/cover` : "#F5F5F5" }}
          />
          <div style={{ display: "flex", flexDirection: "column", gap: 1, flex: 1, minWidth: 0 }}>
            <span style={{ fontSize: 10, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ref.name}</span>
            <select
              value={mode}
              onChange={(e) => setRefMode(ref.id, e.target.value as RefMode)}
              onClick={(e) => e.stopPropagation()}
              style={{
                fontSize: 9,
                padding: "1px 2px",
                border: "1px solid #EBEBEB",
                borderRadius: 4,
                background: mode === "vibe" ? "rgba(196,96,58,0.08)" : "#F9F9F9",
                color: mode === "vibe" ? "#C4603A" : "#888",
                cursor: "pointer",
                fontFamily: "inherit",
                outline: "none",
                width: "fit-content",
              }}
            >
              <option value="exact">{MODE_LABELS.exact}</option>
              <option value="scene">{MODE_LABELS.scene}</option>
              <option value="vibe">{MODE_LABELS.vibe}</option>
            </select>
          </div>
          <button className="sv2-inline-ref-x" onClick={() => detachRef(ref.id)}>&times;</button>
        </div>
      ))}
      {inspirationPhotos.map((photo, i) => (
        <div key={`inspo-${i}`} className="sv2-inline-ref">
          <div
            className="sv2-inline-ref-thumb"
            style={{ background: `url(${photo.preview}) center/cover` }}
          />
          <span>Inspiration</span>
          <button className="sv2-inline-ref-x" onClick={() => removeInspirationPhoto(i)}>&times;</button>
        </div>
      ))}
    </div>
  );
}
