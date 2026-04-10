# Prompt A/B/C Test Results — Realism Anchors

> **Date:** 2026-04-08
> **Creator:** Sienna (face ref: `scripts/output/sienna-v3/image-3.jpg`)
> **Model:** gemini-3-pro-image-preview (NBPro)
> **Output:** `scripts/output/realism-ab-test/` and `scripts/output/realism-abc-test/`

---

## What We Tested

Three prompt strategies for content generation, compared across 3 scenes (bedroom selfie, mirror selfie, couch selfie):

**A — Current style (simple)**
Single paragraph. "Shot on iPhone, candid. Visible pores, photorealistic." No structured sections, no environment details.

**B — Full UGC Realism System (6-layer)**
Structured prompt with CHARACTER, SCENARIO, ENVIRONMENT, CAMERA, REALISM, AVOID sections. All 10 realism anchors including skin degradation (under-eye shadows, uneven skin tone, redness on cheeks). Negative prompts (avoid airbrushed, centered composition, etc).

**C — Hybrid (hot girl + real environment)**
Same structured sections as B but KEEPS the girl gorgeous. Drops skin degradation anchors. Adds "she looks absolutely gorgeous / stunning / smoke show" throughout. Keeps environment realism (clutter, objects, fabric texture) and camera characteristics.

---

## Round 1: A vs B (Current vs Full Realism)

### Bedroom Selfie
- **A:** She's hot. Great skin, sexy sleepy vibe. But environment is plain — just white sheets, nothing else.
- **B:** Better lighting (window stripe shadows, nightstand with water bottle). But face is less attractive — pushed too far toward "woke up rough" instead of "woke up gorgeous."
- **Winner: A for hotness, B for environment.** Neither is perfect.

### Mirror Selfie
- **A:** Way hotter. Body looks amazing, marble bathroom is aspirational, she looks like a real Instagram baddie.
- **B:** More realism (towel on hook, hair tie on wrist, fabric texture is better). But she's less attractive, composition is tighter/less flattering. Phone text is garbled.
- **Winner: A.** The realism anchors hurt attractiveness.

### Couch Selfie
- **A:** Hotter and honestly more realistic too. Great lamp lighting, natural pose, genuinely cute.
- **B:** More environmental noise (remote, wine glass, charger cable, throw blanket). But she looks more plain. Freckles overdone.
- **Winner: A.** Realism anchors made her less attractive without enough environment improvement to justify it.

### Round 1 Verdict
The full realism system makes the ENVIRONMENT more believable but makes the GIRL less hot. "Under-eye shadows, uneven skin tone, slight redness" actively fights attractiveness. The "avoid airbrushed skin" instruction tells the model to make her look worse.

---

## Round 2: A vs C (Current vs Hybrid)

### Bedroom Selfie
- **A:** Generated an Instagram story UI overlay — fake username, timestamp, X button. "Shot on iPhone" language confused Gemini into generating a screenshot OF Instagram rather than a photo. The image underneath is decent but the UI ruins it.
- **C:** No UI overlay. Window light stripes across the bed are beautiful. Water bottle and nightstand add realism. She looks hot — gorgeous sleepy face, messy hair, the tank top looks real. Natural iPhone selfie angle.
- **Winner: C clearly.** A got the iPhone UI bug, C nailed it.

### Mirror Selfie
- **A:** Gorgeous. Body looks incredible. Marble bathroom is aspirational and clean. Great lighting, strong confident pose. Really really good.
- **C:** Also great. Towel on hook, toothbrush, product bottles on counter add genuine bathroom realism. She's smiling which is warmer. Mirror edge visible. Slightly more "real Instagram" feeling vs A's "professional photo" feeling.
- **Winner: Tie, slight edge to C.** Both are hot. C has more believable environment. A's bathroom is maybe too aspirational/clean to feel like a real selfie.

### Couch Selfie
- **A:** She looks hot. Good warm lamp lighting, natural pose, genuinely cute girlfriend-vibe. Clean composition.
- **C:** The remote, charger cable, throw blanket are visible — more realistic room. But face is slightly less attractive — freckles heavier, she looks a bit different from the reference. The selfie angle is less flattering.
- **Winner: A for hotness. C for environment.** Close call — A is probably the one you'd actually post to Instagram.

### Round 2 Verdict
The hybrid approach works. Environment anchors (clutter, objects, fabric texture, camera characteristics) improve realism without hurting attractiveness — WHEN you also reinforce "she looks gorgeous" throughout the prompt. The key is:
- Environment realism: YES (objects, clutter, lighting)
- Camera realism: YES (front cam angle, off-center, slight motion blur)
- Fabric/material realism: YES (wrinkles, texture, draping)
- Skin degradation: NO (under-eye shadows, redness, uneven tone)
- Negative prompts about skin: NO ("avoid airbrushed" makes her worse)

---

## Final Prompt Strategy

### DO include (from realism system):
1. **Environmental noise** — 3+ real objects in the scene (charger cable, water bottle, remote, hair tie on wrist, etc.)
2. **Camera characteristics** — iPhone front camera angle, off-center composition, slight motion blur on hand
3. **Fabric texture** — visible weave, wrinkles where body bends, oversized draping
4. **Stray hairs** — baby hairs catching backlight, imperfect part line
5. **Lighting description** — mixed color temps (lamp + window), directional light, warm/cool contrast
6. **Structured sections** — ENVIRONMENT and CAMERA as separate labeled blocks help Gemini understand what goes where

### DO NOT include:
1. ~~Under-eye shadows/texture~~ — makes her look tired
2. ~~Uneven skin tone / redness~~ — makes her look blotchy
3. ~~"Avoid airbrushed skin"~~ — tells model to make skin worse
4. ~~Nail detail / chipped polish~~ — unnecessary, sometimes makes hands look bad
5. ~~"Shot on iPhone"~~ — Gemini sometimes generates Instagram UI overlays. Use "iPhone photo quality" or just describe camera characteristics directly

### ALWAYS include:
- Reinforcement that she looks gorgeous/stunning/hot throughout the prompt
- "Visible pores, photorealistic" (our existing anchor — works great)
- The face reference image (non-negotiable for consistency)

### Prompt Structure (recommended):
```
[Face ref instruction]. That exact woman from the reference.

[Scene/action description]. She looks [gorgeous/stunning/incredibly hot].

ENVIRONMENT: [3+ real objects, room details, clutter]

CAMERA: [iPhone front/rear cam, angle, composition, distance]

REALISM: [Fabric texture, stray hairs catching light, environmental objects. NO skin degradation.]

[Final reinforcement]. Visible pores, photorealistic.
```

---

## Next Steps
- [ ] Update `CONTENT_ENHANCE_PROMPT` in `src/lib/prompts.ts` to teach Grok this structure
- [ ] Update `buildSampleContentPrompts()` to use this format
- [ ] Test with Valentina to confirm it works across different creators
- [ ] Never say "Shot on iPhone" — describe camera characteristics instead
