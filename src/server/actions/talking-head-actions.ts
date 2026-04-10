"use server";

import { auth } from "@clerk/nextjs/server";
import { GoogleGenAI, HarmCategory, HarmBlockThreshold } from "@google/genai";
import { db } from "@/lib/db";
import { fal } from "@/lib/fal";
import { uploadImage, getImageBuffer } from "@/lib/s3";
import { generateSpeech } from "@/lib/elevenlabs";
import { deductCredits, refundCredits } from "./credit-actions";
import { CREDIT_COSTS } from "@/types/credits";
import { PLATFORM_VOICES, type PlatformVoice } from "@/data/voices";
import { REALISM_CONTENT } from "@/lib/prompts";

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

  return { success: true, jobId: job.id, contentId: content.id };
}
