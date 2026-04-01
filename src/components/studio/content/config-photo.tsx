"use client";

import { useUnifiedStudioStore } from "@/stores/unified-studio-store";

export function ConfigPhoto() {
  const { imageCount, setImageCount } = useUnifiedStudioStore();

  return (
    <div className="us-config-section">
      <div className="us-config-label">Photo Settings</div>
      <div className="us-config-row">
        <span className="us-config-row-label">Images</span>
        <div style={{ display: "flex", gap: 4 }}>
          {[1, 2, 3, 4].map((n) => (
            <button
              key={n}
              className={`us-count-btn${imageCount === n ? " active" : ""}`}
              onClick={() => setImageCount(n)}
            >
              {n}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
