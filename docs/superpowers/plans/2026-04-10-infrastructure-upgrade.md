# Infrastructure Upgrade Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace fire-and-forget video generation with Fal.ai queue mode (reliable on Vercel), and integrate the metadata-service on Railway for video/image download post-processing.

**Architecture:** Two independent parts. Part 1: Switch `fal.subscribe()` to `fal.queue.submit()` + status-check-driven completion in `video-actions.ts` and `talking-head-actions.ts`. Part 2: Create a client for the existing metadata-service (FastAPI on Railway) and route downloads through it for thorough metadata stripping + video naturalization.

**Tech Stack:** Next.js 16, Prisma, `@fal-ai/client` queue API, FastAPI metadata-service on Railway, AWS S3

**Research docs to reference:**
- `docs/research/INFRASTRUCTURE-RESEARCH.md` — Fal.ai queue API cheat sheet, Vercel constraints, metadata service client code
- `docs/research/compass_artifact_wf-b5c850ce-...` — three-service architecture, webhook patterns, idempotency, Fal.ai gotchas (NO explicit FAILED status)
- `docs/superpowers/specs/2026-04-09-infrastructure-upgrade-design.md` — the spec

**CRITICAL Fal.ai gotcha:** Fal.ai has NO explicit `FAILED` status. Failed requests arrive as `COMPLETED` with `error` and `error_type` fields present. Always check for errors on COMPLETED status before treating it as success.

---

## File Structure

### Part 1: Fal.ai Queue Mode

| File | Action | Responsibility |
|------|--------|---------------|
| `prisma/schema.prisma` | Modify | Add `falRequestId` and `falModel` fields to GenerationJob |
| `src/server/actions/video-actions.ts` | Modify | Replace 3x fire-and-forget with queue.submit, rewrite checkVideoStatus with completion logic, delete processVideoJob |
| `src/server/actions/talking-head-actions.ts` | Modify | Parallel TTS+image, queue.submit for lip sync, delete processTalkingHead |

### Part 2: Metadata Service Integration

| File | Action | Responsibility |
|------|--------|---------------|
| `src/lib/metadata-service.ts` | Create | HTTP client for Railway metadata-service API |
| `src/server/actions/download-actions.ts` | Modify | Route image+video downloads through metadata-service with fallback |
| `.env.local` | Modify | Add METADATA_SERVICE_URL and METADATA_SERVICE_API_KEY |

---

### Task 1: Schema Migration — Add Fal Queue Fields

**Files:**
- Modify: `prisma/schema.prisma:203-233`

- [ ] **Step 1: Add falRequestId and falModel to GenerationJob model**

In `prisma/schema.prisma`, find the `GenerationJob` model (line 203) and add two fields after `providerJobId`:

```prisma
model GenerationJob {
  id        String @id @default(cuid())
  userId    String
  contentId String?

  type   String
  status JobStatus @default(QUEUED)

  // Provider tracking
  provider      String
  providerJobId String?
  modelId       String

  // Fal.ai queue tracking
  falRequestId  String?   // Fal.ai queue request ID for async jobs
  falModel      String?   // Fal.ai model endpoint (needed for status/result calls)

  // Input/output
  input  Json
  output Json?

  // Cost tracking
  estimatedCost Float?
  actualCost    Float?

  // Timing
  startedAt   DateTime?
  completedAt DateTime?
  error       String?

  createdAt DateTime @default(now())

  @@index([userId, status])
  @@index([providerJobId])
  @@index([falRequestId])
}
```

Note the new `@@index([falRequestId])` for fast lookups.

- [ ] **Step 2: Run the migration**

```bash
pnpx prisma migrate dev --name add-fal-queue-fields
```

Expected: Migration succeeds, new columns added. Existing data unaffected (fields are nullable).

- [ ] **Step 3: Verify schema**

```bash
pnpx prisma generate
```

Expected: Prisma client regenerated with new fields.

- [ ] **Step 4: Build check**

```bash
pnpm build 2>&1 | tail -5
```

Expected: Build passes (new fields are optional, no code changes yet).

- [ ] **Step 5: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat: add falRequestId and falModel to GenerationJob for queue mode"
```

---

### Task 2: Rewrite video-actions.ts — Queue Submit + Status Completion

**Files:**
- Modify: `src/server/actions/video-actions.ts`

This is the biggest task. We replace the fire-and-forget pattern in all 3 generation functions and rewrite `checkVideoStatus` to do completion work.

- [ ] **Step 1: Replace processVideoJob call in generateVideoFromImage (lines 252-270)**

Find the `processVideoJob(...)` call at line 252 and replace the entire block from line 252 to line 270 with:

```typescript
  // Submit to Fal.ai queue (returns immediately)
  const falModel = i2vModel;
  const falInput = isPremium
    ? {
        image_url: imageUrl,
        prompt: finalPrompt,
        duration: String(duration),
        aspect_ratio: aspectRatio,
      }
    : {
        start_image_url: imageUrl,
        prompt: finalPrompt,
        duration: String(duration),
        aspect_ratio: aspectRatio,
        cfg_scale: 0.5,
        ...(allElements.length > 0 && { elements: allElements }),
      };

  try {
    const submitted = await fal.queue.submit(falModel, { input: falInput });

    await db.generationJob.update({
      where: { id: job.id },
      data: {
        falRequestId: submitted.request_id,
        falModel,
        status: "PROCESSING",
        startedAt: new Date(),
      },
    });
  } catch (submitError) {
    console.error(`[Video] Queue submit failed for job ${job.id}:`, submitError);
    await refundCredits(user.id, creditCost, "Video refund: failed to submit");
    await db.content.update({ where: { id: content.id }, data: { status: "FAILED" } });
    await db.generationJob.update({
      where: { id: job.id },
      data: { status: "FAILED", error: submitError instanceof Error ? submitError.message : "Submit failed" },
    });
    return { success: false, error: "Failed to start video generation" };
  }
```

- [ ] **Step 2: Replace processVideoJob call in generateVideoFromText (lines 349-378)**

Find the `if (isPremium) { processVideoJob(...) } else { processVideoJob(...) }` block at lines 349-378 and replace with:

```typescript
  // Build the Fal.ai input based on quality tier
  let falInput: Record<string, unknown>;

  if (isPremium) {
    falInput = {
      prompt: fullPrompt + refSuffix,
      duration: String(duration),
      aspect_ratio: aspectRatio,
    };
  } else {
    const creatorElement = {
      frontal_image_url: baseImageUrl,
      reference_image_urls: [baseImageUrl],
    };
    const refElements = refAttachments?.length ? await refsToElements(refAttachments, 3) : [];
    const allElements = [creatorElement, ...refElements].slice(0, 4);

    falInput = {
      prompt: fullPrompt + refSuffix,
      duration: String(duration),
      aspect_ratio: aspectRatio,
      generate_audio: false,
      elements: allElements,
    };
  }

  try {
    const submitted = await fal.queue.submit(modelId, { input: falInput });

    await db.generationJob.update({
      where: { id: job.id },
      data: {
        falRequestId: submitted.request_id,
        falModel: modelId,
        status: "PROCESSING",
        startedAt: new Date(),
      },
    });
  } catch (submitError) {
    console.error(`[Video] Queue submit failed for job ${job.id}:`, submitError);
    await refundCredits(user.id, creditCost, "Video refund: failed to submit");
    await db.content.update({ where: { id: content.id }, data: { status: "FAILED" } });
    await db.generationJob.update({
      where: { id: job.id },
      data: { status: "FAILED", error: submitError instanceof Error ? submitError.message : "Submit failed" },
    });
    return { success: false, error: "Failed to start video generation" };
  }
```

- [ ] **Step 3: Replace processVideoJob call in generateVideoMotionTransfer (lines 445-456)**

Find the `processVideoJob(...)` call at line 445 and replace through line 456 with:

```typescript
  const falModel = "fal-ai/kling-video/v3/pro/motion-control";
  const falInput = {
    video_url: referenceVideoUrl,
    image_url: baseImageUrl,
    prompt: `@Element1. ${enhanced}`,
    character_orientation: "video",
    elements: [
      { frontal_image_url: baseImageUrl },
    ],
  };

  try {
    const submitted = await fal.queue.submit(falModel, { input: falInput });

    await db.generationJob.update({
      where: { id: job.id },
      data: {
        falRequestId: submitted.request_id,
        falModel,
        status: "PROCESSING",
        startedAt: new Date(),
      },
    });
  } catch (submitError) {
    console.error(`[Video] Queue submit failed for job ${job.id}:`, submitError);
    await refundCredits(user.id, CREDIT_COSTS.MOTION_TRANSFER, "Video refund: failed to submit");
    await db.content.update({ where: { id: content.id }, data: { status: "FAILED" } });
    await db.generationJob.update({
      where: { id: job.id },
      data: { status: "FAILED", error: submitError instanceof Error ? submitError.message : "Submit failed" },
    });
    return { success: false, error: "Failed to start video generation" };
  }
```

- [ ] **Step 4: Rewrite checkVideoStatus with Fal.ai queue polling + completion logic**

Replace the entire `checkVideoStatus` function (lines 463-486) with:

```typescript
export async function checkVideoStatus(jobId: string): Promise<StatusResult> {
  const { userId: clerkId } = await auth();
  if (!clerkId) return { status: "FAILED", error: "Not authenticated" };

  const job = await db.generationJob.findFirst({
    where: { id: jobId },
  });
  if (!job) return { status: "FAILED", error: "Job not found" };

  // Already completed — return from DB
  if (job.status === "COMPLETED") {
    const content = job.contentId
      ? await db.content.findUnique({ where: { id: job.contentId } })
      : null;
    const videoUrl = content?.url ? await getSignedImageUrl(content.url) : undefined;
    const thumbnailUrl = content?.thumbnailUrl ? await getSignedImageUrl(content.thumbnailUrl) : undefined;
    return { status: "COMPLETED", videoUrl, thumbnailUrl };
  }

  // Already failed — return from DB
  if (job.status === "FAILED") {
    return { status: "FAILED", error: job.error ?? "Generation failed" };
  }

  // Timeout check: 10 minutes max
  if (job.startedAt) {
    const elapsed = Date.now() - new Date(job.startedAt).getTime();
    if (elapsed > 10 * 60 * 1000) {
      console.log(`[Video] Job ${job.id} timed out after ${Math.round(elapsed / 1000)}s`);
      await failVideoJob(job.id, job.contentId, job.userId, "Generation timed out");
      return { status: "FAILED", error: "Generation timed out. Credits refunded." };
    }
  }

  // Has a Fal.ai request? Check its status.
  if (job.falRequestId && job.falModel) {
    try {
      const falStatus = await fal.queue.status(job.falModel, {
        requestId: job.falRequestId,
      });

      if (falStatus.status === "COMPLETED") {
        // CRITICAL: Fal.ai has NO explicit FAILED status.
        // Failed requests arrive as COMPLETED with error/error_type fields.
        const result = await fal.queue.result(job.falModel, {
          requestId: job.falRequestId,
        });

        // Check for error on the result
        const resultData = result.data as Record<string, unknown>;
        if (resultData?.error || resultData?.error_type) {
          const errorMsg = String(resultData.error ?? resultData.error_type ?? "Provider error");
          console.error(`[Video] Job ${job.id} completed with error:`, errorMsg);
          await failVideoJob(job.id, job.contentId, job.userId, errorMsg);
          return { status: "FAILED", error: errorMsg };
        }

        // Actually successful — download video, upload to S3, update DB
        const output = resultData as { video?: { url?: string }; video_url?: string };
        const videoUrl = output?.video?.url ?? output?.video_url;

        if (!videoUrl) {
          await failVideoJob(job.id, job.contentId, job.userId, "No video URL in response");
          return { status: "FAILED", error: "Generation produced no output" };
        }

        // Find the content to get creatorId for the S3 path
        const content = job.contentId
          ? await db.content.findUnique({ where: { id: job.contentId } })
          : null;
        const creatorId = content?.creatorId ?? "unknown";

        // Download from Fal CDN → upload to S3 (media URLs expire!)
        const { videoKey } = await uploadVideoToS3(videoUrl, job.userId, creatorId);

        // Extract thumbnail
        let thumbKey: string | undefined;
        try {
          const videoResponse = await fetch(videoUrl);
          const videoBuffer = Buffer.from(await videoResponse.arrayBuffer());
          const thumbBuffer = await extractFirstFrame(videoBuffer);
          if (thumbBuffer) {
            thumbKey = `users/${job.userId}/creators/${creatorId}/content/thumb-${Date.now()}.jpg`;
            await uploadImage(thumbBuffer, thumbKey, "image/jpeg");
          }
        } catch (err) {
          console.error(`[Video] Thumbnail extraction failed for ${job.id}:`, err);
        }

        // Update DB — atomic to prevent duplicate completion
        await db.content.update({
          where: { id: job.contentId! },
          data: {
            status: "COMPLETED",
            url: videoKey,
            thumbnailUrl: thumbKey || undefined,
            outputs: JSON.parse(JSON.stringify([videoKey])),
          },
        });

        await db.generationJob.update({
          where: { id: job.id },
          data: {
            status: "COMPLETED",
            completedAt: new Date(),
            output: JSON.parse(JSON.stringify({ videoKey, falVideoUrl: videoUrl })),
          },
        });

        const signedVideoUrl = await getSignedImageUrl(videoKey);
        const signedThumbUrl = thumbKey ? await getSignedImageUrl(thumbKey) : undefined;
        return { status: "COMPLETED", videoUrl: signedVideoUrl, thumbnailUrl: signedThumbUrl };
      }

      // Still processing
      return {
        status: falStatus.status === "IN_QUEUE" ? "QUEUED" : "PROCESSING",
      };
    } catch (err) {
      // Don't fail on transient status check errors — just report processing
      console.error(`[Video] Status check error for ${job.id}:`, err);
      return { status: "PROCESSING" };
    }
  }

  return { status: job.status as "QUEUED" | "PROCESSING" };
}
```

- [ ] **Step 5: Add failVideoJob helper and delete processVideoJob**

Add this helper function before `checkVideoStatus`:

```typescript
// ─── Fail a video job with credit refund ─────

async function failVideoJob(jobId: string, contentId: string | null, userId: string, errorMsg: string) {
  if (contentId) {
    const content = await db.content.findUnique({ where: { id: contentId } });
    if (content && content.creditsCost > 0) {
      await refundCredits(userId, content.creditsCost, `Video refund: ${errorMsg}`);
    }
    await db.content.update({ where: { id: contentId }, data: { status: "FAILED" } });
  }

  await db.generationJob.update({
    where: { id: jobId },
    data: { status: "FAILED", error: errorMsg, completedAt: new Date() },
  });
}
```

Then **delete the entire `processVideoJob` function** (lines 488-578). It's no longer needed.

- [ ] **Step 6: Build check**

```bash
pnpm build 2>&1 | tail -10
```

Expected: Build passes with no type errors.

- [ ] **Step 7: Commit**

```bash
git add src/server/actions/video-actions.ts
git commit -m "feat: replace fire-and-forget video generation with fal.queue.submit + status completion"
```

---

### Task 3: Rewrite talking-head-actions.ts — Parallel Steps + Queue Submit

**Files:**
- Modify: `src/server/actions/talking-head-actions.ts`

- [ ] **Step 1: Replace fire-and-forget processTalkingHead call with inline TTS+image + queue submit**

Replace lines 101-102 (the `processTalkingHead(...)` call) and the entire `processTalkingHead` function (lines 109-242) with:

First, replace lines 101-102:

```typescript
  // Run TTS and base image generation in PARALLEL (they're independent, ~5-15s total)
  try {
    await db.generationJob.update({
      where: { id: job.id },
      data: { status: "PROCESSING", startedAt: new Date() },
    });

    const gender = ((creator.settings as Record<string, string>)?.gender ?? "Female").toLowerCase();
    const subject = gender === "male" ? "man" : "woman";
    const pronoun = gender === "male" ? "He" : "She";
    const settingDesc = setting || "Clean, well-lit indoor setting";

    const character = creator.promptSeed
      ? creator.promptSeed
      : `That exact ${subject} from the reference image`;

    const talkingHeadPrompt = [
      `${character}.`,
      `Front-facing, slight head tilt, mouth slightly parted as if mid-sentence, natural warm expression. ${pronoun} looks gorgeous.`,
      ``,
      `ENVIRONMENT: ${settingDesc}. A few personal objects visible — realistic, lived-in.`,
      ``,
      `CAMERA: Front camera selfie angle, face fills frame, natural distance, slightly off-center.`,
      ``,
      `REALISM: ${REALISM_CONTENT}`,
    ].join("\n");

    const refBuffer = await getImageBuffer(creator.baseImageUrl!);
    const refBase64 = refBuffer.toString("base64");

    // Step 1 + 2 in PARALLEL: TTS + base image generation
    const [audioBuffer, imageResponse] = await Promise.all([
      generateSpeech(script, voiceId),
      ai.models.generateContent({
        model: IMAGE_MODEL,
        contents: [
          { text: talkingHeadPrompt },
          { inlineData: { mimeType: "image/jpeg", data: refBase64 } },
        ],
        config: { responseModalities: ["TEXT", "IMAGE"], safetySettings: SAFETY_OFF },
      }),
    ]);

    // Extract image from response
    const imagePart = imageResponse.candidates?.[0]?.content?.parts?.find(
      (p: { inlineData?: { data?: string } }) => p.inlineData?.data
    );
    if (!imagePart?.inlineData?.data) {
      throw new Error("Failed to generate talking head image");
    }
    const imageBuffer = Buffer.from(imagePart.inlineData.data, "base64");

    // Upload audio + image to S3 for our records
    const audioKey = `users/${user.id}/creators/${creator.id}/content/audio-${Date.now()}.mp3`;
    const imageKey = `users/${user.id}/creators/${creator.id}/content/talkhead-${Date.now()}.jpg`;
    await Promise.all([
      uploadImage(audioBuffer, audioKey, "audio/mpeg"),
      uploadImage(imageBuffer, imageKey, "image/jpeg"),
    ]);

    // Upload to Fal storage for lip sync API (S3 signed URLs may not work with Fal)
    const [falImageUrl, falAudioUrl] = await Promise.all([
      fal.storage.upload(new Blob([new Uint8Array(imageBuffer)], { type: "image/jpeg" })),
      fal.storage.upload(new Blob([new Uint8Array(audioBuffer)], { type: "audio/mpeg" })),
    ]);

    // Step 3: Submit lip sync to Fal.ai queue (the long-running part)
    const falModel = "fal-ai/kling-video/lipsync/audio-to-video";
    const submitted = await fal.queue.submit(falModel, {
      input: {
        video_url: falImageUrl,
        audio_url: falAudioUrl,
      },
    });

    await db.generationJob.update({
      where: { id: job.id },
      data: {
        falRequestId: submitted.request_id,
        falModel,
        output: JSON.parse(JSON.stringify({ audioKey, imageKey })),
      },
    });

    console.log(`[TalkingHead] Job ${job.id} — TTS+image done, lip sync submitted: ${submitted.request_id}`);
  } catch (error) {
    console.error(`[TalkingHead] Job ${job.id} failed during setup:`, error);
    const dur = duration ?? 15;
    const refundCost = dur === 30 ? CREDIT_COSTS.TALKING_HEAD_30S : CREDIT_COSTS.TALKING_HEAD;
    await refundCredits(user.id, refundCost, "Talking head refund: setup failed");
    await db.content.update({ where: { id: content.id }, data: { status: "FAILED" } });
    await db.generationJob.update({
      where: { id: job.id },
      data: { status: "FAILED", error: error instanceof Error ? error.message : "Setup failed", completedAt: new Date() },
    });
    return { success: false, error: "Failed to start talking head generation" };
  }
```

Then **delete the entire `processTalkingHead` function** (the old lines 109-242). The above code replaces both the call site and the function.

- [ ] **Step 2: Talking head status uses the same checkVideoStatus**

The frontend already polls `checkVideoStatus` for talking head jobs too (they share the same GenerationJob table). The `checkVideoStatus` rewrite from Task 2 handles talking head completion because the completion logic (download video from Fal CDN → upload to S3) is the same.

One addition: the talking head stores `imageKey` in job output (for the thumbnail). Update the completion logic in `checkVideoStatus` to use it. Find the thumbnail extraction block and add before it:

```typescript
        // For talking heads, use the pre-generated base image as thumbnail
        const jobOutput = job.output as Record<string, string> | null;
        let thumbKey: string | undefined = jobOutput?.imageKey;
```

Then change the thumbnail extraction to only run if `thumbKey` is not already set:

```typescript
        if (!thumbKey) {
          try {
            // ... existing thumbnail extraction code ...
          } catch { ... }
        }
```

- [ ] **Step 3: Build check**

```bash
pnpm build 2>&1 | tail -10
```

Expected: Build passes.

- [ ] **Step 4: Commit**

```bash
git add src/server/actions/talking-head-actions.ts src/server/actions/video-actions.ts
git commit -m "feat: talking head uses parallel TTS+image + fal.queue.submit for lip sync"
```

---

### Task 4: Create Metadata Service Client

**Files:**
- Create: `src/lib/metadata-service.ts`

- [ ] **Step 1: Create the metadata service client**

```typescript
// src/lib/metadata-service.ts
//
// HTTP client for the Railway-hosted metadata-service.
// Used for download exports that need thorough processing (exiftool + ffmpeg).
// Inline Sharp processing (src/lib/ai/metadata-strip.ts) remains for generation-time stripping.

const METADATA_URL = process.env.METADATA_SERVICE_URL;
const METADATA_KEY = process.env.METADATA_SERVICE_API_KEY;

function isConfigured(): boolean {
  return !!METADATA_URL && !!METADATA_KEY;
}

export async function processImageForDownload(
  imageBuffer: Buffer,
  device: string = "iphone_15_pro",
  gpsCity?: string,
): Promise<Buffer> {
  if (!isConfigured()) throw new Error("Metadata service not configured");

  const form = new FormData();
  form.append("file", new Blob([imageBuffer], { type: "image/jpeg" }), "image.jpg");
  form.append("device", device);
  if (gpsCity) form.append("gps_city", gpsCity);
  form.append("jpeg_quality", "93");

  const res = await fetch(`${METADATA_URL}/process/image`, {
    method: "POST",
    headers: { Authorization: `Bearer ${METADATA_KEY}` },
    body: form,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "unknown");
    throw new Error(`Metadata service image error ${res.status}: ${text}`);
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
  if (!isConfigured()) throw new Error("Metadata service not configured");

  const form = new FormData();
  form.append("file", new Blob([videoBuffer], { type: "video/mp4" }), "video.mp4");
  form.append("device", device);
  if (gpsCity) form.append("gps_city", gpsCity);
  form.append("add_noise", String(addNoise));
  form.append("noise_strength", String(noiseStrength));
  form.append("video_quality_crf", "18");

  const res = await fetch(`${METADATA_URL}/process/video`, {
    method: "POST",
    headers: { Authorization: `Bearer ${METADATA_KEY}` },
    body: form,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "unknown");
    throw new Error(`Metadata service video error ${res.status}: ${text}`);
  }

  return Buffer.from(await res.arrayBuffer());
}

export { isConfigured as isMetadataServiceConfigured };
```

- [ ] **Step 2: Build check**

```bash
pnpm build 2>&1 | tail -5
```

Expected: Build passes.

- [ ] **Step 3: Commit**

```bash
git add src/lib/metadata-service.ts
git commit -m "feat: add metadata-service client for Railway download processing"
```

---

### Task 5: Update Download Actions to Use Metadata Service

**Files:**
- Modify: `src/server/actions/download-actions.ts`

- [ ] **Step 1: Add video download support + metadata service integration with fallback**

Replace the entire content of `src/server/actions/download-actions.ts` with:

```typescript
"use server";

import { auth } from "@clerk/nextjs/server";
import sharp from "sharp";
import { db } from "@/lib/db";
import { getImageBuffer } from "@/lib/s3";
import { DEVICE_PROFILES, type DownloadSettings } from "@/types/download";
import {
  processImageForDownload,
  processVideoForDownload,
  isMetadataServiceConfigured,
} from "@/lib/metadata-service";

const DEFAULT_SETTINGS: DownloadSettings = {
  deviceId: "iphone-15-pro",
  quality: 95,
  stripMetadata: true,
  injectGps: false,
};

// Device ID mapping: our IDs → metadata-service device names
const DEVICE_MAP: Record<string, string> = {
  "iphone-15-pro": "iphone_15_pro",
  "iphone-15-pro-max": "iphone_15_pro_max",
  "iphone-14-pro": "iphone_14_pro",
  "samsung-s24": "samsung_s24",
  "none": "none",
};

// ─── Process Image Download ────────────────────────────

export async function processDownload(
  s3Key: string,
  settings?: Partial<DownloadSettings>
): Promise<{ success: true; data: string; filename: string } | { success: false; error: string }> {
  const { userId: clerkId } = await auth();
  if (!clerkId) return { success: false, error: "Not authenticated" };

  const user = await db.user.findUnique({ where: { clerkId } });
  if (!user) return { success: false, error: "User not found" };

  try {
    const config = { ...DEFAULT_SETTINGS, ...settings };
    const buffer = await getImageBuffer(s3Key);

    // Try metadata service first (more thorough: exiftool-based)
    if (isMetadataServiceConfigured()) {
      try {
        const metaDevice = DEVICE_MAP[config.deviceId] ?? "iphone_15_pro";
        const gpsCity = config.injectGps ? "los_angeles" : undefined;
        const processed = await processImageForDownload(buffer, metaDevice, gpsCity);
        const base64 = processed.toString("base64");
        return { success: true, data: base64, filename: `IMG_${Date.now()}.jpg` };
      } catch (err) {
        console.error("Metadata service image processing failed, falling back to Sharp:", err);
      }
    }

    // Fallback: Sharp (current behavior)
    const device = DEVICE_PROFILES.find((d) => d.id === config.deviceId) ?? DEVICE_PROFILES[0];
    let pipeline = sharp(buffer).jpeg({ quality: config.quality });

    if (device.make) {
      const exifData: Record<string, Record<string, string | number>> = {
        IFD0: { Make: device.make, Model: device.model, Software: device.software },
      };
      if (config.injectGps && config.gpsLat !== undefined && config.gpsLng !== undefined) {
        exifData.GPS = {
          GPSLatitudeRef: config.gpsLat >= 0 ? "N" : "S",
          GPSLatitude: Math.abs(config.gpsLat),
          GPSLongitudeRef: config.gpsLng >= 0 ? "E" : "W",
          GPSLongitude: Math.abs(config.gpsLng),
        };
      }
      pipeline = pipeline.withExifMerge(exifData);
    }

    const clean = await pipeline.toBuffer();
    return { success: true, data: clean.toString("base64"), filename: `IMG_${Date.now()}.jpg` };
  } catch (error) {
    console.error("Download processing failed:", error);
    return { success: false, error: "Failed to process download" };
  }
}

// ─── Process Video Download ────────────────────────────

export async function processVideoDownload(
  s3Key: string,
  settings?: Partial<DownloadSettings>
): Promise<{ success: true; data: string; filename: string } | { success: false; error: string }> {
  const { userId: clerkId } = await auth();
  if (!clerkId) return { success: false, error: "Not authenticated" };

  const user = await db.user.findUnique({ where: { clerkId } });
  if (!user) return { success: false, error: "User not found" };

  try {
    const config = { ...DEFAULT_SETTINGS, ...settings };
    const buffer = await getImageBuffer(s3Key);

    // Try metadata service (ffmpeg + exiftool processing)
    if (isMetadataServiceConfigured()) {
      try {
        const metaDevice = DEVICE_MAP[config.deviceId] ?? "iphone_15_pro";
        const gpsCity = config.injectGps ? "los_angeles" : undefined;
        const processed = await processVideoForDownload(buffer, metaDevice, gpsCity);
        const base64 = processed.toString("base64");
        return { success: true, data: base64, filename: `IMG_${Date.now()}.mp4` };
      } catch (err) {
        console.error("Metadata service video processing failed, serving raw:", err);
      }
    }

    // Fallback: serve raw video (no processing available without ffmpeg)
    return { success: true, data: buffer.toString("base64"), filename: `IMG_${Date.now()}.mp4` };
  } catch (error) {
    console.error("Video download processing failed:", error);
    return { success: false, error: "Failed to process video download" };
  }
}

// ─── Get Default Settings ────────────────────────────

export async function getDownloadSettings(): Promise<DownloadSettings> {
  const { userId: clerkId } = await auth();
  if (!clerkId) return DEFAULT_SETTINGS;

  const user = await db.user.findUnique({ where: { clerkId } });
  if (!user) return DEFAULT_SETTINGS;

  return DEFAULT_SETTINGS;
}
```

- [ ] **Step 2: Add env vars to .env.local**

```bash
echo '
# Metadata Service (Railway)
METADATA_SERVICE_URL=
METADATA_SERVICE_API_KEY=' >> .env.local
```

These stay empty until the metadata-service is deployed to Railway. The `isMetadataServiceConfigured()` check means the app works fine without it (falls back to Sharp/raw).

- [ ] **Step 3: Build check**

```bash
pnpm build 2>&1 | tail -10
```

Expected: Build passes.

- [ ] **Step 4: Commit**

```bash
git add src/server/actions/download-actions.ts src/lib/metadata-service.ts
git commit -m "feat: download actions route through metadata service with Sharp/raw fallback"
```

---

### Task 6: Deploy Metadata Service to Railway

**Files:**
- Separate repo: `/Users/camcurry/projects/metadata-service`

This task is done outside the main app codebase.

- [ ] **Step 1: Verify metadata-service works locally**

```bash
cd /Users/camcurry/projects/metadata-service
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

In another terminal:
```bash
curl http://localhost:8000/health
```

Expected: `{"status": "healthy", "dependencies": {"exiftool": "ok", "ffmpeg": "ok", "ffprobe": "ok"}}`

- [ ] **Step 2: Push to GitHub (if not already)**

```bash
cd /Users/camcurry/projects/metadata-service
git init  # if needed
git add -A
git commit -m "metadata-service: FastAPI + ffmpeg + exiftool for media processing"
# Create repo on GitHub, then:
git remote add origin https://github.com/YOUR_USER/metadata-service.git
git push -u origin main
```

- [ ] **Step 3: Deploy to Railway**

1. Go to https://railway.com/new
2. "Deploy from GitHub repo" → select metadata-service
3. Railway auto-detects Dockerfile, builds, deploys
4. In Settings → Networking → click "Generate Domain"
5. Copy the URL (e.g., `https://metadata-service-production-xxxx.up.railway.app`)

- [ ] **Step 4: Set Railway environment variables**

In Railway dashboard → Variables tab:
```
API_KEY=generate-a-secure-random-string-here
ALLOWED_ORIGINS=https://realinfluencer.ai,http://localhost:3000
```

- [ ] **Step 5: Test the deployed service**

```bash
curl https://metadata-service-production-xxxx.up.railway.app/health \
  -H "Authorization: Bearer YOUR_API_KEY"
```

Expected: `{"status": "healthy", ...}`

- [ ] **Step 6: Update .env.local with Railway URL**

```bash
# In /Users/camcurry/projects/ai-creator-app/.env.local, fill in:
METADATA_SERVICE_URL=https://metadata-service-production-xxxx.up.railway.app
METADATA_SERVICE_API_KEY=the-api-key-you-set-in-railway
```

- [ ] **Step 7: Test end-to-end**

Run the app locally (`pnpm dev`), download an image. Check the server logs — should see the metadata service being called (or graceful fallback if connection issues).

---

### Task 7: Final Build + Cleanup

**Files:**
- All modified files

- [ ] **Step 1: Full build**

```bash
pnpm build
```

Expected: Clean build, no type errors.

- [ ] **Step 2: Verify no remaining fal.subscribe calls**

```bash
grep -r "fal.subscribe" src/ --include="*.ts" --include="*.tsx"
```

Expected: No results. All `fal.subscribe` calls should be gone, replaced with `fal.queue.submit`.

- [ ] **Step 3: Verify no remaining processVideoJob or processTalkingHead**

```bash
grep -r "processVideoJob\|processTalkingHead" src/ --include="*.ts" --include="*.tsx"
```

Expected: No results. Both fire-and-forget functions should be deleted.

- [ ] **Step 4: Commit final cleanup**

```bash
git add -A
git commit -m "chore: verify clean build, no remaining fire-and-forget patterns"
```
