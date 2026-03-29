// src/components/workspace/carousel-builder.tsx
"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useCreatorStore } from "@/stores/creator-store";
import {
  suggestCarouselFormats,
  generateCarousel,
  type CarouselFormatSuggestion,
} from "@/server/actions/carousel-actions";
import { getWorkspaceData } from "@/server/actions/workspace-actions";
import { CarouselDetail } from "./carousel-detail";
import { CAROUSEL_FORMATS } from "@/data/carousel-formats";
import { getScene } from "@/data/scenes";
import type { ContentItem, ContentSetItem } from "@/types/content";

type Phase = "pick" | "preview" | "result";

// ─── Phase 1: Pick Format ─────

function PickPhase({
  photo,
  suggestions,
  loading,
  onPick,
  onCustom,
}: {
  photo: ContentItem;
  suggestions: CarouselFormatSuggestion[];
  loading: boolean;
  onPick: (suggestion: CarouselFormatSuggestion) => void;
  onCustom: (text: string) => void;
}) {
  const [customText, setCustomText] = useState("");

  return (
    <div className="cb-pick">
      <div className="cb-source">
        {photo.url && <img src={photo.url} alt="Source photo" className="cb-source-img" />}
        <div className="cb-source-info">
          <div className="cb-source-title">This photo becomes slide 1</div>
          <div className="cb-source-hint">Pick a format and we'll generate the rest to match.</div>
        </div>
      </div>

      {loading ? (
        <div className="cb-loading">
          <div className="studio-gen-spinner" />
          <span>Analyzing your photo...</span>
        </div>
      ) : (
        <div className="cb-suggestions">
          {suggestions.map((s) => (
            <button key={s.formatId} className="cb-format-card" onClick={() => onPick(s)}>
              <div className="cb-format-header">
                <span className="cb-format-name">{s.formatName}</span>
                <span className="cb-format-count">{s.slideCount} slides</span>
              </div>
              <div className="cb-format-slides">
                {s.slideDescriptions.map((desc, i) => (
                  <span key={i} className="cb-format-slide-desc">Slide {i + 2}: {desc}</span>
                ))}
              </div>
              <div className="cb-format-why">{s.whyItWorks}</div>
              <span className="cb-format-btn">Build This →</span>
            </button>
          ))}
        </div>
      )}

      <div className="cb-custom">
        <input
          placeholder="Or describe what you want..."
          value={customText}
          onChange={(e) => setCustomText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && customText.trim()) onCustom(customText.trim());
          }}
          className="cb-custom-input"
        />
      </div>
    </div>
  );
}

// ─── Phase 2: Preview & Customize ─────

function PreviewPhase({
  photo,
  suggestion,
  onBack,
  onGenerate,
  generating,
}: {
  photo: ContentItem;
  suggestion: CarouselFormatSuggestion;
  onBack: () => void;
  onGenerate: (slideEdits: Record<number, string>, instructions: string, productDescs: Record<number, string>) => void;
  generating: boolean;
}) {
  const format = CAROUSEL_FORMATS.find((f) => f.id === suggestion.formatId);
  const slides = format?.slides.filter((s) => s.required).slice(0, suggestion.slideCount) ?? [];
  const [slideEdits, setSlideEdits] = useState<Record<number, string>>({});
  const [productDescs, setProductDescs] = useState<Record<number, string>>({});
  const [instructions, setInstructions] = useState("");
  const [editingSlide, setEditingSlide] = useState<number | null>(null);
  const [productSlide, setProductSlide] = useState<number | null>(null);

  const generatedSlides = slides.slice(1); // skip slide 1 (the original photo)
  const creditCost = generatedSlides.length;

  return (
    <div className="cb-preview">
      {/* Slide 1: original photo */}
      <div className="cb-slide-row cb-slide-source">
        <span className="cb-slide-num">①</span>
        <div className="cb-slide-body">
          <span className="cb-slide-label">Your photo (no cost)</span>
        </div>
        <span className="cb-slide-check">✓</span>
      </div>

      {/* Remaining slides */}
      {generatedSlides.map((slide, i) => {
        const scene = getScene(slide.sceneHint);
        const aiDesc = suggestion.slideDescriptions[i] ?? `${scene?.name ?? slide.sceneHint} — ${slide.moodHint}`;
        const editedDesc = slideEdits[slide.position];
        const product = productDescs[slide.position];
        const isEditing = editingSlide === slide.position;

        return (
          <div key={slide.position} className="cb-slide-row">
            <span className="cb-slide-num">{String.fromCodePoint(0x2460 + slide.position)}</span>
            <div className="cb-slide-body">
              {isEditing ? (
                <textarea
                  className="cb-slide-edit"
                  defaultValue={editedDesc ?? aiDesc}
                  rows={2}
                  autoFocus
                  onBlur={(e) => {
                    setSlideEdits({ ...slideEdits, [slide.position]: e.target.value });
                    setEditingSlide(null);
                  }}
                />
              ) : (
                <span className="cb-slide-desc">{editedDesc ?? aiDesc}</span>
              )}
              {product && <span className="cb-slide-product">🏷️ {product}</span>}
              {productSlide === slide.position ? (
                <input
                  className="cb-product-input"
                  placeholder="Describe the product..."
                  autoFocus
                  onBlur={(e) => {
                    if (e.target.value.trim()) setProductDescs({ ...productDescs, [slide.position]: e.target.value.trim() });
                    setProductSlide(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                  }}
                />
              ) : null}
            </div>
            <div className="cb-slide-actions">
              <button className="cb-slide-action" onClick={() => setEditingSlide(isEditing ? null : slide.position)}>Edit</button>
              <button className="cb-slide-action" onClick={() => setProductSlide(productSlide === slide.position ? null : slide.position)}>+ Product</button>
            </div>
          </div>
        );
      })}

      {/* Global instructions */}
      <div className="cb-instructions">
        <input
          placeholder="Add instructions for all slides..."
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
          className="cb-instructions-input"
        />
      </div>

      {/* Footer */}
      <div className="cb-preview-footer">
        <span className="cb-credit-info">{creditCost} slides × 1 credit = {creditCost} credits</span>
        <div className="cb-preview-btns">
          <button className="studio-btn secondary" onClick={onBack}>Back</button>
          <button
            className="studio-btn primary"
            onClick={() => onGenerate(slideEdits, instructions, productDescs)}
            disabled={generating}
          >
            {generating ? "Generating..." : `Generate ${creditCost} Slides`}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Builder ─────

export function CarouselBuilder({
  photo,
  open,
  onOpenChange,
}: {
  photo: ContentItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [phase, setPhase] = useState<Phase>("pick");
  const [suggestions, setSuggestions] = useState<CarouselFormatSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [selectedSuggestion, setSelectedSuggestion] = useState<CarouselFormatSuggestion | null>(null);
  const [resultSet, setResultSet] = useState<ContentSetItem | null>(null);
  const { addContentSet, setCredits } = useCreatorStore();

  // Load suggestions when dialog opens
  useEffect(() => {
    if (open && photo) {
      setPhase("pick");
      setSuggestions([]);
      setSelectedSuggestion(null);
      setResultSet(null);
      setLoading(true);
      suggestCarouselFormats(photo.id).then((result) => {
        setSuggestions(result.suggestions);
        setLoading(false);
      });
    }
  }, [open, photo]);

  if (!photo) return null;

  // Phase 3: show carousel detail
  if (phase === "result" && resultSet) {
    return (
      <CarouselDetail
        contentSet={resultSet}
        open={open}
        onOpenChange={onOpenChange}
      />
    );
  }

  async function handleGenerate(
    slideEdits: Record<number, string>,
    instructions: string,
    productDescs: Record<number, string>
  ) {
    if (!selectedSuggestion || !photo) return;
    setGenerating(true);

    // Merge product descriptions into slide edits
    const mergedEdits = { ...slideEdits };
    for (const [pos, product] of Object.entries(productDescs)) {
      const posNum = Number(pos);
      const existing = mergedEdits[posNum] ?? "";
      mergedEdits[posNum] = `${existing}${existing ? ". " : ""}Holding ${product}, product clearly visible`;
    }

    const result = await generateCarousel(
      photo.creatorId,
      selectedSuggestion.formatId,
      selectedSuggestion.slideCount,
      instructions || undefined,
      photo.id,
      Object.keys(mergedEdits).length > 0 ? mergedEdits : undefined
    );

    if (result.success) {
      addContentSet(result.contentSet);
      setResultSet(result.contentSet);
      setPhase("result");
      const data = await getWorkspaceData();
      setCredits(data.balance);
    }
    setGenerating(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="carousel-dialog cb-dialog">
        <div className="carousel-dialog-header">
          <h3 className="carousel-dialog-title">
            {phase === "pick" ? "Make Carousel" : selectedSuggestion?.formatName ?? "Carousel"}
          </h3>
        </div>
        <div className="carousel-dialog-body">
          {phase === "pick" && (
            <PickPhase
              photo={photo}
              suggestions={suggestions}
              loading={loading}
              onPick={(s) => { setSelectedSuggestion(s); setPhase("preview"); }}
              onCustom={() => {/* TODO: freeform carousel */}}
            />
          )}
          {phase === "preview" && selectedSuggestion && (
            <PreviewPhase
              photo={photo}
              suggestion={selectedSuggestion}
              onBack={() => setPhase("pick")}
              onGenerate={handleGenerate}
              generating={generating}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
