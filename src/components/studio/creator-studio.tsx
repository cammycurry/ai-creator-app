"use client";

import "./studio.css";
import { useEffect, useCallback } from "react";
import { useUIStore } from "@/stores/ui-store";
import { useStudioStore } from "@/stores/studio-store";
import { StudioPreview } from "./studio-preview";
import { StudioCreatePage } from "./studio-create-page";
import { StudioFooter } from "./studio-footer";
import { StudioFinishing } from "./studio-finishing";

const STEPS = [
  { key: "customize", label: "Design" },
  { key: "pick", label: "Generate" },
  { key: "finish", label: "Save" },
];

function getStepIndex(phase: string): number {
  if (phase === "customize") return 0;
  if (phase === "generating" || phase === "picking") return 1;
  return 2; // finishing
}

function TraitSummary() {
  const { traits } = useStudioStore();
  const items: string[] = [];
  if (traits.gender) items.push(traits.gender);
  if (traits.age) items.push(`Age ${traits.age}`);
  if (traits.ethnicity) items.push(traits.ethnicity);
  if (traits.build) items.push(traits.build);
  if (traits.vibes.length > 0) items.push(traits.vibes.join(", "));
  if (items.length === 0) return null;
  return (
    <div className="studio-summary">
      {items.map((item) => (
        <span key={item} className="studio-summary-tag">{item}</span>
      ))}
    </div>
  );
}

export function CreatorStudio({ fullScreen = false }: { fullScreen?: boolean }) {
  const { creatorStudioOpen, setCreatorStudioOpen } = useUIStore();
  const { reset, phase } = useStudioStore();
  const currentStep = getStepIndex(phase);

  const handleClose = useCallback(() => {
    setCreatorStudioOpen(false);
    reset();
  }, [setCreatorStudioOpen, reset]);

  useEffect(() => {
    if (!creatorStudioOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        const currentPhase = useStudioStore.getState().phase;
        if (currentPhase === "customize") {
          handleClose();
        }
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [creatorStudioOpen, handleClose]);

  useEffect(() => {
    if (creatorStudioOpen && !fullScreen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [creatorStudioOpen, fullScreen]);

  if (!creatorStudioOpen) return null;

  const studioInner = (
    <>
      {/* Header */}
      <div className="studio-header">
        <div className="studio-header-left">
          <button className="studio-close" onClick={handleClose}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </button>
          <span className="studio-title">Create Your Influencer</span>
        </div>
        <div className="studio-steps">
          {STEPS.map((step, i) => (
            <div key={step.key} className={`studio-step${i === currentStep ? " active" : ""}${i < currentStep ? " done" : ""}`}>
              <span className="studio-step-num">{i < currentStep ? "✓" : i + 1}</span>
              <span className="studio-step-label">{step.label}</span>
              {i < STEPS.length - 1 && <span className="studio-step-sep" />}
            </div>
          ))}
        </div>
      </div>

      {/* Body */}
      {phase === "customize" ? (
        <div className="studio-body">
          <div className="studio-preview-strip">
            <div className="studio-preview-strip-text">
              <span className="studio-preview-strip-title">Design your reference look</span>
              <span className="studio-preview-strip-hint">This becomes the base for all future content. Describe or customize below.</span>
            </div>
            <TraitSummary />
          </div>
          <StudioCreatePage />
        </div>
      ) : phase === "finishing" ? (
        <div className="studio-body">
          <StudioFinishing />
        </div>
      ) : (
        <div className="studio-body">
          <StudioPreview />
        </div>
      )}

      {/* Footer */}
      <StudioFooter />
    </>
  );

  if (fullScreen) {
    return (
      <div className="studio-fullscreen">
        <div className="studio-content studio-content-full">
          {studioInner}
        </div>
      </div>
    );
  }

  return (
    <div
      className="studio-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          const currentPhase = useStudioStore.getState().phase;
          if (currentPhase === "customize") {
            handleClose();
          }
        }
      }}
    >
      <div className="studio-content" onClick={(e) => e.stopPropagation()}>
        {studioInner}
      </div>
    </div>
  );
}
