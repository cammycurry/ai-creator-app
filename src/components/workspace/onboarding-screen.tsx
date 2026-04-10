"use client";

import { useState } from "react";
import { useUIStore } from "@/stores/ui-store";
import { PreMadeScreen } from "./premade-library";

export function OnboardingScreen() {
  const { setCreatorStudioOpen } = useUIStore();
  const [showPremade, setShowPremade] = useState(false);

  if (showPremade) {
    return <PreMadeScreen onBack={() => setShowPremade(false)} />;
  }

  return (
    <div className="ob-screen">
      <div className="ob-logo">
        <div className="ob-logo-mark">Vi</div>
        <span className="ob-logo-text">realinfluencer.ai</span>
      </div>

      <div className="ob-center">
        <h1 className="ob-title">Create your first AI influencer</h1>
        <p className="ob-subtitle">
          Build a custom character from scratch or pick from our ready-made collection
        </p>

        <div className="ob-cards">
          <button className="ob-card" onClick={() => setCreatorStudioOpen(true)}>
            <div className="ob-card-icon">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M12 3v18M3 12h18" />
              </svg>
            </div>
            <div className="ob-card-title">Build Your Own</div>
            <div className="ob-card-desc">Full creative control. Choose every trait — face, body, hair, style.</div>
          </button>

          <button className="ob-card" onClick={() => setShowPremade(true)}>
            <div className="ob-card-icon">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="3" y="3" width="7" height="7" rx="1" />
                <rect x="14" y="3" width="7" height="7" rx="1" />
                <rect x="3" y="14" width="7" height="7" rx="1" />
                <rect x="14" y="14" width="7" height="7" rx="1" />
              </svg>
            </div>
            <div className="ob-card-title">Pick a Pre-Made</div>
            <div className="ob-card-desc">Ready to go. Start creating content immediately with a pre-built character.</div>
          </button>
        </div>

        <p className="ob-credits">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
          10 free credits to get started
        </p>
      </div>
    </div>
  );
}
