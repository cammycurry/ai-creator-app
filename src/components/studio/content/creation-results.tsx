"use client";

import { useState } from "react";
import { useUnifiedStudioStore } from "@/stores/unified-studio-store";
import { useUIStore } from "@/stores/ui-store";
import { VideoPlayer } from "@/components/workspace/video-player";
import { AddReferenceDialog } from "@/components/workspace/add-reference-dialog";

export function CreationResults() {
  const { contentType, results, resultContentSet, reset, setShowResults } = useUnifiedStudioStore();
  const { setContentStudioOpen } = useUIStore();
  const [saveRefOpen, setSaveRefOpen] = useState(false);

  function handleUse() {
    reset();
    setContentStudioOpen(false);
  }

  function handleTryDifferent() {
    setShowResults(false);
  }

  const firstResult = results[0];
  const firstImageBase64 = firstResult?.url?.startsWith("data:image")
    ? firstResult.url.split(",")[1]
    : undefined;

  const isVideo = contentType === "video" || contentType === "talking-head";
  const isCarousel = contentType === "carousel";

  return (
    <div className="sv2-results">
      {isVideo && firstResult?.url && (
        <div className="sv2-result-video">
          <VideoPlayer src={firstResult.url} poster={firstResult.thumbnailUrl} />
        </div>
      )}

      {isCarousel && resultContentSet && (
        <div className="sv2-result-slides-row">
          {resultContentSet.slides.map((slide, i) => (
            <div key={slide.id} className="sv2-result-slide-thumb">
              {slide.url && (
                <img src={slide.url} alt={`Slide ${i + 1}`} />
              )}
              <span className="sv2-result-slide-num">{i + 1}</span>
            </div>
          ))}
          {resultContentSet.caption && (
            <p className="sv2-result-caption">{resultContentSet.caption}</p>
          )}
        </div>
      )}

      {!isVideo && !isCarousel && (
        <div className="sv2-results-grid">
          {results.map((item) => (
            <div key={item.id} className="sv2-result-card">
              {item.url && (
                <img src={item.url} alt="Generated" />
              )}
            </div>
          ))}
        </div>
      )}

      <div className="sv2-result-actions">
        <button className="studio-btn primary" onClick={handleUse}>
          Use
        </button>
        <button className="studio-btn secondary" onClick={handleTryDifferent}>
          Try Different
        </button>
        {!isVideo && !isCarousel && firstImageBase64 && (
          <button className="studio-btn secondary" onClick={() => setSaveRefOpen(true)}>
            Save as Reference
          </button>
        )}
      </div>

      <AddReferenceDialog
        open={saveRefOpen}
        onOpenChange={setSaveRefOpen}
        prefillImageBase64={firstImageBase64}
      />
    </div>
  );
}
