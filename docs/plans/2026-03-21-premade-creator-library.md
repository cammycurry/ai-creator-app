# Pre-Made Creator Library — Build Plan

## The Idea

Source inspiration from real AI creators on Instagram. Use Gemini (Nano Banana Pro) to generate our own original characters based on those vibes — not copies, but inspired-by. Each pre-made gets:

1. **Base reference image** — the standard waist-up, white studio, raw iPhone photo (same format as the creator wizard output)
2. **3-4 Instagram-style content photos** — lifestyle shots showing what content looks like with this creator (gym, coffee shop, beach, etc.)
3. **Character profile** — name, niche, vibe, description

Users browse visually, see example content, pick one, and can tweak before adopting ("make hotter", "change hair color", "make younger", etc.).

---

## Phase 1: Source & Define Characters (Manual — You on Instagram)

Browse Instagram AI creator accounts. For each one you like, capture:

| Field | Example |
|-------|---------|
| **Inspiration handle** | @some_ai_creator (internal reference only, never shown) |
| **Name** | "Mia Solana" |
| **Gender** | Female |
| **Age range** | 23-26 |
| **Ethnicity** | Latina |
| **Build** | Athletic / Slim / Curvy / etc. |
| **Hair** | Long dark wavy |
| **Eyes** | Brown |
| **Skin tone** | Medium olive |
| **Vibe** | "Warm fitness girl, golden hour aesthetic" |
| **Niche** | Fitness, Lifestyle |
| **Content style notes** | "Lots of gym selfies, outdoor runs, smoothie prep" |
| **What makes them pop** | "Natural beauty, no heavy makeup, approachable" |

**Target: 30-50 characters** across these niches:
- Fitness (6-8)
- Lifestyle (6-8)
- Beauty/Skincare (5-7)
- Fashion (5-7)
- Tech/Productivity (3-4)
- Travel (3-4)
- Food/Cooking (2-3)
- Luxury/High-End (2-3)

Save this as a JSON file: `src/data/premade-catalog.ts`

Each entry has the sourcing info + the traits needed for generation. The inspiration handle is **never** stored in the final product — it's just your research reference.

---

## Phase 2: Generate Base Images (Automated Script)

Build a one-time script that generates the base reference image for each pre-made using our existing `buildCreatorPrompt()` + Gemini pipeline.

### Script: `scripts/generate-premades.ts`

```
For each character in premade-catalog:
  1. Build traits from catalog entry
  2. Call buildCreatorPrompt(traits)
  3. Generate 4 images via Gemini (same as wizard)
  4. Upload all 4 to S3: premades/{id}/base-{0-3}.jpg
  5. Display URLs for manual review
```

**You manually pick the best one** for each character. Save the chosen S3 key as `baseImageKey` in the catalog.

### Script: `scripts/generate-premade-content.ts`

After base images are picked, generate 3-4 lifestyle photos per character:

```
For each character:
  1. Load base image key
  2. Generate content prompts based on niche:
     - Fitness: "That woman at the gym, doing cable pulldowns, wearing black athletic wear, mirror selfie angle"
     - Lifestyle: "That woman sitting at a cafe, golden hour light through window, holding a latte"
     - Beauty: "That woman applying skincare, bathroom mirror, morning light, clean minimal aesthetic"
     - Fashion: "That woman walking on a city street, wearing [style], editorial candid shot"
  3. Generate via Gemini with base image reference
  4. Upload to S3: premades/{id}/content-{0-3}.jpg
  5. Strip metadata (same as production pipeline)
```

---

## Phase 3: Data Structure

### `src/data/premade-catalog.ts`

```typescript
export type PreMadeCreator = {
  id: string;
  name: string;
  gender: "Female" | "Male";
  niche: string[];
  vibe: string;
  description: string;
  // S3 keys (pre-generated, not signed URLs)
  baseImageKey: string;
  contentImageKeys: string[];
  // Traits for generation (same as StudioTraits)
  traits: {
    gender: string;
    age: string;
    ethnicity: string;
    build: string;
    hairColor: string;
    hairLength: string;
    hairTexture: string;
    eyeColor: string;
    skinTone?: number;
    faceShape?: string;
    vibes: string[];
  };
};
```

### S3 structure
```
premades/
  mia-solana/
    base.jpg              ← The reference image
    content-0.jpg         ← Gym selfie
    content-1.jpg         ← Smoothie prep
    content-2.jpg         ← Outdoor run
    content-3.jpg         ← Golden hour portrait
  jake-voss/
    base.jpg
    content-0.jpg
    ...
```

Images are **pre-generated and static** — they don't cost credits to browse. Signed URLs are generated on page load (cached).

---

## Phase 4: UI — Visual Pre-Made Browser

### Card Design
Each pre-made card shows:
- **Hero image** — the best content photo (not the base image — base images are clinical/boring)
- **Name + niche tags** underneath
- **On hover/click** — expand to show all 3-4 content photos + base image

### Expanded View (click a card)
- Larger content gallery (the Instagram-style photos)
- Character details (name, niche, vibe, description)
- Trait summary ("Athletic build · Long dark hair · Brown eyes")
- **"Use This Creator"** button → adopts as-is
- **"Customize First"** button → opens a mini-editor

### Mini-Editor (the "make hotter" flow)
When user clicks "Customize First", show a lightweight panel:
- Sliders/chips for the traits that are most impactful:
  - Age (younger / older)
  - Build (slimmer / curvier / more athletic)
  - Hair (color, length, texture)
  - Skin tone
  - Vibe adjustments
- Freeform text input: "What would you change?" (e.g., "make her look more edgy", "add freckles", "make slightly curvier")
- **"Generate My Version"** button → takes the pre-made traits, applies user tweaks, runs through the normal wizard pipeline (costs 5 credits like building from scratch)
- After generation, same pick→validate→finalize flow as "Build Your Own"

This means: pre-made browsing is **free**, but customizing generates new images (costs credits).

---

## Phase 5: Signed URL Caching

Pre-made images are static and shared across all users. We don't want to generate signed URLs on every page load.

Options:
1. **Public bucket prefix** — make `premades/` public read (simplest, images aren't sensitive)
2. **CloudFront CDN** — put a CF distribution in front of S3 for the premades prefix
3. **Server-side cache** — cache signed URLs in memory for 6 hours (S3 default is 7 days)

**Recommendation: Option 1** — make the premades prefix public. These are marketing assets, not user content. Add a bucket policy for `premades/*` public read.

---

## Implementation Order

### Step 1: You source characters on Instagram
- Browse AI creator accounts
- Fill out the catalog spreadsheet/JSON (30-50 characters)
- Save as `src/data/premade-catalog.ts`

### Step 2: I build the generation scripts
- `scripts/generate-premade-bases.ts` — generates 4 base options per character
- You review and pick winners
- `scripts/generate-premade-content.ts` — generates 3-4 content photos per character
- You review and pick/re-roll

### Step 3: I build the visual browser UI
- Replace the text-card grid with image-first cards
- Add expanded view with content gallery
- Add the "Customize First" mini-editor flow
- Server action to resolve pre-made S3 keys to URLs

### Step 4: Wire up "Customize First"
- Pre-populate studio traits from pre-made catalog
- Apply user tweaks (text input + trait changes)
- Run through normal wizard pipeline
- Same pick→validate→finalize flow

### Step 5: Make premades prefix public
- Update S3 bucket policy
- Use direct URLs instead of signed URLs for premade images

---

## Estimated Costs

- **Base images**: 50 characters × 4 options = 200 Gemini calls ≈ $4
- **Content photos**: 50 characters × 4 photos = 200 Gemini calls ≈ $4
- **Re-rolls**: ~100 extra calls ≈ $2
- **Total**: ~$10 in API costs for the full library

---

## What You Need To Do First

1. Go on Instagram, find 30-50 AI creators you like
2. For each one, note: name idea, gender, age, ethnicity, build, hair, eyes, vibe, niche, what makes them compelling
3. Save it in any format (spreadsheet, notes, JSON) — I'll convert it to the catalog format
4. We generate, you review, we ship
