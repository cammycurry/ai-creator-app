import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getSignedImageUrl } from "@/lib/s3";

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const key = req.nextUrl.searchParams.get("key");
  if (!key) return NextResponse.json({ error: "Missing key" }, { status: 400 });

  // Verify the key belongs to this user (basic check — key starts with users/{userId})
  // For now just proxy the signed URL
  try {
    const signedUrl = await getSignedImageUrl(key);
    const response = await fetch(signedUrl);
    const buffer = await response.arrayBuffer();

    const ext = key.endsWith(".mp4") ? "mp4" : "jpg";
    const contentType = ext === "mp4" ? "video/mp4" : "image/jpeg";

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="VID_${Date.now()}.${ext}"`,
      },
    });
  } catch {
    return NextResponse.json({ error: "Download failed" }, { status: 500 });
  }
}
