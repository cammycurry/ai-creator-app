# Infrastructure Research: Fal.ai Queue + Vercel + Metadata Service

> **Date:** 2026-04-10
> **Purpose:** Spoon-feed the implementation of async video generation + download processing
> **Sources:** Fal.ai SDK docs, Vercel docs, Context7, web search

---

## 1. Fal.ai Queue API (The Full Picture)

### How It Works

Fal.ai has a built-in queue system for async inference. Instead of `fal.subscribe()` (which blocks until done), you use `fal.queue.submit()` which returns immediately with a request ID. You then check status or get results later.

**Request lifecycle:**
```
IN_QUEUE → IN_PROGRESS → COMPLETED (or FAILED)
```

**Key guarantee:** "Requests in the queue are never dropped." Auto-retries up to 10 times for 503/504/connection errors.

### Submit

```typescript
import { fal } from "@fal-ai/client";

const submitted = await fal.queue.submit("fal-ai/kling-video/v3/standard/image-to-video", {
  input: {
    prompt: "...",
    image_url: "...",
    duration: "5",
    aspect_ratio: "9:16",
  },
  // Optional: webhook instead of polling
  webhookUrl: "https://realinfluencer.ai/api/webhooks/fal",
  priority: "normal",
});

// Returns immediately:
// submitted.request_id — unique ID to track this job
// submitted.status_url — URL to check status
// submitted.response_url — URL to get results
```

### Check Status

```typescript
const status = await fal.queue.status("fal-ai/kling-video/v3/standard/image-to-video", {
  requestId: "the-request-id",
  logs: true,
});

// status.status is one of: "IN_QUEUE" | "IN_PROGRESS" | "COMPLETED" | "FAILED"
// When IN_QUEUE: status.queue_position tells you where you are
// When COMPLETED: status.inference_time tells you how long it took
```

### Get Result

```typescript
const result = await fal.queue.result("fal-ai/kling-video/v3/standard/image-to-video", {
  requestId: "the-request-id",
});

// result.data contains the model output:
// For video: result.data.video.url or result.data.video_url
// For images: result.data.images[0].url
```

### Cancel

```typescript
await fal.queue.cancel("fal-ai/kling-video/v3/standard/image-to-video", {
  requestId: "the-request-id",
});

// IN_QUEUE: removed immediately, never processed
// IN_PROGRESS: cancellation signal sent, but may still complete
```

### Subscribe to Status (Alternative to Manual Polling)

```typescript
// This blocks until complete (like fal.subscribe but with timeout control)
const finalStatus = await fal.queue.subscribeToStatus("fal-ai/kling-video/v3/standard/image-to-video", {
  requestId: submitted.request_id,
  logs: true,
  onQueueUpdate: (update) => console.log("Status:", update.status),
  timeout: 300000, // 5 min timeout
});
```

**NOTE:** `subscribeToStatus` blocks like `fal.subscribe`. For our use case (Vercel serverless), we want `submit` + manual `status` checks, NOT `subscribeToStatus`.

### Webhooks (Production Best Practice)

Instead of polling, Fal.ai can POST results to your webhook URL when done:

```typescript
const submitted = await fal.queue.submit("fal-ai/kling-video/v3/standard/image-to-video", {
  input: { ... },
  webhookUrl: "https://realinfluencer.ai/api/webhooks/fal",
});
```

**Webhook payload (success):**
```json
{
  "request_id": "abc-123",
  "status": "OK",
  "payload": {
    "video": { "url": "https://fal.media/files/..." }
  }
}
```

**Webhook payload (error):**
```json
{
  "request_id": "abc-123",
  "status": "ERROR",
  "error": "Content policy violation",
  "payload": { ... }
}
```

**Webhook details:**
- 15 second timeout for delivery
- Retries up to 10 times over ~2 hours if delivery fails
- Includes signature headers for verification (`X-Fal-Webhook-Signature`)
- Design handlers to be idempotent (may receive duplicate notifications)

**Webhook vs Polling decision:**
- **Polling:** Simpler, no webhook endpoint needed, works now. Frontend polls our status endpoint every 5s. Our status endpoint checks Fal.ai.
- **Webhook:** More efficient, no wasted requests, Fal.ai pushes to us. But requires a webhook API route, signature verification, and handling retries/idempotency.

**Recommendation:** Start with polling (simpler, our frontend already polls). Add webhooks later for production scale.

### Important Caveats

1. **Media URLs expire.** "All media URLs in responses are publicly accessible and subject to your media expiration settings. Download files you need to keep before they expire." → We MUST download and upload to S3 when the job completes.

2. **Error fields.** Failed requests include `error` (human-readable) and `error_type` (machine-readable) on the status/result response.

3. **`fal.storage.upload()`** is needed for talking heads because Kling lip sync needs the audio/image uploaded to Fal's CDN first (S3 signed URLs may not work).

---

## 2. Vercel Serverless Constraints

### Timeout Limits

| Plan | Default | Max (configurable) |
|------|---------|-------------------|
| Hobby | 10s | 10s |
| Pro | 15s | 300s (5 min) |
| Enterprise | 15s | 900s (15 min) |

**Fluid Compute (Pro+):** Up to 800s with `waitUntil`/`after` for background tasks.

### `after()` in Next.js 16

Next.js has a built-in `after()` function (from `next/server`) that runs work AFTER the response is sent:

```typescript
import { after } from 'next/server';

export async function POST(request: Request) {
  // Do quick work, respond immediately
  after(async () => {
    // This runs AFTER the response is sent
    // Still subject to Vercel timeout limits, but doesn't block the user
    await doBackgroundWork();
  });
  return new Response(JSON.stringify({ status: 'submitted' }));
}
```

**How this helps us:** We could use `after()` in our server actions to do the `fal.queue.submit()` call after returning to the client. But honestly, `fal.queue.submit()` is already fast (< 1 second), so we don't even need `after()` for the submit step. We might use it for the completion step (downloading video + uploading to S3) to avoid blocking the status check response.

### `waitUntil()` from `@vercel/functions`

For non-Next.js contexts or middleware:

```typescript
import { waitUntil } from '@vercel/functions';

export default function handler(req, res) {
  waitUntil(doBackgroundWork());
  res.json({ status: 'ok' });
}
```

### What This Means for Us

**`fal.queue.submit()`** — fast, no background processing needed. Just await it normally in the server action.

**`fal.queue.status()` + completion** — when status check detects COMPLETED, we need to download video (5-10s) + upload to S3 (2-5s). This could use `after()` to not block the status response:

```typescript
export async function checkVideoStatus(jobId: string) {
  const job = await db.generationJob.findUnique({ where: { id: jobId } });

  if (job.falRequestId && job.status !== "COMPLETED") {
    const falStatus = await fal.queue.status(job.falModel, {
      requestId: job.falRequestId,
    });

    if (falStatus.status === "COMPLETED") {
      // Use after() to download + upload in background
      // Return COMPLETED immediately, video URL will be available on next poll
      after(async () => {
        await completeVideoJob(job);
      });
      return { status: "COMPLETING" }; // New status: we know it's done, processing the download
    }
  }
}
```

OR just do it synchronously — downloading a 5s video and uploading to S3 takes ~10 seconds, well within Vercel's 300s limit. Simpler, more reliable.

**Recommendation:** Keep it synchronous. `submit` is fast. `status` + completion is fast enough. Don't over-engineer with `after()` unless we hit actual timeouts.

### Setting maxDuration

In Next.js route config:

```typescript
export const maxDuration = 60; // seconds
```

Or in `next.config.ts`:
```typescript
const nextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
};
```

We may want to set `maxDuration = 60` on the video generation and status check routes to be safe.

---

## 3. Metadata Service Deployment (Railway)

### What We Already Have

The metadata-service at `/Users/camcurry/projects/metadata-service` is a complete FastAPI app with:

**Endpoints:**
- `POST /process/image` — strip metadata, re-encode, inject iPhone EXIF
- `POST /process/video` — strip metadata, add noise/grain, inject device EXIF
- `POST /strip` — strip metadata only (no re-encoding)
- `POST /inspect` — inspect file metadata
- `POST /video/extract-frame` — extract frame at timestamp
- `POST /video/concat` — concatenate multiple videos
- `POST /video/add-subtitles` — burn subtitles into video
- `POST /video/merge` — side-by-side/grid merge
- `GET /health` — check exiftool + ffmpeg availability
- `GET /devices` — list available device profiles

**Device profiles:** iPhone 15 Pro, iPhone 14 Pro, etc. Each includes make, model, lens data, software versions. The service generates realistic timestamps, GPS coordinates (optional), and all the EXIF fields a real iPhone photo would have.

**Dockerfile already includes:** Python 3, exiftool, ffmpeg, Pillow, FastAPI, uvicorn.

### Deploying to Railway

Railway auto-detects the Dockerfile. Steps:

1. Push metadata-service to GitHub (if not already)
2. Create new Railway project
3. Connect GitHub repo
4. Railway builds from Dockerfile automatically
5. Set env vars:
   - `API_KEY` = a secure bearer token
   - `ALLOWED_ORIGINS` = `https://realinfluencer.ai,http://localhost:3000`
6. Railway assigns a public URL (e.g., `https://metadata-service-xxx.up.railway.app`)

**Cost:** ~$5-10/mo on Railway (pay per usage, the service only runs when processing requests).

**The `railway.json` already exists:**
```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": { "dockerfilePath": "Dockerfile" },
  "deploy": { "startCommand": "uvicorn app.main:app --host 0.0.0.0 --port $PORT" }
}
```

### Calling From the App

```typescript
// src/lib/metadata-service.ts

const METADATA_URL = process.env.METADATA_SERVICE_URL!;
const METADATA_KEY = process.env.METADATA_SERVICE_API_KEY!;

export async function processImageForDownload(
  imageBuffer: Buffer,
  device: string = "iphone_15_pro",
  gpsCity?: string,
): Promise<Buffer> {
  const form = new FormData();
  form.append("file", new Blob([imageBuffer], { type: "image/jpeg" }), "image.jpg");
  form.append("device", device);
  if (gpsCity) form.append("gps_city", gpsCity);

  const res = await fetch(`${METADATA_URL}/process/image`, {
    method: "POST",
    headers: { Authorization: `Bearer ${METADATA_KEY}` },
    body: form,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Metadata service error ${res.status}: ${text}`);
  }

  return Buffer.from(await res.arrayBuffer());
}

export async function processVideoForDownload(
  videoBuffer: Buffer,
  device: string = "iphone_15_pro",
  gpsCity?: string,
  addNoise: boolean = true,
  noiseStrength: number = 3,
): Promise<Buffer> {
  const form = new FormData();
  form.append("file", new Blob([videoBuffer], { type: "video/mp4" }), "video.mp4");
  form.append("device", device);
  if (gpsCity) form.append("gps_city", gpsCity);
  form.append("add_noise", String(addNoise));
  form.append("noise_strength", String(noiseStrength));

  const res = await fetch(`${METADATA_URL}/process/video`, {
    method: "POST",
    headers: { Authorization: `Bearer ${METADATA_KEY}` },
    body: form,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Metadata service error ${res.status}: ${text}`);
  }

  return Buffer.from(await res.arrayBuffer());
}

export async function extractVideoFrame(
  videoUrl: string,
  timestamp?: number,
): Promise<Buffer> {
  const res = await fetch(`${METADATA_URL}/video/extract-frame`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${METADATA_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ video_url: videoUrl, timestamp }),
  });

  if (!res.ok) throw new Error(`Frame extraction failed: ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}
```

---

## 4. Implementation Cheat Sheet

### Step 1: Schema Migration

```prisma
model GenerationJob {
  // Add these two fields:
  falRequestId  String?
  falModel      String?
}
```

```bash
pnpx prisma migrate dev --name add-fal-queue-fields
```

### Step 2: Replace Fire-and-Forget in video-actions.ts

**Before (broken):**
```typescript
processVideoJob(job.id, content.id, user.id, creatorId, {
  model: "fal-ai/kling-video/v3/standard/image-to-video",
  input: { ... },
});
return { success: true, jobId: job.id, contentId: content.id };
```

**After (correct):**
```typescript
const falModel = "fal-ai/kling-video/v3/standard/image-to-video";
const submitted = await fal.queue.submit(falModel, {
  input: { ... },
});

await db.generationJob.update({
  where: { id: job.id },
  data: {
    falRequestId: submitted.request_id,
    falModel,
    status: "PROCESSING",
    startedAt: new Date(),
  },
});

return { success: true, jobId: job.id, contentId: content.id };
```

### Step 3: Rewrite checkVideoStatus

```typescript
export async function checkVideoStatus(jobId: string): Promise<StatusResult> {
  const job = await db.generationJob.findUnique({ where: { id: jobId } });
  if (!job) return { status: "FAILED", error: "Job not found" };

  // Already done
  if (job.status === "COMPLETED") {
    const content = await db.content.findFirst({ where: { generationJobId: job.id } });
    return { status: "COMPLETED", videoUrl: content?.url, thumbnailUrl: content?.thumbnailUrl };
  }

  // Already failed
  if (job.status === "FAILED") {
    return { status: "FAILED", error: job.error ?? "Generation failed" };
  }

  // Timeout check (10 min)
  if (job.startedAt) {
    const elapsed = Date.now() - new Date(job.startedAt).getTime();
    if (elapsed > 10 * 60 * 1000) {
      await db.generationJob.update({ where: { id: job.id }, data: { status: "FAILED", error: "Timed out" } });
      // Refund credits...
      return { status: "FAILED", error: "Generation timed out. Credits refunded." };
    }
  }

  // Check Fal.ai queue
  if (job.falRequestId && job.falModel) {
    try {
      const falStatus = await fal.queue.status(job.falModel, {
        requestId: job.falRequestId,
      });

      if (falStatus.status === "COMPLETED") {
        // Get the result
        const result = await fal.queue.result(job.falModel, {
          requestId: job.falRequestId,
        });

        const output = result.data as { video?: { url?: string }; video_url?: string };
        const videoUrl = output?.video?.url ?? output?.video_url;

        if (!videoUrl) {
          await failJob(job, "No video URL in response");
          return { status: "FAILED", error: "Generation produced no output" };
        }

        // Download from Fal.ai, upload to S3
        const { videoKey } = await uploadVideoToS3(videoUrl, job.userId, ...);

        // Extract thumbnail
        let thumbKey = null;
        try {
          const thumbBuffer = await extractFirstFrame(videoUrl);
          if (thumbBuffer) {
            thumbKey = `users/${job.userId}/content/thumb-${Date.now()}.jpg`;
            await uploadImage(thumbBuffer, thumbKey, "image/jpeg");
          }
        } catch { /* fallback to no thumbnail */ }

        // Update DB
        await db.content.update({
          where: { id: job.contentId },
          data: { status: "COMPLETED", url: videoKey, thumbnailUrl: thumbKey },
        });
        await db.generationJob.update({
          where: { id: job.id },
          data: { status: "COMPLETED", completedAt: new Date() },
        });

        return { status: "COMPLETED", videoUrl: videoKey, thumbnailUrl: thumbKey };
      }

      if (falStatus.status === "FAILED") {
        await failJob(job, falStatus.error ?? "Provider error");
        return { status: "FAILED", error: "Generation failed" };
      }

      // Still in queue or processing
      return { status: "PROCESSING" };

    } catch (err) {
      console.error(`[Video] Status check failed for ${job.id}:`, err);
      return { status: "PROCESSING" }; // Don't fail on transient status check errors
    }
  }

  return { status: job.status as StatusResult["status"] };
}
```

### Step 4: Same Pattern for Talking Heads

The talking head has 3 steps: TTS → Image → Lip Sync. Steps 1-2 are fast (< 15s). Only step 3 (lip sync) needs queue mode.

```typescript
// Steps 1-2: synchronous (fast)
const audioBuffer = await generateTTS(script, voiceId);
const imageBuffer = await generateBaseImage(creator, setting);

// Upload to Fal storage
const falImageUrl = await fal.storage.upload(new Blob([imageBuffer]));
const falAudioUrl = await fal.storage.upload(new Blob([audioBuffer]));

// Step 3: submit to queue (instead of fal.subscribe)
const falModel = "fal-ai/kling-video/lipsync/audio-to-video";
const submitted = await fal.queue.submit(falModel, {
  input: { video_url: falImageUrl, audio_url: falAudioUrl, ... },
});

await db.generationJob.update({
  where: { id: job.id },
  data: { falRequestId: submitted.request_id, falModel, status: "PROCESSING" },
});
```

Status checking works the same — `checkVideoStatus()` handles both video and talking head jobs.

### Step 5: Deploy Metadata Service

```bash
cd /Users/camcurry/projects/metadata-service
# Push to GitHub if needed
railway up
# Set env vars in Railway dashboard:
# API_KEY=your-secure-key
# ALLOWED_ORIGINS=https://realinfluencer.ai,http://localhost:3000
```

### Step 6: Wire Download to Metadata Service

Add to `.env.local`:
```
METADATA_SERVICE_URL=https://metadata-service-xxx.up.railway.app
METADATA_SERVICE_API_KEY=your-secure-key
```

Update download actions to route through metadata service for the final export.

### Step 7: Delete Dead Code

- Delete `processVideoJob()` function
- Delete `processTalkingHead()` fire-and-forget call (replace with queue submit)
- Clean up any `fal.subscribe()` usage

---

## 5. Gotchas and Edge Cases

1. **Fal.ai media URLs expire.** When a job completes, download the video URL immediately and upload to S3. Don't store the Fal.ai URL.

2. **Status check does the completion work.** This means the first poll after Fal.ai completes will be slightly slower (downloading + uploading). Subsequent polls return instantly from DB. User sees a brief delay once, then it's done.

3. **Idempotent completion.** If two status polls hit at the same time and both see COMPLETED, they'd both try to complete. Add a check: if DB already shows COMPLETED, skip. Or use a database transaction/flag.

4. **Fal.ai retries.** They retry up to 10 times automatically. We don't need our own retry logic for generation. But we should handle the case where all retries fail.

5. **Talking head TTS/image can fail.** These happen synchronously before the queue submit. If they fail, we should return an error immediately (before touching the queue). Credits should be refunded.

6. **Metadata service down.** Fallback: use Sharp for images (current behavior), serve raw video. The download should still work, just without the full processing.

7. **Large videos.** 10s Kling videos can be 20-50MB. Downloading + uploading through Vercel is fine (300s limit, plenty of bandwidth). But metadata service processing could take 30-60s for video re-encoding. Make sure Railway has enough memory.

---

## 6. Critical Corrections From Compass Research

The compass research doc (`docs/research/compass_artifact_wf-b5c850ce-...`) found several things our initial spec got wrong or missed:

### Fal.ai has NO explicit FAILED status
Status API returns only `IN_QUEUE`, `IN_PROGRESS`, `COMPLETED`. Failures arrive as `COMPLETED` with `error` and `error_type` fields present. Our status check needs to handle this:

```typescript
if (falStatus.status === "COMPLETED") {
  // Check for error FIRST — completed doesn't mean success
  const result = await fal.queue.result(model, { requestId });
  if (result.data?.error || result.data?.error_type) {
    await failJob(job, result.data.error ?? "Provider error");
    return { status: "FAILED", error: result.data.error };
  }
  // Actually successful — download video
  await completeVideoJob(job, result.data);
}
```

### Vercel 4.5 MB body limit is for HTTP router only
Internal `fetch()` calls (downloading from Fal CDN, uploading to S3) bypass this limit. A 50 MB video download + S3 upload works fine inside a Vercel function. This means our polling approach (status check downloads + uploads on completion) DOES work on Vercel. We don't strictly need Railway for the completion step.

However, Railway is still better for webhooks (always-on, no cold start, no timeout pressure) and the metadata-service (ffmpeg).

### Fluid Compute changes the timeout picture
With Fluid Compute (default for new projects since April 2025):
- Hobby: **300s** (was 60s)
- Pro: **800s** (was 300s)

This means even the hobby plan has enough timeout for our video completion work.

### Webhook is the production-correct pattern
The compass doc strongly recommends webhooks over polling for production: "fal.ai's 10-retry, 2-hour delivery guarantee makes webhooks far more robust than holding serverless functions open."

**Updated recommendation:** Start with polling (our spec) since it's simpler and works. When we move to production scale, add a webhook endpoint on the metadata-service (Railway) to handle completions there. The metadata-service is already always-on, no cold starts, no timeouts.

### Idempotent completion with atomic DB claim
Use `UPDATE ... WHERE status = 'submitted'` pattern to prevent duplicate processing if webhook fires while a status poll is also checking. If 0 rows affected, another process already claimed it.

### TTS and image gen can run in parallel for talking heads
Steps 1 (TTS) and 2 (image gen) in the talking head pipeline are independent. Run them with `Promise.all()` to cut latency nearly in half.

### Railway costs
~$3.28/month for a lightweight FastAPI service using ~128MB RAM, well within the $5/month Hobby plan. Essentially free.

### Full recommended architecture for production
```
Next.js (Vercel) → fal.queue.submit() → fal.ai processes → webhook → FastAPI (Railway)
                                                                          ↓
                                                              download video from fal CDN
                                                              process with ffmpeg/exiftool
                                                              upload to S3
                                                              update DB
                                                                          ↓
                                          Next.js polls status ← DB shows COMPLETED
```

But for MVP, keeping it all on Vercel with polling works fine.

---

## Sources

- [Fal.ai Queue API docs](https://fal.ai/docs/documentation/model-apis/inference/queue)
- [Fal.ai Webhook docs](https://fal.ai/docs/documentation/model-apis/inference/webhooks)
- [Fal.ai JS SDK queue types](https://github.com/fal-ai/fal-js) (Context7)
- [Vercel Fluid Compute docs](https://vercel.com/docs/fluid-compute) (Context7)
- [Vercel Function Timeout KB](https://vercel.com/kb/guide/what-can-i-do-about-vercel-serverless-functions-timing-out)
- [Next.js `after()` API](https://github.com/vercel/next.js/blob/canary/docs/01-app/03-api-reference/04-functions/after.mdx) (Context7)
- [Railway FastAPI deployment guide](https://docs.railway.com/guides/fastapi)
- [Vercel fire-and-forget discussion](https://github.com/orgs/vercel/discussions/3500)
