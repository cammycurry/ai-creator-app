# Dashboard Polish — Design Spec

## Goal

Clean up the creator dashboard so every element is purposeful. Simplify the header, make the input bar handle all content types, clarify the relationship between quick-create (input bar) and full-create (Content Studio). Fix the library page rendering with creator header on top.

## Architecture

The input bar is the quick creation path — all 4 content types, sensible defaults, one-shot generation. The Content Studio is the power path — manual control, references, per-slide editing, voice picking. Both call the same generation engine functions. The dashboard is a content gallery with filters.

---

## 1. Creator Header

### Current
```
[avatar] maria  Fitness · 10 items    [Content] [Templates] | ✏️ | ···
```
Content/Templates tabs are confusing navigation that duplicates the filter bar. "..." does nothing.

### New
```
[avatar] maria  Fitness · 12 items                              ✏️
```

- Avatar + name + niche + item count + edit icon (opens creator profile sheet)
- No tabs, no "..." button
- On standalone pages (`/workspace/library`, `/workspace/billing`, `/workspace/settings`): header is hidden entirely (just show mobile menu trigger on mobile)

---

## 2. Filter Bar

### Current
```
[All 12] [Photos 10] [Carousels 2] [Videos 0] [Voice 0] [Templates]
─────────────────────────────────────────────────────────────────────
🔍 Search content...    [Newest ▾]    12 items
```
Two separate rows. Disabled pills. Templates pill opens studio (confusing).

### New
```
[All 12] [Photos 10] [Videos 0] [Carousels 2]    🔍 Search...  [Newest ▾]  12 items
```

- Single row: filter pills + search + sort + count
- All pills enabled (Videos shows actual count including talking heads)
- No Templates pill
- No separate gallery toolbar row — merged into filter bar

---

## 3. Floating Input Bar

### Current
```
┌──────────────────────────────────────────────────────────────┐
│ What should maria do next?                              [↑]  │
├──────────────────────────────────────────────────────────────┤
│ [Mirror selfie] [Get ready with me] [Outfit check] [Walking]│
├──────────────────────────────────────────────────────────────┤
│ 📎  [- 1 +]  ≡            [📷 Photo] [▶ Video] [🎤 Voice]  │
└──────────────────────────────────────────────────────────────┘
```
Has suggestion chips, image count control, attach button, settings icon — cluttered.

### New
```
┌──────────────────────────────────────────────────────────────┐
│ What should maria do next?                              [↑]  │
├──────────────────────────────────────────────────────────────┤
│ [Photo] [Video] [Carousel] [Voice]      Open studio →       │
└──────────────────────────────────────────────────────────────┘
```

- Clean text input + send button
- Content type chips: Photo (default), Video, Carousel, Voice — ALL functional
- "Open studio →" link (terracotta) — opens Content Studio overlay
- Removed: suggestion chips, image count control, attach button, settings icon
- Photo mode: generates directly into grid (1 photo, auto-enhanced prompt)
- Video mode: generates video via existing pipeline, shows progress in grid
- Carousel mode: opens studio with carousel type pre-selected (needs format picker)
- Voice mode: opens studio with talking-head type pre-selected (needs voice picker)

### Generation behavior by type
- **Photo**: generate inline → result appears in content grid. Simple, fast.
- **Video**: generate inline → skeleton in grid → polls until complete.
- **Carousel**: opens studio (needs format selection — can't skip that)
- **Voice/Talking Head**: opens studio (needs voice selection — can't skip that)

---

## 4. Library Page

### Current
Library page (`/workspace/library`) renders inside WorkspaceShell which shows the creator header (avatar, Content tab, Templates tab, etc.) above the library content.

### New
On any route other than `/workspace` (the main dashboard), hide the creator header. Library, billing, settings pages get full width without the creator chrome.

Implementation: `WorkspaceHeader` checks `usePathname()`. If pathname is not `/workspace`, return null (or just mobile menu trigger on mobile).

---

## 5. Sidebar

### Current
```
CREATORS
+ New Creator
  maria (10 items)
────────────────
▶ Create Content
🖼 References
```

### New
```
CREATORS
+ New Creator
  maria (10 items)
────────────────
▶ Create Content
🖼 Library
```

"References" already renamed to "Library" (done in library redesign). "Create Content" opens studio. No changes needed — already correct.

---

## 6. What Gets Removed

- `Content` tab button from workspace-header.tsx
- `Templates` tab button from workspace-header.tsx
- `"..."` overflow button from workspace-header.tsx
- `Templates` filter pill from workspace-canvas.tsx (already done)
- Suggestion chips from floating input (quick-ideas div)
- Image count control from floating input (count-control div)
- Attach reference button from floating input (tool-btn with clip icon)
- Settings button from floating input (tool-btn with sliders icon)
- `TemplatesArea` function from workspace-canvas.tsx (already done)
- `activeView === "templates"` handling

## 7. What Gets Added/Changed

- All 4 content type chips on input bar (Photo/Video/Carousel/Voice)
- "Open studio →" link on input bar
- Input bar generates all types (Video inline, Carousel/Voice open studio)
- Creator header simplified to avatar + name + edit
- Filter bar merged with search/sort into one row
- WorkspaceHeader hidden on non-dashboard pages

---

## Out of Scope

- AI agent / chat layer (Layer 2 — future)
- Content presets
- Instagram content import
- Mobile responsive pass
