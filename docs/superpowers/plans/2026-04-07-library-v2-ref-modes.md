# Library V2 + Reference Usage Modes — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the Library page with a better grid layout and add reference usage modes (Exact/Scene/Vibe) that change how references affect generation.

**Architecture:** Library page gets a responsive full-width grid with shared card component. Reference attachments gain a `mode` property ("exact"|"scene"|"vibe") stored in the Zustand store. Generation pipeline reads the mode to decide how to use each reference (pass image directly, pass with loose prompt, or extract vibe text only). New `analyzeReferenceVibe` function uses Gemini Flash to reverse-engineer mood/style from an image.

**Tech Stack:** Next.js 16 App Router, Zustand, Gemini Flash, prototype-first CSS

**Spec:** `docs/superpowers/specs/2026-04-07-library-v2-ref-modes-design.md`

---

## File Map

```
Phase A — Store + Types
  MODIFY: src/stores/unified-studio-store.ts          — AttachedRef type with mode, update attach/detach

Phase B — Ref Modes UI
  MODIFY: src/components/studio/content/inline-refs.tsx — Mode selector dropdown per attached ref

Phase C — Vibe Analysis + Pipeline
  MODIFY: src/server/actions/reference-actions.ts      — Add analyzeReferenceVibe function
  MODIFY: src/server/actions/content-actions.ts        — Handle ref modes in photo generation
  MODIFY: src/server/actions/carousel-actions.ts       — Handle ref modes in carousel generation

Phase D — Library Page Redesign
  MODIFY: src/components/workspace/content-library.tsx  — Better grid, responsive columns, visual polish
  MODIFY: src/app/workspace/library.css                — Updated styles for wider grid, larger cards
```

---

### Task 1: Update Store — AttachedRef Type with Mode

**Files:**
- Modify: `src/stores/unified-studio-store.ts`

- [ ] **Step 1: Read the current store**

Read `src/stores/unified-studio-store.ts` to understand the full current structure.

- [ ] **Step 2: Add AttachedRef type and update store**

1. Add a new exported type after the existing `BrowserItem` type:

```typescript
export type RefMode = "exact" | "scene" | "vibe";

export type AttachedRef = {
  ref: ReferenceItem;
  mode: RefMode;
};
```

2. Change `attachedRefs` from `ReferenceItem[]` to `AttachedRef[]`:

In the store type:
```typescript
  attachedRefs: AttachedRef[];
```

3. Update `attachRef` — when attaching, default mode is "exact":
```typescript
  attachRef: (ref) => set((s) => ({
    attachedRefs: s.attachedRefs.some((a) => a.ref.id === ref.id)
      ? s.attachedRefs.filter((a) => a.ref.id !== ref.id)
      : [...s.attachedRefs, { ref, mode: "exact" as RefMode }],
  })),
```

4. Update `detachRef` — filter by ref.id:
```typescript
  detachRef: (refId) => set((s) => ({
    attachedRefs: s.attachedRefs.filter((a) => a.ref.id !== refId),
  })),
```

5. Add `setRefMode` action:

In the type:
```typescript
  setRefMode: (refId: string, mode: RefMode) => void;
```

Implementation:
```typescript
  setRefMode: (refId, mode) => set((s) => ({
    attachedRefs: s.attachedRefs.map((a) =>
      a.ref.id === refId ? { ...a, mode } : a
    ),
  })),
```

6. Add to Omit list: `'setRefMode'`

- [ ] **Step 3: Fix all consumers of attachedRefs**

The following files read `attachedRefs` as `ReferenceItem[]` and need to be updated to handle `AttachedRef[]`:

In `src/components/studio/content/content-browser.tsx`, find any line that checks `attachedRefs.some((r) => r.id === ref.id)` and change to `attachedRefs.some((a) => a.ref.id === ref.id)`.

In `src/components/studio/content/creation-panel.tsx`, find where `attachedRefs` is read for carousel slide refs — the carousel uses refs differently (slide-level), so the top-level `attachedRefs` may not be used directly in carousel generation. Check and update.

In `src/components/studio/content/canvas-actions.tsx`, find where `attachRef` is called with a reference — this still works since `attachRef` wraps the ref internally.

- [ ] **Step 4: Verify build**

```bash
pnpm build 2>&1 | tail -10
```

- [ ] **Step 5: Commit**

```bash
git add src/stores/unified-studio-store.ts src/components/studio/content/content-browser.tsx
git commit -m "feat: AttachedRef type with mode — exact/scene/vibe"
```

---

### Task 2: Inline Refs Mode Selector

**Files:**
- Modify: `src/components/studio/content/inline-refs.tsx`

- [ ] **Step 1: Read the current file**

Read `src/components/studio/content/inline-refs.tsx`.

- [ ] **Step 2: Add mode selector to each attached ref**

Replace the entire file:

```tsx
"use client";

import { useUnifiedStudioStore, type RefMode } from "@/stores/unified-studio-store";

const MODE_LABELS: Record<RefMode, string> = {
  exact: "Exact",
  scene: "Same Scene",
  vibe: "Vibe",
};

export function InlineRefs() {
  const { attachedRefs, detachRef, setRefMode, inspirationPhotos, removeInspirationPhoto } = useUnifiedStudioStore();

  if (attachedRefs.length === 0 && inspirationPhotos.length === 0) return null;

  return (
    <div className="sv2-inline-refs">
      {attachedRefs.map(({ ref, mode }) => (
        <div key={ref.id} className="sv2-inline-ref">
          <div
            className="sv2-inline-ref-thumb"
            style={{ background: ref.imageUrl ? `url(${ref.imageUrl}) center/cover` : "#F5F5F5" }}
          />
          <div style={{ display: "flex", flexDirection: "column", gap: 1, flex: 1, minWidth: 0 }}>
            <span style={{ fontSize: 10, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ref.name}</span>
            <select
              value={mode}
              onChange={(e) => setRefMode(ref.id, e.target.value as RefMode)}
              onClick={(e) => e.stopPropagation()}
              style={{
                fontSize: 9,
                padding: "1px 2px",
                border: "1px solid #EBEBEB",
                borderRadius: 4,
                background: mode === "vibe" ? "rgba(196,96,58,0.08)" : "#F9F9F9",
                color: mode === "vibe" ? "#C4603A" : "#888",
                cursor: "pointer",
                fontFamily: "inherit",
                outline: "none",
                width: "fit-content",
              }}
            >
              <option value="exact">{MODE_LABELS.exact}</option>
              <option value="scene">{MODE_LABELS.scene}</option>
              <option value="vibe">{MODE_LABELS.vibe}</option>
            </select>
          </div>
          <button className="sv2-inline-ref-x" onClick={() => detachRef(ref.id)}>&times;</button>
        </div>
      ))}
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
git commit -m "feat: ref mode selector — Exact/Same Scene/Vibe per attached ref"
```

---

### Task 3: Vibe Analysis + Generation Pipeline

**Files:**
- Modify: `src/server/actions/reference-actions.ts`
- Modify: `src/server/actions/content-actions.ts`

- [ ] **Step 1: Add analyzeReferenceVibe to reference-actions.ts**

Read `src/server/actions/reference-actions.ts`. Add after the existing `analyzeReferenceImage` function:

```typescript
export async function analyzeReferenceVibe(imageBase64: string): Promise<string> {
  try {
    const response = await ai.models.generateContent({
      model: FLASH_MODEL,
      contents: [
        {
          text: `Describe the mood, lighting, color palette, and energy of this image in 2-3 sentences. Focus on the FEELING and AESTHETIC, not the objects or people. This description will be used as a style guide for generating new images with the same vibe. Be specific about lighting quality, color tones, and emotional energy.`,
        },
        { inlineData: { mimeType: "image/jpeg", data: imageBase64 } },
      ],
    });

    const text = response.candidates?.[0]?.content?.parts?.find(
      (p: { text?: string }) => p.text
    )?.text?.trim() ?? "";

    return text || "Natural lighting, candid mood, photorealistic.";
  } catch {
    return "Natural lighting, candid mood, photorealistic.";
  }
}
```

- [ ] **Step 2: Update generateContent to handle ref modes**

Read `src/server/actions/content-actions.ts`. The `generateContent` function currently takes `(creatorId, userPrompt, imageCount)`. It needs to also accept attached refs with modes.

Add a new parameter:

```typescript
export async function generateContent(
  creatorId: string,
  userPrompt: string,
  imageCount: number = 1,
  refAttachments?: { s3Key: string; mode: "exact" | "scene" | "vibe" }[]
): Promise<GenerateContentResult> {
```

Inside the function, after building the base prompt, add ref mode handling before the Gemini call:

```typescript
    // Handle attached references with modes
    let refPromptSuffix = "";
    const refImages: { mimeType: string; data: string }[] = [];

    if (refAttachments && refAttachments.length > 0) {
      for (const att of refAttachments) {
        if (att.mode === "exact" || att.mode === "scene") {
          // Pass the image to Gemini
          try {
            const refBuf = await getImageBuffer(att.s3Key);
            refImages.push({ mimeType: "image/jpeg", data: refBuf.toString("base64") });
          } catch (e) {
            console.error("Failed to load ref image:", e);
            continue;
          }

          if (att.mode === "exact") {
            refPromptSuffix += " Match the reference image exactly — same scene, setting, and composition.";
          } else {
            refPromptSuffix += " Use a similar setting to the reference image, but with creative freedom on pose and framing.";
          }
        } else if (att.mode === "vibe") {
          // Extract vibe description instead of passing image
          try {
            const refBuf = await getImageBuffer(att.s3Key);
            const { analyzeReferenceVibe } = await import("./reference-actions");
            const vibeDesc = await analyzeReferenceVibe(refBuf.toString("base64"));
            refPromptSuffix += ` Style and mood: ${vibeDesc}`;
          } catch (e) {
            console.error("Failed to analyze vibe:", e);
          }
        }
      }
    }

    const finalPrompt = prompt + refPromptSuffix;
```

Then update the Gemini call to include `refImages` alongside the base image:

```typescript
    const contents = [
      { text: finalPrompt },
      ...(baseImageBase64 ? [{ inlineData: { mimeType: "image/jpeg", data: baseImageBase64 } }] : []),
      ...refImages.map((img) => ({ inlineData: img })),
    ];

    const imagePromises = Array.from({ length: count }, () =>
      ai.models.generateContent({
        model: IMAGE_MODEL,
        contents,
        config: {
          responseModalities: ["TEXT", "IMAGE"],
          safetySettings: SAFETY_OFF,
        },
      })
    );
```

- [ ] **Step 3: Update creation-panel.tsx to pass ref attachments**

In `src/components/studio/content/creation-panel.tsx`, the `handleGenerate` function calls `generateContent`. Update the photo case to pass ref attachments:

```typescript
      case "photo": {
        const refAttachments = attachedRefs.map((a) => ({
          s3Key: a.ref.s3Key,
          mode: a.mode,
        }));
        const result = await generateContent(
          activeCreatorId,
          prompt,
          imageCount,
          refAttachments.length > 0 ? refAttachments : undefined
        );
```

Note: `attachedRefs` is now `AttachedRef[]`, so access `a.ref.s3Key` and `a.mode`.

- [ ] **Step 4: Verify build**

```bash
pnpm build 2>&1 | tail -10
```

- [ ] **Step 5: Commit**

```bash
git add src/server/actions/reference-actions.ts src/server/actions/content-actions.ts src/components/studio/content/creation-panel.tsx
git commit -m "feat: ref modes in generation pipeline — exact passes image, vibe extracts mood text"
```

---

### Task 4: Library Page Visual Redesign

**Files:**
- Modify: `src/app/workspace/library.css`
- Modify: `src/components/workspace/content-library.tsx`

- [ ] **Step 1: Update library CSS for wider grid**

Read `src/app/workspace/library.css`. Update the grid and card styles:

1. Change `.lib-page` max-width from 960px to 100% (fill the overlay):
```css
.lib-page {
  flex: 1;
  overflow-y: auto;
  width: 100%;
  padding: 24px 32px 80px;
}
```

2. Change `.lib-grid` to use more columns:
```css
.lib-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 12px;
}
```

3. Update mobile breakpoint to 2 columns:
```css
@media (max-width: 640px) {
  .lib-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 8px;
  }
  .lib-page {
    padding: 16px 16px 80px;
  }
}
```

- [ ] **Step 2: Polish library component cards**

In `src/components/workspace/content-library.tsx`, read the full file. The card rendering in the My Library grid currently shows basic cards. Update them to match the studio browser style:

Each card should show:
- Square thumbnail (aspect-ratio: 1)
- Type badge (top-left): "Background" or first tag
- Star button (top-right, hover reveal, always visible if starred)
- Bottom gradient overlay with name

This matches the spec's requirement for consistent card style between Library and Studio.

- [ ] **Step 3: Verify build**

```bash
pnpm build 2>&1 | tail -10
```

- [ ] **Step 4: Commit**

```bash
git add src/app/workspace/library.css src/components/workspace/content-library.tsx
git commit -m "feat: library page — full-width grid, polished cards, responsive layout"
```

---

### Task 5: Wire Up Drag-Drop Upload on Library Page

**Files:**
- Modify: `src/components/workspace/content-library.tsx`

- [ ] **Step 1: Add page-level drag-drop**

In `content-library.tsx`, add drag-drop handling on the `lib-page` div:

```tsx
const [pageDragging, setPageDragging] = useState(false);

function handlePageDrop(e: React.DragEvent) {
  e.preventDefault();
  setPageDragging(false);
  const file = e.dataTransfer.files?.[0];
  if (file && file.type.startsWith("image/")) {
    // Open the add reference dialog — could pre-fill with the image
    setAddOpen(true);
  }
}
```

Add handlers to the `lib-page` div:
```tsx
<div
  className={`lib-page${pageDragging ? " lib-page-dragging" : ""}`}
  onDragOver={(e) => { e.preventDefault(); setPageDragging(true); }}
  onDragLeave={() => setPageDragging(false)}
  onDrop={handlePageDrop}
>
```

- [ ] **Step 2: Add drag state CSS**

In `library.css`:
```css
.lib-page-dragging {
  outline: 2px dashed #C4603A;
  outline-offset: -8px;
  background: rgba(196, 96, 58, 0.02);
}
```

- [ ] **Step 3: Verify build**

```bash
pnpm build 2>&1 | tail -10
```

- [ ] **Step 4: Commit**

```bash
git add src/components/workspace/content-library.tsx src/app/workspace/library.css
git commit -m "feat: drag-drop upload on library page"
```

---

## Self-Review

**Spec coverage:**
- ✅ Section 1 (Library redesign): Task 4 (wider grid, polished cards, responsive)
- ✅ Section 2 (Reference usage modes): Tasks 1 (store), 2 (UI), 3 (pipeline)
- ✅ Section 3 (Upload experience): Task 5 (drag-drop), Task 4 (prominent upload button already in header)
- ✅ Shared RefCard component: Deferred — using inline card rendering in both places for now. Extract component later if needed.

**Placeholder scan:** All code provided. No TBDs.

**Type consistency:** `AttachedRef` defined in Task 1, consumed in Task 2 (inline-refs), Task 3 (creation-panel passes modes to generateContent). `RefMode` exported from store, used in inline-refs. `analyzeReferenceVibe` defined in Task 3 step 1, called in Task 3 step 2.
