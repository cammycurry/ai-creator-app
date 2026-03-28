# Admin Dashboard — Design Spec

> Internal admin/management tool for realinfluencer.ai.
> Replaces the standalone `pnpm dashboard` (scripts/dashboard.ts) with a proper Next.js route group inside the existing app.

---

## What This Is

A protected route group at `/admin` inside the existing Next.js app. It's an internal tool for:

1. **Prompt testing** — iterate on prompts with direct Gemini calls, and test the full generation pipeline end-to-end
2. **App management** — browse and manage users, creators, content, credits, generation jobs
3. **Reference library** — browse collected Instagram accounts and posts
4. **System overview** — key metrics and health at a glance

Not consumer-facing. Not public. Gated to a single hardcoded Clerk user ID.

---

## Architecture

### Follows existing app patterns exactly

| Pattern | How the main app does it | How admin does it |
|---------|--------------------------|-------------------|
| Data loading | Server components | Server components |
| Mutations | Server actions (`"use server"`) | Server actions in `admin-actions.ts` |
| DB access | `src/lib/db.ts` singleton | Same — imports from `@/lib/db` |
| Auth | `auth()` from `@clerk/nextjs/server` | Same — plus admin ID check |
| Client state | Zustand stores | Zustand store (`admin-store.ts`) |
| UI components | shadcn/ui | Same shadcn/ui components |
| Layout | Sidebar shell (`app-sidebar.tsx`) | Same pattern — admin sidebar |
| Styling | Tailwind + shadcn (for non-prototype pages) | Tailwind + shadcn (no prototype CSS exists for admin) |
| S3 access | `src/lib/s3.ts` | Same — imports from `@/lib/s3` |
| Generation | `src/server/actions/generate-actions.ts` | Reuses for pipeline tests; direct Gemini for quick tests |

### Auth Gate

`src/app/admin/layout.tsx` checks `auth()` and compares the Clerk user ID against an env var (`ADMIN_CLERK_ID`). If it doesn't match, redirect to `/`. No role system, no DB lookup — just a string compare.

```
ADMIN_CLERK_ID=user_xxxxx  # in .env.local
```

---

## Route Structure

```
src/app/admin/
├── layout.tsx              # Admin shell: sidebar + auth gate
├── page.tsx                # Dashboard home (stats + recent activity)
├── prompt-lab/
│   └── page.tsx            # Prompt testing (quick test + pipeline test)
├── references/
│   └── page.tsx            # Instagram reference accounts + posts
├── users/
│   └── page.tsx            # User table + detail view
├── creators/
│   └── page.tsx            # Creator table + detail view
├── content/
│   └── page.tsx            # Content grid/table + detail view
├── credits/
│   └── page.tsx            # Transaction log + manual grant form
└── jobs/
    └── page.tsx            # Generation job history + retry
```

---

## Page Specs

### 1. Dashboard Home (`/admin`)

Server component. Loads aggregate stats via Prisma queries.

**Stats cards (top row):**
- Total users (count)
- Total creators (count, with pre-made vs custom breakdown)
- Total content pieces (count, by type)
- Total generations (count, success rate)
- Credit usage (total spent this month)
- Estimated API cost (sum of `actualCost` from GenerationJob)

**Recent activity feed:**
- Last 20 actions across all tables (new users, new creators, generations, credit transactions)
- Each row: timestamp, type icon, description, user email

**Quick links:**
- "Run a prompt test" → `/admin/prompt-lab`
- "Grant credits" → `/admin/credits`
- "View failed jobs" → `/admin/jobs?status=FAILED`

### 2. Prompt Lab (`/admin/prompt-lab`)

Client component (needs interactive state for generation UI).

**Two modes, toggled by tabs:**

#### Quick Test Mode
Port of the current Prompt Lab functionality. Direct Gemini API call via a dedicated server action (`adminQuickGenerate`).

- Prompt textarea
- Model selector (NBPro / NB2 toggle — same as current dashboard)
- Image count (1-8)
- Label input
- Optional reference image file upload (uploaded to S3 temp path, passed as `inlineData`)
- Preset dropdown (base-female, base-male, etc. — from `src/lib/prompts.ts` presets)
- Generate button → calls server action → returns base64 images → display in grid
- Results saved to `scripts/output/` directory (same as current)
- Lightbox on click
- Compare: select any 2 runs, view side by side

Server action: `adminQuickGenerate(prompt, model, count, label, refImageUrl?)` — calls Gemini directly, saves images to `scripts/output/<timestamp>_<label>/`, returns file paths. Client displays via a `/api/admin/img/[...path]` route that serves from disk. No credits, no DB content record.

#### Pipeline Test Mode
Runs through the real app code path to verify it works end-to-end.

- Same prompt input UI
- Creator selector (dropdown of all creators in DB — needed for reference images)
- Toggle: prompt enhancement on/off
- Toggle: metadata stripping on/off
- Generate button → calls existing `generateContent` server action (or a wrapper)
- Shows each pipeline stage:
  1. **Input** — raw user prompt
  2. **Enhanced** — prompt after Gemini Flash enhancement (if enabled)
  3. **Generated** — raw images from Gemini
  4. **Stripped** — after metadata removal (if enabled)
  5. **Stored** — S3 URLs + DB content record
- This DOES create real Content records and DOES deduct credits (it's testing the real pipeline)

### 3. References (`/admin/references`)

Server component for initial load, client component for interactions.

Port of current References tab. Uses existing DB queries.

**Accounts view:**
- Grid of cards: handle, name, follower count, post count, saved posts count, bio snippet, niche tags
- Sort by: followers, saved posts, date added
- Filter by: niche tags
- Click → drills into posts view

**Posts view (per account):**
- Grid of image thumbnails (from S3 signed URLs via `@/lib/s3`)
- Each shows: shortcode, carousel index, media type badge (image/video)
- Lightbox on click
- Post metadata: pose, setting, outfit, lighting, composition, quality score
- Back button → accounts list

### 4. Users (`/admin/users`)

Server component.

**Table columns:** email, name, plan, plan credits, pack credits, total credits, creator count, content count, joined date.

**Sorting:** by any column.

**Click row → detail panel (sheet or inline expand):**
- User info (email, name, Clerk ID, Stripe customer ID)
- Plan details + subscription status
- Credit balances
- Their creators (list with base image thumbnails)
- Recent content (last 10 items)
- Recent credit transactions (last 20)

### 5. Creators (`/admin/creators`)

Server component.

**Table columns:** name, user email, niche, content count, has base image (yes/no), is pre-made, created date.

**Filters:** by user, by niche, pre-made only, custom only.

**Click row → detail panel:**
- Base image (large, from S3)
- Settings JSON (formatted, read-only)
- Reference images grid
- Validation images (if they exist)
- Content count + recent content thumbnails
- User info link

### 6. Content (`/admin/content`)

Server component with client-side filters.

**Two views (toggle):**
- **Grid view** — thumbnails in responsive grid (like workspace canvas)
- **Table view** — rows with metadata

**Columns/info:** thumbnail, type (IMAGE/VIDEO/TALKING_HEAD), source (TEMPLATE/FREEFORM/WIZARD), status, creator name, user email, credits cost, model used, prompt (truncated), created date.

**Filters:** by type, source, status, creator, user, date range.

**Click → detail dialog:**
- Full-size image (from S3)
- Complete prompt text
- Generation settings JSON
- Model used
- Credit cost
- S3 URL
- Download button
- Delete button (with confirmation)

### 7. Credits (`/admin/credits`)

Server component + client form for grants.

**Transaction table:** user email, type (PLAN_GRANT/PURCHASE/SPEND/REFUND/BONUS), amount (+/-), balance after, description, content ID (if applicable), Stripe payment ID (if applicable), date.

**Filters:** by user, by type, date range.

**Manual grant form (top of page):**
- User selector (searchable dropdown of all users)
- Amount input (positive number)
- Type: BONUS or REFUND
- Description text input
- Submit → calls `grantCredits` server action (existing) with admin override

### 8. Generation Jobs (`/admin/jobs`)

Server component.

**Table columns:** status (colored badge: QUEUED=yellow, PROCESSING=blue, COMPLETED=green, FAILED=red), type, provider, model ID, estimated cost, actual cost, duration (completedAt - startedAt), error (truncated), created date.

**Filters:** by status, by type, by provider, date range.

**Click → detail panel:**
- Full input JSON (formatted)
- Full output JSON (formatted)
- Full error message (if failed)
- Provider job ID
- Timing breakdown
- Retry button (for FAILED jobs — re-queues with same input)

---

## Server Actions

New file: `src/server/actions/admin-actions.ts`

All actions start with admin auth check:
```typescript
async function assertAdmin() {
  const { userId } = await auth();
  if (userId !== process.env.ADMIN_CLERK_ID) {
    throw new Error("Unauthorized");
  }
}
```

**Actions:**
- `getAdminStats()` — aggregate counts for dashboard home
- `getRecentActivity(limit)` — cross-table recent activity feed
- `adminQuickGenerate(prompt, model, count, label, refImageUrl?)` — direct Gemini call, saves to disk
- `getAdminUsers(filters, sort, page)` — paginated user list with counts
- `getAdminCreators(filters, sort, page)` — paginated creator list
- `getAdminContent(filters, sort, page)` — paginated content list
- `getAdminCredits(filters, sort, page)` — paginated transaction list
- `getAdminJobs(filters, sort, page)` — paginated job list
- `adminGrantCredits(userId, amount, type, description)` — manual credit grant
- `adminRetryJob(jobId)` — retry a failed generation job
- `getRefAccounts(filters, sort)` — reference accounts (port from dashboard.ts)
- `getRefPosts(accountId)` — reference posts with signed S3 URLs

**Reused from existing actions:**
- `generateContent` from `content-actions.ts` (for pipeline tests)
- `grantCredits` from `credit-actions.ts` (for manual grants)

---

## Client State

New file: `src/stores/admin-store.ts`

Minimal Zustand store for client-side UI state:
- Active tab/view
- Selected items for detail panels
- Prompt lab state (prompt text, model, count, label, ref, results, compare selections)
- Filter/sort state per page

---

## Component Structure

```
src/components/admin/
├── admin-sidebar.tsx       # Navigation sidebar (same pattern as app-sidebar.tsx)
├── admin-header.tsx        # Page title + breadcrumb
├── stats-cards.tsx         # Dashboard stat cards
├── activity-feed.tsx       # Recent activity list
├── data-table.tsx          # Reusable sortable/filterable table
├── detail-panel.tsx        # Reusable slide-out detail sheet
├── prompt-lab/
│   ├── quick-test.tsx      # Quick test form + results
│   ├── pipeline-test.tsx   # Pipeline test form + stage display
│   ├── test-results.tsx    # Image grid for test run results
│   └── compare-view.tsx    # Side-by-side comparison
├── references/
│   ├── account-grid.tsx    # Reference account cards
│   └── post-grid.tsx       # Reference post thumbnails
└── image-lightbox.tsx      # Full-screen image viewer
```

---

## What Gets Removed

Once the admin dashboard is built and working:
- `scripts/dashboard.ts` — replaced entirely
- `"dashboard"` script in `package.json` — replaced by `/admin/prompt-lab`
- The standalone HTTP server approach is gone

`scripts/test-prompt.ts` and `scripts/batch-test.ts` can stay — they're CLI tools, separate use case.

---

## Env Vars

One new env var:
```
ADMIN_CLERK_ID=user_xxxxx
```

Everything else (DATABASE_URL, GEMINI_API_KEY, AWS_*, STRIPE_*) is already configured.

---

## Out of Scope

- Role-based access control (just one admin for now)
- Real-time updates / WebSocket (polling is fine)
- API cost tracking from provider billing APIs (manual for now)
- Video/voice/lip sync testing (those features aren't built yet)
- Mobile responsive (this is a desktop admin tool)
