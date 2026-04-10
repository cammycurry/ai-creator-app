# Generation Pipeline — Master Plan & Source of Truth

> Last updated: 2026-04-09
> Scope: All 4 layers of the generation pipeline, model inventory, pricing, research findings

---

## Overview

Four layers, each ships independently:
1. **Core Video** — Get existing video gen + talking heads working E2E, add model options, upscaling, video post-processing
2. **Talking Heads Pro** — Veo 3.1 native audio path, voice alternatives, dialogue optimization
3. **Remix Engine** — Motion transfer with face/body preservation, trend recreation
4. **Multi-Scene Director** — Storyboard builder, script-driven, frame chaining, AI Director mode

No LoRAs on this platform — too slow, too complex for consumer UX. Use reference images + prompt seeds + Flux Kontext for consistency.

---

## Model Inventory (Vetted Pricing from Fal.ai, April 2026)

### Video Generation
| Model | Endpoint | $/sec | 5s | 10s | Best For |
|-------|----------|-------|-----|------|----------|
| Kling v3 Standard i2v | `fal-ai/kling-video/v3/standard/image-to-video` | $0.14 | $0.70 | $1.40 | Default UGC, daily social |
| Kling v3 Pro i2v | `fal-ai/kling-video/v3/pro/image-to-video` | $0.14 | $0.70 | $1.40 | Pro quality, same price |
| Kling v3 Pro t2v | `fal-ai/kling-video/v3/pro/text-to-video` | $0.14 | $0.70 | $1.40 | Multi-shot text-to-video |
| Kling v3 Motion Control | `fal-ai/kling-video/v3/pro/motion-control` | $0.168 | $0.84 | $1.68 | Dance/trend recreation |
| Kling O3 ref-to-video | `fal-ai/kling-video/o3/pro/reference-to-video` | $0.14 | $0.70 | $1.40 | **Identity preservation** |
| Kling O3 i2v | `fal-ai/kling-video/o3/pro/image-to-video` | $0.14 | $0.70 | $1.40 | Start+end frame |
| Veo 3.1 Fast i2v | `fal-ai/veo3.1/fast/image-to-video` | $0.15 | $0.75 | $1.50 | Premium tier |
| Veo 3.1 Full | `fal-ai/veo3.1` | $0.40 | $2.00 | $4.00 | **Native audio/dialogue** |
| Veo 3.1 Fast | `fal-ai/veo3.1/fast` | $0.15 | $0.75 | $1.50 | Budget premium |
| Sora 2 i2v | `fal-ai/sora-2/image-to-video` | $0.10 | $0.50 | $1.00 | Cheapest premium |
| Sora 2 t2v | `fal-ai/sora-2/text-to-video` | $0.10 | $0.50 | $1.00 | Cheapest premium |
| Seedance 2.0 ref-to-vid | `bytedance/seedance-2.0/reference-to-video` | TBD | TBD | TBD | Cinematic + native audio |

### Lip Sync
| Model | Endpoint | Price | Best For |
|-------|----------|-------|----------|
| Kling LipSync a2v | `fal-ai/kling-video/lipsync/audio-to-video` | $0.014/unit | **Default — cheapest** |
| Kling LipSync t2v | `fal-ai/kling-video/lipsync/text-to-video` | $0.014/unit | Skip ElevenLabs entirely |
| VEED Lipsync | `veed/lipsync` | $0.0006/compute-sec | Budget alternative |
| Sync Lipsync v3 | `fal-ai/sync-lipsync/v3` | $8.00/min | Premium quality (expensive) |

### Voice/TTS
| Provider | Price | Notes |
|----------|-------|-------|
| ElevenLabs Turbo v2.5 | ~$0.01/100 chars | Current integration, industry standard |
| Voxtral TTS (Mistral) | 47% cheaper than EL | NSFW-permissive, 90ms latency |
| Chatterbox | Free (open source) | Beat ElevenLabs 63.8% in blind tests |
| Veo 3.1 native audio | Included in video cost | Eliminates TTS+lipsync entirely |

### Upscaling
| Model | Endpoint | Price | Best For |
|-------|----------|-------|----------|
| Topaz Image | `fal-ai/topaz/upscale/image` | $0.01/MP | Default image upscale |
| Topaz Video | `fal-ai/topaz/upscale/video` | $0.01/sec | 4K video ($0.05/5s) |
| Crystal Upscaler | `clarityai/crystal-upscaler` | $0.016/MP | Face-focused |
| Clarity Upscaler | `fal-ai/clarity-upscaler` | $0.03/MP | Highest quality |
| SeedVR2 Video | `fal-ai/seedvr/upscale/video` | $0.001/MP | Cheapest video upscale |

### Image Editing (Layer 3)
| Model | Endpoint | Price | Notes |
|-------|----------|-------|-------|
| HY-WU Edit | `fal-ai/hy-wu-edit` | $0.10/unit | Face swap + outfit transfer |

---

## Research Findings That Impact Implementation

### Critical Kling Settings (From Research)
- **Face identity preservation via Elements system** — pass `frontal_image_url` + `reference_image_urls` + reference as `@Element1` in prompt. There is NO `face_reference_strength` parameter in the Fal.ai API. The "strength 42 vs 70-100" from research refers to the Kling WEB UI slider, not the API.
- Use "passport face" reference (neutral expression, eyes open, mouth closed) for best element binding
- Element Binding: upload face close-up separately from full-body reference
- Set motion intensity 0.3-0.5 initially for subtle natural movement
- ONE verb per shot (multiple motion verbs = chaos)

### Critical Veo 3.1 Rules
- Always add "No subtitles. No on-screen text." (Veo adds unwanted text by default)
- Keep dialogue to ONE LINE that can be said in ~8 seconds
- Use specific materials ("silk fabric flowing" not "fabric")
- Describe weight and physics for realistic motion
- Dialogue syntax: `Character says: "dialogue"` (95% subtitle-prevention)
- SynthID pixel-level watermark embedded — film grain degrades but may not fully remove

### Video Prompt Formula (5-Part, From Real Accounts)
```
[Cinematography] + [Subject] + [Action] + [Context] + [Style & Ambiance]
```
- Focus on PHYSICS not actions: "each step lands heel-first then rolls forward, arms swing loosely" instead of "woman walks"
- Anchor hands to objects: "right hand wraps around ceramic mug, thumb resting on rim"
- Break expressions into stages: "eyebrows lift barely, then more, eyes widen, mouth curves into smile"

### Reference System (Simplified — 2026-04-09 Decision)

Two reference types for images, one for video. Creator identity always locked in automatically.

| Type | Input | Mode | Description Field |
|------|-------|------|-------------------|
| **Scene** | Image | Exact or Inspired | Background/setting. e.g. "coffee shop in brooklyn" |
| **Product/Outfit** | Image | Always exact | Specific item to wear/hold/show. e.g. "gold necklace", "red dress" |
| **Motion** | Video | Always exact | Movements to copy. e.g. "this dance trend" |

- Creator face/identity is ALWAYS injected automatically via Elements system — that's the whole app
- "Vibe" mode removed — replaced by "Inspired by" on scene refs
- Image refs = scene OR product/outfit (user picks which when attaching)
- Video refs = motion template (auto-detected)
- Each ref gets a short optional description (few chars, tap to edit)
- Old system (mode: exact/similar/vibe × what: background/outfit/pose/all × description) is deprecated

How refs map to Kling APIs:
- Scene ref (exact) → passed as `image_urls[]` or `start_image_url`
- Scene ref (inspired) → described in prompt text, image passed as element for guidance
- Product/outfit ref → passed as element with prompt: "wearing the exact outfit from @Element2"
- Motion ref → passed as `video_url` in motion control endpoint
- Creator face → always @Element1 via `frontal_image_url` + `reference_image_urls`

### UGC "Realness" Prompting (Force Imperfection)
- "slight handheld camera shake"
- "off-center framing, subject left of center"
- "phone-quality depth of field"
- Casual environments: bedrooms, kitchens, cars — not studios
- Hair slightly messy, natural lighting, casual clothes with wrinkles

### Video Post-Processing Pipeline (Detection Avoidance)
Full FFmpeg pipeline for making AI video look natural:
```bash
ffmpeg -i ai_raw.mp4 \
  -vf "gblur=sigma=0.3, \
       noise=c0s=6:c0f=t+u, \
       colortemperature=temperature=6100, \
       curves=master='0/0 0.25/0.22 0.5/0.5 0.75/0.78 1/1', \
       vignette=PI/5" \
  -map_metadata -1 \
  -c:v libx264 -preset slow -crf 20 \
  -profile:v high -pix_fmt yuv420p \
  -c:a aac -b:a 192k \
  -movflags +faststart \
  output_clean.mp4
```
What each filter does:
- `gblur=sigma=0.3` — subtle blur reduces AI over-sharpness
- `noise=c0s=6:c0f=t+u` — film grain breaks statistical uniformity detectors
- `colortemperature=temperature=6100` — warm color temp (organic camera feel)
- `curves` — gentle contrast curve
- `vignette=PI/5` — subtle analog vignette
- `-map_metadata -1` — strips ALL metadata (C2PA, EXIF, IPTC, XMP)

### Platform-Optimized Export (Social Media Ready)
```bash
ffmpeg -i processed.mp4 \
  -vf "scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2" \
  -c:v libx264 -profile:v main -level:v 3.1 \
  -crf 18 -preset slow -maxrate 5000k -bufsize 5000k \
  -r 30 -pix_fmt yuv420p \
  -c:a aac -ar 44100 -b:a 256k \
  -movflags +faststart \
  output_final.mp4
```

### Content Strategy Findings
- Only ~25% of AI generations are usable for professional work — real cost is 3-4x advertised
- TikTok sweet spot: 24-38 seconds. Instagram Reels: 15-60 seconds.
- Hook in first 3 seconds = everything (63% of high-CTR videos)
- **Character accounts outperform model accounts** — personality > beauty
- Properly labeled AI content is eligible for TikTok Creator Fund + brand deals
- Proactive AI disclosure reduces removal risk by 94% on TikTok

### Revenue Data (Why This Pipeline Matters)
- Arcads charges ~$11/video for talking heads — our cost is ~$1.50-$5
- Top AI creators: $20K-$35K/month on Fanvue
- AI UGC on TikTok: 350% higher engagement vs human UGC (18.5% vs 5.3%)
- AI production: ~$400/minute vs $4,500/minute traditional
- Competitor Ad Cloner strategy: AI version beat human control by 45%

---

## LAYER 1: Core Video Generation (11 Tasks)

### Task 1: Fix motion transfer bug + verify text-to-video works

**Goal:** Fix confirmed data flow bug and get the simplest video path working.

**Bug:** `creation-panel.tsx:209` reads `inspirationVideo.preview` but store's `prefillMotionTransfer()` sets `motionSourceUrl`. Different fields — motion transfer always falls through to text-to-video.

**Files:**
- `src/components/studio/content/creation-panel.tsx`
- `src/server/actions/video-actions.ts`

**Changes:**
1. Fix creation-panel.tsx: destructure `motionSourceUrl` from store
2. Line 209: change `inspirationVideo` → `motionSourceUrl`
3. Line 210: change `inspirationVideo.preview` → `motionSourceUrl`
4. Fix `isDisabled()`: motion check uses `motionSourceUrl`
5. Add debug logging in `processVideoJob` (temporary, pre/post fal.subscribe)

**Verify:** Text-to-video with simple prompt → video appears in content browser.

---

### Task 2: Fix image-to-video + S3 URL handling + Kling settings

**Goal:** Get image-to-video working. Fix Kling face reference strength.

**Files:**
- `src/server/actions/video-actions.ts`

**Changes:**
1. If Fal.ai rejects S3 pre-signed URLs, use `fal.storage.upload()` to upload to Fal CDN first
2. Verify Kling response shape matches `output.video.url ?? output.video_url` parsing
3. **Set face reference strength to 80** (research says default 42 is too low — need 70-100)
4. For text-to-video: verify `image_url` param is valid for Kling v3 pro t2v (creator base image for face consistency)

**Verify:** Select existing photo → Make Video → motion prompt → generate.

---

### Task 3: Add video thumbnails

**Goal:** Videos show poster image in content grid.

**Files:**
- `src/server/actions/video-actions.ts`

**Changes (pragmatic — no ffmpeg for now):**
1. `generateVideoFromImage`: use source image S3 key as thumbnail
2. `generateVideoFromText`: use creator baseImageUrl as thumbnail
3. `generateVideoMotionTransfer`: use creator baseImageUrl as thumbnail
4. Update `processVideoJob` to accept + set `thumbnailKey`

**Verify:** Generate video → thumbnail shows in content browser grid.

---

### Task 4: Add video prompt enhancement

**Goal:** Enhance casual prompts into motion-focused descriptions using the 5-part formula.

**Files:**
- `src/lib/prompts.ts` — add `VIDEO_ENHANCE_PROMPT` + `enhanceVideoPrompt()`
- `src/server/actions/video-actions.ts` — call before generation

**Changes:**
1. `VIDEO_ENHANCE_PROMPT`: teaches LLM the 5-part formula ([Cinematography] + [Subject] + [Action] + [Context] + [Style]). Focuses on movement/physics, camera motion, environmental details. Never describe appearance. Include UGC imperfection cues. 40-80 words output.
2. `enhanceVideoPrompt()`: Grok Fast → Gemini Flash → fallback (same pattern as content enhancement)
3. Call in all 3 generation functions if prompt < 120 chars
4. Store enhanced as `prompt`, original as `userInput`

**Verify:** Short prompt "gym workout" → enhanced prompt uses 5-part formula with physics descriptions.

---

### Task 5: Test talking head pipeline end-to-end

**Goal:** Verify 3-step pipeline: ElevenLabs TTS → Gemini base image → Kling lip sync.

**Files:**
- `src/server/actions/talking-head-actions.ts`
- `src/lib/elevenlabs.ts`

**Known risks:**
1. ElevenLabs model `eleven_turbo_v2_5` may be outdated
2. Kling lip sync may reject static image URL (expects video_url param)
3. S3 pre-signed URLs may not work with Fal.ai — may need fal.storage.upload()

**Changes:**
1. Add step-level logging (after TTS, after image gen, after lip sync)
2. Upload audio + image to Fal storage if S3 URLs rejected
3. Update ElevenLabs model ID if needed

**Verify:** Select voice + short script → lip-synced video output.

---

### Task 6: Fix motion transfer UI flow

**Goal:** Users can select video source for motion transfer from existing content.

**Files:**
- `src/components/studio/content/creation-video.tsx`

**Changes:**
1. Replace placeholder "Upload a movement video in the Library panel" with video picker grid
2. Filter content for VIDEO/TALKING_HEAD with COMPLETED status
3. On selection, set `motionSourceUrl` with content's signed URL
4. Show selected video thumbnail with clear button
5. Use existing `sv2-photo-picker`/`sv2-photo-grid`/`sv2-photo-thumb` CSS classes

**Verify:** Generate video → switch to Motion Transfer → picker shows videos → select → generate.

---

### Task 7: Add model selector (Standard / Premium)

**Goal:** Users choose quality tier. Standard = Kling v3, Premium = Veo 3.1 Fast.

**Pricing rationale:** Veo 3.1 Fast ($0.15/s) is nearly identical cost to Kling ($0.14/s) but Google's latest model. Full Veo 3.1 ($0.40/s) too expensive for default premium.

**Files:**
- `src/stores/unified-studio-store.ts` — add `videoQuality: "standard" | "premium"`
- `src/components/studio/content/creation-video.tsx` — quality pills row
- `src/types/credits.ts` — `VIDEO_5S_PREMIUM: 5`, `VIDEO_10S_PREMIUM: 8`
- `src/server/actions/video-actions.ts` — accept quality param, route to model
- `src/components/studio/content/creation-panel.tsx` — pass videoQuality

**Model mapping:**
```
image-to-video:  standard → kling v3 standard i2v    | premium → veo3.1/fast/image-to-video
text-to-video:   standard → kling v3 pro t2v         | premium → veo3.1/fast
motion-control:  standard → kling v3 pro motion-ctrl | premium → kling v3 pro motion-ctrl (no Veo equivalent)
```

**UI:** "Quality" row with "Standard" / "Premium +2cr" pills. No model names shown to users.

**Verify:** Generate with each tier → different model used, different credit cost.

---

### Task 8: Video post-processing on download (metadata strip + naturalization)

**Goal:** Downloaded videos get full post-processing — strip AI watermarks, add film grain, naturalize.

**Current state:** Images get Sharp processing (strip C2PA/SynthID, inject iPhone EXIF). Videos just proxy raw from S3.

**Files:**
- `src/server/actions/download-actions.ts` — add `processVideoDownload()`
- `src/components/workspace/download-dialog.tsx` — route videos through processing
- `package.json` — may need `fluent-ffmpeg` or use Fal.ai ffmpeg API

**Changes:**
1. Add `processVideoDownload(s3Key, settings)` that:
   - Downloads video from S3
   - Runs FFmpeg pipeline: subtle blur (sigma=0.3) + film grain (strength 6) + warm color temp (6100) + gentle contrast curve + vignette + metadata strip
   - Optionally scales to 1080x1920 for social-optimized export
   - Returns clean video buffer
2. Download dialog: "Download Clean Video" button for video content
3. Advanced options: toggle grain/blur/color grading on/off
4. If server ffmpeg unavailable, fall back to Fal.ai's `fal-ai/ffmpeg-api/merge-videos` endpoint

**FFmpeg command (from research):**
```bash
ffmpeg -i input.mp4 \
  -vf "gblur=sigma=0.3,noise=c0s=6:c0f=t+u,colortemperature=temperature=6100,curves=master='0/0 0.25/0.22 0.5/0.5 0.75/0.78 1/1',vignette=PI/5" \
  -map_metadata -1 \
  -c:v libx264 -preset slow -crf 20 -profile:v high -pix_fmt yuv420p \
  -c:a aac -b:a 192k -movflags +faststart \
  output.mp4
```

**Verify:** Download video → inspect with ffprobe → no AI metadata. Visual check: subtle grain, warm tone.

---

### Task 9: Upscaling (images + video to 4K)

**Goal:** Users can upscale content. Topaz is basically free.

**Files:**
- `src/server/actions/upscale-actions.ts` — new file
- `src/components/workspace/content-detail.tsx` — enable Upscale button
- `src/types/credits.ts` — `UPSCALE_IMAGE: 1`, `UPSCALE_VIDEO: 2`

**Models:**
- Image: `fal-ai/topaz/upscale/image` ($0.01/MP)
- Video: `fal-ai/topaz/upscale/video` ($0.01/sec → 5s = $0.05)
- Face-focused: `clarityai/crystal-upscaler` ($0.016/MP)

**Changes:**
1. `upscaleContent(contentId)` server action: detect type → route to Topaz → upload to S3 → update Content record
2. Enable "Upscale" button in content-detail.tsx (currently stubbed/disabled)
3. Show "4K" badge on upscaled content
4. For video: async job pattern (same as video generation)

**Verify:** Upscale photo → sharper. Upscale video → higher resolution. Badge updates.

---

### Task 10: Quality / resolution display on outputs

**Goal:** Show resolution, model tier, and quality metadata on all content.

**Files:**
- `src/components/studio/content/studio-canvas.tsx` — resolution badge
- `src/components/studio/content/content-browser.tsx` — resolution on grid items
- `src/components/workspace/content-detail.tsx` — full quality panel

**Changes:**
1. Store resolution in `generationSettings` JSON (from Fal.ai response or image probe)
2. Resolution badge on canvas results: "HD" / "4K" / "1080x1920"
3. Content detail quality panel: resolution, quality tier (Standard/Premium), duration, file size
4. "Upscale to 4K" button when resolution below 4K

**Verify:** Generate content → resolution badge visible. Upscale → badge updates to 4K.

---

### Task 11: Error handling, NSFW explanation, and polish

**Goal:** Graceful failures with helpful explanations, especially for safety blocks.

**Files:**
- `src/components/studio/content/creation-panel.tsx`
- `src/server/actions/video-actions.ts`
- `src/server/actions/talking-head-actions.ts`

**Changes:**
1. **Polling timeout:** 5 min video, 8 min talking head. After: "Your video will appear in My Content when ready."
2. **Progress messages:** Rotate by elapsed time (Starting → Creating → Still working → Almost there)
3. **NSFW/safety error handling:**
   - Detect safety filter responses from Fal.ai/Kling/Veo
   - User-friendly message: "Your prompt was flagged as too explicit. Try describing the scene/outfit/setting instead of body details."
   - Suggest fixes: "Try 'bedroom selfie in silk pajamas' instead of explicit descriptions"
   - Auto-refund credits on safety blocks
4. **Rate limit:** "Too many requests — please wait 30 seconds"
5. **Stuck generation recovery:** GENERATING items in browser show "Still processing..." with elapsed time

**Verify:** Edge-case prompts → helpful error. Credits refunded. Progress messages rotate.

---

### Layer 1 Dependency Order

```
Task 1 (fix bug + text-to-video) ← CRITICAL PATH
  ├── Task 2 (image-to-video + Kling settings)
  ├── Task 3 (thumbnails)
  ├── Task 4 (prompt enhancement)
  └── Task 5 (talking head) — independent
Task 6 (motion transfer UI) — after Task 1
Task 7 (model selector) — after Tasks 1-2
Task 8 (video post-processing) — after Task 1
Task 9 (upscaling) — after Tasks 1-2
Task 10 (quality display) — after Tasks 1-3
Task 11 (error handling) — last
```

---

## LAYER 2: Talking Heads Pro (Future)

### Why This Layer
Talking heads are the premium product — what Arcads charges $11/video for. Layer 1 gets the basic pipeline working. Layer 2 makes it production-quality.

### Key Research Findings for This Layer
- **Veo 3.1 native audio eliminates the TTS+lipsync pipeline entirely** — single API call generates video WITH dialogue from text. This is the killer simplification.
- Kling LipSync text-to-video ($0.014/unit) also skips ElevenLabs
- Voice alternatives to test: Voxtral TTS (47% cheaper, NSFW-permissive), Chatterbox (beat ElevenLabs in blind tests, open source)
- Keep dialogue to ONE LINE per clip, max 8 seconds spoken
- Script structure: HOOK (3s) → BODY (20s) → CLOSER (5s)
- Script should be under 75 words for 30-second video

### Planned Tasks
1. **Veo 3.1 native audio path** — new talking head mode: user writes script → Veo 3.1 generates video with speech directly. No ElevenLabs, no lip sync step. Massive simplification + potentially better quality.
2. **Kling LipSync text-to-video** — another skip-ElevenLabs path, cheaper ($0.014/unit)
3. **Script enhancement** — AI writes/improves scripts with character voice, hook structure, optimal length
4. **Voice alternatives** — test Voxtral TTS and Chatterbox as ElevenLabs alternatives
5. **Dialogue prompting rules** — inject "No subtitles. No on-screen text." for Veo, use `says: "dialogue"` syntax
6. **Per-creator voice assignment** — save voice selection on Creator record, auto-use for all talking heads
7. **Audio preview** — preview voice + script before generating video (cheap ElevenLabs call)

### Model Routing for Talking Heads
```
Standard path (current): ElevenLabs TTS → Gemini base image → Kling LipSync a2v
Quick path (new):        Kling LipSync t2v (text directly, no TTS)
Premium path (new):      Veo 3.1 native audio (single API call, best quality)
Budget path (new):       Chatterbox TTS → Kling LipSync a2v (free voice gen)
```

---

## LAYER 3: Remix Engine (Future)

### Why This Layer
Motion transfer is high-demand — people want to recreate TikTok trends with their AI creator. But simple motion transfer gets detected by platforms. The remix approach (change face + background + keep motion) is more useful and harder to detect.

### Key Research Findings
- Kling Motion Control supports `element` param: separate face close-up from full-body reference
- `character_orientation: "video"` for complex motions (dances), supports up to 30s
- Kling O3 reference-to-video preserves character identity across any scene
- HY-WU Edit does face/outfit swap on images ($0.10/unit)
- No direct face swap for video on Fal.ai — would need frame-by-frame approach
- Experienced creators produce 15+ videos per session using same character with different motion templates
- Cost: ~$0.50/video, ~5 min production time

### Planned Tasks
1. **Enhanced motion transfer** — use Kling Motion Control with Elements system (face close-up + full body + motion video)
2. **Video upload for motion source** — file input for uploading TikTok/reference videos (not just existing content)
3. **Kling O3 reference-to-video** — identity-preserving video from any scene description
4. **Trend URL import** — paste TikTok/Instagram URL → download video → use as motion source
5. **Scene + product ref in video** — scene refs set the background, product/outfit refs set what to wear/show
6. **Image-level remixing** — HY-WU Edit for face/outfit swap on generated photos
7. **Batch motion transfer** — same character x multiple trending motions → queue → batch generate

### Architecture Notes
- All generation uses the simplified reference system: Scene (exact/inspired) + Product/Outfit (exact) + Motion (exact)
- Creator face is ALWAYS Element 1 — refs are Element 2+
- Motion transfer with identity preservation needs Kling Elements: `element.frontal_image_url` (face close-up)
- Full-body reference + face close-up should be separate uploads
- Set `cfg_scale: 0.5` and face adherence 80-90 for best results

---

## LAYER 4: Multi-Scene Director (Future)

### Why This Layer
Single 5-10s clips are useful but the real content is 30-60s narrative videos — day-in-my-life, product reviews, GRWM, etc. This needs scene planning, stitching, and audio continuity.

### Key Research Findings
- **Frame chaining** is the industry standard: extract last frame of clip N → use as first frame of clip N+1. Preserves motion vectors and lighting continuity.
- **Kling AI Director mode**: 2-6 camera cuts with automatic character consistency in single generation. Handles continuity automatically.
- **Shot list approach** (from Bible Influencer): generate each shot separately with same character references, stitch in CapCut/FFmpeg
- **Multi-stage model routing**: dialogue scenes → Veo 3.1 (best audio), action/movement → Kling 3.0 (best motion), establishing shots → Seedance 2.0 (best cinematic)
- **Script generation via Claude**: under 75 words for 30s video, pattern-interrupt hook in first 3 seconds
- **Fal.ai has `fal-ai/ffmpeg-api/merge-videos`** for server-side clip stitching
- Optimal lengths: TikTok 24-38s, Instagram Reels 15-60s, YouTube Shorts ~55s

### Planned Approaches (Need Design/Research)

**Approach A: Storyboard Builder**
- User lays out 3-6 scenes visually
- Each scene: description + duration + camera angle
- Generate each scene as independent clip with frame chaining
- Stitch with FFmpeg merge-videos API
- Add transitions, burned-in subtitles

**Approach B: Script-Driven**
- User writes/pastes script or voiceover text
- AI breaks into scenes automatically (Claude)
- Route each scene to optimal model (Veo for dialogue, Kling for action)
- Generate clips → stitch → sync audio

**Approach C: Template-Driven**
- Pre-built video templates: "Day in My Life", "Product Review", "GRWM", "Workout Vlog"
- Structure defined, user customizes content per scene
- Templates encode shot list + timing + camera angles

**Likely: Combination** — templates as starting points, user can customize storyboard, AI helps break scripts into shots.

### Technical Requirements
1. Scene sequencing UI (drag-drop storyboard)
2. Frame chaining system (extract last frame → feed as first frame)
3. Model routing per scene (dialogue → Veo, action → Kling, etc.)
4. FFmpeg merge endpoint for server-side stitching
5. Audio continuity (voiceover spans multiple clips)
6. Burned-in subtitle generation (Whisper transcription + FFmpeg burn-in)
7. Scene-level prompt enhancement
8. Total video duration estimation + credit cost calculation

---

## Key Files Reference

| File | Role |
|------|------|
| `src/server/actions/video-actions.ts` | Video generation (3 modes + status) |
| `src/server/actions/talking-head-actions.ts` | Talking head pipeline |
| `src/server/actions/download-actions.ts` | Download processing (images, needs video) |
| `src/components/studio/content/creation-panel.tsx` | Generation orchestrator |
| `src/components/studio/content/creation-video.tsx` | Video config UI |
| `src/components/studio/content/creation-talking.tsx` | Talking head config UI |
| `src/components/studio/content/studio-canvas.tsx` | Results display |
| `src/components/studio/content/content-browser.tsx` | Content grid |
| `src/components/workspace/video-player.tsx` | Video playback |
| `src/components/workspace/content-detail.tsx` | Content detail modal |
| `src/components/workspace/download-dialog.tsx` | Download dialog |
| `src/lib/fal.ts` | Fal.ai client |
| `src/lib/elevenlabs.ts` | ElevenLabs TTS |
| `src/lib/prompts.ts` | Prompt building + enhancement |
| `src/stores/unified-studio-store.ts` | All generation state |
| `src/types/credits.ts` | Credit costs |
| `prisma/schema.prisma` | Database schema |
| `docs/research/realinfluencer-master-research.md` | Master research doc |
| `docs/research/realinfluencer-expanded-playbook.md` | Expanded operational playbook |

## Layer 1 Verification Checklist

1. Text-to-video → video plays in canvas + appears in browser with thumbnail
2. Image-to-video from existing photo → animates correctly
3. Motion transfer from existing video → creator performs movements
4. Talking head with voice + script → lip-synced video
5. Premium quality tier → different model, higher credit cost
6. Short prompts enhanced with 5-part formula, long prompts pass through
7. Download video → clean metadata, film grain, warm tone (inspect with ffprobe)
8. Upscale photo → sharper. Upscale video → higher resolution
9. Resolution badge visible on all content
10. NSFW prompt → helpful error explaining what to change + credits refunded
11. Failed generation → credits refunded, friendly error
12. `pnpm build` passes with no type errors
