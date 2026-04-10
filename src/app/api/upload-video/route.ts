import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { uploadImage } from "@/lib/s3";

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

  const ext = file.type.includes("mp4") ? "mp4" : file.type.includes("mov") ? "mov" : "mp4";
  const key = `users/${userId}/references/video-${Date.now()}.${ext}`;

  const buffer = Buffer.from(await file.arrayBuffer());
  await uploadImage(buffer, key, file.type);

  return NextResponse.json({ key, size: buffer.length });
}
