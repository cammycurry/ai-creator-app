# Library V2 + Reference Usage Modes — Design Spec

## Goal

Redesign the Library page as a full-viewport experience matching the Studio's visual style. Add reference usage modes (Exact, Same Scene, Vibe) that change how references are applied during generation.

## Architecture

The Library page becomes a full-page version of the studio's content browser — same data, same interactions, more room. Reference usage modes are an attachment-level property (not stored on the reference itself) that changes how the generation pipeline uses the reference image.

---

## 1. Library Page Redesign

### Current Problems
- Library was designed before Studio V3 — looks dated
- Overlaps with Studio Content Browser but looks different
- Small grid, cramped layout
- Not visually consistent with the studio

### New Design

The Library page at `/workspace/library` is a **full-viewport overlay** (like the Studio) with:

```
┌──────────────────────────────────────────────────────────────┐
│  ×  Library                                    [+ Upload]    │
├──────────────────────────────────────────────────────────────┤
│  [My Library]  [Public Library]  [Starred]                   │
│                                                              │
│  🔍 Search...                          Sort: [Newest ▾]     │
│                                                              │
│  [All] [Backgrounds] [Outfits] [Products] [Poses] [Moods]   │
│                                                              │
│  24 references                                               │
│                                                              │
│  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐          │
│  │     │ │     │ │     │ │     │ │     │ │     │          │
│  │     │ │     │ │     │ │     │ │     │ │     │          │
│  └─────┘ └─────┘ └─────┘ └─────┘ └─────┘ └─────┘          │
│  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐          │
│  │     │ │     │ │     │ │     │ │     │ │     │          │
│  │     │ │     │ │     │ │     │ │     │ │     │          │
│  └─────┘ └─────┘ └─────┘ └─────┘ └─────┘ └─────┘          │
│                                                              │
│  Click any reference to preview, edit, star, or delete       │
└──────────────────────────────────────────────────────────────┘
```

### Key changes from current:
- Full-viewport overlay (already done) with proper header
- **Responsive grid** — 4-6 columns instead of 3-4, filling the full width
- **Larger cards** — more visual, better thumbnails
- **Card hover** — shows star button + type badge (same style as studio browser)
- **Card click** — opens detail modal (same as current, but styled to match)
- **Recently Used strip** — horizontal strip at top of My Library tab (already designed, may need visual polish)
- **Upload button prominent** in header (terracotta, always visible)
- Consistent badge/card style with studio's `sv3-browser-item`

### Shared Components
The Library page and Studio Content Browser should share card rendering. Extract a `<RefCard>` component used by both:
- Thumbnail with type badge
- Star button (hover reveal, always visible if starred)
- Click handler (different per context — Library opens detail, Studio attaches ref)

### Tabs stay the same:
- **My Library** — your uploaded refs, filter by type/tag, search, sort
- **Public Library** — admin-curated public refs, browse by category
- **Starred** — your favorited refs

---

## 2. Reference Usage Modes

### The Three Modes

When a reference is attached to a generation, the user picks HOW it should be used:

**Exact** (default)
- The generated image should look exactly like this reference
- Implementation: image passed as `inlineData` to Gemini + prompt includes "match this reference exactly, same scene/setting/composition"
- Use case: "Here's the gym — put my creator in this exact gym"

**Same Scene**
- Similar setting/context but with creative freedom on pose, angle, lighting
- Implementation: image passed as `inlineData` + prompt includes "similar setting to the reference image, but with creative freedom on pose and composition"
- Use case: "Same bedroom, but laying in bed scrolling phone"

**Vibe**
- Capture the mood/energy/aesthetic, but the output can look completely different
- Implementation: AI analyzes the reference image → extracts a text description of the mood, lighting, color palette, energy → uses THAT description in the prompt instead of passing the image
- Use case: "Cozy warm golden hour energy" from a sunset photo
- Requires an extra AI call: `analyzeReferenceVibe(imageBase64) → string` (Gemini Flash)

### Where Mode is Set

The mode is set at **attachment time**, not upload time. The same reference can be used as "Exact" in one generation and "Vibe" in another.

In the Creation Panel, when refs are attached (the `InlineRefs` component), each ref thumbnail shows a mode selector:

```
┌─────────────────────────────┐
│  [Beach Sunset]  ×          │
│  [🎯 Exact ▾]              │
└─────────────────────────────┘
```

Click the mode pill → dropdown: Exact / Same Scene / Vibe

### Data Model

No schema changes needed. The mode is stored in the Zustand store as part of the attachment:

```typescript
// Updated attachment type in unified-studio-store.ts
type AttachedRef = {
  ref: ReferenceItem;
  mode: "exact" | "scene" | "vibe";
};

// Replace: attachedRefs: ReferenceItem[]
// With: attachedRefs: AttachedRef[]
```

### Generation Pipeline Changes

In `content-actions.ts` (and similar for carousel, video):

```typescript
function buildContentPrompt(settings, enhancedPrompt, attachedRefs) {
  let refInstructions = "";
  const inlineImages = [];

  for (const { ref, mode } of attachedRefs) {
    if (mode === "exact") {
      inlineImages.push(ref.imageBase64 or ref.s3Key);
      refInstructions += " Match the reference image exactly — same scene, setting, and composition.";
    } else if (mode === "scene") {
      inlineImages.push(ref.imageBase64 or ref.s3Key);
      refInstructions += " Use a similar setting to the reference image, but with creative freedom on pose and framing.";
    } else if (mode === "vibe") {
      // Don't pass the image — pass the extracted vibe description instead
      const vibeDesc = await analyzeReferenceVibe(ref);
      refInstructions += ` Style and mood: ${vibeDesc}.`;
    }
  }

  return { prompt: `${enhancedPrompt}${refInstructions}`, inlineImages };
}
```

### Vibe Analysis Function

New function in `reference-actions.ts`:

```typescript
export async function analyzeReferenceVibe(imageBase64: string): Promise<string> {
  // Use Gemini Flash to extract mood/style/energy description
  // Prompt: "Describe the mood, lighting, color palette, and energy of this image in 2-3 sentences.
  //          Focus on the feeling, not the objects. This will be used as a style guide for generating
  //          new images with the same vibe."
  // Returns: "Warm golden hour lighting, soft and intimate mood, natural tones with amber highlights.
  //           Feels cozy and relaxed, like a lazy Sunday afternoon."
}
```

---

## 3. Upload Experience

### Current
Upload is through `AddReferenceDialog` — a dialog with drag-drop, AI analysis, name/type/tags fields.

### Improvements
- **More prominent** — Upload button in Library header is always visible (terracotta, "+" icon)
- **Drag-drop on the Library page itself** — drop an image anywhere on the Library page to start upload (not just inside a dialog)
- **Quick upload** — drop image, AI auto-analyzes, one-click save. No required fields except what AI fills in.
- **Batch upload** — select multiple images, each gets analyzed, review all at once, save all

### Future (not now)
- Video upload for motion transfer sources
- Instagram link paste → scrape → save as reference
- URL paste → download image → save as reference

---

## 4. Files to Change

```
MODIFY: src/components/workspace/content-library.tsx      — Full redesign with better grid, shared card style
MODIFY: src/app/workspace/library.css                     — Updated styles matching studio visual language
CREATE: src/components/workspace/ref-card.tsx              — Shared card component (Library + Studio browser)
MODIFY: src/components/studio/content/content-browser.tsx  — Use shared RefCard component
MODIFY: src/components/studio/content/inline-refs.tsx      — Add mode selector per attached ref
MODIFY: src/stores/unified-studio-store.ts                — AttachedRef type with mode, update attachRef
MODIFY: src/server/actions/content-actions.ts              — Handle ref modes in generation
MODIFY: src/server/actions/reference-actions.ts            — Add analyzeReferenceVibe function
MODIFY: src/server/actions/carousel-actions.ts             — Handle ref modes in carousel generation
```

---

## Out of Scope
- Video reference upload
- Instagram link import
- Batch upload (nice to have, not blocking)
- Reference folders/collections
- Ref mode persistence (mode resets each generation — it's contextual)
