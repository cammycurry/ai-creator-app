# UGC Realism System — Reference

> Source: External UGC creator skill system. Adapted for our generation pipeline.

## 10 Realism Anchors

Apply all 10 to every generation. These make AI images pass the scroll test.

1. **Skin pores** — visible on forehead, nose, cheeks. Never smooth or airbrushed
2. **Stray hairs** — baby hairs at temples, flyaways catching backlight, imperfect part line
3. **Under-eye texture** — slight shadows, fine lines, natural discoloration
4. **Uneven skin tone** — redness on nose/cheeks, sun damage variation, visible veins on temples
5. **Fabric texture** — visible weave, wrinkles where body bends, pilling on worn fabrics
6. **Environmental noise** — 3+ real objects: charger cable, water bottle, earbuds, hair tie
7. **Lighting imperfection** — mixed color temps, window overexposure, wall color cast
8. **Camera artifacts** — shadow noise, edge softness, chromatic aberration, slight motion blur
9. **Nail detail** — cuticles visible, chipped polish, natural ridges
10. **Jewelry physics** — chains drape with gravity, earrings catch light unevenly

## 4 Camera Simulation Profiles

### Selfie Front Cam
- iPhone 15 Pro TrueDepth, f/1.9, 12MP
- Slight barrel distortion, wider nose/forehead
- Screen light reflection in eyes
- Skin smoothing artifacts on cheeks

### Rear Cam
- iPhone 15 Pro main, f/1.78, 48MP
- Sharper detail, natural bokeh
- True-to-life proportions
- Less flattering but more "real"

### Mirror Selfie
- Rear cam in mirror, text reversed
- Mirror edge visible, bathroom/bedroom setting
- Slight camera tilt, one hand holding phone
- Mirror smudges, toothbrush in background

### Overhead Flatlay
- Phone held overhead, looking down
- Slight arm shadow, products arranged below
- Bed/desk surface texture, natural clutter
- Face foreshortened, chin tucked

## 6-Layer Prompt System

Every generation prompt should include all 6 layers:

1. **Character Lock** — the prompt seed (dense paragraph about this specific person)
2. **Scenario** — what they're doing, the action, the context
3. **Environment** — where they are, background details, objects
4. **Camera** — which camera profile, angle, distance, lens
5. **Realism Injection** — the 10 anchors applied to this specific scene
6. **Negative Prompt** — what to avoid (airbrushed, smooth skin, stock photo, centered composition, perfect lighting)

## Prompt Seed Concept

A prompt seed is a **dense paragraph** describing a specific person that gets pasted into EVERY generation for that creator. It locks their identity across all content.

Example:
> "That exact 24-year-old mixed Black and Latina woman with dark brown wavy hair with caramel highlights falling to mid-chest. Warm golden skin with natural dewy finish, beauty mark below her left eye. Almond-shaped dark brown eyes with visible lash line, full natural lips with subtle gloss. Soft rounded jawline, small nose with slight upturn. Always wearing thin gold hoop earrings and a dainty gold chain necklace. Skin tone #C68642 with natural undertone variation."

This seed should be generated when the user picks their base image during the creator wizard. AI analyzes the selected image and writes the seed.

## 12 Anti-Patterns (Things That Expose AI)

1. Perfectly smooth skin (no pores)
2. Symmetrical face
3. Perfect hair (no flyaways)
4. Stock photo lighting (flat, even)
5. Empty backgrounds (no clutter)
6. Perfect nails
7. Floating jewelry (no weight)
8. Text in images (usually garbled)
9. Centered composition (real selfies are off-center)
10. No camera artifacts (too sharp, no noise)
11. Identical skin tone everywhere (no variation)
12. Perfect teeth (too white, too straight)

## Background Realism Kits

### Bedroom
- Unmade bed corner, fairy lights, charger cable, water bottle on nightstand
- Warm lamp light mixed with window daylight

### Bathroom
- Mirror with toothbrush holder, towel rack, soap dispenser
- Bright overhead + warm side light, steam on mirror edge

### Kitchen
- Counter with cutting board, fruit bowl, coffee mug
- Under-cabinet lighting, window light, stainless steel reflections

### Living Room
- Couch corner, throw blanket, remote control, plant
- TV glow mixed with window light, bookshelf in background

## UGC Shot Types

1. **Product Review** — selfie talking head, holding product near face
2. **Routine** — mirror selfie, applying product step by step
3. **GRWM** — morning routine, skincare sequence
4. **Haul** — showing purchases one by one
5. **Storytime** — face cam, animated expressions, hand gestures
6. **Before/After** — same angle, same light, only result changes
7. **Lifestyle** — candid, in-context: gym, kitchen, car, desk
