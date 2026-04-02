# Content Studio V2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the Content Studio UI as a Canva-style creation engine — visual library panel, inline ref thumbnails, all 4 content types, opt-in configs, generation history, dashboard-matching styling.

**Architecture:** Replace all current `studio/content/` UI components (keep the store + server actions). New CSS from scratch matching the interactive mockup. Library panel replaces the old 3-tab ref panel. Creation panel rebuilt with visual-first approach. History loaded from existing Content records (no new models).

**Tech Stack:** React, Zustand (existing unified-studio-store), prototype-first CSS, existing server actions.

**Spec:** `docs/superpowers/specs/2026-04-02-content-studio-v2-design.md`

**Critical rule:** Do NOT modify any server action. Do NOT modify the Zustand store (unless noted). This is a UI-only rebuild.

**Reference mockup:** `.superpowers/brainstorm/56712-1775134632/content/studio-all-types.html` — open this in a browser for exact visual reference of all 4 types.

---

## File Structure

```
Delete: src/components/studio/content/unified-studio.tsx
Delete: src/components/studio/content/unified-studio.css
Delete: src/components/studio/content/studio-ref-panel.tsx
Delete: src/components/studio/content/studio-create-panel.tsx
Delete: src/components/studio/content/config-photo.tsx
Delete: src/components/studio/content/config-carousel.tsx
Delete: src/components/studio/content/config-video.tsx
Delete: src/components/studio/content/config-talking.tsx
Delete: src/components/studio/content/studio-results.tsx

Create: src/components/studio/content/content-studio-v2.tsx       — Overlay orchestrator
Create: src/components/studio/content/content-studio-v2.css       — All styles (from mockup)
Create: src/components/studio/content/library-panel.tsx           — Left: refs + public + recent
Create: src/components/studio/content/creation-panel.tsx          — Right: pills + prompt + inline refs + config + generate
Create: src/components/studio/content/inline-refs.tsx             — Visual ref thumbnails in creation area
Create: src/components/studio/content/creation-photo.tsx          — Photo config: count, aspect, advanced
Create: src/components/studio/content/creation-carousel.tsx       — Carousel config: format, slides
Create: src/components/studio/content/creation-video.tsx          — Video config: source cards, duration, ratio
Create: src/components/studio/content/creation-talking.tsx        — Talking head: voice, duration, background
Create: src/components/studio/content/creation-results.tsx        — Post-gen results + iteration

Modify: src/components/workspace/workspace-shell.tsx              — Update import path
Modify: src/server/actions/content-actions.ts                     — Add getRecentContent query (read-only)
```

---

### Task 1: Delete Old UI + Add History Query

**Files:**
- Delete: all 9 files listed above
- Modify: `src/server/actions/content-actions.ts`

- [ ] **Step 1: Delete old UI files**

```bash
rm src/components/studio/content/unified-studio.tsx \
   src/components/studio/content/unified-studio.css \
   src/components/studio/content/studio-ref-panel.tsx \
   src/components/studio/content/studio-create-panel.tsx \
   src/components/studio/content/config-photo.tsx \
   src/components/studio/content/config-carousel.tsx \
   src/components/studio/content/config-video.tsx \
   src/components/studio/content/config-talking.tsx \
   src/components/studio/content/studio-results.tsx
```

- [ ] **Step 2: Add getRecentContent to content-actions.ts**

Read `src/server/actions/content-actions.ts`. Add this function at the end of the file (after existing exports):

```typescript
// ─── Recent Content (for Studio history) ─────

export async function getRecentContent(
  creatorId: string,
  limit: number = 8
): Promise<ContentItem[]> {
  const { userId: clerkId } = await auth();
  if (!clerkId) return [];

  const items = await db.content.findMany({
    where: {
      creatorId,
      creator: { user: { clerkId } },
      status: "COMPLETED",
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return Promise.all(
    items.map(async (item) => ({
      id: item.id,
      creatorId: item.creatorId,
      type: item.type as ContentItem["type"],
      status: item.status as ContentItem["status"],
      url: item.url ? await getSignedImageUrl(item.url) : undefined,
      thumbnailUrl: item.thumbnailUrl ? await getSignedImageUrl(item.thumbnailUrl) : undefined,
      s3Keys: (item.outputs as string[]) ?? [],
      source: item.source as ContentItem["source"],
      prompt: item.prompt ?? undefined,
      userInput: item.userInput ?? undefined,
      creditsCost: item.creditsCost,
      createdAt: item.createdAt.toISOString(),
      contentSetId: item.contentSetId ?? undefined,
      slideIndex: item.slideIndex ?? undefined,
    }))
  );
}
```

- [ ] **Step 3: Commit**

```bash
git rm src/components/studio/content/unified-studio.tsx \
      src/components/studio/content/unified-studio.css \
      src/components/studio/content/studio-ref-panel.tsx \
      src/components/studio/content/studio-create-panel.tsx \
      src/components/studio/content/config-photo.tsx \
      src/components/studio/content/config-carousel.tsx \
      src/components/studio/content/config-video.tsx \
      src/components/studio/content/config-talking.tsx \
      src/components/studio/content/studio-results.tsx
git add src/server/actions/content-actions.ts
git commit -m "chore: remove old studio UI, add getRecentContent for history"
```

---

### Task 2: CSS

**Files:**
- Create: `src/components/studio/content/content-studio-v2.css`

- [ ] **Step 1: Create CSS**

Read the interactive mockup HTML at `.superpowers/brainstorm/56712-1775134632/content/studio-all-types.html`. Extract ALL CSS classes used in that mockup and create the CSS file.

The mockup uses `sf-` prefix classes. Convert them to `sv2-` prefix (studio v2) for the real CSS file. Match EXACTLY the colors, spacing, border-radius, and typography from the mockup. The mockup IS the design — copy its styling faithfully.

Key class groups to include:
- `.sv2-overlay` — fixed fullscreen, white bg, flex column, z-index 55
- `.sv2-head` — header bar
- `.sv2-body` — flex row (left panel + right panel)
- `.sv2-left` — library panel (200px, #FAFAFA bg, border-right)
- `.sv2-section-label` — 9px uppercase section headers
- `.sv2-section-hint` — 10px muted hint text
- `.sv2-ref-grid` — 3-column ref thumbnail grid
- `.sv2-ref` / `.sv2-ref.on` — ref thumbnails with active border
- `.sv2-ref-check` — checkmark badge on active refs
- `.sv2-pub-row` — horizontal scrollable public library row
- `.sv2-history-item` — recent generation row
- `.sv2-right` — creation panel (flex 1)
- `.sv2-pills` — content type pills
- `.sv2-pill` / `.sv2-pill.on` — rounded pills
- `.sv2-input-card` — prompt card with border, focus state
- `.sv2-textarea` — prompt textarea
- `.sv2-inline-refs` — visual ref thumbs inline
- `.sv2-inline-ref` — individual ref thumb with remove
- `.sv2-config` — compact inline config row
- `.sv2-cfg-btn` / `.sv2-cfg-btn.on` — config buttons
- `.sv2-cfg-pill` / `.sv2-cfg-pill.on` — config pills
- `.sv2-tpl-chip` — template chips
- `.sv2-video-sources` / `.sv2-vsrc` — video source cards
- `.sv2-voice-grid` / `.sv2-voice` — voice picker
- `.sv2-slides` / `.sv2-slide` — carousel slide rows
- `.sv2-footer` — footer with cost + generate button
- `.sv2-gen-btn` — generate button
- `.sv2-results-grid` / `.sv2-result-card` — results view
- Mobile: at 768px `.sv2-body` flex-direction column, `.sv2-left` width 100% max-height 180px
- Mobile: at 640px `.sv2-ref-grid` 4 columns, `.sv2-voice-grid` 1 column

- [ ] **Step 2: Commit**

```bash
git add src/components/studio/content/content-studio-v2.css
git commit -m "feat: add Content Studio V2 CSS"
```

---

### Task 3: Inline Refs Component

**Files:**
- Create: `src/components/studio/content/inline-refs.tsx`

- [ ] **Step 1: Create the inline refs display**

Shows visual ref thumbnails inside the creation area (below prompt). Each ref shows a small thumbnail image + name + remove button. Plus an "+ add ref" button.

```typescript
"use client";

import { useUnifiedStudioStore } from "@/stores/unified-studio-store";

export function InlineRefs() {
  const { attachedRefs, detachRef, inspirationPhotos, removeInspirationPhoto } = useUnifiedStudioStore();

  if (attachedRefs.length === 0 && inspirationPhotos.length === 0) return null;

  return (
    <div className="sv2-inline-refs">
      {attachedRefs.map((ref) => (
        <div key={ref.id} className="sv2-inline-ref">
          <div
            className="sv2-inline-ref-thumb"
            style={{ background: ref.imageUrl ? `url(${ref.imageUrl}) center/cover` : "#F5F5F5" }}
          />
          <span>{ref.name}</span>
          <button className="sv2-inline-ref-x" onClick={() => detachRef(ref.id)}>&times;</button>
        </div>
      ))}
      {inspirationPhotos.map((photo, i) => (
        <div key={`inspo-${i}`} className="sv2-inline-ref">
          <div
            className="sv2-inline-ref-thumb"
            style={{ background: `url(${photo.preview}) center/cover` }}
          />
          <span>Inspiration</span>
          <button className="sv2-inline-ref-x" onClick={() => removeInspirationPhoto(i)}>&times;</button>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/studio/content/inline-refs.tsx
git commit -m "feat: add InlineRefs — visual ref thumbnails in creation area"
```

---

### Task 4: Library Panel (Left Side)

**Files:**
- Create: `src/components/studio/content/library-panel.tsx`

- [ ] **Step 1: Create the library panel**

Single scrollable panel with three sections: refs, public (placeholder), recent history.

Read `src/components/workspace/reference-card.tsx` for the ReferenceCard component API.
Read `src/server/actions/content-actions.ts` for the `getRecentContent` function signature.

The panel must:
- Show creator's references in a 3-column compact grid
- Each ref is clickable — toggles attachment via `useUnifiedStudioStore().attachRef(ref)`
- Active refs show a checkmark badge and accent border
- "+ Add" card at end opens `AddReferenceDialog`
- "Public" section: show placeholder text "Public library coming soon" with a few grayed-out placeholder squares
- "Recent" section: load via `getRecentContent(creatorId)` on mount. Show each as a row with thumbnail (32px), type badge icon, and truncated prompt text. Click loads settings into the store.
- Inspiration drop zone at bottom: drag-drop for photos (or videos when motion transfer mode)

Use `sv2-` CSS classes matching the mockup. The panel's section labels use `.sv2-section-label` (9px, uppercase, #888).

For "Recent" click-to-reload: read the content item's `type`, `userInput`/`prompt`, and `generationSettings` JSON. Map `type` to `contentType`, set prompt, and parse generationSettings for config values.

Imports:
```typescript
import { useState, useEffect, useCallback } from "react";
import { useCreatorStore } from "@/stores/creator-store";
import { useUnifiedStudioStore } from "@/stores/unified-studio-store";
import { ReferenceCard } from "@/components/workspace/reference-card";
import { AddReferenceDialog } from "@/components/workspace/add-reference-dialog";
import { getRecentContent } from "@/server/actions/content-actions";
import type { ContentItem } from "@/types/content";
```

- [ ] **Step 2: Commit**

```bash
git add src/components/studio/content/library-panel.tsx
git commit -m "feat: add library panel (refs + public + recent history)"
```

---

### Task 5: Photo + Carousel + Video + Talking Head Configs

**Files:**
- Create: `src/components/studio/content/creation-photo.tsx`
- Create: `src/components/studio/content/creation-carousel.tsx`
- Create: `src/components/studio/content/creation-video.tsx`
- Create: `src/components/studio/content/creation-talking.tsx`

- [ ] **Step 1: Create all four config components**

Each is a "use client" component that reads/writes from `useUnifiedStudioStore`. Use `sv2-` CSS classes matching the mockup.

**creation-photo.tsx** (~40 lines):
- Photo count: 1-4 buttons (`.sv2-cfg-btn`)
- Collapsible "More options": aspect ratio pills (portrait/square/landscape), camera style, lighting, mood — all empty by default
- Import `useUnifiedStudioStore`

**creation-carousel.tsx** (~130 lines):
- Format picker chips from `CAROUSEL_FORMATS` (`.sv2-tpl-chip`, active chip has accent)
- When format selected: slide list (`.sv2-slides` / `.sv2-slide` rows)
- Each slide: number badge, scene name via `getScene()`, mood, auto-matched ref tags, click-to-edit inline
- Slide count +/- within format range
- Global instructions textarea
- Imports: `useUnifiedStudioStore`, `CAROUSEL_FORMATS`, `getScene`

**creation-video.tsx** (~100 lines):
- Three source cards (`.sv2-vsrc`): "From Text" / "From Photo" / "Motion Transfer"
- Duration pills: 5s / 10s with credit cost
- Aspect ratio pills: 9:16 / 1:1 / 16:9
- "From Photo" mode: show recent IMAGE content as selectable thumbnails (load from `useCreatorStore().content`)
- "Motion Transfer" mode: show note about uploading in library panel
- Imports: `useUnifiedStudioStore`, `useCreatorStore`, `CREDIT_COSTS`

**creation-talking.tsx** (~90 lines):
- Voice picker: 2-column grid (`.sv2-voice-grid` / `.sv2-voice`), filtered by creator gender, play preview with `<audio>` ref
- Duration pills: 15s / 30s with credit cost
- Background text input (optional)
- Imports: `useRef, useState`, `useUnifiedStudioStore`, `useCreatorStore`, `PLATFORM_VOICES`, `CREDIT_COSTS`

- [ ] **Step 2: Commit all four**

```bash
git add src/components/studio/content/creation-photo.tsx \
      src/components/studio/content/creation-carousel.tsx \
      src/components/studio/content/creation-video.tsx \
      src/components/studio/content/creation-talking.tsx
git commit -m "feat: add all 4 creation config components (photo, carousel, video, talking)"
```

---

### Task 6: Results View

**Files:**
- Create: `src/components/studio/content/creation-results.tsx`

- [ ] **Step 1: Create results view**

Renders when `showResults === true`. Shows generated content with iteration actions.

**Photo:** Grid of 1-4 images. Actions: "Use" (close studio), "Try Different" (back to create), "Save as Reference".
**Carousel:** Slide thumbnail row + caption. Actions: "Use", "Try Different".
**Video/Talking Head:** VideoPlayer inline. Actions: "Use", "Try Different".

"Use" calls `reset()` + `setContentStudioOpen(false)`.
"Try Different" calls `setShowResults(false)`.

Uses existing `VideoPlayer` from `@/components/workspace/video-player`.

CSS classes: `.sv2-results-grid`, `.sv2-result-card`, `.sv2-result-actions`.

- [ ] **Step 2: Commit**

```bash
git add src/components/studio/content/creation-results.tsx
git commit -m "feat: add creation results view with iteration"
```

---

### Task 7: Creation Panel (Right Side)

**Files:**
- Create: `src/components/studio/content/creation-panel.tsx`

- [ ] **Step 1: Create the creation panel orchestrator**

This is the right side. Contains:

1. **Content type pills** (`.sv2-pills` / `.sv2-pill`) — Photo, Carousel, Video, Talking Head
2. **Prompt input card** (`.sv2-input-card`):
   - Label adapts per type: "What should [name] do?" / "What's the carousel about?" / "What happens?" / "What should [name] say?"
   - Textarea (for talking head: uses `script` state, others use `prompt`)
   - InlineRefs component below textarea (visual ref thumbnails)
3. **Type-specific config** — renders CreationPhoto, CreationCarousel, CreationVideo, or CreationTalking
4. **Quick start template chips** (collapsible)
5. **Footer** with credit cost + Generate button

**Generate handler** — exact same routing logic as the previous `studio-create-panel.tsx`. Routes to:
- Photo → `generateContent()`
- Carousel → `generateCarousel()`
- Video → `generateVideoFromText/Image/MotionTransfer()` + poll
- Talking Head → `generateTalkingHead()` + poll

After generation succeeds: refresh credits, set results, show results view.

Read the old `studio-create-panel.tsx` from git history if needed for the exact generate handler code — the logic is the same, only the UI changes.

Imports: all config components, all server actions, InlineRefs, store, templates, carousel formats, credits.

- [ ] **Step 2: Commit**

```bash
git add src/components/studio/content/creation-panel.tsx
git commit -m "feat: add creation panel with type pills, prompt, and generation"
```

---

### Task 8: Overlay Orchestrator

**Files:**
- Create: `src/components/studio/content/content-studio-v2.tsx`

- [ ] **Step 1: Create the overlay**

Same structure as old `unified-studio.tsx` but imports new components and new CSS.

```typescript
"use client";

import "./content-studio-v2.css";
import { useEffect, useCallback } from "react";
import { useUIStore } from "@/stores/ui-store";
import { useCreatorStore } from "@/stores/creator-store";
import { useUnifiedStudioStore } from "@/stores/unified-studio-store";
import { LibraryPanel } from "./library-panel";
import { CreationPanel } from "./creation-panel";
import { CreationResults } from "./creation-results";

export function ContentStudioV2() {
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
      if (e.key === "Escape" && !useUnifiedStudioStore.getState().generating) handleClose();
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
    <div className="sv2-overlay">
      <div className="sv2-head">
        <div className="sv2-head-l">
          <button className="sv2-x" onClick={handleClose}>&times;</button>
          <span className="sv2-title">Create Content</span>
          {creator && <span className="sv2-badge">{creator.name}</span>}
        </div>
        <span className="sv2-credits">{credits.total} credits</span>
      </div>
      <div className="sv2-body">
        <LibraryPanel />
        {showResults ? <CreationResults /> : <CreationPanel />}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/studio/content/content-studio-v2.tsx
git commit -m "feat: add Content Studio V2 overlay"
```

---

### Task 9: Wire Into Workspace

**Files:**
- Modify: `src/components/workspace/workspace-shell.tsx`

- [ ] **Step 1: Update import**

Read `workspace-shell.tsx`. Replace:
```typescript
import { UnifiedStudio } from "@/components/studio/content/unified-studio";
```
with:
```typescript
import { ContentStudioV2 } from "@/components/studio/content/content-studio-v2";
```

Replace `<UnifiedStudio />` with `<ContentStudioV2 />`.

- [ ] **Step 2: Commit**

```bash
git add src/components/workspace/workspace-shell.tsx
git commit -m "feat: wire Content Studio V2 into workspace"
```

---

### Task 10: Build Verification

- [ ] **Step 1: Run build**

Run: `pnpm build 2>&1 | tail -20`

- [ ] **Step 2: Fix errors**

Common issues:
- Old imports from deleted files in workspace-canvas.tsx or content-detail.tsx
- CSS class mismatches (check `sv2-` prefix is consistent)
- Store method names matching between components

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "fix: Content Studio V2 build verification"
```
