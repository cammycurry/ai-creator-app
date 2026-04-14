"use client";

import { useEffect, useState } from "react";
import { useUnifiedStudioStore } from "@/stores/unified-studio-store";
import { useCreatorStore } from "@/stores/creator-store";
import { generateContent, getCreatorContent } from "@/server/actions/content-actions";
import { generateCarousel } from "@/server/actions/carousel-actions";
import {
  generateVideoFromText,
  generateVideoFromImage,
  generateVideoMotionTransfer,
} from "@/server/actions/video-actions";
import { generateTalkingHead } from "@/server/actions/talking-head-actions";
import { getWorkspaceData } from "@/server/actions/workspace-actions";
import { CREDIT_COSTS } from "@/types/credits";
import { InlineRefs } from "./inline-refs";
import { ReferencePicker } from "./reference-picker";
import { CreationPhoto } from "./creation-photo";
import { CreationCarousel } from "./creation-carousel";
import { CreationVideo } from "./creation-video";
import { CreationTalking } from "./creation-talking";

const CONTENT_TYPES = [
  { id: "photo" as const, label: "Photo" },
  { id: "carousel" as const, label: "Carousel" },
  { id: "video" as const, label: "Video" },
  { id: "talking-head" as const, label: "Talking Head" },
];

const SCRIPT_STARTERS = ["Product review", "Day in my life", "Tips & advice"];

function friendlyError(raw: string): string {
  const lower = raw.toLowerCase();
  if (lower.includes("rate limit") || lower.includes("too many")) {
    return "Too many requests. Please wait a moment and try again.";
  }
  if (lower.includes("nsfw") || lower.includes("safety") || lower.includes("content policy") || lower.includes("inappropriate") || lower.includes("explicit")) {
    return "Your prompt was flagged as too explicit. Try describing the scene, outfit, or setting instead of body details. Your credits have been refunded.";
  }
  if (lower.includes("timeout") || lower.includes("timed out")) {
    return "Generation timed out. Please try again with a simpler prompt.";
  }
  if (lower.includes("not enough credits") || lower.includes("insufficient")) {
    return raw; // Already user-friendly
  }
  return `Generation failed. Your credits have been refunded. (${raw.slice(0, 80)})`;
}

export function CreationPanel() {
  const {
    contentType,
    setContentType,
    prompt,
    setPrompt,
    attachedRefs,
    imageCount,
    selectedFormat,
    slides,
    carouselInstructions,
    videoSource,
    sourceContentId,
    motionSourceUrl,
    videoDuration,
    videoAspectRatio,
    videoQuality,
    script,
    setScript,
    voiceId,
    talkingSetting,
    talkingDuration,
    generating,
    generatingProgress,
    error,
    setGenerating,
    setError,
    setResults,
    setResultContentSet,
    setShowResults,
  } = useUnifiedStudioStore();

  const { activeCreatorId, getActiveCreator, setCredits } = useCreatorStore();
  const creator = getActiveCreator();
  const creatorName = creator?.name ?? "them";

  const [refPickerOpen, setRefPickerOpen] = useState(false);

  // Track video/talking-head IDs we've submitted this session so we can show
  // the celebration view in the studio canvas when they complete. The grid
  // polling loops drive the status transitions; we just watch the store.
  const [pendingVideoIds, setPendingVideoIds] = useState<Set<string>>(new Set());
  const storeContent = useCreatorStore((s) => s.content);

  useEffect(() => {
    if (pendingVideoIds.size === 0) return;
    const completed = storeContent.filter(
      (c) => pendingVideoIds.has(c.id) && c.status === "COMPLETED"
    );
    const failed = storeContent.filter(
      (c) => pendingVideoIds.has(c.id) && c.status === "FAILED"
    );
    if (completed.length === 0 && failed.length === 0) return;

    if (completed.length > 0) {
      setResults(completed);
      setShowResults(true);
      useUnifiedStudioStore.getState().showCanvas();
    }
    // Drop completed and failed items from the pending set so we don't
    // re-trigger the celebration on subsequent ticks.
    setPendingVideoIds((prev) => {
      const next = new Set(prev);
      for (const c of completed) next.delete(c.id);
      for (const c of failed) next.delete(c.id);
      return next;
    });
  }, [storeContent, pendingVideoIds, setResults, setShowResults]);

  function getCreditCost(): number {
    switch (contentType) {
      case "photo":
        return imageCount;
      case "carousel":
        return slides.length || 0;
      case "video":
        if (videoQuality === "premium") {
          return videoDuration === 5 ? CREDIT_COSTS.VIDEO_5S_PREMIUM : CREDIT_COSTS.VIDEO_10S_PREMIUM;
        }
        return videoDuration === 5 ? CREDIT_COSTS.VIDEO_5S : CREDIT_COSTS.VIDEO_10S;
      case "talking-head":
        return talkingDuration === 15 ? CREDIT_COSTS.TALKING_HEAD : CREDIT_COSTS.TALKING_HEAD_30S;
    }
  }

  function getButtonText(): string {
    if (generating) return generatingProgress || "Generating...";
    switch (contentType) {
      case "photo":
        return `Generate ${imageCount} Photo${imageCount !== 1 ? "s" : ""} →`;
      case "carousel":
        return `Generate ${slides.length} Slides →`;
      case "video":
        return "Generate Video →";
      case "talking-head":
        return "Generate Talking Head →";
    }
  }

  // Check if any attached ref is missing required type/mode selection
  const hasIncompleteRefs = attachedRefs.some((a) =>
    a.refType === null || (a.refType === "scene" && a.mode === null)
  );

  function isDisabled(): boolean {
    if (generating) return true;
    if (hasIncompleteRefs) return true;
    switch (contentType) {
      case "photo":
        return !prompt.trim();
      case "carousel":
        return !selectedFormat;
      case "video":
        if (videoSource === "motion" && !motionSourceUrl) return true;
        return !prompt.trim();
      case "talking-head":
        return !script.trim() || !voiceId;
    }
  }

  function getPromptLabel(): string {
    switch (contentType) {
      case "photo":
        return `What should ${creatorName} do?`;
      case "carousel":
        return "What's the carousel about?";
      case "video":
        return "What happens in the video?";
      case "talking-head":
        return `What should ${creatorName} say?`;
    }
  }

  function getPromptPlaceholder(): string {
    switch (contentType) {
      case "photo":
        return "e.g. gym selfie, coffee shop, beach sunset, mirror pic...";
      case "carousel":
        return "e.g. gym day, city trip, outfit changes, GRWM...";
      case "video":
        return "e.g. walking in the city, gym workout, outfit reveal...";
      case "talking-head":
        return "e.g. Hey guys! I just tried this protein powder and honestly...";
    }
  }

  async function handleGenerate() {
    if (!activeCreatorId) return;
    setGenerating(true);
    setError(null);

    switch (contentType) {
      case "photo": {
        const refAtts = attachedRefs
          .filter((a) => a.refType !== null)
          .map((a) => ({
            refId: a.ref.id,
            refName: a.ref.name,
            s3Key: a.ref.s3Key,
            refType: a.refType as "scene" | "product",
            mode: (a.mode ?? "exact") as "exact" | "inspired",
            description: a.description,
          }));
        const result = await generateContent(
          activeCreatorId,
          prompt,
          imageCount,
          refAtts.length > 0 ? refAtts : undefined
        );
        if (result.success) {
          setResults(result.content);
          setShowResults(true);
          useUnifiedStudioStore.getState().showCanvas();
        } else {
          setError(result.error);
        }
        break;
      }
      case "carousel": {
        if (!selectedFormat) {
          setError("Pick a carousel format");
          break;
        }
        const slideEdits: Record<number, string> = {};
        slides.forEach((s) => {
          if (s.description.trim()) slideEdits[s.position] = s.description;
        });
        const slideRefs: Record<number, string[]> = {};
        slides.forEach((s) => {
          if (s.references.length) slideRefs[s.position] = s.references.map((r) => r.id);
        });
        const result = await generateCarousel(
          activeCreatorId,
          selectedFormat.id,
          slides.length,
          carouselInstructions || undefined,
          undefined,
          Object.keys(slideEdits).length ? slideEdits : undefined,
          Object.keys(slideRefs).length ? slideRefs : undefined
        );
        if (result.success) {
          setResultContentSet(result.contentSet);
          setShowResults(true);
          useUnifiedStudioStore.getState().showCanvas();
        } else {
          setError(result.error);
        }
        break;
      }
      case "video": {
        const videoRefAtts = attachedRefs
          .filter((a) => a.refType !== null)
          .map((a) => ({
            refId: a.ref.id,
            refName: a.ref.name,
            s3Key: a.ref.s3Key,
            refType: a.refType as "scene" | "product",
            mode: (a.mode ?? "exact") as "exact" | "inspired",
            description: a.description,
          }));
        const videoRefs = videoRefAtts.length > 0 ? videoRefAtts : undefined;
        let result;
        if (videoSource === "motion" && motionSourceUrl) {
          result = await generateVideoMotionTransfer(activeCreatorId, motionSourceUrl, prompt, videoDuration);
        } else if (sourceContentId) {
          result = await generateVideoFromImage(activeCreatorId, sourceContentId, prompt, videoDuration, videoAspectRatio, videoRefs, videoQuality);
        } else {
          result = await generateVideoFromText(activeCreatorId, prompt, videoDuration, videoAspectRatio, videoRefs, videoQuality);
        }
        if (result.success) {
          // Queue mode — submit returns instantly. Don't block the UI for the
          // whole 30-300s generation. Push the new GENERATING content to the
          // store so the grid shows it immediately, then let the user submit
          // more. The workspace-canvas / content-browser polling loops handle
          // the rest. We track the jobId in pendingVideoIds so the celebration
          // view fires when the grid polling transitions it to COMPLETED.
          setPendingVideoIds((prev) => new Set(prev).add(result.contentId));
          if (activeCreatorId) {
            const items = await getCreatorContent(activeCreatorId);
            useCreatorStore.getState().setContent(items);
          }
          const data = await getWorkspaceData();
          setCredits(data.balance);
          setPrompt("");
          setGenerating(false);
          return;
        } else {
          setError(friendlyError(result.error));
        }
        break;
      }
      case "talking-head": {
        const result = await generateTalkingHead(
          activeCreatorId,
          script,
          voiceId,
          talkingSetting || undefined,
          talkingDuration
        );
        if (result.success) {
          // Queue mode — same async pattern as video.
          setPendingVideoIds((prev) => new Set(prev).add(result.contentId));
          if (activeCreatorId) {
            const items = await getCreatorContent(activeCreatorId);
            useCreatorStore.getState().setContent(items);
          }
          const data = await getWorkspaceData();
          setCredits(data.balance);
          setScript("");
          setGenerating(false);
          return;
        } else {
          setError(friendlyError(result.error));
        }
        break;
      }
    }

    const data = await getWorkspaceData();
    setCredits(data.balance);
    setGenerating(false);
  }

  const creditCost = getCreditCost();

  return (
    <div className="sv2-right">
      {/* Content type pills */}
      <div className="sv2-pills">
        {CONTENT_TYPES.map((t) => (
          <button
            key={t.id}
            className={`sv2-pill${contentType === t.id ? " on" : ""}`}
            onClick={() => setContentType(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Scrollable creation area */}
      <div className="sv2-create-area">
        {/* Prompt input card */}
        <div className="sv2-input-card">
          <label className="sv2-input-label">{getPromptLabel()}</label>
          <textarea
            className="sv2-textarea"
            style={{ fontSize: 14 }}
            placeholder={getPromptPlaceholder()}
            value={contentType === "talking-head" ? script : prompt}
            onChange={(e) =>
              contentType === "talking-head"
                ? setScript(e.target.value)
                : setPrompt(e.target.value)
            }
            rows={4}
          />
        </div>

        {/* Type-specific config */}
        {contentType === "photo" && <CreationPhoto />}
        {contentType === "carousel" && <CreationCarousel />}
        {contentType === "video" && <CreationVideo />}
        {contentType === "talking-head" && <CreationTalking />}

        {/* References — inline cards with + Add button */}
        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: "#555" }}>References</span>
            <button
              onClick={() => setRefPickerOpen(true)}
              style={{
                display: "flex", alignItems: "center", gap: 3,
                padding: "3px 10px", fontSize: 10, fontWeight: 600,
                background: "#F5F5F5", border: "1px solid #EBEBEB", borderRadius: 4,
                cursor: "pointer", color: "#555", fontFamily: "inherit",
              }}
            >
              + Add
            </button>
          </div>
          <InlineRefs />
          {attachedRefs.length === 0 && (
            <div
              onClick={() => setRefPickerOpen(true)}
              style={{
                padding: "12px", borderRadius: 8,
                border: "1px dashed #E0E0E0", background: "#FAFAFA",
                fontSize: 11, color: "#BBB", textAlign: "center", cursor: "pointer",
              }}
            >
              + Add a scene or product reference
            </div>
          )}
          {hasIncompleteRefs && (
            <div style={{ fontSize: 10, color: "#C4603A", marginTop: 4 }}>
              Select type and mode for each reference before generating.
            </div>
          )}
        </div>
        <ReferencePicker
          open={refPickerOpen}
          onOpenChange={setRefPickerOpen}
          onSelect={(ref) => useUnifiedStudioStore.getState().attachRef(ref)}
        />

        {/* Script starter chips for talking head */}
        {contentType === "talking-head" && (
          <div className="sv2-tpl-chips">
            {SCRIPT_STARTERS.map((s) => (
              <button
                key={s}
                className="sv2-tpl-chip"
                onClick={() => setScript(s + ": ")}
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {/* Error */}
        {error && <div className="sv2-error">{error}</div>}
      </div>

      {/* Footer */}
      <div className="sv2-footer">
        <span className="sv2-cost">
          {creditCost} credit{creditCost !== 1 ? "s" : ""}
        </span>
        <button
          className="sv2-gen-btn"
          onClick={handleGenerate}
          disabled={isDisabled()}
        >
          {getButtonText()}
        </button>
      </div>
    </div>
  );
}
