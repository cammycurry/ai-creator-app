# Admin Kanban Pipeline — Design Spec

**Date:** 2026-04-02
**Status:** Approved
**Scope:** Kanban board for tracking generated images through a pipeline from generation to publication.

---

## Overview

A visual kanban board on the admin dashboard (`/admin/generate` → Pipeline tab) that tracks **generated images** through stages. Each card is a generated image (creator base, background, reference, etc.) that moves through: Inbox → Review → Approved → Published. Rejected items go to a Rejected column.

This replaces the triage swipe UI with a more visual, persistent workflow.

---

## 1. Pipeline Stages

| Stage | Description | How items get here |
|-------|-------------|-------------------|
| **Inbox** | New generations land here | Seed script, admin generate UI, batch runs |
| **Review** | You're looking at these | Drag from Inbox |
| **Approved** | Good enough to use | Drag from Review |
| **Published** | Live in public library or as pre-made creator | Drag from Approved (auto-publishes) |
| **Rejected** | Not good, archived | Drag from any column |

---

## 2. Data Model

Reuse the existing `AdminMedia` table (already has `s3Key`, `source`, `label`, `starred`, `prompt`, `notes`, `sourceHandle`). Add a `pipelineStage` field:

```prisma
model AdminMedia {
  // existing fields...
  pipelineStage String @default("inbox") // inbox, review, approved, published, rejected
  pipelineOrder Int    @default(0)        // ordering within a column
  mediaType     String @default("creator") // creator, background, reference, custom
}
```

When an item is dragged to "Published", the system auto-creates a `PublicReference` record (for backgrounds/references) or flags it as ready for creator creation.

---

## 3. UI Design

### 3.1 Board Layout

Full-width horizontal scroll with 5 columns. Each column is a vertical list of cards. Cards are compact — image thumbnail + key metadata.

```
┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐
│  INBOX  │ │ REVIEW  │ │APPROVED │ │PUBLISHED│ │REJECTED │
│  (12)   │ │  (5)    │ │  (8)    │ │  (3)    │ │  (2)    │
├─────────┤ ├─────────┤ ├─────────┤ ├─────────┤ ├─────────┤
│ [card]  │ │ [card]  │ │ [card]  │ │ [card]  │ │ [card]  │
│ [card]  │ │ [card]  │ │ [card]  │ │ [card]  │ │ [card]  │
│ [card]  │ │         │ │ [card]  │ │         │ │         │
└─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘
```

### 3.2 Card Design

Each card shows:
- Image thumbnail (square, ~120px)
- Type badge (Creator/Background/Reference/Custom)
- Source handle (if from Instagram reference)
- Star indicator
- Like count from source (if available)

Click a card → expands to show full image + metadata + prompt used.

### 3.3 Interactions

- **Drag and drop** between columns (HTML5 drag or click-to-move buttons)
- **Click** to expand/view full size
- **Star** toggle on each card
- **Type** selector on each card (creator/background/reference/custom)
- **Bulk actions**: "Move all Inbox to Review", "Move all Approved to Published"
- **Filter by type** across all columns

### 3.4 Stage Actions

Moving to **Published** triggers:
- For backgrounds/references: auto-creates `PublicReference` record
- For creators: flags as ready (future: auto-creates pre-made Creator record)

Moving to **Rejected**: soft-archives, hidden by default but recoverable.

---

## 4. Server Actions

Add to `admin-generate-actions.ts`:

```typescript
// Move item to a new pipeline stage
moveAdminMedia(id: string, stage: string, order?: number)

// Bulk move
bulkMoveAdminMedia(ids: string[], stage: string)

// Get all items grouped by stage
getAdminMediaByStage(filters?: { mediaType?: string })
  → { inbox: AdminMedia[], review: AdminMedia[], approved: AdminMedia[], published: AdminMedia[], rejected: AdminMedia[] }
```

---

## 5. Components

```
src/components/admin/generate/
  pipeline-board.tsx    — Main kanban board with 5 columns
  pipeline-card.tsx     — Individual card component
  pipeline-column.tsx   — Column wrapper with header + card list
```

---

## 6. Integration with Existing Systems

- **Seed script** creates `AdminMedia` records with `pipelineStage: "inbox"`
- **Admin generate UI** creates `AdminMedia` records when images are generated
- **Sync from S3** imports existing S3 images as inbox items
- **Publishing** creates `PublicReference` records automatically
- **Triage tab** can coexist or be replaced by the kanban

---

## 7. Not in Scope

- Real-time drag animation (simple click-to-move is fine for v1)
- Multi-user collaboration
- Undo/redo
- Custom columns
