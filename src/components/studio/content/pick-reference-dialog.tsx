"use client";

import { useState, useRef } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useCreatorStore } from "@/stores/creator-store";
import { useUnifiedStudioStore } from "@/stores/unified-studio-store";
import { analyzeReferenceImage, createReference } from "@/server/actions/reference-actions";

function resizeImage(file: File, maxSize: number = 1200): Promise<string> {
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
        resolve(dataUrl.split(",")[1]);
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

export function PickReferenceDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const references = useCreatorStore((s) => s.references);
  const { addReference } = useCreatorStore();
  const { attachRef } = useUnifiedStudioStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [tab, setTab] = useState<"browse" | "upload">("browse");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  async function handleUpload(file: File) {
    if (!file.type.startsWith("image/")) return;
    setUploading(true);
    setUploadError(null);

    try {
      const base64 = await resizeImage(file);
      const analysis = await analyzeReferenceImage(base64);
      const result = await createReference(
        analysis.type,
        analysis.name,
        analysis.description,
        base64,
        analysis.tags
      );

      if (result.success) {
        addReference(result.reference);
        attachRef(result.reference);
        onOpenChange(false);
      } else {
        setUploadError(result.error);
      }
    } catch {
      setUploadError("Upload failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="add-ref-dialog" showCloseButton={false} style={{ maxWidth: 480 }}>
        <div style={{ padding: 8 }}>
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 10 }}>Add Reference</div>

          {/* Tabs */}
          <div style={{ display: "flex", gap: 0, marginBottom: 12, borderBottom: "1px solid #EBEBEB" }}>
            <button
              onClick={() => setTab("browse")}
              style={{
                padding: "6px 14px", fontSize: 12, fontFamily: "inherit",
                border: "none", borderBottom: tab === "browse" ? "2px solid #C4603A" : "2px solid transparent",
                background: "none", cursor: "pointer",
                color: tab === "browse" ? "#111" : "#999", fontWeight: tab === "browse" ? 600 : 400,
              }}
            >
              My References {references.length > 0 && `(${references.length})`}
            </button>
            <button
              onClick={() => setTab("upload")}
              style={{
                padding: "6px 14px", fontSize: 12, fontFamily: "inherit",
                border: "none", borderBottom: tab === "upload" ? "2px solid #C4603A" : "2px solid transparent",
                background: "none", cursor: "pointer",
                color: tab === "upload" ? "#111" : "#999", fontWeight: tab === "upload" ? 600 : 400,
              }}
            >
              Upload New
            </button>
          </div>

          {/* Browse tab */}
          {tab === "browse" && (
            <>
              {references.length === 0 ? (
                <div style={{ padding: 24, textAlign: "center", color: "#BBB", fontSize: 12 }}>
                  No references saved yet.
                  <br />
                  <button
                    onClick={() => setTab("upload")}
                    style={{ color: "#C4603A", background: "none", border: "none", cursor: "pointer", fontSize: 12, marginTop: 6 }}
                  >
                    Upload one →
                  </button>
                </div>
              ) : (
                <div style={{
                  display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8,
                  maxHeight: 300, overflowY: "auto",
                }}>
                  {references.map((ref) => (
                    <button
                      key={ref.id}
                      onClick={() => {
                        attachRef(ref);
                        onOpenChange(false);
                      }}
                      style={{
                        padding: 0, border: "1px solid #EBEBEB", borderRadius: 8,
                        background: "#FAFAFA", cursor: "pointer", overflow: "hidden",
                        textAlign: "left",
                      }}
                    >
                      <div style={{
                        width: "100%", aspectRatio: "1", borderRadius: "8px 8px 0 0",
                        background: ref.imageUrl ? `url(${ref.imageUrl}) center/cover` : "#EEE",
                      }} />
                      <div style={{ padding: "4px 6px" }}>
                        <div style={{ fontSize: 10, fontWeight: 600, color: "#333", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {ref.name}
                        </div>
                        <div style={{ fontSize: 9, color: "#AAA" }}>
                          {ref.type === "BACKGROUND" ? "Background" : "Reference"}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}

          {/* Upload tab */}
          {tab === "upload" && (
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const file = e.dataTransfer.files?.[0];
                if (file) handleUpload(file);
              }}
              style={{
                padding: 32, textAlign: "center", border: "2px dashed #E0E0E0",
                borderRadius: 8, cursor: "pointer", color: "#999",
              }}
            >
              {uploading ? (
                <div>
                  <div className="studio-gen-spinner" style={{ margin: "0 auto 8px" }} />
                  <div style={{ fontSize: 12 }}>Uploading & analyzing...</div>
                </div>
              ) : (
                <>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ margin: "0 auto 8px", display: "block" }}>
                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" />
                  </svg>
                  <div style={{ fontSize: 12 }}>Drop image or click to upload</div>
                  <div style={{ fontSize: 10, color: "#CCC", marginTop: 4 }}>Saves to your library & adds to this generation</div>
                </>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                style={{ display: "none" }}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleUpload(file);
                }}
              />
            </div>
          )}

          {uploadError && (
            <div style={{ fontSize: 11, color: "#e53e3e", marginTop: 8 }}>{uploadError}</div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
