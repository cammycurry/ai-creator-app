# Video Generation — Design Spec

**Date:** 2026-04-01
**Status:** Approved
**Scope:** Video generation pipeline (image-to-video, text-to-video, motion transfer), async job system, video player, UI integration

---

## Overview

Add video generation to the platform via Kling 3.0 on Fal.ai. Three video types ship now: animate a photo (image-to-video), generate from text description (text-to-video), and motion transfer from a reference video. All use the creator's base image for face consistency. Generation is async (30-120 seconds) with polling and status UI.

Talking head (voice + lip sync) is a separate future spec.

---

## 1. Video Types

### 1.1 Image-to-Video (Animate Photo)

Take any generated photo of the creator and animate it into a 5 or 10 second video clip.

- **Input:** Source photo (Content record) + motion prompt + duration
- **Model:** `fal-ai/kling-video/v3/standard/image-to-video`
- **Aspect ratio:** Detected from source image (portrait 9:16, square 1:1, landscape 16:9)
- **Duration:** 5s or 10s (user picks)
- **Motion prompt examples:** "slow head turn and smile", "gentle hair movement in breeze", "walking forward confidently", "camera slowly pans right"
- **Cost:** 3 credits (5s), 5 credits (10s)
- **Entry point:** "Make Video" button on content detail dialog (already stubbed, currently disabled)

### 1.2 Text-to-Video

Describe a scene and generate a video of the creator in it. No starting image needed — the creator's base reference photo provides face consistency.

- **Input:** Text prompt + creator base image as reference + duration + aspect ratio
- **Model:** `fal-ai/kling-video/v3/pro/text-to-video`
- **Duration:** 5s or 10s
- **Aspect ratio:** User picks (9:16 portrait, 1:1 square, 16:9 landscape)
- **Cost:** 3 credits (5s), 5 credits (10s)
- **Entry point:** "Video" mode chip on floating input (already stubbed), Content Studio

### 1.3 Motion Transfer

Upload a reference video (dance, movement, trend) and the creator performs the same movements.

- **Input:** Reference video file + creator photo + motion prompt + duration
- **Model:** `fal-ai/kling-video/v3/pro/motion-control`
- **Duration:** 5s or 10s
- **Cost:** 5 credits
- **Entry point:** New "Motion Transfer" option in Content Studio or workspace

---

## 2. Async Generation Pipeline

Video generation takes 30-120 seconds. Cannot block the UI.

### 2.1 Flow

```
1. User triggers video generation
2. Validate credits (check before deducting)
3. Deduct credits
4. Create GenerationJob record (status: QUEUED)
5. Create Content record (type: VIDEO, status: GENERATING)
6. Call Fal.ai API → receive request_id
7. Update GenerationJob (status: PROCESSING, providerJobId: request_id)
8. Return job ID to client immediately

--- Client polls ---

9. Client polls checkVideoStatus(jobId) every 5 seconds
10. Server checks Fal.ai status via request_id
11. On completion:
    a. Download video from Fal.ai result URL
    b. Upload to S3: users/{userId}/creators/{creatorId}/content/video-{timestamp}.mp4
    c. Generate thumbnail (first frame) → upload to S3
    d. Update Content record (status: COMPLETED, url: s3Key, thumbnailUrl: thumbKey)
    e. Update GenerationJob (status: COMPLETED)
12. On failure:
    a. Refund credits
    b. Update Content (status: FAILED)
    c. Update GenerationJob (status: FAILED, error: message)
```

### 2.2 GenerationJob Usage

The `GenerationJob` model already exists in the schema with all needed fields:
- `type`: "VIDEO_I2V" | "VIDEO_T2V" | "VIDEO_MOTION"
- `status`: QUEUED → PROCESSING → COMPLETED | FAILED
- `provider`: "fal-ai"
- `providerJobId`: Fal.ai request_id for polling
- `modelId`: the Kling model ID used
- `input`: JSON with prompt, sourceContentId, duration, aspectRatio
- `output`: JSON with videoUrl, thumbnailUrl, duration
- `estimatedCost` / `actualCost`: track real API spend

### 2.3 Fal.ai API Integration

Fal.ai returns a request_id for async jobs. Poll `fal.ai/queue/status/{request_id}` for completion.

```typescript
// Submit job
const result = await fal.subscribe("fal-ai/kling-video/v3/standard/image-to-video", {
  input: { image_url, prompt, duration, aspect_ratio },
});

// Or use queue API for manual polling
const { request_id } = await fal.queue.submit("fal-ai/kling-video/v3/standard/image-to-video", {
  input: { image_url, prompt, duration, aspect_ratio },
});

// Poll status
const status = await fal.queue.status("fal-ai/kling-video/v3/standard/image-to-video", {
  requestId: request_id,
});

// Get result when done
const result = await fal.queue.result("fal-ai/kling-video/v3/standard/image-to-video", {
  requestId: request_id,
});
```

We'll use `fal.subscribe` which handles polling internally and returns when complete. Wrap in a server action that creates the job, calls fal, updates on completion.

---

## 3. Server Actions

### 3.1 New File: `src/server/actions/video-actions.ts`

Completely separate from image generation. Uses `assertAuth` pattern from other actions.

```typescript
generateVideoFromImage(
  creatorId: string,
  sourceContentId: string,
  prompt: string,
  duration: 5 | 10
) → { success: true, jobId: string, contentId: string }
  | { success: false, error: string }

generateVideoFromText(
  creatorId: string,
  prompt: string,
  duration: 5 | 10,
  aspectRatio: "9:16" | "1:1" | "16:9"
) → { success: true, jobId: string, contentId: string }
  | { success: false, error: string }

generateVideoMotionTransfer(
  creatorId: string,
  referenceVideoUrl: string,
  prompt: string,
  duration: 5 | 10
) → { success: true, jobId: string, contentId: string }
  | { success: false, error: string }

checkVideoStatus(jobId: string)
  → { status: "QUEUED" | "PROCESSING" | "COMPLETED" | "FAILED",
      progress?: number,
      videoUrl?: string,
      thumbnailUrl?: string,
      error?: string }
```

### 3.2 Fal.ai Client Setup

New utility: `src/lib/fal.ts`

```typescript
import { fal } from "@fal-ai/client";
fal.config({ credentials: process.env.FAL_KEY });
export { fal };
```

Package: `@fal-ai/client` (add via `pnpm add @fal-ai/client`)

### 3.3 Video Upload to S3

Extend `src/lib/s3.ts` with video upload support. Videos are MP4, stored at:
`users/{userId}/creators/{creatorId}/content/video-{timestamp}.mp4`

Thumbnails (first frame, extracted server-side or from Fal.ai response):
`users/{userId}/creators/{creatorId}/content/video-{timestamp}-thumb.jpg`

---

## 4. Content Model

`Content.type = VIDEO` already exists as an enum value. No schema changes needed.

Video-specific data stored in the existing `generationSettings` JSON field:
```json
{
  "videoType": "image-to-video" | "text-to-video" | "motion-transfer",
  "duration": 5 | 10,
  "aspectRatio": "9:16" | "1:1" | "16:9",
  "videoModel": "fal-ai/kling-video/v3/standard/image-to-video",
  "sourceContentId": "...",
  "motionPrompt": "...",
  "jobId": "..."
}
```

`Content.url` = S3 key to the .mp4 file
`Content.thumbnailUrl` = S3 key to first-frame thumbnail

---

## 5. Credit Costs

Update `src/types/credits.ts`:

```typescript
export const CREDIT_COSTS: CreditCost = {
  IMAGE: 1,
  IMAGE_UPSCALE: 1,
  VIDEO_5S: 3,
  VIDEO_10S: 5,
  VOICE: 2,
  TALKING_HEAD: 8,
};
```

Real API costs:
- 5s video at $0.14/sec = $0.70 → charge 3 credits ($0.45 at pack rate) — tight margin, acceptable for growth
- 10s video at $0.14/sec = $1.40 → charge 5 credits ($0.75) — subsidized, recoup on volume

---

## 6. UI Components

### 6.1 Make Video Dialog

Triggered from "Make Video" button on content detail. Simple dialog:

- Source photo thumbnail
- Motion prompt textarea: "How should they move?"
- Duration picker: 5s / 10s toggle
- Credit cost display
- Generate button
- Progress indicator while generating

File: `src/components/workspace/make-video-dialog.tsx`

### 6.2 Video Player

Inline video player for completed videos in the content grid and detail view.

- Play/pause on click
- Duration display
- Download button
- Muted by default, click to unmute
- Poster image (thumbnail)

File: `src/components/workspace/video-player.tsx`

### 6.3 Video Content Cards

In the content grid, video items show:
- Thumbnail with play icon overlay
- "Video" type badge (already exists)
- Duration badge (5s / 10s)
- Click to play in detail view

### 6.4 Generating State

While a video is generating (QUEUED/PROCESSING):
- Content card shows animated skeleton with "Generating video..." text
- Progress bar if Fal.ai returns progress percentage
- Content detail shows status + estimated time remaining

### 6.5 Floating Input Video Mode

The "Video" mode chip on the floating input (already stubbed) becomes active:
- When selected, prompt generates video instead of photo
- Duration picker appears in the toolbar
- Aspect ratio picker appears in the toolbar
- Uses text-to-video pipeline

### 6.6 Content Detail Updates

When viewing a video in content detail:
- Video player replaces the image
- "Make Video" button hidden (already a video)
- Download button downloads .mp4
- Show generation settings (duration, motion prompt)

---

## 7. Motion Transfer UI

Separate from the "Make Video" dialog since it needs a video upload.

Options for entry point:
- Button in Content Studio
- Dedicated "Motion Transfer" option accessible from workspace

Dialog flow:
1. Upload reference video (drag-drop or file picker)
2. Preview the reference video
3. Add prompt text for guidance
4. Pick duration (5s or 10s)
5. Generate → async → result

File: `src/components/workspace/motion-transfer-dialog.tsx`

---

## 8. Dependencies

### 8.1 New Package

```bash
pnpm add @fal-ai/client
```

### 8.2 Environment Variable

```
FAL_KEY=your_fal_api_key
```

Already in use for the project (Fal.ai account exists per tech stack docs).

---

## 9. What's NOT in Scope

- Talking head / lip sync (ElevenLabs + Hedra — separate spec)
- Voice generation (separate spec)
- Auto-captioning (Whisper — separate spec)
- Video URL analysis / "Recreate This" (future)
- Multi-clip stitching / editing (future)
- Video upscaling (future, Topaz via Fal.ai)
- Server-side video editing / Remotion (future)
- Motion transfer from URL (must upload file for now)
- Batch video generation (future)
