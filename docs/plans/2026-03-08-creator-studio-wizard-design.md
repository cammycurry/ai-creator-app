# Creator Studio Wizard — Design Document

## Overview

Replace the current cramped text-box wizard with a full **Creator Studio** — a near-full-screen immersive modal where users build their AI persona through visual pickers (swatches, thumbnails, chips), like a character creator in a video game. Based on deep research of all course materials (AIAC, AI Realism, AI OFM) and the generation pipeline docs.

## Core Concept

**"Build your person, see them come to life."**

A two-panel layout:
- **Left**: Live preview area (9:16 portrait)
- **Right**: Tabbed trait picker with visual controls

Users freely jump between categories, picking options visually. Any trait left blank = AI interprets creatively (the "surprise me" factor). When ready, hit Generate → pick from 4 variations → validate consistency → name & save.

---

## Layout

```
┌──────────────────────────────────────────────────────────────────────┐
│  ✕  Create Your AI Persona                      [✏️ Describe It]    │
├─────────────────────┬────────────────────────────────────────────────┤
│                     │  Basics   Face   Hair   Body   Style           │
│                     │────────────────────────────────────────────────│
│                     │                                                │
│   ┌─────────────┐   │  Gender                                       │
│   │             │   │  ┌──────┐  ┌──────┐  ┌──────┐                 │
│   │  PREVIEW    │   │  │Female│  │ Male │  │Other │                 │
│   │             │   │  └──────┘  └──────┘  └──────┘                 │
│   │  9:16       │   │                                                │
│   │  portrait   │   │  Age                                           │
│   │             │   │  [18-22] [23-27] [28-35] [35-45] [45+]        │
│   │  silhouette │   │                                                │
│   │  → then     │   │  Ethnicity                                     │
│   │  generated  │   │  [chips: Caucasian, Asian, Black, Hispanic,    │
│   │  images     │   │   Middle Eastern, South Asian, Mixed]          │
│   │             │   │                                                │
│   └─────────────┘   │  Skin Tone                                     │
│                     │  ● ● ● ● ● ● ● ● (gradient swatches)         │
│                     │                                                │
├─────────────────────┴────────────────────────────────────────────────┤
│  💡 Leave any field blank — AI will surprise you     [Generate →]    │
└──────────────────────────────────────────────────────────────────────┘
```

### Dimensions
- Modal: ~95vw × 92vh (near-full-screen)
- Left panel: ~35% width
- Right panel: ~65% width
- Border-radius: 20px
- Backdrop: blurred dark overlay

---

## The 5 Tabs

### Tab 1: Basics
- **Gender**: 3 large cards (Female / Male / Other) with simple icons
- **Age**: chip row (18-22, 23-27, 28-35, 35-45, 45+)
- **Ethnicity**: chip row (Caucasian, Asian, Black, Hispanic, Middle Eastern, South Asian, Mixed)
- **Skin Tone**: horizontal swatch row — 8 circles in a gradient from light to dark, click to select

### Tab 2: Face
- **Eye Color**: 6 color circles (Blue, Brown, Green, Hazel, Gray, Amber) with labels
- **Eye Shape**: chip row (Almond, Round, Hooded, Monolid, Deep-set)
- **Face Shape**: chip row (Oval, Round, Square, Heart, Oblong)
- **Lips**: chip row (Thin, Medium, Full, Very Full)
- **Distinctive Features**: multi-select checkboxes (Freckles, Beauty mark, Dimples, Gap teeth)

### Tab 3: Hair
- **Color**: large swatches (Blonde, Brunette, Black, Red, Auburn, Gray, Platinum) — colored circles
- **Length**: chips with mini illustrations (Short, Medium, Long, Very Long)
- **Texture**: chips (Straight, Wavy, Curly, Coily)

### Tab 4: Body
- **Build**: 5 option cards with descriptions (Slim, Athletic, Average, Curvy, Plus-size)
- **Chest Size** (shown for Female only): chips (Small, Medium, Medium-Large, Large)
- **Height**: chips (Petite, Average, Tall)

### Tab 5: Style
- **Vibe**: multi-select cards, pick up to 3 (Girl Next Door, Glamorous, Edgy, Fitness, Soft/Cute, Sophisticated, Natural Beauty, Exotic)
- **Expression**: single-select chips (Warm & Friendly, Confident, Mysterious, Playful)

---

## AI Autofill / "Surprise Me"

Any trait the user doesn't explicitly pick → the AI (Grok) fills in creatively when assembling the prompt. The footer has a subtle hint: "Leave any field blank — AI will surprise you."

This means:
- A user could pick ONLY "Female, 25, Blonde" and hit Generate — the AI fills in everything else
- Or they could meticulously pick every single trait
- Or they could type a full description via the "Describe It" shortcut (opens a text overlay on the right panel) — the LLM parses it and pre-fills the visual pickers

The "Describe It" flow:
1. User clicks "Describe It" in header
2. Right panel shows a large textarea: "Describe your creator in your own words..."
3. User types e.g. "Athletic blonde woman, 25, blue eyes, freckles, fitness vibe"
4. On blur/submit, Grok parses the description and auto-selects the matching visual options
5. User can then fine-tune individual traits in the tabs

---

## The Preview Area (Left Panel)

### Phase 1: Customization
- Shows a stylized silhouette placeholder with the app's warm gradient
- As user picks options, preview could show a text summary of selections (e.g. "Female · 25 · Blonde · Athletic") — we're NOT doing real-time generation previews (too expensive)

### Phase 2: Generation Results
- Preview transforms into a 2×2 grid of 4 generated images
- Each image is 9:16, clickable
- Shimmer loading state while generating
- Selected image gets an accent border + check badge
- "Generate 4 more" link below the grid

### Phase 3: Validation
- Shows the selected base image at top (smaller)
- Below: 5 validation images in a row/grid (Side profile, 3/4 angle, Outfit change, Outdoor, Close-up)
- Each labeled underneath
- "Does this look like the same person?"
- Two clear buttons: "Looks great!" / "Try again"

### Phase 4: Finish
- Shows the final selected image (large)
- Right panel switches to: Name input + Niche picker (chips) + "Create" button

---

## Entry Points

The studio supports 3 entry paths (shown as the first thing when the modal opens, before the tabs):

### Option A: Build from Scratch
→ Opens the 5-tab visual picker (default)

### Option B: Describe It
→ Opens a text box, then auto-fills visual pickers from the description

### Option C: Start from Template
→ Shows premade creator cards (Luna, Kai, Aria, Zara, Marcus, Nyx)
→ Selecting one pre-fills ALL traits and jumps straight to Generate

These 3 options could be shown as a brief intro screen OR as header-level toggles.

---

## Prompt Assembly (Behind the Scenes)

When user hits "Generate", the system:

1. Collects all selected traits (with blanks noted)
2. Sends to Grok with the system prompt:
   - "You are an expert AI image prompt engineer. Given these character traits, create a detailed image generation prompt. For any trait marked as 'not specified', make a creative choice that fits the overall character. Always include: raw iPhone photography style, visible natural skin texture with pores and slight imperfections, front-facing portrait, waist up, pure white seamless studio background. Keep it under 200 words."
3. Grok returns the enhanced prompt
4. Prompt sent to fal.ai (nano-banana-2) × 4 parallel calls with `safety_tolerance: "6"`
5. Images returned and shown in preview area

---

## Validation (Consistency Test)

After user picks their favorite base image:

1. System auto-generates 5 test scenes using the edit endpoint:
   - Side profile
   - Three-quarter angle
   - Different outfit (black fitted dress)
   - Outdoor scene (golden hour)
   - Extreme close-up

2. Each uses the selected base as reference + "that woman/man" in the prompt

3. User sees all 5 + base in the preview area

4. Binary choice: "Looks great!" → proceed to naming. "Something's off" → options to regenerate validation, pick different base image, or adjust traits.

---

## Mobile Considerations

On mobile (< 768px):
- Single column layout (preview stacks above picker)
- Preview area is shorter (fixed ~200px height)
- Tabs become a horizontal scrollable bar
- Same visual pickers, just full-width

---

## State Shape

```javascript
{
  phase: 'customize' | 'generating' | 'picking' | 'validating' | 'finishing',
  entryPath: 'scratch' | 'describe' | 'template',
  traits: {
    gender: null | 'female' | 'male' | 'other',
    age: null | '18-22' | '23-27' | '28-35' | '35-45' | '45+',
    ethnicity: null | string,
    skinTone: null | number (0-7 index),
    eyeColor: null | string,
    eyeShape: null | string,
    faceShape: null | string,
    lips: null | string,
    features: [] (multi-select),
    hairColor: null | string,
    hairLength: null | string,
    hairTexture: null | string,
    build: null | string,
    chestSize: null | string (female only),
    height: null | string,
    vibes: [] (multi-select, max 3),
    expression: null | string,
  },
  description: null | string (from Describe It),
  generatedImages: [],
  selectedImageIndex: null,
  validationImages: [],
  creatorName: '',
  niche: null,
}
```

---

## What This Replaces

The entire current wizard (steps 1-4: Start → Generate → Validate → Finish) gets replaced by the Creator Studio. The premade templates are absorbed as an entry path. All existing wizard CSS and JS gets replaced.
