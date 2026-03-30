"use client";

import "./content-studio.css";
import { useEffect, useCallback } from "react";
import { useUIStore } from "@/stores/ui-store";
import { useContentStudioStore } from "@/stores/content-studio-store";
import { StudioLibrary } from "./studio-library";
import { StudioBuilder } from "./studio-builder";
import { StudioReview } from "./studio-review";

const STEPS = [
  { key: "library", label: "Browse" },
  { key: "builder", label: "Customize" },
  { key: "review", label: "Generate" },
];

function getStepIndex(step: string): number {
  if (step === "library") return 0;
  if (step === "builder") return 1;
  return 2;
}

export function ContentStudio() {
  const { contentStudioOpen, setContentStudioOpen } = useUIStore();
  const { step, reset, generating } = useContentStudioStore();
  const currentStep = getStepIndex(step);

  const handleClose = useCallback(() => {
    if (generating) return; // Don't close during generation
    setContentStudioOpen(false);
    reset();
  }, [setContentStudioOpen, reset, generating]);

  // Escape to close (only on library step)
  useEffect(() => {
    if (!contentStudioOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        const currentStep = useContentStudioStore.getState().step;
        if (currentStep === "library") {
          handleClose();
        }
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [contentStudioOpen, handleClose]);

  // Lock body scroll
  useEffect(() => {
    if (contentStudioOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [contentStudioOpen]);

  if (!contentStudioOpen) return null;

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
          <span className="cs-title">Content Studio</span>
        </div>
        <div className="cs-steps">
          {STEPS.map((s, i) => (
            <div key={s.key} className={`cs-step${i === currentStep ? " active" : ""}${i < currentStep ? " done" : ""}`}>
              <span className="cs-step-num">{i < currentStep ? "✓" : i + 1}</span>
              <span className="cs-step-label">{s.label}</span>
              {i < STEPS.length - 1 && <span className="cs-step-sep" />}
            </div>
          ))}
        </div>
      </div>

      {/* Body */}
      <div className="cs-body">
        {step === "library" && <StudioLibrary />}
        {step === "builder" && <StudioBuilder />}
        {step === "review" && <StudioReview />}
      </div>
    </div>
  );
}
