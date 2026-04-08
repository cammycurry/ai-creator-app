"use client";

import { useState } from "react";
import { useUnifiedStudioStore } from "@/stores/unified-studio-store";
import { CanvasActions } from "./canvas-actions";

function contentTypeLabel(type: string) {
  if (type === "IMAGE") return "Photo";
  if (type === "VIDEO") return "Video";
  if (type === "TALKING_HEAD") return "Talking Head";
  if (type === "CAROUSEL") return "Carousel";
  return type;
}

function CanvasInfo({ item }: { item: import("@/stores/unified-studio-store").BrowserItem }) {
  const [detailsOpen, setDetailsOpen] = useState(false);

  return (
    <div className="sv3-canvas-info">
      {/* Content items: show type + date + expandable details */}
      {item.kind === "content" && (
        <>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: "#555" }}>{contentTypeLabel(item.type)}</span>
              <span style={{ fontSize: 10, color: "#CCC" }}>{new Date(item.createdAt).toLocaleDateString()}</span>
              {item.creditsCost !== undefined && (
                <span style={{ fontSize: 10, color: "#BBB" }}>{item.creditsCost} credit{item.creditsCost !== 1 ? "s" : ""}</span>
              )}
            </div>
            <button
              onClick={() => setDetailsOpen(!detailsOpen)}
              style={{ background: "none", border: "none", cursor: "pointer", fontSize: 10, color: "#C4603A" }}
            >
              {detailsOpen ? "Hide details ▴" : "Details ▾"}
            </button>
          </div>
          {detailsOpen && (
            <div style={{ marginTop: 6, padding: 8, background: "#FAFAFA", borderRadius: 6, fontSize: 11, color: "#666", lineHeight: 1.6 }}>
              {item.userInput && (
                <div><span style={{ color: "#999" }}>You typed:</span> {item.userInput}</div>
              )}
              {item.prompt && item.prompt !== item.userInput && (
                <div style={{ marginTop: 4 }}><span style={{ color: "#999" }}>Enhanced:</span> {item.prompt}</div>
              )}
            </div>
          )}
          {item.refAttachments && item.refAttachments.length > 0 && (
            <div style={{ marginTop: 6, padding: 6, background: "#FAFAFA", borderRadius: 6, fontSize: 10 }}>
              <div style={{ fontWeight: 600, color: "#888", marginBottom: 4 }}>References used:</div>
              {item.refAttachments.map((att: any, i: number) => (
                <div key={i} style={{ display: "flex", gap: 4, alignItems: "center", marginBottom: 2 }}>
                  <span style={{ color: "#C4603A" }}>
                    {att.mode === "vibe" ? "✨" : att.what === "background" ? "🏠" : att.what === "outfit" ? "👕" : att.what === "pose" ? "🤸" : "📌"}
                  </span>
                  <span style={{ color: "#555" }}>
                    {att.refName} — {att.mode}{att.mode !== "vibe" ? ` ${att.what}` : ""}
                  </span>
                  {att.description && (
                    <span style={{ color: "#999", fontStyle: "italic" }}>"{att.description}"</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* References: show name + tags */}
      {item.kind === "reference" && (
        <>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 2 }}>{item.name}</div>
          {item.tags && item.tags.length > 0 && (
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 4 }}>
              {item.tags.map((tag) => (
                <span key={tag} style={{ padding: "2px 8px", borderRadius: 10, background: "#F5F5F5", fontSize: 10, color: "#888" }}>{tag}</span>
              ))}
            </div>
          )}
        </>
      )}

      {/* Templates: show name + description + trend */}
      {item.kind === "template" && (
        <>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 2 }}>{item.name}</div>
          {item.prompt && (
            <div style={{ fontSize: 11, color: "#888", marginBottom: 4 }}>{item.prompt}</div>
          )}
          {item.trend && (
            <div style={{ fontSize: 11, color: "#C4603A" }}>
              {item.trend.replace(/-/g, " ")} · {item.category?.replace(/-/g, " ")}
            </div>
          )}
        </>
      )}
    </div>
  );
}

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
            useUnifiedStudioStore.getState().hideCanvas();
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

      <CanvasInfo item={selectedItem} />

      <CanvasActions item={selectedItem} />
    </div>
  );
}
