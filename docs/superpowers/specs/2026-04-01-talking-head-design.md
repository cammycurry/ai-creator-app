# Talking Head Video — Design Spec

**Date:** 2026-04-01
**Status:** Approved
**Scope:** Script → Voice → Image → Lip Sync pipeline for talking head UGC videos
**Depends on:** Video Generation spec (Fal.ai client, async jobs, video player)

---

## Overview

The premium content type. User writes a script (or AI writes it), picks a voice, system generates a talking-head video of their AI creator speaking to camera with synchronized lip movement, natural head motion, and emotional expression. This is what Arcads charges $11/video for — we do it for 8 credits (~$1.20).

---

## 1. Pipeline

```
Script (user writes or AI generates)
  → Voice (ElevenLabs TTS → audio file)
  → Image (Gemini generates front-facing, mouth-neutral portrait)
  → Lip Sync (Hedra Character-3 via Fal.ai → video with synced mouth)
  → Metadata strip (ffmpeg re-encode)
  → S3 upload → Content record → display
```

Each step is a separate server action. The orchestrator chains them.

---

## 2. Voice Generation (ElevenLabs)

### 2.1 Integration

Direct API, not Fal.ai. ElevenLabs Turbo v3.

```
POST https://api.elevenlabs.io/v1/text-to-speech/{voice_id}
Body: { text, model_id: "eleven_turbo_v2_5", voice_settings: { stability, similarity_boost } }
Response: audio/mpeg binary
```

### 2.2 Voice Selection

Platform provides a curated set of default voices (no custom cloning in v1):
- 6-10 pre-selected voices covering: young female, young male, mature female, mature male, energetic, calm
- User picks from a dropdown or voice card grid with preview audio clips
- Each voice has: name, gender, description, preview URL, ElevenLabs voice_id

Stored per-creator in `Creator.voiceId` field (already exists in schema).

### 2.3 Cost

~$0.01 per 100 characters. A 30-second script (~500 chars) = ~$0.05. Negligible relative to lip sync.

Credit cost: included in TALKING_HEAD cost (not separate).

### 2.4 New File: `src/lib/elevenlabs.ts`

```typescript
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const BASE_URL = "https://api.elevenlabs.io/v1";

export async function generateSpeech(text: string, voiceId: string): Promise<Buffer> { ... }
export async function getVoices(): Promise<Voice[]> { ... }
```

---

## 3. Talking Head Image

Before lip sync, generate a base image specifically for talking:
- Front-facing or slight angle
- Mouth slightly open (neutral speaking position)
- Good lighting on face
- Clean or contextual background
- Uses the creator's base reference image for face consistency

Uses existing Gemini pipeline with a specialized prompt:
```
"That exact [woman/man] from the reference image. Front-facing, slight head tilt,
mouth slightly parted as if mid-sentence, natural expression, warm lighting on face.
[setting from user input]. Shot on iPhone, candid. Visible pores, photorealistic."
```

---

## 4. Lip Sync

### 4.1 Model

Hedra Character-3 via Fal.ai: `fal-ai/hedra/character-3`

Input: image + audio → Output: video with synced lip movement, natural head motion, blinking, emotional expression.

### 4.2 Cost

~$0.10/sec. 30-second video = $3.00. This is the expensive step.

- 15s talking head = ~$1.50 lip sync + $0.05 voice + $0.02 image = ~$1.57 → 8 credits ($1.20) — subsidized for growth
- 30s talking head = ~$3.00 + $0.05 + $0.02 = ~$3.07 → 12 credits ($1.80) — tighter margin

### 4.3 Fal.ai Call

```typescript
const result = await fal.subscribe("fal-ai/hedra/character-3", {
  input: {
    image_url: talkingHeadImageUrl,
    audio_url: voiceAudioUrl,
  },
});
```

---

## 5. Server Actions

### 5.1 New File: `src/server/actions/talking-head-actions.ts`

```typescript
generateTalkingHead(
  creatorId: string,
  script: string,
  voiceId: string,
  setting?: string,    // background context
  duration?: 15 | 30
) → { success: true, jobId: string, contentId: string }
  | { success: false, error: string }

// Orchestrates: voice gen → image gen → lip sync → S3 upload

getAvailableVoices()
  → Voice[] // curated list with preview URLs
```

### 5.2 Orchestration Flow

```
1. Deduct credits (8 or 12)
2. Create GenerationJob (type: TALKING_HEAD)
3. Create Content (status: GENERATING)
4. Generate voice audio (ElevenLabs) → upload to S3 temp
5. Generate talking-head image (Gemini) → upload to S3 temp
6. Get signed URLs for both
7. Call Hedra lip sync (Fal.ai) → wait for result
8. Download result video → upload to S3
9. Update Content (COMPLETED)
10. Update GenerationJob (COMPLETED)
```

---

## 6. UI

### 6.1 Script Editor Dialog

```
src/components/workspace/talking-head-dialog.tsx
```

- Script textarea (word count, ~125 word max for 30s)
- Voice picker (grid of voice cards with play preview)
- Setting/background input (optional: "office", "kitchen", "outdoor café")
- Duration toggle: 15s / 30s
- AI script writer button: "Write me a script about [topic]" → Grok generates
- Credit cost display
- Generate button → async job + polling

### 6.2 Entry Points

- "Voice" mode chip on floating input (already stubbed)
- "Talking Head" option in Content Studio
- New dedicated button on workspace or sidebar

---

## 7. Credit Costs

Already defined:
```typescript
TALKING_HEAD: 8,  // 15s talking head
// Add: TALKING_HEAD_30S: 12  // 30s talking head
```

---

## 8. Environment Variables

```
ELEVENLABS_API_KEY=your_key
```

---

## 9. What's NOT in Scope

- Custom voice cloning per creator (future premium feature)
- Auto-captioning / subtitle burn-in (separate spec)
- Multi-language dubbing (future)
- Background music addition (future)
- Video editing / trimming (future)
