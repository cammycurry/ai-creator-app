"use client";

import { useCallback, useRef } from "react";
import { useStudioStore, type ReferenceImage } from "@/stores/studio-store";

const SLOTS = [
  { id: "face" as const, label: "Face", hint: "Upload a face reference" },
  { id: "body" as const, label: "Body", hint: "Upload a body reference" },
  { id: "full" as const, label: "Full", hint: "Upload a full photo" },
];

const MAX_SIZE = 1024;

async function resizeImage(file: File): Promise<{ dataUrl: string; base64: string; mimeType: string }> {
  return new Promise((resolve) => {
    const img = new Image();
    const reader = new FileReader();
    reader.onload = () => {
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let { width, height } = img;
        if (width > MAX_SIZE || height > MAX_SIZE) {
          if (width > height) {
            height = Math.round((height / width) * MAX_SIZE);
            width = MAX_SIZE;
          } else {
            width = Math.round((width / height) * MAX_SIZE);
            height = MAX_SIZE;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
        const base64 = dataUrl.split(",")[1];
        resolve({ dataUrl, base64, mimeType: "image/jpeg" });
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

function UploadSlot({ slot }: { slot: typeof SLOTS[number] }) {
  const { referenceImages, addReferenceImage, removeReferenceImage } = useStudioStore();
  const inputRef = useRef<HTMLInputElement>(null);
  const existing = referenceImages.find((r) => r.slot === slot.id);

  const handleFile = useCallback(async (file: File) => {
    if (!file.type.startsWith("image/")) return;
    const { dataUrl, base64, mimeType } = await resizeImage(file);
    addReferenceImage({ slot: slot.id, dataUrl, base64, mimeType });
  }, [slot.id, addReferenceImage]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  if (existing) {
    return (
      <div className="studio-ref-slot studio-ref-filled">
        <img src={existing.dataUrl} alt={slot.label} />
        <button
          className="studio-ref-remove"
          onClick={() => removeReferenceImage(slot.id)}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
        <span className="studio-ref-slot-label">{slot.label}</span>
      </div>
    );
  }

  return (
    <div
      className="studio-ref-slot"
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        style={{ display: "none" }}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = "";
        }}
      />
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ opacity: 0.4 }}>
        <path d="M12 5v14M5 12h14" />
      </svg>
      <span className="studio-ref-slot-label">{slot.label}</span>
    </div>
  );
}

export function ReferenceUpload() {
  const { referenceMode, setReferenceMode } = useStudioStore();

  return (
    <div className="studio-section">
      <div className="studio-section-label">Upload a reference</div>
      <div className="studio-ref-grid">
        {SLOTS.map((slot) => (
          <UploadSlot key={slot.id} slot={slot} />
        ))}
      </div>
      <div className="studio-ref-mode">
        <button
          className={`studio-ref-mode-btn${referenceMode === "exact" ? " active" : ""}`}
          onClick={() => setReferenceMode("exact")}
        >
          Exact look
        </button>
        <button
          className={`studio-ref-mode-btn${referenceMode === "inspired" ? " active" : ""}`}
          onClick={() => setReferenceMode("inspired")}
        >
          Inspired by
        </button>
      </div>
    </div>
  );
}
