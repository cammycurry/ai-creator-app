# Creator Studio Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the 6-tab creator studio wizard with a single-page stacked layout supporting describe, reference upload, and fine-tune — plus auto-generate sample content after wizard completion.

**Architecture:** Single stacked column layout (preview strip → form → footer). Three input modes on one page: describe textarea, reference image upload with exact/inspired toggle, collapsible fine-tune section. Validation phase removed. After wizard finishes, 3 UGC-style sample posts auto-generate.

**Tech Stack:** Next.js 16 App Router, Zustand, Gemini API (`@google/genai`), Grok/xAI for prompt enhancement, S3 for storage, Prisma/PostgreSQL.

**Spec:** `docs/superpowers/specs/2026-03-28-creator-studio-redesign.md`

---

### Task 1: Update Zustand Store

**Files:**
- Modify: `src/stores/studio-store.ts`

- [ ] **Step 1: Simplify StudioTraits and update store state**

Replace the full store with simplified version. Remove: tabs, describeMode, validationImages, validationKeys, and unused trait fields. Add: referenceImages, referenceMode.

```typescript
// src/stores/studio-store.ts
import { create } from "zustand";

export type StudioPhase =
  | "customize"
  | "generating"
  | "picking"
  | "finishing";

export type GenerationStep = "idle" | "base" | "uploading";

export type ReferenceMode = "exact" | "inspired";

export interface ReferenceImage {
  slot: "face" | "body" | "full";
  dataUrl: string; // base64 data URL for preview
  base64: string;  // raw base64 for API
  mimeType: string;
}

export interface StudioTraits {
  gender: string | null;
  age: string | null;
  ethnicity: string | null;
  build: string | null;
  chestSize: string | null;
  vibes: string[];
}

interface StudioState {
  phase: StudioPhase;
  traits: StudioTraits;
  description: string;
  referenceImages: ReferenceImage[];
  referenceMode: ReferenceMode;
  fineTuneOpen: boolean;
  generatedImages: string[];
  generatedKeys: string[];
  selectedImageIndex: number | null;
  creatorName: string;
  niche: string[];
  generationStep: GenerationStep;
  refineMode: boolean;
  refineText: string;
  isGenerating: boolean;
  error: string | null;
  // Actions
  setPhase: (phase: StudioPhase) => void;
  setGenerationStep: (step: GenerationStep) => void;
  setDescription: (description: string) => void;
  setReferenceMode: (mode: ReferenceMode) => void;
  setFineTuneOpen: (open: boolean) => void;
  addReferenceImage: (ref: ReferenceImage) => void;
  removeReferenceImage: (slot: "face" | "body" | "full") => void;
  pickTrait: (key: string, value: string | number) => void;
  toggleArrayTrait: (key: string, value: string) => void;
  setGeneratedImages: (images: string[], keys: string[]) => void;
  selectImage: (index: number) => void;
  setCreatorName: (name: string) => void;
  addNiche: (niche: string) => void;
  removeNiche: (niche: string) => void;
  setRefineMode: (v: boolean) => void;
  setRefineText: (text: string) => void;
  setIsGenerating: (v: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

const defaultTraits: StudioTraits = {
  gender: null,
  age: null,
  ethnicity: null,
  build: null,
  chestSize: null,
  vibes: [],
};

export const useStudioStore = create<StudioState>((set) => ({
  phase: "customize",
  traits: { ...defaultTraits },
  description: "",
  referenceImages: [],
  referenceMode: "exact",
  fineTuneOpen: false,
  generatedImages: [],
  generatedKeys: [],
  selectedImageIndex: null,
  creatorName: "",
  niche: [],
  generationStep: "idle",
  refineMode: false,
  refineText: "",
  isGenerating: false,
  error: null,

  setPhase: (phase) => set({ phase }),
  setGenerationStep: (generationStep) => set({ generationStep }),
  setDescription: (description) => set({ description }),
  setReferenceMode: (referenceMode) => set({ referenceMode }),
  setFineTuneOpen: (fineTuneOpen) => set({ fineTuneOpen }),

  addReferenceImage: (ref) =>
    set((state) => ({
      referenceImages: [
        ...state.referenceImages.filter((r) => r.slot !== ref.slot),
        ref,
      ],
    })),

  removeReferenceImage: (slot) =>
    set((state) => ({
      referenceImages: state.referenceImages.filter((r) => r.slot !== slot),
    })),

  pickTrait: (key, value) =>
    set((state) => ({
      traits: { ...state.traits, [key]: value },
    })),

  toggleArrayTrait: (key, value) =>
    set((state) => {
      const current = state.traits[key as keyof StudioTraits];
      if (!Array.isArray(current)) return state;
      const arr = current as string[];
      const next = arr.includes(value)
        ? arr.filter((v) => v !== value)
        : [...arr, value];
      return { traits: { ...state.traits, [key]: next } };
    }),

  setGeneratedImages: (generatedImages, generatedKeys) =>
    set({ generatedImages, generatedKeys, phase: "picking", isGenerating: false }),

  selectImage: (index) => set({ selectedImageIndex: index }),

  setRefineMode: (refineMode) => set({ refineMode, refineText: "" }),
  setRefineText: (refineText) => set({ refineText }),

  setIsGenerating: (isGenerating) => set({ isGenerating }),
  setError: (error) => set({ error }),

  setCreatorName: (creatorName) => set({ creatorName }),

  addNiche: (niche) =>
    set((state) => ({
      niche: state.niche.includes(niche)
        ? state.niche
        : [...state.niche, niche],
    })),

  removeNiche: (niche) =>
    set((state) => ({
      niche: state.niche.filter((n) => n !== niche),
    })),

  reset: () =>
    set({
      phase: "customize",
      traits: { ...defaultTraits },
      description: "",
      referenceImages: [],
      referenceMode: "exact",
      fineTuneOpen: false,
      generatedImages: [],
      generatedKeys: [],
      selectedImageIndex: null,
      creatorName: "",
      niche: [],
      generationStep: "idle",
      refineMode: false,
      refineText: "",
      isGenerating: false,
      error: null,
    }),
}));
```

- [ ] **Step 2: Verify build passes**

Run: `pnpm build 2>&1 | tail -20`
Expected: Build will have errors since other files still reference old store fields. That's fine — we fix them in subsequent tasks.

- [ ] **Step 3: Commit**

```bash
git add src/stores/studio-store.ts
git commit -m "refactor: simplify studio store for single-page wizard"
```

---

### Task 2: Add Reference Upload Component

**Files:**
- Create: `src/components/studio/reference-upload.tsx`

- [ ] **Step 1: Create the reference upload component**

This component handles drag-and-drop + click-to-upload for face/body/full reference images. It resizes images client-side to max 1024px before storing.

```tsx
// src/components/studio/reference-upload.tsx
"use client";

import { useCallback, useRef } from "react";
import { useStudioStore, type ReferenceImage } from "@/stores/studio-store";

const SLOTS = [
  { id: "face" as const, label: "Face", hint: "Upload a face reference" },
  { id: "body" as const, label: "Body", hint: "Upload a body reference" },
  { id: "full" as const, label: "Full", hint: "Upload a full photo" },
];

const MAX_SIZE = 1024;

async function resizeImage(file: File): Promise<{ dataUrl: string; base64: string; mimeType: string }> {
  return new Promise((resolve) => {
    const img = new Image();
    const reader = new FileReader();
    reader.onload = () => {
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let { width, height } = img;
        if (width > MAX_SIZE || height > MAX_SIZE) {
          if (width > height) {
            height = Math.round((height / width) * MAX_SIZE);
            width = MAX_SIZE;
          } else {
            width = Math.round((width / height) * MAX_SIZE);
            height = MAX_SIZE;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
        const base64 = dataUrl.split(",")[1];
        resolve({ dataUrl, base64, mimeType: "image/jpeg" });
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

function UploadSlot({ slot }: { slot: typeof SLOTS[number] }) {
  const { referenceImages, addReferenceImage, removeReferenceImage } = useStudioStore();
  const inputRef = useRef<HTMLInputElement>(null);
  const existing = referenceImages.find((r) => r.slot === slot.id);

  const handleFile = useCallback(async (file: File) => {
    if (!file.type.startsWith("image/")) return;
    const { dataUrl, base64, mimeType } = await resizeImage(file);
    addReferenceImage({ slot: slot.id, dataUrl, base64, mimeType });
  }, [slot.id, addReferenceImage]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  if (existing) {
    return (
      <div className="studio-ref-slot studio-ref-filled">
        <img src={existing.dataUrl} alt={slot.label} />
        <button
          className="studio-ref-remove"
          onClick={() => removeReferenceImage(slot.id)}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
        <span className="studio-ref-slot-label">{slot.label}</span>
      </div>
    );
  }

  return (
    <div
      className="studio-ref-slot"
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        style={{ display: "none" }}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = "";
        }}
      />
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ opacity: 0.4 }}>
        <path d="M12 5v14M5 12h14" />
      </svg>
      <span className="studio-ref-slot-label">{slot.label}</span>
    </div>
  );
}

export function ReferenceUpload() {
  const { referenceMode, setReferenceMode } = useStudioStore();

  return (
    <div className="studio-section">
      <div className="studio-section-label">Upload a reference</div>
      <div className="studio-ref-grid">
        {SLOTS.map((slot) => (
          <UploadSlot key={slot.id} slot={slot} />
        ))}
      </div>
      <div className="studio-ref-mode">
        <button
          className={`studio-ref-mode-btn${referenceMode === "exact" ? " active" : ""}`}
          onClick={() => setReferenceMode("exact")}
        >
          Exact look
        </button>
        <button
          className={`studio-ref-mode-btn${referenceMode === "inspired" ? " active" : ""}`}
          onClick={() => setReferenceMode("inspired")}
        >
          Inspired by
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/studio/reference-upload.tsx
git commit -m "feat: add reference image upload component with resize"
```

---

### Task 3: Create Single-Page Studio Form

**Files:**
- Create: `src/components/studio/studio-create-page.tsx`

- [ ] **Step 1: Build the single-page form component**

This replaces all tab components with one scrollable page: describe textarea, reference upload, collapsible fine-tune.

```tsx
// src/components/studio/studio-create-page.tsx
"use client";

import { useStudioStore } from "@/stores/studio-store";
import { ReferenceUpload } from "./reference-upload";
import { NICHES } from "@/data/niches";

const AGE_RANGES = ["18-22", "23-27", "28-35", "36+"];
const ETHNICITIES = ["European", "Latina", "East Asian", "South Asian", "Black", "Middle Eastern", "Mixed"];

const BUILDS_FEMALE = [
  { label: "Slim", desc: "Lean & toned" },
  { label: "Athletic", desc: "Fit & defined" },
  { label: "Slim Thick", desc: "Narrow waist, full hips" },
  { label: "Full Figure", desc: "Soft & natural" },
];

const BUILDS_MALE = [
  { label: "Slim", desc: "Lean" },
  { label: "Athletic", desc: "Toned" },
  { label: "Muscular", desc: "Built" },
  { label: "Average", desc: "Natural" },
];

const CHEST_SIZES = ["Small", "Medium", "Medium-Large", "Large"];

const VIBES = [
  { label: "Girl Next Door", emoji: "🌻" },
  { label: "Glamorous", emoji: "✨" },
  { label: "Sultry", emoji: "🔥" },
  { label: "Fitness", emoji: "💪" },
  { label: "Baddie", emoji: "💅" },
  { label: "Soft & Sweet", emoji: "🌸" },
  { label: "Sophisticated", emoji: "🍷" },
  { label: "Natural Beauty", emoji: "🌿" },
];

const MAX_VIBES = 3;

export function StudioCreatePage() {
  const {
    description, setDescription,
    traits, pickTrait, toggleArrayTrait,
    fineTuneOpen, setFineTuneOpen,
  } = useStudioStore();

  const isFemale = traits.gender === "Female";
  const builds = isFemale ? BUILDS_FEMALE : BUILDS_MALE;

  return (
    <div className="studio-create-page">
      {/* Describe */}
      <div className="studio-section">
        <div className="studio-section-label">Describe them</div>
        <textarea
          className="studio-describe-input"
          placeholder="25 year old latina, long dark wavy hair, athletic, warm fitness influencer vibe..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
        />
      </div>

      {/* Reference Upload */}
      <ReferenceUpload />

      {/* Fine-tune (collapsible) */}
      <button
        className="studio-finetune-toggle"
        onClick={() => setFineTuneOpen(!fineTuneOpen)}
      >
        <svg
          width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
          style={{ transform: fineTuneOpen ? "rotate(90deg)" : "none", transition: "transform 150ms" }}
        >
          <path d="M9 18l6-6-6-6" />
        </svg>
        Fine-tune
        <span className="studio-finetune-optional">optional</span>
      </button>

      {fineTuneOpen && (
        <div className="studio-finetune-body">
          {/* Gender */}
          <div className="studio-section">
            <div className="studio-section-label">Gender</div>
            <div className="studio-chips">
              {["Female", "Male"].map((g) => (
                <button
                  key={g}
                  onClick={() => pickTrait("gender", g)}
                  className={`studio-chip${traits.gender === g ? " active" : ""}`}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>

          {/* Age */}
          <div className="studio-section">
            <div className="studio-section-label">Age</div>
            <div className="studio-chips">
              {AGE_RANGES.map((a) => (
                <button
                  key={a}
                  onClick={() => pickTrait("age", a)}
                  className={`studio-chip${traits.age === a ? " active" : ""}`}
                >
                  {a}
                </button>
              ))}
            </div>
          </div>

          {/* Ethnicity */}
          <div className="studio-section">
            <div className="studio-section-label">Ethnicity</div>
            <div className="studio-chips">
              {ETHNICITIES.map((e) => (
                <button
                  key={e}
                  onClick={() => pickTrait("ethnicity", e)}
                  className={`studio-chip${traits.ethnicity === e ? " active" : ""}`}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>

          {/* Build */}
          <div className="studio-section">
            <div className="studio-section-label">Build</div>
            <div className="studio-chips">
              {builds.map((b) => (
                <button
                  key={b.label}
                  onClick={() => pickTrait("build", b.label)}
                  className={`studio-chip${traits.build === b.label ? " active" : ""}`}
                  title={b.desc}
                >
                  {b.label}
                </button>
              ))}
            </div>
          </div>

          {/* Chest Size (female only) */}
          {isFemale && (
            <div className="studio-section">
              <div className="studio-section-label">Chest Size</div>
              <div className="studio-chips">
                {CHEST_SIZES.map((size) => (
                  <button
                    key={size}
                    onClick={() => pickTrait("chestSize", size)}
                    className={`studio-chip${traits.chestSize === size ? " active" : ""}`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Vibe */}
          <div className="studio-section">
            <div className="studio-section-label">
              Vibe <span style={{ fontWeight: 400, textTransform: "none", color: "var(--text-muted, #BBB)" }}>(up to {MAX_VIBES})</span>
            </div>
            <div className="studio-vibe-cards">
              {VIBES.map((v) => {
                const selected = traits.vibes.includes(v.label);
                const disabled = !selected && traits.vibes.length >= MAX_VIBES;
                return (
                  <button
                    key={v.label}
                    onClick={() => {
                      if (selected || traits.vibes.length < MAX_VIBES) {
                        toggleArrayTrait("vibes", v.label);
                      }
                    }}
                    disabled={disabled}
                    className={`studio-vibe-card${selected ? " active" : ""}`}
                    style={disabled ? { opacity: 0.4, pointerEvents: "none" } : undefined}
                  >
                    <div className="studio-vibe-emoji">{v.emoji}</div>
                    <div className="studio-vibe-label">{v.label}</div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/studio/studio-create-page.tsx
git commit -m "feat: add single-page studio create form"
```

---

### Task 4: Update CSS for Single-Page Layout

**Files:**
- Modify: `src/components/studio/studio.css`

- [ ] **Step 1: Add new styles for single-page layout, reference upload, fine-tune toggle**

Add these styles to `studio.css` (after existing styles, before the media queries):

```css
/* ── Single-Page Create Layout ── */
.studio-create-page { padding: 20px 24px; overflow-y: auto; flex: 1; display: flex; flex-direction: column; gap: 4px; }

/* ── Preview Strip (compact, horizontal) ── */
.studio-preview-strip { display: flex; align-items: center; gap: 12px; padding: 12px 24px; border-bottom: 1px solid var(--border, #EBEBEB); flex-shrink: 0; }
.studio-preview-strip .studio-silhouette { width: 36px; height: 36px; border-radius: 8px; margin-bottom: 0; border-width: 1.5px; }
.studio-preview-strip .studio-silhouette svg { width: 18px; height: 18px; }
.studio-preview-strip .studio-summary { text-align: left; max-width: none; display: flex; flex-wrap: wrap; gap: 4px; }
.studio-preview-strip .studio-summary-tag { font-size: 10px; padding: 1px 8px; }

/* ── Reference Upload ── */
.studio-ref-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
.studio-ref-slot { aspect-ratio: 3/4; border-radius: 12px; border: 2px dashed var(--border, #EBEBEB); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; cursor: pointer; transition: all 150ms; background: var(--card, #F5F5F5); position: relative; overflow: hidden; }
.studio-ref-slot:hover { border-color: var(--accent, #C4603A); background: rgba(196, 96, 58, 0.03); }
.studio-ref-filled { border-style: solid; border-color: var(--accent, #C4603A); cursor: default; }
.studio-ref-filled img { width: 100%; height: 100%; object-fit: cover; }
.studio-ref-remove { position: absolute; top: 6px; right: 6px; width: 24px; height: 24px; border-radius: 50%; background: rgba(0,0,0,0.6); color: #fff; display: flex; align-items: center; justify-content: center; border: none; cursor: pointer; transition: background 150ms; }
.studio-ref-remove:hover { background: rgba(0,0,0,0.8); }
.studio-ref-slot-label { font-size: 11px; font-weight: 500; color: var(--text-muted, #BBB); }
.studio-ref-filled .studio-ref-slot-label { position: absolute; bottom: 6px; left: 0; right: 0; text-align: center; color: #fff; text-shadow: 0 1px 3px rgba(0,0,0,0.6); }

/* Reference mode toggle */
.studio-ref-mode { display: flex; gap: 8px; margin-top: 10px; }
.studio-ref-mode-btn { padding: 6px 16px; border-radius: 999px; font-size: 12px; font-weight: 500; border: 1.5px solid var(--border, #EBEBEB); color: var(--text-secondary, #888); background: transparent; cursor: pointer; transition: all 150ms; }
.studio-ref-mode-btn:hover { border-color: #CCC; }
.studio-ref-mode-btn.active { border-color: var(--accent, #C4603A); color: var(--accent, #C4603A); background: rgba(196, 96, 58, 0.06); }

/* ── Fine-tune Toggle ── */
.studio-finetune-toggle { display: flex; align-items: center; gap: 8px; padding: 12px 0; font-size: 13px; font-weight: 600; color: var(--text-secondary, #888); cursor: pointer; border: none; background: none; width: 100%; text-align: left; transition: color 150ms; }
.studio-finetune-toggle:hover { color: var(--text-primary, #111); }
.studio-finetune-optional { font-weight: 400; color: var(--text-muted, #BBB); font-size: 12px; }
.studio-finetune-body { display: flex; flex-direction: column; gap: 4px; padding-bottom: 8px; }
```

- [ ] **Step 2: Remove old split-panel styles from `.studio-body`**

Replace the `.studio-body` and `.studio-preview` styles to work as stacked column instead of side-by-side:

In `studio.css`, replace:
```css
.studio-body { display: flex; flex: 1; overflow: hidden; }
.studio-body-full { justify-content: center; }
.studio-body-full .studio-preview { width: 100%; border-right: none; overflow: hidden; }
```
with:
```css
.studio-body { display: flex; flex-direction: column; flex: 1; overflow: hidden; }
```

Replace:
```css
.studio-preview { width: 35%; border-right: 1px solid var(--border, #EBEBEB); display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 24px; position: relative; overflow: hidden; }
```
with:
```css
.studio-preview { width: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 24px; position: relative; overflow: hidden; flex: 1; }
```

- [ ] **Step 3: Update tablet/mobile media queries**

Remove the `studio-picker` width override and the `studio-preview` side-panel overrides from the tablet media query since the layout is now always stacked.

- [ ] **Step 4: Commit**

```bash
git add src/components/studio/studio.css
git commit -m "feat: add single-page layout and reference upload styles"
```

---

### Task 5: Update Prompts for Reference Mode + Sample Content

**Files:**
- Modify: `src/lib/prompts.ts`

- [ ] **Step 1: Add `buildReferencePrompt()` function**

Add after the existing `buildWizardPrompt()` function:

```typescript
// ─── Reference-Based Generation Prompt ───────────────
// Used when user uploads face/body/full reference images.
// Two modes: "exact" (recreate the person) vs "inspired" (similar vibe, different person).

export function buildReferencePrompt(
  traits: StudioTraits,
  description: string | undefined,
  mode: "exact" | "inspired",
  slots: ("face" | "body" | "full")[]
): string {
  const isMale = traits.gender?.toLowerCase() === "male";
  const subject = isMale ? "man" : "woman";

  // Build role descriptions for each uploaded reference
  const roleDescs: string[] = [];
  slots.forEach((slot, i) => {
    if (slot === "face") roleDescs.push(`Reference image ${i + 1} shows the face to ${mode === "exact" ? "recreate" : "draw inspiration from"}.`);
    if (slot === "body") roleDescs.push(`Reference image ${i + 1} shows the body type to match.`);
    if (slot === "full") roleDescs.push(`Reference image ${i + 1} shows the full person to ${mode === "exact" ? "recreate" : "draw inspiration from"}.`);
  });

  const modeInstruction = mode === "exact"
    ? `Create a photorealistic portrait of that exact ${subject}. Maintain identical facial features, skin tone, and all identifying details.`
    : `Create a completely different ${subject} inspired by the reference — similar vibe and aesthetic, but a unique individual.`;

  const descLine = description?.trim()
    ? `\n${description.trim()}`
    : "";

  const traitLine = !description?.trim() ? buildTraitSummary(traits) : "";

  return [
    `Reference: ${roleDescs.join(" ")}`,
    modeInstruction,
    descLine,
    traitLine,
    `${CAMERA}. Visible pores, photorealistic.`,
  ].filter(Boolean).join("\n");
}

function buildTraitSummary(traits: StudioTraits): string {
  const parts: string[] = [];
  if (traits.age) parts.push(`${traits.age} years old`);
  if (traits.ethnicity) parts.push(traits.ethnicity);
  if (traits.build) parts.push(`${traits.build} build`);
  if (traits.vibes.length > 0) parts.push(`${traits.vibes.join(", ")} vibe`);
  return parts.length > 0 ? parts.join(", ") + "." : "";
}
```

- [ ] **Step 2: Add sample content prompts**

Add after `buildReferencePrompt()`:

```typescript
// ─── Sample Content Prompts (UGC Style) ──────────────
// Generated automatically after wizard to hook the user.

export function buildSampleContentPrompts(gender: string | null): string[] {
  const subject = gender?.toLowerCase() === "male" ? "man" : "woman";
  const gymOutfit = gender?.toLowerCase() === "male"
    ? "tank top and joggers" : "matching sports set";
  const goingOutOutfit = gender?.toLowerCase() === "male"
    ? "fitted shirt and dark jeans" : "fitted dress and heels";

  return [
    `That exact ${subject} from the reference image. Relaxed and confident at a trendy coffee shop, wearing a casual oversized sweater. Looking at their phone with a subtle smile, iced latte on the table. Shot on iPhone, candid, warm natural light from the window. Visible pores, photorealistic.`,
    `That exact ${subject} from the reference image. Post-workout glow, wearing ${gymOutfit}. Mirror selfie in a modern gym, slightly sweaty, confident expression. Shot on iPhone, candid, gym fluorescent lighting. Visible pores, photorealistic.`,
    `That exact ${subject} from the reference image. Dressed up for a night out, ${goingOutOutfit}. Standing on a city street at golden hour, looking back at the camera. Shot on iPhone, candid, golden hour lighting. Visible pores, photorealistic.`,
  ];
}
```

- [ ] **Step 3: Remove validation dead code**

Delete the `VALIDATION_SCENES` array and `buildValidationPrompt()` function from `prompts.ts`.

- [ ] **Step 4: Commit**

```bash
git add src/lib/prompts.ts
git commit -m "feat: add reference prompt builder and sample content prompts"
```

---

### Task 6: Update Server Actions — Multi-Ref Generation + Sample Content

**Files:**
- Modify: `src/server/actions/generate-actions.ts`
- Create: `src/server/actions/sample-content-actions.ts`

- [ ] **Step 1: Update `generateWithRetry` to accept array of reference images**

In `generate-actions.ts`, change the signature and contents assembly:

```typescript
async function generateWithRetry(
  prompt: string,
  referenceImages?: { mimeType: string; data: string }[]
): Promise<{ data: string } | null> {
  const contents = referenceImages && referenceImages.length > 0
    ? [{ text: prompt }, ...referenceImages.map((ref) => ({ inlineData: ref }))]
    : prompt;

  // ... rest stays the same, but update the retry section to also pass the array
```

Update all callers of `generateWithRetry` to pass arrays: `generateWithRetry(refPrompt, [templateRef])` instead of `generateWithRetry(refPrompt, templateRef)`.

- [ ] **Step 2: Add `generateCreatorImagesWithRef` server action**

```typescript
export async function generateCreatorImagesWithRef(
  traits: StudioTraits,
  description: string | undefined,
  referenceData: { slot: "face" | "body" | "full"; base64: string; mimeType: string }[],
  mode: "exact" | "inspired",
  count: number = 4
): Promise<GenerateResult> {
  const { userId: clerkId } = await auth();
  if (!clerkId) return { success: false, error: "Not authenticated" };

  const user = await db.user.findUnique({ where: { clerkId } });
  if (!user) return { success: false, error: "User not found" };

  const totalCredits = user.planCredits + user.packCredits;
  if (totalCredits < CREATOR_WIZARD_CREDIT_COST) {
    return { success: false, error: `Not enough credits. Need ${CREATOR_WIZARD_CREDIT_COST}, have ${totalCredits}.` };
  }

  const slots = referenceData.map((r) => r.slot);
  const prompt = buildReferencePrompt(traits, description, mode, slots);

  // Combine composition template + user reference images
  const templateRef = getTemplateRef();
  const refImages = [
    templateRef,
    ...referenceData.map((r) => ({ mimeType: r.mimeType, data: r.base64 })),
  ];

  // Wrap prompt with silhouette instructions
  const fullPrompt = wrapWithSilhouette(prompt);

  try {
    const results = await Promise.all(
      Array.from({ length: count }, () =>
        generateWithRetry(fullPrompt, refImages)
      )
    );

    const s3Keys: string[] = [];
    for (let i = 0; i < results.length; i++) {
      if (results[i]) {
        const key = await uploadBase64ToS3(results[i]!.data, user.id, i);
        s3Keys.push(key);
      }
    }

    if (s3Keys.length === 0) {
      return { success: false, error: "This look couldn't be generated. Try adjusting your description." };
    }

    const images = await Promise.all(s3Keys.map((key) => getSignedImageUrl(key)));

    await deductCredits(user.id, CREATOR_WIZARD_CREDIT_COST, "Creator wizard — generate with reference");

    await db.generationJob.create({
      data: {
        userId: user.id,
        type: "creator_wizard",
        status: "COMPLETED",
        provider: "google",
        modelId: IMAGE_MODEL,
        input: JSON.parse(JSON.stringify({ traits, mode, refSlots: slots })),
        output: JSON.parse(JSON.stringify({ imageCount: s3Keys.length, s3Keys })),
        estimatedCost: 0.02 * count,
        completedAt: new Date(),
      },
    });

    return { success: true, images, keys: s3Keys };
  } catch (error) {
    console.error("generateCreatorImagesWithRef error:", error);
    return { success: false, error: "Image generation failed. Please try again." };
  }
}
```

- [ ] **Step 3: Remove `generateValidationImages`**

Delete the entire `generateValidationImages` function from `generate-actions.ts`.

- [ ] **Step 4: Create sample content server action**

```typescript
// src/server/actions/sample-content-actions.ts
"use server";

import { auth } from "@clerk/nextjs/server";
import { GoogleGenAI, HarmCategory, HarmBlockThreshold } from "@google/genai";
import { db } from "@/lib/db";
import { deductCredits } from "./credit-actions";
import { uploadImage, getSignedImageUrl, getImageBuffer } from "@/lib/s3";
import { stripAndRewrite } from "@/lib/ai/metadata-strip";
import { buildSampleContentPrompts } from "@/lib/prompts";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
const IMAGE_MODEL = "gemini-3-pro-image-preview";
const SAMPLE_CREDIT_COST = 3;

const SAFETY_OFF = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
];

export async function generateSampleContent(
  creatorId: string
): Promise<{ success: boolean; error?: string }> {
  const { userId: clerkId } = await auth();
  if (!clerkId) return { success: false, error: "Not authenticated" };

  const user = await db.user.findUnique({ where: { clerkId } });
  if (!user) return { success: false, error: "User not found" };

  const creator = await db.creator.findUnique({ where: { id: creatorId, userId: user.id } });
  if (!creator) return { success: false, error: "Creator not found" };

  // Check if this is the user's first creator — free sample content
  const creatorCount = await db.creator.count({ where: { userId: user.id } });
  const isFirstCreator = creatorCount <= 1;

  // Get the base image as reference
  const refBuffer = await getImageBuffer(creator.baseImageUrl);
  const refBase64 = refBuffer.toString("base64");
  const refImage = { mimeType: "image/jpeg", data: refBase64 };

  const gender = (creator.settings as Record<string, string>)?.gender ?? null;
  const prompts = buildSampleContentPrompts(gender);
  const SCENE_LABELS = ["Coffee Shop", "Gym", "Going Out"];

  try {
    const results = await Promise.allSettled(
      prompts.map((prompt) =>
        ai.models.generateContent({
          model: IMAGE_MODEL,
          contents: [{ text: prompt }, { inlineData: refImage }],
          config: {
            responseModalities: ["TEXT", "IMAGE"],
            safetySettings: SAFETY_OFF,
          },
        })
      )
    );

    let savedCount = 0;
    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      if (result.status !== "fulfilled") continue;

      const imagePart = result.value.candidates?.[0]?.content?.parts?.find(
        (p: { inlineData?: { data?: string } }) => p.inlineData?.data
      );
      if (!imagePart?.inlineData?.data) continue;

      const raw = Buffer.from(imagePart.inlineData.data, "base64");
      const clean = await stripAndRewrite(raw);
      const key = `users/${user.id}/creators/${creatorId}/content/sample-${Date.now()}-${i}.jpg`;
      await uploadImage(clean, key, "image/jpeg");

      const url = await getSignedImageUrl(key);

      await db.content.create({
        data: {
          creatorId: creator.id,
          userId: user.id,
          type: "PHOTO",
          status: "COMPLETED",
          url,
          s3Key: key,
          prompt: prompts[i],
          creditsCost: isFirstCreator ? 0 : 1,
          metadata: JSON.parse(JSON.stringify({ scene: SCENE_LABELS[i], sample: true })),
        },
      });

      savedCount++;
    }

    // Deduct credits (skip for first creator)
    if (!isFirstCreator && savedCount > 0) {
      await deductCredits(user.id, Math.min(savedCount, SAMPLE_CREDIT_COST), "Sample content generation");
    }

    return { success: true };
  } catch (error) {
    console.error("generateSampleContent error:", error);
    return { success: false, error: "Sample content generation failed" };
  }
}
```

- [ ] **Step 5: Commit**

```bash
git add src/server/actions/generate-actions.ts src/server/actions/sample-content-actions.ts
git commit -m "feat: multi-ref generation and sample content actions"
```

---

### Task 7: Update Creator Studio Shell + Preview + Footer

**Files:**
- Modify: `src/components/studio/creator-studio.tsx`
- Modify: `src/components/studio/studio-preview.tsx`
- Modify: `src/components/studio/studio-footer.tsx`

- [ ] **Step 1: Update `creator-studio.tsx` for stacked layout**

Replace the body rendering logic. During `customize` phase, show preview strip + create page (stacked). During other phases, show full-body preview.

```tsx
// In creator-studio.tsx, update the body section:
import { StudioCreatePage } from "./studio-create-page";

// Remove FULL_WIDTH_PHASES — all phases are now single-column
// Remove StudioTabs import

// Body rendering:
{phase === "customize" ? (
  <div className="studio-body">
    <div className="studio-preview-strip">
      <div className="studio-silhouette">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
          <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      </div>
      <TraitSummary />
    </div>
    <StudioCreatePage />
  </div>
) : (
  <div className="studio-body">
    <StudioPreview />
    {phase === "finishing" && (
      <StudioFinishing />
    )}
  </div>
)}
```

Move `TraitSummary` from `studio-preview.tsx` to be exported, or inline it.

- [ ] **Step 2: Update `studio-preview.tsx` — remove validation, simplify**

Remove `ValidatingPreview`, `CustomizePreview` (no longer needed — preview strip is in creator-studio), and the `phase === "validating"` / `phase === "customize"` branches from `StudioPreview`.

- [ ] **Step 3: Update `studio-footer.tsx` — remove validation, fix Back button, add sample content trigger**

Remove the entire `phase === "validating"` block. Change `handleConfirmPick` to go directly to `finishing`:

```typescript
async function handleConfirmPick() {
  if (selectedImageIndex === null) return;
  setPhase("finishing");
}
```

Change the finishing Back button:
```typescript
<button onClick={() => setPhase("picking")} className="studio-btn secondary">
  Back
</button>
```

In `handleCreate`, after successful finalize, trigger sample content in the background:

```typescript
if (result.success) {
  // Fire sample content generation in background (don't await)
  generateSampleContent(result.creatorId).catch(console.error);

  const data = await getWorkspaceData();
  // ... rest of existing code
}
```

Update `handleGenerate` to handle reference images:

```typescript
async function handleGenerate() {
  const { referenceImages, description, traits } = useStudioStore.getState();

  setIsGenerating(true);
  setError(null);
  setPhase("generating");
  setGenerationStep("base");

  let result;
  if (referenceImages.length > 0) {
    result = await generateCreatorImagesWithRef(
      traits,
      description.trim() || undefined,
      referenceImages.map((r) => ({ slot: r.slot, base64: r.base64, mimeType: r.mimeType })),
      useStudioStore.getState().referenceMode,
      4
    );
  } else {
    result = await generateCreatorImages(
      traits,
      description.trim() || undefined,
      4
    );
  }

  if (result.success) {
    setGeneratedImages(result.images, result.keys);
  } else {
    setError(result.error);
    setPhase("customize");
    setIsGenerating(false);
  }
  setGenerationStep("idle");
}
```

- [ ] **Step 4: Commit**

```bash
git add src/components/studio/creator-studio.tsx src/components/studio/studio-preview.tsx src/components/studio/studio-footer.tsx
git commit -m "feat: stacked layout, remove validation, add sample content trigger"
```

---

### Task 8: Delete Old Files + Cleanup

**Files:**
- Delete: `src/components/studio/studio-tabs.tsx`
- Delete: `src/components/studio/studio-describe.tsx`
- Delete: `src/components/studio/tabs/basics-tab.tsx`
- Delete: `src/components/studio/tabs/face-tab.tsx`
- Delete: `src/components/studio/tabs/hair-tab.tsx`
- Delete: `src/components/studio/tabs/body-tab.tsx`
- Delete: `src/components/studio/tabs/style-tab.tsx`
- Delete: `src/lib/ai/prompt-enhancer.ts`

- [ ] **Step 1: Delete old files**

```bash
rm src/components/studio/studio-tabs.tsx
rm src/components/studio/studio-describe.tsx
rm -rf src/components/studio/tabs/
rm src/lib/ai/prompt-enhancer.ts
```

- [ ] **Step 2: Verify build passes**

Run: `pnpm build 2>&1 | tail -20`
Expected: Clean build, no errors.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "chore: remove old tab components and prompt enhancer"
```

---

### Task 9: Build Verification + Smoke Test

- [ ] **Step 1: Full build**

Run: `pnpm build 2>&1 | tail -20`
Expected: Clean build with all routes rendering.

- [ ] **Step 2: Dev server smoke test**

Run: `pnpm dev`
Verify:
1. Workspace loads, "Create Influencer" button opens the studio modal
2. Studio shows single-page layout (describe → reference upload → fine-tune toggle)
3. Fine-tune section collapses/expands
4. Reference upload shows 3 slots (Face, Body, Full)
5. Clicking a slot opens file picker, dragging an image works
6. Exact/Inspired toggle switches
7. Generate button works (with describe text OR fine-tune traits)
8. Picking phase shows 4 images, selection works
9. "Use This Look" goes directly to finishing (no validation)
10. Finishing Back button goes to picking
11. Create saves and redirects to workspace

- [ ] **Step 3: Test with reference image upload**

Upload a face reference image, type a description, generate. Verify:
- Image is resized client-side
- All 4 generated images match the reference
- S3 upload works

- [ ] **Step 4: Commit any fixes**

```bash
git add -A
git commit -m "fix: address smoke test issues"
```
