# Generation Quality Upgrade — Design Spec

## Goal

Upgrade all generation prompts with a prompt seed system (dense identity paragraph per creator), tested realism anchors, structured prompt format, and camera profiles. Based on A/B/C test results in `docs/reference/PROMPT-AB-TEST-RESULTS.md`.

## Architecture

Two changes: (1) Prompt seed — AI analyzes the creator's base image and writes a dense paragraph stored on the Creator model, injected into every generation. (2) Prompt template upgrade — all generation functions use the validated structured format with environment realism, camera characteristics, and attractiveness reinforcement. No skin degradation anchors.

---

## 1. Prompt Seed System

### What It Is

A dense paragraph describing a specific creator that gets injected into EVERY generation for that person. Replaces the current scattered trait injection (`"blonde hair, blue eyes, athletic build"`).

### Example Seed

> "That exact 24-year-old woman with sun-kissed golden blonde hair falling in loose waves past her shoulders, bright blue-green eyes with natural thick lashes, warm tanned skin with visible pores and a light dusting of freckles across the bridge of her nose. Soft rounded jaw, full natural lips, straight nose with a slight upturn. Athletic build with toned arms and defined shoulders. She carries herself with effortless confidence — the kind of girl who looks good without trying. Skin tone warm peach-gold with natural variation."

### When It's Generated

During creator setup, after the user picks the base image they like:

1. User completes wizard → picks favorite from 4 generated images
2. System sends that selected image to Gemini Flash
3. Gemini writes the prompt seed — a dense paragraph describing THIS person
4. Seed stored on `Creator.promptSeed` (new field, nullable String)
5. Every future generation includes the seed as the character anchor

### Generation Prompt

```typescript
const SEED_GENERATION_PROMPT = `Analyze this person and write a dense, specific physical description paragraph that could be used to consistently recreate them in future AI image generations.

Include:
- Hair: color, length, texture, style, notable features (highlights, part line, baby hairs)
- Eyes: color, shape, lash density, brow shape
- Skin: tone (include approximate hex), texture, any marks (freckles, beauty marks, moles)
- Face: jawline shape, lip fullness, nose shape, face shape
- Build: body type, notable features
- Vibe: how they carry themselves, their energy

Format: One dense paragraph, 80-120 words. Start with "That exact [age]-year-old [gender] with..."
Do NOT include clothing, setting, or pose. Only describe the PERSON.
Be specific enough that this description alone could recreate the same person every time.`;
```

### Schema Change

```prisma
model Creator {
  // Add:
  promptSeed    String?   // Dense paragraph describing this creator for prompt injection
}
```

### Where the Seed Gets Injected

Every generation function uses the seed as the first layer:

```
[PROMPT SEED]. [Scene/action]. She looks [gorgeous/stunning].
ENVIRONMENT: [objects, clutter]
CAMERA: [characteristics]
REALISM: [fabric, stray hairs, pores]
```

If `promptSeed` is null (legacy creators), fall back to current trait injection.

---

## 2. Structured Prompt Template

### Validated Format (from A/B/C testing)

```
[Prompt seed / character description]. That exact person from the reference image.

[Scene/action description]. She looks absolutely gorgeous.

ENVIRONMENT: [3+ real objects visible — charger cable, water bottle on nightstand, hair tie on wrist, throw blanket, remote control. Room details that make it feel lived-in.]

CAMERA: [iPhone front camera selfie angle, slightly off-center composition, arm extended, natural distance. OR: iPhone rear camera, natural depth, slight bokeh on background.]

REALISM: [Visible fabric texture with natural wrinkles where body bends. Baby hairs and flyaways catching backlight. Mixed lighting — warm lamp plus cool window light. Visible pores, photorealistic.]
```

### What Changed from Current

| Aspect | Current | New |
|--------|---------|-----|
| Character | Scattered traits at end of prompt | Dense prompt seed at beginning |
| Scene | Single paragraph | Labeled ENVIRONMENT section |
| Camera | "Shot on iPhone, candid" | Described characteristics (never say "Shot on iPhone") |
| Realism | "Visible pores, photorealistic" | 6 validated anchors (no skin degradation) |
| Attractiveness | Not mentioned | Reinforced throughout |
| Structure | Flat paragraph | Sectioned (CHARACTER, SCENARIO, ENVIRONMENT, CAMERA, REALISM) |

### The 6 Validated Realism Anchors

These passed A/B/C testing — improve realism without hurting attractiveness:

1. **Stray hairs** — baby hairs at temples, flyaways catching backlight, imperfect part line
2. **Fabric texture** — visible weave, wrinkles where body bends, natural draping
3. **Environmental noise** — 3+ real objects in scene (charger, water bottle, remote, hair tie)
4. **Lighting description** — mixed color temperatures, directional light, warm/cool contrast
5. **Camera characteristics** — iPhone angle, off-center composition, slight motion blur on hand
6. **Visible pores** — already have this, keep it

### Dropped Anchors (Hurt Quality in Testing)

- ~~Under-eye texture/shadows~~ — makes them look tired
- ~~Uneven skin tone / redness~~ — makes them look blotchy
- ~~"Avoid airbrushed skin"~~ — tells model to make skin worse
- ~~Nail detail / chipped polish~~ — makes hands look bad
- ~~"Shot on iPhone"~~ — Gemini generates Instagram UI overlays

### Attractiveness Reinforcement

Every prompt must include at least one reinforcement:
- "She looks absolutely gorgeous"
- "She's stunning — effortlessly beautiful"
- "Smoke show energy"
- "She looks incredible"

This counterbalances realism anchors that might push the model toward making the person look worse.

---

## 3. Camera Profiles

### Selfie Front Cam (Most Common)
```
CAMERA: iPhone front camera selfie. Arm extended at natural distance, slightly off-center composition. Face fills upper third. Slight barrel distortion on edges. Natural selfie angle — camera slightly above eye level.
```

### Rear Cam (Someone Else Taking Photo)
```
CAMERA: iPhone rear camera. Natural depth of field, background slightly soft. Medium distance, full upper body visible. True-to-life proportions, no selfie distortion.
```

### Mirror Selfie
```
CAMERA: Mirror selfie taken with iPhone rear camera. Mirror edge partially visible. Phone held at chest/waist level. Slight tilt. Bathroom/bedroom mirror. Reversed text if any signage visible.
```

### The prompt enhancement step (Grok) should auto-select the appropriate camera profile based on the scene description:
- "selfie" → Selfie Front Cam
- "mirror" → Mirror Selfie
- "someone took a photo" / "posed" → Rear Cam
- Default → Selfie Front Cam

---

## 4. Prompt Enhancement Upgrade

### Current: `CONTENT_ENHANCE_PROMPT` in `prompts.ts`

Currently tells Grok to describe scene/outfit/pose/mood. We upgrade it to output the structured format.

### New: `CONTENT_ENHANCE_PROMPT` (replacement)

```
You enhance casual user inputs into structured image generation prompts.

Input: User's casual description (e.g., "gym selfie", "coffee shop", "laying in bed")
Output: A structured prompt with labeled sections.

Rules:
- Describe the SCENE, OUTFIT, POSE, MOOD — never describe the person's physical features (reference image handles that)
- Reinforce that the person looks gorgeous/stunning/beautiful in every scene
- Never say "Shot on iPhone" — describe camera characteristics instead
- Include 3+ environmental objects that make the scene feel real and lived-in
- Describe the lighting (warm/cool, direction, mixed sources)
- Output 60-100 words total

Output format:
[Scene and action]. She looks [gorgeous/stunning/incredible].

ENVIRONMENT: [3+ specific real objects, room/location details]

CAMERA: [iPhone selfie/rear/mirror angle, composition, distance]

REALISM: Fabric wrinkles where body bends, baby hairs catching light. Visible pores, photorealistic.

Example input: "gym selfie"
Example output:
Post-workout mirror selfie at the gym, sports bra and leggings, glistening with a light sweat. She looks absolutely gorgeous — confident and strong.

ENVIRONMENT: Gym equipment visible in background, water bottle on bench, AirPods case on towel, gym bag strap visible at edge of frame.

CAMERA: Mirror selfie with iPhone, phone at waist level, slight upward angle. Off-center composition, mirror edge visible on left.

REALISM: Fabric compression visible on waistband, baby hairs at temples catching gym light. Visible pores, photorealistic.
```

---

## 5. Where Each Pipeline Changes

### Content Generation (`content-actions.ts`)
- `buildContentPrompt()` → uses prompt seed + structured format
- `enhanceContentPrompt()` → uses updated `CONTENT_ENHANCE_PROMPT`
- Prompt: `{seed}. {enhanced scene}. ENVIRONMENT: ... CAMERA: ... REALISM: ...`

### Carousel Generation (`carousel-actions.ts`)
- `buildSlidePrompt()` → uses prompt seed + scene details + environment block
- Each slide gets environment appropriate to its scene
- Attractiveness reinforced per slide

### Talking Head (`talking-head-actions.ts`)
- Base image prompt → uses prompt seed + setting + camera profile
- Shorter format (just need a good still for lip sync)

### Video (`video-actions.ts`)
- Motion prompts stay simple (Kling handles differently from Gemini)
- Image-to-video: source image already has quality baked in
- Text-to-video: prompt seed injected for character description

### Wizard (`generate-actions.ts`)
- Wizard stays as-is (different purpose — generating base images, not content)
- BUT: after user picks their image, we generate the prompt seed

### Sample Content (`prompts.ts` → `buildSampleContentPrompts`)
- Updated to use new structured format
- Environment details per scene

### Admin Generation (`admin-generate-actions.ts`)
- Admin creator generation uses the structured format
- Admin reference generation stays as-is (no person in refs)

---

## 6. Files to Change

```
MODIFY: prisma/schema.prisma                          — Add promptSeed to Creator model
CREATE: prisma/migrations/XXXXX_prompt_seed/           — Auto-generated
MODIFY: src/lib/prompts.ts                            — Updated CONTENT_ENHANCE_PROMPT, new SEED_GENERATION_PROMPT, camera profiles, buildContentPromptV2()
MODIFY: src/server/actions/content-actions.ts          — Use prompt seed + structured format
MODIFY: src/server/actions/carousel-actions.ts         — Use prompt seed in slide prompts
MODIFY: src/server/actions/talking-head-actions.ts     — Use prompt seed in base image prompt
MODIFY: src/server/actions/video-actions.ts            — Use prompt seed in text-to-video
MODIFY: src/server/actions/generate-actions.ts         — Generate prompt seed after image selection
```

---

## 7. Migration Path

- New creators get prompt seed generated during wizard
- Existing creators (promptSeed = null): fall back to current trait injection
- Admin can regenerate seeds for existing creators via admin panel
- Over time, encourage users to "refresh" their creator (regenerate seed from base image)

---

## Out of Scope

- Camera profile auto-detection in prompt enhancer (future — Grok can learn this)
- Per-reference prompt seed (refs don't need identity paragraphs)
- Video-specific realism anchors (Kling handles differently)
- Background realism kits (bedroom, bathroom, etc. — Grok handles this via scene description)
- Prompt seed editing by user (they don't need to see or touch it)
