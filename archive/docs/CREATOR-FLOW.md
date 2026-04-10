# Creator Flow - Complete Spec

> The full journey from "I want an AI creator" to "I'm confident making content with them"

---

## The Problem We're Solving

In the manual workflow (AICA course), people:
1. Create a base image ✓
2. Start making content...
3. Realize the face isn't consistent across scenes 😫
4. Go back, tweak, try again
5. Waste hours/credits on trial and error

**Our solution:** Don't let them move forward until we PROVE the creator works.

---

## Flow Overview

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│   1. WIZARD          2. GENERATE        3. VALIDATE         │
│   Fill out form  →   Create base   →   Test in scenes  →   │
│                      Pick favorite     See it work          │
│                                                             │
│                            ↓                                │
│                                                             │
│   4. CONFIRM         5. SAVE           6. MAKE CONTENT      │
│   Happy with it? →   Store creator →   Templates/etc        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Phase 1: The Wizard (Collect Inputs)

### What We Need From User

**Required:**
| Input | Type | Options |
|-------|------|---------|
| Gender | Radio | Female / Male / Non-binary |
| Age Range | Dropdown | 18-22, 23-27, 28-35, 35-45, 45+ |
| Ethnicity | Dropdown | Caucasian, Asian, Black, Hispanic, Middle Eastern, South Asian, Mixed, Other |
| Skin Tone | Slider/Picker | Light → Dark (with visual) |
| Eye Color | Buttons | Blue, Brown, Green, Hazel, Gray, Amber |
| Hair Color | Dropdown | Blonde, Brunette, Black, Red, Auburn, Gray, Platinum, etc. |
| Hair Length | Buttons | Short, Medium, Long, Very Long |
| Hair Texture | Buttons | Straight, Wavy, Curly, Coily |
| Body Type | Buttons | Slim, Athletic, Average, Curvy, Plus-size |
| Chest Size (F) | Buttons | Small, Medium, Medium-Large, Large |

**Optional/Enhancing:**
| Input | Type | Purpose |
|-------|------|---------|
| Face Shape | Buttons | Oval, Round, Square, Heart, Oblong |
| Eye Shape | Buttons | Almond, Round, Hooded, Monolid, Deep-set |
| Lip Size | Buttons | Thin, Medium, Full, Very Full |
| Nose Type | Buttons | Straight, Button, Aquiline, Wide |
| Distinctive Features | Checkboxes | Freckles, Beauty mark, Dimples, Gap teeth |
| Vibe Tags | Multi-select | Girl next door, Glamorous, Edgy, Fitness, etc. |
| Expression | Radio | Warm/Friendly, Confident, Mysterious, Playful |

### UX Approach

**Progressive disclosure:**
- Screen 1: Gender, Age, Ethnicity (the basics)
- Screen 2: Skin, Eyes, Face
- Screen 3: Hair
- Screen 4: Body
- Screen 5: Vibe/Style (optional, can skip)

**Show visual references:**
- For each option, show example images
- "Wavy hair looks like this" with sample
- Helps non-visual people understand

---

## Phase 2: Generate Base Images

### Behind the Scenes

We take all inputs and build the master prompt:

```javascript
const prompt = buildBaseImagePrompt({
  gender: 'female',
  age: '25',
  ethnicity: 'Caucasian',
  skinTone: 'light with warm undertones',
  eyeColor: 'blue',
  eyeShape: 'almond',
  faceShape: 'oval',
  lips: 'full',
  hairColor: 'blonde',
  hairLength: 'long',
  hairTexture: 'wavy',
  bodyType: 'athletic',
  chestSize: 'medium-large',
  vibes: ['girl next door', 'fitness'],
  expression: 'warm and friendly',
  distinctiveFeatures: ['light freckles']
});

// Result:
// "Front-facing portrait of a 25-year-old Caucasian woman, 
// raw iPhone photography style, visible from waist up, standing straight 
// with arms relaxed, facing camera directly against pure white seamless 
// studio background. She is wearing a white sports bra, revealing an 
// athletic upper body with medium-large chest..."
```

### Generation Settings

- **Model:** Nano Banana Pro (via OpenArt/Fal.ai)
- **Aspect Ratio:** 9:16
- **Resolution:** 2K initially (upscale later)
- **Count:** Generate 4 variations
- **Seed:** Random (for variety)

### User Picks Favorite

Show 4 options side by side. User taps to select.

Options:
- **"Generate More"** - 4 new variations with same settings
- **"Adjust & Regenerate"** - Go back, tweak inputs
- **"Select This One"** - Proceed with chosen image

---

## Phase 3: Validate (The Key Step)

### Why This Matters

The base image is just a portrait. Will this face look consistent when:
- Seen from different angles?
- In different outfits?
- In different settings/lighting?
- Doing different poses?

**If we don't validate, user will discover issues AFTER they've committed.**

### Auto-Validation Suite

Once user selects a base image, we automatically generate a "test suite":

```
VALIDATION SET (5-6 images, auto-generated):

1. SIDE PROFILE
   "Side profile portrait of that woman, same styling, 
   white studio background, raw iPhone photography"

2. THREE-QUARTER ANGLE
   "Three-quarter angle portrait of that woman, 
   slight smile, white studio background"

3. DIFFERENT OUTFIT
   "That woman wearing a black fitted dress, 
   standing relaxed, minimalist indoor setting"

4. CASUAL SCENE
   "That woman in a cozy living room, 
   wearing loungewear, natural lighting, candid feel"

5. OUTDOOR
   "That woman outdoors, golden hour lighting, 
   casual outfit, street photography style"

6. CLOSE-UP
   "Extreme close-up of that woman's face, 
   natural lighting, visible skin texture"
```

### Validation UI

```
┌─────────────────────────────────────────────────────────────┐
│  LET'S MAKE SURE YOUR CREATOR WORKS                         │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  We're testing your creator in different scenarios...       │
│                                                              │
│  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐          │
│  │Base │ │Side │ │ 3/4 │ │Dress│ │Home │ │Out- │          │
│  │     │ │     │ │     │ │     │ │     │ │door │          │
│  └─────┘ └─────┘ └─────┘ └─────┘ └─────┘ └─────┘          │
│    ✓       ✓       ✓       ✓      loading...               │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                       │   │
│  │              [Selected image large view]              │   │
│  │                                                       │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                              │
│  Does this look like the same person across all images?      │
│                                                              │
│  [😍 Yes, looks great!]  [🤔 Something's off, let me tweak] │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### If Something's Off

User can:
1. **Regenerate validation set** - Maybe just bad generations
2. **Go back to base selection** - Pick a different base image
3. **Adjust inputs** - Change hair, face shape, etc.
4. **Minor tweaks** - "Make her lips slightly smaller" etc.

### Consistency Scoring (Future)

We could build automated consistency checking:
- Face embedding comparison across images
- Flag if consistency score < threshold
- "These images might not look consistent enough"

---

## Phase 4: Confirm & Name

Once validated:

```
┌─────────────────────────────────────────────────────────────┐
│  🎉 YOUR CREATOR IS READY!                                  │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌───────────────────┐                                      │
│  │                   │   Name your creator:                 │
│  │   [Final Image]   │   [Sophia____________]              │
│  │                   │                                      │
│  │                   │   Niche/Category:                    │
│  └───────────────────┘   [Fitness & Lifestyle ▼]           │
│                                                              │
│                          [Create Another] [Start Creating →]│
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Phase 5: Store Creator Data

### What We Save

```javascript
{
  id: "creator_abc123",
  userId: "user_xyz",
  name: "Sophia",
  niche: "fitness_lifestyle",
  createdAt: "2026-02-24T...",
  
  // Base assets
  baseImageUrl: "s3://ai-creator-app-bucket-for-my-app/creators/abc123/base.png",
  baseImageUpscaledUrl: "s3://ai-creator-app-bucket-for-my-app/creators/abc123/base_4k.png",
  
  // All the inputs (for regeneration/variations)
  settings: {
    gender: "female",
    age: "23-27",
    ethnicity: "Caucasian",
    skinTone: "light_warm",
    eyeColor: "blue",
    // ... all other inputs
  },
  
  // Validation images (for reference)
  validationImages: [
    { type: "side_profile", url: "s3://ai-creator-app-bucket-for-my-app/..." },
    { type: "three_quarter", url: "s3://ai-creator-app-bucket-for-my-app/..." },
    // ...
  ],
  
  // Voice (set up later)
  voiceId: null,
  
  // Stats
  contentCount: 0,
  lastUsed: null
}
```

---

## Phase 6: Ready for Content

Now they can:

### Option A: Template Library
Browse pre-made viral content templates:
- "Mirror selfie - gym"
- "Get ready with me"
- "POV: your girlfriend..."
- "Day in my life"
- etc.

### Option B: Free Prompt
Power users can write their own scene descriptions.
We inject their creator automatically.

### Option C: "Steal This Video"
Paste a viral video link → we analyze it → recreate with their creator.
More on this in CONTENT-FLOW.md.

---

## Edge Cases & Considerations

### Multiple Creators
- Users might want multiple creators (different niches)
- Or variations of same creator (summer look, winter look)
- Account tiers: Free = 1 creator, Pro = 5, Business = unlimited

### Creator Variations
- Same person, different default outfit
- Same person, different hair color
- Should these be separate creators or variations?

### Regeneration
- What if they want to change their creator later?
- Keep old content? Or does it break?
- Maybe "fork" - create new version, keep old

### Consistency Over Time
- Image models update/change
- Creator might look different months later
- Need to store model version used?
- Or rely on base image as anchor?

---

## Technical Considerations

### Generation Queue
- Don't block UI during generation
- Show progress: "Generating image 2 of 4..."
- Webhook or polling for completion

### Image Storage
- Store all generated images (even rejects)
- User might want to go back
- Also useful for training/improving

### Caching
- Cache common generation patterns
- Pre-generate some validation images in background

### Rate Limiting
- Prevent spam generation
- Credits system or daily limits on free tier

---

## Metrics to Track

- Time from wizard start → creator saved
- Drop-off at each wizard step
- Validation pass rate (happy first try vs had to tweak)
- Most common tweaks requested
- Creators per user
- Content per creator

---

*v1 - 2026-02-24*
