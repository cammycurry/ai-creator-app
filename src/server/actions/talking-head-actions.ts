"use server";

import { auth } from "@clerk/nextjs/server";
import { GoogleGenAI, HarmCategory, HarmBlockThreshold } from "@google/genai";
import { db } from "@/lib/db";
import { fal } from "@/lib/fal";
import { uploadImage, getSignedImageUrl, getImageBuffer } from "@/lib/s3";
import { generateSpeech } from "@/lib/elevenlabs";
import { deductCredits, refundCredits } from "./credit-actions";
import { CREDIT_COSTS } from "@/types/credits";
import { PLATFORM_VOICES, type PlatformVoice } from "@/data/voices";
import { REALISM_BASE } from "@/lib/prompts";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
const IMAGE_MODEL = "gemini-3-pro-image-preview";

const SAFETY_OFF = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
];

type TalkingHeadResult =
  | { success: true; jobId: string; contentId: string }
  | { success: false; error: string };

// ─── Get Available Voices ─────

export async function getAvailableVoices(): Promise<PlatformVoice[]> {
  return PLATFORM_VOICES;
}

// ─── Generate Talking Head ─────

export async function generateTalkingHead(
  creatorId: string,
  script: string,
  voiceId: string,
  setting?: string,
  duration?: 15 | 30
): Promise<TalkingHeadResult> {
  const { userId: clerkId } = await auth();
  if (!clerkId) return { success: false, error: "Not authenticated" };

  const user = await db.user.findUnique({ where: { clerkId } });
  if (!user) return { success: false, error: "User not found" };

  const creator = await db.creator.findUnique({
    where: { id: creatorId, userId: user.id },
  });
  if (!creator || !creator.baseImageUrl) return { success: false, error: "Creator not found" };

  if (!script.trim()) return { success: false, error: "Script is required" };
  if (script.length > 2000) return { success: false, error: "Script too long (max 2000 characters)" };

  const dur = duration ?? 15;
  const creditCost = dur === 30 ? CREDIT_COSTS.TALKING_HEAD_30S : CREDIT_COSTS.TALKING_HEAD;
  const totalCredits = user.planCredits + user.packCredits;
  if (totalCredits < creditCost) {
    return { success: false, error: `Not enough credits. Need ${creditCost}, have ${totalCredits}.` };
  }

  await deductCredits(user.id, creditCost, `Talking head: ${dur}s`);

  const job = await db.generationJob.create({
    data: {
      userId: user.id,
      type: "TALKING_HEAD",
      status: "QUEUED",
      provider: "fal-ai",
      modelId: "fal-ai/kling-video/lipsync/audio-to-video",
      input: JSON.parse(JSON.stringify({ script, voiceId, setting, duration: dur })),
    },
  });

  const content = await db.content.create({
    data: {
      creatorId,
      type: "TALKING_HEAD",
      status: "GENERATING",
      source: "FREEFORM",
      prompt: script,
      userInput: script,
      creditsCost: creditCost,
      generationSettings: JSON.parse(JSON.stringify({
        videoType: "talking-head",
        duration: dur,
        voiceId,
        setting,
        jobId: job.id,
      })),
    },
  });

  await db.generationJob.update({
    where: { id: job.id },
    data: { contentId: content.id },
  });

  processTalkingHead(job.id, content.id, user.id, creator, script, voiceId, setting, dur)
    .catch((err) => console.error("Talking head job failed:", err));

  return { success: true, jobId: job.id, contentId: content.id };
}

// ─── Internal Pipeline ─────

async function processTalkingHead(
  jobId: string,
  contentId: string,
  userId: string,
  creator: { id: string; baseImageUrl: string | null; settings: unknown },
  script: string,
  voiceId: string,
  setting: string | undefined,
  duration: number
) {
  try {
    await db.generationJob.update({
      where: { id: jobId },
      data: { status: "PROCESSING", startedAt: new Date() },
    });

    // Step 1: Generate voice audio via ElevenLabs → upload to S3
    const audioBuffer = await generateSpeech(script, voiceId);
    const audioKey = `users/${userId}/creators/${creator.id}/content/audio-${Date.now()}.mp3`;
    await uploadImage(audioBuffer, audioKey, "audio/mpeg");
    const audioUrl = await getSignedImageUrl(audioKey);

    // Step 2: Generate talking-head base image via Gemini → upload to S3
    const gender = ((creator.settings as Record<string, string>)?.gender ?? "Female").toLowerCase();
    const subject = gender === "male" ? "man" : "woman";
    const settingDesc = setting ? `${setting}.` : "Clean, well-lit indoor setting.";

    const talkingHeadPrompt = [
      `That exact ${subject} from the reference image.`,
      `Front-facing, slight head tilt, mouth slightly parted as if mid-sentence, natural expression.`,
      `Warm lighting on face. ${settingDesc}`,
      `Shot on iPhone, candid. ${REALISM_BASE}.`,
    ].join(" ");

    const refBuffer = await getImageBuffer(creator.baseImageUrl!);
    const refBase64 = refBuffer.toString("base64");

    const imageResponse = await ai.models.generateContent({
      model: IMAGE_MODEL,
      contents: [
        { text: talkingHeadPrompt },
        { inlineData: { mimeType: "image/jpeg", data: refBase64 } },
      ],
      config: { responseModalities: ["TEXT", "IMAGE"], safetySettings: SAFETY_OFF },
    });

    const imagePart = imageResponse.candidates?.[0]?.content?.parts?.find(
      (p: { inlineData?: { data?: string } }) => p.inlineData?.data
    );
    if (!imagePart?.inlineData?.data) throw new Error("Failed to generate talking head image");

    const imageBuffer = Buffer.from(imagePart.inlineData.data, "base64");
    const imageKey = `users/${userId}/creators/${creator.id}/content/talkhead-${Date.now()}.jpg`;
    await uploadImage(imageBuffer, imageKey, "image/jpeg");
    const imageUrl = await getSignedImageUrl(imageKey);

    // Step 3: Lip sync via Kling on Fal.ai
    // The Kling lipsync endpoint expects video_url at runtime but also accepts image URLs;
    // we cast to avoid a type mismatch on the static image_url field.
    const lipSyncResult = await fal.subscribe("fal-ai/kling-video/lipsync/audio-to-video", {
      input: {
        video_url: imageUrl,
        audio_url: audioUrl,
      } as { video_url: string; audio_url: string },
    });

    const output = lipSyncResult.data as { video?: { url?: string }; video_url?: string };
    const videoUrl = output?.video?.url ?? output?.video_url;
    if (!videoUrl) throw new Error("No video URL from lip sync");

    // Step 4: Download final video → upload to S3
    const videoResponse = await fetch(videoUrl);
    const videoBuffer = Buffer.from(await videoResponse.arrayBuffer());
    const videoKey = `users/${userId}/creators/${creator.id}/content/talkhead-video-${Date.now()}.mp4`;
    await uploadImage(videoBuffer, videoKey, "video/mp4");

    await db.content.update({
      where: { id: contentId },
      data: {
        status: "COMPLETED",
        url: videoKey,
        thumbnailUrl: imageKey,
        outputs: JSON.parse(JSON.stringify([videoKey, audioKey, imageKey])),
      },
    });

    await db.generationJob.update({
      where: { id: jobId },
      data: {
        status: "COMPLETED",
        completedAt: new Date(),
        output: JSON.parse(JSON.stringify({ videoKey, audioKey, imageKey })),
      },
    });
  } catch (error) {
    console.error(`Talking head job ${jobId} failed:`, error);

    const content = await db.content.findUnique({ where: { id: contentId } });
    if (content) {
      await refundCredits(userId, content.creditsCost, "Talking head refund: generation failed", contentId);
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
