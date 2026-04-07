"use client";

import "./content-studio-v3.css";
import { useEffect, useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { useCreatorStore } from "@/stores/creator-store";
import { useUnifiedStudioStore } from "@/stores/unified-studio-store";
import { ContentBrowser } from "./content-browser";
import { StudioCanvas } from "./studio-canvas";
import { CreationPanel } from "./creation-panel";

export function ContentStudioV3() {
  const router = useRouter();
  const creator = useCreatorStore((s) => s.getActiveCreator());
  const creators = useCreatorStore((s) => s.creators);
  const setActiveCreator = useCreatorStore((s) => s.setActiveCreator);
  const { credits } = useCreatorStore();
  const { generating, canvasVisible } = useUnifiedStudioStore();
  const [mobileTab, setMobileTab] = useState<"browse" | "create" | "view">("create");
  const [isMobile, setIsMobile] = useState(false);
  const [browserOpen, setBrowserOpen] = useState(() => {
    if (typeof window === "undefined") return true;
    const saved = localStorage.getItem("studio-browser-open");
    return saved !== null ? saved === "true" : true;
  });

  useEffect(() => {
    localStorage.setItem("studio-browser-open", String(browserOpen));
  }, [browserOpen]);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const handleClose = useCallback(() => {
    if (generating) return;
    router.push("/workspace");
  }, [generating, router]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !useUnifiedStudioStore.getState().generating) handleClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [handleClose]);

  if (!creator) {
    return (
      <div className="sv3-overlay">
        <div className="sv3-head">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button className="sv3-x" onClick={handleClose}>&times;</button>
            <span className="sv3-title">Content Studio</span>
          </div>
        </div>
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "#888", fontSize: 14 }}>
          Select a creator first
        </div>
      </div>
    );
  }

  // Mobile layout
  if (isMobile) {
    return (
      <div className="sv3-overlay">
        <div className="sv3-head">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button className="sv3-x" onClick={handleClose}>&times;</button>
            <span className="sv3-title">Studio</span>
            <span className="sv3-badge">{creator.name}</span>
          </div>
          <span className="sv3-credits">{credits.total} credits</span>
        </div>
        <div className="sv3-body" style={{ flex: 1, overflow: "hidden" }}>
          {mobileTab === "browse" && (
            <div style={{ height: "100%", overflow: "auto" }}>
              <ContentBrowser onItemSelect={() => setMobileTab("view")} />
            </div>
          )}
          {mobileTab === "create" && (
            <div className="sv3-panel" style={{ height: "100%", overflow: "auto", borderLeft: "none" }}>
              <CreationPanel />
            </div>
          )}
          {mobileTab === "view" && (
            <div style={{ height: "100%", overflow: "auto" }}>
              <StudioCanvas />
            </div>
          )}
        </div>
        <div className="sv3-mobile-tabs">
          <button className={`sv3-mobile-tab${mobileTab === "browse" ? " active" : ""}`} onClick={() => setMobileTab("browse")}>Browse</button>
          <button className={`sv3-mobile-tab${mobileTab === "create" ? " active" : ""}`} onClick={() => setMobileTab("create")}>Create</button>
          <button className={`sv3-mobile-tab${mobileTab === "view" ? " active" : ""}`} onClick={() => setMobileTab("view")}>
            View{canvasVisible ? " ·" : ""}
          </button>
        </div>
      </div>
    );
  }

  // Desktop layout
  return (
    <div className="sv3-overlay">
      <div className="sv3-head">
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button className="sv3-x" onClick={handleClose}>&times;</button>
          <button
            className="sv3-browser-toggle"
            onClick={() => setBrowserOpen(!browserOpen)}
            title={browserOpen ? "Hide browser" : "Show browser"}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <path d="M9 3v18" />
            </svg>
          </button>
          <span className="sv3-title">Studio</span>
          {/* Creator switcher */}
          {creators.length > 1 ? (
            <select
              className="sv3-creator-select"
              value={creator.id}
              onChange={(e) => setActiveCreator(e.target.value)}
            >
              {creators.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          ) : (
            <span className="sv3-badge">{creator.name}</span>
          )}
        </div>
        <span className="sv3-credits">{credits.total} credits</span>
      </div>
      <div className={`sv3-body${canvasVisible ? " has-canvas" : ""}${!browserOpen ? " browser-hidden" : ""}`}>
        {browserOpen && (
          <div className="sv3-browser">
            <ContentBrowser />
          </div>
        )}
        {canvasVisible && (
          <div className="sv3-canvas-wrap">
            <StudioCanvas />
          </div>
        )}
        <div className="sv3-panel">
          <CreationPanel />
        </div>
      </div>
    </div>
  );
}
