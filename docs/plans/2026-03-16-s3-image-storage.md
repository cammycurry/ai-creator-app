# S3 Image Storage Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace base64 data URLs with S3 uploads so generated images are stored properly and served via signed URLs.

**Architecture:** Gemini returns base64 → convert to Buffer → upload to S3 → store S3 key in DB → generate 24hr signed URLs when serving images. Components don't change — they already use `<img src={url}>`.

**Tech Stack:** `@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner`

---

### Task 1: Install AWS SDK

**Files:**
- Modify: `package.json`

**Step 1: Install packages**

Run: `pnpm add @aws-sdk/client-s3 @aws-sdk/s3-request-presigner`

**Step 2: Verify installation**

Run: `pnpm ls @aws-sdk/client-s3 @aws-sdk/s3-request-presigner`
Expected: Both packages listed

**Step 3: Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "feat: add AWS S3 SDK packages"
```

---

### Task 2: Create S3 helper module

**Files:**
- Create: `src/lib/s3.ts`

**Step 1: Create `src/lib/s3.ts`**

```typescript
import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl as awsGetSignedUrl } from "@aws-sdk/s3-request-presigner";

const s3 = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

const BUCKET = process.env.S3_BUCKET_NAME!;
const SIGNED_URL_EXPIRY = 86400; // 24 hours in seconds

export async function uploadImage(
  buffer: Buffer,
  key: string,
  contentType: string = "image/png"
): Promise<string> {
  await s3.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    })
  );
  return key;
}

export async function getSignedImageUrl(key: string): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: BUCKET,
    Key: key,
  });
  return awsGetSignedUrl(s3, command, { expiresIn: SIGNED_URL_EXPIRY });
}
```

**Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: No errors related to s3.ts

**Step 3: Commit**

```bash
git add src/lib/s3.ts
git commit -m "feat: add S3 upload and signed URL helpers"
```

---

### Task 3: Wire S3 into generate-actions.ts

**Files:**
- Modify: `src/server/actions/generate-actions.ts:111-116` (replace `uploadBase64Image`)
- Modify: `src/server/actions/generate-actions.ts:163-176` (upload loop)
- Modify: `src/server/actions/generate-actions.ts:214` (return signed URLs)

**Step 1: Replace `uploadBase64Image` with S3 upload**

Replace the existing `uploadBase64Image` function (lines 111-116) with:

```typescript
import { uploadImage, getSignedImageUrl } from "@/lib/s3";

async function uploadBase64ToS3(
  base64Data: string,
  userId: string,
  index: number
): Promise<string> {
  const buffer = Buffer.from(base64Data, "base64");
  const timestamp = Date.now();
  const key = `users/${userId}/creators/wizard/${timestamp}-${index}.png`;
  await uploadImage(buffer, key, "image/png");
  return key;
}
```

**Step 2: Update the image processing loop**

In `generateCreatorImages`, update the loop that processes Gemini results. Replace the section that calls `uploadBase64Image` (around lines 163-176) so it:
1. Uploads each image to S3 using `uploadBase64ToS3`
2. Collects the S3 keys
3. After the loop, generates signed URLs for all keys

```typescript
const s3Keys: string[] = [];
let imageIndex = 0;
for (const result of results) {
  if (result.status === "fulfilled" && result.value.candidates?.[0]?.content?.parts) {
    for (const part of result.value.candidates[0].content.parts) {
      if (part.inlineData?.data) {
        const key = await uploadBase64ToS3(
          part.inlineData.data,
          user.id,
          imageIndex++
        );
        s3Keys.push(key);
      }
    }
  }
}

if (s3Keys.length === 0) {
  // ... existing error handling (unchanged)
}

// Generate signed URLs for the frontend
const images = await Promise.all(
  s3Keys.map((key) => getSignedImageUrl(key))
);
```

The rest of the function (credit deduction, job tracking, return) stays the same — `images` is still a `string[]` of URLs.

**Step 3: Update GenerationJob output to store S3 keys**

In the `db.generationJob.create` call, change the output to store S3 keys (not just count):

```typescript
output: JSON.parse(JSON.stringify({ imageCount: s3Keys.length, s3Keys })),
```

**Step 4: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 5: Commit**

```bash
git add src/server/actions/generate-actions.ts
git commit -m "feat: upload generated images to S3 instead of base64 data URLs"
```

---

### Task 4: Update finalizeCreator to store S3 keys

**Files:**
- Modify: `src/server/actions/generate-actions.ts:230-269` (finalizeCreator function)

**Step 1: Update finalizeCreator**

The `baseImageUrl` coming from the frontend is now a signed URL. We need to extract the S3 key from it, or better — have the frontend pass the S3 key directly.

The simplest approach: the frontend already passes `baseImageUrl` which is now a signed URL. Since signed URLs contain the key in the path, we can extract it. But cleaner: store the S3 keys alongside signed URLs in the studio store.

For now, accept that `baseImageUrl` might be a signed URL and store it as-is. The key is already stored in `GenerationJob.output.s3Keys`. When we need the key later (for content generation referencing the base image), we can look it up.

Actually the cleanest fix: return both keys and signed URLs from `generateCreatorImages`, then have the studio store track both. But that changes the return type.

**Simplest approach that works:** Change `generateCreatorImages` to return `{ success: true; images: string[]; keys: string[] }`. The frontend displays `images` (signed URLs) and passes the `key` when finalizing.

Update the return type:

```typescript
type GenerateResult =
  | { success: true; images: string[]; keys: string[] }
  | { success: false; error: string };
```

And the return:

```typescript
return { success: true, images, keys: s3Keys };
```

Update `finalizeCreator` to accept an S3 key:

```typescript
export async function finalizeCreator(data: {
  name: string;
  niche: string[];
  baseImageUrl: string; // This is now an S3 key like "users/.../wizard/123-0.png"
  traits: StudioTraits;
}): Promise<FinalizeResult> {
```

No changes to the function body — it already stores `baseImageUrl` in the DB. The field now holds an S3 key instead of a data URL.

**Step 2: Update studio store to track S3 keys**

Check `src/stores/studio-store.ts` — add a `generatedKeys` array alongside `generatedImages`. When the user picks an image, pass the corresponding key to `finalizeCreator`.

**Step 3: Update studio-footer.tsx to pass S3 key**

In `studio-footer.tsx` line 50, where it does `const baseImageUrl = generatedImages[selectedImageIndex]`, change to use `generatedKeys[selectedImageIndex]`.

**Step 4: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 5: Commit**

```bash
git add src/server/actions/generate-actions.ts src/stores/studio-store.ts src/components/studio/studio-footer.tsx
git commit -m "feat: pass S3 keys through studio flow for creator finalization"
```

---

### Task 5: Update workspace to serve signed URLs

**Files:**
- Modify: `src/server/actions/workspace-actions.ts:55`

**Step 1: Check workspace-actions.ts**

The workspace loads creators with `baseImageUrl`. This field now stores an S3 key. We need to generate a signed URL before sending to the frontend.

Update `getWorkspaceData` (or wherever creators are loaded) to map `baseImageUrl` through `getSignedImageUrl`:

```typescript
import { getSignedImageUrl } from "@/lib/s3";

// After fetching creators, generate signed URLs
const creatorsWithUrls = await Promise.all(
  creators.map(async (c) => ({
    ...c,
    baseImageUrl: c.baseImageUrl ? await getSignedImageUrl(c.baseImageUrl) : undefined,
  }))
);
```

**Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 3: Manual test**

Run: `pnpm dev`
1. Open workspace — existing creators should show images (if any have S3 keys)
2. Open Creator Studio — generate images — should see them load from S3
3. Pick one, name it, save — should create creator with S3 key
4. New creator appears in workspace with image

**Step 4: Commit**

```bash
git add src/server/actions/workspace-actions.ts
git commit -m "feat: serve creator images via S3 signed URLs in workspace"
```
