"use client";

import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import { CreatorList } from "./creator-list";
import { useUIStore } from "@/stores/ui-store";
import { useCreatorStore } from "@/stores/creator-store";

export function AppSidebar({ onClose }: { onClose?: () => void }) {
  const { setCreatorStudioOpen, setActiveView } = useUIStore();
  const { credits } = useCreatorStore();

  const isLow = credits.total <= 10 && credits.total > 0;
  const isZero = credits.total === 0;

  return (
    <>
      {/* Header */}
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <div className="logo-mark">Vi</div>
          <span>realinfluencer.ai</span>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ color: "#BBBBBB" }}>
            <path d="M6 9l6 6 6-6" />
          </svg>
        </div>
        <div className="sidebar-actions">
          <button>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="5" />
              <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
            </svg>
          </button>
        </div>
      </div>

      {/* Creator section */}
      <div className="sidebar-section">
        <div className="sidebar-section-label">Creators</div>
        <button
          onClick={() => setCreatorStudioOpen(true)}
          className="new-creator-btn"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 5v14M5 12h14" />
          </svg>
          New Creator
        </button>
        <CreatorList onCreatorClick={onClose} />
        <div style={{ height: 1, background: "var(--border, #EBEBEB)", margin: "8px 0" }} />
        <button
          onClick={() => {
            useUIStore.getState().setContentStudioOpen(true);
            onClose?.();
          }}
          className="sidebar-tool-btn"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polygon points="5 3 19 12 5 21 5 3" />
          </svg>
          Create Content
        </button>
        <button
          onClick={() => { setActiveView("library"); onClose?.(); }}
          className="sidebar-tool-btn"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <path d="M21 15l-5-5L5 21" />
          </svg>
          References
        </button>
      </div>

      {/* Footer */}
      <div className="sidebar-footer">
        <Link href="/workspace/billing" className="credits-display" style={{
          textDecoration: "none",
          color: isZero ? "#e53e3e" : isLow ? "#dd6b20" : undefined,
        }}>
          <span className="credits-dot" style={{
            background: isZero ? "#e53e3e" : isLow ? "#dd6b20" : "#4CAF50",
          }} />
          {credits.total} credits
          {(isLow || isZero) && (
            <span style={{ fontSize: 10, marginLeft: 4, fontWeight: 500 }}>
              {isZero ? "Buy more" : "Low"}
            </span>
          )}
        </Link>
        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          <Link href="/workspace/billing" className="tool-btn">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12.22 2h-.44a2 2 0 00-2 2v.18a2 2 0 01-1 1.73l-.43.25a2 2 0 01-2 0l-.15-.08a2 2 0 00-2.73.73l-.22.38a2 2 0 00.73 2.73l.15.1a2 2 0 011 1.72v.51a2 2 0 01-1 1.74l-.15.09a2 2 0 00-.73 2.73l.22.38a2 2 0 002.73.73l.15-.08a2 2 0 012 0l.43.25a2 2 0 011 1.73V20a2 2 0 002 2h.44a2 2 0 002-2v-.18a2 2 0 011-1.73l.43-.25a2 2 0 012 0l.15.08a2 2 0 002.73-.73l.22-.39a2 2 0 00-.73-2.73l-.15-.08a2 2 0 01-1-1.74v-.5a2 2 0 011-1.74l.15-.09a2 2 0 00.73-2.73l-.22-.38a2 2 0 00-2.73-.73l-.15.08a2 2 0 01-2 0l-.43-.25a2 2 0 01-1-1.73V4a2 2 0 00-2-2z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          </Link>
          <UserButton
            appearance={{
              elements: { avatarBox: "h-6 w-6 rounded-md" },
            }}
          />
        </div>
      </div>
    </>
  );
}
