"use server";

import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { getSignedImageUrl } from "@/lib/s3";
import type { ContentTemplateItem, GenerationConfig, TemplateTrend } from "@/types/template";

export async function getContentTemplates(
  category?: string,
  type?: string,
  trend?: string,
  search?: string,
  limit: number = 40,
  offset: number = 0
): Promise<ContentTemplateItem[]> {
  const { userId: clerkId } = await auth();
  if (!clerkId) return [];

  const where: Record<string, unknown> = { isActive: true };
  if (category && category !== "all") where.category = category;
  if (type) where.type = type;
  if (trend) where.trend = trend;
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { description: { contains: search, mode: "insensitive" } },
      { tags: { hasSome: [search.toLowerCase()] } },
    ];
  }

  const templates = await db.contentTemplate.findMany({
    where,
    orderBy: { popularity: "desc" },
    take: limit,
    skip: offset,
  });

  return Promise.all(
    templates.map(async (t) => ({
      id: t.id,
      type: t.type,
      name: t.name,
      description: t.description,
      mediaUrl: await getSignedImageUrl(t.mediaUrl),
      thumbnailUrl: t.thumbnailUrl ? await getSignedImageUrl(t.thumbnailUrl) : undefined,
      sourceVideoUrl: t.sourceVideoUrl ? await getSignedImageUrl(t.sourceVideoUrl) : undefined,
      category: t.category,
      trend: t.trend,
      tags: t.tags,
      generationConfig: t.generationConfig as GenerationConfig,
      popularity: t.popularity,
      createdAt: t.createdAt.toISOString(),
    }))
  );
}

export async function getTemplateTrends(): Promise<TemplateTrend[]> {
  const { userId: clerkId } = await auth();
  if (!clerkId) return [];

  const results = await db.contentTemplate.groupBy({
    by: ["trend", "category"],
    where: { isActive: true },
    _count: { id: true },
    orderBy: { _count: { id: "desc" } },
  });

  return results.map((r) => ({
    trend: r.trend,
    count: r._count.id,
    category: r.category,
  }));
}

export async function useTemplate(
  templateId: string
): Promise<{ success: boolean; config?: GenerationConfig; error?: string }> {
  const { userId: clerkId } = await auth();
  if (!clerkId) return { success: false, error: "Not authenticated" };

  const template = await db.contentTemplate.findUnique({ where: { id: templateId } });
  if (!template || !template.isActive) return { success: false, error: "Template not found" };

  await db.contentTemplate.update({
    where: { id: templateId },
    data: { popularity: { increment: 1 } },
  });

  return { success: true, config: template.generationConfig as GenerationConfig };
}
