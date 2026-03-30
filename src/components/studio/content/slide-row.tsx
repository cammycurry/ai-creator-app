"use client";

import { useState } from "react";
import { useContentStudioStore, type SlideConfig } from "@/stores/content-studio-store";
import { getScene } from "@/data/scenes";
import { REFERENCE_TYPE_LABELS } from "@/types/reference";

export function SlideRow({ slide }: { slide: SlideConfig }) {
  const { updateSlide, detachRef } = useContentStudioStore();
  const [editing, setEditing] = useState(false);
  const scene = getScene(slide.sceneHint);
  const displayName = scene?.name ?? slide.sceneHint.replace(/-/g, " ");
  const displayDesc = slide.description || slide.moodHint;

  return (
    <div className="cs-slide">
      <span className="cs-slide-num">{slide.position}</span>
      <div className="cs-slide-body">
        <div className="cs-slide-scene">{displayName}</div>
        {editing ? (
          <textarea
            className="cs-slide-edit"
            defaultValue={slide.description || `${displayName} — ${slide.moodHint}`}
            rows={2}
            autoFocus
            style={{ fontSize: 16 }}
            onBlur={(e) => {
              updateSlide(slide.position, { description: e.target.value });
              setEditing(false);
            }}
          />
        ) : (
          <div className="cs-slide-mood">{displayDesc}</div>
        )}
        {slide.references.length > 0 && (
          <div className="cs-slide-refs">
            {slide.references.map((ref) => (
              <span key={ref.id} className="cs-slide-ref-tag">
                {ref.name}
                <span style={{ color: "var(--text-muted, #BBB)", fontSize: 9, marginLeft: 2 }}>
                  {REFERENCE_TYPE_LABELS[ref.type]}
                </span>
                {slide.autoMatched && <span className="auto">(auto)</span>}
                <button
                  className="cs-slide-ref-remove"
                  onClick={() => detachRef(slide.position, ref.id)}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
      </div>
      <div className="cs-slide-actions">
        <button className="cs-slide-action" onClick={() => setEditing(!editing)}>
          {editing ? "Done" : "Edit"}
        </button>
      </div>
    </div>
  );
}
