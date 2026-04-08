# Ref Modes V2 + Library Fix — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade reference attachment modes with what/how/description controls, save generation recipes on Content records, show ref recipes on past content, and fix library card display.

**Architecture:** `AttachedRef` gains `what` (background/outfit/pose/all) + `description` fields. `Content.refAttachments` JSON stores the full recipe per generation. Inline ref chips expand on click to show controls. Generation pipeline builds per-ref instructions from what + mode + description. Canvas shows ref recipe on past content. Rename "scene" → "similar".

**Tech Stack:** Prisma, Zustand, Gemini Flash (vibe analysis), prototype-first CSS

**Spec:** `docs/superpowers/specs/2026-04-08-ref-modes-v2-library-fix-design.md`

---

## File Map

```
Phase A — Schema + Types
  MODIFY: prisma/schema.prisma                            — Add refAttachments Json? to Content
  MODIFY: src/types/content.ts                            — ContentRefAttachment type, refAttachments on ContentItem
  MODIFY: src/stores/unified-studio-store.ts              — RefWhat, AttachedRef update, autoDetectWhat, new actions

Phase B — Inline Refs UI
  MODIFY: src/components/studio/content/inline-refs.tsx    — Collapsed/expanded, what/mode/description controls

Phase C — Generation Pipeline
  MODIFY: src/server/actions/content-actions.ts           — buildRefInstruction, save refAttachments on Content

Phase D — Canvas Recipe Display
  MODIFY: src/components/studio/content/studio-canvas.tsx  — Show ref recipe on past content

Phase E — Library Fixes
  MODIFY: src/components/workspace/content-library.tsx    — Show AI description on cards
```

---

### Task 1: Schema + Types + Store

**Files:**
- Modify: `prisma/schema.prisma`
- Modify: `src/types/content.ts`
- Modify: `src/stores/unified-studio-store.ts`

- [ ] **Step 1: Add refAttachments to Content model**

In `prisma/schema.prisma`, find the Content model and add:

```prisma
  refAttachments  Json?     // Array of ref usage records: [{refId, mode, what, description, ...}]
```

Run:
```bash
pnpx prisma migrate dev --name ref_attachments
pnpx prisma generate
```

- [ ] **Step 2: Add ContentRefAttachment type**

In `src/types/content.ts`, add the new type and update ContentItem. Read the file first. Add:

```typescript
export type ContentRefAttachment = {
  refId: string;
  refName: string;
  refS3Key: string;
  mode: "exact" | "similar" | "vibe";
  what: "background" | "outfit" | "pose" | "all";
  description: string;
  vibeText?: string;
};
```

Add `refAttachments?: ContentRefAttachment[]` to the existing `ContentItem` type.

- [ ] **Step 3: Update store — RefWhat, AttachedRef, new actions**

In `src/stores/unified-studio-store.ts`, read the file first. Then:

1. Add/update types:
```typescript
export type RefWhat = "background" | "outfit" | "pose" | "all";
export type RefMode = "exact" | "similar" | "vibe";

export type AttachedRef = {
  ref: ReferenceItem;
  mode: RefMode;
  what: RefWhat;
  description: string;
};
```

Note: `RefMode` changes from `"exact" | "scene" | "vibe"` to `"exact" | "similar" | "vibe"` (rename "scene" → "similar").

2. Add `autoDetectWhat` helper function (outside the store):
```typescript
function autoDetectWhat(ref: ReferenceItem): RefWhat {
  if (ref.type === "BACKGROUND") return "background";
  if (ref.tags.includes("outfit")) return "outfit";
  if (ref.tags.includes("pose")) return "pose";
  return "all";
}
```

3. Update `attachRef` to include `what` and `description`:
```typescript
  attachRef: (ref) => set((s) => ({
    attachedRefs: s.attachedRefs.some((a) => a.ref.id === ref.id)
      ? s.attachedRefs.filter((a) => a.ref.id !== ref.id)
      : [...s.attachedRefs, { ref, mode: "exact" as RefMode, what: autoDetectWhat(ref), description: "" }],
  })),
```

4. Add new actions to the type and implementation:
```typescript
  setRefWhat: (refId: string, what: RefWhat) => void;
  setRefDescription: (refId: string, description: string) => void;
```

Implementation:
```typescript
  setRefWhat: (refId, what) => set((s) => ({
    attachedRefs: s.attachedRefs.map((a) => a.ref.id === refId ? { ...a, what } : a),
  })),
  setRefDescription: (refId, description) => set((s) => ({
    attachedRefs: s.attachedRefs.map((a) => a.ref.id === refId ? { ...a, description } : a),
  })),
```

5. Add both to the Omit list.

- [ ] **Step 4: Verify build**

```bash
pnpm build 2>&1 | tail -10
```

- [ ] **Step 5: Commit**

```bash
git add prisma/ src/types/content.ts src/stores/unified-studio-store.ts
git commit -m "feat: ref modes v2 — schema, types, store with what/description/autoDetect"
```

---

### Task 2: Inline Refs UI — Collapsed/Expanded with Controls

**Files:**
- Modify: `src/components/studio/content/inline-refs.tsx`

- [ ] **Step 1: Read the current file**

Read `src/components/studio/content/inline-refs.tsx`.

- [ ] **Step 2: Replace with expanded inline refs**

Replace the entire file:

```tsx
"use client";

import { useState } from "react";
import { useUnifiedStudioStore, type RefMode, type RefWhat } from "@/stores/unified-studio-store";

const MODE_LABELS: Record<RefMode, string> = {
  exact: "Exact",
  similar: "Similar",
  vibe: "Vibe",
};

const WHAT_LABELS: Record<RefWhat, string> = {
  background: "BG",
  outfit: "Outfit",
  pose: "Pose",
  all: "All",
};

export function InlineRefs() {
  const { attachedRefs, detachRef, setRefMode, setRefWhat, setRefDescription, inspirationPhotos, removeInspirationPhoto } = useUnifiedStudioStore();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (attachedRefs.length === 0 && inspirationPhotos.length === 0) return null;

  return (
    <div className="sv2-inline-refs">
      {attachedRefs.map(({ ref, mode, what, description }) => {
        const isExpanded = expandedId === ref.id;
        const isVibe = mode === "vibe";

        return (
          <div
            key={ref.id}
            className="sv2-inline-ref"
            style={{
              flexDirection: "column",
              alignItems: "stretch",
              padding: isExpanded ? "6px 8px" : "3px 8px 3px 3px",
              cursor: "pointer",
              gap: isExpanded ? 4 : 1,
            }}
            onClick={() => setExpandedId(isExpanded ? null : ref.id)}
          >
            {/* Row 1: Thumbnail + name + badges + close */}
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <div
                className="sv2-inline-ref-thumb"
                style={{ background: ref.imageUrl ? `url(${ref.imageUrl}) center/cover` : "#F5F5F5" }}
              />
              <span style={{ fontSize: 10, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1, minWidth: 0 }}>
                {ref.name}
              </span>
              {!isExpanded && (
                <span style={{ fontSize: 8, color: isVibe ? "#C4603A" : "#AAA", whiteSpace: "nowrap" }}>
                  {isVibe ? "✨ Vibe" : `${WHAT_LABELS[what]} · ${MODE_LABELS[mode]}`}
                </span>
              )}
              <button
                className="sv2-inline-ref-x"
                onClick={(e) => { e.stopPropagation(); detachRef(ref.id); }}
              >
                &times;
              </button>
            </div>

            {/* Expanded controls */}
            {isExpanded && (
              <>
                {/* Mode + What dropdowns */}
                <div style={{ display: "flex", gap: 4 }} onClick={(e) => e.stopPropagation()}>
                  {!isVibe && (
                    <select
                      value={what}
                      onChange={(e) => setRefWhat(ref.id, e.target.value as RefWhat)}
                      style={{
                        fontSize: 9, padding: "2px 4px", border: "1px solid #EBEBEB",
                        borderRadius: 4, background: "#F9F9F9", color: "#666",
                        cursor: "pointer", fontFamily: "inherit", outline: "none",
                      }}
                    >
                      <option value="background">Background</option>
                      <option value="outfit">Outfit</option>
                      <option value="pose">Pose</option>
                      <option value="all">Everything</option>
                    </select>
                  )}
                  <select
                    value={mode}
                    onChange={(e) => setRefMode(ref.id, e.target.value as RefMode)}
                    style={{
                      fontSize: 9, padding: "2px 4px", border: "1px solid #EBEBEB",
                      borderRadius: 4,
                      background: isVibe ? "rgba(196,96,58,0.08)" : "#F9F9F9",
                      color: isVibe ? "#C4603A" : "#666",
                      cursor: "pointer", fontFamily: "inherit", outline: "none",
                    }}
                  >
                    <option value="exact">Exact</option>
                    <option value="similar">Similar</option>
                    <option value="vibe">✨ Vibe</option>
                  </select>
                </div>

                {/* Description input */}
                <input
                  value={description}
                  onChange={(e) => setRefDescription(ref.id, e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  placeholder={isVibe ? "describe the vibe..." : "e.g. but make it nighttime"}
                  style={{
                    fontSize: 9, padding: "3px 6px", border: "1px solid #EBEBEB",
                    borderRadius: 4, background: "#FAFAFA", color: "#555",
                    fontFamily: "inherit", outline: "none", width: "100%",
                  }}
                />
              </>
            )}
          </div>
        );
      })}
      {inspirationPhotos.map((photo, i) => (
        <div key={`inspo-${i}`} className="sv2-inline-ref">
          <div
            className="sv2-inline-ref-thumb"
            style={{ background: `url(${photo.preview}) center/cover` }}
          />
          <span>Inspiration</span>
          <button className="sv2-inline-ref-x" onClick={() => removeInspirationPhoto(i)}>&times;</button>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Verify build**

```bash
pnpm build 2>&1 | tail -10
```

- [ ] **Step 4: Commit**

```bash
git add src/components/studio/content/inline-refs.tsx
git commit -m "feat: inline refs — collapsed/expanded with what/mode/description controls"
```

---

### Task 3: Generation Pipeline — buildRefInstruction + Save Recipe

**Files:**
- Modify: `src/server/actions/content-actions.ts`

- [ ] **Step 1: Read the file**

Read `src/server/actions/content-actions.ts` fully. Find where `refAttachments` are handled in `generateContent`.

- [ ] **Step 2: Update refAttachments parameter type**

The `generateContent` function currently accepts:
```typescript
refAttachments?: { s3Key: string; mode: "exact" | "scene" | "vibe" }[]
```

Update to:
```typescript
refAttachments?: {
  refId: string;
  refName: string;
  s3Key: string;
  mode: "exact" | "similar" | "vibe";
  what: "background" | "outfit" | "pose" | "all";
  description: string;
}[]
```

- [ ] **Step 3: Replace ref handling logic with buildRefInstruction**

Replace the existing ref handling block (the `for (const att of refAttachments)` loop) with:

```typescript
    let refPromptSuffix = "";
    const refImages: { mimeType: string; data: string }[] = [];
    const savedRefAttachments: any[] = [];

    if (refAttachments && refAttachments.length > 0) {
      for (const att of refAttachments) {
        if (att.mode === "exact" || att.mode === "similar") {
          // Pass the image to Gemini
          try {
            const refBuf = await getImageBuffer(att.s3Key);
            refImages.push({ mimeType: "image/jpeg", data: refBuf.toString("base64") });
          } catch (e) {
            console.error("Failed to load ref image:", e);
            continue;
          }

          const whatLabel: Record<string, string> = {
            background: "background/setting",
            outfit: "outfit/clothing",
            pose: "pose/body position",
            all: "everything",
          };

          if (att.mode === "exact") {
            refPromptSuffix += ` Match the ${whatLabel[att.what] ?? "reference"} from the reference image exactly.`;
          } else {
            refPromptSuffix += ` Use a similar ${whatLabel[att.what] ?? "style"} to the reference image, with creative freedom.`;
          }

          if (att.description?.trim()) {
            refPromptSuffix += ` ${att.description.trim()}.`;
          }

          savedRefAttachments.push({
            refId: att.refId,
            refName: att.refName,
            refS3Key: att.s3Key,
            mode: att.mode,
            what: att.what,
            description: att.description || "",
          });

        } else if (att.mode === "vibe") {
          try {
            const refBuf = await getImageBuffer(att.s3Key);
            const { analyzeReferenceVibe } = await import("./reference-actions");
            const vibeText = await analyzeReferenceVibe(refBuf.toString("base64"));
            const desc = att.description?.trim() ? ` ${att.description.trim()}.` : "";
            refPromptSuffix += ` Style and mood: ${vibeText}.${desc}`;

            savedRefAttachments.push({
              refId: att.refId,
              refName: att.refName,
              refS3Key: att.s3Key,
              mode: "vibe",
              what: att.what,
              description: att.description || "",
              vibeText,
            });
          } catch (e) {
            console.error("Failed to analyze vibe:", e);
          }
        }
      }
    }
```

- [ ] **Step 4: Save refAttachments on Content records**

After the Content records are created (the `for (let i = 0; i < s3Keys.length; i++)` loop), update each with `refAttachments`:

```typescript
      // Save ref recipe on content records
      if (savedRefAttachments.length > 0) {
        await Promise.all(
          contentItems.map((item) =>
            db.content.update({
              where: { id: item.id },
              data: { refAttachments: JSON.parse(JSON.stringify(savedRefAttachments)) },
            })
          )
        );
      }
```

- [ ] **Step 5: Update creation-panel.tsx to pass full ref data**

In `src/components/studio/content/creation-panel.tsx`, find the photo case in `handleGenerate`. Update the `refAttachments` mapping to include the new fields:

```typescript
      case "photo": {
        const refAtts = attachedRefs.map((a) => ({
          refId: a.ref.id,
          refName: a.ref.name,
          s3Key: a.ref.s3Key,
          mode: a.mode,
          what: a.what,
          description: a.description,
        }));
        const result = await generateContent(
          activeCreatorId,
          prompt,
          imageCount,
          refAtts.length > 0 ? refAtts : undefined
        );
```

- [ ] **Step 6: Update getCreatorContent to return refAttachments**

In `src/server/actions/content-actions.ts`, find `getCreatorContent` and `getRecentContent`. Both map Content records to ContentItem. Add `refAttachments` to the mapping:

```typescript
      refAttachments: c.refAttachments as ContentRefAttachment[] | undefined,
```

Import `ContentRefAttachment` from `@/types/content`.

- [ ] **Step 7: Verify build**

```bash
pnpm build 2>&1 | tail -10
```

- [ ] **Step 8: Commit**

```bash
git add src/server/actions/content-actions.ts src/components/studio/content/creation-panel.tsx
git commit -m "feat: ref modes v2 pipeline — what/mode/description in generation, recipe saved on Content"
```

---

### Task 4: Canvas — Show Ref Recipe on Past Content

**Files:**
- Modify: `src/components/studio/content/studio-canvas.tsx`

- [ ] **Step 1: Read the file**

Read `src/components/studio/content/studio-canvas.tsx`. Find the `CanvasInfo` component.

- [ ] **Step 2: Update CanvasInfo to show ref recipe**

In the `CanvasInfo` component, inside the `item.kind === "content"` block, after the expandable details section, add a ref recipe display. The `BrowserItem` needs to carry `refAttachments` — update the `contentToBrowserItem` mapper in `content-browser.tsx` to include it.

First, update `src/components/studio/content/content-browser.tsx` — in `contentToBrowserItem`, add:
```typescript
    refAttachments: c.refAttachments,
```

Then update `BrowserItem` type in `src/stores/unified-studio-store.ts` — add:
```typescript
  refAttachments?: any[];
```

Then in `studio-canvas.tsx`, in the `CanvasInfo` component's content section, add after the expandable details:

```tsx
          {/* Ref recipe */}
          {item.refAttachments && item.refAttachments.length > 0 && (
            <div style={{ marginTop: 6, padding: 6, background: "#FAFAFA", borderRadius: 6, fontSize: 10 }}>
              <div style={{ fontWeight: 600, color: "#888", marginBottom: 4 }}>References used:</div>
              {item.refAttachments.map((att: any, i: number) => (
                <div key={i} style={{ display: "flex", gap: 4, alignItems: "center", marginBottom: 2 }}>
                  <span style={{ color: "#C4603A" }}>
                    {att.mode === "vibe" ? "✨" : att.what === "background" ? "🏠" : att.what === "outfit" ? "👕" : att.what === "pose" ? "🤸" : "📌"}
                  </span>
                  <span style={{ color: "#555" }}>
                    {att.refName} — {att.mode}{att.mode !== "vibe" ? ` ${att.what}` : ""}
                  </span>
                  {att.description && (
                    <span style={{ color: "#999", fontStyle: "italic" }}>"{att.description}"</span>
                  )}
                </div>
              ))}
            </div>
          )}
```

- [ ] **Step 3: Verify build**

```bash
pnpm build 2>&1 | tail -10
```

- [ ] **Step 4: Commit**

```bash
git add src/components/studio/content/studio-canvas.tsx src/components/studio/content/content-browser.tsx src/stores/unified-studio-store.ts
git commit -m "feat: canvas shows ref recipe on past content — mode, what, description"
```

---

### Task 5: Library Card Fixes

**Files:**
- Modify: `src/components/workspace/content-library.tsx`

- [ ] **Step 1: Read the file**

Read `src/components/workspace/content-library.tsx`. Find the card rendering in the My Library grid.

- [ ] **Step 2: Add AI description to ref cards**

Each ref card currently shows: thumbnail, type badge, star, name, usage count. Add the AI-generated description below the name (truncated to 1 line):

Find the card rendering in the My Library grid (the `sorted.map` block). Update the overlay section to include the description:

```tsx
<div className="lib-card-overlay">
  <div className="lib-card-name">{ref.name}</div>
  {ref.description && (
    <div style={{ fontSize: 9, color: "rgba(255,255,255,0.7)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
      {ref.description}
    </div>
  )}
  <div className="lib-card-usage">Used {ref.usageCount} time{ref.usageCount !== 1 ? "s" : ""}</div>
</div>
```

Do the same for the Starred tab cards and Public Library tab cards if they render cards.

- [ ] **Step 3: Verify build**

```bash
pnpm build 2>&1 | tail -10
```

- [ ] **Step 4: Commit**

```bash
git add src/components/workspace/content-library.tsx
git commit -m "feat: library cards show AI description below name"
```

---

## Self-Review

**Spec coverage:**
- ✅ Section 1 (Updated AttachedRef): Task 1 (store)
- ✅ Section 1b (Generation recipe on Content): Task 1 (schema), Task 3 (save recipe)
- ✅ Section 2 (Inline refs UI): Task 2
- ✅ Section 3 (Generation pipeline): Task 3
- ✅ Section 4 (Library fixes): Task 5
- ✅ Section 5 (Store changes): Task 1
- ✅ Canvas recipe display: Task 4

**Placeholder scan:** All code provided. No TBDs.

**Type consistency:**
- `RefMode` changes from `"exact" | "scene" | "vibe"` to `"exact" | "similar" | "vibe"` — updated in store (Task 1), inline-refs (Task 2), content-actions (Task 3).
- `AttachedRef` gains `what: RefWhat` and `description: string` — store (Task 1), inline-refs reads them (Task 2), creation-panel passes them (Task 3).
- `ContentRefAttachment` defined in Task 1, saved in Task 3, displayed in Task 4.
- `BrowserItem.refAttachments` added in Task 4.
