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
  const fallback = { type: "REFERENCE" as ReferenceType, name: "New Reference", description: "", tags: [] };

  try {
    const response = await ai.models.generateContent({
      model: FLASH_MODEL,
      contents: [
        {
          text: `Analyze this image and categorize it as a reference for an AI influencer content creator.

Return ONLY a JSON object (no markdown, no code fences):
{
  "type": "BACKGROUND" | "REFERENCE",
  "name": "2-4 word label",
  "description": "10-20 word description useful for prompt building",
  "tags": ["tag1", "tag2", "tag3", "tag4"]
}

Type definitions:
- BACKGROUND: a location, setting, or environment (no person, just the scene)
- REFERENCE: everything else — outfits, poses, products, moods, compositions, props

For tags, include descriptive terms like "outfit", "pose", "product", "mood", "indoor", "outdoor", "gym", "beach", etc. Include 4-8 tags.`,
        },
        { inlineData: { mimeType: "image/jpeg", data: imageBase64 } },
      ],
    });

    const text = response.candidates?.[0]?.content?.parts?.find(
      (p: { text?: string }) => p.text
    )?.text ?? "";

    const cleaned = text.replace(/^```json?\n?|\n?```$/g, "").trim();
    const json = JSON.parse(cleaned);

    const type = REFERENCE_TYPES.includes(json.type) ? (json.type as ReferenceType) : "REFERENCE";
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
    userId: string;
    creatorId: string | null;
    type: string;
    name: string;
    description: string;
    imageUrl: string;
    tags: string[];
    starred: boolean;
    usageCount: number;
    lastUsedAt: Date | null;
    source: string;
    sourcePublicRefId: string | null;
    createdAt: Date;
  },
  signedUrl?: string
): ReferenceItem {
  return {
    id: ref.id,
    userId: ref.userId,
    creatorId: ref.creatorId,
    type: ref.type as ReferenceType,
    name: ref.name,
    description: ref.description,
    imageUrl: signedUrl,
    s3Key: ref.imageUrl,
    tags: ref.tags,
    starred: ref.starred,
    usageCount: ref.usageCount,
    lastUsedAt: ref.lastUsedAt?.toISOString() ?? null,
    source: ref.source as ReferenceItem["source"],
    sourcePublicRefId: ref.sourcePublicRefId,
    createdAt: ref.createdAt.toISOString(),
  };
}

async function getAuthUser() {
  const { userId: clerkId } = await auth();
  if (!clerkId) return null;
  return db.user.findUnique({ where: { clerkId } });
}

// ─── Create ──────────────────────────────────────────

type MutationResult =
  | { success: true; reference: ReferenceItem }
  | { success: false; error: string };

export async function createReference(
  type: ReferenceType,
  name: string,
  description: string,
  imageBase64: string,
  tags?: string[]
): Promise<MutationResult> {
  const user = await getAuthUser();
  if (!user) return { success: false, error: "Not authenticated" };

  const timestamp = Date.now();
  const key = `users/${user.id}/references/ref-${timestamp}.jpg`;
  const buffer = Buffer.from(imageBase64, "base64");
  await uploadImage(buffer, key, "image/jpeg");

  const ref = await db.reference.create({
    data: {
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

// ─── Read ────────────────────────────────────────────

export async function getReferences(): Promise<ReferenceItem[]> {
  const user = await getAuthUser();
  if (!user) return [];

  const refs = await db.reference.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  });

  return Promise.all(
    refs.map(async (ref) => {
      const signedUrl = await getSignedImageUrl(ref.imageUrl);
      return toReferenceItem(ref, signedUrl);
    })
  );
}

export async function getRecentReferences(limit: number = 10): Promise<ReferenceItem[]> {
  const user = await getAuthUser();
  if (!user) return [];

  const refs = await db.reference.findMany({
    where: { userId: user.id, lastUsedAt: { not: null } },
    orderBy: { lastUsedAt: "desc" },
    take: limit,
  });

  return Promise.all(
    refs.map(async (ref) => {
      const signedUrl = await getSignedImageUrl(ref.imageUrl);
      return toReferenceItem(ref, signedUrl);
    })
  );
}

export async function getStarredReferences(): Promise<ReferenceItem[]> {
  const user = await getAuthUser();
  if (!user) return [];

  const refs = await db.reference.findMany({
    where: { userId: user.id, starred: true },
    orderBy: { updatedAt: "desc" },
  });

  return Promise.all(
    refs.map(async (ref) => {
      const signedUrl = await getSignedImageUrl(ref.imageUrl);
      return toReferenceItem(ref, signedUrl);
    })
  );
}

// ─── Update ──────────────────────────────────────────

export async function updateReference(
  referenceId: string,
  updates: { name?: string; description?: string; type?: ReferenceType; tags?: string[] }
): Promise<MutationResult> {
  const user = await getAuthUser();
  if (!user) return { success: false, error: "Not authenticated" };

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

// ─── Toggle Star ─────────────────────────────────────

export async function toggleStar(
  referenceId: string
): Promise<{ success: boolean; starred?: boolean; error?: string }> {
  const user = await getAuthUser();
  if (!user) return { success: false, error: "Not authenticated" };

  const existing = await db.reference.findUnique({ where: { id: referenceId } });
  if (!existing || existing.userId !== user.id) {
    return { success: false, error: "Reference not found" };
  }

  const ref = await db.reference.update({
    where: { id: referenceId },
    data: { starred: !existing.starred },
  });

  return { success: true, starred: ref.starred };
}

// ─── Delete ──────────────────────────────────────────

export async function deleteReference(
  referenceId: string
): Promise<{ success: boolean; error?: string }> {
  const user = await getAuthUser();
  if (!user) return { success: false, error: "Not authenticated" };

  const existing = await db.reference.findUnique({ where: { id: referenceId } });
  if (!existing || existing.userId !== user.id) {
    return { success: false, error: "Reference not found" };
  }

  await db.reference.delete({ where: { id: referenceId } });
  return { success: true };
}

// ─── Increment Usage ─────────────────────────────────

export async function incrementReferenceUsage(referenceIds: string[]): Promise<void> {
  if (referenceIds.length === 0) return;

  const now = new Date();
  await Promise.all(
    referenceIds.map((id) =>
      db.reference.update({
        where: { id },
        data: { usageCount: { increment: 1 }, lastUsedAt: now },
      })
    )
  );
}
