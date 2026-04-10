# Creator Studio Redesign — Single-Page Wizard + Sample Content

> Date: 2026-03-28
> Status: Draft

---

## Problem

The current wizard has 6 tabs (Describe, Basics, Face, Hair, Body, Style) that feel clinical and overwhelming. Users don't think in terms of "eye shape" or "hair texture" — they think "I want a girl that looks like this" or "hot blonde fitness girl." The tab-heavy interface causes friction and doesn't support the #1 use case: uploading a reference photo.

## Solution

Replace the multi-tab wizard with a **single scrollable page** that supports three input modes (describe, upload reference, fine-tune) — all visible at once, any combination works.

---

## 1. Single-Page Creator Studio

### Layout

Single stacked column — no side panels. Same layout on desktop and mobile. The studio modal keeps the same shell (overlay, header with step indicator, footer with actions) but the body is one scrollable column with a compact preview strip at the top.

```
┌──────────────────────────────────────────────┐
│ ← Create Your Influencer       1 · 2 · 3    │
├──────────────────────────────────────────────┤
│  [silhouette]  Female · 23-27 · Athletic     │  ← compact preview strip
├──────────────────────────────────────────────┤
│                                               │
│  Describe them                                │
│  ┌──────────────────────────────────────┐    │
│  │ textarea...                          │    │
│  └──────────────────────────────────────┘    │
│                                               │
│  Upload a reference                           │
│  [Face]  [Body]  [Full]                       │
│  ○ Exact look   ○ Inspired by                 │
│                                               │
│  ▸ Fine-tune (optional)                       │
│  Gender · Age · Ethnicity · Build · Vibe      │
│                                               │
├──────────────────────────────────────────────┤
│  5 credits                    [ Generate ]    │
└──────────────────────────────────────────────┘
```

During generating/picking phases, the preview strip expands to full-body content (shimmer grid → 4 image grid). No split panels at any phase — everything is one column.

### Input Sections

**Describe (top, always visible)**
- Textarea with placeholder: `"25 year old latina, long dark wavy hair, athletic, warm fitness influencer vibe..."`
- AI auto-enhances via Grok Fast (Gemini Flash fallback) before generation
- If text is present, it takes priority over fine-tune traits

**Upload a Reference (middle)**
- Three drop zones: Face ref, Body ref, Full ref
- Each is optional — user can upload any combination
- Drag-and-drop or click to upload
- Toggle: **Exact look** vs **Inspired by**
  - Exact: "That exact woman/man from the reference image" — recreates the person
  - Inspired by: "A woman/man inspired by the reference image, but a completely different person" — takes the vibe, creates someone new
- Reference images passed as `inlineData` to Gemini (supports up to 14 refs)
- Small thumbnail preview after upload with X to remove

**Fine-tune (bottom, collapsible)**
- Collapsed by default, expandable via "Fine-tune (optional)" toggle
- All options on one flat scrollable area — no sub-tabs
- Options kept:
  - **Gender**: Female / Male (two cards)
  - **Age range**: 18-22 / 23-27 / 28-35 / 36+ (chips)
  - **Ethnicity**: European, Latina, East Asian, South Asian, Black, Middle Eastern, Mixed (chips)
  - **Build**: gender-specific (Female: Slim, Athletic, Slim Thick, Full Figure / Male: Slim, Athletic, Muscular, Average)
  - **Chest size**: Small, Medium, Medium-Large, Large (female only, chips)
  - **Vibe**: Girl Next Door, Glamorous, Sultry, Fitness, Baddie, Soft & Sweet, Sophisticated, Natural Beauty (up to 3, cards with emoji)
- **Removed** (these come from description or reference image): eye color, eye shape, face shape, lips, features, hair color, hair length, hair texture, skin tone, height, expression, custom body, custom features

### Input Priority

When multiple inputs are provided, the system merges them:

1. **Reference images** anchor the visual (face, body, or both)
2. **Description** (if provided) is enhanced by Grok/Flash and used as the text prompt
3. **Fine-tune traits** fill gaps — if no description, traits are used to build the prompt via `buildWizardPrompt()`
4. **If nothing is provided** — gender is required, everything else has defaults

### Prompt Assembly Logic

```
if (referenceImages.length > 0) {
  // Reference mode — minimal text, let images do the work
  prompt = buildReferencePrompt(traits, description, mode: "exact" | "inspired")
  // Pass all ref images as inlineData
} else if (description.trim()) {
  // Describe mode — enhance with Grok/Flash
  prompt = await enhanceDescribePrompt(description)
  // Wrap with silhouette template
} else {
  // Fine-tune only — build from traits
  prompt = buildWizardPrompt(traits)
  // Wrap with silhouette template
}
```

---

## 2. Wizard Flow (Simplified)

### Phases

```
customize → generating → picking → finishing
```

Validation phase is **removed**. It added 30s of friction and 5 extra API calls for a step users don't care about during onboarding.

### Phase: Customize
- Compact preview strip at top (silhouette + trait tags)
- Below: scrollable single-page form (describe, upload, fine-tune)

### Phase: Generating
- Preview strip expands to full body area
- 4 shimmer cards in 2x2 grid
- Spinner: "Creating your influencer... Usually takes 20-30 seconds"

### Phase: Picking
- 4 generated images in 2x2 grid (full body area)
- Click to select, zoom button on hover
- "More Like This" regenerates with selected as reference
- "Refine" shows text input for adjustments
- Footer: "Use This Look" → finishing

### Phase: Finishing
- Selected image displayed prominently
- Name input + Niche chip selector below
- Footer: "Create" → saves to DB → triggers sample content → redirects to workspace

---

## 3. Post-Wizard: Auto Sample Content

When the user finishes the wizard and their creator is saved:

1. `finalizeCreator()` saves to DB, returns `creatorId`
2. Immediately triggers `generateSampleContent(creatorId)` — fires 3 UGC-style image generations in parallel using the creator's base image as reference
3. User is redirected to the workspace where posts appear as they complete (shimmer → image)

### Sample Content Prompts

Three scenes, all UGC-style (not studio):

```
Scene 1 — Coffee Shop:
"That exact [woman/man] from the reference image.
Relaxed and confident at a trendy coffee shop, wearing a casual oversized sweater.
Looking at their phone with a subtle smile, iced latte on the table.
Shot on iPhone, candid, warm natural light from the window.
Visible pores, photorealistic."

Scene 2 — Gym:
"That exact [woman/man] from the reference image.
Post-workout glow, wearing [matching sports set / tank top and joggers].
Mirror selfie in a modern gym, slightly sweaty, confident expression.
Shot on iPhone, candid, gym fluorescent lighting.
Visible pores, photorealistic."

Scene 3 — Going Out:
"That exact [woman/man] from the reference image.
Dressed up for a night out, [fitted dress and heels / fitted shirt and dark jeans].
Standing on a city street at golden hour, looking back at the camera.
Shot on iPhone, candid, golden hour lighting.
Visible pores, photorealistic."
```

### Credit Cost
- Creator wizard: 5 credits (4 images)
- Sample content: 3 credits (3 images) — **free for first creator**
  - Check `user.creators.count === 0` before deducting
  - If first creator, skip credit deduction for sample content
  - Partial failures (e.g. 1 of 3 succeeds) do not charge regardless

---

## 4. Reference Upload — Technical Implementation

### Client Side
- File input (hidden) + drag-and-drop zone per slot (face, body, full)
- Accept: image/jpeg, image/png, image/webp
- Max size: 10MB per image
- Client-side resize to max 1024px on longest edge before upload (reduce API payload)
- Store as base64 data URL in component state (not uploaded to S3 until generation)
- Show thumbnail preview with remove button

### Server Side
- New server action: `generateCreatorImagesWithRef(traits, description, referenceImages, mode)`
- Modify `generateWithRetry()` to accept an **array** of reference images (currently only accepts one). The Gemini `contents` array becomes `[{ text: prompt }, ...refs.map(r => ({ inlineData: r }))]`
- Reference images passed as `inlineData` entries to Gemini alongside text prompt
- Each ref has a role label in the prompt:
  - Face: "The first reference image shows the face to recreate."
  - Body: "The second reference image shows the body type to match."
  - Full: "The reference image shows the full person to recreate."

### Prompt Structure for Reference Mode

**Exact mode:**
```
Reference: [role descriptions for each uploaded image]
Create a photorealistic portrait of that exact person.
[description or trait-based details if provided]
[Silhouette composition template still used for framing]
Canon EOS R5. Visible pores, photorealistic.
```

**Inspired by mode:**
```
Reference: [role descriptions for each uploaded image]
Create a completely different person inspired by the reference — similar vibe and aesthetic, but a unique individual.
[description or trait-based details if provided]
[Silhouette composition template still used for framing]
Canon EOS R5. Visible pores, photorealistic.
```

---

## 5. Files to Change

### Delete
- `src/components/studio/studio-tabs.tsx` — replaced by single-page
- `src/components/studio/studio-describe.tsx` — unused (describe UI was moved inline into studio-tabs.tsx, now replaced entirely)
- `src/components/studio/tabs/basics-tab.tsx`
- `src/components/studio/tabs/face-tab.tsx`
- `src/components/studio/tabs/hair-tab.tsx`
- `src/components/studio/tabs/body-tab.tsx`
- `src/components/studio/tabs/style-tab.tsx`
- `src/lib/ai/prompt-enhancer.ts` — superseded by `enhanceDescribePrompt()` in generate-actions.ts

### Create
- `src/components/studio/studio-create-page.tsx` — the single-page input form (describe + upload + fine-tune)
- `src/components/studio/reference-upload.tsx` — drag-and-drop reference image component
- `src/server/actions/sample-content-actions.ts` — generates 3 sample posts after wizard

### Modify
- `src/components/studio/creator-studio.tsx` — render `StudioCreatePage` instead of `StudioTabs` during customize phase
- `src/components/studio/studio.css` — add styles for reference upload, single-page layout, collapsible fine-tune (existing styles like gen grid, shimmer, lightbox stay)
- `src/components/studio/studio-preview.tsx` — remove `ValidatingPreview` component and `phase === "validating"` rendering
- `src/components/studio/studio-footer.tsx` — handle reference images in generate flow, trigger sample content after finalize, remove `phase === "validating"` block and `handleValidate()`, change finishing Back button from `setPhase("validating")` to `setPhase("picking")`
- `src/lib/prompts.ts` — add `buildReferencePrompt()` for exact/inspired modes, add sample content prompts, remove `VALIDATION_SCENES` and `buildValidationPrompt()` (dead code after validation removal)
- `src/server/actions/generate-actions.ts` — add `generateCreatorImagesWithRef()`, modify `generateWithRetry()` to accept array of reference images, remove `generateValidationImages()` (dead code)
- `src/stores/studio-store.ts` — remove tabs/describeMode/validationImages/validationKeys, add referenceImages state, add referenceMode (exact/inspired), simplify traits to only kept fields

### No Change
- `src/components/studio/studio-finishing.tsx` — name + niche stays as-is

---

## 6. What's NOT in Scope

- Content generation workspace (input bar for making new posts) — separate spec
- Stripe/billing integration — separate spec
- Video generation — future
- Voice generation — future
- Prompt enhancement improvements — current Grok/Flash pipeline is sufficient
