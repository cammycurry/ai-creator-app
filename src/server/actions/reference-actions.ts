"use server";

import { auth } from "@clerk/nextjs/server";
import { GoogleGenAI } from "@google/genai";
import { db } from "@/lib/db";
import { uploadImage, getSignedImageUrl } from "@/lib/s3";
import type { ReferenceItem, ReferenceType } from "@/types/reference";
import { REFERENCE_TYPES } from "@/types/reference";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
const FLASH_MODEL = "gemini-2.5-flash-preview-05-20";

// ─── AI Analysis ─────────────────────────────────────

export async function analyzeReferenceImage(
  imageBase64: string
): Promise<{ type: ReferenceType; name: string; description: string; tags: string[] }> {
  const fallback = { type: "CUSTOM" as ReferenceType, name: "New Reference", description: "", tags: [] };

  try {
    const response = await ai.models.generateContent({
      model: FLASH_MODEL,
      contents: [
        {
          text: `Analyze this image and categorize it as a reference for an AI influencer content creator.

Return ONLY a JSON object (no markdown, no code fences):
{
  "type": "BACKGROUND" | "PRODUCT" | "OUTFIT" | "POSE" | "CUSTOM",
  "name": "2-4 word label",
  "description": "10-20 word description useful for prompt building",
  "tags": ["tag1", "tag2", "tag3", "tag4"]
}

Type definitions:
- BACKGROUND: a location, setting, or environment (no person required)
- PRODUCT: a product, item, or object to feature
- OUTFIT: clothing, fashion, or styling
- POSE: a body position, gesture, or action
- CUSTOM: anything else

Keep name concise (2-4 words). Description should describe what it shows in a way useful for image generation prompts. Include 4-8 descriptive tags.`,
        },
        { inlineData: { mimeType: "image/jpeg", data: imageBase64 } },
      ],
    });

    const text = response.candidates?.[0]?.content?.parts?.find(
      (p: { text?: string }) => p.text
    )?.text ?? "";

    const cleaned = text.replace(/^```json?\n?|\n?```$/g, "").trim();
    const json = JSON.parse(cleaned);

    const type = REFERENCE_TYPES.includes(json.type) ? (json.type as ReferenceType) : "CUSTOM";
    const name = typeof json.name === "string" ? json.name.slice(0, 50) : "New Reference";
    const description = typeof json.description === "string" ? json.description.slice(0, 200) : "";
    const tags = Array.isArray(json.tags)
      ? json.tags.slice(0, 8).map((t: string) => String(t).toLowerCase())
      : [];

    return { type, name, description, tags };
  } catch {
    return fallback;
  }
}

// ─── Helpers ─────────────────────────────────────────

function toReferenceItem(
  ref: {
    id: string;
    creatorId: string;
    type: string;
    name: string;
    description: string;
    imageUrl: string;
    tags: string[];
    usageCount: number;
    createdAt: Date;
  },
  signedUrl?: string
): ReferenceItem {
  return {
    id: ref.id,
    creatorId: ref.creatorId,
    type: ref.type as ReferenceType,
    name: ref.name,
    description: ref.description,
    imageUrl: signedUrl,
    s3Key: ref.imageUrl,
    tags: ref.tags,
    usageCount: ref.usageCount,
    createdAt: ref.createdAt.toISOString(),
  };
}

// ─── Create ───────────────────────────────────────────

type MutationResult =
  | { success: true; reference: ReferenceItem }
  | { success: false; error: string };

export async function createReference(
  creatorId: string,
  type: ReferenceType,
  name: string,
  description: string,
  imageBase64: string,
  tags?: string[]
): Promise<MutationResult> {
  const { userId: clerkId } = await auth();
  if (!clerkId) return { success: false, error: "Not authenticated" };
  const user = await db.user.findUnique({ where: { clerkId } });
  if (!user) return { success: false, error: "User not found" };

  const creator = await db.creator.findUnique({ where: { id: creatorId, userId: user.id } });
  if (!creator) return { success: false, error: "Creator not found" };

  const timestamp = Date.now();
  const key = `users/${user.id}/creators/${creatorId}/references/ref-${timestamp}.jpg`;
  const buffer = Buffer.from(imageBase64, "base64");
  await uploadImage(buffer, key, "image/jpeg");

  const ref = await db.reference.create({
    data: {
      creatorId,
      userId: user.id,
      type,
      name,
      description,
      imageUrl: key,
      tags: tags ?? [],
    },
  });

  const signedUrl = await getSignedImageUrl(key);
  return { success: true, reference: toReferenceItem(ref, signedUrl) };
}

// ─── Read ─────────────────────────────────────────────

export async function getCreatorReferences(creatorId: string): Promise<ReferenceItem[]> {
  const { userId: clerkId } = await auth();
  if (!clerkId) return [];

  const refs = await db.reference.findMany({
    where: { creatorId, user: { clerkId } },
    orderBy: { createdAt: "desc" },
  });

  return Promise.all(
    refs.map(async (ref) => {
      const signedUrl = await getSignedImageUrl(ref.imageUrl);
      return toReferenceItem(ref, signedUrl);
    })
  );
}

// ─── Update ───────────────────────────────────────────

export async function updateReference(
  referenceId: string,
  updates: { name?: string; description?: string; type?: ReferenceType; tags?: string[] }
): Promise<MutationResult> {
  const { userId: clerkId } = await auth();
  if (!clerkId) return { success: false, error: "Not authenticated" };
  const user = await db.user.findUnique({ where: { clerkId } });
  if (!user) return { success: false, error: "User not found" };

  const existing = await db.reference.findUnique({ where: { id: referenceId } });
  if (!existing || existing.userId !== user.id) {
    return { success: false, error: "Reference not found" };
  }

  const ref = await db.reference.update({
    where: { id: referenceId },
    data: {
      ...(updates.name !== undefined && { name: updates.name }),
      ...(updates.description !== undefined && { description: updates.description }),
      ...(updates.type !== undefined && { type: updates.type }),
      ...(updates.tags !== undefined && { tags: updates.tags }),
    },
  });

  const signedUrl = await getSignedImageUrl(ref.imageUrl);
  return { success: true, reference: toReferenceItem(ref, signedUrl) };
}

// ─── Delete ───────────────────────────────────────────

export async function deleteReference(
  referenceId: string
): Promise<{ success: boolean; error?: string }> {
  const { userId: clerkId } = await auth();
  if (!clerkId) return { success: false, error: "Not authenticated" };
  const user = await db.user.findUnique({ where: { clerkId } });
  if (!user) return { success: false, error: "User not found" };

  const existing = await db.reference.findUnique({ where: { id: referenceId } });
  if (!existing || existing.userId !== user.id) {
    return { success: false, error: "Reference not found" };
  }

  await db.reference.delete({ where: { id: referenceId } });
  return { success: true };
}

// ─── Increment Usage ──────────────────────────────────

export async function incrementReferenceUsage(referenceIds: string[]): Promise<void> {
  if (referenceIds.length === 0) return;

  await db.reference.updateMany({
    where: { id: { in: referenceIds } },
    data: { usageCount: { increment: 1 } },
  });
}
