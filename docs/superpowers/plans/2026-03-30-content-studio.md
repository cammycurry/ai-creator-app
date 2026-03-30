# Content Studio Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a full-screen Content Studio overlay — template library browse, split-panel slide builder with per-slide reference attachment, smart auto-matching, and review/generate flow.

**Architecture:** Full-screen overlay (same pattern as Creator Studio at `src/components/studio/creator-studio.tsx`). Three-step flow: Browse Library → Builder → Review & Generate. New Zustand store for studio state. Extended `generateCarousel` server action to accept reference IDs per slide. Prototype-first CSS.

**Tech Stack:** Next.js (React), Zustand, prototype-first CSS, existing Gemini/Grok generation pipeline, existing Reference + CarouselFormat data.

**Spec:** `docs/superpowers/specs/2026-03-29-content-studio-reference-library-design.md` — Section 2

**Depends on:** Plan 1 (Reference Library) — already shipped and merged.

---

## File Structure

```
Create: src/stores/content-studio-store.ts              — Studio state (step, selected template, slide configs, refs)
Create: src/components/studio/content/content-studio.tsx — Full-screen overlay orchestrator
Create: src/components/studio/content/studio-library.tsx — Step 1: Template browse grid
Create: src/components/studio/content/studio-builder.tsx — Step 2: Split panel (refs + slides)
Create: src/components/studio/content/reference-panel.tsx — Left panel: reference browser
Create: src/components/studio/content/slide-row.tsx      — Single slide config row
Create: src/components/studio/content/studio-review.tsx  — Step 3: Review & generate
Create: src/components/studio/content/content-studio.css — All styles
Modify: src/stores/ui-store.ts                           — Add contentStudioOpen flag
Modify: src/server/actions/carousel-actions.ts           — Extended generateCarousel with slideReferences
Modify: src/components/workspace/workspace-canvas.tsx    — Wire entry points
Modify: src/components/workspace/app-sidebar.tsx         — Add Create button
Modify: src/app/workspace/layout.tsx                     — Mount ContentStudio overlay
```

---

### Task 1: Content Studio Zustand Store

**Files:**
- Create: `src/stores/content-studio-store.ts`
- Modify: `src/stores/ui-store.ts`

- [ ] **Step 1: Add contentStudioOpen to ui-store**

In `src/stores/ui-store.ts`, add to the type and initializer:

```typescript
export type ActiveView = "chat" | "library" | "templates" | "references";

type UIStore = {
  activeView: ActiveView;
  setActiveView: (view: ActiveView) => void;
  creatorStudioOpen: boolean;
  setCreatorStudioOpen: (open: boolean) => void;
  contentStudioOpen: boolean;
  setContentStudioOpen: (open: boolean) => void;
};

export const useUIStore = create<UIStore>((set) => ({
  activeView: "chat",
  setActiveView: (activeView) => set({ activeView }),
  creatorStudioOpen: false,
  setCreatorStudioOpen: (creatorStudioOpen) => set({ creatorStudioOpen }),
  contentStudioOpen: false,
  setContentStudioOpen: (contentStudioOpen) => set({ contentStudioOpen }),
}));
```

- [ ] **Step 2: Create content-studio-store.ts**

```typescript
import { create } from "zustand";
import type { ReferenceItem } from "@/types/reference";
import type { CarouselFormat, FormatSlide } from "@/data/carousel-formats";

export type ContentStudioStep = "library" | "builder" | "review";

export type SlideConfig = {
  position: number;
  sceneHint: string;
  outfitHint: string;
  moodHint: string;
  role: string;
  description: string; // editable by user
  references: ReferenceItem[]; // attached references
  autoMatched: boolean; // true if refs were auto-matched
};

type ContentStudioStore = {
  step: ContentStudioStep;
  selectedFormat: CarouselFormat | null;
  slides: SlideConfig[];
  slideCount: number;
  globalInstructions: string;
  sourceContentId: string | null; // if opened from "Make Carousel"
  generating: boolean;
  error: string | null;

  // Actions
  setStep: (step: ContentStudioStep) => void;
  selectFormat: (format: CarouselFormat, slideCount?: number) => void;
  setSlides: (slides: SlideConfig[]) => void;
  updateSlide: (position: number, updates: Partial<SlideConfig>) => void;
  attachRef: (position: number, ref: ReferenceItem) => void;
  detachRef: (position: number, refId: string) => void;
  setSlideCount: (count: number) => void;
  setGlobalInstructions: (instructions: string) => void;
  setSourceContentId: (id: string | null) => void;
  setGenerating: (generating: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
};

const INITIAL_STATE = {
  step: "library" as ContentStudioStep,
  selectedFormat: null as CarouselFormat | null,
  slides: [] as SlideConfig[],
  slideCount: 0,
  globalInstructions: "",
  sourceContentId: null as string | null,
  generating: false,
  error: null as string | null,
};

export const useContentStudioStore = create<ContentStudioStore>((set) => ({
  ...INITIAL_STATE,

  setStep: (step) => set({ step }),

  selectFormat: (format, slideCount) => {
    const count = slideCount ?? format.slideRange[0];
    const slides = format.slides
      .filter((s) => s.required || s.position <= count)
      .slice(0, count)
      .map((s) => ({
        position: s.position,
        sceneHint: s.sceneHint,
        outfitHint: s.outfitHint,
        moodHint: s.moodHint,
        role: s.role,
        description: "",
        references: [],
        autoMatched: false,
      }));
    set({ selectedFormat: format, slides, slideCount: count, step: "builder" });
  },

  setSlides: (slides) => set({ slides }),

  updateSlide: (position, updates) =>
    set((state) => ({
      slides: state.slides.map((s) =>
        s.position === position ? { ...s, ...updates } : s
      ),
    })),

  attachRef: (position, ref) =>
    set((state) => ({
      slides: state.slides.map((s) =>
        s.position === position
          ? { ...s, references: [...s.references.filter((r) => r.id !== ref.id), ref], autoMatched: false }
          : s
      ),
    })),

  detachRef: (position, refId) =>
    set((state) => ({
      slides: state.slides.map((s) =>
        s.position === position
          ? { ...s, references: s.references.filter((r) => r.id !== refId) }
          : s
      ),
    })),

  setSlideCount: (count) =>
    set((state) => {
      if (!state.selectedFormat) return {};
      const format = state.selectedFormat;
      const clamped = Math.min(Math.max(count, format.slideRange[0]), format.slideRange[1]);
      const slides = format.slides
        .filter((s) => s.required || s.position <= clamped)
        .slice(0, clamped)
        .map((s) => {
          const existing = state.slides.find((e) => e.position === s.position);
          return existing ?? {
            position: s.position,
            sceneHint: s.sceneHint,
            outfitHint: s.outfitHint,
            moodHint: s.moodHint,
            role: s.role,
            description: "",
            references: [],
            autoMatched: false,
          };
        });
      return { slideCount: clamped, slides };
    }),

  setGlobalInstructions: (globalInstructions) => set({ globalInstructions }),
  setSourceContentId: (sourceContentId) => set({ sourceContentId }),
  setGenerating: (generating) => set({ generating }),
  setError: (error) => set({ error }),
  reset: () => set(INITIAL_STATE),
}));
```

- [ ] **Step 3: Commit**

```bash
git add src/stores/content-studio-store.ts src/stores/ui-store.ts
git commit -m "feat: add Content Studio store and UI flag"
```

---

### Task 2: Content Studio CSS

**Files:**
- Create: `src/components/studio/content/content-studio.css`

- [ ] **Step 1: Create CSS file**

Follow the Creator Studio pattern. Use CSS custom properties from the brand theme. Key classes:

```css
/* ═══ Content Studio ═══ */

/* ── Overlay ── */
.cs-overlay {
  position: fixed;
  inset: 0;
  z-index: 55;
  background: var(--surface, #fff);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* ── Header ── */
.cs-header {
  padding: 12px 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid var(--border, #EBEBEB);
  flex-shrink: 0;
}

.cs-header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.cs-title {
  font-size: 16px;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: var(--text-primary, #111);
}

.cs-close {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  border: none;
  background: none;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary, #888);
  cursor: pointer;
  transition: all 150ms;
}

.cs-close:hover {
  background: var(--card, #F5F5F5);
  color: var(--text-primary, #111);
}

/* Steps indicator */
.cs-steps {
  display: flex;
  align-items: center;
  gap: 0;
}

.cs-step {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 500;
  color: var(--text-muted, #BBB);
}

.cs-step.active {
  color: var(--accent, #C4603A);
}

.cs-step.done {
  color: var(--text-secondary, #888);
}

.cs-step-num {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 700;
  background: var(--card, #F5F5F5);
}

.cs-step.active .cs-step-num {
  background: var(--accent, #C4603A);
  color: #fff;
}

.cs-step.done .cs-step-num {
  background: var(--card, #F5F5F5);
  color: var(--text-secondary, #888);
}

.cs-step-sep {
  display: block;
  width: 24px;
  height: 1px;
  background: var(--border, #EBEBEB);
  margin: 0 4px;
}

/* ── Body ── */
.cs-body {
  flex: 1;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}

/* ── Library Grid (Step 1) ── */
.cs-library {
  padding: 20px;
  max-width: 960px;
  margin: 0 auto;
}

.cs-library-header {
  margin-bottom: 16px;
}

.cs-library-title {
  font-size: 20px;
  font-weight: 700;
  color: var(--text-primary, #111);
  margin: 0;
}

.cs-library-subtitle {
  font-size: 13px;
  color: var(--text-secondary, #888);
  margin-top: 4px;
}

.cs-ai-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  background: var(--card, #F5F5F5);
  border: 1px solid var(--border, #EBEBEB);
  border-radius: 10px;
  padding: 10px 14px;
  margin-bottom: 16px;
}

.cs-ai-input {
  flex: 1;
  border: none;
  background: none;
  font-size: 14px;
  color: var(--text-primary, #111);
  outline: none;
  font-family: inherit;
}

.cs-ai-input::placeholder {
  color: var(--text-muted, #BBB);
}

.cs-ai-btn {
  padding: 6px 14px;
  border-radius: 8px;
  border: none;
  background: var(--accent, #C4603A);
  color: #fff;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
}

.cs-ai-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.cs-filter-bar {
  display: flex;
  gap: 6px;
  margin-bottom: 16px;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}

.cs-template-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 12px;
}

.cs-template-card {
  background: var(--card, #F5F5F5);
  border: 1px solid var(--border, #EBEBEB);
  border-radius: 12px;
  padding: 16px;
  cursor: pointer;
  transition: box-shadow 150ms, border-color 150ms;
}

.cs-template-card:hover {
  border-color: var(--accent, #C4603A);
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
}

.cs-template-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary, #111);
}

.cs-template-meta {
  font-size: 11px;
  color: var(--text-secondary, #888);
  margin-top: 4px;
}

.cs-template-desc {
  font-size: 12px;
  color: var(--text-muted, #BBB);
  margin-top: 6px;
  line-height: 1.4;
}

.cs-template-niches {
  display: flex;
  gap: 4px;
  margin-top: 8px;
}

.cs-niche-tag {
  font-size: 10px;
  padding: 2px 8px;
  border-radius: 10px;
  background: var(--border, #EBEBEB);
  color: var(--text-secondary, #888);
}

/* ── Builder (Step 2) ── */
.cs-builder {
  display: flex;
  height: 100%;
}

.cs-ref-panel {
  width: 240px;
  border-right: 1px solid var(--border, #EBEBEB);
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  overflow: hidden;
}

.cs-ref-panel-header {
  padding: 12px 14px;
  border-bottom: 1px solid var(--border, #EBEBEB);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.cs-ref-panel-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary, #111);
}

.cs-ref-tabs {
  display: flex;
  gap: 4px;
  padding: 8px 14px;
  overflow-x: auto;
  flex-shrink: 0;
}

.cs-ref-tab {
  font-size: 10px;
  padding: 3px 8px;
  border-radius: 8px;
  border: none;
  background: none;
  color: var(--text-secondary, #888);
  cursor: pointer;
  white-space: nowrap;
}

.cs-ref-tab.active {
  background: var(--card, #F5F5F5);
  color: var(--text-primary, #111);
}

.cs-ref-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
  padding: 8px 14px;
  overflow-y: auto;
  flex: 1;
}

.cs-ref-add-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  aspect-ratio: 1;
  border: 1px dashed var(--border, #EBEBEB);
  border-radius: 8px;
  background: none;
  cursor: pointer;
  color: var(--text-muted, #BBB);
  font-size: 16px;
  transition: border-color 150ms, color 150ms;
}

.cs-ref-add-btn:hover {
  border-color: var(--accent, #C4603A);
  color: var(--accent, #C4603A);
}

/* ── Slide builder (right panel) ── */
.cs-slides-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.cs-slides-header {
  padding: 14px 20px;
  border-bottom: 1px solid var(--border, #EBEBEB);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.cs-format-name {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary, #111);
}

.cs-format-meta {
  font-size: 12px;
  color: var(--text-secondary, #888);
}

.cs-slide-count {
  display: flex;
  align-items: center;
  gap: 6px;
}

.cs-count-btn {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  border: 1px solid var(--border, #EBEBEB);
  background: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  color: var(--text-secondary, #888);
}

.cs-count-btn:hover {
  background: var(--card, #F5F5F5);
}

.cs-count-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.cs-slides-list {
  flex: 1;
  overflow-y: auto;
  padding: 12px 20px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

/* ── Slide Row ── */
.cs-slide {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  background: var(--card, #F5F5F5);
  border-radius: 10px;
  padding: 10px 12px;
  border: 1px solid transparent;
  transition: border-color 150ms;
}

.cs-slide:hover {
  border-color: var(--border, #EBEBEB);
}

.cs-slide-num {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 700;
  background: var(--border, #EBEBEB);
  color: var(--text-secondary, #888);
  flex-shrink: 0;
  margin-top: 2px;
}

.cs-slide:first-child .cs-slide-num {
  background: var(--accent, #C4603A);
  color: #fff;
}

.cs-slide-body {
  flex: 1;
  min-width: 0;
}

.cs-slide-scene {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-primary, #111);
}

.cs-slide-mood {
  font-size: 11px;
  color: var(--text-secondary, #888);
  margin-top: 2px;
}

.cs-slide-refs {
  display: flex;
  gap: 4px;
  margin-top: 6px;
  flex-wrap: wrap;
}

.cs-slide-ref-tag {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border-radius: 6px;
  background: var(--surface, #fff);
  border: 1px solid var(--border, #EBEBEB);
  font-size: 10px;
  color: var(--accent, #C4603A);
}

.cs-slide-ref-tag .auto {
  color: var(--text-muted, #BBB);
  font-size: 9px;
}

.cs-slide-ref-remove {
  border: none;
  background: none;
  cursor: pointer;
  color: var(--text-muted, #BBB);
  font-size: 10px;
  padding: 0;
  margin-left: 2px;
}

.cs-slide-ref-remove:hover {
  color: var(--text-primary, #111);
}

.cs-slide-edit {
  width: 100%;
  border: 1px solid var(--border, #EBEBEB);
  border-radius: 6px;
  padding: 6px 8px;
  font-size: 12px;
  font-family: inherit;
  color: var(--text-primary, #111);
  background: var(--surface, #fff);
  resize: vertical;
  margin-top: 4px;
  outline: none;
}

.cs-slide-edit:focus {
  border-color: var(--accent, #C4603A);
}

.cs-slide-actions {
  display: flex;
  gap: 4px;
  flex-shrink: 0;
}

.cs-slide-action {
  padding: 4px 8px;
  border-radius: 6px;
  border: none;
  background: var(--surface, #fff);
  font-size: 11px;
  color: var(--text-secondary, #888);
  cursor: pointer;
}

.cs-slide-action:hover {
  background: var(--border, #EBEBEB);
  color: var(--text-primary, #111);
}

/* ── Global Instructions ── */
.cs-global-instructions {
  padding: 12px 20px;
  border-top: 1px solid var(--border, #EBEBEB);
}

.cs-instructions-input {
  width: 100%;
  border: 1px solid var(--border, #EBEBEB);
  border-radius: 8px;
  padding: 8px 12px;
  font-size: 13px;
  font-family: inherit;
  color: var(--text-primary, #111);
  background: var(--card, #F5F5F5);
  resize: none;
  outline: none;
}

.cs-instructions-input:focus {
  border-color: var(--accent, #C4603A);
}

.cs-instructions-input::placeholder {
  color: var(--text-muted, #BBB);
}

/* ── Footer ── */
.cs-footer {
  padding: 12px 20px;
  border-top: 1px solid var(--border, #EBEBEB);
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
}

.cs-footer-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.cs-footer-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.cs-credit-cost {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary, #111);
}

.cs-credit-label {
  font-size: 11px;
  color: var(--text-secondary, #888);
}

/* ── Review (Step 3) ── */
.cs-review {
  padding: 20px;
  max-width: 720px;
  margin: 0 auto;
}

.cs-review-title {
  font-size: 18px;
  font-weight: 700;
  color: var(--text-primary, #111);
  margin-bottom: 16px;
}

.cs-review-slides {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 20px;
}

.cs-review-slide {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  background: var(--card, #F5F5F5);
  border-radius: 8px;
}

.cs-review-cost {
  text-align: right;
  padding: 16px 0;
  border-top: 1px solid var(--border, #EBEBEB);
}

.cs-review-total {
  font-size: 24px;
  font-weight: 700;
  color: var(--text-primary, #111);
}

.cs-review-label {
  font-size: 12px;
  color: var(--text-secondary, #888);
}

/* ── Mobile ── */
@media (max-width: 768px) {
  .cs-builder {
    flex-direction: column;
  }

  .cs-ref-panel {
    width: 100%;
    border-right: none;
    border-bottom: 1px solid var(--border, #EBEBEB);
    max-height: 200px;
  }

  .cs-ref-grid {
    grid-template-columns: repeat(4, 1fr);
  }

  .cs-template-grid {
    grid-template-columns: 1fr;
  }

  .cs-slides-header {
    flex-direction: column;
    gap: 8px;
    align-items: flex-start;
  }
}

@media (max-width: 640px) {
  .cs-template-grid {
    grid-template-columns: 1fr;
  }

  .cs-ref-grid {
    grid-template-columns: repeat(3, 1fr);
  }

  .cs-header {
    padding: 12px 16px;
  }

  .cs-step-label {
    display: none;
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/studio/content/content-studio.css
git commit -m "feat: add Content Studio CSS styles"
```

---

### Task 3: Slide Row Component

**Files:**
- Create: `src/components/studio/content/slide-row.tsx`

- [ ] **Step 1: Create the slide row**

```typescript
"use client";

import { useState } from "react";
import { useContentStudioStore, type SlideConfig } from "@/stores/content-studio-store";
import { getScene } from "@/data/scenes";
import { REFERENCE_TYPE_LABELS } from "@/types/reference";

export function SlideRow({ slide }: { slide: SlideConfig }) {
  const { updateSlide, detachRef } = useContentStudioStore();
  const [editing, setEditing] = useState(false);
  const scene = getScene(slide.sceneHint);
  const displayName = scene?.name ?? slide.sceneHint.replace(/-/g, " ");
  const displayDesc = slide.description || slide.moodHint;

  return (
    <div className="cs-slide">
      <span className="cs-slide-num">{slide.position}</span>
      <div className="cs-slide-body">
        <div className="cs-slide-scene">{displayName}</div>
        {editing ? (
          <textarea
            className="cs-slide-edit"
            defaultValue={slide.description || `${displayName} — ${slide.moodHint}`}
            rows={2}
            autoFocus
            style={{ fontSize: 16 }}
            onBlur={(e) => {
              updateSlide(slide.position, { description: e.target.value });
              setEditing(false);
            }}
          />
        ) : (
          <div className="cs-slide-mood">{displayDesc}</div>
        )}
        {slide.references.length > 0 && (
          <div className="cs-slide-refs">
            {slide.references.map((ref) => (
              <span key={ref.id} className="cs-slide-ref-tag">
                {ref.name}
                <span style={{ color: "var(--text-muted, #BBB)", fontSize: 9, marginLeft: 2 }}>
                  {REFERENCE_TYPE_LABELS[ref.type]}
                </span>
                {slide.autoMatched && <span className="auto">(auto)</span>}
                <button
                  className="cs-slide-ref-remove"
                  onClick={() => detachRef(slide.position, ref.id)}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
      </div>
      <div className="cs-slide-actions">
        <button className="cs-slide-action" onClick={() => setEditing(!editing)}>
          {editing ? "Done" : "Edit"}
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/studio/content/slide-row.tsx
git commit -m "feat: add SlideRow component for Content Studio"
```

---

### Task 4: Reference Panel Component

**Files:**
- Create: `src/components/studio/content/reference-panel.tsx`

- [ ] **Step 1: Create reference panel (left side of builder)**

```typescript
"use client";

import { useState } from "react";
import { useCreatorStore } from "@/stores/creator-store";
import { useContentStudioStore } from "@/stores/content-studio-store";
import { ReferenceCard } from "@/components/workspace/reference-card";
import { AddReferenceDialog } from "@/components/workspace/add-reference-dialog";
import { REFERENCE_TYPES, REFERENCE_TYPE_LABELS, type ReferenceType } from "@/types/reference";

type Filter = "ALL" | ReferenceType;

export function ReferencePanel() {
  const { references } = useCreatorStore();
  const { slides, attachRef } = useContentStudioStore();
  const [filter, setFilter] = useState<Filter>("ALL");
  const [addOpen, setAddOpen] = useState(false);

  const filtered = filter === "ALL"
    ? references
    : references.filter((r) => r.type === filter);

  // Find which slide is "active" for attaching — use the first slide without a ref of this type
  function handleRefClick(ref: typeof references[0]) {
    // Attach to the first slide that doesn't already have this ref
    const target = slides.find((s) => !s.references.some((r) => r.id === ref.id));
    if (target) {
      attachRef(target.position, ref);
    }
  }

  return (
    <div className="cs-ref-panel">
      <div className="cs-ref-panel-header">
        <span className="cs-ref-panel-title">References</span>
        <button
          className="cs-slide-action"
          onClick={() => setAddOpen(true)}
          style={{ fontSize: 12 }}
        >
          + Add
        </button>
      </div>

      <div className="cs-ref-tabs">
        <button
          className={`cs-ref-tab${filter === "ALL" ? " active" : ""}`}
          onClick={() => setFilter("ALL")}
        >
          All ({references.length})
        </button>
        {REFERENCE_TYPES.map((t) => {
          const count = references.filter((r) => r.type === t).length;
          if (count === 0) return null;
          return (
            <button
              key={t}
              className={`cs-ref-tab${filter === t ? " active" : ""}`}
              onClick={() => setFilter(t)}
            >
              {REFERENCE_TYPE_LABELS[t]} ({count})
            </button>
          );
        })}
      </div>

      <div className="cs-ref-grid">
        {filtered.map((ref) => (
          <ReferenceCard
            key={ref.id}
            reference={ref}
            compact
            onClick={() => handleRefClick(ref)}
          />
        ))}
        <button className="cs-ref-add-btn" onClick={() => setAddOpen(true)}>
          +
        </button>
      </div>

      <AddReferenceDialog open={addOpen} onOpenChange={setAddOpen} />
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/studio/content/reference-panel.tsx
git commit -m "feat: add ReferencePanel for Content Studio builder"
```

---

### Task 5: Template Library (Step 1)

**Files:**
- Create: `src/components/studio/content/studio-library.tsx`

- [ ] **Step 1: Create the template browse grid**

```typescript
"use client";

import { useState } from "react";
import { CAROUSEL_FORMATS } from "@/data/carousel-formats";
import { useContentStudioStore } from "@/stores/content-studio-store";

type NicheFilter = "all" | "Fitness" | "Lifestyle" | "Fashion" | "Beauty" | "Travel";

export function StudioLibrary() {
  const { selectFormat } = useContentStudioStore();
  const [nicheFilter, setNicheFilter] = useState<NicheFilter>("all");

  const filtered = nicheFilter === "all"
    ? CAROUSEL_FORMATS
    : CAROUSEL_FORMATS.filter((f) => f.niches.includes(nicheFilter));

  const niches: NicheFilter[] = ["all", "Fitness", "Lifestyle", "Fashion", "Beauty", "Travel"];

  return (
    <div className="cs-library">
      <div className="cs-library-header">
        <h2 className="cs-library-title">What do you want to create?</h2>
        <p className="cs-library-subtitle">
          Pick a template to get started, or describe what you want.
        </p>
      </div>

      {/* Filter tabs */}
      <div className="cs-filter-bar">
        {niches.map((n) => (
          <button
            key={n}
            className={`filter-pill${nicheFilter === n ? " active" : ""}`}
            onClick={() => setNicheFilter(n)}
          >
            {n === "all" ? "All" : n}
          </button>
        ))}
      </div>

      {/* Template grid */}
      <div className="cs-template-grid">
        {filtered.map((format) => (
          <div
            key={format.id}
            className="cs-template-card"
            onClick={() => selectFormat(format)}
          >
            <div className="cs-template-name">{format.name}</div>
            <div className="cs-template-meta">
              {format.slideRange[0]}–{format.slideRange[1]} slides
            </div>
            <div className="cs-template-desc">{format.description}</div>
            <div className="cs-template-niches">
              {format.niches.map((n) => (
                <span key={n} className="cs-niche-tag">{n}</span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/studio/content/studio-library.tsx
git commit -m "feat: add StudioLibrary template browse grid"
```

---

### Task 6: Studio Builder (Step 2)

**Files:**
- Create: `src/components/studio/content/studio-builder.tsx`

- [ ] **Step 1: Create the split-panel builder**

```typescript
"use client";

import { useContentStudioStore } from "@/stores/content-studio-store";
import { ReferencePanel } from "./reference-panel";
import { SlideRow } from "./slide-row";

export function StudioBuilder() {
  const {
    selectedFormat,
    slides,
    slideCount,
    globalInstructions,
    setSlideCount,
    setGlobalInstructions,
    setStep,
  } = useContentStudioStore();

  if (!selectedFormat) return null;

  const creditCost = slides.length;

  return (
    <div className="cs-builder">
      {/* Left panel: references */}
      <ReferencePanel />

      {/* Right panel: slides */}
      <div className="cs-slides-panel">
        <div className="cs-slides-header">
          <div>
            <div className="cs-format-name">{selectedFormat.name}</div>
            <div className="cs-format-meta">
              {creditCost} slide{creditCost !== 1 ? "s" : ""} · {creditCost} credit{creditCost !== 1 ? "s" : ""}
            </div>
          </div>
          <div className="cs-slide-count">
            <button
              className="cs-count-btn"
              onClick={() => setSlideCount(slideCount - 1)}
              disabled={slideCount <= selectedFormat.slideRange[0]}
            >
              −
            </button>
            <span style={{ fontSize: 13, fontWeight: 600, minWidth: 20, textAlign: "center" }}>
              {slideCount}
            </span>
            <button
              className="cs-count-btn"
              onClick={() => setSlideCount(slideCount + 1)}
              disabled={slideCount >= selectedFormat.slideRange[1]}
            >
              +
            </button>
          </div>
        </div>

        <div className="cs-slides-list">
          {slides.map((slide) => (
            <SlideRow key={slide.position} slide={slide} />
          ))}
        </div>

        {/* Global instructions */}
        <div className="cs-global-instructions">
          <textarea
            className="cs-instructions-input"
            placeholder='Add instructions for all slides... "wearing red", "outdoor lighting", "more smiles"'
            value={globalInstructions}
            onChange={(e) => setGlobalInstructions(e.target.value)}
            rows={2}
            style={{ fontSize: 16 }}
          />
        </div>

        {/* Footer */}
        <div className="cs-footer">
          <div className="cs-footer-left">
            <button className="studio-btn secondary" onClick={() => setStep("library")}>
              ← Library
            </button>
          </div>
          <div className="cs-footer-right">
            <div style={{ textAlign: "right", marginRight: 8 }}>
              <div className="cs-credit-cost">{creditCost} credits</div>
              <div className="cs-credit-label">{creditCost} slides × 1 credit</div>
            </div>
            <button className="studio-btn primary" onClick={() => setStep("review")}>
              Review & Generate →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/studio/content/studio-builder.tsx
git commit -m "feat: add StudioBuilder split-panel component"
```

---

### Task 7: Studio Review & Generate (Step 3)

**Files:**
- Create: `src/components/studio/content/studio-review.tsx`
- Modify: `src/server/actions/carousel-actions.ts`

- [ ] **Step 1: Extend generateCarousel to accept slideReferences**

Read `src/server/actions/carousel-actions.ts`. In the `generateCarousel` function signature, add a new optional parameter:

```typescript
export async function generateCarousel(
  creatorId: string,
  formatId: string,
  slideCount?: number,
  userInstructions?: string,
  sourceContentId?: string,
  slideEdits?: Record<number, string>,
  slideReferences?: Record<number, string[]>  // NEW: map slide position → reference IDs
): Promise<CarouselResult> {
```

Inside the function, after getting `refImage` (the creator's base face reference), add logic to fetch slide-specific references:

```typescript
  // Fetch slide-specific references
  const slideRefImages: Record<number, { mimeType: string; data: string; description: string }[]> = {};
  if (slideReferences) {
    const { getImageBuffer } = await import("@/lib/s3");
    const { incrementReferenceUsage } = await import("./reference-actions");
    const allRefIds = Object.values(slideReferences).flat();

    if (allRefIds.length > 0) {
      const refs = await db.reference.findMany({
        where: { id: { in: allRefIds } },
      });

      for (const [posStr, refIds] of Object.entries(slideReferences)) {
        const pos = Number(posStr);
        slideRefImages[pos] = [];
        for (const refId of refIds) {
          const ref = refs.find((r) => r.id === refId);
          if (ref) {
            const buf = await getImageBuffer(ref.imageUrl);
            slideRefImages[pos].push({
              mimeType: "image/jpeg",
              data: buf.toString("base64"),
              description: ref.description || ref.name,
            });
          }
        }
      }

      await incrementReferenceUsage(allRefIds);
    }
  }
```

In the `Promise.all` where slides are generated, modify the `generateSlideImage` call to include reference images. Change the `contents` array in the Gemini call to include slide references:

In the `generateSlideImage` function, add an optional `extraRefs` parameter:

```typescript
async function generateSlideImage(
  prompt: string,
  refImage: { mimeType: string; data: string },
  userId: string,
  creatorId: string,
  index: number,
  extraRefs?: { mimeType: string; data: string; description: string }[]
): Promise<{ key: string } | null> {
```

Update the `contents` array to include extra refs:

```typescript
    const contents: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }> = [
      { text: prompt },
      { inlineData: refImage },
    ];
    if (extraRefs) {
      for (const ref of extraRefs) {
        contents.push({ inlineData: { mimeType: ref.mimeType, data: ref.data } });
      }
    }

    const response = await ai.models.generateContent({
      model: IMAGE_MODEL,
      contents,
      config: { responseModalities: ["TEXT", "IMAGE"], safetySettings: SAFETY_OFF },
    });
```

Pass `slideRefImages[slide.position]` when calling `generateSlideImage` in the `Promise.all`:

```typescript
return generateSlideImage(prompt, refImage, user.id, creatorId, i, slideRefImages[slide.position]);
```

Update the prompt building to mention references:

```typescript
        // Build prompt with reference descriptions
        let refContext = "";
        const slideRefs = slideRefImages[slide.position];
        if (slideRefs && slideRefs.length > 0) {
          refContext = slideRefs.map((r, ri) =>
            `Reference image ${ri + 3} shows: ${r.description}.`
          ).join(" ") + " Match these references. ";
        }

        const prompt = editedDesc
          ? `That exact ${gender.toLowerCase() === "male" ? "man" : "woman"} from the reference image. ${refContext}${editedDesc}. Shot on iPhone, candid. ${REALISM_BASE}.`
          : buildSlidePrompt(slide, scene, gender, `${refContext}${userInstructions ?? ""}`);
```

- [ ] **Step 2: Create studio-review.tsx**

```typescript
"use client";

import { useContentStudioStore } from "@/stores/content-studio-store";
import { useCreatorStore } from "@/stores/creator-store";
import { useUIStore } from "@/stores/ui-store";
import { generateCarousel } from "@/server/actions/carousel-actions";
import { getWorkspaceData } from "@/server/actions/workspace-actions";
import { getScene } from "@/data/scenes";
import { REFERENCE_TYPE_LABELS } from "@/types/reference";

export function StudioReview() {
  const {
    selectedFormat,
    slides,
    globalInstructions,
    sourceContentId,
    generating,
    error,
    setGenerating,
    setError,
    setStep,
    reset,
  } = useContentStudioStore();
  const { addContentSet, setCredits } = useCreatorStore();
  const activeCreatorId = useCreatorStore((s) => s.activeCreatorId);
  const { setContentStudioOpen } = useUIStore();

  if (!selectedFormat || !activeCreatorId) return null;

  const creditCost = slides.length;

  async function handleGenerate() {
    if (!selectedFormat || !activeCreatorId) return;
    setGenerating(true);
    setError(null);

    // Build slideEdits from custom descriptions
    const slideEdits: Record<number, string> = {};
    for (const slide of slides) {
      if (slide.description.trim()) {
        slideEdits[slide.position] = slide.description;
      }
    }

    // Build slideReferences map
    const slideReferences: Record<number, string[]> = {};
    for (const slide of slides) {
      if (slide.references.length > 0) {
        slideReferences[slide.position] = slide.references.map((r) => r.id);
      }
    }

    const result = await generateCarousel(
      activeCreatorId,
      selectedFormat.id,
      slides.length,
      globalInstructions || undefined,
      sourceContentId ?? undefined,
      Object.keys(slideEdits).length > 0 ? slideEdits : undefined,
      Object.keys(slideReferences).length > 0 ? slideReferences : undefined
    );

    if (result.success) {
      addContentSet(result.contentSet);
      const data = await getWorkspaceData();
      setCredits(data.balance);
      reset();
      setContentStudioOpen(false);
    } else {
      setError(result.error);
    }
    setGenerating(false);
  }

  return (
    <div className="cs-review">
      <h2 className="cs-review-title">Review & Generate</h2>
      <p style={{ fontSize: 13, color: "var(--text-secondary, #888)", marginBottom: 16 }}>
        {selectedFormat.name} · {slides.length} slides
      </p>

      <div className="cs-review-slides">
        {slides.map((slide) => {
          const scene = getScene(slide.sceneHint);
          return (
            <div key={slide.position} className="cs-review-slide">
              <span className="cs-slide-num">{slide.position}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 500 }}>
                  {scene?.name ?? slide.sceneHint.replace(/-/g, " ")}
                </div>
                {slide.description && (
                  <div style={{ fontSize: 11, color: "var(--text-secondary, #888)", marginTop: 2 }}>
                    {slide.description}
                  </div>
                )}
              </div>
              {slide.references.length > 0 && (
                <div style={{ display: "flex", gap: 4 }}>
                  {slide.references.map((ref) => (
                    <span key={ref.id} className="cs-slide-ref-tag">
                      {ref.name}
                    </span>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {globalInstructions && (
        <div style={{ fontSize: 12, color: "var(--text-secondary, #888)", marginBottom: 16, padding: "8px 12px", background: "var(--card, #F5F5F5)", borderRadius: 8 }}>
          Instructions: {globalInstructions}
        </div>
      )}

      {error && (
        <div style={{ padding: "8px 0", color: "#e53e3e", fontSize: 13 }}>{error}</div>
      )}

      <div className="cs-review-cost">
        <div className="cs-review-total">{creditCost} credits</div>
        <div className="cs-review-label">{creditCost} slides × 1 credit each</div>
      </div>

      <div className="cs-footer" style={{ border: "none", padding: "16px 0" }}>
        <button className="studio-btn secondary" onClick={() => setStep("builder")}>
          ← Back
        </button>
        <button
          className="studio-btn primary"
          onClick={handleGenerate}
          disabled={generating}
          style={{ minWidth: 180 }}
        >
          {generating ? "Generating..." : `Generate ${creditCost} Slides`}
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/studio/content/studio-review.tsx src/server/actions/carousel-actions.ts
git commit -m "feat: add StudioReview + extend generateCarousel with slide references"
```

---

### Task 8: Content Studio Overlay (Main Orchestrator)

**Files:**
- Create: `src/components/studio/content/content-studio.tsx`

- [ ] **Step 1: Create the full-screen overlay**

```typescript
"use client";

import "./content-studio.css";
import { useEffect, useCallback } from "react";
import { useUIStore } from "@/stores/ui-store";
import { useContentStudioStore } from "@/stores/content-studio-store";
import { StudioLibrary } from "./studio-library";
import { StudioBuilder } from "./studio-builder";
import { StudioReview } from "./studio-review";

const STEPS = [
  { key: "library", label: "Browse" },
  { key: "builder", label: "Customize" },
  { key: "review", label: "Generate" },
];

function getStepIndex(step: string): number {
  if (step === "library") return 0;
  if (step === "builder") return 1;
  return 2;
}

export function ContentStudio() {
  const { contentStudioOpen, setContentStudioOpen } = useUIStore();
  const { step, reset, generating } = useContentStudioStore();
  const currentStep = getStepIndex(step);

  const handleClose = useCallback(() => {
    if (generating) return; // Don't close during generation
    setContentStudioOpen(false);
    reset();
  }, [setContentStudioOpen, reset, generating]);

  // Escape to close (only on library step)
  useEffect(() => {
    if (!contentStudioOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        const currentStep = useContentStudioStore.getState().step;
        if (currentStep === "library") {
          handleClose();
        }
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [contentStudioOpen, handleClose]);

  // Lock body scroll
  useEffect(() => {
    if (contentStudioOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [contentStudioOpen]);

  if (!contentStudioOpen) return null;

  return (
    <div className="cs-overlay">
      {/* Header */}
      <div className="cs-header">
        <div className="cs-header-left">
          <button className="cs-close" onClick={handleClose}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
          <span className="cs-title">Content Studio</span>
        </div>
        <div className="cs-steps">
          {STEPS.map((s, i) => (
            <div key={s.key} className={`cs-step${i === currentStep ? " active" : ""}${i < currentStep ? " done" : ""}`}>
              <span className="cs-step-num">{i < currentStep ? "✓" : i + 1}</span>
              <span className="cs-step-label">{s.label}</span>
              {i < STEPS.length - 1 && <span className="cs-step-sep" />}
            </div>
          ))}
        </div>
      </div>

      {/* Body */}
      <div className="cs-body">
        {step === "library" && <StudioLibrary />}
        {step === "builder" && <StudioBuilder />}
        {step === "review" && <StudioReview />}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/studio/content/content-studio.tsx
git commit -m "feat: add ContentStudio full-screen overlay orchestrator"
```

---

### Task 9: Mount Overlay + Wire Entry Points

**Files:**
- Modify: `src/app/workspace/layout.tsx`
- Modify: `src/components/workspace/workspace-canvas.tsx`
- Modify: `src/components/workspace/app-sidebar.tsx`

- [ ] **Step 1: Mount ContentStudio in workspace layout**

Read `src/app/workspace/layout.tsx`. It currently renders `<WorkspaceShell>`. The ContentStudio overlay needs to be mounted. Since the layout is a server component, and ContentStudio is a client component, we mount it inside `WorkspaceShell` (which is client-side).

Read `src/components/workspace/workspace-shell.tsx`. Add the import and render:

```typescript
import { ContentStudio } from "@/components/studio/content/content-studio";
```

Add `<ContentStudio />` inside the shell, after the existing content (similar to how CreatorStudio is mounted). It renders at the top level so the overlay covers everything.

- [ ] **Step 2: Add "Create" button to sidebar**

In `src/components/workspace/app-sidebar.tsx`, add a "Create Content" button. Read the file first. Add after the "References" button and before the "New Creator" button:

```typescript
        <button
          onClick={() => {
            useUIStore.getState().setContentStudioOpen(true);
            onClose?.();
          }}
          className="new-creator-btn"
          style={{ fontWeight: 400 }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polygon points="5 3 19 12 5 21 5 3" />
          </svg>
          Create Content
        </button>
```

- [ ] **Step 3: Wire "Templates" pill to open Content Studio**

In `src/components/workspace/workspace-canvas.tsx`, find the "Templates" filter pill in the ContentArea. Change it to open the Content Studio instead of switching views:

```typescript
        <button
          className="filter-pill"
          onClick={() => useUIStore.getState().setContentStudioOpen(true)}
        >
          Templates
        </button>
```

- [ ] **Step 4: Wire "Make Carousel" to open Content Studio**

In `src/components/workspace/workspace-canvas.tsx`, find the `onMakeCarousel` callback on ContentDetail. Change it to open the Content Studio with the photo pre-loaded:

```typescript
        onMakeCarousel={(item) => {
          const { setContentStudioOpen } = useUIStore.getState();
          const { setSourceContentId } = useContentStudioStore.getState();
          setSourceContentId(item.id);
          setContentStudioOpen(true);
        }}
```

Add the import at the top:
```typescript
import { useContentStudioStore } from "@/stores/content-studio-store";
```

- [ ] **Step 5: Commit**

```bash
git add src/components/workspace/workspace-shell.tsx src/components/workspace/app-sidebar.tsx src/components/workspace/workspace-canvas.tsx
git commit -m "feat: mount Content Studio overlay and wire all entry points"
```

---

### Task 10: Smart Auto-Matching

**Files:**
- Modify: `src/stores/content-studio-store.ts`

- [ ] **Step 1: Add autoMatchReferences function**

Add a new action to the store that scans the creator's references and matches them to slides based on scene hints and tags:

```typescript
import { getScene } from "@/data/scenes";
```

Add to the store type:
```typescript
  autoMatchReferences: (references: ReferenceItem[]) => void;
```

Add to the store implementation:
```typescript
  autoMatchReferences: (references) =>
    set((state) => {
      const newSlides = state.slides.map((slide) => {
        if (slide.references.length > 0) return slide; // Don't override manual refs

        const sceneKeywords = slide.sceneHint.split("-").map((k) => k.toLowerCase());
        const matched: ReferenceItem[] = [];

        for (const ref of references) {
          const tagOverlap = ref.tags.some((tag) =>
            sceneKeywords.some((kw) => tag.includes(kw) || kw.includes(tag))
          );
          if (tagOverlap) {
            // Only one ref per type per slide
            if (!matched.some((m) => m.type === ref.type)) {
              matched.push(ref);
            }
          }
        }

        if (matched.length > 0) {
          return { ...slide, references: matched, autoMatched: true };
        }
        return slide;
      });
      return { slides: newSlides };
    }),
```

- [ ] **Step 2: Call autoMatch when entering the builder**

In `selectFormat`, after setting the slides, call autoMatch. Modify `selectFormat`:

```typescript
  selectFormat: (format, slideCount) => {
    const count = slideCount ?? format.slideRange[0];
    const slides = format.slides
      .filter((s) => s.required || s.position <= count)
      .slice(0, count)
      .map((s) => ({
        position: s.position,
        sceneHint: s.sceneHint,
        outfitHint: s.outfitHint,
        moodHint: s.moodHint,
        role: s.role,
        description: "",
        references: [],
        autoMatched: false,
      }));
    set({ selectedFormat: format, slides, slideCount: count, step: "builder" });
    // Auto-match will be called from the component after setting slides
  },
```

In `src/components/studio/content/studio-builder.tsx`, add an effect to auto-match on mount:

```typescript
import { useEffect } from "react";
import { useCreatorStore } from "@/stores/creator-store";

// Inside StudioBuilder component:
const { references } = useCreatorStore();
const { autoMatchReferences } = useContentStudioStore();

useEffect(() => {
  if (references.length > 0 && slides.length > 0) {
    autoMatchReferences(references);
  }
  // Only run once when builder mounts
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, []);
```

- [ ] **Step 3: Commit**

```bash
git add src/stores/content-studio-store.ts src/components/studio/content/studio-builder.tsx
git commit -m "feat: add smart auto-matching of references to slides"
```

---

### Task 11: Final Build Verification

- [ ] **Step 1: Run build**

Run: `pnpm build 2>&1 | tail -20`

Expected: Build succeeds.

- [ ] **Step 2: Fix any errors**

If type errors or import issues, fix them.

- [ ] **Step 3: Commit fixes**

```bash
git add -A
git commit -m "fix: Content Studio build verification fixes"
```
