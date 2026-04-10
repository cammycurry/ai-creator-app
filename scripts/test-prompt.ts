#!/usr/bin/env npx tsx
/**
 * Prompt Testing Tool
 *
 * Quick way to test image generation prompts without going through the wizard UI.
 * Generates images and saves them locally for inspection.
 *
 * Usage:
 *   pnpm test:prompt "your prompt here"
 *   pnpm test:prompt "your prompt here" --count 2
 *   pnpm test:prompt --file prompts/test1.txt
 *   pnpm test:prompt --file prompts/test1.txt --ref path/to/reference.jpg
 *   pnpm test:prompt --preset base-female
 *
 * Outputs saved to: scripts/output/<timestamp>/
 */

import { GoogleGenAI, HarmCategory, HarmBlockThreshold } from "@google/genai";
import * as fs from "fs";
import * as path from "path";
import dotenv from "dotenv";

// Load env from project root
dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
const IMAGE_MODEL = "gemini-3-pro-image-preview";

const SAFETY_OFF = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
];

// ─── Preset Prompts (for quick testing) ───────────────────

const PRESETS: Record<string, string> = {
  "base-female": `Front-facing portrait of a 24-year-old woman, raw iPhone photography style, visible from waist up, standing straight with arms relaxed and hands resting naturally next to the body, facing the camera directly against a pure white seamless studio background. She is wearing a white sports bra, revealing a naturally athletic upper body with relaxed shoulders. She has brown eyes, naturally full lips, with a calm, confident expression. Her skin shows visible pores and fine skin details. She has dark brown long wavy hair. Hyper-realistic, everyday human appearance. The overall image feels unposed, authentic, and human.`,

  "base-male": `Front-facing portrait of a 26-year-old man, raw iPhone photography style, visible from waist up, standing straight with arms relaxed and hands resting naturally next to the body, facing the camera directly against a pure white seamless studio background. He is shirtless, revealing a naturally athletic upper body with relaxed shoulders. He has brown eyes with a calm, confident expression. His skin shows visible pores and fine skin details. He has short dark brown hair. Hyper-realistic, everyday human appearance. The overall image feels unposed, authentic, and human.`,

  "variation-female": `That woman from the reference image. Front-facing portrait, waist up, white sports bra, pure white studio background. Same person, same face, same body. Raw iPhone photography. Hyper-realistic, visible pores and fine skin details.`,

  "variation-male": `That man from the reference image. Front-facing portrait, waist up, shirtless, pure white studio background. Same person, same face, same body. Raw iPhone photography. Hyper-realistic, visible pores and fine skin details.`,
};

// ─── Generate Image ───────────────────────────────────────

interface GenerateOptions {
  prompt: string;
  referenceImagePath?: string;
  outputDir: string;
  index: number;
}

async function generateImage(opts: GenerateOptions): Promise<string | null> {
  const { prompt, referenceImagePath, outputDir, index } = opts;

  const contents: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [
    { text: prompt },
  ];

  if (referenceImagePath) {
    const imgBuffer = fs.readFileSync(referenceImagePath);
    const base64 = imgBuffer.toString("base64");
    const ext = path.extname(referenceImagePath).toLowerCase();
    const mimeType = ext === ".png" ? "image/png" : "image/jpeg";
    contents.push({ inlineData: { mimeType, data: base64 } });
  }

  try {
    const response = await ai.models.generateContent({
      model: IMAGE_MODEL,
      contents,
      config: {
        responseModalities: ["TEXT", "IMAGE"],
        safetySettings: SAFETY_OFF,
      },
    });

    // Check for text response (thinking/safety messages)
    const textPart = response.candidates?.[0]?.content?.parts?.find(
      (p: { text?: string }) => p.text
    );
    if (textPart && "text" in textPart && textPart.text) {
      console.log(`  [Model text response ${index}]: ${textPart.text.substring(0, 200)}`);
    }

    const imagePart = response.candidates?.[0]?.content?.parts?.find(
      (p: { inlineData?: { data?: string } }) => p.inlineData?.data
    );

    if (!imagePart?.inlineData?.data) {
      console.log(`  [${index}] No image returned — possibly filtered`);

      // Log finish reason if available
      const candidate = response.candidates?.[0];
      if (candidate) {
        console.log(`  Finish reason: ${candidate.finishReason || "unknown"}`);
      }
      return null;
    }

    const outputPath = path.join(outputDir, `image-${index}.jpg`);
    fs.writeFileSync(outputPath, Buffer.from(imagePart.inlineData.data, "base64"));
    console.log(`  [${index}] Saved: ${outputPath}`);
    return outputPath;
  } catch (error) {
    console.error(`  [${index}] Error:`, error instanceof Error ? error.message : error);
    return null;
  }
}

// ─── Main ─────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes("--help")) {
    console.log(`
Prompt Testing Tool — Generate images and save locally for inspection.

Usage:
  pnpm test:prompt "your prompt here"
  pnpm test:prompt "your prompt here" --count 2
  pnpm test:prompt --file prompts/test1.txt
  pnpm test:prompt --file prompts/test1.txt --ref path/to/reference.jpg
  pnpm test:prompt --preset base-female
  pnpm test:prompt --preset base-female --count 4

Presets: ${Object.keys(PRESETS).join(", ")}

Options:
  --count N       Number of images to generate (default: 4)
  --file PATH     Read prompt from file instead of CLI arg
  --ref PATH      Reference image for variation generation
  --preset NAME   Use a preset prompt
  --label TEXT    Label for the output folder (default: timestamp)
`);
    return;
  }

  // Parse args
  let prompt = "";
  let count = 4;
  let refPath: string | undefined;
  let label = "";

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--count" && args[i + 1]) {
      count = parseInt(args[++i], 10);
    } else if (arg === "--file" && args[i + 1]) {
      const filePath = path.resolve(args[++i]);
      prompt = fs.readFileSync(filePath, "utf-8").trim();
    } else if (arg === "--ref" && args[i + 1]) {
      refPath = path.resolve(args[++i]);
    } else if (arg === "--preset" && args[i + 1]) {
      const presetName = args[++i];
      prompt = PRESETS[presetName];
      if (!prompt) {
        console.error(`Unknown preset: ${presetName}`);
        console.error(`Available: ${Object.keys(PRESETS).join(", ")}`);
        process.exit(1);
      }
      if (!label) label = presetName;
    } else if (arg === "--label" && args[i + 1]) {
      label = args[++i];
    } else if (!arg.startsWith("--") && !prompt) {
      prompt = arg;
    }
  }

  if (!prompt) {
    console.error("No prompt provided. Use --help for usage.");
    process.exit(1);
  }

  if (!process.env.GEMINI_API_KEY) {
    console.error("GEMINI_API_KEY not found in .env.local");
    process.exit(1);
  }

  // Create output directory
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-").substring(0, 19);
  const folderName = label ? `${timestamp}_${label}` : timestamp;
  const outputDir = path.join(__dirname, "output", folderName);
  fs.mkdirSync(outputDir, { recursive: true });

  // Save prompt to output dir for reference
  fs.writeFileSync(path.join(outputDir, "prompt.txt"), prompt);
  if (refPath) {
    fs.writeFileSync(path.join(outputDir, "ref-path.txt"), refPath);
  }

  console.log(`\nPrompt Testing Tool`);
  console.log(`${"─".repeat(60)}`);
  console.log(`Prompt: ${prompt.substring(0, 100)}${prompt.length > 100 ? "..." : ""}`);
  console.log(`Count: ${count}`);
  console.log(`Reference: ${refPath || "none"}`);
  console.log(`Output: ${outputDir}`);
  console.log(`${"─".repeat(60)}\n`);

  console.log(`Generating ${count} image(s)...`);
  const startTime = Date.now();

  // Generate in parallel
  const promises = Array.from({ length: count }, (_, i) =>
    generateImage({
      prompt,
      referenceImagePath: refPath,
      outputDir,
      index: i + 1,
    })
  );

  const results = await Promise.all(promises);
  const succeeded = results.filter(Boolean).length;
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log(`\nDone! ${succeeded}/${count} images generated in ${elapsed}s`);
  console.log(`Output: ${outputDir}`);

  // Open output folder (macOS)
  if (process.platform === "darwin") {
    const { execSync } = await import("child_process");
    execSync(`open "${outputDir}"`);
  }
}

main().catch(console.error);
