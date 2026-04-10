#!/usr/bin/env npx tsx
/**
 * Generate Sienna variations — USING REFERENCE IMAGE
 * Exact same flow as the app's variation pipeline:
 * buildVariationPrompt() + [templateRef, faceRef]
 */
import { GoogleGenAI, HarmCategory, HarmBlockThreshold } from "@google/genai";
import * as fs from "fs";
import * as path from "path";
import dotenv from "dotenv";

dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
const IMAGE_MODEL = "gemini-3-pro-image-preview";
const SAFETY_OFF = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
];

// Image 1: silhouette composition template
const TEMPLATE_PATH = path.join(__dirname, "../src/assets/composition-template.jpg");
const templateBase64 = fs.readFileSync(TEMPLATE_PATH).toString("base64");

// Image 2: Sienna's face reference (image-3 from sienna-v3 — the one you picked)
const REF_PATH = path.join(__dirname, "output/sienna-v3/image-3.jpg");
const refBase64 = fs.readFileSync(REF_PATH).toString("base64");

// Exact buildVariationPrompt() output from prompts.ts
// "Image 1 is a composition template — match its framing and crop. Image 2 shows the person to recreate."
// "That exact woman from image 2, wearing a tight white sports bra and black leggings. Canon EOS R5. Eyes open, looking directly at camera. Visible pores, photorealistic."
const prompt = "Image 1 is a composition template — match its framing and crop. Image 2 shows the person to recreate. That exact woman from image 2, wearing a tight white sports bra and black leggings. Canon EOS R5. Eyes open, looking directly at camera. Visible pores, photorealistic.";

const outputDir = path.join(__dirname, "output/sienna-v4-with-ref");
fs.mkdirSync(outputDir, { recursive: true });
fs.writeFileSync(path.join(outputDir, "prompt.txt"), prompt);
fs.writeFileSync(path.join(outputDir, "reference.txt"), REF_PATH);

async function gen(index: number): Promise<void> {
  try {
    // Exact same contents order as generateWithRetry: [text, template, reference]
    const response = await ai.models.generateContent({
      model: IMAGE_MODEL,
      contents: [
        { text: prompt },
        { inlineData: { mimeType: "image/jpeg", data: templateBase64 } },
        { inlineData: { mimeType: "image/jpeg", data: refBase64 } },
      ],
      config: {
        responseModalities: ["TEXT", "IMAGE"],
        safetySettings: SAFETY_OFF,
      },
    });

    const imagePart = response.candidates?.[0]?.content?.parts?.find((p: any) => p.inlineData?.data);
    if (imagePart?.inlineData?.data) {
      fs.writeFileSync(path.join(outputDir, `image-${index}.jpg`), Buffer.from(imagePart.inlineData.data, "base64"));
      console.log(`  ✓ image-${index} saved`);
    } else {
      console.log(`  ✗ image-${index} filtered (${response.candidates?.[0]?.finishReason})`);
    }
  } catch (e: any) {
    console.log(`  ✗ image-${index} error: ${e.message}`);
  }
}

async function main() {
  console.log("Generating Sienna with REFERENCE — exact app variation pipeline");
  console.log(`Reference: ${REF_PATH}`);
  console.log("─".repeat(50));
  await Promise.all([gen(1), gen(2), gen(3), gen(4)]);
  console.log(`\nDone! ${outputDir}`);
  const { execSync } = await import("child_process");
  execSync(`open "${outputDir}"`);
}

main().catch(console.error);
