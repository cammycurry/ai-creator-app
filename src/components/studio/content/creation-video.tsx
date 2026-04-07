"use client";

import { useUnifiedStudioStore } from "@/stores/unified-studio-store";
import { useCreatorStore } from "@/stores/creator-store";
import { CREDIT_COSTS } from "@/types/credits";

const VIDEO_SOURCES = [
  { id: "text" as const, icon: "✍️", label: "From Text", hint: "Generate video from a prompt" },
  { id: "photo" as const, icon: "🖼️", label: "From Photo", hint: "Animate one of your photos" },
  { id: "motion" as const, icon: "🕺", label: "Motion Transfer", hint: "Copy movement from a video" },
];

export function CreationVideo() {
  const {
    videoSource,
    setVideoSource,
    videoDuration,
    setVideoDuration,
    videoAspectRatio,
    setVideoAspectRatio,
    sourceContentId,
    setSourceContentId,
  } = useUnifiedStudioStore();

  const content = useCreatorStore((s) => s.content);
  const recentImages = content
    .filter((c) => c.type === "IMAGE" && c.status === "COMPLETED" && c.url)
    .slice(0, 8);

  return (
    <div className="sv2-config sv2-config-video">
      <div className="sv2-video-sources">
        {VIDEO_SOURCES.map((src) => (
          <button
            key={src.id}
            className={`sv2-vsrc${videoSource === src.id ? " on" : ""}`}
            onClick={() => setVideoSource(src.id)}
          >
            <span className="sv2-vsrc-icon">{src.icon}</span>
            <span className="sv2-vsrc-label">{src.label}</span>
            <span className="sv2-vsrc-hint">{src.hint}</span>
          </button>
        ))}
      </div>

      {videoSource === "photo" && (
        <div className="sv2-photo-picker">
          {sourceContentId && recentImages.length > 0 && (() => {
            const preSelected = recentImages.find((c) => c.id === sourceContentId);
            return preSelected ? (
              <div className="sv2-photo-preselected">
                <div
                  className="sv2-photo-thumb on"
                  style={{ backgroundImage: `url(${preSelected.url})`, width: 48, height: 48, borderRadius: 6, display: "inline-block", verticalAlign: "middle" }}
                />
                <span className="sv2-section-hint" style={{ display: "inline", marginLeft: 8 }}>Photo pre-selected from canvas</span>
              </div>
            ) : null;
          })()}
          {recentImages.length === 0 ? (
            <p className="sv2-section-hint">No photos yet — generate some first.</p>
          ) : (
            <div className="sv2-photo-grid">
              {recentImages.map((item) => (
                <button
                  key={item.id}
                  className={`sv2-photo-thumb${sourceContentId === item.id ? " on" : ""}`}
                  onClick={() => setSourceContentId(sourceContentId === item.id ? null : item.id)}
                  style={{ backgroundImage: `url(${item.url})` }}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {videoSource === "motion" && (
        <p className="sv2-section-hint">Upload a movement video in the Library panel.</p>
      )}

      <div className="sv2-config-row">
        <span className="sv2-config-label">Duration</span>
        <div className="sv2-cfg-pills">
          <button
            className={`sv2-cfg-pill${videoDuration === 5 ? " on" : ""}`}
            onClick={() => setVideoDuration(5)}
          >
            5s · {CREDIT_COSTS.VIDEO_5S}cr
          </button>
          <button
            className={`sv2-cfg-pill${videoDuration === 10 ? " on" : ""}`}
            onClick={() => setVideoDuration(10)}
          >
            10s · {CREDIT_COSTS.VIDEO_10S}cr
          </button>
        </div>
      </div>

      <div className="sv2-config-row">
        <span className="sv2-config-label">Ratio</span>
        <div className="sv2-cfg-pills">
          {(["9:16", "1:1", "16:9"] as const).map((r) => (
            <button
              key={r}
              className={`sv2-cfg-pill${videoAspectRatio === r ? " on" : ""}`}
              onClick={() => setVideoAspectRatio(r)}
            >
              {r}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
