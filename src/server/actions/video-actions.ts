"use server";

import { auth } from "@clerk/nextjs/server";
import { GoogleGenAI, HarmCategory, HarmBlockThreshold } from "@google/genai";
import OpenAI from "openai";
import { db } from "@/lib/db";
import { fal } from "@/lib/fal";
import { uploadImage, getSignedImageUrl, getImageBuffer } from "@/lib/s3";
import { deductCredits, refundCredits } from "./credit-actions";
import { CREDIT_COSTS } from "@/types/credits";
import { VIDEO_ENHANCE_PROMPT } from "@/lib/prompts";
import { extractFirstFrame } from "@/lib/video-utils";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
const grok = new OpenAI({ apiKey: process.env.GROK_API_KEY!, baseURL: "https://api.x.ai/v1" });

const SAFETY_OFF = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
];

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

// ─── Types ─────

export type VideoRefAttachment = {
  refId: string;
  refName: string;
  s3Key: string;
  refType: "scene" | "product";
  mode: "exact" | "inspired";
  description: string;
};

// ─── Convert refs to Kling elements ─────
// API limits: O3 ref-to-video max 4 total, motion control max 1 element

async function refsToElements(
  refs: VideoRefAttachment[],
  maxElements: number = 3
): Promise<{ frontal_image_url: string; reference_image_urls: string[] }[]> {
  const elements: { frontal_image_url: string; reference_image_urls: string[] }[] = [];
  const limited = refs.slice(0, maxElements);

  for (const ref of limited) {
    const signedUrl = await getSignedImageUrl(ref.s3Key);
    elements.push({
      frontal_image_url: signedUrl,
      reference_image_urls: [signedUrl],
    });
  }

  return elements;
}

// Build ref prompt suffix — Scene (exact/inspired) + Product/Outfit (always exact)
function buildRefPromptSuffix(refs: VideoRefAttachment[], elementOffset: number = 2): string {
  if (!refs.length) return "";

  let suffix = "";
  for (let i = 0; i < refs.length; i++) {
    const r = refs[i];
    const elementRef = `@Element${i + elementOffset}`;

    if (r.refType === "product") {
      suffix += ` Wearing/holding the exact item from ${elementRef}.`;
    } else if (r.mode === "exact") {
      suffix += ` Match the scene/background from ${elementRef} exactly.`;
    } else {
      suffix += ` Inspired by the scene/setting in ${elementRef}, with creative freedom.`;
    }

    if (r.description?.trim()) {
      suffix += ` ${r.description.trim()}.`;
    }
  }
  return suffix;
}

// ─── Video Prompt Enhancement ─────

async function enhanceVideoPrompt(rawInput: string): Promise<string> {
  if (rawInput.length > 120) return rawInput;

  try {
    const response = await grok.chat.completions.create({
      model: "grok-4-1-fast-non-reasoning",
      messages: [
        { role: "system", content: VIDEO_ENHANCE_PROMPT },
        { role: "user", content: rawInput },
      ],
    });
    const enhanced = response.choices?.[0]?.message?.content?.trim();
    if (enhanced && enhanced.length > 20) {
      console.log("[VIDEO ENHANCE] Input:", rawInput);
      console.log("[VIDEO ENHANCE] Output:", enhanced);
      return enhanced;
    }
  } catch (error) {
    console.error("Video enhance (Grok) failed:", error instanceof Error ? error.message : error);
  }

  // Fallback: Gemini Flash
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: rawInput,
      config: { systemInstruction: VIDEO_ENHANCE_PROMPT, safetySettings: SAFETY_OFF },
    });
    const enhanced = response.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    if (enhanced && enhanced.length > 20) return enhanced;
  } catch {
    // ignore
  }

  // Last resort: pass through with minimal motion guidance
  return `${rawInput}. Natural subtle movement, slight handheld camera shake. Warm lighting, candid atmosphere.`;
}

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
): Promise<{ videoKey: string; videoBuffer: Buffer }> {
  const response = await fetch(videoUrl);
  const videoBuffer = Buffer.from(await response.arrayBuffer());
  const timestamp = Date.now();
  const videoKey = `users/${userId}/creators/${creatorId}/content/video-${timestamp}.mp4`;
  await uploadImage(videoBuffer, videoKey, "video/mp4");
  return { videoKey, videoBuffer };
}

// ─── Generate Video from Image ─────

export async function generateVideoFromImage(
  creatorId: string,
  sourceContentId: string,
  prompt: string,
  duration: 5 | 10 = 5,
  aspectRatio: "9:16" | "1:1" | "16:9" = "9:16",
  refAttachments?: VideoRefAttachment[],
  quality: "standard" | "premium" = "standard"
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

  const isPremium = quality === "premium";
  const creditCost = isPremium
    ? (duration === 5 ? CREDIT_COSTS.VIDEO_5S_PREMIUM : CREDIT_COSTS.VIDEO_10S_PREMIUM)
    : (duration === 5 ? CREDIT_COSTS.VIDEO_5S : CREDIT_COSTS.VIDEO_10S);
  const totalCredits = user.planCredits + user.packCredits;
  if (totalCredits < creditCost) {
    return { success: false, error: `Not enough credits. Need ${creditCost}, have ${totalCredits}.` };
  }
  await deductCredits(user.id, creditCost, `Video: image-to-video ${duration}s ${isPremium ? "premium" : "standard"}`);

  const imageUrl = await getSignedImageUrl(sourceContent.url);
  const enhanced = await enhanceVideoPrompt(prompt);
  const i2vModel = isPremium
    ? "fal-ai/veo3.1/fast/image-to-video"
    : "fal-ai/kling-video/v3/standard/image-to-video";

  const job = await db.generationJob.create({
    data: {
      userId: user.id,
      type: "VIDEO_I2V",
      status: "QUEUED",
      provider: "fal-ai",
      modelId: i2vModel,
      input: JSON.parse(JSON.stringify({
        sourceContentId,
        prompt: enhanced,
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
      prompt: enhanced,
      userInput: prompt,
      creditsCost: creditCost,
      generationSettings: JSON.parse(JSON.stringify({
        videoType: "image-to-video",
        duration,
        videoModel: i2vModel,
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

  // Creator face as Element 1 for identity preservation + ref elements
  const creatorBaseUrl = creator?.baseImageUrl ? await getSignedImageUrl(creator.baseImageUrl) : null;
  const creatorElement = creatorBaseUrl ? [{
    frontal_image_url: creatorBaseUrl,
    reference_image_urls: [creatorBaseUrl],
  }] : [];
  const refElements = refAttachments?.length ? await refsToElements(refAttachments, 2) : [];
  const allElements = [...creatorElement, ...refElements].slice(0, 4);
  const refSuffix = refAttachments?.length ? buildRefPromptSuffix(refAttachments) : "";
  const basePrompt = enhanced || "natural subtle movement, cinematic";
  const finalPrompt = creatorElement.length > 0
    ? `@Element1. ${basePrompt}${refSuffix}`
    : `${basePrompt}${refSuffix}`;

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

  return { success: true, jobId: job.id, contentId: content.id };
}

// ─── Generate Video from Text ─────

export async function generateVideoFromText(
  creatorId: string,
  prompt: string,
  duration: 5 | 10 = 5,
  aspectRatio: "9:16" | "1:1" | "16:9" = "9:16",
  refAttachments?: VideoRefAttachment[],
  quality: "standard" | "premium" = "standard"
): Promise<VideoResult> {
  const user = await getAuthUser();
  if (!user) return { success: false, error: "Not authenticated" };

  const creator = await db.creator.findUnique({
    where: { id: creatorId, userId: user.id },
  });
  if (!creator || !creator.baseImageUrl) return { success: false, error: "Creator not found" };

  const isPremium = quality === "premium";
  const creditCost = isPremium
    ? (duration === 5 ? CREDIT_COSTS.VIDEO_5S_PREMIUM : CREDIT_COSTS.VIDEO_10S_PREMIUM)
    : (duration === 5 ? CREDIT_COSTS.VIDEO_5S : CREDIT_COSTS.VIDEO_10S);
  const totalCredits = user.planCredits + user.packCredits;
  if (totalCredits < creditCost) {
    return { success: false, error: `Not enough credits. Need ${creditCost}, have ${totalCredits}.` };
  }
  await deductCredits(user.id, creditCost, `Video: text-to-video ${duration}s ${isPremium ? "premium" : "standard"}`);

  const baseImageUrl = await getSignedImageUrl(creator.baseImageUrl);
  const enhanced = await enhanceVideoPrompt(prompt);
  // Standard: O3 ref-to-video (Kling, character identity). Premium: Veo 3.1 Fast.
  const modelId = isPremium
    ? "fal-ai/veo3.1/fast"
    : "fal-ai/kling-video/o3/pro/reference-to-video";
  const fullPrompt = isPremium ? enhanced : `@Element1. ${enhanced}`;

  const job = await db.generationJob.create({
    data: {
      userId: user.id,
      type: "VIDEO_T2V",
      status: "QUEUED",
      provider: "fal-ai",
      modelId,
      input: JSON.parse(JSON.stringify({ prompt: fullPrompt, duration, aspectRatio })),
      estimatedCost: duration * 0.14,
    },
  });

  const content = await db.content.create({
    data: {
      creatorId,
      type: "VIDEO",
      status: "GENERATING",
      source: "FREEFORM",
      prompt: enhanced,
      userInput: prompt,
      creditsCost: creditCost,
      generationSettings: JSON.parse(JSON.stringify({
        videoType: "text-to-video",
        duration,
        aspectRatio,
        videoModel: modelId,
        jobId: job.id,
      })),
    },
  });

  await db.generationJob.update({
    where: { id: job.id },
    data: { contentId: content.id },
  });

  const refSuffix = refAttachments?.length ? buildRefPromptSuffix(refAttachments) : "";

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

  const enhanced = prompt ? await enhanceVideoPrompt(prompt) : "replicate the movement naturally";

  // Upload creator image and reference video to Fal storage (S3 signed URLs may expire)
  const creatorImageBuffer = await getImageBuffer(creator.baseImageUrl);
  const falCreatorUrl = await fal.storage.upload(new Blob([new Uint8Array(creatorImageBuffer)], { type: "image/jpeg" }));

  const job = await db.generationJob.create({
    data: {
      userId: user.id,
      type: "VIDEO_MOTION",
      status: "QUEUED",
      provider: "fal-ai",
      modelId: "fal-ai/kling-video/v3/pro/motion-control",
      input: JSON.parse(JSON.stringify({ referenceVideoUrl, prompt: enhanced, duration })),
      estimatedCost: duration * 0.168,
    },
  });

  const content = await db.content.create({
    data: {
      creatorId,
      type: "VIDEO",
      status: "GENERATING",
      source: "FREEFORM",
      prompt: enhanced,
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

  const falModel = "fal-ai/kling-video/v3/pro/motion-control";
  const falInput = {
    video_url: referenceVideoUrl,
    image_url: falCreatorUrl,
    prompt: `@Element1. ${enhanced}`,
    character_orientation: "video",
    elements: [
      { frontal_image_url: falCreatorUrl, reference_image_urls: [falCreatorUrl] },
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

  return { success: true, jobId: job.id, contentId: content.id };
}

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

// ─── Check Video Job Status ─────

export async function checkVideoStatus(jobId: string): Promise<StatusResult> {
  const { userId: clerkId } = await auth();
  if (!clerkId) return { status: "FAILED", error: "Not authenticated" };

  // Auth check: only the job owner can poll status
  const user = await db.user.findUnique({ where: { clerkId } });
  if (!user) return { status: "FAILED", error: "Not authenticated" };

  const job = await db.generationJob.findFirst({
    where: { id: jobId, userId: user.id },
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

        // Race condition guard: claim the job before completing.
        // If two polls arrive simultaneously, only one will succeed here.
        const claimed = await db.generationJob.updateMany({
          where: { id: job.id, status: { not: "COMPLETED" } },
          data: { status: "COMPLETING" as never },
        });
        if (claimed.count === 0) {
          // Another poll already claimed it — re-read and return
          const updated = await db.content.findUnique({ where: { id: job.contentId! } });
          const signedUrl = updated?.url ? await getSignedImageUrl(updated.url) : undefined;
          const signedThumb = updated?.thumbnailUrl ? await getSignedImageUrl(updated.thumbnailUrl) : undefined;
          return { status: "COMPLETED", videoUrl: signedUrl, thumbnailUrl: signedThumb };
        }

        // Find the content to get creatorId for the S3 path
        const content = job.contentId
          ? await db.content.findUnique({ where: { id: job.contentId } })
          : null;
        const creatorId = content?.creatorId ?? "unknown";

        // Download from Fal CDN → upload to S3 (media URLs expire!)
        const { videoKey, videoBuffer } = await uploadVideoToS3(videoUrl, job.userId, creatorId);

        // For talking heads, use the pre-generated base image as thumbnail
        const jobOutput = job.output as Record<string, string> | null;
        let thumbKey: string | undefined = jobOutput?.imageKey;

        if (!thumbKey) {
          try {
            // Reuse the already-downloaded video buffer for thumbnail extraction
            const thumbBuffer = await extractFirstFrame(videoBuffer);
            if (thumbBuffer) {
              thumbKey = `users/${job.userId}/creators/${creatorId}/content/thumb-${Date.now()}.jpg`;
              await uploadImage(thumbBuffer, thumbKey, "image/jpeg");
            }
          } catch (err) {
            console.error(`[Video] Thumbnail extraction failed for ${job.id}:`, err);
          }
        }

        // Update DB
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

      // Still processing — but check timeout AFTER Fal check (avoid losing completed jobs)
      if (job.startedAt) {
        const elapsed = Date.now() - new Date(job.startedAt).getTime();
        if (elapsed > 10 * 60 * 1000) {
          console.log(`[Video] Job ${job.id} timed out after ${Math.round(elapsed / 1000)}s`);
          await failVideoJob(job.id, job.contentId, job.userId, "Generation timed out");
          return { status: "FAILED", error: "Generation timed out. Credits refunded." };
        }
      }

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
