"use server";

import { auth } from "@clerk/nextjs/server";
import { GoogleGenAI, HarmCategory, HarmBlockThreshold } from "@google/genai";
import { db } from "@/lib/db";
import { uploadImage, getSignedImageUrl, getImageBuffer } from "@/lib/s3";
import { deductCredits } from "./credit-actions";
import { stripAndRewrite } from "@/lib/ai/metadata-strip";
import { calculateCost, sumCosts } from "@/lib/cost";
import { CONTENT_ENHANCE_PROMPT } from "@/lib/prompts";
import OpenAI from "openai";
import type { ContentItem } from "@/types/content";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
const IMAGE_MODEL = "gemini-3-pro-image-preview";
const grok = new OpenAI({ apiKey: process.env.GROK_API_KEY!, baseURL: "https://api.x.ai/v1" });

const SAFETY_OFF = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
];

const CREDIT_PER_IMAGE = 1;

// ─── Prompt Builder (Content, not Wizard) ─────

type CreatorSettings = {
  gender?: string | null;
  age?: string | null;
  ethnicity?: string | null;
  skinTone?: number | null;
  hairColor?: string | null;
  hairLength?: string | null;
  hairTexture?: string | null;
  eyeColor?: string | null;
  eyeShape?: string | null;
  faceShape?: string | null;
  lips?: string | null;
  build?: string | null;
  features?: string[];
};

function buildContentPrompt(settings: CreatorSettings, enhancedPrompt: string): string {
  // Locked traits from creator settings — injected after the enhanced prompt
  const traitParts: string[] = [];
  if (settings.hairColor) traitParts.push(`${settings.hairColor.toLowerCase()} hair`);
  if (settings.hairLength) traitParts.push(`${settings.hairLength.toLowerCase()} length`);
  if (settings.eyeColor) traitParts.push(`${settings.eyeColor.toLowerCase()} eyes`);
  if (settings.build) traitParts.push(`${settings.build.toLowerCase()} build`);
  if (settings.ethnicity) traitParts.push(`${settings.ethnicity} ethnicity`);
  const traitDesc = traitParts.length > 0 ? ` Physical traits: ${traitParts.join(", ")}.` : "";

  return `${enhancedPrompt.trim()}${traitDesc} From the reference image.`;
}

// ─── Upload helper ─────

async function uploadBase64ToS3(
  base64Data: string,
  userId: string,
  creatorId: string,
  index: number
): Promise<string> {
  const raw = Buffer.from(base64Data, "base64");
  const clean = await stripAndRewrite(raw);
  const timestamp = Date.now();
  const key = `users/${userId}/creators/${creatorId}/content/${timestamp}-${index}.jpg`;
  await uploadImage(clean, key, "image/jpeg");
  return key;
}

// ─── Prompt Enhancement (Grok Fast → Gemini Flash fallback) ─────

async function enhanceContentPrompt(rawInput: string): Promise<string> {
  // Skip enhancement if the user already wrote a detailed prompt (60+ chars)
  if (rawInput.length > 120) return rawInput;

  try {
    const response = await grok.chat.completions.create({
      model: "grok-4-1-fast-non-reasoning",
      messages: [
        { role: "system", content: CONTENT_ENHANCE_PROMPT },
        { role: "user", content: rawInput },
      ],
    });
    const enhanced = response.choices?.[0]?.message?.content?.trim();
    if (enhanced && enhanced.length > 20) {
      console.log("[CONTENT ENHANCE] Input:", rawInput);
      console.log("[CONTENT ENHANCE] Output:", enhanced);
      return enhanced;
    }
  } catch (error) {
    console.error("Content enhance failed:", error instanceof Error ? error.message : error);
  }

  // Fallback: Gemini Flash
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: rawInput,
      config: { systemInstruction: CONTENT_ENHANCE_PROMPT, safetySettings: SAFETY_OFF },
    });
    const enhanced = response.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    if (enhanced && enhanced.length > 20) return enhanced;
  } catch {
    // ignore
  }

  // Last resort: minimal structure
  return `${rawInput}. Shot on iPhone, candid. Visible pores, photorealistic.`;
}

// ─── Generate Content ─────

type GenerateContentResult =
  | { success: true; content: ContentItem[] }
  | { success: false; error: string };

export async function generateContent(
  creatorId: string,
  userPrompt: string,
  imageCount: number = 1
): Promise<GenerateContentResult> {
  const { userId: clerkId } = await auth();
  if (!clerkId) return { success: false, error: "Not authenticated" };

  const user = await db.user.findUnique({ where: { clerkId } });
  if (!user) return { success: false, error: "User not found" };

  // Validate image count
  const count = Math.min(Math.max(Math.round(imageCount), 1), 4);
  const creditCost = count * CREDIT_PER_IMAGE;

  const totalCredits = user.planCredits + user.packCredits;
  if (totalCredits < creditCost) {
    return {
      success: false,
      error: `Not enough credits. Need ${creditCost}, have ${totalCredits}.`,
    };
  }

  // Load creator
  const creator = await db.creator.findUnique({
    where: { id: creatorId, userId: user.id },
  });
  if (!creator) return { success: false, error: "Creator not found" };

  const settings = (creator.settings ?? {}) as CreatorSettings;

  // Enhance the user's casual input into a detailed generation prompt
  const enhanced = await enhanceContentPrompt(userPrompt);
  const prompt = buildContentPrompt(settings, enhanced);

  try {
    // Download creator's base reference image from S3
    let baseImageBase64: string | null = null;
    if (creator.baseImageUrl) {
      try {
        const buf = await getImageBuffer(creator.baseImageUrl);
        baseImageBase64 = buf.toString("base64");
      } catch (e) {
        console.error("Failed to load base image for reference:", e);
      }
    }

    // Generate N images in parallel, passing reference image when available
    const imagePromises = Array.from({ length: count }, () =>
      ai.models.generateContent({
        model: IMAGE_MODEL,
        contents: baseImageBase64
          ? [
              { text: prompt },
              { inlineData: { mimeType: "image/jpeg", data: baseImageBase64 } },
            ]
          : prompt,
        config: {
          responseModalities: ["TEXT", "IMAGE"],
          safetySettings: SAFETY_OFF,
        },
      })
    );

    const startTime = new Date();
    const results = await Promise.allSettled(imagePromises);

    // Upload successful images to S3, track costs
    const s3Keys: string[] = [];
    const costs: number[] = [];
    let idx = 0;
    for (const result of results) {
      if (result.status === "fulfilled" && result.value.candidates?.[0]?.content?.parts) {
        let hasImage = false;
        for (const part of result.value.candidates[0].content.parts) {
          if (part.inlineData?.data) {
            const key = await uploadBase64ToS3(
              part.inlineData.data,
              user.id,
              creatorId,
              idx++
            );
            s3Keys.push(key);
            hasImage = true;
          }
        }
        if (hasImage) {
          costs.push(calculateCost(IMAGE_MODEL, result.value.usageMetadata, 1));
        }
      }
    }

    if (s3Keys.length === 0) {
      const errors = results
        .filter((r) => r.status === "rejected")
        .map((r) => (r as PromiseRejectedResult).reason?.message ?? "Unknown error");
      return {
        success: false,
        error: errors.length > 0
          ? `Generation failed: ${errors[0]}`
          : "No images generated. The model may have filtered the prompt.",
      };
    }

    // Deduct credits for images actually generated
    const creditCostActual = s3Keys.length * CREDIT_PER_IMAGE;
    await deductCredits(user.id, creditCostActual, `Content generation — ${s3Keys.length} image(s)`);

    // Create Content records
    const contentItems: ContentItem[] = [];

    for (let i = 0; i < s3Keys.length; i++) {
      const signedUrl = await getSignedImageUrl(s3Keys[i]);

      const content = await db.content.create({
        data: {
          creatorId,
          type: "IMAGE",
          status: "COMPLETED",
          url: s3Keys[i],
          outputs: JSON.parse(JSON.stringify([s3Keys[i]])),
          source: "FREEFORM",
          prompt,
          userInput: userPrompt,
          modelUsed: IMAGE_MODEL,
          creditsCost: CREDIT_PER_IMAGE,
        },
      });

      contentItems.push({
        id: content.id,
        creatorId: content.creatorId,
        type: "IMAGE",
        status: "COMPLETED",
        url: signedUrl,
        s3Keys: [s3Keys[i]],
        source: "FREEFORM",
        prompt,
        userInput: userPrompt,
        creditsCost: CREDIT_PER_IMAGE,
        createdAt: content.createdAt.toISOString(),
      });
    }

    // Log generation job with actual cost
    await db.generationJob.create({
      data: {
        userId: user.id,
        contentId: contentItems[0]?.id,
        type: "content_freeform",
        status: "COMPLETED",
        provider: "google",
        modelId: IMAGE_MODEL,
        input: JSON.parse(JSON.stringify({ creatorId, userPrompt, prompt, imageCount: count })),
        output: JSON.parse(JSON.stringify({ imageCount: s3Keys.length, s3Keys })),
        estimatedCost: 0.04 * count,
        actualCost: sumCosts(costs),
        startedAt: startTime,
        completedAt: new Date(),
      },
    });

    // Update creator stats
    await db.creator.update({
      where: { id: creatorId },
      data: {
        lastUsedAt: new Date(),
        contentCount: { increment: s3Keys.length },
      },
    });

    return { success: true, content: contentItems };
  } catch (error) {
    console.error("generateContent error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Content generation failed",
    };
  }
}

// ─── Get Creator Content ─────

export async function getCreatorContent(creatorId: string): Promise<ContentItem[]> {
  const { userId: clerkId } = await auth();
  if (!clerkId) return [];

  const user = await db.user.findUnique({ where: { clerkId } });
  if (!user) return [];

  const content = await db.content.findMany({
    where: { creatorId, creator: { userId: user.id } },
    orderBy: { createdAt: "desc" },
  });

  return Promise.all(
    content.map(async (c) => ({
      id: c.id,
      creatorId: c.creatorId,
      type: c.type as ContentItem["type"],
      status: c.status as ContentItem["status"],
      url: c.url ? await getSignedImageUrl(c.url) : undefined,
      s3Keys: (c.outputs as string[]) ?? [],
      source: c.source as ContentItem["source"],
      prompt: c.prompt ?? undefined,
      userInput: c.userInput ?? undefined,
      creditsCost: c.creditsCost,
      createdAt: c.createdAt.toISOString(),
    }))
  );
}

// ─── Delete Content ─────

export async function deleteContent(
  contentId: string
): Promise<{ success: boolean; error?: string }> {
  const { userId: clerkId } = await auth();
  if (!clerkId) return { success: false, error: "Not authenticated" };

  const user = await db.user.findUnique({ where: { clerkId } });
  if (!user) return { success: false, error: "User not found" };

  const content = await db.content.findUnique({
    where: { id: contentId },
    include: { creator: { select: { userId: true, id: true } } },
  });

  if (!content || content.creator.userId !== user.id) {
    return { success: false, error: "Content not found" };
  }

  await db.$transaction([
    db.content.delete({ where: { id: contentId } }),
    db.creator.update({
      where: { id: content.creatorId },
      data: { contentCount: { decrement: 1 } },
    }),
  ]);

  return { success: true };
}

// ─── Recent Content (for Studio history) ─────

export async function getRecentContent(
  creatorId: string,
  limit: number = 8
): Promise<ContentItem[]> {
  const { userId: clerkId } = await auth();
  if (!clerkId) return [];

  const items = await db.content.findMany({
    where: {
      creatorId,
      creator: { user: { clerkId } },
      status: "COMPLETED",
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return Promise.all(
    items.map(async (item) => ({
      id: item.id,
      creatorId: item.creatorId,
      type: item.type as ContentItem["type"],
      status: item.status as ContentItem["status"],
      url: item.url ? await getSignedImageUrl(item.url) : undefined,
      thumbnailUrl: item.thumbnailUrl ? await getSignedImageUrl(item.thumbnailUrl) : undefined,
      s3Keys: (item.outputs as string[]) ?? [],
      source: item.source as ContentItem["source"],
      prompt: item.prompt ?? undefined,
      userInput: item.userInput ?? undefined,
      creditsCost: item.creditsCost,
      createdAt: item.createdAt.toISOString(),
      contentSetId: item.contentSetId ?? undefined,
      slideIndex: item.slideIndex ?? undefined,
    }))
  );
}
