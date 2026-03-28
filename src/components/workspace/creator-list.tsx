"use client";

import { useCreatorStore } from "@/stores/creator-store";

export function CreatorList({ onCreatorClick }: { onCreatorClick?: () => void }) {
  const { creators, activeCreatorId, setActiveCreator, loaded } = useCreatorStore();

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
              <div className="creator-name">{creator.name}</div>
              <div className="creator-count">{creator.contentCount} items</div>
            </div>
          </button>
        );
      })}
    </>
  );
}
