"use client";

import { useEffect } from "react";
import { useContentStudioStore } from "@/stores/content-studio-store";
import { useCreatorStore } from "@/stores/creator-store";
import { ReferencePanel } from "./reference-panel";
import { SlideRow } from "./slide-row";

export function StudioBuilder() {
  const {
    mode,
    selectedFormat,
    slides,
    slideCount,
    globalInstructions,
    freeformPrompt,
    imageCount,
    setSlideCount,
    setGlobalInstructions,
    setFreeformPrompt,
    setImageCount,
    setStep,
    updateSlide,
    autoMatchReferences,
  } = useContentStudioStore();

  const { references } = useCreatorStore();

  useEffect(() => {
    if (references.length > 0 && slides.length > 0) {
      autoMatchReferences(references);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isCarousel = mode === "carousel" && selectedFormat;
  const isSingle = mode === "single" || mode === "freeform";
  const creditCost = isSingle ? imageCount : slides.length;

  const headerTitle = isCarousel
    ? selectedFormat!.name
    : mode === "freeform"
      ? "Custom Creation"
      : slides[0]?.moodHint ? "Single Photo" : "Custom Photo";

  return (
    <div className="cs-builder">
      {/* Left panel: references */}
      <ReferencePanel />

      {/* Right panel */}
      <div className="cs-slides-panel">
        <div className="cs-slides-header">
          <div>
            <div className="cs-format-name">{headerTitle}</div>
            <div className="cs-format-meta">
              {creditCost} {isSingle ? "photo" : "slide"}{creditCost !== 1 ? "s" : ""} · {creditCost} credit{creditCost !== 1 ? "s" : ""}
            </div>
          </div>
          {isCarousel && (
            <div className="cs-slide-count">
              <button
                className="cs-count-btn"
                onClick={() => setSlideCount(slideCount - 1)}
                disabled={slideCount <= selectedFormat!.slideRange[0]}
              >
                −
              </button>
              <span style={{ fontSize: 13, fontWeight: 600, minWidth: 20, textAlign: "center" }}>
                {slideCount}
              </span>
              <button
                className="cs-count-btn"
                onClick={() => setSlideCount(slideCount + 1)}
                disabled={slideCount >= selectedFormat!.slideRange[1]}
              >
                +
              </button>
            </div>
          )}
          {isSingle && (
            <div className="cs-slide-count">
              <span style={{ fontSize: 11, color: "var(--text-secondary, #888)", marginRight: 6 }}>Photos:</span>
              <button
                className="cs-count-btn"
                onClick={() => setImageCount(imageCount - 1)}
                disabled={imageCount <= 1}
              >
                −
              </button>
              <span style={{ fontSize: 13, fontWeight: 600, minWidth: 20, textAlign: "center" }}>
                {imageCount}
              </span>
              <button
                className="cs-count-btn"
                onClick={() => setImageCount(imageCount + 1)}
                disabled={imageCount >= 4}
              >
                +
              </button>
            </div>
          )}
        </div>

        <div className="cs-slides-list">
          {/* Freeform: single big textarea */}
          {mode === "freeform" && (
            <div className="cs-slide" style={{ flexDirection: "column", gap: 8 }}>
              <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text-primary, #111)" }}>
                Describe what you want to create
              </div>
              <textarea
                className="cs-slide-edit"
                value={freeformPrompt}
                onChange={(e) => {
                  setFreeformPrompt(e.target.value);
                  updateSlide(1, { description: e.target.value });
                }}
                placeholder="Gym mirror selfie in my bathroom, wearing black sports set, morning light..."
                rows={4}
                autoFocus
                style={{ fontSize: 16, marginTop: 0 }}
              />
              {slides[0]?.references.length > 0 && (
                <div className="cs-slide-refs">
                  {slides[0].references.map((ref) => (
                    <span key={ref.id} className="cs-slide-ref-tag">
                      {ref.name}
                      <button
                        className="cs-slide-ref-remove"
                        onClick={() => useContentStudioStore.getState().detachRef(1, ref.id)}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
              <div style={{ fontSize: 11, color: "var(--text-muted, #BBB)" }}>
                Attach references from the left panel to guide the generation.
              </div>
            </div>
          )}

          {/* Single template: show the template info + editable description */}
          {mode === "single" && slides.map((slide) => (
            <SlideRow key={slide.position} slide={slide} />
          ))}

          {/* Carousel: show all slide rows */}
          {mode === "carousel" && slides.map((slide) => (
            <SlideRow key={slide.position} slide={slide} />
          ))}
        </div>

        {/* Global instructions (carousel + single only, freeform uses the main textarea) */}
        {mode !== "freeform" && (
          <div className="cs-global-instructions">
            <textarea
              className="cs-instructions-input"
              placeholder='Add instructions... "wearing red", "outdoor lighting", "more smiles"'
              value={globalInstructions}
              onChange={(e) => setGlobalInstructions(e.target.value)}
              rows={2}
              style={{ fontSize: 16 }}
            />
          </div>
        )}

        {/* Footer */}
        <div className="cs-footer">
          <div className="cs-footer-left">
            <button className="studio-btn secondary" onClick={() => setStep("library")}>
              ← Library
            </button>
          </div>
          <div className="cs-footer-right">
            <div style={{ textAlign: "right", marginRight: 8 }}>
              <div className="cs-credit-cost">{creditCost} credit{creditCost !== 1 ? "s" : ""}</div>
              <div className="cs-credit-label">
                {isSingle
                  ? `${imageCount} photo${imageCount !== 1 ? "s" : ""} × 1 credit`
                  : `${slides.length} slides × 1 credit`}
              </div>
            </div>
            <button
              className="studio-btn primary"
              onClick={() => setStep("review")}
              disabled={mode === "freeform" && !freeformPrompt.trim()}
            >
              {isSingle ? "Generate →" : "Review & Generate →"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
