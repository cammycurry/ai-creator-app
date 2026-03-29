# Carousel Builder Dialog — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the hardcoded "Make Carousel" suggestions with a smart 3-phase builder dialog (Pick → Preview → Result) that uses AI to suggest formats based on the actual photo.

**Architecture:** New `CarouselBuilder` dialog component with 3 phases. New `suggestCarouselFormats` server action uses Grok to analyze the source photo. Modified `generateCarousel` accepts a source photo that becomes slide 1 (free). Existing `CarouselDetail` component reused for phase 3.

**Tech Stack:** Next.js 16 App Router, shadcn Dialog, Grok `grok-4-1-fast-non-reasoning`, Zustand, existing carousel generation pipeline.

**Spec:** `docs/superpowers/specs/2026-03-29-carousel-builder-dialog.md`

---

### Task 1: Server Action — `suggestCarouselFormats`

**Files:**
- Modify: `src/server/actions/carousel-actions.ts`

- [ ] **Step 1: Add the suggestCarouselFormats server action**

Add after the existing `suggestContent` function:

```typescript
// ─── Suggest carousel formats for an existing photo ─────

export type CarouselFormatSuggestion = {
  formatId: string;
  formatName: string;
  whyItWorks: string;
  slideCount: number;
  slideDescriptions: string[];
};

export async function suggestCarouselFormats(
  contentId: string
): Promise<{ suggestions: CarouselFormatSuggestion[] }> {
  const { userId: clerkId } = await auth();
  if (!clerkId) return { suggestions: [] };

  const content = await db.content.findFirst({
    where: { id: contentId, creator: { user: { clerkId } } },
    include: { creator: true },
  });
  if (!content) return { suggestions: [] };

  const settings = content.creator.settings as Record<string, string> | null;
  const niche = content.creator.niche as string[] | null;
  const photoPrompt = content.prompt ?? content.userInput ?? "photo";

  const formatList = CAROUSEL_FORMATS.map((f) =>
    `${f.id}: ${f.name} (${f.slideRange[0]}-${f.slideRange[1]} slides) — ${f.description}`
  ).join("\n");

  try {
    const response = await grok.chat.completions.create({
      model: "grok-4-1-fast-non-reasoning",
      messages: [
        {
          role: "system",
          content: `You suggest carousel formats for an existing Instagram photo. The photo becomes slide 1 — you describe what the REMAINING slides should be.

Output ONLY a JSON array of 3-4 suggestions:
[{
  "formatId": "format-id",
  "slideCount": N,
  "slideDescriptions": ["slide 2 description", "slide 3 description", ...]
}]

Each slideDescription should be a short TLDR (under 15 words) of what that slide shows. Be specific to the photo context — not generic.

Available formats:
${formatList}`,
        },
        {
          role: "user",
          content: `Photo context: ${photoPrompt}
Creator: ${content.creator.name}, ${(niche ?? []).join(", ")} niche
Gender: ${settings?.gender ?? "Female"}`,
        },
      ],
    });

    const text = response.choices?.[0]?.message?.content?.trim() ?? "[]";
    const raw = parseGrokJson(text);
    if (!Array.isArray(raw)) return { suggestions: [] };

    return {
      suggestions: raw.slice(0, 4).map((s: { formatId?: string; slideCount?: number; slideDescriptions?: string[] }) => {
        const format = CAROUSEL_FORMATS.find((f) => f.id === s.formatId);
        return {
          formatId: s.formatId ?? "",
          formatName: format?.name ?? s.formatId ?? "",
          whyItWorks: format?.whyItWorks ?? "",
          slideCount: s.slideCount ?? format?.slideRange[0] ?? 5,
          slideDescriptions: Array.isArray(s.slideDescriptions) ? s.slideDescriptions : [],
        };
      }).filter((s: CarouselFormatSuggestion) => s.formatId && CAROUSEL_FORMATS.some((f) => f.id === s.formatId)),
    };
  } catch {
    // Fallback — pick formats matching niche
    const nicheFormats = CAROUSEL_FORMATS.filter((f) =>
      f.niches.some((n) => (niche ?? []).includes(n))
    ).slice(0, 3);

    return {
      suggestions: nicheFormats.map((f) => ({
        formatId: f.id,
        formatName: f.name,
        whyItWorks: f.whyItWorks,
        slideCount: f.slideRange[0],
        slideDescriptions: f.slides.filter((s) => s.required).slice(1).map((s) => {
          const scene = getScene(s.sceneHint);
          return `${scene?.name ?? s.sceneHint} — ${s.moodHint}`;
        }),
      })),
    };
  }
}
```

- [ ] **Step 2: Modify generateCarousel to accept a source photo as slide 1**

Add a new optional parameter `sourceContentId` to `generateCarousel`. When provided, the source content becomes slide 1 (no generation, no credit) and only slides 2-N are generated.

Change the signature from:
```typescript
export async function generateCarousel(
  creatorId: string,
  formatId: string,
  slideCount?: number,
  userInstructions?: string
): Promise<CarouselResult> {
```

To:
```typescript
export async function generateCarousel(
  creatorId: string,
  formatId: string,
  slideCount?: number,
  userInstructions?: string,
  sourceContentId?: string,
  slideEdits?: Record<number, string>
): Promise<CarouselResult> {
```

Inside the function, after creating the contentSet, add this block before the parallel generation:

```typescript
  // If building from an existing photo, link it as slide 1
  let startIndex = 0;
  if (sourceContentId) {
    const sourceContent = await db.content.findUnique({ where: { id: sourceContentId } });
    if (sourceContent) {
      await db.content.update({
        where: { id: sourceContentId },
        data: {
          contentSetId: contentSet.id,
          slideIndex: 1,
          source: "CAROUSEL",
        },
      });
      startIndex = 1; // skip slide 1 in generation
    }
  }
```

Update the credit calculation to subtract 1 if sourceContentId is provided:
```typescript
  const slidesToGenerate = sourceContentId ? slides.slice(1) : slides;
  const totalCredits = slidesToGenerate.length * CREDIT_PER_SLIDE;
```

Update the generation loop to only generate `slidesToGenerate` (not all slides):
```typescript
    const results = await Promise.all(
      slidesToGenerate.map((slide, i) => {
        const scene = getScene(slide.sceneHint);
        const editedDesc = slideEdits?.[slide.position];
        const prompt = editedDesc
          ? `That exact ${gender.toLowerCase() === "male" ? "man" : "woman"} from the reference image. ${editedDesc}. Shot on iPhone, candid. ${REALISM_BASE}.`
          : buildSlidePrompt(slide, scene, gender, userInstructions);
        // ... rest same
```

- [ ] **Step 3: Commit**

```bash
git add src/server/actions/carousel-actions.ts
git commit -m "feat: suggestCarouselFormats action + generateCarousel sourceContentId support"
```

---

### Task 2: Carousel Builder Dialog Component

**Files:**
- Create: `src/components/workspace/carousel-builder.tsx`

- [ ] **Step 1: Create the 3-phase carousel builder dialog**

```tsx
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
```

- [ ] **Step 2: Commit**

```bash
git add src/components/workspace/carousel-builder.tsx
git commit -m "feat: 3-phase carousel builder dialog (pick → preview → result)"
```

---

### Task 3: CSS for Carousel Builder

**Files:**
- Modify: `src/app/workspace/workspace.css`

- [ ] **Step 1: Add carousel builder styles**

Insert before the responsive section:

```css
/* ═══ Carousel Builder ═══ */
.cb-dialog { max-width: 640px; }
.cb-source { display: flex; gap: 16px; align-items: center; padding-bottom: 16px; border-bottom: 1px solid var(--border, #EBEBEB); margin-bottom: 16px; }
.cb-source-img { width: 80px; height: 100px; border-radius: 10px; object-fit: cover; flex-shrink: 0; }
.cb-source-title { font-size: 14px; font-weight: 600; color: var(--text-primary, #111); }
.cb-source-hint { font-size: 12px; color: var(--text-secondary, #888); margin-top: 2px; }
.cb-loading { display: flex; align-items: center; gap: 12px; padding: 32px 0; justify-content: center; font-size: 13px; color: var(--text-secondary, #888); }
.cb-suggestions { display: flex; flex-direction: column; gap: 10px; }
.cb-format-card { display: flex; flex-direction: column; gap: 8px; padding: 14px 16px; border: 1.5px solid var(--border, #EBEBEB); border-radius: 12px; cursor: pointer; transition: all 150ms; text-align: left; background: transparent; }
.cb-format-card:hover { border-color: var(--accent, #C4603A); background: rgba(196, 96, 58, 0.02); }
.cb-format-header { display: flex; justify-content: space-between; align-items: center; }
.cb-format-name { font-size: 14px; font-weight: 600; color: var(--text-primary, #111); }
.cb-format-count { font-size: 11px; color: var(--text-muted, #BBB); font-weight: 500; }
.cb-format-slides { display: flex; flex-direction: column; gap: 2px; }
.cb-format-slide-desc { font-size: 12px; color: var(--text-secondary, #888); }
.cb-format-why { font-size: 11px; color: var(--text-muted, #BBB); font-style: italic; }
.cb-format-btn { font-size: 13px; font-weight: 600; color: var(--accent, #C4603A); align-self: flex-end; }
.cb-custom { margin-top: 12px; }
.cb-custom-input { width: 100%; padding: 10px 14px; font-size: 13px; border: 1px solid var(--border, #EBEBEB); border-radius: 10px; background: var(--surface, #fff); color: var(--text-primary, #111); font-family: inherit; }
.cb-custom-input:focus { border-color: var(--accent, #C4603A); outline: none; }
.cb-custom-input::placeholder { color: var(--text-muted, #BBB); }

/* Preview phase */
.cb-preview { display: flex; flex-direction: column; gap: 8px; }
.cb-slide-row { display: flex; gap: 12px; padding: 10px 12px; border-radius: 8px; background: var(--card, #F5F5F5); align-items: flex-start; }
.cb-slide-source { background: rgba(196, 96, 58, 0.06); border: 1px solid rgba(196, 96, 58, 0.15); }
.cb-slide-num { width: 24px; height: 24px; border-radius: 50%; background: var(--text-primary, #111); color: #fff; font-size: 12px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; margin-top: 2px; }
.cb-slide-source .cb-slide-num { background: var(--accent, #C4603A); }
.cb-slide-body { flex: 1; display: flex; flex-direction: column; gap: 4px; min-width: 0; }
.cb-slide-label { font-size: 13px; font-weight: 500; color: var(--accent, #C4603A); }
.cb-slide-desc { font-size: 13px; color: var(--text-primary, #111); line-height: 1.4; }
.cb-slide-edit { width: 100%; padding: 8px 10px; font-size: 13px; border: 1px solid var(--accent, #C4603A); border-radius: 6px; font-family: inherit; resize: none; }
.cb-slide-product { font-size: 12px; color: var(--accent, #C4603A); }
.cb-product-input { width: 100%; padding: 6px 10px; font-size: 12px; border: 1px solid var(--border, #EBEBEB); border-radius: 6px; font-family: inherit; margin-top: 4px; }
.cb-product-input:focus { border-color: var(--accent, #C4603A); outline: none; }
.cb-slide-check { color: var(--accent, #C4603A); font-weight: 600; }
.cb-slide-actions { display: flex; gap: 6px; flex-shrink: 0; }
.cb-slide-action { font-size: 11px; color: var(--text-muted, #BBB); background: transparent; border: 1px solid var(--border, #EBEBEB); border-radius: 6px; padding: 4px 10px; cursor: pointer; transition: all 150ms; }
.cb-slide-action:hover { color: var(--accent, #C4603A); border-color: var(--accent, #C4603A); }
.cb-instructions { margin-top: 8px; }
.cb-instructions-input { width: 100%; padding: 10px 14px; font-size: 13px; border: 1px solid var(--border, #EBEBEB); border-radius: 10px; background: var(--surface, #fff); color: var(--text-primary, #111); font-family: inherit; }
.cb-instructions-input:focus { border-color: var(--accent, #C4603A); outline: none; }
.cb-instructions-input::placeholder { color: var(--text-muted, #BBB); }
.cb-preview-footer { display: flex; justify-content: space-between; align-items: center; margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--border, #EBEBEB); }
.cb-credit-info { font-size: 12px; color: var(--text-secondary, #888); }
.cb-preview-btns { display: flex; gap: 8px; }
```

Add mobile overrides in the `@media (max-width: 640px)` block:

```css
  .cb-dialog { max-width: 100vw; width: 100vw; }
  .cb-source-img { width: 60px; height: 75px; }
  .cb-slide-action { min-height: 36px; }
  .cb-custom-input { font-size: 16px; min-height: 44px; }
  .cb-instructions-input { font-size: 16px; min-height: 44px; }
  .cb-slide-edit { font-size: 16px; }
  .cb-product-input { font-size: 16px; min-height: 38px; }
```

- [ ] **Step 2: Commit**

```bash
git add src/app/workspace/workspace.css
git commit -m "feat: carousel builder dialog styles + mobile responsive"
```

---

### Task 4: Wire Builder into Workspace

**Files:**
- Modify: `src/components/workspace/content-detail.tsx`
- Modify: `src/components/workspace/workspace-canvas.tsx`

- [ ] **Step 1: Update content-detail.tsx — replace hardcoded callback with builder trigger**

The `onMakeCarousel` callback should now just signal "open the builder for this photo" instead of showing hardcoded suggestions. The prop type stays the same — the parent handles opening the builder.

No changes needed to content-detail.tsx — the `onMakeCarousel` callback already works correctly.

- [ ] **Step 2: Update workspace-canvas.tsx — add CarouselBuilder dialog and wire onMakeCarousel**

Import the builder:
```typescript
import { CarouselBuilder } from "./carousel-builder";
```

Add state for the builder:
```typescript
const [builderPhoto, setBuilderPhoto] = useState<ContentItem | null>(null);
const [builderOpen, setBuilderOpen] = useState(false);
```

Replace the current `onMakeCarousel` handler (which shows hardcoded suggestions) with:
```typescript
onMakeCarousel={(item) => {
  setBuilderPhoto(item);
  setBuilderOpen(true);
}}
```

Render the builder dialog at the bottom of ContentArea (after CarouselDetail):
```tsx
<CarouselBuilder
  photo={builderPhoto}
  open={builderOpen}
  onOpenChange={setBuilderOpen}
/>
```

- [ ] **Step 3: Commit**

```bash
git add src/components/workspace/workspace-canvas.tsx
git commit -m "feat: wire carousel builder into workspace — Make Carousel opens builder"
```

---

### Task 5: Build Verification

- [ ] **Step 1: Build**

Run: `pnpm build 2>&1 | tail -20`
Expected: Clean build.

- [ ] **Step 2: Smoke test**

1. Open workspace → click a photo → detail dialog
2. Click "Make Carousel" → builder dialog opens
3. "Analyzing your photo..." loading → 3-4 format suggestions appear
4. Each suggestion shows format name, slide TLDRs, "why it works"
5. Click "Build This" → preview phase shows all slides
6. Slide 1 shows "Your photo (no cost)" with ✓
7. Each slide has Edit and + Product buttons
8. Click Edit → inline textarea, blur to save
9. Click + Product → describe input
10. Type global instructions
11. Click "Generate N Slides" → generation runs
12. Dialog transitions to carousel detail (grid + Instagram preview)
13. Original photo is slide 1 in the carousel

- [ ] **Step 3: Commit any fixes**

```bash
git add -A
git commit -m "fix: address builder smoke test issues"
```
