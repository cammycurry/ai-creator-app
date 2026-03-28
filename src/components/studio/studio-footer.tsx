"use client";

import { useStudioStore } from "@/stores/studio-store";
import { useCreatorStore } from "@/stores/creator-store";
import { useUIStore } from "@/stores/ui-store";
import { generateCreatorImages, generateMoreLikeThis, generateCreatorImagesWithRef, finalizeCreator } from "@/server/actions/generate-actions";
import { generateSampleContent } from "@/server/actions/sample-content-actions";
import { getWorkspaceData } from "@/server/actions/workspace-actions";

export function StudioFooter() {
  const {
    phase,
    traits,
    description,
    isGenerating,
    error,
    selectedImageIndex,
    generatedImages,
    generatedKeys,
    creatorName,
    niche,
    referenceImages,
    referenceMode,
    refineMode,
    refineText,
    setPhase,
    setGeneratedImages,
    setIsGenerating,
    setError,
    setGenerationStep,
    setRefineMode,
    setRefineText,
  } = useStudioStore();
  const { setCreators, setActiveCreator, setCredits } = useCreatorStore();
  const { setCreatorStudioOpen } = useUIStore();

  async function handleGenerate() {
    const { referenceImages, description, traits } = useStudioStore.getState();
    setIsGenerating(true);
    setError(null);
    setPhase("generating");
    setGenerationStep("base");

    let result;
    if (referenceImages.length > 0) {
      result = await generateCreatorImagesWithRef(
        traits,
        description.trim() || undefined,
        referenceImages.map((r) => ({ slot: r.slot, base64: r.base64, mimeType: r.mimeType })),
        useStudioStore.getState().referenceMode,
        4
      );
    } else {
      result = await generateCreatorImages(
        traits,
        description.trim() || undefined,
        4
      );
    }

    if (result.success) {
      setGeneratedImages(result.images, result.keys);
    } else {
      setError(result.error);
      setPhase("customize");
      setIsGenerating(false);
    }
    setGenerationStep("idle");
  }

  async function handleConfirmPick() {
    if (selectedImageIndex === null) return;
    setPhase("finishing");
  }

  async function handleMoreLikeThis(refinement?: string) {
    if (selectedImageIndex === null) return;
    const refKey = generatedKeys[selectedImageIndex];
    if (!refKey) return;

    setIsGenerating(true);
    setError(null);
    setRefineMode(false);
    setPhase("generating");
    setGenerationStep("base");

    const result = await generateMoreLikeThis(traits, refKey, 4, refinement);

    if (result.success) {
      setGeneratedImages(result.images, result.keys);
    } else {
      setError(result.error);
      setPhase("picking");
      setIsGenerating(false);
    }
    setGenerationStep("idle");
  }

  async function handleCreate() {
    if (selectedImageIndex === null) return;
    const baseImageKey = generatedKeys[selectedImageIndex];
    if (!baseImageKey || !creatorName.trim()) return;

    setIsGenerating(true);
    setError(null);

    const result = await finalizeCreator({
      name: creatorName,
      niche,
      baseImageUrl: baseImageKey,
      traits,
    });

    if (result.success) {
      // Fire sample content generation in background (don't await)
      generateSampleContent(result.creatorId).catch(console.error);

      const data = await getWorkspaceData();
      setCreators(data.creators);
      setCredits(data.balance);
      setActiveCreator(result.creatorId);
      setCreatorStudioOpen(false);
      useStudioStore.getState().reset();
    } else {
      setError(result.error);
      setIsGenerating(false);
    }
  }

  if (phase === "generating") {
    return (
      <div className="studio-footer" style={{ justifyContent: "center" }}>
        <span className="studio-footer-hint">
          Generating your creator...
        </span>
      </div>
    );
  }

  if (phase === "picking") {
    return (
      <div className="studio-footer">
        <div className="studio-footer-actions">
          <button
            onClick={() => { setRefineMode(false); setPhase("customize"); }}
            disabled={isGenerating}
            className="studio-btn secondary"
          >
            Start Over
          </button>
          {!refineMode ? (
            <>
              <button
                onClick={() => handleMoreLikeThis()}
                disabled={isGenerating || selectedImageIndex === null}
                className="studio-btn secondary"
              >
                More Like This
              </button>
              <button
                onClick={() => setRefineMode(true)}
                disabled={isGenerating || selectedImageIndex === null}
                className="studio-btn secondary"
              >
                Refine
              </button>
            </>
          ) : (
            <button
              onClick={() => setRefineMode(false)}
              className="studio-btn secondary"
            >
              Cancel
            </button>
          )}
        </div>
        {error && <span style={{ fontSize: 12, color: "#e53e3e" }}>{error}</span>}
        <div className="studio-footer-actions">
          {refineMode ? (
            <button
              onClick={() => handleMoreLikeThis(refineText)}
              disabled={isGenerating || !refineText.trim()}
              className="studio-btn primary"
            >
              Apply Changes
            </button>
          ) : (
            <button
              onClick={handleConfirmPick}
              disabled={selectedImageIndex === null}
              className="studio-btn primary"
            >
              Use This Look
            </button>
          )}
        </div>
      </div>
    );
  }

  if (phase === "finishing") {
    return (
      <div className="studio-footer">
        <div className="studio-footer-actions">
          <button onClick={() => setPhase("picking")} className="studio-btn secondary">
            Back
          </button>
        </div>
        {error && <span style={{ fontSize: 12, color: "#e53e3e" }}>{error}</span>}
        <div className="studio-footer-actions">
          <button
            onClick={handleCreate}
            disabled={isGenerating || !creatorName.trim()}
            className="studio-btn accent"
          >
            {isGenerating ? "Creating..." : "Create"}
          </button>
        </div>
      </div>
    );
  }

  // Default: customize phase
  return (
    <div className="studio-footer">
      <div className="studio-footer-hint">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <path d="M12 16v-4" />
          <path d="M12 8h.01" />
        </svg>
        Leave any field blank — AI will surprise you
      </div>
      {error && <span style={{ fontSize: 12, color: "#e53e3e" }}>{error}</span>}
      <div className="studio-footer-actions">
        <button
          onClick={handleGenerate}
          disabled={isGenerating}
          className="studio-btn primary"
        >
          {isGenerating ? "Generating..." : "Generate"}
        </button>
      </div>
    </div>
  );
}
