# Unified Content Studio — Design Spec

**Date:** 2026-04-01
**Status:** Approved
**Scope:** Complete rebuild of the Content Studio as a unified creation interface for all content types, with account-level references and post-generation iteration.

---

## Overview

One full-screen overlay for ALL content creation. Photo, carousel, video, talking head — same interface, same reference system, same flow. References are the universal input layer shared across all generation types. Post-generation iteration keeps users in the studio producing content.

This replaces the current fragmented Content Studio (content-studio.tsx + content-studio-store.ts) and the separate dialogs (make-video-dialog.tsx, talking-head-dialog.tsx, carousel-builder.tsx).

---

## 1. Layout

### 1.1 Full-Screen Overlay

Same pattern as Creator Studio (`creator-studio.tsx`): fixed overlay, z-index 55, body scroll lock, X to close, Escape to close (only when not generating).

### 1.2 Header

- X close button (left)
- "Content Studio" title
- Active creator name badge
- Credit balance display (right)

### 1.3 Two-Panel Split

**Left panel (260px): Reference Panel**
- Three tabs: My Refs | Creator | Library
- Category filter chips (All, BG, Product, Outfit, Pose, Custom)
- Scrollable reference grid (2 columns)
- Click to attach/detach (toggle, shows "ATTACHED" badge)
- "+ Add" button opens AddReferenceDialog
- Inspiration upload zone at bottom (transient, this-session-only)
  - Drag-drop or click to upload
  - Thumbnails with remove button
  - "Make my creator do THIS"
- Mobile: collapses to bottom drawer

**Right panel (flex): Creation Panel**
- Type tabs: Photo | Carousel | Video | Talking Head
- Prompt/input area (adapts per type)
- Attached references shown inline below prompt
- Template quick-picks (collapsible)
- Type-specific config section
- Footer: credit cost + Generate button

---

## 2. Reference Architecture

### 2.1 Account-Level References

Current `Reference` model has required `creatorId`. Change to optional:

```prisma
model Reference {
  id          String   @id @default(cuid())
  creatorId   String?  // null = account-level (shared across all creators)
  creator     Creator? @relation(fields: [creatorId], references: [id], onDelete: Cascade)
  userId      String
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  // ... rest unchanged
}
```

### 2.2 Three Reference Scopes

| Tab | Scope | Query | Description |
|-----|-------|-------|-------------|
| My Refs | Account | `creatorId: null, userId: user.id` | Your spaces, products, outfits. Shared across all creators. |
| Creator | Creator-specific | `creatorId: activeCreatorId` | Things specific to this creator's world. |
| Library | Public | `PublicReference` model, `isActive: true` | Platform-curated assets everyone can use. |

### 2.3 When Creating a Reference

User picks scope:
- "Use for all my creators" → `creatorId: null` (account-level)
- "Only for [creator name]" → `creatorId: activeCreatorId` (creator-specific)

Default: account-level (most references are personal spaces/products).

### 2.4 Inspiration Uploads (Transient)

Not saved as permanent references. Uploaded in the studio for this generation only.
- Stored in component state as base64
- Passed to generation as additional `inlineData` images
- After generation: user can "Save as Reference" to make permanent
- If user closes studio, they're gone

---

## 3. Content Types

### 3.1 Photo

**Prompt label:** "What should [creator] do?"
**Prompt placeholder:** Scene description examples
**Config:** Image count (1-4 buttons)
**Templates:** 14 single photo templates (collapsible chips that pre-fill prompt)
**References:** Background, product, outfit, pose — passed as inlineData to Gemini
**Action:** `generateContent(creatorId, prompt, imageCount)`
**Cost:** 1 credit per photo

### 3.2 Carousel

**Prompt label:** "What's the carousel about?"
**Prompt placeholder:** Carousel concept description
**Config:**
- Format picker (8 carousel format chips — selecting one shows slide editor)
- Slide-by-slide editor (slide list with scene, mood, per-slide ref attachment)
- Slide count +/- within format range
- Global instructions textarea
**Templates:** 8 carousel format chips
**References:** Per-slide attachment + global references. Smart auto-matching (scene keywords → ref tags).
**Action:** `generateCarousel(creatorId, formatId, slideCount, instructions, sourceContentId?, slideEdits?, slideReferences?)`
**Cost:** 1 credit per slide

### 3.3 Video

**Prompt label:** "What happens in the video?"
**Prompt placeholder:** Motion/scene description
**Config:**
- Source sub-mode chips: "From text" | "From photo" | "Motion transfer"
- Duration toggle: 5s (3 credits) | 10s (5 credits)
- Aspect ratio: 9:16 Portrait | 1:1 Square | 16:9 Landscape
- "From photo" mode: shows recent photos grid to pick source image
- "Motion transfer" mode: shows video upload dropzone for reference movement video
**References:** Background refs, inspiration photos
**Actions:**
- From text: `generateVideoFromText(creatorId, prompt, duration, aspectRatio)`
- From photo: `generateVideoFromImage(creatorId, sourceContentId, prompt, duration)`
- Motion transfer: `generateVideoMotionTransfer(creatorId, referenceVideoUrl, prompt, duration)`
**Cost:** 3-5 credits

### 3.4 Talking Head

**Prompt label:** "What should [creator] say?"
**Prompt placeholder:** Script with examples
**Config:**
- Voice picker (2-column grid of voice cards, filtered by creator gender, play preview)
- Duration toggle: 15s (8 credits) | 30s (12 credits)
- Background/setting input (optional text field)
- AI script writer button: "Write me a script about..." → Grok generates
**References:** Background refs for the setting
**Action:** `generateTalkingHead(creatorId, script, voiceId, setting?, duration?)`
**Cost:** 8-12 credits

---

## 4. Shared Behaviors

### 4.1 Prompt Persistence

When switching type tabs, the prompt text and attached references persist. "Morning coffee in bedroom" + bedroom ref → switch from Photo to Video → same prompt, same refs. Only the config area changes.

### 4.2 Template Quick-Picks

Collapsible section below the prompt. Chips that pre-fill the prompt text when clicked.
- Photo mode: 14 single photo templates
- Carousel mode: 8 carousel formats
- Video mode: same templates but adapted for motion descriptions
- Talking Head mode: script starters ("Product review", "Day in my life", "Tips & advice")

### 4.3 Credit Cost Display

Footer always shows: `{cost} credits · {description}` and Generate button.
Updates dynamically based on type + config (image count, slide count, duration).

### 4.4 Generating State

While generating:
- Generate button shows spinner + "Generating..."
- Can't close the studio
- Can't switch types
- Progress indicator for async video/talking head (polling every 5s)

---

## 5. Post-Generation Iteration

After generation completes, results appear inline in the creation panel (replaces the prompt/config area).

### 5.1 Photo Results

Grid of 1-4 generated photos. Per-photo actions:
- **Use** — save to content library, close studio
- **More Like This** — generate variations of this specific photo
- **Save as Reference** — save this photo as a permanent reference
- **Try Different** — go back to prompt/config, generate again

### 5.2 Carousel Results

Slide grid + Instagram preview (reuse existing `CarouselDetail` layout). Actions:
- **Use** — save all, close studio
- **Regenerate Slide** — regenerate a single slide with feedback
- **Edit Caption** — caption editor with AI rewrite chips
- **Try Different** — back to prompt

### 5.3 Video Results

Inline video player. Actions:
- **Use** — save, close studio
- **Try Different** — back to prompt, generate again
- **Save Frame as Reference** — capture a frame from the video as a reference

### 5.4 Talking Head Results

Inline video player. Actions:
- **Use** — save, close studio
- **Try Different** — back to script/voice/config
- **Adjust Voice** — switch voice and regenerate (keeps same script + image)

---

## 6. Components

### 6.1 New Components

```
src/components/studio/content/
  unified-studio.tsx         — Full-screen overlay orchestrator (replaces content-studio.tsx)
  unified-studio.css         — All styles (replaces content-studio.css)
  studio-ref-panel.tsx       — Left panel: three-tab reference browser + inspiration upload
  studio-create-panel.tsx    — Right panel: type tabs + prompt + config + generate
  studio-photo-config.tsx    — Photo-specific: image count
  studio-carousel-config.tsx — Carousel-specific: format picker + slide editor
  studio-video-config.tsx    — Video-specific: source mode + duration + aspect ratio
  studio-talking-config.tsx  — Talking head-specific: voice picker + duration + setting
  studio-results.tsx         — Post-generation results view with iteration actions
```

### 6.2 Reused Components

- `ReferenceCard` — thumbnail in the ref panel
- `AddReferenceDialog` — add new reference
- `VideoPlayer` — play generated videos in results
- `SlideRow` — per-slide editing in carousel config (may need tweaks)

### 6.3 Removed Components (replaced by unified studio)

- `content-studio.tsx` (current fragmented version)
- `content-studio-store.ts` (replaced by new store)
- `make-video-dialog.tsx` (absorbed into studio)
- `talking-head-dialog.tsx` (absorbed into studio)
- `studio-library.tsx`, `studio-builder.tsx`, `studio-review.tsx` (replaced)

### 6.4 New Store

```
src/stores/unified-studio-store.ts
```

State:
```typescript
{
  // Output type
  contentType: "photo" | "carousel" | "video" | "talking-head"

  // Universal inputs
  prompt: string
  attachedRefs: ReferenceItem[]      // from saved references
  inspirationPhotos: { base64: string; preview: string }[]
  inspirationVideo: { url: string; preview: string } | null  // for motion transfer

  // Photo config
  imageCount: number                  // 1-4

  // Carousel config
  selectedFormat: CarouselFormat | null
  slides: SlideConfig[]
  slideCount: number
  globalInstructions: string

  // Video config
  videoSource: "text" | "photo" | "motion"
  videoDuration: 5 | 10
  videoAspectRatio: "9:16" | "1:1" | "16:9"
  sourceContentId: string | null      // for image-to-video

  // Talking head config
  script: string                      // replaces prompt for this type
  voiceId: string
  talkingSetting: string
  talkingDuration: 15 | 30

  // Generation state
  generating: boolean
  generatingProgress: string
  error: string | null

  // Results
  showResults: boolean
  results: ContentItem[]              // generated items
  resultContentSet: ContentSetItem | null  // for carousel results
}
```

---

## 7. Entry Points

| Entry Point | Behavior |
|------------|----------|
| "Create Content" in sidebar | Opens studio at Photo tab (default) |
| "Templates" filter pill | Opens studio at Photo tab with templates expanded |
| "Make Video" on content detail | Opens studio at Video tab, "from photo" mode, source image pre-selected |
| "Make Carousel" on content detail | Opens studio at Carousel tab, source photo as slide 1 |
| "Voice" mode on floating input | Opens studio at Talking Head tab |
| "Video" mode on floating input | Opens studio at Video tab |
| Floating input submit (photo mode) | Still generates directly (quick path), doesn't open studio |

The floating input remains as the QUICK path for simple photo generation. The studio is the FULL path for everything else.

---

## 8. Migration from Current State

### 8.1 Remove
- `src/components/studio/content/content-studio.tsx` (and all sub-components)
- `src/components/studio/content/content-studio.css`
- `src/stores/content-studio-store.ts`
- `src/components/workspace/make-video-dialog.tsx`
- `src/components/workspace/talking-head-dialog.tsx`

### 8.2 Keep
- All server actions (unchanged)
- `src/components/workspace/video-player.tsx`
- `src/components/workspace/reference-card.tsx`
- `src/components/workspace/add-reference-dialog.tsx`
- `src/components/workspace/carousel-detail.tsx`

### 8.3 Modify
- `prisma/schema.prisma` — make `Reference.creatorId` optional
- `src/server/actions/reference-actions.ts` — support account-level refs (creatorId: null)
- `src/stores/ui-store.ts` — keep contentStudioOpen flag
- `src/components/workspace/workspace-canvas.tsx` — update entry points
- `src/components/workspace/content-detail.tsx` — update "Make Video" / "Make Carousel" to open studio
- `src/components/workspace/workspace-shell.tsx` — mount new UnifiedStudio

---

## 9. Mobile

- Reference panel → bottom drawer (swipe up, collapsible)
- Type tabs → horizontal scroll
- Prompt area → full width
- Config sections → stack vertically
- Voice picker → single column
- Slide editor → full width cards
- Generate button → fixed bottom bar
- All touch targets 44px minimum
- All inputs font-size 16px (iOS zoom prevention)
- Safe-area padding on fixed elements
- Breakpoints: 768px (tablet), 640px (phone), 390px (small phone)

---

## 10. Saved Configurations (Presets)

Users save their favorite factory setups as reusable presets. One click to load, swap creator, generate.

### 10.1 What Gets Saved

A preset captures the full studio state:
- Content type (photo/carousel/video/talking head)
- Prompt text
- Attached reference IDs (account + creator refs)
- Type-specific config (image count, format, duration, voice, aspect ratio, etc.)
- Name and optional description

### 10.2 Data Model

```prisma
model ContentPreset {
  id          String   @id @default(cuid())
  userId      String
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  name        String   // "My Gym Reel Setup"
  contentType String   // photo, carousel, video, talking-head
  config      Json     // full studio state snapshot
  usageCount  Int      @default(0)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([userId])
}
```

### 10.3 UI

- **Save:** "Save as Preset" button in studio footer (after configuring, before or after generating)
- **Load:** Preset picker at the top of the studio (dropdown or chip row showing saved presets)
- **Manage:** List in settings or a dedicated presets section

### 10.4 Flow

1. User configures studio (type + prompt + refs + config)
2. Clicks "Save as Preset" → names it "Gym Reel"
3. Next time: opens studio → selects "Gym Reel" preset → everything pre-fills
4. Swaps to a different creator → same config, different person
5. Hit generate → content factory

---

## 11. What's NOT in Scope

- Public reference publishing by users (future)
- AI content calendar / scheduling (future)
- Batch generation (future)
- Auto-captioning / subtitle burn-in (separate spec)
- Video editing / trimming / stitching (future)
- Multi-language dubbing (future)
- Voice cloning per creator (future)
