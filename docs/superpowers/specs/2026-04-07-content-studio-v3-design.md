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

### Panel Sizing (Resizable)

Built with **shadcn/ui Resizable** component (`react-resizable-panels`). Users can drag panel borders to resize.

- **Content Browser:** default 240px, min 180px, max 400px, collapsible to 0
- **Canvas:** flex: 1, fills remaining space
- **Creation Panel:** default 320px, min 280px, max 480px, collapsible to 0
- Drag handles between panels (subtle 4px hit area, visible on hover)
- Double-click handle to reset to default size
- Panel sizes persist in localStorage
- On tablet (≤1024px): Content Browser starts collapsed, click to expand
- On mobile (≤768px): Full-screen tabs (Browse / Create / View) — no resize

### Two-Panel Default / Three-Panel on Preview

The canvas is **hidden by default**. Studio opens as a two-panel layout (Browser + Creation Panel), giving the creation form maximum space.

**Two-panel (default):**
```
┌──────────────┬──────────────────────────────────┐
│  BROWSER     │        CREATION PANEL            │
│              │        (full width)              │
└──────────────┴──────────────────────────────────┘
```

**Three-panel (when previewing):**
```
┌──────────────┬──────────────────┬───────────────┐
│  BROWSER     │     CANVAS       │  CREATION     │
│              │                  │  PANEL        │
└──────────────┴──────────────────┴───────────────┘
```

**Canvas appears when:**
- User clicks an item in the Content Browser
- Generation completes (results display in canvas)

**Canvas hides when:**
- User clicks × on the canvas
- User clicks "Use" on results (content saved, canvas dismissed)
- User starts a new generation (canvas clears, reappears with results)

This means first-time users see Browser + Creation Panel — no confusing empty space. The canvas reveals itself naturally as they interact.

---

## 2. Content Browser (Left Panel)

The Content Browser replaces the old Library Panel. It shows EVERYTHING the user can work with.

### Tabs
```
[My Content] [Refs & Templates]
```

Two tabs, not six. Keep it simple.

- **My Content:** Your generated photos, videos, carousels, talking heads. Filterable by type within the tab.
  - Sub-filters (horizontal chips): All | Photos | Videos | Carousels
- **Refs & Templates:** Your personal references + public templates combined. This is your "inspiration + assets" panel.
  - Sub-filters: All | My Refs | Templates
  - Templates section shows trend groupings (Gym & Fitness, City & Lifestyle, etc.)
  - Refs show as a flat grid, same as current Library

This means clicking "Refs & Templates" shows both your uploaded assets AND the viral template library together — they're all starting points for generation.

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

## 11. Detail: How References Work in the Studio

References show up in the Content Browser under the "Refs" tab. Using them:

**Attaching a ref to generation:**
- Click a ref in the browser → Canvas shows preview with action: **"Use in Generation"**
- Clicking "Use in Generation" attaches it to the Creation Panel (shows as inline ref thumbnail below prompt)
- Multiple refs can be attached — backgrounds, outfits, poses stack
- Refs can also be attached by clicking directly in the browser (toggle, like current behavior) without going through canvas

**Template refs:**
- A template's `generationConfig.referenceKeys` contains S3 keys of refs baked into the template
- When user clicks "Generate with [creator]" on a template, these refs are auto-attached to the Creation Panel
- User can see them in the inline refs area and remove any they don't want

**Saving content as ref:**
- Canvas action "Save as Reference" on any photo → opens the existing AddReferenceDialog
- AI auto-analyzes the image and suggests type/tags
- Saved ref immediately appears in the Browser's Refs tab

---

## 12. Detail: Settings Persistence

Studio settings persist within a session (while the studio is open) and optionally across sessions.

**Within session (automatic):**
- Content type selection persists (if you're in Video mode, it stays in Video mode)
- Aspect ratio, duration, image count persist between generations
- Attached refs persist until explicitly detached
- Prompt clears after successful generation (fresh start) but settings stay

**Across sessions (planned):**
- Store last-used settings per content type in localStorage
- When studio opens, restore: last content type, aspect ratio, duration, image count
- Refs and prompt do NOT persist across sessions (they're context-specific)

---

## 13. Detail: Carousel Template Pre-fill

When a user clicks "Generate with [creator]" on a carousel template:

1. Creation Panel switches to Carousel type
2. `generationConfig.formatId` → format auto-selected (slides generated from format template)
3. `generationConfig.slideCount` → slide count set
4. `generationConfig.carouselInstructions` → global instructions pre-filled
5. Any `referenceKeys` → attached as refs
6. User sees the pre-configured carousel and can tweak individual slides, add/remove slides, change instructions
7. Generate → carousel result appears in Canvas as slide strip

---

## 14. Detail: Download + Metadata Stripping

When user clicks "Download" on any content in the Canvas:

**Photos:**
- Server generates a clean download: strips C2PA/SynthID AI metadata, injects iPhone EXIF (already built via `stripAndRewrite` in `src/lib/ai/metadata-strip.ts`)
- Downloads as `.jpg` with clean metadata
- Filename: `[creator-name]-[type]-[timestamp].jpg`

**Videos:**
- Direct S3 download (video metadata stripping is less critical — no standard AI watermark for Kling output)
- Downloads as `.mp4`
- Filename: `[creator-name]-video-[timestamp].mp4`

**Carousels:**
- "Download All" downloads a zip of all slides (each stripped)
- Individual slide download also available from carousel view

---

## 15. Detail: Dashboard ↔ Studio Relationship

**Content generated from dashboard input bar:**
- Results appear in the dashboard content grid (current behavior)
- Also visible in studio Content Browser next time it's opened (same data source — `getCreatorContent`)

**Content generated from studio:**
- Results appear in Canvas
- Also visible in dashboard content grid when studio closes (dashboard re-fetches content)

**Clicking content on dashboard:**
- Currently opens ContentDetail modal (photo) or CarouselDetail modal (carousel)
- These stay as-is for quick viewing
- Add a button in the detail modal: **"Open in Studio"** → opens studio with that item selected in Canvas

**"Open studio →" on dashboard input bar:**
- Opens studio
- If user typed a prompt, carry it to the Creation Panel prompt field
- If a content type was selected (Photo/Video/Carousel/Voice), carry that too

---

## 16. Detail: Admin Template Publishing

For Phase 1, admin creates templates through a workflow:

1. **Generate content** using the app with demo creators (Mia, Sora, Chloe, etc.)
2. **Identify good outputs** — photos/videos that look genuinely postable
3. **Create template record** via:
   - Admin panel form (new admin page `/admin/templates`)
   - OR seed script that reads from a JSON file
4. **Fill in:**
   - Name: "Gym mirror selfie"
   - Description: "Confident mirror selfie at the gym, sports bra, good lighting"
   - Category: "gym-fitness"
   - Trend: "mirror-selfie"
   - Tags: ["gym", "fitness", "selfie", "mirror"]
   - Type: IMAGE or VIDEO
   - Media: upload the example output (S3 key)
   - Source video: for video templates, upload the source video for motion transfer
   - Generation config: the prompt + settings used to generate it
5. **Publish** — set `isActive: true`

For video templates specifically:
- The `sourceVideoUrl` is the video that users will motion-transfer with their creator
- The `mediaUrl` is the example output showing what the result looks like
- Both are needed — one is the input, one is the preview

---

## 17. Detail: Content Type Badges

Consistent badge system across browser and canvas:

| Content Type | Badge Text | Badge Color |
|---|---|---|
| Photo (IMAGE) | PHOTO | default (dark bg, white text) |
| Video (VIDEO) | VIDEO | default |
| Talking Head (TALKING_HEAD) | VOICE | default, with 🎤 icon |
| Carousel (ContentSet) | CAROUSEL | default, with slide count sub-badge |
| Reference (BACKGROUND) | BG | subtle (lighter) |
| Reference (REFERENCE) | REF | subtle |
| Template (IMAGE) | TEMPLATE · PHOTO | terracotta accent |
| Template (VIDEO) | TEMPLATE · VIDEO | terracotta accent |

Templates get the terracotta accent to stand out as "not your content — available to use."

---

## 18. Detail: Library Page ↔ Studio Browser Sync

Both surfaces read from the same server data:
- **Refs:** both call `getReferences()` → same Zustand store (`creatorStore.references`)
- **Templates:** both call `getContentTemplates()` → no shared store, each fetches independently

When user takes an action in one surface:
- **Star a ref in Library** → `toggleStarInStore` updates Zustand → studio Browser shows updated star on next render (same store)
- **Upload ref in Library** → `addReference` updates Zustand → Browser shows new ref immediately
- **Save public ref in Studio** → `addReference` updates Zustand → Library shows it too
- **Delete ref in Library** → `removeReference` updates Zustand → Browser removes it

Templates don't need sync — they're read-only for users (admin publishes, users browse).

---

## 19. Detail: Empty States

**Content Browser — no content yet:**
```
Your content will appear here.
Generate your first photo →
```
"Generate your first photo →" focuses the Creation Panel prompt field.

**Content Browser — Refs tab empty:**
```
No references yet.
Upload backgrounds, outfits, and poses.
[+ Upload]
```
Upload button opens AddReferenceDialog.

**Content Browser — Templates tab empty (no templates seeded):**
```
Templates coming soon.
Check back for trending content ideas.
```

**Canvas — empty (default):**
No separate empty state needed — canvas is hidden by default (two-panel mode). The creation panel fills the space.

**Canvas — generation error:**
Error displays in the Creation Panel footer area (above the Generate button), not in the canvas. Canvas stays in whatever state it was (empty or showing last preview). Error message has a dismiss × button.

---

## 20. Detail: Concurrent Generation

**Rule: one generation at a time.**

- While generating, the Generate button shows progress and is disabled
- User CAN browse the Content Browser while generation is running (non-blocking UI)
- User CAN click items in the browser to preview in Canvas (if canvas is showing results, new selection replaces them)
- User CANNOT start a second generation until the current one completes or fails
- For async jobs (video, talking head): the "generating" state persists across the poll cycle. User sees "Generating video... (~1 min)" in the footer.
- If user closes the studio while a video/talking head is generating: the async job continues server-side. Next time they open the studio or dashboard, the completed video appears in their content.

---

## 21. Detail: Video + Carousel Playback in Canvas

**Video preview:**
- Autoplay: no (user clicks play)
- Muted: no (plays with audio — important for talking heads)
- Loop: yes (loops after playing)
- Controls: play/pause, mute/unmute, progress bar. Native HTML5 video controls.

**Carousel preview:**
- Shows first slide as main preview
- Horizontal thumbnail strip below main image
- Click thumbnail → shows that slide full-size
- Left/right arrow buttons on main preview
- Slide counter: "3 / 6"
- Caption + hashtags shown below thumbnail strip

---

## 22. Detail: Generation Progress UI

**Photos (15-30 seconds):**
- Generate button text: "Generating..." with spinner
- Skeleton cards appear in Canvas (same count as imageCount)
- No cancel — fast enough to wait

**Carousel (30-60 seconds):**
- Generate button text: "Generating [N] slides..."
- Skeleton slide strip in Canvas
- No cancel

**Video (1-2 minutes):**
- Generate button text: "Generating video... (~1 min)"
- Canvas shows: large spinner + "Your video is being created" message
- Cancel button available (calls a cancel endpoint if possible, or just hides progress and lets async job complete silently)

**Talking Head (2-3 minutes):**
- Generate button text: "Generating... (~2 min)"
- Canvas shows: progress stages if available ("Generating voice...", "Creating image...", "Syncing lips...")
- Cancel button available (same as video)

---

## 23. Detail: Content Browser Loading + Sorting

**Loading state:**
- On studio open, browser shows 2-column skeleton grid (8 skeleton cards)
- Items load in order: your content first (most relevant), then refs, then templates
- Each tab fetches independently — switching tabs shows loading if not yet fetched

**Sorting:**
- Default: newest first (by createdAt)
- No explicit sort dropdown in browser (keep it simple — newest is almost always right)
- Templates tab: sorted by popularity (most used first), grouped by trend

**Pagination:**
- Initial load: 20 items
- "Load more" button at bottom of grid
- OR infinite scroll (load next 20 when scrolled to bottom)

---

## 24. Detail: Drag and Drop

The current drop zone in V2 is replaced by:

**Browser-level drop zone:**
- Drag an image/video file anywhere onto the Content Browser panel
- Image → opens AddReferenceDialog with the image pre-filled (same as current)
- Video → if in Video mode with Motion Transfer selected, loads as source video. Otherwise opens AddReferenceDialog.

**No separate drop zone UI element.** The entire browser panel is the drop target. Shows a visual highlight (dashed border) when dragging over it.

---

## 25. Detail: Opening Studio with Context

When studio opens from external triggers, the store is pre-populated before `contentStudioOpen` is set to `true`:

**From dashboard input bar "Open studio →":**
```typescript
// If user typed a prompt, carry it over
if (prompt.trim()) {
  useUnifiedStudioStore.getState().setPrompt(prompt);
}
// If a content type was selected, carry it
useUnifiedStudioStore.getState().setContentType(contentMode);
useUIStore.getState().setContentStudioOpen(true);
```

**From dashboard content detail "Open in Studio":**
```typescript
// Pre-select the item for canvas preview
useUnifiedStudioStore.getState().selectItem(browserItemFromContent(item));
useUIStore.getState().setContentStudioOpen(true);
```

**From dashboard "Make Video" action on a photo:**
```typescript
useUnifiedStudioStore.getState().setContentType("video");
useUnifiedStudioStore.getState().setVideoSource("photo");
useUnifiedStudioStore.getState().setSourceContentId(item.id);
useUnifiedStudioStore.getState().selectItem(browserItemFromContent(item));
useUIStore.getState().setContentStudioOpen(true);
```

**From sidebar "Create Content":**
```typescript
// Clean open — no context
useUnifiedStudioStore.getState().reset();
useUIStore.getState().setContentStudioOpen(true);
```

---

## 26. Detail: Closing Studio

**Normal close (× button or Esc):**
- If NOT generating: close immediately, reset store state
- If generating sync operation (photo/carousel): warn "Generation in progress. Close anyway?" → Yes closes and discards results, No keeps studio open
- If generating async operation (video/talking head): close without warning. Job continues server-side. Result appears in dashboard and Content Browser next time they open studio.

**After generation completes:**
- "Use" button: saves content (already saved to DB), closes studio, resets state
- "Try Different": clears results, keeps settings, stays in studio
- Closing without clicking "Use": content is already saved to DB during generation — it's not lost. Studio just closes.

---

## 27. Detail: Aspect Ratio Fix

Currently broken — photo aspect ratio UI exists in `creation-photo.tsx` but the value is never passed to `generateContent()`.

**Fix:**
1. Add `aspectRatio` to `unified-studio-store.ts` state (default: "portrait")
2. `creation-photo.tsx` reads/writes from store instead of local state
3. `creation-panel.tsx` passes `aspectRatio` to `generateContent()`
4. `generateContent()` server action accepts optional `aspectRatio` parameter
5. Gemini generation config includes aspect ratio instruction in prompt: "vertical/portrait composition" or "square composition" or "horizontal/landscape composition"

Note: Gemini doesn't have a native aspect ratio parameter. We control it via prompt instruction + post-generation crop if needed.

---

## 28. Detail: Quick Picks Removal

The "Quick picks" collapsible section in the current creation panel (template chips like "Mirror selfie at the gym") is **removed**. The Templates tab in the Content Browser replaces this functionality with a much richer experience (visual previews, categories, trends).

The talking-head script starters ("Product review", "Day in my life", "Tips & advice") can stay as small hint chips below the script textarea — they're useful for getting started with a talking head specifically.

---

## 29. Detail: Delete Confirmation

When user clicks "Delete" on any content in Canvas:
- Show confirmation: "Delete this [photo/video/carousel]? This can't be undone."
- Confirm → calls `deleteContent()` server action → removes from DB → removes from browser items → canvas clears
- For carousels: deletes the entire ContentSet + all slides

When user clicks "Delete" on a reference in Canvas:
- Show confirmation: "Delete this reference?"
- Confirm → calls `deleteReference()` → removes from store → canvas clears

---

## Out of Scope

- AI agent layer (Layer 2) — designed for, not built
- Instagram scraping / auto-template creation pipeline
- User-published templates (admin-only for now)
- Mobile-first responsive (handled in Section 30)
- Content scheduling / auto-posting
- Generation cancellation API (server-side) — we can add cancel UI but async jobs complete regardless
- Batch operations (select multiple items for delete, download, etc.)
- Keyboard shortcuts beyond Esc (arrow navigation, space to play — nice to have, not now)

---

## 31. Detail: Content Type Priority + Creator Identity

### Video and Carousel Sell the Product

Video and carousel are the most impressive features — they're what makes someone say "I need this tool." Photos are probably most generated day-to-day, but every competitor does photos.

**Template library should lead with video/carousel:**
- Templates sorted with video templates first, then carousel, then photo
- "Trending" section at top of Templates tab should feature video templates prominently
- Category headers show video count: "Gym & Fitness (12 videos, 8 photos)"

**Creation Panel should make video/carousel feel easy:**
- Type pills order: Photo, Video, Carousel, Voice (Video is second, not buried)
- Video "From Photo" source should be the default (most common workflow — generate photo, animate it)
- Carousel format picker should show visual previews of what each format produces
- "One-click" template generation should prioritize video templates

**But Photo stays the default type** — it's the starting point, fastest to generate, and users need photos before they can make videos from them.

### Always Use Active Creator

Every generation MUST use the active creator. There should never be ambiguity about whose face/identity is being generated.

**Rules:**
- Studio header always shows active creator name + avatar
- If no creator is active, studio shows "Select a creator first" and disables generation
- The prompt label includes creator name: "What should maria do?"
- Generation functions always receive `activeCreatorId` — never null
- Template "Generate with [creator]" button shows the actual creator name
- Canvas preview of templates shows: "This will be generated as maria"
- Creator's base image is always passed as the reference for face consistency

**No creator switching inside the studio.** If they want to generate as a different creator, they close the studio, switch creators in the sidebar, and reopen. This prevents accidental generation with the wrong creator.

---

## 30. Detail: Mobile Experience

The studio will be used on phones — creators manage content on the go. This isn't an afterthought.

### Layout (≤768px): Tab-Switched Single Panel

On mobile, the three-panel layout collapses to a **single visible panel** with a bottom tab bar to switch:

```
┌─────────────────────────────┐
│  × Content Studio    maria  │
├─────────────────────────────┤
│                             │
│   (active panel fills      │
│    full screen)             │
│                             │
│                             │
│                             │
│                             │
│                             │
├─────────────────────────────┤
│  [Browse]  [Create]  [View] │
└─────────────────────────────┘
```

- **Browse tab:** Content Browser at full width. 3-column grid. Tapping an item switches to View tab with that item in canvas.
- **Create tab:** Creation Panel at full width. Prompt, type pills, config, generate button. Results appear inline (switches to View automatically).
- **View tab:** Canvas at full width. Preview + action buttons. Only visible when an item is selected or results are showing. Badge shows if there's something to view.

### Touch Targets
- All buttons: minimum 44×44px tap area
- Browser grid items: minimum 100px wide (3-column at 360px viewport = ~110px each)
- Type pills: 44px height, horizontally scrollable
- Action buttons in canvas: full-width stacked, 48px height

### Inputs
- All text inputs: 16px font minimum (prevents iOS zoom)
- Prompt textarea: auto-grows, max 6 rows
- Safe-area padding on bottom (for home indicator)

### Gestures
- Swipe left/right on canvas to navigate carousel slides
- Pull-down on browser to refresh content
- No complex gestures required

### Tab Bar Behavior
- Browse and Create are always available
- View tab shows a dot indicator when there's content to view (selected item or results)
- Tapping current tab scrolls to top
- Tab bar sticks to bottom, above safe area

### Generation on Mobile
- Same flow as desktop — just in the Create tab
- Progress shows inline in Create tab footer
- When generation completes, auto-switches to View tab to show results
- "Try Different" switches back to Create tab

### Browser on Mobile
- 3-column grid (smaller thumbnails but more visible at once)
- Tabs (All/Photos/Videos/Refs/Templates) horizontally scrollable
- Search bar at top, collapsible
- Template groups scroll vertically (trend headers are sticky)

### Canvas Actions on Mobile
- Action buttons stack vertically (full-width)
- Primary action (e.g., "Generate with maria") is at the top, terracotta
- Secondary actions below in neutral style
- "Download" triggers native share sheet on iOS/Android

### What's Different from Desktop
- No side-by-side panels — one at a time
- No drag-and-drop (use upload button instead)
- Bottom tab navigation instead of always-visible panels
- Share sheet instead of direct download
- Carousel navigation by swipe instead of arrow buttons

### Breakpoints Summary
- **≥1024px:** Full three-panel (or two-panel when canvas hidden)
- **768-1023px:** Browser collapses to 48px icon strip, expands on click. Canvas + Creation side by side.
- **≤767px:** Single panel with bottom tab bar (Browse / Create / View)
