# Unified Content Studio Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the Content Studio as ONE unified interface for all content types (photo, carousel, video, talking head) with a universal reference panel, post-generation iteration, and clean separation of concerns.

**Architecture:** Full-screen overlay with two-panel layout. Left: reference panel (3 tabs — My Refs, Creator, Library + inspiration uploads). Right: creation panel with type tabs, adaptive prompt/config, and inline results. New Zustand store replaces old content-studio-store. Existing server actions are unchanged — this is purely a UI/store rebuild.

**Tech Stack:** React, Zustand, prototype-first CSS, existing server actions (content-actions, carousel-actions, video-actions, talking-head-actions).

**Spec:** `docs/superpowers/specs/2026-04-01-unified-content-studio-design.md`

**IMPORTANT:** All server actions already exist and work. Do NOT modify any server action files. This plan only creates new UI components and a new store.

---

## File Structure

```
Delete: src/components/studio/content/content-studio.tsx      (replaced)
Delete: src/components/studio/content/content-studio.css       (replaced)
Delete: src/components/studio/content/studio-library.tsx       (absorbed)
Delete: src/components/studio/content/studio-builder.tsx       (absorbed)
Delete: src/components/studio/content/studio-review.tsx        (absorbed)
Delete: src/components/studio/content/reference-panel.tsx      (replaced)
Delete: src/components/studio/content/slide-row.tsx            (rebuilt)
Delete: src/stores/content-studio-store.ts                     (replaced)
Delete: src/components/workspace/make-video-dialog.tsx         (absorbed)
Delete: src/components/workspace/talking-head-dialog.tsx       (absorbed)

Create: src/stores/unified-studio-store.ts                     — New unified store
Create: src/components/studio/content/unified-studio.tsx       — Overlay orchestrator
Create: src/components/studio/content/unified-studio.css       — All styles
Create: src/components/studio/content/studio-ref-panel.tsx     — Left panel (refs + inspiration)
Create: src/components/studio/content/studio-create-panel.tsx  — Right panel (tabs + prompt + config)
Create: src/components/studio/content/config-photo.tsx         — Photo: image count
Create: src/components/studio/content/config-carousel.tsx      — Carousel: format + slides
Create: src/components/studio/content/config-video.tsx         — Video: source mode + duration + aspect
Create: src/components/studio/content/config-talking.tsx       — Talking head: voice + duration + setting
Create: src/components/studio/content/studio-results.tsx       — Post-gen results + iteration actions

Modify: src/components/workspace/workspace-shell.tsx           — Mount UnifiedStudio (replace ContentStudio)
Modify: src/components/workspace/workspace-canvas.tsx          — Update entry points
Modify: src/components/workspace/content-detail.tsx            — Update Make Video / Make Carousel to open studio
```

---

### Task 1: Unified Studio Store

**Files:**
- Create: `src/stores/unified-studio-store.ts`
- Delete: `src/stores/content-studio-store.ts`

- [ ] **Step 1: Create the unified store**

```typescript
import { create } from "zustand";
import type { ReferenceItem } from "@/types/reference";
import type { CarouselFormat } from "@/data/carousel-formats";
import type { ContentItem, ContentSetItem } from "@/types/content";

export type ContentType = "photo" | "carousel" | "video" | "talking-head";
export type VideoSource = "text" | "photo" | "motion";

export type SlideConfig = {
  position: number;
  sceneHint: string;
  outfitHint: string;
  moodHint: string;
  role: string;
  description: string;
  references: ReferenceItem[];
};

type UnifiedStudioStore = {
  // Output type
  contentType: ContentType;

  // Universal inputs
  prompt: string;
  attachedRefs: ReferenceItem[];
  inspirationPhotos: { base64: string; preview: string }[];
  inspirationVideo: { base64: string; preview: string } | null;

  // Photo config
  imageCount: number;

  // Carousel config
  selectedFormat: CarouselFormat | null;
  slides: SlideConfig[];
  slideCount: number;
  carouselInstructions: string;

  // Video config
  videoSource: VideoSource;
  videoDuration: 5 | 10;
  videoAspectRatio: "9:16" | "1:1" | "16:9";
  sourceContentId: string | null;

  // Talking head config
  script: string;
  voiceId: string;
  talkingSetting: string;
  talkingDuration: 15 | 30;

  // Generation state
  generating: boolean;
  generatingProgress: string;
  error: string | null;

  // Results
  showResults: boolean;
  results: ContentItem[];
  resultContentSet: ContentSetItem | null;

  // Actions
  setContentType: (type: ContentType) => void;
  setPrompt: (prompt: string) => void;
  attachRef: (ref: ReferenceItem) => void;
  detachRef: (refId: string) => void;
  addInspirationPhoto: (photo: { base64: string; preview: string }) => void;
  removeInspirationPhoto: (index: number) => void;
  setInspirationVideo: (video: { base64: string; preview: string } | null) => void;

  setImageCount: (count: number) => void;

  selectCarouselFormat: (format: CarouselFormat) => void;
  updateSlide: (position: number, updates: Partial<SlideConfig>) => void;
  attachSlideRef: (position: number, ref: ReferenceItem) => void;
  detachSlideRef: (position: number, refId: string) => void;
  setSlideCount: (count: number) => void;
  setCarouselInstructions: (instructions: string) => void;

  setVideoSource: (source: VideoSource) => void;
  setVideoDuration: (duration: 5 | 10) => void;
  setVideoAspectRatio: (ratio: "9:16" | "1:1" | "16:9") => void;
  setSourceContentId: (id: string | null) => void;

  setScript: (script: string) => void;
  setVoiceId: (voiceId: string) => void;
  setTalkingSetting: (setting: string) => void;
  setTalkingDuration: (duration: 15 | 30) => void;

  setGenerating: (generating: boolean) => void;
  setGeneratingProgress: (progress: string) => void;
  setError: (error: string | null) => void;

  setShowResults: (show: boolean) => void;
  setResults: (results: ContentItem[]) => void;
  setResultContentSet: (set: ContentSetItem | null) => void;

  reset: () => void;
};

const INITIAL: Omit<UnifiedStudioStore,
  'setContentType' | 'setPrompt' | 'attachRef' | 'detachRef' |
  'addInspirationPhoto' | 'removeInspirationPhoto' | 'setInspirationVideo' |
  'setImageCount' | 'selectCarouselFormat' | 'updateSlide' | 'attachSlideRef' |
  'detachSlideRef' | 'setSlideCount' | 'setCarouselInstructions' |
  'setVideoSource' | 'setVideoDuration' | 'setVideoAspectRatio' | 'setSourceContentId' |
  'setScript' | 'setVoiceId' | 'setTalkingSetting' | 'setTalkingDuration' |
  'setGenerating' | 'setGeneratingProgress' | 'setError' |
  'setShowResults' | 'setResults' | 'setResultContentSet' | 'reset'
> = {
  contentType: "photo",
  prompt: "",
  attachedRefs: [],
  inspirationPhotos: [],
  inspirationVideo: null,
  imageCount: 1,
  selectedFormat: null,
  slides: [],
  slideCount: 0,
  carouselInstructions: "",
  videoSource: "text",
  videoDuration: 5,
  videoAspectRatio: "9:16",
  sourceContentId: null,
  script: "",
  voiceId: "",
  talkingSetting: "",
  talkingDuration: 15,
  generating: false,
  generatingProgress: "",
  error: null,
  showResults: false,
  results: [],
  resultContentSet: null,
};

export const useUnifiedStudioStore = create<UnifiedStudioStore>((set) => ({
  ...INITIAL,

  setContentType: (contentType) => set({ contentType }),
  setPrompt: (prompt) => set({ prompt }),

  attachRef: (ref) => set((s) => ({
    attachedRefs: s.attachedRefs.some((r) => r.id === ref.id)
      ? s.attachedRefs.filter((r) => r.id !== ref.id) // toggle off
      : [...s.attachedRefs, ref], // toggle on
  })),
  detachRef: (refId) => set((s) => ({
    attachedRefs: s.attachedRefs.filter((r) => r.id !== refId),
  })),

  addInspirationPhoto: (photo) => set((s) => ({
    inspirationPhotos: [...s.inspirationPhotos, photo],
  })),
  removeInspirationPhoto: (index) => set((s) => ({
    inspirationPhotos: s.inspirationPhotos.filter((_, i) => i !== index),
  })),
  setInspirationVideo: (inspirationVideo) => set({ inspirationVideo }),

  setImageCount: (count) => set({ imageCount: Math.min(Math.max(count, 1), 4) }),

  selectCarouselFormat: (format) => {
    const count = format.slideRange[0];
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
      }));
    set({ selectedFormat: format, slides, slideCount: count });
  },

  updateSlide: (position, updates) => set((s) => ({
    slides: s.slides.map((sl) => sl.position === position ? { ...sl, ...updates } : sl),
  })),

  attachSlideRef: (position, ref) => set((s) => ({
    slides: s.slides.map((sl) =>
      sl.position === position
        ? { ...sl, references: [...sl.references.filter((r) => r.id !== ref.id), ref] }
        : sl
    ),
  })),

  detachSlideRef: (position, refId) => set((s) => ({
    slides: s.slides.map((sl) =>
      sl.position === position
        ? { ...sl, references: sl.references.filter((r) => r.id !== refId) }
        : sl
    ),
  })),

  setSlideCount: (count) => set((s) => {
    if (!s.selectedFormat) return {};
    const f = s.selectedFormat;
    const clamped = Math.min(Math.max(count, f.slideRange[0]), f.slideRange[1]);
    const slides = f.slides
      .filter((sl) => sl.required || sl.position <= clamped)
      .slice(0, clamped)
      .map((sl) => {
        const existing = s.slides.find((e) => e.position === sl.position);
        return existing ?? {
          position: sl.position, sceneHint: sl.sceneHint, outfitHint: sl.outfitHint,
          moodHint: sl.moodHint, role: sl.role, description: "", references: [],
        };
      });
    return { slideCount: clamped, slides };
  }),

  setCarouselInstructions: (carouselInstructions) => set({ carouselInstructions }),

  setVideoSource: (videoSource) => set({ videoSource }),
  setVideoDuration: (videoDuration) => set({ videoDuration }),
  setVideoAspectRatio: (videoAspectRatio) => set({ videoAspectRatio }),
  setSourceContentId: (sourceContentId) => set({ sourceContentId }),

  setScript: (script) => set({ script }),
  setVoiceId: (voiceId) => set({ voiceId }),
  setTalkingSetting: (talkingSetting) => set({ talkingSetting }),
  setTalkingDuration: (talkingDuration) => set({ talkingDuration }),

  setGenerating: (generating) => set({ generating }),
  setGeneratingProgress: (generatingProgress) => set({ generatingProgress }),
  setError: (error) => set({ error }),

  setShowResults: (showResults) => set({ showResults }),
  setResults: (results) => set({ results }),
  setResultContentSet: (resultContentSet) => set({ resultContentSet }),

  reset: () => set(INITIAL),
}));
```

- [ ] **Step 2: Delete old store**

```bash
rm src/stores/content-studio-store.ts
```

- [ ] **Step 3: Commit**

```bash
git add src/stores/unified-studio-store.ts
git rm src/stores/content-studio-store.ts
git commit -m "feat: add unified studio store, remove old content-studio-store"
```

---

### Task 2: Delete Old Studio Components

**Files:**
- Delete all old content studio components and absorbed dialogs

- [ ] **Step 1: Remove old files**

```bash
rm src/components/studio/content/content-studio.tsx
rm src/components/studio/content/content-studio.css
rm src/components/studio/content/studio-library.tsx
rm src/components/studio/content/studio-builder.tsx
rm src/components/studio/content/studio-review.tsx
rm src/components/studio/content/reference-panel.tsx
rm src/components/studio/content/slide-row.tsx
rm src/components/workspace/make-video-dialog.tsx
rm src/components/workspace/talking-head-dialog.tsx
```

- [ ] **Step 2: Commit**

```bash
git rm src/components/studio/content/content-studio.tsx \
      src/components/studio/content/content-studio.css \
      src/components/studio/content/studio-library.tsx \
      src/components/studio/content/studio-builder.tsx \
      src/components/studio/content/studio-review.tsx \
      src/components/studio/content/reference-panel.tsx \
      src/components/studio/content/slide-row.tsx \
      src/components/workspace/make-video-dialog.tsx \
      src/components/workspace/talking-head-dialog.tsx
git commit -m "chore: remove old studio components and absorbed dialogs"
```

---

### Task 3: CSS Styles

**Files:**
- Create: `src/components/studio/content/unified-studio.css`

- [ ] **Step 1: Create the complete CSS file**

This is a large CSS file (~500+ lines). Use the brand theme variables. Key sections:

- `.us-overlay` — fixed fullscreen, white background, flex column
- `.us-header` — header bar with close, title, creator badge, credits
- `.us-type-tabs` — content type tab bar (Photo/Carousel/Video/Talking Head)
- `.us-body` — flex row, two panels
- `.us-ref-panel` — left panel (260px, border-right, flex column)
- `.us-ref-tabs`, `.us-ref-filter`, `.us-ref-grid` — reference browser
- `.us-ref-item` — reference thumbnail with attached state
- `.us-inspo-section` — inspiration upload zone
- `.us-create-panel` — right panel (flex 1, flex column)
- `.us-prompt-section` — prompt label + textarea
- `.us-attached-section` — inline attached ref tags
- `.us-templates-section` — collapsible template chips
- `.us-config-section` — type-specific config area
- `.us-footer` — credit cost + generate button
- `.us-results` — post-generation results view
- Config-specific: `.us-count-btn`, `.us-duration-btn`, `.us-voice-card`, `.us-slide-row`
- Mobile breakpoints at 768px and 640px

Follow the exact same CSS variable pattern as `workspace.css` and `reference-library.css`. Light theme: `--surface: #fff`, `--card: #F5F5F5`, `--border: #EBEBEB`, `--accent: #C4603A`, etc.

Reference the interactive mockup at `.superpowers/brainstorm/23197-1775082371/content/studio-hifi-desktop.html` for exact styling.

- [ ] **Step 2: Commit**

```bash
git add src/components/studio/content/unified-studio.css
git commit -m "feat: add unified studio CSS"
```

---

### Task 4: Reference Panel (Left Side)

**Files:**
- Create: `src/components/studio/content/studio-ref-panel.tsx`

- [ ] **Step 1: Create the reference panel**

"use client" component. Three sections:

**Reference tabs:** "My Refs" | "Creator" | "Library" — for now, My Refs and Creator both show from the same `references` array in creator-store (account-level split comes in Plan B). Library tab shows empty state with "Coming soon."

**Filter chips:** All | BG | Product | Outfit | Pose | Custom — filters the grid.

**Reference grid:** 2-column grid of `ReferenceCard` components (compact mode). Clicking toggles attachment — uses `useUnifiedStudioStore().attachRef(ref)`. Attached refs show accent border + "ATTACHED" badge.

**"+ Add" button:** opens `AddReferenceDialog`.

**Inspiration upload zone:** Drag-drop or click to upload inspiration photos. Shows thumbnails with remove buttons. Calls `addInspirationPhoto` on store. For motion transfer video: if `contentType === "video" && videoSource === "motion"`, show video upload zone instead.

Imports:
```typescript
import { useCreatorStore } from "@/stores/creator-store";
import { useUnifiedStudioStore } from "@/stores/unified-studio-store";
import { ReferenceCard } from "@/components/workspace/reference-card";
import { AddReferenceDialog } from "@/components/workspace/add-reference-dialog";
import { REFERENCE_TYPES, REFERENCE_TYPE_LABELS, type ReferenceType } from "@/types/reference";
```

- [ ] **Step 2: Commit**

```bash
git add src/components/studio/content/studio-ref-panel.tsx
git commit -m "feat: add studio reference panel (left side)"
```

---

### Task 5: Photo Config

**Files:**
- Create: `src/components/studio/content/config-photo.tsx`

- [ ] **Step 1: Create photo config component**

Simple component: image count selector (1-4 buttons). Active button uses accent color.

```typescript
"use client";

import { useUnifiedStudioStore } from "@/stores/unified-studio-store";

export function ConfigPhoto() {
  const { imageCount, setImageCount } = useUnifiedStudioStore();

  return (
    <div className="us-config-section">
      <div className="us-config-label">Photo Settings</div>
      <div className="us-config-row">
        <span className="us-config-row-label">Images</span>
        <div style={{ display: "flex", gap: 4 }}>
          {[1, 2, 3, 4].map((n) => (
            <button
              key={n}
              className={`us-count-btn${imageCount === n ? " active" : ""}`}
              onClick={() => setImageCount(n)}
            >
              {n}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/studio/content/config-photo.tsx
git commit -m "feat: add photo config component"
```

---

### Task 6: Carousel Config

**Files:**
- Create: `src/components/studio/content/config-carousel.tsx`

- [ ] **Step 1: Create carousel config with format picker + slide editor**

Shows:
1. Format picker chips (8 formats from CAROUSEL_FORMATS, clicking one calls `selectCarouselFormat`)
2. When a format is selected: slide-by-slide editor
   - Each slide row: number badge, scene name, mood, per-slide ref tags, edit button
   - Slide count +/- buttons within format range
   - Global instructions textarea
3. Per-slide reference attachment: click "+ Ref" on a slide → highlights the ref panel for selection

Imports:
```typescript
import { useUnifiedStudioStore } from "@/stores/unified-studio-store";
import { CAROUSEL_FORMATS } from "@/data/carousel-formats";
import { getScene } from "@/data/scenes";
import { REFERENCE_TYPE_LABELS } from "@/types/reference";
```

The component should be ~120-150 lines. Slide rows are inline (no separate SlideRow component — keep it self-contained).

- [ ] **Step 2: Commit**

```bash
git add src/components/studio/content/config-carousel.tsx
git commit -m "feat: add carousel config with format picker and slide editor"
```

---

### Task 7: Video Config

**Files:**
- Create: `src/components/studio/content/config-video.tsx`

- [ ] **Step 1: Create video config component**

Shows:
1. Source mode chips: "From text" | "From photo" | "Motion transfer" — calls `setVideoSource`
2. Duration toggle: 5s (3 credits) | 10s (5 credits) — calls `setVideoDuration`
3. Aspect ratio chips: 9:16 Portrait | 1:1 Square | 16:9 Landscape — calls `setVideoAspectRatio`
4. When "From photo": show recent content grid to pick source image (load from creator-store `content`, filter to images only, click sets `sourceContentId`)
5. When "Motion transfer": note in the ref panel that video upload zone is active

Imports:
```typescript
import { useUnifiedStudioStore } from "@/stores/unified-studio-store";
import { useCreatorStore } from "@/stores/creator-store";
import { CREDIT_COSTS } from "@/types/credits";
```

- [ ] **Step 2: Commit**

```bash
git add src/components/studio/content/config-video.tsx
git commit -m "feat: add video config component"
```

---

### Task 8: Talking Head Config

**Files:**
- Create: `src/components/studio/content/config-talking.tsx`

- [ ] **Step 1: Create talking head config component**

Shows:
1. Voice picker: 2-column grid of voice cards filtered by creator gender. Each card has play/stop preview button, name, tone. Uses `<audio>` ref for playback.
2. Duration toggle: 15s (8 credits) | 30s (12 credits)
3. Background/setting text input

Imports:
```typescript
import { useRef, useState } from "react";
import { useUnifiedStudioStore } from "@/stores/unified-studio-store";
import { useCreatorStore } from "@/stores/creator-store";
import { PLATFORM_VOICES } from "@/data/voices";
import { CREDIT_COSTS } from "@/types/credits";
```

- [ ] **Step 2: Commit**

```bash
git add src/components/studio/content/config-talking.tsx
git commit -m "feat: add talking head config with voice picker"
```

---

### Task 9: Results View

**Files:**
- Create: `src/components/studio/content/studio-results.tsx`

- [ ] **Step 1: Create the post-generation results component**

Renders when `showResults === true`. Shows generated content with iteration actions.

**Photo results:** Grid of 1-4 images. Per-image actions: "Use" (save + close), "More Like This" (back to create with refinement), "Save as Reference" (opens add-ref dialog with image prefilled).

**Carousel results:** Reuse carousel grid layout (slide thumbnails). Actions: "Use" (close), "Regenerate Slide" (pick a slide to redo), "Edit Caption".

**Video results:** Inline VideoPlayer. Actions: "Use" (close), "Try Different" (back to create).

**Talking head results:** Inline VideoPlayer. Actions: "Use" (close), "Try Different".

**"Try Different" action:** Sets `showResults: false` to go back to the creation view with the same config. User can tweak and regenerate.

**"Use" action:** Closes the studio. Content is already saved to DB during generation.

Imports:
```typescript
import { useUnifiedStudioStore } from "@/stores/unified-studio-store";
import { useUIStore } from "@/stores/ui-store";
import { VideoPlayer } from "@/components/workspace/video-player";
import { AddReferenceDialog } from "@/components/workspace/add-reference-dialog";
```

- [ ] **Step 2: Commit**

```bash
git add src/components/studio/content/studio-results.tsx
git commit -m "feat: add studio results view with iteration actions"
```

---

### Task 10: Creation Panel (Right Side)

**Files:**
- Create: `src/components/studio/content/studio-create-panel.tsx`

- [ ] **Step 1: Create the creation panel orchestrator**

This is the right side of the studio. Contains:

1. **Type tabs** at the top — calls `setContentType`
2. **Prompt area** — adapts label and placeholder per type:
   - Photo: "What should [name] do?"
   - Carousel: "What's the carousel about?"
   - Video: "What happens in the video?"
   - Talking Head: uses `script` instead of `prompt` — "What should [name] say?"
3. **Attached references inline** — shows attached ref tags with remove buttons
4. **Template quick-picks** (collapsible) — photo templates, carousel formats, adapted per type
5. **Type-specific config** — renders ConfigPhoto, ConfigCarousel, ConfigVideo, or ConfigTalking
6. **Footer** — credit cost display + Generate button

**Generate handler** routes to the correct server action based on `contentType`:
- Photo → `generateContent()`
- Carousel → `generateCarousel()`
- Video → `generateVideoFromText/Image/MotionTransfer()`
- Talking Head → `generateTalkingHead()`

After generation: sets `showResults: true` + populates `results` array.

For async video/talking head: polls `checkVideoStatus()` every 5s until complete.

**Credit cost calculation:**
```typescript
function getCreditCost(): number {
  switch (contentType) {
    case "photo": return imageCount * 1;
    case "carousel": return slides.length * 1;
    case "video": return videoDuration === 5 ? 3 : 5;
    case "talking-head": return talkingDuration === 15 ? 8 : 12;
  }
}
```

Imports: all config components, all server actions, store, templates data, credits.

- [ ] **Step 2: Commit**

```bash
git add src/components/studio/content/studio-create-panel.tsx
git commit -m "feat: add studio creation panel with type tabs and generation"
```

---

### Task 11: Unified Studio Overlay

**Files:**
- Create: `src/components/studio/content/unified-studio.tsx`

- [ ] **Step 1: Create the full-screen overlay orchestrator**

"use client" component. Imports `./unified-studio.css`.

Renders when `contentStudioOpen === true` (from ui-store).

Structure:
```
.us-overlay
  .us-header (close, title, creator badge, credits)
  .us-body
    StudioRefPanel (left)
    showResults ? StudioResults : StudioCreatePanel (right)
```

Handles:
- Body scroll lock when open
- Escape to close (when not generating)
- Reset store on close

```typescript
"use client";

import "./unified-studio.css";
import { useEffect, useCallback } from "react";
import { useUIStore } from "@/stores/ui-store";
import { useCreatorStore } from "@/stores/creator-store";
import { useUnifiedStudioStore } from "@/stores/unified-studio-store";
import { StudioRefPanel } from "./studio-ref-panel";
import { StudioCreatePanel } from "./studio-create-panel";
import { StudioResults } from "./studio-results";

export function UnifiedStudio() {
  const { contentStudioOpen, setContentStudioOpen } = useUIStore();
  const creator = useCreatorStore((s) => s.getActiveCreator());
  const { credits } = useCreatorStore();
  const { generating, showResults, reset } = useUnifiedStudioStore();

  const handleClose = useCallback(() => {
    if (generating) return;
    setContentStudioOpen(false);
    reset();
  }, [generating, setContentStudioOpen, reset]);

  useEffect(() => {
    if (!contentStudioOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !useUnifiedStudioStore.getState().generating) {
        handleClose();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [contentStudioOpen, handleClose]);

  useEffect(() => {
    document.body.style.overflow = contentStudioOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [contentStudioOpen]);

  if (!contentStudioOpen) return null;

  return (
    <div className="us-overlay">
      <div className="us-header">
        <div className="us-header-left">
          <button className="us-close" onClick={handleClose}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
          <span className="us-title">Content Studio</span>
          {creator && <span className="us-creator-badge">{creator.name}</span>}
        </div>
        <span className="us-credits">{credits.total} credits</span>
      </div>
      <div className="us-body">
        <StudioRefPanel />
        {showResults ? <StudioResults /> : <StudioCreatePanel />}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/studio/content/unified-studio.tsx
git commit -m "feat: add unified studio overlay"
```

---

### Task 12: Wire Into Workspace

**Files:**
- Modify: `src/components/workspace/workspace-shell.tsx`
- Modify: `src/components/workspace/workspace-canvas.tsx`
- Modify: `src/components/workspace/content-detail.tsx`

- [ ] **Step 1: Mount UnifiedStudio in workspace-shell**

Read `workspace-shell.tsx`. Replace the `ContentStudio` import/render with `UnifiedStudio`:

```typescript
// Remove: import { ContentStudio } from "@/components/studio/content/content-studio";
// Add:
import { UnifiedStudio } from "@/components/studio/content/unified-studio";
```

Replace `<ContentStudio />` with `<UnifiedStudio />` wherever it renders.

- [ ] **Step 2: Update workspace-canvas entry points**

Read `workspace-canvas.tsx`. Update:

1. Remove imports for `make-video-dialog`, `talking-head-dialog`, `content-studio-store`
2. Import `useUnifiedStudioStore` instead
3. Remove `videoOpen`, `talkingHeadOpen` state and their dialog renders
4. Update the Video mode chip to open the studio at Video tab:
```typescript
onClick={() => {
  useUnifiedStudioStore.getState().setContentType("video");
  useUIStore.getState().setContentStudioOpen(true);
}}
```
5. Update the Voice mode chip similarly:
```typescript
onClick={() => {
  useUnifiedStudioStore.getState().setContentType("talking-head");
  useUIStore.getState().setContentStudioOpen(true);
}}
```
6. Remove `<MakeVideoDialog>` and `<TalkingHeadDialog>` renders

- [ ] **Step 3: Update content-detail entry points**

Read `content-detail.tsx`. Update:

1. Remove `MakeVideoDialog` import and `videoOpen` state
2. "Make Video" button → opens studio at Video tab with source image:
```typescript
onClick={() => {
  useUnifiedStudioStore.getState().setContentType("video");
  useUnifiedStudioStore.getState().setVideoSource("photo");
  useUnifiedStudioStore.getState().setSourceContentId(item.id);
  useUIStore.getState().setContentStudioOpen(true);
  onOpenChange(false);
}}
```
3. Import `useUnifiedStudioStore`
4. Remove `<MakeVideoDialog>` render

- [ ] **Step 4: Commit**

```bash
git add src/components/workspace/workspace-shell.tsx \
      src/components/workspace/workspace-canvas.tsx \
      src/components/workspace/content-detail.tsx
git commit -m "feat: wire unified studio into workspace, remove old dialogs"
```

---

### Task 13: Build Verification

- [ ] **Step 1: Run build**

Run: `pnpm build 2>&1 | tail -20`

Expected: Build succeeds. Fix any import errors from removed files.

Common issues:
- Old imports of `content-studio-store` or `ContentStudio` in other files
- Old imports of `MakeVideoDialog` or `TalkingHeadDialog`
- Type mismatches between new store and components

- [ ] **Step 2: Fix errors**

Check all files that previously imported from deleted modules. Update or remove as needed.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "fix: unified studio build verification"
```
