"use client";

import "./content-studio-v3.css";
import { useEffect, useCallback, useState, useRef } from "react";
import { useUIStore } from "@/stores/ui-store";
import { useCreatorStore } from "@/stores/creator-store";
import { useUnifiedStudioStore } from "@/stores/unified-studio-store";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";
import { usePanelRef } from "react-resizable-panels";
import { ContentBrowser } from "./content-browser";
import { StudioCanvas } from "./studio-canvas";
import { CreationPanel } from "./creation-panel";

export function ContentStudioV3() {
  const { contentStudioOpen, setContentStudioOpen } = useUIStore();
  const creator = useCreatorStore((s) => s.getActiveCreator());
  const { credits } = useCreatorStore();
  const { generating, canvasVisible, reset } = useUnifiedStudioStore();
  const [mobileTab, setMobileTab] = useState<"browse" | "create" | "view">("create");
  const [isMobile, setIsMobile] = useState(false);
  const canvasPanelRef = usePanelRef();

  // Expand/collapse canvas panel when canvasVisible changes
  useEffect(() => {
    if (!canvasPanelRef.current) return;
    if (canvasVisible) {
      canvasPanelRef.current.resize(45);
    } else {
      canvasPanelRef.current.collapse();
    }
  }, [canvasVisible]);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

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
            <span className="sv3-title">Content Studio</span>
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
            View{canvasVisible ? " \u00b7" : ""}
          </button>
        </div>
      </div>
    );
  }

  // Desktop layout with resizable panels
  return (
    <div className="sv3-overlay">
      <div className="sv3-head">
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button className="sv3-x" onClick={handleClose}>&times;</button>
          <span className="sv3-title">Content Studio</span>
          <span className="sv3-badge">{creator.name}</span>
        </div>
        <span className="sv3-credits">{credits.total} credits</span>
      </div>
      <div className="sv3-body">
        <ResizablePanelGroup orientation="horizontal">
          <ResizablePanel defaultSize={20} minSize={15} maxSize={35}>
            <div className="sv3-browser">
              <ContentBrowser />
            </div>
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel
            panelRef={canvasPanelRef}
            defaultSize={0}
            minSize={0}
            collapsible
            collapsedSize={0}
                     >
            <div className="sv3-canvas-wrap">
              <StudioCanvas />
            </div>
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel defaultSize={80} minSize={25}>
            <div className="sv3-panel">
              <CreationPanel />
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </div>
  );
}
