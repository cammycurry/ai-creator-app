import sharp from "sharp";

/**
 * Strip all AI metadata (C2PA, SynthID, EXIF, XMP, IPTC) from a generated image
 * and re-encode with realistic iPhone EXIF data.
 */
export async function stripAndRewrite(imageBuffer: Buffer): Promise<Buffer> {
  try {
    // Re-encode as JPEG (strips all metadata) then merge iPhone EXIF
    const clean = await sharp(imageBuffer)
      .jpeg({ quality: 95 })
      .withExifMerge({
        IFD0: {
          Make: "Apple",
          Model: "iPhone 15 Pro",
          Software: "18.3",
        },
      })
      .toBuffer();
    return clean;
  } catch {
    // Fallback: just strip metadata without EXIF injection
    const clean = await sharp(imageBuffer).jpeg({ quality: 95 }).toBuffer();
    return clean;
  }
}
