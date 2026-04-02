# Content Studio V2 — Design Spec

**Date:** 2026-04-02
**Status:** Approved
**Scope:** Complete visual rebuild of the Content Studio with Canva-style UX — library panel, visual-first creation, all 4 content types, opt-in configs, generation history.
**Replaces:** `2026-04-01-unified-content-studio-design.md` (functional but not polished enough)

---

## Overview

Rebuild the Content Studio to feel like a Canva-style creation engine. Visual-first, not form-first. Library panel with all your assets. Templates you can see. Click to use references. Simple by default, powerful if you dig in. Matches the dashboard's light theme exactly.

---

## 1. Layout

Full-screen overlay (same as current). Two panels:

### 1.1 Left: Library

Single scrollable panel labeled "Library" — no tabs. Contains three sections vertically:

**References** — your saved backgrounds, products, outfits, poses. Account-wide (shared across creators). Compact 3-column thumbnail grid. Click to toggle attachment (checkmark appears, ref shows inline on the right). "+ Add" card at end.

**Public** — platform curated assets. Same thumbnail grid style. Scroll horizontally or show 6 with "Browse all" link. Click to use just like personal refs.

**Recent** — last 5-8 generations with thumbnail, content type badge, and prompt preview. Click to reload all settings (type, prompt, refs, config) into the creation area. This IS the generation history.

No "Your World", no tabs, no "MY REFS / CREATOR / LIBRARY" split. Just one scrollable column: your refs → public stuff → recent work.

### 1.2 Right: Creation Area

Content type pills at top. Below that: the creation interface that adapts per type. All configs are optional with empty defaults.

---

## 2. Content Type Interfaces

### 2.1 Photo

- **Prompt:** "What should [name] do?" + textarea
- **Inline refs:** visual thumbnails of attached refs below prompt (with remove button)
- **Config (inline, compact):**
  - Photo count: 1-4 buttons
  - Aspect ratio: portrait / square / landscape (optional, default: auto)
- **Advanced (collapsible, empty by default):**
  - Camera style: (empty) / iPhone / editorial / professional
  - Lighting: (empty) / natural / golden hour / studio / moody
  - Mood: (empty) / candid / posed / energetic / calm
- **Quick starts:** template chips that pre-fill the prompt
- **Generate:** "Generate → " + credit cost

### 2.2 Carousel

- **Format picker:** visual chips for 8 carousel formats. Clicking one loads the slide editor.
- **Slide editor:** vertical list of slides with:
  - Slide number (accent on #1)
  - Scene name + mood
  - Auto-matched ref tags (from selected refs matching scene keywords)
  - Click to edit description inline
  - Slide count +/- within format range
- **Global instructions:** textarea for instructions applied to all slides
- **Inline refs:** refs selected in library auto-match to relevant slides
- **Generate:** "Generate Carousel → " + credit cost (1 per slide)

### 2.3 Video

- **Source cards** (3 visual cards, pick one):
  - **From Text** — describe a scene, AI generates video
  - **From Photo** — pick an existing photo to animate (shows recent photos grid)
  - **Motion Transfer** — upload a movement/dance video (drag-drop zone appears)
- **Prompt:** "What happens?" for text/photo modes. "Movement description" for motion.
- **Inline refs:** visual thumbnails of attached refs
- **Config:**
  - Duration: 5s / 10s pill toggle
  - Aspect ratio: 9:16 / 1:1 / 16:9
- **Advanced (collapsible):**
  - Camera movement: (empty) / pan right / zoom in / static / handheld
- **Generate:** "Generate Video → " + credit cost

### 2.4 Talking Head

- **Script:** "What should [name] say?" + larger textarea (replaces prompt)
- **Voice picker:** 2-column card grid filtered by creator gender. Play preview button per voice.
- **Duration:** 15s / 30s pill toggle
- **Background:** text input for setting (optional: "office", "kitchen", etc.) OR click a background ref from library
- **Inline refs:** background ref shown visually
- **Advanced (collapsible):**
  - Tone: (empty) / casual / professional / excited / serious
- **Generate:** "Generate Talking Head → " + credit cost

---

## 3. References in Creation

### 3.1 Selection Flow

User clicks a ref thumbnail in the Library panel → ref gets a checkmark → ref appears as a **visual thumbnail** inline in the creation area (below the prompt, inside the input card). Not a text tag — an actual mini image with the ref name and a remove button.

For carousel: selected refs auto-match to slides based on scene keywords (gym ref → gym slides). Shows "(auto)" badge. User can override.

### 3.2 Inline Ref Display

Inside the input card, below the textarea:
```
[prompt textarea]
─────────────────────
[🛏️ thumb] Bedroom  ×  |  [🏋️ thumb] Gym  ×  |  [+ add ref]
```

The "+ add ref" button scrolls the library panel or opens a quick ref picker.

### 3.3 Inspiration Uploads

At the bottom of the Library panel, a drop zone: "Drop a photo — make [name] do this."

These are transient (not saved). They appear as inline refs in the creation area with a camera icon instead of a ref type icon.

For motion transfer: the drop zone changes to "Drop a movement video" and accepts video files.

---

## 4. Generation History (Recent)

### 4.1 Data Source

Query the existing `Content` model — it already has `prompt`, `userInput`, `generationSettings` (JSON with all config), `type`, `url`, `thumbnailUrl`, `createdAt`.

No new model needed. Just query recent Content records for the active creator, ordered by `createdAt desc`, limit 8.

### 4.2 Display

In the Library panel under "Recent":
- Thumbnail (32x32 or 40x40)
- Content type badge (📷 Photo / 📸 Carousel / 🎥 Video / 🎤 Talking Head)
- Prompt preview (truncated to ~40 chars)
- Relative time ("2m ago", "1h ago")

### 4.3 Reload

Click a recent item → load its settings into the creation area:
- Set `contentType` from the content record's type
- Set `prompt` from `userInput` or `prompt`
- Set config from `generationSettings` JSON (duration, format, voice, etc.)
- Refs are NOT reloaded (they may have changed) — user reattaches if needed

User can then tweak and regenerate. "Same thing but different" or "modify and retry."

---

## 5. Config Philosophy

**Empty by default.** No style, mood, camera, or tone is pre-selected. The generation uses just the prompt + refs. The AI decides the best approach.

**Opt-in only.** Advanced settings are in a collapsible "More options" section. Most users never open it. Power users who want "golden hour lighting with handheld camera" can dial it in.

**No enforcement.** Selecting a mood or style adds it to the prompt context — it doesn't lock or override anything. It's a suggestion to the AI, not a constraint.

---

## 6. Styling

Match the dashboard exactly:
- Background: `#FAFAFA`
- Surface/cards: `#FFFFFF`
- Borders: `#EBEBEB`
- Text primary: `#111111`
- Text secondary: `#888888`
- Text muted: `#BBBBBB`
- Accent: `#C4603A` (terracotta)
- Font: Inter
- Border radius: 10-12px for cards, 6-8px for buttons, 16-20px for pills
- Shadows: subtle, `0 2px 12px rgba(0,0,0,0.04)`

Content type pills: rounded, filled accent when active, bordered when inactive.
Config buttons: small, compact, inline. Not labeled "SETTINGS".
Generate button: accent background, white text, right-aligned in footer.

---

## 7. Components

### 7.1 Rebuild (replace current unified-studio files)

```
src/components/studio/content/
  content-studio-v2.tsx          — Overlay orchestrator
  content-studio-v2.css          — All styles
  studio-library-panel.tsx       — Left: refs + public + recent
  studio-creation-panel.tsx      — Right: type pills + prompt + config + generate
  creation-photo.tsx             — Photo-specific: count, aspect, advanced
  creation-carousel.tsx          — Carousel-specific: format, slides, instructions
  creation-video.tsx             — Video-specific: source cards, duration, ratio
  creation-talking.tsx           — Talking head: script, voice, duration, background
  inline-refs.tsx                — Visual ref thumbnails shown in creation area
```

### 7.2 Keep unchanged
- All server actions (content, carousel, video, talking-head, reference)
- `video-player.tsx`, `reference-card.tsx`, `add-reference-dialog.tsx`
- `unified-studio-store.ts` (may need minor additions for history)

### 7.3 Remove (replaced by v2)
- `unified-studio.tsx`, `unified-studio.css`
- `studio-ref-panel.tsx`, `studio-create-panel.tsx`
- `config-photo.tsx`, `config-carousel.tsx`, `config-video.tsx`, `config-talking.tsx`
- `studio-results.tsx`

---

## 8. Mobile

- Library panel: bottom sheet/drawer, swipe up to browse
- Type pills: horizontal scroll
- Creation area: full width
- Config: stacks vertically
- Voice picker: single column
- Generate button: fixed bottom bar
- All touch targets 44px+, all inputs fontSize 16px

---

## 9. What's NOT in Scope

- Content presets / saved factory configs (future)
- Account-level reference migration (creatorId optional — future, use creator refs for now)
- Public reference library population (admin tool — separate spec exists)
- AI assist / prompt improvement (removed per user request)
- Auto-captioning
- Video editing / trimming
- Voice cloning
