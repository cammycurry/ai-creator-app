"use server";

import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { getSignedImageUrl } from "@/lib/s3";
import * as fs from "fs";
import * as path from "path";

// ─── Auth ────────────────────────────────────────────

async function assertAdmin() {
  const { userId } = await auth();
  if (!userId || userId !== process.env.ADMIN_CLERK_ID) {
    throw new Error("Unauthorized");
  }
  return userId;
}

// ─── Dashboard Stats ─────────────────────────────────

export async function getAdminStats() {
  await assertAdmin();

  const [
    userCount,
    creatorCount,
    preMadeCount,
    contentCount,
    imageCount,
    jobCount,
    completedJobs,
    failedJobs,
    totalSpent,
    totalApiCost,
  ] = await Promise.all([
    db.user.count(),
    db.creator.count(),
    db.creator.count({ where: { isPreMade: true } }),
    db.content.count(),
    db.content.count({ where: { type: "IMAGE" } }),
    db.generationJob.count(),
    db.generationJob.count({ where: { status: "COMPLETED" } }),
    db.generationJob.count({ where: { status: "FAILED" } }),
    db.creditTransaction.aggregate({
      where: { type: "SPEND" },
      _sum: { amount: true },
    }),
    db.generationJob.aggregate({
      where: { status: "COMPLETED" },
      _sum: { actualCost: true },
    }),
  ]);

  return {
    userCount,
    creatorCount,
    customCreatorCount: creatorCount - preMadeCount,
    preMadeCount,
    contentCount,
    imageCount,
    jobCount,
    completedJobs,
    failedJobs,
    successRate: jobCount > 0 ? Math.round((completedJobs / jobCount) * 100) : 0,
    totalCreditsSpent: Math.abs(totalSpent._sum.amount ?? 0),
    totalApiCost: totalApiCost._sum.actualCost ?? 0,
  };
}

// ─── Recent Activity ─────────────────────────────────

export async function getRecentActivity(limit = 20) {
  await assertAdmin();

  const [users, creators, content, transactions] = await Promise.all([
    db.user.findMany({
      orderBy: { createdAt: "desc" },
      take: limit,
      select: { id: true, email: true, createdAt: true },
    }),
    db.creator.findMany({
      orderBy: { createdAt: "desc" },
      take: limit,
      select: { id: true, name: true, createdAt: true, user: { select: { email: true } } },
    }),
    db.content.findMany({
      orderBy: { createdAt: "desc" },
      take: limit,
      select: {
        id: true,
        type: true,
        source: true,
        createdAt: true,
        creator: { select: { name: true, user: { select: { email: true } } } },
      },
    }),
    db.creditTransaction.findMany({
      orderBy: { createdAt: "desc" },
      take: limit,
      select: {
        id: true,
        type: true,
        amount: true,
        description: true,
        createdAt: true,
        user: { select: { email: true } },
      },
    }),
  ]);

  type ActivityItem = {
    id: string;
    kind: string;
    description: string;
    email: string;
    createdAt: Date;
  };

  const items: ActivityItem[] = [
    ...users.map((u) => ({
      id: u.id,
      kind: "user" as const,
      description: `New user signed up`,
      email: u.email,
      createdAt: u.createdAt,
    })),
    ...creators.map((c) => ({
      id: c.id,
      kind: "creator" as const,
      description: `Created "${c.name}"`,
      email: c.user.email,
      createdAt: c.createdAt,
    })),
    ...content.map((c) => ({
      id: c.id,
      kind: "content" as const,
      description: `Generated ${c.type.toLowerCase()} via ${c.source.toLowerCase()}`,
      email: c.creator.user.email,
      createdAt: c.createdAt,
    })),
    ...transactions.map((t) => ({
      id: t.id,
      kind: "credit" as const,
      description: `${t.type}: ${t.amount > 0 ? "+" : ""}${t.amount} — ${t.description}`,
      email: t.user.email,
      createdAt: t.createdAt,
    })),
  ];

  return items
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, limit);
}

// ─── Quick Generate (direct Gemini, no credits) ──────

export async function adminQuickGenerate(data: {
  prompt: string;
  model: string;
  count: number;
  label: string;
  refImageUrl?: string;
}) {
  await assertAdmin();

  const { GoogleGenAI, HarmCategory, HarmBlockThreshold } = await import(
    "@google/genai"
  );
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

  const SAFETY_OFF = [
    { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
    { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
    { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
    { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
  ];

  const timestamp = new Date()
    .toISOString()
    .replace(/[:.]/g, "-")
    .substring(0, 19);
  const folderName = `${timestamp}_${data.label || "quick-test"}`;
  const outputDir = path.join(process.cwd(), "scripts", "output", folderName);
  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(path.join(outputDir, "prompt.txt"), data.prompt);
  fs.writeFileSync(path.join(outputDir, "model.txt"), data.model);

  const startTime = Date.now();

  // Build contents with optional reference image
  const buildContents = () => {
    const parts: Array<
      { text: string } | { inlineData: { mimeType: string; data: string } }
    > = [{ text: data.prompt }];

    if (data.refImageUrl) {
      const refPath = data.refImageUrl;
      if (fs.existsSync(refPath)) {
        const imgBuffer = fs.readFileSync(refPath);
        const base64 = imgBuffer.toString("base64");
        const ext = path.extname(refPath).toLowerCase();
        const mimeType = ext === ".png" ? "image/png" : "image/jpeg";
        parts.push({ inlineData: { mimeType, data: base64 } });
        fs.writeFileSync(path.join(outputDir, "ref-path.txt"), refPath);
      }
    }
    return parts;
  };

  // Generate in parallel
  const promises = Array.from({ length: data.count }, async (_, i) => {
    try {
      const response = await ai.models.generateContent({
        model: data.model,
        contents: data.refImageUrl ? buildContents() : data.prompt,
        config: {
          responseModalities: ["TEXT", "IMAGE"],
          safetySettings: SAFETY_OFF,
        },
      });
      const part = response.candidates?.[0]?.content?.parts?.find(
        (p: { inlineData?: { data?: string } }) => p.inlineData?.data
      );
      if (part?.inlineData?.data) {
        const outPath = path.join(outputDir, `image-${i + 1}.jpg`);
        fs.writeFileSync(outPath, Buffer.from(part.inlineData.data, "base64"));
        return true;
      }
      return false;
    } catch {
      return false;
    }
  });

  const results = await Promise.all(promises);
  const succeeded = results.filter(Boolean).length;
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  return {
    success: true,
    imageCount: succeeded,
    elapsed,
    folder: folderName,
  };
}

// ─── Test Runs (read from disk) ──────────────────────

export async function getTestRuns() {
  await assertAdmin();

  const outputDir = path.join(process.cwd(), "scripts", "output");
  if (!fs.existsSync(outputDir)) return [];

  const dirs = fs
    .readdirSync(outputDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => {
      const runDir = path.join(outputDir, d.name);
      const promptFile = path.join(runDir, "prompt.txt");
      const refFile = path.join(runDir, "ref-path.txt");
      const modelFile = path.join(runDir, "model.txt");
      const images = fs
        .readdirSync(runDir)
        .filter((f) => f.endsWith(".jpg") || f.endsWith(".png"))
        .sort();
      const prompt = fs.existsSync(promptFile)
        ? fs.readFileSync(promptFile, "utf-8")
        : "";
      const refPath = fs.existsSync(refFile)
        ? fs.readFileSync(refFile, "utf-8").trim()
        : null;
      const model = fs.existsSync(modelFile)
        ? fs.readFileSync(modelFile, "utf-8").trim()
        : null;

      const parts = d.name.split("_");
      const timestamp = parts[0] || d.name;
      const label = parts.slice(1).join("_") || "unlabeled";

      return {
        id: d.name,
        timestamp,
        label,
        prompt,
        refPath,
        model,
        images,
        imageCount: images.length,
      };
    })
    .sort((a, b) => b.id.localeCompare(a.id));

  return dirs;
}

// ─── Users ───────────────────────────────────────────

export async function getAdminUsers() {
  await assertAdmin();

  const users = await db.user.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { creators: true, creditTransactions: true } },
    },
  });

  const usersWithCounts = await Promise.all(
    users.map(async (user) => {
      const contentCount = await db.content.count({
        where: { creator: { userId: user.id } },
      });
      return { ...user, contentCount };
    })
  );

  return usersWithCounts;
}

export async function getAdminUserDetail(userId: string) {
  await assertAdmin();

  const user = await db.user.findUnique({
    where: { id: userId },
    include: {
      creators: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          name: true,
          niche: true,
          baseImageUrl: true,
          isPreMade: true,
          contentCount: true,
          createdAt: true,
        },
      },
      creditTransactions: {
        orderBy: { createdAt: "desc" },
        take: 20,
      },
    },
  });

  return user;
}

// ─── Creators ────────────────────────────────────────

export async function getAdminCreators() {
  await assertAdmin();

  return db.creator.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      user: { select: { email: true } },
    },
  });
}

export async function getAdminCreatorDetail(creatorId: string) {
  await assertAdmin();

  const creator = await db.creator.findUnique({
    where: { id: creatorId },
    include: {
      user: { select: { email: true, name: true } },
      content: {
        orderBy: { createdAt: "desc" },
        take: 12,
        select: { id: true, type: true, url: true, thumbnailUrl: true, createdAt: true },
      },
    },
  });

  if (creator?.baseImageUrl) {
    const signedUrl = await getSignedImageUrl(creator.baseImageUrl);
    return { ...creator, baseImageSignedUrl: signedUrl };
  }

  return creator;
}

// ─── Content ─────────────────────────────────────────

export async function getAdminContent() {
  await assertAdmin();

  const content = await db.content.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      creator: {
        select: { name: true, user: { select: { email: true } } },
      },
    },
  });

  const withUrls = await Promise.all(
    content.map(async (c) => {
      let signedUrl: string | null = null;
      if (c.url) {
        try {
          signedUrl = await getSignedImageUrl(c.url);
        } catch {
          // S3 key might not exist
        }
      }
      return { ...c, signedUrl };
    })
  );

  return withUrls;
}

export async function adminDeleteContent(contentId: string) {
  await assertAdmin();

  await db.content.delete({ where: { id: contentId } });
  return { success: true };
}

// ─── Credits ─────────────────────────────────────────

export async function getAdminCredits() {
  await assertAdmin();

  return db.creditTransaction.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      user: { select: { email: true } },
    },
  });
}

export async function adminGrantCredits(data: {
  userId: string;
  amount: number;
  type: "BONUS" | "REFUND";
  description: string;
}) {
  await assertAdmin();

  const user = await db.user.findUnique({ where: { id: data.userId } });
  if (!user) throw new Error("User not found");

  const newBalance = user.packCredits + data.amount;

  await db.$transaction([
    db.user.update({
      where: { id: data.userId },
      data: { packCredits: { increment: data.amount } },
    }),
    db.creditTransaction.create({
      data: {
        userId: data.userId,
        type: data.type,
        amount: data.amount,
        balance: user.planCredits + newBalance,
        description: data.description,
      },
    }),
  ]);

  return { success: true };
}

// ─── Generation Jobs ─────────────────────────────────

export async function getAdminJobs() {
  await assertAdmin();

  return db.generationJob.findMany({
    orderBy: { createdAt: "desc" },
  });
}

// ─── References ──────────────────────────────────────

export async function getRefAccounts() {
  await assertAdmin();

  const accounts = await db.referenceAccount.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { posts: true } },
    },
  });

  return accounts.map((a) => ({
    ...a,
    savedPosts: a._count.posts,
  }));
}

export async function getRefPosts(accountId: string) {
  await assertAdmin();

  const posts = await db.referencePost.findMany({
    where: { accountId },
    orderBy: { createdAt: "desc" },
  });

  const withUrls = await Promise.all(
    posts.map(async (post) => {
      const imageUrl = await getSignedImageUrl(post.s3Key);
      return { ...post, imageUrl };
    })
  );

  return withUrls;
}
