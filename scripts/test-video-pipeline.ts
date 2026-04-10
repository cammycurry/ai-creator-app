/**
 * Test the video generation pipeline end-to-end.
 *
 * Usage:
 *   pnpm tsx scripts/test-video-pipeline.ts                    # run all tests
 *   pnpm tsx scripts/test-video-pipeline.ts text-to-video      # run one test
 *   pnpm tsx scripts/test-video-pipeline.ts talking-head        # run one test
 *
 * Requires: .env.local with FAL_API_KEY, GEMINI_API_KEY, GROK_API_KEY, ELEVENLABS_API_KEY, DATABASE_URL
 *
 * This calls the Fal.ai APIs directly (costs real money) — use sparingly.
 */

import "dotenv/config";
import { fal } from "@fal-ai/client";

fal.config({ credentials: process.env.FAL_API_KEY! });

const TESTS = {
  "text-to-video": async () => {
    console.log("\n=== TEST: Text-to-Video (O3 ref-to-video) ===");
    console.log("Model: fal-ai/kling-video/o3/pro/reference-to-video");
    console.log("Prompt: Woman walking through a sunny park");

    const start = Date.now();
    try {
      const result = await fal.subscribe("fal-ai/kling-video/o3/pro/reference-to-video", {
        input: {
          prompt: "Woman walking confidently through a sunny park. Handheld medium shot, slight camera drift. Warm golden afternoon light through trees. Hair shifts with each stride, tote bag swings at her side.",
          duration: "5",
          aspect_ratio: "9:16",
          generate_audio: false,
        },
      });
      const elapsed = ((Date.now() - start) / 1000).toFixed(1);
      const data = result.data as { video?: { url?: string }; video_url?: string };
      const url = data?.video?.url ?? data?.video_url;
      console.log(`✅ PASS (${elapsed}s)`);
      console.log(`   Video URL: ${url}`);
      console.log(`   Response shape: ${JSON.stringify(Object.keys(data))}`);
      return { pass: true, elapsed, url };
    } catch (err) {
      const elapsed = ((Date.now() - start) / 1000).toFixed(1);
      console.log(`❌ FAIL (${elapsed}s): ${err instanceof Error ? err.message : err}`);
      return { pass: false, elapsed, error: String(err) };
    }
  },

  "image-to-video": async () => {
    console.log("\n=== TEST: Image-to-Video (Kling V3 standard) ===");
    console.log("Model: fal-ai/kling-video/v3/standard/image-to-video");
    console.log("Note: Needs a real image URL — using Fal.ai sample");

    const sampleImage = "https://storage.googleapis.com/falserverless/example_inputs/kling-v3/standard-i2v/start_image.png";
    const start = Date.now();
    try {
      const result = await fal.subscribe("fal-ai/kling-video/v3/standard/image-to-video", {
        input: {
          start_image_url: sampleImage,
          prompt: "Gentle head turn to the right, soft smile appears. Slight handheld camera shake.",
          duration: "5",
          aspect_ratio: "9:16",
          cfg_scale: 0.5,
        },
      });
      const elapsed = ((Date.now() - start) / 1000).toFixed(1);
      const data = result.data as { video?: { url?: string }; video_url?: string };
      const url = data?.video?.url ?? data?.video_url;
      console.log(`✅ PASS (${elapsed}s)`);
      console.log(`   Video URL: ${url}`);
      console.log(`   Response shape: ${JSON.stringify(Object.keys(data))}`);
      return { pass: true, elapsed, url };
    } catch (err) {
      const elapsed = ((Date.now() - start) / 1000).toFixed(1);
      console.log(`❌ FAIL (${elapsed}s): ${err instanceof Error ? err.message : err}`);
      return { pass: false, elapsed, error: String(err) };
    }
  },

  "premium-veo": async () => {
    console.log("\n=== TEST: Premium Tier (Veo 3.1 Fast) ===");
    console.log("Model: fal-ai/veo3.1/fast");

    const start = Date.now();
    try {
      const result = await fal.subscribe("fal-ai/veo3.1/fast", {
        input: {
          prompt: "A confident woman walks down a city street at golden hour. Warm light, slight handheld camera motion. She glances at her phone then looks up smiling.",
          duration: "5",
          aspect_ratio: "9:16",
        },
      });
      const elapsed = ((Date.now() - start) / 1000).toFixed(1);
      const data = result.data as { video?: { url?: string }; video_url?: string };
      const url = data?.video?.url ?? data?.video_url;
      console.log(`✅ PASS (${elapsed}s)`);
      console.log(`   Video URL: ${url}`);
      console.log(`   Response shape: ${JSON.stringify(Object.keys(data))}`);
      return { pass: true, elapsed, url };
    } catch (err) {
      const elapsed = ((Date.now() - start) / 1000).toFixed(1);
      console.log(`❌ FAIL (${elapsed}s): ${err instanceof Error ? err.message : err}`);
      return { pass: false, elapsed, error: String(err) };
    }
  },

  "lipsync": async () => {
    console.log("\n=== TEST: Kling LipSync (audio-to-video) ===");
    console.log("Model: fal-ai/kling-video/lipsync/audio-to-video");
    console.log("Note: Needs audio + image URLs — testing with Fal storage upload");

    // First generate a test audio via ElevenLabs
    console.log("   Step 1: Generating test audio via ElevenLabs...");
    const ttsStart = Date.now();
    try {
      const ttsResponse = await fetch("https://api.elevenlabs.io/v1/text-to-speech/21m00Tcm4TlvDq8ikWAM", {
        method: "POST",
        headers: {
          "xi-api-key": process.env.ELEVENLABS_API_KEY!,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: "Hey guys, this is a quick test of the talking head pipeline.",
          model_id: "eleven_turbo_v2_5",
          voice_settings: { stability: 0.5, similarity_boost: 0.75, style: 0.5, use_speaker_boost: true },
        }),
      });

      if (!ttsResponse.ok) {
        const errText = await ttsResponse.text();
        throw new Error(`ElevenLabs ${ttsResponse.status}: ${errText.slice(0, 100)}`);
      }

      const audioBuffer = Buffer.from(await ttsResponse.arrayBuffer());
      console.log(`   Step 1 done: ${audioBuffer.length} bytes (${((Date.now() - ttsStart) / 1000).toFixed(1)}s)`);

      // Upload audio to Fal storage
      console.log("   Step 2: Uploading audio to Fal storage...");
      const audioUrl = await fal.storage.upload(new Blob([new Uint8Array(audioBuffer)], { type: "audio/mpeg" }));
      console.log(`   Step 2 done: ${audioUrl}`);

      // Use a sample face image
      const faceImage = "https://storage.googleapis.com/falserverless/example_inputs/kling-v3/standard-i2v/start_image.png";

      console.log("   Step 3: Running lip sync...");
      const start = Date.now();
      const result = await fal.subscribe("fal-ai/kling-video/lipsync/audio-to-video", {
        input: {
          video_url: faceImage,
          audio_url: audioUrl,
        },
      });
      const elapsed = ((Date.now() - start) / 1000).toFixed(1);
      const data = result.data as { video?: { url?: string }; video_url?: string };
      const url = data?.video?.url ?? data?.video_url;
      console.log(`✅ PASS (${elapsed}s for lip sync)`);
      console.log(`   Video URL: ${url}`);
      return { pass: true, elapsed, url };
    } catch (err) {
      console.log(`❌ FAIL: ${err instanceof Error ? err.message : err}`);
      return { pass: false, error: String(err) };
    }
  },
};

async function main() {
  const filter = process.argv[2];
  const testNames = filter
    ? Object.keys(TESTS).filter((k) => k.includes(filter))
    : Object.keys(TESTS);

  if (testNames.length === 0) {
    console.log(`No tests matching "${filter}". Available: ${Object.keys(TESTS).join(", ")}`);
    process.exit(1);
  }

  console.log(`Running ${testNames.length} test(s): ${testNames.join(", ")}`);
  console.log("⚠️  These call real APIs and cost money.\n");

  const results: Record<string, { pass: boolean; elapsed?: string; url?: string; error?: string }> = {};

  for (const name of testNames) {
    results[name] = await TESTS[name as keyof typeof TESTS]();
  }

  console.log("\n=== RESULTS ===");
  for (const [name, result] of Object.entries(results)) {
    console.log(`${result.pass ? "✅" : "❌"} ${name} ${result.elapsed ? `(${result.elapsed}s)` : ""}`);
  }

  const passed = Object.values(results).filter((r) => r.pass).length;
  console.log(`\n${passed}/${testNames.length} passed`);
  process.exit(passed === testNames.length ? 0 : 1);
}

main();
