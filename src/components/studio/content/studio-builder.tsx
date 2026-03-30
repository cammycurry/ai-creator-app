"use client";

import { useEffect } from "react";
import { useContentStudioStore } from "@/stores/content-studio-store";
import { useCreatorStore } from "@/stores/creator-store";
import { ReferencePanel } from "./reference-panel";
import { SlideRow } from "./slide-row";

// ─── Carousel Builder ─────
function CarouselBuilder() {
  const {
    selectedFormat,
    slides,
    slideCount,
    globalInstructions,
    setSlideCount,
    setGlobalInstructions,
    setStep,
    autoMatchReferences,
  } = useContentStudioStore();
  const { references } = useCreatorStore();

  useEffect(() => {
    if (references.length > 0 && slides.length > 0) {
      autoMatchReferences(references);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!selectedFormat) return null;

  return (
    <>
      <div className="cs-slides-header">
        <div>
          <div className="cs-format-name">{selectedFormat.name}</div>
          <div className="cs-format-meta">
            {slides.length} slide{slides.length !== 1 ? "s" : ""} · {slides.length} credit{slides.length !== 1 ? "s" : ""}
          </div>
        </div>
        <div className="cs-slide-count">
          <button className="cs-count-btn" onClick={() => setSlideCount(slideCount - 1)} disabled={slideCount <= selectedFormat.slideRange[0]}>−</button>
          <span style={{ fontSize: 13, fontWeight: 600, minWidth: 20, textAlign: "center" }}>{slideCount}</span>
          <button className="cs-count-btn" onClick={() => setSlideCount(slideCount + 1)} disabled={slideCount >= selectedFormat.slideRange[1]}>+</button>
        </div>
      </div>

      <div className="cs-slides-list">
        {slides.map((slide) => (
          <SlideRow key={slide.position} slide={slide} />
        ))}
      </div>

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

      <div className="cs-footer">
        <button className="studio-btn secondary" onClick={() => setStep("library")}>← Library</button>
        <div className="cs-footer-right">
          <div style={{ textAlign: "right", marginRight: 8 }}>
            <div className="cs-credit-cost">{slides.length} credits</div>
          </div>
          <button className="studio-btn primary" onClick={() => setStep("review")}>Review & Generate →</button>
        </div>
      </div>
    </>
  );
}

// ─── Single Photo Template Builder ─────
function SinglePhotoBuilder() {
  const {
    selectedTemplate,
    templateFields,
    slides,
    imageCount,
    globalInstructions,
    setTemplateField,
    setImageCount,
    setGlobalInstructions,
    setStep,
  } = useContentStudioStore();

  if (!selectedTemplate) return null;

  return (
    <>
      <div className="cs-slides-header">
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 24 }}>{selectedTemplate.icon}</span>
          <div>
            <div className="cs-format-name">{selectedTemplate.name}</div>
            <div className="cs-format-meta">{selectedTemplate.description}</div>
          </div>
        </div>
      </div>

      <div className="cs-slides-list">
        {/* Customizable fields from template */}
        {selectedTemplate.customizableFields.length > 0 && (
          <div className="cs-slide" style={{ flexDirection: "column", gap: 12, padding: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary, #888)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              Customize
            </div>
            {selectedTemplate.customizableFields.map((field) => (
              <div key={field.key} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <label style={{ fontSize: 12, fontWeight: 500, color: "var(--text-primary, #111)" }}>
                  {field.label}
                </label>
                {field.type === "select" && field.options ? (
                  <select
                    value={templateFields[field.key] ?? ""}
                    onChange={(e) => setTemplateField(field.key, e.target.value)}
                    style={{
                      padding: "8px 10px",
                      borderRadius: 8,
                      border: "1px solid var(--border, #EBEBEB)",
                      fontSize: 14,
                      fontFamily: "inherit",
                      color: "var(--text-primary, #111)",
                      background: "var(--surface, #fff)",
                    }}
                  >
                    {field.options.map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={templateFields[field.key] ?? ""}
                    onChange={(e) => setTemplateField(field.key, e.target.value)}
                    placeholder={field.default}
                    style={{
                      padding: "8px 10px",
                      borderRadius: 8,
                      border: "1px solid var(--border, #EBEBEB)",
                      fontSize: 16,
                      fontFamily: "inherit",
                      color: "var(--text-primary, #111)",
                      background: "var(--surface, #fff)",
                    }}
                  />
                )}
              </div>
            ))}
          </div>
        )}

        {/* Reference attachment display */}
        {slides[0]?.references.length > 0 && (
          <div className="cs-slide" style={{ padding: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary, #888)", marginBottom: 6 }}>
              Attached References
            </div>
            <div className="cs-slide-refs">
              {slides[0].references.map((ref) => (
                <span key={ref.id} className="cs-slide-ref-tag">
                  {ref.name}
                  <button className="cs-slide-ref-remove" onClick={() => useContentStudioStore.getState().detachRef(1, ref.id)}>×</button>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Additional instructions */}
        <div style={{ padding: "0 0 12px" }}>
          <textarea
            className="cs-instructions-input"
            placeholder='Additional instructions... "outdoor setting", "golden hour", "looking away from camera"'
            value={globalInstructions}
            onChange={(e) => setGlobalInstructions(e.target.value)}
            rows={2}
            style={{ fontSize: 16 }}
          />
        </div>
      </div>

      <div className="cs-footer">
        <button className="studio-btn secondary" onClick={() => setStep("library")}>← Library</button>
        <div className="cs-footer-right">
          <div className="cs-slide-count" style={{ marginRight: 12 }}>
            <span style={{ fontSize: 11, color: "var(--text-secondary)", marginRight: 6 }}>Photos:</span>
            <button className="cs-count-btn" onClick={() => setImageCount(imageCount - 1)} disabled={imageCount <= 1}>−</button>
            <span style={{ fontSize: 13, fontWeight: 600, minWidth: 20, textAlign: "center" }}>{imageCount}</span>
            <button className="cs-count-btn" onClick={() => setImageCount(imageCount + 1)} disabled={imageCount >= 4}>+</button>
          </div>
          <button className="studio-btn primary" onClick={() => setStep("review")}>
            Generate {imageCount} Photo{imageCount !== 1 ? "s" : ""} →
          </button>
        </div>
      </div>
    </>
  );
}

// ─── Freeform Builder ─────
function FreeformBuilder() {
  const {
    slides,
    freeformPrompt,
    imageCount,
    setFreeformPrompt,
    setImageCount,
    updateSlide,
    setStep,
  } = useContentStudioStore();

  return (
    <>
      <div className="cs-slides-header">
        <div>
          <div className="cs-format-name">Create Anything</div>
          <div className="cs-format-meta">Describe what you want and attach references to guide the AI</div>
        </div>
      </div>

      <div className="cs-slides-list">
        <div className="cs-slide" style={{ flexDirection: "column", gap: 8, padding: 16 }}>
          <textarea
            className="cs-slide-edit"
            value={freeformPrompt}
            onChange={(e) => {
              setFreeformPrompt(e.target.value);
              updateSlide(1, { description: e.target.value });
            }}
            placeholder="Describe your photo in detail...&#10;&#10;Examples:&#10;• Gym mirror selfie in my bathroom, wearing black sports set, morning light&#10;• Coffee shop window seat, casual oversized sweater, reading a book&#10;• Beach sunset walking shot, white sundress, golden hour"
            rows={6}
            autoFocus
            style={{ fontSize: 16, marginTop: 0, lineHeight: 1.5 }}
          />
        </div>

        {/* Attached references */}
        {slides[0]?.references.length > 0 && (
          <div className="cs-slide" style={{ padding: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary, #888)", marginBottom: 6 }}>
              Attached References
            </div>
            <div className="cs-slide-refs">
              {slides[0].references.map((ref) => (
                <span key={ref.id} className="cs-slide-ref-tag">
                  {ref.name}
                  <button className="cs-slide-ref-remove" onClick={() => useContentStudioStore.getState().detachRef(1, ref.id)}>×</button>
                </span>
              ))}
            </div>
          </div>
        )}

        <div style={{ padding: "8px 0", fontSize: 12, color: "var(--text-muted, #BBB)" }}>
          Attach backgrounds, products, or outfits from the panel on the left to keep content consistent.
        </div>
      </div>

      <div className="cs-footer">
        <button className="studio-btn secondary" onClick={() => setStep("library")}>← Library</button>
        <div className="cs-footer-right">
          <div className="cs-slide-count" style={{ marginRight: 12 }}>
            <span style={{ fontSize: 11, color: "var(--text-secondary)", marginRight: 6 }}>Photos:</span>
            <button className="cs-count-btn" onClick={() => setImageCount(imageCount - 1)} disabled={imageCount <= 1}>−</button>
            <span style={{ fontSize: 13, fontWeight: 600, minWidth: 20, textAlign: "center" }}>{imageCount}</span>
            <button className="cs-count-btn" onClick={() => setImageCount(imageCount + 1)} disabled={imageCount >= 4}>+</button>
          </div>
          <button
            className="studio-btn primary"
            onClick={() => setStep("review")}
            disabled={!freeformPrompt.trim()}
          >
            Generate {imageCount} Photo{imageCount !== 1 ? "s" : ""} →
          </button>
        </div>
      </div>
    </>
  );
}

// ─── Main Builder (routes to the right sub-builder) ─────
export function StudioBuilder() {
  const { mode } = useContentStudioStore();

  return (
    <div className="cs-builder">
      <ReferencePanel />
      <div className="cs-slides-panel">
        {mode === "carousel" && <CarouselBuilder />}
        {mode === "single" && <SinglePhotoBuilder />}
        {mode === "freeform" && <FreeformBuilder />}
      </div>
    </div>
  );
}
