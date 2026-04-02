"use client";

import { useState } from "react";
import { useUnifiedStudioStore } from "@/stores/unified-studio-store";
import { CAROUSEL_FORMATS } from "@/data/carousel-formats";
import { getScene } from "@/data/scenes";

export function CreationCarousel() {
  const {
    selectedFormat,
    selectCarouselFormat,
    slides,
    slideCount,
    setSlideCount,
    updateSlide,
    detachSlideRef,
    carouselInstructions,
    setCarouselInstructions,
  } = useUnifiedStudioStore();

  const [editingSlide, setEditingSlide] = useState<number | null>(null);

  return (
    <div className="sv2-config sv2-config-carousel">
      <div className="sv2-tpl-chips">
        {CAROUSEL_FORMATS.map((fmt) => (
          <button
            key={fmt.id}
            className={`sv2-tpl-chip${selectedFormat?.id === fmt.id ? " on" : ""}`}
            onClick={() => selectCarouselFormat(fmt)}
            title={fmt.description}
          >
            {fmt.name}
          </button>
        ))}
      </div>

      {selectedFormat && (
        <>
          <div className="sv2-slides-header">
            <span className="sv2-config-label">{slideCount} slides</span>
            <div className="sv2-slide-count-controls">
              <button
                className="sv2-cfg-btn"
                onClick={() => setSlideCount(slideCount - 1)}
                disabled={slideCount <= selectedFormat.slideRange[0]}
              >
                −
              </button>
              <button
                className="sv2-cfg-btn"
                onClick={() => setSlideCount(slideCount + 1)}
                disabled={slideCount >= selectedFormat.slideRange[1]}
              >
                +
              </button>
            </div>
          </div>

          <div className="sv2-slides">
            {slides.map((slide, i) => {
              const scene = getScene(slide.sceneHint);
              const isEditing = editingSlide === slide.position;
              return (
                <div key={slide.position} className="sv2-slide">
                  <span className={`sv2-slide-num${i === 0 ? " accent" : ""}`}>
                    {slide.position}
                  </span>
                  <div className="sv2-slide-info">
                    <span className="sv2-slide-scene">
                      {scene?.name ?? slide.sceneHint}
                    </span>
                    <span className="sv2-slide-mood">{slide.moodHint}</span>
                    {slide.references.length > 0 && (
                      <div className="sv2-slide-refs">
                        {slide.references.map((ref) => (
                          <span key={ref.id} className="sv2-slide-ref">
                            {ref.name}
                            <button
                              className="sv2-slide-ref-x"
                              onClick={() => detachSlideRef(slide.position, ref.id)}
                            >
                              &times;
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                    {isEditing ? (
                      <textarea
                        className="sv2-slide-edit"
                        autoFocus
                        value={slide.description}
                        onChange={(e) =>
                          updateSlide(slide.position, { description: e.target.value })
                        }
                        onBlur={() => setEditingSlide(null)}
                        placeholder="Override this slide's instructions..."
                        rows={2}
                      />
                    ) : (
                      <button
                        className="sv2-slide-edit-btn"
                        onClick={() => setEditingSlide(slide.position)}
                      >
                        {slide.description || "Add custom instructions…"}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="sv2-config-row">
            <textarea
              className="sv2-textarea sv2-instructions"
              placeholder="Global instructions for all slides (optional)…"
              value={carouselInstructions}
              onChange={(e) => setCarouselInstructions(e.target.value)}
              rows={2}
            />
          </div>
        </>
      )}
    </div>
  );
}
