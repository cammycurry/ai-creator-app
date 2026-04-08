"use client";

import { useState } from "react";
import { useUnifiedStudioStore, type RefMode, type RefWhat } from "@/stores/unified-studio-store";

const MODE_LABELS: Record<RefMode, string> = {
  exact: "Exact",
  similar: "Similar",
  vibe: "Vibe",
};

const WHAT_LABELS: Record<RefWhat, string> = {
  background: "BG",
  outfit: "Outfit",
  pose: "Pose",
  all: "All",
};

export function InlineRefs() {
  const { attachedRefs, detachRef, setRefMode, setRefWhat, setRefDescription, inspirationPhotos, removeInspirationPhoto } = useUnifiedStudioStore();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (attachedRefs.length === 0 && inspirationPhotos.length === 0) return null;

  return (
    <div className="sv2-inline-refs">
      {attachedRefs.map(({ ref, mode, what, description }) => {
        const isExpanded = expandedId === ref.id;
        const isVibe = mode === "vibe";

        return (
          <div
            key={ref.id}
            className="sv2-inline-ref"
            style={{
              flexDirection: "column",
              alignItems: "stretch",
              padding: isExpanded ? "6px 8px" : "3px 8px 3px 3px",
              cursor: "pointer",
              gap: isExpanded ? 4 : 1,
            }}
            onClick={() => setExpandedId(isExpanded ? null : ref.id)}
          >
            {/* Row 1: Thumbnail + name + badges + close */}
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <div
                className="sv2-inline-ref-thumb"
                style={{ background: ref.imageUrl ? `url(${ref.imageUrl}) center/cover` : "#F5F5F5" }}
              />
              <span style={{ fontSize: 10, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1, minWidth: 0 }}>
                {ref.name}
              </span>
              {!isExpanded && (
                <span style={{ fontSize: 8, color: isVibe ? "#C4603A" : "#AAA", whiteSpace: "nowrap" }}>
                  {isVibe ? "✨ Vibe" : `${WHAT_LABELS[what]} · ${MODE_LABELS[mode]}`}
                </span>
              )}
              <button
                className="sv2-inline-ref-x"
                onClick={(e) => { e.stopPropagation(); detachRef(ref.id); }}
              >
                &times;
              </button>
            </div>

            {/* Expanded controls */}
            {isExpanded && (
              <>
                {/* Mode + What dropdowns */}
                <div style={{ display: "flex", gap: 4 }} onClick={(e) => e.stopPropagation()}>
                  {!isVibe && (
                    <select
                      value={what}
                      onChange={(e) => setRefWhat(ref.id, e.target.value as RefWhat)}
                      style={{
                        fontSize: 9, padding: "2px 4px", border: "1px solid #EBEBEB",
                        borderRadius: 4, background: "#F9F9F9", color: "#666",
                        cursor: "pointer", fontFamily: "inherit", outline: "none",
                      }}
                    >
                      <option value="background">Background</option>
                      <option value="outfit">Outfit</option>
                      <option value="pose">Pose</option>
                      <option value="all">Everything</option>
                    </select>
                  )}
                  <select
                    value={mode}
                    onChange={(e) => setRefMode(ref.id, e.target.value as RefMode)}
                    style={{
                      fontSize: 9, padding: "2px 4px", border: "1px solid #EBEBEB",
                      borderRadius: 4,
                      background: isVibe ? "rgba(196,96,58,0.08)" : "#F9F9F9",
                      color: isVibe ? "#C4603A" : "#666",
                      cursor: "pointer", fontFamily: "inherit", outline: "none",
                    }}
                  >
                    <option value="exact">Exact</option>
                    <option value="similar">Similar</option>
                    <option value="vibe">✨ Vibe</option>
                  </select>
                </div>

                {/* Description input */}
                <input
                  value={description}
                  onChange={(e) => setRefDescription(ref.id, e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  placeholder={isVibe ? "describe the vibe..." : "e.g. but make it nighttime"}
                  style={{
                    fontSize: 9, padding: "3px 6px", border: "1px solid #EBEBEB",
                    borderRadius: 4, background: "#FAFAFA", color: "#555",
                    fontFamily: "inherit", outline: "none", width: "100%",
                  }}
                />
              </>
            )}
          </div>
        );
      })}
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
