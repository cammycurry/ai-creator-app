import { execFile } from "child_process";
import { writeFile, unlink, readFile } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";

/**
 * Extract the first frame from a video buffer as a JPEG image.
 * Uses system ffmpeg. Returns null if ffmpeg is unavailable or extraction fails.
 */
export async function extractFirstFrame(videoBuffer: Buffer): Promise<Buffer | null> {
  const inputPath = join(tmpdir(), `vid-${Date.now()}.mp4`);
  const outputPath = join(tmpdir(), `thumb-${Date.now()}.jpg`);

  try {
    await writeFile(inputPath, videoBuffer);

    await new Promise<void>((resolve, reject) => {
      execFile(
        "ffmpeg",
        [
          "-i", inputPath,
          "-vframes", "1",
          "-q:v", "2",
          "-y",
          outputPath,
        ],
        { timeout: 15000 },
        (error) => {
          if (error) reject(error);
          else resolve();
        }
      );
    });

    const thumbBuffer = await readFile(outputPath);
    return thumbBuffer;
  } catch (error) {
    console.error("[video-utils] Failed to extract first frame:", error instanceof Error ? error.message : error);
    return null;
  } finally {
    await unlink(inputPath).catch(() => {});
    await unlink(outputPath).catch(() => {});
  }
}
