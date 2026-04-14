"use client";

import { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useCreatorStore } from "@/stores/creator-store";
import { analyzeReferenceImage, createReference, createVideoReferenceFromUrl } from "@/server/actions/reference-actions";
// Note: createVideoReferenceFromUrl expects an S3 key, not base64. Video uploaded via /api/upload-video route.
import { type ReferenceType } from "@/types/reference";

type RefPurpose = "scene" | "product" | "motion" | null;

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
        resolve(canvas.toDataURL("image/jpeg", 0.85).split(",")[1]);
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

function extractVideoThumbnail(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.preload = "metadata";
    video.muted = true;
    video.playsInline = true;
    const url = URL.createObjectURL(file);
    video.src = url;
    video.onloadeddata = () => { video.currentTime = 0.5; };
    video.onseeked = () => {
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas.getContext("2d")!.drawImage(video, 0, 0);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/jpeg", 0.8));
    };
    video.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Failed to load video")); };
  });
}

export function AddReferenceDialog({
  open,
  onOpenChange,
  prefillImageBase64,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prefillImageBase64?: string;
}) {
  const { addReference } = useCreatorStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [imageBase64, setImageBase64] = useState("");
  const [preview, setPreview] = useState("");
  const [isVideo, setIsVideo] = useState(false);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [purpose, setPurpose] = useState<RefPurpose>(null);
  const [mode, setMode] = useState<"exact" | "inspired" | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    if (open && prefillImageBase64) {
      setImageBase64(prefillImageBase64);
      setPreview(`data:image/jpeg;base64,${prefillImageBase64}`);
      setIsVideo(false);
      runAnalysis(prefillImageBase64);
    }
  }, [open, prefillImageBase64]);

  useEffect(() => {
    if (!open) {
      setImageBase64(""); setPreview(""); setIsVideo(false); setVideoFile(null);
      setPurpose(null); setMode(null); setName(""); setDescription(""); setTags("");
      setAnalyzing(false); setSaving(false); setError(null);
    }
  }, [open]);

  async function runAnalysis(base64: string) {
    setAnalyzing(true);
    try {
      const result = await analyzeReferenceImage(base64);
      setName(result.name);
      setDescription(result.description);
      setTags(result.tags.join(", "));
      // Suggest purpose from AI type
      if (result.type === "BACKGROUND") setPurpose("scene");
    } catch {
      setName("Untitled");
    } finally {
      setAnalyzing(false);
    }
  }

  async function handleFile(file: File) {
    setError(null);
    setPurpose(null);

    if (file.type.startsWith("video/")) {
      setIsVideo(true);
      setVideoFile(file);
      try { setPreview(await extractVideoThumbnail(file)); } catch { setPreview(""); }
      setName(file.name.replace(/\.[^.]+$/, ""));
      setDescription("");
      setPurpose("motion");
    } else if (file.type.startsWith("image/")) {
      setIsVideo(false);
      setVideoFile(null);
      const base64 = await resizeImage(file);
      setImageBase64(base64);
      setPreview(`data:image/jpeg;base64,${base64}`);
      await runAnalysis(base64);
    }
  }

  const canSave = (imageBase64 || videoFile) && purpose !== null && name.trim() &&
    (purpose !== "scene" || mode !== null);

  async function handleSave() {
    if (!canSave) return;
    setSaving(true);
    setError(null);

    const tagList = tags.split(",").map((t) => t.trim()).filter(Boolean);
    // purpose and mode are now saved as real DB fields, not tags

    const refType: ReferenceType = purpose === "scene" ? "BACKGROUND" : "REFERENCE";

    if (isVideo && videoFile) {
      // Upload video via API route (avoids server action size limits)
      const formData = new FormData();
      formData.append("file", videoFile);
      const uploadRes = await fetch("/api/upload-video", { method: "POST", body: formData });
      if (!uploadRes.ok) {
        setError("Video upload failed");
        setSaving(false);
        return;
      }
      const { key } = await uploadRes.json();
      const result = await createVideoReferenceFromUrl(name.trim(), description.trim(), key, tagList, purpose ?? "motion", mode ?? undefined);
      if (result.success) { addReference(result.reference); onOpenChange(false); }
      else setError(result.error);
    } else {
      const result = await createReference(refType, name.trim(), description.trim(), imageBase64, tagList, purpose ?? undefined, mode ?? undefined);
      if (result.success) { addReference(result.reference); onOpenChange(false); }
      else setError(result.error);
    }
    setSaving(false);
  }

  const hasFile = !!(imageBase64 || videoFile);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="add-ref-dialog" showCloseButton={false} style={{ maxWidth: 520 }}>
        <div style={{ padding: 8 }}>
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 10 }}>Add Reference</div>

          {/* Upload area */}
          {!preview ? (
            <div
              className={`add-ref-upload${dragging ? " dragging" : ""}`}
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files?.[0]; if (f) handleFile(f); }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" />
              </svg>
              <span>Drop image or video, or click to upload</span>
              <input ref={fileInputRef} type="file" accept="image/*,video/*" style={{ display: "none" }} onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
            </div>
          ) : (
            <div style={{ position: "relative", marginBottom: 12 }}>
              <img src={preview} alt="Preview" style={{ width: "100%", borderRadius: 8, maxHeight: 180, objectFit: "cover" }} />
              {isVideo && (
                <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)" }}>
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="white" opacity={0.8}><polygon points="5 3 19 12 5 21" /></svg>
                </div>
              )}
              {analyzing && (
                <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(255,255,255,0.8)", borderRadius: 8 }}>
                  <div className="studio-gen-spinner" />
                  <span style={{ marginLeft: 8, fontSize: 12 }}>Analyzing...</span>
                </div>
              )}
              <button
                onClick={() => fileInputRef.current?.click()}
                style={{ position: "absolute", top: 8, right: 8, background: "rgba(0,0,0,0.5)", color: "white", border: "none", borderRadius: 4, padding: "3px 8px", fontSize: 10, cursor: "pointer" }}
              >
                Change
              </button>
              <input ref={fileInputRef} type="file" accept="image/*,video/*" style={{ display: "none" }} onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
            </div>
          )}

          {/* Type selection — REQUIRED, always visible once file uploaded */}
          {hasFile && (
            <>
              <div style={{ marginBottom: 10 }}>
                <label style={{ fontSize: 11, fontWeight: 600, color: "#555", display: "block", marginBottom: 4 }}>
                  What is this? <span style={{ color: "#C4603A", fontWeight: 400 }}>*</span>
                </label>
                <div style={{ display: "flex", gap: 6 }}>
                  {!isVideo && (
                    <>
                      <button
                        className={`sv2-cfg-pill${purpose === "scene" ? " on" : ""}`}
                        onClick={() => { setPurpose("scene"); }}
                      >
                        Scene / Background
                      </button>
                      <button
                        className={`sv2-cfg-pill${purpose === "product" ? " on" : ""}`}
                        onClick={() => { setPurpose("product"); setMode("exact"); }}
                      >
                        Product / Outfit
                      </button>
                    </>
                  )}
                  {isVideo && (
                    <button className="sv2-cfg-pill on" disabled>
                      Motion Reference
                    </button>
                  )}
                </div>
                {!purpose && !isVideo && (
                  <span style={{ fontSize: 9, color: "#C4603A", marginTop: 2, display: "block" }}>Select one to continue</span>
                )}
              </div>

              {/* Mode — Exact or Inspired (for Scene only) */}
              {purpose === "scene" && (
                <div style={{ marginBottom: 10 }}>
                  <label style={{ fontSize: 11, fontWeight: 600, color: "#555", display: "block", marginBottom: 4 }}>
                    How closely? <span style={{ color: "#C4603A", fontWeight: 400 }}>*</span>
                  </label>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button
                      className={`sv2-cfg-pill${mode === "exact" ? " on" : ""}`}
                      onClick={() => setMode("exact")}
                    >
                      Exact match
                    </button>
                    <button
                      className={`sv2-cfg-pill${mode === "inspired" ? " on" : ""}`}
                      onClick={() => setMode("inspired")}
                    >
                      Inspired by
                    </button>
                  </div>
                  {mode === null && (
                    <span style={{ fontSize: 9, color: "#C4603A", marginTop: 2, display: "block" }}>Select one to continue</span>
                  )}
                </div>
              )}

              {/* Name */}
              <div style={{ marginBottom: 8 }}>
                <label style={{ fontSize: 11, fontWeight: 600, color: "#555", display: "block", marginBottom: 2 }}>Name</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Coffee shop, Gold necklace, Dance trend"
                  style={{ width: "100%", padding: "6px 8px", fontSize: 12, border: "1px solid #EBEBEB", borderRadius: 6, fontFamily: "inherit", outline: "none" }}
                />
              </div>

              {/* Description */}
              <div style={{ marginBottom: 10 }}>
                <label style={{ fontSize: 11, fontWeight: 600, color: "#555", display: "block", marginBottom: 2 }}>
                  Description <span style={{ fontWeight: 400, color: "#BBB" }}>(helps AI use it better)</span>
                </label>
                <input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={purpose === "product" ? "e.g. layered gold chain necklace" : purpose === "scene" ? "e.g. cozy coffee shop with warm lighting" : "describe this reference..."}
                  style={{ width: "100%", padding: "6px 8px", fontSize: 12, border: "1px solid #EBEBEB", borderRadius: 6, fontFamily: "inherit", outline: "none" }}
                />
              </div>
            </>
          )}

          {error && <div style={{ fontSize: 11, color: "#e53e3e", marginBottom: 8 }}>{error}</div>}

          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={() => onOpenChange(false)}
              disabled={saving}
              style={{ flex: 1, padding: "10px 12px", background: "#F5F5F5", border: "none", borderRadius: 8, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!canSave || saving || analyzing}
              style={{
                flex: 1, padding: "10px 12px", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
                background: !canSave || saving || analyzing ? "#CCC" : "#C4603A", color: "white",
              }}
            >
              {saving ? "Saving..." : analyzing ? "Analyzing..." : "Save Reference"}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
