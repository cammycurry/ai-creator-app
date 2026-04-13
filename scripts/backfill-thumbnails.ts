#!/usr/bin/env npx tsx
/**
 * Backfill thumbnails for videos/talking-heads that don't have them.
 * Downloads video from S3, extracts first frame with ffmpeg, uploads thumbnail, updates DB.
 *
 * Usage: npx tsx scripts/backfill-thumbnails.ts
 * Requires: ffmpeg installed locally
 */

// Load .env.local before any imports that read process.env
import { readFileSync } from "fs";
const envLines = readFileSync(".env.local", "utf8").split("\n");
for (const line of envLines) {
  const t = line.trim();
  if (!t || t.startsWith("#")) continue;
  const eq = t.indexOf("=");
  if (eq > 0) {
    const key = t.slice(0, eq);
    const val = t.slice(eq + 1).replace(/^"|"$/g, "");
    if (!process.env[key]) process.env[key] = val;
  }
}

import { S3Client, GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { extractFirstFrame } from "../src/lib/video-utils";

async function main() {
  const { db } = await import("../src/lib/db");

  const s3 = new S3Client({
    region: process.env.AWS_REGION ?? "us-east-1",
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
  });
  const BUCKET = process.env.AWS_S3_BUCKET ?? "realinfluencer-media";

  async function getVideoBuffer(key: string): Promise<Buffer> {
    const signedUrl = await getSignedUrl(s3, new GetObjectCommand({ Bucket: BUCKET, Key: key }), { expiresIn: 300 });
    const res = await fetch(signedUrl);
    return Buffer.from(await res.arrayBuffer());
  }

  async function uploadBuffer(buffer: Buffer, key: string, contentType: string) {
    await s3.send(new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    }));
  }

  const videos = await db.content.findMany({
    where: {
      type: { in: ["VIDEO", "TALKING_HEAD"] },
      status: "COMPLETED",
      url: { not: null },
      OR: [
        { thumbnailUrl: null },
        { thumbnailUrl: "" },
      ],
    },
    select: { id: true, url: true, creatorId: true, type: true, userInput: true },
  });

  console.log(`Found ${videos.length} videos without thumbnails\n`);

  let success = 0;
  let failed = 0;

  for (const video of videos) {
    const label = `[${video.type}] ${video.id} — "${(video.userInput ?? "").slice(0, 40)}"`;
    try {
      console.log(`Processing ${label}...`);

      const videoBuffer = await getVideoBuffer(video.url!);
      console.log(`  Downloaded ${(videoBuffer.length / 1024 / 1024).toFixed(1)}MB`);

      const thumbBuffer = await extractFirstFrame(videoBuffer);
      if (!thumbBuffer) {
        console.log(`  SKIP — ffmpeg extraction returned null`);
        failed++;
        continue;
      }
      console.log(`  Extracted thumbnail: ${(thumbBuffer.length / 1024).toFixed(0)}KB`);

      // Parse userId from the S3 key pattern: users/{userId}/creators/{creatorId}/...
      const thumbKey = `users/${video.url!.split("/")[1]}/creators/${video.creatorId}/content/thumb-${Date.now()}.jpg`;
      await uploadBuffer(thumbBuffer, thumbKey, "image/jpeg");

      await db.content.update({
        where: { id: video.id },
        data: { thumbnailUrl: thumbKey },
      });

      console.log(`  OK — ${thumbKey}\n`);
      success++;
    } catch (err) {
      console.error(`  FAIL — ${err instanceof Error ? err.message : err}\n`);
      failed++;
    }
  }

  console.log(`\nDone: ${success} thumbnails created, ${failed} failed`);
  process.exit(0);
}

main().catch((err) => { console.error(err); process.exit(1); });
