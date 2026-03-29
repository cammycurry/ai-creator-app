# Content Generation & Carousels

> Date: 2026-03-28
> Status: Draft

---

## Problem

The workspace has a working input bar for single photo generation, but users can only make one image at a time with no structure. Instagram carousels get 10% engagement (vs 7% single, 6% Reels) and the algorithm weights saves/shares heavily — carousels with 5-10 slides get the best reach. Users need to be able to generate structured carousel sets, get AI help coming up with ideas, and manage multi-slide content without friction.

## Solution

Three content types (Photo, Photo Set, Carousel) built on a layered template system where **formats** (the structure) combine with **scenes** (the content) to produce complete carousel sets. An AI idea assistant helps users come up with content. Per-slide regeneration with full carousel context keeps quality high.

---

## 1. Content Types

| Type | What | Slides | Credits |
|------|------|--------|---------|
| **Photo** | Single image generation (exists) | 1 | 1 |
| **Photo Set** | Variations of one image | 2-4 | 1 each |
| **Carousel** | Structured multi-slide set | 3-10 | 1 each slide |

Photo and Photo Set use the existing generation pipeline. Carousel is the new build.

---

## 2. Layered Template System

Two independent libraries that combine:

### Formats (the structure)

Each format is a self-contained recipe that knows how to build itself:

```typescript
interface CarouselFormat {
  id: string;
  name: string;
  description: string;        // what it is
  whyItWorks: string;         // why users should pick it
  slideRange: [number, number]; // min-max slides
  slides: FormatSlide[];       // recipe for each slide position
  captionTemplate: string;     // AI fills in details
  hashtagSuggestions: string[];
  niches: string[];            // which niches this works for
}

interface FormatSlide {
  position: number;            // 1-based
  role: string;                // "hook" | "content" | "detail" | "closer"
  sceneHint: string;           // what kind of scene goes here
  outfitHint: string;          // outfit guidance
  moodHint: string;            // energy/vibe for this slide
  required: boolean;           // false = AI can skip if fewer slides
}
```

**Launch formats:**

| Format | Slides | Description |
|--------|--------|-------------|
| Photo Dump — Gym Day | 5-7 | Casual gym vibes — mirror selfie, workout, post-gym |
| Photo Dump — City Day | 5-7 | Urban life — coffee, street style, golden hour, night out |
| Photo Dump — Beach Day | 5-7 | Beach/pool vibes — swimwear, drinks, sunset |
| Outfit Showcase | 3-5 | Same person, different outfits or angles of one look |
| GRWM (Get Ready With Me) | 3-4 | Before → during → after transformation |
| Day in the Life | 5-8 | Morning to night narrative arc |
| Product Feature | 3-5 | UGC with product — holding, using, lifestyle |
| Spicy Progression | 3-5 | Casual → suggestive escalation for link-in-bio |

### Scenes (the content for each slide)

```typescript
interface Scene {
  id: string;
  name: string;
  setting: string;             // "modern gym with mirrors and weights"
  lighting: string;            // "gym fluorescent lighting"
  outfitDefault: string;       // "matching sports set"
  mood: string;                // "confident, post-workout glow"
  cameraStyle: string;         // "mirror selfie, shot on iPhone"
  niches: string[];            // which niches this fits
  tags: string[];              // for search
}
```

**Launch scenes (expanding existing templates.ts):**

Gym mirror selfie, mid-workout action, post-workout glow, coffee shop morning, bedroom mirror OOTD, city street golden hour, beach standing, pool lounging, car selfie, restaurant dinner, night out city, hotel room, hiking trail, getting ready bathroom, kitchen cooking, desk/workspace, couch lounging, park bench, rooftop, shopping bags.

### How they combine

AI picks: Format("Photo Dump — Gym Day") → looks at slide recipes → selects scenes that match each slot → builds prompts per slide → generates all in parallel.

The format says "slide 1 should be a hook, mirror selfie type." The scene library has "Gym mirror selfie" with all the details. AI matches them.

---

## 3. Idea Assistant

The existing input bar ("What should [name] do next?") becomes the AI idea engine.

### How it works

1. User types anything: "beach carousel", "idk help me", "something spicy", or just hits a suggestion chip
2. Server action calls Grok Fast with: creator name + niche + vibes + user request + available format names
3. Grok searches the format library and returns 3-5 suggestions
4. Displayed as clickable **suggestion cards** (not just text chips)

### Suggestion cards

```
┌─────────────────────────────────────┐
│ 📸 Photo Dump — Beach Day           │
│ 6 slides · Lifestyle                │
│ "Casual beach vibes — swimwear,     │
│  golden hour, drinks, sunset"       │
│                        [Generate →] │
└─────────────────────────────────────┘
```

Each card shows: type icon, format name, slide count, niche tag, one-line description, Generate button.

### Three entry points

1. **Input bar** — type anything → AI returns suggestion cards for carousels, or generates a single photo if the request is simple
2. **Suggestion chips** — smarter, rotate based on niche, include carousel types
3. **Format browser** — the "Templates" view becomes a browsable library of all formats + scenes

### AI system prompt for suggestions

```
You suggest Instagram content for an AI influencer.

Creator: {name}, {niche} niche, {vibes} vibe
Request: {userInput}

Available carousel formats: {format names + descriptions}

Return 3-5 suggestions as JSON array:
[{ "type": "carousel" | "photo", "formatId": "...", "title": "...", "description": "...", "slideCount": N }]

Pick formats that match the creator's niche and the user's request.
If the request is vague, suggest a diverse mix.
If the request is specific ("gym pics"), match it directly.
```

---

## 4. Generation Pipeline

### Single photo (exists — minor updates)

```
User prompt → Grok enhances → Gemini + creator ref → S3 → display
```

No changes needed. Already works.

### Carousel generation (new)

```
User picks format (from suggestion card, browser, or AI recommendation)
  → Format recipe loaded from carousel-formats.ts
  → AI decides slide count (within format's range) based on creator vibe
  → Per slide: format slide recipe + matched scene → build prompt
  → All prompts include creator's base image as reference
  → Generate all slides in parallel (like wizard does 4 at once)
  → Upload to S3 → Create ContentSet + Content records
  → Grok generates caption + hashtags based on format + creator
  → Display in carousel dialog
```

### Per-slide regeneration (new)

When user regenerates slide N in a carousel:

```
Load carousel context:
  - Format name and description
  - Slide N's role (hook/content/detail/closer)
  - Descriptions of all OTHER slides that exist
  - What was wrong with the previous version (if user typed feedback)

Prompt: "You are regenerating slide {N} of {total} in a {format} carousel.
Other slides in this set: {descriptions}.
This slide should be: {slide role + scene description}.
Generate a DIFFERENT version that stays cohesive with the set.
{user feedback if any}"

Creator ref + prompt → Gemini → replace just that slide in S3 + DB
```

### Photo set / "More like this" on dashboard (new)

When user clicks an existing photo → "Make variations":

```
Original photo downloaded from S3 as reference
  → Generate 2-4 variations (slightly different angle/expression, same scene)
  → Save as ContentSet type="PHOTO_SET"
  → Display in photo set dialog (same as carousel but simpler)
```

---

## 5. UI Design

### Dashboard content grid (modified)

- Single photos: show as they do now
- Carousels: show with a **slide count badge** in top-right corner (e.g., "6" with a stack icon)
- Photo sets: show with a smaller badge (e.g., "4")
- Filter tabs: All | Photos | Carousels | Videos | Voice (add "Carousels" tab)
- Clicking a carousel/photo set opens the detail dialog

### Carousel detail dialog (new)

Uses the same dialog component as the existing content detail modal, expanded:

```
┌───────────────────────────────────────────────┐
│ Gym Day Photo Dump                 6 slides ✕ │
├───────────────────────────────────────────────┤
│                                               │
│  ┌─────┐ ┌─────┐ ┌─────┐                     │
│  │  1  │ │  2  │ │  3  │                     │
│  │     │ │     │ │     │                     │
│  └─────┘ └─────┘ └─────┘                     │
│  ┌─────┐ ┌─────┐ ┌─────┐                     │
│  │  4  │ │  5  │ │  6  │                     │
│  │     │ │     │ │     │                     │
│  └─────┘ └─────┘ └─────┘                     │
│                                               │
│  Click a slide to zoom / regenerate           │
├───────────────────────────────────────────────┤
│ Caption: "gym days > everything 💪"           │
│ #fitness #gymlife #motivation                 │
│ [Copy] [Rewrite ↻] [Make it spicier 🔥]       │
├───────────────────────────────────────────────┤
│ [Download All]              [Delete Carousel] │
└───────────────────────────────────────────────┘
```

- Two view modes toggled in the header: **Grid** (default) and **Preview**
- Grid: slides in a responsive grid (3 columns desktop, 2 mobile). Click a slide → lightbox with regenerate.
- Preview: Instagram-style phone mockup. Swipe/arrows to advance slides. Dot indicators. Shows how followers will actually see it. Caption displayed below the image like IG.

```
┌───────────────────────────────────────────────┐
│ Gym Day Photo Dump     [Grid] [Preview]     ✕ │
├───────────────────────────────────────────────┤
│              ┌─────────────┐                  │
│              │ ┌─────────┐ │                  │
│              │ │         │ │                  │
│              │ │ Slide 3 │ │                  │
│              │ │         │ │                  │
│              │ └─────────┘ │                  │
│              │  ● ● ○ ○ ○  │                  │
│              │             │                  │
│              │ maria       │                  │
│              │ gym days >  │                  │
│              │ everything💪│                  │
│              └─────────────┘                  │
│         ◀  swipe or arrows  ▶                 │
├───────────────────────────────────────────────┤
│ [Download All]              [Delete Carousel] │
└───────────────────────────────────────────────┘
```

- Click a slide in preview mode → same lightbox with regenerate
- "Download All" downloads all slides as individual files (or zip)
- Caption is AI-generated from the format template, editable inline
- Hashtags auto-generated, editable
- **Caption assistant:** "Rewrite" button generates a new version. Quick tone chips: "Make it spicier 🔥", "More casual", "Add CTA", "Shorter". User can also type instructions like "make it funny" and Grok rewrites. All mindless one-click — user never has to write a caption from scratch

### Slide lightbox (within carousel dialog)

```
┌───────────────────────────────────────┐
│                                     ✕ │
│         [ Full-size slide 3 ]         │
│                                       │
│  ◀ Slide 2              Slide 4 ▶    │
│                                       │
│  ┌──────────────────────────────────┐ │
│  │ What should be different?        │ │
│  └──────────────────────────────────┘ │
│  [Regenerate This Slide]              │
└───────────────────────────────────────┘
```

- Arrow keys / swipe to navigate between slides
- Optional text input: "make it more sunny" or "different outfit"
- Regenerate sends the feedback + carousel context to the generation pipeline

### Format browser (replaces Templates view)

The existing "Templates" button in the header switches to the format/scene browser:

```
┌───────────────────────────────────────┐
│ Content Library                       │
│ ┌────────┐ ┌────────┐ ┌────────┐     │
│ │All     │ │Carousel│ │Photo   │     │
│ └────────┘ └────────┘ └────────┘     │
├───────────────────────────────────────┤
│                                       │
│ CAROUSELS                             │
│ ┌─────────────────────────────────┐   │
│ │ 📸 Photo Dump — Gym Day         │   │
│ │ 5-7 slides · Fitness            │   │
│ │ Casual gym vibes — mirror       │   │
│ │ selfie, workout, post-gym.      │   │
│ │ Gets 2x saves.    [Generate →]  │   │
│ └─────────────────────────────────┘   │
│ ┌─────────────────────────────────┐   │
│ │ 🏖️ Photo Dump — Beach Day       │   │
│ │ 5-7 slides · Lifestyle          │   │
│ │ ...                              │   │
│ └─────────────────────────────────┘   │
│                                       │
│ SINGLE PHOTOS                         │
│ (existing templates — gym selfie,     │
│  coffee morning, golden hour, etc.)   │
└───────────────────────────────────────┘
```

Formats grouped by type, each with description + "why it works" + Generate button.

### Input bar updates

The input bar behavior changes based on what the AI returns:

- User types "gym pics" → AI returns: 1 single photo suggestion + 2 carousel suggestions → shown as suggestion cards above the input bar
- User types "something spicy" → AI returns carousel suggestions matching that vibe
- User types a specific prompt like "mirror selfie in black dress" → generates a single photo directly (existing behavior)
- AI determines if the request is a carousel or single photo based on the input

### Mobile

- Carousel dialog goes full-screen on mobile (like the studio modal)
- Slide grid becomes 2 columns
- Swipe between slides in the lightbox
- All touch targets 44px minimum (consistent with studio)
- Format browser cards are full-width, scrollable

---

## 6. Data Model

### New: ContentSet

```prisma
model ContentSet {
  id        String   @id @default(cuid())
  creatorId String
  creator   Creator  @relation(fields: [creatorId], references: [id])
  userId    String
  user      User     @relation(fields: [userId], references: [id])
  type      String   // "CAROUSEL" | "PHOTO_SET"
  formatId  String?  // references carousel-formats.ts id
  caption   String?  // AI-generated, user-editable
  hashtags  String[] // AI-generated
  slideCount Int
  status    String   // "GENERATING" | "COMPLETED" | "PARTIAL"
  creditsCost Int    @default(0)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  contents  Content[]
}
```

### Modified: Content

Add to existing Content model:

```prisma
  contentSetId String?      // FK to ContentSet (null for standalone photos)
  contentSet   ContentSet?  @relation(fields: [contentSetId], references: [id])
  slideIndex   Int?         // position in carousel (1-based)
  slideContext  Json?       // scene description for regeneration context
```

### Format/Scene library files

- `src/data/carousel-formats.ts` — format recipes
- `src/data/scenes.ts` — scene definitions
- Both are TypeScript files, easy to edit and expand

---

## 7. Files to Change

### Create
- `src/data/carousel-formats.ts` — format recipe definitions
- `src/data/scenes.ts` — scene definitions
- `src/server/actions/carousel-actions.ts` — carousel generation, per-slide regen, idea suggestions
- `src/components/workspace/carousel-detail.tsx` — carousel dialog with slide grid
- `src/components/workspace/carousel-slide-lightbox.tsx` — per-slide zoom + regenerate
- `src/components/workspace/suggestion-cards.tsx` — AI suggestion card components
- `src/components/workspace/format-browser.tsx` — browsable format/scene library

### Modify
- `prisma/schema.prisma` — add ContentSet model, add fields to Content
- `src/server/actions/content-actions.ts` — update getCreatorContent to include set info, add photo set generation
- `src/components/workspace/workspace-canvas.tsx` — carousel badges on grid, suggestion cards above input, updated input bar behavior
- `src/components/workspace/content-detail.tsx` — detect carousel/set → open carousel dialog instead
- `src/stores/creator-store.ts` — add content sets to state
- `src/data/templates.ts` — existing single-photo templates stay, referenced from format browser

### No Change
- `src/server/actions/generate-actions.ts` — generation pipeline already supports multi-ref, used as-is
- `src/components/studio/` — wizard is separate, no changes
- `src/lib/prompts.ts` — carousel prompts are built in carousel-actions.ts, existing prompt utils reused

---

## 8. Pre-Generation Prompt Review

Before generating a carousel, users can review and edit what the AI is about to create.

### Flow

1. User picks a format (or AI suggests one) → clicks Generate
2. **Instead of immediately generating**, show a **prompt preview step**:

```
┌───────────────────────────────────────────────┐
│ Gym Day Photo Dump — 6 slides           [Edit]│
├───────────────────────────────────────────────┤
│ 1. Mirror selfie, matching sports set,        │
│    confident pose, gym lighting                │
│ 2. Mid-workout deadlift action shot            │
│ 3. Close-up gym bag / shoes detail             │
│ 4. Post-workout glow, slightly sweaty          │
│ 5. Protein shake at gym juice bar              │
│ 6. Car selfie leaving gym, casual              │
├───────────────────────────────────────────────┤
│ ┌──────────────────────────────────────────┐  │
│ │ Add instructions: "make slide 1 in a     │  │
│ │ black sports bra instead"                │  │
│ └──────────────────────────────────────────┘  │
│                                               │
│ [← Back]                [Generate All →]      │
└───────────────────────────────────────────────┘
```

3. User can:
   - Read the slide descriptions to understand what they'll get
   - Type additional instructions in a text field (applied to all slides)
   - Click "Edit" to modify individual slide descriptions inline
   - Click "Generate All" when satisfied
4. The user instructions get appended to each slide's prompt as context

### Skip option

Power users who just want speed can hold Shift+click or we add a "Quick Generate" option that skips the preview. But the default shows the preview — helps users understand what they're getting and builds trust.

---

## 9. Chrome Extension — Carousel Collection

The existing Chrome extension (`tools/chrome-extension/`) collects reference images from Instagram. It needs to understand carousel structure so we can build a library of real carousel examples.

### What to collect

When the extension detects a carousel post on Instagram:
- Save all slides as separate images (already supports this via interceptor)
- Save the **carousel structure**: slide count, which slide is the cover, slide order
- Save the **caption** and **hashtags** from the post
- Save the **post type** as "carousel" (vs "single" or "reel")
- Tag with the account's niche if detectable

### How this informs our template library

Collected carousels become training data:
- Analyze real carousel structures → refine our format recipes
- See what slide orderings perform (hook types, closer types)
- Extract common patterns (how many outfit changes, what scenes pair well)
- Build a "real examples" reference that the AI can draw from when suggesting formats

### Files to update
- `tools/chrome-extension/content-instagram.js` — detect carousel posts, extract all slides + metadata
- `tools/chrome-extension/background.js` — store carousel structure alongside images
- `src/app/api/reference/route.ts` — accept carousel metadata in the upload payload

---

## 10. What's NOT in Scope

- Canvas/node editor (future — captured in IDEAS.md)
- Video generation (Kling 3.0 — separate spec)
- Content scheduling/posting to Instagram (separate spec)
- Analytics/performance tracking (needs data first)
- Backwards-looking content planning ("you haven't posted X") — needs usage history
- Remotion integration for video assembly (separate spec)
- Product image upload as reference (separate spec, complements this)
