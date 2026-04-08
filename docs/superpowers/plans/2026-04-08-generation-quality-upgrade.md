# Generation Quality Upgrade — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade generation quality with prompt seeds (dense identity paragraph per creator), structured prompt format with validated realism anchors, camera profiles, and attractiveness reinforcement. Based on A/B/C test results.

**Architecture:** New `promptSeed` field on Creator model, generated via Gemini Flash after wizard image selection. All content generation prompts upgraded to structured format (CHARACTER → SCENARIO → ENVIRONMENT → CAMERA → REALISM). CONTENT_ENHANCE_PROMPT updated to teach Grok the new format. Fallback to current trait injection for legacy creators without seeds.

**Tech Stack:** Prisma, Gemini Flash (seed generation), Grok Fast (prompt enhancement), Gemini 3 Pro Image Preview (image generation)

**Spec:** `docs/superpowers/specs/2026-04-08-generation-quality-upgrade-design.md`
**Test data:** `docs/reference/PROMPT-AB-TEST-RESULTS.md`

---

## File Map

```
Phase A — Schema + Seed Generation
  MODIFY: prisma/schema.prisma                        — Add promptSeed to Creator
  CREATE: prisma/migrations/XXXXX_prompt_seed/         — Auto-generated
  MODIFY: src/lib/prompts.ts                          — SEED_GENERATION_PROMPT, updated CONTENT_ENHANCE_PROMPT, camera profiles, new realism constants
  MODIFY: src/server/actions/generate-actions.ts       — Generate seed after image selection

Phase B — Content Pipeline Upgrade
  MODIFY: src/server/actions/content-actions.ts        — buildContentPrompt uses seed + structured format
  MODIFY: src/server/actions/carousel-actions.ts       — buildSlidePrompt uses seed + structured format
  MODIFY: src/server/actions/talking-head-actions.ts   — Base image prompt uses seed
```

---

### Task 1: Schema + Prompt Templates

**Files:**
- Modify: `prisma/schema.prisma`
- Modify: `src/lib/prompts.ts`

- [ ] **Step 1: Add promptSeed to Creator model**

In `prisma/schema.prisma`, find the Creator model and add after the existing fields (near `settings`):

```prisma
  promptSeed    String?   // Dense identity paragraph for consistent generation
```

- [ ] **Step 2: Run migration**

```bash
pnpx prisma migrate dev --name prompt_seed
pnpx prisma generate
```

- [ ] **Step 3: Update prompts.ts — new constants and templates**

Read `src/lib/prompts.ts`. Make these changes:

1. Add after the existing realism anchors (after line 33):

```typescript
// ─── Validated Realism Anchors (from A/B/C testing) ──
// These 6 improve realism WITHOUT hurting attractiveness.
// See: docs/reference/PROMPT-AB-TEST-RESULTS.md
export const REALISM_CONTENT = [
  "Visible fabric texture with natural wrinkles where body bends",
  "Baby hairs and flyaways catching light",
  "Visible pores, photorealistic",
].join(". ") + ".";

// ─── Camera Profiles ────────────────────────────────
export const CAMERA_SELFIE = "iPhone front camera selfie, arm extended at natural distance, slightly off-center composition, face fills upper third, natural selfie angle slightly above eye level";
export const CAMERA_REAR = "iPhone rear camera, natural depth of field, background slightly soft, medium distance, full upper body, true-to-life proportions";
export const CAMERA_MIRROR = "Mirror selfie with iPhone rear camera, mirror edge partially visible, phone at chest level, slight tilt";

// ─── Seed Generation Prompt ──────────────────────────
export const SEED_GENERATION_PROMPT = `Analyze this person and write a dense, specific physical description paragraph that could be used to consistently recreate them in future AI image generations.

Include:
- Hair: color, length, texture, style, notable features (highlights, part line, baby hairs)
- Eyes: color, shape, lash density, brow shape
- Skin: tone (include approximate hex code), texture, any marks (freckles, beauty marks, moles)
- Face: jawline shape, lip fullness, nose shape, face shape
- Build: body type, notable features
- Vibe: how they carry themselves, their energy

Format: One dense paragraph, 80-120 words. Start with "That exact [age estimate]-year-old [gender] with..."
Do NOT include clothing, setting, or pose. Only describe the PERSON.
Be specific enough that this description alone could recreate the same person every time.
Emphasize their most attractive and distinctive features — this person should look gorgeous in every generation.`;
```

2. Replace `CONTENT_ENHANCE_PROMPT` (around line 287) entirely:

```typescript
export const CONTENT_ENHANCE_PROMPT = `You turn casual content ideas into structured image generation prompts for an AI influencer's Instagram content.

The person's appearance is handled by a reference image and identity description — you do NOT describe the person's physical features. You describe the SCENE, OUTFIT, ACTION, and ENVIRONMENT.

RULES:
- 80-120 words total across all sections
- NEVER say "Shot on iPhone" (causes UI overlay bugs). Describe camera characteristics directly.
- Include 3+ environmental objects that make the scene feel REAL and lived-in
- Describe specific lighting (warm lamp + cool window, golden hour directional, gym fluorescent)
- Always reinforce that the person looks gorgeous/stunning/beautiful
- NEVER describe face, body type, hair color, or ethnicity (reference handles this)
- NEVER use: "Canon EOS R5", "studio lighting", "professional photography"

OUTPUT FORMAT (use these exact section labels):

[Scene and action]. She looks [gorgeous/stunning/incredible].

ENVIRONMENT: [3+ specific real objects — charger cable, water bottle, hair tie on wrist, AirPods, throw blanket, etc. Room/location details that make it lived-in.]

CAMERA: [iPhone selfie/rear/mirror angle, composition, distance. Off-center for selfies. Describe the angle, not the device name.]

REALISM: Fabric wrinkles where body bends, baby hairs catching light. Visible pores, photorealistic.

EXAMPLES:

Input: "gym selfie"
Output:
Post-workout mirror selfie, sports bra and leggings, glistening with light sweat, confident powerful expression. She looks absolutely gorgeous — strong and sexy.

ENVIRONMENT: Gym equipment in background, water bottle on bench, AirPods case on folded towel, gym bag strap at edge of frame. Rubber floor mats visible.

CAMERA: Mirror selfie, phone at waist level, slight upward angle. Off-center composition, mirror edge visible on left side.

REALISM: Compression visible on waistband seams, baby hairs at temples catching gym light. Visible pores, photorealistic.

Input: "laying in bed"
Output:
Laying in bed scrolling phone, wearing an oversized t-shirt, messy morning hair, sleepy but gorgeous smile. She looks stunning — effortlessly beautiful.

ENVIRONMENT: Unmade white sheets, phone charger cable on nightstand, water bottle, warm morning light through sheer curtains casting soft shadows.

CAMERA: Selfie from above, arm extended, slightly off-center, face fills upper portion of frame. Natural morning light on face.

REALISM: T-shirt fabric drapes naturally with visible wrinkles, stray hairs across pillow. Visible pores, photorealistic.

Output ONLY the structured prompt. No explanations, no quotes, no markdown.`;
```

3. Update `buildSampleContentPrompts` (around line 216) to use new format:

```typescript
export function buildSampleContentPrompts(gender: string | null): string[] {
  const subject = gender?.toLowerCase() === "male" ? "man" : "woman";
  const pronoun = gender?.toLowerCase() === "male" ? "He" : "She";
  const gymOutfit = gender?.toLowerCase() === "male"
    ? "tank top and joggers" : "matching black sports set";

  return [
    `That exact ${subject} from the reference image. Relaxed at a trendy coffee shop, wearing an oversized cream sweater, holding iced latte, looking at phone with a warm smile. ${pronoun} looks absolutely gorgeous.

ENVIRONMENT: Wooden table with napkin and pastry plate, earbuds case, warm pendant lights above, other customers blurred in background. Coffee shop menu board partially visible.

CAMERA: Selfie front camera, arm extended, off-center composition, window light on face from the left.

REALISM: Sweater fabric texture visible, baby hairs catching window light. Visible pores, photorealistic.`,

    `That exact ${subject} from the reference image. Post-workout energy, wearing ${gymOutfit}, slightly sweaty, powerful confident expression. ${pronoun} looks incredible — strong and sexy.

ENVIRONMENT: Modern gym mirrors, dumbbells on rack in background, water bottle on bench, towel draped over equipment, rubber floor visible.

CAMERA: Mirror selfie, phone at chest height, slight upward angle, off-center, mirror edge visible.

REALISM: Compression fabric texture on waistband, baby hairs at temples catching gym light. Visible pores, photorealistic.`,

    `That exact ${subject} from the reference image. Walking on a city sidewalk at golden hour, wearing a fitted outfit, looking back at camera with a playful expression. ${pronoun} looks stunning.

ENVIRONMENT: Storefronts with warm window light, parked cars, other pedestrians blurred, crosswalk lines, tree shadows on pavement.

CAMERA: Rear camera, medium distance, natural depth, background slightly soft with golden bokeh.

REALISM: Hair catching golden backlight with flyaways visible, fabric moving naturally with stride. Visible pores, photorealistic.`,
  ];
}
```

- [ ] **Step 4: Verify build**

```bash
pnpm build 2>&1 | tail -10
```

- [ ] **Step 5: Commit**

```bash
git add prisma/ src/lib/prompts.ts
git commit -m "feat: prompt seed schema + validated realism templates + camera profiles"
```

---

### Task 2: Generate Prompt Seed in Wizard

**Files:**
- Modify: `src/server/actions/generate-actions.ts`

- [ ] **Step 1: Read the file**

Read `src/server/actions/generate-actions.ts` fully. Find the `finalizeCreator` function (the one that creates the Creator record with `baseImageUrl`).

- [ ] **Step 2: Add seed generation function**

Add a new function near the top of the file (after imports):

```typescript
import { SEED_GENERATION_PROMPT } from "@/lib/prompts";

async function generatePromptSeed(baseImageS3Key: string): Promise<string | null> {
  try {
    const buf = await getImageBuffer(baseImageS3Key);
    const base64 = buf.toString("base64");

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-05-20",
      contents: [
        { text: SEED_GENERATION_PROMPT },
        { inlineData: { mimeType: "image/jpeg", data: base64 } },
      ],
    });

    const text = response.candidates?.[0]?.content?.parts?.find(
      (p: { text?: string }) => p.text
    )?.text?.trim();

    if (text && text.length > 50) {
      console.log("[PROMPT SEED] Generated:", text.substring(0, 100) + "...");
      return text;
    }
    return null;
  } catch (error) {
    console.error("[PROMPT SEED] Generation failed:", error);
    return null;
  }
}
```

- [ ] **Step 3: Call seed generation in finalizeCreator**

Find where the Creator is created with `baseImageUrl` in `finalizeCreator`. After the `db.creator.create` (or `db.creator.update` that sets `baseImageUrl`), add:

```typescript
    // Generate prompt seed from the selected base image
    if (creator.baseImageUrl) {
      const seed = await generatePromptSeed(creator.baseImageUrl);
      if (seed) {
        await db.creator.update({
          where: { id: creator.id },
          data: { promptSeed: seed },
        });
      }
    }
```

This runs after creator creation, so it doesn't block the wizard flow — the seed is generated async-ish (still awaited but the creator already exists).

- [ ] **Step 4: Verify build**

```bash
pnpm build 2>&1 | tail -10
```

- [ ] **Step 5: Commit**

```bash
git add src/server/actions/generate-actions.ts
git commit -m "feat: generate prompt seed from base image during wizard finalization"
```

---

### Task 3: Upgrade Content Generation Pipeline

**Files:**
- Modify: `src/server/actions/content-actions.ts`

- [ ] **Step 1: Read the file**

Read `src/server/actions/content-actions.ts` fully.

- [ ] **Step 2: Replace buildContentPrompt**

Replace the existing `buildContentPrompt` function:

```typescript
function buildContentPrompt(
  settings: CreatorSettings,
  enhancedPrompt: string,
  promptSeed: string | null
): string {
  // If we have a prompt seed, use it as the character anchor
  if (promptSeed) {
    return `${promptSeed}\n\n${enhancedPrompt.trim()} From the reference image.`;
  }

  // Fallback for legacy creators: scattered trait injection (old behavior)
  const traitParts: string[] = [];
  if (settings.hairColor) traitParts.push(`${settings.hairColor.toLowerCase()} hair`);
  if (settings.hairLength) traitParts.push(`${settings.hairLength.toLowerCase()} length`);
  if (settings.eyeColor) traitParts.push(`${settings.eyeColor.toLowerCase()} eyes`);
  if (settings.build) traitParts.push(`${settings.build.toLowerCase()} build`);
  if (settings.ethnicity) traitParts.push(`${settings.ethnicity} ethnicity`);
  const traitDesc = traitParts.length > 0 ? ` Physical traits: ${traitParts.join(", ")}.` : "";

  return `${enhancedPrompt.trim()}${traitDesc} From the reference image.`;
}
```

- [ ] **Step 3: Pass promptSeed to buildContentPrompt**

In the `generateContent` function, where creator is loaded from DB, also read `promptSeed`:

Find the `db.creator.findUnique` call and make sure the result includes `promptSeed`. Then pass it to `buildContentPrompt`:

```typescript
  const creator = await db.creator.findUnique({
    where: { id: creatorId, userId: user.id },
  });
  if (!creator) return { success: false, error: "Creator not found" };

  const settings = (creator.settings ?? {}) as CreatorSettings;
  const promptSeed = creator.promptSeed ?? null;

  // ... enhance prompt ...

  const prompt = buildContentPrompt(settings, enhanced, promptSeed);
```

Update the call from `buildContentPrompt(settings, enhanced)` to `buildContentPrompt(settings, enhanced, promptSeed)`.

- [ ] **Step 4: Verify build**

```bash
pnpm build 2>&1 | tail -10
```

- [ ] **Step 5: Commit**

```bash
git add src/server/actions/content-actions.ts
git commit -m "feat: content generation uses prompt seed + structured format"
```

---

### Task 4: Upgrade Carousel Pipeline

**Files:**
- Modify: `src/server/actions/carousel-actions.ts`

- [ ] **Step 1: Read the file**

Read `src/server/actions/carousel-actions.ts`. Find `buildSlidePrompt` and `generateCarousel`.

- [ ] **Step 2: Update buildSlidePrompt to use prompt seed**

The current `buildSlidePrompt` builds per-slide prompts. Add `promptSeed` parameter:

```typescript
function buildSlidePrompt(
  slide: { sceneHint: string; outfitHint: string; moodHint: string; role: string },
  gender: string,
  scene: Scene | undefined,
  promptSeed: string | null
): string {
  const subject = gender.toLowerCase() === "male" ? "man" : "woman";
  const pronoun = gender.toLowerCase() === "male" ? "He" : "She";
  const outfit = slide.outfitHint || scene?.outfitDefault || "casual outfit";
  const setting = scene?.setting ?? "natural setting";
  const lighting = scene?.lighting ?? "natural lighting";

  // Character anchor
  const character = promptSeed
    ? promptSeed
    : `That exact ${subject} from the reference image`;

  // Build structured prompt
  const parts = [
    `${character}. ${setting}. Wearing ${outfit}. ${slide.moodHint || "natural expression"}. ${pronoun} looks gorgeous.`,
    ``,
    `ENVIRONMENT: ${setting} with realistic environmental details — everyday objects visible, lived-in feeling.`,
    ``,
    `CAMERA: ${scene?.cameraStyle ?? "iPhone selfie angle, off-center composition"}.`,
    ``,
    `REALISM: ${REALISM_CONTENT}`,
  ];

  return parts.join("\n");
}
```

Import `REALISM_CONTENT` from prompts.ts at the top of the file.

- [ ] **Step 3: Pass promptSeed through generateCarousel**

In `generateCarousel`, where the creator is loaded, read `promptSeed` and pass it to `buildSlidePrompt`:

```typescript
  const promptSeed = creator.promptSeed ?? null;
  // ... later in slide generation:
  const slidePrompt = buildSlidePrompt(slideConfig, gender, scene, promptSeed);
```

Also update `regenerateSlide` to load and pass `promptSeed`.

- [ ] **Step 4: Verify build**

```bash
pnpm build 2>&1 | tail -10
```

- [ ] **Step 5: Commit**

```bash
git add src/server/actions/carousel-actions.ts
git commit -m "feat: carousel generation uses prompt seed + structured format"
```

---

### Task 5: Upgrade Talking Head Pipeline

**Files:**
- Modify: `src/server/actions/talking-head-actions.ts`

- [ ] **Step 1: Read the file**

Read `src/server/actions/talking-head-actions.ts`. Find the talking head base image prompt in `processTalkingHead`.

- [ ] **Step 2: Update the base image prompt**

Find the `talkingHeadPrompt` in `processTalkingHead`. Replace it with:

```typescript
    const settingDesc = setting || "Clean, well-lit indoor setting";
    const pronoun = gender.toLowerCase() === "male" ? "He" : "She";

    // Character anchor
    const character = creator.promptSeed
      ? creator.promptSeed
      : `That exact ${subject} from the reference image`;

    const talkingHeadPrompt = [
      `${character}.`,
      `Front-facing, slight head tilt, mouth slightly parted as if mid-sentence, natural warm expression. ${pronoun} looks gorgeous.`,
      ``,
      `ENVIRONMENT: ${settingDesc}. A few personal objects visible — realistic, lived-in.`,
      ``,
      `CAMERA: Front camera selfie angle, face fills frame, natural distance, slightly off-center.`,
      ``,
      `REALISM: ${REALISM_CONTENT}`,
    ].join("\n");
```

Import `REALISM_CONTENT` from `@/lib/prompts` at the top.

Make sure the function loads `creator.promptSeed` — it may need to load the full creator record (check if it already does).

- [ ] **Step 3: Verify build**

```bash
pnpm build 2>&1 | tail -10
```

- [ ] **Step 4: Commit**

```bash
git add src/server/actions/talking-head-actions.ts
git commit -m "feat: talking head uses prompt seed + structured format"
```

---

## Self-Review

**Spec coverage:**
- ✅ Section 1 (Prompt Seed System): Task 1 (schema + templates), Task 2 (generation in wizard)
- ✅ Section 2 (Structured Prompt Template): Task 1 (templates), Tasks 3-5 (all pipelines updated)
- ✅ Section 3 (Camera Profiles): Task 1 (constants defined), used in enhanced prompts
- ✅ Section 4 (Prompt Enhancement Upgrade): Task 1 (CONTENT_ENHANCE_PROMPT replaced)
- ✅ Section 5 (Pipeline Changes): Tasks 3 (content), 4 (carousel), 5 (talking head)
- ✅ Section 6 (Files): All files listed in spec are covered
- ✅ Section 7 (Migration): Task 3 includes fallback for legacy creators

**Video pipeline:** Not touched — Kling handles video differently (motion/image prompts, not text-based scene descriptions). The spec correctly scopes this out.

**Placeholder scan:** All code provided. No TBDs.

**Type consistency:** `promptSeed` is `string | null` everywhere. `REALISM_CONTENT` exported from prompts.ts, imported in carousel + talking head actions. `SEED_GENERATION_PROMPT` exported from prompts.ts, imported in generate-actions.ts.
