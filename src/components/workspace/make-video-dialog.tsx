"use client";

import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useCreatorStore } from "@/stores/creator-store";
import { generateVideoFromImage, checkVideoStatus } from "@/server/actions/video-actions";
import { getWorkspaceData } from "@/server/actions/workspace-actions";
import { CREDIT_COSTS } from "@/types/credits";
import type { ContentItem } from "@/types/content";

export function MakeVideoDialog({
  item,
  open,
  onOpenChange,
}: {
  item: ContentItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [prompt, setPrompt] = useState("");
  const [duration, setDuration] = useState<5 | 10>(5);
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState<string>("Starting...");
  const [error, setError] = useState<string | null>(null);
  const { setCredits } = useCreatorStore();

  if (!item) return null;

  const creditCost = duration === 5 ? CREDIT_COSTS.VIDEO_5S : CREDIT_COSTS.VIDEO_10S;

  async function handleGenerate() {
    if (!item || generating) return;
    setGenerating(true);
    setError(null);
    setProgress("Starting video generation...");

    const result = await generateVideoFromImage(item.creatorId, item.id, prompt, duration);

    if (!result.success) {
      setError(result.error);
      setGenerating(false);
      return;
    }

    // Poll for completion
    setProgress("Generating video...");
    const jobId = result.jobId;
    let attempts = 0;
    const maxAttempts = 120; // 10 minutes at 5s intervals

    const poll = setInterval(async () => {
      attempts++;
      const status = await checkVideoStatus(jobId);

      if (status.status === "COMPLETED") {
        clearInterval(poll);
        const data = await getWorkspaceData();
        setCredits(data.balance);
        setGenerating(false);
        onOpenChange(false);
        // Reload content to show the new video
        window.location.reload();
      } else if (status.status === "FAILED") {
        clearInterval(poll);
        setError(status.error ?? "Video generation failed");
        setGenerating(false);
      } else if (attempts >= maxAttempts) {
        clearInterval(poll);
        setError("Video generation timed out. Check back later.");
        setGenerating(false);
      } else {
        setProgress(`Generating video... (${attempts * 5}s)`);
      }
    }, 5000);
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!generating) onOpenChange(o); }}>
      <DialogContent className="make-video-dialog">
        <h3 style={{ fontSize: 18, fontWeight: 600, margin: "0 0 4px" }}>Make Video</h3>
        <p style={{ fontSize: 12, color: "var(--text-secondary, #888)", margin: "0 0 16px" }}>
          Animate this photo into a video clip
        </p>

        {/* Source image */}
        {item.url && (
          <div style={{ borderRadius: 10, overflow: "hidden", marginBottom: 16, maxHeight: 200 }}>
            <img src={item.url} alt="" style={{ width: "100%", height: 200, objectFit: "cover", display: "block" }} />
          </div>
        )}

        {/* Motion prompt */}
        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary, #888)", display: "block", marginBottom: 4 }}>
            How should they move?
          </label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Slow head turn and smile, gentle hair movement in breeze..."
            rows={2}
            style={{
              width: "100%", padding: "8px 12px", borderRadius: 8,
              border: "1px solid var(--border, #EBEBEB)", fontSize: 16,
              fontFamily: "inherit", color: "var(--text-primary, #111)",
              background: "var(--surface, #fff)", resize: "none", outline: "none",
            }}
          />
        </div>

        {/* Duration picker */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary, #888)", display: "block", marginBottom: 6 }}>
            Duration
          </label>
          <div style={{ display: "flex", gap: 8 }}>
            {([5, 10] as const).map((d) => (
              <button
                key={d}
                onClick={() => setDuration(d)}
                style={{
                  flex: 1, padding: "8px 12px", borderRadius: 8, fontSize: 13, fontWeight: 500,
                  cursor: "pointer", border: "1px solid",
                  borderColor: duration === d ? "var(--accent, #C4603A)" : "var(--border, #EBEBEB)",
                  background: duration === d ? "var(--accent, #C4603A)" : "var(--card, #F5F5F5)",
                  color: duration === d ? "#fff" : "var(--text-primary, #111)",
                }}
              >
                {d} seconds
                <span style={{ display: "block", fontSize: 11, fontWeight: 400, opacity: 0.8, marginTop: 2 }}>
                  {d === 5 ? CREDIT_COSTS.VIDEO_5S : CREDIT_COSTS.VIDEO_10S} credits
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div style={{ padding: "8px 0", color: "#e53e3e", fontSize: 13 }}>{error}</div>
        )}

        {/* Generating progress */}
        {generating && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 0", fontSize: 13, color: "var(--text-secondary, #888)" }}>
            <div className="studio-gen-spinner" />
            {progress}
          </div>
        )}

        {/* Footer */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 600 }}>
            {creditCost} credit{creditCost !== 1 ? "s" : ""}
          </span>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              className="studio-btn secondary"
              onClick={() => onOpenChange(false)}
              disabled={generating}
            >
              Cancel
            </button>
            <button
              className="studio-btn primary"
              onClick={handleGenerate}
              disabled={generating}
              style={{ minWidth: 140 }}
            >
              {generating ? "Generating..." : "Generate Video"}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
