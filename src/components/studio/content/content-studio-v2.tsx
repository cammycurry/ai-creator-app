"use client";

import "./content-studio-v2.css";
import { useEffect, useCallback } from "react";
import { useUIStore } from "@/stores/ui-store";
import { useCreatorStore } from "@/stores/creator-store";
import { useUnifiedStudioStore } from "@/stores/unified-studio-store";
import { LibraryPanel } from "./library-panel";
import { CreationPanel } from "./creation-panel";
import { CreationResults } from "./creation-results";

export function ContentStudioV2() {
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
      if (e.key === "Escape" && !useUnifiedStudioStore.getState().generating) handleClose();
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
    <div className="sv2-overlay">
      <div className="sv2-head">
        <div className="sv2-head-l">
          <button className="sv2-x" onClick={handleClose}>&times;</button>
          <span className="sv2-title">Create Content</span>
          {creator && <span className="sv2-badge">{creator.name}</span>}
        </div>
        <span className="sv2-credits">{credits.total} credits</span>
      </div>
      <div className="sv2-body">
        <LibraryPanel />
        {showResults ? <CreationResults /> : <CreationPanel />}
      </div>
    </div>
  );
}
