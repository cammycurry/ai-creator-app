"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useCreatorStore } from "@/stores/creator-store";
import { useUIStore } from "@/stores/ui-store";
import { generateContent, getCreatorContent } from "@/server/actions/content-actions";
import { formatElapsed } from "@/lib/time-format";
import { getExpectationMessage } from "@/lib/model-durations";
import { useTick } from "@/lib/hooks/use-tick";
import { getWorkspaceData } from "@/server/actions/workspace-actions";
import { ContentDetail } from "./content-detail";
import { CarouselDetail } from "./carousel-detail";
import { useUnifiedStudioStore } from "@/stores/unified-studio-store";
import { getCreatorContentSets } from "@/server/actions/carousel-actions";
import { PreMadeLibrary } from "./premade-library";
import type { ContentItem, ContentSetItem } from "@/types/content";

/* ─── Loading Skeleton ─── */
function CanvasSkeleton() {
  return (
    <>
      <div className="skel-filter-bar">
        <div className="skel skel-filter-pill" style={{ width: 60 }} />
        <div className="skel skel-filter-pill" style={{ width: 72 }} />
        <div className="skel skel-filter-pill" style={{ width: 68 }} />
        <div className="skel skel-filter-pill" style={{ width: 56 }} />
      </div>
      <div className="skel-grid">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="skel skel-card" />
        ))}
      </div>
    </>
  );
}

/* ─── Onboarding State ─── */
function NoCreatorsState() {
  const { setCreatorStudioOpen } = useUIStore();
  const [premadeOpen, setPremadeOpen] = useState(false);

  return (
    <div className="onboarding">
      <div className="onboarding-content">
        <h1 className="onboarding-headline">Create your first AI influencer</h1>
        <p className="onboarding-subhead">Build a custom character or pick from our collection</p>

        <div className="onboarding-cards">
          <button className="onboarding-card" onClick={() => setCreatorStudioOpen(true)}>
            <div className="onboarding-card-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M12 3v18M3 12h18" />
              </svg>
            </div>
            <div className="onboarding-card-title">Build Your Own</div>
            <div className="onboarding-card-desc">Full creative control. Pick every trait.</div>
          </button>

          <button className="onboarding-card" onClick={() => setPremadeOpen(true)}>
            <div className="onboarding-card-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="3" y="3" width="7" height="7" rx="1" />
                <rect x="14" y="3" width="7" height="7" rx="1" />
                <rect x="3" y="14" width="7" height="7" rx="1" />
                <rect x="14" y="14" width="7" height="7" rx="1" />
              </svg>
            </div>
            <div className="onboarding-card-title">Pick a Pre-Made</div>
            <div className="onboarding-card-desc">Ready to go. Start creating content immediately.</div>
          </button>
        </div>

        <p className="onboarding-credits">10 free credits to get started</p>
      </div>

      <PreMadeLibrary open={premadeOpen} onOpenChange={setPremadeOpen} />
    </div>
  );
}

/* ─── No Content State ─── */
function NoContentState() {
  return (
    <div className="empty-state">
      <div className="empty-icon">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <circle cx="8.5" cy="8.5" r="1.5" />
          <path d="M21 15l-5-5L5 21" />
        </svg>
      </div>
      <div className="empty-title">No content yet</div>
      <div className="empty-desc">
        Tell your creator what to do — take a mirror selfie, film a dance
        reel, talk to camera. Just type it below.
      </div>
    </div>
  );
}

/* ─── Content Area ─── */
function ContentArea({ creator }: { creator: { id: string; name: string; contentCount: number; baseImageUrl?: string } }) {
  const router = useRouter();
  const [prompt, setPrompt] = useState("");
  const [contentMode, setContentMode] = useState<"photo" | "video">("photo");
  const [selectedItem, setSelectedItem] = useState<ContentItem | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [carouselSet, setCarouselSet] = useState<ContentSetItem | null>(null);
  const [carouselOpen, setCarouselOpen] = useState(false);
  const [filter, setFilter] = useState<"all" | "photos" | "carousels" | "videos">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "type">("newest");
  const {
    content,
    contentSets,
    isGeneratingContent,
    contentError,
    imageCount,
    setContent,
    addContent,
    setContentSets,
    setIsGeneratingContent,
    setContentError,
    setCredits,
  } = useCreatorStore();

  // Tick every 1s so elapsed-time displays on GENERATING cards update live
  const now = useTick(1000);

  useEffect(() => {
    getCreatorContent(creator.id).then(setContent);
    getCreatorContentSets(creator.id).then(setContentSets);
  }, [creator.id, setContent, setContentSets]);

  // Poll for GENERATING items — check every 10s until they all complete
  const generatingCount = content.filter((c) => c.status === "GENERATING").length;
  useEffect(() => {
    if (generatingCount === 0) return;

    const interval = setInterval(async () => {
      const refreshed = await getCreatorContent(creator.id);
      setContent(refreshed);
      if (!refreshed.some((c) => c.status === "GENERATING")) clearInterval(interval);
    }, 10000);

    return () => clearInterval(interval);
  }, [generatingCount, creator.id, setContent]);

  const handleSubmit = useCallback(async () => {
    if (!prompt.trim() || isGeneratingContent) return;
    const input = prompt.trim();

    // Video mode — generate inline
    if (contentMode === "video") {
      setIsGeneratingContent(true);
      setContentError(null);

      const { generateVideoFromText, checkVideoStatus } = await import("@/server/actions/video-actions");
      const result = await generateVideoFromText(creator.id, input, 5, "9:16");

      if (result.success) {
        setPrompt("");
        const poll = setInterval(async () => {
          const status = await checkVideoStatus(result.jobId);
          if (status.status === "COMPLETED") {
            clearInterval(poll);
            getCreatorContent(creator.id).then(setContent);
            setIsGeneratingContent(false);
            const data = await getWorkspaceData();
            setCredits(data.balance);
          } else if (status.status === "FAILED") {
            clearInterval(poll);
            setContentError(status.error ?? "Video generation failed");
            setIsGeneratingContent(false);
          }
        }, 5000);
      } else {
        setContentError(result.error);
        setIsGeneratingContent(false);
      }
      return;
    }

    // Otherwise, generate single photo (existing behavior)
    setIsGeneratingContent(true);
    setContentError(null);

    const result = await generateContent(creator.id, input, imageCount);

    if (result.success) {
      addContent(result.content);
      setPrompt("");
      const data = await getWorkspaceData();
      setCredits(data.balance);
    } else {
      setContentError(result.error);
    }
    setIsGeneratingContent(false);
  }, [prompt, isGeneratingContent, contentMode, creator.id, imageCount, addContent, setContent, setIsGeneratingContent, setContentError, setCredits]);

  const standalonePhotos = content.filter((c) => !c.contentSetId);
  const query = searchQuery.toLowerCase().trim();
  const filteredSets = query
    ? contentSets.filter((s) =>
        (s.formatId ?? "").toLowerCase().includes(query) ||
        (s.caption ?? "").toLowerCase().includes(query)
      )
    : contentSets;
  const displayContent = (() => {
    let items = standalonePhotos;
    if (filter === "photos") items = items.filter(c => c.type === "IMAGE");
    if (filter === "videos") items = items.filter(c => c.type === "VIDEO" || c.type === "TALKING_HEAD");
    return items;
  })();

  return (
    <>
      {/* Filter + search bar */}
      <div className="filter-bar">
        <button className={`filter-pill${filter === "all" ? " active" : ""}`} onClick={() => setFilter("all")}>
          All<span className="count">{standalonePhotos.length + contentSets.length}</span>
        </button>
        <button className={`filter-pill${filter === "photos" ? " active" : ""}`} onClick={() => setFilter("photos")}>
          Photos<span className="count">{standalonePhotos.filter(c => c.type === "IMAGE").length}</span>
        </button>
        <button className={`filter-pill${filter === "videos" ? " active" : ""}`} onClick={() => setFilter("videos")}>
          Videos<span className="count">{standalonePhotos.filter(c => c.type === "VIDEO" || c.type === "TALKING_HEAD").length}</span>
        </button>
        <button className={`filter-pill${filter === "carousels" ? " active" : ""}`} onClick={() => setFilter("carousels")}>
          Carousels<span className="count">{contentSets.length}</span>
        </button>
        <span className="filter-divider" />
        <div className="gallery-search">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
          <input
            type="text"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="gallery-sort">
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value as "newest" | "oldest" | "type")}>
            <option value="newest">Newest</option>
            <option value="oldest">Oldest</option>
            <option value="type">By type</option>
          </select>
        </div>
        <span className="gallery-count">{displayContent.length + (filter === "all" || filter === "carousels" ? filteredSets.length : 0)} items</span>
      </div>

      {/* Content area */}
      <div className="content-area">

        {contentError && (
          <div style={{ padding: "8px 16px", color: "#e53e3e", fontSize: 13 }}>
            {contentError}
          </div>
        )}

        {standalonePhotos.length === 0 && contentSets.length === 0 && !isGeneratingContent ? (
          <NoContentState />
        ) : (
          <div className="content-grid" style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
            gap: 12,
            padding: "0 0 120px",
          }}>
            {isGeneratingContent && (
              Array.from({ length: imageCount }).map((_, i) => (
                <div key={`gen-${i}`} className="skel skel-card" style={{ aspectRatio: "1", borderRadius: 8 }} />
              ))
            )}

            {/* Standalone content (not part of a carousel) */}
            {(filter === "all" || filter === "photos" || filter === "videos") && displayContent.map((item) => {
              const isGenerating = item.status === "GENERATING";
              const isFailed = item.status === "FAILED";
              const isVideo = item.type === "VIDEO" || item.type === "TALKING_HEAD";

              // Generating card — shimmer + spinner + stage + elapsed + expectation
              if (isGenerating) {
                const startedAtMs = item.jobStartedAt
                  ? new Date(item.jobStartedAt).getTime()
                  : new Date(item.createdAt).getTime();
                const elapsedMs = Math.max(0, now - startedAtMs);
                const stageLabel =
                  item.jobStatus === "QUEUED" ? "Queued" :
                  item.jobStatus === "PROCESSING" ? "Processing" :
                  "Starting";
                const expectation = getExpectationMessage(item.falModel, elapsedMs);

                return (
                  <div key={item.id} className="content-card" style={{ position: "relative", overflow: "hidden" }}>
                    <div className="skel" style={{ width: "100%", height: "100%", position: "absolute", inset: 0 }} />
                    <div style={{
                      position: "absolute", inset: 0, display: "flex", flexDirection: "column",
                      alignItems: "center", justifyContent: "center", gap: 4, zIndex: 1, padding: 8,
                    }}>
                      <div className="studio-gen-spinner" />
                      <div className="gen-card-stage">
                        {stageLabel} <span className="gen-card-elapsed">· {formatElapsed(elapsedMs)}</span>
                      </div>
                      <div className="gen-card-expectation">{expectation}</div>
                      {item.userInput && (
                        <span style={{ fontSize: 9, color: "#BBB", maxWidth: "80%", textAlign: "center", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginTop: 4 }}>
                          {item.userInput}
                        </span>
                      )}
                    </div>
                    <span className="type-badge">{isVideo ? "Video" : "Photo"}</span>
                  </div>
                );
              }

              // Failed card
              if (isFailed) {
                return (
                  <div key={item.id} className="content-card" style={{ position: "relative", background: "#FFF5F5" }}>
                    <div style={{
                      position: "absolute", inset: 0, display: "flex", flexDirection: "column",
                      alignItems: "center", justifyContent: "center", gap: 4,
                    }}>
                      <span style={{ fontSize: 16 }}>&#x2717;</span>
                      <span style={{ fontSize: 11, color: "#C4603A", fontWeight: 500 }}>Failed</span>
                      <span style={{ fontSize: 9, color: "#BBB" }}>Credits refunded</span>
                    </div>
                    <span className="type-badge">{isVideo ? "Video" : "Photo"}</span>
                  </div>
                );
              }

              // Completed card
              return (
              <div
                key={item.id}
                className="content-card"
                style={{ position: "relative" }}
                onClick={() => {
                  setSelectedItem(item);
                  setDetailOpen(true);
                }}
              >
                {(() => {
                  const imgSrc = isVideo
                    ? item.thumbnailUrl
                    : item.url;
                  return imgSrc ? (
                    <img src={imgSrc} alt={item.userInput ?? "Generated content"} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : (
                    <div className="placeholder-img">&#x1F4F7;</div>
                  );
                })()}
                {isVideo && (
                  <div style={{
                    position: "absolute", inset: 0, display: "flex",
                    alignItems: "center", justifyContent: "center",
                    background: "rgba(0,0,0,0.2)", borderRadius: 8, pointerEvents: "none",
                  }}>
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="white" stroke="none" opacity={0.9}>
                      <polygon points="5 3 19 12 5 21 5 3" />
                    </svg>
                  </div>
                )}
                <span className="type-badge">{item.type === "VIDEO" ? "Video" : item.type === "TALKING_HEAD" ? "Talking Head" : "Photo"}</span>
              </div>
              );
            })}

            {/* Carousel cards (consolidated) */}
            {(filter === "all" || filter === "carousels") && filteredSets.map((set) => {
              const coverSlide = set.slides[0];
              return (
                <div
                  key={set.id}
                  className="content-card"
                  onClick={() => {
                    setCarouselSet(set);
                    setCarouselOpen(true);
                  }}
                >
                  {coverSlide?.url ? (
                    <img src={coverSlide.url} alt={set.formatId ?? "Carousel"} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : (
                    <div className="placeholder-img">📸</div>
                  )}
                  <span className="type-badge">Carousel</span>
                  <span className="carousel-badge">{set.slideCount} slides</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Floating input */}
      <div className="floating-input">
        <div className="float-card">
          <div className="compose-area">
            <textarea
              rows={1}
              placeholder={`What should ${creator.name} do next?`}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit();
                }
              }}
            />
            <button
              className="send-btn"
              onClick={handleSubmit}
              disabled={!prompt.trim() || isGeneratingContent}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M12 19V5M5 12l7-7 7 7" />
              </svg>
            </button>
          </div>

          <div className="input-toolbar">
            <div className="tool-left">
              <button className={`mode-chip${contentMode === "photo" ? " active" : ""}`} onClick={() => setContentMode("photo")}>
                Photo
              </button>
              <button className={`mode-chip${contentMode === "video" ? " active" : ""}`} onClick={() => setContentMode("video")}>
                Video
              </button>
              <button className="mode-chip" onClick={() => {
                useUnifiedStudioStore.getState().setContentType("carousel");
                router.push("/workspace/studio");
              }}>
                Carousel
              </button>
              <button className="mode-chip" onClick={() => {
                useUnifiedStudioStore.getState().setContentType("talking-head");
                router.push("/workspace/studio");
              }}>
                Voice
              </button>
            </div>
            <div className="tool-right">
              <button
                className="studio-link"
                onClick={() => {
                  const store = useUnifiedStudioStore.getState();
                  if (prompt.trim()) store.setPrompt(prompt);
                  const typeMap: Record<string, "photo" | "video"> = { photo: "photo", video: "video" };
                  if (contentMode && typeMap[contentMode]) store.setContentType(typeMap[contentMode]);
                  router.push("/workspace/studio");
                }}
              >
                Open studio →
              </button>
            </div>
          </div>
        </div>
      </div>

      <ContentDetail
        item={selectedItem}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onMakeCarousel={(item) => {
          useUnifiedStudioStore.getState().setContentType("carousel");
          useUnifiedStudioStore.getState().setSourceContentId(item.id);
          router.push("/workspace/studio");
        }}
      />
      <CarouselDetail
        contentSet={carouselSet}
        open={carouselOpen}
        onOpenChange={setCarouselOpen}
      />
    </>
  );
}

/* ─── Main Export ─── */
export function WorkspaceCanvas() {
  const { creators, activeCreatorId, loaded } = useCreatorStore();
  const active = creators.find((c) => c.id === activeCreatorId);

  if (!loaded) {
    return <CanvasSkeleton />;
  }

  if (!active) {
    return <NoCreatorsState />;
  }

  return <ContentArea creator={active} />;
}
