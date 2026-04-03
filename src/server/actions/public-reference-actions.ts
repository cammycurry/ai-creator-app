"use server";

import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { getSignedImageUrl, getImageBuffer, uploadImage } from "@/lib/s3";
import type { PublicReferenceItem, ReferenceItem, ReferenceType } from "@/types/reference";

async function getAuthUser() {
  const { userId: clerkId } = await auth();
  if (!clerkId) return null;
  return db.user.findUnique({ where: { clerkId } });
}

export async function getPublicReferences(
  category?: string,
  search?: string,
  limit: number = 40,
  offset: number = 0
): Promise<PublicReferenceItem[]> {
  const user = await getAuthUser();
  if (!user) return [];

  const where: Record<string, unknown> = { isActive: true };
  if (category && category !== "all") where.category = category;
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { description: { contains: search, mode: "insensitive" } },
      { tags: { hasSome: [search.toLowerCase()] } },
    ];
  }

  const refs = await db.publicReference.findMany({
    where,
    orderBy: { popularity: "desc" },
    take: limit,
    skip: offset,
  });

  const savedRefs = await db.reference.findMany({
    where: {
      userId: user.id,
      source: "PUBLIC_SAVE",
      sourcePublicRefId: { in: refs.map((r) => r.id) },
    },
    select: { sourcePublicRefId: true },
  });
  const savedSet = new Set(savedRefs.map((r) => r.sourcePublicRefId));

  return Promise.all(
    refs.map(async (ref) => ({
      id: ref.id,
      type: ref.type as ReferenceType,
      name: ref.name,
      description: ref.description,
      imageUrl: await getSignedImageUrl(ref.imageUrl),
      s3Key: ref.imageUrl,
      tags: ref.tags,
      category: ref.category,
      popularity: ref.popularity,
      saved: savedSet.has(ref.id),
    }))
  );
}

export async function savePublicReference(
  publicRefId: string
): Promise<{ success: boolean; reference?: ReferenceItem; error?: string }> {
  const user = await getAuthUser();
  if (!user) return { success: false, error: "Not authenticated" };

  const existing = await db.reference.findFirst({
    where: { userId: user.id, source: "PUBLIC_SAVE", sourcePublicRefId: publicRefId },
  });
  if (existing) return { success: true, reference: undefined };

  const pubRef = await db.publicReference.findUnique({ where: { id: publicRefId } });
  if (!pubRef || !pubRef.isActive) return { success: false, error: "Reference not found" };

  const sourceBuffer = await getImageBuffer(pubRef.imageUrl);
  const timestamp = Date.now();
  const key = `users/${user.id}/references/pub-${timestamp}.jpg`;
  await uploadImage(sourceBuffer, key, "image/jpeg");

  const ref = await db.reference.create({
    data: {
      userId: user.id,
      type: pubRef.type,
      name: pubRef.name,
      description: pubRef.description,
      imageUrl: key,
      tags: pubRef.tags,
      source: "PUBLIC_SAVE",
      sourcePublicRefId: publicRefId,
    },
  });

  await db.publicReference.update({
    where: { id: publicRefId },
    data: { popularity: { increment: 1 } },
  });

  const signedUrl = await getSignedImageUrl(key);
  return {
    success: true,
    reference: {
      id: ref.id,
      userId: ref.userId,
      creatorId: null,
      type: ref.type as ReferenceType,
      name: ref.name,
      description: ref.description,
      imageUrl: signedUrl,
      s3Key: ref.imageUrl,
      tags: ref.tags,
      starred: false,
      usageCount: 0,
      lastUsedAt: null,
      source: "PUBLIC_SAVE",
      sourcePublicRefId: publicRefId,
      createdAt: ref.createdAt.toISOString(),
    },
  };
}
