"use server";

import { auth } from "@clerk/nextjs/server";
import { GoogleGenAI, HarmCategory, HarmBlockThreshold } from "@google/genai";
import OpenAI from "openai";
import { db } from "@/lib/db";
import { deductCredits } from "./credit-actions";
import { uploadImage, getSignedImageUrl, getImageBuffer } from "@/lib/s3";
import { stripAndRewrite } from "@/lib/ai/metadata-strip";
import { CAROUSEL_FORMATS, type CarouselFormat, type FormatSlide } from "@/data/carousel-formats";
import { getScene } from "@/data/scenes";
import { REALISM_BASE } from "@/lib/prompts";
import type { ContentSetItem, ContentItem } from "@/types/content";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
const grok = new OpenAI({ apiKey: process.env.GROK_API_KEY!, baseURL: "https://api.x.ai/v1" });
const IMAGE_MODEL = "gemini-3-pro-image-preview";
const CREDIT_PER_SLIDE = 1;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseGrokJson(text: string): any {
  return JSON.parse(text.replace(/^```json?\n?|\n?```$/g, "").trim());
}

const SAFETY_OFF = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
];

// ─── Build prompt for one carousel slide ─────

// IMPORTANT: Only describe the SCENE for the image model.
// NEVER include meta-context like "slide 3 of 6" or "gym day carousel" —
// Gemini takes that literally and renders text/labels into the photo.
// The only context the model needs: who the person is + what scene to show.
function buildSlidePrompt(
  slide: FormatSlide,
  scene: ReturnType<typeof getScene>,
  gender: string,
  userInstructions?: string
): string {
  const subject = gender.toLowerCase() === "male" ? "man" : "woman";
  const outfit = slide.outfitHint || scene?.outfitDefault || "casual outfit";
  const setting = scene?.setting ?? "natural setting";
  const lighting = scene?.lighting ?? "natural lighting";
  const camera = scene?.cameraStyle ?? "shot on iPhone, candid";

  const parts = [
    `That exact ${subject} from the reference image.`,
    `${setting}. ${lighting}.`,
    `Wearing ${outfit}. ${slide.moodHint}.`,
    `${camera}. ${REALISM_BASE}.`,
  ];

  if (userInstructions?.trim()) {
    parts.push(userInstructions.trim());
  }

  return parts.join(" ");
}

// ─── Generate a single slide image ─────

async function generateSlideImage(
  prompt: string,
  refImage: { mimeType: string; data: string },
  userId: string,
  creatorId: string,
  index: number
): Promise<{ key: string } | null> {
  try {
    const response = await ai.models.generateContent({
      model: IMAGE_MODEL,
      contents: [{ text: prompt }, { inlineData: refImage }],
      config: { responseModalities: ["TEXT", "IMAGE"], safetySettings: SAFETY_OFF },
    });

    const part = response.candidates?.[0]?.content?.parts?.find(
      (p: { inlineData?: { data?: string } }) => p.inlineData?.data
    );
    if (!part?.inlineData?.data) return null;

    const raw = Buffer.from(part.inlineData.data, "base64");
    const clean = await stripAndRewrite(raw);
    const timestamp = Date.now();
    const key = `users/${userId}/creators/${creatorId}/content/carousel-${timestamp}-${index}.jpg`;
    await uploadImage(clean, key, "image/jpeg");
    return { key };
  } catch (error) {
    console.error(`Slide ${index} generation failed:`, error);
    return null;
  }
}

// ─── Generate full carousel ─────

type CarouselResult =
  | { success: true; contentSet: ContentSetItem }
  | { success: false; error: string };

export async function generateCarousel(
  creatorId: string,
  formatId: string,
  slideCount?: number,
  userInstructions?: string
): Promise<CarouselResult> {
  const { userId: clerkId } = await auth();
  if (!clerkId) return { success: false, error: "Not authenticated" };

  const user = await db.user.findUnique({ where: { clerkId } });
  if (!user) return { success: false, error: "User not found" };

  const creator = await db.creator.findUnique({ where: { id: creatorId, userId: user.id } });
  if (!creator || !creator.baseImageUrl) return { success: false, error: "Creator not found" };

  const format = CAROUSEL_FORMATS.find((f) => f.id === formatId);
  if (!format) return { success: false, error: "Format not found" };

  // Determine slide count
  const count = slideCount
    ? Math.min(Math.max(slideCount, format.slideRange[0]), format.slideRange[1])
    : format.slideRange[0]; // default to minimum

  const slides = format.slides.filter((s) => s.required || s.position <= count).slice(0, count);
  const totalCredits = slides.length * CREDIT_PER_SLIDE;

  const totalUserCredits = user.planCredits + user.packCredits;
  if (totalUserCredits < totalCredits) {
    return { success: false, error: `Not enough credits. Need ${totalCredits}, have ${totalUserCredits}.` };
  }

  // Deduct credits first
  await deductCredits(user.id, totalCredits, `Carousel: ${format.name}`);

  // Get creator's base image as reference
  const refBuffer = await getImageBuffer(creator.baseImageUrl);
  const refBase64 = refBuffer.toString("base64");
  const refImage = { mimeType: "image/jpeg", data: refBase64 };

  const gender = (creator.settings as Record<string, string>)?.gender ?? "Female";

  // Create content set record
  const contentSet = await db.contentSet.create({
    data: {
      creatorId: creator.id,
      userId: user.id,
      type: "CAROUSEL",
      formatId,
      slideCount: slides.length,
      status: "GENERATING",
      creditsCost: totalCredits,
    },
  });

  try {
    // Build prompts and generate all slides in parallel
    const results = await Promise.all(
      slides.map((slide, i) => {
        const scene = getScene(slide.sceneHint);
        const prompt = buildSlidePrompt(slide, scene, gender, userInstructions);

        return generateSlideImage(prompt, refImage, user.id, creatorId, i).then(async (result) => {
          if (!result) return null;

          const content = await db.content.create({
            data: {
              creatorId: creator.id,
              type: "IMAGE",
              status: "COMPLETED",
              url: result.key,
              outputs: JSON.parse(JSON.stringify([result.key])),
              source: "CAROUSEL",
              prompt,
              creditsCost: CREDIT_PER_SLIDE,
              contentSetId: contentSet.id,
              slideIndex: slide.position,
              slideContext: JSON.parse(JSON.stringify({
                role: slide.role,
                sceneHint: slide.sceneHint,
                outfitHint: slide.outfitHint,
                moodHint: slide.moodHint,
              })),
            },
          });

          const url = await getSignedImageUrl(result.key);
          return {
            id: content.id,
            creatorId: content.creatorId,
            type: content.type as ContentItem["type"],
            status: content.status as ContentItem["status"],
            url,
            s3Keys: [result.key],
            source: "CAROUSEL" as const,
            prompt: content.prompt ?? undefined,
            creditsCost: content.creditsCost,
            createdAt: content.createdAt.toISOString(),
            contentSetId: content.contentSetId ?? undefined,
            slideIndex: content.slideIndex ?? undefined,
          };
        });
      })
    );

    const successfulSlides = results.filter(Boolean) as (ContentItem & { slideIndex: number })[];

    // Refund credits for failed slides
    const failedCount = slides.length - successfulSlides.length;
    if (failedCount > 0) {
      await deductCredits(user.id, -failedCount * CREDIT_PER_SLIDE, `Carousel refund: ${failedCount} failed slides`);
    }

    // Generate caption
    const caption = await generateCaption(format, gender, creator.name);

    // Update content set
    const status = successfulSlides.length === slides.length ? "COMPLETED"
      : successfulSlides.length > 0 ? "PARTIAL" : "FAILED";

    await db.contentSet.update({
      where: { id: contentSet.id },
      data: {
        status,
        caption: caption.text,
        hashtags: caption.hashtags,
        slideCount: successfulSlides.length,
      },
    });

    return {
      success: true,
      contentSet: {
        id: contentSet.id,
        creatorId: creator.id,
        type: "CAROUSEL",
        formatId,
        caption: caption.text,
        hashtags: caption.hashtags,
        slideCount: successfulSlides.length,
        status,
        creditsCost: totalCredits,
        createdAt: contentSet.createdAt.toISOString(),
        slides: successfulSlides.map((s) => ({
          id: s.id,
          creatorId: s.creatorId,
          type: s.type as ContentItem["type"],
          status: s.status as ContentItem["status"],
          url: s.url,
          s3Keys: [],
          source: "CAROUSEL" as const,
          prompt: s.prompt ?? undefined,
          creditsCost: s.creditsCost,
          createdAt: s.createdAt,
          contentSetId: contentSet.id,
          slideIndex: s.slideIndex,
        })),
      },
    };
  } catch (error) {
    console.error("generateCarousel error:", error);
    await db.contentSet.update({ where: { id: contentSet.id }, data: { status: "PARTIAL" } });
    return { success: false, error: "Carousel generation failed. Some slides may have been created." };
  }
}

// ─── Regenerate a single slide ─────

type RegenResult =
  | { success: true; slide: ContentItem }
  | { success: false; error: string };

export async function regenerateSlide(
  contentId: string,
  feedback?: string
): Promise<RegenResult> {
  const { userId: clerkId } = await auth();
  if (!clerkId) return { success: false, error: "Not authenticated" };

  const user = await db.user.findUnique({ where: { clerkId } });
  if (!user) return { success: false, error: "User not found" };

  const content = await db.content.findUnique({
    where: { id: contentId },
    include: { creator: true, contentSet: { include: { contents: true } } },
  });
  if (!content || !content.contentSet || !content.creator) {
    return { success: false, error: "Slide not found" };
  }
  if (content.creator.userId !== user.id) {
    return { success: false, error: "Not authorized" };
  }

  // Check credits (deduct AFTER successful generation)
  const totalCredits = user.planCredits + user.packCredits;
  if (totalCredits < CREDIT_PER_SLIDE) {
    return { success: false, error: "Not enough credits" };
  }

  const creator = content.creator;
  if (!creator.baseImageUrl) return { success: false, error: "Creator has no base image" };

  const refBuffer = await getImageBuffer(creator.baseImageUrl);
  const refBase64 = refBuffer.toString("base64");
  const refImage = { mimeType: "image/jpeg", data: refBase64 };

  const format = CAROUSEL_FORMATS.find((f) => f.id === content.contentSet!.formatId);
  const slideContext = content.slideContext as { role: string; sceneHint: string; outfitHint: string; moodHint: string } | null;
  const gender = (creator.settings as Record<string, string>)?.gender ?? "Female";
  const subject = gender.toLowerCase() === "male" ? "man" : "woman";

  // Scene-only prompt — NO meta-context (slide numbers, format names, etc.)
  // Those get rendered as text in the image by Gemini.
  const scene = slideContext ? getScene(slideContext.sceneHint) : null;

  const parts = [
    `That exact ${subject} from the reference image.`,
    scene ? `${scene.setting}. ${scene.lighting}.` : "",
    slideContext ? `Wearing ${slideContext.outfitHint}. ${slideContext.moodHint}.` : "",
    feedback ? feedback : "Generate a different version.",
    `Shot on iPhone, candid. ${REALISM_BASE}.`,
  ].filter(Boolean);

  const prompt = parts.join(" ");

  const result = await generateSlideImage(prompt, refImage, user.id, creator.id, content.slideIndex ?? 0);
  if (!result) return { success: false, error: "Failed to regenerate slide" };

  // Deduct credit only after successful generation
  await deductCredits(user.id, CREDIT_PER_SLIDE, "Carousel slide regeneration");

  // Update the content record with new image
  await db.content.update({
    where: { id: contentId },
    data: { url: result.key, outputs: JSON.parse(JSON.stringify([result.key])), prompt },
  });

  const url = await getSignedImageUrl(result.key);

  return {
    success: true,
    slide: {
      id: content.id,
      creatorId: content.creatorId,
      type: "IMAGE",
      status: "COMPLETED",
      url,
      s3Keys: [result.key],
      source: "CAROUSEL",
      prompt,
      creditsCost: CREDIT_PER_SLIDE,
      createdAt: content.createdAt.toISOString(),
      contentSetId: content.contentSetId ?? undefined,
      slideIndex: content.slideIndex ?? undefined,
    },
  };
}

// ─── AI Caption Generation ─────

async function generateCaption(
  format: CarouselFormat,
  gender: string,
  creatorName: string
): Promise<{ text: string; hashtags: string[] }> {
  try {
    const response = await grok.chat.completions.create({
      model: "grok-4-1-fast-non-reasoning",
      messages: [
        {
          role: "system",
          content: `You write Instagram captions for AI influencer posts. Output ONLY JSON: {"text": "caption text", "hashtags": ["tag1", "tag2", "tag3"]}

Rules:
- Caption: 1-2 short sentences, casual and authentic, matches the content vibe
- Use the creator's first name naturally if it fits
- 3-5 hashtags, lowercase, no # symbol
- Match the tone to the carousel format
- Never mention AI or that the person is generated`,
        },
        {
          role: "user",
          content: `Creator: ${creatorName} (${gender})
Carousel format: ${format.name}
Description: ${format.description}
Template caption: ${format.captionTemplate}

Write a caption and hashtags.`,
        },
      ],
    });

    const text = response.choices?.[0]?.message?.content?.trim() ?? "";
    const json = parseGrokJson(text);
    return {
      text: typeof json.text === "string" ? json.text : format.captionTemplate,
      hashtags: Array.isArray(json.hashtags) ? json.hashtags.slice(0, 5) : format.hashtagSuggestions,
    };
  } catch {
    return { text: format.captionTemplate, hashtags: format.hashtagSuggestions };
  }
}

// ─── AI Idea Suggestions ─────

export async function suggestContent(
  creatorId: string,
  userInput: string
): Promise<{ suggestions: { type: "carousel" | "photo"; formatId?: string; title: string; description: string; slideCount?: number }[] }> {
  const { userId: clerkId } = await auth();
  if (!clerkId) return { suggestions: [] };

  const creator = await db.creator.findFirst({
    where: { id: creatorId, user: { clerkId } },
  });
  if (!creator) return { suggestions: [] };

  const settings = creator.settings as Record<string, string> | null;
  const niche = creator.niche as string[] | null;

  const formatList = CAROUSEL_FORMATS.map((f) => `${f.id}: ${f.name} — ${f.description} (${f.niches.join(", ")})`).join("\n");

  try {
    const response = await grok.chat.completions.create({
      model: "grok-4-1-fast-non-reasoning",
      messages: [
        {
          role: "system",
          content: `You suggest Instagram content for an AI influencer. Output ONLY a JSON array:
[{"type": "carousel" | "photo", "formatId": "id-if-carousel", "title": "Short title", "description": "1 sentence", "slideCount": N}]

Return 3-5 suggestions. Mix of carousels and single photos.
If user request is vague, suggest diverse options matching their niche.
If specific, match it directly.

Available carousel formats:
${formatList}`,
        },
        {
          role: "user",
          content: `Creator: ${creator.name}, ${(niche ?? []).join(", ")} niche, ${settings?.vibes ?? ""} vibe
Request: ${userInput || "help me come up with ideas"}`,
        },
      ],
    });

    const text = response.choices?.[0]?.message?.content?.trim() ?? "[]";
    const suggestions = parseGrokJson(text);
    return { suggestions: Array.isArray(suggestions) ? suggestions.slice(0, 5) : [] };
  } catch {
    // Fallback — suggest based on niche
    const nicheFormats = CAROUSEL_FORMATS.filter((f) =>
      f.niches.some((n) => (niche ?? []).includes(n))
    ).slice(0, 3);

    return {
      suggestions: [
        ...nicheFormats.map((f) => ({
          type: "carousel" as const,
          formatId: f.id,
          title: f.name,
          description: f.description,
          slideCount: f.slideRange[0],
        })),
        { type: "photo" as const, title: "Mirror selfie", description: "Quick mirror selfie in today's outfit" },
      ],
    };
  }
}

// ─── Rewrite Caption ─────

export async function rewriteCaption(
  contentSetId: string,
  instruction?: string
): Promise<{ caption: string; hashtags: string[] }> {
  const { userId: clerkId } = await auth();
  if (!clerkId) return { caption: "", hashtags: [] };

  const contentSet = await db.contentSet.findFirst({
    where: { id: contentSetId, user: { clerkId } },
  });
  if (!contentSet) return { caption: "", hashtags: [] };

  const format = CAROUSEL_FORMATS.find((f) => f.id === contentSet.formatId);

  try {
    const response = await grok.chat.completions.create({
      model: "grok-4-1-fast-non-reasoning",
      messages: [
        {
          role: "system",
          content: `Rewrite this Instagram caption. Output ONLY JSON: {"text": "new caption", "hashtags": ["tag1", "tag2"]}
Keep it casual, authentic. 1-2 sentences. 3-5 hashtags.`,
        },
        {
          role: "user",
          content: `Current caption: "${contentSet.caption ?? ""}"
Format: ${format?.name ?? "carousel"}
${instruction ? `Instructions: ${instruction}` : "Write a fresh version"}`,
        },
      ],
    });

    const text = response.choices?.[0]?.message?.content?.trim() ?? "";
    const json = parseGrokJson(text);
    const newCaption = typeof json.text === "string" ? json.text : (contentSet.caption ?? "");
    const newHashtags = Array.isArray(json.hashtags) ? json.hashtags.slice(0, 5) : (contentSet.hashtags ?? []);

    await db.contentSet.update({
      where: { id: contentSetId },
      data: { caption: newCaption, hashtags: newHashtags },
    });

    return { caption: newCaption, hashtags: newHashtags };
  } catch {
    return { caption: contentSet.caption ?? "", hashtags: contentSet.hashtags ?? [] };
  }
}

// ─── Get Content Sets for Creator ─────

export async function getCreatorContentSets(creatorId: string): Promise<ContentSetItem[]> {
  const { userId: clerkId } = await auth();
  if (!clerkId) return [];

  const sets = await db.contentSet.findMany({
    where: { creatorId, user: { clerkId } },
    include: { contents: { orderBy: { slideIndex: "asc" } } },
    orderBy: { createdAt: "desc" },
  });

  return Promise.all(
    sets.map(async (s) => ({
      id: s.id,
      creatorId: s.creatorId,
      type: s.type as "CAROUSEL" | "PHOTO_SET",
      formatId: s.formatId ?? undefined,
      caption: s.caption ?? undefined,
      hashtags: s.hashtags,
      slideCount: s.slideCount,
      status: s.status as "GENERATING" | "COMPLETED" | "PARTIAL",
      creditsCost: s.creditsCost,
      createdAt: s.createdAt.toISOString(),
      slides: await Promise.all(
        s.contents.map(async (c) => ({
          id: c.id,
          creatorId: c.creatorId,
          type: c.type as ContentItem["type"],
          status: c.status as ContentItem["status"],
          url: c.url ? await getSignedImageUrl(c.url) : undefined,
          s3Keys: (c.outputs as string[]) ?? [],
          source: c.source as ContentItem["source"],
          prompt: c.prompt ?? undefined,
          creditsCost: c.creditsCost,
          createdAt: c.createdAt.toISOString(),
          contentSetId: c.contentSetId ?? undefined,
          slideIndex: c.slideIndex ?? undefined,
        }))
      ),
    }))
  );
}
