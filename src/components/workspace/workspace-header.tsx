"use client";

import { useState } from "react";
import { useCreatorStore } from "@/stores/creator-store";
import { useUIStore } from "@/stores/ui-store";
import { CreatorProfile } from "./creator-profile";

export function WorkspaceHeader({
  onMenuClick,
  isMobile,
}: {
  onMenuClick?: () => void;
  isMobile?: boolean;
}) {
  const { creators, activeCreatorId, loaded } = useCreatorStore();
  const { activeView, setActiveView } = useUIStore();
  const active = creators.find((c) => c.id === activeCreatorId);
  const [profileOpen, setProfileOpen] = useState(false);

  if (!loaded) {
    return (
      <div className="skel-header">
        <div className="skel skel-header-avatar" />
        <div className="skel-header-lines">
          <div className="skel skel-header-line" style={{ width: 120 }} />
          <div className="skel skel-header-line" style={{ width: 80 }} />
        </div>
      </div>
    );
  }

  if (!active) {
    return (
      <div className="creator-profile">
        {isMobile && (
          <button onClick={onMenuClick} style={{ marginRight: "8px", color: "#888" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 12h18M3 6h18M3 18h18" />
            </svg>
          </button>
        )}
        <span style={{ fontSize: "14px", color: "#888" }}>Select a Creator</span>
      </div>
    );
  }

  const nicheLabel =
    active.niche?.[0]
      ? active.niche[0].charAt(0).toUpperCase() + active.niche[0].slice(1)
      : "";

  return (
    <>
      <div className="creator-profile">
        {/* Mobile menu trigger */}
        {isMobile && (
          <button onClick={onMenuClick} style={{ marginRight: "4px", color: "#888" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 12h18M3 6h18M3 18h18" />
            </svg>
          </button>
        )}

        {/* Creator avatar */}
        <div className="cp-avatar" onClick={() => setProfileOpen(true)}>
          {active.baseImageUrl ? (
            <img
              src={active.baseImageUrl}
              alt={active.name}
              style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top" }}
            />
          ) : (
            active.name[0]
          )}
        </div>

        {/* Creator info */}
        <div className="cp-info">
          <div className="cp-name">{active.name}</div>
          <div className="cp-meta">
            <span>{nicheLabel}</span>
            <span className="cp-meta-dot" />
            <span>{active.contentCount} items</span>
          </div>
        </div>

        {/* View tabs */}
        <div className="cp-actions">
          <button
            className={`cp-edit-btn${activeView === "chat" ? " active" : ""}`}
            onClick={() => setActiveView("chat")}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <path d="M21 15l-5-5L5 21" />
            </svg>
            Content
          </button>
          <button
            className={`cp-edit-btn${activeView === "templates" ? " active" : ""}`}
            onClick={() => setActiveView("templates")}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="7" height="7" rx="1" />
              <rect x="14" y="3" width="7" height="7" rx="1" />
              <rect x="3" y="14" width="7" height="7" rx="1" />
              <rect x="14" y="14" width="7" height="7" rx="1" />
            </svg>
            Templates
          </button>
          <span className="cp-divider" />
          <button className="cp-btn" onClick={() => setProfileOpen(true)}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
          </button>
          <button className="cp-btn">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="1" />
              <circle cx="19" cy="12" r="1" />
              <circle cx="5" cy="12" r="1" />
            </svg>
          </button>
        </div>
      </div>

      <CreatorProfile open={profileOpen} onOpenChange={setProfileOpen} />
    </>
  );
}
