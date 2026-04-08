# Reference Modes V2 + Library Fix — Design Spec

## Goal

Upgrade reference attachment modes with "what to use" (Background/Outfit/Pose/All) + "how closely" (Exact/Similar/Vibe) + optional text description. Fix library page issues. Make the ref system intuitive — AI picks smart defaults, user overrides when needed.

## Architecture

The `AttachedRef` type gains a `what` field alongside the existing `mode`. AI auto-detects "what" from the reference's existing analysis (type + tags). Vibe mode skips the "what" picker — it extracts the whole feeling. Text description field overrides everything.

**Usage preferences are saved on the Reference model** — `defaultMode`, `defaultWhat`, and `usageDescription`. When a user figures out the perfect way to use a reference, those settings persist. Next time they attach it, the defaults are pre-filled. This is part of the content engine — references are tools with learned settings, not disposable inputs.

Library page gets card/layout fixes from the holistic review.

---

## 1. Updated Ref Attachment Model

### Current
```typescript
type AttachedRef = {
  ref: ReferenceItem;
  mode: RefMode; // "exact" | "scene" | "vibe"
};
```

### New
```typescript
type RefWhat = "background" | "outfit" | "pose" | "all";
type RefMode = "exact" | "similar" | "vibe";

type AttachedRef = {
  ref: ReferenceItem;
  mode: RefMode;
  what: RefWhat;         // auto-detected, user can change
  description: string;   // free text override, empty by default
};
```

**Rename "scene" to "similar"** — clearer language. "Same Scene" was confusing when the ref is an outfit, not a scene.

### Auto-detection of "what"

When a ref is attached, AI sets `what` based on the ref's existing data:
- `ref.type === "BACKGROUND"` → `what: "background"`
- `ref.tags.includes("outfit")` → `what: "outfit"`
- `ref.tags.includes("pose")` → `what: "pose"`
- Otherwise → `what: "all"`

User can change it. This is just the default.

### How it affects generation

**Exact + Background:** "Recreate this exact background/setting. Place the creator in this scene."
**Exact + Outfit:** "The creator is wearing this exact outfit."
**Exact + Pose:** "The creator is in this exact pose/position."
**Exact + All:** "Recreate everything in this image with the creator."

**Similar + Background:** "Similar setting/environment to this reference."
**Similar + Outfit:** "Similar style outfit to what's shown in the reference."
**Similar + Pose:** "Similar body position/pose to the reference."
**Similar + All:** "Similar overall feel to this reference."

**Vibe (any):** No image passed. AI reverse-engineers the mood/aesthetic as text. No "what" picker — the whole feeling is extracted.

**Text description** — always appended. Overrides or adds specificity: "but make it nighttime", "same outfit but in black", "more casual version of this pose".

---

## 1b. Generation Recipe — Ref Settings Saved on Content

Usage preferences are stored **per generation**, not on the reference itself. Each Content record saves the full "recipe" — which refs were used, with what mode, what target, and what description. This makes every generation fully reproducible and inspectable.

### Schema Change

Add to Content model:

```prisma
model Content {
  // ... existing fields ...
  refAttachments    Json?     // Array of ref usage records for this generation
}
```

### refAttachments JSON Shape

```typescript
type ContentRefAttachment = {
  refId: string;          // Reference.id
  refName: string;        // Snapshot of ref name at generation time
  refS3Key: string;       // S3 key of the ref image
  mode: "exact" | "similar" | "vibe";
  what: "background" | "outfit" | "pose" | "all";
  description: string;    // User's text description
  vibeText?: string;      // If mode was "vibe", the extracted mood text
};
```

### When Generation Happens

After successful content generation, save the ref attachments on the Content record:

```typescript
await db.content.update({
  where: { id: content.id },
  data: {
    refAttachments: JSON.parse(JSON.stringify(attachments.map(a => ({
      refId: a.ref.id,
      refName: a.ref.name,
      refS3Key: a.ref.s3Key,
      mode: a.mode,
      what: a.what,
      description: a.description,
      vibeText: a.vibeText,  // if vibe mode was used
    })))),
  },
});
```

### Viewing Past Generation Recipe

When user clicks a past generation in the Studio Canvas or Library detail:
- Show the generated image/video
- Below: "References used" section showing each ref with its mode, what, and description
- Each ref is clickable — preview the ref image
- "Regenerate with same settings" button — pre-fills the Creation Panel with the exact same refs + modes + descriptions

### ContentItem Type Update

```typescript
type ContentItem = {
  // ... existing fields ...
  refAttachments?: ContentRefAttachment[];
};
```

### Why This Approach

- Same ref, different generations, different settings — all preserved independently
- Full generation history: you can see exactly how any piece of content was made
- "Try this again" or "Make similar" becomes trivial — load the recipe
- No mutation of the Reference model — refs stay clean
- Future: AI agent can analyze past recipes to learn what works

---

## 2. Updated Inline Refs UI

The inline ref chip below the prompt expands slightly:

**For Exact/Similar mode:**
```
┌─────────────────────────────────────────┐
│ [thumb] Beach sunset              ×     │
│         [BG ▾] [Exact ▾]               │
│         [optional: describe how to use] │
└─────────────────────────────────────────┘
```

- Thumbnail + name + close button (same as now)
- Row 2: "what" dropdown (BG/Outfit/Pose/All) + "how" dropdown (Exact/Similar/Vibe)
- Row 3: small text input for optional description (placeholder: "e.g. but make it nighttime")

**For Vibe mode:**
```
┌─────────────────────────────────────────┐
│ [thumb] Beach sunset              ×     │
│         [✨ Vibe]                        │
│         [optional: describe the vibe]   │
└─────────────────────────────────────────┘
```

- No "what" dropdown — vibe extracts everything
- Vibe badge with accent color
- Text input for optional vibe guidance

### Size concern
The current inline ref chips are small. Adding two dropdowns + a text input makes them bigger. Solution: the dropdowns and text input are **collapsed by default** — just show the thumbnail + name + mode badge. Click the chip to expand and show the controls. Most users will use the auto-detected defaults and never expand.

**Collapsed (default):**
```
┌──────────────────────────┐
│ [thumb] Beach sunset  BG · Exact  × │
└──────────────────────────┘
```

**Expanded (on click):**
```
┌─────────────────────────────────────────┐
│ [thumb] Beach sunset                ×   │
│         [BG ▾] [Exact ▾]               │
│         [describe how to use...]        │
└─────────────────────────────────────────┘
```

---

## 3. Generation Pipeline Update

### For Exact/Similar modes

The prompt builder reads `what` + `mode` + `description` and constructs the instruction:

```typescript
function buildRefInstruction(att: AttachedRef): string {
  const whatLabel = {
    background: "background/setting",
    outfit: "outfit/clothing",
    pose: "pose/body position",
    all: "everything",
  }[att.what];

  const howLabel = att.mode === "exact"
    ? `Match the ${whatLabel} from the reference image exactly.`
    : `Use a similar ${whatLabel} to the reference image, with creative freedom.`;

  const desc = att.description?.trim()
    ? ` Additional: ${att.description.trim()}`
    : "";

  return `${howLabel}${desc}`;
}
```

Image is passed to Gemini as `inlineData` for both Exact and Similar.

### For Vibe mode

No image passed. `analyzeReferenceVibe()` extracts mood text. If user added a description, it's appended:

```typescript
const vibeText = await analyzeReferenceVibe(imageBase64);
const desc = att.description?.trim() ? ` ${att.description.trim()}` : "";
refPrompt += `Style and mood: ${vibeText}.${desc}`;
```

---

## 4. Library Page Fixes

Based on holistic review findings:

### Fix 1: AI description visible on ref cards
Each ref card in the library should show the AI-generated description (from `analyzeReferenceImage`) so users know what the system thinks the ref is before they use it. Show as a small text line below the name.

### Fix 2: Upload experience
The drag-drop works but the AddReferenceDialog should show the AI's auto-detected type more prominently — make it clear the AI categorized it and the user can change it.

### Fix 3: Card consistency
Library cards and Studio browser cards should look the same. Both show: thumbnail, type badge, name. Library adds: star button, usage count. Studio adds: selected state (checkmark).

---

## 5. Store Changes

```typescript
// unified-studio-store.ts

type RefWhat = "background" | "outfit" | "pose" | "all";
type RefMode = "exact" | "similar" | "vibe";

type AttachedRef = {
  ref: ReferenceItem;
  mode: RefMode;
  what: RefWhat;
  description: string;
};

// Update attachRef to auto-detect "what":
attachRef: (ref) => {
  const what = autoDetectWhat(ref);
  set((s) => ({
    attachedRefs: s.attachedRefs.some((a) => a.ref.id === ref.id)
      ? s.attachedRefs.filter((a) => a.ref.id !== ref.id)
      : [...s.attachedRefs, { ref, mode: "exact", what, description: "" }],
  }));
}

// New actions:
setRefWhat: (refId: string, what: RefWhat) => void;
setRefDescription: (refId: string, description: string) => void;
```

### autoDetectWhat helper
```typescript
function autoDetectWhat(ref: ReferenceItem): RefWhat {
  if (ref.type === "BACKGROUND") return "background";
  if (ref.tags.includes("outfit")) return "outfit";
  if (ref.tags.includes("pose")) return "pose";
  return "all";
}
```

---

## 6. Files to Change

```
MODIFY: prisma/schema.prisma                            — Add refAttachments Json? to Content model
CREATE: prisma/migrations/XXXXX_ref_attachments/         — Auto-generated
MODIFY: src/types/content.ts                            — Add ContentRefAttachment type, refAttachments to ContentItem
MODIFY: src/stores/unified-studio-store.ts              — RefWhat type, AttachedRef with what+description, autoDetectWhat, new actions
MODIFY: src/components/studio/content/inline-refs.tsx    — Collapsed/expanded UI, what/mode dropdowns, description input
MODIFY: src/server/actions/content-actions.ts           — buildRefInstruction uses what+mode+description, save refAttachments on Content
MODIFY: src/server/actions/content-actions.ts           — getCreatorContent maps refAttachments
MODIFY: src/components/studio/content/studio-canvas.tsx  — Show ref recipe on past content preview
MODIFY: src/components/workspace/content-library.tsx    — Show AI description on ref cards
```

---

## Out of Scope
- Shared RefCard component extraction (noted in review, separate task)
- Batch reference operations
- Reference folders/collections
