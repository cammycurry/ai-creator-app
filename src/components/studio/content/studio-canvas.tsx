"use client";

import { useState } from "react";
import { useUnifiedStudioStore } from "@/stores/unified-studio-store";
import { CanvasActions } from "./canvas-actions";

export function StudioCanvas() {
  const { selectedItem, hideCanvas, showResults, results, resultContentSet, contentType } = useUnifiedStudioStore();
  const [activeSlide, setActiveSlide] = useState(0);

  // Generation results mode
  if (showResults) {
    return (
      <div className="sv3-canvas">
        <button className="sv3-canvas-close" onClick={hideCanvas}>&times;</button>

        {/* Photo results */}
        {contentType === "photo" && results.length > 0 && (
          <div className="sv3-canvas-preview">
            <div style={{ display: "grid", gridTemplateColumns: results.length > 1 ? "1fr 1fr" : "1fr", gap: 8, width: "100%", maxWidth: 600 }}>
              {results.map((r) => (
                <img key={r.id} src={r.url} alt="Generated" style={{ width: "100%", borderRadius: 8 }} />
              ))}
            </div>
          </div>
        )}

        {/* Video / Talking head results */}
        {(contentType === "video" || contentType === "talking-head") && results.length > 0 && results[0].url && (
          <div className="sv3-canvas-preview">
            <video src={results[0].url} controls loop style={{ maxWidth: "100%", maxHeight: "100%", borderRadius: 8 }} />
          </div>
        )}

        {/* Carousel results */}
        {contentType === "carousel" && resultContentSet && (
          <div className="sv3-canvas-preview" style={{ flexDirection: "column" }}>
            {resultContentSet.slides[activeSlide]?.url && (
              <img src={resultContentSet.slides[activeSlide].url} alt={`Slide ${activeSlide + 1}`} style={{ maxWidth: "100%", maxHeight: "60%", objectFit: "contain", borderRadius: 8 }} />
            )}
            <div className="sv3-canvas-slides">
              {resultContentSet.slides.map((slide, i) => (
                <div
                  key={slide.id}
                  className={`sv3-canvas-slide${i === activeSlide ? " active" : ""}`}
                  onClick={() => setActiveSlide(i)}
                  style={slide.url ? { backgroundImage: `url(${slide.url})`, backgroundSize: "cover", backgroundPosition: "center" } : { background: "#F0F0F0" }}
                />
              ))}
            </div>
            <div className="sv3-canvas-slide-counter">{activeSlide + 1} / {resultContentSet.slides.length}</div>
            {resultContentSet.caption && (
              <div className="sv3-canvas-info">
                <div style={{ fontSize: 12, color: "#555" }}>{resultContentSet.caption}</div>
                {resultContentSet.hashtags.length > 0 && (
                  <div style={{ fontSize: 11, color: "#C4603A", marginTop: 4 }}>
                    {resultContentSet.hashtags.map((h) => `#${h}`).join(" ")}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Iteration actions */}
        <div className="sv3-canvas-actions">
          <button className="sv3-canvas-action primary" onClick={() => {
            useUnifiedStudioStore.getState().setShowResults(false);
            hideCanvas();
          }}>
            Use
          </button>
          <button className="sv3-canvas-action" onClick={() => {
            useUnifiedStudioStore.getState().setShowResults(false);
            useUnifiedStudioStore.getState().setResults([]);
            useUnifiedStudioStore.getState().setResultContentSet(null);
          }}>
            Try Different
          </button>
        </div>
      </div>
    );
  }

  // Preview mode — showing a selected item
  if (!selectedItem) {
    return (
      <div className="sv3-canvas">
        <button className="sv3-canvas-close" onClick={hideCanvas}>&times;</button>
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "#BBB", fontSize: 13 }}>
          Select something to preview
        </div>
      </div>
    );
  }

  const isVideo = selectedItem.type === "VIDEO" || selectedItem.type === "TALKING_HEAD";

  return (
    <div className="sv3-canvas">
      <button className="sv3-canvas-close" onClick={hideCanvas}>&times;</button>

      <div className="sv3-canvas-preview">
        {isVideo && selectedItem.mediaUrl ? (
          <video src={selectedItem.mediaUrl} controls loop />
        ) : selectedItem.thumbnailUrl || selectedItem.mediaUrl ? (
          <img src={selectedItem.mediaUrl ?? selectedItem.thumbnailUrl} alt={selectedItem.name} />
        ) : (
          <div style={{ width: 200, height: 200, background: "#F0F0F0", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", color: "#BBB" }}>
            No preview
          </div>
        )}
      </div>

      <div className="sv3-canvas-info">
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 2 }}>{selectedItem.name}</div>
        {selectedItem.prompt && <div className="sv3-canvas-prompt">{selectedItem.prompt}</div>}
        {selectedItem.trend && (
          <div style={{ fontSize: 11, color: "#C4603A", marginBottom: 2 }}>
            {selectedItem.trend.replace(/-/g, " ")} &middot; {selectedItem.category?.replace(/-/g, " ")}
          </div>
        )}
        <div className="sv3-canvas-date">
          {new Date(selectedItem.createdAt).toLocaleDateString()}
        </div>
        {selectedItem.tags && selectedItem.tags.length > 0 && (
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 6 }}>
            {selectedItem.tags.map((tag) => (
              <span key={tag} style={{ padding: "2px 8px", borderRadius: 10, background: "#F5F5F5", fontSize: 10, color: "#888" }}>{tag}</span>
            ))}
          </div>
        )}
      </div>

      <CanvasActions item={selectedItem} />
    </div>
  );
}
