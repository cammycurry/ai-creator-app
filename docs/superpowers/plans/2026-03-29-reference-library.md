# Reference Library Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a per-creator Reference Library (backgrounds, products, outfits, poses, custom) that powers consistent AI influencer content generation.

**Architecture:** New `Reference` Prisma model with CRUD server actions, S3 image storage, and UI components accessible from the sidebar, creator profile, and (later) the Content Studio. AI auto-analysis on upload via Gemini Flash suggests type/name/description/tags.

**Tech Stack:** Prisma (PostgreSQL), Next.js server actions, S3 (existing `src/lib/s3.ts`), Gemini Flash (auto-analysis), Zustand (store), prototype-first CSS.

**Spec:** `docs/superpowers/specs/2026-03-29-content-studio-reference-library-design.md` — Sections 1.1–1.5

---

## File Structure

```
Create: prisma/migrations/YYYYMMDD_add_references/migration.sql  (via prisma migrate)
Modify: prisma/schema.prisma                                      (add Reference model + relations)
Create: src/types/reference.ts                                     (Reference type + ReferenceType enum)
Create: src/server/actions/reference-actions.ts                    (CRUD + AI analysis)
Modify: src/stores/creator-store.ts                                (add references state)
Create: src/components/workspace/reference-library.tsx             (grid + category tabs)
Create: src/components/workspace/add-reference-dialog.tsx          (upload + AI auto-tag)
Create: src/components/workspace/reference-card.tsx                (thumbnail card)
Modify: src/components/workspace/app-sidebar.tsx                   (add References link)
Modify: src/components/workspace/workspace-canvas.tsx              (add "references" view)
Modify: src/components/workspace/content-detail.tsx                (add "Save as Reference" button)
Modify: src/stores/ui-store.ts                                     (add "references" to ActiveView)
Create: src/app/workspace/reference-library.css                    (prototype-first styles)
Modify: src/components/workspace/workspace-init.tsx                (load references on mount)
```

---

### Task 1: Prisma Schema — Reference Model

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Add Reference model to schema**

Add after the `Creator` model block in `prisma/schema.prisma`:

```prisma
// ─── Creator References ─────────────────────────────
// Per-creator reference library for consistent generations.
// NOT the same as ReferenceAccount/ReferencePost (admin Instagram collection).

model Reference {
  id          String   @id @default(cuid())
  creatorId   String
  creator     Creator  @relation(fields: [creatorId], references: [id], onDelete: Cascade)
  userId      String
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  type        String   // BACKGROUND, PRODUCT, OUTFIT, POSE, CUSTOM
  name        String
  description String   @default("")
  imageUrl    String   // S3 key
  tags        String[]
  usageCount  Int      @default(0)

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([creatorId])
  @@index([userId])
}
```

- [ ] **Step 2: Add relations to User and Creator**

In the `User` model, add to relations section:

```prisma
  references         Reference[]
```

In the `Creator` model, add to relations section:

```prisma
  references  Reference[]
```

- [ ] **Step 3: Run migration**

Run: `pnpx prisma migrate dev --name add_creator_references`

Expected: Migration applies successfully, new `Reference` table created.

- [ ] **Step 4: Generate client**

Run: `pnpx prisma generate`

Expected: Prisma client regenerated with `Reference` model.

- [ ] **Step 5: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat: add Reference model for per-creator reference library"
```

---

### Task 2: TypeScript Types

**Files:**
- Create: `src/types/reference.ts`

- [ ] **Step 1: Create reference types**

```typescript
export const REFERENCE_TYPES = ["BACKGROUND", "PRODUCT", "OUTFIT", "POSE", "CUSTOM"] as const;
export type ReferenceType = (typeof REFERENCE_TYPES)[number];

export type ReferenceItem = {
  id: string;
  creatorId: string;
  type: ReferenceType;
  name: string;
  description: string;
  imageUrl?: string; // signed URL for display
  s3Key: string;     // raw S3 key
  tags: string[];
  usageCount: number;
  createdAt: string;
};

export const REFERENCE_TYPE_LABELS: Record<ReferenceType, string> = {
  BACKGROUND: "Background",
  PRODUCT: "Product",
  OUTFIT: "Outfit",
  POSE: "Pose",
  CUSTOM: "Custom",
};
```

- [ ] **Step 2: Commit**

```bash
git add src/types/reference.ts
git commit -m "feat: add Reference TypeScript types"
```

---

### Task 3: Server Actions — CRUD + AI Analysis

**Files:**
- Create: `src/server/actions/reference-actions.ts`

- [ ] **Step 1: Create reference-actions.ts with all CRUD operations and AI auto-analysis**

```typescript
"use server";

import { auth } from "@clerk/nextjs/server";
import { GoogleGenAI } from "@google/genai";
import { db } from "@/lib/db";
import { uploadImage, getSignedImageUrl } from "@/lib/s3";
import type { ReferenceItem, ReferenceType } from "@/types/reference";
import { REFERENCE_TYPES } from "@/types/reference";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
const FLASH_MODEL = "gemini-2.5-flash-preview-05-20";

// ─── AI Auto-Analysis ─────

type AnalysisResult = {
  type: ReferenceType;
  name: string;
  description: string;
  tags: string[];
};

export async function analyzeReferenceImage(
  imageBase64: string
): Promise<AnalysisResult> {
  const fallback: AnalysisResult = {
    type: "CUSTOM",
    name: "New Reference",
    description: "",
    tags: [],
  };

  try {
    const response = await ai.models.generateContent({
      model: FLASH_MODEL,
      contents: [
        {
          text: `Analyze this image for use as a reference in AI image generation. Categorize it and describe what it shows.

Output ONLY valid JSON:
{
  "type": "BACKGROUND" | "PRODUCT" | "OUTFIT" | "POSE" | "CUSTOM",
  "name": "short name, 2-4 words",
  "description": "what this image shows, useful for prompt building, 10-20 words",
  "tags": ["tag1", "tag2", "tag3", "tag4"]
}

Type guide:
- BACKGROUND: rooms, locations, scenes, environments
- PRODUCT: items, bottles, gadgets, accessories someone would hold
- OUTFIT: clothing, full outfits, shoes
- POSE: body positions, angles, compositions with a person
- CUSTOM: anything else`,
        },
        {
          inlineData: { mimeType: "image/jpeg", data: imageBase64 },
        },
      ],
    });

    const text = response.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    const json = JSON.parse(text.replace(/^```json?\n?|\n?```$/g, "").trim());

    return {
      type: REFERENCE_TYPES.includes(json.type) ? json.type : "CUSTOM",
      name: typeof json.name === "string" ? json.name.slice(0, 50) : "New Reference",
      description: typeof json.description === "string" ? json.description.slice(0, 200) : "",
      tags: Array.isArray(json.tags) ? json.tags.slice(0, 8).map((t: string) => String(t).toLowerCase()) : [],
    };
  } catch {
    return fallback;
  }
}

// ─── Create Reference ─────

type CreateResult =
  | { success: true; reference: ReferenceItem }
  | { success: false; error: string };

export async function createReference(
  creatorId: string,
  type: ReferenceType,
  name: string,
  description: string,
  imageBase64: string,
  tags: string[] = []
): Promise<CreateResult> {
  const { userId: clerkId } = await auth();
  if (!clerkId) return { success: false, error: "Not authenticated" };

  const user = await db.user.findUnique({ where: { clerkId } });
  if (!user) return { success: false, error: "User not found" };

  const creator = await db.creator.findUnique({
    where: { id: creatorId, userId: user.id },
  });
  if (!creator) return { success: false, error: "Creator not found" };

  // Decode and upload to S3
  const buffer = Buffer.from(imageBase64, "base64");
  const refId = `ref-${Date.now()}`;
  const s3Key = `users/${user.id}/creators/${creatorId}/references/${refId}.jpg`;
  await uploadImage(buffer, s3Key, "image/jpeg");

  // Create DB record
  const ref = await db.reference.create({
    data: {
      creatorId,
      userId: user.id,
      type,
      name: name.trim(),
      description: description.trim(),
      imageUrl: s3Key,
      tags: tags.map((t) => t.toLowerCase().trim()).filter(Boolean),
    },
  });

  const signedUrl = await getSignedImageUrl(s3Key);

  return {
    success: true,
    reference: {
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
    },
  };
}

// ─── Get Creator References ─────

export async function getCreatorReferences(
  creatorId: string
): Promise<ReferenceItem[]> {
  const { userId: clerkId } = await auth();
  if (!clerkId) return [];

  const refs = await db.reference.findMany({
    where: { creatorId, user: { clerkId } },
    orderBy: { createdAt: "desc" },
  });

  return Promise.all(
    refs.map(async (ref) => ({
      id: ref.id,
      creatorId: ref.creatorId,
      type: ref.type as ReferenceType,
      name: ref.name,
      description: ref.description,
      imageUrl: await getSignedImageUrl(ref.imageUrl),
      s3Key: ref.imageUrl,
      tags: ref.tags,
      usageCount: ref.usageCount,
      createdAt: ref.createdAt.toISOString(),
    }))
  );
}

// ─── Update Reference ─────

type UpdateResult =
  | { success: true; reference: ReferenceItem }
  | { success: false; error: string };

export async function updateReference(
  referenceId: string,
  updates: { name?: string; description?: string; type?: ReferenceType; tags?: string[] }
): Promise<UpdateResult> {
  const { userId: clerkId } = await auth();
  if (!clerkId) return { success: false, error: "Not authenticated" };

  const ref = await db.reference.findFirst({
    where: { id: referenceId, user: { clerkId } },
  });
  if (!ref) return { success: false, error: "Reference not found" };

  const data: Record<string, unknown> = {};
  if (updates.name !== undefined) data.name = updates.name.trim();
  if (updates.description !== undefined) data.description = updates.description.trim();
  if (updates.type !== undefined) data.type = updates.type;
  if (updates.tags !== undefined) data.tags = updates.tags.map((t) => t.toLowerCase().trim()).filter(Boolean);

  const updated = await db.reference.update({
    where: { id: referenceId },
    data,
  });

  const signedUrl = await getSignedImageUrl(updated.imageUrl);

  return {
    success: true,
    reference: {
      id: updated.id,
      creatorId: updated.creatorId,
      type: updated.type as ReferenceType,
      name: updated.name,
      description: updated.description,
      imageUrl: signedUrl,
      s3Key: updated.imageUrl,
      tags: updated.tags,
      usageCount: updated.usageCount,
      createdAt: updated.createdAt.toISOString(),
    },
  };
}

// ─── Delete Reference ─────

export async function deleteReference(
  referenceId: string
): Promise<{ success: boolean; error?: string }> {
  const { userId: clerkId } = await auth();
  if (!clerkId) return { success: false, error: "Not authenticated" };

  const ref = await db.reference.findFirst({
    where: { id: referenceId, user: { clerkId } },
  });
  if (!ref) return { success: false, error: "Reference not found" };

  await db.reference.delete({ where: { id: referenceId } });
  return { success: true };
}

// ─── Increment Usage ─────

export async function incrementReferenceUsage(
  referenceIds: string[]
): Promise<void> {
  if (referenceIds.length === 0) return;
  await db.reference.updateMany({
    where: { id: { in: referenceIds } },
    data: { usageCount: { increment: 1 } },
  });
}
```

- [ ] **Step 2: Verify the server action compiles**

Run: `pnpm build 2>&1 | head -30`

Expected: No errors related to reference-actions.ts. (May have other pre-existing warnings.)

- [ ] **Step 3: Commit**

```bash
git add src/server/actions/reference-actions.ts
git commit -m "feat: add reference CRUD server actions with AI auto-analysis"
```

---

### Task 4: Zustand Store — Add References State

**Files:**
- Modify: `src/stores/creator-store.ts`

- [ ] **Step 1: Add references state and actions to creator-store**

Add the import at the top of the file:

```typescript
import type { ReferenceItem } from "@/types/reference";
```

Add to the `CreatorStore` type:

```typescript
  references: ReferenceItem[];
  setReferences: (refs: ReferenceItem[]) => void;
  addReference: (ref: ReferenceItem) => void;
  removeReference: (id: string) => void;
  updateReferenceInStore: (id: string, updates: Partial<ReferenceItem>) => void;
```

Add to the `create` initializer:

```typescript
  references: [],
  setReferences: (references) => set({ references }),
  addReference: (ref) => set((state) => ({ references: [ref, ...state.references] })),
  removeReference: (id) => set((state) => ({ references: state.references.filter((r) => r.id !== id) })),
  updateReferenceInStore: (id, updates) => set((state) => ({
    references: state.references.map((r) => r.id === id ? { ...r, ...updates } : r),
  })),
```

- [ ] **Step 2: Add "references" to ActiveView in ui-store**

In `src/stores/ui-store.ts`, change the type:

```typescript
export type ActiveView = "chat" | "library" | "templates" | "references";
```

- [ ] **Step 3: Commit**

```bash
git add src/stores/creator-store.ts src/stores/ui-store.ts
git commit -m "feat: add references state to creator store and ui-store"
```

---

### Task 5: Load References on Mount

**Files:**
- Modify: `src/components/workspace/workspace-init.tsx`

- [ ] **Step 1: Read workspace-init.tsx**

Read the file to understand the current data loading pattern.

- [ ] **Step 2: Add reference loading**

Import at top:

```typescript
import { getCreatorReferences } from "@/server/actions/reference-actions";
```

In the effect that runs when `activeCreatorId` changes (where it loads content), add:

```typescript
getCreatorReferences(activeCreatorId).then(setReferences);
```

Using `setReferences` from the creator store.

- [ ] **Step 3: Commit**

```bash
git add src/components/workspace/workspace-init.tsx
git commit -m "feat: load creator references on workspace mount"
```

---

### Task 6: Reference Card Component

**Files:**
- Create: `src/components/workspace/reference-card.tsx`

- [ ] **Step 1: Create the reference card component**

```typescript
"use client";

import { REFERENCE_TYPE_LABELS, type ReferenceItem } from "@/types/reference";

export function ReferenceCard({
  reference,
  onClick,
  onDelete,
  compact,
}: {
  reference: ReferenceItem;
  onClick?: () => void;
  onDelete?: () => void;
  compact?: boolean;
}) {
  return (
    <div
      className={`ref-card${compact ? " ref-card-compact" : ""}`}
      onClick={onClick}
    >
      <div className="ref-card-image">
        {reference.imageUrl ? (
          <img src={reference.imageUrl} alt={reference.name} />
        ) : (
          <div className="ref-card-placeholder" />
        )}
      </div>
      <div className="ref-card-info">
        <div className="ref-card-name">{reference.name}</div>
        <div className="ref-card-type">{REFERENCE_TYPE_LABELS[reference.type]}</div>
        {!compact && reference.usageCount > 0 && (
          <div className="ref-card-usage">Used in {reference.usageCount} post{reference.usageCount !== 1 ? "s" : ""}</div>
        )}
      </div>
      {onDelete && (
        <button
          className="ref-card-delete"
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          title="Delete reference"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/workspace/reference-card.tsx
git commit -m "feat: add ReferenceCard component"
```

---

### Task 7: Add Reference Dialog

**Files:**
- Create: `src/components/workspace/add-reference-dialog.tsx`

- [ ] **Step 1: Create the add-reference dialog with AI auto-analysis**

```typescript
"use client";

import { useState, useCallback } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useCreatorStore } from "@/stores/creator-store";
import {
  analyzeReferenceImage,
  createReference,
} from "@/server/actions/reference-actions";
import {
  REFERENCE_TYPES,
  REFERENCE_TYPE_LABELS,
  type ReferenceType,
} from "@/types/reference";

function resizeImage(file: File, maxSize: number = 1200): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let { width, height } = img;
        if (width > maxSize || height > maxSize) {
          const ratio = Math.min(maxSize / width, maxSize / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
        resolve(dataUrl.split(",")[1]); // base64 only
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

export function AddReferenceDialog({
  open,
  onOpenChange,
  prefillImageBase64,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prefillImageBase64?: string;
}) {
  const [imageBase64, setImageBase64] = useState<string | null>(prefillImageBase64 ?? null);
  const [imagePreview, setImagePreview] = useState<string | null>(
    prefillImageBase64 ? `data:image/jpeg;base64,${prefillImageBase64}` : null
  );
  const [type, setType] = useState<ReferenceType>("BACKGROUND");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { activeCreatorId, addReference } = useCreatorStore();

  const handleFile = useCallback(async (file: File) => {
    if (!file.type.startsWith("image/")) return;
    setError(null);

    const base64 = await resizeImage(file);
    setImageBase64(base64);
    setImagePreview(`data:image/jpeg;base64,${base64}`);

    // AI auto-analyze
    setAnalyzing(true);
    const analysis = await analyzeReferenceImage(base64);
    setType(analysis.type);
    setName(analysis.name);
    setDescription(analysis.description);
    setTags(analysis.tags.join(", "));
    setAnalyzing(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleSave = async () => {
    if (!imageBase64 || !activeCreatorId || !name.trim()) return;
    setSaving(true);
    setError(null);

    const tagList = tags.split(",").map((t) => t.trim()).filter(Boolean);
    const result = await createReference(
      activeCreatorId,
      type,
      name,
      description,
      imageBase64,
      tagList
    );

    if (result.success) {
      addReference(result.reference);
      // Reset
      setImageBase64(null);
      setImagePreview(null);
      setName("");
      setDescription("");
      setTags("");
      setType("BACKGROUND");
      onOpenChange(false);
    } else {
      setError(result.error);
    }
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="add-ref-dialog">
        <h3 className="add-ref-title">Add Reference</h3>

        {/* Upload area */}
        {!imageBase64 ? (
          <div
            className="add-ref-upload"
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => {
              const input = document.createElement("input");
              input.type = "file";
              input.accept = "image/*";
              input.onchange = (e) => {
                const file = (e.target as HTMLInputElement).files?.[0];
                if (file) handleFile(file);
              };
              input.click();
            }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            <span>Drop an image or click to upload</span>
          </div>
        ) : (
          <div className="add-ref-preview">
            <img src={imagePreview!} alt="Preview" />
            <button
              className="add-ref-change"
              onClick={() => { setImageBase64(null); setImagePreview(null); }}
            >
              Change
            </button>
          </div>
        )}

        {/* Analyzing indicator */}
        {analyzing && (
          <div className="add-ref-analyzing">
            <div className="studio-gen-spinner" />
            <span>Analyzing image...</span>
          </div>
        )}

        {/* Fields (shown after upload) */}
        {imageBase64 && !analyzing && (
          <div className="add-ref-fields">
            <div className="add-ref-field">
              <label className="add-ref-label">Type</label>
              <select
                className="add-ref-select"
                value={type}
                onChange={(e) => setType(e.target.value as ReferenceType)}
              >
                {REFERENCE_TYPES.map((t) => (
                  <option key={t} value={t}>{REFERENCE_TYPE_LABELS[t]}</option>
                ))}
              </select>
            </div>

            <div className="add-ref-field">
              <label className="add-ref-label">Name</label>
              <input
                className="add-ref-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="My Bedroom"
                style={{ fontSize: 16 }}
              />
            </div>

            <div className="add-ref-field">
              <label className="add-ref-label">Description</label>
              <textarea
                className="add-ref-textarea"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What does this show? Used in prompt building."
                rows={2}
                style={{ fontSize: 16 }}
              />
            </div>

            <div className="add-ref-field">
              <label className="add-ref-label">Tags</label>
              <input
                className="add-ref-input"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="bedroom, cozy, morning, home"
                style={{ fontSize: 16 }}
              />
            </div>
          </div>
        )}

        {error && <div className="add-ref-error">{error}</div>}

        {/* Actions */}
        <div className="add-ref-actions">
          <button
            className="studio-btn secondary"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </button>
          <button
            className="studio-btn primary"
            onClick={handleSave}
            disabled={!imageBase64 || !name.trim() || saving || analyzing}
          >
            {saving ? "Saving..." : "Save Reference"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/workspace/add-reference-dialog.tsx
git commit -m "feat: add AddReferenceDialog with AI auto-analysis"
```

---

### Task 8: Reference Library View

**Files:**
- Create: `src/components/workspace/reference-library.tsx`

- [ ] **Step 1: Create the reference library grid component**

```typescript
"use client";

import { useState } from "react";
import { useCreatorStore } from "@/stores/creator-store";
import { deleteReference } from "@/server/actions/reference-actions";
import { ReferenceCard } from "./reference-card";
import { AddReferenceDialog } from "./add-reference-dialog";
import { REFERENCE_TYPES, REFERENCE_TYPE_LABELS, type ReferenceType } from "@/types/reference";

type Filter = "ALL" | ReferenceType;

export function ReferenceLibrary() {
  const { references, removeReference } = useCreatorStore();
  const creator = useCreatorStore((s) => s.getActiveCreator());
  const [filter, setFilter] = useState<Filter>("ALL");
  const [addOpen, setAddOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const filtered = filter === "ALL"
    ? references
    : references.filter((r) => r.type === filter);

  const counts: Record<string, number> = { ALL: references.length };
  for (const t of REFERENCE_TYPES) {
    counts[t] = references.filter((r) => r.type === t).length;
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    const result = await deleteReference(id);
    if (result.success) {
      removeReference(id);
    }
    setDeletingId(null);
  }

  return (
    <div className="ref-library">
      <div className="ref-library-header">
        <div>
          <h2 className="ref-library-title">
            {creator?.name ? `${creator.name}'s References` : "References"}
          </h2>
          <span className="ref-library-count">{references.length} reference{references.length !== 1 ? "s" : ""}</span>
        </div>
        <button className="studio-btn primary" onClick={() => setAddOpen(true)}>
          + Add Reference
        </button>
      </div>

      {/* Category tabs */}
      <div className="ref-filter-bar">
        <button
          className={`filter-pill${filter === "ALL" ? " active" : ""}`}
          onClick={() => setFilter("ALL")}
        >
          All<span className="count">{counts.ALL}</span>
        </button>
        {REFERENCE_TYPES.map((t) => (
          <button
            key={t}
            className={`filter-pill${filter === t ? " active" : ""}`}
            onClick={() => setFilter(t)}
          >
            {REFERENCE_TYPE_LABELS[t]}<span className="count">{counts[t]}</span>
          </button>
        ))}
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="ref-empty">
          <div className="ref-empty-icon">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <path d="M21 15l-5-5L5 21" />
            </svg>
          </div>
          <div className="ref-empty-title">No references yet</div>
          <div className="ref-empty-desc">
            Add backgrounds, products, outfits, and more to keep your creator's content consistent.
          </div>
          <button className="studio-btn primary" onClick={() => setAddOpen(true)}>
            Add Your First Reference
          </button>
        </div>
      ) : (
        <div className="ref-grid">
          {filtered.map((ref) => (
            <ReferenceCard
              key={ref.id}
              reference={ref}
              onDelete={deletingId === ref.id ? undefined : () => handleDelete(ref.id)}
            />
          ))}
          <button className="ref-add-card" onClick={() => setAddOpen(true)}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M12 5v14M5 12h14" />
            </svg>
            <span>Add Reference</span>
          </button>
        </div>
      )}

      <AddReferenceDialog open={addOpen} onOpenChange={setAddOpen} />
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/workspace/reference-library.tsx
git commit -m "feat: add ReferenceLibrary grid view with filters"
```

---

### Task 9: CSS Styles

**Files:**
- Create: `src/app/workspace/reference-library.css`

- [ ] **Step 1: Create prototype-first CSS for reference library**

```css
/* ─── Reference Library ────────────────────────── */

.ref-library {
  padding: 0;
}

.ref-library-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 0 16px;
}

.ref-library-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary, #111);
  margin: 0;
}

.ref-library-count {
  font-size: 12px;
  color: var(--text-secondary, #888);
}

.ref-filter-bar {
  display: flex;
  gap: 6px;
  padding-bottom: 16px;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}

/* ─── Reference Grid ─────────────────────────── */

.ref-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 12px;
  padding-bottom: 80px;
}

@media (max-width: 640px) {
  .ref-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 8px;
  }
}

/* ─── Reference Card ─────────────────────────── */

.ref-card {
  background: var(--card, #F5F5F5);
  border-radius: 10px;
  overflow: hidden;
  cursor: pointer;
  position: relative;
  transition: box-shadow 0.15s;
  border: 1px solid var(--border, #EBEBEB);
}

.ref-card:hover {
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
}

.ref-card-image {
  aspect-ratio: 1;
  overflow: hidden;
  background: var(--border, #EBEBEB);
}

.ref-card-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.ref-card-placeholder {
  width: 100%;
  height: 100%;
  background: var(--border, #EBEBEB);
}

.ref-card-info {
  padding: 8px 10px;
}

.ref-card-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary, #111);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.ref-card-type {
  font-size: 11px;
  color: var(--accent, #C4603A);
  margin-top: 2px;
}

.ref-card-usage {
  font-size: 10px;
  color: var(--text-muted, #BBB);
  margin-top: 2px;
}

.ref-card-delete {
  position: absolute;
  top: 6px;
  right: 6px;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.6);
  border: none;
  color: #fff;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.15s;
}

.ref-card:hover .ref-card-delete {
  opacity: 1;
}

.ref-card-compact .ref-card-image {
  aspect-ratio: 1;
}

.ref-card-compact .ref-card-info {
  padding: 4px 6px;
}

.ref-card-compact .ref-card-name {
  font-size: 11px;
}

/* ─── Add Card ───────────────────────────────── */

.ref-add-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-height: 180px;
  border-radius: 10px;
  border: 1px dashed var(--border, #EBEBEB);
  background: transparent;
  cursor: pointer;
  color: var(--text-muted, #BBB);
  font-size: 12px;
  transition: border-color 0.15s, color 0.15s;
}

.ref-add-card:hover {
  border-color: var(--accent, #C4603A);
  color: var(--accent, #C4603A);
}

/* ─── Empty State ────────────────────────────── */

.ref-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  text-align: center;
}

.ref-empty-icon {
  color: var(--text-muted, #BBB);
  margin-bottom: 12px;
}

.ref-empty-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary, #111);
  margin-bottom: 6px;
}

.ref-empty-desc {
  font-size: 13px;
  color: var(--text-secondary, #888);
  max-width: 360px;
  margin-bottom: 20px;
  line-height: 1.5;
}

/* ─── Add Reference Dialog ───────────────────── */

.add-ref-dialog {
  max-width: 480px;
}

.add-ref-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary, #111);
  margin: 0 0 16px;
}

.add-ref-upload {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 40px 20px;
  border: 2px dashed var(--border, #EBEBEB);
  border-radius: 10px;
  cursor: pointer;
  color: var(--text-muted, #BBB);
  font-size: 13px;
  transition: border-color 0.15s;
}

.add-ref-upload:hover {
  border-color: var(--accent, #C4603A);
}

.add-ref-preview {
  position: relative;
  border-radius: 10px;
  overflow: hidden;
  max-height: 200px;
}

.add-ref-preview img {
  width: 100%;
  height: 200px;
  object-fit: cover;
  display: block;
}

.add-ref-change {
  position: absolute;
  top: 8px;
  right: 8px;
  padding: 4px 10px;
  background: rgba(0, 0, 0, 0.6);
  color: #fff;
  border: none;
  border-radius: 6px;
  font-size: 11px;
  cursor: pointer;
}

.add-ref-analyzing {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 0;
  font-size: 13px;
  color: var(--text-secondary, #888);
}

.add-ref-fields {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding-top: 12px;
}

.add-ref-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.add-ref-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-secondary, #888);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.add-ref-input,
.add-ref-textarea,
.add-ref-select {
  padding: 8px 10px;
  border: 1px solid var(--border, #EBEBEB);
  border-radius: 8px;
  font-size: 14px;
  color: var(--text-primary, #111);
  background: var(--surface, #FFF);
  font-family: inherit;
}

.add-ref-input:focus,
.add-ref-textarea:focus,
.add-ref-select:focus {
  outline: none;
  border-color: var(--accent, #C4603A);
}

.add-ref-error {
  padding: 8px 0;
  font-size: 13px;
  color: #e53e3e;
}

.add-ref-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
  padding-top: 16px;
}
```

- [ ] **Step 2: Import CSS in workspace layout**

In `src/app/workspace/layout.tsx`, add the import:

```typescript
import "./reference-library.css";
```

Wait — the workspace layout is a server component. CSS imports work fine in server components in Next.js. But let's check the existing pattern — workspace.css is likely imported somewhere already.

Read `src/app/workspace/layout.tsx` and `src/app/workspace/page.tsx` to find where `workspace.css` is imported, then add `reference-library.css` in the same location.

- [ ] **Step 3: Commit**

```bash
git add src/app/workspace/reference-library.css
git commit -m "feat: add reference library CSS styles"
```

---

### Task 10: Wire Into Workspace — Sidebar + Canvas

**Files:**
- Modify: `src/components/workspace/app-sidebar.tsx`
- Modify: `src/components/workspace/workspace-canvas.tsx`

- [ ] **Step 1: Add References link to sidebar**

In `src/components/workspace/app-sidebar.tsx`, import ui-store:

```typescript
import { useUIStore } from "@/stores/ui-store";
```

Add a references button after the `CreatorList` section, before the "New Creator" button:

```typescript
        <button
          onClick={() => {
            useUIStore.getState().setActiveView("references");
            onClose?.();
          }}
          className="new-creator-btn"
          style={{ fontWeight: 400 }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <path d="M21 15l-5-5L5 21" />
          </svg>
          References
        </button>
```

- [ ] **Step 2: Add references view to workspace canvas**

In `src/components/workspace/workspace-canvas.tsx`, import the ReferenceLibrary:

```typescript
import { ReferenceLibrary } from "./reference-library";
```

In the `WorkspaceCanvas` component, add a check before the templates check:

```typescript
  if (activeView === "references") {
    return <ReferencesArea />;
  }
```

And add the `ReferencesArea` wrapper component (same pattern as `TemplatesArea`):

```typescript
function ReferencesArea() {
  const { setActiveView } = useUIStore();

  return (
    <>
      <div className="filter-bar">
        <button
          className="filter-pill"
          onClick={() => setActiveView("chat")}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: 4 }}>
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          Content
        </button>
        <span className="filter-divider" />
        <button className="filter-pill active">
          References
        </button>
      </div>
      <div className="content-area">
        <ReferenceLibrary />
      </div>
    </>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/workspace/app-sidebar.tsx src/components/workspace/workspace-canvas.tsx
git commit -m "feat: wire reference library into sidebar and workspace canvas"
```

---

### Task 11: Save as Reference from Content Detail

**Files:**
- Modify: `src/components/workspace/content-detail.tsx`

- [ ] **Step 1: Add "Save as Reference" button to content detail**

Import the dialog:

```typescript
import { AddReferenceDialog } from "./add-reference-dialog";
```

Add state inside the `ContentDetail` component:

```typescript
const [saveRefOpen, setSaveRefOpen] = useState(false);
const [refImageBase64, setRefImageBase64] = useState<string | null>(null);
```

Add a handler to fetch the image and open the dialog:

```typescript
  const handleSaveAsRef = async () => {
    if (!item?.url) return;
    try {
      const response = await fetch(item.url);
      const blob = await response.blob();
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = (reader.result as string).split(",")[1];
        setRefImageBase64(base64);
        setSaveRefOpen(true);
      };
      reader.readAsDataURL(blob);
    } catch {
      // Fallback — just open without prefill
      setSaveRefOpen(true);
    }
  };
```

Add the button in the `cd-actions` div, after the "Make Carousel" button:

```typescript
              <button className="cd-action-btn" onClick={handleSaveAsRef}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <path d="M21 15l-5-5L5 21" />
                </svg>
                Save as Reference
              </button>
```

Add the dialog at the end of the component's return, before the closing `</Dialog>`:

```typescript
        {saveRefOpen && (
          <AddReferenceDialog
            open={saveRefOpen}
            onOpenChange={setSaveRefOpen}
            prefillImageBase64={refImageBase64 ?? undefined}
          />
        )}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/workspace/content-detail.tsx
git commit -m "feat: add Save as Reference button to content detail"
```

---

### Task 12: Dashboard Fixes — Search, Sort, Carousel Filter

**Files:**
- Modify: `src/components/workspace/workspace-canvas.tsx`

- [ ] **Step 1: Wire gallery search**

In the `ContentArea` component, add search state:

```typescript
const [searchQuery, setSearchQuery] = useState("");
```

Replace the search input's `<input>` to be controlled:

```typescript
<input
  type="text"
  placeholder="Search content..."
  value={searchQuery}
  onChange={(e) => setSearchQuery(e.target.value)}
/>
```

Add filtering logic before the grid render. Create a filtered content array:

```typescript
  const query = searchQuery.toLowerCase().trim();
  const filteredContent = query
    ? content.filter((c) =>
        !c.contentSetId && (
          (c.userInput ?? "").toLowerCase().includes(query) ||
          (c.prompt ?? "").toLowerCase().includes(query)
        )
      )
    : content.filter((c) => !c.contentSetId);

  const filteredSets = query
    ? contentSets.filter((s) =>
        (s.formatId ?? "").toLowerCase().includes(query) ||
        (s.caption ?? "").toLowerCase().includes(query)
      )
    : contentSets;
```

Use `filteredContent` and `filteredSets` in the grid render instead of `content.filter(...)` and `contentSets`.

- [ ] **Step 2: Wire gallery sort**

Add sort state:

```typescript
const [sortBy, setSortBy] = useState<"newest" | "oldest" | "type">("newest");
```

Wire the select:

```typescript
<select value={sortBy} onChange={(e) => setSortBy(e.target.value as typeof sortBy)}>
  <option value="newest">Newest</option>
  <option value="oldest">Oldest</option>
  <option value="type">By type</option>
</select>
```

Apply sorting to `filteredContent` before rendering:

```typescript
  const sortedContent = [...filteredContent].sort((a, b) => {
    if (sortBy === "oldest") return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    if (sortBy === "type") return a.type.localeCompare(b.type);
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(); // newest
  });
```

- [ ] **Step 3: Fix carousel filter counts**

Update the filter pill counts to use correct math:

```typescript
  const standalonePhotos = content.filter((c) => !c.contentSetId);
```

```typescript
<button className={`filter-pill${filter === "all" ? " active" : ""}`} onClick={() => setFilter("all")}>
  All<span className="count">{standalonePhotos.length + contentSets.length}</span>
</button>
<button className={`filter-pill${filter === "photos" ? " active" : ""}`} onClick={() => setFilter("photos")}>
  Photos<span className="count">{standalonePhotos.length}</span>
</button>
```

Update the gallery count to reflect filtered results:

```typescript
<span className="gallery-count">{sortedContent.length + (filter !== "photos" ? filteredSets.length : 0)} items</span>
```

- [ ] **Step 4: Commit**

```bash
git add src/components/workspace/workspace-canvas.tsx
git commit -m "feat: wire gallery search, sort, and fix carousel filter counts"
```

---

### Task 13: Final Build Verification

- [ ] **Step 1: Run build to check for errors**

Run: `pnpm build 2>&1 | tail -20`

Expected: Build succeeds. Fix any type errors.

- [ ] **Step 2: Run dev server to verify**

Run: `pnpm dev`

Manual checks:
1. Sidebar shows "References" button
2. Clicking it shows the reference library (empty state)
3. "Add Reference" opens the dialog
4. Upload an image → AI analysis fills in fields
5. Save → reference appears in grid
6. Filter tabs work
7. Delete works
8. Content detail shows "Save as Reference" button
9. Gallery search filters content
10. Gallery sort reorders content
11. Carousel filter shows correct counts

- [ ] **Step 3: Commit any fixes**

```bash
git add -A
git commit -m "fix: build verification fixes for reference library"
```
