import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getImageBuffer } from "@/lib/s3";
import {
  processImageForDownload,
  processVideoForDownload,
  isMetadataServiceConfigured,
} from "@/lib/metadata-service";

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const key = req.nextUrl.searchParams.get("key");
  if (!key) return NextResponse.json({ error: "Missing key" }, { status: 400 });

  const device = req.nextUrl.searchParams.get("device") ?? "iphone_15_pro";
  const gpsCity = req.nextUrl.searchParams.get("gps_city") ?? undefined;

  try {
    const raw = await getImageBuffer(key);
    const isVideo = key.endsWith(".mp4");
    const ext = isVideo ? "mp4" : "jpg";
    const contentType = isVideo ? "video/mp4" : "image/jpeg";

    let processed: Buffer = raw;

    // Route through metadata service if configured
    if (isMetadataServiceConfigured()) {
      try {
        processed = isVideo
          ? await processVideoForDownload(raw, device, gpsCity)
          : await processImageForDownload(raw, device, gpsCity);
      } catch (err) {
        console.error("Metadata service failed, serving raw:", err);
      }
    }

    return new NextResponse(new Uint8Array(processed), {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="IMG_${Date.now()}.${ext}"`,
      },
    });
  } catch {
    return NextResponse.json({ error: "Download failed" }, { status: 500 });
  }
}
