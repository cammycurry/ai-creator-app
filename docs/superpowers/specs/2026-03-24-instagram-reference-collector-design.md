# Instagram Reference Collector — Design Spec

> **Date:** 2026-03-24
> **Status:** Approved
> **Approach:** Fork existing Chrome extension + new DB tables + API route

---

## Goal

Build a tool to collect reference photos from Instagram accounts. The user browses Instagram, saves accounts and cherry-picks their best posts. Images go to S3, metadata goes to the database. This feeds into the premade creator library and provides composition/style reference for the generation pipeline.

---

## Architecture Overview

Three components:

1. **Chrome Extension** — forked from `ai-creator-mgmt/chrome-extension/`, stripped of Skool, adapted for reference collection
2. **API Route** — new `/api/reference` endpoint in the Next.js app
3. **Database** — two new Prisma models: `ReferenceAccount` and `ReferencePost`

```
[Chrome Extension] → [/api/reference] → [S3 + PostgreSQL]
     │                      │
     │ scrapes IG DOM        │ presigned URL upload
     │ intercepts GraphQL    │ upsert account/post records
     │ downloads full-res    │
     └──────────────────────-┘
```

---

## Database Schema

### ReferenceAccount

Represents an Instagram account added to the collection.

```prisma
model ReferenceAccount {
  id        String   @id @default(cuid())
  handle    String   @unique          // stored without @ prefix
  name      String?
  bio       String?
  followers Int?
  following Int?
  postCount Int?
  profilePicUrl String?

  // Subjective tags (filled in later or at save time)
  niche     String[]
  gender    String?
  vibe      String?
  quality   Int?
  notes     String?

  // Relations
  posts     ReferencePost[]

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

### ReferencePost

Represents a saved post/image from a collected account.

```prisma
model ReferencePost {
  id        String   @id @default(cuid())
  accountId String
  account   ReferenceAccount @relation(fields: [accountId], references: [id], onDelete: Cascade)

  shortcode     String
  postUrl       String
  s3Key         String
  mediaType     String  @default("image") // "image" or "video"
  width         Int?
  height        Int?
  caption       String?
  carouselIndex Int     @default(0)

  // Tagging (optional, can be AI-assisted later)
  pose          String?
  setting       String?
  outfit        String?
  lighting      String?
  composition   String?
  quality       Int?                       // 1-5 rating
  isGoodReference Boolean @default(true)

  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  @@unique([shortcode, carouselIndex])     // carousel slides share a shortcode
  @@index([accountId])
  @@index([shortcode])
}
```

---

## S3 Structure

Images stored under the existing `realinfluencer-media` bucket:

```
reference-dataset/
  {handle}/
    {shortcode}-0.jpg
    {shortcode}-1.jpg      ← carousel slides
    {shortcode}-2.jpg
    ...
```

Flat structure. All metadata lives in the database, not the filesystem. Handle stored without `@` prefix. File extension matches media type (`.jpg` for images, `.mp4` for videos).

**Note:** Video collection works but images are the priority for this build. The schema and S3 structure support both.

---

## API Route

**Path:** `src/app/api/reference/route.ts`

**Auth:** API key check via `Authorization: Bearer <key>` header. Key stored in `REFERENCE_API_KEY` env var, validated with constant-time comparison. No Clerk auth — this is an internal tool.

**Error responses:** All actions return `{ ok: false, error: string }` on failure (auth, validation, DB errors).

**CORS:** Extension calls go through the background service worker — no CORS headers needed on the API route.

### Actions (POST body `action` field)

#### `saveAccount`

Extension sends scraped profile metadata. Server upserts the account.

```typescript
// Request
{
  action: "saveAccount",
  handle: string,
  name?: string,
  bio?: string,
  followers?: number,
  following?: number,
  postCount?: number,
  profilePicUrl?: string
}

// Response
{ ok: true, accountId: string, isNew: boolean }
```

#### `savePost`

Extension sends post metadata, server returns presigned S3 PUT URL. Extension uploads the image, then calls `confirmPost`.

**Note:** `src/lib/s3.ts` needs a new `getPresignedPutUrl(key, contentType)` function using `PutObjectCommand` with the S3 presigner. The existing module only has server-side upload and signed GET URLs.

```typescript
// Request
{
  action: "savePost",
  handle: string,
  shortcode: string,
  carouselIndex: number,
  mediaType: "image" | "video",
  width?: number,
  height?: number,
  caption?: string,
  mimeType: string
}

// Response
{
  ok: true,
  uploadUrl: string,      // presigned S3 PUT URL
  s3Key: string,           // reference-dataset/{handle}/{shortcode}-{index}.jpg
  alreadySaved?: boolean   // true if this shortcode+carouselIndex already exists
}
```

#### `confirmPost`

Called after S3 upload succeeds. Creates the DB record. Stores `s3Key` — signed read URLs are generated on demand, not stored.

```typescript
// Request
{
  action: "confirmPost",
  handle: string,
  shortcode: string,
  carouselIndex: number,
  s3Key: string,
  mediaType: string,
  width?: number,
  height?: number,
  caption?: string,
  postUrl: string            // window.location.href at save time
}

// Response
{ ok: true, postId: string }
```

#### `checkPost`

Extension calls on page load to check if post is already saved. Returns which carousel indexes exist so the extension can skip already-saved slides.

```typescript
// Request
{
  action: "checkPost",
  shortcode: string
}

// Response
{ saved: boolean, savedIndexes: number[] }
// saved=true if any slide exists, savedIndexes lists which carouselIndex values are in DB
```

---

## Chrome Extension Changes

### Source

Fork from: `/Users/camcurry/projects/ai-creator-mgmt/chrome-extension/`
Destination: `tools/chrome-extension/` in this repo

### What Gets Removed

- `content-skool.js` — Skool content script
- `injector.js` — Skool injector
- `interceptor.js` — Skool interceptor
- `fmp4-mux.js` — Skool video muxing
- All Skool-related host permissions and content script entries in manifest
- Platform save flow (`uploadToLibrary`, `handleGetUploadUrl`, `handleConfirmUpload` for the old platform)

### What Gets Modified

#### `manifest.json`
- Name: "Reference Collector" (or similar)
- Remove Skool matches and host permissions
- Keep Instagram + CDN host permissions
- Add host permission for `localhost:3000` (dev) and production URL

#### `content-instagram.js`

**New: Profile page detection**
- Detect profile pages: `instagram.com/{username}` (not `/p/`, `/reel/`, `/explore/`, etc.)
- Show "Add to Collection" floating button on profile pages
- On click: scrape visible metadata from DOM:
  - Handle (from URL)
  - Display name (from `<h2>` or meta tags)
  - Bio (from profile section)
  - Follower/following/post counts (from stat spans)
- Send `saveAccount` to the API

**Modified: Post save flow**
- Replace `uploadToLibrary()` with new flow targeting `/api/reference`
- Call `savePost` to get presigned URL → upload to S3 → call `confirmPost`
- On page load for post pages, call `checkPost` for dedup indicator

**New: Carousel support**
- When saving a post, check for `edge_sidecar_to_children` in intercepted GraphQL data
- If carousel: download all slides at full resolution
- Each slide gets its own `carouselIndex` (0, 1, 2, ...)
- Upload each as `{shortcode}-{index}.jpg`

#### `interceptor-instagram.js`

**Modified: Carousel extraction**
- In `walkForMedia()`, when encountering a media object with `edge_sidecar_to_children`, walk the children array and extract each child's `image_versions2` or `video_versions`
- Tag each item with a `carouselIndex`
- Bridge all items to the content script

#### `background.js`

- Remove Skool-related message handlers
- Remove old platform save functions (`saveToPlatform`, `handleGetUploadUrl`, `handleConfirmUpload`)
- Keep: `handleFetchBlob`, `handleFetchIgMedia`, `downloadWithRetry`, `saveToDownloads`
- Add: new message handlers for reference collection API calls

#### `popup.html` / `popup.js`

- Simplify: show collection stats (accounts saved, posts saved)
- Settings: API URL + API key (pointing to this app)
- Remove Skool references

#### `options.html` / `options.js`

- Simplify settings to just API URL and API key

---

## Extension Workflow

### Adding an Account

1. User browses to `instagram.com/some_ai_creator`
2. Extension detects profile page, shows "Add to Collection" button
3. User clicks → extension scrapes metadata from DOM
4. Extension calls `saveAccount` → server upserts `ReferenceAccount`
5. Button turns green: "Added"

### Saving a Post

1. User is on a post page (`/p/ABC123/`) or reel
2. Extension checks `checkPost` on load → shows "Save" or "Already Saved"
3. User clicks "Save"
4. Extension uses intercepted GraphQL data (or fetches via API) to get full-res URLs
5. For carousels: gets all slides from `edge_sidecar_to_children`
6. For each image:
   - Calls `savePost` → gets presigned S3 URL
   - Downloads full-res image via background service worker
   - Uploads to S3
   - Calls `confirmPost` → creates DB record
7. Button turns green: "Saved (3 images)" or similar

### Dedup

- Account: upsert by handle (updates metadata if account already exists)
- Post: `checkPost` by shortcode on page load returns `savedIndexes` array. Extension skips carousel slides that are already saved. `savePost` checks the compound key `(shortcode, carouselIndex)` and returns `alreadySaved: true` for individual slides that exist.

---

## Implementation Notes

- **`tools/chrome-extension/`** does not interfere with the Next.js build — it is a standalone directory, not processed by `pnpm build`
- **`s3.ts`** needs a new `getPresignedPutUrl(key, contentType)` export for client-side uploads from the extension
- **`postUrl`** is captured as `window.location.href` at save time (preserves whether it was `/p/` or `/reel/`)
- **API key** lives in `REFERENCE_API_KEY` env var in `.env.local`

---

## How This Feeds Into the App

| Component | Feeds Into |
|-----------|-----------|
| `ReferenceAccount` metadata (handle, niche, vibe) | Premade creator character definitions |
| `ReferencePost` images in S3 | Composition templates, style reference |
| `ReferencePost` tags (pose, setting, outfit) | Content prompt library, template categories |
| Full-res reference images | Gemini `inlineData` reference anchors for better realism |

---

## Future Enhancements (Not in This Build)

- **Bulk select on profile pages** — checkboxes on post thumbnails for batch saving
- **AI-assisted tagging** — send saved images to Claude/Gemini Vision to auto-fill pose, setting, outfit, lighting, composition tags
- **Review UI in the app** — browse the reference collection, rate images, manage accounts
- **Direct-to-premade pipeline** — button to generate a premade creator inspired by a reference account
