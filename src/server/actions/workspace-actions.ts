"use server";

import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { getSignedImageUrl } from "@/lib/s3";
import type { Creator } from "@/types/creator";
import type { CreditBalance } from "@/types/credits";

export type WorkspaceData = {
  creators: Creator[];
  balance: CreditBalance;
};

export async function getWorkspaceData(): Promise<WorkspaceData> {
  const { userId: clerkId } = await auth();

  if (!clerkId) {
    return {
      creators: [],
      balance: { planCredits: 0, packCredits: 0, total: 0 },
    };
  }

  // Fetch or create user by clerkId
  let user = await db.user.findUnique({
    where: { clerkId },
  });

  if (!user) {
    user = await db.user.create({
      data: {
        clerkId,
        email: "pending@setup.com",
        plan: "FREE",
        planCredits: 50,
        packCredits: 0,
      },
    });
  }

  // Fetch creators with content count + generating count (parallel)
  const [creators, generatingCounts] = await Promise.all([
    db.creator.findMany({
      where: { userId: user.id },
      orderBy: { lastUsedAt: { sort: "desc", nulls: "last" } },
      include: { _count: { select: { content: true } } },
    }),
    db.content.groupBy({
      by: ["creatorId"],
      where: { creator: { userId: user.id }, status: "GENERATING" },
      _count: { _all: true },
    }),
  ]);
  const generatingMap = new Map(
    generatingCounts.map((g) => [g.creatorId, g._count._all] as const)
  );

  const creatorsWithUrls = await Promise.all(
    creators.map(async (c) => ({
      id: c.id,
      userId: c.userId,
      name: c.name,
      niche: c.niche,
      isPreMade: c.isPreMade,
      preMadeId: c.preMadeId ?? undefined,
      baseImageUrl: c.baseImageUrl
        ? await getSignedImageUrl(c.baseImageUrl)
        : undefined,
      baseImageUpscaledUrl: c.baseImageUpscaledUrl ?? undefined,
      settings: (c.settings ?? {}) as Record<string, unknown>,
      referenceImages: (c.referenceImages ?? []) as {
        type: string;
        url: string;
      }[],
      voiceId: c.voiceId ?? undefined,
      voiceProvider: c.voiceProvider ?? undefined,
      contentCount: c._count.content,
      generatingCount: generatingMap.get(c.id) ?? 0,
      lastUsedAt: c.lastUsedAt?.toISOString(),
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
    }))
  );

  return {
    creators: creatorsWithUrls,
    balance: {
      planCredits: user.planCredits,
      packCredits: user.packCredits,
      total: user.planCredits + user.packCredits,
    },
  };
}
