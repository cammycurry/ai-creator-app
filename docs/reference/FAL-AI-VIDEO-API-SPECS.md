# Fal.ai Video API Specs — Authoritative Reference

> Last verified against fal.ai docs: 2026-04-10. Use this as source of truth for API params.

---

## Table of Contents

- [Veo 3.1 Fast — Text-to-Video](#veo-31-fast--text-to-video)
- [Veo 3.1 Fast — Image-to-Video](#veo-31-fast--image-to-video)
- [Kling V3 Standard — Image-to-Video](#kling-v3-standard--image-to-video)
- [Kling V3 Pro — Image-to-Video](#kling-v3-pro--image-to-video)
- [Kling V3 — Text-to-Video (Standard / Pro)](#kling-v3--text-to-video-standard--pro)
- [Kling V3 Pro — Motion Control](#kling-v3-pro--motion-control)
- [Kling O3 Pro — Reference-to-Video](#kling-o3-pro--reference-to-video-identity-preservation)
- [DreamActor V2 — Motion Transfer](#dreamactor-v2-bytedance--motion-transfer)
- [Wan Motion — Budget Motion Transfer](#wan-motion--budget-motion-transfer)
- [Kling LipSync — Audio-to-Video](#kling-lipsync--audio-to-video)
- [Kling LipSync — Text-to-Video](#kling-lipsync--text-to-video)
- [ElevenLabs — Text-to-Speech](#elevenlabs--text-to-speech)
- [Motion Transfer Comparison](#motion-transfer-model-comparison)
- [Key Takeaways](#key-takeaways)

---

## Veo 3.1 Fast — Text-to-Video

**Endpoint:** `fal-ai/veo3.1/fast`
**Source:** https://fal.ai/models/fal-ai/veo3.1/fast/api
**Used in app:** Premium text-to-video (`video-actions.ts`)

### Input
| Param | Type | Required | Default | Notes |
|-------|------|----------|---------|-------|
| `prompt` | string | **Yes** | — | Max 20,000 chars |
| `aspect_ratio` | enum | No | "16:9" | "16:9", "9:16" (no 1:1) |
| `duration` | enum | No | "8s" | "4s", "6s", "8s" |
| `resolution` | enum | No | "720p" | "720p", "1080p", "4k" |
| `negative_prompt` | string | No | — | What to avoid |
| `generate_audio` | boolean | No | true | Native audio generation |
| `seed` | integer | No | — | Reproducibility |
| `auto_fix` | boolean | No | true | Auto-rewrite prompts that fail content policy |
| `safety_tolerance` | enum | No | "4" | 1 (most strict) to 6 (least strict) |

### Response
```json
{
  "video": {
    "url": "https://v3.fal.media/files/.../output.mp4",
    "content_type": "video/mp4",
    "file_name": "output.mp4",
    "file_size": 18468404
  }
}
```

**Pricing:**
| Resolution | No Audio | With Audio |
|-----------|----------|------------|
| 720p / 1080p | $0.10/sec | $0.15/sec |
| 4K | $0.30/sec | $0.35/sec |

**Note:** Does NOT support elements, character identity, or reference images. For identity preservation, use Kling O3 reference-to-video instead.

---

## Veo 3.1 Fast — Image-to-Video

**Endpoint:** `fal-ai/veo3.1/fast/image-to-video`
**Source:** https://fal.ai/models/fal-ai/veo3.1/fast/image-to-video/api
**Used in app:** Premium image-to-video (`video-actions.ts`)

### Input
| Param | Type | Required | Default | Notes |
|-------|------|----------|---------|-------|
| `prompt` | string | **Yes** | — | Text prompt describing the video |
| `image_url` | string | **Yes** | — | Source image URL. 720p+ resolution, 16:9 or 9:16 aspect ratio, max 8MB |
| `aspect_ratio` | enum | No | "auto" | "auto", "16:9", "9:16" (no 1:1) |
| `duration` | enum | No | "8s" | "4s", "6s", "8s" |
| `resolution` | enum | No | "720p" | "720p", "1080p", "4k" |
| `negative_prompt` | string | No | — | What to avoid |
| `generate_audio` | boolean | No | true | Native audio generation |
| `seed` | integer | No | — | Reproducibility |
| `auto_fix` | boolean | No | — | Auto-rewrite prompts that fail content policy |
| `safety_tolerance` | enum | No | "4" | 1 (most strict) to 6 (least strict) |

**IMPORTANT:** Uses `image_url` (NOT `start_image_url` like Kling V3).

### Response
```json
{
  "video": {
    "url": "https://v3.fal.media/files/.../output.mp4",
    "content_type": "video/mp4",
    "file_name": "output.mp4",
    "file_size": 18468404
  }
}
```

**Pricing:** Same as Veo 3.1 text-to-video (see table above).

**Note:** Does NOT support elements or character identity. Animates a single source image with text guidance.

---

## Kling V3 Standard — Image-to-Video

**Endpoint:** `fal-ai/kling-video/v3/standard/image-to-video`
**Source:** https://fal.ai/models/fal-ai/kling-video/v3/standard/image-to-video/api
**Used in app:** Standard image-to-video (`video-actions.ts`)

### Input
| Param | Type | Required | Default | Notes |
|-------|------|----------|---------|-------|
| `start_image_url` | string | **Yes** | — | URL of starting image |
| `prompt` | string | Conditional | — | Either `prompt` or `multi_prompt`, not both |
| `multi_prompt` | KlingV3MultiPromptElement[] | Conditional | — | Multi-shot (splits video into shots) |
| `duration` | enum (3-15) | No | "5" | Seconds |
| `generate_audio` | boolean | No | true | Native audio (Chinese/English) |
| `end_image_url` | string | No | — | End frame image |
| `voice_ids` | string[] | No | — | Reference as <<<voice_1>>> in prompt |
| `elements` | KlingV3ComboElementInput[] | No | — | Character/object identity binding |
| `shot_type` | enum | No | "customize" | "customize" or "intelligent". Required with multi_prompt |
| `negative_prompt` | string | No | "blur, distort, and low quality" | |
| `cfg_scale` | float | No | 0.5 | Prompt adherence |
| `aspect_ratio` | enum | No | "16:9" | "16:9", "9:16", "1:1" |

### Elements (KlingV3ComboElementInput)
```json
{
  "frontal_image_url": "https://example.com/face.jpg",
  "reference_image_urls": ["https://example.com/ref1.jpg"]
}
```
Or video element:
```json
{
  "video_url": "https://example.com/motion.mp4"
}
```
Reference in prompt as `@Element1`, `@Element2`, etc.

### Response
```json
{
  "video": {
    "url": "https://v3.fal.media/files/.../output.mp4",
    "content_type": "video/mp4",
    "file_name": "out.mp4",
    "file_size": 3149129
  }
}
```

**Pricing:**
| Audio | Voice Control | Cost |
|-------|--------------|------|
| Off | — | $0.084/sec |
| On | No | $0.126/sec |
| On | Yes | $0.154/sec |

---

## Kling V3 Pro — Image-to-Video

**Endpoint:** `fal-ai/kling-video/v3/pro/image-to-video`
**Source:** https://fal.ai/models/fal-ai/kling-video/v3/pro/image-to-video/api

Same parameters as V3 Standard image-to-video above. Higher quality output, longer inference time.

**Pricing:**
| Audio | Voice Control | Cost |
|-------|--------------|------|
| Off | — | $0.112/sec |
| On | No | $0.168/sec |
| On | Yes | $0.196/sec |

---

## Kling V3 — Text-to-Video (Standard / Pro)

**Standard Endpoint:** `fal-ai/kling-video/v3/standard/text-to-video`
**Pro Endpoint:** `fal-ai/kling-video/v3/pro/text-to-video`
**Source:** https://fal.ai/models/fal-ai/kling-video/v3/pro/text-to-video/api

### Input
| Param | Type | Required | Default | Notes |
|-------|------|----------|---------|-------|
| `prompt` | string | Conditional | — | Either `prompt` or `multi_prompt`, not both |
| `multi_prompt` | KlingV3MultiPromptElement[] | Conditional | — | Multi-shot sequences |
| `duration` | enum (3-15) | No | "5" | Seconds |
| `generate_audio` | boolean | No | true | Native audio generation |
| `aspect_ratio` | enum | No | "16:9" | "16:9", "9:16", "1:1" |
| `shot_type` | enum | No | "customize" | "customize" or "intelligent" |
| `negative_prompt` | string | No | "blur, distort, and low quality" | |
| `cfg_scale` | float | No | 0.5 | Prompt adherence |

**NOTE:** Pure text-to-video does NOT accept `elements`, `start_image_url`, or `image_url`.
For character identity in text-to-video, use O3 reference-to-video instead.

### Response
```json
{
  "video": {
    "url": "https://v3.fal.media/files/.../output.mp4",
    "content_type": "video/mp4",
    "file_name": "output.mp4",
    "file_size": 3149129
  }
}
```

**Pricing (Standard):** $0.084/sec (no audio), $0.126/sec (with audio)
**Pricing (Pro):** $0.112/sec (no audio), $0.168/sec (with audio), $0.196/sec (audio + voice)

---

## Kling V3 Pro — Motion Control

**Endpoint:** `fal-ai/kling-video/v3/pro/motion-control`
**Source:** https://fal.ai/models/fal-ai/kling-video/v3/pro/motion-control/api
**Used in app:** Motion transfer (`video-actions.ts`)

### Input
| Param | Type | Required | Default | Notes |
|-------|------|----------|---------|-------|
| `image_url` | string | **Yes** | — | Character reference image. Clear proportions, no occlusion, >5% of image area |
| `video_url` | string | **Yes** | — | Motion reference video. Full/upper body visible, no obstruction |
| `character_orientation` | enum | **Yes** | — | `"video"` (complex motions, 30s max) or `"image"` (camera movements, 10s max) |
| `prompt` | string | No | — | Guidance text |
| `keep_original_sound` | boolean | No | true | Keep audio from reference video |
| `elements` | KlingV3ImageElementInput[] | No | null | Face binding (1 element max, only with orientation `"video"`) |

### Elements for Face Binding
```json
{
  "elements": [
    {
      "frontal_image_url": "https://example.com/face_closeup.jpg"
    }
  ]
}
```
Reference in prompt as `@Element1`. Only supported when `character_orientation` is `"video"`.

### Response
```json
{
  "video": {
    "url": "https://fal.media/files/output.mp4"
  }
}
```

**Pricing:** $0.168/sec

---

## Kling O3 Pro — Reference-to-Video (Identity Preservation)

**Endpoint:** `fal-ai/kling-video/o3/pro/reference-to-video`
**Source:** https://fal.ai/models/fal-ai/kling-video/o3/pro/reference-to-video/api
**Used in app:** Standard text-to-video with character identity (`video-actions.ts`)

### Input
| Param | Type | Required | Default | Notes |
|-------|------|----------|---------|-------|
| `prompt` | string | Conditional | — | Use `@Element1` to reference elements. Either `prompt` or `multi_prompt` |
| `multi_prompt` | KlingV3MultiPromptElement[] | Conditional | — | Multi-shot sequences with per-shot durations (1-15s each) |
| `start_image_url` | string | No | — | Starting image |
| `end_image_url` | string | No | — | Ending image |
| `image_urls` | string[] | No | — | Style/appearance refs (max 4 total with elements). Ref as `@Image1`, `@Image2` |
| `elements` | KlingV3ComboElementInput[] | No | — | Character identity elements |
| `generate_audio` | boolean | No | false | Native audio generation |
| `duration` | enum (3-15) | No | "5" | Seconds |
| `aspect_ratio` | enum | No | "16:9" | "16:9", "9:16", "1:1" |
| `shot_type` | enum | No | "customize" | "customize" or "intelligent" |
| `negative_prompt` | string | No | "blur, distort, and low quality" | |
| `cfg_scale` | float | No | 0.5 | Prompt adherence |

### Elements
```json
{
  "elements": [
    {
      "frontal_image_url": "https://example.com/face.jpg",
      "reference_image_urls": ["https://example.com/ref.jpg"]
    }
  ]
}
```

### Response
```json
{
  "video": {
    "url": "https://v3b.fal.media/files/.../output.mp4",
    "content_type": "video/mp4",
    "file_name": "output.mp4",
    "file_size": 18468404
  }
}
```

**Pricing:** $0.112/sec (no audio), $0.14/sec (with audio)

---

## DreamActor V2 (ByteDance) — Motion Transfer

**Endpoint:** `fal-ai/bytedance/dreamactor/v2`
**Source:** https://fal.ai/models/fal-ai/bytedance/dreamactor/v2/api
**Last verified:** 2026-04-10
**Not used in app** — available as alternative to Kling motion control

Animates a reference image using motion from a driving video. Preserves facial expressions, lip movements, subject, and background features. Works for non-human characters too.

### Input
| Param | Type | Required | Default | Notes |
|-------|------|----------|---------|-------|
| `image_url` | string | **Yes** | — | Reference character image. Max 4.7MB, 480x480–1920x1080 |
| `video_url` | string | **Yes** | — | Driving video with motion to copy. Max 30s, mp4/mov/webm |
| `trim_first_second` | boolean | No | true | Trim first second of output (removes initialization artifact) |

### Response
```json
{
  "video": {
    "url": "https://v3b.fal.media/files/.../output.mp4",
    "content_type": "video/mp4",
    "file_name": "output.mp4",
    "file_size": 3149129
  }
}
```

**Pricing:** ~$0.05/sec (3x cheaper than Kling motion control)
**Best for:** Face-driven animation, expressions, lip sync from video. Simple API (no elements/orientation needed).

---

## Wan Motion — Budget Motion Transfer

**Endpoint:** `fal-ai/wan-motion`
**Source:** https://fal.ai/models/fal-ai/wan-motion/api
**Last verified:** 2026-04-10
**Not used in app** — available as budget alternative

Streamlined character animation. Uses pose retargeting to adapt driving video's skeleton to match reference character's body shape. 720p output.

### Input
| Param | Type | Required | Default | Notes |
|-------|------|----------|---------|-------|
| `video_url` | string | **Yes** | — | Driving video |
| `image_url` | string | **Yes** | — | Reference character image |
| `prompt` | string | No | "" | Text guidance for generation |
| `seed` | integer | No | — | Reproducibility |
| `acceleration` | enum | No | "regular" | "regular" or "none" |
| `adapt_motion` | boolean | No | true | Match driving video motion to reference proportions |
| `enhance_identity` | boolean | No | — | Improve face/appearance transfer using Flux preprocessing |
| `enable_safety_checker` | boolean | No | true | Safety validation |

### Response
```json
{
  "video": {
    "url": "https://v3.fal.media/files/.../output.mp4"
  },
  "prompt": "...",
  "seed": 12345
}
```

**Pricing:** ~$0.002/sec (essentially free)
**Best for:** Budget testing, body-proportion-preserving animation. Lower quality than Kling/DreamActor.

---

## Motion Transfer Model Comparison

| Model | Endpoint | $/sec | Face Expressions | Body Motion | Face Binding | Complexity |
|-------|----------|-------|-----------------|-------------|--------------|-----------|
| Kling V3 Pro | `fal-ai/kling-video/v3/pro/motion-control` | $0.168 | Basic | Excellent | Elements system | Medium |
| DreamActor V2 | `fal-ai/bytedance/dreamactor/v2` | ~$0.05 | **Excellent** (lip sync!) | Good | Built-in | **Simple** |
| Wan Motion | `fal-ai/wan-motion` | ~free | None | Good | None | Simple |

---

## Kling LipSync — Audio-to-Video

**Endpoint:** `fal-ai/kling-video/lipsync/audio-to-video`
**Source:** https://fal.ai/models/fal-ai/kling-video/lipsync/audio-to-video/api
**Used in app:** Talking head generation (`talking-head-actions.ts`)

### Input
| Param | Type | Required | Default | Notes |
|-------|------|----------|---------|-------|
| `video_url` | string | **Yes** | — | Video or static image URL. .mp4/.mov, ≤100MB, 2-10s, 720p/1080p, width/height 720-1920px |
| `audio_url` | string | **Yes** | — | Audio URL. Min 2s, max 60s, max 5MB |

### Response
```json
{
  "video": {
    "url": "https://storage.googleapis.com/falserverless/kling/kling_output.mp4"
  }
}
```

**Pricing:** $0.014/input-video-second (rounded up to nearest 5s increment)
**Note:** Accepts static images as `video_url` — no need to convert to video first.

---

## Kling LipSync — Text-to-Video

**Endpoint:** `fal-ai/kling-video/lipsync/text-to-video`
**Source:** https://fal.ai/models/fal-ai/kling-video/lipsync/text-to-video/api
**Last verified:** 2026-04-10

### Input
| Param | Type | Required | Default | Notes |
|-------|------|----------|---------|-------|
| `video_url` | string | **Yes** | — | Video to lip sync. .mp4/.mov, ≤100MB, 2-60s, 720p/1080p |
| `text` | string | **Yes** | — | Max 120 characters |
| `voice_id` | VoiceIdEnum | **Yes** | — | See voice list below |
| `voice_language` | enum | No | "en" | "zh" or "en" |
| `voice_speed` | float | No | 1 | Speech rate |

### Available Voice IDs (English)
`oversea_male1`, `uk_boy1`, `uk_man2`, `uk_oldman3`, `reader_en_m-v1`, `commercial_lady_en_f-v1`

### Response
```json
{
  "video": {
    "url": "https://v3.fal.media/files/.../output.mp4",
    "content_type": "video/mp4",
    "file_name": "output.mp4",
    "file_size": 3149129
  }
}
```

**Pricing:** $0.014/input-video-second (rounded up to nearest 5s increment)
**Note:** Skips need for ElevenLabs TTS entirely. Max 120 chars = ~15-20 seconds of speech.

---

## ElevenLabs — Text-to-Speech

**Endpoint:** `POST https://api.elevenlabs.io/v1/text-to-speech/{voice_id}`
**Source:** https://elevenlabs.io/docs/api-reference/text-to-speech
**Used in app:** Talking head TTS (`src/lib/elevenlabs.ts`)

### Input
| Param | Type | Required | Default | Notes |
|-------|------|----------|---------|-------|
| `text` | string | **Yes** | — | Max ~5000 chars |
| `model_id` | string | **Yes** | — | We use `eleven_turbo_v2_5` |
| `voice_settings.stability` | float | No | 0.5 | 0-1, higher = more consistent |
| `voice_settings.similarity_boost` | float | No | 0.75 | 0-1, higher = closer to original voice |
| `voice_settings.style` | float | No | 0.5 | 0-1, expressiveness |
| `voice_settings.use_speaker_boost` | boolean | No | true | Enhances clarity |

### Headers
```
xi-api-key: YOUR_API_KEY
Content-Type: application/json
```

### Response
Binary audio/mpeg stream (MP3)

**Pricing:** ~$0.01 per 100 characters

### Platform Voice IDs (our curated set in `src/data/voices.ts`)
| Name | ID | Gender | Tone |
|------|-----|--------|------|
| Rachel | 21m00Tcm4TlvDq8ikWAM | F | Calm |
| Domi | AZnzlk1XvdvUeBnXmlld | F | Energetic |
| Bella | EXAVITQu4vr4xnSDxMaL | F | Warm |
| Elli | MF3mGyEYCl7XYWbV9V6O | F | Professional |
| Josh | TxGEqnHWrfWFTfGW9XjX | M | Warm |
| Arnold | VR6AewLTigWG4xSOukaG | M | Professional |
| Adam | pNInz6obpgDQGcFmaJgB | M | Calm |
| Sam | yoZ06aMxZJJ28mfd3POQ | M | Energetic |

---

## Key Takeaways

1. **Veo 3.1 uses `image_url`**, Kling V3 uses `start_image_url` — don't mix them up
2. **Veo 3.1 does NOT support elements** — for character identity, use Kling O3 reference-to-video
3. **Veo 3.1 only supports "16:9" and "9:16"** — no "1:1" option
4. **Veo 3.1 duration is string enum** ("4s", "6s", "8s"), Kling duration is numeric string ("3" through "15")
5. **V3 t2v does NOT support elements or reference images** — use O3 reference-to-video for character identity
6. **V3 i2v DOES support elements** for face binding alongside the start image
7. **Motion control requires `character_orientation`** — mandatory param, `"video"` or `"image"`
8. **Elements use `@Element1` syntax** in prompts to reference
9. **Response shapes are now consistent**: all endpoints return `{ video: { url } }` format
10. **V3 duration range is 3-15 seconds** (not just 5/10)
11. **Kling LipSync a2v** accepts static images as `video_url` — no need to convert to video first
12. **Kling LipSync t2v** has max 120 chars — ~15-20 seconds of speech, limited voice options
13. **Fal.ai storage upload** required for S3-hosted files — pre-signed URLs may not work with Fal endpoints
14. **Kling V3 is the latest** — there is no V4 as of April 2026. O3 is the omni variant of V3.
15. **`prompt` vs `multi_prompt`** — mutually exclusive on all Kling endpoints that accept both
