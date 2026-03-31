"use client";

import "./content-studio.css";
import { useState, useCallback, useEffect } from "react";
import { useUIStore } from "@/stores/ui-store";
import { useCreatorStore } from "@/stores/creator-store";
import { useContentStudioStore } from "@/stores/content-studio-store";
import { generateContent } from "@/server/actions/content-actions";
import { generateCarousel } from "@/server/actions/carousel-actions";
import { getWorkspaceData } from "@/server/actions/workspace-actions";
import { CAROUSEL_FORMATS } from "@/data/carousel-formats";
import { templates } from "@/data/templates";
import { ReferenceCard } from "@/components/workspace/reference-card";
import { AddReferenceDialog } from "@/components/workspace/add-reference-dialog";
import { REFERENCE_TYPES, REFERENCE_TYPE_LABELS, type ReferenceType, type ReferenceItem } from "@/types/reference";

// ─── Reference Photo Upload (inline, not from library) ─────
function resizeForRef(file: File): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let { width, height } = img;
        const max = 1200;
        if (width > max || height > max) {
          const ratio = Math.min(max / width, max / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }
        canvas.width = width;
        canvas.height = height;
        canvas.getContext("2d")!.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", 0.85).split(",")[1]);
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

export function ContentStudio() {
  const { contentStudioOpen, setContentStudioOpen } = useUIStore();
  const { activeCreatorId, references, addContent, addContentSet, setCredits } = useCreatorStore();
  const creator = useCreatorStore((s) => s.getActiveCreator());

  // Local state — no external store needed for this flow
  const [prompt, setPrompt] = useState("");
  const [refPhotos, setRefPhotos] = useState<{ base64: string; preview: string }[]>([]);
  const [selectedRefs, setSelectedRefs] = useState<ReferenceItem[]>([]);
  const [imageCount, setImageCount] = useState(1);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [addRefOpen, setAddRefOpen] = useState(false);
  const [refFilter, setRefFilter] = useState<"ALL" | ReferenceType>("ALL");

  // Carousel mode
  const [carouselFormat, setCarouselFormat] = useState<string | null>(null);
  const [showTemplates, setShowTemplates] = useState(false);

  const selectedFormat = carouselFormat ? CAROUSEL_FORMATS.find((f) => f.id === carouselFormat) : null;

  // Reset on close
  useEffect(() => {
    if (!contentStudioOpen) {
      setPrompt("");
      setRefPhotos([]);
      setSelectedRefs([]);
      setImageCount(1);
      setError(null);
      setCarouselFormat(null);
      setShowTemplates(false);
    }
  }, [contentStudioOpen]);

  // Lock body scroll
  useEffect(() => {
    if (contentStudioOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [contentStudioOpen]);

  const handleClose = useCallback(() => {
    if (generating) return;
    setContentStudioOpen(false);
  }, [generating, setContentStudioOpen]);

  // Upload reference photo
  const handleRefPhotoUpload = useCallback(async (file: File) => {
    if (!file.type.startsWith("image/")) return;
    const base64 = await resizeForRef(file);
    setRefPhotos((prev) => [...prev, { base64, preview: `data:image/jpeg;base64,${base64}` }]);
  }, []);

  // Toggle saved reference
  const toggleRef = useCallback((ref: ReferenceItem) => {
    setSelectedRefs((prev) =>
      prev.some((r) => r.id === ref.id)
        ? prev.filter((r) => r.id !== ref.id)
        : [...prev, ref]
    );
  }, []);

  // Generate
  const handleGenerate = useCallback(async () => {
    if (!activeCreatorId || !prompt.trim() || generating) return;
    setGenerating(true);
    setError(null);

    try {
      if (selectedFormat) {
        // Carousel generation
        const result = await generateCarousel(
          activeCreatorId,
          selectedFormat.id,
          selectedFormat.slideRange[0],
          prompt
        );
        if (result.success) {
          addContentSet(result.contentSet);
        } else {
          setError(result.error);
          setGenerating(false);
          return;
        }
      } else {
        // Single photo generation
        const result = await generateContent(activeCreatorId, prompt, imageCount);
        if (result.success) {
          addContent(result.content);
        } else {
          setError(result.error);
          setGenerating(false);
          return;
        }
      }

      const data = await getWorkspaceData();
      setCredits(data.balance);
      setContentStudioOpen(false);
    } catch {
      setError("Generation failed. Please try again.");
    }
    setGenerating(false);
  }, [activeCreatorId, prompt, imageCount, generating, selectedFormat, addContent, addContentSet, setCredits, setContentStudioOpen]);

  if (!contentStudioOpen) return null;

  const filteredRefs = refFilter === "ALL"
    ? references
    : references.filter((r) => r.type === refFilter);

  const creditCost = selectedFormat ? selectedFormat.slideRange[0] : imageCount;

  return (
    <div className="cs-overlay">
      {/* Header */}
      <div className="cs-header">
        <div className="cs-header-left">
          <button className="cs-close" onClick={handleClose}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
          <span className="cs-title">Create Content</span>
          {creator && (
            <span style={{ fontSize: 12, color: "var(--text-secondary, #888)" }}>
              for {creator.name}
            </span>
          )}
        </div>
        <div style={{ fontSize: 13, fontWeight: 600 }}>
          {creditCost} credit{creditCost !== 1 ? "s" : ""}
        </div>
      </div>

      {/* Main content — single page, no steps */}
      <div className="cs-body">
        <div className="cs-builder">
          {/* Left: References panel */}
          <div className="cs-ref-panel">
            <div className="cs-ref-panel-header">
              <span className="cs-ref-panel-title">My References</span>
              <button className="cs-slide-action" onClick={() => setAddRefOpen(true)} style={{ fontSize: 12 }}>
                + Add
              </button>
            </div>
            <div className="cs-ref-tabs">
              <button className={`cs-ref-tab${refFilter === "ALL" ? " active" : ""}`} onClick={() => setRefFilter("ALL")}>
                All ({references.length})
              </button>
              {REFERENCE_TYPES.map((t) => {
                const count = references.filter((r) => r.type === t).length;
                if (count === 0) return null;
                return (
                  <button key={t} className={`cs-ref-tab${refFilter === t ? " active" : ""}`} onClick={() => setRefFilter(t)}>
                    {REFERENCE_TYPE_LABELS[t]} ({count})
                  </button>
                );
              })}
            </div>
            <div className="cs-ref-grid">
              {filteredRefs.map((ref) => (
                <div
                  key={ref.id}
                  onClick={() => toggleRef(ref)}
                  style={{
                    borderRadius: 8,
                    border: selectedRefs.some((r) => r.id === ref.id) ? "2px solid var(--accent, #C4603A)" : "2px solid transparent",
                    cursor: "pointer",
                  }}
                >
                  <ReferenceCard reference={ref} compact />
                </div>
              ))}
              <button className="cs-ref-add-btn" onClick={() => setAddRefOpen(true)}>+</button>
            </div>
          </div>

          {/* Right: Creation area */}
          <div className="cs-slides-panel">
            <div className="cs-slides-list" style={{ padding: 20, gap: 16 }}>

              {/* Main prompt */}
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary, #111)", marginBottom: 8 }}>
                  What do you want to create?
                </div>
                <textarea
                  className="cs-instructions-input"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder={`Tell ${creator?.name ?? "your creator"} what to do...${"\n\n"}Examples:\n• Mirror selfie at the gym, post-workout glow\n• Coffee shop window seat, reading, cozy vibes\n• Walking on the beach at sunset in a white dress`}
                  rows={5}
                  autoFocus
                  style={{ fontSize: 16, lineHeight: 1.5, background: "var(--surface, #fff)" }}
                />
              </div>

              {/* Reference photo upload */}
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary, #111)", marginBottom: 8 }}>
                  Show me what you want
                  <span style={{ fontSize: 12, fontWeight: 400, color: "var(--text-muted, #BBB)", marginLeft: 8 }}>optional</span>
                </div>

                {refPhotos.length > 0 && (
                  <div style={{ display: "flex", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
                    {refPhotos.map((rp, i) => (
                      <div key={i} style={{ position: "relative", width: 80, height: 80, borderRadius: 8, overflow: "hidden" }}>
                        <img src={rp.preview} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        <button
                          onClick={() => setRefPhotos((prev) => prev.filter((_, j) => j !== i))}
                          style={{
                            position: "absolute", top: 2, right: 2, width: 20, height: 20, borderRadius: "50%",
                            background: "rgba(0,0,0,0.6)", border: "none", color: "#fff", fontSize: 11,
                            cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                          }}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div
                  className="cs-upload-zone"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleRefPhotoUpload(f); }}
                  onClick={() => {
                    const input = document.createElement("input");
                    input.type = "file";
                    input.accept = "image/*";
                    input.multiple = true;
                    input.onchange = (e) => {
                      const files = (e.target as HTMLInputElement).files;
                      if (files) Array.from(files).forEach(handleRefPhotoUpload);
                    };
                    input.click();
                  }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <circle cx="8.5" cy="8.5" r="1.5" />
                    <path d="M21 15l-5-5L5 21" />
                  </svg>
                  <span>Drop a photo or click to upload — "make my influencer do THIS"</span>
                </div>
              </div>

              {/* Selected saved references */}
              {selectedRefs.length > 0 && (
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary, #888)", marginBottom: 6 }}>
                    Using {selectedRefs.length} saved reference{selectedRefs.length !== 1 ? "s" : ""}
                  </div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {selectedRefs.map((ref) => (
                      <span key={ref.id} className="cs-slide-ref-tag">
                        {ref.name}
                        <button className="cs-slide-ref-remove" onClick={() => toggleRef(ref)}>×</button>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Template quick-picks */}
              <div>
                <button
                  onClick={() => setShowTemplates(!showTemplates)}
                  style={{
                    fontSize: 13, fontWeight: 500, color: "var(--text-secondary, #888)",
                    background: "none", border: "none", cursor: "pointer", padding: 0,
                    display: "flex", alignItems: "center", gap: 6,
                  }}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                    style={{ transform: showTemplates ? "rotate(90deg)" : "none", transition: "transform 150ms" }}>
                    <path d="M9 18l6-6-6-6" />
                  </svg>
                  Browse templates
                  {carouselFormat && (
                    <span style={{ fontSize: 11, color: "var(--accent, #C4603A)", marginLeft: 4 }}>
                      {selectedFormat?.name}
                    </span>
                  )}
                </button>

                {showTemplates && (
                  <div style={{ marginTop: 12 }}>
                    {/* Carousel formats */}
                    <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-secondary, #888)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 8 }}>
                      Carousels
                    </div>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
                      {CAROUSEL_FORMATS.map((f) => (
                        <button
                          key={f.id}
                          onClick={() => {
                            setCarouselFormat(carouselFormat === f.id ? null : f.id);
                            if (!prompt.trim()) setPrompt(f.description);
                          }}
                          style={{
                            padding: "6px 12px", borderRadius: 8, fontSize: 12, cursor: "pointer",
                            border: carouselFormat === f.id ? "1px solid var(--accent, #C4603A)" : "1px solid var(--border, #EBEBEB)",
                            background: carouselFormat === f.id ? "var(--accent, #C4603A)" : "var(--card, #F5F5F5)",
                            color: carouselFormat === f.id ? "#fff" : "var(--text-primary, #111)",
                          }}
                        >
                          {f.name}
                          <span style={{ marginLeft: 4, opacity: 0.7 }}>{f.slideRange[0]}–{f.slideRange[1]}</span>
                        </button>
                      ))}
                    </div>

                    {/* Single photo templates */}
                    <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-secondary, #888)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 8 }}>
                      Single Photos
                    </div>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      {templates.slice(0, 8).map((t) => (
                        <button
                          key={t.id}
                          onClick={() => {
                            setCarouselFormat(null);
                            // Build prompt from template
                            let p = t.scenePrompt;
                            for (const f of t.customizableFields) {
                              p = p.replace(`{${f.key}}`, f.default ?? f.options?.[0] ?? "");
                            }
                            setPrompt(p);
                          }}
                          style={{
                            padding: "6px 12px", borderRadius: 8, fontSize: 12, cursor: "pointer",
                            border: "1px solid var(--border, #EBEBEB)", background: "var(--card, #F5F5F5)",
                            color: "var(--text-primary, #111)",
                          }}
                        >
                          {t.icon} {t.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="cs-footer">
              <div className="cs-footer-left">
                {!selectedFormat && (
                  <div className="cs-slide-count">
                    <span style={{ fontSize: 11, color: "var(--text-secondary)", marginRight: 6 }}>Photos:</span>
                    <button className="cs-count-btn" onClick={() => setImageCount(Math.max(1, imageCount - 1))} disabled={imageCount <= 1}>−</button>
                    <span style={{ fontSize: 13, fontWeight: 600, minWidth: 20, textAlign: "center" }}>{imageCount}</span>
                    <button className="cs-count-btn" onClick={() => setImageCount(Math.min(4, imageCount + 1))} disabled={imageCount >= 4}>+</button>
                  </div>
                )}
                {selectedFormat && (
                  <span style={{ fontSize: 12, color: "var(--text-secondary, #888)" }}>
                    {selectedFormat.name} · {selectedFormat.slideRange[0]} slides
                  </span>
                )}
              </div>
              <div className="cs-footer-right">
                <div style={{ textAlign: "right", marginRight: 8 }}>
                  <div className="cs-credit-cost">{creditCost} credit{creditCost !== 1 ? "s" : ""}</div>
                </div>
                <button
                  className="studio-btn primary"
                  onClick={handleGenerate}
                  disabled={!prompt.trim() || generating}
                  style={{ minWidth: 160 }}
                >
                  {generating ? "Generating..." : selectedFormat ? `Generate ${creditCost} Slides` : `Generate ${imageCount} Photo${imageCount !== 1 ? "s" : ""}`}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div style={{ position: "fixed", bottom: 80, left: "50%", transform: "translateX(-50%)", background: "#e53e3e", color: "#fff", padding: "8px 16px", borderRadius: 8, fontSize: 13, zIndex: 60 }}>
          {error}
        </div>
      )}

      <AddReferenceDialog open={addRefOpen} onOpenChange={setAddRefOpen} />
    </div>
  );
}
