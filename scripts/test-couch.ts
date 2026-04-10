#!/usr/bin/env npx tsx
import { GoogleGenAI, HarmCategory, HarmBlockThreshold } from "@google/genai";
import * as fs from "fs";
import * as path from "path";
import dotenv from "dotenv";

dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
const NBPRO = "gemini-3-pro-image-preview";
const SAFETY_OFF = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
];

const FACE_REF = path.join(__dirname, "output/sienna-v3/image-3.jpg");
const faceRefBase64 = fs.readFileSync(FACE_REF).toString("base64");
const OUTPUT_DIR = path.join(__dirname, "output/realism-abc-test");

const couch_A = `The reference image shows the person to recreate — same face, same body, same everything. That exact woman curled up on a couch in an oversized hoodie and long socks. Holding her phone, legs tucked up, looking at camera with a relaxed flirty smile. Cozy living room, warm lighting, evening vibes. Shot on iPhone, candid. Visible pores, photorealistic.`;

const couch_C = `The reference image shows the person to recreate — same face, same body, same everything. That exact woman curled up on a couch in an oversized gray hoodie and long socks. Legs tucked under her, looking at camera with a gorgeous relaxed smile. She looks incredibly cute in a cozy effortless way.

ENVIRONMENT: Living room couch with throw blanket bunched to one side. TV remote on cushion. Lamp glow in background. Phone charger cable trailing off couch arm.

CAMERA: iPhone front camera selfie. Phone at arm's length slightly above. Face fills upper frame. Warm lamp light from one side.

REALISM: Hoodie fabric texture — visible cotton weave, oversized draping. Sock fabric stretched. Stray hairs catching lamp backlight. Environmental objects scattered naturally.

She looks gorgeous. Visible pores, photorealistic.`;

async function generate(prompt: string, outputPath: string): Promise<boolean> {
  try {
    const response = await ai.models.generateContent({
      model: NBPRO,
      contents: [
        { text: prompt },
        { inlineData: { mimeType: "image/jpeg", data: faceRefBase64 } },
      ],
      config: { responseModalities: ["TEXT", "IMAGE"], safetySettings: SAFETY_OFF },
    });
    const imagePart = response.candidates?.[0]?.content?.parts?.find((p: any) => p.inlineData?.data);
    if (imagePart?.inlineData?.data) {
      fs.writeFileSync(outputPath, Buffer.from(imagePart.inlineData.data, "base64"));
      return true;
    }
    console.log(`  filtered (${response.candidates?.[0]?.finishReason})`);
    return false;
  } catch (e: any) {
    console.log(`  error: ${e.message}`);
    return false;
  }
}

async function main() {
  console.log("Couch retest — softer language");
  const [a, c] = await Promise.all([
    generate(couch_A, path.join(OUTPUT_DIR, "couch-A-current.jpg")).then(ok => { if (ok) console.log("  ✓ A"); return ok; }),
    generate(couch_C, path.join(OUTPUT_DIR, "couch-C-hybrid.jpg")).then(ok => { if (ok) console.log("  ✓ C"); return ok; }),
  ]);
  console.log(`Done! ${OUTPUT_DIR}`);
  const { execSync } = await import("child_process");
  execSync(`open "${OUTPUT_DIR}"`);
}

main().catch(console.error);
