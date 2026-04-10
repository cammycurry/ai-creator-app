// src/lib/metadata-service.ts
//
// HTTP client for the Railway-hosted metadata-service.
// Used for download exports that need thorough processing (exiftool + ffmpeg).
// Inline Sharp processing (src/lib/ai/metadata-strip.ts) remains for generation-time stripping.

const METADATA_URL = process.env.METADATA_SERVICE_URL;
const METADATA_KEY = process.env.METADATA_SERVICE_API_KEY;

function isConfigured(): boolean {
  return !!METADATA_URL && !!METADATA_KEY;
}

export async function processImageForDownload(
  imageBuffer: Buffer,
  device: string = "iphone_15_pro",
  gpsCity?: string,
): Promise<Buffer> {
  if (!isConfigured()) throw new Error("Metadata service not configured");

  const form = new FormData();
  form.append("file", new Blob([new Uint8Array(imageBuffer)], { type: "image/jpeg" }), "image.jpg");
  form.append("device", device);
  if (gpsCity) form.append("gps_city", gpsCity);
  form.append("jpeg_quality", "93");

  const res = await fetch(`${METADATA_URL}/process/image`, {
    method: "POST",
    headers: { Authorization: `Bearer ${METADATA_KEY}` },
    body: form,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "unknown");
    throw new Error(`Metadata service image error ${res.status}: ${text}`);
  }

  return Buffer.from(await res.arrayBuffer());
}

export async function processVideoForDownload(
  videoBuffer: Buffer,
  device: string = "iphone_15_pro",
  gpsCity?: string,
  addNoise: boolean = true,
  noiseStrength: number = 3,
): Promise<Buffer> {
  if (!isConfigured()) throw new Error("Metadata service not configured");

  const form = new FormData();
  form.append("file", new Blob([new Uint8Array(videoBuffer)], { type: "video/mp4" }), "video.mp4");
  form.append("device", device);
  if (gpsCity) form.append("gps_city", gpsCity);
  form.append("add_noise", String(addNoise));
  form.append("noise_strength", String(noiseStrength));
  form.append("video_quality_crf", "18");

  const res = await fetch(`${METADATA_URL}/process/video`, {
    method: "POST",
    headers: { Authorization: `Bearer ${METADATA_KEY}` },
    body: form,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "unknown");
    throw new Error(`Metadata service video error ${res.status}: ${text}`);
  }

  return Buffer.from(await res.arrayBuffer());
}

export { isConfigured as isMetadataServiceConfigured };
