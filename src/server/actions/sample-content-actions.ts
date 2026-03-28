"use server";

import { auth } from "@clerk/nextjs/server";
import { GoogleGenAI, HarmCategory, HarmBlockThreshold } from "@google/genai";
import { db } from "@/lib/db";
import { deductCredits } from "./credit-actions";
import { uploadImage, getSignedImageUrl, getImageBuffer } from "@/lib/s3";
import { stripAndRewrite } from "@/lib/ai/metadata-strip";
import { buildSampleContentPrompts } from "@/lib/prompts";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
const IMAGE_MODEL = "gemini-3-pro-image-preview";
const SAMPLE_CREDIT_COST = 3;

const SAFETY_OFF = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
];

export async function generateSampleContent(
  creatorId: string
): Promise<{ success: boolean; error?: string }> {
  const { userId: clerkId } = await auth();
  if (!clerkId) return { success: false, error: "Not authenticated" };

  const user = await db.user.findUnique({ where: { clerkId } });
  if (!user) return { success: false, error: "User not found" };

  const creator = await db.creator.findUnique({ where: { id: creatorId, userId: user.id } });
  if (!creator) return { success: false, error: "Creator not found" };

  // Check if this is the user's first creator — free sample content
  const creatorCount = await db.creator.count({ where: { userId: user.id } });
  const isFirstCreator = creatorCount <= 1;

  if (!creator.baseImageUrl) return { success: false, error: "Creator has no base image" };

  // Get the base image as reference
  const refBuffer = await getImageBuffer(creator.baseImageUrl);
  const refBase64 = refBuffer.toString("base64");
  const refImage = { mimeType: "image/jpeg", data: refBase64 };

  const gender = (creator.settings as Record<string, string>)?.gender ?? null;
  const prompts = buildSampleContentPrompts(gender);
  const SCENE_LABELS = ["Coffee Shop", "Gym", "Going Out"];

  try {
    const results = await Promise.allSettled(
      prompts.map((prompt) =>
        ai.models.generateContent({
          model: IMAGE_MODEL,
          contents: [{ text: prompt }, { inlineData: refImage }],
          config: {
            responseModalities: ["TEXT", "IMAGE"],
            safetySettings: SAFETY_OFF,
          },
        })
      )
    );

    let savedCount = 0;
    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      if (result.status !== "fulfilled") continue;

      const imagePart = result.value.candidates?.[0]?.content?.parts?.find(
        (p: { inlineData?: { data?: string } }) => p.inlineData?.data
      );
      if (!imagePart?.inlineData?.data) continue;

      const raw = Buffer.from(imagePart.inlineData.data, "base64");
      const clean = await stripAndRewrite(raw);
      const key = `users/${user.id}/creators/${creatorId}/content/sample-${Date.now()}-${i}.jpg`;
      await uploadImage(clean, key, "image/jpeg");

      const url = await getSignedImageUrl(key);

      await db.content.create({
        data: {
          creatorId: creator.id,
          type: "IMAGE",
          status: "COMPLETED",
          url,
          outputs: JSON.parse(JSON.stringify([key])),
          source: "FREEFORM",
          prompt: prompts[i],
          creditsCost: isFirstCreator ? 0 : 1,
        },
      });

      savedCount++;
    }

    // Deduct credits (skip for first creator)
    if (!isFirstCreator && savedCount > 0) {
      await deductCredits(user.id, Math.min(savedCount, SAMPLE_CREDIT_COST), "Sample content generation");
    }

    return { success: true };
  } catch (error) {
    console.error("generateSampleContent error:", error);
    return { success: false, error: "Sample content generation failed" };
  }
}
