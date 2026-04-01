# Video Generation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add video generation (image-to-video, text-to-video, motion transfer) via Kling 3.0 on Fal.ai with async job pipeline, video player, and UI integration.

**Architecture:** Server actions call Fal.ai's queue API for async generation. GenerationJob model tracks status. Client polls for completion. Videos stored in S3, displayed with inline player. Three entry points: "Make Video" on content detail, "Video" mode on floating input, motion transfer dialog.

**Tech Stack:** Fal.ai client (`@fal-ai/client`), Kling 3.0 models, existing S3/Prisma/Zustand infrastructure.

**Spec:** `docs/superpowers/specs/2026-04-01-video-generation-design.md`

---

## File Structure

```
Create: src/lib/fal.ts                                    — Fal.ai client setup
Create: src/server/actions/video-actions.ts                — All video generation + status polling
Create: src/components/workspace/video-player.tsx          — Inline video player component
Create: src/components/workspace/make-video-dialog.tsx     — "Make Video" dialog (image-to-video)
Create: src/components/workspace/motion-transfer-dialog.tsx — Motion transfer upload dialog
Modify: src/types/credits.ts                               — Add VIDEO_5S, VIDEO_10S cost types
Modify: src/components/workspace/content-detail.tsx        — Wire "Make Video" button
Modify: src/components/workspace/workspace-canvas.tsx      — Video mode on floating input, video cards
Modify: src/app/workspace/workspace.css                    — Video player + dialog styles
```

---

### Task 1: Install Fal.ai Client + Setup

**Files:**
- Create: `src/lib/fal.ts`

- [ ] **Step 1: Install @fal-ai/client**

Run: `pnpm add @fal-ai/client`

- [ ] **Step 2: Create Fal.ai client module**

```typescript
import { fal } from "@fal-ai/client";

fal.config({
  credentials: process.env.FAL_KEY!,
});

export { fal };
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/fal.ts package.json pnpm-lock.yaml
git commit -m "feat: add Fal.ai client setup"
```

---

### Task 2: Update Credit Types

**Files:**
- Modify: `src/types/credits.ts`

- [ ] **Step 1: Update credit cost types and values**

Replace the entire file contents:

```typescript
export type CreditBalance = {
  planCredits: number;
  packCredits: number;
  total: number;
};

export type ContentCostType =
  | "IMAGE"
  | "IMAGE_UPSCALE"
  | "VIDEO_5S"
  | "VIDEO_10S"
  | "VOICE"
  | "TALKING_HEAD"
  | "MOTION_TRANSFER";

export type CreditCost = Record<ContentCostType, number>;

export const CREDIT_COSTS: CreditCost = {
  IMAGE: 1,
  IMAGE_UPSCALE: 1,
  VIDEO_5S: 3,
  VIDEO_10S: 5,
  VOICE: 2,
  TALKING_HEAD: 8,
  MOTION_TRANSFER: 5,
} as const;
```

- [ ] **Step 2: Commit**

```bash
git add src/types/credits.ts
git commit -m "feat: add video credit cost types"
```

---

### Task 3: Video Server Actions

**Files:**
- Create: `src/server/actions/video-actions.ts`

- [ ] **Step 1: Create the video actions file with all four functions**

```typescript
"use server";

import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { fal } from "@/lib/fal";
import { uploadImage, getSignedImageUrl, getImageBuffer } from "@/lib/s3";
import { deductCredits } from "./credit-actions";
import { CREDIT_COSTS } from "@/types/credits";
import type { ContentItem } from "@/types/content";

type VideoResult =
  | { success: true; jobId: string; contentId: string }
  | { success: false; error: string };

type StatusResult = {
  status: "QUEUED" | "PROCESSING" | "COMPLETED" | "FAILED";
  progress?: number;
  videoUrl?: string;
  thumbnailUrl?: string;
  error?: string;
};

// ─── Auth helper ─────

async function getAuthUser() {
  const { userId: clerkId } = await auth();
  if (!clerkId) return null;
  return db.user.findUnique({ where: { clerkId } });
}

// ─── Upload video from URL to S3 ─────

async function uploadVideoToS3(
  videoUrl: string,
  userId: string,
  creatorId: string
): Promise<{ videoKey: string; thumbKey: string }> {
  // Download video
  const response = await fetch(videoUrl);
  const buffer = Buffer.from(await response.arrayBuffer());
  const timestamp = Date.now();
  const videoKey = `users/${userId}/creators/${creatorId}/content/video-${timestamp}.mp4`;
  await uploadImage(buffer, videoKey, "video/mp4");

  // For thumbnail, we'll use the source image or a placeholder
  // Fal.ai sometimes returns a thumbnail — we'll handle that in the caller
  const thumbKey = "";
  return { videoKey, thumbKey };
}

// ─── Generate Video from Image ─────

export async function generateVideoFromImage(
  creatorId: string,
  sourceContentId: string,
  prompt: string,
  duration: 5 | 10 = 5
): Promise<VideoResult> {
  const user = await getAuthUser();
  if (!user) return { success: false, error: "Not authenticated" };

  const creator = await db.creator.findUnique({
    where: { id: creatorId, userId: user.id },
  });
  if (!creator) return { success: false, error: "Creator not found" };

  const sourceContent = await db.content.findUnique({
    where: { id: sourceContentId },
  });
  if (!sourceContent?.url) return { success: false, error: "Source image not found" };

  // Check and deduct credits
  const creditCost = duration === 5 ? CREDIT_COSTS.VIDEO_5S : CREDIT_COSTS.VIDEO_10S;
  const totalCredits = user.planCredits + user.packCredits;
  if (totalCredits < creditCost) {
    return { success: false, error: `Not enough credits. Need ${creditCost}, have ${totalCredits}.` };
  }
  await deductCredits(user.id, creditCost, `Video: image-to-video ${duration}s`);

  // Get signed URL for the source image (Fal needs a URL)
  const imageUrl = await getSignedImageUrl(sourceContent.url);

  // Create generation job
  const job = await db.generationJob.create({
    data: {
      userId: user.id,
      type: "VIDEO_I2V",
      status: "QUEUED",
      provider: "fal-ai",
      modelId: "fal-ai/kling-video/v3/standard/image-to-video",
      input: JSON.parse(JSON.stringify({
        sourceContentId,
        prompt,
        duration,
        imageUrl,
      })),
      estimatedCost: duration * 0.14,
    },
  });

  // Create content record (GENERATING status)
  const content = await db.content.create({
    data: {
      creatorId,
      type: "VIDEO",
      status: "GENERATING",
      source: "FREEFORM",
      prompt,
      userInput: prompt,
      creditsCost: creditCost,
      generationSettings: JSON.parse(JSON.stringify({
        videoType: "image-to-video",
        duration,
        videoModel: "fal-ai/kling-video/v3/standard/image-to-video",
        sourceContentId,
        motionPrompt: prompt,
        jobId: job.id,
      })),
    },
  });

  // Update job with content ID
  await db.generationJob.update({
    where: { id: job.id },
    data: { contentId: content.id },
  });

  // Fire off async generation (don't await — client will poll)
  processVideoJob(job.id, content.id, user.id, creatorId, {
    model: "fal-ai/kling-video/v3/standard/image-to-video",
    input: {
      image_url: imageUrl,
      prompt: prompt || "natural subtle movement, cinematic",
      duration: String(duration),
      aspect_ratio: "9:16",
    },
  }).catch((err) => console.error("Video job failed:", err));

  return { success: true, jobId: job.id, contentId: content.id };
}

// ─── Generate Video from Text ─────

export async function generateVideoFromText(
  creatorId: string,
  prompt: string,
  duration: 5 | 10 = 5,
  aspectRatio: "9:16" | "1:1" | "16:9" = "9:16"
): Promise<VideoResult> {
  const user = await getAuthUser();
  if (!user) return { success: false, error: "Not authenticated" };

  const creator = await db.creator.findUnique({
    where: { id: creatorId, userId: user.id },
  });
  if (!creator || !creator.baseImageUrl) return { success: false, error: "Creator not found" };

  const creditCost = duration === 5 ? CREDIT_COSTS.VIDEO_5S : CREDIT_COSTS.VIDEO_10S;
  const totalCredits = user.planCredits + user.packCredits;
  if (totalCredits < creditCost) {
    return { success: false, error: `Not enough credits. Need ${creditCost}, have ${totalCredits}.` };
  }
  await deductCredits(user.id, creditCost, `Video: text-to-video ${duration}s`);

  // Get creator's base image for reference
  const baseImageUrl = await getSignedImageUrl(creator.baseImageUrl);

  const job = await db.generationJob.create({
    data: {
      userId: user.id,
      type: "VIDEO_T2V",
      status: "QUEUED",
      provider: "fal-ai",
      modelId: "fal-ai/kling-video/v3/pro/text-to-video",
      input: JSON.parse(JSON.stringify({ prompt, duration, aspectRatio })),
      estimatedCost: duration * 0.14,
    },
  });

  const content = await db.content.create({
    data: {
      creatorId,
      type: "VIDEO",
      status: "GENERATING",
      source: "FREEFORM",
      prompt,
      userInput: prompt,
      creditsCost: creditCost,
      generationSettings: JSON.parse(JSON.stringify({
        videoType: "text-to-video",
        duration,
        aspectRatio,
        videoModel: "fal-ai/kling-video/v3/pro/text-to-video",
        jobId: job.id,
      })),
    },
  });

  await db.generationJob.update({
    where: { id: job.id },
    data: { contentId: content.id },
  });

  processVideoJob(job.id, content.id, user.id, creatorId, {
    model: "fal-ai/kling-video/v3/pro/text-to-video",
    input: {
      prompt,
      duration: String(duration),
      aspect_ratio: aspectRatio,
      image_url: baseImageUrl, // pass base image for face consistency
    },
  }).catch((err) => console.error("Video job failed:", err));

  return { success: true, jobId: job.id, contentId: content.id };
}

// ─── Generate Video with Motion Transfer ─────

export async function generateVideoMotionTransfer(
  creatorId: string,
  referenceVideoUrl: string,
  prompt: string,
  duration: 5 | 10 = 5
): Promise<VideoResult> {
  const user = await getAuthUser();
  if (!user) return { success: false, error: "Not authenticated" };

  const creator = await db.creator.findUnique({
    where: { id: creatorId, userId: user.id },
  });
  if (!creator || !creator.baseImageUrl) return { success: false, error: "Creator not found" };

  const creditCost = CREDIT_COSTS.MOTION_TRANSFER;
  const totalCredits = user.planCredits + user.packCredits;
  if (totalCredits < creditCost) {
    return { success: false, error: `Not enough credits. Need ${creditCost}, have ${totalCredits}.` };
  }
  await deductCredits(user.id, creditCost, `Video: motion transfer ${duration}s`);

  const baseImageUrl = await getSignedImageUrl(creator.baseImageUrl);

  const job = await db.generationJob.create({
    data: {
      userId: user.id,
      type: "VIDEO_MOTION",
      status: "QUEUED",
      provider: "fal-ai",
      modelId: "fal-ai/kling-video/v3/pro/motion-control",
      input: JSON.parse(JSON.stringify({ referenceVideoUrl, prompt, duration })),
      estimatedCost: duration * 0.168,
    },
  });

  const content = await db.content.create({
    data: {
      creatorId,
      type: "VIDEO",
      status: "GENERATING",
      source: "FREEFORM",
      prompt,
      userInput: prompt,
      creditsCost: creditCost,
      generationSettings: JSON.parse(JSON.stringify({
        videoType: "motion-transfer",
        duration,
        videoModel: "fal-ai/kling-video/v3/pro/motion-control",
        jobId: job.id,
      })),
    },
  });

  await db.generationJob.update({
    where: { id: job.id },
    data: { contentId: content.id },
  });

  processVideoJob(job.id, content.id, user.id, creatorId, {
    model: "fal-ai/kling-video/v3/pro/motion-control",
    input: {
      video_url: referenceVideoUrl,
      image_url: baseImageUrl,
      prompt: prompt || "replicate the movement naturally",
      duration: String(duration),
    },
  }).catch((err) => console.error("Video job failed:", err));

  return { success: true, jobId: job.id, contentId: content.id };
}

// ─── Check Video Job Status ─────

export async function checkVideoStatus(jobId: string): Promise<StatusResult> {
  const { userId: clerkId } = await auth();
  if (!clerkId) return { status: "FAILED", error: "Not authenticated" };

  const job = await db.generationJob.findFirst({
    where: { id: jobId },
  });
  if (!job) return { status: "FAILED", error: "Job not found" };

  if (job.status === "COMPLETED") {
    const content = job.contentId
      ? await db.content.findUnique({ where: { id: job.contentId } })
      : null;
    const videoUrl = content?.url ? await getSignedImageUrl(content.url) : undefined;
    const thumbnailUrl = content?.thumbnailUrl ? await getSignedImageUrl(content.thumbnailUrl) : undefined;
    return { status: "COMPLETED", videoUrl, thumbnailUrl };
  }

  if (job.status === "FAILED") {
    return { status: "FAILED", error: job.error ?? "Generation failed" };
  }

  return { status: job.status as "QUEUED" | "PROCESSING" };
}

// ─── Internal: Process video job async ─────

async function processVideoJob(
  jobId: string,
  contentId: string,
  userId: string,
  creatorId: string,
  falRequest: { model: string; input: Record<string, string> }
) {
  try {
    await db.generationJob.update({
      where: { id: jobId },
      data: { status: "PROCESSING", startedAt: new Date() },
    });

    // Call Fal.ai and wait for result (fal.subscribe handles polling internally)
    const result = await fal.subscribe(falRequest.model, {
      input: falRequest.input,
    });

    // Extract video URL from result
    const output = result.data as { video?: { url?: string }; video_url?: string };
    const videoUrl = output?.video?.url ?? output?.video_url;

    if (!videoUrl) {
      throw new Error("No video URL in Fal.ai response");
    }

    // Download and upload to S3
    const { videoKey } = await uploadVideoToS3(videoUrl, userId, creatorId);

    // Update content record
    await db.content.update({
      where: { id: contentId },
      data: {
        status: "COMPLETED",
        url: videoKey,
        outputs: JSON.parse(JSON.stringify([videoKey])),
      },
    });

    // Update job
    await db.generationJob.update({
      where: { id: jobId },
      data: {
        status: "COMPLETED",
        completedAt: new Date(),
        output: JSON.parse(JSON.stringify({ videoKey, falVideoUrl: videoUrl })),
      },
    });
  } catch (error) {
    console.error(`Video job ${jobId} failed:`, error);

    // Refund credits
    const job = await db.generationJob.findUnique({ where: { id: jobId } });
    if (job) {
      const content = await db.content.findUnique({ where: { id: contentId } });
      if (content) {
        await deductCredits(userId, -(content.creditsCost), `Video refund: generation failed`);
      }
    }

    await db.content.update({
      where: { id: contentId },
      data: { status: "FAILED" },
    });

    await db.generationJob.update({
      where: { id: jobId },
      data: {
        status: "FAILED",
        error: error instanceof Error ? error.message : "Unknown error",
        completedAt: new Date(),
      },
    });
  }
}
```

- [ ] **Step 2: Verify it compiles**

Run: `pnpm build 2>&1 | head -20`

- [ ] **Step 3: Commit**

```bash
git add src/server/actions/video-actions.ts
git commit -m "feat: add video generation server actions (Kling 3.0 via Fal.ai)"
```

---

### Task 4: Video Player Component

**Files:**
- Create: `src/components/workspace/video-player.tsx`

- [ ] **Step 1: Create the video player**

```typescript
"use client";

import { useRef, useState } from "react";

export function VideoPlayer({
  src,
  poster,
  className,
}: {
  src: string;
  poster?: string;
  className?: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (playing) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
    setPlaying(!playing);
  };

  return (
    <div className={`video-player ${className ?? ""}`} onClick={togglePlay}>
      <video
        ref={videoRef}
        src={src}
        poster={poster}
        muted={muted}
        loop
        playsInline
        onEnded={() => setPlaying(false)}
        style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
      />
      {!playing && (
        <div className="video-play-overlay">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="white" stroke="none">
            <polygon points="5 3 19 12 5 21 5 3" />
          </svg>
        </div>
      )}
      <div className="video-controls">
        <button
          className="video-mute-btn"
          onClick={(e) => { e.stopPropagation(); setMuted(!muted); }}
        >
          {muted ? (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M11 5L6 9H2v6h4l5 4V5z" />
              <line x1="23" y1="9" x2="17" y2="15" />
              <line x1="17" y1="9" x2="23" y2="15" />
            </svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M11 5L6 9H2v6h4l5 4V5z" />
              <path d="M19.07 4.93a10 10 0 010 14.14M15.54 8.46a5 5 0 010 7.07" />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/workspace/video-player.tsx
git commit -m "feat: add VideoPlayer component"
```

---

### Task 5: Make Video Dialog

**Files:**
- Create: `src/components/workspace/make-video-dialog.tsx`

- [ ] **Step 1: Create the dialog**

```typescript
"use client";

import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useCreatorStore } from "@/stores/creator-store";
import { generateVideoFromImage, checkVideoStatus } from "@/server/actions/video-actions";
import { getWorkspaceData } from "@/server/actions/workspace-actions";
import { getSignedImageUrl } from "@/server/actions/workspace-actions";
import { CREDIT_COSTS } from "@/types/credits";
import type { ContentItem } from "@/types/content";

export function MakeVideoDialog({
  item,
  open,
  onOpenChange,
}: {
  item: ContentItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [prompt, setPrompt] = useState("");
  const [duration, setDuration] = useState<5 | 10>(5);
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState<string>("Starting...");
  const [error, setError] = useState<string | null>(null);
  const { setCredits } = useCreatorStore();

  if (!item) return null;

  const creditCost = duration === 5 ? CREDIT_COSTS.VIDEO_5S : CREDIT_COSTS.VIDEO_10S;

  async function handleGenerate() {
    if (!item || generating) return;
    setGenerating(true);
    setError(null);
    setProgress("Starting video generation...");

    const result = await generateVideoFromImage(item.creatorId, item.id, prompt, duration);

    if (!result.success) {
      setError(result.error);
      setGenerating(false);
      return;
    }

    // Poll for completion
    setProgress("Generating video...");
    const jobId = result.jobId;
    let attempts = 0;
    const maxAttempts = 120; // 10 minutes at 5s intervals

    const poll = setInterval(async () => {
      attempts++;
      const status = await checkVideoStatus(jobId);

      if (status.status === "COMPLETED") {
        clearInterval(poll);
        const data = await getWorkspaceData();
        setCredits(data.balance);
        setGenerating(false);
        onOpenChange(false);
        // Reload content to show the new video
        window.location.reload();
      } else if (status.status === "FAILED") {
        clearInterval(poll);
        setError(status.error ?? "Video generation failed");
        setGenerating(false);
      } else if (attempts >= maxAttempts) {
        clearInterval(poll);
        setError("Video generation timed out. Check back later.");
        setGenerating(false);
      } else {
        setProgress(`Generating video... (${attempts * 5}s)`);
      }
    }, 5000);
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!generating) onOpenChange(o); }}>
      <DialogContent className="make-video-dialog">
        <h3 style={{ fontSize: 18, fontWeight: 600, margin: "0 0 4px" }}>Make Video</h3>
        <p style={{ fontSize: 12, color: "var(--text-secondary, #888)", margin: "0 0 16px" }}>
          Animate this photo into a video clip
        </p>

        {/* Source image */}
        {item.url && (
          <div style={{ borderRadius: 10, overflow: "hidden", marginBottom: 16, maxHeight: 200 }}>
            <img src={item.url} alt="" style={{ width: "100%", height: 200, objectFit: "cover", display: "block" }} />
          </div>
        )}

        {/* Motion prompt */}
        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary, #888)", display: "block", marginBottom: 4 }}>
            How should they move?
          </label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Slow head turn and smile, gentle hair movement in breeze..."
            rows={2}
            style={{
              width: "100%", padding: "8px 12px", borderRadius: 8,
              border: "1px solid var(--border, #EBEBEB)", fontSize: 16,
              fontFamily: "inherit", color: "var(--text-primary, #111)",
              background: "var(--surface, #fff)", resize: "none", outline: "none",
            }}
          />
        </div>

        {/* Duration picker */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary, #888)", display: "block", marginBottom: 6 }}>
            Duration
          </label>
          <div style={{ display: "flex", gap: 8 }}>
            {([5, 10] as const).map((d) => (
              <button
                key={d}
                onClick={() => setDuration(d)}
                style={{
                  flex: 1, padding: "8px 12px", borderRadius: 8, fontSize: 13, fontWeight: 500,
                  cursor: "pointer", border: "1px solid",
                  borderColor: duration === d ? "var(--accent, #C4603A)" : "var(--border, #EBEBEB)",
                  background: duration === d ? "var(--accent, #C4603A)" : "var(--card, #F5F5F5)",
                  color: duration === d ? "#fff" : "var(--text-primary, #111)",
                }}
              >
                {d} seconds
                <span style={{ display: "block", fontSize: 11, fontWeight: 400, opacity: 0.8, marginTop: 2 }}>
                  {d === 5 ? CREDIT_COSTS.VIDEO_5S : CREDIT_COSTS.VIDEO_10S} credits
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div style={{ padding: "8px 0", color: "#e53e3e", fontSize: 13 }}>{error}</div>
        )}

        {/* Generating progress */}
        {generating && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 0", fontSize: 13, color: "var(--text-secondary, #888)" }}>
            <div className="studio-gen-spinner" />
            {progress}
          </div>
        )}

        {/* Footer */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 600 }}>
            {creditCost} credit{creditCost !== 1 ? "s" : ""}
          </span>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              className="studio-btn secondary"
              onClick={() => onOpenChange(false)}
              disabled={generating}
            >
              Cancel
            </button>
            <button
              className="studio-btn primary"
              onClick={handleGenerate}
              disabled={generating}
              style={{ minWidth: 140 }}
            >
              {generating ? "Generating..." : "Generate Video"}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/workspace/make-video-dialog.tsx
git commit -m "feat: add MakeVideoDialog component"
```

---

### Task 6: Wire "Make Video" Button on Content Detail

**Files:**
- Modify: `src/components/workspace/content-detail.tsx`

- [ ] **Step 1: Read the file first, then add Make Video functionality**

Import the dialog:
```typescript
import { MakeVideoDialog } from "./make-video-dialog";
```

Add state inside ContentDetail:
```typescript
const [videoOpen, setVideoOpen] = useState(false);
```

Find the disabled "Make Video" button (it has `style={{ opacity: 0.5 }}` and `disabled`). Replace it with an active button:

```typescript
<button
  className="cd-action-btn"
  onClick={() => setVideoOpen(true)}
>
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polygon points="5 3 19 12 5 21 5 3" />
  </svg>
  Make Video
</button>
```

Add the dialog render before the closing `</DialogContent>`:
```typescript
<MakeVideoDialog
  item={item}
  open={videoOpen}
  onOpenChange={setVideoOpen}
/>
```

- [ ] **Step 2: Commit**

```bash
git add src/components/workspace/content-detail.tsx
git commit -m "feat: wire Make Video button on content detail"
```

---

### Task 7: Video Cards in Content Grid + Video Mode on Floating Input

**Files:**
- Modify: `src/components/workspace/workspace-canvas.tsx`

- [ ] **Step 1: Read the file. Update video content cards to show play icon overlay**

In the content grid where photos render, video items need a play icon overlay and should use the VideoPlayer when clicked. Read the file first.

Import VideoPlayer:
```typescript
import { VideoPlayer } from "./video-player";
```

In the standalone photos grid rendering, update to handle VIDEO type. Find where content cards render and add a check: if `item.type === "VIDEO"`, show a play icon overlay on the thumbnail.

After the `<img>` tag inside the content-card div, add:
```typescript
{item.type === "VIDEO" && (
  <div className="video-play-overlay" style={{
    position: "absolute", inset: 0, display: "flex",
    alignItems: "center", justifyContent: "center",
    background: "rgba(0,0,0,0.2)", borderRadius: 8,
  }}>
    <svg width="28" height="28" viewBox="0 0 24 24" fill="white" stroke="none" opacity={0.9}>
      <polygon points="5 3 19 12 5 21 5 3" />
    </svg>
  </div>
)}
```

- [ ] **Step 2: Enable the "Video" mode chip on the floating input**

Find the disabled Video mode chip (has `disabled` and `style={{ opacity: 0.5 }}`). Remove the `disabled` attribute and `opacity: 0.5` style. Add an onClick that switches to video generation mode.

Add state at the top of ContentArea:
```typescript
const [contentMode, setContentMode] = useState<"photo" | "video">("photo");
```

Update the Video mode chip:
```typescript
<button
  className={`mode-chip${contentMode === "video" ? " active" : ""}`}
  onClick={() => setContentMode("video")}
>
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polygon points="5 3 19 12 5 21 5 3" />
  </svg>
  Video
</button>
```

Update the Photo mode chip to also use contentMode:
```typescript
<button
  className={`mode-chip${contentMode === "photo" ? " active" : ""}`}
  onClick={() => setContentMode("photo")}
>
```

- [ ] **Step 3: Update handleSubmit to route video generation**

Import the video action:
```typescript
import { generateVideoFromText, checkVideoStatus } from "@/server/actions/video-actions";
```

In `handleSubmit`, after the idea-request check, add a video mode branch:

```typescript
    if (contentMode === "video") {
      setIsGeneratingContent(true);
      setContentError(null);
      const result = await generateVideoFromText(creator.id, input, 5, "9:16");
      if (!result.success) {
        setContentError(result.error);
        setIsGeneratingContent(false);
        return;
      }
      setPrompt("");
      // Poll for completion
      const poll = setInterval(async () => {
        const status = await checkVideoStatus(result.jobId);
        if (status.status === "COMPLETED" || status.status === "FAILED") {
          clearInterval(poll);
          setIsGeneratingContent(false);
          if (status.status === "FAILED") {
            setContentError(status.error ?? "Video generation failed");
          } else {
            // Reload content
            const data = await getWorkspaceData();
            setCredits(data.balance);
            getCreatorContent(creator.id).then(setContent);
          }
        }
      }, 5000);
      return;
    }
```

- [ ] **Step 4: Commit**

```bash
git add src/components/workspace/workspace-canvas.tsx
git commit -m "feat: video cards with play overlay + video mode on floating input"
```

---

### Task 8: Video Player + Dialog CSS

**Files:**
- Modify: `src/app/workspace/workspace.css`

- [ ] **Step 1: Add video player and dialog styles**

Append to the end of workspace.css:

```css
/* ── Video Player ── */
.video-player { position: relative; cursor: pointer; border-radius: 8px; overflow: hidden; background: #000; }
.video-play-overlay { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; background: rgba(0,0,0,0.25); transition: opacity 150ms; }
.video-player:hover .video-play-overlay { background: rgba(0,0,0,0.35); }
.video-controls { position: absolute; bottom: 8px; right: 8px; display: flex; gap: 4px; }
.video-mute-btn { width: 28px; height: 28px; border-radius: 6px; background: rgba(0,0,0,0.6); border: none; color: #fff; cursor: pointer; display: flex; align-items: center; justify-content: center; }
.video-mute-btn:hover { background: rgba(0,0,0,0.8); }

/* ── Make Video Dialog ── */
.make-video-dialog { max-width: 440px; }
```

- [ ] **Step 2: Commit**

```bash
git add src/app/workspace/workspace.css
git commit -m "feat: add video player and dialog CSS"
```

---

### Task 9: Video Content in Content Detail

**Files:**
- Modify: `src/components/workspace/content-detail.tsx`

- [ ] **Step 1: Show video player instead of image when content is VIDEO type**

In the content detail component, find the image display area (`cd-image-wrap`). Wrap it in a type check:

```typescript
<div className="cd-image-wrap">
  {item.type === "VIDEO" && item.url ? (
    <VideoPlayer
      src={item.url}
      className="cd-image"
    />
  ) : item.url ? (
    <img src={item.url} alt={item.userInput ?? "Generated content"} className="cd-image" />
  ) : null}
</div>
```

Import VideoPlayer:
```typescript
import { VideoPlayer } from "./video-player";
```

Also update the download handler to handle video files — change the download filename extension:
```typescript
a.download = `realinfluencer-${item.id}.${item.type === "VIDEO" ? "mp4" : "png"}`;
```

Hide "Make Video" button when item is already a video (it shouldn't show "Make Video" on a video).

- [ ] **Step 2: Commit**

```bash
git add src/components/workspace/content-detail.tsx
git commit -m "feat: show video player in content detail for VIDEO type"
```

---

### Task 10: Build Verification

- [ ] **Step 1: Run build**

Run: `pnpm build 2>&1 | tail -20`

Expected: Build succeeds.

- [ ] **Step 2: Fix any type errors**

Common issues to check:
- `getSignedImageUrl` import in make-video-dialog (it's from `@/lib/s3`, not workspace-actions — fix if needed)
- Fal.ai types may need `as any` for the subscribe response
- `checkVideoStatus` return type alignment

- [ ] **Step 3: Commit fixes**

```bash
git add -A
git commit -m "fix: video generation build verification fixes"
```
