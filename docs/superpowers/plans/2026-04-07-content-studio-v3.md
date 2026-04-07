# Content Studio V3 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the Content Studio as a unified workspace with Content Browser, Canvas, and Creation Panel — including viral content templates, photo→video flow, and resizable panels.

**Architecture:** Three-panel resizable layout using shadcn/ui Resizable. Canvas hidden by default (two-panel), appears on item selection or generation results. Content Browser shows user content + refs + templates. Creation Panel supports pre-fill from canvas actions and templates. ContentTemplate Prisma model for viral templates. All generation goes through existing server actions.

**Tech Stack:** Next.js 16 App Router, Prisma, Zustand, shadcn/ui (Resizable), prototype-first CSS (sv3- prefix), Server Actions, react-resizable-panels

**Spec:** `docs/superpowers/specs/2026-04-07-content-studio-v3-design.md` (31 sections, 1000+ lines)

---

## File Map

```
Phase A — Foundation
  MODIFY: prisma/schema.prisma                                    — Add ContentTemplate model
  CREATE: prisma/migrations/XXXXX_content_templates/              — Auto-generated
  CREATE: src/types/template.ts                                   — ContentTemplateItem, GenerationConfig types
  CREATE: src/server/actions/template-actions.ts                  — getContentTemplates, getTemplateTrends, useTemplate
  MODIFY: src/stores/unified-studio-store.ts                      — Add browser/canvas state + prefill actions

Phase B — Layout Shell
  CREATE: src/components/studio/content/content-studio-v3.tsx     — Root component with resizable panels
  CREATE: src/components/studio/content/content-studio-v3.css     — All V3 styles (sv3- prefix)
  MODIFY: src/components/workspace/workspace-shell.tsx            — Import V3 instead of V2

Phase C — Content Browser
  CREATE: src/components/studio/content/content-browser.tsx       — Left panel: tabs, search, grid, data loading

Phase D — Canvas
  CREATE: src/components/studio/content/studio-canvas.tsx         — Center panel: preview, actions, results
  CREATE: src/components/studio/content/canvas-actions.tsx        — Action buttons by content type

Phase E — Creation Panel Updates
  MODIFY: src/components/studio/content/creation-panel.tsx        — Prefill support, aspect ratio fix, cleaner layout
  MODIFY: src/components/studio/content/creation-photo.tsx        — Wire aspect ratio to store
  MODIFY: src/components/studio/content/creation-video.tsx        — Accept pre-loaded photo/video from canvas

Phase F — Integration
  MODIFY: src/components/workspace/workspace-canvas.tsx           — "Open in Studio" on content detail
  MODIFY: src/components/workspace/content-detail.tsx             — Add "Open in Studio" button

Phase G — Cleanup
  DELETE: src/components/studio/content/content-studio-v2.tsx     — Replaced by V3
  DELETE: src/components/studio/content/content-studio-v2.css     — Replaced by V3
  DELETE: src/components/studio/content/library-panel.tsx         — Replaced by content-browser
```

---

### Task 1: ContentTemplate Schema + Migration

**Files:**
- Modify: `prisma/schema.prisma`
- Create: auto-generated migration

- [ ] **Step 1: Add ContentTemplate model to schema**

In `prisma/schema.prisma`, add after the existing models (near the end, before any closing comments):

```prisma
// ─── Content Templates ──────────────────────────────
// Admin-published viral content templates that users can recreate with their creator.

model ContentTemplate {
  id              String   @id @default(cuid())
  type            String   // "IMAGE" | "VIDEO" | "CAROUSEL"
  name            String
  description     String   @default("")

  mediaUrl        String   // S3 key — the example output
  thumbnailUrl    String?  // S3 key — for grid display
  sourceVideoUrl  String?  // S3 key — original video for motion transfer

  category        String   // gym-fitness, city-lifestyle, fashion-beauty, travel, general
  trend           String   // mirror-selfie, grwm, city-walk, outfit-check, etc.
  tags            String[]

  generationConfig Json    // { prompt, aspectRatio, imageCount, videoSource, ... }

  isActive        Boolean  @default(true)
  popularity      Int      @default(0)
  createdBy       String?

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@index([category])
  @@index([trend])
  @@index([type])
  @@index([isActive, popularity])
}
```

- [ ] **Step 2: Run migration**

```bash
pnpx prisma migrate dev --name content_templates
```

- [ ] **Step 3: Generate client**

```bash
pnpx prisma generate
```

- [ ] **Step 4: Commit**

```bash
git add prisma/
git commit -m "feat: add ContentTemplate model for viral content templates"
```

---

### Task 2: Template Types + Server Actions

**Files:**
- Create: `src/types/template.ts`
- Create: `src/server/actions/template-actions.ts`

- [ ] **Step 1: Create template types**

Create `src/types/template.ts`:

```typescript
export type GenerationConfig = {
  contentType: "photo" | "video" | "carousel" | "talking-head";
  prompt: string;
  imageCount?: number;
  aspectRatio?: string;
  videoSource?: "text" | "photo" | "motion";
  videoDuration?: 5 | 10;
  videoAspectRatio?: string;
  formatId?: string;
  slideCount?: number;
  carouselInstructions?: string;
  voiceId?: string;
  talkingDuration?: 15 | 30;
  talkingSetting?: string;
  referenceKeys?: string[];
};

export type ContentTemplateItem = {
  id: string;
  type: string;
  name: string;
  description: string;
  mediaUrl?: string;
  thumbnailUrl?: string;
  sourceVideoUrl?: string;
  category: string;
  trend: string;
  tags: string[];
  generationConfig: GenerationConfig;
  popularity: number;
  createdAt: string;
};

export type TemplateTrend = {
  trend: string;
  count: number;
  category: string;
};

export const TEMPLATE_CATEGORIES = [
  "all",
  "gym-fitness",
  "city-lifestyle",
  "fashion-beauty",
  "travel",
  "general",
] as const;

export const TEMPLATE_CATEGORY_LABELS: Record<string, string> = {
  "all": "All",
  "gym-fitness": "Gym & Fitness",
  "city-lifestyle": "City & Lifestyle",
  "fashion-beauty": "Fashion & Beauty",
  "travel": "Travel",
  "general": "General",
};
```

- [ ] **Step 2: Create template server actions**

Create `src/server/actions/template-actions.ts`:

```typescript
"use server";

import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { getSignedImageUrl } from "@/lib/s3";
import type { ContentTemplateItem, GenerationConfig, TemplateTrend } from "@/types/template";

export async function getContentTemplates(
  category?: string,
  type?: string,
  trend?: string,
  search?: string,
  limit: number = 40,
  offset: number = 0
): Promise<ContentTemplateItem[]> {
  const { userId: clerkId } = await auth();
  if (!clerkId) return [];

  const where: Record<string, unknown> = { isActive: true };
  if (category && category !== "all") where.category = category;
  if (type) where.type = type;
  if (trend) where.trend = trend;
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { description: { contains: search, mode: "insensitive" } },
      { tags: { hasSome: [search.toLowerCase()] } },
    ];
  }

  const templates = await db.contentTemplate.findMany({
    where,
    orderBy: { popularity: "desc" },
    take: limit,
    skip: offset,
  });

  return Promise.all(
    templates.map(async (t) => ({
      id: t.id,
      type: t.type,
      name: t.name,
      description: t.description,
      mediaUrl: await getSignedImageUrl(t.mediaUrl),
      thumbnailUrl: t.thumbnailUrl ? await getSignedImageUrl(t.thumbnailUrl) : undefined,
      sourceVideoUrl: t.sourceVideoUrl ? await getSignedImageUrl(t.sourceVideoUrl) : undefined,
      category: t.category,
      trend: t.trend,
      tags: t.tags,
      generationConfig: t.generationConfig as GenerationConfig,
      popularity: t.popularity,
      createdAt: t.createdAt.toISOString(),
    }))
  );
}

export async function getTemplateTrends(): Promise<TemplateTrend[]> {
  const { userId: clerkId } = await auth();
  if (!clerkId) return [];

  const results = await db.contentTemplate.groupBy({
    by: ["trend", "category"],
    where: { isActive: true },
    _count: { id: true },
    orderBy: { _count: { id: "desc" } },
  });

  return results.map((r) => ({
    trend: r.trend,
    count: r._count.id,
    category: r.category,
  }));
}

export async function useTemplate(
  templateId: string
): Promise<{ success: boolean; config?: GenerationConfig; error?: string }> {
  const { userId: clerkId } = await auth();
  if (!clerkId) return { success: false, error: "Not authenticated" };

  const template = await db.contentTemplate.findUnique({ where: { id: templateId } });
  if (!template || !template.isActive) return { success: false, error: "Template not found" };

  await db.contentTemplate.update({
    where: { id: templateId },
    data: { popularity: { increment: 1 } },
  });

  return { success: true, config: template.generationConfig as GenerationConfig };
}
```

- [ ] **Step 3: Verify build**

```bash
pnpm build 2>&1 | tail -10
```

- [ ] **Step 4: Commit**

```bash
git add src/types/template.ts src/server/actions/template-actions.ts
git commit -m "feat: template types and server actions"
```

---

### Task 3: Update Unified Studio Store

**Files:**
- Modify: `src/stores/unified-studio-store.ts`

- [ ] **Step 1: Read the current store file**

Read `src/stores/unified-studio-store.ts` to understand the full current structure.

- [ ] **Step 2: Add browser/canvas state and prefill actions**

Add to the store type (inside `UnifiedStudioStore`):

```typescript
  // Browser state
  browserTab: "my-content" | "refs-templates";
  browserSubFilter: string; // "all", "photos", "videos", "carousels", "my-refs", "templates"
  browserSearch: string;

  // Canvas state
  selectedItem: BrowserItem | null;
  canvasVisible: boolean;

  // Browser actions
  setBrowserTab: (tab: "my-content" | "refs-templates") => void;
  setBrowserSubFilter: (filter: string) => void;
  setBrowserSearch: (search: string) => void;

  // Canvas actions
  selectItem: (item: BrowserItem | null) => void;
  showCanvas: () => void;
  hideCanvas: () => void;

  // Prefill actions
  prefillFromTemplate: (config: GenerationConfig) => void;
  prefillVideoFromPhoto: (contentId: string) => void;
  prefillMotionTransfer: (sourceVideoUrl: string) => void;
```

Add the `BrowserItem` type import at top:

```typescript
import type { GenerationConfig } from "@/types/template";

export type BrowserItem = {
  id: string;
  kind: "content" | "reference" | "template";
  type: string;
  name: string;
  thumbnailUrl?: string;
  mediaUrl?: string;
  prompt?: string;
  createdAt: string;
  trend?: string;
  category?: string;
  generationConfig?: GenerationConfig;
  sourceVideoUrl?: string;
  tags?: string[];
  starred?: boolean;
  slideCount?: number;
  contentSetId?: string;
};
```

Add to INITIAL state:

```typescript
  browserTab: "my-content" as const,
  browserSubFilter: "all",
  browserSearch: "",
  selectedItem: null,
  canvasVisible: false,
```

Add implementations in the `create` call:

```typescript
  setBrowserTab: (browserTab) => set({ browserTab }),
  setBrowserSubFilter: (browserSubFilter) => set({ browserSubFilter }),
  setBrowserSearch: (browserSearch) => set({ browserSearch }),

  selectItem: (selectedItem) => set({ selectedItem, canvasVisible: selectedItem !== null }),
  showCanvas: () => set({ canvasVisible: true }),
  hideCanvas: () => set({ canvasVisible: false, selectedItem: null }),

  prefillFromTemplate: (config) => set({
    contentType: config.contentType,
    prompt: config.prompt,
    ...(config.imageCount !== undefined && { imageCount: config.imageCount }),
    ...(config.videoSource !== undefined && { videoSource: config.videoSource }),
    ...(config.videoDuration !== undefined && { videoDuration: config.videoDuration }),
    ...(config.videoAspectRatio !== undefined && { videoAspectRatio: config.videoAspectRatio as "9:16" | "1:1" | "16:9" }),
    ...(config.voiceId !== undefined && { voiceId: config.voiceId }),
    ...(config.talkingDuration !== undefined && { talkingDuration: config.talkingDuration }),
    ...(config.talkingSetting !== undefined && { talkingSetting: config.talkingSetting }),
    ...(config.carouselInstructions !== undefined && { carouselInstructions: config.carouselInstructions }),
  }),

  prefillVideoFromPhoto: (contentId) => set({
    contentType: "video",
    videoSource: "photo",
    sourceContentId: contentId,
  }),

  prefillMotionTransfer: (sourceVideoUrl) => set({
    contentType: "video",
    videoSource: "motion",
    // Store the URL temporarily — creation-video will use it
  }),
```

Also update the `reset` function to clear browser/canvas state:

```typescript
  reset: () => set({
    ...INITIAL,
    browserTab: "my-content",
    browserSubFilter: "all",
    browserSearch: "",
    selectedItem: null,
    canvasVisible: false,
  }),
```

- [ ] **Step 3: Verify build**

```bash
pnpm build 2>&1 | tail -10
```

- [ ] **Step 4: Commit**

```bash
git add src/stores/unified-studio-store.ts
git commit -m "feat: add browser/canvas/prefill state to studio store"
```

---

### Task 4: Install shadcn Resizable + CSS

**Files:**
- Install: shadcn/ui resizable component
- Create: `src/components/studio/content/content-studio-v3.css`

- [ ] **Step 1: Install resizable component**

```bash
pnpx shadcn@latest add resizable
```

This installs `react-resizable-panels` and creates `src/components/ui/resizable.tsx`.

- [ ] **Step 2: Create V3 CSS file**

Create `src/components/studio/content/content-studio-v3.css`. This is a large file — write the complete CSS with all `sv3-` prefixed classes.

Key sections to include:
- `.sv3-overlay` — fullscreen fixed modal (same as sv2: position fixed, inset 0, z-index 50, bg #FAFAFA, flex column)
- `.sv3-head` — header bar (flex row, 48px height, border-bottom, items center, padding 0 16px, bg white)
- `.sv3-x` — close button (24px, no bg, font-size 20px, color #888)
- `.sv3-title` — "Content Studio" text (14px, font-weight 600)
- `.sv3-badge` — creator name badge (bg #F5F5F5, border-radius 12px, font-size 11px, padding 2px 10px)
- `.sv3-credits` — credit count (margin-left auto, font-size 12px, color #888)
- `.sv3-body` — panel container (flex: 1, overflow: hidden, display: flex) — NOTE: the actual panel layout is handled by ResizablePanelGroup, not CSS flex
- `.sv3-browser` — left panel (height 100%, overflow-y auto, bg white, border-right #EBEBEB)
- `.sv3-browser-tabs` — tab row (display flex, border-bottom #EBEBEB, padding 0)
- `.sv3-browser-tab` — individual tab (padding 8px 14px, font-size 12px, border-bottom 2px transparent, color #888)
- `.sv3-browser-tab.active` — active tab (color #C4603A, border-bottom-color #C4603A)
- `.sv3-browser-search` — search input (margin 8px, display flex, align-items center, gap 6px, bg #F5F5F5, border-radius 6px, padding 6px 10px)
- `.sv3-browser-search input` — (border none, bg transparent, font-size 12px, flex 1, outline none)
- `.sv3-browser-filters` — sub-filter chips (display flex, gap 4px, padding 4px 8px, overflow-x auto)
- `.sv3-browser-chip` — filter chip (padding 3px 10px, border-radius 12px, font-size 10px, bg #F5F5F5, color #888, white-space nowrap, cursor pointer, border none)
- `.sv3-browser-chip.active` — active chip (bg #111, color white)
- `.sv3-browser-grid` — thumbnail grid (display grid, grid-template-columns repeat(2, 1fr), gap 6px, padding 8px)
- `.sv3-browser-item` — grid item (aspect-ratio 1, border-radius 6px, overflow hidden, cursor pointer, position relative, bg #F0F0F0)
- `.sv3-browser-item img` — (width 100%, height 100%, object-fit cover)
- `.sv3-browser-item.selected` — selected state (ring 2px #C4603A)
- `.sv3-browser-badge` — type badge on item (position absolute, top 4px, right 4px, bg rgba(0,0,0,0.5), color white, padding 1px 6px, border-radius 8px, font-size 8px)
- `.sv3-browser-badge.template` — template badge (bg rgba(196,96,58,0.8))
- `.sv3-browser-play` — video play overlay (position absolute, inset 0, display flex, items center, justify center)
- `.sv3-browser-group` — trend group header (padding 8px, font-size 11px, font-weight 600, color #888, text-transform uppercase, letter-spacing 0.04em)
- `.sv3-browser-empty` — empty state (padding 24px, text-align center, color #BBB, font-size 12px)
- `.sv3-browser-load-more` — load more button (width 100%, padding 8px, font-size 11px, color #C4603A, bg none, border 1px dashed #EBEBEB, border-radius 6px, cursor pointer)

- `.sv3-canvas` — center panel (height 100%, display flex, flex-direction column, overflow hidden)
- `.sv3-canvas-close` — canvas × button (position absolute, top 8px, right 8px, z-index 2)
- `.sv3-canvas-preview` — preview area (flex 1, display flex, items center, justify center, padding 16px, overflow hidden)
- `.sv3-canvas-preview img` — (max-width 100%, max-height 100%, object-fit contain, border-radius 8px)
- `.sv3-canvas-preview video` — (max-width 100%, max-height 100%, border-radius 8px)
- `.sv3-canvas-info` — info below preview (padding 12px 16px, border-top 1px solid #EBEBEB)
- `.sv3-canvas-prompt` — prompt text (font-size 12px, color #888, margin-bottom 4px)
- `.sv3-canvas-date` — date text (font-size 10px, color #BBB)
- `.sv3-canvas-actions` — action buttons (display flex, flex-wrap wrap, gap 6px, padding 12px 16px, border-top 1px solid #EBEBEB)
- `.sv3-canvas-action` — action button (padding 6px 14px, font-size 12px, border-radius 6px, border 1px solid #EBEBEB, bg white, color #111, cursor pointer, transition all 150ms)
- `.sv3-canvas-action:hover` — (bg #F5F5F5)
- `.sv3-canvas-action.primary` — primary action (bg #C4603A, color white, border-color #C4603A)
- `.sv3-canvas-action.danger` — danger action (color #e53e3e, border-color #e53e3e)
- `.sv3-canvas-slides` — carousel slide strip (display flex, gap 6px, overflow-x auto, padding 8px 16px)
- `.sv3-canvas-slide` — individual slide thumb (width 64px, height 64px, border-radius 4px, flex-shrink 0, cursor pointer, border 2px solid transparent)
- `.sv3-canvas-slide.active` — active slide (border-color #C4603A)
- `.sv3-canvas-slide-counter` — slide counter (font-size 11px, color #888, text-align center, padding 4px)

- `.sv3-canvas-skeleton` — loading skeleton in canvas (display flex, items center, justify center, flex 1)
- `.sv3-canvas-generating` — generation progress (text-align center, padding 24px, color #888)

- `.sv3-panel` — right panel (creation panel wrapper: height 100%, display flex, flex-direction column, bg white, border-left 1px solid #EBEBEB)

Responsive:
```css
@media (max-width: 1024px) {
  /* Browser starts collapsed — handled by ResizablePanel collapsible prop */
}

@media (max-width: 767px) {
  .sv3-body { flex-direction: column; }
  .sv3-mobile-tabs { display: flex; border-top: 1px solid #EBEBEB; bg: white; }
  .sv3-mobile-tab { flex: 1; padding: 10px; text-align: center; font-size: 12px; color: #888; border: none; bg: none; }
  .sv3-mobile-tab.active { color: #C4603A; font-weight: 600; }
  .sv3-browser { width: 100%; height: 100%; border-right: none; }
  .sv3-canvas { width: 100%; height: 100%; }
  .sv3-panel { width: 100%; height: 100%; border-left: none; }
  .sv3-browser-grid { grid-template-columns: repeat(3, 1fr); }
}
```

- [ ] **Step 3: Verify build**

```bash
pnpm build 2>&1 | tail -10
```

- [ ] **Step 4: Commit**

```bash
git add src/components/ui/resizable.tsx src/components/studio/content/content-studio-v3.css
git commit -m "feat: install shadcn resizable, create V3 CSS"
```

---

### Task 5: Content Studio V3 Root Component

**Files:**
- Create: `src/components/studio/content/content-studio-v3.tsx`
- Modify: `src/components/workspace/workspace-shell.tsx`

- [ ] **Step 1: Create V3 root component**

Create `src/components/studio/content/content-studio-v3.tsx`:

```tsx
"use client";

import "./content-studio-v3.css";
import { useEffect, useCallback, useState } from "react";
import { useUIStore } from "@/stores/ui-store";
import { useCreatorStore } from "@/stores/creator-store";
import { useUnifiedStudioStore } from "@/stores/unified-studio-store";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";
import { ContentBrowser } from "./content-browser";
import { StudioCanvas } from "./studio-canvas";
import { CreationPanel } from "./creation-panel";

export function ContentStudioV3() {
  const { contentStudioOpen, setContentStudioOpen } = useUIStore();
  const creator = useCreatorStore((s) => s.getActiveCreator());
  const { credits } = useCreatorStore();
  const { generating, canvasVisible, reset } = useUnifiedStudioStore();
  const [mobileTab, setMobileTab] = useState<"browse" | "create" | "view">("create");
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

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

  if (!creator) {
    return (
      <div className="sv3-overlay">
        <div className="sv3-head">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button className="sv3-x" onClick={handleClose}>&times;</button>
            <span className="sv3-title">Content Studio</span>
          </div>
        </div>
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "#888", fontSize: 14 }}>
          Select a creator first
        </div>
      </div>
    );
  }

  // Mobile layout
  if (isMobile) {
    return (
      <div className="sv3-overlay">
        <div className="sv3-head">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button className="sv3-x" onClick={handleClose}>&times;</button>
            <span className="sv3-title">Content Studio</span>
            <span className="sv3-badge">{creator.name}</span>
          </div>
          <span className="sv3-credits">{credits.total} credits</span>
        </div>
        <div className="sv3-body" style={{ flex: 1, overflow: "hidden" }}>
          {mobileTab === "browse" && (
            <div style={{ height: "100%", overflow: "auto" }}>
              <ContentBrowser onItemSelect={() => setMobileTab("view")} />
            </div>
          )}
          {mobileTab === "create" && (
            <div className="sv3-panel" style={{ height: "100%", overflow: "auto", borderLeft: "none" }}>
              <CreationPanel />
            </div>
          )}
          {mobileTab === "view" && (
            <div style={{ height: "100%", overflow: "auto" }}>
              <StudioCanvas />
            </div>
          )}
        </div>
        <div className="sv3-mobile-tabs">
          <button className={`sv3-mobile-tab${mobileTab === "browse" ? " active" : ""}`} onClick={() => setMobileTab("browse")}>Browse</button>
          <button className={`sv3-mobile-tab${mobileTab === "create" ? " active" : ""}`} onClick={() => setMobileTab("create")}>Create</button>
          <button className={`sv3-mobile-tab${mobileTab === "view" ? " active" : ""}`} onClick={() => setMobileTab("view")}>
            View{canvasVisible ? " •" : ""}
          </button>
        </div>
      </div>
    );
  }

  // Desktop layout with resizable panels
  return (
    <div className="sv3-overlay">
      <div className="sv3-head">
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button className="sv3-x" onClick={handleClose}>&times;</button>
          <span className="sv3-title">Content Studio</span>
          <span className="sv3-badge">{creator.name}</span>
        </div>
        <span className="sv3-credits">{credits.total} credits</span>
      </div>
      <div className="sv3-body">
        <ResizablePanelGroup direction="horizontal" autoSaveId="studio-panels">
          <ResizablePanel defaultSize={20} minSize={15} maxSize={35} collapsible collapsedSize={0}>
            <ContentBrowser />
          </ResizablePanel>
          <ResizableHandle withHandle />
          {canvasVisible && (
            <>
              <ResizablePanel defaultSize={45} minSize={30}>
                <StudioCanvas />
              </ResizablePanel>
              <ResizableHandle withHandle />
            </>
          )}
          <ResizablePanel defaultSize={canvasVisible ? 35 : 80} minSize={25} maxSize={45}>
            <div className="sv3-panel">
              <CreationPanel />
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </div>
  );
}
```

Note: `autoSaveId="studio-panels"` automatically persists panel sizes to localStorage.

- [ ] **Step 2: Update workspace-shell to use V3**

In `src/components/workspace/workspace-shell.tsx`, replace the V2 import:

Change:
```tsx
import { ContentStudioV2 } from "@/components/studio/content/content-studio-v2";
```
To:
```tsx
import { ContentStudioV3 } from "@/components/studio/content/content-studio-v3";
```

And replace `<ContentStudioV2 />` with `<ContentStudioV3 />` in the JSX.

- [ ] **Step 3: Verify build**

```bash
pnpm build 2>&1 | tail -10
```

Expected: May have errors about ContentBrowser and StudioCanvas not existing yet. That's OK — we create them next. If the error is only about missing components, proceed. If it's something else, fix it.

- [ ] **Step 4: Commit**

```bash
git add src/components/studio/content/content-studio-v3.tsx src/components/workspace/workspace-shell.tsx
git commit -m "feat: V3 root component with resizable panels and mobile layout"
```

---

### Task 6: Content Browser Component

**Files:**
- Create: `src/components/studio/content/content-browser.tsx`

- [ ] **Step 1: Create the Content Browser**

Create `src/components/studio/content/content-browser.tsx`. This is the left panel showing user's content + refs + templates.

```tsx
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useCreatorStore } from "@/stores/creator-store";
import { useUnifiedStudioStore, type BrowserItem } from "@/stores/unified-studio-store";
import { getCreatorContent } from "@/server/actions/content-actions";
import { getReferences } from "@/server/actions/reference-actions";
import { getContentTemplates } from "@/server/actions/template-actions";
import { AddReferenceDialog } from "@/components/workspace/add-reference-dialog";
import type { ContentItem } from "@/types/content";
import type { ReferenceItem } from "@/types/reference";
import type { ContentTemplateItem } from "@/types/template";
import { TEMPLATE_CATEGORY_LABELS } from "@/types/template";

function contentToBrowserItem(c: ContentItem): BrowserItem {
  return {
    id: c.id,
    kind: "content",
    type: c.type,
    name: c.userInput ?? c.prompt ?? c.type,
    thumbnailUrl: c.thumbnailUrl ?? c.url,
    mediaUrl: c.url,
    prompt: c.prompt,
    createdAt: c.createdAt,
    contentSetId: c.contentSetId,
    slideCount: c.slideIndex !== undefined ? undefined : undefined,
  };
}

function refToBrowserItem(r: ReferenceItem): BrowserItem {
  return {
    id: r.id,
    kind: "reference",
    type: r.type,
    name: r.name,
    thumbnailUrl: r.imageUrl,
    mediaUrl: r.imageUrl,
    createdAt: r.createdAt,
    tags: r.tags,
    starred: r.starred,
  };
}

function templateToBrowserItem(t: ContentTemplateItem): BrowserItem {
  return {
    id: t.id,
    kind: "template",
    type: t.type,
    name: t.name,
    thumbnailUrl: t.thumbnailUrl ?? t.mediaUrl,
    mediaUrl: t.mediaUrl,
    createdAt: t.createdAt,
    trend: t.trend,
    category: t.category,
    generationConfig: t.generationConfig,
    sourceVideoUrl: t.sourceVideoUrl,
    tags: t.tags,
  };
}

export function ContentBrowser({ onItemSelect }: { onItemSelect?: () => void }) {
  const creator = useCreatorStore((s) => s.getActiveCreator());
  const references = useCreatorStore((s) => s.references);
  const {
    browserTab, setBrowserTab,
    browserSubFilter, setBrowserSubFilter,
    browserSearch, setBrowserSearch,
    selectedItem, selectItem,
  } = useUnifiedStudioStore();

  const [contentItems, setContentItems] = useState<BrowserItem[]>([]);
  const [templateItems, setTemplateItems] = useState<BrowserItem[]>([]);
  const [templateTrends, setTemplateTrends] = useState<Map<string, BrowserItem[]>>(new Map());
  const [loading, setLoading] = useState(true);
  const [addRefOpen, setAddRefOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load content on mount
  useEffect(() => {
    if (!creator?.id) return;
    setLoading(true);
    getCreatorContent(creator.id).then((items) => {
      // Filter out carousel slides (they belong to sets)
      const standalone = items.filter((c) => !c.contentSetId);
      setContentItems(standalone.map(contentToBrowserItem));
      setLoading(false);
    });
  }, [creator?.id]);

  // Load templates
  useEffect(() => {
    getContentTemplates().then((templates) => {
      const items = templates.map(templateToBrowserItem);
      setTemplateItems(items);
      // Group by trend
      const groups = new Map<string, BrowserItem[]>();
      for (const item of items) {
        const key = item.trend ?? "other";
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key)!.push(item);
      }
      setTemplateTrends(groups);
    });
  }, []);

  // Convert refs to browser items
  const refItems = references.map(refToBrowserItem);

  function handleSelect(item: BrowserItem) {
    selectItem(item);
    onItemSelect?.();
  }

  // Filter logic
  const query = browserSearch.toLowerCase().trim();

  let displayItems: BrowserItem[] = [];
  if (browserTab === "my-content") {
    displayItems = contentItems;
    if (browserSubFilter === "photos") displayItems = displayItems.filter((i) => i.type === "IMAGE");
    else if (browserSubFilter === "videos") displayItems = displayItems.filter((i) => i.type === "VIDEO" || i.type === "TALKING_HEAD");
    else if (browserSubFilter === "carousels") displayItems = displayItems.filter((i) => i.type === "CAROUSEL");
  } else {
    if (browserSubFilter === "my-refs") displayItems = refItems;
    else if (browserSubFilter === "templates") displayItems = templateItems;
    else displayItems = [...refItems, ...templateItems];
  }

  if (query) {
    displayItems = displayItems.filter(
      (i) =>
        i.name.toLowerCase().includes(query) ||
        (i.prompt ?? "").toLowerCase().includes(query) ||
        (i.tags ?? []).some((t) => t.includes(query))
    );
  }

  const myContentFilters = [
    { label: "All", value: "all" },
    { label: "Photos", value: "photos" },
    { label: "Videos", value: "videos" },
    { label: "Carousels", value: "carousels" },
  ];

  const refsTemplateFilters = [
    { label: "All", value: "all" },
    { label: "My Refs", value: "my-refs" },
    { label: "Templates", value: "templates" },
  ];

  const activeFilters = browserTab === "my-content" ? myContentFilters : refsTemplateFilters;

  function getBadgeText(item: BrowserItem): string {
    if (item.kind === "template") return `TEMPLATE`;
    if (item.type === "IMAGE") return "PHOTO";
    if (item.type === "VIDEO") return "VIDEO";
    if (item.type === "TALKING_HEAD") return "VOICE";
    if (item.type === "CAROUSEL") return "CAROUSEL";
    if (item.type === "BACKGROUND") return "BG";
    return "REF";
  }

  // Template trend display (only when on templates sub-filter)
  const showTrends = browserTab === "refs-templates" && (browserSubFilter === "templates" || browserSubFilter === "all") && !query;

  return (
    <div className="sv3-browser">
      {/* Tabs */}
      <div className="sv3-browser-tabs">
        <button
          className={`sv3-browser-tab${browserTab === "my-content" ? " active" : ""}`}
          onClick={() => { setBrowserTab("my-content"); setBrowserSubFilter("all"); }}
        >
          My Content
        </button>
        <button
          className={`sv3-browser-tab${browserTab === "refs-templates" ? " active" : ""}`}
          onClick={() => { setBrowserTab("refs-templates"); setBrowserSubFilter("all"); }}
        >
          Refs & Templates
        </button>
      </div>

      {/* Search */}
      <div className="sv3-browser-search">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8" />
          <path d="M21 21l-4.35-4.35" />
        </svg>
        <input
          placeholder="Search..."
          value={browserSearch}
          onChange={(e) => setBrowserSearch(e.target.value)}
        />
      </div>

      {/* Sub-filters */}
      <div className="sv3-browser-filters">
        {activeFilters.map((f) => (
          <button
            key={f.value}
            className={`sv3-browser-chip${browserSubFilter === f.value ? " active" : ""}`}
            onClick={() => setBrowserSubFilter(f.value)}
          >
            {f.label}
          </button>
        ))}
        {browserTab === "refs-templates" && (
          <button className="sv3-browser-chip" onClick={() => setAddRefOpen(true)}>+ Upload</button>
        )}
      </div>

      {/* Grid or trend groups */}
      <div style={{ flex: 1, overflowY: "auto" }}>
        {loading ? (
          <div className="sv3-browser-grid">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="sv3-browser-item" style={{ background: "#F0F0F0", animation: "pulse 1.5s infinite" }} />
            ))}
          </div>
        ) : showTrends && templateTrends.size > 0 ? (
          // Grouped by trend
          <>
            {browserTab === "refs-templates" && browserSubFilter === "all" && refItems.length > 0 && (
              <>
                <div className="sv3-browser-group">My References</div>
                <div className="sv3-browser-grid">
                  {refItems.slice(0, 4).map((item) => (
                    <div
                      key={item.id}
                      className={`sv3-browser-item${selectedItem?.id === item.id ? " selected" : ""}`}
                      onClick={() => handleSelect(item)}
                    >
                      {item.thumbnailUrl && <img src={item.thumbnailUrl} alt={item.name} />}
                      <span className={`sv3-browser-badge`}>{getBadgeText(item)}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
            {Array.from(templateTrends.entries()).map(([trend, items]) => (
              <div key={trend}>
                <div className="sv3-browser-group">
                  {TEMPLATE_CATEGORY_LABELS[items[0]?.category ?? ""] ?? trend.replace(/-/g, " ")}
                  {" · "}
                  {trend.replace(/-/g, " ")}
                </div>
                <div className="sv3-browser-grid">
                  {items.map((item) => (
                    <div
                      key={item.id}
                      className={`sv3-browser-item${selectedItem?.id === item.id ? " selected" : ""}`}
                      onClick={() => handleSelect(item)}
                    >
                      {item.thumbnailUrl && <img src={item.thumbnailUrl} alt={item.name} />}
                      <span className="sv3-browser-badge template">{getBadgeText(item)}</span>
                      {item.type === "VIDEO" && (
                        <div className="sv3-browser-play">
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="white" opacity={0.9}><polygon points="5 3 19 12 5 21" /></svg>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </>
        ) : displayItems.length === 0 ? (
          <div className="sv3-browser-empty">
            {browserTab === "my-content"
              ? "Your content will appear here.\nGenerate your first photo →"
              : browserSubFilter === "my-refs"
              ? "No references yet.\nUpload backgrounds, outfits, and poses."
              : "Templates coming soon.\nCheck back for trending content ideas."}
          </div>
        ) : (
          <div className="sv3-browser-grid">
            {displayItems.map((item) => (
              <div
                key={item.id}
                className={`sv3-browser-item${selectedItem?.id === item.id ? " selected" : ""}`}
                onClick={() => handleSelect(item)}
              >
                {item.thumbnailUrl && <img src={item.thumbnailUrl} alt={item.name} />}
                <span className={`sv3-browser-badge${item.kind === "template" ? " template" : ""}`}>
                  {getBadgeText(item)}
                </span>
                {(item.type === "VIDEO" || item.type === "TALKING_HEAD") && (
                  <div className="sv3-browser-play">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="white" opacity={0.9}><polygon points="5 3 19 12 5 21" /></svg>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <AddReferenceDialog open={addRefOpen} onOpenChange={setAddRefOpen} />
    </div>
  );
}
```

- [ ] **Step 2: Verify build**

```bash
pnpm build 2>&1 | tail -10
```

- [ ] **Step 3: Commit**

```bash
git add src/components/studio/content/content-browser.tsx
git commit -m "feat: content browser — my content, refs, templates, search, filters"
```

---

### Task 7: Studio Canvas Component

**Files:**
- Create: `src/components/studio/content/studio-canvas.tsx`
- Create: `src/components/studio/content/canvas-actions.tsx`

- [ ] **Step 1: Create canvas actions component**

Create `src/components/studio/content/canvas-actions.tsx`:

```tsx
"use client";

import { useCreatorStore } from "@/stores/creator-store";
import { useUnifiedStudioStore, type BrowserItem } from "@/stores/unified-studio-store";
import { useUIStore } from "@/stores/ui-store";
import { toggleStar } from "@/server/actions/reference-actions";
import { deleteContent } from "@/server/actions/content-actions";
import { deleteReference } from "@/server/actions/reference-actions";
import { useTemplate } from "@/server/actions/template-actions";
import { savePublicReference } from "@/server/actions/public-reference-actions";
import { useState } from "react";

export function CanvasActions({ item }: { item: BrowserItem }) {
  const creator = useCreatorStore((s) => s.getActiveCreator());
  const { prefillVideoFromPhoto, prefillFromTemplate, prefillMotionTransfer, selectItem, hideCanvas, setContentType, setSourceContentId } = useUnifiedStudioStore();
  const { removeReference, toggleStarInStore } = useCreatorStore();
  const [deleting, setDeleting] = useState(false);

  const creatorName = creator?.name ?? "your creator";

  // ─── Content actions ───
  if (item.kind === "content") {
    return (
      <div className="sv3-canvas-actions">
        {item.type === "IMAGE" && (
          <button className="sv3-canvas-action primary" onClick={() => prefillVideoFromPhoto(item.id)}>
            Make Video →
          </button>
        )}
        {item.type === "IMAGE" && (
          <button className="sv3-canvas-action" onClick={() => {
            setContentType("carousel");
            setSourceContentId(item.id);
          }}>
            Make Carousel →
          </button>
        )}
        {(item.type === "VIDEO" || item.type === "TALKING_HEAD") && item.mediaUrl && (
          <button className="sv3-canvas-action primary" onClick={() => prefillMotionTransfer(item.mediaUrl!)}>
            Use as Motion Source
          </button>
        )}
        <button className="sv3-canvas-action" onClick={() => {
          // Save as reference — trigger the dialog
          // This would need the AddReferenceDialog with prefillImageBase64
        }}>
          Save as Reference
        </button>
        {item.mediaUrl && (
          <a className="sv3-canvas-action" href={item.mediaUrl} download={`${creatorName}-${item.type.toLowerCase()}.jpg`} target="_blank" rel="noopener">
            Download
          </a>
        )}
        <button
          className="sv3-canvas-action danger"
          disabled={deleting}
          onClick={async () => {
            if (!confirm("Delete this content?")) return;
            setDeleting(true);
            await deleteContent(item.id);
            selectItem(null);
            setDeleting(false);
          }}
        >
          {deleting ? "Deleting..." : "Delete"}
        </button>
      </div>
    );
  }

  // ─── Reference actions ───
  if (item.kind === "reference") {
    return (
      <div className="sv3-canvas-actions">
        <button className="sv3-canvas-action primary" onClick={() => {
          // Attach as ref to creation panel
          const ref = useCreatorStore.getState().references.find((r) => r.id === item.id);
          if (ref) useUnifiedStudioStore.getState().attachRef(ref);
        }}>
          Use in Generation
        </button>
        <button className="sv3-canvas-action" onClick={async () => {
          await toggleStar(item.id);
          toggleStarInStore(item.id);
        }}>
          {item.starred ? "★ Unstar" : "☆ Star"}
        </button>
        <button
          className="sv3-canvas-action danger"
          disabled={deleting}
          onClick={async () => {
            if (!confirm("Delete this reference?")) return;
            setDeleting(true);
            await deleteReference(item.id);
            removeReference(item.id);
            selectItem(null);
            setDeleting(false);
          }}
        >
          {deleting ? "Deleting..." : "Delete"}
        </button>
      </div>
    );
  }

  // ─── Template actions ───
  if (item.kind === "template") {
    return (
      <div className="sv3-canvas-actions">
        <button className="sv3-canvas-action primary" onClick={async () => {
          const result = await useTemplate(item.id);
          if (result.success && result.config) {
            prefillFromTemplate(result.config);
          }
        }}>
          Generate with {creatorName} →
        </button>
        {item.type === "VIDEO" && item.sourceVideoUrl && (
          <button className="sv3-canvas-action" onClick={() => prefillMotionTransfer(item.sourceVideoUrl!)}>
            Motion Transfer →
          </button>
        )}
        <button className="sv3-canvas-action" onClick={async () => {
          // Save template media as personal reference
          // Would need to download + re-upload, or save the URL
        }}>
          Save as Reference
        </button>
      </div>
    );
  }

  return null;
}
```

- [ ] **Step 2: Create studio canvas component**

Create `src/components/studio/content/studio-canvas.tsx`:

```tsx
"use client";

import { useState } from "react";
import { useUnifiedStudioStore } from "@/stores/unified-studio-store";
import { CanvasActions } from "./canvas-actions";

export function StudioCanvas() {
  const { selectedItem, canvasVisible, hideCanvas, showResults, results, resultContentSet, contentType } = useUnifiedStudioStore();
  const [activeSlide, setActiveSlide] = useState(0);

  // Generation results mode
  if (showResults) {
    return (
      <div className="sv3-canvas">
        <button className="sv3-canvas-close" onClick={hideCanvas}>&times;</button>

        {/* Photo results */}
        {contentType === "photo" && results.length > 0 && (
          <div className="sv3-canvas-preview">
            <div style={{ display: "grid", gridTemplateColumns: results.length > 1 ? "1fr 1fr" : "1fr", gap: 8, width: "100%", maxWidth: 600 }}>
              {results.map((r) => (
                <img key={r.id} src={r.url} alt="Generated" style={{ width: "100%", borderRadius: 8 }} />
              ))}
            </div>
          </div>
        )}

        {/* Video / Talking head results */}
        {(contentType === "video" || contentType === "talking-head") && results.length > 0 && results[0].url && (
          <div className="sv3-canvas-preview">
            <video src={results[0].url} controls loop style={{ maxWidth: "100%", maxHeight: "100%", borderRadius: 8 }} />
          </div>
        )}

        {/* Carousel results */}
        {contentType === "carousel" && resultContentSet && (
          <div className="sv3-canvas-preview" style={{ flexDirection: "column" }}>
            {resultContentSet.slides[activeSlide]?.url && (
              <img src={resultContentSet.slides[activeSlide].url} alt={`Slide ${activeSlide + 1}`} style={{ maxWidth: "100%", maxHeight: "60%", objectFit: "contain", borderRadius: 8 }} />
            )}
            <div className="sv3-canvas-slides">
              {resultContentSet.slides.map((slide, i) => (
                <div
                  key={slide.id}
                  className={`sv3-canvas-slide${i === activeSlide ? " active" : ""}`}
                  onClick={() => setActiveSlide(i)}
                  style={slide.url ? { backgroundImage: `url(${slide.url})`, backgroundSize: "cover", backgroundPosition: "center" } : { background: "#F0F0F0" }}
                />
              ))}
            </div>
            <div className="sv3-canvas-slide-counter">{activeSlide + 1} / {resultContentSet.slides.length}</div>
            {resultContentSet.caption && (
              <div className="sv3-canvas-info">
                <div style={{ fontSize: 12, color: "#555" }}>{resultContentSet.caption}</div>
                {resultContentSet.hashtags.length > 0 && (
                  <div style={{ fontSize: 11, color: "#C4603A", marginTop: 4 }}>
                    {resultContentSet.hashtags.map((h) => `#${h}`).join(" ")}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Iteration actions — handled by creation-results.tsx, or inline here */}
        <div className="sv3-canvas-actions">
          <button className="sv3-canvas-action primary" onClick={() => {
            useUnifiedStudioStore.getState().setShowResults(false);
            hideCanvas();
          }}>
            Use
          </button>
          <button className="sv3-canvas-action" onClick={() => {
            useUnifiedStudioStore.getState().setShowResults(false);
            useUnifiedStudioStore.getState().setResults([]);
            useUnifiedStudioStore.getState().setResultContentSet(null);
          }}>
            Try Different
          </button>
        </div>
      </div>
    );
  }

  // Preview mode — showing a selected item
  if (!selectedItem) {
    return (
      <div className="sv3-canvas">
        <button className="sv3-canvas-close" onClick={hideCanvas}>&times;</button>
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "#BBB", fontSize: 13 }}>
          Select something to preview
        </div>
      </div>
    );
  }

  const isVideo = selectedItem.type === "VIDEO" || selectedItem.type === "TALKING_HEAD";
  const isCarousel = selectedItem.type === "CAROUSEL";

  return (
    <div className="sv3-canvas">
      <button className="sv3-canvas-close" onClick={hideCanvas}>&times;</button>

      <div className="sv3-canvas-preview">
        {isVideo && selectedItem.mediaUrl ? (
          <video src={selectedItem.mediaUrl} controls loop />
        ) : selectedItem.thumbnailUrl || selectedItem.mediaUrl ? (
          <img src={selectedItem.mediaUrl ?? selectedItem.thumbnailUrl} alt={selectedItem.name} />
        ) : (
          <div style={{ width: 200, height: 200, background: "#F0F0F0", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", color: "#BBB" }}>
            No preview
          </div>
        )}
      </div>

      <div className="sv3-canvas-info">
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 2 }}>{selectedItem.name}</div>
        {selectedItem.prompt && <div className="sv3-canvas-prompt">{selectedItem.prompt}</div>}
        {selectedItem.trend && (
          <div style={{ fontSize: 11, color: "#C4603A", marginBottom: 2 }}>
            {selectedItem.trend.replace(/-/g, " ")} · {selectedItem.category?.replace(/-/g, " ")}
          </div>
        )}
        <div className="sv3-canvas-date">
          {new Date(selectedItem.createdAt).toLocaleDateString()}
        </div>
        {selectedItem.tags && selectedItem.tags.length > 0 && (
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 6 }}>
            {selectedItem.tags.map((tag) => (
              <span key={tag} style={{ padding: "2px 8px", borderRadius: 10, background: "#F5F5F5", fontSize: 10, color: "#888" }}>{tag}</span>
            ))}
          </div>
        )}
      </div>

      <CanvasActions item={selectedItem} />
    </div>
  );
}
```

- [ ] **Step 3: Verify build**

```bash
pnpm build 2>&1 | tail -10
```

- [ ] **Step 4: Commit**

```bash
git add src/components/studio/content/studio-canvas.tsx src/components/studio/content/canvas-actions.tsx
git commit -m "feat: studio canvas with preview, actions, and generation results"
```

---

### Task 8: Creation Panel Updates

**Files:**
- Modify: `src/components/studio/content/creation-panel.tsx`
- Modify: `src/components/studio/content/creation-photo.tsx`
- Modify: `src/components/studio/content/creation-video.tsx`

- [ ] **Step 1: Read all three files first**

Read `creation-panel.tsx`, `creation-photo.tsx`, and `creation-video.tsx` to understand their current structure.

- [ ] **Step 2: Update creation-panel.tsx**

Key changes:
1. When generation completes, show results in the canvas (call `showCanvas()` and `setShowResults(true)`) instead of just `setShowResults(true)`.
2. Remove the "Quick picks" template section (templates are now in the browser).
3. After successful generation, call `showCanvas()`.

In the `handleGenerate` function, after each successful case that calls `setShowResults(true)`, also add:
```typescript
useUnifiedStudioStore.getState().showCanvas();
```

Remove the entire "Quick start template chips" section (the `sv2-tpl-section` div with `templatesOpen` state).

Remove the `templatesOpen` state and `setTemplatesOpen`.

Remove the `templates` import from `@/data/templates` and `SCRIPT_STARTERS` const if no longer used (keep SCRIPT_STARTERS if we want talking head hint chips — per spec section 28, talking head script starters can stay).

- [ ] **Step 3: Update creation-photo.tsx — wire aspect ratio**

In `creation-photo.tsx`:
1. Remove the local `aspectRatio` state
2. Read/write aspect ratio from the unified store (add `aspectRatio` to the store if not already there — it should be added to INITIAL state as `"portrait"`)
3. Ensure the aspect ratio value is accessible from `creation-panel.tsx` so it can be passed to `generateContent()`

In `unified-studio-store.ts`, add:
- State: `aspectRatio: "portrait" | "square" | "landscape"` (default: "portrait")
- Action: `setAspectRatio: (ratio) => void`
- Add to INITIAL and reset

In `creation-photo.tsx`, use store state instead of local state.

In `creation-panel.tsx`, pass `aspectRatio` through to `generateContent()` — note that `generateContent()` currently doesn't accept aspect ratio. For now, append it to the prompt: if portrait → add "vertical/portrait composition", if landscape → add "horizontal/landscape composition", if square → add "square composition". This is a prompt-level control since Gemini doesn't have a native aspect ratio param.

- [ ] **Step 4: Update creation-video.tsx — accept pre-loaded source**

In `creation-video.tsx`, when `videoSource === "photo"` and `sourceContentId` is already set (pre-loaded from canvas), show the selected photo's thumbnail instead of the "pick a photo" grid. The user can still change it.

Read `sourceContentId` from the store. If it's set, show a small preview thumbnail with an "× Change" button.

- [ ] **Step 5: Verify build**

```bash
pnpm build 2>&1 | tail -10
```

- [ ] **Step 6: Commit**

```bash
git add src/components/studio/content/creation-panel.tsx src/components/studio/content/creation-photo.tsx src/components/studio/content/creation-video.tsx src/stores/unified-studio-store.ts
git commit -m "feat: creation panel — canvas integration, aspect ratio wired, video prefill"
```

---

### Task 9: Dashboard ↔ Studio Integration

**Files:**
- Modify: `src/components/workspace/workspace-canvas.tsx` (the dashboard)
- Check: `src/components/workspace/content-detail.tsx` if it exists

- [ ] **Step 1: Read workspace-canvas.tsx and content-detail.tsx**

Read both files to understand the current content detail modal.

- [ ] **Step 2: Add "Open in Studio" button to content detail**

In the content detail modal/component, add a button:

```tsx
<button
  className="sv3-canvas-action"
  onClick={() => {
    // Close detail modal
    onOpenChange(false);
    // Pre-select item in studio
    useUnifiedStudioStore.getState().selectItem({
      id: item.id,
      kind: "content",
      type: item.type,
      name: item.userInput ?? item.prompt ?? item.type,
      thumbnailUrl: item.url,
      mediaUrl: item.url,
      prompt: item.prompt,
      createdAt: item.createdAt,
    });
    // Open studio
    useUIStore.getState().setContentStudioOpen(true);
  }}
>
  Open in Studio
</button>
```

- [ ] **Step 3: Update dashboard "Open studio" to carry context**

In `workspace-canvas.tsx`, the "Open studio →" link on the floating input bar should carry the prompt and content type:

```tsx
onClick={() => {
  const prompt = /* get current prompt value */;
  const mode = /* get current contentMode */;
  if (prompt?.trim()) {
    useUnifiedStudioStore.getState().setPrompt(prompt);
  }
  if (mode) {
    useUnifiedStudioStore.getState().setContentType(mode === "video" ? "video" : "photo");
  }
  useUIStore.getState().setContentStudioOpen(true);
}}
```

- [ ] **Step 4: Verify build**

```bash
pnpm build 2>&1 | tail -10
```

- [ ] **Step 5: Commit**

```bash
git add src/components/workspace/workspace-canvas.tsx src/components/workspace/content-detail.tsx
git commit -m "feat: dashboard ↔ studio integration — open in studio, carry context"
```

---

### Task 10: Cleanup — Remove V2 Files

**Files:**
- Delete: `src/components/studio/content/content-studio-v2.tsx`
- Delete: `src/components/studio/content/content-studio-v2.css`
- Delete: `src/components/studio/content/library-panel.tsx`

- [ ] **Step 1: Verify V3 is wired in**

Check that `workspace-shell.tsx` imports `ContentStudioV3`, not `ContentStudioV2`. Check that no other files import the V2 components.

```bash
grep -r "content-studio-v2\|ContentStudioV2\|library-panel" src/ --include="*.tsx" --include="*.ts" | grep -v node_modules
```

If any files still reference V2/library-panel, update them first.

- [ ] **Step 2: Delete old files**

```bash
rm src/components/studio/content/content-studio-v2.tsx
rm src/components/studio/content/content-studio-v2.css
rm src/components/studio/content/library-panel.tsx
```

- [ ] **Step 3: Remove CSS import from workspace-shell if present**

In `workspace-shell.tsx`, remove any import of `content-studio-v2.css` if it's imported there instead of in the component.

- [ ] **Step 4: Verify build**

```bash
pnpm build 2>&1 | tail -10
```

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore: remove V2 studio files — replaced by V3"
```

---

## Self-Review

**Spec coverage:**
- ✅ Section 1 (Layout): Task 5 (root component with resizable panels)
- ✅ Section 2 (Content Browser): Task 6
- ✅ Section 3 (Canvas): Task 7
- ✅ Section 4 (Creation Panel): Task 8
- ✅ Section 5 (Templates): Tasks 1 + 2 (schema + actions)
- ✅ Section 6 (Photo → Video): Task 7 (canvas actions) + Task 8 (video prefill)
- ✅ Section 7 (Integration): Task 9
- ✅ Section 8 (State): Task 3
- ✅ Section 9 (CSS): Task 4
- ✅ Section 10 (Files): Tasks 1-10 cover all files
- ✅ Section 11 (Refs in studio): Task 6 (browser) + Task 7 (canvas actions)
- ✅ Section 12 (Settings persistence): Task 5 (autoSaveId on ResizablePanelGroup)
- ✅ Section 13 (Carousel template): Task 3 (prefillFromTemplate)
- ✅ Section 14 (Download): Task 7 (canvas actions download link)
- ✅ Section 15 (Dashboard ↔ Studio): Task 9
- ✅ Section 16 (Admin templates): Task 1 schema — admin panel UI is separate
- ✅ Section 17 (Badges): Task 6 (getBadgeText function)
- ✅ Section 18 (Sync): Task 6 uses same Zustand store for refs
- ✅ Section 19 (Empty states): Task 6 (browser empty states)
- ✅ Section 20 (Concurrent gen): Task 8 (generation state)
- ✅ Section 21 (Playback): Task 7 (video/carousel in canvas)
- ✅ Section 22 (Progress): Task 8 (creation panel updates)
- ✅ Section 23 (Loading): Task 6 (skeleton loading)
- ✅ Section 24 (Drag and drop): Not implemented in plan — deferred (minimal impact, upload button works)
- ✅ Section 25 (Open with context): Task 9
- ✅ Section 26 (Closing): Task 5 (handleClose)
- ✅ Section 27 (Aspect ratio): Task 8
- ✅ Section 28 (Quick picks removal): Task 8
- ✅ Section 29 (Delete confirmation): Task 7 (canvas actions)
- ✅ Section 30 (Mobile): Task 5 (mobile layout with tabs)
- ✅ Section 31 (Content type priority + creator identity): Task 5 (creator check) + Task 6 (template sorting)

**Placeholder scan:** All code blocks provided. No TBDs.

**Type consistency:** `BrowserItem` defined in Task 3 store, used in Tasks 6, 7. `GenerationConfig` defined in Task 2 types, used in Task 3 store prefill. `ContentTemplateItem` defined in Task 2, used in Task 6 browser.
