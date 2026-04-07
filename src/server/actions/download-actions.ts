"use server";

import { auth } from "@clerk/nextjs/server";
import sharp from "sharp";
import { db } from "@/lib/db";
import { getImageBuffer } from "@/lib/s3";
import { DEVICE_PROFILES, type DownloadSettings } from "@/types/download";

const DEFAULT_SETTINGS: DownloadSettings = {
  deviceId: "iphone-15-pro",
  quality: 95,
  stripMetadata: true,
  injectGps: false,
};

// ─── Process Download ────────────────────────────────

export async function processDownload(
  s3Key: string,
  settings?: Partial<DownloadSettings>
): Promise<{ success: true; data: string; filename: string } | { success: false; error: string }> {
  const { userId: clerkId } = await auth();
  if (!clerkId) return { success: false, error: "Not authenticated" };

  const user = await db.user.findUnique({ where: { clerkId } });
  if (!user) return { success: false, error: "User not found" };

  try {
    const config = { ...DEFAULT_SETTINGS, ...settings };
    const device = DEVICE_PROFILES.find((d) => d.id === config.deviceId) ?? DEVICE_PROFILES[0];

    // Get the raw image from S3
    const buffer = await getImageBuffer(s3Key);

    // Process: strip all metadata + re-encode
    let pipeline = sharp(buffer).jpeg({ quality: config.quality });

    // Inject device EXIF (unless "none" selected)
    if (device.make) {
      const exifData: Record<string, Record<string, string | number>> = {
        IFD0: {
          Make: device.make,
          Model: device.model,
          Software: device.software,
        },
      };

      // Inject GPS if enabled
      if (config.injectGps && config.gpsLat !== undefined && config.gpsLng !== undefined) {
        exifData.GPS = {
          GPSLatitudeRef: config.gpsLat >= 0 ? "N" : "S",
          GPSLatitude: Math.abs(config.gpsLat),
          GPSLongitudeRef: config.gpsLng >= 0 ? "E" : "W",
          GPSLongitude: Math.abs(config.gpsLng),
        };
      }

      pipeline = pipeline.withExifMerge(exifData);
    }

    const clean = await pipeline.toBuffer();
    const base64 = clean.toString("base64");

    // Generate clean filename
    const timestamp = Date.now();
    const filename = `IMG_${timestamp}.jpg`;

    return { success: true, data: base64, filename };
  } catch (error) {
    console.error("Download processing failed:", error);
    return { success: false, error: "Failed to process download" };
  }
}

// ─── Get Default Settings ────────────────────────────

export async function getDownloadSettings(): Promise<DownloadSettings> {
  const { userId: clerkId } = await auth();
  if (!clerkId) return DEFAULT_SETTINGS;

  const user = await db.user.findUnique({ where: { clerkId } });
  if (!user) return DEFAULT_SETTINGS;

  // Could load from user preferences table later
  // For now, return defaults
  return DEFAULT_SETTINGS;
}
