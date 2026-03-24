# Instagram Reference Collector Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an internal tool to collect Instagram reference photos (Chrome extension + API + database) for the premade creator library.

**Architecture:** Chrome extension (forked from ai-creator-mgmt) captures IG photos and account metadata, sends to a Next.js API route which stores images in S3 and records in PostgreSQL via Prisma.

**Tech Stack:** Chrome Extension (Manifest V3), Next.js 16 API Routes, Prisma/PostgreSQL, AWS S3

**Spec:** `docs/superpowers/specs/2026-03-24-instagram-reference-collector-design.md`

---

## File Structure

### New Files
- `prisma/schema.prisma` (modify — add 2 models)
- `src/lib/s3.ts` (modify — add presigned PUT URL function)
- `src/app/api/reference/route.ts` — API route with 4 actions
- `tools/chrome-extension/manifest.json` — cleaned manifest
- `tools/chrome-extension/content-instagram.js` — profile page + save flow
- `tools/chrome-extension/interceptor-instagram.js` — carousel extraction
- `tools/chrome-extension/injector-instagram.js` — unchanged copy
- `tools/chrome-extension/background.js` — stripped + new handlers
- `tools/chrome-extension/popup.html` — simplified UI
- `tools/chrome-extension/popup.js` — simplified logic
- `tools/chrome-extension/options.html` — API key settings
- `tools/chrome-extension/options.js` — settings logic
- `tools/chrome-extension/toast.css` — unchanged copy
- `tools/chrome-extension/icons/icon48.png` — unchanged copy

### Removed from Fork (not copied)
- `content-skool.js`
- `injector.js`
- `interceptor.js`
- `fmp4-mux.js`

---

## Task 1: Prisma Schema + Migration

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Add ReferenceAccount and ReferencePost models to schema**

Add to the end of `prisma/schema.prisma`:

```prisma
// ─── Reference Collection ────────────────────────────

model ReferenceAccount {
  id        String   @id @default(cuid())
  handle    String   @unique
  name      String?
  bio       String?
  followers Int?
  following Int?
  postCount Int?
  profilePicUrl String?

  niche     String[]
  gender    String?
  vibe      String?
  quality   Int?
  notes     String?

  posts     ReferencePost[]

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model ReferencePost {
  id        String   @id @default(cuid())
  accountId String
  account   ReferenceAccount @relation(fields: [accountId], references: [id], onDelete: Cascade)

  shortcode     String
  postUrl       String
  s3Key         String
  mediaType     String  @default("image")
  width         Int?
  height        Int?
  caption       String?
  carouselIndex Int     @default(0)

  pose          String?
  setting       String?
  outfit        String?
  lighting      String?
  composition   String?
  quality       Int?
  isGoodReference Boolean @default(true)

  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  @@unique([shortcode, carouselIndex])
  @@index([accountId])
  @@index([shortcode])
}
```

- [ ] **Step 2: Run migration**

```bash
pnpx prisma migrate dev --name add-reference-collection
```

Expected: Migration created and applied, Prisma client regenerated.

- [ ] **Step 3: Verify generated client has new models**

```bash
pnpx prisma generate
```

Check that `import { ReferenceAccount, ReferencePost } from "@/generated/prisma/client"` would work (the generate step confirms this).

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/ src/generated/
git commit -m "feat: add ReferenceAccount and ReferencePost models"
```

---

## Task 2: S3 Presigned PUT URL

**Files:**
- Modify: `src/lib/s3.ts`

- [ ] **Step 1: Add getPresignedPutUrl function**

Add to `src/lib/s3.ts` after the existing exports:

```typescript
export async function getPresignedPutUrl(
  key: string,
  contentType: string
): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    ContentType: contentType,
  });
  return awsGetSignedUrl(s3, command, { expiresIn: 3600 }); // 1 hour
}
```

Note: `PutObjectCommand` is already imported. `awsGetSignedUrl` is already imported as `getSignedUrl` aliased to `awsGetSignedUrl`. No new imports needed.

- [ ] **Step 2: Verify the app still builds**

```bash
pnpm build 2>&1 | tail -5
```

Expected: Build succeeds (or at least no new errors from s3.ts).

- [ ] **Step 3: Commit**

```bash
git add src/lib/s3.ts
git commit -m "feat: add presigned PUT URL for client-side S3 uploads"
```

---

## Task 3: API Route

**Files:**
- Create: `src/app/api/reference/route.ts`

- [ ] **Step 1: Create the API route with auth and action routing**

Create `src/app/api/reference/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getPresignedPutUrl } from "@/lib/s3";
import { timingSafeEqual } from "crypto";

const API_KEY = process.env.REFERENCE_API_KEY || "";

function checkAuth(req: NextRequest): boolean {
  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) return false;
  const token = auth.slice(7);
  if (token.length !== API_KEY.length || API_KEY.length === 0) return false;
  return timingSafeEqual(Buffer.from(token), Buffer.from(API_KEY));
}

function err(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

export async function POST(req: NextRequest) {
  if (!checkAuth(req)) return err("Unauthorized", 401);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return err("Invalid JSON");
  }

  const action = body.action as string;

  switch (action) {
    case "saveAccount":
      return handleSaveAccount(body);
    case "savePost":
      return handleSavePost(body);
    case "confirmPost":
      return handleConfirmPost(body);
    case "checkPost":
      return handleCheckPost(body);
    default:
      return err(`Unknown action: ${action}`);
  }
}

async function handleSaveAccount(body: Record<string, unknown>) {
  const handle = (body.handle as string)?.replace(/^@/, "").trim();
  if (!handle) return err("handle is required");

  const account = await db.referenceAccount.upsert({
    where: { handle },
    create: {
      handle,
      name: (body.name as string) || null,
      bio: (body.bio as string) || null,
      followers: (body.followers as number) || null,
      following: (body.following as number) || null,
      postCount: (body.postCount as number) || null,
      profilePicUrl: (body.profilePicUrl as string) || null,
    },
    update: {
      name: (body.name as string) || undefined,
      bio: (body.bio as string) || undefined,
      followers: (body.followers as number) || undefined,
      following: (body.following as number) || undefined,
      postCount: (body.postCount as number) || undefined,
      profilePicUrl: (body.profilePicUrl as string) || undefined,
    },
  });

  const isNew = account.createdAt.getTime() === account.updatedAt.getTime();
  return NextResponse.json({ ok: true, accountId: account.id, isNew });
}

async function handleSavePost(body: Record<string, unknown>) {
  const handle = (body.handle as string)?.replace(/^@/, "").trim();
  const shortcode = body.shortcode as string;
  const carouselIndex = (body.carouselIndex as number) ?? 0;
  const mediaType = (body.mediaType as string) || "image";
  const mimeType = (body.mimeType as string) || "image/jpeg";

  if (!handle || !shortcode) return err("handle and shortcode are required");

  // Check if this specific slide already exists
  const existing = await db.referencePost.findUnique({
    where: { shortcode_carouselIndex: { shortcode, carouselIndex } },
  });
  if (existing) {
    return NextResponse.json({ ok: true, alreadySaved: true, s3Key: existing.s3Key });
  }

  // Build S3 key
  const ext = mediaType === "video" ? "mp4" : "jpg";
  const s3Key = `reference-dataset/${handle}/${shortcode}-${carouselIndex}.${ext}`;

  // Get presigned PUT URL
  const uploadUrl = await getPresignedPutUrl(s3Key, mimeType);

  return NextResponse.json({ ok: true, uploadUrl, s3Key });
}

async function handleConfirmPost(body: Record<string, unknown>) {
  const handle = (body.handle as string)?.replace(/^@/, "").trim();
  const shortcode = body.shortcode as string;
  const carouselIndex = (body.carouselIndex as number) ?? 0;
  const s3Key = body.s3Key as string;

  if (!handle || !shortcode || !s3Key) {
    return err("handle, shortcode, and s3Key are required");
  }

  // Ensure account exists
  let account = await db.referenceAccount.findUnique({ where: { handle } });
  if (!account) {
    account = await db.referenceAccount.create({ data: { handle } });
  }

  const post = await db.referencePost.upsert({
    where: { shortcode_carouselIndex: { shortcode, carouselIndex } },
    create: {
      accountId: account.id,
      shortcode,
      postUrl: (body.postUrl as string) || `https://instagram.com/p/${shortcode}/`,
      s3Key,
      mediaType: (body.mediaType as string) || "image",
      width: (body.width as number) || null,
      height: (body.height as number) || null,
      caption: (body.caption as string) || null,
      carouselIndex,
    },
    update: {
      s3Key,
      width: (body.width as number) || undefined,
      height: (body.height as number) || undefined,
    },
  });

  return NextResponse.json({ ok: true, postId: post.id });
}

async function handleCheckPost(body: Record<string, unknown>) {
  const shortcode = body.shortcode as string;
  if (!shortcode) return err("shortcode is required");

  const posts = await db.referencePost.findMany({
    where: { shortcode },
    select: { carouselIndex: true },
  });

  return NextResponse.json({
    saved: posts.length > 0,
    savedIndexes: posts.map((p) => p.carouselIndex),
  });
}
```

- [ ] **Step 2: Add REFERENCE_API_KEY to .env.local**

```bash
echo 'REFERENCE_API_KEY=ref-collector-dev-key-change-me' >> .env.local
```

- [ ] **Step 3: Verify the app still builds**

```bash
pnpm build 2>&1 | tail -5
```

- [ ] **Step 4: Test the API route with curl**

Start the dev server and test:

```bash
# Test saveAccount
curl -s -X POST http://localhost:3000/api/reference \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ref-collector-dev-key-change-me" \
  -d '{"action":"saveAccount","handle":"test_account","name":"Test","followers":1000}' | jq .

# Expected: { "ok": true, "accountId": "...", "isNew": true }

# Test checkPost (nothing saved yet)
curl -s -X POST http://localhost:3000/api/reference \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ref-collector-dev-key-change-me" \
  -d '{"action":"checkPost","shortcode":"ABC123"}' | jq .

# Expected: { "saved": false, "savedIndexes": [] }

# Test auth failure
curl -s -X POST http://localhost:3000/api/reference \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer wrong-key" \
  -d '{"action":"checkPost","shortcode":"ABC123"}' | jq .

# Expected: { "ok": false, "error": "Unauthorized" }
```

- [ ] **Step 5: Commit**

```bash
git add src/app/api/reference/route.ts
git commit -m "feat: add /api/reference route for collection extension"
```

---

## Task 4: Fork Extension + Strip Skool

**Files:**
- Create: `tools/chrome-extension/` (multiple files)

- [ ] **Step 1: Copy extension files from ai-creator-mgmt**

```bash
mkdir -p tools/chrome-extension/icons
cp /Users/camcurry/projects/ai-creator-mgmt/chrome-extension/content-instagram.js tools/chrome-extension/
cp /Users/camcurry/projects/ai-creator-mgmt/chrome-extension/interceptor-instagram.js tools/chrome-extension/
cp /Users/camcurry/projects/ai-creator-mgmt/chrome-extension/injector-instagram.js tools/chrome-extension/
cp /Users/camcurry/projects/ai-creator-mgmt/chrome-extension/background.js tools/chrome-extension/
cp /Users/camcurry/projects/ai-creator-mgmt/chrome-extension/popup.html tools/chrome-extension/
cp /Users/camcurry/projects/ai-creator-mgmt/chrome-extension/popup.js tools/chrome-extension/
cp /Users/camcurry/projects/ai-creator-mgmt/chrome-extension/options.html tools/chrome-extension/
cp /Users/camcurry/projects/ai-creator-mgmt/chrome-extension/options.js tools/chrome-extension/
cp /Users/camcurry/projects/ai-creator-mgmt/chrome-extension/toast.css tools/chrome-extension/
cp /Users/camcurry/projects/ai-creator-mgmt/chrome-extension/icons/icon48.png tools/chrome-extension/icons/
```

Do NOT copy: `content-skool.js`, `injector.js`, `interceptor.js`, `fmp4-mux.js`

- [ ] **Step 2: Create cleaned manifest.json**

Write `tools/chrome-extension/manifest.json`:

```json
{
  "manifest_version": 3,
  "name": "Reference Collector",
  "version": "1.0.0",
  "description": "Collect Instagram reference photos for AI creator library.",
  "permissions": [
    "storage",
    "activeTab",
    "scripting",
    "downloads"
  ],
  "host_permissions": [
    "https://*.instagram.com/*",
    "https://*.cdninstagram.com/*",
    "https://*.fbcdn.net/*",
    "https://*.fna.fbcdn.net/*",
    "http://localhost:3000/*",
    "https://*.amazonaws.com/*"
  ],
  "background": {
    "service_worker": "background.js"
  },
  "content_scripts": [
    {
      "matches": ["https://*.instagram.com/*"],
      "js": ["injector-instagram.js"],
      "run_at": "document_start"
    },
    {
      "matches": ["https://*.instagram.com/*"],
      "js": ["content-instagram.js"],
      "css": ["toast.css"],
      "run_at": "document_idle"
    }
  ],
  "action": {
    "default_popup": "popup.html",
    "default_icon": {
      "48": "icons/icon48.png"
    }
  },
  "options_ui": {
    "page": "options.html",
    "open_in_tab": true
  },
  "web_accessible_resources": [
    {
      "resources": ["interceptor-instagram.js"],
      "matches": ["https://*.instagram.com/*"]
    }
  ],
  "icons": {
    "48": "icons/icon48.png",
    "128": "icons/icon48.png"
  }
}
```

- [ ] **Step 3: Commit the raw fork**

```bash
git add tools/chrome-extension/
git commit -m "feat: fork chrome extension, strip Skool files"
```

---

## Task 5: Extension — Interceptor Full Rewrite

**Files:**
- Rewrite: `tools/chrome-extension/interceptor-instagram.js`

- [ ] **Step 1: Rewrite interceptor-instagram.js with carousel support**

Full rewrite of the interceptor. Key changes from the source:
- Added `edge_sidecar_to_children` walking for carousel posts
- Added `carouselIndex` to all extracted items
- Fixed `bridgeToContentScript` dedup to include `carouselIndex` (source version would drop carousel slides that share the same `code + type`)

```javascript
// Runs in PAGE context — intercepts fetch/XHR to capture Instagram video & image URLs
// Each captured item includes the post shortcode and carouselIndex so the content script
// can match the correct media to the post the user is viewing.
(function () {
  "use strict";
  const KEY = "__mc_ig_media";
  window[KEY] = window[KEY] || [];

  function isGraphQL(url) {
    return url.includes("/api/graphql") || url.includes("/graphql/query");
  }

  function decodeIfBase64(text) {
    if (!text || text.length < 10) return text;
    if (/^eyJ[A-Za-z0-9+/=]/.test(text.trim())) {
      try { return atob(text.trim()); } catch {}
    }
    return text;
  }

  function extractMediaItems(text) {
    const decoded = decodeIfBase64(text);
    const items = [];
    const seenCodes = new Set();
    try {
      const json = JSON.parse(decoded);
      walkForMedia(json, items, seenCodes);
    } catch {
      regexFallback(decoded, items, seenCodes);
    }
    return items;
  }

  function walkForMedia(obj, items, seenCodes) {
    if (!obj || typeof obj !== "object") return;

    if (typeof obj.code === "string" && obj.code.length > 3) {
      const code = obj.code;
      const pk = obj.pk || obj.id || null;
      const username = obj.user?.username || null;
      const caption = obj.caption?.text || null;

      // Extract audio/music metadata
      let audio = null;
      const musicAsset = obj.music_metadata?.music_info?.music_asset_info
        || obj.clips_metadata?.music_info?.music_asset_info
        || obj.music_metadata?.music_asset_info;
      const originalSound = obj.clips_metadata?.original_sound_info
        || obj.original_sound_info;
      const clipsAttr = obj.clips_music_attribution_info;
      if (musicAsset) {
        audio = {
          title: musicAsset.title || musicAsset.song_name || musicAsset.display_name || null,
          artist: musicAsset.display_artist || musicAsset.artist_name || musicAsset.subtitle || null,
          audioId: musicAsset.audio_cluster_id || musicAsset.audio_id || null,
        };
      } else if (originalSound) {
        audio = {
          title: originalSound.original_audio_title || null,
          artist: originalSound.ig_artist?.username || null,
          audioId: originalSound.audio_asset_id || null,
        };
      } else if (clipsAttr) {
        audio = {
          title: clipsAttr.song_name || null,
          artist: clipsAttr.artist_name || null,
          audioId: clipsAttr.audio_id || null,
        };
      }
      if (audio && !audio.title && !audio.artist) audio = null;

      // Handle carousel posts (edge_sidecar_to_children)
      const sidecar = obj.edge_sidecar_to_children?.edges;
      if (Array.isArray(sidecar) && sidecar.length > 0) {
        for (let ci = 0; ci < sidecar.length; ci++) {
          const child = sidecar[ci]?.node;
          if (!child) continue;

          if (child.video_url && !seenCodes.has(code + "_carousel_video_" + ci)) {
            seenCodes.add(code + "_carousel_video_" + ci);
            const url = cleanUrl(child.video_url);
            if (isCdnUrl(url)) {
              items.push({ url, type: "video", code, pk, username, caption, audio, carouselIndex: ci, width: child.dimensions?.width || 0, height: child.dimensions?.height || 0 });
            }
          } else if (child.display_url && !seenCodes.has(code + "_carousel_image_" + ci)) {
            seenCodes.add(code + "_carousel_image_" + ci);
            const url = cleanUrl(child.display_url);
            if (isCdnUrl(url)) {
              items.push({ url, type: "image", code, pk, username, caption, audio, carouselIndex: ci, width: child.dimensions?.width || 0, height: child.dimensions?.height || 0 });
            }
          }

          // Also check private API format within carousel children
          if (Array.isArray(child.video_versions) && child.video_versions.length > 0 && !seenCodes.has(code + "_carousel_pv_" + ci)) {
            seenCodes.add(code + "_carousel_pv_" + ci);
            const versions = child.video_versions;
            let best = versions.find((v) => v.type === 104) || versions.find((v) => v.type === 101) || versions[0];
            if (best?.url) {
              const url = cleanUrl(best.url);
              if (isCdnUrl(url)) items.push({ url, type: "video", code, pk, username, caption, audio, carouselIndex: ci, width: best.width || 0, height: best.height || 0 });
            }
          } else if (child.image_versions2?.candidates && !seenCodes.has(code + "_carousel_pi_" + ci)) {
            seenCodes.add(code + "_carousel_pi_" + ci);
            const candidates = [...child.image_versions2.candidates].sort((a, b) => (b.width || 0) - (a.width || 0));
            if (candidates[0]?.url) {
              const url = cleanUrl(candidates[0].url);
              if (isCdnUrl(url)) items.push({ url, type: "image", code, pk, username, caption, audio, carouselIndex: ci, width: candidates[0].width || 0, height: candidates[0].height || 0 });
            }
          }
        }
        // If we found carousel items, skip the single-post extraction below
        // (the parent object's video_url/display_url is often the first slide duplicated)
      } else {
        // Single post — not a carousel
        if (Array.isArray(obj.video_versions) && obj.video_versions.length > 0 && !seenCodes.has(code + "_video")) {
          seenCodes.add(code + "_video");
          const versions = obj.video_versions;
          let best = versions.find((v) => v.type === 104) || versions.find((v) => v.type === 101) || versions[0];
          if (best?.url) {
            const url = cleanUrl(best.url);
            if (isCdnUrl(url)) items.push({ url, type: "video", code, pk, username, caption, audio, carouselIndex: 0, width: best.width || 0, height: best.height || 0 });
          }
        }

        if (obj.image_versions2?.candidates && !seenCodes.has(code + "_image")) {
          seenCodes.add(code + "_image");
          const candidates = [...obj.image_versions2.candidates].sort((a, b) => (b.width || 0) - (a.width || 0));
          if (candidates[0]?.url) {
            const url = cleanUrl(candidates[0].url);
            if (isCdnUrl(url)) items.push({ url, type: "image", code, pk, username, caption, audio, carouselIndex: 0, width: candidates[0].width || 0, height: candidates[0].height || 0 });
          }
        }

        if (typeof obj.video_url === "string" && obj.video_url && !seenCodes.has(code + "_legacy")) {
          seenCodes.add(code + "_legacy");
          const url = cleanUrl(obj.video_url);
          if (isCdnUrl(url)) items.push({ url, type: "video", code, pk, username, caption, audio, carouselIndex: 0, width: 0, height: 0 });
        }
      }
    }

    // Recurse
    if (Array.isArray(obj)) {
      for (const item of obj) walkForMedia(item, items, seenCodes);
    } else {
      for (const key of Object.keys(obj)) {
        if (typeof obj[key] === "object" && obj[key] !== null) walkForMedia(obj[key], items, seenCodes);
      }
    }
  }

  function regexFallback(text, items, seenCodes) {
    const re = /"video_versions"\s*:\s*(\[[\s\S]*?\])/g;
    let match;
    while ((match = re.exec(text)) !== null) {
      try {
        const versions = JSON.parse(match[1]);
        if (!Array.isArray(versions) || versions.length === 0) continue;
        let best = versions.find((v) => v.type === 104) || versions.find((v) => v.type === 101) || versions[0];
        if (best?.url) {
          const url = cleanUrl(best.url);
          if (isCdnUrl(url)) {
            const nearby = text.substring(Math.max(0, match.index - 500), match.index);
            const codeMatch = nearby.match(/"code"\s*:\s*"([A-Za-z0-9_-]+)"/);
            const code = codeMatch ? codeMatch[1] : null;
            items.push({ url, type: "video", code, pk: null, username: null, carouselIndex: 0, width: best.width || 0, height: best.height || 0 });
          }
        }
      } catch {}
    }
  }

  function cleanUrl(url) {
    return url.replace(/\\u0026/g, "&").replace(/\\\//g, "/");
  }

  function isCdnUrl(url) {
    return url.includes("cdninstagram.com") || url.includes("fbcdn.net");
  }

  function bridgeToContentScript(items) {
    if (items.length === 0) return;
    const el = document.documentElement;
    const existing = el.getAttribute("data-mc-ig-queue");
    let queue = [];
    try { queue = existing ? JSON.parse(existing) : []; } catch {}

    for (const item of items) {
      // Dedup by code + type + carouselIndex (allows multiple carousel slides)
      const ci = item.carouselIndex ?? 0;
      if (item.code && queue.some((q) => q.code === item.code && q.type === item.type && (q.carouselIndex ?? 0) === ci)) continue;
      // Fallback dedup by URL
      const base = item.url.split("?")[0];
      if (queue.some((q) => q.url.split("?")[0] === base)) continue;

      queue.push({
        url: item.url,
        type: item.type,
        code: item.code,
        pk: item.pk,
        username: item.username,
        caption: item.caption || null,
        audio: item.audio || null,
        width: item.width,
        height: item.height,
        carouselIndex: ci,
        timestamp: Date.now(),
      });
    }

    el.setAttribute("data-mc-ig-queue", JSON.stringify(queue));
    console.log(`[ref-ig] Bridged ${items.length} media (${queue.length} total in queue)`);
  }

  function processResponse(url, text) {
    if (!isGraphQL(url)) return;
    const items = extractMediaItems(text);
    if (items.length > 0) bridgeToContentScript(items);
  }

  const _fetch = window.fetch;
  window.fetch = async function (...args) {
    const resp = await _fetch.apply(this, args);
    try {
      const url = typeof args[0] === "string" ? args[0] : args[0]?.url || "";
      if (isGraphQL(url)) {
        const clone = resp.clone();
        clone.text().then((text) => processResponse(url, text)).catch(() => {});
      }
    } catch {}
    return resp;
  };

  const _open = XMLHttpRequest.prototype.open;
  const _send = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.open = function (method, url, ...rest) {
    this.__mc_url = url;
    return _open.call(this, method, url, ...rest);
  };
  XMLHttpRequest.prototype.send = function (...args) {
    this.addEventListener("load", function () {
      try {
        if (this.__mc_url && isGraphQL(this.__mc_url)) {
          processResponse(this.__mc_url, this.responseText);
        }
      } catch {}
    });
    return _send.apply(this, args);
  };

  setTimeout(() => {
    const scripts = document.querySelectorAll("script:not([src])");
    for (const s of scripts) {
      const text = s.textContent || "";
      if (text.includes("video_versions") || text.includes("video_url") || text.includes("edge_sidecar_to_children")) {
        const items = extractMediaItems(text);
        if (items.length > 0) bridgeToContentScript(items);
      }
    }
    const ogVideo = document.querySelector('meta[property="og:video"]');
    if (ogVideo?.content) {
      const code = window.location.pathname.match(/\/(p|reel|reels)\/([A-Za-z0-9_-]+)/)?.[2] || null;
      bridgeToContentScript([{ url: ogVideo.content, type: "video", code, pk: null, username: null, carouselIndex: 0, width: 0, height: 0 }]);
    }
  }, 1500);
})();
```

- [ ] **Step 2: Commit**

```bash
git add tools/chrome-extension/interceptor-instagram.js
git commit -m "feat: rewrite interceptor with carousel support"
```

---

## Task 6: Extension — Background Service Worker

**Files:**
- Modify: `tools/chrome-extension/background.js`

- [ ] **Step 1: Strip old platform handlers and Skool code**

Rewrite `tools/chrome-extension/background.js`. Keep the proven download/fetch infrastructure, remove Skool and old platform code, add new reference collection handlers:

```javascript
// Background service worker for Reference Collector
// Handles API calls to /api/reference and media downloads

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === "refSaveAccount") {
    handleRefApiCall(msg.data).then(sendResponse).catch((e) => sendResponse({ ok: false, error: e.message }));
    return true;
  }
  if (msg.type === "refSavePost") {
    handleRefApiCall(msg.data).then(sendResponse).catch((e) => sendResponse({ ok: false, error: e.message }));
    return true;
  }
  if (msg.type === "refConfirmPost") {
    handleRefApiCall(msg.data).then(sendResponse).catch((e) => sendResponse({ ok: false, error: e.message }));
    return true;
  }
  if (msg.type === "refCheckPost") {
    handleRefApiCall(msg.data).then(sendResponse).catch((e) => sendResponse({ ok: false, error: e.message }));
    return true;
  }
  if (msg.type === "refUploadToS3") {
    handleS3Upload(msg.uploadUrl, msg.blob, msg.mimeType)
      .then(sendResponse)
      .catch((e) => sendResponse({ ok: false, error: e.message }));
    return true;
  }
  if (msg.type === "fetchBlob") {
    handleFetchBlob(msg.url).then(sendResponse).catch((e) => sendResponse({ error: e.message }));
    return true;
  }
  if (msg.type === "fetchIgMedia") {
    handleFetchIgMedia(msg.shortcode).then(sendResponse).catch((e) => sendResponse({ items: [], error: e.message }));
    return true;
  }
  if (msg.type === "getSettings") {
    getSettings().then(sendResponse).catch(() => sendResponse({}));
    return true;
  }
  if (msg.type === "updateBadge") {
    setBadge(msg.count);
    return false;
  }
  return false;
});

// ── Reference API calls ──────────────────────────────────────────────
async function handleRefApiCall(data) {
  const settings = await getSettings();
  if (!settings.apiUrl || !settings.apiKey) {
    return { ok: false, error: "API not configured — go to extension settings" };
  }
  const endpoint = `${settings.apiUrl.replace(/\/+$/, "")}/api/reference`;
  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${settings.apiKey}`,
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const text = await res.text();
    return { ok: false, error: `Server error ${res.status}: ${text}` };
  }
  return await res.json();
}

// ── S3 Upload ────────────────────────────────────────────────────────
async function handleS3Upload(uploadUrl, dataUri, mimeType) {
  const [header, b64] = dataUri.split(",");
  const mime = mimeType || header.match(/:(.*?);/)?.[1] || "application/octet-stream";
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  const blob = new Blob([bytes], { type: mime });

  const res = await fetch(uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": mime },
    body: blob,
  });
  if (!res.ok) return { ok: false, error: `S3 upload failed: ${res.status}` };
  return { ok: true };
}

// ── Fetch blob via background (CORS bypass) ──────────────────────────
async function handleFetchBlob(url) {
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`Fetch failed: ${resp.status}`);
  const blob = await resp.blob();
  if (blob.size > 100 * 1024 * 1024) throw new Error("File too large (>100MB)");
  const reader = new FileReader();
  return new Promise((resolve, reject) => {
    reader.onload = () => resolve({ dataUri: reader.result, size: blob.size, type: blob.type });
    reader.onerror = () => reject(new Error("FileReader failed"));
    reader.readAsDataURL(blob);
  });
}

// ── Instagram media fetch by shortcode ───────────────────────────────
async function handleFetchIgMedia(shortcode) {
  if (!shortcode) return { items: [] };

  // Method 1: GraphQL
  try {
    const variables = JSON.stringify({ shortcode, child_comment_count: 0, fetch_comment_count: 0, parent_comment_count: 0, has_threaded_comments: false });
    const url = `https://www.instagram.com/graphql/query/?query_hash=477b65a610463740ccdb83135b2014db&variables=${encodeURIComponent(variables)}`;
    const resp = await fetch(url, { credentials: "include" });
    if (resp.ok) {
      const text = await resp.text();
      if (text.startsWith("{")) {
        const json = JSON.parse(text);
        const media = json?.data?.shortcode_media;
        if (media) return { items: extractFromGraphQLMedia(media, shortcode) };
      }
    }
  } catch (e) {
    console.warn("[bg] GraphQL method failed:", e.message);
  }

  // Method 2: Private API
  try {
    const pk = shortcodeToPk(shortcode);
    if (pk) {
      const url = `https://i.instagram.com/api/v1/media/${pk}/info/`;
      const resp = await fetch(url, {
        credentials: "include",
        headers: { "X-IG-App-ID": "936619743392459", "X-Requested-With": "XMLHttpRequest" },
      });
      if (resp.ok) {
        const text = await resp.text();
        if (text.startsWith("{")) {
          const json = JSON.parse(text);
          const item = json?.items?.[0];
          if (item) return { items: extractFromPrivateApiMedia(item, shortcode) };
        }
      }
    }
  } catch (e) {
    console.warn("[bg] Private API method failed:", e.message);
  }

  return { items: [] };
}

function extractFromGraphQLMedia(media, shortcode) {
  const items = [];
  const caption = media.edge_media_to_caption?.edges?.[0]?.node?.text || null;
  const username = media.owner?.username || null;

  // Check for carousel
  const sidecar = media.edge_sidecar_to_children?.edges;
  if (Array.isArray(sidecar) && sidecar.length > 0) {
    sidecar.forEach((edge, ci) => {
      const node = edge?.node;
      if (!node) return;
      if (node.video_url) {
        items.push({ url: node.video_url, type: "video", code: shortcode, username, caption, carouselIndex: ci, width: node.dimensions?.width || 0, height: node.dimensions?.height || 0 });
      } else if (node.display_url) {
        items.push({ url: node.display_url, type: "image", code: shortcode, username, caption, carouselIndex: ci, width: node.dimensions?.width || 0, height: node.dimensions?.height || 0 });
      }
    });
    return items;
  }

  // Single post
  if (media.video_url) {
    items.push({ url: media.video_url, type: "video", code: shortcode, username, caption, carouselIndex: 0, width: media.dimensions?.width || 0, height: media.dimensions?.height || 0 });
  } else if (media.display_url) {
    items.push({ url: media.display_url, type: "image", code: shortcode, username, caption, carouselIndex: 0, width: media.dimensions?.width || 0, height: media.dimensions?.height || 0 });
  }
  return items;
}

function extractFromPrivateApiMedia(item, shortcode) {
  const items = [];
  const caption = item.caption?.text || null;
  const username = item.user?.username || null;

  // Check for carousel
  const carousel = item.carousel_media;
  if (Array.isArray(carousel) && carousel.length > 0) {
    carousel.forEach((child, ci) => {
      if (child.video_versions?.length > 0) {
        const sorted = [...child.video_versions].sort((a, b) => (b.width || 0) - (a.width || 0));
        items.push({ url: sorted[0].url, type: "video", code: shortcode, username, caption, carouselIndex: ci, width: sorted[0].width || 0, height: sorted[0].height || 0 });
      } else if (child.image_versions2?.candidates?.length > 0) {
        const sorted = [...child.image_versions2.candidates].sort((a, b) => (b.width || 0) - (a.width || 0));
        items.push({ url: sorted[0].url, type: "image", code: shortcode, username, caption, carouselIndex: ci, width: sorted[0].width || 0, height: sorted[0].height || 0 });
      }
    });
    return items;
  }

  // Single post
  if (item.video_versions?.length > 0) {
    const sorted = [...item.video_versions].sort((a, b) => (b.width || 0) - (a.width || 0));
    items.push({ url: sorted[0].url, type: "video", code: shortcode, username, caption, carouselIndex: 0, width: sorted[0].width || 0, height: sorted[0].height || 0 });
  } else if (item.image_versions2?.candidates?.length > 0) {
    const sorted = [...item.image_versions2.candidates].sort((a, b) => (b.width || 0) - (a.width || 0));
    items.push({ url: sorted[0].url, type: "image", code: shortcode, username, caption, carouselIndex: 0, width: sorted[0].width || 0, height: sorted[0].height || 0 });
  }
  return items;
}

function shortcodeToPk(shortcode) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
  let pk = BigInt(0);
  for (const ch of shortcode) {
    const idx = alphabet.indexOf(ch);
    if (idx < 0) return null;
    pk = pk * BigInt(64) + BigInt(idx);
  }
  return pk.toString();
}

// ── Settings ─────────────────────────────────────────────────────────
async function getSettings() {
  const { refSettings = {} } = await chrome.storage.local.get("refSettings");
  return {
    apiUrl: refSettings.apiUrl || "http://localhost:3000",
    apiKey: refSettings.apiKey || "",
  };
}

function setBadge(count) {
  chrome.action.setBadgeText({ text: count > 0 ? String(count) : "" });
  chrome.action.setBadgeBackgroundColor({ color: "#4361ee" });
}
```

- [ ] **Step 2: Commit**

```bash
git add tools/chrome-extension/background.js
git commit -m "feat: rewrite background.js for reference collection"
```

---

## Task 7: Extension — Content Script (Profile Page + Save Flow)

**Files:**
- Modify: `tools/chrome-extension/content-instagram.js`

- [ ] **Step 1: Rewrite content-instagram.js**

Replace the full file. Keeps the interceptor bridge and media extraction, adds profile page detection, rewires save flow:

```javascript
// Content script for Reference Collector
// Profile page: "Add to Collection" button saves account metadata
// Post page: "Save" button downloads full-res images to S3

let lastUrl = window.location.href;
const __mc_ig_media = [];
const __mc_saved_codes = new Map(); // shortcode -> Set of saved carouselIndexes
let __mc_saving = false;

// ── Bridge from page-context interceptor ──────────────────────────────
function processMediaQueue() {
  const el = document.documentElement;
  const raw = el.getAttribute("data-mc-ig-queue");
  if (!raw) return;
  el.removeAttribute("data-mc-ig-queue");
  try {
    const queue = JSON.parse(raw);
    if (!Array.isArray(queue)) return;
    for (const item of queue) {
      if (!item?.url) continue;
      const base = item.url.split("?")[0];
      if (__mc_ig_media.some((m) => m.url.split("?")[0] === base)) continue;
      __mc_ig_media.push(item);
      console.log(`[ref] Captured ${item.type} [${item.code || "?"}] ci=${item.carouselIndex ?? 0}: ${item.url.substring(0, 80)}...`);
    }
  } catch {}
}

processMediaQueue();
const igObserver = new MutationObserver(() => processMediaQueue());
igObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["data-mc-ig-queue"] });

// ── Init ──────────────────────────────────────────────────────────────
function init() {
  updateUI();
  setInterval(() => {
    if (window.location.href !== lastUrl) {
      lastUrl = window.location.href;
      updateUI();
    }
  }, 300);
}

// ── Page Type Detection ───────────────────────────────────────────────
function getPageType() {
  const path = window.location.pathname;
  if (/^\/(p|reel|reels)\//.test(path)) return "post";
  // Profile page: /{username}/ but not system pages
  const systemPages = ["explore", "direct", "accounts", "stories", "reels", "about", "session", "emails", "privacy"];
  const match = path.match(/^\/([^/?]+)\/?$/);
  if (match && !systemPages.includes(match[1])) return "profile";
  return "other";
}

function updateUI() {
  const pageType = getPageType();
  // Remove existing buttons
  document.getElementById("mc-ig-float-btn")?.remove();
  document.getElementById("mc-ig-profile-btn")?.remove();

  if (pageType === "post") {
    showPostButton();
  } else if (pageType === "profile") {
    showProfileButton();
  }
}

// ── Profile Page: Add to Collection ───────────────────────────────────
function showProfileButton() {
  const btn = document.createElement("button");
  btn.id = "mc-ig-profile-btn";
  btn.className = "mc-save-btn";
  btn.textContent = "Add to Collection";
  btn.style.cssText = "position:fixed;bottom:24px;left:24px;z-index:2147483647;padding:10px 18px;font-size:14px;box-shadow:0 4px 20px rgba(0,0,0,0.3);background:#4361ee;color:#fff;border:none;border-radius:10px;cursor:pointer;font-weight:600;";
  btn.addEventListener("click", () => handleSaveAccount(btn));
  document.body.appendChild(btn);
}

async function handleSaveAccount(btn) {
  btn.disabled = true;
  btn.textContent = "Saving...";
  btn.style.background = "#e6a817";

  const metadata = scrapeProfileMetadata();
  if (!metadata.handle) {
    btn.textContent = "Could not detect account";
    btn.style.background = "#e63946";
    setTimeout(() => { btn.textContent = "Add to Collection"; btn.style.background = "#4361ee"; btn.disabled = false; }, 3000);
    return;
  }

  try {
    const result = await chrome.runtime.sendMessage({
      type: "refSaveAccount",
      data: { action: "saveAccount", ...metadata },
    });
    if (result?.ok) {
      btn.textContent = result.isNew ? "Added!" : "Updated!";
      btn.style.background = "#06d6a0";
      showToast(`${metadata.handle} added to collection`);
    } else {
      throw new Error(result?.error || "Save failed");
    }
  } catch (err) {
    btn.textContent = "Error";
    btn.style.background = "#e63946";
    showToast(`Error: ${err.message}`);
  }
  setTimeout(() => { btn.textContent = "Add to Collection"; btn.style.background = "#4361ee"; btn.disabled = false; }, 3000);
}

function scrapeProfileMetadata() {
  const handle = window.location.pathname.replace(/^\/|\/$/g, "");
  const metadata = { handle, name: null, bio: null, followers: null, following: null, postCount: null, profilePicUrl: null };

  // Display name from header
  try {
    const nameEl = document.querySelector("header h2") || document.querySelector('header span[dir="auto"]');
    if (nameEl) metadata.name = nameEl.textContent.trim();
  } catch {}

  // Bio
  try {
    const bioEl = document.querySelector("header section > div:last-child > span") || document.querySelector('div[role="presentation"] span');
    // Instagram puts bio in a -webkit-line-clamp container
    const candidates = document.querySelectorAll("header span");
    for (const el of candidates) {
      const text = el.textContent?.trim();
      if (text && text.length > 20 && text !== metadata.name && !text.includes("followers")) {
        metadata.bio = text;
        break;
      }
    }
  } catch {}

  // Stats (followers, following, posts)
  try {
    const statLinks = document.querySelectorAll("header ul li, header section ul li");
    for (const li of statLinks) {
      const text = li.textContent?.toLowerCase() || "";
      const numMatch = text.match(/([\d,.]+[kmb]?)\s*(posts?|followers?|following)/);
      if (numMatch) {
        const val = parseStatNumber(numMatch[1]);
        if (numMatch[2].startsWith("post")) metadata.postCount = val;
        else if (numMatch[2] === "following") metadata.following = val;
        else if (numMatch[2].startsWith("follower")) metadata.followers = val;
      }
    }
  } catch {}

  // Profile pic
  try {
    const img = document.querySelector('header img[alt*="profile"]') || document.querySelector("header img");
    if (img?.src && !img.src.includes("s44x44") && !img.src.includes("s32x32")) {
      metadata.profilePicUrl = img.src;
    }
  } catch {}

  return metadata;
}

function parseStatNumber(str) {
  str = str.replace(/,/g, "");
  const multipliers = { k: 1000, m: 1000000, b: 1000000000 };
  const match = str.match(/([\d.]+)([kmb])?/i);
  if (!match) return null;
  let num = parseFloat(match[1]);
  if (match[2]) num *= multipliers[match[2].toLowerCase()] || 1;
  return Math.round(num);
}

// ── Post Page: Save Button ────────────────────────────────────────────
async function showPostButton() {
  const shortcode = getCurrentShortcode();
  if (!shortcode) return;

  const btn = document.createElement("button");
  btn.id = "mc-ig-float-btn";
  btn.className = "mc-save-btn";
  btn.style.cssText = "position:fixed;bottom:24px;left:24px;z-index:2147483647;padding:10px 18px;font-size:14px;box-shadow:0 4px 20px rgba(0,0,0,0.3);background:#4361ee;color:#fff;border:none;border-radius:10px;cursor:pointer;font-weight:600;";
  btn.textContent = "Save";
  btn.disabled = true;
  document.body.appendChild(btn);

  // Check if already saved
  try {
    const check = await chrome.runtime.sendMessage({
      type: "refCheckPost",
      data: { action: "checkPost", shortcode },
    });
    if (check?.saved) {
      __mc_saved_codes.set(shortcode, new Set(check.savedIndexes));
      btn.textContent = `Saved (${check.savedIndexes.length})`;
      btn.style.background = "#06d6a0";
      btn.style.opacity = "0.85";
      // Still allow re-save (might have new carousel slides)
    }
  } catch {}

  btn.disabled = false;
  if (btn.textContent === "Save") btn.textContent = "Save to Collection";
  btn.addEventListener("click", () => handleSavePost(btn));
}

async function handleSavePost(btn) {
  const shortcode = getCurrentShortcode();
  if (!shortcode) return;

  __mc_saving = true;
  btn.disabled = true;
  btn.textContent = "Finding media...";
  btn.style.background = "#e6a817";

  const handle = extractUsernameFromPage();
  const mediaItems = await extractMediaForPage();

  if (mediaItems.length === 0) {
    btn.textContent = "No media found";
    btn.style.background = "#e63946";
    showToast("No media found. Try scrolling the carousel, then click Save.");
    setTimeout(() => { __mc_saving = false; updateUI(); }, 3000);
    return;
  }

  // Filter out already-saved carousel slides
  const savedSet = __mc_saved_codes.get(shortcode) || new Set();
  const toSave = mediaItems.filter((m) => !savedSet.has(m.carouselIndex ?? 0));

  if (toSave.length === 0) {
    btn.textContent = "Already saved";
    btn.style.background = "#06d6a0";
    showToast("All slides already saved!");
    __mc_saving = false;
    return;
  }

  let saved = 0;
  let failed = 0;

  for (let i = 0; i < toSave.length; i++) {
    const item = toSave[i];
    const ci = item.carouselIndex ?? 0;
    btn.textContent = `Saving ${i + 1}/${toSave.length}...`;

    try {
      // Step 1: Get presigned URL
      const saveRes = await chrome.runtime.sendMessage({
        type: "refSavePost",
        data: {
          action: "savePost",
          handle: handle || "unknown",
          shortcode,
          carouselIndex: ci,
          mediaType: item.type,
          width: item.width || null,
          height: item.height || null,
          caption: item.caption || null,
          mimeType: item.type === "video" ? "video/mp4" : "image/jpeg",
        },
      });

      if (saveRes?.alreadySaved) {
        saved++;
        continue;
      }
      if (!saveRes?.ok || !saveRes?.uploadUrl) {
        throw new Error(saveRes?.error || "No upload URL");
      }

      // Step 2: Download the media
      btn.textContent = `Downloading ${i + 1}/${toSave.length}...`;
      const blob = await downloadMediaAsDataUri(item);
      if (!blob) throw new Error("Download failed");

      // Step 3: Upload to S3
      btn.textContent = `Uploading ${i + 1}/${toSave.length}...`;
      const uploadRes = await chrome.runtime.sendMessage({
        type: "refUploadToS3",
        uploadUrl: saveRes.uploadUrl,
        blob: blob.dataUri,
        mimeType: item.type === "video" ? "video/mp4" : "image/jpeg",
      });
      if (!uploadRes?.ok) throw new Error(uploadRes?.error || "Upload failed");

      // Step 4: Confirm
      const confirmRes = await chrome.runtime.sendMessage({
        type: "refConfirmPost",
        data: {
          action: "confirmPost",
          handle: handle || "unknown",
          shortcode,
          carouselIndex: ci,
          s3Key: saveRes.s3Key,
          mediaType: item.type,
          width: item.width || null,
          height: item.height || null,
          caption: item.caption || null,
          postUrl: window.location.href,
        },
      });
      if (!confirmRes?.ok) throw new Error(confirmRes?.error || "Confirm failed");

      saved++;
      if (!__mc_saved_codes.has(shortcode)) __mc_saved_codes.set(shortcode, new Set());
      __mc_saved_codes.get(shortcode).add(ci);
    } catch (err) {
      console.error(`[ref] Failed to save slide ${ci}:`, err);
      failed++;
    }
  }

  __mc_saving = false;

  if (saved > 0) {
    const totalSaved = (__mc_saved_codes.get(shortcode)?.size) || saved;
    btn.textContent = `Saved (${totalSaved})`;
    btn.style.background = "#06d6a0";
    showToast(`Saved ${saved} image(s)${failed > 0 ? ` (${failed} failed)` : ""}`);
  } else {
    btn.textContent = "Save failed";
    btn.style.background = "#e63946";
    showToast(`Failed to save. ${failed} item(s) failed.`);
    setTimeout(() => updateUI(), 3000);
  }
}

async function downloadMediaAsDataUri(item) {
  let url = item.url;
  url = url.replace(/[&?]bytestart=\d+/, "").replace(/[&?]byteend=\d+/, "");
  url = url.replace(/\?&/, "?").replace(/\?$/, "");

  try {
    // Try direct fetch first
    const resp = await fetch(url);
    if (resp.ok) {
      const blob = await resp.blob();
      return await blobToDataUri(blob);
    }
  } catch {}

  // Fallback: fetch via background
  return chrome.runtime.sendMessage({ type: "fetchBlob", url });
}

function blobToDataUri(blob) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve({ dataUri: reader.result, size: blob.size, type: blob.type });
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(blob);
  });
}

// ── Media Extraction ──────────────────────────────────────────────────
async function extractMediaForPage() {
  const shortcode = getCurrentShortcode();
  const items = [];
  const seen = new Set();

  // 1. Check interceptor cache
  let mediaList = findInterceptedMediaForPage();

  // 2. If cache missed, fetch via background
  if (mediaList.length === 0 && shortcode) {
    console.log(`[ref] Cache miss for ${shortcode}, fetching via background...`);
    const fetched = await new Promise((resolve) => {
      chrome.runtime.sendMessage({ type: "fetchIgMedia", shortcode }, (r) => resolve(r?.items || []));
    });
    if (fetched.length > 0) {
      for (const f of fetched) __mc_ig_media.push(f);
      mediaList = fetched;
    }
  }

  for (const m of mediaList) {
    const base = m.url.split("?")[0];
    const dedupKey = `${base}_${m.carouselIndex ?? 0}`;
    if (seen.has(dedupKey)) continue;
    seen.add(dedupKey);
    items.push({
      url: m.url,
      type: m.type,
      code: m.code,
      caption: m.caption || null,
      width: m.width || 0,
      height: m.height || 0,
      carouselIndex: m.carouselIndex ?? 0,
    });
  }

  // 3. Fallback: grab images from DOM
  if (items.length === 0) {
    const scope = document.querySelector("main") || document.body;
    const imgSelector = 'article img[srcset], article img[sizes], [role="presentation"] img[srcset], [role="dialog"] img[srcset]';
    let ci = 0;
    scope.querySelectorAll(imgSelector).forEach((img) => {
      const src = getBestImageSrc(img);
      if (src && !isProfilePic(src) && !isIcon(src) && !seen.has(src.split("?")[0])) {
        seen.add(src.split("?")[0]);
        items.push({ url: src, type: "image", code: shortcode, caption: null, width: 0, height: 0, carouselIndex: ci++ });
      }
    });
  }

  return items;
}

function findInterceptedMediaForPage() {
  const shortcode = getCurrentShortcode();
  if (!shortcode) return [];
  return __mc_ig_media.filter((m) => m.code === shortcode);
}

function getCurrentShortcode() {
  const match = window.location.pathname.match(/\/(p|reel|reels)\/([A-Za-z0-9_-]+)/);
  return match ? match[2] : null;
}

// ── Helpers ───────────────────────────────────────────────────────────
function getBestImageSrc(img) {
  const srcset = img.getAttribute("srcset");
  if (srcset) {
    const sources = srcset.split(",").map((s) => {
      const parts = s.trim().split(/\s+/);
      return { url: parts[0], w: parseInt(parts[1]) || 0 };
    });
    sources.sort((a, b) => b.w - a.w);
    if (sources[0]?.url) return sources[0].url;
  }
  return img.src;
}

function isProfilePic(src) {
  return src.includes("/s150x150/") || src.includes("/s44x44/") || src.includes("/s32x32/") || src.includes("/s64x64/") || src.includes("profile_pic");
}

function isIcon(src) {
  return src.includes("static/images/") || src.includes("/ico/");
}

function extractUsernameFromPage() {
  const ogTitle = document.querySelector('meta[property="og:title"]');
  if (ogTitle?.content) {
    const match = ogTitle.content.match(/@?(\w+)/);
    if (match) return match[1];
  }
  const pathMatch = window.location.pathname.match(/^\/([^/?]+)\/?(?:p|reel)?/);
  if (pathMatch && !["explore", "direct", "accounts", "stories", "reels"].includes(pathMatch[1])) {
    return pathMatch[1];
  }
  return null;
}

function showToast(msg) {
  let t = document.getElementById("mc-toast");
  if (t) t.remove();
  t = document.createElement("div");
  t.id = "mc-toast";
  t.textContent = msg;
  Object.assign(t.style, {
    position: "fixed", bottom: "24px", right: "24px", background: "#1a1a2e", color: "#fff",
    padding: "12px 20px", borderRadius: "10px", fontSize: "14px", zIndex: "2147483647",
    boxShadow: "0 4px 20px rgba(0,0,0,0.4)", transition: "opacity 0.3s", opacity: "0",
  });
  document.body.appendChild(t);
  requestAnimationFrame(() => (t.style.opacity = "1"));
  setTimeout(() => { t.style.opacity = "0"; setTimeout(() => t.remove(), 400); }, 3000);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
```

- [ ] **Step 2: Commit**

```bash
git add tools/chrome-extension/content-instagram.js
git commit -m "feat: rewrite content script for reference collection"
```

---

## Task 8: Extension — Popup + Options

**Files:**
- Modify: `tools/chrome-extension/popup.html`
- Modify: `tools/chrome-extension/popup.js`
- Modify: `tools/chrome-extension/options.html`
- Modify: `tools/chrome-extension/options.js`

- [ ] **Step 1: Rewrite popup.html**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      width: 320px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      background: #0f0f1a;
      color: #e0e0e0;
    }
    .header {
      padding: 12px 16px;
      background: linear-gradient(135deg, #1a1a2e, #16213e);
      border-bottom: 1px solid rgba(255,255,255,0.06);
      display: flex; align-items: center; justify-content: space-between;
    }
    .header h1 { font-size: 14px; font-weight: 700; color: #fff; }
    .header button {
      background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.08);
      color: #aaa; border-radius: 6px; padding: 4px 8px; font-size: 11px; cursor: pointer;
    }
    .header button:hover { background: rgba(255,255,255,0.12); color: #fff; }
    .conn-status {
      margin: 8px 14px; padding: 5px 10px; border-radius: 6px; font-size: 11px;
      display: flex; align-items: center; gap: 6px;
    }
    .conn-status.connected { background: rgba(6,214,160,0.1); color: #06d6a0; }
    .conn-status.disconnected { background: rgba(230,57,70,0.1); color: #e63946; }
    .conn-dot { width: 6px; height: 6px; border-radius: 50%; }
    .connected .conn-dot { background: #06d6a0; }
    .disconnected .conn-dot { background: #e63946; }
    .stats { padding: 12px 14px; display: flex; gap: 10px; }
    .stat-card {
      flex: 1; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06);
      border-radius: 8px; padding: 10px; text-align: center;
    }
    .stat-num { font-size: 22px; font-weight: 700; color: #fff; }
    .stat-label { font-size: 10px; color: #888; margin-top: 2px; }
    .info {
      padding: 8px 14px; font-size: 11px; color: #666; line-height: 1.5;
      margin: 0 14px 12px; background: rgba(255,255,255,0.02); border-radius: 6px;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>Reference Collector</h1>
    <button id="settingsBtn">Settings</button>
  </div>
  <div id="connStatus" class="conn-status disconnected">
    <div class="conn-dot"></div>
    <span id="connText">Checking...</span>
  </div>
  <div class="stats">
    <div class="stat-card"><div class="stat-num" id="accountCount">-</div><div class="stat-label">Accounts</div></div>
    <div class="stat-card"><div class="stat-num" id="postCount">-</div><div class="stat-label">Images</div></div>
  </div>
  <div class="info">
    <strong>Profile page:</strong> Click "Add to Collection" to save account.<br>
    <strong>Post page:</strong> Click "Save" to download images.
  </div>
  <script src="popup.js"></script>
</body>
</html>
```

- [ ] **Step 2: Rewrite popup.js**

```javascript
document.getElementById("settingsBtn").addEventListener("click", () => {
  chrome.runtime.openOptionsPage();
});

async function checkConnection() {
  const connStatus = document.getElementById("connStatus");
  const connText = document.getElementById("connText");

  try {
    const result = await chrome.runtime.sendMessage({
      type: "refCheckPost",
      data: { action: "checkPost", shortcode: "__ping__" },
    });
    // If we get a response (even saved:false), the API is reachable
    if (result && !result.error) {
      connStatus.className = "conn-status connected";
      connText.textContent = "Connected to API";
    } else {
      throw new Error(result?.error || "No response");
    }
  } catch (err) {
    connStatus.className = "conn-status disconnected";
    connText.innerHTML = `Not connected — <a href="#" id="openSettings" style="color:inherit;text-decoration:underline;">configure</a>`;
    document.getElementById("openSettings")?.addEventListener("click", (e) => {
      e.preventDefault();
      chrome.runtime.openOptionsPage();
    });
  }
}

async function loadStats() {
  // We don't have a stats endpoint yet — show "-" for now
  // This can be wired up later with a "getStats" action
  document.getElementById("accountCount").textContent = "-";
  document.getElementById("postCount").textContent = "-";
}

checkConnection();
loadStats();
```

- [ ] **Step 3: Rewrite options.html**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Reference Collector Settings</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      background: #0f0f1a; color: #e0e0e0; padding: 40px;
      max-width: 500px; margin: 0 auto;
    }
    h1 { font-size: 20px; margin-bottom: 24px; color: #fff; }
    label { display: block; font-size: 12px; color: #aaa; margin-bottom: 4px; font-weight: 600; }
    input {
      width: 100%; padding: 8px 12px; background: rgba(255,255,255,0.06);
      border: 1px solid rgba(255,255,255,0.1); border-radius: 8px;
      color: #fff; font-size: 14px; margin-bottom: 16px; outline: none;
    }
    input:focus { border-color: #4361ee; }
    button {
      padding: 8px 20px; background: #4361ee; color: #fff; border: none;
      border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer;
    }
    button:hover { background: #3651d4; }
    .saved { color: #06d6a0; font-size: 12px; margin-left: 10px; opacity: 0; transition: opacity 0.2s; }
    .saved.show { opacity: 1; }
  </style>
</head>
<body>
  <h1>Reference Collector Settings</h1>
  <label>API URL</label>
  <input type="text" id="apiUrl" placeholder="http://localhost:3000">
  <label>API Key</label>
  <input type="text" id="apiKey" placeholder="Your REFERENCE_API_KEY">
  <button id="saveBtn">Save</button>
  <span class="saved" id="savedMsg">Saved!</span>
  <script src="options.js"></script>
</body>
</html>
```

- [ ] **Step 4: Rewrite options.js**

```javascript
const apiUrlInput = document.getElementById("apiUrl");
const apiKeyInput = document.getElementById("apiKey");
const saveBtn = document.getElementById("saveBtn");
const savedMsg = document.getElementById("savedMsg");

// Load saved settings
chrome.storage.local.get("refSettings", ({ refSettings = {} }) => {
  apiUrlInput.value = refSettings.apiUrl || "http://localhost:3000";
  apiKeyInput.value = refSettings.apiKey || "";
});

saveBtn.addEventListener("click", () => {
  const settings = {
    apiUrl: apiUrlInput.value.trim(),
    apiKey: apiKeyInput.value.trim(),
  };
  chrome.storage.local.set({ refSettings: settings }, () => {
    savedMsg.classList.add("show");
    setTimeout(() => savedMsg.classList.remove("show"), 2000);
  });
});
```

- [ ] **Step 5: Commit**

```bash
git add tools/chrome-extension/popup.html tools/chrome-extension/popup.js tools/chrome-extension/options.html tools/chrome-extension/options.js
git commit -m "feat: simplified popup and options for reference collector"
```

---

## Task 9: End-to-End Test

- [ ] **Step 1: Start the dev server**

```bash
pnpm dev
```

- [ ] **Step 2: Load the extension in Chrome**

1. Open `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select `tools/chrome-extension/`

- [ ] **Step 3: Configure the extension**

1. Click the extension icon → Settings
2. Set API URL: `http://localhost:3000`
3. Set API Key: `ref-collector-dev-key-change-me` (or whatever you set in `.env.local`)
4. Save

- [ ] **Step 4: Test account save**

1. Browse to any Instagram profile page
2. Click "Add to Collection" button
3. Verify: button turns green, toast shows "added to collection"
4. Check DB: `pnpx prisma studio` → ReferenceAccount table should have a row

- [ ] **Step 5: Test post save**

1. Click on a post from that account
2. Click "Save to Collection" button
3. Verify: progress indicators show (Finding → Downloading → Uploading)
4. Verify: button turns green with count
5. Check DB: `pnpx prisma studio` → ReferencePost table should have row(s)
6. Check S3: image should exist at `reference-dataset/{handle}/{shortcode}-0.jpg`

- [ ] **Step 6: Test carousel save**

1. Find a post with multiple images (carousel)
2. Click Save
3. Verify: multiple images downloaded and uploaded (count shown on button)
4. Check DB: multiple ReferencePost rows with same shortcode, different carouselIndex

- [ ] **Step 7: Test dedup**

1. Go back to the same post
2. Button should show "Saved (N)" on load
3. Click Save again
4. Should show "Already saved" or skip existing slides

- [ ] **Step 8: Commit any fixes needed from testing**

```bash
git add tools/chrome-extension/ src/app/api/reference/ src/lib/s3.ts
git commit -m "fix: end-to-end test fixes"
```
