"use client";

import { useState, useEffect, useCallback } from "react";
import { useCreatorStore } from "@/stores/creator-store";
import { useUIStore } from "@/stores/ui-store";
import { generateContent, getCreatorContent } from "@/server/actions/content-actions";
import { getWorkspaceData } from "@/server/actions/workspace-actions";
import { ContentDetail } from "./content-detail";
import { CarouselDetail } from "./carousel-detail";
import { SuggestionCards, type Suggestion } from "./suggestion-cards";
import { useUnifiedStudioStore } from "@/stores/unified-studio-store";
import { suggestContent, generateCarousel, getCreatorContentSets } from "@/server/actions/carousel-actions";
import { TemplatesView } from "./templates-view";
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
function ContentArea({ creator }: { creator: { id: string; name: string; contentCount: number } }) {
  const [prompt, setPrompt] = useState("");
  const [contentMode, setContentMode] = useState<"photo" | "video">("photo");
  const [selectedItem, setSelectedItem] = useState<ContentItem | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [suggestLoading, setSuggestLoading] = useState(false);
  const [carouselSet, setCarouselSet] = useState<ContentSetItem | null>(null);
  const [carouselOpen, setCarouselOpen] = useState(false);
  const [filter, setFilter] = useState<"all" | "photos" | "carousels">("all");
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
    addContentSet,
    setIsGeneratingContent,
    setContentError,
    setImageCount,
    setCredits,
  } = useCreatorStore();

  useEffect(() => {
    getCreatorContent(creator.id).then(setContent);
    getCreatorContentSets(creator.id).then(setContentSets);
  }, [creator.id, setContent, setContentSets]);

  const handleSubmit = useCallback(async () => {
    if (!prompt.trim() || isGeneratingContent) return;
    const input = prompt.trim();

    // Detect idea/carousel requests → show suggestion cards
    const ideaKeywords = ["help", "idea", "suggest", "idk", "carousel", "dump", "showcase", "grwm", "photo dump"];
    const isIdeaRequest = ideaKeywords.some((k) => input.toLowerCase().includes(k));

    if (isIdeaRequest) {
      setSuggestLoading(true);
      setPrompt("");
      const result = await suggestContent(creator.id, input);
      setSuggestions(result.suggestions);
      setSuggestLoading(false);
      return;
    }

    // Video mode — open studio instead
    if (contentMode === "video") {
      useUnifiedStudioStore.getState().setContentType("video");
      useUnifiedStudioStore.getState().setPrompt(input);
      useUIStore.getState().setContentStudioOpen(true);
      setPrompt("");
      return;
    }

    // Otherwise, generate single photo (existing behavior)
    setSuggestions([]);
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

  const handleSuggestionGenerate = useCallback(async (suggestion: Suggestion) => {
    setSuggestions([]);
    if (suggestion.type === "carousel" && suggestion.formatId) {
      setIsGeneratingContent(true);
      setContentError(null);
      const result = await generateCarousel(creator.id, suggestion.formatId, suggestion.slideCount);
      setIsGeneratingContent(false);
      if (result.success) {
        addContentSet(result.contentSet);
        setCarouselSet(result.contentSet);
        setCarouselOpen(true);
        const data = await getWorkspaceData();
        setCredits(data.balance);
      } else {
        setContentError(result.error);
      }
    } else {
      // Single photo — set prompt and submit
      setPrompt(suggestion.title);
    }
  }, [creator.id, addContentSet, setIsGeneratingContent, setContentError, setCredits]);

  const standalonePhotos = content.filter((c) => !c.contentSetId);
  const query = searchQuery.toLowerCase().trim();
  const filteredContent = query
    ? standalonePhotos.filter((c) =>
        (c.userInput ?? "").toLowerCase().includes(query) ||
        (c.prompt ?? "").toLowerCase().includes(query)
      )
    : standalonePhotos;
  const filteredSets = query
    ? contentSets.filter((s) =>
        (s.formatId ?? "").toLowerCase().includes(query) ||
        (s.caption ?? "").toLowerCase().includes(query)
      )
    : contentSets;
  const sortedContent = [...filteredContent].sort((a, b) => {
    if (sortBy === "oldest") return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    if (sortBy === "type") return a.type.localeCompare(b.type);
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  return (
    <>
      {/* Filter pills */}
      <div className="filter-bar">
        <button className={`filter-pill${filter === "all" ? " active" : ""}`} onClick={() => setFilter("all")}>
          All<span className="count">{standalonePhotos.length + contentSets.length}</span>
        </button>
        <button className={`filter-pill${filter === "photos" ? " active" : ""}`} onClick={() => setFilter("photos")}>
          Photos<span className="count">{standalonePhotos.length}</span>
        </button>
        <button className={`filter-pill${filter === "carousels" ? " active" : ""}`} onClick={() => setFilter("carousels")}>
          Carousels<span className="count">{contentSets.length}</span>
        </button>
        <button className="filter-pill" disabled style={{ opacity: 0.5 }}>
          Videos<span className="count">0</span>
        </button>
        <button className="filter-pill" disabled style={{ opacity: 0.5 }}>
          Voice<span className="count">0</span>
        </button>
        <span className="filter-divider" />
        <button
          className="filter-pill"
          onClick={() => useUIStore.getState().setContentStudioOpen(true)}
        >
          Templates
        </button>
      </div>

      {/* Content area */}
      <div className="content-area">
        {/* Gallery toolbar */}
        <div className="gallery-toolbar">
          <div className="gallery-search">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <path d="M21 21l-4.35-4.35" />
            </svg>
            <input
              type="text"
              placeholder="Search content..."
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
          <span className="gallery-count">{sortedContent.length + (filter !== "photos" ? filteredSets.length : 0)} items</span>
        </div>

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

            {/* Standalone photos (not part of a carousel) */}
            {(filter === "all" || filter === "photos") && sortedContent.map((item) => (
              <div
                key={item.id}
                className="content-card"
                style={{ position: "relative" }}
                onClick={() => {
                  setSelectedItem(item);
                  setDetailOpen(true);
                }}
              >
                {item.url ? (
                  <img src={item.url} alt={item.userInput ?? "Generated content"} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  <div className="placeholder-img">📷</div>
                )}
                {item.type === "VIDEO" && (
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
                <span className="type-badge">{item.type === "VIDEO" ? "Video" : "Photo"}</span>
              </div>
            ))}

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

      {suggestions.length > 0 && (
        <div style={{ position: "fixed", bottom: 140, left: "50%", transform: "translateX(-50%)", zIndex: 10, width: "100%", maxWidth: 680, padding: "0 16px" }}>
          <SuggestionCards
            suggestions={suggestions}
            onGenerate={handleSuggestionGenerate}
            loading={isGeneratingContent}
          />
        </div>
      )}

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

          <div className="quick-ideas">
            {[
              "Mirror selfie at the gym",
              "Get ready with me",
              "Outfit check in bedroom",
              "Walking through city at golden hour",
            ].map((chip) => (
              <button key={chip} className="idea-chip" onClick={() => setPrompt(chip)}>{chip}</button>
            ))}
          </div>

          <div className="input-toolbar">
            <div className="tool-left">
              <button className="tool-btn" title="Attach reference">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" />
                </svg>
              </button>
              <div className="count-control">
                <button className="count-btn" onClick={() => setImageCount(imageCount - 1)}>−</button>
                <span className="count-value">{imageCount}</span>
                <button className="count-btn" onClick={() => setImageCount(imageCount + 1)}>+</button>
              </div>
              <button className="tool-btn" title="Settings">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6" />
                </svg>
              </button>
            </div>
            <div className="tool-right">
              <button className={`mode-chip${contentMode === "photo" ? " active" : ""}`} onClick={() => setContentMode("photo")}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <path d="M21 15l-5-5L5 21" />
                </svg>
                Photo
              </button>
              <button className={`mode-chip${contentMode === "video" ? " active" : ""}`} onClick={() => {
                useUnifiedStudioStore.getState().setContentType("video");
                useUIStore.getState().setContentStudioOpen(true);
              }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polygon points="5 3 19 12 5 21 5 3" />
                </svg>
                Video
              </button>
              <button className="mode-chip" onClick={() => {
                useUnifiedStudioStore.getState().setContentType("talking-head");
                useUIStore.getState().setContentStudioOpen(true);
              }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" />
                  <path d="M19 10v2a7 7 0 01-14 0v-2" />
                </svg>
                Voice
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
          useUIStore.getState().setContentStudioOpen(true);
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
  const { activeView } = useUIStore();
  const active = creators.find((c) => c.id === activeCreatorId);

  if (!loaded) {
    return <CanvasSkeleton />;
  }

  if (!active) {
    return <NoCreatorsState />;
  }

  if (activeView === "templates") {
    return <TemplatesArea />;
  }

  return <ContentArea creator={active} />;
}

/* ─── Templates Wrapper (shown when activeView === "templates") ─── */
function TemplatesArea() {
  const { setActiveView } = useUIStore();

  return (
    <>
      <div className="filter-bar">
        <button
          className="filter-pill"
          onClick={() => setActiveView("chat")}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: 4 }}>
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          Content
        </button>
        <span className="filter-divider" />
        <button className="filter-pill active">
          Templates
        </button>
      </div>
      <div className="content-area">
        <TemplatesView />
      </div>
    </>
  );
}
