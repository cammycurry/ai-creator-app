# Wizard Prompt Formula (DEFINITIVE)

> **Date:** 2026-04-09
> **Status:** LOCKED. This is the authoritative reference for initial creator generation.
> **Test data:** `scripts/output/wizard-prompt-test/` (240+ images across 17 strategies x 6 creators)
> **Winner:** Strategy M

---

## Context

This formula is for the **initial wizard generation only**. Creating a new creator from scratch. White background, silhouette composition template, no face reference yet. The user picks traits, we generate 4 options, they pick the best one as their reference.

This is NOT for content generation (different prompt, different rules, tested separately).

---

## The Winning Prompt (Strategy M)

### Silhouette Wrapper (unchanged)
```
Composition: The reference image is a layout template.
It shows a gray featureless silhouette on a white background that defines the exact framing, body position, crop level, and pose.
Strictly match the silhouette's composition — do not change the framing, crop, or body position.
Frame from the top of the head to the belly button ONLY. Crop at the belly button — do not show hips, waist, or anything below.
IMPORTANT: All clothing must be fully visible and covering. No nudity, no exposed underwear, no see-through clothing.
Pose: Front-facing, standing straight, arms relaxed at sides. Face looking directly at camera. Calm, confident, attractive expression.
Subject: Replace the gray silhouette with a real photorealistic person. {PERSON_PROMPT}
```

### Person Prompt Structure
```
{VIBES} {AGE}-year-old {ETHNICITY} {GENDER}, {BODY/CHEST}. {BUILD} build. {CLOTHING}. Canon EOS R5. {REALISM_BLOCK}
```

### Realism Block (Female)
```
Hair worn down, flowing naturally. No makeup, natural bare face. Visible pores on forehead and nose. Subtle natural skin texture with fine detail. Baby hairs at temples catching the light. Defined facial features. Fabric texture visible on clothing with natural stretch and compression. Plain solid fabric, no logos, no branding, no text. Keep the exact same background color and tone from the reference image layout template. Flat even studio lighting, no directional shadows, no color cast. Photorealistic.
```

### Realism Block (Male)
```
Visible pores on forehead and nose. Subtle natural skin texture with fine detail. Baby hairs at temples catching the light. Defined facial features. Fabric texture visible on clothing with natural stretch and compression. Plain solid fabric, no logos, no branding, no text. Keep the exact same background color and tone from the reference image layout template. Flat even studio lighting, no directional shadows, no color cast. Photorealistic.
```

---

## Full Example (Sienna)

```
Composition: The reference image is a layout template.
It shows a gray featureless silhouette on a white background that defines the exact framing, body position, crop level, and pose.
Strictly match the silhouette's composition — do not change the framing, crop, or body position.
Frame from the top of the head to the belly button ONLY. Crop at the belly button — do not show hips, waist, or anything below.
IMPORTANT: All clothing must be fully visible and covering. No nudity, no exposed underwear, no see-through clothing.
Pose: Front-facing, standing straight, arms relaxed at sides. Face looking directly at camera. Calm, confident, attractive expression.
Subject: Replace the gray silhouette with a real photorealistic person. Sexy, Confident, Sultry 23-year-old European woman, very large DD-cup breasts with deep cleavage, extremely busty, breasts straining against the sports bra. Slim build. tight white sports bra and black leggings. Canon EOS R5. Hair worn down, flowing naturally. No makeup, natural bare face. Visible pores on forehead and nose. Subtle natural skin texture with fine detail. Baby hairs at temples catching the light. Defined facial features. Fabric texture visible on clothing with natural stretch and compression. Plain solid fabric, no logos, no branding, no text. Keep the exact same background color and tone from the reference image layout template. Flat even studio lighting, no directional shadows, no color cast. Photorealistic.
```

---

## What Changed from Current (`buildWizardPrompt`)

| Part | Before (Strategy A) | After (Strategy M) |
|------|--------------------|--------------------|
| Realism | `Visible pores, photorealistic` | Full realism block (see above) |
| Hair | Not specified | `Hair worn down, flowing naturally` |
| Makeup | Not specified | `No makeup, natural bare face` |
| Fabric | Not specified | `Fabric texture visible...plain solid fabric, no logos, no branding, no text` |
| Background | Implied by silhouette | `Keep exact same background color and tone from reference image layout template` |
| Lighting | Not specified | `Flat even studio lighting, no directional shadows, no color cast` |

---

## What We Tested (17 Strategies, A through P)

| ID | What It Was | Result |
|----|------------|--------|
| A | Current app (baseline) | Decent but faces too AI-smooth |
| B | Full realism (6 anchors) | Better faces but gray backgrounds, shadowy lighting |
| C | Attractiveness++ (gorgeous language only) | Attractive but no realism improvement |
| D | Hybrid (realism + gorgeous) | Mixed, background issues |
| E | Clean realism (skin + hair, flat bg) | Good, close to winner |
| D-Fixed | D with explicit white bg | Better than D, not as good as F |
| F | All 6 anchors + explicit white bg + flat lighting | **Top tier.** Clean, real, attractive |
| G | F + gorgeous language | Similar to F, gorgeous didn't consistently help |
| H | TRUE full realism (added under-eye, uneven skin, camera artifacts) | Under-eye made them look tired |
| I | H + gorgeous | Same problem as H |
| J | Best shot (toned eyebags, no makeup, hair down, gorgeous) | Eyebags still too much |
| K | Full send (max realism + directional shadows) | Trash. Dark and shadowy |
| L | F + hair down + no makeup + no logos | **Top tier.** Very close to M |
| **M** | **L with bg color from template reference** | **WINNER** |
| N | M + gorgeous language | Good but gorgeous didn't add consistent value |
| O | M but iPhone 17 Pro Max instead of Canon | Different vibe, not better |
| P | O + gorgeous | Same, iPhone didn't help |

---

## Rules (DO and DO NOT)

### DO include in wizard prompts:
- `Hair worn down, flowing naturally` (female only)
- `No makeup, natural bare face` (female only)
- `Visible pores on forehead and nose`
- `Subtle natural skin texture with fine detail`
- `Baby hairs at temples catching the light`
- `Defined facial features`
- `Fabric texture visible on clothing with natural stretch and compression`
- `Plain solid fabric, no logos, no branding, no text`
- `Keep the exact same background color and tone from the reference image layout template`
- `Flat even studio lighting, no directional shadows, no color cast`
- `Canon EOS R5` (tested, works better than iPhone for wizard)

### DO NOT include in wizard prompts:
- ~~Under-eye shadows/texture/fine lines~~ (makes them look tired, confirmed in H/I/J)
- ~~Uneven skin tone / redness~~ (makes them look blotchy)
- ~~"Gorgeous/stunning/stops you mid-scroll"~~ (doesn't consistently help, can add as optional "super hot" toggle)
- ~~Directional lighting / gentle shadows~~ (turns background gray, confirmed in B/K)
- ~~Camera artifacts / edge softness~~ (unnecessary for studio reference)
- ~~Nail detail / jewelry~~ (irrelevant for wizard crop)
- ~~Environmental noise~~ (irrelevant, white bg)
- ~~"Never smooth or airbrushed"~~ (tells model to degrade skin)
- ~~"Shot on iPhone"~~ (generates Instagram UI overlays)
- ~~iPhone camera specs~~ (tested in O/P, Canon works better for wizard)

### Future idea:
- Optional "super hot" toggle that adds gorgeous language (C/N style). Not default, but available for users who want maximum attractiveness at slight cost to realism.

---

## Implementation

Update `buildWizardPrompt()` in `src/lib/prompts.ts`:
1. Add the realism block after the camera line
2. Add hair down + no makeup for female creators
3. Add fabric/logo instructions
4. Add background + lighting instructions
5. Keep `wrapWithSilhouette()` unchanged
6. Keep `Canon EOS R5` as the camera

This is ONLY for wizard generation. Content generation has its own prompt strategy (tested separately, documented in `PROMPT-AB-TEST-RESULTS.md`).

---

## Amendment 1 (2026-04-09): Simplify Realism Block

After reviewing admin seed batch results that used the current A strategy (minimal realism) and produced excellent results, the M formula was over-specified. The granular realism anchors (skin texture, baby hairs, defined facial features) were adding noise without clear improvement. The model handles those well on its own.

**Revised realism block (Female):**
```
Hair worn down, flowing naturally. No makeup, natural bare face. Visible pores, photorealistic. Plain solid fabric, no logos, no branding, no text. Keep the exact same background color and tone from the reference image layout template. Flat even studio lighting, no directional shadows, no color cast.
```

**Revised realism block (Male):**
```
Visible pores, photorealistic. Plain solid fabric, no logos, no branding, no text. Keep the exact same background color and tone from the reference image layout template. Flat even studio lighting, no directional shadows, no color cast.
```

**What was removed:**
- ~~Visible pores on forehead and nose~~ → simplified to just `Visible pores, photorealistic`
- ~~Subtle natural skin texture with fine detail~~ → model does this fine on its own
- ~~Baby hairs at temples catching the light~~ → too specific, model handles hair naturally
- ~~Defined facial features~~ → redundant, the model already does this
- ~~Fabric texture visible on clothing with natural stretch and compression~~ → over-specified

**What stays:**
- `Hair worn down, flowing naturally` (keeps hair consistent)
- `No makeup, natural bare face` (keeps reference clean)
- `Visible pores, photorealistic` (proven baseline anchor)
- `Plain solid fabric, no logos, no branding, no text` (prevents random logos)
- `Keep the exact same background color and tone from the reference image layout template` (bg consistency)
- `Flat even studio lighting, no directional shadows, no color cast` (prevents gray/shadowy bg)

**Why:** Less is more. The current A strategy with minimal prompting produces hot results because the model isn't fighting against overly specific instructions. The key additions from M that matter are the control instructions (hair, makeup, logos, background, lighting) not the realism descriptors.
