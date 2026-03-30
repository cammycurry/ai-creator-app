# Content Studio & Reference Library — Design Spec

**Date:** 2026-03-29
**Status:** Approved
**Scope:** Reference Library system, Content Studio redesign, Content Dashboard fixes

---

## Overview

Replace the current dialog-based carousel builder with a full-page Content Studio backed by a per-creator Reference Library. The reference system is the core differentiator — it enables consistent backgrounds, products, outfits, and locations across all generated content, which is what makes AI influencers believable on Instagram.

**Two separate systems (do not conflate):**
- **Creator References (this spec)** — per-user, per-creator, private. "Bella's bedroom", "Bella's gym."
- **Admin References (existing, `/admin/references`)** — platform-level Instagram research. Eventually curated into public template assets. Completely separate DB models and UI.

---

## 1. Reference Library

### 1.1 Data Model

New Prisma model:

```prisma
model Reference {
  id          String   @id @default(cuid())
  creatorId   String
  creator     Creator  @relation(fields: [creatorId], references: [id], onDelete: Cascade)
  userId      String
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  type        String   // BACKGROUND | PRODUCT | OUTFIT | POSE | CUSTOM
  name        String   // "My Bedroom", "Protein Shake"
  description String   // "White bed, fairy lights, morning window light from left"
  imageUrl    String   // S3 key
  tags        String[] // ["gym", "mirror", "fitness"] — powers smart matching
  usageCount  Int      @default(0)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([creatorId])
  @@index([userId])
}
```

**Key decisions:**
- Creator-scoped — each creator has their own reference library
- No limits on reference count
- S3 path: `users/{userId}/creators/{creatorId}/references/{id}.jpg`
- Client-side resize before upload (same pattern as wizard reference uploads)
- Tags auto-suggested from name + description, user-editable
- `usageCount` incremented each time a reference is used in a generation
- Pre-seed: when a creator's first sample content generates after the wizard, offer "Save as Reference" on results to bootstrap the library. No auto-saving.

### 1.2 Reference Types

| Type | Purpose | Example |
|------|---------|---------|
| BACKGROUND | Consistent locations/scenes | "My Bedroom", "My Gym", "My Coffee Spot" |
| PRODUCT | UGC items to hold/show | "Protein Shake", "Lipstick", "Phone Case" |
| OUTFIT | Clothing to reuse | "Black Sports Set", "Red Dress" |
| POSE | Body position/framing | "Mirror selfie angle", "Walking pose" |
| CUSTOM | Catch-all for anything else | "My Car Interior", "My Tattoo", "My Dog" |

### 1.3 Reference Library UI

**Three access points (same data, different contexts):**

1. **Sidebar link** — "References" section under creator name in the workspace sidebar. Quick browse and manage.
2. **Creator profile sheet** — full management view with all references, usage stats, add/edit/delete.
3. **Studio left panel** — browse and attach references during content creation.

**Grid layout:**
- Category tabs: All | Backgrounds | Products | Outfits | Poses | Custom — with counts
- Cards: thumbnail, name, type badge, usage count ("Used in 12 posts")
- Desktop: 4 columns. Mobile: 2 columns.
- "+ Add Reference" card always visible at end

**Add Reference flow:**
1. Click "+ Add Reference" (or drag-drop an image)
2. Upload image (drag-drop or file picker, client-side resize)
3. **AI auto-analyzes the image** → suggests type, name, description, and tags. User sees pre-filled fields and just confirms or tweaks. Near-zero effort.
4. User adjusts if needed (change type, rename, edit description)
5. Save → S3 upload → DB record

AI analysis uses Gemini Flash (cheap, fast) to look at the image and return:
```json
{ "type": "BACKGROUND", "name": "Bedroom", "description": "White bed with fairy lights, morning window light from left, clean minimal decor", "tags": ["bedroom", "morning", "cozy", "home"] }
```

**"Save as Reference" surfaces:**
- Content detail (photos) — existing
- Video player (future) — save current frame as reference
- Upload dialog — any image you upload can be a reference
- Generated carousel slides — save any slide as a reference
- Keep original image as-is, no cropping or processing

**"Save as Reference" from generated content:**
- New button on `ContentDetail` alongside Download, Make Carousel, Make Video
- Pre-fills the add-reference flow with the generated image
- User picks type, names it, adds description
- Explicit action — never automatic

### 1.4 Smart Auto-Matching

When a user picks a template in the Studio, the system scans each slide's `sceneHint` and tags against the creator's references:

- Template slide says `sceneHint: "gym-mirror"` → system looks for references tagged "gym" or "mirror"
- If a match is found, it's auto-suggested on that slide with an "(auto)" badge
- User confirms with one click, swaps to a different ref, or removes
- Multiple refs per slide allowed (background + product + outfit simultaneously)

**Matching algorithm (simple, no AI needed):**
```
For each slide in template:
  1. Extract keywords from sceneHint (split on "-")
  2. Find references where tags overlap with keywords
  3. Rank by: exact tag match > partial match > type match (BACKGROUND for scenes, PRODUCT for product hints)
  4. Suggest top match per reference type
```

### 1.5 How References Are Used in Generation

References are passed to Gemini as additional `inlineData` alongside the creator's base face reference:

```
generateSlideImage(prompt, [
  creatorBaseImage,     // face consistency (existing)
  backgroundRef?,       // location consistency (new)
  productRef?,          // UGC product (new)
  outfitRef?,           // clothing consistency (new)
  poseRef?,             // composition reference (new)
])
```

Gemini supports up to 14 reference images — plenty of room for base + multiple refs per slide.

The prompt incorporates reference descriptions:
```
"That exact woman from the reference image. In the location shown in reference image 2
(white bedroom, fairy lights, morning light from left). Wearing the outfit shown in
reference image 3. Shot on iPhone, candid. [REALISM_BASE]."
```

---

## 2. Content Studio

### 2.1 Architecture

The Content Studio replaces the current `CarouselBuilder` dialog and expands the current `TemplatesView`. It's a workspace view (not a separate route), accessed via the existing view system in `ui-store`.

**New view:** `activeView: "studio"` added to `UIStore.ActiveView`

**Components:**
```
src/components/studio/content/
  content-studio.tsx        — Main orchestrator, manages steps
  studio-library.tsx        — Step 1: Template browse grid
  studio-builder.tsx        — Step 2: Split panel slide builder
  studio-review.tsx         — Step 3: Review & generate summary
  reference-panel.tsx       — Left panel: creator's reference library
  slide-row.tsx             — Individual slide configuration row
  reference-card.tsx        — Reference thumbnail card (reused in panel + grid)
  add-reference-dialog.tsx  — Upload + tag reference
```

**CSS:** New `content-studio.css` in prototype-first pattern. NOT Tailwind for core layout.

### 2.2 Step 1: Browse Library

Replaces current `TemplatesView` with a richer browsable grid.

**Layout:**
- Filter tabs: All | Carousels | Single Photos | UGC — then by niche (Fitness, Lifestyle, Fashion, Spicy)
- AI search bar at top: "Describe what you want..." → AI finds best template + pre-configures slides
- Template cards: name, slide count range, niche tags, scene summary, credit cost
- Click card → enter Step 2 (Studio Builder)

**Data:** Existing `CAROUSEL_FORMATS` + `templates` arrays. Expandable — as we collect more Instagram references via the admin tool, we add more formats and templates.

**Single photos use the same flow:** A single photo template is just a 1-slide "carousel." Same Studio builder, one slide row, same reference attachment. No separate single-photo path needed.

### 2.3 Step 2: Studio Builder (Split Panel)

The core creation experience.

**Left panel — Reference Library:**
- Category tabs (All, Backgrounds, Products, etc.)
- Thumbnail grid of creator's saved references
- "+ Add Reference" button (opens add dialog inline)
- Click a reference to attach it to the currently selected slide
- Collapsible on mobile (drawer from bottom)

**Right panel — Slide Builder:**
- Template name + slide count + credit cost header
- Slide list (vertical):
  - Each row: slide number (accent color), scene description, mood hint
  - Attached reference thumbnails with type badge and "×" to remove
  - "Edit" button → inline textarea to customize the slide description
  - "+ Ref" button → highlights the left panel for selection
  - Smart auto-matched refs shown with "(auto)" badge
- Slide count adjuster: +/- within the format's `slideRange`
- Global instructions textarea: "wearing red", "outdoor lighting", "more smiles"
- Footer: "← Back to library" | credit cost | "Review & Generate →"

**Per-slide reference attachment:**
- Multiple references per slide (background + product + outfit all at once)
- Each reference type shown as a small tagged thumbnail on the slide row
- Click to swap, × to remove
- When attaching: reference `usageCount` incremented on actual generation (not on attach)

### 2.4 Step 3: Review & Generate

Summary screen before spending credits.

- All slides listed with descriptions + attached reference thumbnails
- Total credit cost (slides × 1 credit each)
- "Generate Carousel" button
- On generate: uses existing `generateCarousel()` server action, extended to accept reference IDs per slide
- Results: existing `CarouselDetail` component (grid + Instagram preview + lightbox + caption editor + per-slide regen) — this is solid, keep it

### 2.5 AI Path

Two entry points, same destination:

1. **AI search bar in library** (Step 1) — user types "gym photo dump with my protein shake"
2. **Floating input in workspace** — same AI suggestion flow that already exists

AI flow:
1. AI analyzes the request against available templates (existing `suggestCarouselFormats` logic)
2. AI picks best template, configures slide count
3. AI scans creator's references and auto-matches to slides
4. Studio opens at Step 2, fully pre-filled
5. User reviews, tweaks if they want, hits generate

The AI is additive — it just pre-fills the same Studio that manual users configure by hand.

### 2.6 Entry Points

| Entry Point | Behavior |
|------------|----------|
| "Create" button (header/sidebar) | Opens Studio at Step 1 (library browse) |
| "Templates" filter pill | Opens Studio at Step 1 (replaces current TemplatesView) |
| "Make Carousel" from content detail | Opens Studio at Step 2 with that photo as slide 1 |
| Floating input AI suggestion | AI pre-fills → opens Studio at Step 2 |
| Template card "Generate →" | Opens Studio at Step 2 for that template |

---

## 3. Content Dashboard Fixes

Ship alongside the Studio:

### 3.1 Carousel Filter

Carousel slides that belong to a `ContentSet` must never appear as individual photo cards. The current dedup logic filters by `!item.contentSetId`, but counts may be off. Ensure:
- "Photos" count excludes carousel slides
- "Carousels" count matches `contentSets.length`
- "All" count = standalone photos + carousel sets (not individual slides)

### 3.2 Gallery Search

Wire the existing search input to filter content:
- Match against `userInput`, `prompt`, template name
- Client-side filter (content array is already loaded)
- Debounced input (300ms)

### 3.3 Gallery Sort

Wire the existing sort dropdown:
- Newest: `createdAt` descending (default)
- Oldest: `createdAt` ascending
- By Type: photos first, then carousels (or vice versa)

### 3.4 Save as Reference Button

New action on `ContentDetail`:
- "Save as Reference" button alongside Download, Make Carousel, Make Video
- Opens add-reference dialog pre-filled with the generated image
- User picks type, names it, describes it, saves

---

## 4. Server Actions

### 4.1 New Actions (`src/server/actions/reference-actions.ts`)

```typescript
createReference(creatorId, type, name, description, imageBase64, tags?)
  → { success: true, reference } | { success: false, error }

updateReference(referenceId, { name?, description?, type?, tags? })
  → { success: true, reference } | { success: false, error }

deleteReference(referenceId)
  → { success: true } | { success: false, error }

getCreatorReferences(creatorId)
  → Reference[]

incrementReferenceUsage(referenceIds: string[])
  → void (called during generation)
```

### 4.2 Extended Actions

**`generateCarousel` (extend existing):**
- New parameter: `slideReferences?: Record<number, string[]>` — map of slide position → reference IDs
- Fetches reference images from S3
- Passes as additional `inlineData` to Gemini alongside base face image
- Incorporates reference descriptions into slide prompts
- Calls `incrementReferenceUsage` for all used references

**`suggestCarouselFormats` (extend existing):**
- New: also returns auto-matched reference IDs based on creator's library
- Returns `autoMatchedRefs: Record<number, { refId, refName, refType, confidence }[]>` per slide

---

## 5. Multi-Creator & Scale

- Switching active creator switches the entire reference library
- Creator profile shows reference count as a stat
- "Duplicate to another creator" action on references — explicit copy, not shared
- Reference library grows with usage = natural lock-in
- Users managing 3-5 creators each need their own consistent worlds

---

## 6. Mobile

- Library grid: 2 columns, touch-friendly cards
- Studio: stacks vertically, reference panel becomes bottom drawer (collapsible)
- Slide list full-width, reference thumbnails inline
- All touch targets 44px minimum
- Font-size 16px on all inputs (iOS zoom prevention)
- Safe-area padding on fixed elements
- Same responsive breakpoints as rest of app (768px, 640px, 390px)

---

## 7. Video-Ready Architecture

- `Reference` model is content-type agnostic — same refs for photo AND video
- Template system: `CarouselFormat` today → `VideoFormat` tomorrow, same structure (slides become "scenes")
- Studio flow identical for video: browse → configure scenes → attach refs → generate
- When Kling is added, background refs pass as image-to-video input instead of Gemini inlineData
- No video-specific work in this spec — just ensuring the architecture doesn't block it

---

## 8. What's NOT in Scope

- Video generation (Kling integration) — separate spec
- Voice/TTS (ElevenLabs) — separate spec
- Public template marketplace — future
- Chrome extension → reference library import — separate feature, explicit action
- Stripe/billing changes — deferred
- Canvas mode (drag/arrange images) — future
