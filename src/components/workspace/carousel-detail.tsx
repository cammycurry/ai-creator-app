// src/components/workspace/carousel-detail.tsx
"use client";

import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useCreatorStore } from "@/stores/creator-store";
import { regenerateSlide, rewriteCaption } from "@/server/actions/carousel-actions";
import type { ContentSetItem, ContentItem } from "@/types/content";

const CAPTION_CHIPS = ["Rewrite", "More casual", "Add CTA", "Shorter"];

function SlideGrid({ slides, onSlideClick }: { slides: ContentItem[]; onSlideClick: (index: number) => void }) {
  return (
    <div className="carousel-slide-grid">
      {slides.map((slide, i) => (
        <div
          key={slide.id}
          className="carousel-slide-card"
          onClick={() => onSlideClick(i)}
        >
          {slide.url ? (
            <img src={slide.url} alt={`Slide ${i + 1}`} />
          ) : (
            <div className="carousel-slide-placeholder">Generating...</div>
          )}
          <span className="carousel-slide-num">{i + 1}</span>
        </div>
      ))}
    </div>
  );
}

function InstagramPreview({ slides, caption, creatorName }: { slides: ContentItem[]; caption?: string; creatorName: string }) {
  const [currentSlide, setCurrentSlide] = useState(0);

  return (
    <div className="carousel-ig-preview">
      <div className="carousel-ig-phone">
        <div className="carousel-ig-image">
          {slides[currentSlide]?.url ? (
            <img src={slides[currentSlide].url} alt={`Slide ${currentSlide + 1}`} />
          ) : (
            <div className="carousel-slide-placeholder">...</div>
          )}
        </div>
        <div className="carousel-ig-dots">
          {slides.map((_, i) => (
            <button
              key={i}
              className={`carousel-ig-dot${i === currentSlide ? " active" : ""}`}
              onClick={() => setCurrentSlide(i)}
            />
          ))}
        </div>
        <div className="carousel-ig-caption">
          <span className="carousel-ig-name">{creatorName}</span>
          <span className="carousel-ig-text">{caption ?? ""}</span>
        </div>
      </div>
      <div className="carousel-ig-nav">
        <button
          disabled={currentSlide === 0}
          onClick={() => setCurrentSlide(currentSlide - 1)}
          className="carousel-ig-arrow"
        >
          ◀
        </button>
        <span className="carousel-ig-counter">{currentSlide + 1} / {slides.length}</span>
        <button
          disabled={currentSlide === slides.length - 1}
          onClick={() => setCurrentSlide(currentSlide + 1)}
          className="carousel-ig-arrow"
        >
          ▶
        </button>
      </div>
    </div>
  );
}

function SlideLightbox({
  slide,
  slideIndex,
  totalSlides,
  onClose,
  onPrev,
  onNext,
  onRegenerated,
}: {
  slide: ContentItem;
  slideIndex: number;
  totalSlides: number;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
  onRegenerated: (updated: ContentItem) => void;
}) {
  const [feedback, setFeedback] = useState("");
  const [regenerating, setRegenerating] = useState(false);

  async function handleRegenerate() {
    setRegenerating(true);
    const result = await regenerateSlide(slide.id, feedback || undefined);
    if (result.success) {
      onRegenerated(result.slide);
      setFeedback("");
    }
    setRegenerating(false);
  }

  return (
    <div className="carousel-lightbox" onClick={onClose}>
      <div className="carousel-lightbox-inner" onClick={(e) => e.stopPropagation()}>
        <button className="carousel-lightbox-close" onClick={onClose}>✕</button>
        <div className="carousel-lightbox-nav">
          <button onClick={onPrev} disabled={slideIndex === 0} className="carousel-ig-arrow">◀</button>
          <span>Slide {slideIndex + 1} of {totalSlides}</span>
          <button onClick={onNext} disabled={slideIndex === totalSlides - 1} className="carousel-ig-arrow">▶</button>
        </div>
        {slide.url && <img src={slide.url} alt={`Slide ${slideIndex + 1}`} />}
        <div className="carousel-lightbox-regen">
          <input
            placeholder="What should be different?"
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !regenerating) handleRegenerate(); }}
            className="carousel-regen-input"
          />
          <button
            onClick={handleRegenerate}
            disabled={regenerating}
            className="carousel-regen-btn"
          >
            {regenerating ? "Regenerating..." : "Regenerate This Slide"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function CarouselDetail({
  contentSet: initialSet,
  open,
  onOpenChange,
}: {
  contentSet: ContentSetItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [viewMode, setViewMode] = useState<"grid" | "preview">("grid");
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [contentSet, setContentSet] = useState(initialSet);
  const [captionText, setCaptionText] = useState(initialSet?.caption ?? "");
  const [hashtags, setHashtags] = useState(initialSet?.hashtags ?? []);
  const [rewriting, setRewriting] = useState(false);
  const creator = useCreatorStore.getState().getActiveCreator();

  // Sync when prop changes
  if (initialSet && initialSet.id !== contentSet?.id) {
    setContentSet(initialSet);
    setCaptionText(initialSet.caption ?? "");
    setHashtags(initialSet.hashtags ?? []);
  }

  if (!contentSet) return null;

  const slides = contentSet.slides.sort((a, b) => (a.slideIndex ?? 0) - (b.slideIndex ?? 0));

  function handleSlideRegenerated(updated: ContentItem) {
    setContentSet((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        slides: prev.slides.map((s) => s.id === updated.id ? { ...s, ...updated } : s),
      };
    });
  }

  async function handleCaptionRewrite(instruction?: string) {
    setRewriting(true);
    const result = await rewriteCaption(contentSet!.id, instruction);
    if (result.caption) {
      setCaptionText(result.caption);
      setHashtags(result.hashtags);
    }
    setRewriting(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="carousel-dialog">
        <div className="carousel-dialog-header">
          <div>
            <h3 className="carousel-dialog-title">{contentSet.formatId?.replace(/-/g, " ") ?? "Carousel"}</h3>
            <span className="carousel-dialog-meta">{slides.length} slides</span>
          </div>
          <div className="carousel-view-toggle">
            <button
              className={`carousel-view-btn${viewMode === "grid" ? " active" : ""}`}
              onClick={() => setViewMode("grid")}
            >
              Grid
            </button>
            <button
              className={`carousel-view-btn${viewMode === "preview" ? " active" : ""}`}
              onClick={() => setViewMode("preview")}
            >
              Preview
            </button>
          </div>
        </div>

        <div className="carousel-dialog-body">
          {viewMode === "grid" ? (
            <SlideGrid slides={slides} onSlideClick={(i) => setLightboxIndex(i)} />
          ) : (
            <InstagramPreview
              slides={slides}
              caption={captionText}
              creatorName={creator?.name ?? ""}
            />
          )}
        </div>

        <div className="carousel-dialog-caption">
          <textarea
            value={captionText}
            onChange={(e) => setCaptionText(e.target.value)}
            className="carousel-caption-input"
            rows={2}
          />
          <div className="carousel-caption-hashtags">
            {hashtags.map((h) => `#${h}`).join(" ")}
          </div>
          <div className="carousel-caption-chips">
            {CAPTION_CHIPS.map((chip) => (
              <button
                key={chip}
                className="carousel-caption-chip"
                onClick={() => handleCaptionRewrite(chip === "Rewrite" ? undefined : chip)}
                disabled={rewriting}
              >
                {chip === "Rewrite" ? "↻ Rewrite" : chip}
              </button>
            ))}
          </div>
        </div>

        <div className="carousel-dialog-footer">
          <button className="studio-btn secondary" onClick={() => {/* TODO: download all */}}>
            Download All
          </button>
          <button className="studio-btn secondary" onClick={() => navigator.clipboard.writeText(`${captionText}\n\n${hashtags.map((h) => `#${h}`).join(" ")}`)}>
            Copy Caption
          </button>
        </div>

        {lightboxIndex !== null && slides[lightboxIndex] && (
          <SlideLightbox
            slide={slides[lightboxIndex]}
            slideIndex={lightboxIndex}
            totalSlides={slides.length}
            onClose={() => setLightboxIndex(null)}
            onPrev={() => setLightboxIndex(Math.max(0, lightboxIndex - 1))}
            onNext={() => setLightboxIndex(Math.min(slides.length - 1, lightboxIndex + 1))}
            onRegenerated={handleSlideRegenerated}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
