"use server";

import { auth } from "@clerk/nextjs/server";
import sharp from "sharp";
import { db } from "@/lib/db";
import { getImageBuffer } from "@/lib/s3";
import { DEVICE_PROFILES, type DownloadSettings } from "@/types/download";
import {
  processImageForDownload,
  processVideoForDownload,
  isMetadataServiceConfigured,
} from "@/lib/metadata-service";

const DEFAULT_SETTINGS: DownloadSettings = {
  deviceId: "iphone-15-pro",
  quality: 95,
  stripMetadata: true,
  injectGps: false,
};

// Device ID mapping: our IDs → metadata-service device names
const DEVICE_MAP: Record<string, string> = {
  "iphone-15-pro": "iphone_15_pro",
  "iphone-15-pro-max": "iphone_15_pro_max",
  "iphone-14-pro": "iphone_14_pro",
  "samsung-s24": "samsung_s24",
  "none": "none",
};

// ─── Process Image Download ────────────────────────────

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
    const buffer = await getImageBuffer(s3Key);

    // Try metadata service first (more thorough: exiftool-based)
    if (isMetadataServiceConfigured()) {
      try {
        const metaDevice = DEVICE_MAP[config.deviceId] ?? "iphone_15_pro";
        const gpsCity = config.injectGps ? "los_angeles" : undefined;
        const processed = await processImageForDownload(buffer, metaDevice, gpsCity);
        const base64 = processed.toString("base64");
        return { success: true, data: base64, filename: `IMG_${Date.now()}.jpg` };
      } catch (err) {
        console.error("Metadata service image processing failed, falling back to Sharp:", err);
      }
    }

    // Fallback: Sharp (current behavior)
    const device = DEVICE_PROFILES.find((d) => d.id === config.deviceId) ?? DEVICE_PROFILES[0];
    let pipeline = sharp(buffer).jpeg({ quality: config.quality });

    if (device.make) {
      const exifData: Record<string, Record<string, string | number>> = {
        IFD0: { Make: device.make, Model: device.model, Software: device.software },
      };
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
    return { success: true, data: clean.toString("base64"), filename: `IMG_${Date.now()}.jpg` };
  } catch (error) {
    console.error("Download processing failed:", error);
    return { success: false, error: "Failed to process download" };
  }
}

// ─── Process Video Download ────────────────────────────

export async function processVideoDownload(
  s3Key: string,
  settings?: Partial<DownloadSettings>
): Promise<{ success: true; data: string; filename: string } | { success: false; error: string }> {
  const { userId: clerkId } = await auth();
  if (!clerkId) return { success: false, error: "Not authenticated" };

  const user = await db.user.findUnique({ where: { clerkId } });
  if (!user) return { success: false, error: "User not found" };

  try {
    const config = { ...DEFAULT_SETTINGS, ...settings };
    const buffer = await getImageBuffer(s3Key);

    // Try metadata service (ffmpeg + exiftool processing)
    if (isMetadataServiceConfigured()) {
      try {
        const metaDevice = DEVICE_MAP[config.deviceId] ?? "iphone_15_pro";
        const gpsCity = config.injectGps ? "los_angeles" : undefined;
        const processed = await processVideoForDownload(buffer, metaDevice, gpsCity);
        const base64 = processed.toString("base64");
        return { success: true, data: base64, filename: `IMG_${Date.now()}.mp4` };
      } catch (err) {
        console.error("Metadata service video processing failed, serving raw:", err);
      }
    }

    // Fallback: serve raw video (no processing available without ffmpeg)
    return { success: true, data: buffer.toString("base64"), filename: `IMG_${Date.now()}.mp4` };
  } catch (error) {
    console.error("Video download processing failed:", error);
    return { success: false, error: "Failed to process video download" };
  }
}

// ─── Get Default Settings ────────────────────────────

export async function getDownloadSettings(): Promise<DownloadSettings> {
  const { userId: clerkId } = await auth();
  if (!clerkId) return DEFAULT_SETTINGS;

  const user = await db.user.findUnique({ where: { clerkId } });
  if (!user) return DEFAULT_SETTINGS;

  return DEFAULT_SETTINGS;
}
