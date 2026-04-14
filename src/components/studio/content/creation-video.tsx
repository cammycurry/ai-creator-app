"use client";

import { useState } from "react";
import { useUnifiedStudioStore } from "@/stores/unified-studio-store";
import { useCreatorStore } from "@/stores/creator-store";
import { CREDIT_COSTS } from "@/types/credits";
import { PhotoPicker } from "./photo-picker";
import { MotionSourcePicker } from "./motion-source-picker";

export function CreationVideo() {
  const {
    videoSource,
    setVideoSource,
    videoDuration,
    setVideoDuration,
    videoAspectRatio,
    setVideoAspectRatio,
    videoQuality,
    setVideoQuality,
    sourceContentId,
    setSourceContentId,
    motionSourceUrl,
    setMotionSourceUrl,
    setMotionSourceRefId,
  } = useUnifiedStudioStore();

  const content = useCreatorStore((s) => s.content);
  const references = useCreatorStore((s) => s.references);
  const recentImages = content
    .filter((c) => c.type === "IMAGE" && c.status === "COMPLETED" && c.url);
  const videoRefs = references
    .filter((r) => r.purpose === "motion" || r.tags.some((t) => t === "video" || t === "motion"));

  const [photoPickerOpen, setPhotoPickerOpen] = useState(false);
  const [videoPickerOpen, setVideoPickerOpen] = useState(false);

  const selectedPhoto = recentImages.find((c) => c.id === sourceContentId);

  // Find matched motion ref name for display
  const matchedMotionRef = motionSourceUrl
    ? videoRefs.find((r) => r.imageUrl === motionSourceUrl)
    : null;

  return (
    <div className="sv2-config sv2-config-video">
      {/* Two modes: compact pills */}
      <div className="sv2-config-row">
        <span className="sv2-config-label">Mode</span>
        <div className="sv2-cfg-pills">
          <button
            className={`sv2-cfg-pill${videoSource !== "motion" ? " on" : ""}`}
            onClick={() => setVideoSource("text")}
          >
            Create
          </button>
          <button
            className={`sv2-cfg-pill${videoSource === "motion" ? " on" : ""}`}
            onClick={() => setVideoSource("motion")}
          >
            Motion Transfer
          </button>
        </div>
      </div>

      {/* Create mode: compact starting image selector */}
      {videoSource !== "motion" && (
        <div className="sv2-config-row">
          <span className="sv2-config-label">Starting photo</span>
          <div className="sv2-cfg-pills">
            {selectedPhoto ? (
              <>
                <div
                  style={{
                    width: 28, height: 28, borderRadius: 4, flexShrink: 0,
                    backgroundImage: `url(${selectedPhoto.url})`,
                    backgroundSize: "cover", backgroundPosition: "center",
                    border: "2px solid #C4603A",
                  }}
                />
                <button className="sv2-cfg-pill on" onClick={() => setPhotoPickerOpen(true)}>Change</button>
                <button className="sv2-cfg-pill" onClick={() => setSourceContentId(null)}>Clear</button>
              </>
            ) : (
              <button className="sv2-cfg-pill" onClick={() => setPhotoPickerOpen(true)}>
                {recentImages.length > 0 ? "Choose photo" : "None"}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Motion transfer: compact video selector */}
      {videoSource === "motion" && (
        <div className="sv2-config-row">
          <span className="sv2-config-label">Motion source</span>
          <div className="sv2-cfg-pills">
            {motionSourceUrl ? (
              <>
                {matchedMotionRef && (
                  <span style={{ fontSize: 10, color: "#555", maxWidth: 100, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {matchedMotionRef.name}
                  </span>
                )}
                <button className="sv2-cfg-pill on" onClick={() => setVideoPickerOpen(true)}>Change</button>
                <button className="sv2-cfg-pill" onClick={() => setMotionSourceUrl(null)}>Clear</button>
              </>
            ) : (
              <button className="sv2-cfg-pill" onClick={() => setVideoPickerOpen(true)}>
                Choose video
              </button>
            )}
          </div>
        </div>
      )}

      {/* Duration — hide for motion transfer */}
      {videoSource !== "motion" && (
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
      )}

      {/* Ratio + Quality — hide for motion transfer */}
      {videoSource !== "motion" && (
        <>
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

          <div className="sv2-config-row">
            <span className="sv2-config-label">Quality</span>
            <div className="sv2-cfg-pills">
              <button
                className={`sv2-cfg-pill${videoQuality === "standard" ? " on" : ""}`}
                onClick={() => setVideoQuality("standard")}
              >
                Standard
              </button>
              <button
                className={`sv2-cfg-pill${videoQuality === "premium" ? " on" : ""}`}
                onClick={() => setVideoQuality("premium")}
              >
                Premium
              </button>
            </div>
          </div>
        </>
      )}

      {videoSource === "motion" && (
        <div style={{ fontSize: 10, color: "#BBB", padding: "2px 0" }}>
          Duration and ratio are determined by the motion source video. {CREDIT_COSTS.MOTION_TRANSFER} credits.
        </div>
      )}

      {/* Photo picker */}
      <PhotoPicker
        open={photoPickerOpen}
        onOpenChange={setPhotoPickerOpen}
        onSelect={(id) => setSourceContentId(id)}
        selectedContentId={sourceContentId}
      />

      {/* Motion source picker */}
      <MotionSourcePicker
        open={videoPickerOpen}
        onOpenChange={setVideoPickerOpen}
        onSelect={(url, refId) => { setMotionSourceUrl(url); setMotionSourceRefId(refId ?? null); }}
      />
    </div>
  );
}
