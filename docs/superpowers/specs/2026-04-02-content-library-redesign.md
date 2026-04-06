# Content Library Redesign — Design Spec

## Goal

Replace the half-baked per-creator References tab with a standalone, account-level Content Library page. Add public reference browsing, starring, recently-used surfacing, and clean up the creator dashboard header to clarify the relationship between quick-generate and full studio.

## Architecture

The library is a standalone page at `/workspace/library`, accessible from the sidebar. References become account-level (not per-creator). The page uses three tabs: My Library, Public Library, and Starred. The creator dashboard drops the References tab entirely and gets a floating input bar for quick generation with a link to the full Content Studio.

---

## 1. Data Model Changes

### Reference Model Updates

```prisma
model Reference {
  id                String   @id @default(cuid())
  creatorId         String?                          // nullable — null = account-level
  creator           Creator? @relation(fields: [creatorId], references: [id], onDelete: Cascade)
  userId            String
  user              User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  type              String                           // "BACKGROUND" | "REFERENCE"
  name              String
  description       String   @default("")
  imageUrl          String                           // S3 key
  tags              String[]                         // sub-categorization: "outfit", "pose", "product", "mood", etc.
  starred           Boolean  @default(false)
  usageCount        Int      @default(0)
  lastUsedAt        DateTime?
  source            String   @default("UPLOAD")      // "UPLOAD" | "PUBLIC_SAVE" | "GENERATION_SAVE"
  sourcePublicRefId String?                          // links to PublicReference.id when saved from public

  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  @@index([userId])
  @@index([userId, starred])
  @@index([userId, lastUsedAt])
}
```

**Changes from current schema:**
- `creatorId` becomes optional (was required)
- `type` values: `BACKGROUND | REFERENCE` (was `BACKGROUND | PRODUCT | OUTFIT | POSE | CUSTOM`)
- New fields: `starred`, `lastUsedAt`, `source`, `sourcePublicRefId`
- Indexes updated: drop `creatorId` index, add `userId+starred` and `userId+lastUsedAt`

### PublicReference Model Updates

```prisma
model PublicReference {
  // existing fields stay the same, but type values change:
  type              String   // "BACKGROUND" | "REFERENCE" (was 5 values)
  // everything else unchanged
}
```

### Migration

Existing references with `type` in `PRODUCT | OUTFIT | POSE | CUSTOM`:
- Set `type = "REFERENCE"`
- Add old type as a lowercase tag (e.g., `PRODUCT` → tags includes `"product"`)
- Set `creatorId = null` (promote to account-level)

---

## 2. Library Page

### Route

`/workspace/library` — standalone page, not nested under a creator.

### Sidebar

Rename sidebar link from "References" to "Library". Same icon.

### Layout

Three top-level tabs with an Upload button in the tab bar:

```
[ My Library ]  [ Public Library ]  [ ★ Starred ]          [+ Upload]
```

### My Library Tab

**Recently Used strip** (top):
- Horizontal row of small thumbnails (72px squares)
- Sorted by `lastUsedAt` descending
- Max 8-10 items, horizontally scrollable
- Only shows if user has refs with `lastUsedAt` set

**Search bar:**
- Full-text search across `name`, `description`, `tags`
- Filters results in real-time

**Filter chips:**
- `All` | `Backgrounds` | `Outfits` | `Products` | `Poses` | `Moods`
- "Backgrounds" filters by `type = "BACKGROUND"`
- All others filter by matching tag on `type = "REFERENCE"` (e.g., "Outfits" filters `tags contains "outfit"`)
- Chips show counts

**Sort dropdown:**
- Recently used (default) — `lastUsedAt` desc, nulls last
- Most used — `usageCount` desc
- Newest — `createdAt` desc

**Reference count:**
- "24 references" text, left-aligned

**Grid:**
- Responsive grid, 3-4 columns depending on viewport
- Cards are square thumbnails with:
  - Type badge (top-left): "Background" or tag-based label
  - Star button (top-right): gold when starred, click to toggle
  - Bottom gradient overlay with name + "Used X times"
- **Hover:** Quick action buttons appear (Use in Studio, Star toggle)
- **Click:** Opens detail modal

**Detail modal:**
- Large image preview
- Editable name, description, tags
- Metadata: type, usage count, created date, source
- Actions: Use in Studio, Star/Unstar, Delete
- If `source = "PUBLIC_SAVE"`: shows "Saved from Public Library"

**Empty state:**
- Illustration + "Your library is empty"
- "Upload your first reference — backgrounds, products, outfits, and more"
- Upload button (primary CTA)
- "Browse Public Library" link (secondary)

### Public Library Tab

**Category chips:**
- `All` | `Fitness` | `Lifestyle` | `Fashion` | `Beauty` | `Travel` | `General`
- Filters by `PublicReference.category`

**Search bar:**
- Search across public ref `name`, `description`, `tags`

**Grid:**
- Same card style as My Library
- No star button on cards (star after saving)
- Bottom overlay: name only (no usage count)
- **Hover:** "Save to My Library" button
- **Click:** Detail modal with larger preview + "Save to My Library" + "Use in Studio"

**"Use in Studio" on public refs:**
- Auto-saves to personal library first (`source: "PUBLIC_SAVE"`, sets `sourcePublicRefId`)
- Then opens studio with ref attached

**"Save to My Library":**
- Copies image to user's S3 space
- Creates personal Reference record
- Shows toast: "Saved to your library"
- Card updates to show "Saved ✓" state

### Starred Tab

**No filters or search** — this is a curated set, keep it simple.

**Grid:**
- Same card style as My Library
- Mix of personal refs and saved public refs
- Sorted by most recently starred
- Click to open detail modal (same as My Library)

**Empty state:**
- "No starred references yet"
- "Star your favorites for quick access"

---

## 3. Creator Dashboard Header

### Current state (broken)
```
[ Content ]  [ Templates ]  | ✏️ | ···
```
Content and Templates are confusing tab-like buttons. Edit and overflow icons unclear.

### New layout
```
[avatar] maria                          ✏️  ···
         Fitness · 12 items

┌─────────────────────────────────────────────┐
│ What should maria do?    [Photo] [Video]  ⟶ │
└─────────────────────────────────────────────┘
              Open full studio →

[All] [Photos] [Videos] [Carousels]    12 items
┌──────┐ ┌──────┐ ┌──────┐
│      │ │      │ │      │
│ PHOTO│ │ PHOTO│ │VIDEO │
└──────┘ └──────┘ └──────┘
```

**Components:**
- **Creator header row:** Avatar, name, niche, item count, edit icon (opens creator settings), "..." menu (delete creator, export)
- **Floating input bar:** Text input with placeholder "What should [name] do?", type pills (Photo/Video), Generate button. Submitting opens studio with prompt pre-filled and creator selected.
- **"Open full studio" link:** Below the floating bar, terracotta color, opens Content Studio overlay
- **Content grid:** Type filter chips (All/Photos/Videos/Carousels/Talking Heads), item count, responsive grid of content cards

**Removed:**
- Content/Templates tab toggle
- References tab/button on creator page

---

## 4. Studio Library Panel Update

The Content Studio left panel (`library-panel.tsx`) queries the same account-level data:

- **References section:** Shows user's Reference records (account-level, `creatorId = null`)
- **Recently used strip:** Same `lastUsedAt` sorting as library page
- **Public refs:** Inline section showing curated public refs by category (replaces "Coming soon" placeholder)
- **Click to attach:** Same toggle behavior as current

No structural changes to the panel layout — just the data source changes from creator-scoped to account-level, and public refs become real.

---

## 5. Server Actions

### Updated: `reference-actions.ts`

- `getReferences(userId)` — replaces `getCreatorReferences(creatorId)`. Returns all account-level refs for the user.
- `getRecentReferences(userId, limit)` — sorted by `lastUsedAt` desc. For the recently-used strip.
- `getStarredReferences(userId)` — filter by `starred = true`.
- `toggleStar(referenceId)` — toggle `starred` boolean.
- `createReference()` — updated: `creatorId` defaults to null (account-level).
- `updateReference()` — unchanged.
- `deleteReference()` — unchanged.
- `incrementReferenceUsage()` — also sets `lastUsedAt = now()`.

### New: `public-reference-actions.ts`

- `getPublicReferences(category?, search?, limit?, offset?)` — query `PublicReference` where `isActive = true`. Supports category filter and text search.
- `savePublicReference(publicRefId)` — copies image to user's S3 space, creates personal Reference with `source: "PUBLIC_SAVE"` and `sourcePublicRefId`.

### Updated: Content generation actions

When a generation uses references, call `incrementReferenceUsage()` which now also sets `lastUsedAt`. If a public ref is used directly (not yet saved), auto-save it first.

---

## 6. Type System Updates

### `src/types/reference.ts`

```typescript
export const REFERENCE_TYPES = ["BACKGROUND", "REFERENCE"] as const;
export type ReferenceType = (typeof REFERENCE_TYPES)[number];

// Common tags for filtering UI
export const REFERENCE_TAGS = ["outfit", "pose", "product", "mood", "composition", "prop"] as const;

export const REFERENCE_TYPE_LABELS: Record<ReferenceType, string> = {
  BACKGROUND: "Background",
  REFERENCE: "Reference",
};

// Filter chip labels — these map to either type or tag
export const LIBRARY_FILTERS = [
  { label: "All", filter: null },
  { label: "Backgrounds", filter: { type: "BACKGROUND" } },
  { label: "Outfits", filter: { tag: "outfit" } },
  { label: "Products", filter: { tag: "product" } },
  { label: "Poses", filter: { tag: "pose" } },
  { label: "Moods", filter: { tag: "mood" } },
] as const;
```

### `ReferenceItem` type update

```typescript
export type ReferenceItem = {
  id: string;
  userId: string;
  creatorId: string | null;    // null = account-level
  type: ReferenceType;
  name: string;
  description: string;
  imageUrl?: string;            // signed URL
  s3Key: string;
  tags: string[];
  starred: boolean;
  usageCount: number;
  lastUsedAt: string | null;
  source: "UPLOAD" | "PUBLIC_SAVE" | "GENERATION_SAVE";
  sourcePublicRefId: string | null;
  createdAt: string;
};
```

---

## 7. CSS

New file: `src/app/workspace/library.css` — prototype-first CSS with `lib-` prefix.

Reuses the warm/terracotta theme from workspace. Key elements:
- `.lib-page` — full page container
- `.lib-tabs` — tab bar with underline active indicator
- `.lib-recent-strip` — horizontal scroll container
- `.lib-search` — search input
- `.lib-filters` — filter chip row
- `.lib-grid` — responsive card grid (3-4 columns)
- `.lib-card` — square card with image, badges, overlay
- `.lib-card-star` — star button
- `.lib-card-badge` — type/tag badge
- `.lib-detail-modal` — detail view overlay
- `.lib-empty` — empty state

---

## Out of Scope

- Content Presets (save/load studio configs) — separate feature
- Mobile responsive pass — separate task
- S3 cleanup on reference delete — separate task
- AI auto-analysis update for new type system — included in migration but not a new feature
