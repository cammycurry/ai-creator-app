"use client";

import { useState } from "react";
import { useUnifiedStudioStore } from "@/stores/unified-studio-store";

export function CreationPhoto() {
  const { imageCount, setImageCount, aspectRatio, setAspectRatio } = useUnifiedStudioStore();
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="sv2-config">
      <div className="sv2-config-row">
        <span className="sv2-config-label">Photos</span>
        <div className="sv2-cfg-btns">
          {[1, 2, 3, 4].map((n) => (
            <button
              key={n}
              className={`sv2-cfg-btn${imageCount === n ? " on" : ""}`}
              onClick={() => setImageCount(n)}
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      <button className="sv2-more-toggle" onClick={() => setExpanded((v) => !v)}>
        {expanded ? "Less options" : "More options"}
      </button>

      {expanded && (
        <div className="sv2-config-row">
          <span className="sv2-config-label">Ratio</span>
          <div className="sv2-cfg-pills">
            {(["portrait", "square", "landscape"] as const).map((r) => (
              <button
                key={r}
                className={`sv2-cfg-pill${aspectRatio === r ? " on" : ""}`}
                onClick={() => setAspectRatio(r)}
              >
                {r}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
