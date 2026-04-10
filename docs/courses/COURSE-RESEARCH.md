# Course Research — What Applies to the App

> Synthesized from 100+ course files across AIAC, AI Realism, and AI OFM courses.
> Source: `/docs/courses/`

---

## TL;DR — The 10 Things That Matter Most for the App

1. **Nano Banana Pro is the best model for realistic AI influencer images** — confirmed across all courses
2. **Character consistency = one base reference image + "that woman/man" in every prompt** — this is the entire system
3. **Imperfections create realism** — always include "natural skin texture, visible pores, subtle imperfections" in prompts
4. **The prompt pipeline is a two-tier system**: LLM generates prompts → Image model generates images. Users should never write raw prompts
5. **Kling 2.6/3.0 for video, ElevenLabs V3 for voice, Pixverse/HeyGen for lip sync** — the production stack
6. **Upscaling is mandatory** — every image through Lupa/Topaz at 4K before use
7. **Content strategy has 4 pillars**: Possibility, Connection, Value, Proof — the app should help users create all 4
8. **The ABC method (Attention/Body/CTA) structures ALL content** — hooks, reels, stories, carousels, threads
9. **Profile setup is a science** — bio follows pyramid structure, username must be clean, highlights = landing page sections
10. **Conversion > followers** — $100K with 8K followers vs $5K with 400K. The app should optimize for conversion, not vanity metrics

---

## I. Character Creation & Consistency

### Base Image Standard
Every AI influencer starts with one standardized base image:
- **Framing**: Front-facing, waist-up
- **Background**: Pure white studio
- **Clothing**: White sports bra (female) / shirtless (male)
- **Style**: Raw iPhone photography
- **Skin**: Visible natural facial skin texture with detailed pores and slight imperfections
- **Expression**: Neutral/relaxed, no makeup

### Four Creation Pathways
1. **From Scratch** — Text-only prompt describing gender, age, skin, hair, eyes, body type
2. **From Reference Images** — 2-5 Pinterest/Instagram images as inspiration + "create a totally different person"
3. **From Existing Avatar** — Upload existing avatar + "that woman" to preserve identity while upgrading
4. **Avatar Glow Up** — Upload + describe only what to CHANGE (minimal changes = best consistency)

### Consistency System
- Always use same base image as reference for ALL generations
- Always refer to character as "that woman" / "that man" (never "a woman")
- Less prompt detail = more pickup from reference = better consistency
- Create multiple views: front portrait, full body front, full body side, close-ups
- Upload both face ref AND body ref when generating
- Body shape keywords: "she is curvy," "she is very muscular," "she is overweight"
- Tattoos: apply once to base image using "healed" keyword, save as new base

### Multi-Angle Consistency Drill
1. Upload reference image
2. Prompt: "generate multiple camera angles of the same person: front view, 3/4 left, 3/4 right, profile, slightly high angle, slightly low angle. Keep the exact same facial structure, proportions, age, and identity."
3. Do NOT change clothing, environment, or stylization at this stage
4. Then change context while preserving identity: "Keep the exact same face and identity. Only change clothing and environment."

### Character Consistency Pack (deliverables)
- 1 clean base reference image (identity anchor)
- 4+ different camera angles
- 2+ contextual variations (different outfits/environments)
- All clearly the same person

---

## II. Realism Techniques

### What Makes Images Photorealistic
- Natural skin texture with visible pores
- Subtle imperfections (asymmetry, blemishes, texture variation)
- Correct facial proportions
- Believable lighting direction and shadow behavior
- Sharp eyes
- Natural camera angles

### What Makes Images Look "AI"
- Over-smoothed, plastic skin
- Lifeless or asymmetrical eyes
- Flat lighting
- Overly tight face cropping
- Exaggerated contrast or unnatural glow

### Key Realism Prompt Phrases
- "raw iPhone photography" / "raw iPhone photography style"
- "visible skin texture" / "visible natural facial skin texture"
- "detailed pores and slight imperfections"
- "no makeup, no beauty filters, no digital retouching"
- "captured in RAW with sharp detail"
- "natural skin texture with subtle imperfections"
- "revealing natural skin imperfections and slight perspiration"

### The Director Mindset (Cinematic)
Don't use camera specs. Use descriptive visual direction:
- ❌ "Use f/1.8 aperture, 85mm lens"
- ✅ "Soft blurred background, subject sharply in focus, intimate portrait feel"
- ❌ "Set ISO 200, white balance 5600K"
- ✅ "Soft natural daylight, warm tones, gentle shadows on the face"

### Visual Vocabulary
- **Framing**: Extreme close-up, close-up, medium shot, wide shot, over-the-shoulder
- **Lighting**: Natural daylight, soft, hard, backlighting, rim light, high-key, low-key
- **Camera**: Static, handheld, slow push-in, dolly, locked-off, micro-movements
- **Focus**: Shallow/deep depth of field, selective focus, bokeh
- **Lens shortcuts**: 35mm = wide natural, 50mm = balanced/human-eye, 85mm = portrait/compressed

---

## III. Prompt Engineering

### Universal Prompt Framework (5 components)
1. **Subject** — who/what
2. **Context** — where/why
3. **Action or State** — what's happening
4. **Style or Mood** — atmosphere + visual direction
5. **Constraints** — emphasis/avoidance

### Content Generation Prompt Patterns

**POV Selfie:**
```
POV from a front selfie camera taken with one hand by that woman. [scene, clothing, setting]
```

**Mirror Selfie:**
```
Mirror selfie of that woman standing in front of the mirror. [location, phone, accessories, clothing]
```

**Third Person / Full Body:**
```
A full body shot of that woman [action]. She's wearing [outfit] and [shoes], hair in [style].
```

**Image-to-Image Exact Match (body swap):**
```
I want a person from image 1 to be in the same position and outfit as the person on image 2. Remove text and symbols from image 2. Raw iPhone photography.
```

**UGC Product Placement:**
```
That woman is holding [product] super close to the camera in [setting]
```

**Close-Up from Existing Image:**
```
close up of her face, raw iphone photography, face like on image 2, everything else like on image 1
```

### Two-Tier AI Pipeline
LLM (ChatGPT/Grok) generates prompts → Image model generates images.
- Store persona rules as immutable prompt prefix
- User only inputs the scene/variation
- LLM assembles the full prompt
- This IS the "templates = pre-built workflows users never see" concept

### Variation Levers (for content variety without changing identity)
1. **Hair style** — loose, ponytail, bun, half-up, waves, messy
2. **Camera angle** — eye-level, low, high, side profile, over-shoulder
3. **Pose** — weight shifted, hand on hip, arms relaxed, leaning
4. **Setting/environment** — bedroom, gym, cafe, street, car
5. **Lighting** — golden hour, soft bedroom, studio, natural daylight

---

## IV. Video Generation

### Image-to-Video Pipeline
1. Create base image (Nano Banana Pro)
2. Upscale through Lupa/Topaz (4K, Creativity -7 to -10)
3. Generate scene/angle variations
4. Run each through video model (Kling 2.1/2.6/3.0)
5. For transitions: Start Frame + End Frame technique
6. Stitch in CapCut, align to beat drops
7. Add audio: background music, environmental sounds, voiceover

### Video Settings
- **Model**: Kling 2.1 (real-life movement), 2.6 (motion sync/lip sync), 3.0 (latest)
- **Duration**: 10 seconds preferred, 5s for simple actions
- **Quality**: Pro or Master (never Standard)
- **Ratio**: 9:16
- **Key prompt**: Always include "camera handheld with visible motion"

### Video Prompt Structure (DFY Master Prompt)
1. Camera lens & cinematic style
2. Camera movement (zoom, rotate, dolly, follow)
3. Character motion/physical behavior (NOT appearance)
4. Background/environmental motion
5. Emotional tone/atmosphere

### Lip Sync Tiers
| Tier | Tool | Duration | Best For |
|------|------|----------|----------|
| 1 | Hedra | Short | Budget experimentation |
| 2 | Pixverse + Kling | 30 sec | Creative control, short reels |
| 3 | HeyGen Avatar 4 | 3 min uncut | Long-form talking head, podcasts |
| 4 v1 | HeyGen VEO 3.1 | 8 sec/scene | Cinematic with environmental audio |
| 4 v2 | OpenArt Kling 2.6 | 5-10 sec | All-in-one platform |

### Voice Creation (ElevenLabs V3)
- Voice Design from text prompt describing character
- Clone from 10+ second audio clip
- Professional clone from 30+ minutes
- Emotion tags: `[excited]`, `[giggles]`, `[whisper]`, `[laughs]`, `[surprised]`, `[shouting]`

---

## V. Content Strategy Framework

### Four Content Pillars
1. **Possibility** — Show what AI can do (no results needed)
2. **Connection** — Personal story, struggles, vulnerabilities
3. **Value** — Tutorials, tips, free resources
4. **Proof** — Results, milestones, testimonials (small wins are more believable)

### ABC Method (Universal Content Structure)
- **A (Attention)**: Hook — first 1-2 seconds. Turn a pain point into a hook
- **B (Body)**: Handle objections, show transformation, provide value
- **C (CTA)**: Direct action — "Comment AI," "Follow for more," link click

Works for: Reels, Stories, Carousels, Threads, Captions, Email, DMs

### Posting Frequency
- Under few thousand followers: 2-3 Reels/day
- Short content (<10 sec): 2-3/day
- Longer storytelling: 1/day
- Stories: daily sequences following ABC
- Carousels: start at ~500 followers

### Two Content Types
- **Reach**: Short, snappy, viral potential. More views, less conversion
- **Conversion**: Longer talking-head style. Fewer views, higher conversion

### Repeatable Low-Effort Formats
- "I replaced myself with AI X days ago — here's what happened"
- "Steal my prompts" carousels
- Avatar talking directly to camera
- Milestone/progress updates

---

## VI. Profile Setup & Branding

### Bio Structure (Pyramid Format)
- Line 1 (longest): Who you help and how
- Line 2: Results or credential
- Line 3: Personal result
- Line 4 (shortest): CTA → link

### Display Name Format
`[Name] | [Short Label]` (e.g., "Sophia | AI Creator Coach")

### Profile Picture
- Close-up portrait, recognizable at smallest icon size
- Contrasting colors (50% light, 50% dark)
- Approachable expression (smile)
- Same across all platforms

### Highlights (5-6 tabs)
- Start Here, Product, Results, Growth, Avatar Showcase, Testimonials

### Username Rules
- No dots, underscores, or numbers
- Memorable, pronounceable, professional
- Reserve same handle across Instagram, Threads, TikTok, YouTube

---

## VII. Monetization & Growth

### DM Conversion Script (5x response rate)
> "There's no way I'm just dropping a link here like everyone else. Let's first see if I can actually help. What are your goals with AI?"

### Growth Funnel
Threads → Instagram profile → Reels (non-follower acquisition) → Stories (conversion) → DMs (closing)

### Key Stats
- $100K in 45 days with <8K followers
- $180K with 12K followers
- People need to see offer ~18 times before purchasing
- Affiliates convert better than creators (third-party trust)

### One Brand Rule
One offer + one funnel + one target audience = brand.
Multiple offers = marketplace = confused audience = fewer sales.

---

## VIII. Models & Tools Reference

### Image Generation
| Model | Best For |
|-------|----------|
| **Nano Banana Pro** | Primary realistic image generation (best realism) |
| **ChatGPT Image 1.5 / GPT-Image** | Ultra-realistic portraits, reference-guided |
| **Higgsfield Soul** | Fashion/lifestyle, clean modern look |
| **Midjourney** | Creative/stylized (NOT pure realism) |

### Video Generation
| Model | Best For |
|-------|----------|
| **Kling 3.0** | Latest/best for short clips |
| **Kling 2.6** | Motion sync, lip sync, multi-character |
| **Kling 2.1** | Real-life movement (most battle-tested) |
| **Google Veo 3.1** | Premium talking head with environmental audio |
| **Hailuo** | Text/letter preservation, fast movement |

### Post-Processing
| Tool | Purpose |
|------|---------|
| **Lupa** | 4K upscaling (Creativity -7 to -10 for realism) |
| **Topaz (in Higgsfield)** | 4K + 60fps video enhancement |
| **Loopa** | Product image upscaling (High Fidelity + Face Recovery) |

### Voice & Lip Sync
| Tool | Purpose |
|------|---------|
| **ElevenLabs V3** | Voice creation with emotions |
| **Pixverse** | Lip sync (Tier 2, creative method) |
| **HeyGen** | Lip sync (Tier 3-4, long-form + cinematic) |

### Editing & Utility
| Tool | Purpose |
|------|---------|
| **CapCut** | Video stitching, speed, sound effects, beat alignment |
| **Canva** | Image composition, combining items |
| **ChatGPT / Grok** | Prompt generation via master prompt templates |
| **OpenArt AI** | Aggregation platform for models + tools |

---

## IX. Creative Flow Templates (Viral Content Formats)

| Format | Difficulty | Core Technique |
|--------|-----------|----------------|
| Gym Physique Check | 4/10 | Multi-reference + 3s Kling clips |
| Gym/Lifestyle Vlog | 4/10 | Scene progression + close-ups + beat-drop editing |
| Quick Change Outfit | 3/10 | Start+End frame, 3x speed, looping |
| Podcast Multi-Angle | 3/10 | Camera Angle Control + multi-angle lip sync |
| Walking Pad | N/A | Outfit swap + cinematic camera |
| TV Show Visits | 4/10 | Selfie POV with fictional characters |
| Two-Character Music | 7/10 | Separate filming + Pixverse lip sync + CapCut |
| Narrative Transition | 8/10 | Object swap + Start+End frame |
| Emotional Reveal | N/A | Sad→happy transition |
| Luxury Car + Avatar | N/A | 13 multi-angle prompts |
| Period Piece | N/A | Period-accurate styling + multi-angle |
| Extreme Close-Ups | N/A | Hyper-detailed carousel content |

---

## X. App Feature Implications

### Must-Have Features (from course insights)
1. **Persona Profile System** — Locked-in prompt rules per creator (reference image, style, quality, model preferences)
2. **LLM Prompt Engine** — User inputs scene → LLM generates full prompt → Image model generates output
3. **Reference Image Management** — Store base image, body ref, outfit refs, tattoo refs per creator
4. **Consistency Pipeline** — Auto-inject "that woman/man" + reference image into every generation
5. **Variation Engine** — Hair, angle, pose, setting randomizer for content variety
6. **Quality Presets** — Per-model quality keywords auto-appended (resolution, realism phrases)
7. **Upscaling Integration** — Every output auto-upscaled to 4K before delivery
8. **Multi-Angle Generation** — One-click multi-angle consistency drill
9. **UGC Product Placement** — Upload product + creator → generate placement scenes
10. **Content Calendar** — 4-pillar rotation, ABC method templates, posting frequency targets

### Nice-to-Have Features
- Bio generator (pyramid format)
- Hook template library
- DM conversion script templates
- Carousel builder
- Story sequence builder
- Growth phase tracker with phase-appropriate recommendations
- Voice creation integration (ElevenLabs)
- Lip sync pipeline (Pixverse/HeyGen integration)
- Video generation from images (Kling integration)
