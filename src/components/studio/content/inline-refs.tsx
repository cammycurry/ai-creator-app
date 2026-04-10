"use client";

import { useUnifiedStudioStore, type RefMode, type RefType } from "@/stores/unified-studio-store";

export function InlineRefs() {
  const { attachedRefs, detachRef, setRefMode, setRefType, setRefDescription, inspirationPhotos, removeInspirationPhoto } = useUnifiedStudioStore();

  if (attachedRefs.length === 0 && inspirationPhotos.length === 0) return null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {attachedRefs.map(({ ref, refType, mode, description }) => {
        const isProduct = refType === "product";
        const needsType = refType === null;
        const needsMode = refType === "scene" && mode === null;

        return (
          <div
            key={ref.id}
            style={{
              padding: "8px 10px",
              borderRadius: 8,
              background: "#FAFAFA",
              border: (needsType || needsMode) ? "1px solid #C4603A" : "1px solid #EBEBEB",
            }}
          >
            {/* Row 1: thumbnail + name + remove */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <div style={{
                width: 32, height: 32, borderRadius: 4, flexShrink: 0,
                background: ref.imageUrl ? `url(${ref.imageUrl}) center/cover` : "#DDD",
              }} />
              <span style={{ fontSize: 11, fontWeight: 500, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {ref.name}
              </span>
              <button
                onClick={() => detachRef(ref.id)}
                style={{ background: "none", border: "none", cursor: "pointer", fontSize: 14, color: "#BBB", padding: 0, lineHeight: 1 }}
              >
                &times;
              </button>
            </div>

            {/* Row 2: Type selection — REQUIRED */}
            <div style={{ display: "flex", gap: 4, marginBottom: needsType ? 0 : 4 }}>
              <button
                className={`sv2-cfg-pill${refType === "scene" ? " on" : ""}`}
                style={{ fontSize: 10, padding: "3px 10px" }}
                onClick={() => setRefType(ref.id, "scene" as RefType)}
              >
                Scene
              </button>
              <button
                className={`sv2-cfg-pill${refType === "product" ? " on" : ""}`}
                style={{ fontSize: 10, padding: "3px 10px" }}
                onClick={() => {
                  setRefType(ref.id, "product" as RefType);
                  setRefMode(ref.id, "exact" as RefMode);
                }}
              >
                Product / Outfit
              </button>
              {needsType && (
                <span style={{ fontSize: 9, color: "#C4603A", alignSelf: "center", marginLeft: 4 }}>← pick one</span>
              )}
            </div>

            {/* Row 3: Mode selection — REQUIRED for scene */}
            {refType === "scene" && (
              <div style={{ display: "flex", gap: 4, marginBottom: 4 }}>
                <button
                  className={`sv2-cfg-pill${mode === "exact" ? " on" : ""}`}
                  style={{ fontSize: 10, padding: "3px 10px" }}
                  onClick={() => setRefMode(ref.id, "exact" as RefMode)}
                >
                  Exact
                </button>
                <button
                  className={`sv2-cfg-pill${mode === "inspired" ? " on" : ""}`}
                  style={{ fontSize: 10, padding: "3px 10px" }}
                  onClick={() => setRefMode(ref.id, "inspired" as RefMode)}
                >
                  Inspired by
                </button>
                {needsMode && (
                  <span style={{ fontSize: 9, color: "#C4603A", alignSelf: "center", marginLeft: 4 }}>← pick one</span>
                )}
              </div>
            )}

            {/* Row 4: Description — only show after type is selected */}
            {refType !== null && (
              <input
                value={description}
                onChange={(e) => setRefDescription(ref.id, e.target.value)}
                placeholder={isProduct ? "e.g. gold necklace, red dress" : "e.g. coffee shop in brooklyn"}
                style={{
                  width: "100%", padding: "4px 8px", fontSize: 11,
                  border: "1px solid #EBEBEB", borderRadius: 4,
                  background: "white", color: "#555",
                  fontFamily: "inherit", outline: "none",
                }}
              />
            )}
          </div>
        );
      })}

      {inspirationPhotos.map((photo, i) => (
        <div
          key={`inspo-${i}`}
          style={{
            display: "flex", alignItems: "center", gap: 8,
            padding: "6px 10px", borderRadius: 8, background: "#FAFAFA", border: "1px solid #EBEBEB",
          }}
        >
          <div style={{ width: 32, height: 32, borderRadius: 4, background: `url(${photo.preview}) center/cover`, flexShrink: 0 }} />
          <span style={{ fontSize: 11, flex: 1 }}>Inspiration photo</span>
          <button
            onClick={() => removeInspirationPhoto(i)}
            style={{ background: "none", border: "none", cursor: "pointer", fontSize: 14, color: "#BBB", padding: 0, lineHeight: 1 }}
          >
            &times;
          </button>
        </div>
      ))}
    </div>
  );
}
