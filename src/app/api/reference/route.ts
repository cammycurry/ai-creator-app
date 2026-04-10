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

const SAFE_HANDLE = /^[a-zA-Z0-9_.]+$/;
const SAFE_SHORTCODE = /^[A-Za-z0-9_-]+$/;

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
    case "checkPosts":
      return handleCheckPosts(body);
    case "checkAccount":
      return handleCheckAccount(body);
    case "updatePostStats":
      return handleUpdatePostStats(body);
    case "deleteAccount":
      return handleDeleteAccount(body);
    case "reassignPosts":
      return handleReassignPosts(body);
    default:
      return err(`Unknown action: ${action}`);
  }
}

async function handleSaveAccount(body: Record<string, unknown>) {
  const handle = (body.handle as string)?.replace(/^@/, "").trim();
  if (!handle) return err("handle is required");
  if (!SAFE_HANDLE.test(handle)) return err("Invalid handle format");

  const account = await db.referenceAccount.upsert({
    where: { handle },
    create: {
      handle,
      name: (body.name as string) ?? null,
      bio: (body.bio as string) ?? null,
      followers: (body.followers as number) ?? null,
      following: (body.following as number) ?? null,
      postCount: (body.postCount as number) ?? null,
      profilePicUrl: (body.profilePicUrl as string) ?? null,
      isVerified: (body.isVerified as boolean) ?? false,
      isPrivate: (body.isPrivate as boolean) ?? false,
      isBusiness: (body.isBusiness as boolean) ?? false,
      categoryName: (body.categoryName as string) ?? null,
      externalUrl: (body.externalUrl as string) ?? null,
    },
    update: {
      ...(body.name !== undefined && { name: body.name as string }),
      ...(body.bio !== undefined && { bio: body.bio as string }),
      ...(body.followers !== undefined && { followers: body.followers as number }),
      ...(body.following !== undefined && { following: body.following as number }),
      ...(body.postCount !== undefined && { postCount: body.postCount as number }),
      ...(body.profilePicUrl !== undefined && { profilePicUrl: body.profilePicUrl as string }),
      ...(body.isVerified !== undefined && { isVerified: body.isVerified as boolean }),
      ...(body.isPrivate !== undefined && { isPrivate: body.isPrivate as boolean }),
      ...(body.isBusiness !== undefined && { isBusiness: body.isBusiness as boolean }),
      ...(body.categoryName !== undefined && { categoryName: body.categoryName as string }),
      ...(body.externalUrl !== undefined && { externalUrl: body.externalUrl as string }),
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
  if (!SAFE_HANDLE.test(handle)) return err("Invalid handle format");
  if (!SAFE_SHORTCODE.test(shortcode)) return err("Invalid shortcode format");

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
  let uploadUrl: string;
  try {
    uploadUrl = await getPresignedPutUrl(s3Key, mimeType);
  } catch {
    return err("Failed to generate upload URL", 500);
  }

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
  if (!SAFE_HANDLE.test(handle)) return err("Invalid handle format");
  if (!SAFE_SHORTCODE.test(shortcode)) return err("Invalid shortcode format");

  // Ensure account exists
  let account = await db.referenceAccount.findUnique({ where: { handle } });
  if (!account) {
    account = await db.referenceAccount.create({ data: { handle } });
  }

  const postedAt = body.postedAt ? new Date(body.postedAt as string) : null;

  const post = await db.referencePost.upsert({
    where: { shortcode_carouselIndex: { shortcode, carouselIndex } },
    create: {
      accountId: account.id,
      shortcode,
      postUrl: (body.postUrl as string) || `https://instagram.com/p/${shortcode}/`,
      s3Key,
      mediaType: (body.mediaType as string) || "image",
      postType: (body.postType as string) || "single",
      carouselCount: (body.carouselCount as number) ?? null,
      width: (body.width as number) || null,
      height: (body.height as number) || null,
      caption: (body.caption as string) || null,
      carouselIndex,
      likeCount: (body.likeCount as number) ?? null,
      commentCount: (body.commentCount as number) ?? null,
      viewCount: (body.viewCount as number) ?? null,
      postedAt: postedAt,
      location: (body.location as string) ?? null,
      altText: (body.altText as string) ?? null,
    },
    update: {
      s3Key,
      postUrl: (body.postUrl as string) || undefined,
      mediaType: (body.mediaType as string) || undefined,
      postType: (body.postType as string) || undefined,
      carouselCount: (body.carouselCount as number) ?? undefined,
      caption: (body.caption as string) ?? undefined,
      width: (body.width as number) ?? undefined,
      height: (body.height as number) ?? undefined,
      likeCount: (body.likeCount as number) ?? undefined,
      commentCount: (body.commentCount as number) ?? undefined,
      viewCount: (body.viewCount as number) ?? undefined,
      postedAt: postedAt ?? undefined,
      location: (body.location as string) ?? undefined,
      altText: (body.altText as string) ?? undefined,
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

async function handleCheckPosts(body: Record<string, unknown>) {
  const shortcodes = body.shortcodes as string[];
  if (!Array.isArray(shortcodes) || shortcodes.length === 0) {
    return err("shortcodes array is required");
  }

  const posts = await db.referencePost.findMany({
    where: { shortcode: { in: shortcodes } },
    select: { shortcode: true },
  });

  const savedSet = new Set(posts.map((p) => p.shortcode));
  return NextResponse.json({
    ok: true,
    savedShortcodes: [...savedSet],
  });
}

async function handleCheckAccount(body: Record<string, unknown>) {
  const handle = (body.handle as string)?.replace(/^@/, "").trim();
  if (!handle) return err("handle is required");

  const account = await db.referenceAccount.findUnique({
    where: { handle },
    include: { _count: { select: { posts: true } } },
  });

  if (!account) {
    return NextResponse.json({ exists: false, savedPosts: 0 });
  }

  return NextResponse.json({
    exists: true,
    savedPosts: account._count.posts,
  });
}

async function handleUpdatePostStats(body: Record<string, unknown>) {
  const shortcode = body.shortcode as string;
  const carouselIndex = (body.carouselIndex as number) ?? 0;

  if (!shortcode) return err("shortcode is required");

  const postedAt = body.postedAt ? new Date(body.postedAt as string) : undefined;

  await db.referencePost.updateMany({
    where: { shortcode, carouselIndex },
    data: {
      ...(body.likeCount !== undefined && { likeCount: body.likeCount as number }),
      ...(body.commentCount !== undefined && { commentCount: body.commentCount as number }),
      ...(body.viewCount !== undefined && { viewCount: body.viewCount as number }),
      ...(postedAt && { postedAt }),
      ...(body.location !== undefined && { location: body.location as string }),
      ...(body.altText !== undefined && { altText: body.altText as string }),
      ...(body.caption !== undefined && { caption: body.caption as string }),
      ...(body.postType !== undefined && { postType: body.postType as string }),
      ...(body.carouselCount !== undefined && { carouselCount: body.carouselCount as number }),
    },
  });

  return NextResponse.json({ ok: true });
}

async function handleDeleteAccount(body: Record<string, unknown>) {
  const handle = (body.handle as string)?.replace(/^@/, "").trim();
  if (!handle) return err("handle is required");

  // Cascade deletes posts too (schema has onDelete: Cascade)
  const account = await db.referenceAccount.findUnique({ where: { handle } });
  if (!account) return NextResponse.json({ ok: true, deleted: false });

  await db.referenceAccount.delete({ where: { handle } });
  return NextResponse.json({ ok: true, deleted: true });
}

async function handleReassignPosts(body: Record<string, unknown>) {
  const fromHandle = (body.fromHandle as string)?.replace(/^@/, "").trim();
  const toHandle = (body.toHandle as string)?.replace(/^@/, "").trim();
  if (!fromHandle || !toHandle) return err("fromHandle and toHandle are required");

  const fromAccount = await db.referenceAccount.findUnique({ where: { handle: fromHandle } });
  const toAccount = await db.referenceAccount.findUnique({ where: { handle: toHandle } });
  if (!fromAccount) return err(`Account ${fromHandle} not found`);
  if (!toAccount) return err(`Account ${toHandle} not found`);

  const result = await db.referencePost.updateMany({
    where: { accountId: fromAccount.id },
    data: { accountId: toAccount.id },
  });

  return NextResponse.json({ ok: true, moved: result.count });
}
