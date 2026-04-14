"use client";

import { useEffect } from "react";
import { useCreatorStore } from "@/stores/creator-store";
import { getWorkspaceData } from "@/server/actions/workspace-actions";

export function CreatorList({ onCreatorClick }: { onCreatorClick?: () => void }) {
  const { creators, activeCreatorId, setActiveCreator, setCreators, setCredits, loaded } = useCreatorStore();

  // Poll creators every 10s so sidebar activity dots stay fresh across all
  // creators, not just the one currently being viewed. Pauses when tab hidden.
  const hasAnyGenerating = creators.some((c) => c.generatingCount > 0);
  useEffect(() => {
    if (!loaded) return;
    let stopped = false;

    const pollOnce = async () => {
      if (stopped) return;
      if (typeof document !== "undefined" && document.visibilityState === "hidden") return;
      const data = await getWorkspaceData();
      if (stopped) return;
      setCreators(data.creators);
      setCredits(data.balance);
    };

    // Poll faster when something is actually generating
    const interval = setInterval(pollOnce, hasAnyGenerating ? 5000 : 15000);
    const onVisibility = () => {
      if (document.visibilityState === "visible") pollOnce();
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      stopped = true;
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [loaded, hasAnyGenerating, setCreators, setCredits]);

  if (!loaded) {
    return (
      <>
        {[1, 2, 3].map((i) => (
          <div key={i} className="skel-sidebar-item">
            <div className="skel skel-sidebar-avatar" />
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4 }}>
              <div className="skel skel-sidebar-line" style={{ width: "70%" }} />
              <div className="skel skel-sidebar-line" style={{ width: "40%" }} />
            </div>
          </div>
        ))}
      </>
    );
  }

  return (
    <>
      {creators.map((creator) => {
        const isActive = creator.id === activeCreatorId;
        const isGenerating = creator.generatingCount > 0;
        const initials = creator.name
          .split(" ")
          .map((n) => n[0])
          .join("")
          .slice(0, 2);

        return (
          <button
            key={creator.id}
            onClick={() => {
              setActiveCreator(creator.id);
              onCreatorClick?.();
            }}
            className={`creator-item${isActive ? " active" : ""}`}
          >
            <div className="creator-avatar">
              {creator.baseImageUrl ? (
                <img src={creator.baseImageUrl} alt={creator.name} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top", borderRadius: "inherit" }} />
              ) : (
                initials
              )}
            </div>
            <div className="creator-meta">
              <div className="creator-name">
                {creator.name}
                {isGenerating && <span className="creator-gen-dot" aria-label={`${creator.generatingCount} generating`} />}
              </div>
              <div className="creator-count">{creator.contentCount} items</div>
            </div>
          </button>
        );
      })}
    </>
  );
}
