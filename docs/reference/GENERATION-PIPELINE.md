# Generation Pipeline — Technical Breakdown

> How AI UGC content is actually made, step by step.
> What models to use, in what order, and what we already have.

---

## How Arcads / MakeUGC / HeyGen Actually Work

**They're all multi-model orchestration pipelines.**

These platforms don't use a single AI model — they chain together best-in-class models for each step and wrap it in a clean UX. Arcads openly promotes using models like Sora 2 Pro for video generation. Under the hood, each platform likely orchestrates some combination of:

- **Image generation** — Flux, Stable Diffusion, or proprietary fine-tunes for avatars/scenes
- **Text-to-speech** — ElevenLabs or similar for natural voice generation
- **Lip sync** — Proprietary or third-party (Arcads uses motion capture from real performers + their own "neural sync engine")
- **Video generation** — Sora 2 Pro, Kling, Veo, or similar for B-roll and scene video
- **Orchestration layer** — An agent or pipeline system that chains these models together, routes inputs/outputs, and handles the end-to-end flow

Each platform has its own mix. Arcads clones avatars from real consenting performers with motion capture data. MakeUGC describes their stack as "script transformer + avatar diffusion + render cloud." HeyGen has its own proprietary avatar system. The exact model choices differ, but the architecture pattern is the same: **multi-model orchestration behind a simple UI.**

They charge $11/video for a pipeline that probably costs ~$0.50-2.00 in API/compute calls. The margin is in the UX simplification and the orchestration, not any single model.

**We have direct access to all the same (and more) models via Fal.ai, Gemini, ElevenLabs, etc.** And our engine (ai-creator-mgmt) is already a multi-model orchestration system — 90+ models, node-based workflows, topological execution. We just need the consumer skin on top.

---

## Our Pipeline: Step By Step

### Pipeline A: Static Image Content (Photos, Posts, Stories)

This is the simplest path. User wants a photo of their AI influencer in a scene.

```
STEP 1: Prompt Assembly
─────────────────────────────────────
Input: Creator reference data + template/user description
Process: LLM enhances the prompt, injects Creator details
Model: Gemini 2.5 Flash (cheap, fast, good at prompt writing)
Cost: ~$0.001 (negligible)
Output: Full generation prompt

Example:
  User picks "Gym Mirror Selfie" template, selects "matching set" outfit

  LLM assembles:
  "Mirror selfie of a 25-year-old Caucasian woman with long wavy blonde
  hair, blue almond eyes, athletic build, holding a light pink iPhone.
  She is in a gym locker room wearing a matching lavender sports bra
  and leggings set. Hair in high ponytail. Post-workout glow.
  Raw iPhone photography, visible skin texture, natural lighting."

STEP 2: Image Generation
─────────────────────────────────────
Input: Prompt + Creator face/body reference images
Process: Generate 4 image variations with face consistency
Output: 4 images at 1-2K resolution

Model options (best → budget):
┌────────────────────────────┬──────────┬────────────┬──────────────────┐
│ Model                      │ Provider │ Cost/image │ Notes            │
├────────────────────────────┼──────────┼────────────┼──────────────────┤
│ Gemini 3.1 Flash Image     │ Native   │ ~$0.02     │ Best all-around. │
│ (Nano Banana 2)            │ API      │            │ 14 refs, 4K,     │
│                            │          │            │ search grounding │
├────────────────────────────┼──────────┼────────────┼──────────────────┤
│ Gemini 3 Pro Image         │ Native   │ ~$0.05     │ Highest quality. │
│ (Nano Banana Pro)          │ API      │            │ Thinking mode.   │
│                            │          │            │ 4K native.       │
├────────────────────────────┼──────────┼────────────┼──────────────────┤
│ Seedream 4.5               │ Fal.ai   │ ~$0.03     │ Great skin       │
│                            │          │            │ texture/realism  │
├────────────────────────────┼──────────┼────────────┼──────────────────┤
│ Flux Pro                   │ Fal.ai   │ ~$0.05     │ Strong at        │
│                            │          │            │ character        │
│                            │          │            │ consistency      │
├────────────────────────────┼──────────┼────────────┼──────────────────┤
│ Ideogram 3                 │ Fal.ai   │ ~$0.04     │ Good for text    │
│                            │          │            │ in images        │
├────────────────────────────┼──────────┼────────────┼──────────────────┤
│ Gemini 2.5 Flash Image     │ Native   │ ~$0.01     │ Cheapest. Fast.  │
│ (Nano Banana)              │ API      │            │ Lower quality.   │
│                            │          │            │ 3 refs, 1K only. │
└────────────────────────────┴──────────┴────────────┴──────────────────┘

Recommended default: Gemini 3.1 Flash Image (Nano Banana 2)
- Best balance of quality/cost/speed
- Supports 14 reference images (face + body + scene)
- Up to 4K output
- Search grounding for realistic scenes
- ~$0.02/image → 4 images = ~$0.08

STEP 3: Upscale (Optional)
─────────────────────────────────────
Input: Selected image (user picks 1 of 4)
Process: Upscale to 4K for download quality
Model: Real-ESRGAN or Clarity Upscaler (Fal.ai)
Cost: ~$0.02-0.05
Output: 4K image ready for posting

STEP 4: Metadata Strip + EXIF Injection
─────────────────────────────────────
Input: Final image
Process:
  1. Strip all AI markers (C2PA, SynthID, ComfyUI metadata)
  2. Re-encode as JPEG via Pillow
  3. Inject realistic iPhone EXIF (device profile, GPS, exposure, lens)
Model: Our metadata-service (Python/FastAPI on Railway)
Cost: ~$0.00 (our own service)
Output: Clean image that looks like it came from an iPhone

TOTAL COST PER STATIC IMAGE SET: ~$0.10-0.15 (4 images + 1 upscale + metadata)
CREDIT CHARGE TO USER: 2-3 credits ($0.30-0.60 at pack rates)
MARGIN: ~70-80%
```

---

### Pipeline B: Video Content (Lifestyle, Action, Non-Talking)

User wants a video of their influencer doing something — gym clip, walking, lifestyle.

```
STEPS 1-2: Same as Pipeline A
─────────────────────────────────────
Generate static image first. User picks favorite.

STEP 3: Image-to-Video Generation
─────────────────────────────────────
Input: Selected image + motion prompt
Process: Animate the static image into a video clip
Output: 5-10 second video clip

Model options:
┌─────────────────────┬──────────┬──────────┬────────────────────────────┐
│ Model               │ Provider │ Cost     │ Notes                      │
├─────────────────────┼──────────┼──────────┼────────────────────────────┤
│ Kling 3.0           │ Fal.ai   │ ~$0.10   │ Best character consistency. │
│                     │          │ (5s)     │ Natural motion. Fast.      │
│                     │          │ ~$0.20   │ Best for UGC-style.        │
│                     │          │ (10s)    │                            │
├─────────────────────┼──────────┼──────────┼────────────────────────────┤
│ Seedance 2.0        │ Fal.ai   │ ~$0.15   │ Audio reference input.     │
│                     │          │ (5s)     │ Great motion control.      │
│                     │          │          │ Multi-modal inputs.        │
├─────────────────────┼──────────┼──────────┼────────────────────────────┤
│ Veo 3 / 3.1         │ Fal.ai   │ ~$0.20   │ Highest quality. 4K.      │
│                     │          │ (5s)     │ Integrated audio.          │
│                     │          │          │ Best photorealism.         │
├─────────────────────┼──────────┼──────────┼────────────────────────────┤
│ WAN 2.2             │ Fal.ai / │ ~$0.05   │ Open source. Cheapest.    │
│                     │ WaveSpeed│ (5s)     │ Good for simple motion.    │
├─────────────────────┼──────────┼──────────┼────────────────────────────┤
│ Runway Gen-4 Turbo  │ Fal.ai   │ ~$0.15   │ Talking head specialist.  │
│                     │          │ (5s)     │ Good lip/expression.       │
├─────────────────────┼──────────┼──────────┼────────────────────────────┤
│ Sora 2              │ Fal.ai   │ ~$0.25   │ Narrative coherence.      │
│                     │          │ (5s)     │ Complex scenes.            │
│                     │          │          │ Expensive.                 │
└─────────────────────┴──────────┴──────────┴────────────────────────────┘

Recommended default: Kling 3.0
- Best at maintaining the person's face during motion
- Natural, UGC-feeling movement (not too cinematic)
- Fast generation
- Good price/quality ratio
- For higher quality: Veo 3 (costs more, looks more polished)

STEP 4: Metadata Strip
─────────────────────────────────────
Same as Pipeline A but for video (ffmpeg H.264 re-encode + QuickTime metadata)

TOTAL COST PER VIDEO: ~$0.20-0.40 (image gen + video gen + metadata)
CREDIT CHARGE: 3-5 credits ($0.45-1.00)
MARGIN: ~60-70%
```

---

### Pipeline C: Talking Head Video (The Premium Product)

User wants their AI influencer speaking — testimonial, storytime, advice, UGC ad.
This is the Arcads-equivalent pipeline.

```
STEP 1: Script
─────────────────────────────────────
Input: User writes or pastes script (or uses caption generator)
Process: Optional — LLM polishes/enhances the script
Model: Gemini 2.5 Flash
Cost: ~$0.001
Output: Final script text

STEP 2: Voice Generation (Text-to-Speech)
─────────────────────────────────────
Input: Script text + voice profile
Process: Generate natural speech audio from text
Output: Audio file (MP3/WAV)

Model options:
┌────────────────────┬──────────┬──────────┬─────────────────────────────┐
│ Model              │ Provider │ Cost     │ Notes                       │
├────────────────────┼──────────┼──────────┼─────────────────────────────┤
│ ElevenLabs         │ Direct   │ ~$0.01   │ Industry standard. Best     │
│ Turbo v3           │ API      │ per 100  │ quality. 29 languages.      │
│                    │          │ chars    │ Voice cloning available.    │
│                    │          │          │ Emotional control.          │
├────────────────────┼──────────┼──────────┼─────────────────────────────┤
│ Fish Speech 1.5    │ Fal.ai   │ ~$0.005  │ Cheaper. Good quality.     │
│                    │          │ per 100  │ Multilingual.               │
│                    │          │ chars    │                             │
├────────────────────┼──────────┼──────────┼─────────────────────────────┤
│ Kokoro TTS         │ Fal.ai   │ ~$0.002  │ Cheapest. Decent quality.  │
│                    │          │ per 100  │ English-focused.            │
│                    │          │ chars    │                             │
└────────────────────┴──────────┴──────────┴─────────────────────────────┘

Recommended default: ElevenLabs Turbo v3
- Best voice quality, period
- Emotional control (happy, sad, serious, excited)
- Can clone a custom voice for the Creator (premium feature)
- The same provider HeyGen/Arcads use

Typical cost: 30-second script (~500 chars) = ~$0.05

STEP 3: Image Generation
─────────────────────────────────────
Input: Creator references + "talking head" framing prompt
Process: Generate a front-facing, mouth-neutral portrait
Model: Gemini 3.1 Flash Image (Nano Banana 2)
Cost: ~$0.02
Output: Clean talking-head base image

Important: The image needs to be:
- Front-facing or slight angle
- Mouth in neutral/slightly open position
- Good lighting on face
- Clean background or appropriate setting
- This is what the lip sync model will animate

STEP 4: Lip Sync
─────────────────────────────────────
Input: Base image + audio file
Process: Animate the face to match the speech audio
Output: Video with synchronized lip movement, natural head motion, blinking

Model options:
┌────────────────────┬──────────┬──────────┬─────────────────────────────┐
│ Model              │ Provider │ Cost     │ Notes                       │
├────────────────────┼──────────┼──────────┼─────────────────────────────┤
│ Hedra Character-3  │ Fal.ai / │ ~$0.10   │ Best for single images.    │
│                    │ Direct   │ per sec  │ Emotional expressiveness.   │
│                    │          │          │ Natural head motion.        │
├────────────────────┼──────────┼──────────┼─────────────────────────────┤
│ MuseTalk 1.5       │ Fal.ai   │ ~$0.10   │ Real-time capable (30fps). │
│                    │          │ per sec  │ Latent space inpainting.    │
│                    │          │          │ High lip-sync accuracy.     │
├────────────────────┼──────────┼──────────┼─────────────────────────────┤
│ SadTalker          │ Fal.ai / │ ~$0.05   │ Open source. Cheaper.      │
│                    │ Self-host│ per sec  │ Good but less natural       │
│                    │          │          │ than Hedra/MuseTalk.        │
├────────────────────┼──────────┼──────────┼─────────────────────────────┤
│ LivePortrait       │ Fal.ai   │ ~$0.08   │ Good identity retention.   │
│                    │          │ per sec  │ Works well with AI faces.   │
└────────────────────┴──────────┴──────────┴─────────────────────────────┘

Recommended default: Hedra Character-3 or MuseTalk 1.5
- Both produce natural-looking results
- Hedra: better expressiveness, slightly more "alive"
- MuseTalk: better lip-sync accuracy, faster
- Test both — pick per use case

Typical cost: 30-second video = ~$3.00 (at $0.10/sec)
This is the expensive step. Lip sync is where the money goes.

STEP 5: Post-Production (Optional Enhancements)
─────────────────────────────────────
Input: Lip-synced video
Process: Add captions, text overlays, background music
Options:
  a) Client-side — user downloads and edits in CapCut (MVP approach)
  b) Server-side — programmatic video editing via Remotion or ffmpeg
  c) AI-assisted — auto-generate captions, add trending audio

For MVP: Skip this. Let users download the lip-synced video and edit themselves.
For V2: Add auto-captions (Whisper for transcription → burn into video via ffmpeg)
For V3: Full Remotion-based editing pipeline

STEP 6: Metadata Strip
─────────────────────────────────────
Same as always — ffmpeg re-encode + iPhone QuickTime metadata injection

TOTAL COST PER TALKING HEAD VIDEO (30s):
  Prompt assembly:  $0.001
  Image gen:        $0.02
  Voice gen:        $0.05
  Lip sync:         $3.00
  Metadata strip:   $0.00
  ─────────────────
  TOTAL:            ~$3.07

CREDIT CHARGE: 10-12 credits ($1.50-2.40 at pack rates)
MARGIN: Lower on talking head — maybe 20-40% depending on lip sync costs

Note: Lip sync is BY FAR the most expensive step.
For shorter clips (15s) the cost drops to ~$1.50 total.
```

---

## Pipeline D: "Recreate This Video" (V2+ Feature)

```
STEP 1: Fetch & Extract
─────────────────────────────────────
Input: TikTok/Instagram URL
Process: Download video, extract key frames
Tool: yt-dlp (download) + ffmpeg (frame extraction)
Cost: $0.00

STEP 2: Analyze with Vision AI
─────────────────────────────────────
Input: Key frames from video
Process: Describe the scene, outfit, action, mood, framing
Model: Gemini 2.5 Flash (vision mode) or Grok 2 Vision
Cost: ~$0.01
Output: Structured scene description

STEP 3: Route to Pipeline A, B, or C
─────────────────────────────────────
Based on analysis:
- Static content → Pipeline A
- Action/lifestyle → Pipeline B
- Talking/speaking → Pipeline C

Everything from here follows the standard pipelines above.
```

---

## Cost Summary Table

| Content Type | Our API Cost | Credits Charged | User Pays (pack rate) | Our Margin |
|---|---|---|---|---|
| 4 images | ~$0.10 | 2 | $0.30 | ~70% |
| 4 images + upscale | ~$0.15 | 3 | $0.45 | ~67% |
| 5s video (non-talking) | ~$0.20 | 3 | $0.45 | ~56% |
| 10s video (non-talking) | ~$0.35 | 5 | $0.75 | ~53% |
| 15s talking head | ~$1.60 | 7 | $1.05 | ~34% * |
| 30s talking head | ~$3.10 | 12 | $1.80 | ~42% * |
| Create a Creator (wizard) | ~$0.50 | 5 | $0.75 | ~33% |

*Talking head margins are tight because lip sync is expensive. Options to improve:
1. Use cheaper lip sync models (SadTalker) for lower tiers
2. Charge more credits for talking head
3. Negotiate volume pricing with lip sync providers
4. Self-host lip sync models on GPU (long-term play)

---

## What We Already Have vs What We Need

### Already Built (in ai-creator-mgmt engine)

| Capability | Status | Models Available |
|---|---|---|
| Image generation | ✅ Built | 35+ models (Gemini native, Flux, Seedream, Ideogram, Grok) |
| Image-to-video | ✅ Built | 27 models (Kling, Veo, Seedance, WAN, Sora, Runway) |
| Prompt analysis/enhancement | ✅ Built | Gemini 2.5 Flash, Grok 2 Vision |
| Reference image system | ✅ Built | Face + body refs for consistency |
| Metadata stripping | ✅ Built | Python microservice, 5 iPhone profiles, 28 cities |
| Media library / S3 storage | ✅ Built | Full folder system, tags, bulk ops |
| Workflow engine | ✅ Built | 50+ nodes, topological execution |
| App Mode | ✅ Built | Publish workflow as one-click form |
| Image upscaling | ✅ Built | 9 upscale models |
| Image editing | ✅ Built | 34+ edit models, sharp-based server-side editing |
| Lip sync | ✅ Registered | 4 lipsync models in registry |

### Need To Build / Wire Up

| Capability | Status | What's Needed |
|---|---|---|
| ElevenLabs TTS integration | ❌ Not built | API integration, voice profile management |
| Lip sync execution | ⚠️ Shell nodes | Wire registered models to actual Fal.ai endpoints |
| Creator wizard (consumer UI) | ❌ Not built | Frontend only — engine handles generation |
| Template system (consumer UI) | ❌ Not built | Frontend + template data model |
| Credit system | ❌ Not built | Balance tracking, Stripe metered billing |
| Consumer app shell | ❌ Not built | Next.js project, auth, onboarding |
| Auto-captioning | ❌ Not built | Whisper transcription + ffmpeg burn-in |
| Video URL analysis | ❌ Not built | yt-dlp + vision API analysis |

### Key Insight

**~80% of the hard technical work is done.** The engine generates images, generates video, strips metadata, manages references for consistency. What's missing is:
1. Voice generation (ElevenLabs API — straightforward)
2. Lip sync wiring (models registered, need execution code)
3. Consumer frontend (the pretty wrapper)
4. Credit/billing system (Stripe integration)

The generation pipeline itself is built. The app is a UI + billing layer on top.

---

## Recommended Default Stack (V1)

| Step | Model | Provider | Why |
|---|---|---|---|
| Prompt enhancement | Gemini 2.5 Flash | Native API | Cheap, fast, good |
| Image generation | Gemini 3.1 Flash Image | Native API | Best quality/cost. 14 refs. |
| Image upscale | Clarity Upscaler | Fal.ai | Clean 4K output |
| Video (non-talking) | Kling 3.0 | Fal.ai | Best character consistency |
| Voice/TTS | ElevenLabs Turbo v3 | Direct API | Industry standard quality |
| Lip sync | MuseTalk 1.5 or Hedra | Fal.ai | Best accuracy/expressiveness |
| Metadata strip | Our service | Railway | Free, already built |

This stack covers all four pipelines (A-D) and matches or exceeds what Arcads/HeyGen deliver.

---

*Last updated: 2026-03-02*
*Reference: ai-creator-mgmt/docs/GOALS.md for full model registry*
