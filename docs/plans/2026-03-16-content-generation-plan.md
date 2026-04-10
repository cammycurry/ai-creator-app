# Content Generation Pipeline — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire the floating input bar so users can type a prompt and generate 1-4 images of their active Creator, stored in S3 with Content records in the DB.

**Architecture:** Server action receives (creatorId, userPrompt, imageCount) → loads creator settings from DB → builds AIAC-style content prompt from traits + user input → generates N images via Nano Banana Pro in parallel → uploads to S3 → creates Content records → returns signed URLs. Frontend wires the existing floating input bar (textarea, send button, count control) to this action and displays results.

**Tech Stack:** Gemini `gemini-3-pro-image-preview`, `@aws-sdk/client-s3`, Prisma, Zustand

---

### Task 1: Create content types

**Files:**
- Create: `src/types/content.ts`

- [ ] **Step 1: Create the content type file**

```typescript
export type ContentItem = {
  id: string;
  creatorId: string;
  type: "IMAGE" | "VIDEO" | "TALKING_HEAD";
  status: "GENERATING" | "COMPLETED" | "FAILED";
  url?: string;
  thumbnailUrl?: string;
  s3Keys: string[];
  source: "TEMPLATE" | "FREEFORM" | "RECREATE" | "WIZARD";
  prompt?: string;
  userInput?: string;
  creditsCost: number;
  createdAt: string;
};
```

- [ ] **Step 2: Commit**

```bash
git add src/types/content.ts
git commit -m "feat: add content types"
```

---

### Task 2: Create content server actions

**Files:**
- Create: `src/server/actions/content-actions.ts`

- [ ] **Step 1: Create the content actions file**

This file has two server actions:

1. `generateContent(creatorId, userPrompt, imageCount)` — the main pipeline
2. `getCreatorContent(creatorId)` — fetch content for display

```typescript
"use server";

import { auth } from "@clerk/nextjs/server";
import { GoogleGenAI, HarmCategory, HarmBlockThreshold } from "@google/genai";
import { db } from "@/lib/db";
import { uploadImage, getSignedImageUrl } from "@/lib/s3";
import { deductCredits } from "./credit-actions";
import type { ContentItem } from "@/types/content";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
const IMAGE_MODEL = "gemini-3-pro-image-preview";

const SAFETY_OFF = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
];

const CREDIT_PER_IMAGE = 1;

// ─── Prompt Builder (Content, not Wizard) ─────

type CreatorSettings = {
  gender?: string | null;
  age?: string | null;
  ethnicity?: string | null;
  skinTone?: number | null;
  hairColor?: string | null;
  hairLength?: string | null;
  hairTexture?: string | null;
  eyeColor?: string | null;
  eyeShape?: string | null;
  faceShape?: string | null;
  lips?: string | null;
  build?: string | null;
  features?: string[];
};

function buildContentPrompt(settings: CreatorSettings, userPrompt: string): string {
  const genderRaw = settings.gender?.toLowerCase() ?? "woman";
  const isMale = genderRaw === "male";
  const subject = isMale ? "That man" : "That woman";

  // Locked traits
  const traitParts: string[] = [];
  if (settings.hairColor) traitParts.push(`${settings.hairColor.toLowerCase()} hair`);
  if (settings.hairLength) traitParts.push(`${settings.hairLength.toLowerCase()} length`);
  if (settings.eyeColor) traitParts.push(`${settings.eyeColor.toLowerCase()} eyes`);
  if (settings.build) traitParts.push(`${settings.build.toLowerCase()} build`);
  if (settings.ethnicity) traitParts.push(`${settings.ethnicity} ethnicity`);
  const traitDesc = traitParts.length > 0 ? `, with ${traitParts.join(", ")}` : "";

  return [
    `${subject} from the reference image${traitDesc}.`,
    userPrompt.trim(),
    `Raw iPhone photography style, visible natural skin texture with pores and fine details,`,
    `hyper-realistic, natural lighting, authentic and unposed feel.`,
  ].join(" ");
}

// ─── Upload helper ─────

async function uploadBase64ToS3(
  base64Data: string,
  userId: string,
  creatorId: string,
  index: number
): Promise<string> {
  const buffer = Buffer.from(base64Data, "base64");
  const timestamp = Date.now();
  const key = `users/${userId}/creators/${creatorId}/content/${timestamp}-${index}.png`;
  await uploadImage(buffer, key, "image/png");
  return key;
}

// ─── Generate Content ─────

type GenerateContentResult =
  | { success: true; content: ContentItem[] }
  | { success: false; error: string };

export async function generateContent(
  creatorId: string,
  userPrompt: string,
  imageCount: number = 1
): Promise<GenerateContentResult> {
  const { userId: clerkId } = await auth();
  if (!clerkId) return { success: false, error: "Not authenticated" };

  const user = await db.user.findUnique({ where: { clerkId } });
  if (!user) return { success: false, error: "User not found" };

  // Validate image count
  const count = Math.min(Math.max(Math.round(imageCount), 1), 4);
  const creditCost = count * CREDIT_PER_IMAGE;

  const totalCredits = user.planCredits + user.packCredits;
  if (totalCredits < creditCost) {
    return {
      success: false,
      error: `Not enough credits. Need ${creditCost}, have ${totalCredits}.`,
    };
  }

  // Load creator
  const creator = await db.creator.findUnique({
    where: { id: creatorId, userId: user.id },
  });
  if (!creator) return { success: false, error: "Creator not found" };

  const settings = (creator.settings ?? {}) as CreatorSettings;
  const prompt = buildContentPrompt(settings, userPrompt);

  try {
    // Generate N images in parallel
    const imagePromises = Array.from({ length: count }, () =>
      ai.models.generateContent({
        model: IMAGE_MODEL,
        contents: prompt,
        config: {
          responseModalities: ["TEXT", "IMAGE"],
          safetySettings: SAFETY_OFF,
        },
      })
    );

    const results = await Promise.allSettled(imagePromises);

    // Upload successful images to S3
    const s3Keys: string[] = [];
    let idx = 0;
    for (const result of results) {
      if (result.status === "fulfilled" && result.value.candidates?.[0]?.content?.parts) {
        for (const part of result.value.candidates[0].content.parts) {
          if (part.inlineData?.data) {
            const key = await uploadBase64ToS3(
              part.inlineData.data,
              user.id,
              creatorId,
              idx++
            );
            s3Keys.push(key);
          }
        }
      }
    }

    if (s3Keys.length === 0) {
      const errors = results
        .filter((r) => r.status === "rejected")
        .map((r) => (r as PromiseRejectedResult).reason?.message ?? "Unknown error");
      return {
        success: false,
        error: errors.length > 0
          ? `Generation failed: ${errors[0]}`
          : "No images generated. The model may have filtered the prompt.",
      };
    }

    // Deduct credits for images actually generated
    const actualCost = s3Keys.length * CREDIT_PER_IMAGE;
    await deductCredits(user.id, actualCost, `Content generation — ${s3Keys.length} image(s)`);

    // Create Content records
    const signedUrls: string[] = [];
    const contentItems: ContentItem[] = [];

    for (let i = 0; i < s3Keys.length; i++) {
      const signedUrl = await getSignedImageUrl(s3Keys[i]);
      signedUrls.push(signedUrl);

      const content = await db.content.create({
        data: {
          creatorId,
          type: "IMAGE",
          status: "COMPLETED",
          url: s3Keys[i],
          outputs: JSON.parse(JSON.stringify([s3Keys[i]])),
          source: "FREEFORM",
          prompt,
          userInput: userPrompt,
          modelUsed: IMAGE_MODEL,
          creditsCost: CREDIT_PER_IMAGE,
        },
      });

      contentItems.push({
        id: content.id,
        creatorId: content.creatorId,
        type: "IMAGE",
        status: "COMPLETED",
        url: signedUrl,
        s3Keys: [s3Keys[i]],
        source: "FREEFORM",
        prompt,
        userInput: userPrompt,
        creditsCost: CREDIT_PER_IMAGE,
        createdAt: content.createdAt.toISOString(),
      });
    }

    // Update creator stats
    await db.creator.update({
      where: { id: creatorId },
      data: {
        lastUsedAt: new Date(),
        contentCount: { increment: s3Keys.length },
      },
    });

    return { success: true, content: contentItems };
  } catch (error) {
    console.error("generateContent error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Content generation failed",
    };
  }
}

// ─── Get Creator Content ─────

export async function getCreatorContent(creatorId: string): Promise<ContentItem[]> {
  const { userId: clerkId } = await auth();
  if (!clerkId) return [];

  const user = await db.user.findUnique({ where: { clerkId } });
  if (!user) return [];

  const content = await db.content.findMany({
    where: { creatorId, creator: { userId: user.id } },
    orderBy: { createdAt: "desc" },
  });

  return Promise.all(
    content.map(async (c) => ({
      id: c.id,
      creatorId: c.creatorId,
      type: c.type as ContentItem["type"],
      status: c.status as ContentItem["status"],
      url: c.url ? await getSignedImageUrl(c.url) : undefined,
      s3Keys: (c.outputs as string[]) ?? [],
      source: c.source as ContentItem["source"],
      prompt: c.prompt ?? undefined,
      userInput: c.userInput ?? undefined,
      creditsCost: c.creditsCost,
      createdAt: c.createdAt.toISOString(),
    }))
  );
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`

- [ ] **Step 3: Commit**

```bash
git add src/server/actions/content-actions.ts
git commit -m "feat: add content generation and retrieval server actions"
```

---

### Task 3: Add content state to creator store

**Files:**
- Modify: `src/stores/creator-store.ts`

- [ ] **Step 1: Add content state and actions**

Add to the `CreatorStore` type:

```typescript
import type { ContentItem } from "@/types/content";

// Add to CreatorStore type:
content: ContentItem[];
isGeneratingContent: boolean;
contentError: string | null;
imageCount: number;
setContent: (content: ContentItem[]) => void;
addContent: (items: ContentItem[]) => void;
setIsGeneratingContent: (v: boolean) => void;
setContentError: (error: string | null) => void;
setImageCount: (count: number) => void;
```

Add to the store implementation:

```typescript
content: [],
isGeneratingContent: false,
contentError: null,
imageCount: 1,

setContent: (content) => set({ content }),
addContent: (items) => set((state) => ({ content: [...items, ...state.content] })),
setIsGeneratingContent: (isGeneratingContent) => set({ isGeneratingContent }),
setContentError: (contentError) => set({ contentError }),
setImageCount: (imageCount) => set({ imageCount: Math.min(Math.max(imageCount, 1), 4) }),
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`

- [ ] **Step 3: Commit**

```bash
git add src/stores/creator-store.ts
git commit -m "feat: add content generation state to creator store"
```

---

### Task 4: Wire the floating input bar

**Files:**
- Modify: `src/components/workspace/workspace-canvas.tsx`

- [ ] **Step 1: Wire the textarea, send button, count control, and quick ideas**

Add imports:

```typescript
import { useState } from "react";
import { useCreatorStore } from "@/stores/creator-store";
import { generateContent, getCreatorContent } from "@/server/actions/content-actions";
import { getWorkspaceData } from "@/server/actions/workspace-actions";
```

The `ContentArea` component needs these changes:

1. Add state for the prompt textarea
2. Wire send button to call `generateContent`
3. Wire count +/- buttons to `imageCount` in store
4. Wire quick idea chips to fill the textarea and submit
5. Show generating state
6. Display generated content in the grid area

Replace the `ContentArea` function with a version that:

- Uses `useState` for the prompt text
- Pulls `content, isGeneratingContent, contentError, imageCount, setImageCount, addContent, setIsGeneratingContent, setContentError, setContent` from `useCreatorStore`
- Calls `getCreatorContent(creator.id)` on mount via `useEffect` to load existing content
- Has a `handleSubmit` that:
  1. Sets `isGeneratingContent(true)`
  2. Calls `generateContent(creator.id, prompt, imageCount)`
  3. On success: calls `addContent(result.content)`, refreshes credits via `getWorkspaceData`, clears prompt
  4. On failure: sets error
  5. Sets `isGeneratingContent(false)`
- Wires the textarea `value` and `onChange`
- Wires the send button `onClick` to `handleSubmit`
- Wires idea chips to set prompt and auto-submit
- Wires count +/- to `setImageCount`
- Shows `imageCount` in the count display
- Disables send button during generation
- Renders content items in the grid when they exist (replacing `<NoContentState />`)

Key UI details from the existing markup:
- Textarea: `rows={1}`, placeholder stays `What should ${creator.name} do next?`
- Count control: the `count-btn` buttons with − and + text
- Mode chips: only Photo is active for now (Video/Voice disabled)
- Content grid: reuse the `content-area` div, show images in a grid of clickable cards

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`

- [ ] **Step 3: Manual test**

Run: `pnpm dev`

1. Select a creator in the workspace
2. Type "mirror selfie at the gym, wearing black leggings" in the input
3. Click send → should show generating state
4. Images appear in the content area after generation
5. Credits update in the header
6. Quick idea chips fill the textarea and submit
7. Count +/- changes the number of images generated

- [ ] **Step 4: Commit**

```bash
git add src/components/workspace/workspace-canvas.tsx
git commit -m "feat: wire floating input bar to content generation pipeline"
```
