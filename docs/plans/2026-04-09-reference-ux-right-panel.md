# Reference UX — Right Panel Redesign

> Date: 2026-04-09
> Goal: Make references fully manageable from the creation panel (right side). No need to switch tabs.

## The Problem

Currently, to add a reference to a generation you have to:
1. Switch to "Refs & Templates" tab (left sidebar)
2. Find the reference
3. Click it to preview on canvas
4. Click "Use in Generation"
5. Switch back to "My Content" tab
6. Hope you remember what you attached

This is broken. Everything should be doable from the right panel.

## Design

### Right panel layout (top to bottom)
```
┌─────────────────────────────┐
│ Photo  Carousel  Video  TH  │  ← content type pills
├─────────────────────────────┤
│ What happens in the video?  │
│ [prompt textarea]           │
├─────────────────────────────┤
│ [type-specific config]      │  ← video: starting photo row, duration, ratio
│                             │     photo: count, ratio
│                             │     talking head: voice, duration
├─────────────────────────────┤
│ References          [+ Add] │  ← section header with add button
│ [chip] [chip] [chip]        │  ← compact chips for attached refs
├─────────────────────────────┤
│ [error message if any]      │
├─────────────────────────────┤
│ 3 credits    [Generate →]   │  ← footer
└─────────────────────────────┘
```

### Adding a reference — "+" button opens a dialog

The [+ Add] button opens a **"Pick Reference" dialog** that has two paths:

**Tab 1: My References** — grid of existing saved references (from creator store)
- Click one to attach it to the current generation
- Shows thumbnail + name + type badge
- Auto-closes after selection

**Tab 2: Upload New** — reuses the existing AddReferenceDialog upload flow
- Drop/pick image → AI analyzes → save as reference AND attach to generation

After picking/uploading, the ref appears as a chip in the creation panel. Clicking the chip opens the **edit dialog** (already built) where you set type (Scene/Product), mode (Exact/Inspired), and description.

### Compact ref chips (already built, keep as-is)
- Tiny thumbnail + name + type badge + × to remove
- Click → edit dialog with type/mode/description

### What already exists and should be reused
- `AddReferenceDialog` — full upload + AI analysis flow (src/components/workspace/add-reference-dialog.tsx)
- `ReferenceCard` — card component for displaying refs (src/components/workspace/reference-card.tsx)
- `InlineRefs` — compact chip display + edit dialog (src/components/studio/content/inline-refs.tsx)
- Creator store `references` array — all saved refs for the active creator
- `attachRef(ref)` — store action to attach a ref to the generation

### What needs to be built
1. **"Pick Reference" dialog** — new component. Two tabs: browse existing refs / upload new.
   - Browse tab: grid of creator's saved references with thumbnails
   - Upload tab: wraps existing AddReferenceDialog flow
   - On pick: calls `attachRef(ref)`, closes dialog
2. **"+ Add" button** in creation panel references section
3. Wire it all together

### Files to modify
- `src/components/studio/content/creation-panel.tsx` — add "+" button in refs section
- `src/components/studio/content/inline-refs.tsx` — already done (chips + edit dialog)
- New: `src/components/studio/content/pick-reference-dialog.tsx` — browse + upload refs

### What NOT to change
- Don't touch the existing Refs & Templates browser tab (left sidebar) — it still works for browsing
- Don't change the AddReferenceDialog — reuse it
- Don't change the reference card component
- Don't change the video/photo/carousel type-specific configs
