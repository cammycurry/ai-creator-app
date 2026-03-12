# Arcads Teardown — Full Product Analysis

> Hands-on breakdown of Arcads' product based on actual account screenshots.
> What they built, how it works, what models they use, and what we learn from it.

---

## The Big Surprise: It's a ChatGPT-Style Interface

Arcads is NOT a traditional template-picker app. It's a **conversational generation interface** — basically ChatGPT but for content creation.

The main workspace is a **chat-style input** at the bottom of a canvas. You type what you want, pick a mode, and hit generate. The generated assets appear on the canvas above.

```
┌──────────────────────────────────────────────────────────────┐
│  Goodgrade AI              New Project                       │
├─────────┬────────────────────────────────────────────────────┤
│         │                                                    │
│ Folders │                                                    │
│  └ New  │         [Generated content appears here]           │
│         │                                                    │
│ Projects│                                                    │
│  └ New  │                                                    │
│         │         🎬 Generate winning assets with             │
│         │         talking actors, videos and more.            │
│         │                                                    │
│         │                                                    │
│         ├────────────────────────────────────────────────────┤
│         │  [💬 Talking Actors] [🎬 Video] [🖼 Image] [🔍 See more] │
│         │                                                    │
│         │  [ Describe image...                          ] ⬆  │
│         │  [📎]                        [- 3 +]  [⚙]          │
│         │                                                    │
│         │           Image Settings                           │
│         │           Model: Nano-Banana Pro ▾                 │
│         │           Aspect ratio: 9:16 ▾                     │
└─────────┴────────────────────────────────────────────────────┘
```

**Key UX insight:** The mode selector pills at the bottom let you switch between generation types:
- **Talking Actors** — lip-synced avatar videos (their core product)
- **Video** — non-talking video generation
- **Image** — static image generation
- **See more** — likely reveals more modes (presets, tools)

This is incredibly simple. No wizard. No multi-step flow. Type → pick mode → generate. They went full "ChatGPT for ads" and it works.

### What This Means For Us

Their UX philosophy: **minimize decisions, maximize output.** The user doesn't think about models, pipelines, or technical settings. They describe what they want, and the system figures out the rest. Settings exist but are tucked away (small panel for model + aspect ratio).

We said we want "like Arcads but for influencers, a little more guided." The chat interface is the baseline. Our guided layer (Creator context, templates, suggestions) goes ON TOP of this simplicity, not instead of it.

---

## Brand: "Goodgrade AI"

The app header shows **"Goodgrade AI"** — not "Arcads." This appears to be a rebrand or the parent company name. The purple icon is their brand mark. Worth tracking whether Arcads is becoming a feature within a broader platform or if this is just the dashboard branding.

---

## The Model Library (This Is Huge)

Arcads **openly exposes their model library to users.** This isn't hidden infrastructure — it's a feature. Users can see and choose which AI models to use. They organize models into cards with labels like [MODEL] and [PRESET].

### Image Generation Models

| Model | Description | Notes |
|-------|-------------|-------|
| **Nano-Banana Pro** | "Generate outstanding and realistic images from a prompt and reference image. Also search to edit images with a prompt." | This is Gemini 3 Pro Image (Google). Their premium image model. |
| **Nano-Banana 2** | "Fast, high quality image generation with up to 16 reference images. Supports text to image and image editing." | This is Gemini 3.1 Flash Image (Google). Up to 16 refs = best for character consistency. |
| **Seedream 4.5** | "Create high-resolution visuals with strong character and product consistency. Also used for image editing." | ByteDance's model. Strong character consistency. |
| **Seedream 5 Lite** | "Fast, high quality image generation with up to 4 reference images. Supports text to image and image editing." | Newer Seedream, fewer refs than Nano-Banana 2. |
| **GPT Image 1.5** | "OpenAI's flagship image generation model. Create and edit images with precise control, powerful details, and ultra fast speed." | OpenAI's image model. |
| **Grok Image** | "Generate images with Grok. Supports text to image and image editing." | xAI's Grok image gen. |

**Key insight:** "Nano-Banana" is Arcads' name for Google's Gemini image models. Nano-Banana = Gemini 2.5 Flash, Nano-Banana 2 = Gemini 3.1 Flash Image, Nano-Banana Pro = Gemini 3 Pro Image. The default in their settings panel is **Nano-Banana Pro** (Gemini 3 Pro Image) — they're leading with Google's best.

### Video Generation Models

| Model | Description | Specs | Notes |
|-------|-------------|-------|-------|
| **Sora 2 Pro** | "An enhanced version of Sora 2 offering superior detail, smoother motion, and fidelity." | 9:16/16:9, 4s/8s/12s, 720p/1080p | OpenAI's premium video model. |
| **Sora 2** | "Generate hyper-realistic video scenes with complex physics and vivid details." | 9:16/16:9, 4s/8s/12s, 720p/1080p | OpenAI's standard video. |
| **Veo 3.1** | "Create broadcast-ready 1080p footage with cinematic understanding and consistency." | 9:16/16:9, 8s, 720p/1080p | Google's video model. |
| **Kling 3.0** | "Create high-fidelity video clips with complex movement and realistic motion." | — | Kuaishou's latest. |
| **Kling 2.6** | "Create high-fidelity video clips with complex movement and realistic motion." | — | Previous Kling version. |
| **Kling 2.6 Motion Control** | "Bring any photo to life by AI powered motion control, turning a single image into a stunning, realistic moving video." | — | Image-to-video with motion control. |
| **Seedance 1.5** | "ByteDance's fast video generation model with 5-10 second duration and audio control." | — | ByteDance's video model. |
| **Grok Video** | "xAI's Grok video generation model with text to video and image to video in seconds." | — | xAI's video offering. |

### Talking Head / Lip Sync Models

| Model | Description | Duration | Notes |
|-------|-------------|----------|-------|
| **Talking Actor - Arcads 1.0** | "Create authentic talking videos with our secret sauce and top UGC library." | Up to 2 min | **PROPRIETARY.** Their own lip sync model. "Secret sauce." |
| **Talking Actor - Audio Driven** | "Turn voiceovers into realistic performances with deep emotional range." | Unlimited | Audio-driven lip sync (likely a third-party model). |
| **Talking Actor - OmniHuman 1.5** | "Generate expressive talking videos that perfectly match the mood of your audio." | Unlimited | ByteDance's OmniHuman model. |

**Key insight:** Arcads has **their own proprietary lip sync model** (Arcads 1.0) alongside third-party options (OmniHuman 1.5, Audio Driven). Their "secret sauce" IS the lip sync — that's their core IP. Everything else is commodity models from Google, OpenAI, ByteDance, xAI.

### Utility / Post-Processing Tools

| Tool | What It Does |
|------|-------------|
| **Upscale** | Boost resolution and clarity |
| **Remove Background** | Remove background from videos and images |
| **Skin Enhancer** | Transform AI-generated skin textures into photorealistic results |
| **Add Captions** | Generate accurate, styled subtitles for any video |
| **Transcribe** | Transcribe video/audio to text |
| **Camera Movement** | Add cinematic camera movements to AI actor videos |
| **Camera Angle** | Adjust camera angle with horizontal, vertical, zoom control |
| **Gestures** | Animate avatars with expressive gestures and emotions |
| **Change Voice** | Change video voice using audio reference |
| **Translate Video** | Translate video into any language with lip-sync |
| **Kling o3 - Video Editor** | Add, swap, remove elements in video using Kling o3 |
| **Prompt Builder** | Generate optimized prompts for any AI model from a description |
| **Extend Video** | Extend duration of any video using Veo 3.1 |

### Presets (Pre-Built Workflows)

| Preset | What It Does |
|--------|-------------|
| **Show Your App** | Turn static screenshots into professional, dynamic app showcase |
| **Product Showcase** | Recreate a viral hook talking about your product in a relevant scenario |
| **Hook Repurposer** | Instantly remix proven viral hooks to feature your product and brand messaging |
| **Fashion Try On** | Showcase clothing on virtual models with realistic try-on videos |
| **Unboxing POV** | Turn a single product photo into an engaging, realistic POV unboxing video |
| **Sora 2 Actors** | Pick a template and customize everything from the script to the actor |
| **UGC Studio** | Generate high quality influencer video/images with AI (reference images required) |
| **Animate Actor** | Breathe life into photos by transferring exact movement from a reference video |
| **Replace Actor** | Seamlessly swap the subject in your video with an AI actor |

---

## The Actor System

### How Actors Work

Actors are their version of our "Creators." The actor selection screen shows:

- **300+ pre-made actors** with names, thumbnails, and country tags (e.g., "Aiden (US)", "Lauren (US)", "Hassan Jr. (US)")
- **Three tabs:** All actors, Favorites, My actors
- **"Create actor" button** — users can make custom actors (likely from uploaded photos or generation)
- **Sort by:** Most Popular (default)

### Filtering System

Actors are filtered by **tags**, not categories. This is a flat tag system, not a hierarchical template structure:

**Demographics:**
- Gender: Male, Female
- Age: Adult, Young Adult, Kid
- Skin tones: 7 visual color swatches (light → dark)

**Situation Tags (80+):**
These define the SCENE, not just the actor. They combine location + camera work + activity:

*Locations/Scenes:*
Airport, Bathroom, Beach, Boat, Car, Coffee Shop, Gym, Home, Kitchen, Mall, Nature, Night, Office, Outside, Pool, Store, Street, Studio

*Camera Movements:*
Arc Left/Right, Crane Down/Up/Overhead, Dolly Left/Right/Zoom In/Zoom Out, Jib Down/Up, Pan Left Slow/Right Slow, Orbit 360, Whip Pan, Zoom In Rapid/Slow, Zoom Out Rapid/Slow, Super Dolly In/Out, Push In, Pull Out, Rack Focus Sim, Bullet Time, Yo-Yo Zoom, Dutch Tilt Reveal, Hyperlapse Simulation, Glam Push

*Content Types/Activities:*
ASMR, Cooking, Drink, Family, Firefighter, Formal, Gaming, GRWM, Historical, Hook, Interview, Medical, Movement, Multi-Frame, News Anchor, Podcast, Pointing, Pregnant, Reverse, Sitting, Skit, Streaming, Talk, Walking, Yoga

*Special:*
AI Avatar, Christmas, Hannukah, Green Screen

**Accessories (35+):**
Bags, Bathrobe, Book, Candle, Cards, Dishes, Drink, Dumbbells, Food, Fridge, Fruit, Glasses, Guitar, Hat, Headphone, Hijab, Jar, Jewels, Knit, Laptop, Mic, Mirror, Mug, Pet, Phone, Piano, Plant, Present, Scarf, Shoes, Suit, Tools, Trash Can, Tree

**Emotions (9):**
Calm, Enthusiastic, Excited, Frustrated, Happy, Sad, Serious, Smiling

### What This Means

Their "template" system is actually a **tag-based filter system on actors.** You don't browse "Gym Mirror Selfie" as a template — you pick an actor, add situation tags like "Gym" + "Mirror" + "Selfie", pick accessories like "Dumbbells" + "Phone", set emotion to "Confident", and generate.

This is more flexible than rigid templates but less guided. Our approach of having curated templates PLUS free prompting could be the sweet spot.

---

## Architecture: What They're Actually Running

Based on the model library, Arcads' orchestration stack is:

```
User Input (prompt + mode + settings)
        │
        ▼
┌─── Orchestration Agent ───────────────────────────────┐
│                                                        │
│   Routes to the right model(s) based on:              │
│   - Content type (image / video / talking head)       │
│   - User's model selection (or auto-select)           │
│   - Quality/speed tradeoff                            │
│                                                        │
│   Image Gen ──► Nano-Banana Pro (Gemini 3 Pro)        │
│                 Nano-Banana 2 (Gemini 3.1 Flash)      │
│                 Seedream 4.5 / 5 Lite                 │
│                 GPT Image 1.5                         │
│                 Grok Image                            │
│                                                        │
│   Video Gen ──► Sora 2 Pro / Sora 2                   │
│                 Veo 3.1                               │
│                 Kling 3.0 / 2.6                       │
│                 Seedance 1.5                          │
│                 Grok Video                            │
│                                                        │
│   Lip Sync ──► Arcads 1.0 (proprietary)               │
│                OmniHuman 1.5                          │
│                Audio Driven                           │
│                                                        │
│   Post-Proc ─► Upscale, Skin Enhancer, Captions,     │
│                Camera Control, Gestures, etc.          │
│                                                        │
└────────────────────────────────────────────────────────┘
        │
        ▼
   Canvas Output (image/video displayed in chat)
```

### Model Providers They Use

| Provider | Models | Count |
|----------|--------|-------|
| **Google** | Nano-Banana (Gemini) variants, Veo 3.1 | 4 |
| **OpenAI** | Sora 2, Sora 2 Pro, GPT Image 1.5 | 3 |
| **ByteDance** | Seedream 4.5, Seedream 5 Lite, Seedance 1.5, OmniHuman 1.5 | 4 |
| **Kuaishou** | Kling 3.0, Kling 2.6, Kling 2.6 Motion Control, Kling o3 | 4 |
| **xAI** | Grok Image, Grok Video | 2 |
| **Arcads (proprietary)** | Arcads 1.0 talking actor, Prompt Builder | 2 |

**They're hitting 5+ providers.** Google, OpenAI, ByteDance, Kuaishou, xAI, plus their own proprietary models. This is a serious multi-provider orchestration system.

---

## The "Presets" Concept

Presets are their version of templates — pre-built workflows that combine multiple models into a one-click experience. Examples:

- **"Show Your App"** = screenshot → Sora 2 video animation → polished app demo
- **"Product Showcase"** = product photo → viral hook script → talking actor video
- **"Fashion Try On"** = clothing image → virtual model → realistic try-on video
- **"UGC Studio"** = reference images → full influencer content (image + video)

These are likely **multi-model pipelines chained together** behind a simple card UI. Which is exactly what our workflow engine + App Mode does.

---

## What Arcads Does Well

1. **Dead simple UX.** Chat box + mode selector. That's it. No learning curve.
2. **Model transparency.** Users can see and choose models. Power users love this.
3. **Tag-based flexibility.** Situations + accessories + emotions = infinite combinations without rigid templates.
4. **Presets for common workflows.** One-click for popular use cases, full flexibility underneath.
5. **Project organization.** Folders + projects in the sidebar for managing multiple campaigns.
6. **Speed.** The whole thing is designed for rapid iteration — generate, review, regenerate.

## Where Arcads Falls Short (Our Opportunities)

1. **No persistent characters.** Actors are stock faces. You pick a different one each time, or create one, but it's not the core experience. There's no "build your influencer and grow their presence" concept.
2. **Ad-focused positioning.** Everything is framed as "winning ads" and "marketing assets." Not social content, not influencer building, not personal brand. Their UGC Studio model exists but it's one card among many.
3. **No content library per character.** No "Sophia's content feed" concept. It's project-based (campaigns/folders), not character-based.
4. **No metadata stripping.** No mention of removing AI fingerprints or making content look authentic.
5. **No course/education.** No teaching component. You're expected to already know what you want.
6. **No voice cloning per character.** They have voice changing but not "this is Sophia's voice that stays consistent."
7. **No "Recreate This" from URL.** No paste-a-TikTok-and-recreate-it feature visible.

---

## Lessons For Our App

### 1. Steal the Chat Interface Pattern

Their ChatGPT-style input is brilliant. We should have a similar conversational generation interface as the primary way to create content. Not a multi-step wizard for every generation — just describe what you want.

BUT: Our version has **Creator context baked in.** When you type "gym mirror selfie," the system already knows your Creator's face, body type, hair, style. Arcads makes you pick an actor each time. We don't.

### 2. Expose Models (But Smarter)

They show every model as a card. Power users love this — it feels like a pro tool. We should expose model selection too, but:
- **Default to "Auto"** — system picks the best model for the task
- **Let power users override** — dropdown or settings panel
- **Use our own model names** if needed (they called Gemini "Nano-Banana" — we could do similar branding)

### 3. Tags > Rigid Templates

Their tag-based system (situation + accessories + emotion) is more flexible than our planned template categories. Consider a hybrid:
- **Curated templates** for common content (guided, easy)
- **Tag-based system** underneath for power users
- Templates are just pre-selected tag combinations

### 4. Presets = Our App Mode Workflows

Their "Presets" (Show Your App, Product Showcase, etc.) are exactly our workflow engine's App Mode concept. Multi-model pipelines behind a one-click card. We already have this infrastructure.

### 5. The Creator IS Our Moat

Arcads' biggest weakness is our biggest strength. They're a generation tool — pick an actor, make an ad. We're a **creator platform** — build your influencer, grow their presence, maintain consistency across all content. The persistent Creator with reference images, voice profile, and content library is what separates us.

### 6. Their Proprietary Lip Sync = Their Real IP

"Arcads 1.0" with "our secret sauce" — their proprietary lip sync model is their core defensible tech. Everything else is commodity. For us, the moat isn't any single model — it's the Creator system + orchestration + metadata stripping + course flywheel.

---

## Competitive Model Comparison

| Capability | Arcads Has | We Have | Gap |
|------------|-----------|---------|-----|
| Image gen (Gemini/Nano-Banana) | ✅ | ✅ (via Gemini API) | None |
| Image gen (Seedream) | ✅ 4.5 + 5 Lite | ✅ (via Fal.ai) | None |
| Image gen (GPT Image) | ✅ 1.5 | ❌ | Could add via OpenAI API |
| Image gen (Grok) | ✅ | ✅ | None |
| Video gen (Sora 2/Pro) | ✅ | ❌ Not in registry | Could add via Fal.ai or OpenAI |
| Video gen (Veo 3.1) | ✅ | ✅ (via Fal.ai) | None |
| Video gen (Kling 3.0) | ✅ | ✅ (via Fal.ai) | None |
| Video gen (Seedance) | ✅ 1.5 | ✅ 2.0 (via Fal.ai) | We're ahead |
| Video gen (Grok) | ✅ | ❌ | Could add |
| Lip sync (proprietary) | ✅ Arcads 1.0 | ❌ | Need our own or third-party |
| Lip sync (OmniHuman) | ✅ 1.5 | ❌ | Could add via Fal.ai |
| Lip sync (other) | ✅ Audio Driven | ✅ 4 models registered | Need to wire up |
| Upscale | ✅ | ✅ 9 models | Ahead |
| Skin enhancer | ✅ | ❌ | Could add |
| Captions | ✅ | ❌ | Need Whisper + burn-in |
| Remove background | ✅ | ✅ | None |
| Camera control | ✅ | ❌ | Could add |
| Gestures | ✅ | ❌ | Could add |
| Translate video | ✅ | ❌ | Future feature |
| Metadata stripping | ❌ | ✅ | **We're ahead** |
| Persistent characters | ❌ (weak) | ✅ (core feature) | **We're ahead** |
| Voice cloning per character | ❌ | Planned (ElevenLabs) | **We'll be ahead** |
| Content library per character | ❌ | Planned | **We'll be ahead** |
| Course/education | ❌ | ✅ | **We're ahead** |
| Workflow engine | Unknown (likely yes) | ✅ 50+ nodes | **We're ahead** |

---

## Summary: How We Beat Them

**Arcads built a ChatGPT for ads.** Clean, fast, model-rich, ad-focused.

**We're building a ChatGPT for influencers.** Same simplicity, but with persistent AI characters, creator-first workflows, metadata stripping, voice consistency, content libraries, and a course that feeds users in.

They win on: breadth of models, ad-specific presets, pure generation speed.
We win on: character persistence, creator identity, metadata authenticity, education flywheel, content-as-a-brand (not content-as-an-ad).

Different positioning, overlapping tech, different markets. Performance marketers go to Arcads. Creator operators come to us.

---

*Research date: 2026-03-02*
*Source: Hands-on Arcads account screenshots*
*Screenshots: research/arcads/interfaces/ and research/arcads/models/*
