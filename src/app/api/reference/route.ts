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
