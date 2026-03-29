# Carousel Builder Dialog

> Date: 2026-03-29
> Status: Draft
> Replaces: The hardcoded "Make Carousel" suggestion cards in content-detail.tsx

---

## Problem

Current "Make Carousel" shows 4 hardcoded format suggestions with no intelligence. No understanding of what the photo is. No ability to customize slides, add products, or preview what will be generated. Users need a proper builder that's smart, click-driven, and powerful.

## Solution

A dedicated carousel builder dialog that opens when clicking "Make Carousel" on any photo. Three phases in one dialog: Pick → Preview → Result.

---

## Phase 1: Pick Format

When the dialog opens, AI analyzes the original photo's prompt + creator niche and suggests 3-4 carousel formats that make sense for THIS specific photo.

```
┌──────────────────────────────────────────────────┐
│ Make Carousel                                  ✕ │
├──────────────────────────────────────────────────┤
│ ┌──────────┐  This photo becomes slide 1.        │
│ │ original │  Pick a format and we'll generate    │
│ │  photo   │  the rest to match.                  │
│ └──────────┘                                     │
│                                                  │
│ ┌────────────────────────────────────────────┐   │
│ │ 📸 Photo Dump — Gym Day          5 slides  │   │
│ │ Workout action, protein shake, post-gym    │   │
│ │ glow, car selfie leaving                   │   │
│ │ 2x saves vs single posts     [Build This →]│   │
│ └────────────────────────────────────────────┘   │
│ ┌────────────────────────────────────────────┐   │
│ │ 💪 Outfit Showcase              3 slides   │   │
│ │ Street style angle, golden hour hero       │   │
│ │ Drives link clicks             [Build This →]│  │
│ └────────────────────────────────────────────┘   │
│                                                  │
│ ┌──────────────────────────────────────────────┐ │
│ │ Or describe what you want...                 │ │
│ └──────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────┘
```

**AI suggestion logic:**
- Server action receives: original photo's prompt, creator niche, creator vibes
- Grok analyzes and picks 3-4 formats from CAROUSEL_FORMATS that fit
- Each suggestion includes a 1-line TLDR of what slides 2-N will be (NOT just the format description — actual slide-specific descriptions based on the photo context)
- Freeform input at bottom for power users to describe what they want

**The original photo:**
- Displayed prominently as the anchor
- Becomes slide 1 of the carousel — no regeneration, no credit cost
- Linked to the ContentSet as slideIndex: 1

---

## Phase 2: Preview & Customize Slides

After picking a format (or typing a freeform request), the dialog transitions to show all proposed slides as editable TLDRs.

```
┌──────────────────────────────────────────────────┐
│ Photo Dump — Gym Day              5 slides     ✕ │
├──────────────────────────────────────────────────┤
│                                                  │
│ ① [original photo]  ✓ Your photo (no cost)       │
│                                                  │
│ ② Workout action — mid-deadlift, intense,        │
│    same sports set                          [Edit]│
│                                                  │
│ ③ Protein shake — gym juice bar, casual,          │
│    refueling                                [Edit]│
│    + Add product: [describe item or upload...]    │
│                                                  │
│ ④ Post-workout glow — slightly sweaty,            │
│    accomplished                             [Edit]│
│                                                  │
│ ⑤ Car selfie — leaving gym, hoodie,               │
│    casual outro                             [Edit]│
│                                                  │
│ ┌──────────────────────────────────────────────┐ │
│ │ Add instructions for all slides...           │ │
│ └──────────────────────────────────────────────┘ │
│                                                  │
├──────────────────────────────────────────────────┤
│ 4 slides × 1 credit = 4 credits                 │
│ [← Back]                     [Generate All →]    │
└──────────────────────────────────────────────────┘
```

**Per-slide customization:**
- Each slide shows a TLDR of what will be generated (scene + outfit + mood)
- Click "Edit" to inline-edit the description
- "Add product" on any slide — type a description ("green protein shake by XYZ brand") or upload a product image. This gets injected into that slide's prompt as: "holding/using [product description]"
- Global instructions input at bottom — applies to all slides ("make everything more casual", "she should be smiling in all of them")

**What goes into the final image prompt (per slide):**
ONLY scene description. No meta-context. Conservative tokens:
```
That exact [woman/man] from the reference image.
[scene setting]. [lighting].
Wearing [outfit]. [mood].
[product if specified: "Holding a green protein shake"]
[user instructions if any]
Shot on iPhone, candid. Eyes open, looking directly at camera. Visible pores, photorealistic.
```

**Reference images passed to Gemini per slide:**
- Creator's base image (always — for face/body consistency)
- Product image (if user uploaded one for that slide)
- Background reference (if user uploaded one — future, not in this build)

**Credit display:**
- Shows total: "4 slides × 1 credit = 4 credits"
- Slide 1 is free (existing photo)

---

## Phase 3: Result (Carousel Detail)

After generation, the dialog transitions to the carousel detail view we already built:
- Grid view of all slides (including original photo as slide 1)
- Instagram preview mode
- Per-slide regeneration with feedback
- Caption + hashtag editor with rewrite chips
- Download All / Copy Caption

This is the existing CarouselDetail component — no changes needed.

---

## Data Flow

### Creating the carousel from a photo:

1. User clicks photo → content detail → "Make Carousel"
2. `suggestCarouselFormats(contentId)` server action:
   - Loads the content record (has prompt, creator info)
   - Sends prompt + niche + vibes to Grok
   - Grok returns 3-4 format suggestions with per-slide TLDRs
3. User picks a format → phase 2 (preview)
4. User optionally edits slides, adds products, adds instructions
5. `generateCarouselFromPhoto(contentId, formatId, slideEdits, globalInstructions)` server action:
   - Creates ContentSet with the original photo as slide 1 (no generation)
   - Generates slides 2-N in parallel
   - Each slide prompt: scene only, creator ref, product ref if any
   - Returns completed ContentSet
6. Dialog transitions to carousel detail (phase 3)

### Server actions needed:

**New: `suggestCarouselFormats(contentId)`**
- Input: content ID (the photo to build from)
- Loads photo's prompt, creator niche/vibes
- Calls Grok to suggest 3-4 formats with slide-specific TLDRs
- Returns: `{ suggestions: { formatId, slideDescriptions: string[] }[] }`

**Modified: `generateCarousel` → `generateCarouselFromPhoto`**
- New param: `sourceContentId` — the photo that becomes slide 1
- Links existing content to the ContentSet (slideIndex 1)
- Only generates slides 2-N (saves 1 credit)
- Accepts per-slide edits and product descriptions

---

## Per-Slide Product/Item Support

Users can add a product to any slide:

**UI:** Each slide in the preview has a "+ Add product" link. Clicking shows:
```
┌──────────────────────────────────────────┐
│ Describe the product: [text input       ]│
│ Or upload an image:   [Choose File]      │
└──────────────────────────────────────────┘
```

**Prompt injection:** If a product is specified for a slide, append to the prompt:
- Text only: `Holding a [product description], product clearly visible`
- Image uploaded: pass as additional reference image to Gemini alongside creator ref

**Not in scope for this build:**
- Product/item library (save products for reuse) — captured in IDEAS
- Background/scene reference upload — captured in IDEAS
- Adding other people/characters — future feature

---

## Files to Change

### Create
- `src/components/workspace/carousel-builder.tsx` — the 3-phase dialog (pick → preview → result)

### Modify
- `src/server/actions/carousel-actions.ts` — add `suggestCarouselFormats()`, modify `generateCarousel` to accept `sourceContentId`
- `src/components/workspace/content-detail.tsx` — wire "Make Carousel" to open the builder dialog
- `src/components/workspace/workspace-canvas.tsx` — render CarouselBuilder dialog
- `src/app/workspace/workspace.css` — builder dialog styles

### No Change
- `src/data/carousel-formats.ts` — existing format data used as-is
- `src/data/scenes.ts` — existing scene data used as-is
- `src/components/workspace/carousel-detail.tsx` — used as phase 3, no changes

---

## What's NOT in Scope

- Product/item library (save and reuse products) — IDEAS.md
- Background/scene reference upload — IDEAS.md
- Adding other people/characters to slides — future
- Video slides in carousels — future
- Different aspect ratios per slide — all 4:5 (Instagram standard)
