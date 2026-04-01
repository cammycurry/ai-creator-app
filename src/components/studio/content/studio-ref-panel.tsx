"use client";

import { useState, useCallback, useRef } from "react";
import { useCreatorStore } from "@/stores/creator-store";
import { useUnifiedStudioStore } from "@/stores/unified-studio-store";
import { ReferenceCard } from "@/components/workspace/reference-card";
import { AddReferenceDialog } from "@/components/workspace/add-reference-dialog";
import { REFERENCE_TYPES, REFERENCE_TYPE_LABELS, type ReferenceType } from "@/types/reference";

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

type RefTab = "my-refs" | "creator" | "library";
type FilterType = "ALL" | ReferenceType;

const FILTER_CHIPS: { value: FilterType; label: string }[] = [
  { value: "ALL", label: "All" },
  { value: "BACKGROUND", label: "BG" },
  { value: "PRODUCT", label: "Product" },
  { value: "OUTFIT", label: "Outfit" },
  { value: "POSE", label: "Pose" },
  { value: "CUSTOM", label: "Custom" },
];

export function StudioRefPanel() {
  const references = useCreatorStore((s) => s.references);
  const {
    attachedRefs,
    attachRef,
    contentType,
    videoSource,
    inspirationPhotos,
    addInspirationPhoto,
    removeInspirationPhoto,
    inspirationVideo,
    setInspirationVideo,
  } = useUnifiedStudioStore();

  const [activeTab, setActiveTab] = useState<RefTab>("my-refs");
  const [activeFilter, setActiveFilter] = useState<FilterType>("ALL");
  const [addRefOpen, setAddRefOpen] = useState(false);
  const [inspoDragging, setInspoDragging] = useState(false);
  const inspoInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  const isMotionVideo = contentType === "video" && videoSource === "motion";

  const filteredRefs =
    activeTab === "library"
      ? []
      : activeFilter === "ALL"
      ? references
      : references.filter((r) => r.type === activeFilter);

  const handleInspoFile = useCallback(
    async (file: File) => {
      if (!file.type.startsWith("image/")) return;
      const base64 = await resizeForRef(file);
      const preview = `data:image/jpeg;base64,${base64}`;
      addInspirationPhoto({ base64, preview });
    },
    [addInspirationPhoto]
  );

  const handleVideoDrop = useCallback(
    (file: File) => {
      if (!file.type.startsWith("video/")) return;
      const preview = URL.createObjectURL(file);
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = (reader.result as string).split(",")[1];
        setInspirationVideo({ base64, preview });
      };
      reader.readAsDataURL(file);
    },
    [setInspirationVideo]
  );

  const handleInspoDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setInspoDragging(false);
      const file = e.dataTransfer.files?.[0];
      if (!file) return;
      if (isMotionVideo) {
        handleVideoDrop(file);
      } else {
        handleInspoFile(file);
      }
    },
    [isMotionVideo, handleVideoDrop, handleInspoFile]
  );

  const handleInspoInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleInspoFile(file);
      e.target.value = "";
    },
    [handleInspoFile]
  );

  const handleVideoInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleVideoDrop(file);
      e.target.value = "";
    },
    [handleVideoDrop]
  );

  return (
    <div className="us-ref-panel">
      {/* Ref tabs */}
      <div className="us-ref-panel-tabs">
        <button
          className={`us-ref-panel-tab${activeTab === "my-refs" ? " active" : ""}`}
          onClick={() => setActiveTab("my-refs")}
        >
          My Refs
        </button>
        <button
          className={`us-ref-panel-tab${activeTab === "creator" ? " active" : ""}`}
          onClick={() => setActiveTab("creator")}
        >
          Creator
        </button>
        <button
          className={`us-ref-panel-tab${activeTab === "library" ? " active" : ""}`}
          onClick={() => setActiveTab("library")}
        >
          Library
        </button>
      </div>

      {/* Filter chips */}
      {activeTab !== "library" && (
        <div className="us-ref-filter">
          {FILTER_CHIPS.map((chip) => (
            <button
              key={chip.value}
              className={`us-ref-filter-chip${activeFilter === chip.value ? " active" : ""}`}
              onClick={() => setActiveFilter(chip.value)}
            >
              {chip.label}
            </button>
          ))}
        </div>
      )}

      {/* Reference grid */}
      {activeTab === "library" ? (
        <div className="us-ref-grid" style={{ alignItems: "center", justifyContent: "center", color: "#888", fontSize: 13 }}>
          Coming soon
        </div>
      ) : filteredRefs.length === 0 ? (
        <div className="us-ref-grid" style={{ alignItems: "center", justifyContent: "center", color: "#888", fontSize: 13 }}>
          No references yet
        </div>
      ) : (
        <div className="us-ref-grid">
          {filteredRefs.map((ref) => {
            const isAttached = attachedRefs.some((r) => r.id === ref.id);
            return (
              <div
                key={ref.id}
                className={`us-ref-item${isAttached ? " attached" : ""}`}
                onClick={() => attachRef(ref)}
              >
                <ReferenceCard reference={ref} compact />
                {isAttached && (
                  <div className="us-ref-item-badge">ATTACHED</div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Add button */}
      <button className="us-ref-add" onClick={() => setAddRefOpen(true)}>
        + Add
      </button>

      <AddReferenceDialog open={addRefOpen} onOpenChange={setAddRefOpen} />

      {/* Inspiration section */}
      <div className="us-inspo-section">
        {/* Uploaded inspiration thumbnails */}
        {!isMotionVideo && inspirationPhotos.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
            {inspirationPhotos.map((photo, i) => (
              <div key={i} style={{ position: "relative", width: 48, height: 48 }}>
                <img
                  src={photo.preview}
                  alt={`Inspiration ${i + 1}`}
                  style={{ width: 48, height: 48, objectFit: "cover", borderRadius: 4 }}
                />
                <button
                  style={{
                    position: "absolute",
                    top: -4,
                    right: -4,
                    width: 16,
                    height: 16,
                    borderRadius: "50%",
                    background: "#111",
                    color: "#fff",
                    border: "none",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 10,
                    lineHeight: 1,
                    padding: 0,
                  }}
                  onClick={() => removeInspirationPhoto(i)}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Uploaded inspiration video */}
        {isMotionVideo && inspirationVideo && (
          <div style={{ position: "relative", marginBottom: 8 }}>
            <video
              src={inspirationVideo.preview}
              style={{ width: "100%", borderRadius: 4, maxHeight: 80, objectFit: "cover" }}
              muted
            />
            <button
              style={{
                position: "absolute",
                top: 4,
                right: 4,
                width: 20,
                height: 20,
                borderRadius: "50%",
                background: "#111",
                color: "#fff",
                border: "none",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 12,
                lineHeight: 1,
                padding: 0,
              }}
              onClick={() => setInspirationVideo(null)}
            >
              ×
            </button>
          </div>
        )}

        {/* Drop zone */}
        {(!isMotionVideo || !inspirationVideo) && (
          <div
            className={`us-inspo-drop${inspoDragging ? " dragging" : ""}`}
            onClick={() =>
              isMotionVideo
                ? videoInputRef.current?.click()
                : inspoInputRef.current?.click()
            }
            onDragOver={(e) => { e.preventDefault(); setInspoDragging(true); }}
            onDragLeave={() => setInspoDragging(false)}
            onDrop={handleInspoDrop}
          >
            {isMotionVideo
              ? "Drop a movement video"
              : "Drop a photo — make my creator do THIS"}
          </div>
        )}

        <input
          ref={inspoInputRef}
          type="file"
          accept="image/*"
          style={{ display: "none" }}
          onChange={handleInspoInputChange}
        />
        <input
          ref={videoInputRef}
          type="file"
          accept="video/*"
          style={{ display: "none" }}
          onChange={handleVideoInputChange}
        />
      </div>
    </div>
  );
}
