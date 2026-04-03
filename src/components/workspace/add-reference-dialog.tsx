"use client";

import { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useCreatorStore } from "@/stores/creator-store";
import { analyzeReferenceImage, createReference } from "@/server/actions/reference-actions";
import { REFERENCE_TYPES, REFERENCE_TYPE_LABELS, type ReferenceType } from "@/types/reference";

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
        resolve(dataUrl.split(",")[1]); // base64 only
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
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

  const [imageBase64, setImageBase64] = useState<string>("");
  const [imagePreview, setImagePreview] = useState<string>("");
  const [type, setType] = useState<ReferenceType>("REFERENCE");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  // When dialog opens with a prefill image, set it and trigger analysis
  useEffect(() => {
    if (open && prefillImageBase64) {
      setImageBase64(prefillImageBase64);
      setImagePreview(`data:image/jpeg;base64,${prefillImageBase64}`);
      runAnalysis(prefillImageBase64);
    }
  }, [open, prefillImageBase64]);

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      setImageBase64("");
      setImagePreview("");
      setType("REFERENCE");
      setName("");
      setDescription("");
      setTags("");
      setAnalyzing(false);
      setSaving(false);
      setError(null);
    }
  }, [open]);

  async function runAnalysis(base64: string) {
    setAnalyzing(true);
    setError(null);
    try {
      const result = await analyzeReferenceImage(base64);
      setType(result.type);
      setName(result.name);
      setDescription(result.description);
      setTags(result.tags.join(", "));
    } catch {
      // silently fail — user can fill in manually
    } finally {
      setAnalyzing(false);
    }
  }

  async function handleFile(file: File) {
    if (!file.type.startsWith("image/")) return;
    setError(null);
    const base64 = await resizeImage(file);
    setImageBase64(base64);
    setImagePreview(`data:image/jpeg;base64,${base64}`);
    await runAnalysis(base64);
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  }

  async function handleSave() {
    if (!imageBase64) { setError("Please upload an image"); return; }
    if (!name.trim()) { setError("Please enter a name"); return; }

    setSaving(true);
    setError(null);

    const tagList = tags.split(",").map((t) => t.trim()).filter(Boolean);
    const result = await createReference(
      type,
      name.trim(),
      description.trim(),
      imageBase64,
      tagList
    );

    if (result.success) {
      addReference(result.reference);
      onOpenChange(false);
    } else {
      setError(result.error);
    }
    setSaving(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="add-ref-dialog" showCloseButton={false}>
        <div className="add-ref-title">Add Reference</div>

        {/* Upload area */}
        {!imagePreview ? (
          <div
            className={`add-ref-upload${dragging ? " dragging" : ""}`}
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" />
            </svg>
            <span>Drop image or click to upload</span>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={handleFileInput}
            />
          </div>
        ) : (
          <div className="add-ref-preview">
            <img src={imagePreview} alt="Preview" />
            {analyzing && (
              <div className="add-ref-analyzing">
                <div className="studio-gen-spinner" />
                <span>Analyzing...</span>
              </div>
            )}
            <button
              className="add-ref-change"
              onClick={() => fileInputRef.current?.click()}
            >
              Change
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={handleFileInput}
            />
          </div>
        )}

        {/* Fields */}
        <div className="add-ref-fields">
          <div className="add-ref-field">
            <label className="add-ref-label">Type</label>
            <select
              className="add-ref-select"
              value={type}
              onChange={(e) => setType(e.target.value as ReferenceType)}
              style={{ fontSize: 16 }}
            >
              {REFERENCE_TYPES.map((t) => (
                <option key={t} value={t}>{REFERENCE_TYPE_LABELS[t]}</option>
              ))}
            </select>
          </div>

          <div className="add-ref-field">
            <label className="add-ref-label">Name</label>
            <input
              className="add-ref-input"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Rooftop Sunset"
              style={{ fontSize: 16 }}
            />
          </div>

          <div className="add-ref-field">
            <label className="add-ref-label">Description</label>
            <textarea
              className="add-ref-textarea"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what this reference shows..."
              style={{ fontSize: 16 }}
              rows={3}
            />
          </div>

          <div className="add-ref-field">
            <label className="add-ref-label">Tags (comma separated)</label>
            <input
              className="add-ref-input"
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="e.g. outdoor, golden hour, urban"
              style={{ fontSize: 16 }}
            />
          </div>
        </div>

        {error && <div className="add-ref-error">{error}</div>}

        <div className="add-ref-actions">
          <button
            className="studio-btn secondary"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Cancel
          </button>
          <button
            className="studio-btn primary"
            onClick={handleSave}
            disabled={saving || analyzing || !imageBase64}
          >
            {saving ? "Saving..." : "Save Reference"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
