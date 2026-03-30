# Admin Public Reference Generator — Design Spec

**Date:** 2026-03-30
**Status:** Approved
**Scope:** Admin tool for creating public references from Instagram photos + scratch generation, new PublicReference model, separate admin generation actions.

---

## Overview

Admin panel tool that creates public reference images for the platform's curated library. Takes collected Instagram photos as inspiration and generates clean reference images (backgrounds, outfits, products, etc.) using Gemini NBPro. Users see these as a neutral "Reference Library" — no source attribution, no indication of origin.

**Separate from user references:** `PublicReference` is a platform-level model. User `Reference` is per-creator, private. They share the same types (BACKGROUND, PRODUCT, OUTFIT, POSE, CUSTOM) but are different tables with different access patterns.

**Separate admin generation logic:** New `src/server/actions/admin-generate-actions.ts` — admin generation stays isolated from user-facing generation in `generate-actions.ts` and `carousel-actions.ts`. Components can be shared, functionality stays separate.

---

## 1. Data Model

### 1.1 PublicReference

```prisma
model PublicReference {
  id            String   @id @default(cuid())
  type          String   // BACKGROUND, PRODUCT, OUTFIT, POSE, CUSTOM
  name          String   // "Modern Gym", "Cozy Bedroom"
  description   String   @default("") // Used in prompt building
  imageUrl      String   // S3 key
  tags          String[]
  category      String   // "fitness", "lifestyle", "fashion", "beauty", "travel", "general"
  popularity    Int      @default(0) // Tracks usage across all users
  isActive      Boolean  @default(true) // Can hide without deleting

  // Internal admin fields — never exposed to users
  sourcePostId  String?  // Links to ReferencePost if generated from Instagram
  sourcePost    ReferencePost? @relation(fields: [sourcePostId], references: [id])
  curatedBy     String?  // Admin clerk ID who created it
  generationPrompt String? // The prompt used to generate this reference
  generationModel  String? // Model used (e.g. "gemini-3-pro-image-preview")

  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  @@index([type])
  @@index([category])
  @@index([isActive])
}
```

Add relation to `ReferencePost`:
```prisma
// In ReferencePost model, add:
  publicReferences PublicReference[]
```

### 1.2 S3 Path

Public references stored at: `public-references/{type}/{id}.jpg`

Separate from user references (`users/{userId}/creators/{creatorId}/references/`).

### 1.3 Categories

| Category | Description |
|----------|-------------|
| fitness | Gyms, workout spaces, sports equipment |
| lifestyle | Bedrooms, living rooms, coffee shops, restaurants |
| fashion | Outfits, accessories, shoes |
| beauty | Makeup, skincare products, vanity setups |
| travel | Beaches, hotels, city streets, landmarks |
| general | Cars, food, pets, miscellaneous |

---

## 2. Admin Generate Page (`/admin/generate`)

New admin page, separate from `/admin/references` (which stays as the Instagram browser).

### 2.1 Layout

Two-panel layout:
- **Left panel:** Source selection — browse Instagram posts or start from scratch
- **Right panel:** Generation workspace — prompt, controls, result preview, publish form

### 2.2 Source Selection (Left Panel)

**From Instagram Post:**
- Compact grid of collected posts (reuse existing `PostGrid` data, simplified view)
- Click a post to load it as the source image
- Shows the post image + metadata (setting, outfit, lighting from our classification)

**From Scratch:**
- "Start Fresh" button — clears the source, generation is prompt-only

### 2.3 Generation Workspace (Right Panel)

**When a source post is selected:**
- Source image thumbnail displayed
- Quick-action buttons:
  - "Extract Background" → pre-fills prompt: "Generate a clean reference photo of this location/scene without any people. [source metadata description]. Natural lighting, empty space, suitable as a background reference."
  - "Extract Outfit" → pre-fills prompt: "Generate a photo of this outfit/clothing style on a neutral background. [outfit metadata]. Clean product-style shot."
  - "Generate Inspired" → pre-fills prompt with source metadata, user customizes
- Custom prompt textarea (editable, the quick-actions just pre-fill)
- Source image passed to Gemini as `inlineData` reference
- "Generate" button → calls NBPro → shows result

**When starting from scratch:**
- Empty prompt textarea
- No source image reference — pure text-to-image
- "Generate" button → calls NBPro → shows result

**Generation settings:**
- Count: 1-4 images per generation (see multiple options)
- No safety filters (BLOCK_NONE, same as user generation)

### 2.4 Result & Publish

After generation:
- Grid of generated images (1-4)
- Click to select the best one
- **Publish form:**
  - Type dropdown (Background, Product, Outfit, Pose, Custom)
  - Name input
  - Description textarea (for prompt building — "Modern gym with mirrors and weights, overhead fluorescent lighting")
  - Tags input (comma-separated)
  - Category dropdown (fitness, lifestyle, fashion, beauty, travel, general)
  - AI auto-analyze option (same Gemini Flash analysis as user references)
- "Publish to Library" button → uploads to S3, creates `PublicReference` record
- "Regenerate" button → try again with same/modified prompt

### 2.5 Quick Publish from Post Grid

Optional shortcut on the existing `/admin/references` post grid:
- New "Generate Reference" button on each post card
- Clicking it navigates to `/admin/generate` with that post pre-loaded as source
- Faster workflow when browsing posts and spotting good reference material

---

## 3. Server Actions

### 3.1 New File: `src/server/actions/admin-generate-actions.ts`

All admin generation logic lives here. Uses `assertAdmin()` pattern from existing `admin-actions.ts`.

```typescript
// Generate reference image(s) from prompt + optional source image
adminGenerateReference(
  prompt: string,
  sourcePostId?: string,  // If from Instagram post
  count?: number          // 1-4 images
) → { success: true, images: { base64: string, key: string }[] }
  | { success: false, error: string }

// Publish a generated image as a public reference
publishPublicReference(
  imageKey: string,        // S3 key from generation
  type: ReferenceType,
  name: string,
  description: string,
  tags: string[],
  category: string,
  sourcePostId?: string,
  generationPrompt?: string
) → { success: true, reference: PublicReference }
  | { success: false, error: string }

// List public references (for admin management)
getPublicReferences(filters?: { type?, category?, isActive? })
  → PublicReference[]

// Toggle active status
togglePublicReference(id: string)
  → { success: true } | { success: false, error: string }

// Delete public reference
deletePublicReference(id: string)
  → { success: true } | { success: false, error: string }

// AI auto-analyze (reuse the same Gemini Flash logic)
analyzePublicReferenceImage(imageBase64: string)
  → { type, name, description, tags, category }
```

### 3.2 Generation Pipeline

```
Source post selected?
  → Yes: Fetch image from S3, pass as inlineData to NBPro alongside prompt
  → No: Text-only prompt to NBPro

NBPro generates image(s)
  → Strip metadata (same stripAndRewrite pipeline)
  → Upload to temp S3 path: `public-references/temp/{timestamp}-{index}.jpg`
  → Return preview URLs

Admin reviews and selects best image
  → On publish: move from temp to final path: `public-references/{type}/{id}.jpg`
  → Create PublicReference DB record
```

---

## 4. User-Facing Integration (Future — Part of Content Studio Plan 2)

When the Content Studio ships, the reference panel gets two tabs:
- **"My References"** — user's private per-creator references (existing `Reference` model)
- **"Browse Library"** — platform's curated public references (`PublicReference` model, `isActive: true`)

Both work identically in generation — passed as `inlineData` to Gemini. The only difference is ownership and visibility.

New server action (added when Content Studio ships):
```typescript
getPublicReferencesForUser(filters?: { type?, category? })
  → PublicReferenceItem[] (signed URLs, no admin fields)
```

---

## 5. Components

```
src/app/admin/generate/
  page.tsx                          — Main generate page layout
src/components/admin/generate/
  source-selector.tsx               — Left panel: Instagram post browser + "Start Fresh"
  generation-workspace.tsx          — Right panel: prompt, controls, generate button
  generation-results.tsx            — Result grid + selection
  publish-form.tsx                  — Type, name, description, tags, category form
src/server/actions/
  admin-generate-actions.ts         — All admin generation logic (separate file)
```

Admin pages use Tailwind (not prototype-first CSS) — consistent with existing admin panel.

---

## 6. What's NOT in Scope

- User-facing "Browse Library" tab — that's Content Studio Plan 2
- Batch generation (generate 50 references at once) — future
- Auto-curation (AI picks the best Instagram posts to turn into references) — future
- Video reference extraction (frame capture) — future, when video pipeline ships
- Public reference analytics (which refs are most popular) — future, just track `popularity` counter for now
