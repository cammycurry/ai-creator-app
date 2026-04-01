"use client";

import { useState } from "react";
import { useUnifiedStudioStore } from "@/stores/unified-studio-store";
import { useUIStore } from "@/stores/ui-store";
import { VideoPlayer } from "@/components/workspace/video-player";
import { AddReferenceDialog } from "@/components/workspace/add-reference-dialog";

export function StudioResults() {
  const { contentType, results, resultContentSet, setShowResults, reset } =
    useUnifiedStudioStore();
  const { setContentStudioOpen } = useUIStore();
  const [addRefOpen, setAddRefOpen] = useState(false);

  function handleUse() {
    reset();
    setContentStudioOpen(false);
  }

  function handleTryDifferent() {
    setShowResults(false);
  }

  const firstResult = results[0];
  const firstImageBase64 = firstResult?.url?.startsWith("data:")
    ? firstResult.url.split(",")[1]
    : undefined;

  return (
    <div className="us-results">
      {contentType === "photo" && (
        <>
          <div className="us-results-grid" data-count={results.length}>
            {results.map((item) => (
              <div key={item.id} className="us-result-card">
                {item.url && (
                  <img
                    src={item.url}
                    alt=""
                    style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                  />
                )}
              </div>
            ))}
          </div>
          <div className="us-result-actions">
            <button className="studio-btn primary" onClick={handleUse}>
              Use
            </button>
            <button className="studio-btn secondary" onClick={handleTryDifferent}>
              Try Different
            </button>
            {firstImageBase64 && (
              <button className="studio-btn secondary" onClick={() => setAddRefOpen(true)}>
                Save as Reference
              </button>
            )}
          </div>
          <AddReferenceDialog
            open={addRefOpen}
            onOpenChange={setAddRefOpen}
            prefillImageBase64={firstImageBase64}
          />
        </>
      )}

      {contentType === "carousel" && resultContentSet && (
        <>
          <div className="us-results-grid" style={{ display: "flex", gap: 8, overflowX: "auto" }}>
            {resultContentSet.slides.map((slide) => (
              <div key={slide.id} className="us-result-card" style={{ flex: "0 0 auto", width: 120, height: 200 }}>
                {slide.url && (
                  <img
                    src={slide.url}
                    alt=""
                    style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                  />
                )}
              </div>
            ))}
          </div>
          {resultContentSet.caption && (
            <div style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 8 }}>
              {resultContentSet.caption}
            </div>
          )}
          <div className="us-result-actions">
            <button className="studio-btn primary" onClick={handleUse}>
              Use
            </button>
            <button className="studio-btn secondary" onClick={handleTryDifferent}>
              Try Different
            </button>
          </div>
        </>
      )}

      {(contentType === "video" || contentType === "talking-head") && firstResult?.url && (
        <>
          <div className="us-result-card" style={{ width: "100%", maxWidth: 360, margin: "0 auto", aspectRatio: "9/16" }}>
            <VideoPlayer src={firstResult.url} poster={firstResult.thumbnailUrl} />
          </div>
          <div className="us-result-actions">
            <button className="studio-btn primary" onClick={handleUse}>
              Use
            </button>
            <button className="studio-btn secondary" onClick={handleTryDifferent}>
              Try Different
            </button>
          </div>
        </>
      )}
    </div>
  );
}
