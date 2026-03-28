"use server";

import { auth } from "@clerk/nextjs/server";
import {
  GoogleGenAI,
  HarmCategory,
  HarmBlockThreshold,
} from "@google/genai";
import OpenAI from "openai";
import * as fs from "fs";
import * as path from "path";
import { db } from "@/lib/db";
import { deductCredits } from "./credit-actions";
import { uploadImage, getSignedImageUrl, getImageBuffer } from "@/lib/s3";
import { stripAndRewrite } from "@/lib/ai/metadata-strip";
import type { StudioTraits } from "@/stores/studio-store";
import {
  buildWizardPrompt,
  buildVariationPrompt,
  buildReferencePrompt,
  ENHANCE_SYSTEM_PROMPT,
  wrapWithSilhouette,
  wrapWithSilhouetteAndRefs,
  softenPrompt,
  fallbackEnhance,
} from "@/lib/prompts";

// Gemini client — Nano Banana Pro (image generation)
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

// Grok client — fast, non-reasoning for prompt enhancement
const grok = new OpenAI({
  apiKey: process.env.GROK_API_KEY!,
  baseURL: "https://api.x.ai/v1",
});

// Composition template — silhouette that locks framing/pose
const TEMPLATE_PATH = path.join(process.cwd(), "src/assets/composition-template.jpg");
let _templateBase64: string | null = null;
function getTemplateRef(): { mimeType: string; data: string } {
  if (!_templateBase64) {
    _templateBase64 = fs.readFileSync(TEMPLATE_PATH).toString("base64");
  }
  return { mimeType: "image/jpeg", data: _templateBase64 };
}

const CREATOR_WIZARD_CREDIT_COST = 5;

// Nano Banana Pro — best realism, thinking mode, 4K native
const IMAGE_MODEL = "gemini-3-pro-image-preview";

// Disable all safety filters — we're generating portraits, not harmful content
const SAFETY_OFF = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
];

// ─── Prompt Enhancement (Grok Fast → Gemini Flash fallback) ─────

async function enhanceDescribePrompt(rawDescription: string): Promise<string> {
  // Try Grok fast first, fall back to Gemini Flash
  try {
    const response = await grok.chat.completions.create({
      model: "grok-4-1-fast-non-reasoning",
      messages: [
        { role: "system", content: ENHANCE_SYSTEM_PROMPT },
        { role: "user", content: rawDescription },
      ],
    });

    const enhanced = response.choices?.[0]?.message?.content?.trim();
    if (enhanced && enhanced.length > 20) {
      console.log("[GROK FAST] Input:", rawDescription);
      console.log("[GROK FAST] Output:", enhanced);
      return enhanced;
    }
  } catch (error) {
    console.error("Grok failed, trying Gemini Flash fallback:", error instanceof Error ? error.message : error);
  }

  // Fallback: Gemini Flash
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: rawDescription,
      config: {
        systemInstruction: ENHANCE_SYSTEM_PROMPT,
        safetySettings: SAFETY_OFF,
      },
    });

    const enhanced = response.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    if (enhanced && enhanced.length > 20) {
      console.log("[FLASH ENHANCE] Input:", rawDescription);
      console.log("[FLASH ENHANCE] Output:", enhanced);
      return enhanced;
    }
  } catch (error) {
    console.error("Flash fallback also failed:", error instanceof Error ? error.message : error);
  }

  // Last resort: wrap raw description in minimal structure
  console.log("[ENHANCE] All failed, using structured fallback");
  return fallbackEnhance(rawDescription);
}

// Extract image from Gemini response, with optional safety retry
async function generateWithRetry(
  prompt: string,
  referenceImages?: { mimeType: string; data: string }[]
): Promise<{ data: string } | null> {
  const contents = referenceImages && referenceImages.length > 0
    ? [{ text: prompt }, ...referenceImages.map((ref) => ({ inlineData: ref }))]
    : prompt;

  try {
    const response = await ai.models.generateContent({
      model: IMAGE_MODEL,
      contents,
      config: {
        responseModalities: ["TEXT", "IMAGE"],
        safetySettings: SAFETY_OFF,
      },
    });

    const part = response.candidates?.[0]?.content?.parts?.find(
      (p: { inlineData?: { data?: string } }) => p.inlineData?.data
    );
    if (part?.inlineData?.data) {
      return { data: part.inlineData.data };
    }

    // Possibly filtered — retry with softened prompt
    const softened = softenPrompt(prompt);
    if (softened === prompt) return null;

    const retryContents = referenceImages && referenceImages.length > 0
      ? [{ text: softened }, ...referenceImages.map((ref) => ({ inlineData: ref }))]
      : softened;

    const retry = await ai.models.generateContent({
      model: IMAGE_MODEL,
      contents: retryContents,
      config: {
        responseModalities: ["TEXT", "IMAGE"],
        safetySettings: SAFETY_OFF,
      },
    });

    const retryPart = retry.candidates?.[0]?.content?.parts?.find(
      (p: { inlineData?: { data?: string } }) => p.inlineData?.data
    );
    return retryPart?.inlineData?.data ? { data: retryPart.inlineData.data } : null;
  } catch {
    return null;
  }
}

// ─── Upload base64 image to S3 ───────────────────────

async function uploadBase64ToS3(
  base64Data: string,
  userId: string,
  index: number
): Promise<string> {
  const raw = Buffer.from(base64Data, "base64");
  const clean = await stripAndRewrite(raw);
  const timestamp = Date.now();
  const key = `users/${userId}/creators/wizard/${timestamp}-${index}.jpg`;
  await uploadImage(clean, key, "image/jpeg");
  return key;
}

// ─── Generate Creator Images via Gemini ──────────────

type GenerateResult =
  | { success: true; images: string[]; keys: string[] }
  | { success: false; error: string };

type SingleResult =
  | { success: true; image: string; key: string }
  | { success: false; error: string };

/**
 * Generate 4 creator images in parallel using the silhouette composition template.
 * All 4 use the same prompt + template, so they look like the same person.
 * Deducts credits and logs the job.
 */
export async function generateCreatorImages(
  traits: StudioTraits,
  description?: string,
  count: number = 4
): Promise<GenerateResult> {
  const { userId: clerkId } = await auth();
  if (!clerkId) return { success: false, error: "Not authenticated" };

  const user = await db.user.findUnique({ where: { clerkId } });
  if (!user) return { success: false, error: "User not found" };

  const totalCredits = user.planCredits + user.packCredits;
  if (totalCredits < CREATOR_WIZARD_CREDIT_COST) {
    return {
      success: false,
      error: `Not enough credits. Need ${CREATOR_WIZARD_CREDIT_COST}, have ${totalCredits}.`,
    };
  }

  let prompt: string;
  if (description?.trim()) {
    prompt = await enhanceDescribePrompt(description);
  } else {
    prompt = buildWizardPrompt(traits);
  }

  try {
    const templateRef = getTemplateRef();
    const refPrompt = wrapWithSilhouette(prompt);

    // Generate all images in parallel with the silhouette template
    const results = await Promise.all(
      Array.from({ length: count }, () =>
        generateWithRetry(refPrompt, [templateRef])
      )
    );

    const s3Keys: string[] = [];
    for (let i = 0; i < results.length; i++) {
      if (results[i]) {
        const key = await uploadBase64ToS3(results[i]!.data, user.id, i);
        s3Keys.push(key);
      }
    }

    if (s3Keys.length === 0) {
      return { success: false, error: "This look couldn't be generated. Try adjusting your description." };
    }

    const images = await Promise.all(s3Keys.map((key) => getSignedImageUrl(key)));

    await deductCredits(
      user.id,
      CREATOR_WIZARD_CREDIT_COST,
      "Creator wizard — generate reference images"
    );

    await db.generationJob.create({
      data: {
        userId: user.id,
        type: "creator_wizard",
        status: "COMPLETED",
        provider: "google",
        modelId: IMAGE_MODEL,
        input: JSON.parse(JSON.stringify({ traits })),
        output: JSON.parse(JSON.stringify({ imageCount: s3Keys.length, s3Keys })),
        estimatedCost: 0.02 * count,
        completedAt: new Date(),
      },
    });

    return { success: true, images, keys: s3Keys };
  } catch (error) {
    console.error("generateCreatorImages error:", error);
    return { success: false, error: "Image generation failed. Please try again." };
  }
}

// ─── Generate Creator Images with User-Provided Reference Photos ─────

export async function generateCreatorImagesWithRef(
  traits: StudioTraits,
  description: string | undefined,
  referenceData: { slot: "face" | "body" | "full"; base64: string; mimeType: string }[],
  mode: "exact" | "inspired",
  count: number = 4
): Promise<GenerateResult> {
  const { userId: clerkId } = await auth();
  if (!clerkId) return { success: false, error: "Not authenticated" };

  const user = await db.user.findUnique({ where: { clerkId } });
  if (!user) return { success: false, error: "User not found" };

  const totalCredits = user.planCredits + user.packCredits;
  if (totalCredits < CREATOR_WIZARD_CREDIT_COST) {
    return { success: false, error: `Not enough credits. Need ${CREATOR_WIZARD_CREDIT_COST}, have ${totalCredits}.` };
  }

  const slots = referenceData.map((r) => r.slot);
  const prompt = buildReferencePrompt(traits, description, mode, slots);

  // Combine composition template + user reference images
  const templateRef = getTemplateRef();
  const refImages = [
    templateRef,
    ...referenceData.map((r) => ({ mimeType: r.mimeType, data: r.base64 })),
  ];

  // Wrap prompt with silhouette + reference image instructions
  const fullPrompt = wrapWithSilhouetteAndRefs(prompt);

  try {
    const results = await Promise.all(
      Array.from({ length: count }, () =>
        generateWithRetry(fullPrompt, refImages)
      )
    );

    const s3Keys: string[] = [];
    for (let i = 0; i < results.length; i++) {
      if (results[i]) {
        const key = await uploadBase64ToS3(results[i]!.data, user.id, i);
        s3Keys.push(key);
      }
    }

    if (s3Keys.length === 0) {
      return { success: false, error: "This look couldn't be generated. Try adjusting your description." };
    }

    const images = await Promise.all(s3Keys.map((key) => getSignedImageUrl(key)));

    await deductCredits(user.id, CREATOR_WIZARD_CREDIT_COST, "Creator wizard — generate with reference");

    await db.generationJob.create({
      data: {
        userId: user.id,
        type: "creator_wizard",
        status: "COMPLETED",
        provider: "google",
        modelId: IMAGE_MODEL,
        input: JSON.parse(JSON.stringify({ traits, mode, refSlots: slots })),
        output: JSON.parse(JSON.stringify({ imageCount: s3Keys.length, s3Keys })),
        estimatedCost: 0.02 * count,
        completedAt: new Date(),
      },
    });

    return { success: true, images, keys: s3Keys };
  } catch (error) {
    console.error("generateCreatorImagesWithRef error:", error);
    return { success: false, error: "Image generation failed. Please try again." };
  }
}

// ─── "More Like This" — generate variations from a reference image ───

export async function generateMoreLikeThis(
  traits: StudioTraits,
  referenceKey: string,
  count: number = 4,
  refinement?: string
): Promise<GenerateResult> {
  const { userId: clerkId } = await auth();
  if (!clerkId) return { success: false, error: "Not authenticated" };

  const user = await db.user.findUnique({ where: { clerkId } });
  if (!user) return { success: false, error: "User not found" };

  const totalCredits = user.planCredits + user.packCredits;
  if (totalCredits < CREATOR_WIZARD_CREDIT_COST) {
    return {
      success: false,
      error: `Not enough credits. Need ${CREATOR_WIZARD_CREDIT_COST}, have ${totalCredits}.`,
    };
  }

  try {
    const refBuffer = await getImageBuffer(referenceKey);
    const refBase64 = refBuffer.toString("base64");
    const referenceImage = { mimeType: "image/jpeg" as const, data: refBase64 };

    const prompt = buildVariationPrompt(traits, refinement);

    const imagePromises = Array.from({ length: count }, () =>
      generateWithRetry(prompt, [referenceImage])
    );

    const results = await Promise.all(imagePromises);

    const s3Keys: string[] = [];
    for (let i = 0; i < results.length; i++) {
      if (results[i]) {
        const key = await uploadBase64ToS3(results[i]!.data, user.id, i);
        s3Keys.push(key);
      }
    }

    if (s3Keys.length === 0) {
      return { success: false, error: "Couldn't generate variations. Try again." };
    }

    const images = await Promise.all(s3Keys.map((key) => getSignedImageUrl(key)));

    await deductCredits(user.id, CREATOR_WIZARD_CREDIT_COST, "Creator wizard — more like this");

    return { success: true, images, keys: s3Keys };
  } catch (error) {
    console.error("generateMoreLikeThis error:", error);
    return { success: false, error: "Generation failed. Please try again." };
  }
}

// ─── Finalize Creator ─────────────────────────────────

type FinalizeResult =
  | { success: true; creatorId: string }
  | { success: false; error: string };

export async function finalizeCreator(data: {
  name: string;
  niche: string[];
  baseImageUrl: string;
  traits: StudioTraits;
}): Promise<FinalizeResult> {
  const { userId: clerkId } = await auth();
  if (!clerkId) {
    return { success: false, error: "Not authenticated" };
  }

  const user = await db.user.findUnique({ where: { clerkId } });
  if (!user) {
    return { success: false, error: "User not found" };
  }

  if (!data.name.trim()) {
    return { success: false, error: "Creator name is required" };
  }

  try {
    const creator = await db.creator.create({
      data: {
        userId: user.id,
        name: data.name.trim(),
        niche: data.niche,
        baseImageUrl: data.baseImageUrl,
        settings: data.traits as unknown as Record<string, string | number | boolean | null>,
        referenceImages: [
          { type: "base", url: data.baseImageUrl },
        ] as unknown as Record<string, string>[],
      },
    });

    return { success: true, creatorId: creator.id };
  } catch (error) {
    console.error("finalizeCreator error:", error);
    return { success: false, error: "Failed to create creator" };
  }
}
