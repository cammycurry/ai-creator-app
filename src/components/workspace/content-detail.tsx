"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useCreatorStore } from "@/stores/creator-store";
import { useUIStore } from "@/stores/ui-store";
import { useUnifiedStudioStore } from "@/stores/unified-studio-store";
import { deleteContent } from "@/server/actions/content-actions";
import { AddReferenceDialog } from "./add-reference-dialog";
import { DownloadDialog } from "./download-dialog";
import { VideoPlayer } from "./video-player";
import type { ContentItem } from "@/types/content";

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

export function ContentDetail({
  item,
  open,
  onOpenChange,
  onMakeCarousel,
}: {
  item: ContentItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onMakeCarousel?: (item: ContentItem) => void;
}) {
  const router = useRouter();
  const [downloadDialogOpen, setDownloadDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [saveRefOpen, setSaveRefOpen] = useState(false);
  const [refImageBase64, setRefImageBase64] = useState<string | null>(null);
  const { setContent, content } = useCreatorStore();

  if (!item) return null;

  const s3Key = item.s3Keys?.[0] ?? "";

  const handleSaveAsRef = async () => {
    if (!item?.url) return;
    try {
      const response = await fetch(item.url);
      const blob = await response.blob();
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = (reader.result as string).split(",")[1];
        setRefImageBase64(base64);
        setSaveRefOpen(true);
      };
      reader.readAsDataURL(blob);
    } catch {
      setSaveRefOpen(true);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    const result = await deleteContent(item.id);
    if (result.success) {
      setContent(content.filter((c) => c.id !== item.id));
      onOpenChange(false);
    }
    setDeleting(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="content-detail-dialog">
        <div className="cd-layout">
          {/* Image */}
          <div className="cd-image-wrap">
            {item.type === "VIDEO" && item.url ? (
              <VideoPlayer src={item.url} className="cd-image" />
            ) : item.url ? (
              <img src={item.url} alt={item.userInput ?? "Generated content"} className="cd-image" />
            ) : null}
          </div>

          {/* Info panel */}
          <div className="cd-info">
            <div className="cd-meta">
              <span className="cd-type-badge">
                {item.type === "IMAGE" ? "Photo" : item.type === "VIDEO" ? "Video" : "Voice"}
              </span>
              <span className="cd-date">{formatDate(item.createdAt)}</span>
            </div>

            {item.userInput && (
              <div className="cd-prompt">
                <div className="cd-prompt-label">Prompt</div>
                <div className="cd-prompt-text">{item.userInput}</div>
              </div>
            )}

            <div className="cd-actions">
              <button
                className="cd-action-btn cd-download"
                onClick={() => setDownloadDialogOpen(true)}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                Download
              </button>
              {s3Key && (
                <DownloadDialog
                  open={downloadDialogOpen}
                  onOpenChange={setDownloadDialogOpen}
                  s3Key={s3Key}
                  contentType={item.type === "VIDEO" || item.type === "TALKING_HEAD" ? "video" : "image"}
                />
              )}
              {onMakeCarousel && (
                <button
                  className="cd-action-btn"
                  onClick={() => { onMakeCarousel(item); onOpenChange(false); }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="2" y="2" width="20" height="20" rx="2" />
                    <path d="M7 2v20M17 2v20" />
                  </svg>
                  Make Carousel
                </button>
              )}
              <button className="cd-action-btn" onClick={handleSaveAsRef}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <path d="M21 15l-5-5L5 21" />
                </svg>
                Save as Reference
              </button>
              {item.type === "IMAGE" && (
                <button className="cd-action-btn" onClick={() => {
                  useUnifiedStudioStore.getState().setContentType("video");
                  useUnifiedStudioStore.getState().setVideoSource("photo");
                  useUnifiedStudioStore.getState().setSourceContentId(item.id);
                  router.push("/workspace/studio");
                  onOpenChange(false);
                }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polygon points="5 3 19 12 5 21 5 3" />
                  </svg>
                  Make Video
                </button>
              )}
              <button className="cd-action-btn" onClick={() => {
                onOpenChange(false);
                const { selectItem } = useUnifiedStudioStore.getState();
                selectItem({
                  id: item.id,
                  kind: "content",
                  type: item.type,
                  name: item.userInput ?? item.prompt ?? item.type,
                  thumbnailUrl: item.url,
                  mediaUrl: item.url,
                  prompt: item.prompt,
                  createdAt: item.createdAt,
                });
                router.push("/workspace/studio");
              }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <path d="M9 3v18M15 3v18" />
                </svg>
                Open in Studio
              </button>
              <button className="cd-action-btn" disabled style={{ opacity: 0.5 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
                Upscale
              </button>
              <button
                className="cd-action-btn"
                onClick={handleDelete}
                disabled={deleting}
                style={{ marginLeft: "auto", color: "#e53e3e", borderColor: "#fed7d7" }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                </svg>
                {deleting ? "Deleting..." : "Delete"}
              </button>
            </div>

            <div className="cd-cost">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 6v12M8 10h8M8 14h8" />
              </svg>
              {item.creditsCost} credit{item.creditsCost !== 1 ? "s" : ""}
            </div>
          </div>
        </div>
        {saveRefOpen && (
          <AddReferenceDialog
            open={saveRefOpen}
            onOpenChange={setSaveRefOpen}
            prefillImageBase64={refImageBase64 ?? undefined}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
