"use client";

import { useState } from "react";
import { useStudioStore } from "@/stores/studio-store";

function GeneratingPreview() {
  return (
    <div className="studio-generating">
      <div className="studio-gen-grid">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="studio-gen-card">
            <div className="studio-shimmer" />
          </div>
        ))}
      </div>
      <div className="studio-gen-status">
        <div className="studio-gen-spinner" />
        <span className="studio-gen-step">Creating your look...</span>
        <span className="studio-gen-time">Usually takes 20-30 seconds</span>
      </div>
    </div>
  );
}

function ImageLightbox({ src, index, onClose }: { src: string; index: number; onClose: () => void }) {
  const { selectImage, setPhase } = useStudioStore();

  return (
    <div className="studio-lightbox" onClick={onClose}>
      <button className="studio-lightbox-close" onClick={onClose}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 6L6 18M6 6l12 12" />
        </svg>
      </button>
      <div className="studio-lightbox-inner" onClick={(e) => e.stopPropagation()}>
        <img src={src} alt="Zoomed preview" />
        <button
          className="studio-lightbox-select"
          onClick={() => { selectImage(index); setPhase("finishing"); onClose(); }}
        >
          Use This Look
        </button>
      </div>
    </div>
  );
}

const REFINE_CHIPS = [
  "Darker hair",
  "Lighter hair",
  "Darker skin",
  "Lighter skin",
  "Fuller lips",
  "More cleavage",
  "Bigger smile",
  "More serious",
];

function RefinePanel() {
  const { refineText, setRefineText } = useStudioStore();

  return (
    <div className="studio-refine">
      <div className="studio-refine-chips">
        {REFINE_CHIPS.map((chip) => (
          <button
            key={chip}
            className={`studio-refine-chip${refineText.toLowerCase().includes(chip.toLowerCase()) ? " active" : ""}`}
            onClick={() => {
              if (refineText.toLowerCase().includes(chip.toLowerCase())) {
                setRefineText(refineText.replace(new RegExp(chip, "i"), "").replace(/,\s*,/g, ",").replace(/^,\s*|,\s*$/g, "").trim());
              } else {
                setRefineText(refineText ? `${refineText}, ${chip.toLowerCase()}` : chip.toLowerCase());
              }
            }}
          >
            {chip}
          </button>
        ))}
      </div>
      <input
        className="studio-refine-input"
        placeholder="Describe what to change..."
        value={refineText}
        onChange={(e) => setRefineText(e.target.value)}
      />
    </div>
  );
}

function PickingPreview() {
  const { generatedImages, selectedImageIndex, selectImage, refineMode } = useStudioStore();
  const [zoomedIndex, setZoomedIndex] = useState<number | null>(null);

  return (
    <>
      <div className="studio-gen-grid">
        {(generatedImages.length > 0 ? generatedImages : ["", "", "", ""]).map((img, i) => (
          <div
            key={i}
            onClick={() => img && setZoomedIndex(i)}
            className={`studio-gen-card${selectedImageIndex === i ? " selected" : ""}`}
          >
            {img ? (
              <img src={img} alt={`Generated option ${i + 1}`} />
            ) : (
              <div className="studio-shimmer" />
            )}
            <div className="studio-gen-check">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <path d="M20 6L9 17l-5-5" />
              </svg>
            </div>
          </div>
        ))}
      </div>
      {refineMode && selectedImageIndex !== null && <RefinePanel />}
      {zoomedIndex !== null && generatedImages[zoomedIndex] && (
        <ImageLightbox
          src={generatedImages[zoomedIndex]}
          index={zoomedIndex}
          onClose={() => setZoomedIndex(null)}
        />
      )}
    </>
  );
}

function FinishingPreview() {
  const { generatedImages, selectedImageIndex } = useStudioStore();

  const finalImage =
    selectedImageIndex !== null ? generatedImages[selectedImageIndex] : null;

  return (
    <div className="studio-finish-img">
      {finalImage ? (
        <img src={finalImage} alt="Your creator" />
      ) : (
        <div className="studio-shimmer" />
      )}
    </div>
  );
}

export function StudioPreview() {
  const { phase } = useStudioStore();

  return (
    <div className="studio-preview">
      <div className="studio-preview-bg" />
      <div className="studio-preview-content">
        {phase === "generating" && <GeneratingPreview />}
        {phase === "picking" && <PickingPreview />}
        {phase === "finishing" && <FinishingPreview />}
      </div>
    </div>
  );
}
