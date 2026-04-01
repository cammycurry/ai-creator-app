"use server";

import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { fal } from "@/lib/fal";
import { uploadImage, getSignedImageUrl } from "@/lib/s3";
import { deductCredits, refundCredits } from "./credit-actions";
import { CREDIT_COSTS } from "@/types/credits";

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
  const response = await fetch(videoUrl);
  const buffer = Buffer.from(await response.arrayBuffer());
  const timestamp = Date.now();
  const videoKey = `users/${userId}/creators/${creatorId}/content/video-${timestamp}.mp4`;
  await uploadImage(buffer, videoKey, "video/mp4");
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

  const creditCost = duration === 5 ? CREDIT_COSTS.VIDEO_5S : CREDIT_COSTS.VIDEO_10S;
  const totalCredits = user.planCredits + user.packCredits;
  if (totalCredits < creditCost) {
    return { success: false, error: `Not enough credits. Need ${creditCost}, have ${totalCredits}.` };
  }
  await deductCredits(user.id, creditCost, `Video: image-to-video ${duration}s`);

  const imageUrl = await getSignedImageUrl(sourceContent.url);

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

  await db.generationJob.update({
    where: { id: job.id },
    data: { contentId: content.id },
  });

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
      image_url: baseImageUrl,
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

    const result = await fal.subscribe(falRequest.model, {
      input: falRequest.input,
    });

    const output = result.data as { video?: { url?: string }; video_url?: string };
    const videoUrl = output?.video?.url ?? output?.video_url;

    if (!videoUrl) {
      throw new Error("No video URL in Fal.ai response");
    }

    const { videoKey } = await uploadVideoToS3(videoUrl, userId, creatorId);

    await db.content.update({
      where: { id: contentId },
      data: {
        status: "COMPLETED",
        url: videoKey,
        outputs: JSON.parse(JSON.stringify([videoKey])),
      },
    });

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

    const content = await db.content.findUnique({ where: { id: contentId } });
    if (content && content.creditsCost > 0) {
      await refundCredits(userId, content.creditsCost, `Video refund: generation failed`);
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
