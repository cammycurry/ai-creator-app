# Content Studio V3 — Unified Content Workspace

## Goal

Rebuild the Content Studio as a unified content workspace where users can browse all their content + viral templates, preview and act on anything (make video, use as reference, iterate, download), and generate new content — all in one integrated experience. This is the core product experience that everything else feeds into.

## Architecture

Three-panel workspace: Content Browser (left) → Canvas (center) → Creation Panel (right). Everything is content — your photos, your videos, your refs, public templates. You browse it, you act on it, you create from it. The generation engine (photo, video, carousel, talking head, motion transfer) is the same underneath. Templates are just public content with generation config attached. The whole thing is designed so an AI agent can drive it later.

---

## 1. Layout: Three-Panel Workspace

```
┌──────────────────────────────────────────────────────────────────┐
│  ×  Content Studio    [maria]                      867 credits   │
├──────────────┬──────────────────────────┬────────────────────────┤
│              │                          │                        │
│  CONTENT     │       CANVAS             │   CREATION             │
│  BROWSER     │                          │   PANEL                │
│              │   Large preview of       │                        │
│  [All]       │   selected item or       │   [Photo] [Video]      │
│  [Photos]    │   generation results     │   [Carousel] [Voice]   │
│  [Videos]    │                          │                        │
│  [Refs]      │                          │   What should maria    │
│  [Templates] │   ┌──────────────────┐   │   do?                  │
│              │   │                  │   │   ___________________   │
│  ┌───┐┌───┐  │   │                  │   │                        │
│  │   ││   │  │   │   (preview)      │   │   Attached refs: [x]   │
│  └───┘└───┘  │   │                  │   │                        │
│  ┌───┐┌───┐  │   │                  │   │   Config options...     │
│  │   ││   │  │   └──────────────────┘   │                        │
│  └───┘└───┘  │                          │   ─────────────────     │
│  ┌───┐┌───┐  │   [Make Video]           │   2 credits             │
│  │   ││   │  │   [Use as Ref]           │   [Generate 2 Photos →] │
│  └───┘└───┘  │   [Try Different]        │                        │
│              │   [Download]             │                        │
├──────────────┴──────────────────────────┴────────────────────────┤
```

### Panel Sizing
- **Content Browser:** 240px fixed width, scrollable
- **Canvas:** flex: 1, fills remaining space
- **Creation Panel:** 320px fixed width, scrollable
- On tablet (≤1024px): Content Browser collapses to icon strip, expands on click
- On mobile (≤768px): Full-screen tabs (Browse / Create), canvas is inline

---

## 2. Content Browser (Left Panel)

The Content Browser replaces the old Library Panel. It shows EVERYTHING the user can work with.

### Tabs
```
[All] [Photos] [Videos] [Carousels] [Refs] [Templates]
```

- **All:** Everything — your content + refs + templates mixed, sorted by recency
- **Photos:** Your generated photos (type=IMAGE, no contentSetId)
- **Videos:** Your generated videos + talking heads (type=VIDEO or TALKING_HEAD)
- **Carousels:** Your carousel sets
- **Refs:** Your personal references (from Library) — backgrounds, outfits, poses
- **Templates:** Public viral content templates (admin-published)

### Grid
- 2-column visual grid with square thumbnails
- Type badge on each item (PHOTO, VIDEO, CAROUSEL, REF, TEMPLATE)
- Videos show play icon overlay
- Carousels show slide count badge
- Templates show a star/trending badge
- Click any item → loads into Canvas

### Search
- Search bar at top of browser
- Searches across name, prompt, tags, description
- Works across all tabs

### Data Sources
- **Your content:** `getCreatorContent(creatorId)` — already exists
- **Your refs:** `getReferences()` — already exists (account-level)
- **Templates:** `getContentTemplates(category?, type?)` — new action

### Scroll + Pagination
- Infinite scroll or "Load more" button
- Default: 20 items per load
- Most recent first

---

## 3. Canvas (Center Panel)

The canvas is the workspace center. It shows whatever is selected — a preview, generation results, or an empty state prompting creation.

### Empty State
When nothing is selected and no results:
```
Select content from the browser
or start creating →
```

### Content Preview
When an item is selected from the browser:

**Photo:**
- Full-size image preview
- Below: prompt used, date created
- Action buttons (see Actions section)

**Video:**
- Video player with play/pause/mute
- Below: prompt, duration, date
- Action buttons

**Carousel:**
- Horizontal slide strip (scrollable)
- Click slide for full-size
- Below: caption, hashtags, date
- Action buttons

**Reference:**
- Full-size image
- Below: name, description, tags, usage count
- Action buttons (different set — see below)

**Template:**
- Full-size preview (image or video player)
- Below: name, description, trend, category
- Action buttons (template-specific — see below)

### Generation Results
When generation completes, results appear in the canvas:

**Photo results:** Grid of generated images (1-4)
**Video result:** Video player
**Carousel result:** Slide strip + caption
**Talking head result:** Video player

Below results: iteration actions (Use, Try Different, Save as Reference)

### Actions by Content Type

**On your photo:**
- **Make Video →** pre-loads photo as video source in Creation Panel, switches to Video type
- **Make Carousel →** opens carousel mode with photo as slide 1
- **Use as Reference** saves to your reference library
- **Try Different** loads prompt + settings into Creation Panel for re-generation
- **Download** downloads the image
- **Delete** removes from your content

**On your video:**
- **Use as Motion Source** loads video into Creation Panel for motion transfer
- **Download** downloads the video
- **Delete**

**On your carousel:**
- **Regenerate Slide** pick a slide to redo
- **Download All** downloads all slides
- **Delete**

**On a reference:**
- **Use in Generation** attaches to Creation Panel as a ref
- **Edit** opens edit modal (name, tags, type)
- **Delete**

**On a template:**
- **Generate with [creator name] →** (PRIMARY — big button) pre-fills Creation Panel with template's generation config, creator auto-selected
- **Motion Transfer →** (for video templates) pre-loads source video, switches to video mode
- **Save as Reference** saves the template media to personal refs
- **Use Background** saves as BACKGROUND reference
- **Use Pose/Outfit** saves as REFERENCE with appropriate tag

---

## 4. Creation Panel (Right Panel)

Cleaned-up version of the current creation form. Same content types, same generation engine, better UX.

### Content Type Pills
```
[Photo] [Video] [Carousel] [Voice]
```

### Prompt Input
- Adaptive label: "What should [name] do?" / "What's the carousel about?" / "What happens in the video?" / "What should [name] say?"
- Textarea, 3-4 rows
- Below: attached refs shown as removable thumbnails (InlineRefs)

### Type-Specific Config

**Photo:**
- Image count: 1-4 (stepper)
- Aspect ratio: Portrait / Square / Landscape (actually wired to generation)

**Video:**
- Source: Text / From Photo / Motion Transfer
  - From Photo: shows selected photo from Canvas (or browse to pick)
  - Motion Transfer: shows selected video from Canvas (or upload)
- Duration: 5s / 10s
- Aspect ratio: 9:16 / 1:1 / 16:9

**Carousel:**
- Format picker chips
- Slide count ±
- Per-slide editor (scene, description, refs)
- Global instructions

**Talking Head:**
- Voice picker (gender-filtered grid with preview)
- Duration: 15s / 30s
- Background setting input

### Pre-fill from Canvas
When user clicks an action in the Canvas (e.g., "Make Video" on a photo), the Creation Panel:
1. Switches to the appropriate content type
2. Pre-fills source content (photo as video source)
3. Prompt may carry over or be empty
4. User can adjust anything before generating

### Pre-fill from Template
When user clicks "Generate with [creator]" on a template:
1. Content type set from template
2. Prompt pre-filled from template's generationConfig
3. References attached from template config
4. Source video loaded (for motion transfer templates)
5. User can tweak or just hit Generate

### Footer
```
[2 credits]                    [Generate 2 Photos →]
```
- Credit cost updates live based on config
- Button text reflects type + count
- Disabled until required fields filled
- Progress indicator during generation

### Generation Progress
- **Photos/Carousel:** "Generating... (this takes ~15 seconds)" with subtle animation
- **Video/Talking Head:** "Generating video... (1-2 minutes)" with progress stages if available
- Cancel button for long-running jobs

---

## 5. Content Templates (Viral Content)

### Data Model

```prisma
model ContentTemplate {
  id              String   @id @default(cuid())
  type            String   // "IMAGE" | "VIDEO" | "CAROUSEL"
  name            String
  description     String   @default("")

  // Media
  mediaUrl        String   // S3 key — the example output (image or video)
  thumbnailUrl    String?  // S3 key — for grid display (auto-generated for videos)
  sourceVideoUrl  String?  // S3 key — original video for motion transfer

  // Organization
  category        String   // gym-fitness, city-lifestyle, fashion-beauty, travel, general
  trend           String   // mirror-selfie, grwm, city-walk, outfit-check, product-review, etc.
  tags            String[]

  // Generation config — everything needed to recreate with a different creator
  generationConfig Json    // { prompt, aspectRatio, imageCount, videoSource, videoDuration, ... }

  // Admin
  isActive        Boolean  @default(true)
  popularity      Int      @default(0)  // incremented on use
  createdBy       String?  // admin user ID

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@index([category])
  @@index([trend])
  @@index([type])
  @@index([isActive, popularity])
}
```

### generationConfig Shape

```typescript
type GenerationConfig = {
  contentType: "photo" | "video" | "carousel" | "talking-head";
  prompt: string;

  // Photo
  imageCount?: number;
  aspectRatio?: string;

  // Video
  videoSource?: "text" | "photo" | "motion";
  videoDuration?: 5 | 10;
  videoAspectRatio?: string;

  // Carousel
  formatId?: string;
  slideCount?: number;
  carouselInstructions?: string;

  // Talking Head
  voiceId?: string;
  talkingDuration?: 15 | 30;
  talkingSetting?: string;

  // References (S3 keys to attach)
  referenceKeys?: string[];
};
```

### Server Actions

```typescript
// New: src/server/actions/template-actions.ts

getContentTemplates(
  category?: string,
  type?: string,       // IMAGE, VIDEO, CAROUSEL
  trend?: string,
  search?: string,
  limit?: number,
  offset?: number
): Promise<ContentTemplateItem[]>

getTemplateTrends(): Promise<{ trend: string; count: number; category: string }[]>

useTemplate(templateId: string): Promise<{ success: boolean; config: GenerationConfig }>
// Increments popularity, returns config for pre-filling Creation Panel
```

### Browse Experience in Content Browser

Templates tab shows:
```
[All] [Photos] [Videos]

Gym & Fitness
┌───┐┌───┐┌───┐┌───┐
│   ││   ││   ││   │
└───┘└───┘└───┘└───┘

City & Lifestyle
┌───┐┌───┐┌───┐┌───┐
│   ││   ││   ││   │
└───┘└───┘└───┘└───┘
```

- Grouped by trend/category
- Content type filter (All/Photos/Videos) narrows within each group
- Each card: thumbnail + type badge + name
- Click → loads into Canvas with template actions

### Admin Template Creation (Phase 1)

Manual process:
1. Generate content using the app with demo creators
2. Upload via admin panel or seed script
3. Fill in: name, description, category, trend, tags, generationConfig
4. For video templates: upload source video separately

Future (Phase 2): IG scraping → auto-analysis → batch generation pipeline.

---

## 6. Photo → Video Flow (Core Workflow)

This is the #1 workflow for AI influencer creators. The studio must make it effortless.

### Flow
1. User has photos of their creator (from previous generations or wizard)
2. Opens Content Studio → Content Browser shows their photos
3. Clicks a photo → Canvas shows it large
4. Canvas action: **"Make Video →"**
5. Creation Panel switches to Video mode:
   - Source: "From Photo" auto-selected
   - Selected photo shown as source thumbnail
   - Prompt field: "Describe the motion..."
   - Duration: 5s / 10s
6. User types motion prompt → Generate
7. Video result appears in Canvas
8. Download or iterate

### Alternative: Motion Transfer
1. User finds a viral video (in Templates or uploads one)
2. Clicks video → Canvas shows it
3. Canvas action: **"Motion Transfer →"**
4. Creation Panel switches to Video mode:
   - Source: "Motion Transfer" auto-selected
   - Source video shown
   - Creator's face will be mapped onto the motion
6. Generate → result in Canvas

---

## 7. Integration Points

### With Dashboard
- Dashboard input bar still works for quick generation
- "Open studio →" link opens this full workspace
- Generated content appears in both dashboard grid and studio Content Browser

### With Library Page
- Library page manages refs (upload, star, organize)
- Studio Content Browser shows refs from the same data source
- "Use as Reference" in Canvas saves to Library
- Templates appear in both Library (Templates tab) and Studio (Templates tab in browser)

### With Generation Engine
All generation still goes through existing server actions:
- `generateContent()` for photos
- `generateCarousel()` for carousels
- `generateVideoFromText()`, `generateVideoFromImage()`, `generateVideoMotionTransfer()` for video
- `generateTalkingHead()` for talking heads

No new generation functions needed. The studio just pre-fills the inputs.

### With Future AI Agent
The Creation Panel's inputs are structured:
```
{ contentType, prompt, refs[], config{} }
```
An AI agent would populate these same fields programmatically. The Canvas would show the agent's proposed generation, user approves, agent calls the generation function. Same UI, different input method.

---

## 8. State Management

### New/Modified Store: `unified-studio-store.ts`

Add to existing store:

```typescript
// Content Browser state
browserTab: "all" | "photos" | "videos" | "carousels" | "refs" | "templates";
browserSearch: string;
browserItems: BrowserItem[]; // loaded from server
browserLoading: boolean;

// Canvas state
selectedItem: BrowserItem | null;
canvasMode: "preview" | "results" | "empty";

// Actions
setBrowserTab: (tab) => void;
setBrowserSearch: (search) => void;
setBrowserItems: (items) => void;
selectItem: (item) => void;
clearCanvas: () => void;
prefillFromTemplate: (config: GenerationConfig) => void;
prefillVideoFromPhoto: (photoUrl: string, contentId: string) => void;
```

### BrowserItem Type

```typescript
type BrowserItem = {
  id: string;
  kind: "content" | "reference" | "template";
  type: string; // IMAGE, VIDEO, CAROUSEL, BACKGROUND, REFERENCE, etc.
  name: string;
  thumbnailUrl?: string;
  mediaUrl?: string;
  prompt?: string;
  createdAt: string;
  // Template-specific
  trend?: string;
  category?: string;
  generationConfig?: GenerationConfig;
  sourceVideoUrl?: string;
  // Reference-specific
  tags?: string[];
  starred?: boolean;
};
```

---

## 9. CSS

New file: `src/components/studio/content/content-studio-v3.css` with `sv3-` prefix.

Key classes:
- `.sv3-overlay` — fullscreen modal
- `.sv3-head` — header bar
- `.sv3-body` — three-panel flex container
- `.sv3-browser` — left panel (240px)
- `.sv3-browser-tabs` — tab row
- `.sv3-browser-search` — search input
- `.sv3-browser-grid` — 2-col thumbnail grid
- `.sv3-browser-item` — clickable thumbnail with badge
- `.sv3-browser-group` — trend/category group header (Templates tab)
- `.sv3-canvas` — center panel (flex: 1)
- `.sv3-canvas-empty` — empty state
- `.sv3-canvas-preview` — content preview area
- `.sv3-canvas-actions` — action button row
- `.sv3-canvas-action` — individual action button
- `.sv3-canvas-action.primary` — primary action (terracotta)
- `.sv3-panel` — right panel (320px)
- `.sv3-pills` — content type pills
- `.sv3-prompt` — prompt card
- `.sv3-config` — config section
- `.sv3-footer` — generate button + cost

Responsive:
- ≤1024px: Browser collapses to 48px icon strip
- ≤768px: Stacked layout, tabs to switch panels

---

## 10. Files to Create/Modify

```
CREATE: prisma/migrations/XXXXX_content_templates/    — ContentTemplate model
CREATE: src/server/actions/template-actions.ts         — getContentTemplates, getTemplateTrends, useTemplate
CREATE: src/components/studio/content/content-studio-v3.tsx    — New root component
CREATE: src/components/studio/content/content-studio-v3.css    — New styles
CREATE: src/components/studio/content/content-browser.tsx      — Left panel
CREATE: src/components/studio/content/studio-canvas.tsx        — Center panel
CREATE: src/components/studio/content/canvas-actions.tsx       — Action buttons per content type
MODIFY: src/components/studio/content/creation-panel.tsx       — Add prefill support, fix aspect ratio
MODIFY: src/components/studio/content/creation-video.tsx       — Accept pre-loaded photo/video source
MODIFY: src/stores/unified-studio-store.ts                     — Add browser/canvas state
MODIFY: src/components/workspace/workspace-shell.tsx           — Swap V2 → V3
MODIFY: prisma/schema.prisma                                   — Add ContentTemplate model
DELETE: src/components/studio/content/content-studio-v2.tsx    — Replaced by V3
DELETE: src/components/studio/content/content-studio-v2.css    — Replaced by V3
DELETE: src/components/studio/content/library-panel.tsx        — Replaced by content-browser
```

---

## Out of Scope

- AI agent layer (Layer 2) — designed for, not built
- Instagram scraping / auto-template creation pipeline
- User-published templates (admin-only for now)
- Mobile-first responsive (basic responsive yes, mobile-optimized no)
- Content scheduling / auto-posting
