"use client";

import { useState } from "react";
import { useUnifiedStudioStore } from "@/stores/unified-studio-store";
import { CAROUSEL_FORMATS } from "@/data/carousel-formats";
import { getScene } from "@/data/scenes";

export function ConfigCarousel() {
  const {
    selectedFormat,
    slides,
    slideCount,
    carouselInstructions,
    selectCarouselFormat,
    updateSlide,
    detachSlideRef,
    setSlideCount,
    setCarouselInstructions,
  } = useUnifiedStudioStore();

  const [editingSlide, setEditingSlide] = useState<number | null>(null);

  return (
    <div className="us-config-section">
      <div className="us-config-label">Format</div>
      <div className="us-format-chips">
        {CAROUSEL_FORMATS.map((fmt) => (
          <button
            key={fmt.id}
            className={`us-template-chip${selectedFormat?.id === fmt.id ? " active" : ""}`}
            onClick={() => selectCarouselFormat(fmt)}
            title={fmt.description}
          >
            {fmt.name}
          </button>
        ))}
      </div>

      {selectedFormat && (
        <>
          <div className="us-config-row" style={{ marginTop: 16 }}>
            <span className="us-config-row-label">Slides</span>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <button
                className="us-count-btn"
                onClick={() => setSlideCount(slideCount - 1)}
                disabled={slideCount <= selectedFormat.slideRange[0]}
              >
                −
              </button>
              <span style={{ minWidth: 20, textAlign: "center", fontSize: 14 }}>{slideCount}</span>
              <button
                className="us-count-btn"
                onClick={() => setSlideCount(slideCount + 1)}
                disabled={slideCount >= selectedFormat.slideRange[1]}
              >
                +
              </button>
            </div>
          </div>

          <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 6 }}>
            {slides.map((slide) => {
              const scene = getScene(slide.sceneHint);
              const isEditing = editingSlide === slide.position;
              return (
                <div key={slide.position} className="us-slide-row">
                  <div
                    className="us-slide-num"
                    style={slide.position === 1 ? { background: "var(--accent)", color: "#fff" } : undefined}
                  >
                    {slide.position}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span className="us-slide-scene">
                        {scene?.name ?? slide.sceneHint}
                      </span>
                      <span className="us-slide-mood">{slide.moodHint}</span>
                    </div>
                    {slide.references.length > 0 && (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 4 }}>
                        {slide.references.map((ref) => (
                          <span key={ref.id} className="us-slide-ref-tag">
                            {ref.name ?? ref.type}
                            <button
                              onClick={() => detachSlideRef(slide.position, ref.id)}
                              style={{ marginLeft: 4, background: "none", border: "none", cursor: "pointer", padding: 0, lineHeight: 1, color: "inherit", opacity: 0.6 }}
                              aria-label="Remove ref"
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                    {isEditing && (
                      <textarea
                        className="us-slide-description"
                        value={slide.description}
                        placeholder="Custom description for this slide…"
                        onChange={(e) => updateSlide(slide.position, { description: e.target.value })}
                        rows={2}
                        style={{ marginTop: 6, width: "100%", resize: "vertical", fontSize: 13 }}
                        autoFocus
                      />
                    )}
                  </div>
                  <button
                    className={`us-count-btn${isEditing ? " active" : ""}`}
                    onClick={() => setEditingSlide(isEditing ? null : slide.position)}
                    title={isEditing ? "Done editing" : "Edit slide description"}
                    style={{ flexShrink: 0 }}
                  >
                    {isEditing ? "Done" : "Edit"}
                  </button>
                </div>
              );
            })}
          </div>

          <div style={{ marginTop: 14 }}>
            <div className="us-config-label">Global Instructions</div>
            <textarea
              value={carouselInstructions}
              onChange={(e) => setCarouselInstructions(e.target.value)}
              placeholder="Any notes that apply to all slides…"
              rows={2}
              style={{ width: "100%", resize: "vertical", fontSize: 13, marginTop: 4 }}
            />
          </div>
        </>
      )}
    </div>
  );
}
