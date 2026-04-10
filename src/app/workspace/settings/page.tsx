"use client";

import { useState, useEffect } from "react";
import { UserProfile } from "@clerk/nextjs";
import { useCreatorStore } from "@/stores/creator-store";
import Link from "next/link";

export default function SettingsPage() {
  const { credits } = useCreatorStore();
  const [showClerk, setShowClerk] = useState(false);

  return (
    <div className="settings-page">
      <h1 className="settings-heading">Settings</h1>

      {/* Account section */}
      <div className="settings-section">
        <div className="settings-section-label">Account</div>
        <div className="settings-card">
          <button
            className="settings-row"
            onClick={() => setShowClerk(!showClerk)}
          >
            <span>Manage Account</span>
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              style={{
                transform: showClerk ? "rotate(90deg)" : undefined,
                transition: "transform 150ms",
              }}
            >
              <path d="M9 18l6-6-6-6" />
            </svg>
          </button>
          {showClerk && (
            <div style={{ padding: "16px" }}>
              <UserProfile
                appearance={{
                  elements: {
                    rootBox: "w-full",
                    cardBox: "shadow-none border-0",
                    card: "border-0 shadow-none p-0",
                  },
                }}
              />
            </div>
          )}
        </div>
      </div>

      {/* Credits section */}
      <div className="settings-section">
        <div className="settings-section-label">Credits</div>
        <div className="settings-card">
          <div className="settings-row">
            <span>Current Balance</span>
            <span style={{ fontFamily: "var(--font-mono)", fontWeight: 600 }}>
              {credits.total} credits
            </span>
          </div>
          <div className="settings-row">
            <span>Plan Credits</span>
            <span style={{ fontFamily: "var(--font-mono)" }}>
              {credits.planCredits}
            </span>
          </div>
          <div className="settings-row">
            <span>Pack Credits</span>
            <span style={{ fontFamily: "var(--font-mono)" }}>
              {credits.packCredits}
            </span>
          </div>
          <div style={{ padding: "0 16px 16px" }}>
            <Link href="/workspace/billing" className="settings-link-btn">
              Manage Plan & Buy Credits
            </Link>
          </div>
        </div>
      </div>

      {/* Generation defaults */}
      <div className="settings-section">
        <div className="settings-section-label">Generation Defaults</div>
        <div className="settings-card">
          <div className="settings-row">
            <span>Default Image Count</span>
            <span style={{ fontFamily: "var(--font-mono)" }}>1</span>
          </div>
          <div className="settings-row">
            <span>Prompt Enhancement</span>
            <span style={{ color: "var(--accent)", fontSize: 12 }}>Enabled</span>
          </div>
        </div>
      </div>

      {/* About */}
      <div className="settings-section">
        <div className="settings-section-label">About</div>
        <div className="settings-card">
          <div className="settings-row">
            <span>Version</span>
            <span style={{ fontFamily: "var(--font-mono)", color: "var(--text-muted)" }}>0.1.0 beta</span>
          </div>
        </div>
      </div>
    </div>
  );
}
