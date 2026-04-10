"use server";

import { db } from "@/lib/db";
import type { Plan } from "@/generated/prisma/enums";

// ─── Plan Limits ─────────────────────────────────────

const PLAN_CREATOR_LIMITS: Record<Plan, number | null> = {
  FREE: 5,
  STARTER: 10,
  PRO: 25,
  UNLIMITED: null, // no limit
};

// ─── Result Type ─────────────────────────────────────

type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

// ─── Helpers ─────────────────────────────────────────

async function validateOwnership(userId: string, creatorId: string) {
  const creator = await db.creator.findUnique({
    where: { id: creatorId },
  });

  if (!creator) {
    return { valid: false as const, error: "Creator not found" };
  }

  if (creator.userId !== userId) {
    return { valid: false as const, error: "Unauthorized: creator does not belong to this user" };
  }

  return { valid: true as const, creator };
}

// ─── getCreators ─────────────────────────────────────

export async function getCreators(
  userId: string
): Promise<ActionResult<Awaited<ReturnType<typeof db.creator.findMany>>>> {
  try {
    const creators = await db.creator.findMany({
      where: { userId },
      orderBy: { lastUsedAt: { sort: "desc", nulls: "last" } },
    });

    return { success: true, data: creators };
  } catch (error) {
    console.error("getCreators error:", error);
    return { success: false, error: "Failed to fetch creators" };
  }
}

// ─── getCreator ──────────────────────────────────────

export async function getCreator(
  userId: string,
  creatorId: string
): Promise<ActionResult<Awaited<ReturnType<typeof db.creator.findUnique>>>> {
  try {
    const result = await validateOwnership(userId, creatorId);

    if (!result.valid) {
      return { success: false, error: result.error };
    }

    return { success: true, data: result.creator };
  } catch (error) {
    console.error("getCreator error:", error);
    return { success: false, error: "Failed to fetch creator" };
  }
}

// ─── createCreator ───────────────────────────────────

export async function createCreator(
  userId: string,
  data: {
    name: string;
    niche: string[];
    settings?: Record<string, unknown>;
  }
): Promise<ActionResult<Awaited<ReturnType<typeof db.creator.create>>>> {
  try {
    // Look up user to check plan limits
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { plan: true },
    });

    if (!user) {
      return { success: false, error: "User not found" };
    }

    const limit = PLAN_CREATOR_LIMITS[user.plan];

    if (limit !== null) {
      const currentCount = await db.creator.count({
        where: { userId },
      });

      if (currentCount >= limit) {
        return {
          success: false,
          error: `Creator limit reached. Your ${user.plan} plan allows ${limit} creators. Upgrade your plan to create more.`,
        };
      }
    }

    const creator = await db.creator.create({
      data: {
        userId,
        name: data.name,
        niche: data.niche,
        settings: (data.settings ?? {}) as Record<string, string | number | boolean | null>,
      },
    });

    return { success: true, data: creator };
  } catch (error) {
    console.error("createCreator error:", error);
    return { success: false, error: "Failed to create creator" };
  }
}

// ─── updateCreator ───────────────────────────────────

export async function updateCreator(
  userId: string,
  creatorId: string,
  data: Partial<{
    name: string;
    niche: string[];
    settings: Record<string, unknown>;
    baseImageUrl: string;
    voiceId: string;
    voiceProvider: string;
  }>
): Promise<ActionResult<Awaited<ReturnType<typeof db.creator.update>>>> {
  try {
    const ownership = await validateOwnership(userId, creatorId);

    if (!ownership.valid) {
      return { success: false, error: ownership.error };
    }

    // Build update payload — only include fields that are present
    const creator = await db.creator.update({
      where: { id: creatorId },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.niche !== undefined && { niche: data.niche }),
        ...(data.settings !== undefined && {
          settings: data.settings as Record<string, string | number | boolean | null>,
        }),
        ...(data.baseImageUrl !== undefined && { baseImageUrl: data.baseImageUrl }),
        ...(data.voiceId !== undefined && { voiceId: data.voiceId }),
        ...(data.voiceProvider !== undefined && { voiceProvider: data.voiceProvider }),
      },
    });

    return { success: true, data: creator };
  } catch (error) {
    console.error("updateCreator error:", error);
    return { success: false, error: "Failed to update creator" };
  }
}

// ─── deleteCreator ───────────────────────────────────

export async function deleteCreator(
  userId: string,
  creatorId: string
): Promise<ActionResult<{ id: string }>> {
  try {
    const ownership = await validateOwnership(userId, creatorId);

    if (!ownership.valid) {
      return { success: false, error: ownership.error };
    }

    // Delete content first, then creator
    // Using a transaction to ensure atomicity
    await db.$transaction([
      db.content.deleteMany({
        where: { creatorId },
      }),
      db.creator.delete({
        where: { id: creatorId },
      }),
    ]);

    return { success: true, data: { id: creatorId } };
  } catch (error) {
    console.error("deleteCreator error:", error);
    return { success: false, error: "Failed to delete creator" };
  }
}

// ─── adoptPreMade ────────────────────────────────────

export async function adoptPreMade(
  userId: string,
  preMadeId: string,
  preMadeData: {
    name: string;
    niche: string[];
    settings: Record<string, unknown>;
    baseImageUrl?: string;
  }
): Promise<ActionResult<Awaited<ReturnType<typeof db.creator.create>>>> {
  try {
    // Check plan limits (same logic as createCreator)
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { plan: true },
    });

    if (!user) {
      return { success: false, error: "User not found" };
    }

    const limit = PLAN_CREATOR_LIMITS[user.plan];

    if (limit !== null) {
      const currentCount = await db.creator.count({
        where: { userId },
      });

      if (currentCount >= limit) {
        return {
          success: false,
          error: `Creator limit reached. Your ${user.plan} plan allows ${limit} creators. Upgrade your plan to create more.`,
        };
      }
    }

    const creator = await db.creator.create({
      data: {
        userId,
        name: preMadeData.name,
        niche: preMadeData.niche,
        settings: preMadeData.settings as Record<string, string | number | boolean | null>,
        baseImageUrl: preMadeData.baseImageUrl ?? null,
        isPreMade: true,
        preMadeId,
      },
    });

    return { success: true, data: creator };
  } catch (error) {
    console.error("adoptPreMade error:", error);
    return { success: false, error: "Failed to adopt pre-made creator" };
  }
}
