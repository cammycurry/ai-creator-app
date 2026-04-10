# Prompt Journal — What Works for Creator Generation

> Track what prompt patterns produce the most realistic, attractive AI influencer base images.
> Updated: 2026-04-07

---

## Best Result So Far

**Image:** `admin/creators/seed/jessvibeszz-v0-1775583900519.jpg`
**Source:** @jessvibeszz (European, Slim-thick, Blonde, Fitness/Spicy)
**Rating:** Best of session — natural lighting, real skin texture, natural curly hair

**Prompt:**
```
Playfully seductive 24-year-old European woman, long curly hair dirty blonde hair, grey-green eyes, warm smile. slim with wide hips and narrow waist build, large C-cup breasts with visible cleavage, chest filling the sports bra. Tight white sports bra and black leggings. Canon EOS R5. Eyes open, looking directly at camera. Visible pores, photorealistic.
```

**Why it worked:**
- "long curly hair" — specific texture reads as natural/real
- "dirty blonde" — imperfect shade, not salon-perfect platinum
- "warm smile" — natural expression, not over-dramatized
- "C-cup" with "chest filling the sports bra" — specific without being cartoonish (DD triggers exaggeration)
- "slim with wide hips and narrow waist" — matches actual source body type
- Canon EOS R5 + "Visible pores, photorealistic" — the proven realism anchors

---

## What Works (Validated Patterns)

### Hair
- **Natural textures win:** "long curly hair", "messy beach waves" > "straight" or "sleek blowout"
- **Imperfect colors win:** "dirty blonde", "chestnut", "dark brown" > "platinum", "golden", "honey"
- **Specificity matters:** describe length + texture + color, not just color

### Expressions
- **Warm/natural win:** "warm smile", "confident expression", "relaxed confident look"
- **Dramatic loses:** "intense gaze", "playful smirk", "bedroom gaze" — Gemini over-dramatizes these
- **"Calm, confident, attractive expression"** (from the silhouette wrapper) is the safety net

### Body
- **C-cup is the sweet spot** for realism. DD-cup triggers cartoon exaggeration
- **"chest filling the sports bra"** is better than just "large breasts" — grounds it in the clothing
- **Match the source:** if the account is curvy, say "slim with wide hips and narrow waist" — don't randomize
- **Athletic/toned reads as real.** "Muscular" reads as AI

### Composition (Non-negotiable)
- **Must use the silhouette template** (`src/assets/composition-template.jpg`) as the ONLY reference image
- **Must use the exact `wrapWithSilhouette()` text** from `src/lib/prompts.ts`
- **Call pattern:** `contents = [{ text: wrappedPrompt }, { inlineData: templateRef }]`
- **NO extra reference images** during base generation — they fight with the silhouette for framing
- Reference images are only used in "More Like This" / variation flow with `wrapWithSilhouetteAndRefs`

### The Prompt Structure
```
[vibe] [age]-year-old [ethnicity] [gender], [hair description], [eye color] eyes, [expression]. [build] build, [chest description]. [clothing]. Canon EOS R5. Eyes open, looking directly at camera. Visible pores, photorealistic.
```

---

## What Doesn't Work

| Pattern | Problem |
|---------|---------|
| "platinum blonde", "golden blonde" | Too perfect, reads as AI |
| "intense gaze", "bedroom gaze" | Over-dramatized by Gemini |
| "DD-cup breasts, extremely busty" | Cartoon exaggeration |
| Passing reference images with silhouette | Fights for composition control, wrong sizing |
| "voluptuous", "curvy", "hourglass" | Triggers plus-size body type |
| "instagram fitness" | Triggers bodybuilder look |
| "imperfections", "blemishes" | Gemini takes literally, adds acne |
| "no makeup" | Washes out the face |
| Different silhouette prompt text | Wrong framing, wrong crop |

---

## Process

1. Classify the source account (gender, ethnicity, body type, hair color, age range, vibe)
2. Build prompt using the structure above, staying faithful to source characteristics
3. Vary slightly: hair texture, eye color, expression, age (within range)
4. Generate with exact wizard call pattern (silhouette template only)
5. Rate 1-5 stars in pipeline, tag what worked, note feedback
6. Use top-rated prompts to inform future generation

---

## Metrics

Track in AdminMedia table:
- `rating` (1-5 stars)
- `feedback` (free text — "great lighting", "too AI", etc.)
- `promptTags` (what elements worked — "natural-hair", "warm-smile", "c-cup", etc.)
- `prompt` (the full prompt used)

Query `getTopPrompts()` to find patterns in what consistently scores 4-5 stars.
