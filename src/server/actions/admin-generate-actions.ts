"use server";

import { auth } from "@clerk/nextjs/server";
import {
  GoogleGenAI,
  HarmCategory,
  HarmBlockThreshold,
} from "@google/genai";
import OpenAI from "openai";
import { db } from "@/lib/db";
import { uploadImage, getSignedImageUrl, getImageBuffer } from "@/lib/s3";
import { stripAndRewrite } from "@/lib/ai/metadata-strip";
import { softenPrompt, wrapWithSilhouette } from "@/lib/prompts";
import * as fs from "fs";
import * as path from "path";

// Composition template — same as generate-actions.ts
const TEMPLATE_PATH = path.join(process.cwd(), "src/assets/composition-template.jpg");
let _templateBase64: string | null = null;
function getTemplateRef(): { mimeType: string; data: string } {
  if (!_templateBase64) {
    _templateBase64 = fs.readFileSync(TEMPLATE_PATH).toString("base64");
  }
  return { mimeType: "image/jpeg", data: _templateBase64 };
}

// ─── Auth ────────────────────────────────────────────

async function assertAdmin() {
  const { userId } = await auth();
  if (!userId || userId !== process.env.ADMIN_CLERK_ID) {
    throw new Error("Unauthorized");
  }
  return userId;
}

// ─── AI Clients ──────────────────────────────────────

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
const grok = new OpenAI({
  apiKey: process.env.GROK_API_KEY!,
  baseURL: "https://api.x.ai/v1",
});

const IMAGE_MODEL = "gemini-3-pro-image-preview";
const SAFETY_OFF = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
];

// ─── Meta-Prompting ──────────────────────────────────
// Uses Grok to write the actual Gemini prompt from metadata

const REFERENCE_META_PROMPT = `You are an expert at writing image generation prompts for Gemini (Google's image model).

You will receive metadata about an Instagram post (setting, outfit, lighting, pose, caption, alt text) and a TYPE of reference to extract.

Write a prompt that generates a CLEAN reference image of the specified type. Rules:
- For BACKGROUND: describe the scene/location WITHOUT any people. Empty space, natural lighting, photorealistic.
- For OUTFIT: describe the clothing on a neutral background or mannequin. No person wearing it. Product-style shot.
- For POSE: describe a body silhouette or pose reference. Minimal detail, focus on body position.
- For PRODUCT: describe any product visible in the photo. Clean product photography style.
- For CUSTOM: use the provided description directly.

Output ONLY the prompt text. No explanations, no quotes, no markdown. 40-80 words max.
Always end with: "High quality, photorealistic, clean reference image."`;

const CREATOR_META_PROMPT = `You are an expert at writing AI portrait generation prompts for Gemini (Google's image model).

Given metadata about an Instagram influencer (their look, style, vibe, niche), write a prompt that generates a NEW, UNIQUE person INSPIRED by their aesthetic but clearly a different individual.

Rules:
- Lead with energy/vibe words: "Sexy confident", "Sultry gorgeous", "Fierce stunning"
- Format: [vibe words] [age]-year-old [ethnicity] [gender], [hair], [eyes], [expression]. [body]. [clothing]. Canon EOS R5. Visible pores, photorealistic.
- 40-80 words max
- NEVER copy the real person — create someone new with a similar vibe
- Include "Canon EOS R5" and "Visible pores, photorealistic" at the end
- CRITICAL: Do NOT use these words (they trigger safety filters): lingerie, lace, shirtless, bikini, revealing, provocative, seductive, skimpy, nude, naked, topless, underwear. Instead use: "fitted top", "tight outfit", "form-fitting dress", "sports bra", "crop top".
- Output ONLY the prompt text. No explanations.`;

async function metaPrompt(systemPrompt: string, userInput: string): Promise<string> {
  // Try Grok first
  try {
    const response = await grok.chat.completions.create({
      model: "grok-4-1-fast-non-reasoning",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userInput },
      ],
    });
    const result = response.choices?.[0]?.message?.content?.trim();
    if (result && result.length > 20) return result;
  } catch (e) {
    console.warn("[admin-gen] Grok meta-prompt failed:", e instanceof Error ? e.message : e);
  }

  // Fallback to Gemini Flash
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: userInput,
      config: { systemInstruction: systemPrompt, safetySettings: SAFETY_OFF },
    });
    const result = response.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    if (result && result.length > 20) return result;
  } catch (e) {
    console.warn("[admin-gen] Flash meta-prompt failed:", e instanceof Error ? e.message : e);
  }

  return userInput; // fallback: use raw input
}

// ─── Build prompt from source post metadata ──────────

async function buildSmartPrompt(
  type: string,
  sourcePost?: {
    setting: string | null;
    outfit: string | null;
    lighting: string | null;
    pose: string | null;
    caption: string | null;
    altText: string | null;
  },
  customDescription?: string
): Promise<string> {
  const parts: string[] = [];
  parts.push(`Type: ${type}`);

  if (sourcePost) {
    if (sourcePost.setting) parts.push(`Setting: ${sourcePost.setting}`);
    if (sourcePost.outfit) parts.push(`Outfit: ${sourcePost.outfit}`);
    if (sourcePost.lighting) parts.push(`Lighting: ${sourcePost.lighting}`);
    if (sourcePost.pose) parts.push(`Pose: ${sourcePost.pose}`);
    if (sourcePost.altText) parts.push(`Image description: ${sourcePost.altText}`);
    if (sourcePost.caption) parts.push(`Caption: ${sourcePost.caption.substring(0, 200)}`);
  }

  if (customDescription) parts.push(`Additional notes: ${customDescription}`);

  return metaPrompt(REFERENCE_META_PROMPT, parts.join("\n"));
}

// ─── Generate with Safety Retry ──────────────────────

async function adminGenerateWithRetry(
  prompt: string,
  referenceImages: { mimeType: string; data: string }[]
): Promise<string | null> {
  const contents =
    referenceImages.length > 0
      ? [{ text: prompt }, ...referenceImages.map((ref) => ({ inlineData: ref }))]
      : prompt;

  try {
    const response = await ai.models.generateContent({
      model: IMAGE_MODEL,
      contents,
      config: { responseModalities: ["TEXT", "IMAGE"], safetySettings: SAFETY_OFF },
    });

    const part = response.candidates?.[0]?.content?.parts?.find(
      (p: { inlineData?: { data?: string } }) => p.inlineData?.data
    );
    if (part?.inlineData?.data) return part.inlineData.data;

    // Possibly safety-filtered — retry with softened prompt
    const softened = softenPrompt(prompt);
    if (softened === prompt) return null;

    console.log("[admin-gen] Retrying with softened prompt...");
    const retryContents =
      referenceImages.length > 0
        ? [{ text: softened }, ...referenceImages.map((ref) => ({ inlineData: ref }))]
        : softened;

    const retry = await ai.models.generateContent({
      model: IMAGE_MODEL,
      contents: retryContents,
      config: { responseModalities: ["TEXT", "IMAGE"], safetySettings: SAFETY_OFF },
    });

    const retryPart = retry.candidates?.[0]?.content?.parts?.find(
      (p: { inlineData?: { data?: string } }) => p.inlineData?.data
    );
    return retryPart?.inlineData?.data || null;
  } catch (e) {
    console.error("[admin-gen] Generation error:", e);
    return null;
  }
}

// ─── Generate Reference Image(s) ────────────────────

export async function adminGenerateReference(data: {
  prompt: string;
  sourcePostId?: string;
  count?: number;
  useMetaPrompt?: boolean;
  referenceType?: string;
}) {
  const adminId = await assertAdmin();
  const count = Math.min(data.count || 1, 4);

  let prompt = data.prompt;

  // Fetch source post once (used for both meta-prompting and reference image)
  let sourcePost: Awaited<ReturnType<typeof db.referencePost.findUnique>> = null;
  if (data.sourcePostId) {
    sourcePost = await db.referencePost.findUnique({ where: { id: data.sourcePostId } });
  }

  // If meta-prompting requested, enhance the prompt
  if (data.useMetaPrompt && sourcePost) {
    prompt = await buildSmartPrompt(data.referenceType || "REFERENCE", sourcePost, data.prompt);
    console.log("[admin-gen] Meta-prompted:", prompt);
  }

  // Build reference images array if source post provided
  let referenceImages: { mimeType: string; data: string }[] = [];
  if (sourcePost?.s3Key) {
    const buffer = await getImageBuffer(sourcePost.s3Key);
    referenceImages = [{ mimeType: "image/jpeg", data: buffer.toString("base64") }];
  }

  const startTime = Date.now();
  const results: { base64: string; s3Key: string }[] = [];

  const promises = Array.from({ length: count }, async (_, i) => {
    try {
      const base64 = await adminGenerateWithRetry(prompt, referenceImages);
      if (!base64) return null;

      const raw = Buffer.from(base64, "base64");
      const clean = await stripAndRewrite(raw);
      const key = `public-references/temp/${Date.now()}-${i}.jpg`;
      await uploadImage(clean, key, "image/jpeg");

      return { base64, s3Key: key };
    } catch (e) {
      console.error(`[admin-gen] Image ${i} failed:`, e);
      return null;
    }
  });

  const settled = await Promise.all(promises);
  for (const r of settled) {
    if (r) results.push(r);
  }

  return {
    success: true,
    images: results,
    elapsed: ((Date.now() - startTime) / 1000).toFixed(1),
    prompt,
    adminId,
  };
}

// ─── Generate AI Creator from Reference ──────────────
// Creates a new AI influencer persona inspired by an Instagram reference

export async function adminGenerateCreator(data: {
  sourcePostId: string;
  customDescription?: string;
  count?: number;
}) {
  const adminId = await assertAdmin();
  const count = Math.min(data.count || 4, 4);

  const post = await db.referencePost.findUnique({
    where: { id: data.sourcePostId },
    include: { account: { select: { handle: true, niche: true, gender: true, vibe: true } } },
  });
  if (!post?.s3Key) throw new Error("Source post not found or has no image");

  // Build meta-prompt input from account + post data
  const metaInput: string[] = [];
  if (post.account.gender) metaInput.push(`Gender: ${post.account.gender}`);
  if (post.account.niche?.length) metaInput.push(`Niche: ${post.account.niche.join(", ")}`);
  if (post.account.vibe) metaInput.push(`Vibe: ${post.account.vibe}`);
  if (post.outfit) metaInput.push(`Outfit style: ${post.outfit}`);
  if (post.setting) metaInput.push(`Setting: ${post.setting}`);
  if (post.altText) metaInput.push(`Looks like: ${post.altText}`);
  if (data.customDescription) metaInput.push(`Custom notes: ${data.customDescription}`);

  const prompt = await metaPrompt(CREATOR_META_PROMPT, metaInput.join("\n"));
  console.log("[admin-gen] Creator prompt:", prompt);

  // Use silhouette template — EXACT same pattern as the wizard
  const templateRef = getTemplateRef();
  const fullPrompt = wrapWithSilhouette(prompt);

  const startTime = Date.now();
  const results: { base64: string; s3Key: string }[] = [];

  const promises = Array.from({ length: count }, async (_, i) => {
    try {
      const base64 = await adminGenerateWithRetry(fullPrompt, [templateRef]);
      if (!base64) return null;

      const raw = Buffer.from(base64, "base64");
      const clean = await stripAndRewrite(raw);
      const key = `admin/creators/temp/${Date.now()}-${i}.jpg`;
      await uploadImage(clean, key, "image/jpeg");

      return { base64, s3Key: key };
    } catch (e) {
      console.error(`[admin-gen] Creator image ${i} failed:`, e);
      return null;
    }
  });

  const settled = await Promise.all(promises);
  for (const r of settled) {
    if (r) results.push(r);
  }

  return {
    success: true,
    images: results,
    prompt: fullPrompt,
    elapsed: ((Date.now() - startTime) / 1000).toFixed(1),
    sourceHandle: post.account.handle,
  };
}

// ─── Publish a Generated Image as Public Reference ───

export async function publishPublicReference(data: {
  tempS3Key: string;
  type?: string;
  name?: string;
  description?: string;
  tags?: string[];
  category?: string;
  sourcePostId?: string;
  generationPrompt?: string;
  autoTag?: boolean;
}) {
  const adminId = await assertAdmin();

  // Auto-tag if requested or if no metadata provided
  let type = data.type || "REFERENCE";
  let name = data.name || "Untitled";
  let description = data.description || "";
  let tags = data.tags || [];
  let category = data.category || "general";

  if (data.autoTag || (!data.name && !data.tags?.length)) {
    try {
      const buffer = await getImageBuffer(data.tempS3Key);
      const analysis = await analyzeImageForTags(buffer.toString("base64"));
      type = data.type || analysis.type;
      name = data.name || analysis.name;
      description = data.description || analysis.description;
      tags = data.tags?.length ? data.tags : analysis.tags;
      category = data.category || analysis.category;
    } catch (e) {
      console.warn("[admin-gen] Auto-tag during publish failed:", e);
    }
  }

  const ref = await db.publicReference.create({
    data: {
      type,
      name,
      description,
      tags,
      category,
      imageUrl: data.tempS3Key,
      sourcePostId: data.sourcePostId || null,
      curatedBy: adminId,
      generationPrompt: data.generationPrompt || null,
      generationModel: IMAGE_MODEL,
    },
  });

  const finalKey = `public-references/${type.toLowerCase()}/${ref.id}.jpg`;
  const buffer = await getImageBuffer(data.tempS3Key);
  await uploadImage(buffer, finalKey, "image/jpeg");

  await db.publicReference.update({
    where: { id: ref.id },
    data: { imageUrl: finalKey },
  });

  return { success: true, reference: { ...ref, imageUrl: finalKey } };
}

// ─── List Public References ─────────────────────────

export async function getPublicReferences(filters?: {
  type?: string;
  category?: string;
  isActive?: boolean;
}) {
  await assertAdmin();

  const where: Record<string, unknown> = {};
  if (filters?.type) where.type = filters.type;
  if (filters?.category) where.category = filters.category;
  if (filters?.isActive !== undefined) where.isActive = filters.isActive;

  const refs = await db.publicReference.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      sourcePost: {
        select: { shortcode: true, account: { select: { handle: true } } },
      },
    },
  });

  const withUrls = await Promise.all(
    refs.map(async (r) => {
      let signedUrl: string | null = null;
      try {
        signedUrl = await getSignedImageUrl(r.imageUrl);
      } catch {}
      return { ...r, signedUrl };
    })
  );

  return withUrls;
}

// ─── AI Auto-Tag (Gemini Flash analyzes image) ──────

export async function analyzeImageForTags(imageBase64: string): Promise<{
  type: string;
  name: string;
  description: string;
  tags: string[];
  category: string;
}> {
  const systemPrompt = `You analyze images for a reference library. Given an image, output a JSON object with:
- "type": either "BACKGROUND" (scene/location with no people) or "REFERENCE" (has a person, outfit, product, pose, or other useful reference material)
- "name": short descriptive name (2-5 words), e.g. "Modern Gym Interior", "Beach Sunset", "Casual Street Outfit"
- "description": one sentence describing what's useful about this as a reference for AI image generation
- "tags": array of 3-8 lowercase tags for searchability, e.g. ["gym", "indoor", "weights", "fitness"]
- "category": one of "fitness", "lifestyle", "fashion", "beauty", "travel", "general"

Output ONLY valid JSON, no markdown, no explanation.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        { text: "Analyze this image for our reference library." },
        { inlineData: { mimeType: "image/jpeg", data: imageBase64 } },
      ],
      config: {
        systemInstruction: systemPrompt,
        safetySettings: SAFETY_OFF,
      },
    });

    const text = response.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    if (text) {
      // Strip markdown code fences if present
      const clean = text.replace(/^```json?\n?/, "").replace(/\n?```$/, "").trim();
      const parsed = JSON.parse(clean);
      return {
        type: parsed.type || "REFERENCE",
        name: parsed.name || "Untitled",
        description: parsed.description || "",
        tags: Array.isArray(parsed.tags) ? parsed.tags : [],
        category: parsed.category || "general",
      };
    }
  } catch (e) {
    console.warn("[admin-gen] AI auto-tag failed:", e instanceof Error ? e.message : e);
  }

  return { type: "REFERENCE", name: "Untitled", description: "", tags: [], category: "general" };
}

// Analyze an S3 image by key
export async function autoTagAdminMedia(id: string) {
  await assertAdmin();

  const item = await db.adminMedia.findUnique({ where: { id } });
  if (!item) throw new Error("Not found");

  const buffer = await getImageBuffer(item.s3Key);
  const base64 = buffer.toString("base64");
  const analysis = await analyzeImageForTags(base64);

  await db.adminMedia.update({
    where: { id },
    data: {
      mediaType: analysis.type === "BACKGROUND" ? "background" : "reference",
      notes: `${analysis.name}: ${analysis.description}`,
    },
  });

  return { success: true, analysis };
}

// Batch auto-tag all untagged items in inbox
export async function batchAutoTag() {
  await assertAdmin();

  const items = await db.adminMedia.findMany({
    where: { pipelineStage: "inbox", notes: null },
    take: 20,
  });

  let tagged = 0;
  for (const item of items) {
    try {
      const buffer = await getImageBuffer(item.s3Key);
      const base64 = buffer.toString("base64");
      const analysis = await analyzeImageForTags(base64);

      await db.adminMedia.update({
        where: { id: item.id },
        data: {
          mediaType: analysis.type === "BACKGROUND" ? "background" : "reference",
          notes: `${analysis.name}: ${analysis.description}`,
        },
      });
      tagged++;
    } catch (e) {
      console.warn(`[admin-gen] Failed to auto-tag ${item.id}:`, e);
    }
  }

  return { success: true, tagged, total: items.length };
}

// ─── Prompt Journal ─────────────────────────────────

export async function rateAdminMedia(id: string, data: {
  rating?: number;
  feedback?: string;
  promptTags?: string[];
}) {
  await assertAdmin();
  await db.adminMedia.update({
    where: { id },
    data: {
      ...(data.rating !== undefined && { rating: data.rating }),
      ...(data.feedback !== undefined && { feedback: data.feedback }),
      ...(data.promptTags !== undefined && { promptTags: data.promptTags }),
    },
  });
  return { success: true };
}

// Get top-rated prompts for learning what works
export async function getTopPrompts(limit = 20) {
  await assertAdmin();
  return db.adminMedia.findMany({
    where: { rating: { gte: 4 } },
    orderBy: { rating: "desc" },
    take: limit,
    select: {
      id: true,
      prompt: true,
      rating: true,
      feedback: true,
      promptTags: true,
      sourceHandle: true,
      s3Key: true,
    },
  });
}

// ─── Reference Post Triage ──────────────────────────

export async function tagReferencePost(postId: string, data: {
  addLabel?: string;
  removeLabel?: string;
  triageStarred?: boolean;
}) {
  await assertAdmin();

  const post = await db.referencePost.findUnique({ where: { id: postId }, select: { triageLabels: true } });
  if (!post) throw new Error("Post not found");

  let labels = [...post.triageLabels];

  if (data.addLabel) {
    if (!labels.includes(data.addLabel)) labels.push(data.addLabel);
  }
  if (data.removeLabel) {
    labels = labels.filter((l) => l !== data.removeLabel);
  }

  await db.referencePost.update({
    where: { id: postId },
    data: {
      triageLabels: labels,
      ...(data.triageStarred !== undefined && { triageStarred: data.triageStarred }),
    },
  });
  return { success: true, labels };
}

// ─── Pipeline Board ─────────────────────────────────

export async function getAdminMediaByStage(filters?: { mediaType?: string }) {
  await assertAdmin();

  const where: Record<string, unknown> = {};
  if (filters?.mediaType) where.mediaType = filters.mediaType;

  const all = await db.adminMedia.findMany({
    where,
    orderBy: [{ pipelineOrder: "asc" }, { createdAt: "desc" }],
  });

  const withUrls = await Promise.all(
    all.map(async (m) => {
      let signedUrl: string | null = null;
      try { signedUrl = await getSignedImageUrl(m.s3Key); } catch {}
      return { ...m, signedUrl };
    })
  );

  const stages: Record<string, typeof withUrls> = {
    inbox: [], review: [], approved: [], published: [], rejected: [],
  };
  for (const item of withUrls) {
    const stage = item.pipelineStage || "inbox";
    if (stages[stage]) stages[stage].push(item);
    else stages.inbox.push(item);
  }

  return stages;
}

export async function moveAdminMedia(id: string, stage: string) {
  await assertAdmin();

  await db.adminMedia.update({
    where: { id },
    data: { pipelineStage: stage },
  });

  // Auto-publish when moved to "published"
  if (stage === "published") {
    const item = await db.adminMedia.findUnique({ where: { id } });
    if (item && (item.mediaType === "background" || item.mediaType === "reference")) {
      // Check if already published
      const existing = await db.publicReference.findFirst({
        where: { imageUrl: item.s3Key },
      });
      if (!existing) {
        await db.publicReference.create({
          data: {
            type: item.mediaType.toUpperCase(),
            name: item.sourceHandle ? `From @${item.sourceHandle}` : "Generated reference",
            description: item.prompt || "",
            imageUrl: item.s3Key,
            tags: [],
            category: "general",
            curatedBy: "pipeline",
            generationPrompt: item.prompt,
            generationModel: IMAGE_MODEL,
          },
        });
      }
    }
  }

  return { success: true };
}

export async function bulkMoveAdminMedia(ids: string[], stage: string) {
  await assertAdmin();

  for (const id of ids) {
    await moveAdminMedia(id, stage);
  }

  return { success: true, moved: ids.length };
}

export async function updateAdminMediaType(id: string, mediaType: string) {
  await assertAdmin();
  await db.adminMedia.update({ where: { id }, data: { mediaType } });
  return { success: true };
}

// ─── Admin Media Triage ─────────────────────────────

export async function getAdminMedia(filters?: { mediaType?: string; starred?: boolean }) {
  await assertAdmin();

  const where: Record<string, unknown> = {};
  if (filters?.mediaType) where.mediaType = filters.mediaType;
  if (filters?.starred !== undefined) where.starred = filters.starred;

  const media = await db.adminMedia.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });

  const withUrls = await Promise.all(
    media.map(async (m) => {
      let signedUrl: string | null = null;
      try { signedUrl = await getSignedImageUrl(m.s3Key); } catch {}
      return { ...m, signedUrl };
    })
  );

  return withUrls;
}

export async function syncAdminMedia() {
  await assertAdmin();

  // List all images in admin/ S3 prefix and create AdminMedia records for any missing ones
  const { S3Client: S3, ListObjectsV2Command } = await import("@aws-sdk/client-s3");
  const s3 = new S3({ region: process.env.AWS_REGION || "us-east-1" });
  const bucket = process.env.S3_BUCKET_NAME || "realinfluencerstorage-media";

  const res = await s3.send(new ListObjectsV2Command({ Bucket: bucket, Prefix: "admin/" }));
  const s3Keys = (res.Contents || [])
    .filter((o) => o.Key?.endsWith(".jpg"))
    .map((o) => o.Key!);

  // Find which ones we already have
  const existing = await db.adminMedia.findMany({ select: { s3Key: true } });
  const existingSet = new Set(existing.map((e) => e.s3Key));

  const newKeys = s3Keys.filter((k) => !existingSet.has(k));

  // Create records for new ones
  if (newKeys.length > 0) {
    await db.adminMedia.createMany({
      data: newKeys.map((key) => ({
        s3Key: key,
        source: "seed-script",
        sourceHandle: key.split("/").pop()?.split("-")[0] || null,
      })),
      skipDuplicates: true,
    });
  }

  return { synced: newKeys.length, total: s3Keys.length };
}

export async function tagAdminMedia(id: string, data: {
  mediaType?: string;
  starred?: boolean;
  notes?: string;
}) {
  await assertAdmin();

  await db.adminMedia.update({
    where: { id },
    data: {
      ...(data.mediaType !== undefined && { mediaType: data.mediaType }),
      ...(data.starred !== undefined && { starred: data.starred }),
      ...(data.notes !== undefined && { notes: data.notes }),
    },
  });

  return { success: true };
}

export async function deleteAdminMedia(id: string) {
  await assertAdmin();
  await db.adminMedia.delete({ where: { id } });
  return { success: true };
}

// ─── Toggle Active ──────────────────────────────────

export async function togglePublicReference(id: string) {
  await assertAdmin();
  const ref = await db.publicReference.findUnique({ where: { id } });
  if (!ref) throw new Error("Not found");
  await db.publicReference.update({
    where: { id },
    data: { isActive: !ref.isActive },
  });
  return { success: true };
}

// ─── Delete ─────────────────────────────────────────

export async function deletePublicReference(id: string) {
  await assertAdmin();
  await db.publicReference.delete({ where: { id } });
  return { success: true };
}
