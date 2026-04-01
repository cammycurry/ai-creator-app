"use client";

import { useState } from "react";
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
import { templates } from "@/data/templates";
import { CAROUSEL_FORMATS } from "@/data/carousel-formats";
import { CREDIT_COSTS } from "@/types/credits";
import { ConfigPhoto } from "./config-photo";
import { ConfigCarousel } from "./config-carousel";
import { ConfigVideo } from "./config-video";
import { ConfigTalking } from "./config-talking";

const TYPE_TABS = [
  { id: "photo" as const, label: "Photo", cost: "1 cr/photo" },
  { id: "carousel" as const, label: "Carousel", cost: "1 cr/slide" },
  { id: "video" as const, label: "Video", cost: "3–5 cr" },
  { id: "talking-head" as const, label: "Talking Head", cost: "8–12 cr" },
];

const SCRIPT_STARTERS = [
  "Product review",
  "Day in my life",
  "Tips & advice",
];

export function StudioCreatePanel() {
  const {
    contentType,
    setContentType,
    prompt,
    setPrompt,
    attachedRefs,
    detachRef,
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

  const [templatesOpen, setTemplatesOpen] = useState(false);

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

  async function handleGenerate() {
    if (!activeCreatorId) return;
    setGenerating(true);
    setError(null);

    switch (contentType) {
      case "photo": {
        const result = await generateContent(activeCreatorId, prompt, imageCount);
        if (result.success) {
          setResults(result.content);
          setShowResults(true);
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
              setGenerating(false);
            } else if (status.status === "FAILED") {
              clearInterval(poll);
              setError(status.error ?? "Video failed");
              setGenerating(false);
            }
          }, 5000);
          // Refresh credits after deduction
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
              setGenerating(false);
            } else if (status.status === "FAILED") {
              clearInterval(poll);
              setError(status.error ?? "Generation failed");
              setGenerating(false);
            }
          }, 5000);
          // Refresh credits after deduction
          const data = await getWorkspaceData();
          setCredits(data.balance);
          return;
        } else {
          setError(result.error);
        }
        break;
      }
    }

    // Refresh credits after generation (non-async types)
    const data = await getWorkspaceData();
    setCredits(data.balance);
    setGenerating(false);
  }

  const creatorName = creator?.name ?? "them";

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
        return "e.g. morning coffee at a cozy café, wearing an oversized sweater...";
      case "carousel":
        return "e.g. gym day photo dump, city lifestyle, GRWM transformation...";
      case "video":
        return "e.g. walking through the city at golden hour, outfit reveal, dancing...";
      case "talking-head":
        return "e.g. Hey guys! I've been obsessed with this product lately...";
    }
  }

  return (
    <div className="us-create-panel">
      {/* Type tabs */}
      <div className="us-type-tabs">
        {TYPE_TABS.map((tab) => (
          <button
            key={tab.id}
            className={`us-type-tab${contentType === tab.id ? " active" : ""}`}
            onClick={() => setContentType(tab.id)}
          >
            <span className="us-type-tab-label">{tab.label}</span>
            <span className="us-type-tab-cost">{tab.cost}</span>
          </button>
        ))}
      </div>

      {/* Scrollable content area */}
      <div className="us-create-scroll">
        {/* Prompt area */}
        <div className="us-prompt-section">
          <label className="us-prompt-label">{getPromptLabel()}</label>
          {contentType === "talking-head" ? (
            <textarea
              className="us-prompt-textarea"
              style={{ fontSize: 16 }}
              placeholder={getPromptPlaceholder()}
              value={script}
              onChange={(e) => setScript(e.target.value)}
              rows={5}
            />
          ) : (
            <textarea
              className="us-prompt-textarea"
              style={{ fontSize: 16 }}
              placeholder={getPromptPlaceholder()}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={4}
            />
          )}
        </div>

        {/* Attached references */}
        {attachedRefs.length > 0 && (
          <div className="us-attached-section">
            <span className="us-attached-label">References:</span>
            {attachedRefs.map((ref) => (
              <span key={ref.id} className="us-attached-tag">
                {ref.label || ref.type}
                <button
                  onClick={() => detachRef(ref.id)}
                  aria-label={`Remove ${ref.label || ref.type}`}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}

        {/* Template quick-picks */}
        <div className="us-templates-section">
          <button
            className="us-templates-toggle"
            onClick={() => setTemplatesOpen((v) => !v)}
          >
            <span>{templatesOpen ? "▾" : "▸"} Quick picks</span>
          </button>
          {templatesOpen && (
            <div className="us-templates-chips">
              {contentType === "photo" || contentType === "video"
                ? templates.map((t) => (
                    <button
                      key={t.id}
                      className="us-template-chip"
                      onClick={() => setPrompt(t.scenePrompt)}
                    >
                      {t.icon} {t.name}
                    </button>
                  ))
                : contentType === "carousel"
                ? CAROUSEL_FORMATS.map((f) => (
                    <button
                      key={f.id}
                      className="us-template-chip"
                      onClick={() => {
                        useUnifiedStudioStore.getState().selectCarouselFormat(f);
                      }}
                    >
                      {f.name}
                    </button>
                  ))
                : SCRIPT_STARTERS.map((s) => (
                    <button
                      key={s}
                      className="us-template-chip"
                      onClick={() => setScript(s + ": ")}
                    >
                      {s}
                    </button>
                  ))}
            </div>
          )}
        </div>

        {/* Type-specific config */}
        {contentType === "photo" && <ConfigPhoto />}
        {contentType === "carousel" && <ConfigCarousel />}
        {contentType === "video" && <ConfigVideo />}
        {contentType === "talking-head" && <ConfigTalking />}

        {/* Error */}
        {error && (
          <div className="us-error" style={{ padding: "8px 16px", color: "var(--error, #c0392b)", fontSize: 13 }}>
            {error}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="us-footer">
        <span className="us-footer-cost">{getCreditCost()} credit{getCreditCost() !== 1 ? "s" : ""}</span>
        <button
          className="us-generate-btn"
          onClick={handleGenerate}
          disabled={isDisabled()}
        >
          {getButtonText()}
        </button>
      </div>
    </div>
  );
}
