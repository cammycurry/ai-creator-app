import { GoogleGenAI, HarmCategory, HarmBlockThreshold } from "@google/genai";
import * as fs from "fs";
import * as path from "path";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

const SAFETY_OFF = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
];

const TEMPLATE_PATH = path.join(process.cwd(), "src/assets/composition-template.jpg");
const templateBase64 = fs.readFileSync(TEMPLATE_PATH).toString("base64");
const templateRef = { mimeType: "image/jpeg", data: templateBase64 };

const PROMPT = `Replace the gray silhouette in the reference image with a real person: Sexy confident 23-year-old European woman, fair light skin, blonde long wavy hair, blue eyes, full lips. Athletic build. tight white sports bra. Canon EOS R5. Visible pores, light freckles, photorealistic. Keep the exact same framing, pose, and composition as the silhouette.`;

const MODELS = [
  { id: "gemini-3-pro-image-preview", name: "nbpro" },
  { id: "gemini-3.1-flash-image-preview", name: "nb2" },
];

async function generateOne(modelId: string): Promise<Buffer | null> {
  try {
    const response = await ai.models.generateContent({
      model: modelId,
      contents: [{ text: PROMPT }, { inlineData: templateRef }],
      config: {
        responseModalities: ["TEXT", "IMAGE"],
        safetySettings: SAFETY_OFF,
      },
    });

    const part = response.candidates?.[0]?.content?.parts?.find(
      (p: any) => p.inlineData?.data
    );
    if (part?.inlineData?.data) {
      return Buffer.from(part.inlineData.data, "base64");
    }
    console.log(`  [${modelId}] No image in response — possibly filtered`);
    return null;
  } catch (error: any) {
    console.error(`  [${modelId}] Error:`, error.message);
    return null;
  }
}

async function main() {
  const outDir = path.join(process.cwd(), "scripts/output/nb2-vs-pro");
  fs.mkdirSync(outDir, { recursive: true });

  // Save prompt
  fs.writeFileSync(path.join(outDir, "prompt.txt"), PROMPT);

  for (const model of MODELS) {
    console.log(`\nGenerating 4 images with ${model.name} (${model.id})...`);
    const start = Date.now();

    const promises = Array.from({ length: 4 }, (_, i) =>
      generateOne(model.id).then((buf) => {
        if (buf) {
          const filePath = path.join(outDir, `${model.name}-${i + 1}.jpg`);
          fs.writeFileSync(filePath, buf);
          console.log(`  ✓ ${model.name}-${i + 1}.jpg (${(buf.length / 1024).toFixed(0)}KB)`);
        } else {
          console.log(`  ✗ ${model.name}-${i + 1} failed`);
        }
        return buf;
      })
    );

    const results = await Promise.all(promises);
    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    const success = results.filter(Boolean).length;
    console.log(`  ${model.name}: ${success}/4 succeeded in ${elapsed}s`);
  }

  console.log(`\nDone! Results in: ${outDir}`);
  // Open on Mac
  const { execSync } = await import("child_process");
  execSync(`open "${outDir}"`);
}

main().catch(console.error);
