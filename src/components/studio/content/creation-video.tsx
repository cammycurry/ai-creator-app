"use client";

import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useUnifiedStudioStore } from "@/stores/unified-studio-store";
import { useCreatorStore } from "@/stores/creator-store";
import { CREDIT_COSTS } from "@/types/credits";

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
  } = useUnifiedStudioStore();

  const content = useCreatorStore((s) => s.content);
  const recentImages = content
    .filter((c) => c.type === "IMAGE" && c.status === "COMPLETED" && c.url)
    .slice(0, 24);
  const recentVideos = content
    .filter((c) => (c.type === "VIDEO" || c.type === "TALKING_HEAD") && c.status === "COMPLETED" && c.url)
    .slice(0, 12);

  const [photoPickerOpen, setPhotoPickerOpen] = useState(false);
  const [videoPickerOpen, setVideoPickerOpen] = useState(false);

  const selectedPhoto = recentImages.find((c) => c.id === sourceContentId);

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
                <button className="sv2-cfg-pill on" onClick={() => setVideoPickerOpen(true)}>Change</button>
                <button className="sv2-cfg-pill" onClick={() => setMotionSourceUrl(null)}>Clear</button>
              </>
            ) : (
              <button className="sv2-cfg-pill" onClick={() => setVideoPickerOpen(true)}>
                {recentVideos.length > 0 ? "Choose video" : "No videos yet"}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Duration — hide for motion transfer (duration comes from reference video) */}
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

      {/* Photo picker dialog */}
      <Dialog open={photoPickerOpen} onOpenChange={setPhotoPickerOpen}>
        <DialogContent className="add-ref-dialog" showCloseButton={false} style={{ maxWidth: 480 }}>
          <div style={{ padding: 8 }}>
            <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>Choose starting photo</div>
            <div style={{ fontSize: 11, color: "#888", marginBottom: 12 }}>
              This photo will be animated into a video. Leave empty to generate from scratch.
            </div>
            {recentImages.length === 0 ? (
              <div style={{ padding: 20, textAlign: "center", color: "#BBB", fontSize: 12 }}>
                No photos yet — generate some first.
              </div>
            ) : (
              <div style={{
                display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6,
                maxHeight: 320, overflowY: "auto",
              }}>
                {recentImages.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      setSourceContentId(item.id);
                      setPhotoPickerOpen(false);
                    }}
                    style={{
                      width: "100%", aspectRatio: "3/4", borderRadius: 6, border: sourceContentId === item.id ? "2px solid #C4603A" : "2px solid transparent",
                      backgroundImage: `url(${item.url})`, backgroundSize: "cover", backgroundPosition: "center",
                      cursor: "pointer", padding: 0,
                    }}
                  />
                ))}
              </div>
            )}
            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              <button
                onClick={() => { setSourceContentId(null); setPhotoPickerOpen(false); }}
                style={{
                  flex: 1, padding: "8px 12px", background: "#F5F5F5", border: "none",
                  borderRadius: 6, fontSize: 12, cursor: "pointer", fontFamily: "inherit",
                }}
              >
                No starting photo
              </button>
              <button
                onClick={() => setPhotoPickerOpen(false)}
                style={{
                  flex: 1, padding: "8px 12px", background: "#111", color: "white", border: "none",
                  borderRadius: 6, fontSize: 12, cursor: "pointer", fontFamily: "inherit",
                }}
              >
                Done
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Video picker dialog */}
      <Dialog open={videoPickerOpen} onOpenChange={setVideoPickerOpen}>
        <DialogContent className="add-ref-dialog" showCloseButton={false} style={{ maxWidth: 480 }}>
          <div style={{ padding: 8 }}>
            <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>Choose motion source</div>
            <div style={{ fontSize: 11, color: "#888", marginBottom: 12 }}>
              Your creator will copy the movements from this video.
            </div>
            {recentVideos.length === 0 ? (
              <div style={{ padding: 20, textAlign: "center", color: "#BBB", fontSize: 12 }}>
                No videos yet — generate a video first.
              </div>
            ) : (
              <div style={{
                display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6,
                maxHeight: 320, overflowY: "auto",
              }}>
                {recentVideos.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      setMotionSourceUrl(item.url ?? null);
                      setVideoPickerOpen(false);
                    }}
                    style={{
                      width: "100%", aspectRatio: "9/16", borderRadius: 6,
                      border: motionSourceUrl === item.url ? "2px solid #C4603A" : "2px solid transparent",
                      backgroundImage: item.thumbnailUrl ? `url(${item.thumbnailUrl})` : item.url ? `url(${item.url})` : undefined,
                      backgroundSize: "cover", backgroundPosition: "center",
                      cursor: "pointer", padding: 0, position: "relative",
                    }}
                  >
                    <svg
                      width="20" height="20" viewBox="0 0 24 24" fill="white" opacity={0.8}
                      style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)" }}
                    >
                      <polygon points="5 3 19 12 5 21" />
                    </svg>
                  </button>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
