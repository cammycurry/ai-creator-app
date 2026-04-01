"use client";

import "./unified-studio.css";
import { useEffect, useCallback } from "react";
import { useUIStore } from "@/stores/ui-store";
import { useCreatorStore } from "@/stores/creator-store";
import { useUnifiedStudioStore } from "@/stores/unified-studio-store";
import { StudioRefPanel } from "./studio-ref-panel";
import { StudioCreatePanel } from "./studio-create-panel";
import { StudioResults } from "./studio-results";

export function UnifiedStudio() {
  const { contentStudioOpen, setContentStudioOpen } = useUIStore();
  const creator = useCreatorStore((s) => s.getActiveCreator());
  const { credits } = useCreatorStore();
  const { generating, showResults, reset } = useUnifiedStudioStore();

  const handleClose = useCallback(() => {
    if (generating) return;
    setContentStudioOpen(false);
    reset();
  }, [generating, setContentStudioOpen, reset]);

  useEffect(() => {
    if (!contentStudioOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !useUnifiedStudioStore.getState().generating) {
        handleClose();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [contentStudioOpen, handleClose]);

  useEffect(() => {
    document.body.style.overflow = contentStudioOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [contentStudioOpen]);

  if (!contentStudioOpen) return null;

  return (
    <div className="us-overlay">
      <div className="us-header">
        <div className="us-header-left">
          <button className="us-close" onClick={handleClose}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
          <span className="us-title">Content Studio</span>
          {creator && <span className="us-creator-badge">{creator.name}</span>}
        </div>
        <span className="us-credits">{credits.total} credits</span>
      </div>
      <div className="us-body">
        <StudioRefPanel />
        {showResults ? <StudioResults /> : <StudioCreatePanel />}
      </div>
    </div>
  );
}
