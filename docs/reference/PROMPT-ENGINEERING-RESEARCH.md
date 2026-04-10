# Prompt Engineering Research — Gemini / Nano Banana Pro

> Last updated: 2026-03-24
> Sources at bottom

---

## Reference Image Prompting (Composition Templates)

### What Works

**Describe the reference image's ROLE first.**
Don't just say "replace the silhouette." Tell the model what the reference image IS and what it controls before asking it to do anything.

```
Composition: The reference image is a layout template.
It shows a gray featureless silhouette on a white background that defines the exact framing, body position, crop level, and pose.
```

**Use labeled sections.**
"Composition:" and "Subject:" communicate a positioning hierarchy. The model treats labeled sections as distinct instructions rather than one blended prompt. (Source: DEV.to NBPro guide)

**"Strictly match" + "do not change X" pattern.**
Explicit preservation instructions work better than implicit ones. "Do not change the framing, crop, or body position" > "keep the same framing." The awesome-nanobanana-pro repo uses "Important: do not change the face" — same pattern. (Source: GitHub awesome-nanobanana-pro)

**"Gray featureless silhouette"** — calling it "featureless" stops the model from interpreting the gray lower body as dark clothing (leggings, pants). This was our #1 artifact.

**Natural language sentences > keyword lists.**
"Complete sentences and descriptive adjectives rather than tag-based prompts yields compositionally superior results." (Source: DEV.to NBPro guide)

**Newlines between sections** — cleaner separation than spaces. Each instruction gets its own line.

### What Doesn't Work

- **Splitting the silhouette instruction across the person description** — "Replace the silhouette with: [50 words of person]. Keep the same framing." Model forgets the framing part.
- **Just saying "reference image"** without explaining what it is — model doesn't know if it's a style reference, identity reference, or composition reference.
- **Tag-based/keyword prompts** — less effective than natural language for composition control.

### Our Winning Template (V3, tested March 24 2026)

```
Composition: The reference image is a layout template.
It shows a gray featureless silhouette on a white background that defines the exact framing, body position, crop level, and pose.
Strictly match the silhouette's composition — do not change the framing, crop, or body position.
Subject: Replace the gray silhouette with a real photorealistic person. {person prompt}
```

**Test results (4 images each):**
| Version | Clothing Artifact | Framing Consistency | Notes |
|---------|-------------------|---------------------|-------|
| V1 (old) | 1/4 black pants | Variable crop | "Replace the gray silhouette... Keep the same framing" split |
| V2 | 0/4 in first test, 2/4 in second | Good | Instruction-first but no labeled sections |
| V3 | 0/4 across all tests | Best — most uniform | Labeled sections + "featureless" + "do not change" |

---

## Person Description Prompting

### Prompt Structure (Batch-Tested, 64 images, March 21 2026)

**Vibe-first word order** produces best faces:
```
Sexy confident 23-year-old European woman, fair light skin, blonde long wavy hair, blue eyes...
```
NOT face-first:
```
Beautiful woman with blue eyes and blonde hair who is 23 years old...
```

**Medium detail (40-80 words)** beats both ultra-minimal AND over-structured.

**"Canon EOS R5" alone** is enough — full lens spec (85mm f/1.4, etc.) doesn't measurably improve realism for portrait generation.

**"Visible pores"** is essential for realism. "Light freckles" helps for fair/medium skin tones.

### Body Description

- "large bust with visible cleavage" + "tight" on clothing = works
- NEVER: "voluptuous/curvy/hourglass" → triggers plus-size body type
- NEVER: "instagram fitness" → triggers bodybuilder/athlete look
- NEVER: "imperfections", "blemishes", "uneven hairline" → Gemini takes literally

### Clothing

- Female default: "tight white sports bra" (or "white sports bra" for smaller bust)
- Male default: "Shirtless"
- These are wizard defaults — content gen will have full outfit control

---

## Identity Locking (Reference-Based Variations)

When generating variations of an existing creator (not initial generation):

**"That exact [woman/man] from the reference image"** — establishes identity lock.

**"Keep the facial features exactly consistent"** or **"Important: do not change the face"** — explicit preservation. (Source: awesome-nanobanana-pro repo)

**Minimal text for variations** — let the reference image do the heavy lifting. Only describe what's DIFFERENT.

```
That exact woman from the reference image, but with darker hair.
Wearing a tight white sports bra. White studio backdrop.
Canon EOS R5. Visible pores, photorealistic.
```

---

## Validation / Multi-Angle Prompting

When generating consistency-check images across poses:

**Lead with the reference relationship:**
```
Using this character reference, create a photorealistic photograph of this exact 23-year-old European woman with blonde wavy hair.
```

**Then the scene-specific instruction:**
```
Side profile view, same outfit, pure white seamless studio backdrop, soft diffused studio lighting.
```

**End with preservation:**
```
Maintain identical facial features, skin tone, and all identifying details from the reference.
Natural skin texture with visible pores, subtle catchlights in eyes, photorealistic.
```

---

## Describe Mode Enhancement (Grok/Flash Rewriting)

When the user types freeform text ("hot blonde with big tits"), it goes through Grok Fast (or Gemini Flash fallback) before image generation.

**System prompt rules:**
- Lead with ENERGY: "sexy confident", "sultry gorgeous"
- 40-80 words max
- Faithful body translation (don't sanitize)
- Always include camera + realism anchors
- NEVER: face-first descriptions, banned words

---

## Safety Filter Handling

If Gemini returns no image (likely filtered):
1. Strip trigger words: "shirtless", "sports bra", "bikini", "lingerie", "revealing"
2. Retry once with softened prompt
3. If still fails: return user-friendly error

BLOCK_NONE on all 4 safety categories is set but doesn't guarantee no filtering — IMAGE_SAFETY is a separate server-side filter.

---

## Model Comparison (March 23 2026, God Squad Test)

Same prompt, same conditions:

| Model | Realism | Content Policy | Cost | Our Pick |
|-------|---------|---------------|------|----------|
| **NBPro** (Gemini 3 Pro Image) | Best skin texture, visible pores | Most permissive (BLOCK_NONE) | ~$0.05/img | Wizard generation |
| **NB2** (Gemini 3.1 Flash Image) | 90% of NBPro, slightly smoother | Same as NBPro | ~$0.02/img | Potential content gen |
| **Seedream 4.5** | Excellent, close to NBPro | More permissive than GPT | Via Fal.ai | Best backup |
| **Seedream 5 Lite** | Softer, "model photo" look | Similar to 4.5 | Via Fal.ai | Clean influencer style |
| **GPT Image 1.5** | Very good, polished | Strict (Fal.ai layer blocks) | Via Fal.ai | Too restrictive |
| **Flux 2 Max** | More "rendered" look | Strict | Via Fal.ai | Weakest fit |

---

## Course Learnings (AIAC + AI Realism)

Full course notes: `docs/courses/aiac/` and `docs/courses/ai-realism/`
Synthesized course research: `docs/courses/COURSE-RESEARCH.md`

### AIAC Master Prompts — Key Patterns

The AIAC master prompt for avatar creation (`docs/courses/aiac/master-prompts.md`) establishes the canonical structure we follow:

**Image Composition (applies to ALL prompts):**
- "Raw iPhone photography style"
- "Front-facing portrait, visible from waist up (belly up)"
- "Subject standing straight, facing the camera directly"
- "Arms straight down with hands relaxed naturally"
- "Centered, symmetrical framing"
- "Natural-looking light, no dramatic lighting"
- "Pure white seamless studio background (no gradients, no shadows, no textures, no objects)"
- "Natural skin texture visible (pores, fine lines, freckles, slight asymmetry)"
- "Hyper-realistic, everyday human appearance"

**Subject Description Structure:**
- Every prompt MUST begin: "Front-facing portrait of a …, raw iPhone photography style,"
- Then continue with full character description in natural language

**Clothing Rules:**
- Female: white sports bra
- Male: shirtless

**Identity from Reference:**
- New person from ref: "Use these reference images as inspiration to create a totally different person"
- Same person from ref: "that woman" (not "a woman") — the word "that" locks identity
- Image-to-image exact match: "I want a person from image 1 to be in the same position and outfit as the person on image 2"

**Multi-Angle (from same reference):**
- "Using the uploaded reference image, generate multiple camera angles of the same person"
- List specific angles: front view, 3/4 left, 3/4 right, profile, slightly high angle, slightly low angle
- "Keep the exact same facial structure, proportions, age, and identity"
- "Do not change the face"

### AI Realism — Prompting Principles

From `docs/courses/ai-realism/better-prompts.md` and `docs/courses/ai-realism/paid/better-prompts.md`:

**Core Framework (5 components):**
1. **Subject** — what is the main focus (a man, a woman, a product)
2. **Context** — where is it happening (studio, city, sunset)
3. **Action or State** — what is happening (standing still, walking, looking at camera)
4. **Style or Mood** — emotional atmosphere + visual direction
5. **Constraints** — what to emphasize or avoid

**Key Principles:**
- "AI prioritizes clarity, order, and relevance" — structure > creativity
- "AI processes prompts in weighted segments. Not all words carry equal influence."
- "When prompts are long or conflicting, the model may compress instructions, prioritize dominant keywords, drop low-weight details"
- "Good prompts reduce guessing. They constrain intelligently."
- "If your prompt sounds like a compliment, it is too vague. If it sounds like a technical brief, it is actionable."

**The One-Variable Rule:**
- One change per iteration. Don't change face + style + lighting + pose simultaneously.
- "When you modify everything at once, you lose diagnostic control"

**References Create Control:**
- "Text defines intention. Reference defines structure."
- "Using an image as a reference dramatically increases output stability"
- It does 3 things: reduces randomness, improves realism, locks composition
- "A reference does not eliminate the need for a prompt" — you must still define what stays and what changes

### AI Realism — Consistency Workflow

From `docs/courses/ai-realism/paid/consistency.md`:

**The Workflow:**
1. Create ONE clean, high-quality base reference image (identity anchor)
2. Generate multiple camera angles from that reference — lock identity first
3. THEN change clothing/environment — one variable at a time
4. Always reuse the same reference image

**Critical Rules:**
- "Do not change clothing, do not change environment, do not add stylization" during angle generation
- "Your only objective is structural stability"
- "Identity fixed. Context flexible."
- "Keep the exact same face and identity. Only change clothing and environment."

### How This Maps to Our Implementation

| Course Teaching | Our Implementation |
|---|---|
| "Raw iPhone photography style" | We use "Canon EOS R5" — same intent, tested better for NBPro |
| "Front-facing portrait, waist up" | Silhouette template controls this |
| "White sports bra" / "Shirtless" | `CLOTHING_FEMALE` / `CLOTHING_MALE` in prompts.ts |
| "that woman" (not "a woman") | `buildVariationPrompt()` uses "That exact woman/man" |
| "Do not change the face" | V3 wrapper: "do not change the framing, crop, or body position" |
| Reference = structural anchor | Silhouette template = composition anchor |
| One variable at a time | Refine mode lets user change one thing at a time |
| 5-component framework | Our prompts follow: vibe → subject → details → clothing → camera → realism |

### Where We Diverge From Courses

1. **"No makeup, imperfections, uneven hairline"** — AIAC includes these but our batch testing showed they HURT output. Gemini takes "imperfections" too literally. We removed them.
2. **"Raw iPhone photography"** — AIAC standard, but "Canon EOS R5" tested better with NBPro for skin texture realism.
3. **Silhouette composition template** — not from any course. Our own innovation for framing control. Courses use text-only composition instructions or the model's native understanding.
4. **Vibe-first word order** — AIAC leads with "Front-facing portrait of a..." (subject-first). Our testing showed vibe-first ("Sexy confident 23-year-old...") produces better faces with NBPro.

---

## UGC Content Generation Prompting (March 27 2026)

> From: AdLibrary AI Prompting Guide, timkoda koda-stack, batch testing

### Two Prompt Systems

Our app uses fundamentally different prompt approaches for two contexts:

| | Wizard (Character Creation) | Content (Instagram Posts) |
|---|---|---|
| **Camera** | Canon EOS R5 | "shot on iPhone" / smartphone camera quality |
| **Lighting** | Studio, controlled, white bg | Natural, available light, room lighting |
| **Background** | White seamless studio | Real environments (coffee shop, gym, bedroom, beach) |
| **Composition** | Silhouette template (posed) | Candid, unposed, slight imperfection |
| **Feel** | Professional reference photo | Real person's selfie / casual photo |
| **Clothing** | Sports bra / shirtless (neutral base) | Actual outfits (casual, gym, going out) |
| **Purpose** | Lock the character's identity | Generate actual social media posts |

### UGC Authenticity Modifiers

These phrases make AI output feel like real UGC instead of studio photos:
- "shot on iPhone" / "smartphone camera quality"
- "candid" / "unposed" / "caught mid-action"
- "natural imperfections" / "slight grain" / "not retouched"
- "casual home environment" / "messy background"
- "available light" / "room lighting" / "no studio"

### Negative Prompt Concepts (Things to Avoid in UGC)

When generating content (NOT wizard references), actively avoid:
- Studio lighting, professional photography, stock photo look
- Perfect skin, heavy makeup, beauty filter
- Perfect composition, centered framing, staged look
- Commercial, advertisement feel

### Emotion-First Content Prompting

Structure: `[Emotion] + [Person ref] + [Action/Setting] + [Camera style]`

Example emotions and their visual cues:
- **Trust**: Direct eye contact, confident smile, clean environment
- **Excitement**: Wide eyes, dynamic composition, bright colors
- **Relief**: Relaxed posture, peaceful expression
- **Curiosity**: Close examination, focused expression

### Platform-Specific Content Styles

- **Instagram**: Warmer tones, golden hour lighting, "effortlessly aesthetic," 4:5 format
- **TikTok**: Vertical 9:16, ring light reflections, "raw and unedited look"
- **YouTube**: Well-lit face, desk/studio visible, 16:9

### Content Prompt Template (Proposed)

```
That exact [woman/man] from the reference image.
[Emotion/vibe description]. [Scene/setting]. [What they're wearing/doing].
Shot on iPhone, candid, natural lighting.
Visible pores, photorealistic.
```

Example:
```
That exact woman from the reference image.
Confident and relaxed at a trendy coffee shop, wearing an oversized cream sweater and gold necklace.
Looking at her phone with a subtle smile, iced latte on the table.
Shot on iPhone, candid, warm natural light from the window.
Visible pores, photorealistic.
```

---

## Sources

- [Nano-Banana Pro: Prompting Guide & Strategies — DEV Community (Google AI)](https://dev.to/googleai/nano-banana-pro-prompting-guide-strategies-1h9n)
- [How to prompt Gemini 2.5 Flash Image Generation — Google Developers Blog](https://developers.googleblog.com/how-to-prompt-gemini-2-5-flash-image-generation-for-the-best-results/)
- [awesome-nanobanana-pro — GitHub (ZeroLu)](https://github.com/ZeroLu/awesome-nanobanana-pro)
- [Nano Banana Pro Prompt Guide — Leonardo.ai](https://leonardo.ai/news/nano-banana-prompt-guide/)
- [Nano Banana image generation — Google AI for Developers](https://ai.google.dev/gemini-api/docs/image-generation)
- [Prompt tips for Nano Banana Pro — Google Blog](https://blog.google/products-and-platforms/products/gemini/prompting-tips-nano-banana-pro/)
- [AI Prompting Guide for UGC Content Creators — AdLibrary](https://adlibrary.com/guides/ai-prompting-guide-ugc-content-creators)
- [Koda Creative Stack — timkoda](https://github.com/timkoda/koda-stack) — content pipeline + Creative DNA pattern
- Internal batch testing: `scripts/output/` directories (March 21-27, 2026)
- AIAC Master Prompts: `docs/courses/aiac/master-prompts.md`
- AI Realism — Better Prompts (free): `docs/courses/ai-realism/better-prompts.md`
- AI Realism — Better Prompts (paid): `docs/courses/ai-realism/paid/better-prompts.md`
- AI Realism — Consistency: `docs/courses/ai-realism/paid/consistency.md`
