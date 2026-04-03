"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useCreatorStore } from "@/stores/creator-store";
import { useUnifiedStudioStore } from "@/stores/unified-studio-store";
import { AddReferenceDialog } from "@/components/workspace/add-reference-dialog";
import { getRecentContent } from "@/server/actions/content-actions";
import { getPublicReferences, savePublicReference } from "@/server/actions/public-reference-actions";
import type { ContentItem } from "@/types/content";
import type { PublicReferenceItem } from "@/types/reference";

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  return `${days}d`;
}

function typeIcon(type: ContentItem["type"]): string {
  if (type === "IMAGE") return "📷";
  if (type === "VIDEO") return "🎥";
  if (type === "TALKING_HEAD") return "🎤";
  return "📸";
}

function typeLabel(type: ContentItem["type"]): string {
  if (type === "IMAGE") return "Photo";
  if (type === "VIDEO") return "Video";
  if (type === "TALKING_HEAD") return "Voice";
  return "Photo";
}

function resizeImageFile(file: File, maxSize = 1200): Promise<{ base64: string; preview: string }> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let { width, height } = img;
        if (width > maxSize || height > maxSize) {
          const ratio = Math.min(maxSize / width, maxSize / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
        const base64 = dataUrl.split(",")[1];
        resolve({ base64, preview: dataUrl });
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

export function LibraryPanel() {
  const references = useCreatorStore((s) => s.references);
  const creator = useCreatorStore((s) => s.getActiveCreator());
  const { attachedRefs, attachRef, contentType, videoSource, addInspirationPhoto, setInspirationVideo } =
    useUnifiedStudioStore();

  const [addRefOpen, setAddRefOpen] = useState(false);
  const [recentItems, setRecentItems] = useState<ContentItem[]>([]);
  const [publicRefs, setPublicRefs] = useState<PublicReferenceItem[]>([]);
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    setContentType,
    setPrompt,
  } = useUnifiedStudioStore();

  useEffect(() => {
    if (!creator?.id) return;
    getRecentContent(creator.id, 5).then(setRecentItems).catch(() => {});
  }, [creator?.id]);

  useEffect(() => {
    getPublicReferences(undefined, undefined, 8).then(setPublicRefs).catch(() => {});
  }, []);

  async function handlePublicRefClick(pubRef: PublicReferenceItem) {
    const result = await savePublicReference(pubRef.id);
    if (result.success && result.reference) {
      useCreatorStore.getState().addReference(result.reference);
      attachRef(result.reference);
    }
  }

  const handleDropZoneFile = useCallback(
    async (file: File) => {
      if (contentType === "video" && videoSource === "motion") {
        if (!file.type.startsWith("video/")) return;
        const reader = new FileReader();
        reader.onload = () => {
          const base64 = (reader.result as string).split(",")[1];
          setInspirationVideo({ base64, preview: URL.createObjectURL(file) });
        };
        reader.readAsDataURL(file);
      } else {
        if (!file.type.startsWith("image/")) return;
        const result = await resizeImageFile(file);
        addInspirationPhoto(result);
      }
    },
    [contentType, videoSource, addInspirationPhoto, setInspirationVideo]
  );

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleDropZoneFile(file);
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleDropZoneFile(file);
    e.target.value = "";
  }

  function handleRecentClick(item: ContentItem) {
    const typeMap: Record<ContentItem["type"], "photo" | "video" | "talking-head"> = {
      IMAGE: "photo",
      VIDEO: "video",
      TALKING_HEAD: "talking-head",
    };
    setContentType(typeMap[item.type] ?? "photo");
    setPrompt(item.userInput ?? item.prompt ?? "");
  }

  const isMotion = contentType === "video" && videoSource === "motion";
  const dropLabel = isMotion
    ? "Drop a movement video"
    : `Drop a photo — make ${creator?.name ?? "them"} do THIS`;

  const acceptType = isMotion ? "video/*" : "image/*";

  return (
    <div className="sv2-left">
      {/* ── References ── */}
      <div className="sv2-section-label">Library</div>
      <div className="sv2-section-hint">Click to use in generation</div>
      <div className="sv2-ref-grid">
        {references.map((ref) => {
          const active = attachedRefs.some((r) => r.id === ref.id);
          return (
            <div
              key={ref.id}
              className={`sv2-ref${active ? " on" : ""}`}
              style={
                ref.imageUrl
                  ? { backgroundImage: `url(${ref.imageUrl})`, backgroundSize: "cover", backgroundPosition: "center" }
                  : { background: "#F5F5F5" }
              }
              onClick={() => attachRef(ref)}
              title={ref.name}
            >
              {!ref.imageUrl && <span className="sv2-ref-icon">🖼</span>}
              {!ref.imageUrl && <span className="sv2-ref-name">{ref.name}</span>}
              {active && <span className="sv2-ref-check">✓</span>}
            </div>
          );
        })}
        <div className="sv2-add" onClick={() => setAddRefOpen(true)} title="Add reference">
          +
        </div>
      </div>

      {/* ── Public library ── */}
      <div className="sv2-section-label">Public Library</div>
      {publicRefs.length === 0 ? (
        <div className="sv2-section-hint">No public references yet</div>
      ) : (
        <div className="sv2-ref-grid">
          {publicRefs.slice(0, 8).map((ref) => (
            <div
              key={ref.id}
              className="sv2-ref"
              style={
                ref.imageUrl
                  ? { backgroundImage: `url(${ref.imageUrl})`, backgroundSize: "cover", backgroundPosition: "center" }
                  : { background: "#F5F5F5" }
              }
              onClick={() => handlePublicRefClick(ref)}
              title={ref.name}
            />
          ))}
        </div>
      )}

      {/* ── Recent ── */}
      <div className="sv2-section-label">Recent</div>
      {recentItems.length === 0 && (
        <div className="sv2-section-hint">No recent generations</div>
      )}
      {recentItems.map((item) => (
        <div
          key={item.id}
          className="sv2-history-item"
          onClick={() => handleRecentClick(item)}
          title={item.userInput ?? item.prompt ?? ""}
        >
          <div
            className="sv2-h-thumb"
            style={
              item.url
                ? { backgroundImage: `url(${item.url})`, backgroundSize: "cover", backgroundPosition: "center" }
                : { background: "#F0F0F0" }
            }
          />
          <div className="sv2-h-text">
            <div className="sv2-h-type">
              {typeIcon(item.type)} {typeLabel(item.type)}
            </div>
            <div>
              {(item.userInput ?? item.prompt ?? "").slice(0, 40) || "—"}
            </div>
            <div style={{ color: "#BBB", fontSize: 8 }}>
              {relativeTime(item.createdAt)}
            </div>
          </div>
        </div>
      ))}

      {/* ── Inspiration drop zone ── */}
      <div
        className="sv2-drop-zone"
        style={dragging ? { borderColor: "#C4603A", background: "rgba(196,96,58,0.04)" } : {}}
        onClick={() => fileInputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
      >
        {dropLabel}
        <input
          ref={fileInputRef}
          type="file"
          accept={acceptType}
          style={{ display: "none" }}
          onChange={handleFileInput}
        />
      </div>

      <AddReferenceDialog open={addRefOpen} onOpenChange={setAddRefOpen} />
    </div>
  );
}
