# Infrastructure Upgrade: Fal.ai Queue Mode + Metadata Service

> **Date:** 2026-04-09
> **Status:** Ready for implementation

---

## Problem

Two infrastructure issues block reliable video/talking-head generation:

1. **Fire-and-forget breaks on Vercel.** `processVideoJob()` and `processTalkingHead()` are called without `await`. They use `fal.subscribe()` which blocks for 30-300 seconds. Vercel may kill the background work when the server action returns. If the server restarts mid-generation, jobs get stuck at GENERATING forever.

2. **No video post-processing.** Images get Sharp metadata stripping on download. Videos are served raw from S3 with AI fingerprints intact. The FFmpeg pipeline for video naturalization (grain, color grade, metadata strip) has no server to run on.

## Solution

### Part 1: Fal.ai Queue Mode

Replace `fal.subscribe()` (blocking, long-running) with `fal.queue.submit()` (instant return) + `fal.queue.status()` (check on demand).

**Current flow (broken):**
```
Server Action → create DB records → processVideoJob() fire-and-forget
                                      ↓
                                    fal.subscribe() blocks 30-300s
                                      ↓ (Vercel may kill this)
                                    upload to S3 → update DB
```

**New flow:**
```
Server Action → create DB records → fal.queue.submit() → save requestId → return immediately
                                                                            ↓
Client polls checkVideoStatus() every 5s
  ↓
checkVideoStatus() reads DB → if falRequestId exists and status != COMPLETED:
  ↓
  fal.queue.status(requestId) → check if Fal.ai is done
  ↓
  If COMPLETED: download video → upload to S3 → update DB → return COMPLETED
  If IN_QUEUE/IN_PROGRESS: return current status + position
  If FAILED: update DB → refund credits → return FAILED
```

**Key change:** No long-running server functions. The "completion" logic runs inside the status check endpoint, which is a quick server action (download + upload takes ~5-10s, well within Vercel limits).

### Part 2: Metadata Service Integration

Deploy the existing `metadata-service` (FastAPI + Docker) to Railway. Wire the download flow to call it for both images and videos.

**metadata-service already handles:**
- Image: strip ALL metadata, re-encode, inject iPhone EXIF with device profiles
- Video: strip metadata, add film grain/noise, inject device EXIF, re-encode
- Video utilities: extract frame, concat, subtitles, merge

**Current image processing:** Uses Sharp in `src/lib/ai/metadata-strip.ts`. This works but the metadata-service is more thorough (uses exiftool which catches more metadata than Sharp).

**Plan:** Keep Sharp for quick inline processing (wizard generations). Use metadata-service for download exports (user-facing output that needs to be undetectable).

---

## Part 1 Design: Fal.ai Queue Mode

### Schema Change

Add `falRequestId` and `falModel` to GenerationJob:

```prisma
model GenerationJob {
  // Existing fields...
  falRequestId  String?   // Fal.ai queue request ID for async jobs
  falModel      String?   // Fal.ai model endpoint (for status checks)
}
```

### Server Action Changes

#### video-actions.ts

**`generateVideoFromImage()`, `generateVideoFromText()`, `generateVideoMotionTransfer()`**

Replace:
```typescript
processVideoJob(job.id, content.id, user.id, creatorId, {
  model: "fal-ai/kling-video/v3/standard/image-to-video",
  input: { ... },
});
// Returns immediately, processVideoJob runs in background (broken on Vercel)
```

With:
```typescript
const queued = await fal.queue.submit("fal-ai/kling-video/v3/standard/image-to-video", {
  input: { ... },
});

await db.generationJob.update({
  where: { id: job.id },
  data: {
    falRequestId: queued.request_id,
    falModel: "fal-ai/kling-video/v3/standard/image-to-video",
    status: "PROCESSING",
    startedAt: new Date(),
  },
});
// Returns immediately. Fal.ai processes in their cloud. No background work on our side.
```

**`checkVideoStatus()`**

Currently just reads DB. Now it also checks Fal.ai and completes the job if ready:

```typescript
export async function checkVideoStatus(jobId: string): Promise<StatusResult> {
  const job = await db.generationJob.findUnique({ where: { id: jobId } });
  if (!job) return { status: "FAILED", error: "Job not found" };

  // Already done or failed? Return from DB.
  if (job.status === "COMPLETED" || job.status === "FAILED") {
    // ... return existing result
  }

  // Has a Fal request? Check its status.
  if (job.falRequestId && job.falModel) {
    const falStatus = await fal.queue.status(job.falModel, {
      requestId: job.falRequestId,
    });

    if (falStatus.status === "COMPLETED") {
      // Fal.ai is done. Download video, upload to S3, update DB.
      await completeVideoJob(job);
      return { status: "COMPLETED", videoUrl: "..." };
    }

    if (falStatus.status === "FAILED") {
      await failVideoJob(job, "Generation failed on provider");
      return { status: "FAILED", error: "Generation failed" };
    }

    // Still processing
    return {
      status: "PROCESSING",
      progress: falStatus.queue_position ? undefined : 50,
    };
  }

  return { status: job.status as StatusResult["status"] };
}
```

**New `completeVideoJob()` helper:**

```typescript
async function completeVideoJob(job: GenerationJob) {
  // Get the result from Fal.ai
  const result = await fal.queue.result(job.falModel!, {
    requestId: job.falRequestId!,
  });

  const output = result.data as { video?: { url?: string }; video_url?: string };
  const videoUrl = output?.video?.url ?? output?.video_url;

  if (!videoUrl) throw new Error("No video URL in result");

  // Upload to S3
  const { videoKey } = await uploadVideoToS3(videoUrl, job.userId, ...);

  // Extract thumbnail
  let thumbKey = ...;
  // (same thumbnail logic as current processVideoJob)

  // Update DB
  await db.content.update({ where: { id: job.contentId }, data: { status: "COMPLETED", url: videoKey, thumbnailUrl: thumbKey } });
  await db.generationJob.update({ where: { id: job.id }, data: { status: "COMPLETED", completedAt: new Date() } });
}
```

**Delete `processVideoJob()`** — no longer needed.

#### talking-head-actions.ts

Same pattern but the talking head has a multi-step pipeline (TTS → image → lip sync). The first two steps (ElevenLabs TTS + Gemini image) are fast (5-15s total). Only the lip sync step (`fal.subscribe`) is long.

**Change:** Keep TTS and image gen synchronous (they're fast). Only the lip sync step switches to queue mode.

```typescript
// Steps 1-2 are fast, keep synchronous
const audioBuffer = await generateTTS(script, voiceId);
const imageBuffer = await generateBaseImage(creator, setting);

// Upload to Fal storage (fast)
const falImageUrl = await fal.storage.upload(...);
const falAudioUrl = await fal.storage.upload(...);

// Step 3: Submit lip sync to queue (instead of fal.subscribe)
const queued = await fal.queue.submit("fal-ai/kling-video/lipsync/audio-to-video", {
  input: { video_url: falImageUrl, audio_url: falAudioUrl, ... },
});

await db.generationJob.update({
  where: { id: job.id },
  data: { falRequestId: queued.request_id, falModel: "fal-ai/kling-video/lipsync/audio-to-video" },
});
```

The status check works the same way as video — `checkVideoStatus()` handles both.

### Frontend Changes

**Polling already exists.** The frontend polls `checkVideoStatus()` every 5 seconds. No frontend changes needed. The status endpoint now does the completion work on-demand.

### Timeout Handling

Add a timeout check in `checkVideoStatus()`:

```typescript
// If job has been PROCESSING for > 10 minutes, mark as failed
const startedAt = job.startedAt ? new Date(job.startedAt).getTime() : 0;
const elapsed = Date.now() - startedAt;
if (elapsed > 10 * 60 * 1000 && job.status === "PROCESSING") {
  await failVideoJob(job, "Generation timed out");
  return { status: "FAILED", error: "Generation timed out. Credits refunded." };
}
```

### Orphan Recovery

Jobs that get stuck (Vercel restart, network issue, etc.) are automatically recovered because:
- The DB has the `falRequestId`
- Next time `checkVideoStatus()` is called (user refreshes, polls), it checks Fal.ai
- If Fal.ai completed the job, we pick up the result
- If Fal.ai failed, we mark it failed and refund

No cron job needed. Recovery happens on-demand when the user (or frontend) asks.

---

## Part 2 Design: Metadata Service Integration

### Deploy to Railway

The metadata-service at `/Users/camcurry/projects/metadata-service` already has:
- `Dockerfile` with exiftool + ffmpeg
- `railway.json` config
- FastAPI endpoints for image + video processing

Deploy to Railway. Add env vars:
- `API_KEY` — bearer token for auth
- `ALLOWED_ORIGINS` — `https://realinfluencer.ai`

Expected cost: ~$5-10/mo on Railway (only runs when processing downloads).

### Integration Points

#### Environment Variables

```
METADATA_SERVICE_URL=https://metadata-service-xxx.up.railway.app
METADATA_SERVICE_API_KEY=your-api-key
```

#### New Client: `src/lib/metadata-service.ts`

```typescript
const METADATA_URL = process.env.METADATA_SERVICE_URL;
const METADATA_KEY = process.env.METADATA_SERVICE_API_KEY;

export async function processImageDownload(
  imageBuffer: Buffer,
  options: { device?: string; gpsCity?: string }
): Promise<Buffer> {
  const form = new FormData();
  form.append("file", new Blob([imageBuffer]), "image.jpg");
  form.append("device", options.device || "iphone_15_pro");
  if (options.gpsCity) form.append("gps_city", options.gpsCity);

  const res = await fetch(`${METADATA_URL}/process/image`, {
    method: "POST",
    headers: { Authorization: `Bearer ${METADATA_KEY}` },
    body: form,
  });

  if (!res.ok) throw new Error(`Metadata service error: ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

export async function processVideoDownload(
  videoBuffer: Buffer,
  options: { device?: string; gpsCity?: string; addNoise?: boolean; noiseStrength?: number }
): Promise<Buffer> {
  const form = new FormData();
  form.append("file", new Blob([videoBuffer]), "video.mp4");
  form.append("device", options.device || "iphone_15_pro");
  if (options.gpsCity) form.append("gps_city", options.gpsCity);
  form.append("add_noise", String(options.addNoise ?? true));
  form.append("noise_strength", String(options.noiseStrength ?? 3));

  const res = await fetch(`${METADATA_URL}/process/video`, {
    method: "POST",
    headers: { Authorization: `Bearer ${METADATA_KEY}` },
    body: form,
  });

  if (!res.ok) throw new Error(`Metadata service error: ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}
```

#### Download Action Changes

`src/server/actions/download-actions.ts` or wherever downloads are handled:

- Image downloads: fetch from S3 → `processImageDownload()` → return to client
- Video downloads: fetch from S3 → `processVideoDownload()` → return to client
- Fallback: if metadata-service is down, use Sharp for images (current behavior), serve raw video

#### Keep Sharp for Inline Processing

The current Sharp-based stripping in `src/lib/ai/metadata-strip.ts` stays for:
- Wizard image generation (strip before saving to S3)
- Content generation (strip before saving to S3)

These are "good enough" for storage. The metadata-service is for the final download export that needs to be undetectable.

---

## Files to Change

### Part 1 (Fal.ai Queue)
| File | Change |
|------|--------|
| `prisma/schema.prisma` | Add `falRequestId` and `falModel` to GenerationJob |
| `src/server/actions/video-actions.ts` | Replace fire-and-forget with queue.submit, rewrite checkVideoStatus, delete processVideoJob |
| `src/server/actions/talking-head-actions.ts` | Replace lip sync fal.subscribe with queue.submit, rewrite status check |

### Part 2 (Metadata Service)
| File | Change |
|------|--------|
| `src/lib/metadata-service.ts` | New client for metadata service API |
| `src/server/actions/download-actions.ts` | Route downloads through metadata service |
| `.env.local` | Add METADATA_SERVICE_URL + METADATA_SERVICE_API_KEY |

### Separate Repo (metadata-service)
| Action | What |
|--------|------|
| Deploy to Railway | Use existing Dockerfile + railway.json |
| Set env vars | API_KEY, ALLOWED_ORIGINS |

---

## Migration

- New `falRequestId` field is nullable. Existing jobs unaffected.
- No data migration needed.
- Deploy metadata-service to Railway before integrating download flow.
- Part 1 and Part 2 are independent. Can ship separately.

---

## Out of Scope

- Job queue system (BullMQ/Redis) — not needed with Fal.ai queue mode
- FFmpeg on Vercel — handled by metadata-service on Railway
- Batch operations — future, can use same queue pattern
- Video concat/subtitles — metadata-service already supports these, wire up when needed for multi-scene director
