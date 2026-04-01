"use client";

import { useUnifiedStudioStore } from "@/stores/unified-studio-store";
import { useCreatorStore } from "@/stores/creator-store";
import { CREDIT_COSTS } from "@/types/credits";

const SOURCE_MODES = [
  { value: "text" as const, label: "From text" },
  { value: "photo" as const, label: "From photo" },
  { value: "motion" as const, label: "Motion transfer" },
];

const ASPECT_RATIOS = [
  { value: "9:16" as const, label: "9:16 Portrait" },
  { value: "1:1" as const, label: "1:1 Square" },
  { value: "16:9" as const, label: "16:9 Landscape" },
];

export function ConfigVideo() {
  const {
    videoSource,
    videoDuration,
    videoAspectRatio,
    sourceContentId,
    setVideoSource,
    setVideoDuration,
    setVideoAspectRatio,
    setSourceContentId,
  } = useUnifiedStudioStore();

  const content = useCreatorStore((s) => s.content);

  const recentPhotos = content
    .filter((item) => item.type === "IMAGE" && item.status === "COMPLETED" && item.url)
    .slice(0, 8);

  return (
    <div className="us-config-section">
      <div className="us-config-label">Video Settings</div>

      <div className="us-config-row" style={{ marginBottom: 10 }}>
        <span className="us-config-row-label">Source</span>
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
          {SOURCE_MODES.map(({ value, label }) => (
            <button
              key={value}
              className={`us-template-chip${videoSource === value ? " active" : ""}`}
              onClick={() => setVideoSource(value)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="us-config-row" style={{ marginBottom: 10 }}>
        <span className="us-config-row-label">Duration</span>
        <div style={{ display: "flex", gap: 6, flex: 1 }}>
          <button
            className={`us-duration-btn${videoDuration === 5 ? " active" : ""}`}
            onClick={() => setVideoDuration(5)}
          >
            5s — {CREDIT_COSTS.VIDEO_5S} credits
          </button>
          <button
            className={`us-duration-btn${videoDuration === 10 ? " active" : ""}`}
            onClick={() => setVideoDuration(10)}
          >
            10s — {CREDIT_COSTS.VIDEO_10S} credits
          </button>
        </div>
      </div>

      <div className="us-config-row" style={{ marginBottom: videoSource === "photo" || videoSource === "motion" ? 12 : 0 }}>
        <span className="us-config-row-label">Ratio</span>
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
          {ASPECT_RATIOS.map(({ value, label }) => (
            <button
              key={value}
              className={`us-template-chip${videoAspectRatio === value ? " active" : ""}`}
              onClick={() => setVideoAspectRatio(value)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {videoSource === "photo" && (
        <div style={{ marginTop: 12 }}>
          <div style={{ fontSize: 11, color: "#888", marginBottom: 8 }}>
            Select source photo
          </div>
          {recentPhotos.length === 0 ? (
            <div style={{ fontSize: 12, color: "#BBB", padding: "8px 0" }}>
              No photos yet — generate some first.
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6 }}>
              {recentPhotos.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setSourceContentId(sourceContentId === item.id ? null : item.id)}
                  style={{
                    padding: 0,
                    border: `2px solid ${sourceContentId === item.id ? "#C4603A" : "#EBEBEB"}`,
                    borderRadius: 8,
                    overflow: "hidden",
                    cursor: "pointer",
                    background: "none",
                    aspectRatio: "1",
                  }}
                >
                  <img
                    src={item.url}
                    alt=""
                    style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                  />
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {videoSource === "motion" && (
        <div
          style={{
            marginTop: 12,
            padding: "10px 12px",
            background: "#FFF8F5",
            border: "1px solid #F0D4C8",
            borderRadius: 8,
            fontSize: 12,
            color: "#C4603A",
          }}
        >
          Upload a movement/dance video in the reference panel on the left.
        </div>
      )}
    </div>
  );
}
