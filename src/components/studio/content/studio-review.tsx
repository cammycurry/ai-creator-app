"use client";

import { useContentStudioStore } from "@/stores/content-studio-store";
import { useCreatorStore } from "@/stores/creator-store";
import { useUIStore } from "@/stores/ui-store";
import { generateCarousel } from "@/server/actions/carousel-actions";
import { generateContent } from "@/server/actions/content-actions";
import { getWorkspaceData } from "@/server/actions/workspace-actions";
import { getScene } from "@/data/scenes";

export function StudioReview() {
  const {
    mode,
    selectedFormat,
    selectedTemplate,
    templateFields,
    slides,
    globalInstructions,
    freeformPrompt,
    imageCount,
    sourceContentId,
    generating,
    error,
    setGenerating,
    setError,
    setStep,
    reset,
  } = useContentStudioStore();
  const { addContentSet, addContent, setCredits } = useCreatorStore();
  const activeCreatorId = useCreatorStore((s) => s.activeCreatorId);
  const { setContentStudioOpen } = useUIStore();

  if (!activeCreatorId) return null;

  const isCarousel = mode === "carousel" && selectedFormat;
  const isSingle = mode === "single" || mode === "freeform";
  const creditCost = isSingle ? imageCount : slides.length;

  async function handleGenerate() {
    if (!activeCreatorId) return;
    setGenerating(true);
    setError(null);

    try {
      if (isCarousel && selectedFormat) {
        // Carousel generation
        const slideEdits: Record<number, string> = {};
        for (const slide of slides) {
          if (slide.description.trim()) {
            slideEdits[slide.position] = slide.description;
          }
        }

        const slideReferences: Record<number, string[]> = {};
        for (const slide of slides) {
          if (slide.references.length > 0) {
            slideReferences[slide.position] = slide.references.map((r) => r.id);
          }
        }

        const result = await generateCarousel(
          activeCreatorId,
          selectedFormat.id,
          slides.length,
          globalInstructions || undefined,
          sourceContentId ?? undefined,
          Object.keys(slideEdits).length > 0 ? slideEdits : undefined,
          Object.keys(slideReferences).length > 0 ? slideReferences : undefined
        );

        if (result.success) {
          addContentSet(result.contentSet);
          const data = await getWorkspaceData();
          setCredits(data.balance);
          reset();
          setContentStudioOpen(false);
        } else {
          setError(result.error);
        }
      } else {
        // Single photo / freeform generation
        let prompt = "";
        if (mode === "freeform") {
          prompt = freeformPrompt;
        } else if (selectedTemplate) {
          // Interpolate template fields into the scene prompt
          prompt = selectedTemplate.scenePrompt;
          for (const [key, value] of Object.entries(templateFields)) {
            prompt = prompt.replace(`{${key}}`, value);
          }
        } else {
          prompt = slides[0]?.description || slides[0]?.moodHint || globalInstructions || "";
        }

        const fullPrompt = globalInstructions && mode !== "freeform"
          ? `${prompt}. ${globalInstructions}`
          : prompt;

        const result = await generateContent(activeCreatorId, fullPrompt, imageCount);

        if (result.success) {
          addContent(result.content);
          const data = await getWorkspaceData();
          setCredits(data.balance);
          reset();
          setContentStudioOpen(false);
        } else {
          setError(result.error);
        }
      }
    } catch {
      setError("Generation failed. Please try again.");
    }
    setGenerating(false);
  }

  return (
    <div className="cs-review">
      <h2 className="cs-review-title">Review & Generate</h2>
      <p style={{ fontSize: 13, color: "var(--text-secondary, #888)", marginBottom: 16 }}>
        {isCarousel
          ? `${selectedFormat!.name} · ${slides.length} slides`
          : mode === "freeform"
            ? `Custom creation · ${imageCount} photo${imageCount !== 1 ? "s" : ""}`
            : `Single photo · ${imageCount} photo${imageCount !== 1 ? "s" : ""}`}
      </p>

      <div className="cs-review-slides">
        {isCarousel && slides.map((slide) => {
          const scene = getScene(slide.sceneHint);
          return (
            <div key={slide.position} className="cs-review-slide">
              <span className="cs-slide-num">{slide.position}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 500 }}>
                  {scene?.name ?? slide.sceneHint.replace(/-/g, " ")}
                </div>
                {slide.description && (
                  <div style={{ fontSize: 11, color: "var(--text-secondary, #888)", marginTop: 2 }}>
                    {slide.description}
                  </div>
                )}
              </div>
              {slide.references.length > 0 && (
                <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                  {slide.references.map((ref) => (
                    <span key={ref.id} className="cs-slide-ref-tag">{ref.name}</span>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {isSingle && (
          <div className="cs-review-slide">
            <span className="cs-slide-num">1</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 500 }}>
                {mode === "freeform" ? "Custom" : "Single Photo"}
              </div>
              <div style={{ fontSize: 11, color: "var(--text-secondary, #888)", marginTop: 2 }}>
                {mode === "freeform" ? freeformPrompt : (slides[0]?.description || slides[0]?.moodHint || "")}
              </div>
            </div>
            {slides[0]?.references.length > 0 && (
              <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                {slides[0].references.map((ref) => (
                  <span key={ref.id} className="cs-slide-ref-tag">{ref.name}</span>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {globalInstructions && (
        <div style={{ fontSize: 12, color: "var(--text-secondary, #888)", marginBottom: 16, padding: "8px 12px", background: "var(--card, #F5F5F5)", borderRadius: 8 }}>
          Instructions: {globalInstructions}
        </div>
      )}

      {error && (
        <div style={{ padding: "8px 0", color: "#e53e3e", fontSize: 13 }}>{error}</div>
      )}

      <div className="cs-review-cost">
        <div className="cs-review-total">{creditCost} credit{creditCost !== 1 ? "s" : ""}</div>
        <div className="cs-review-label">
          {isSingle
            ? `${imageCount} photo${imageCount !== 1 ? "s" : ""} × 1 credit`
            : `${slides.length} slides × 1 credit each`}
        </div>
      </div>

      <div className="cs-footer" style={{ border: "none", padding: "16px 0" }}>
        <button className="studio-btn secondary" onClick={() => setStep("builder")}>
          ← Back
        </button>
        <button
          className="studio-btn primary"
          onClick={handleGenerate}
          disabled={generating}
          style={{ minWidth: 180 }}
        >
          {generating ? "Generating..." : `Generate ${creditCost} ${isSingle ? "Photo" : "Slide"}${creditCost !== 1 ? "s" : ""}`}
        </button>
      </div>
    </div>
  );
}
