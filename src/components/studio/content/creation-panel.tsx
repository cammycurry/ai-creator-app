"use client";

import { useUnifiedStudioStore } from "@/stores/unified-studio-store";
import { useCreatorStore } from "@/stores/creator-store";
import { generateContent } from "@/server/actions/content-actions";
import { generateCarousel } from "@/server/actions/carousel-actions";
import {
  generateVideoFromText,
  generateVideoFromImage,
  generateVideoMotionTransfer,
  checkVideoStatus,
} from "@/server/actions/video-actions";
import { generateTalkingHead } from "@/server/actions/talking-head-actions";
import { getWorkspaceData } from "@/server/actions/workspace-actions";
import { CREDIT_COSTS } from "@/types/credits";
import { InlineRefs } from "./inline-refs";
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
    inspirationVideo,
    videoDuration,
    videoAspectRatio,
    script,
    setScript,
    voiceId,
    talkingSetting,
    talkingDuration,
    generating,
    generatingProgress,
    error,
    setGenerating,
    setGeneratingProgress,
    setError,
    setResults,
    setResultContentSet,
    setShowResults,
  } = useUnifiedStudioStore();

  const { activeCreatorId, getActiveCreator, setCredits } = useCreatorStore();
  const creator = getActiveCreator();
  const creatorName = creator?.name ?? "them";

  function getCreditCost(): number {
    switch (contentType) {
      case "photo":
        return imageCount;
      case "carousel":
        return slides.length || 0;
      case "video":
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

  function isDisabled(): boolean {
    if (generating) return true;
    switch (contentType) {
      case "photo":
        return !prompt.trim();
      case "carousel":
        return !selectedFormat;
      case "video":
        if (videoSource === "photo" && !sourceContentId) return true;
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
        const refAttachments = attachedRefs.map((a) => ({
          s3Key: a.ref.s3Key,
          mode: a.mode,
        }));
        const result = await generateContent(
          activeCreatorId,
          prompt,
          imageCount,
          refAttachments.length > 0 ? refAttachments : undefined
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
        let result;
        if (videoSource === "photo" && sourceContentId) {
          result = await generateVideoFromImage(activeCreatorId, sourceContentId, prompt, videoDuration);
        } else if (videoSource === "motion" && inspirationVideo) {
          result = await generateVideoMotionTransfer(activeCreatorId, inspirationVideo.preview, prompt, videoDuration);
        } else {
          result = await generateVideoFromText(activeCreatorId, prompt, videoDuration, videoAspectRatio);
        }
        if (result.success) {
          setGeneratingProgress("Generating video...");
          const poll = setInterval(async () => {
            const status = await checkVideoStatus(result.jobId);
            if (status.status === "COMPLETED") {
              clearInterval(poll);
              setResults([{
                id: result.contentId,
                type: "VIDEO",
                status: "COMPLETED",
                url: status.videoUrl ?? "",
                creatorId: activeCreatorId,
                s3Keys: [],
                source: "FREEFORM",
                creditsCost: 0,
                createdAt: new Date().toISOString(),
              }]);
              setShowResults(true);
              useUnifiedStudioStore.getState().showCanvas();
              setGenerating(false);
            } else if (status.status === "FAILED") {
              clearInterval(poll);
              setError(status.error ?? "Video generation failed");
              setGenerating(false);
            }
          }, 5000);
          const data = await getWorkspaceData();
          setCredits(data.balance);
          return;
        } else {
          setError(result.error);
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
          setGeneratingProgress("Generating talking head...");
          const poll = setInterval(async () => {
            const status = await checkVideoStatus(result.jobId);
            if (status.status === "COMPLETED") {
              clearInterval(poll);
              setResults([{
                id: result.contentId,
                type: "TALKING_HEAD",
                status: "COMPLETED",
                url: status.videoUrl ?? "",
                creatorId: activeCreatorId,
                s3Keys: [],
                source: "FREEFORM",
                creditsCost: 0,
                createdAt: new Date().toISOString(),
              }]);
              setShowResults(true);
              useUnifiedStudioStore.getState().showCanvas();
              setGenerating(false);
            } else if (status.status === "FAILED") {
              clearInterval(poll);
              setError(status.error ?? "Generation failed");
              setGenerating(false);
            }
          }, 5000);
          const data = await getWorkspaceData();
          setCredits(data.balance);
          return;
        } else {
          setError(result.error);
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
          <InlineRefs />
        </div>

        {/* Type-specific config */}
        {contentType === "photo" && <CreationPhoto />}
        {contentType === "carousel" && <CreationCarousel />}
        {contentType === "video" && <CreationVideo />}
        {contentType === "talking-head" && <CreationTalking />}

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
