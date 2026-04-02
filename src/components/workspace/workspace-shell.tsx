"use client";

import "@/app/workspace/workspace.css";
import "@/app/workspace/reference-library.css";
import { useAuth } from "@clerk/nextjs";
import { useIsMobile } from "@/hooks/use-mobile";
import { useCreatorStore } from "@/stores/creator-store";
import { useUIStore } from "@/stores/ui-store";
import { AppSidebar } from "@/components/workspace/app-sidebar";
import { WorkspaceHeader } from "@/components/workspace/workspace-header";
import { WorkspaceInit } from "@/components/workspace/workspace-init";
import { CreatorStudio } from "@/components/studio/creator-studio";
import { ContentStudioV2 } from "@/components/studio/content/content-studio-v2";
import { OnboardingScreen } from "@/components/workspace/onboarding-screen";
import { WorkspaceGate } from "@/components/workspace/workspace-gate";
import { useState, useEffect } from "react";

export function WorkspaceShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isSignedIn, isLoaded: authLoaded } = useAuth();
  const isMobile = useIsMobile();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { creators, loaded } = useCreatorStore();
  const { creatorStudioOpen } = useUIStore();
  const isOnboarding = loaded && creators.length === 0;

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileOpen(false);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  // Hide loader only after data is loaded
  useEffect(() => {
    if (!loaded) return;
    const el = document.getElementById("app-loader");
    if (el) {
      el.classList.add("loaded");
      setTimeout(() => el.remove(), 400);
    }
  }, [loaded]);

  // Not signed in — show SEO-friendly marketing content
  if (authLoaded && !isSignedIn) {
    return <WorkspaceGate />;
  }

  return (
    <>
      <WorkspaceInit />

      {/* Loading screen — stays visible until data loads */}
      {(!authLoaded || !loaded) && (
        <div id="app-loader">
          <div id="app-loader-mark">Vi</div>
          <div id="app-loader-bar" />
        </div>
      )}

      {loaded && isOnboarding ? (
        <>
          <CreatorStudio fullScreen />
          <ContentStudioV2 />
          {!creatorStudioOpen && <OnboardingScreen />}
        </>
      ) : loaded ? (
        <>
          <CreatorStudio />
          <ContentStudioV2 />
          <div className="workspace app-shell">
            {!isMobile && (
              <aside className="ws-sidebar">
                <AppSidebar />
              </aside>
            )}

            {isMobile && mobileOpen && (
              <>
                <div
                  className="fixed inset-0 z-30 bg-black/40"
                  onClick={() => setMobileOpen(false)}
                />
                <aside className="ws-sidebar fixed inset-y-0 left-0 z-[35]">
                  <AppSidebar onClose={() => setMobileOpen(false)} />
                </aside>
              </>
            )}

            <div className="main-canvas">
              <WorkspaceHeader
                onMenuClick={() => setMobileOpen(true)}
                isMobile={isMobile}
              />
              {children}
            </div>
          </div>
        </>
      ) : null}
    </>
  );
}
