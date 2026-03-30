"use client";

import { useContentStudioStore } from "@/stores/content-studio-store";
import { ReferencePanel } from "./reference-panel";
import { SlideRow } from "./slide-row";

export function StudioBuilder() {
  const {
    selectedFormat,
    slides,
    slideCount,
    globalInstructions,
    setSlideCount,
    setGlobalInstructions,
    setStep,
  } = useContentStudioStore();

  if (!selectedFormat) return null;

  const creditCost = slides.length;

  return (
    <div className="cs-builder">
      {/* Left panel: references */}
      <ReferencePanel />

      {/* Right panel: slides */}
      <div className="cs-slides-panel">
        <div className="cs-slides-header">
          <div>
            <div className="cs-format-name">{selectedFormat.name}</div>
            <div className="cs-format-meta">
              {creditCost} slide{creditCost !== 1 ? "s" : ""} · {creditCost} credit{creditCost !== 1 ? "s" : ""}
            </div>
          </div>
          <div className="cs-slide-count">
            <button
              className="cs-count-btn"
              onClick={() => setSlideCount(slideCount - 1)}
              disabled={slideCount <= selectedFormat.slideRange[0]}
            >
              −
            </button>
            <span style={{ fontSize: 13, fontWeight: 600, minWidth: 20, textAlign: "center" }}>
              {slideCount}
            </span>
            <button
              className="cs-count-btn"
              onClick={() => setSlideCount(slideCount + 1)}
              disabled={slideCount >= selectedFormat.slideRange[1]}
            >
              +
            </button>
          </div>
        </div>

        <div className="cs-slides-list">
          {slides.map((slide) => (
            <SlideRow key={slide.position} slide={slide} />
          ))}
        </div>

        {/* Global instructions */}
        <div className="cs-global-instructions">
          <textarea
            className="cs-instructions-input"
            placeholder='Add instructions for all slides... "wearing red", "outdoor lighting", "more smiles"'
            value={globalInstructions}
            onChange={(e) => setGlobalInstructions(e.target.value)}
            rows={2}
            style={{ fontSize: 16 }}
          />
        </div>

        {/* Footer */}
        <div className="cs-footer">
          <div className="cs-footer-left">
            <button className="studio-btn secondary" onClick={() => setStep("library")}>
              ← Library
            </button>
          </div>
          <div className="cs-footer-right">
            <div style={{ textAlign: "right", marginRight: 8 }}>
              <div className="cs-credit-cost">{creditCost} credits</div>
              <div className="cs-credit-label">{creditCost} slides × 1 credit</div>
            </div>
            <button className="studio-btn primary" onClick={() => setStep("review")}>
              Review & Generate →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
