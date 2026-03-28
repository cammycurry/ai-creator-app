# Admin Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an internal admin dashboard at `/admin` for prompt testing, DB management, reference browsing, and system overview.

**Architecture:** Route group inside existing Next.js app at `src/app/admin/`. Shares Prisma, Clerk auth, S3, and all existing server actions. Gated by `ADMIN_CLERK_ID` env var. Styled with Tailwind + shadcn/ui.

**Tech Stack:** Next.js 16 App Router, Prisma, Clerk, S3, Zustand, shadcn/ui, Gemini API

**Spec:** `docs/superpowers/specs/2026-03-28-admin-dashboard-design.md`

---

## File Structure Overview

```
src/app/admin/
├── layout.tsx                    # Admin shell: auth gate + sidebar layout
├── page.tsx                      # Dashboard home (stats + activity)
├── prompt-lab/page.tsx           # Prompt testing (quick + pipeline)
├── references/page.tsx           # Instagram reference browser
├── users/page.tsx                # User management table
├── creators/page.tsx             # Creator management table
├── content/page.tsx              # Content browser
├── credits/page.tsx              # Credit transactions + grants
├── jobs/page.tsx                 # Generation job history
src/app/api/admin/
├── img/[...path]/route.ts        # Serve test images from scripts/output/
src/server/actions/
├── admin-actions.ts              # All admin server actions
src/stores/
├── admin-store.ts                # Admin UI state
src/components/admin/
├── admin-sidebar.tsx             # Navigation sidebar
├── admin-shell.tsx               # Client wrapper (sidebar + mobile)
├── stats-cards.tsx               # Dashboard stat cards
├── activity-feed.tsx             # Recent activity list
├── data-table.tsx                # Reusable sortable table
├── detail-panel.tsx              # Slide-out detail sheet
├── image-lightbox.tsx            # Full-screen image viewer
├── prompt-lab/
│   ├── quick-test.tsx            # Direct Gemini test form + results
│   ├── pipeline-test.tsx         # Full pipeline test form
│   ├── test-results.tsx          # Image grid for results
│   └── compare-view.tsx          # Side-by-side comparison
├── references/
│   ├── account-grid.tsx          # Reference account cards
│   └── post-grid.tsx             # Reference post thumbnails
```

---

## Task 1: Admin Layout + Auth Gate + Sidebar

The foundation — layout, auth check, sidebar nav, and the admin store.

**Files:**
- Create: `src/app/admin/layout.tsx`
- Create: `src/components/admin/admin-shell.tsx`
- Create: `src/components/admin/admin-sidebar.tsx`
- Create: `src/stores/admin-store.ts`

- [ ] **Step 1: Create admin Zustand store**

```typescript
// src/stores/admin-store.ts
import { create } from "zustand";

type AdminStore = {
  // Prompt lab state
  promptText: string;
  setPromptText: (text: string) => void;
  selectedModel: string;
  setSelectedModel: (model: string) => void;
  imageCount: number;
  setImageCount: (count: number) => void;
  testLabel: string;
  setTestLabel: (label: string) => void;

  // Compare
  compareIds: string[];
  toggleCompare: (id: string) => void;
  clearCompare: () => void;

  // Lightbox
  lightboxSrc: string | null;
  openLightbox: (src: string) => void;
  closeLightbox: () => void;
};

export const useAdminStore = create<AdminStore>((set) => ({
  promptText: "",
  setPromptText: (text) => set({ promptText: text }),
  selectedModel: "gemini-3-pro-image-preview",
  setSelectedModel: (model) => set({ selectedModel: model }),
  imageCount: 4,
  setImageCount: (count) => set({ imageCount: count }),
  testLabel: "",
  setTestLabel: (label) => set({ testLabel: label }),

  compareIds: [],
  toggleCompare: (id) =>
    set((state) => {
      if (state.compareIds.includes(id)) {
        return { compareIds: state.compareIds.filter((x) => x !== id) };
      }
      if (state.compareIds.length >= 2) {
        return { compareIds: [state.compareIds[1], id] };
      }
      return { compareIds: [...state.compareIds, id] };
    }),
  clearCompare: () => set({ compareIds: [] }),

  lightboxSrc: null,
  openLightbox: (src) => set({ lightboxSrc: src }),
  closeLightbox: () => set({ lightboxSrc: null }),
}));
```

- [ ] **Step 2: Create admin sidebar component**

```typescript
// src/components/admin/admin-sidebar.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FlaskConical,
  Image,
  Users,
  Sparkles,
  CreditCard,
  Activity,
  Instagram,
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/prompt-lab", label: "Prompt Lab", icon: FlaskConical },
  { href: "/admin/references", label: "References", icon: Instagram },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/creators", label: "Creators", icon: Sparkles },
  { href: "/admin/content", label: "Content", icon: Image },
  { href: "/admin/credits", label: "Credits", icon: CreditCard },
  { href: "/admin/jobs", label: "Jobs", icon: Activity },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <div className="flex h-full w-56 flex-col border-r border-zinc-800 bg-zinc-950">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-zinc-800 px-4 py-4">
        <div className="flex h-7 w-7 items-center justify-center rounded bg-[#C4603A] text-xs font-bold text-white">
          Vi
        </div>
        <span className="text-sm font-semibold text-zinc-100">Admin</span>
      </div>

      {/* Nav */}
      <nav className="flex flex-1 flex-col gap-1 p-3">
        {NAV_ITEMS.map((item) => {
          const isActive =
            item.href === "/admin"
              ? pathname === "/admin"
              : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors ${
                isActive
                  ? "bg-zinc-800 text-zinc-100"
                  : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200"
              }`}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-zinc-800 px-4 py-3">
        <Link
          href="/workspace"
          className="flex items-center gap-2 text-xs text-zinc-500 hover:text-zinc-300"
        >
          ← Back to App
        </Link>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create admin shell (client wrapper)**

```typescript
// src/components/admin/admin-shell.tsx
"use client";

import { AdminSidebar } from "./admin-sidebar";
import { useAdminStore } from "@/stores/admin-store";

export function AdminShell({ children }: { children: React.ReactNode }) {
  const { lightboxSrc, closeLightbox } = useAdminStore();

  return (
    <div className="flex h-screen bg-zinc-950 text-zinc-100">
      <AdminSidebar />
      <main className="flex-1 overflow-auto">{children}</main>

      {/* Global lightbox */}
      {lightboxSrc && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 cursor-pointer"
          onClick={closeLightbox}
        >
          <img
            src={lightboxSrc}
            alt=""
            className="max-h-[90vh] max-w-[90vw] rounded-lg"
          />
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Create admin layout with auth gate**

```typescript
// src/app/admin/layout.tsx
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { AdminShell } from "@/components/admin/admin-shell";

export const metadata = {
  title: "Admin — realinfluencer.ai",
  robots: { index: false, follow: false },
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId } = await auth();

  if (!userId || userId !== process.env.ADMIN_CLERK_ID) {
    redirect("/");
  }

  return <AdminShell>{children}</AdminShell>;
}
```

- [ ] **Step 5: Add ADMIN_CLERK_ID to .env.local**

Add to `.env.local`:
```
ADMIN_CLERK_ID=user_REPLACE_WITH_YOUR_CLERK_ID
```

Look up your Clerk user ID: run `npx tsx -e "import { db } from './src/lib/db'; db.user.findFirst().then(u => console.log(u?.clerkId))"` or check Clerk dashboard.

- [ ] **Step 6: Create placeholder admin home page**

```typescript
// src/app/admin/page.tsx
export default function AdminDashboard() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold">Admin Dashboard</h1>
      <p className="mt-2 text-zinc-400">Overview coming in Task 3.</p>
    </div>
  );
}
```

- [ ] **Step 7: Verify it works**

Run: `pnpm dev`

Visit `http://localhost:3000/admin` — should see the sidebar + placeholder page if logged in as admin. Any other user (or logged out) should redirect to `/`.

- [ ] **Step 8: Commit**

```bash
git add src/app/admin/ src/components/admin/ src/stores/admin-store.ts
git commit -m "feat(admin): layout, auth gate, sidebar navigation"
```

---

## Task 2: Server Actions + Image Serving Route

All admin-specific server actions and the API route for serving test images from disk.

**Files:**
- Create: `src/server/actions/admin-actions.ts`
- Create: `src/app/api/admin/img/[...path]/route.ts`

- [ ] **Step 1: Create admin server actions**

```typescript
// src/server/actions/admin-actions.ts
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
      // If it's a local file path
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

  // Get content counts per user via creators
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

  // Sign base image URL if it exists
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

  // Sign URLs for display
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
```

- [ ] **Step 2: Create image serving API route**

```typescript
// src/app/api/admin/img/[...path]/route.ts
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import * as fs from "fs";
import * as path from "path";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { userId } = await auth();
  if (!userId || userId !== process.env.ADMIN_CLERK_ID) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { path: segments } = await params;
  const imgPath = path.join(process.cwd(), "scripts", "output", ...segments);

  if (!fs.existsSync(imgPath)) {
    return new NextResponse("Not found", { status: 404 });
  }

  const ext = path.extname(imgPath).toLowerCase();
  const contentType = ext === ".png" ? "image/png" : "image/jpeg";
  const buffer = fs.readFileSync(imgPath);

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=3600",
    },
  });
}
```

- [ ] **Step 3: Verify server actions compile**

Run: `pnpm build`

Should compile without errors. Fix any type issues.

- [ ] **Step 4: Commit**

```bash
git add src/server/actions/admin-actions.ts src/app/api/admin/
git commit -m "feat(admin): server actions + image serving route"
```

---

## Task 3: Dashboard Home Page

Stats cards and recent activity feed.

**Files:**
- Create: `src/components/admin/stats-cards.tsx`
- Create: `src/components/admin/activity-feed.tsx`
- Modify: `src/app/admin/page.tsx`

- [ ] **Step 1: Create stats cards component**

```typescript
// src/components/admin/stats-cards.tsx
import { Users, Sparkles, Image, Activity, CreditCard, DollarSign } from "lucide-react";

type Stats = {
  userCount: number;
  creatorCount: number;
  customCreatorCount: number;
  preMadeCount: number;
  contentCount: number;
  imageCount: number;
  jobCount: number;
  completedJobs: number;
  failedJobs: number;
  successRate: number;
  totalCreditsSpent: number;
  totalApiCost: number;
};

const CARDS = [
  { key: "userCount", label: "Users", icon: Users },
  { key: "creatorCount", label: "Creators", icon: Sparkles, sub: (s: Stats) => `${s.customCreatorCount} custom, ${s.preMadeCount} pre-made` },
  { key: "contentCount", label: "Content", icon: Image, sub: (s: Stats) => `${s.imageCount} images` },
  { key: "completedJobs", label: "Generations", icon: Activity, sub: (s: Stats) => `${s.successRate}% success, ${s.failedJobs} failed` },
  { key: "totalCreditsSpent", label: "Credits Spent", icon: CreditCard },
  { key: "totalApiCost", label: "API Cost", icon: DollarSign, format: (v: number) => `$${v.toFixed(2)}` },
] as const;

export function StatsCards({ stats }: { stats: Stats }) {
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
      {CARDS.map((card) => {
        const Icon = card.icon;
        const value = stats[card.key as keyof Stats];
        const formatted = "format" in card && card.format ? card.format(value as number) : String(value);
        const sub = "sub" in card && card.sub ? card.sub(stats) : null;

        return (
          <div
            key={card.key}
            className="rounded-lg border border-zinc-800 bg-zinc-900 p-4"
          >
            <div className="flex items-center gap-2 text-zinc-400">
              <Icon className="h-4 w-4" />
              <span className="text-xs">{card.label}</span>
            </div>
            <div className="mt-2 text-2xl font-bold text-zinc-100">
              {formatted}
            </div>
            {sub && (
              <div className="mt-1 text-xs text-zinc-500">{sub}</div>
            )}
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: Create activity feed component**

```typescript
// src/components/admin/activity-feed.tsx
import { Users, Sparkles, Image, CreditCard } from "lucide-react";

type ActivityItem = {
  id: string;
  kind: string;
  description: string;
  email: string;
  createdAt: Date;
};

const KIND_ICONS: Record<string, typeof Users> = {
  user: Users,
  creator: Sparkles,
  content: Image,
  credit: CreditCard,
};

export function ActivityFeed({ items }: { items: ActivityItem[] }) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900">
      <div className="border-b border-zinc-800 px-4 py-3">
        <h2 className="text-sm font-semibold text-zinc-100">Recent Activity</h2>
      </div>
      <div className="divide-y divide-zinc-800/50">
        {items.map((item) => {
          const Icon = KIND_ICONS[item.kind] || Users;
          return (
            <div
              key={item.id}
              className="flex items-center gap-3 px-4 py-2.5"
            >
              <Icon className="h-3.5 w-3.5 text-zinc-500" />
              <span className="flex-1 text-sm text-zinc-300">
                {item.description}
              </span>
              <span className="text-xs text-zinc-600">{item.email}</span>
              <span className="text-xs text-zinc-600">
                {new Date(item.createdAt).toLocaleDateString()}
              </span>
            </div>
          );
        })}
        {items.length === 0 && (
          <div className="px-4 py-8 text-center text-sm text-zinc-600">
            No activity yet.
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Wire up admin home page**

```typescript
// src/app/admin/page.tsx
import Link from "next/link";
import { getAdminStats, getRecentActivity } from "@/server/actions/admin-actions";
import { StatsCards } from "@/components/admin/stats-cards";
import { ActivityFeed } from "@/components/admin/activity-feed";

export default async function AdminDashboard() {
  const [stats, activity] = await Promise.all([
    getAdminStats(),
    getRecentActivity(),
  ]);

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold">Dashboard</h1>
      <p className="mt-1 text-sm text-zinc-400">
        System overview for realinfluencer.ai
      </p>

      <div className="mt-6">
        <StatsCards stats={stats} />
      </div>

      {/* Quick links */}
      <div className="mt-6 flex gap-3">
        <Link
          href="/admin/prompt-lab"
          className="rounded-md bg-[#C4603A] px-4 py-2 text-sm font-medium text-white hover:bg-[#d4704a]"
        >
          Run a prompt test
        </Link>
        <Link
          href="/admin/credits"
          className="rounded-md border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-300 hover:bg-zinc-800"
        >
          Grant credits
        </Link>
        <Link
          href="/admin/jobs?status=FAILED"
          className="rounded-md border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-300 hover:bg-zinc-800"
        >
          View failed jobs
        </Link>
      </div>

      <div className="mt-6">
        <ActivityFeed items={activity} />
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Verify it works**

Run: `pnpm dev`, visit `/admin`. Should show stats cards with real data from your DB + recent activity feed.

- [ ] **Step 5: Commit**

```bash
git add src/app/admin/page.tsx src/components/admin/stats-cards.tsx src/components/admin/activity-feed.tsx
git commit -m "feat(admin): dashboard home with stats and activity feed"
```

---

## Task 4: Prompt Lab — Quick Test Mode

Port the current Prompt Lab's core functionality.

**Files:**
- Create: `src/app/admin/prompt-lab/page.tsx`
- Create: `src/components/admin/prompt-lab/quick-test.tsx`
- Create: `src/components/admin/prompt-lab/test-results.tsx`
- Create: `src/components/admin/prompt-lab/compare-view.tsx`

- [ ] **Step 1: Create test results grid component**

```typescript
// src/components/admin/prompt-lab/test-results.tsx
"use client";

import { useAdminStore } from "@/stores/admin-store";

type TestRun = {
  id: string;
  timestamp: string;
  label: string;
  prompt: string;
  model: string | null;
  images: string[];
  imageCount: number;
};

export function TestResults({ runs }: { runs: TestRun[] }) {
  const { compareIds, toggleCompare, openLightbox } = useAdminStore();

  if (runs.length === 0) {
    return (
      <div className="py-12 text-center text-sm text-zinc-600">
        No test runs yet. Generate some images above.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {runs.map((run) => (
        <div
          key={run.id}
          className={`overflow-hidden rounded-lg border ${
            compareIds.includes(run.id)
              ? "border-[#C4603A]"
              : "border-zinc-800"
          } bg-zinc-900`}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-zinc-800/50 px-4 py-3">
            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold text-zinc-100">
                {run.label}
              </span>
              <span className="text-xs text-zinc-600">{run.timestamp}</span>
              <span className="rounded bg-zinc-800 px-2 py-0.5 text-xs text-zinc-400">
                {run.imageCount} images
              </span>
              {run.model && (
                <span className="rounded bg-zinc-800 px-2 py-0.5 text-xs text-zinc-400">
                  {run.model.includes("flash") ? "NB2" : "NBPro"}
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => toggleCompare(run.id)}
                className={`rounded-md px-3 py-1 text-xs font-medium ${
                  compareIds.includes(run.id)
                    ? "bg-[#C4603A] text-white"
                    : "border border-zinc-700 text-zinc-400 hover:bg-zinc-800"
                }`}
              >
                {compareIds.includes(run.id) ? "✓ Comparing" : "Compare"}
              </button>
            </div>
          </div>

          {/* Prompt */}
          <div
            className="max-h-14 cursor-pointer overflow-hidden bg-zinc-950/50 px-4 py-2 text-xs leading-relaxed text-zinc-500 transition-all hover:max-h-96"
          >
            {run.prompt}
          </div>

          {/* Images */}
          <div className="grid grid-cols-2 gap-1.5 p-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {run.images.map((img, i) => (
              <div
                key={img}
                className="relative cursor-pointer overflow-hidden rounded-md bg-zinc-800"
                style={{ aspectRatio: "3/2" }}
                onClick={() =>
                  openLightbox(`/api/admin/img/${run.id}/${img}`)
                }
              >
                <img
                  src={`/api/admin/img/${run.id}/${img}`}
                  alt=""
                  className="h-full w-full object-cover transition-transform hover:scale-[1.02]"
                  loading="lazy"
                />
                <span className="absolute bottom-1 left-1 rounded bg-black/70 px-1.5 py-0.5 text-[10px] text-white">
                  #{i + 1}
                </span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Create compare view component**

```typescript
// src/components/admin/prompt-lab/compare-view.tsx
"use client";

import { useAdminStore } from "@/stores/admin-store";

type TestRun = {
  id: string;
  label: string;
  prompt: string;
  images: string[];
};

export function CompareView({ runs }: { runs: TestRun[] }) {
  const { compareIds, clearCompare, openLightbox } = useAdminStore();

  const selectedRuns = compareIds
    .map((id) => runs.find((r) => r.id === id))
    .filter(Boolean) as TestRun[];

  if (selectedRuns.length < 2) {
    return (
      <div className="py-12 text-center text-sm text-zinc-600">
        Select 2 test runs to compare. Click "Compare" on any run.
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-base font-semibold">Side-by-Side Compare</h2>
        <button
          onClick={clearCompare}
          className="rounded-md border border-zinc-700 px-3 py-1 text-xs text-zinc-400 hover:bg-zinc-800"
        >
          Clear Selection
        </button>
      </div>
      <div className="grid grid-cols-2 gap-6">
        {selectedRuns.map((run) => (
          <div
            key={run.id}
            className="overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900"
          >
            <div className="border-b border-zinc-800/50 px-4 py-3">
              <h3 className="text-sm font-semibold text-zinc-100">
                {run.label}
              </h3>
              <p className="mt-1 text-[11px] text-zinc-600">
                {run.prompt.substring(0, 120)}...
              </p>
            </div>
            <div className="grid grid-cols-2 gap-1 p-2">
              {run.images.map((img) => (
                <img
                  key={img}
                  src={`/api/admin/img/${run.id}/${img}`}
                  alt=""
                  className="cursor-pointer rounded-md"
                  loading="lazy"
                  onClick={() =>
                    openLightbox(`/api/admin/img/${run.id}/${img}`)
                  }
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create quick test form component**

```typescript
// src/components/admin/prompt-lab/quick-test.tsx
"use client";

import { useState, useTransition } from "react";
import { useAdminStore } from "@/stores/admin-store";
import { adminQuickGenerate, getTestRuns } from "@/server/actions/admin-actions";
import { TestResults } from "./test-results";
import { CompareView } from "./compare-view";

const PRESETS: Record<string, string> = {
  "base-female": `A photorealistic upper-body portrait photograph of a 24-year-old woman with warm olive skin, light freckles across her nose, brown eyes, and long wavy brown hair, confident expression with subtle catchlights in her eyes. She is wearing a fitted white scoop-neck sports bra, revealing a naturally athletic upper body with relaxed shoulders. Set against a pure white seamless studio backdrop. Illuminated by soft diffused studio lighting from camera-left with a subtle hair light from behind. Shot on Canon EOS R5 with 85mm f/1.4 lens, shallow depth of field, smooth background bokeh. Natural skin texture with visible pores, warm neutral color palette, photorealistic.`,
  "base-male": `A photorealistic upper-body portrait photograph of a 26-year-old man with light tan skin, brown eyes, and short dark brown hair, confident expression with subtle catchlights in his eyes. He is shirtless, revealing a naturally athletic upper body with relaxed shoulders. Set against a pure white seamless studio backdrop. Illuminated by soft diffused studio lighting from camera-left with a subtle hair light from behind. Shot on Canon EOS R5 with 85mm f/1.4 lens, shallow depth of field, smooth background bokeh. Natural skin texture with visible pores, warm neutral color palette, photorealistic.`,
};

type TestRun = {
  id: string;
  timestamp: string;
  label: string;
  prompt: string;
  model: string | null;
  images: string[];
  imageCount: number;
  refPath: string | null;
};

export function QuickTest({ initialRuns }: { initialRuns: TestRun[] }) {
  const {
    promptText, setPromptText,
    selectedModel, setSelectedModel,
    imageCount, setImageCount,
    testLabel, setTestLabel,
    compareIds,
  } = useAdminStore();

  const [runs, setRuns] = useState(initialRuns);
  const [refPath, setRefPath] = useState("");
  const [status, setStatus] = useState<{ type: string; message: string } | null>(null);
  const [isPending, startTransition] = useTransition();
  const [activeTab, setActiveTab] = useState<"runs" | "compare">("runs");

  const handlePreset = (preset: string) => {
    if (preset && PRESETS[preset]) {
      setPromptText(PRESETS[preset]);
      setTestLabel(preset);
    }
  };

  const handleGenerate = () => {
    if (!promptText.trim()) return;

    setStatus({ type: "running", message: `Generating ${imageCount} image(s) with ${selectedModel}...` });

    startTransition(async () => {
      try {
        const result = await adminQuickGenerate({
          prompt: promptText,
          model: selectedModel,
          count: imageCount,
          label: testLabel || "quick-test",
          refImageUrl: refPath || undefined,
        });

        if (result.success) {
          setStatus({
            type: "done",
            message: `Done! ${result.imageCount} images in ${result.elapsed}s → ${result.folder}`,
          });
          const updated = await getTestRuns();
          setRuns(updated);
        }
      } catch (err) {
        setStatus({
          type: "error",
          message: `Error: ${err instanceof Error ? err.message : String(err)}`,
        });
      }
    });
  };

  return (
    <div>
      {/* Form */}
      <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-5">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">
          Quick Test
        </h2>

        <textarea
          value={promptText}
          onChange={(e) => setPromptText(e.target.value)}
          placeholder="Enter your prompt or pick a preset..."
          className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:border-[#C4603A] focus:outline-none"
          rows={4}
        />

        <div className="mt-3 flex items-end gap-3">
          {/* Preset */}
          <div className="w-36">
            <label className="mb-1 block text-xs text-zinc-500">Preset</label>
            <select
              onChange={(e) => handlePreset(e.target.value)}
              className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100"
            >
              <option value="">Custom</option>
              <option value="base-female">Base Female</option>
              <option value="base-male">Base Male</option>
            </select>
          </div>

          {/* Model */}
          <div>
            <label className="mb-1 block text-xs text-zinc-500">Model</label>
            <div className="flex gap-0.5 rounded-md bg-zinc-800 p-0.5">
              {[
                { id: "gemini-3-pro-image-preview", label: "NBPro" },
                { id: "gemini-3.1-flash-image-preview", label: "NB2" },
              ].map((m) => (
                <button
                  key={m.id}
                  onClick={() => setSelectedModel(m.id)}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                    selectedModel === m.id
                      ? "bg-[#C4603A] text-white"
                      : "text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* Count */}
          <div className="w-20">
            <label className="mb-1 block text-xs text-zinc-500">Count</label>
            <input
              type="number"
              value={imageCount}
              onChange={(e) => setImageCount(parseInt(e.target.value) || 4)}
              min={1}
              max={8}
              className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100"
            />
          </div>

          {/* Label */}
          <div className="w-40">
            <label className="mb-1 block text-xs text-zinc-500">Label</label>
            <input
              type="text"
              value={testLabel}
              onChange={(e) => setTestLabel(e.target.value)}
              placeholder="test-name"
              className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100"
            />
          </div>

          {/* Ref */}
          <div className="flex-1">
            <label className="mb-1 block text-xs text-zinc-500">Reference Image (optional)</label>
            <input
              type="text"
              value={refPath}
              onChange={(e) => setRefPath(e.target.value)}
              placeholder="path/to/image.jpg"
              className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100"
            />
          </div>

          {/* Generate */}
          <button
            onClick={handleGenerate}
            disabled={isPending || !promptText.trim()}
            className="rounded-md bg-[#C4603A] px-5 py-2 text-sm font-semibold text-white hover:bg-[#d4704a] disabled:opacity-50"
          >
            {isPending ? "Generating..." : "Generate"}
          </button>
        </div>

        {/* Status */}
        {status && (
          <div
            className={`mt-3 rounded-md px-3 py-2 text-xs ${
              status.type === "running"
                ? "border border-yellow-900 bg-yellow-950/30 text-yellow-400"
                : status.type === "done"
                  ? "border border-green-900 bg-green-950/30 text-green-400"
                  : "border border-red-900 bg-red-950/30 text-red-400"
            }`}
          >
            {status.message}
          </div>
        )}
      </div>

      {/* Tab toggle */}
      <div className="mt-6 flex gap-2">
        <button
          onClick={() => setActiveTab("runs")}
          className={`rounded-md px-4 py-1.5 text-sm ${
            activeTab === "runs"
              ? "bg-[#C4603A] text-white"
              : "border border-zinc-700 text-zinc-400"
          }`}
        >
          Test Runs
        </button>
        <button
          onClick={() => setActiveTab("compare")}
          className={`rounded-md px-4 py-1.5 text-sm ${
            activeTab === "compare"
              ? "bg-[#C4603A] text-white"
              : "border border-zinc-700 text-zinc-400"
          }`}
        >
          Compare {compareIds.length === 2 && "✓"}
        </button>
      </div>

      {/* Content */}
      <div className="mt-4">
        {activeTab === "runs" ? (
          <TestResults runs={runs} />
        ) : (
          <CompareView runs={runs} />
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Create Prompt Lab page**

```typescript
// src/app/admin/prompt-lab/page.tsx
import { getTestRuns } from "@/server/actions/admin-actions";
import { QuickTest } from "@/components/admin/prompt-lab/quick-test";

export default async function PromptLabPage() {
  const runs = await getTestRuns();

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold">Prompt Lab</h1>
      <p className="mt-1 text-sm text-zinc-400">
        Test prompts directly against Gemini. No credits, no DB records.
      </p>

      <div className="mt-6">
        <QuickTest initialRuns={runs} />
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Verify it works**

Run: `pnpm dev`, visit `/admin/prompt-lab`. Test generating images with a preset. Verify images display in the grid, lightbox works, compare selection works.

- [ ] **Step 6: Commit**

```bash
git add src/app/admin/prompt-lab/ src/components/admin/prompt-lab/
git commit -m "feat(admin): prompt lab with quick test, results grid, compare"
```

---

## Task 5: References Page

Port the Instagram reference browser.

**Files:**
- Create: `src/app/admin/references/page.tsx`
- Create: `src/components/admin/references/account-grid.tsx`
- Create: `src/components/admin/references/post-grid.tsx`

- [ ] **Step 1: Create account grid component**

```typescript
// src/components/admin/references/account-grid.tsx
"use client";

type Account = {
  id: string;
  handle: string;
  name: string | null;
  bio: string | null;
  followers: number | null;
  postCount: number | null;
  niche: string[];
  savedPosts: number;
};

function fmtNum(n: number | null) {
  if (!n) return "";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return String(n);
}

export function AccountGrid({
  accounts,
  onSelect,
}: {
  accounts: Account[];
  onSelect: (id: string, handle: string) => void;
}) {
  if (accounts.length === 0) {
    return (
      <div className="py-16 text-center text-sm text-zinc-600">
        No accounts collected yet. Use the Chrome extension to add Instagram accounts.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {accounts.map((a) => (
        <div
          key={a.id}
          onClick={() => onSelect(a.id, a.handle)}
          className="cursor-pointer rounded-lg border border-zinc-800 bg-zinc-900 p-4 transition-all hover:border-zinc-600 hover:-translate-y-0.5"
        >
          <div className="text-sm font-semibold text-zinc-100">@{a.handle}</div>
          {a.name && (
            <div className="text-xs text-zinc-500">{a.name}</div>
          )}
          <div className="mt-2 flex gap-3 text-[11px] text-zinc-600">
            {a.followers != null && (
              <span>
                <span className="font-semibold text-zinc-400">
                  {fmtNum(a.followers)}
                </span>{" "}
                followers
              </span>
            )}
            <span>
              <span className="font-semibold text-zinc-400">
                {a.savedPosts}
              </span>{" "}
              saved
            </span>
          </div>
          {a.niche.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {a.niche.map((n) => (
                <span
                  key={n}
                  className="rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] text-zinc-400"
                >
                  {n}
                </span>
              ))}
            </div>
          )}
          {a.bio && (
            <div className="mt-1.5 line-clamp-2 text-[11px] leading-relaxed text-zinc-600">
              {a.bio}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Create post grid component**

```typescript
// src/components/admin/references/post-grid.tsx
"use client";

import { useAdminStore } from "@/stores/admin-store";

type Post = {
  id: string;
  shortcode: string;
  carouselIndex: number;
  mediaType: string;
  imageUrl: string;
  pose: string | null;
  setting: string | null;
  outfit: string | null;
  lighting: string | null;
  composition: string | null;
  quality: number | null;
};

export function PostGrid({
  posts,
  handle,
  onBack,
}: {
  posts: Post[];
  handle: string;
  onBack: () => void;
}) {
  const { openLightbox } = useAdminStore();

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="rounded-md border border-zinc-700 px-3 py-1 text-xs text-zinc-400 hover:bg-zinc-800"
          >
            ← Back
          </button>
          <h3 className="text-base font-semibold text-zinc-100">@{handle}</h3>
        </div>
        <span className="text-xs text-zinc-600">{posts.length} image(s)</span>
      </div>

      {posts.length === 0 ? (
        <div className="py-16 text-center text-sm text-zinc-600">
          No posts saved for this account yet.
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {posts.map((p) => (
            <div
              key={p.id}
              className="relative cursor-pointer overflow-hidden rounded-md bg-zinc-800"
              style={{ aspectRatio: "1" }}
              onClick={() => openLightbox(p.imageUrl)}
            >
              {p.mediaType === "video" ? (
                <video
                  src={p.imageUrl}
                  muted
                  preload="metadata"
                  className="h-full w-full object-cover"
                />
              ) : (
                <img
                  src={p.imageUrl}
                  alt=""
                  className="h-full w-full object-cover transition-transform hover:scale-[1.03]"
                  loading="lazy"
                />
              )}
              <span className="absolute bottom-1 left-1 rounded bg-black/70 px-1.5 py-0.5 text-[10px] text-white">
                {p.shortcode}
                {p.carouselIndex > 0 && ` #${p.carouselIndex}`}
              </span>
              {p.mediaType === "video" && (
                <span className="absolute right-1 top-1 rounded bg-black/70 px-1.5 py-0.5 text-[10px] text-white">
                  VIDEO
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Create references page**

```typescript
// src/app/admin/references/page.tsx
"use client";

import { useState, useEffect } from "react";
import { getRefAccounts, getRefPosts } from "@/server/actions/admin-actions";
import { AccountGrid } from "@/components/admin/references/account-grid";
import { PostGrid } from "@/components/admin/references/post-grid";

export default function ReferencesPage() {
  const [accounts, setAccounts] = useState<Awaited<ReturnType<typeof getRefAccounts>>>([]);
  const [selectedAccount, setSelectedAccount] = useState<{ id: string; handle: string } | null>(null);
  const [posts, setPosts] = useState<Awaited<ReturnType<typeof getRefPosts>>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getRefAccounts().then((data) => {
      setAccounts(data);
      setLoading(false);
    });
  }, []);

  const handleSelectAccount = async (id: string, handle: string) => {
    setSelectedAccount({ id, handle });
    const data = await getRefPosts(id);
    setPosts(data);
  };

  if (loading) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold">References</h1>
        <p className="mt-4 text-sm text-zinc-500">Loading accounts...</p>
      </div>
    );
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold">References</h1>
      <p className="mt-1 text-sm text-zinc-400">
        Instagram accounts and collected posts.
      </p>

      <div className="mt-6">
        {selectedAccount ? (
          <PostGrid
            posts={posts}
            handle={selectedAccount.handle}
            onBack={() => setSelectedAccount(null)}
          />
        ) : (
          <AccountGrid
            accounts={accounts}
            onSelect={handleSelectAccount}
          />
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Verify and commit**

Run: `pnpm dev`, visit `/admin/references`. Should show account cards. Click one to see posts with images from S3.

```bash
git add src/app/admin/references/ src/components/admin/references/
git commit -m "feat(admin): references page with account grid and post viewer"
```

---

## Task 6: Data Table Pages (Users, Creators, Content, Credits, Jobs)

Five CRUD pages that all follow the same pattern: server-loaded table + click-to-expand detail. Uses shadcn Table component.

**Files:**
- Create: `src/app/admin/users/page.tsx`
- Create: `src/app/admin/creators/page.tsx`
- Create: `src/app/admin/content/page.tsx`
- Create: `src/app/admin/credits/page.tsx`
- Create: `src/app/admin/jobs/page.tsx`

- [ ] **Step 1: Create Users page**

```typescript
// src/app/admin/users/page.tsx
import { getAdminUsers } from "@/server/actions/admin-actions";

export default async function UsersPage() {
  const users = await getAdminUsers();

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold">Users</h1>
      <p className="mt-1 text-sm text-zinc-400">{users.length} total users</p>

      <div className="mt-6 overflow-hidden rounded-lg border border-zinc-800">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-800 bg-zinc-900/50">
              <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400">Email</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400">Name</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400">Plan</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-zinc-400">Plan Credits</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-zinc-400">Pack Credits</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-zinc-400">Creators</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-zinc-400">Content</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400">Joined</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/50">
            {users.map((user) => (
              <tr key={user.id} className="hover:bg-zinc-900/30">
                <td className="px-4 py-2.5 text-zinc-100">{user.email}</td>
                <td className="px-4 py-2.5 text-zinc-400">{user.name ?? "—"}</td>
                <td className="px-4 py-2.5">
                  <span className={`rounded px-2 py-0.5 text-xs font-medium ${
                    user.plan === "FREE" ? "bg-zinc-800 text-zinc-400" :
                    user.plan === "STARTER" ? "bg-blue-950 text-blue-400" :
                    user.plan === "PRO" ? "bg-purple-950 text-purple-400" :
                    "bg-amber-950 text-amber-400"
                  }`}>
                    {user.plan}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-right text-zinc-300">{user.planCredits}</td>
                <td className="px-4 py-2.5 text-right text-zinc-300">{user.packCredits}</td>
                <td className="px-4 py-2.5 text-right text-zinc-300">{user._count.creators}</td>
                <td className="px-4 py-2.5 text-right text-zinc-300">{user.contentCount}</td>
                <td className="px-4 py-2.5 text-xs text-zinc-500">
                  {new Date(user.createdAt).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create Creators page**

```typescript
// src/app/admin/creators/page.tsx
import { getAdminCreators } from "@/server/actions/admin-actions";

export default async function CreatorsPage() {
  const creators = await getAdminCreators();

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold">Creators</h1>
      <p className="mt-1 text-sm text-zinc-400">{creators.length} total creators</p>

      <div className="mt-6 overflow-hidden rounded-lg border border-zinc-800">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-800 bg-zinc-900/50">
              <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400">Name</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400">User</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400">Niche</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-zinc-400">Content</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-zinc-400">Base Image</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-zinc-400">Pre-made</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400">Created</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/50">
            {creators.map((c) => (
              <tr key={c.id} className="hover:bg-zinc-900/30">
                <td className="px-4 py-2.5 font-medium text-zinc-100">{c.name}</td>
                <td className="px-4 py-2.5 text-zinc-400">{c.user.email}</td>
                <td className="px-4 py-2.5">
                  <div className="flex gap-1">
                    {c.niche.map((n) => (
                      <span key={n} className="rounded bg-zinc-800 px-1.5 py-0.5 text-xs text-zinc-400">
                        {n}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-4 py-2.5 text-right text-zinc-300">{c.contentCount}</td>
                <td className="px-4 py-2.5 text-center">
                  {c.baseImageUrl ? (
                    <span className="text-green-500">✓</span>
                  ) : (
                    <span className="text-zinc-600">—</span>
                  )}
                </td>
                <td className="px-4 py-2.5 text-center">
                  {c.isPreMade ? (
                    <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-xs text-zinc-400">Pre-made</span>
                  ) : (
                    <span className="text-zinc-600">—</span>
                  )}
                </td>
                <td className="px-4 py-2.5 text-xs text-zinc-500">
                  {new Date(c.createdAt).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create Content page**

```typescript
// src/app/admin/content/page.tsx
import { getAdminContent } from "@/server/actions/admin-actions";

export default async function ContentPage() {
  const content = await getAdminContent();

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold">Content</h1>
      <p className="mt-1 text-sm text-zinc-400">{content.length} total pieces</p>

      <div className="mt-6 overflow-hidden rounded-lg border border-zinc-800">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-800 bg-zinc-900/50">
              <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400">Preview</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400">Type</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400">Source</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400">Status</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400">Creator</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400">User</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-zinc-400">Credits</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400">Prompt</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400">Created</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/50">
            {content.map((c) => (
              <tr key={c.id} className="hover:bg-zinc-900/30">
                <td className="px-4 py-2">
                  {c.signedUrl ? (
                    <img
                      src={c.signedUrl}
                      alt=""
                      className="h-10 w-10 rounded object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded bg-zinc-800 text-xs text-zinc-600">
                      —
                    </div>
                  )}
                </td>
                <td className="px-4 py-2.5">
                  <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-xs text-zinc-400">
                    {c.type}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-xs text-zinc-400">{c.source}</td>
                <td className="px-4 py-2.5">
                  <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${
                    c.status === "COMPLETED" ? "bg-green-950 text-green-400" :
                    c.status === "GENERATING" ? "bg-blue-950 text-blue-400" :
                    "bg-red-950 text-red-400"
                  }`}>
                    {c.status}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-zinc-300">{c.creator.name}</td>
                <td className="px-4 py-2.5 text-xs text-zinc-500">{c.creator.user.email}</td>
                <td className="px-4 py-2.5 text-right text-zinc-300">{c.creditsCost}</td>
                <td className="max-w-48 truncate px-4 py-2.5 text-xs text-zinc-500">
                  {c.prompt ?? "—"}
                </td>
                <td className="px-4 py-2.5 text-xs text-zinc-500">
                  {new Date(c.createdAt).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Create Credits page with grant form**

```typescript
// src/app/admin/credits/page.tsx
import { getAdminCredits, getAdminUsers } from "@/server/actions/admin-actions";
import { CreditGrantForm } from "./grant-form";

export default async function CreditsPage() {
  const [credits, users] = await Promise.all([
    getAdminCredits(),
    getAdminUsers(),
  ]);

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold">Credits</h1>
      <p className="mt-1 text-sm text-zinc-400">{credits.length} transactions</p>

      {/* Grant form */}
      <div className="mt-6">
        <CreditGrantForm users={users.map((u) => ({ id: u.id, email: u.email }))} />
      </div>

      {/* Transaction table */}
      <div className="mt-6 overflow-hidden rounded-lg border border-zinc-800">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-800 bg-zinc-900/50">
              <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400">User</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400">Type</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-zinc-400">Amount</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-zinc-400">Balance</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400">Description</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/50">
            {credits.map((t) => (
              <tr key={t.id} className="hover:bg-zinc-900/30">
                <td className="px-4 py-2.5 text-zinc-400">{t.user.email}</td>
                <td className="px-4 py-2.5">
                  <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${
                    t.type === "SPEND" ? "bg-red-950 text-red-400" :
                    t.type === "PURCHASE" ? "bg-green-950 text-green-400" :
                    t.type === "PLAN_GRANT" ? "bg-blue-950 text-blue-400" :
                    t.type === "REFUND" ? "bg-yellow-950 text-yellow-400" :
                    "bg-purple-950 text-purple-400"
                  }`}>
                    {t.type}
                  </span>
                </td>
                <td className={`px-4 py-2.5 text-right font-medium ${
                  t.amount > 0 ? "text-green-400" : "text-red-400"
                }`}>
                  {t.amount > 0 ? "+" : ""}{t.amount}
                </td>
                <td className="px-4 py-2.5 text-right text-zinc-300">{t.balance}</td>
                <td className="max-w-64 truncate px-4 py-2.5 text-xs text-zinc-500">{t.description}</td>
                <td className="px-4 py-2.5 text-xs text-zinc-500">
                  {new Date(t.createdAt).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Create credit grant form client component**

```typescript
// src/app/admin/credits/grant-form.tsx
"use client";

import { useState, useTransition } from "react";
import { adminGrantCredits } from "@/server/actions/admin-actions";
import { useRouter } from "next/navigation";

export function CreditGrantForm({ users }: { users: { id: string; email: string }[] }) {
  const [userId, setUserId] = useState("");
  const [amount, setAmount] = useState(10);
  const [type, setType] = useState<"BONUS" | "REFUND">("BONUS");
  const [description, setDescription] = useState("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleSubmit = () => {
    if (!userId || amount <= 0) return;

    startTransition(async () => {
      await adminGrantCredits({
        userId,
        amount,
        type,
        description: description || `Admin ${type.toLowerCase()} grant`,
      });
      setAmount(10);
      setDescription("");
      router.refresh();
    });
  };

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-5">
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">
        Grant Credits
      </h2>
      <div className="flex items-end gap-3">
        <div className="w-64">
          <label className="mb-1 block text-xs text-zinc-500">User</label>
          <select
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100"
          >
            <option value="">Select user...</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>{u.email}</option>
            ))}
          </select>
        </div>
        <div className="w-24">
          <label className="mb-1 block text-xs text-zinc-500">Amount</label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(parseInt(e.target.value) || 0)}
            min={1}
            className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100"
          />
        </div>
        <div className="w-28">
          <label className="mb-1 block text-xs text-zinc-500">Type</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as "BONUS" | "REFUND")}
            className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100"
          >
            <option value="BONUS">Bonus</option>
            <option value="REFUND">Refund</option>
          </select>
        </div>
        <div className="flex-1">
          <label className="mb-1 block text-xs text-zinc-500">Description</label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Reason for grant..."
            className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100"
          />
        </div>
        <button
          onClick={handleSubmit}
          disabled={isPending || !userId || amount <= 0}
          className="rounded-md bg-[#C4603A] px-5 py-2 text-sm font-semibold text-white hover:bg-[#d4704a] disabled:opacity-50"
        >
          {isPending ? "Granting..." : "Grant"}
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Create Jobs page**

```typescript
// src/app/admin/jobs/page.tsx
import { getAdminJobs } from "@/server/actions/admin-actions";

export default async function JobsPage() {
  const jobs = await getAdminJobs();

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold">Generation Jobs</h1>
      <p className="mt-1 text-sm text-zinc-400">{jobs.length} total jobs</p>

      <div className="mt-6 overflow-hidden rounded-lg border border-zinc-800">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-800 bg-zinc-900/50">
              <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400">Status</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400">Type</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400">Provider</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400">Model</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-zinc-400">Est. Cost</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-zinc-400">Actual Cost</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-zinc-400">Duration</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400">Error</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400">Created</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/50">
            {jobs.map((job) => {
              const duration =
                job.startedAt && job.completedAt
                  ? ((new Date(job.completedAt).getTime() - new Date(job.startedAt).getTime()) / 1000).toFixed(1) + "s"
                  : "—";

              return (
                <tr key={job.id} className="hover:bg-zinc-900/30">
                  <td className="px-4 py-2.5">
                    <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${
                      job.status === "COMPLETED" ? "bg-green-950 text-green-400" :
                      job.status === "PROCESSING" ? "bg-blue-950 text-blue-400" :
                      job.status === "QUEUED" ? "bg-yellow-950 text-yellow-400" :
                      "bg-red-950 text-red-400"
                    }`}>
                      {job.status}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-zinc-300">{job.type}</td>
                  <td className="px-4 py-2.5 text-zinc-400">{job.provider}</td>
                  <td className="px-4 py-2.5 text-xs text-zinc-500">{job.modelId}</td>
                  <td className="px-4 py-2.5 text-right text-zinc-400">
                    {job.estimatedCost != null ? `$${job.estimatedCost.toFixed(3)}` : "—"}
                  </td>
                  <td className="px-4 py-2.5 text-right text-zinc-300">
                    {job.actualCost != null ? `$${job.actualCost.toFixed(3)}` : "—"}
                  </td>
                  <td className="px-4 py-2.5 text-right text-zinc-400">{duration}</td>
                  <td className="max-w-48 truncate px-4 py-2.5 text-xs text-red-400">
                    {job.error ?? "—"}
                  </td>
                  <td className="px-4 py-2.5 text-xs text-zinc-500">
                    {new Date(job.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

- [ ] **Step 7: Verify all pages load**

Run: `pnpm dev`

Visit each page and verify it loads real data:
- `/admin/users` — user table
- `/admin/creators` — creator table
- `/admin/content` — content table with thumbnails
- `/admin/credits` — transaction table + grant form
- `/admin/jobs` — job table

- [ ] **Step 8: Commit**

```bash
git add src/app/admin/users/ src/app/admin/creators/ src/app/admin/content/ src/app/admin/credits/ src/app/admin/jobs/
git commit -m "feat(admin): users, creators, content, credits, and jobs pages"
```

---

## Task 7: Pipeline Test Mode + Build Verification

Add the pipeline test tab to Prompt Lab and verify the full build compiles.

**Files:**
- Create: `src/components/admin/prompt-lab/pipeline-test.tsx`
- Modify: `src/app/admin/prompt-lab/page.tsx`

- [ ] **Step 1: Create pipeline test component**

```typescript
// src/components/admin/prompt-lab/pipeline-test.tsx
"use client";

import { useState, useTransition } from "react";
import { generateContent } from "@/server/actions/content-actions";
import { useAdminStore } from "@/stores/admin-store";

type CreatorOption = {
  id: string;
  name: string;
  baseImageUrl: string | null;
};

type PipelineStage = {
  name: string;
  status: "pending" | "running" | "done" | "error";
  output?: string;
};

export function PipelineTest({ creators }: { creators: CreatorOption[] }) {
  const [prompt, setPrompt] = useState("");
  const [creatorId, setCreatorId] = useState(creators[0]?.id ?? "");
  const [imageCount, setImageCount] = useState(1);
  const [isPending, startTransition] = useTransition();
  const [stages, setStages] = useState<PipelineStage[]>([]);
  const [resultUrls, setResultUrls] = useState<string[]>([]);
  const { openLightbox } = useAdminStore();

  const handleGenerate = () => {
    if (!prompt.trim() || !creatorId) return;

    setStages([
      { name: "Input", status: "done", output: prompt },
      { name: "Enhance + Generate", status: "running" },
      { name: "Strip Metadata", status: "pending" },
      { name: "Upload to S3", status: "pending" },
      { name: "Save to DB", status: "pending" },
    ]);
    setResultUrls([]);

    startTransition(async () => {
      try {
        const result = await generateContent(creatorId, prompt, imageCount);

        if (result.success) {
          const urls = result.content.map((c) => c.url).filter(Boolean) as string[];
          setResultUrls(urls);
          setStages([
            { name: "Input", status: "done", output: prompt },
            { name: "Enhance + Generate", status: "done", output: `${result.content.length} images` },
            { name: "Strip Metadata", status: "done" },
            { name: "Upload to S3", status: "done" },
            { name: "Save to DB", status: "done", output: `${result.content.length} Content records created` },
          ]);
        } else {
          setStages((prev) =>
            prev.map((s) =>
              s.status === "running" || s.status === "pending"
                ? { ...s, status: "error", output: result.error }
                : s
            )
          );
        }
      } catch (err) {
        setStages((prev) =>
          prev.map((s) =>
            s.status === "running" || s.status === "pending"
              ? { ...s, status: "error", output: err instanceof Error ? err.message : String(err) }
              : s
          )
        );
      }
    });
  };

  return (
    <div>
      {/* Form */}
      <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-5">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">
          Pipeline Test
        </h2>
        <p className="mb-4 text-xs text-zinc-600">
          Runs through the real app pipeline: enhance → generate → strip → S3 → DB. Uses real credits.
        </p>

        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Enter a content prompt (e.g., 'coffee shop morning, cream sweater')"
          className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:border-[#C4603A] focus:outline-none"
          rows={3}
        />

        <div className="mt-3 flex items-end gap-3">
          <div className="w-48">
            <label className="mb-1 block text-xs text-zinc-500">Creator</label>
            <select
              value={creatorId}
              onChange={(e) => setCreatorId(e.target.value)}
              className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100"
            >
              {creators.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.baseImageUrl ? "" : "(no base image)"}
                </option>
              ))}
            </select>
          </div>
          <div className="w-20">
            <label className="mb-1 block text-xs text-zinc-500">Count</label>
            <input
              type="number"
              value={imageCount}
              onChange={(e) => setImageCount(parseInt(e.target.value) || 1)}
              min={1}
              max={4}
              className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100"
            />
          </div>
          <button
            onClick={handleGenerate}
            disabled={isPending || !prompt.trim() || !creatorId}
            className="rounded-md bg-[#C4603A] px-5 py-2 text-sm font-semibold text-white hover:bg-[#d4704a] disabled:opacity-50"
          >
            {isPending ? "Running Pipeline..." : "Run Pipeline"}
          </button>
        </div>
      </div>

      {/* Pipeline stages */}
      {stages.length > 0 && (
        <div className="mt-6 rounded-lg border border-zinc-800 bg-zinc-900 p-5">
          <h3 className="mb-3 text-sm font-semibold">Pipeline Stages</h3>
          <div className="space-y-2">
            {stages.map((stage, i) => (
              <div key={i} className="flex items-start gap-3">
                <span className={`mt-0.5 h-2 w-2 rounded-full ${
                  stage.status === "done" ? "bg-green-500" :
                  stage.status === "running" ? "animate-pulse bg-yellow-500" :
                  stage.status === "error" ? "bg-red-500" :
                  "bg-zinc-700"
                }`} />
                <div>
                  <span className="text-sm text-zinc-300">{stage.name}</span>
                  {stage.output && (
                    <p className={`mt-0.5 text-xs ${
                      stage.status === "error" ? "text-red-400" : "text-zinc-500"
                    }`}>
                      {stage.output}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Results */}
      {resultUrls.length > 0 && (
        <div className="mt-6">
          <h3 className="mb-3 text-sm font-semibold">Generated Images</h3>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {resultUrls.map((url, i) => (
              <div
                key={i}
                className="cursor-pointer overflow-hidden rounded-md bg-zinc-800"
                style={{ aspectRatio: "3/4" }}
                onClick={() => openLightbox(url)}
              >
                <img
                  src={url}
                  alt=""
                  className="h-full w-full object-cover"
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Update Prompt Lab page with tabs**

```typescript
// src/app/admin/prompt-lab/page.tsx
import { getTestRuns, getAdminCreators } from "@/server/actions/admin-actions";
import { PromptLabTabs } from "./tabs";

export default async function PromptLabPage() {
  const [runs, creators] = await Promise.all([
    getTestRuns(),
    getAdminCreators(),
  ]);

  const creatorOptions = creators.map((c) => ({
    id: c.id,
    name: c.name,
    baseImageUrl: c.baseImageUrl,
  }));

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold">Prompt Lab</h1>
      <p className="mt-1 text-sm text-zinc-400">
        Test prompts and generation pipelines.
      </p>

      <div className="mt-6">
        <PromptLabTabs initialRuns={runs} creators={creatorOptions} />
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create tabs wrapper component**

```typescript
// src/app/admin/prompt-lab/tabs.tsx
"use client";

import { useState } from "react";
import { QuickTest } from "@/components/admin/prompt-lab/quick-test";
import { PipelineTest } from "@/components/admin/prompt-lab/pipeline-test";

type TestRun = {
  id: string;
  timestamp: string;
  label: string;
  prompt: string;
  model: string | null;
  images: string[];
  imageCount: number;
  refPath: string | null;
};

type CreatorOption = {
  id: string;
  name: string;
  baseImageUrl: string | null;
};

export function PromptLabTabs({
  initialRuns,
  creators,
}: {
  initialRuns: TestRun[];
  creators: CreatorOption[];
}) {
  const [mode, setMode] = useState<"quick" | "pipeline">("quick");

  return (
    <div>
      <div className="flex gap-2">
        <button
          onClick={() => setMode("quick")}
          className={`rounded-md px-4 py-1.5 text-sm ${
            mode === "quick"
              ? "bg-[#C4603A] text-white"
              : "border border-zinc-700 text-zinc-400"
          }`}
        >
          Quick Test
        </button>
        <button
          onClick={() => setMode("pipeline")}
          className={`rounded-md px-4 py-1.5 text-sm ${
            mode === "pipeline"
              ? "bg-[#C4603A] text-white"
              : "border border-zinc-700 text-zinc-400"
          }`}
        >
          Pipeline Test
        </button>
      </div>

      <div className="mt-4">
        {mode === "quick" ? (
          <QuickTest initialRuns={initialRuns} />
        ) : (
          <PipelineTest creators={creators} />
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run full build**

Run: `pnpm build`

Fix any type errors. Every page should compile. The build should succeed.

- [ ] **Step 5: Manual smoke test**

Run: `pnpm dev` and verify:
1. `/admin` — stats load, activity feed shows
2. `/admin/prompt-lab` — quick test tab generates images, pipeline test tab calls real pipeline
3. `/admin/references` — accounts load, click into posts
4. `/admin/users` — table shows users
5. `/admin/creators` — table shows creators
6. `/admin/content` — table shows content with thumbnails
7. `/admin/credits` — table + grant form works
8. `/admin/jobs` — table shows generation jobs

- [ ] **Step 6: Commit**

```bash
git add src/components/admin/prompt-lab/pipeline-test.tsx src/app/admin/prompt-lab/
git commit -m "feat(admin): pipeline test mode + prompt lab tabs"
```

---

## Task 8: Cleanup — Remove Old Dashboard

Remove the standalone `scripts/dashboard.ts` and its `package.json` script since the admin dashboard replaces it.

**Files:**
- Modify: `package.json` — remove `"dashboard"` script
- Delete: `scripts/dashboard.ts`

- [ ] **Step 1: Remove dashboard script from package.json**

In `package.json`, remove the `"dashboard"` line from `"scripts"`:

```json
"dashboard": "npx tsx scripts/dashboard.ts",
```

Keep `"test:prompt"` and `"test:batch"` — those are separate CLI tools.

- [ ] **Step 2: Delete the old dashboard file**

```bash
rm scripts/dashboard.ts
```

- [ ] **Step 3: Commit**

```bash
git add package.json
git rm scripts/dashboard.ts
git commit -m "chore: remove old standalone dashboard (replaced by /admin)"
```

---

## Summary

| Task | What | Files Created |
|------|------|--------------|
| 1 | Layout + auth gate + sidebar | 4 files |
| 2 | Server actions + image route | 2 files |
| 3 | Dashboard home (stats + activity) | 3 files |
| 4 | Prompt Lab — quick test mode | 4 files |
| 5 | References page | 3 files |
| 6 | Data table pages (users, creators, content, credits, jobs) | 6 files |
| 7 | Pipeline test + build verification | 3 files |
| 8 | Cleanup old dashboard | 0 created, 1 deleted |

**Total:** ~25 new files, 1 deleted, 1 modified.
