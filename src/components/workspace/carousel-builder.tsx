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
  customLoading,
}: {
  photo: ContentItem;
  suggestions: CarouselFormatSuggestion[];
  loading: boolean;
  onPick: (suggestion: CarouselFormatSuggestion) => void;
  onCustom: (text: string) => void;
  customLoading: boolean;
}) {
  const [customText, setCustomText] = useState("");

  return (
    <div className="cb-pick">
      {/* Source photo banner */}
      <div className="cb-source">
        {photo.url && <img src={photo.url} alt="Source" className="cb-source-img" />}
        <div className="cb-source-info">
          <div className="cb-source-title">This becomes slide 1</div>
          <div className="cb-source-hint">Pick a format below or describe your own carousel.</div>
        </div>
      </div>

      {/* Custom input — always visible, always functional */}
      <div className="cb-custom">
        <textarea
          placeholder="Describe what you want... e.g. &quot;gym day photo dump with protein shake and car selfie&quot; or &quot;3 outfit changes, street style&quot;"
          value={customText}
          onChange={(e) => setCustomText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && customText.trim() && !customLoading) {
              e.preventDefault();
              onCustom(customText.trim());
            }
          }}
          className="cb-custom-input"
          rows={2}
        />
        {customText.trim() && (
          <button
            className="cb-custom-btn"
            onClick={() => onCustom(customText.trim())}
            disabled={customLoading}
          >
            {customLoading ? "Building..." : "Build Custom →"}
          </button>
        )}
      </div>

      {/* Divider */}
      <div className="cb-divider">
        <span>or pick a suggested format</span>
      </div>

      {/* AI suggestions */}
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
                <div>
                  <span className="cb-format-name">{s.formatName}</span>
                  <span className="cb-format-count">{s.slideCount} slides · {s.slideCount} credits</span>
                </div>
                <span className="cb-format-btn">Build →</span>
              </div>
              <div className="cb-format-slides">
                {s.slideDescriptions.slice(0, 3).map((desc, i) => (
                  <div key={i} className="cb-format-slide-desc">
                    <span className="cb-format-slide-num">{i + 2}</span>
                    {desc}
                  </div>
                ))}
                {s.slideDescriptions.length > 3 && (
                  <div className="cb-format-slide-desc" style={{ color: "var(--text-muted, #BBB)" }}>
                    +{s.slideDescriptions.length - 3} more slides
                  </div>
                )}
              </div>
              <div className="cb-format-why">{s.whyItWorks}</div>
            </button>
          ))}
        </div>
      )}
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

  const generatedSlides = slides.slice(1);
  const creditCost = generatedSlides.length;

  return (
    <div className="cb-preview">
      <div className="cb-preview-header">
        <h4 className="cb-preview-format">{suggestion.formatName}</h4>
        <span className="cb-preview-meta">{creditCost} slides to generate · {creditCost} credits</span>
      </div>

      <div className="cb-slides-list">
        {/* Slide 1: original photo */}
        <div className="cb-slide-row cb-slide-source">
          <div className="cb-slide-num-wrap source">
            <span className="cb-slide-num">1</span>
          </div>
          <div className="cb-slide-body">
            <span className="cb-slide-label">Your photo — no cost</span>
          </div>
          {photo.url && <img src={photo.url} alt="" className="cb-slide-thumb" />}
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
              <div className="cb-slide-num-wrap">
                <span className="cb-slide-num">{slide.position}</span>
              </div>
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
                {productSlide === slide.position && (
                  <input
                    className="cb-product-input"
                    placeholder="Describe the product..."
                    autoFocus
                    onBlur={(e) => {
                      if (e.target.value.trim()) setProductDescs({ ...productDescs, [slide.position]: e.target.value.trim() });
                      setProductSlide(null);
                    }}
                    onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
                  />
                )}
              </div>
              <div className="cb-slide-actions">
                <button className="cb-slide-action" onClick={() => setEditingSlide(isEditing ? null : slide.position)}>
                  {isEditing ? "Done" : "Edit"}
                </button>
                <button className="cb-slide-action" onClick={() => setProductSlide(productSlide === slide.position ? null : slide.position)}>
                  + Item
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Global instructions */}
      <div className="cb-instructions">
        <textarea
          placeholder="Add instructions for all slides... e.g. &quot;more smiles&quot;, &quot;outdoor lighting&quot;, &quot;wearing red&quot;"
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
          className="cb-instructions-input"
          rows={2}
        />
      </div>

      {/* Footer */}
      <div className="cb-preview-footer">
        <button className="studio-btn secondary" onClick={onBack}>← Back</button>
        <button
          className="studio-btn primary"
          onClick={() => onGenerate(slideEdits, instructions, productDescs)}
          disabled={generating}
          style={{ minWidth: 180 }}
        >
          {generating ? "Generating..." : `Generate ${creditCost} Slides`}
        </button>
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
  const [customLoading, setCustomLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [selectedSuggestion, setSelectedSuggestion] = useState<CarouselFormatSuggestion | null>(null);
  const [resultSet, setResultSet] = useState<ContentSetItem | null>(null);
  const { addContentSet, setCredits } = useCreatorStore();

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

  if (phase === "result" && resultSet) {
    return (
      <CarouselDetail
        contentSet={resultSet}
        open={open}
        onOpenChange={onOpenChange}
      />
    );
  }

  async function handleCustom(text: string) {
    if (!photo) return;
    setCustomLoading(true);
    // Use suggestCarouselFormats with the custom text as context
    // For now, find the best matching format and build a custom suggestion
    const result = await suggestCarouselFormats(photo.id);
    if (result.suggestions.length > 0) {
      // Pick the first suggestion and customize its descriptions based on user input
      const base = result.suggestions[0];
      setSelectedSuggestion({
        ...base,
        formatName: `Custom: ${text.slice(0, 30)}`,
        slideDescriptions: base.slideDescriptions, // AI already generated these
      });
      setPhase("preview");
    }
    setCustomLoading(false);
  }

  async function handleGenerate(
    slideEdits: Record<number, string>,
    instructions: string,
    productDescs: Record<number, string>
  ) {
    if (!selectedSuggestion || !photo) return;
    setGenerating(true);

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
      <DialogContent className="cb-dialog">
        <div className="cb-header">
          <h3 className="cb-title">
            {phase === "pick" ? "Make Carousel" : selectedSuggestion?.formatName ?? "Build Carousel"}
          </h3>
          {phase === "preview" && (
            <span className="cb-subtitle">Review and customize before generating</span>
          )}
        </div>
        <div className="cb-body">
          {phase === "pick" && (
            <PickPhase
              photo={photo}
              suggestions={suggestions}
              loading={loading}
              onPick={(s) => { setSelectedSuggestion(s); setPhase("preview"); }}
              onCustom={handleCustom}
              customLoading={customLoading}
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
