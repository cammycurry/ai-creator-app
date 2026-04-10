# Fal.ai Video API Specs — Authoritative Reference

> Pulled from fal.ai docs via Context7 MCP, April 2026. Use this as source of truth for API params.

---

## Kling V3 Standard — Image-to-Video

**Endpoint:** `fal-ai/kling-video/v3/standard/image-to-video`
**Source:** https://fal.ai/models/fal-ai/kling-video/v3/standard/image-to-video/api

### Input
| Param | Type | Required | Default | Notes |
|-------|------|----------|---------|-------|
| `start_image_url` | string | **Yes** | — | URL of starting image |
| `prompt` | string | No | — | Text prompt for motion/scene |
| `multi_prompt` | KlingV3MultiPromptElement[] | No | — | Multi-shot (splits video into shots) |
| `duration` | int (3-15) | No | 5 | Seconds |
| `generate_audio` | boolean | No | true | Native audio (Chinese/English) |
| `end_image_url` | string | No | — | End frame image |
| `voice_ids` | string[] | No | — | Reference as <<<voice_1>>> in prompt |
| `elements` | KlingV3ComboElementInput[] | No | — | Character/object identity binding |
| `shot_type` | string | No | "customize" | Required with multi_prompt |
| `negative_prompt` | string | No | "blur, distort, and low quality" | |
| `cfg_scale` | float | No | 0.5 | Prompt adherence |
| `aspect_ratio` | string | No | "16:9" | "16:9", "9:16", "1:1" |

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
    "file_size": 3149129,
    "file_name": "out.mp4",
    "content_type": "video/mp4",
    "url": "https://storage.googleapis.com/.../out.mp4"
  }
}
```

---

## Kling V3 Pro — Text-to-Video

**Endpoint:** `fal-ai/kling-video/v3/pro/text-to-video`
**Source:** https://fal.ai/models/fal-ai/kling-video/v3/standard/text-to-video/api

### Input
| Param | Type | Required | Default | Notes |
|-------|------|----------|---------|-------|
| `prompt` | string | **Yes** | — | Text prompt |
| `duration` | int (5 or 10) | No | 5 | Seconds |
| `aspect_ratio` | string | No | "16:9" | "16:9", "9:16", "1:1" |
| `negative_prompt` | string | No | "blur, distort, and low quality" | |
| `cfg_scale` | float | No | 0.5 | Prompt adherence |

**NOTE:** Pure text-to-video does NOT accept `elements`, `start_image_url`, or `image_url`.
For character identity in text-to-video, use the O3 reference-to-video endpoint instead.

### Response
```json
{
  "video": {
    "url": "https://v3.fal.media/files/.../output.mp4"
  }
}
```

---

## Kling V3 Pro — Motion Control

**Endpoint:** `fal-ai/kling-video/v3/pro/motion-control`
**Source:** https://fal.ai/models/fal-ai/kling-video/v3/pro/motion-control/api

### Input
| Param | Type | Required | Default | Notes |
|-------|------|----------|---------|-------|
| `image_url` | string | **Yes** | — | Character reference image |
| `video_url` | string | **Yes** | — | Motion reference video |
| `character_orientation` | string | **Yes** | — | "video" (complex, 30s max) or "image" (camera, 10s max) |
| `prompt` | string | No | — | Guidance text |
| `keep_original_sound` | boolean | No | true | Keep audio from reference video |
| `elements` | KlingV3ImageElementInput[] | No | — | Face binding (1 element max, only with orientation "video") |

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
OR (older format):
```json
{
  "video_url": "https://example.com/generated_video.mp4"
}
```

---

## Kling O3 Pro — Reference-to-Video (Identity Preservation)

**Endpoint:** `fal-ai/kling-video/o3/pro/reference-to-video`
**Source:** https://fal.ai/models/fal-ai/kling-video/o3/pro/reference-to-video

### Input
| Param | Type | Required | Default | Notes |
|-------|------|----------|---------|-------|
| `prompt` | string | **Yes** | — | Use @Element1 to reference elements |
| `start_image_url` | string | No | — | Starting image |
| `end_image_url` | string | No | — | Ending image |
| `image_urls` | string[] | No | — | Additional images (max 4 total with elements) |
| `elements` | object[] | No | — | Character identity elements |
| `generate_audio` | boolean | No | false | |
| `duration` | string | No | "5" | "3" through "10" |
| `aspect_ratio` | string | No | "auto" | "auto", "16:9", "9:16", "1:1" |
| `shot_type` | string | No | "customize" | |

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
    "file_size": 18468404,
    "file_name": "output.mp4",
    "content_type": "video/mp4",
    "url": "https://v3b.fal.media/files/.../output.mp4"
  }
}
```

**Pricing:** $0.112/sec (no audio) or $0.14/sec (with audio)

---

## DreamActor V2 (ByteDance) — Motion Transfer

**Endpoint:** `fal-ai/bytedance/dreamactor/v2`
**Source:** https://fal.ai/models/fal-ai/bytedance/dreamactor/v2/api
**Last verified:** 2026-04-10

Animates a reference image using motion from a driving video. Preserves facial expressions, lip movements, subject, and background features. Works for non-human characters too.

### Input
| Param | Type | Required | Default | Notes |
|-------|------|----------|---------|-------|
| `image_url` | string | **Yes** | — | Reference character image |
| `video_url` | string | **Yes** | — | Driving video with motion to copy |
| `trim_first_second` | boolean | No | — | Trim first second of output |

### Request Example
```json
{
  "image_url": "https://example.com/character.png",
  "video_url": "https://example.com/dance.mp4",
  "trim_first_second": true
}
```

### Response
```json
{
  "video": {
    "url": "https://v3b.fal.media/files/.../output.mp4"
  }
}
```

**Pricing:** $0.05/sec (3x cheaper than Kling motion control)
**Best for:** Face-driven animation, expressions, lip sync from video. Simple API (no elements/orientation needed).

---

## Wan Motion — Budget Motion Transfer

**Endpoint:** `fal-ai/wan-motion`
**Source:** https://fal.ai/models/fal-ai/wan-motion
**Last verified:** 2026-04-10

Streamlined character animation. Uses pose retargeting to adapt driving video's skeleton to match reference character's body shape. 720p output.

### Input
| Param | Type | Required | Default | Notes |
|-------|------|----------|---------|-------|
| `video_url` | string | **Yes** | — | Driving video |
| `image_url` | string | **Yes** | — | Reference character image |
| `resolution` | string | No | "480p" | "480p", "580p", "720p" |
| `use_turbo` | boolean | No | — | Quality enhancement, auto-optimizes params |
| `video_quality` | string | No | "high" | "low", "medium", "high", "maximum" |
| `guidance_scale` | float | No | 1 | Higher = more prompt adherence, less quality |
| `num_inference_steps` | int | No | 20 | Higher = better quality, slower |

### Request Example
```json
{
  "video_url": "https://example.com/dance.mp4",
  "image_url": "https://example.com/character.jpg",
  "resolution": "720p",
  "use_turbo": true,
  "video_quality": "high"
}
```

### Response
```json
{
  "video_url": "https://example.com/output.mp4"
}
```
OR (alternate format):
```json
{
  "video": { "url": "..." }
}
```

**Pricing:** $0.0002/compute-sec (essentially free)
**Best for:** Budget testing, body-proportion-preserving animation. Lower quality than Kling/DreamActor.

---

## Motion Transfer Model Comparison

| Model | Endpoint | $/sec | Face Expressions | Body Motion | Face Binding | Complexity |
|-------|----------|-------|-----------------|-------------|--------------|-----------|
| Kling V3 Pro | `fal-ai/kling-video/v3/pro/motion-control` | $0.168 | Basic | Excellent | Elements system | Medium |
| DreamActor V2 | `fal-ai/bytedance/dreamactor/v2` | $0.05 | **Excellent** (lip sync!) | Good | Built-in | **Simple** |
| Wan Motion | `fal-ai/wan-motion` | ~free | None | Good | None | Simple |

---

## Kling LipSync — Audio-to-Video

**Endpoint:** `fal-ai/kling-video/lipsync/audio-to-video`
**Source:** https://fal.ai/models/fal-ai/kling-video/lipsync/audio-to-video
**Last verified:** 2026-04-09

### Input
| Param | Type | Required | Default | Notes |
|-------|------|----------|---------|-------|
| `video_url` | string | **Yes** | — | Video or static image URL. .mp4/.mov, ≤100MB, 2-10s, 720p/1080p, width/height 720-1920px |
| `audio_url` | string | **Yes** | — | Audio URL. Min 2s, max 60s, max 5MB |

### Request Example
```json
{
  "video_url": "https://example.com/face.jpg",
  "audio_url": "https://example.com/speech.mp3"
}
```

### Response
```json
{
  "video": {
    "url": "https://storage.googleapis.com/falserverless/kling/kling_output.mp4"
  }
}
```

**Pricing:** $0.014/unit

---

## Kling LipSync — Text-to-Video

**Endpoint:** `fal-ai/kling-video/lipsync/text-to-video`
**Source:** https://fal.ai/models/fal-ai/kling-video/lipsync/text-to-video/api
**Last verified:** 2026-04-09

### Input
| Param | Type | Required | Default | Notes |
|-------|------|----------|---------|-------|
| `video_url` | string | **Yes** | — | Video to lip sync. .mp4/.mov, ≤100MB, 2-60s, 720p/1080p |
| `text` | string | **Yes** | — | Max 120 characters |
| `voice_id` | VoiceIdEnum | **Yes** | — | See voice list below |
| `voice_language` | string | No | "en" | "zh" or "en" |
| `voice_speed` | float | No | 1 | Speech rate |

### Available Voice IDs (English)
`oversea_male1`, `uk_boy1`, `uk_man2`, `uk_oldman3`, `reader_en_m-v1`, `commercial_lady_en_f-v1`

### Request Example
```json
{
  "video_url": "https://example.com/talking_head.mp4",
  "text": "Hello, this is a lip sync test.",
  "voice_id": "uk_boy1",
  "voice_language": "en"
}
```

### Response
```json
{
  "video_url": "https://example.com/generated_lipsync.mp4"
}
```

**Pricing:** $0.014/unit
**Note:** Skips need for ElevenLabs TTS entirely. Max 120 chars = ~15-20 seconds of speech.

---

## ElevenLabs — Text-to-Speech

**Endpoint:** `POST https://api.elevenlabs.io/v1/text-to-speech/{voice_id}`
**Source:** https://elevenlabs.io/docs/api-reference/text-to-speech
**Last verified:** 2026-04-09

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

### Request Example
```json
{
  "text": "Hey guys, I just got back from the gym and I feel amazing",
  "model_id": "eleven_turbo_v2_5",
  "voice_settings": {
    "stability": 0.5,
    "similarity_boost": 0.75,
    "style": 0.5,
    "use_speaker_boost": true
  }
}
```

### Response
Binary audio/mpeg stream (MP3)

**Pricing:** ~$0.01 per 100 characters

### Platform Voice IDs (our curated set)
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

1. **V3 i2v uses `start_image_url`** (NOT `image_url`)
2. **V3 t2v does NOT support elements or reference images** — for character identity in text-based generation, use **O3 reference-to-video** instead
3. **V3 i2v DOES support elements** for face binding alongside the start image
4. **Motion control requires `character_orientation`** — mandatory param
5. **Elements use `@Element1` syntax** in prompts to reference
6. **Response shapes vary**: V3 uses `{ video: { url } }`, some older/motion return `{ video_url }`
7. **V3 duration range is 3-15 seconds** (not just 5/10)
8. **Kling LipSync a2v** accepts static images as `video_url` — no need to convert to video first
9. **Kling LipSync t2v** has max 120 chars — ~15-20 seconds of speech, limited voice options
10. **Fal.ai storage upload** required for S3-hosted files — pre-signed URLs may not work with Fal endpoints
